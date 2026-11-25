import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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

export const createApp = () => {
  const app = express();

  // 1. Trust proxy: Configurado para reverse proxy de Render / Cloudflare
  app.set('trust proxy', 1);

  // 2. Correlation ID y logging estructurado de observabilidad (Pino + Métricas)
  app.use(correlationAndLoggingMiddleware);

  // 3. Helmet con configuración de Content Security Policy (CSP), HSTS y headers de seguridad
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

  // 4. CORS con allowlist configurable por env ALLOWED_ORIGINS y soporte para dominios de producción
  const allowedOriginsList = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir peticiones sin header Origin (curl, apps móviles nativas) o autorizadas
        if (
          !origin ||
          env.NODE_ENV !== 'production' ||
          allowedOriginsList.includes('*') ||
          allowedOriginsList.includes(origin) ||
          origin.includes('onrender.com') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-id', 'X-Request-Id'],
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

  // 9. Endpoint de Métricas Prometheus (/metrics)
  app.get('/metrics', async (req, res, next) => {
    try {
      const token = req.query.token || req.headers['x-metrics-token'] || req.headers.authorization?.replace('Bearer ', '');
      const configuredToken = process.env.METRICS_TOKEN || 'vuelto-metrics-token-2026';

      // En producción exigir token de métricas; en dev/test permitir acceso
      if (env.NODE_ENV === 'production' && token !== configuredToken) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Token de métricas inválido o ausente' });
        return;
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
