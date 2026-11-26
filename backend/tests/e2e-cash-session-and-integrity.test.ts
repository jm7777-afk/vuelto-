import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { TenantService } from '../src/services/tenant.service.js';
import { ExchangeRateService } from '../src/services/exchange-rate.service.js';

describe('Fase 4 E2E: Login -> Apertura Caja -> Venta Segura -> Factura PDF -> Cierre Caja', () => {
  const app = createApp();
  let superAdminId: string;
  let tenantId: string;
  let adminToken: string;
  let adminUsername: string;
  const adminPassword = 'E2eAdminPassword2026!';
  let productId: string;
  let customerId: string;
  let exchangeRateId: string;

  beforeAll(async () => {
    const [sa] = await db.select().from(users).where(eq(users.roleId, 'SUPER_ADMIN')).limit(1);
    if (!sa) throw new Error('SUPER_ADMIN requerido para E2E');
    superAdminId = sa.id;

    const slug = `e2e-pos-${Date.now()}`;
    adminUsername = `e2e_adm_${Date.now()}`;

    const created = await TenantService.createTenant(superAdminId, {
      slug,
      businessName: 'Restaurante Prueba E2E C.A.',
      tradeName: 'Prueba E2E',
      documentType: 'J',
      documentNumber: String(Math.floor(100000000 + Math.random() * 899999999)),
      fiscalAddress: 'Av. Bolívar, Caracas',
      phone: '04141112233',
      email: `${slug}@vuelto.ve`,
      isSpecialTaxpayer: false,
      adminUsername,
      adminEmail: `${adminUsername}@vuelto.ve`,
      adminFullName: 'Cajero Admin E2E',
      adminPassword,
    });
    tenantId = created.id;

    const rate = await ExchangeRateService.setManualRate(tenantId, created.adminUser!.id, 50.0, 'Tasa base E2E');
    exchangeRateId = rate.id!;
  });

  afterAll(async () => {
    if (tenantId && superAdminId) {
      await TenantService.deleteTenant(superAdminId, tenantId).catch(() => {});
    }
  });

  it('debe completar flujo comercial E2E validando precios en servidor, suficiencia de pago y arqueo de caja', async () => {
    // 1. Login real
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: adminUsername, password: adminPassword });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.tokens.accessToken;

    // 2. Obtener Consumidor Final creado automáticamente
    const custRes = await request(app)
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(custRes.status).toBe(200);
    customerId = custRes.body[0].id;

    // 3. Crear producto de $10.00 + 16% IVA ($11.60 total) con stock 10
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Almuerzo Ejecutivo',
        costPriceUsd: 5.0,
        salePriceUsd: 10.0,
        taxRate: 16,
        isExempt: false,
        initialStock: 10,
      });
    expect(prodRes.status).toBe(201);
    productId = prodRes.body.id;

    // 4. Apertura de caja con fondo inicial $20.00
    const openCashRes = await request(app)
      .post('/api/v1/cash-sessions/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalanceUsd: 20, openingBalanceBs: 1000, notes: 'Turno E2E' });
    expect(openCashRes.status).toBe(201);
    expect(openCashRes.body.session.status).toBe('OPEN');

    // 5. Intento de venta manipulando precio ($0.01) y pago insuficiente debe ser rechazado por el servidor
    const underpayRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', `e2e-underpay-${Date.now()}`)
      .send({
        customerId,
        exchangeRateId,
        lines: [{ productId, quantity: 1, unitPriceUsd: 0.01 }],
        payments: [{ paymentMethod: 'CASH_USD', currency: 'USD', amount: 1.0 }],
      });
    expect(underpayRes.status).toBeGreaterThanOrEqual(400);

    // 6. Venta válida ($10 + $1.60 IVA = $11.60) pagando $12.00 con vuelto de $0.40 en efectivo
    const saleRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', `e2e-valid-${Date.now()}`)
      .send({
        customerId,
        exchangeRateId,
        lines: [{ productId, quantity: 1, unitPriceUsd: 10.0 }],
        payments: [{ paymentMethod: 'CASH_USD', currency: 'USD', amount: 12.0 }],
        vueltoOption: { type: 'CASH', amountUsd: 0.40 },
      });
    expect(saleRes.status).toBe(201);
    expect(saleRes.body.totalAmountUsd).toBe('11.60');
    const saleId = saleRes.body.id;

    // 7. Descargar factura PDF
    const pdfRes = await request(app)
      .get(`/api/v1/sales/${saleId}/receipt/pdf`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');

    // 8. Verificar estado de caja abierta antes del cierre ($20 + $11.60 = $31.60)
    const curCashRes = await request(app)
      .get('/api/v1/cash-sessions/current')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(curCashRes.status).toBe(200);
    expect(curCashRes.body.session.liveMetrics.expectedTotalUsd).toBe('31.60');

    // 9. Cierre Z de caja ($31.60 esperado vs $31.60 declarado => diferencia $0.00)
    const closeCashRes = await request(app)
      .post('/api/v1/cash-sessions/close')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ closingDeclaredUsd: 31.60, closingDeclaredBs: 1580.0, notes: 'Cierre exacto' });
    expect(closeCashRes.status).toBe(200);
    expect(closeCashRes.body.session.status).toBe('CLOSED');
    expect(closeCashRes.body.session.discrepancyUsd).toBe('0.00');
  }, 30000);
});

