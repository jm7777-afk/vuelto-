import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, auditLogs, tenants } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { PasswordService } from '../utils/password.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import { TwoFactorService } from '../services/two-factor.service.js';

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

export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Autenticación reforzada con Argon2id, bloqueo de cuenta tras 5 fallos y 2FA TOTP
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Validación estricta con Zod (.strict(): rechaza parámetros no reconocidos)
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

      // 2. Resolver tenant si se especificó slug
      let targetTenantId: string | undefined;
      if (tenantSlug) {
        const [tenantRecord] = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.slug, tenantSlug))
          .limit(1);

        if (!tenantRecord) {
          res.status(401).json({ error: 'Comercio o tenant no encontrado' });
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
        res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
        return;
      }

      // 3. Verificación de Bloqueo de Cuenta (Account Lockout)
      if (userRecord.lockedUntil && new Date(userRecord.lockedUntil) > new Date()) {
        const remainingMinutes = Math.ceil(
          (new Date(userRecord.lockedUntil).getTime() - Date.now()) / (60 * 1000)
        );

        await db.insert(auditLogs).values({
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
          userAgent: req.headers['user-agent'] || 'unknown',
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
        const lockDurationMs = 30 * 60 * 1000; // 30 minutos
        const lockedUntil = willLock ? new Date(Date.now() + lockDurationMs) : null;

        await db
          .update(users)
          .set({
            failedLoginAttempts: newFailedAttempts,
            lockedUntil,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userRecord.id));

        await db.insert(auditLogs).values({
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
          userAgent: req.headers['user-agent'] || 'unknown',
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

      // 5. Verificación 2FA TOTP (Obligatorio para SUPER_ADMIN o si el usuario lo activó)
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
          await db.insert(auditLogs).values({
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
            userAgent: req.headers['user-agent'] || 'unknown',
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

      // Registrar auditoría exitosa
      await db.insert(auditLogs).values({
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
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      // Obtener datos del tenant
      const [tenantInfo] = await db
        .select({ businessName: tenants.businessName, tradeName: tenants.tradeName })
        .from(tenants)
        .where(eq(tenants.id, userRecord.tenantId))
        .limit(1);

      res.json({
        message: 'Autenticación exitosa',
        tokens,
        user: {
          id: userRecord.id,
          tenantId: userRecord.tenantId,
          username: userRecord.username,
          fullName: userRecord.fullName,
          roleId: userRecord.roleId,
          businessName: tenantInfo?.tradeName || tenantInfo?.businessName || 'Vuelto',
          twoFactorEnabled: userRecord.twoFactorEnabled,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Rotación de refresh token y detección de robo de sesión
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
   * Generación de secreto TOTP y código QR para Google Authenticator
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
   * Verificación del primer código TOTP para activar 2FA
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

      await db.insert(auditLogs).values({
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
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      res.json({ message: '2FA habilitado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
