import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { withTenant, TenantTransaction } from '../db/tenantDb.js';
import { changeVouchers } from '../db/schema.js';
import { AuditService } from './audit.service.js';

export class VoucherService {
  /**
   * Emite un Vale de Cambio Impreso (Vuelto al Portador con Código de Barras CODE128)
   */
  static async createVoucher(
    tenantId: string,
    params: {
      saleId: string;
      customerId?: string;
      amountUsd: number;
      amountBs: number;
      expirationDays?: number;
    },
    tx?: TenantTransaction
  ) {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `VALE-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}`;
    const barcode = `V${Date.now()}${randomHex}`;
    const expiresAt = new Date(Date.now() + (params.expirationDays || 30) * 24 * 60 * 60 * 1000);

    const exec = async (runner: TenantTransaction) => {
      const [voucher] = await runner
        .insert(changeVouchers)
        .values({
          tenantId,
          code,
          barcode,
          saleId: params.saleId,
          customerId: params.customerId || null,
          amountUsd: params.amountUsd.toFixed(2),
          amountBs: params.amountBs.toFixed(2),
          status: 'ACTIVE',
          expiresAt,
        })
        .returning();
      return voucher;
    };

    if (tx) return exec(tx);
    return withTenant(tenantId, exec);
  }

  /**
   * Consulta el estado de un vale por código o código de barras bajo RLS
   */
  static async getByCode(tenantId: string, codeOrBarcode: string, tx?: TenantTransaction) {
    const clean = codeOrBarcode.trim();
    const exec = async (runner: TenantTransaction) => {
      const [voucher] = await runner
        .select()
        .from(changeVouchers)
        .where(and(eq(changeVouchers.tenantId, tenantId), eq(changeVouchers.code, clean)));

      if (voucher) return voucher;

      const [voucherByBarcode] = await runner
        .select()
        .from(changeVouchers)
        .where(and(eq(changeVouchers.tenantId, tenantId), eq(changeVouchers.barcode, clean)));

      return voucherByBarcode || null;
    };

    if (tx) return exec(tx);
    return withTenant(tenantId, exec);
  }

  /**
   * Redime un vale de cambio atómicamente (previene doble redención concurrente)
   */
  static async redeem(
    tenantId: string,
    userId: string,
    code: string,
    redeemedSaleId: string,
    tx?: TenantTransaction
  ) {
    const exec = async (runner: TenantTransaction) => {
      const voucher = await this.getByCode(tenantId, code, runner);

      if (!voucher) {
        throw new Error('Vale de cambio no encontrado');
      }

      if (voucher.status !== 'ACTIVE') {
        throw new Error(`El vale ya fue redimido o se encuentra ${voucher.status}`);
      }

      if (new Date() > new Date(voucher.expiresAt)) {
        await runner
          .update(changeVouchers)
          .set({ status: 'EXPIRED' })
          .where(and(eq(changeVouchers.id, voucher.id), eq(changeVouchers.tenantId, tenantId)));
        throw new Error('El vale de cambio ha expirado');
      }

      const [redeemed] = await runner
        .update(changeVouchers)
        .set({
          status: 'REDEEMED',
          redeemedSaleId,
          redeemedAt: new Date(),
        })
        .where(
          and(
            eq(changeVouchers.id, voucher.id),
            eq(changeVouchers.tenantId, tenantId),
            eq(changeVouchers.status, 'ACTIVE')
          )
        )
        .returning();

      if (!redeemed) {
        throw new Error('El vale ya fue redimido por otra operación concurrente');
      }

      await AuditService.log({
        tenantId,
        userId,
        action: 'VOUCHER_REDEEMED',
        entity: 'change_voucher',
        entityId: voucher.id,
        payload: { code: voucher.code, amountUsd: voucher.amountUsd, redeemedSaleId },
        result: 'SUCCESS',
        channel: 'POS_MOBILE',
      }, runner);

      return redeemed;
    };

    if (tx) return exec(tx);
    return withTenant(tenantId, exec);
  }
}
