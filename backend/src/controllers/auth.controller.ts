import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, tenants } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { PasswordService } from '../utils/password.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import { TwoFactorService } from '../services/two-factor.service.js';
import { AuditService } from '../services/audit.service.js';

const loginSchema = z
  .object({
    username: z.string().trim().min(1, 'Usuario requerido'),
    password: z.string().min(1, 'Contraseña requerida'),
    tenantSlug: z.string().trim().optional(),
    twoFactorCode: z.string().trim().optional(),
  })
  .strict();

const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, 'Refresh token requerido'),
  })
  .strict();

const enable2FASchema = z
  .object({
    secret: z.string().min(16),
    code: z.string().length(6),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(128, 'La contraseña excede el máximo permitido')
      .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
      .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .strict();

export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Autenticación reforzada con Argon2id, bloqueo de cuenta tras 5 fallos y 2FA TOTP
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Cuerpo de petición inválido o contiene campos no permitidos',
          details: parseResult.error.format(),
        });
        return;
      }

      const { username, password, tenantSlug, twoFactorCode } = parseResult.data;

      let targetTenantId: string | undefined;
      if (tenantSlug) {
        const [tenantRecord] = await db
          .select({ id: tenants.id, isActive: tenants.isActive })
          .from(tenants)
          .where(eq(tenants.slug, tenantSlug))
          .limit(1);

        if (!tenantRecord) {
          res.status(401).json({ error: 'Comercio o tenant no encontrado' });
          return;
        }
        if (!tenantRecord.isActive) {
          res.status(403).json({
            error: 'TENANT_SUSPENDED',
            message: 'Este comercio se encuentra suspendido. Contacte al Súper Administrador.',
          });
          return;
        }
        targetTenantId = tenantRecord.id;
      }

      const conditions = targetTenantId
        ? and(eq(users.username, username), eq(users.tenantId, targetTenantId))
        : eq(users.username, username);

      const [userRecord] = await db
        .select()
        .from(users)
        .where(conditions)
        .limit(1);

      if (!userRecord || !userRecord.isActive) {
        await AuditService.log({
          tenantId: targetTenantId || null,
          userId: null,
          action: 'LOGIN_FAILED_UNKNOWN_USER',
          entity: 'users',
          entityType: 'security',
          payload: { username, tenantSlug: tenantSlug || null },
          result: 'REJECTED',
          channel: 'API',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'unknown',
        });
        res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
        return;
      }

      // Verificar que el tenant del usuario siga activo
      let tenantInfo: { businessName: string; tradeName: string; isActive: boolean } | undefined;
      if (userRecord.tenantId) {
        const [t] = await db
          .select({ businessName: tenants.businessName, tradeName: tenants.tradeName, isActive: tenants.isActive })
          .from(tenants)
          .where(eq(tenants.id, userRecord.tenantId))
          .limit(1);
        tenantInfo = t;
        if (!tenantInfo || !tenantInfo.isActive) {
          await AuditService.log({
            tenantId: userRecord.tenantId,
            userId: userRecord.id,
            action: 'LOGIN_BLOCKED_TENANT_SUSPENDED',
            entity: 'tenants',
            entityType: 'security',
            entityId: userRecord.tenantId,
            payload: { username },
            result: 'REJECTED',
            channel: 'API',
            ipAddress: req.ip || '127.0.0.1',
            userAgent: (req.headers['user-agent'] as string) || 'unknown',
          });
          res.status(403).json({
            error: 'TENANT_SUSPENDED',
            message: 'Este comercio está suspendido o dado de baja. Contacte al Súper Administrador.',
          });
          return;
        }
      }

      // 3. Verificación de Bloqueo de Cuenta (Account Lockout)
      if (userRecord.lockedUntil && new Date(userRecord.lockedUntil) > new Date()) {
        const remainingMinutes = Math.ceil(
          (new Date(userRecord.lockedUntil).getTime() - Date.now()) / (60 * 1000)
        );

        await AuditService.log({
          tenantId: userRecord.tenantId,
          userId: userRecord.id,
          action: 'LOGIN_BLOCKED_ACCOUNT_LOCKED',
          entity: 'users',
          entityType: 'security',
          entityId: userRecord.id,
          payload: { username, lockedUntil: userRecord.lockedUntil },
          result: 'REJECTED',
          channel: 'API',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'unknown',
        });

        res.status(423).json({
          error: 'ACCOUNT_LOCKED',
          message: `Cuenta temporalmente bloqueada por 5 intentos fallidos consecutivos. Intente de nuevo en ${remainingMinutes} minutos.`,
          lockedUntil: userRecord.lockedUntil,
        });
        return;
      }

      // Si el bloqueo expiró, limpiar el contador automáticamente
      if (userRecord.lockedUntil && new Date(userRecord.lockedUntil) <= new Date()) {
        await db
          .update(users)
          .set({ failedLoginAttempts: 0, lockedUntil: null })
          .where(eq(users.id, userRecord.id));
        userRecord.failedLoginAttempts = 0;
        userRecord.lockedUntil = null;
      }

      // 4. Validación de contraseña con Argon2id (y retrocompatibilidad bcrypt)
      const isPasswordValid = await PasswordService.verify(password, userRecord.passwordHash);

      if (!isPasswordValid) {
        const newFailedAttempts = (userRecord.failedLoginAttempts || 0) + 1;
        const willLock = newFailedAttempts >= 5;
        const lockDurationMs = 30 * 60 * 1000;
        const lockedUntil = willLock ? new Date(Date.now() + lockDurationMs) : null;

        await db
          .update(users)
          .set({
            failedLoginAttempts: newFailedAttempts,
            lockedUntil,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userRecord.id));

        await AuditService.log({
          tenantId: userRecord.tenantId,
          userId: userRecord.id,
          action: willLock ? 'ACCOUNT_LOCKED_5_FAILS' : 'LOGIN_FAILED',
          entity: 'users',
          entityType: 'security',
          entityId: userRecord.id,
          payload: {
            username,
            attemptCount: newFailedAttempts,
            willLock,
            reason: 'invalid_password',
          },
          result: 'REJECTED',
          channel: 'API',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'unknown',
        });

        if (willLock) {
          res.status(423).json({
            error: 'ACCOUNT_LOCKED',
            message: 'Cuenta bloqueada por 5 intentos fallidos consecutivos. Intente en 30 minutos.',
            lockedUntil,
          });
          return;
        }

        res.status(401).json({
          error: 'Credenciales inválidas',
          remainingAttempts: Math.max(0, 5 - newFailedAttempts),
        });
        return;
      }

      // 5. Verificación 2FA TOTP (si el usuario activó 2FA)
      const requires2FA = userRecord.roleId === 'SUPER_ADMIN' || userRecord.twoFactorEnabled;
      if (requires2FA && userRecord.twoFactorSecret) {
        if (!twoFactorCode) {
          res.json({
            requiresTwoFactor: true,
            message: 'Se requiere código 2FA TOTP para completar el inicio de sesión.',
          });
          return;
        }

        const is2FAValid = TwoFactorService.verifyToken(userRecord.twoFactorSecret, twoFactorCode);
        if (!is2FAValid) {
          await AuditService.log({
            tenantId: userRecord.tenantId,
            userId: userRecord.id,
            action: 'LOGIN_2FA_FAILED',
            entity: 'users',
            entityType: 'security',
            entityId: userRecord.id,
            payload: { username, reason: 'invalid_2fa_totp' },
            result: 'REJECTED',
            channel: 'API',
            ipAddress: req.ip || '127.0.0.1',
            userAgent: (req.headers['user-agent'] as string) || 'unknown',
          });

          res.status(401).json({ error: 'Código de verificación 2FA inválido o expirado' });
          return;
        }
      }

      // 6. Restablecer contador de fallos y actualizar último acceso
      await db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userRecord.id));

      // 7. Crear sesión con Refresh Token Rotation y Family ID
      const authUser = {
        id: userRecord.id,
        tenantId: userRecord.tenantId,
        roleId: userRecord.roleId as any,
        username: userRecord.username,
        fullName: userRecord.fullName,
      };

      const tokens = await AuthSessionService.createSession(
        authUser,
        req.ip,
        req.headers['user-agent'] as string
      );

      await AuditService.log({
        tenantId: userRecord.tenantId,
        userId: userRecord.id,
        action: 'LOGIN_SUCCESS',
        entity: 'users',
        entityType: 'authentication',
        entityId: userRecord.id,
        payload: { username, roleId: userRecord.roleId },
        result: 'SUCCESS',
        channel: 'API',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: (req.headers['user-agent'] as string) || 'unknown',
      });

      res.json({
        message: 'Autenticación exitosa',
        tokens,
        user: {
          id: userRecord.id,
          tenantId: userRecord.tenantId,
          username: userRecord.username,
          fullName: userRecord.fullName,
          email: userRecord.email,
          roleId: userRecord.roleId,
          businessName:
            userRecord.roleId === 'SUPER_ADMIN'
              ? 'Consola Súper Administrador Vuelto'
              : tenantInfo?.tradeName || tenantInfo?.businessName || 'Vuelto',
          twoFactorEnabled: userRecord.twoFactorEnabled,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Verifica la sesión contra PostgreSQL y devuelve los datos vigentes del usuario
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!userRecord || !userRecord.isActive) {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Usuario inactivo o eliminado' });
        return;
      }

      let businessName = 'Consola Súper Administrador Vuelto';
      if (userRecord.tenantId) {
        const [t] = await db
          .select({ businessName: tenants.businessName, tradeName: tenants.tradeName, isActive: tenants.isActive })
          .from(tenants)
          .where(eq(tenants.id, userRecord.tenantId))
          .limit(1);
        if (!t || !t.isActive) {
          res.status(403).json({ code: 'TENANT_SUSPENDED', message: 'Comercio suspendido o dado de baja' });
          return;
        }
        businessName = t.tradeName || t.businessName;
      }

      res.json({
        id: userRecord.id,
        tenantId: userRecord.tenantId,
        username: userRecord.username,
        email: userRecord.email,
        fullName: userRecord.fullName,
        roleId: userRecord.roleId,
        businessName,
        twoFactorEnabled: userRecord.twoFactorEnabled,
        lastLoginAt: userRecord.lastLoginAt,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/change-password
   * Cambio seguro de contraseña desde el panel (Súper Admin o cualquier usuario autenticado)
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = changePasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0]?.message || 'Parámetros de contraseña inválidos';
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: firstIssue,
          details: parseResult.error.format(),
        });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = parseResult.data;

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          error: 'PASSWORD_MISMATCH',
          message: 'La nueva contraseña y su confirmación no coinciden.',
        });
        return;
      }

      if (newPassword === currentPassword) {
        res.status(400).json({
          error: 'SAME_PASSWORD',
          message: 'La nueva contraseña debe ser diferente a la contraseña actual.',
        });
        return;
      }

      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!userRecord || !userRecord.isActive) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Usuario no encontrado o inactivo' });
        return;
      }

      const isCurrentValid = await PasswordService.verify(currentPassword, userRecord.passwordHash);
      if (!isCurrentValid) {
        await AuditService.log({
          tenantId: userRecord.tenantId,
          userId: userRecord.id,
          action: 'PASSWORD_CHANGE_FAILED',
          entity: 'users',
          entityType: 'security',
          entityId: userRecord.id,
          payload: { username: userRecord.username, reason: 'invalid_current_password' },
          result: 'REJECTED',
          channel: 'WEB_ADMIN',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'unknown',
        });

        res.status(401).json({
          error: 'INVALID_CURRENT_PASSWORD',
          message: 'La contraseña actual es incorrecta.',
        });
        return;
      }

      const newHash = await PasswordService.hash(newPassword);
      await db
        .update(users)
        .set({
          passwordHash: newHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userRecord.id));

      // Revocar todas las sesiones previas y emitir una nueva sesión limpia para el usuario actual
      await AuthSessionService.revokeAllUserSessions(userRecord.id);

      const tokens = await AuthSessionService.createSession(
        {
          id: userRecord.id,
          tenantId: userRecord.tenantId,
          roleId: userRecord.roleId as any,
          username: userRecord.username,
          fullName: userRecord.fullName,
        },
        req.ip,
        req.headers['user-agent'] as string
      );

      await AuditService.log({
        tenantId: userRecord.tenantId,
        userId: userRecord.id,
        action: 'PASSWORD_CHANGED',
        entity: 'users',
        entityType: 'security',
        entityId: userRecord.id,
        payload: { username: userRecord.username, roleId: userRecord.roleId },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: (req.headers['user-agent'] as string) || 'unknown',
      });

      res.json({
        message: 'Contraseña actualizada correctamente. Las sesiones anteriores han sido revocadas.',
        tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Revoca todas las sesiones activas del usuario y registra el cierre en auditoría
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.id) {
        await AuthSessionService.revokeAllUserSessions(req.user.id);
        await AuditService.log({
          tenantId: req.user.tenantId,
          userId: req.user.id,
          action: 'LOGOUT',
          entity: 'users',
          entityType: 'authentication',
          entityId: req.user.id,
          payload: { username: req.user.username, roleId: req.user.roleId },
          result: 'SUCCESS',
          channel: 'WEB_ADMIN',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'unknown',
        });
      }
      res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = refreshSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Refresh token requerido en cuerpo estricto',
          details: parseResult.error.format(),
        });
        return;
      }

      const { refreshToken } = parseResult.data;

      try {
        const tokens = await AuthSessionService.rotateRefreshToken(
          refreshToken,
          req.ip,
          req.headers['user-agent'] as string
        );

        res.json({
          message: 'Sesión renovada exitosamente',
          tokens,
        });
      } catch (err: any) {
        if (err.message === 'REUSED_REFRESH_TOKEN') {
          res.status(401).json({
            error: 'TOKEN_REUSE_DETECTED',
            message: 'Detección de robo de sesión: refresh token ya utilizado. Todas las sesiones activas han sido revocadas.',
          });
          return;
        }

        res.status(401).json({
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token inválido, expirado o revocado.',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/2fa/generate
   */
  static async generate2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userEmail = req.user?.username ? `${req.user.username}@vuelto.app` : 'user@vuelto.app';
      const result = await TwoFactorService.generateSecret(userEmail, 'Vuelto POS');

      res.json({
        secret: result.secret,
        otpauthUrl: result.otpauthUrl,
        qrCodeDataUrl: result.qrCodeDataUrl,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/2fa/enable
   */
  static async enable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = enable2FASchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Parámetros 2FA inválidos', details: parseResult.error.format() });
        return;
      }

      const { secret, code } = parseResult.data;
      const isValid = TwoFactorService.verifyToken(secret, code);
      if (!isValid) {
        res.status(400).json({ error: 'Código TOTP incorrecto. Verifique la hora en su dispositivo.' });
        return;
      }

      const encryptedSecret = TwoFactorService.encryptSecret(secret);

      await db
        .update(users)
        .set({
          twoFactorSecret: encryptedSecret,
          twoFactorEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user!.id));

      await AuditService.log({
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        action: '2FA_ENABLED',
        entity: 'users',
        entityType: 'security',
        entityId: req.user!.id,
        payload: { userId: req.user!.id },
        result: 'SUCCESS',
        channel: 'API',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: (req.headers['user-agent'] as string) || 'unknown',
      });

      res.json({ message: '2FA habilitado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
