import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tenantConfigurations, tenants } from '../db/schema.js';
import { AuditService } from './audit.service.js';

export interface TenantConfigDto {
  lateFeePercentage: number;
  lateFeeGraceDays: number;
  autoApplyLateFee: boolean;
  currencyPreference: string;
  activeRateSource: 'BCV' | 'PARALELO' | 'EURO' | 'CUSTOM';
  customRateValue: number;
  enableIva: boolean;
  enableIgtf: boolean;
  defaultIvaPercentage: number;
  defaultProfitMargin: number;
  requireAdminForOverdueDebt: boolean;
}

export class ConfigService {
  static async getConfig(tenantId: string): Promise<TenantConfigDto> {
    const [config] = await db
      .select()
      .from(tenantConfigurations)
      .where(eq(tenantConfigurations.tenantId, tenantId))
      .limit(1);

    if (!config) {
      // Registrar defaults seguros para el tenant
      const [inserted] = await db
        .insert(tenantConfigurations)
        .values({
          tenantId,
          lateFeePercentage: '5.00',
          lateFeeGraceDays: 3,
          autoApplyLateFee: true,
          currencyPreference: 'USD',
          activeRateSource: 'BCV',
          customRateValue: '0.0000',
          enableIva: true,
          enableIgtf: true,
          defaultIvaPercentage: '16.00',
          defaultProfitMargin: '30.00',
          requireAdminForOverdueDebt: true,
        })
        .returning();

      return {
        lateFeePercentage: parseFloat(inserted.lateFeePercentage),
        lateFeeGraceDays: inserted.lateFeeGraceDays,
        autoApplyLateFee: inserted.autoApplyLateFee,
        currencyPreference: inserted.currencyPreference,
        activeRateSource: inserted.activeRateSource as any,
        customRateValue: parseFloat(inserted.customRateValue),
        enableIva: inserted.enableIva,
        enableIgtf: inserted.enableIgtf,
        defaultIvaPercentage: parseFloat(inserted.defaultIvaPercentage),
        defaultProfitMargin: parseFloat(inserted.defaultProfitMargin),
        requireAdminForOverdueDebt: inserted.requireAdminForOverdueDebt,
      };
    }

    return {
      lateFeePercentage: parseFloat(config.lateFeePercentage),
      lateFeeGraceDays: config.lateFeeGraceDays,
      autoApplyLateFee: config.autoApplyLateFee,
      currencyPreference: config.currencyPreference,
      activeRateSource: config.activeRateSource as any,
      customRateValue: parseFloat(config.customRateValue),
      enableIva: config.enableIva,
      enableIgtf: config.enableIgtf,
      defaultIvaPercentage: parseFloat(config.defaultIvaPercentage),
      defaultProfitMargin: parseFloat(config.defaultProfitMargin),
      requireAdminForOverdueDebt: config.requireAdminForOverdueDebt,
    };
  }

  static async updateConfig(tenantId: string, userId: string, input: Partial<TenantConfigDto>) {
    const existing = await this.getConfig(tenantId);

    const updateData: any = { updatedAt: new Date() };

    if (input.lateFeePercentage !== undefined) updateData.lateFeePercentage = input.lateFeePercentage.toFixed(2);
    if (input.lateFeeGraceDays !== undefined) updateData.lateFeeGraceDays = input.lateFeeGraceDays;
    if (input.autoApplyLateFee !== undefined) updateData.autoApplyLateFee = input.autoApplyLateFee;
    if (input.currencyPreference !== undefined) updateData.currencyPreference = input.currencyPreference;
    if (input.activeRateSource !== undefined) updateData.activeRateSource = input.activeRateSource;
    if (input.customRateValue !== undefined) updateData.customRateValue = input.customRateValue.toFixed(4);
    if (input.enableIva !== undefined) updateData.enableIva = input.enableIva;
    if (input.enableIgtf !== undefined) updateData.enableIgtf = input.enableIgtf;
    if (input.defaultIvaPercentage !== undefined) updateData.defaultIvaPercentage = input.defaultIvaPercentage.toFixed(2);
    if (input.defaultProfitMargin !== undefined) updateData.defaultProfitMargin = input.defaultProfitMargin.toFixed(2);
    if (input.requireAdminForOverdueDebt !== undefined) updateData.requireAdminForOverdueDebt = input.requireAdminForOverdueDebt;

    await db
      .update(tenantConfigurations)
      .set(updateData)
      .where(eq(tenantConfigurations.tenantId, tenantId));

    await AuditService.log({
      tenantId,
      userId,
      action: 'UPDATE_TENANT_CONFIG',
      entity: 'TENANT_CONFIGURATION',
      payload: input,
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    return this.getConfig(tenantId);
  }
}
