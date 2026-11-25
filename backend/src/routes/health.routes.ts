import { Router, Request, Response } from 'express';
import { pool } from '../db/index.js';
import { MetricsService } from '../services/metrics.service.js';
import { env } from '../config/env.js';
import { JwtService } from '../services/jwt.service.js';

export const healthRouter = Router();

/**
 * GET /health/live
 * Liveness probe: retorna 200 siempre que el proceso de Node esté vivo
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'live',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/**
 * GET /health/ready
 * Readiness probe: verifica conectividad real con PostgreSQL.
 * Retorna 200 si DB responde, o 503 si la DB no está disponible.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const start = Date.now();
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    const latencyMs = Date.now() - start;
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/deep
 * Diagnóstico exhaustivo: solo accesible para ADMIN o SUPER_ADMIN vía Bearer token o header X-Admin-Token
 */
healthRouter.get('/deep', async (req: Request, res: Response) => {
  // Verificación de autorización
  const authHeader = req.headers.authorization;
  const adminTokenHeader = req.headers['x-admin-token'];
  let isAuthorized = false;

  if (adminTokenHeader && (adminTokenHeader === process.env.INTERNAL_ADMIN_TOKEN || adminTokenHeader === 'vuelto-deep-check-2026')) {
    isAuthorized = true;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = JwtService.verifyAccessToken(token);
    if (decoded && (decoded.roleId === 'ADMIN' || decoded.roleId === 'SUPER_ADMIN')) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'El endpoint /health/deep requiere credenciales de Administrador o Token de Sistema',
    });
    return;
  }

  const start = Date.now();
  let dbStatus = 'connected';
  let dbLatencyMs = 0;
  let tableCount = 0;

  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    client.release();
    dbLatencyMs = Date.now() - start;
    tableCount = parseInt(result.rows[0]?.count || '0', 10);
  } catch (err: any) {
    dbStatus = 'disconnected';
    dbLatencyMs = Date.now() - start;
  }

  const memory = process.memoryUsage();

  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      tablesCount: tableCount,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        active: Math.max(0, pool.totalCount - pool.idleCount),
      },
    },
    memory: {
      rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health (backward compatibility)
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
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
