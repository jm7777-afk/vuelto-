import promClient from 'prom-client';
import { pool } from '../db/index.js';

// Registrar métricas estándar de NodeJS (CPU, Memoria, Event Loop)
promClient.collectDefaultMetrics({ prefix: 'vuelto_' });

// 1. Histograma de latencia HTTP
export const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'path', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// 2. Contador de peticiones HTTP por tenant
export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP recibidas desglosadas por tenant',
  labelNames: ['method', 'path', 'status', 'tenant_id'] as const,
});

// 3. Contador de ventas procesadas
export const salesTotal = new promClient.Counter({
  name: 'sales_total',
  help: 'Total de transacciones de venta procesadas en la plataforma',
  labelNames: ['tenant_id', 'currency', 'payment_method'] as const,
});

// 4. Gauge de conexiones al pool de PostgreSQL
export const dbPoolConnections = new promClient.Gauge({
  name: 'db_pool_connections',
  help: 'Estado de las conexiones en el pool de PostgreSQL (activas, inactivas, total)',
  labelNames: ['state'] as const,
});

// 5. Contador de alertas de inventario crítico / stock bajo
export const alertsLowStockTotal = new promClient.Counter({
  name: 'alerts_low_stock_total',
  help: 'Total de alertas de reposición o stock bajo disparadas',
  labelNames: ['tenant_id'] as const,
});

export class MetricsService {
  static updatePoolMetrics(): void {
    try {
      const total = pool.totalCount || 0;
      const idle = pool.idleCount || 0;
      const active = Math.max(0, total - idle);

      dbPoolConnections.set({ state: 'total' }, total);
      dbPoolConnections.set({ state: 'idle' }, idle);
      dbPoolConnections.set({ state: 'active' }, active);
    } catch {
      // Ignorar si el pool aún no está inicializado
    }
  }

  static async getMetrics(): Promise<string> {
    this.updatePoolMetrics();
    return promClient.register.metrics();
  }

  static getContentType(): string {
    return promClient.register.contentType;
  }

  static recordSale(tenantId: string, currency: string, paymentMethod: string): void {
    salesTotal.inc({
      tenant_id: tenantId,
      currency,
      payment_method: paymentMethod,
    });
  }

  static recordLowStock(tenantId: string): void {
    alertsLowStockTotal.inc({ tenant_id: tenantId });
  }
}
