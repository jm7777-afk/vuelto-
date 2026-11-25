import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * Rate Limiter Global:
 * 300 peticiones / 15 minutos por IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Demasiadas solicitudes desde esta IP, intente de nuevo en 15 minutos.',
  },
});

/**
 * Rate Limiter Estricto para Login:
 * 5 intentos / 1 minuto por IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Demasiadas solicitudes de autenticación desde esta IP. Intente de nuevo en un minuto.',
  },
});

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const barcodeLimitStore = new Map<string, RateLimitEntry>();

// Limpiar periódicamente entradas expiradas cada 5 minutos
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of barcodeLimitStore.entries()) {
    if (now > entry.resetAt) {
      barcodeLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupInterval.unref?.();

/**
 * Rate Limiter específico para consultas de código de barras:
 * 60 req/min por usuario (o por IP si no está autenticado)
 */
export function barcodeLookupRateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.user?.id || req.ip || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxRequests = 60;

  const current = barcodeLimitStore.get(key);

  if (!current || now > current.resetAt) {
    barcodeLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
    return res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: 'Límite de 60 consultas de código de barras por minuto excedido. Intente nuevamente en unos segundos.',
    });
  }

  current.count += 1;
  next();
}
