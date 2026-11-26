import { Request, Response, NextFunction } from 'express';
import { MockPaymentGateway } from '../gateways/mock-payment.gateway.js';
import { AuditService } from '../services/audit.service.js';
import { env } from '../config/env.js';

const mockGateway = new MockPaymentGateway();
const processedWebhookIntents = new Map<string, { referenceNumber?: string; processedAt: number }>();

export class PaymentController {
  /**
   * Crear intención de cobro Pago Móvil C2P.
   * Bloqueado por defecto en producción o si MOCK_PAYMENT_ENABLED=false.
   */
  static async createIntent(req: Request, res: Response, next: NextFunction) {
    try {
      if (env.NODE_ENV === 'production' || !env.MOCK_PAYMENT_ENABLED) {
        res.status(503).json({
          code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
          message: 'La pasarela de pagos en modo simulado está deshabilitada. Configure un proveedor C2P productivo.',
        });
        return;
      }

      const { amountBs, customerDocType, customerDocNumber, customerPhone, referenceId } = req.body;

      const result = await mockGateway.createPaymentIntent({
        tenantId: req.tenantId!,
        amountBs,
        customerDocType,
        customerDocNumber,
        customerPhone,
        referenceId: referenceId || `ref_${Date.now()}`,
        description: 'Cobro de Venta Vuelto',
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Webhook de pasarela Pago Móvil C2P
   * Regla de seguridad: verifica firma HMAC-SHA256 contra rawBody, exige secreto configurado,
   * aplica idempotencia por intentId y valida el estado real en la pasarela.
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = (req.headers['x-signature-sha256'] as string) || '';
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

      if (!webhookSecret) {
        res.status(503).json({
          code: 'WEBHOOK_SECRET_NOT_CONFIGURED',
          message: 'PAYMENT_WEBHOOK_SECRET no configurado en el servidor',
        });
        return;
      }

      if (!req.rawBody) {
        res.status(400).json({ code: 'RAW_BODY_MISSING', message: 'Cuerpo crudo de petición no disponible' });
        return;
      }

      const isValidSignature = mockGateway.verifyWebhookSignature(req.rawBody, signature, webhookSecret);
      if (!isValidSignature) {
        res.status(401).json({ code: 'INVALID_SIGNATURE', message: 'Firma HMAC de webhook inválida' });
        return;
      }

      const { intentId, tenantId, amountBs } = req.body || {};
      if (!intentId || typeof intentId !== 'string') {
        res.status(400).json({ code: 'INVALID_WEBHOOK_PAYLOAD', message: 'intentId es obligatorio' });
        return;
      }

      const existingProcessed = processedWebhookIntents.get(intentId);
      if (existingProcessed) {
        res.status(200).json({
          status: 'already_conciliated',
          intentId,
          reference: existingProcessed.referenceNumber,
        });
        return;
      }

      if (!env.MOCK_PAYMENT_ENABLED && env.NODE_ENV === 'production') {
        res.status(503).json({
          code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
          message: 'Conciliación automática no disponible sin conector bancario productivo configurado.',
        });
        return;
      }

      const gatewayStatus = await mockGateway.checkPaymentStatus(intentId);

      if (gatewayStatus.status !== 'APPROVED') {
        res.status(200).json({ status: 'ignored', reason: 'Payment not approved by gateway' });
        return;
      }

      processedWebhookIntents.set(intentId, {
        referenceNumber: gatewayStatus.referenceNumber,
        processedAt: Date.now(),
      });

      if (tenantId) {
        await AuditService.log({
          tenantId,
          action: 'PAYMENT_CONCILIATED',
          entity: 'payment',
          entityId: intentId,
          payload: { intentId, amountBs, reference: gatewayStatus.referenceNumber },
          result: 'SUCCESS',
          channel: 'SYSTEM_JOB',
        });
      }

      res.status(200).json({ status: 'conciliated', intentId, reference: gatewayStatus.referenceNumber });
    } catch (err) {
      next(err);
    }
  }
}
