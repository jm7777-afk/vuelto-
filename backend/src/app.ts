import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
      verify: (req: any, _res, buf) => {
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

  // Manejador centralizado de errores
  app.use(errorHandler);

  return app;
};
