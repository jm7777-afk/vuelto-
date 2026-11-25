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
 * El `tenant_id` se extrae EXCLUSIVAMENTE del token JWT verificado criptográficamente por el servidor.
 * Se prohíbe y sanitiza explícitamente cualquier intento de inyección o spoofing desde el body, query o URL.
 */
export const requireTenantAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' && req.path.includes('/monitoring/stream')
    ? req.query.token
    : undefined;

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (queryToken) {
    token = queryToken;
  }

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

    // Inyecta en el contexto de la petición Express desde el token verificado
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
