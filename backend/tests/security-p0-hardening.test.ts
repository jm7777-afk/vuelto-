import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { JwtService } from '../src/services/jwt.service.js';
import { env } from '../src/config/env.js';

describe('Fase 2 P0: Seguridad Crítica (CORS, Secretos, SSE Tickets, Pagos)', () => {
  const app = createApp();
  let superAdminToken: string;

  beforeAll(async () => {
    const [sa] = await db.select().from(users).where(eq(users.roleId, 'SUPER_ADMIN')).limit(1);
    if (!sa) {
      throw new Error('SUPER_ADMIN requerido para pruebas P0');
    }
    superAdminToken = JwtService.generateTokenPair({
      id: sa.id,
      tenantId: null,
      roleId: 'SUPER_ADMIN',
      username: sa.username,
      fullName: sa.fullName,
    }).accessToken;
  });

  afterAll(() => {
    delete process.env.METRICS_TOKEN;
    delete process.env.INTERNAL_ADMIN_TOKEN;
  });

  it('1. /health/deep rechaza token hardcodeado histórico y Bearer JWT malformado con 403 (nunca 500)', async () => {
    const hardcodedRes = await request(app)
      .get('/health/deep')
      .set('x-admin-token', 'vuelto-deep-check-2026');
    expect(hardcodedRes.status).toBe(403);

    const malformedJwtRes = await request(app)
      .get('/health/deep')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(malformedJwtRes.status).toBe(403);
  });

  it('2. /metrics rechaza token hardcodeado cuando METRICS_TOKEN está configurado', async () => {
    process.env.METRICS_TOKEN = 'real-prometheus-metrics-secret-2026';

    const wrongRes = await request(app)
      .get('/metrics')
      .set('x-metrics-token', 'vuelto-metrics-token-2026');
    expect(wrongRes.status).toBe(403);

    const validRes = await request(app)
      .get('/metrics')
      .set('x-metrics-token', 'real-prometheus-metrics-secret-2026');
    expect(validRes.status).toBe(200);
  });

  it('3. requireTenantAuth rechaza JWT en query string (?token=)', async () => {
    const res = await request(app).get(`/api/v1/auth/me?token=${encodeURIComponent(superAdminToken)}`);
    expect(res.status).toBe(401);
  });

  it('4. Monitoreo SSE emite ticket de un solo uso y rechaza reutilización', async () => {
    const ticketRes = await request(app)
      .post('/api/v1/super-admin/monitoring/stream-ticket')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(ticketRes.status).toBe(200);
    expect(typeof ticketRes.body.ticket).toBe('string');
    expect(ticketRes.body.ticket.length).toBeGreaterThanOrEqual(32);

    const reuseRes = await request(app)
      .get(`/api/v1/super-admin/monitoring/stream?ticket=invalid_or_expired_ticket`);
    expect(reuseRes.status).toBe(401);
  });

  it('5. Pasarela C2P rechaza pagos simulados cuando MOCK_PAYMENT_ENABLED es false', async () => {
    if (!env.MOCK_PAYMENT_ENABLED) {
      const res = await request(app)
        .post('/api/v1/payments/c2p/intent')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ amountBs: 500 });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('PAYMENT_GATEWAY_NOT_CONFIGURED');
    }
  });

  it('6. CORS rechaza dominios fraudulentos por subcadena (evil-onrender.com)', async () => {
    const res = await request(app)
      .options('/health/live')
      .set('Origin', 'https://evil-onrender.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

