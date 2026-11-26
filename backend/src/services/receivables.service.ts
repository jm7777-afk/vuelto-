import { eq, and, desc, sql, gt } from 'drizzle-orm';
import { withTenant } from '../db/tenantDb.js';
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
    const config = await LateFeeService.getConfig(tenantId);

    const { bcvRate, debtorCustomers } = await withTenant(tenantId, async (tx) => {
      const [rateRow] = await tx
        .select()
        .from(exchangeRateSnapshots)
        .where(and(eq(exchangeRateSnapshots.tenantId, tenantId), eq(exchangeRateSnapshots.source, 'BCV')))
        .orderBy(desc(exchangeRateSnapshots.validFrom))
        .limit(1);

      const rate = rateRow ? parseFloat(rateRow.rate) : 52.50;

      const debtors = await tx
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

      return { bcvRate: rate, debtorCustomers: debtors };
    });

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
    if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
      throw new Error('El monto del abono debe ser mayor a cero');
    }

    return await withTenant(tenantId, async (tx) => {
      const [customer] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.id, input.customerId)))
        .for('update');

      if (!customer) throw new Error('Cliente no encontrado');

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

      const amountBs = input.amountBs ?? +(input.amountUsd * rate).toFixed(2);
      const currentDebt = parseFloat(customer.balanceDue);
      const newDebt = Math.max(0, +(currentDebt - input.amountUsd).toFixed(2));

      await tx
        .update(customers)
        .set({ balanceDue: newDebt.toFixed(2), updatedAt: new Date() })
        .where(eq(customers.id, customer.id));

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
      }, tx);

      return {
        payment,
        remainingDebtUsd: newDebt.toFixed(2),
        remainingDebtBs: (newDebt * rate).toFixed(2),
      };
    });
  }

  static async getPaymentHistory(tenantId: string, customerId?: string) {
    return await withTenant(tenantId, (tx) =>
      tx
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
        .orderBy(desc(receivablePayments.createdAt))
    );
  }
}
