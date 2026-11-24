import { Request, Response, NextFunction } from 'express';
import { MockPaymentGateway } from '../gateways/mock-payment.gateway.js';
import { AuditService } from '../services/audit.service.js';
import { env } from '../config/env.js';

const paymentGateway = new MockPaymentGateway();

export class PaymentController {
  /**
   * Crear intención de cobro Pago Móvil C2P
   */
  static async createIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const { amountBs, customerDocType, customerDocNumber, customerPhone, referenceId } = req.body;

      const result = await paymentGateway.createPaymentIntent({
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
   * Regla de seguridad: Se verifica la firma contra el rawBody Y se consulta el estado en la API
   * antes de conciliar cualquier cobro.
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = (req.headers['x-signature-sha256'] as string) || '';
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'vuelto-payment-webhook-secret-2026';

      // 1. Verificación criptográfica contra el cuerpo crudo
      if (!req.rawBody) {
        res.status(400).json({ code: 'RAW_BODY_MISSING', message: 'Cuerpo crudo de petición no disponible' });
        return;
      }

      const isValidSignature = paymentGateway.verifyWebhookSignature(req.rawBody, signature, webhookSecret);
      if (!isValidSignature) {
        res.status(401).json({ code: 'INVALID_SIGNATURE', message: 'Firma HMAC de webhook inválida' });
        return;
      }

      const payload = req.body;
      const { intentId, tenantId, amountBs } = payload;

      // 2. Conciliación Server-Side Obligatoria: Consultar estado real en la API de la pasarela
      const gatewayStatus = await paymentGateway.checkPaymentStatus(intentId);

      if (gatewayStatus.status !== 'APPROVED') {
        res.status(200).json({ status: 'ignored', reason: 'Payment not approved by gateway' });
        return;
      }

      // 3. Registrar auditoría de conciliación exitosa
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
