import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tenantConfigurations, customers, exchangeRateSnapshots } from '../db/schema.js';
import { AuditService } from './audit.service.js';

export interface LateFeeConfig {
  lateFeePercentage: number;
  lateFeeGraceDays: number;
  autoApplyLateFee: boolean;
  currencyPreference: string;
}

export class LateFeeService {
  static async getConfig(tenantId: string): Promise<LateFeeConfig> {
    const [config] = await db
      .select()
      .from(tenantConfigurations)
      .where(eq(tenantConfigurations.tenantId, tenantId))
      .limit(1);

    if (!config) {
      return {
        lateFeePercentage: 5.0,
        lateFeeGraceDays: 3,
        autoApplyLateFee: true,
        currencyPreference: 'USD',
      };
    }

    return {
      lateFeePercentage: parseFloat(config.lateFeePercentage) || 5.0,
      lateFeeGraceDays: config.lateFeeGraceDays || 3,
      autoApplyLateFee: config.autoApplyLateFee,
      currencyPreference: config.currencyPreference || 'USD',
    };
  }

  static async updateConfig(
    tenantId: string,
    userId: string,
    data: {
      lateFeePercentage?: number;
      lateFeeGraceDays?: number;
      autoApplyLateFee?: boolean;
      currencyPreference?: string;
    }
  ) {
    const existing = await db
      .select()
      .from(tenantConfigurations)
      .where(eq(tenantConfigurations.tenantId, tenantId))
      .limit(1);

    let updated;
    if (existing.length > 0) {
      [updated] = await db
        .update(tenantConfigurations)
        .set({
          lateFeePercentage: data.lateFeePercentage !== undefined ? data.lateFeePercentage.toFixed(2) : undefined,
          lateFeeGraceDays: data.lateFeeGraceDays,
          autoApplyLateFee: data.autoApplyLateFee,
          currencyPreference: data.currencyPreference,
          updatedAt: new Date(),
        })
        .where(eq(tenantConfigurations.tenantId, tenantId))
        .returning();
    } else {
      [updated] = await db
        .insert(tenantConfigurations)
        .values({
          tenantId,
          lateFeePercentage: (data.lateFeePercentage || 5.0).toFixed(2),
          lateFeeGraceDays: data.lateFeeGraceDays ?? 3,
          autoApplyLateFee: data.autoApplyLateFee ?? true,
          currencyPreference: data.currencyPreference || 'USD',
        })
        .returning();
    }

    await AuditService.log({
      tenantId,
      userId,
      action: 'LATE_FEE_CONFIG_UPDATED',
      entity: 'tenant_configuration',
      entityId: updated.id,
      payload: data,
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    return updated;
  }

  static async calculateCustomerLateFee(tenantId: string, customerId: string) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, customerId)))
      .limit(1);

    if (!customer) throw new Error('Cliente no encontrado');

    const config = await this.getConfig(tenantId);
    const balanceDueUsd = parseFloat(customer.balanceDue);

    // Obtener última tasa oficial BCV
    const [rateRow] = await db
      .select()
      .from(exchangeRateSnapshots)
      .where(and(eq(exchangeRateSnapshots.tenantId, tenantId), eq(exchangeRateSnapshots.source, 'BCV')))
      .orderBy(exchangeRateSnapshots.validFrom)
      .limit(1);

    const bcvRate = rateRow ? parseFloat(rateRow.rate) : 52.50;

    const isOverdue = balanceDueUsd > 0;
    const surchargeAmountUsd = isOverdue && config.autoApplyLateFee ? balanceDueUsd * (config.lateFeePercentage / 100) : 0;
    const totalToPayUsd = balanceDueUsd + surchargeAmountUsd;
    const totalToPayBs = totalToPayUsd * bcvRate;

    const whatsappMessage = `Estimado(a) ${customer.name}, le informamos de su saldo pendiente en cuenta por $${balanceDueUsd.toFixed(2)} USD.${surchargeAmountUsd > 0 ? ` Presenta recargo por mora del ${config.lateFeePercentage}% ($${surchargeAmountUsd.toFixed(2)} USD). Total a cancelar: $${totalToPayUsd.toFixed(2)} USD (${totalToPayBs.toFixed(2)} Bs a tasa BCV: ${bcvRate.toFixed(2)}).` : ` Total a cancelar: $${totalToPayUsd.toFixed(2)} USD (${totalToPayBs.toFixed(2)} Bs).`} Agradecemos su pronta gestión.`;

    return {
      customerId: customer.id,
      customerName: customer.name,
      document: `${customer.documentType}-${customer.documentNumber}`,
      phone: customer.phone,
      balanceDueUsd: balanceDueUsd.toFixed(2),
      balanceDueBs: (balanceDueUsd * bcvRate).toFixed(2),
      lateFeePercentage: config.lateFeePercentage,
      surchargeAmountUsd: surchargeAmountUsd.toFixed(2),
      totalToPayUsd: totalToPayUsd.toFixed(2),
      totalToPayBs: totalToPayBs.toFixed(2),
      bcvRate,
      whatsappMessage,
      whatsappLink: customer.phone ? `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}` : null,
    };
  }
}
