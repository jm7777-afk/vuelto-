import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/api.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

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

  // Healthcheck
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'vuelto-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Rutas de API v1
  app.use('/api/v1', apiRouter);

  // Manejador centralizado de errores
  app.use(errorHandler);

  return app;
};
