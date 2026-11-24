import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { MockPaymentGateway } from '../src/gateways/mock-payment.gateway.js';

describe('PaymentGateway & Vuelto Mechanisms', () => {
  const gateway = new MockPaymentGateway();
  const secretKey = 'test-secret-webhook-key-2026';

  it('debe crear una intención de cobro Pago Móvil C2P', async () => {
    const result = await gateway.createPaymentIntent({
      tenantId: 'tenant-123',
      amountBs: 520.5,
      customerDocType: 'V',
      customerDocNumber: '12345678',
      customerPhone: '04141234567',
      referenceId: 'sale-abc',
      description: 'Cobro Venta Factura A-000001',
    });

    expect(result.intentId).toBeDefined();
    expect(result.status).toBe('APPROVED');
    expect(result.amountBs).toBe(520.5);
  });

  it('debe verificar la firma criptográfica HMAC-SHA256 de webhooks', () => {
    const payload = JSON.stringify({
      event: 'payment.completed',
      intentId: 'mock_c2p_123',
      amountBs: 850.0,
      reference: 'REF-987654',
    });

    // Firma válida calculada por la pasarela
    const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');

    const isValid = gateway.verifyWebhookSignature(payload, signature, secretKey);
    expect(isValid).toBe(true);

    // Firma manipulada
    const isInvalid = gateway.verifyWebhookSignature(payload, 'bad_signature_123456', secretKey);
    expect(isInvalid).toBe(false);
  });

  it('debe soportar la emisión de vuelto en Pago Móvil (sendVueltoPagoMovil)', async () => {
    const vuelto = await gateway.sendVueltoPagoMovil({
      tenantId: 'tenant-123',
      amountBs: 150.0,
      destinationBankCode: '0102', // Banco de Venezuela
      destinationPhone: '04141234567',
      destinationDocType: 'V',
      destinationDocNumber: '12345678',
      saleId: 'sale-abc',
    });

    expect(vuelto.success).toBe(true);
    expect(vuelto.referenceNumber).toContain('VUELTO-');
    expect(vuelto.amountBs).toBe(150.0);
  });
});
