import { EventEmitter } from 'events';
import { Response, Request } from 'express';
import { sql, gte, and, isNull, gt } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import { tenants, users, sales, auditLogs, refreshTokens } from '../db/schema.js';

export type MonitorEventCategory = 'HTTP' | 'AUDIT' | 'SECURITY' | 'SYSTEM' | 'ERROR';
export type MonitorEventLevel = 'INFO' | 'WARN' | 'ERROR';

export interface MonitorEvent {
  id: string;
  timestamp: string;
  level: MonitorEventLevel;
  category: MonitorEventCategory;
  message: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  reqId?: string;
  tenantId?: string | null;
  userId?: string | null;
  username?: string;
  action?: string;
  entity?: string;
  result?: string;
  channel?: string;
  ipAddress?: string | null;
  metadata?: Record<string, any>;
}

interface SseClient {
  id: string;
  res: Response;
  userId: string;
}

const MAX_BUFFER_SIZE = 500;

export class MonitoringService {
  private static emitter = new EventEmitter();
  private static buffer: MonitorEvent[] = [];
  private static sseClients = new Map<string, SseClient>();
  private static requestTimestamps: number[] = [];
  private static errorTimestamps: number[] = [];
  private static eventCounter = 0;

  static recordEvent(input: Omit<MonitorEvent, 'id' | 'timestamp'> & { timestamp?: string }): MonitorEvent {
    const now = Date.now();
    const event: MonitorEvent = {
      id: `evt-${now}-${++this.eventCounter}`,
      timestamp: input.timestamp || new Date(now).toISOString(),
      ...input,
    };

    this.buffer.unshift(event);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.length = MAX_BUFFER_SIZE;
    }

    if (event.category === 'HTTP') {
      this.requestTimestamps.push(now);
    }
    if (event.level === 'ERROR') {
      this.errorTimestamps.push(now);
    }

    // Limpiar ventanas deslizantes de más de 5 minutos
    const fiveMinAgo = now - 5 * 60 * 1000;
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] < fiveMinAgo) {
      this.requestTimestamps.shift();
    }
    while (this.errorTimestamps.length > 0 && this.errorTimestamps[0] < fiveMinAgo) {
      this.errorTimestamps.shift();
    }

    // Emitir a suscriptores SSE en tiempo real
    this.broadcast('event', event);
    this.emitter.emit('event', event);

    return event;
  }

  static getRecentLogs(filters: {
    level?: string;
    category?: string;
    search?: string;
    limit?: number;
  } = {}): MonitorEvent[] {
    const limit = Math.min(filters.limit || 150, MAX_BUFFER_SIZE);
    const searchLower = filters.search?.trim().toLowerCase();

    return this.buffer
      .filter((evt) => {
        if (filters.level && filters.level !== 'ALL' && evt.level !== filters.level) return false;
        if (filters.category && filters.category !== 'ALL' && evt.category !== filters.category) return false;
        if (searchLower) {
          const hay = `${evt.message} ${evt.action || ''} ${evt.path || ''} ${evt.username || ''} ${evt.reqId || ''}`.toLowerCase();
          if (!hay.includes(searchLower)) return false;
        }
        return true;
      })
      .slice(0, limit);
  }

  static async getSnapshot() {
    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const reqLastMin = this.requestTimestamps.filter((ts) => ts >= oneMinAgo).length;
    const errLastMin = this.errorTimestamps.filter((ts) => ts >= oneMinAgo).length;

    const recentHttp = this.buffer.filter((e) => e.category === 'HTTP' && typeof e.durationMs === 'number').slice(0, 100);
    const avgHttpLatencyMs =
      recentHttp.length > 0
        ? Math.round((recentHttp.reduce((acc, e) => acc + (e.durationMs || 0), 0) / recentHttp.length) * 100) / 100
        : 0;

    // Salud y métricas de PostgreSQL
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    let dbLatencyMs = 0;
    let totalTenants = 0;
    let activeTenants = 0;
    let totalUsers = 0;
    let activeSessions = 0;
    let salesTodayCount = 0;
    let salesTodayUsd = 0;
    let auditLast24hCount = 0;

    const dbStart = Date.now();
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [tStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${tenants.isActive} = true)::int`,
        })
        .from(tenants);

      const [uStats] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(users);

      const [sessStats] = await db
        .select({ active: sql<number>`count(*)::int` })
        .from(refreshTokens)
        .where(and(isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, new Date())));

      const [salesStats] = await db
        .select({
          count: sql<number>`count(*)::int`,
          totalUsd: sql<string>`coalesce(sum(${sales.totalAmountUsd}), 0)::text`,
        })
        .from(sales)
        .where(gte(sales.createdAt, startOfDay));

      const [auditStats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, last24h));

      dbLatencyMs = Date.now() - dbStart;
      totalTenants = tStats?.total || 0;
      activeTenants = tStats?.active || 0;
      totalUsers = uStats?.total || 0;
      activeSessions = sessStats?.active || 0;
      salesTodayCount = salesStats?.count || 0;
      salesTodayUsd = parseFloat(salesStats?.totalUsd || '0');
      auditLast24hCount = auditStats?.count || 0;
    } catch {
      dbStatus = 'disconnected';
      dbLatencyMs = Date.now() - dbStart;
    }

    const mem = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      system: {
        status: dbStatus === 'connected' ? 'HEALTHY' : 'DEGRADED',
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        memory: {
          rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
          heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        },
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        pool: {
          total: pool.totalCount || 0,
          idle: pool.idleCount || 0,
          active: Math.max(0, (pool.totalCount || 0) - (pool.idleCount || 0)),
        },
      },
      traffic: {
        requestsPerMin: reqLastMin,
        errorsPerMin: errLastMin,
        avgLatencyMs: avgHttpLatencyMs,
        bufferedEventsCount: this.buffer.length,
        connectedMonitors: this.sseClients.size,
      },
      platform: {
        totalTenants,
        activeTenants,
        suspendedTenants: Math.max(0, totalTenants - activeTenants),
        totalUsers,
        activeSessions,
        salesTodayCount,
        salesTodayUsd,
        auditLast24hCount,
      },
      recentEvents: this.buffer.slice(0, 60),
    };
  }

  static subscribe(req: Request, res: Response, userId: string) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.sseClients.set(clientId, { id: clientId, res, userId });

    // Enviar snapshot inicial inmediatamente
    this.getSnapshot()
      .then((snapshot) => {
        if (!res.writableEnded) {
          res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
        }
      })
      .catch(() => {});

    // Heartbeat periódico cada 5 segundos con telemetría actualizada
    const telemetryInterval = setInterval(async () => {
      if (res.writableEnded) return;
      try {
        const snapshot = await this.getSnapshot();
        res.write(`event: telemetry\ndata: ${JSON.stringify(snapshot)}\n\n`);
      } catch {
        // Ignorar errores transitorios de escritura
      }
    }, 5000);

    req.on('close', () => {
      clearInterval(telemetryInterval);
      this.sseClients.delete(clientId);
    });
  }

  private static broadcast(eventName: string, payload: any) {
    if (this.sseClients.size === 0) return;
    const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const [id, client] of this.sseClients.entries()) {
      try {
        if (!client.res.writableEnded) {
          client.res.write(data);
        } else {
          this.sseClients.delete(id);
        }
      } catch {
        this.sseClients.delete(id);
      }
    }
  }
}
