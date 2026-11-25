import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { JwtService } from '../src/services/jwt.service.js';

describe('Fase 4: Observabilidad, Métricas Prometheus y Healthchecks', () => {
  const app = createApp();

  // 1. Health Liveness Probe
  it('1. GET /health/live retorna 200 OK con uptime y timestamp', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('live');
    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  // 2. Health Readiness Probe
  it('2. GET /health/ready verifica conectividad a la base de datos PostgreSQL', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('connected');
    expect(typeof res.body.latencyMs).toBe('number');
  });

  // 3. Health Deep Probe (Diagnóstico autenticado)
  it('3. GET /health/deep rechaza peticiones no autenticadas (403)', async () => {
    const res = await request(app).get('/health/deep');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('4. GET /health/deep retorna métricas detalladas con token de Admin', async () => {
    const adminToken = JwtService.generateTokenPair({
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: 'a0000000-0000-0000-0000-000000000001',
      roleId: 'ADMIN',
      username: 'admin_health_test',
      fullName: 'Health Admin',
    }).accessToken;

    const res = await request(app)
      .get('/health/deep')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database.status).toBe('connected');
    expect(typeof res.body.database.latencyMs).toBe('number');
    expect(res.body.memory).toHaveProperty('rssMb');
    expect(res.body.memory).toHaveProperty('heapUsedMb');
  });

  // 5. Correlation ID en Headers HTTP
  it('5. Middleware de Observabilidad asigna y propaga header X-Request-Id', async () => {
    const customReqId = 'custom-trace-uuid-123456';
    const res = await request(app)
      .get('/health/live')
      .set('x-request-id', customReqId);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customReqId);

    // Si no se envía x-request-id, el backend debe autogenerar uno
    const autoRes = await request(app).get('/health/live');
    expect(autoRes.status).toBe(200);
    expect(autoRes.headers['x-request-id']).toBeDefined();
    expect(autoRes.headers['x-request-id'].length).toBeGreaterThan(10);
  });

  // 6. Métricas Prometheus GET /metrics
  it('6. GET /metrics expone métricas en formato estándar de Prometheus incluyendo las 5 métricas requeridas', async () => {
    // Generar algo de tráfico para que las métricas tengan valores
    await request(app).get('/health/live');
    await request(app).get('/health/ready');

    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');

    const metricsBody = res.text;

    // Verificar las 5 métricas requeridas por el prompt maestro:
    // 1. http_request_duration_seconds
    expect(metricsBody).toContain('http_request_duration_seconds');
    // 2. http_requests_total
    expect(metricsBody).toContain('http_requests_total');
    // 3. sales_total
    expect(metricsBody).toContain('sales_total');
    // 4. db_pool_connections
    expect(metricsBody).toContain('db_pool_connections');
    // 5. alerts_low_stock_total
    expect(metricsBody).toContain('alerts_low_stock_total');
  });
});
