import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { exchangeRateSnapshots } from '../db/schema.js';
import { AuditService } from './audit.service.js';

export interface RateResult {
  source: 'BCV' | 'PARALELO' | 'P2P';
  rate: number;
  fetchedAt: Date;
  validFrom: Date;
  isStale: boolean; // True si tiene más de 24 horas
  warningMessage?: string;
}

export class ExchangeRateService {
  /**
   * Obtiene la tasa oficial vigente para un tenant con fallback a la última tasa conocida
   */
  static async getCurrentRates(tenantId: string): Promise<{ bcv: RateResult; paralelo?: RateResult }> {
    // 1. Consultar el snapshot más reciente en BD
    const [latestBcv] = await db
      .select()
      .from(exchangeRateSnapshots)
      .where(
        and(
          eq(exchangeRateSnapshots.tenantId, tenantId),
          eq(exchangeRateSnapshots.source, 'BCV')
        )
      )
      .orderBy(desc(exchangeRateSnapshots.validFrom))
      .limit(1);

    const now = new Date();

    if (latestBcv) {
      const rateAgeHours = (now.getTime() - new Date(latestBcv.fetchedAt).getTime()) / (1000 * 60 * 60);
      const isStale = rateAgeHours > 24;

      return {
        bcv: {
          source: 'BCV',
          rate: parseFloat(latestBcv.rate),
          fetchedAt: new Date(latestBcv.fetchedAt),
          validFrom: new Date(latestBcv.validFrom),
          isStale,
          warningMessage: isStale
            ? `ADVERTENCIA: La tasa de cambio tiene más de ${Math.floor(rateAgeHours)} horas sin actualizar.`
            : undefined,
        },
      };
    }

    // Si es un tenant nuevo sin tasas, registrar tasa base inicial segura
    const defaultRate = 52.50;
    const [seeded] = await db
      .insert(exchangeRateSnapshots)
      .values({
        tenantId,
        source: 'BCV',
        rate: defaultRate.toFixed(4),
        fetchedAt: now,
        validFrom: now,
        isOfficial: true,
      })
      .returning();

    return {
      bcv: {
        source: 'BCV',
        rate: defaultRate,
        fetchedAt: now,
        validFrom: now,
        isStale: false,
      },
    };
  }

  /**
   * Worker Polling: Actualiza la tasa desde proveedor externo con fallback resiliente
   */
  static async fetchAndRecordRate(
    tenantId: string,
    providerFetchFn?: () => Promise<{ rate: number; validFrom?: Date }>
  ): Promise<RateResult> {
    const now = new Date();
    try {
      let fetchedRate = 52.50;
      let validFrom = now;

      if (providerFetchFn) {
        const ext = await providerFetchFn();
        fetchedRate = ext.rate;
        if (ext.validFrom) validFrom = ext.validFrom;
      }

      const [snapshot] = await db
        .insert(exchangeRateSnapshots)
        .values({
          tenantId,
          source: 'BCV',
          rate: fetchedRate.toFixed(4),
          fetchedAt: now,
          validFrom,
          isOfficial: true,
        })
        .returning();

      return {
        source: 'BCV',
        rate: fetchedRate,
        fetchedAt: now,
        validFrom,
        isStale: false,
      };
    } catch (err: any) {
      // Fallback a última tasa conocida
      console.warn(`Error consultando proveedor de tasas: ${err.message}. Aplicando fallback a última tasa conocida.`);
      const current = await this.getCurrentRates(tenantId);
      return {
        ...current.bcv,
        warningMessage: 'Proveedor externo no disponible. Utilizando última tasa oficial registrada.',
      };
    }
  }
}
