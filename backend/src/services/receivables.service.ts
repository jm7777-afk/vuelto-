import { eq, and, desc, sql, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers, receivablePayments, exchangeRateSnapshots } from '../db/schema.js';
import { LateFeeService } from './late-fee.service.js';
import { AuditService } from './audit.service.js';

export interface RegisterPaymentInput {
  customerId: string;
  paymentMethod: 'CASH_USD' | 'PAGO_MOVIL' | 'TRANSFER' | 'DEBIT_CARD';
  amountUsd: number;
  amountBs?: number;
  rateValue?: number;
  referenceNumber?: string;
  notes?: string;
  lateFeeAppliedUsd?: number;
}

export class ReceivablesService {
  static async listDebtors(tenantId: string) {
    // Buscar tasa BCV
    const [rateRow] = await db
      .select()
      .from(exchangeRateSnapshots)
      .where(and(eq(exchangeRateSnapshots.tenantId, tenantId), eq(exchangeRateSnapshots.source, 'BCV')))
      .orderBy(desc(exchangeRateSnapshots.validFrom))
      .limit(1);

    const bcvRate = rateRow ? parseFloat(rateRow.rate) : 52.50;
    const config = await LateFeeService.getConfig(tenantId);

    const debtorCustomers = await db
      .select({
        id: customers.id,
        name: customers.name,
        documentType: customers.documentType,
        documentNumber: customers.documentNumber,
        phone: customers.phone,
        email: customers.email,
        creditLimit: customers.creditLimit,
        balanceDue: customers.balanceDue,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), gt(customers.balanceDue, '0')))
      .orderBy(desc(customers.balanceDue));

    return debtorCustomers.map((c) => {
      const debtUsd = parseFloat(c.balanceDue);
      const surcharge = config.autoApplyLateFee ? debtUsd * (config.lateFeePercentage / 100) : 0;
      const totalToPayUsd = debtUsd + surcharge;

      return {
        ...c,
        balanceDueUsd: debtUsd,
        balanceDueBs: debtUsd * bcvRate,
        lateFeePercentage: config.lateFeePercentage,
        surchargeUsd: surcharge,
        totalWithLateFeeUsd: totalToPayUsd,
        totalWithLateFeeBs: totalToPayUsd * bcvRate,
        bcvRate,
      };
    });
  }

  static async registerPayment(tenantId: string, userId: string, input: RegisterPaymentInput) {
    return await db.transaction(async (tx) => {
      const [customer] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.id, input.customerId)));

      if (!customer) throw new Error('Cliente no encontrado');

      // Buscar tasa si no viene
      let rate = input.rateValue;
      if (!rate) {
        const [rateRow] = await tx
          .select()
          .from(exchangeRateSnapshots)
          .where(and(eq(exchangeRateSnapshots.tenantId, tenantId), eq(exchangeRateSnapshots.source, 'BCV')))
          .orderBy(desc(exchangeRateSnapshots.validFrom))
          .limit(1);
        rate = rateRow ? parseFloat(rateRow.rate) : 52.50;
      }

      const amountBs = input.amountBs ?? input.amountUsd * rate;
      const currentDebt = parseFloat(customer.balanceDue);
      const newDebt = Math.max(0, currentDebt - input.amountUsd);

      // 1. Actualizar balance del cliente
      await tx
        .update(customers)
        .set({ balanceDue: newDebt.toFixed(2), updatedAt: new Date() })
        .where(eq(customers.id, customer.id));

      // 2. Registrar comprobante de abono
      const [payment] = await tx
        .insert(receivablePayments)
        .values({
          tenantId,
          customerId: input.customerId,
          paymentMethod: input.paymentMethod,
          amountUsd: input.amountUsd.toFixed(2),
          amountBs: amountBs.toFixed(2),
          rateValue: rate.toFixed(4),
          lateFeeAppliedUsd: (input.lateFeeAppliedUsd || 0).toFixed(2),
          referenceNumber: input.referenceNumber,
          notes: input.notes,
        })
        .returning();

      // 3. Auditoría
      await AuditService.log({
        tenantId,
        userId,
        action: 'RECEIVABLE_PAYMENT_REGISTERED',
        entity: 'receivable_payment',
        entityId: payment.id,
        payload: {
          customerName: customer.name,
          amountUsd: input.amountUsd,
          remainingDebt: newDebt,
          paymentMethod: input.paymentMethod,
        },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
      });

      return {
        payment,
        remainingDebtUsd: newDebt.toFixed(2),
        remainingDebtBs: (newDebt * rate).toFixed(2),
      };
    });
  }

  static async getPaymentHistory(tenantId: string, customerId?: string) {
    let query = db
      .select({
        id: receivablePayments.id,
        customerId: receivablePayments.customerId,
        customerName: customers.name,
        customerDoc: sql`concat(${customers.documentType}, '-', ${customers.documentNumber})`,
        paymentMethod: receivablePayments.paymentMethod,
        amountUsd: receivablePayments.amountUsd,
        amountBs: receivablePayments.amountBs,
        rateValue: receivablePayments.rateValue,
        lateFeeAppliedUsd: receivablePayments.lateFeeAppliedUsd,
        referenceNumber: receivablePayments.referenceNumber,
        notes: receivablePayments.notes,
        createdAt: receivablePayments.createdAt,
      })
      .from(receivablePayments)
      .innerJoin(customers, eq(receivablePayments.customerId, customers.id))
      .where(
        customerId
          ? and(eq(receivablePayments.tenantId, tenantId), eq(receivablePayments.customerId, customerId))
          : eq(receivablePayments.tenantId, tenantId)
      )
      .orderBy(desc(receivablePayments.createdAt));

    return await query;
  }
}
