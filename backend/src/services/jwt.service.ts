import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthUser } from '../types/express.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export class JwtService {
  private static accessSecret = env.JWT_SECRET;
  private static refreshSecret = env.JWT_REFRESH_SECRET;

  static generateTokenPair(user: AuthUser): TokenPair {
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

    const refreshToken = jwt.sign(
      { sub: user.id, tenantId: user.tenantId, tokenType: 'refresh' },
      this.refreshSecret,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresInSeconds: 900, // 15 minutos
    };
  }

  static verifyAccessToken(token: string): AuthUser {
    const decoded = jwt.verify(token, this.accessSecret) as any;
    if (!decoded.tenantId || !decoded.sub) {
      throw new Error('Token JWT no contiene información de tenant requerida');
    }
    return {
      id: decoded.sub,
      tenantId: decoded.tenantId,
      roleId: decoded.roleId,
      username: decoded.username,
      fullName: decoded.fullName,
    };
  }

  static verifyRefreshToken(token: string): { userId: string; tenantId: string } {
    const decoded = jwt.verify(token, this.refreshSecret) as any;
    if (decoded.tokenType !== 'refresh' || !decoded.tenantId) {
      throw new Error('Refresh token inválido');
    }
    return {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
    };
  }
}
