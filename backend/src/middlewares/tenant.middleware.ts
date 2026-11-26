import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service.js';

export class UnauthorizedError extends Error {
  constructor(message = 'Acceso no autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Middleware mandatorio de Aislamiento Multi-Tenant (Hardening OWASP).
 * REGLA ESTRICTA DE SEGURIDAD:
 * El `tenant_id` se extrae EXCLUSIVAMENTE del token JWT enviado en Authorization: Bearer.
 * Nunca se aceptan JWTs en query strings y se sanitiza cualquier intento de spoofing de tenant_id.
 */
export const requireTenantAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  if (!token) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Token de autorización ausente o inválido.',
    });
    return;
  }

  try {
    const user = JwtService.verifyAccessToken(token);

    // Sanitización proactiva contra spoofing de tenant
    if (req.body && typeof req.body === 'object') {
      delete req.body.tenantId;
      delete req.body.tenant_id;
    }
    if (req.query && typeof req.query === 'object') {
      delete (req.query as any).tenantId;
      delete (req.query as any).tenant_id;
    }

    req.user = user;
    req.tenantId = user.tenantId ?? undefined;
    next();
  } catch {
    res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Token de acceso expirado o inválido.',
    });
    return;
  }
};
