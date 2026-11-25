import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { apiRouter } from './routes/api.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { globalRateLimiter } from './middlewares/rate-limit.middleware.js';
import { pool } from './db/index.js';

export const createApp = () => {
  const app = express();

  // 1. Trust proxy: Configurado para reverse proxy de Render / Cloudflare
  app.set('trust proxy', 1);

  // 2. Helmet con configuración de Content Security Policy (CSP), HSTS y headers de seguridad
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

  // 3. CORS con allowlist configurable por env ALLOWED_ORIGINS
  const allowedOriginsList = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir requests sin header Origin (ej. clientes móviles nativos Expo, curl o cron interna)
        if (!origin) return callback(null, true);
        if (
          env.NODE_ENV !== 'production' ||
          allowedOriginsList.includes(origin) ||
          allowedOriginsList.includes('*')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Origen ${origin} no permitido por política CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-id'],
    })
  );

  // 4. Rate Limiter Global (300 req / 15 min por IP)
  app.use('/api', globalRateLimiter);

  // 5. Compresión gzip
  app.use(compression());

  // 6. Parser JSON estricto con límite máximo de 1MB y captura de rawBody para firmas HMAC
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: any, _res: any, buf: any) => {
        req.rawBody = buf;
      },
    })
  );

  // Healthcheck con validación en vivo de Base de Datos
  app.get('/health', async (_req, res) => {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      res.json({
        status: 'ok',
        service: 'vuelto-api',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'degraded',
        service: 'vuelto-api',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    }
  });

  // Rutas de API v1
  app.use('/api/v1', apiRouter);

  // Servir frontend web de administración (SPA)
  const publicDir = fs.existsSync(path.resolve(__dirname, '../public'))
    ? path.resolve(__dirname, '../public')
    : path.resolve(process.cwd(), 'public');

  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
        return res.sendFile(path.join(publicDir, 'index.html'));
      }
      next();
    });
  }

  // Manejador centralizado de errores
  app.use(errorHandler);

  return app;
};
