import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service.js';

export class UnauthorizedError extends Error {
  constructor(message = 'Acceso no autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Middleware mandatorio de Aislamiento Multi-Tenant.
 * REGLA ESTRICTA DE SEGURIDAD:
 * El `tenant_id` se extrae EXCLUSIVAMENTE del token JWT verificado por el servidor.
 * NUNCA se extrae del body, query ni URL.
 */
export const requireTenantAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Token de autorización ausente o inválido.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const user = JwtService.verifyAccessToken(token);
    // Inyecta en el contexto de la petición Express
    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch (error: any) {
    res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Token de acceso expirado o inválido.',
    });
    return;
  }
};
