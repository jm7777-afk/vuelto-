import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './routes/api.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { pool } from './db/index.js';

export const createApp = () => {
  const app = express();

  // Seguridad HTTP
  app.use(helmet());
  app.use(cors());

  // Parser con captura de rawBody para verificación estricta de webhooks HMAC-SHA256
  app.use(
    express.json({
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
