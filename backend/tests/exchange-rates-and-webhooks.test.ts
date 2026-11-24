import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MockPaymentGateway } from '../src/gateways/mock-payment.gateway.js';

describe('Fase 4: Tasas de Cambio y Webhooks C2P', () => {
  const app = createApp();
  const webhookSecret = 'vuelto-payment-webhook-secret-2026';
  const gateway = new MockPaymentGateway();

  it('debe procesar exitosamente un webhook C2P con firma criptográfica HMAC-SHA256 válida', async () => {
    // 1. Crear intención previa
    const intent = await gateway.createPaymentIntent({
      tenantId: 'tenant-webhook-test',
      amountBs: 450.0,
      customerDocType: 'V',
      customerDocNumber: '12345678',
      customerPhone: '04141234567',
      referenceId: 'ref_123',
      description: 'Pago Venta',
    });

    const payload = JSON.stringify({
      event: 'payment.approved',
      intentId: intent.intentId,
      tenantId: 'tenant-webhook-test',
      amountBs: 450.0,
    });

    // Calcular firma contra el cuerpo crudo
    const signature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    const res = await request(app)
      .post('/api/v1/payments/webhooks')
      .set('Content-Type', 'application/json')
      .set('X-Signature-SHA256', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('conciliated');
    expect(res.body.reference).toBeDefined();
  });

  it('debe rechazar un webhook con firma alterada o inválida (401)', async () => {
    const payload = JSON.stringify({
      event: 'payment.approved',
      intentId: 'fake_intent',
      tenantId: 'tenant-webhook-test',
      amountBs: 1000.0,
    });

    const tamperedSignature = crypto.createHmac('sha256', 'wrong-secret').update(payload).digest('hex');

    const res = await request(app)
      .post('/api/v1/payments/webhooks')
      .set('Content-Type', 'application/json')
      .set('X-Signature-SHA256', tamperedSignature)
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });
});
