import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
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
    }
  ) {
    // Código legible ej: 'VALE-8F3A-92BC'
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `VALE-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}`;
    const barcode = `V${Date.now()}${randomHex}`; // CODE128 amigable
    const expiresAt = new Date(Date.now() + (params.expirationDays || 30) * 24 * 60 * 60 * 1000);

    const [voucher] = await db
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
  }

  /**
   * Consulta el estado de un vale por código o código de barras
   */
  static async getByCode(tenantId: string, codeOrBarcode: string) {
    const [voucher] = await db
      .select()
      .from(changeVouchers)
      .where(
        and(
          eq(changeVouchers.tenantId, tenantId),
          eq(changeVouchers.code, codeOrBarcode.trim())
        )
      );

    if (voucher) return voucher;

    const [voucherByBarcode] = await db
      .select()
      .from(changeVouchers)
      .where(
        and(
          eq(changeVouchers.tenantId, tenantId),
          eq(changeVouchers.barcode, codeOrBarcode.trim())
        )
      );

    return voucherByBarcode || null;
  }

  /**
   * Redime un vale como método de pago en una nueva venta
   */
  static async redeem(tenantId: string, userId: string, code: string, redeemedSaleId: string) {
    const voucher = await this.getByCode(tenantId, code);

    if (!voucher) {
      throw new Error('Vale de cambio no encontrado');
    }

    if (voucher.status !== 'ACTIVE') {
      throw new Error(`El vale ya fue redimido o se encuentra ${voucher.status}`);
    }

    if (new Date() > new Date(voucher.expiresAt)) {
      await db
        .update(changeVouchers)
        .set({ status: 'EXPIRED' })
        .where(eq(changeVouchers.id, voucher.id));
      throw new Error('El vale de cambio ha expirado');
    }

    const [redeemed] = await db
      .update(changeVouchers)
      .set({
        status: 'REDEEMED',
        redeemedSaleId,
        redeemedAt: new Date(),
      })
      .where(eq(changeVouchers.id, voucher.id))
      .returning();

    await AuditService.log({
      tenantId,
      userId,
      action: 'VOUCHER_REDEEMED',
      entity: 'change_voucher',
      entityId: voucher.id,
      payload: { code: voucher.code, amountUsd: voucher.amountUsd, redeemedSaleId },
      result: 'SUCCESS',
      channel: 'POS_MOBILE',
    });

    return redeemed;
  }
}
