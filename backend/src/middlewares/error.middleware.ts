import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { MonitoringService } from '../services/monitoring.service.js';
import { AuditService } from '../services/audit.service.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || (err.name === 'UnauthorizedError' ? 401 : 500);
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Ha ocurrido un error inesperado en el servidor.';
  const reqId = (req as any).reqId;

  logger.error({
    timestamp: new Date().toISOString(),
    reqId,
    tenantId: req.tenantId || null,
    userId: req.user?.id || null,
    path: req.path,
    method: req.method,
    statusCode,
    code,
    error: err.stack || err.message,
  }, 'Unhandled API Error');

  MonitoringService.recordEvent({
    level: statusCode >= 500 ? 'ERROR' : 'WARN',
    category: 'ERROR',
    message: `${code}: ${message}`,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    reqId,
    tenantId: req.tenantId || null,
    userId: req.user?.id || null,
    username: req.user?.username,
    ipAddress: req.ip || null,
  });

  if (statusCode >= 500) {
    AuditService.log({
      tenantId: req.tenantId || null,
      userId: req.user?.id || null,
      action: 'SYSTEM_INTERNAL_ERROR',
      entity: 'system',
      entityType: 'error',
      entityId: reqId || null,
      payload: { path: req.originalUrl || req.path, method: req.method, code, message },
      result: 'FAILED',
      channel: 'API',
      ipAddress: req.ip || null,
      userAgent: (req.headers['user-agent'] as string) || null,
    }).catch(() => {});
  }

  res.status(statusCode).json({
    code,
    message,
    reqId,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
