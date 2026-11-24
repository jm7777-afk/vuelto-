import crypto from 'crypto';
import {
  PaymentGateway,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  VueltoPagoMovilParams,
  VueltoPagoMovilResult,
} from './payment.interface.js';

/**
 * MockPaymentGateway: Implementación modular lista para pruebas y entornos de desarrollo/staging.
 * Simula el comportamiento de pasarelas venezolanas (Wayu Pay, VEXPay, QuickLink)
 * con soporte para verificación criptográfica HMAC-SHA256 y emisión de vuelto en Pago Móvil.
 */
export class MockPaymentGateway implements PaymentGateway {
  name = 'MOCK_VENEZUELA_GATEWAY';

  private static sharedIntents = new Map<string, { status: 'PENDING' | 'APPROVED' | 'REJECTED'; referenceNumber?: string }>();

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const intentId = `mock_c2p_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Por defecto, marcamos como aprobado en mock para agilizar pruebas
    MockPaymentGateway.sharedIntents.set(intentId, {
      status: 'APPROVED',
      referenceNumber: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    return {
      intentId,
      status: 'APPROVED',
      paymentUrl: `https://mock-gateway.vuelto.ve/pay/${intentId}`,
      amountBs: params.amountBs,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
    };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret: string): boolean {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const computedSignature = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
    const sigBuf = Buffer.from(signature);
    const compBuf = Buffer.from(computedSignature);
    if (sigBuf.length !== compBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, compBuf);
  }

  async checkPaymentStatus(intentId: string): Promise<{ status: 'PENDING' | 'APPROVED' | 'REJECTED'; referenceNumber?: string }> {
    const existing = MockPaymentGateway.sharedIntents.get(intentId);
    if (!existing) {
      return { status: 'REJECTED' };
    }
    return existing;
  }

  async sendVueltoPagoMovil(params: VueltoPagoMovilParams): Promise<VueltoPagoMovilResult> {
    // Simula emisión instantánea de pago móvil de vuelto
    const ref = `VUELTO-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      success: true,
      referenceNumber: ref,
      amountBs: params.amountBs,
      timestamp: new Date(),
    };
  }
}
