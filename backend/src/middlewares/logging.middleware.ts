import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { httpRequestDurationSeconds, httpRequestsTotal } from '../services/metrics.service.js';

export function correlationAndLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Correlation ID: tomar x-request-id del cliente o generar UUID v4/v7
  const incomingReqId = req.headers['x-request-id'];
  const reqId = (Array.isArray(incomingReqId) ? incomingReqId[0] : incomingReqId) || randomUUID();

  // Asignar al request y al header de respuesta HTTP
  (req as any).reqId = reqId;
  res.setHeader('X-Request-Id', reqId);

  const startHrTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1_000_000;
    const durationSec = durationMs / 1000;

    const tenantId = (req as any).tenantId || (req as any).user?.tenantId || 'anonymous';
    const userId = (req as any).user?.id || null;
    const path = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    const normalizedPath = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');

    // Registrar en métricas Prometheus
    httpRequestDurationSeconds.observe(
      { method: req.method, path: normalizedPath, status: String(res.statusCode) },
      durationSec
    );

    httpRequestsTotal.inc({
      method: req.method,
      path: normalizedPath,
      status: String(res.statusCode),
      tenant_id: tenantId,
    });

    // Logging estructurado con Pino
    const logData = {
      timestamp: new Date().toISOString(),
      reqId,
      tenantId: tenantId !== 'anonymous' ? tenantId : undefined,
      userId: userId || undefined,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'HTTP Request Server Error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP Request Client Warning');
    } else {
      logger.info(logData, 'HTTP Request Completed');
    }
  });

  next();
}
