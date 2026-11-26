import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { apiRouter } from './routes/api.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { globalRateLimiter } from './middlewares/rate-limit.middleware.js';
import { correlationAndLoggingMiddleware } from './middlewares/logging.middleware.js';
import { MetricsService } from './services/metrics.service.js';
import { initBackendSentry } from './config/sentry.js';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi.js';

// Inicializar Sentry si DSN está provisto
initBackendSentry();

function normalizeAllowedOrigins(raw: string): Set<string> {
  const result = new Set<string>();
  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed || trimmed === '*') continue;
    try {
      result.add(new URL(trimmed).origin);
    } catch {
      // Ignorar entradas malformadas
    }
  }
  return result;
}

function timingSafeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const createApp = () => {
  const app = express();

  // 1. Trust proxy: Configurado para reverse proxy de Render / Cloudflare
  app.set('trust proxy', 1);

  // 2. Correlation ID y logging estructurado de observabilidad (Pino + Métricas)
  app.use(correlationAndLoggingMiddleware);

  // 3. Helmet con configuración de Content Security Policy (CSP), HSTS y Permissions-Policy para cámara POS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    next();
  });

  // 4. CORS estricto por origen exacto (sin wildcards ni subcadenas en producción)
  const allowedOrigins = normalizeAllowedOrigins(env.ALLOWED_ORIGINS);
  const devLocalPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir peticiones sin header Origin (curl, healthchecks, apps móviles nativas)
        if (!origin) {
          return callback(null, true);
        }

        let normalizedOrigin: string;
        try {
          normalizedOrigin = new URL(origin).origin;
        } catch {
          return callback(null, false);
        }

        if (allowedOrigins.has(normalizedOrigin)) {
          return callback(null, true);
        }

        if (env.NODE_ENV !== 'production' && devLocalPattern.test(normalizedOrigin)) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // 5. Rate Limiter Global (300 req / 15 min por IP)
  app.use('/api', globalRateLimiter);

  // 6. Compresión gzip
  app.use(compression());

  // 7. Parser JSON estricto con límite máximo de 1MB y captura de rawBody para firmas HMAC
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: any, _res: any, buf: any) => {
        req.rawBody = buf;
      },
    })
  );

  // 8. Endpoints de Diagnóstico y Salud (Liveness / Readiness / Deep)
  app.use('/health', healthRouter);

  // 9. Endpoint de Métricas Prometheus (/metrics) - Sin secretos en código ni en query string
  app.get('/metrics', async (req, res, next) => {
    try {
      const configuredToken = process.env.METRICS_TOKEN;

      if (env.NODE_ENV === 'production') {
        if (!configuredToken) {
          res.status(503).json({ error: 'METRICS_UNAVAILABLE', message: 'METRICS_TOKEN no configurado en servidor' });
          return;
        }
        const headerToken =
          (typeof req.headers['x-metrics-token'] === 'string' && req.headers['x-metrics-token']) ||
          (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '');

        if (!headerToken || !timingSafeMatch(headerToken, configuredToken)) {
          res.status(403).json({ error: 'FORBIDDEN', message: 'Token de métricas inválido o ausente' });
          return;
        }
      } else if (configuredToken) {
        const headerToken =
          (typeof req.headers['x-metrics-token'] === 'string' && req.headers['x-metrics-token']) ||
          (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '');
        if (headerToken && !timingSafeMatch(headerToken, configuredToken)) {
          res.status(403).json({ error: 'FORBIDDEN', message: 'Token de métricas inválido' });
          return;
        }
      }

      res.setHeader('Content-Type', MetricsService.getContentType());
      const metricsData = await MetricsService.getMetrics();
      res.send(metricsData);
    } catch (err) {
      next(err);
    }
  });

  // 9b. Documentación OpenAPI 3.0 y Swagger UI (/api/docs y /api/docs.json)
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // 10. Rutas de Dominio API v1
  app.use('/api/v1', apiRouter);

  // 11. Servir frontend web de administración (SPA)
  const publicDir = fs.existsSync(path.resolve(__dirname, '../public'))
    ? path.resolve(__dirname, '../public')
    : path.resolve(process.cwd(), 'public');

  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/metrics')) {
        return res.sendFile(path.join(publicDir, 'index.html'));
      }
      next();
    });
  }

  // 12. Manejador centralizado de errores
  app.use(errorHandler);

  return app;
};
