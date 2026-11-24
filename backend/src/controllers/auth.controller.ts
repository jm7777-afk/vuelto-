import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, auditLogs, tenants } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { JwtService } from '../services/jwt.service.js';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Autenticación de usuario por nombre de usuario y contraseña
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, tenantSlug } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        return;
      }

      // Buscar usuario (opcionalmente filtrado por tenantSlug si se provee)
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

      // Validar contraseña con bcrypt
      const isPasswordValid = await bcrypt.compare(password, userRecord.passwordHash);

      if (!isPasswordValid) {
        // Registrar intento fallido en auditoría
        await db.insert(auditLogs).values({
          tenantId: userRecord.tenantId,
          userId: userRecord.id,
          action: 'LOGIN_FAILED',
          entity: 'users',
          entityId: userRecord.id,
          payload: { username, reason: 'invalid_password' },
          result: 'REJECTED',
          channel: 'API',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'unknown',
        });

        res.status(401).json({ error: 'Credenciales inválidas' });
        return;
      }

      // Actualizar último acceso
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userRecord.id));

      // Registrar auditoría exitosa en Supabase
      await db.insert(auditLogs).values({
        tenantId: userRecord.tenantId,
        userId: userRecord.id,
        action: 'LOGIN_SUCCESS',
        entity: 'users',
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

      // Generar tokens JWT
      const tokens = JwtService.generateTokenPair({
        id: userRecord.id,
        tenantId: userRecord.tenantId,
        roleId: userRecord.roleId as any,
        username: userRecord.username,
        fullName: userRecord.fullName,
      });

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
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
