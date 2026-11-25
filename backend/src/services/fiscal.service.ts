import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taxRates, igtfRules, tenants } from '../db/schema.js';
import { AuditService } from './audit.service.js';

interface FiscalCacheEntry {
  rates: Record<string, number>;
  igtfRate: number;
  cachedAt: number;
}

export class FiscalService {
  // Caché en memoria con TTL de 1 hora (3600 segundos)
  private static cache = new Map<string, FiscalCacheEntry>();
  private static CACHE_TTL_MS = 60 * 60 * 1000;

  // Valores legales venezolanos por defecto (fallback estricto)
  public static readonly STATUTORY_DEFAULTS = {
    GENERAL: 0.1600,
    REDUCED: 0.0800,
    ADDITIONAL: 0.3100,
    EXEMPT: 0.0000,
    IGTF: 0.0300,
  };

  /**
   * Obtiene las tasas de IVA activas para el tenant (con caché y fallback resiliente)
   */
  static async getTaxRates(tenantId: string): Promise<Record<string, number>> {
    const cached = this.cache.get(tenantId);
    const now = Date.now();

    if (cached && (now - cached.cachedAt) < this.CACHE_TTL_MS) {
      return cached.rates;
    }

    try {
      const records = await db
        .select()
        .from(taxRates)
        .where(
          and(
            eq(taxRates.tenantId, tenantId),
            sql`(${taxRates.validTo} IS NULL OR ${taxRates.validTo} > NOW())`
          )
        );

      const rates: Record<string, number> = { ...this.STATUTORY_DEFAULTS };

      for (const rec of records) {
        rates[rec.code] = parseFloat(rec.rate);
      }

      // Actualizar caché
      const igtfRate = cached ? cached.igtfRate : this.STATUTORY_DEFAULTS.IGTF;
      this.cache.set(tenantId, { rates, igtfRate, cachedAt: now });

      return rates;
    } catch (err) {
      // Fallback transparente a alícuotas estatutarias de ley
      return { ...this.STATUTORY_DEFAULTS };
    }
  }

  /**
   * Obtiene la regla activa de IGTF para pagos en divisas en efectivo
   */
  static async getIgtfRate(tenantId: string, currency: string = 'USD', paymentMethod: string = 'CASH'): Promise<number> {
    const cached = this.cache.get(tenantId);
    const now = Date.now();

    if (cached && (now - cached.cachedAt) < this.CACHE_TTL_MS) {
      return cached.igtfRate;
    }

    try {
      const [rule] = await db
        .select()
        .from(igtfRules)
        .where(
          and(
            eq(igtfRules.tenantId, tenantId),
            eq(igtfRules.currency, currency),
            eq(igtfRules.paymentMethod, paymentMethod),
            sql`(${igtfRules.validTo} IS NULL OR ${igtfRules.validTo} > NOW())`
          )
        )
        .orderBy(desc(igtfRules.createdAt))
        .limit(1);

      const rate = rule ? parseFloat(rule.rate) : this.STATUTORY_DEFAULTS.IGTF;

      const rates = cached ? cached.rates : { ...this.STATUTORY_DEFAULTS };
      this.cache.set(tenantId, { rates, igtfRate: rate, cachedAt: now });

      return rate;
    } catch (err) {
      return this.STATUTORY_DEFAULTS.IGTF;
    }
  }

  /**
   * Actualiza las tasas impositivas sin necesidad de redesplegar el backend (PUT /api/v1/admin/fiscal/rates)
   */
  static async updateRates(
    tenantId: string,
    userId: string,
    data: {
      generalRate?: number;
      reducedRate?: number;
      additionalRate?: number;
      igtfRate?: number;
    }
  ): Promise<any> {
    const now = new Date();

    if (data.generalRate !== undefined) {
      await db.insert(taxRates).values({
        tenantId,
        code: 'GENERAL',
        rate: data.generalRate.toFixed(4),
        description: 'Alícuota General de IVA',
        validFrom: now,
      });
    }

    if (data.reducedRate !== undefined) {
      await db.insert(taxRates).values({
        tenantId,
        code: 'REDUCED',
        rate: data.reducedRate.toFixed(4),
        description: 'Alícuota Reducida de IVA',
        validFrom: now,
      });
    }

    if (data.additionalRate !== undefined) {
      await db.insert(taxRates).values({
        tenantId,
        code: 'ADDITIONAL',
        rate: data.additionalRate.toFixed(4),
        description: 'Alícuota Adicional de IVA (Lujo)',
        validFrom: now,
      });
    }

    if (data.igtfRate !== undefined) {
      await db.insert(igtfRules).values({
        tenantId,
        currency: 'USD',
        paymentMethod: 'CASH',
        rate: data.igtfRate.toFixed(4),
        appliesToSpecialTaxpayerOnly: true,
        validFrom: now,
      });
    }

    // Invalidar caché local
    this.cache.delete(tenantId);

    // Auditoría
    await AuditService.log({
      tenantId,
      userId,
      action: 'FISCAL_RATES_UPDATED',
      entity: 'tax_rates',
      payload: data,
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    return await this.getTaxRates(tenantId);
  }
}
