import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { refreshTokens, users, auditLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { AuthUser } from '../types/express.js';

export interface SessionTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export class AuthSessionService {
  private static accessSecret = env.JWT_SECRET;
  private static refreshSecret = env.JWT_REFRESH_SECRET;

  /**
   * Hashea el refresh token para guardarlo sin exponer el secreto crudo
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Crea una nueva sesión y emite un par de tokens con un nuevo familyId
   */
  static async createSession(user: AuthUser, ipAddress?: string, userAgent?: string): Promise<SessionTokenPair> {
    const familyId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
      username: user.username,
      fullName: user.fullName,
    };

    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn: '15m',
    });

    const refreshPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      familyId,
      tokenId,
      tokenType: 'refresh',
    };

    const refreshToken = jwt.sign(refreshPayload, this.refreshSecret, {
      expiresIn: '7d',
    });

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresInSeconds: 900,
    };
  }

  /**
   * Rotación de Refresh Token (Refresh Token Rotation)
   * Si se detecta que un token ya revocado intenta ser reutilizado, se revoca TODA la familia de tokens (Detección de Robo).
   */
  static async rotateRefreshToken(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionTokenPair> {
    let decoded: any;
    try {
      decoded = jwt.verify(rawRefreshToken, this.refreshSecret);
    } catch {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    if (decoded.tokenType !== 'refresh' || !decoded.sub || !decoded.familyId) {
      throw new Error('MALFORMED_REFRESH_TOKEN');
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!tokenRecord) {
      throw new Error('REFRESH_TOKEN_NOT_FOUND');
    }

    // DETECCIÓN DE ROBO DE TOKEN (Reuso de token revocado)
    if (tokenRecord.revokedAt !== null) {
      // Revocar INMEDIATAMENTE toda la familia
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.familyId, tokenRecord.familyId));

      // Registrar incidente de seguridad en audit_logs
      await db.insert(auditLogs).values({
        tenantId: decoded.tenantId,
        userId: tokenRecord.userId,
        action: 'REFRESH_TOKEN_THEFT_DETECTED',
        entity: 'refresh_tokens',
        entityType: 'security',
        entityId: tokenRecord.familyId,
        payload: {
          familyId: tokenRecord.familyId,
          tokenId: tokenRecord.id,
          reason: 'Token reuse detected - all tokens in family revoked',
        },
        result: 'REJECTED',
        channel: 'API',
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'unknown',
      });

      throw new Error('REUSED_REFRESH_TOKEN');
    }

    // Verificar si expiró
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      throw new Error('EXPIRED_REFRESH_TOKEN');
    }

    // Buscar usuario activo
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (!userRecord || !userRecord.isActive) {
      throw new Error('USER_INACTIVE_OR_NOT_FOUND');
    }

    // 1. Revocar el token actual usado
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenRecord.id));

    // 2. Generar nuevo par de tokens preservando el familyId
    const newAccessToken = jwt.sign(
      {
        sub: userRecord.id,
        tenantId: userRecord.tenantId,
        roleId: userRecord.roleId,
        username: userRecord.username,
        fullName: userRecord.fullName,
      },
      this.accessSecret,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      {
        sub: userRecord.id,
        tenantId: userRecord.tenantId,
        familyId: tokenRecord.familyId, // Misma familia
        tokenId: crypto.randomUUID(),
        tokenType: 'refresh',
      },
      this.refreshSecret,
      { expiresIn: '7d' }
    );

    const newTokenHash = this.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId: userRecord.id,
      tokenHash: newTokenHash,
      familyId: tokenRecord.familyId,
      expiresAt: newExpiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresInSeconds: 900,
    };
  }

  /**
   * Revoca todas las sesiones de un usuario (ej. logout en todos los dispositivos o cambio de clave)
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, userId));
  }
}
