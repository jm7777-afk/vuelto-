import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, productBarcodes, productStock, warehouses } from '../db/schema.js';
import { VenezuelaUtils } from '../utils/venezuela.js';
import { AuditService } from './audit.service.js';

export class ProductService {
  /**
   * Endpoint de Escaneo Móvil (120 req/min)
   * Busca producto por su código de barras original o por código de balanza con peso embebido
   */
  static async findByBarcode(tenantId: string, barcode: string) {
    const cleanBarcode = barcode.trim();

    // Verificación de código de balanza (charcutería/carnicería)
    const scaleInfo = VenezuelaUtils.parseScaleBarcode(cleanBarcode);

    // Verificación preliminar de EAN-13
    const eanCheck = VenezuelaUtils.validateEan13(cleanBarcode);

    // Consulta con join a product_barcodes y stock
    let results: any[] = await db
      .select({
        barcodeId: productBarcodes.id,
        barcode: productBarcodes.barcode,
        barcodeType: productBarcodes.barcodeType,
        isPrimary: productBarcodes.isPrimary,
        productId: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        costPriceUsd: products.costPriceUsd,
        salePriceUsd: products.salePriceUsd,
        taxRate: products.taxRate,
        isExempt: products.isExempt,
        minStockAlert: products.minStockAlert,
        isActive: products.isActive,
      })
      .from(productBarcodes)
      .innerJoin(products, eq(productBarcodes.productId, products.id))
      .where(and(eq(productBarcodes.tenantId, tenantId), eq(productBarcodes.barcode, cleanBarcode)))
      .limit(1);

    // Si no se encontró por código exacto pero es código de balanza, buscar por SKU
    if (results.length === 0 && scaleInfo.isScaleBarcode && scaleInfo.sku) {
      results = await db
        .select({
          barcodeId: sql<string>`COALESCE(${productBarcodes.id}, '')`,
          barcode: sql<string>`COALESCE(${productBarcodes.barcode}, ${cleanBarcode})`,
          barcodeType: sql<string>`COALESCE(${productBarcodes.barcodeType}, 'INTERNAL')`,
          isPrimary: sql<boolean>`COALESCE(${productBarcodes.isPrimary}, true)`,
          productId: products.id,
          sku: products.sku,
          name: products.name,
          description: products.description,
          costPriceUsd: products.costPriceUsd,
          salePriceUsd: products.salePriceUsd,
          taxRate: products.taxRate,
          isExempt: products.isExempt,
          minStockAlert: products.minStockAlert,
          isActive: products.isActive,
        })
        .from(products)
        .leftJoin(productBarcodes, eq(products.id, productBarcodes.productId))
        .where(
          and(
            eq(products.tenantId, tenantId),
            or(eq(products.sku, scaleInfo.sku), eq(products.sku, `20${scaleInfo.sku}`))
          )
        )
        .limit(1);
    }

    if (results.length === 0) {
      return null;
    }

    const item = results[0];

    // Obtener stock consolidado
    const [stockRow] = await db
      .select({
        totalStock: sql<string>`COALESCE(SUM(${productStock.quantity}), 0)`,
      })
      .from(productStock)
      .where(and(eq(productStock.tenantId, tenantId), eq(productStock.productId, item.productId)));

    const unitPrice = parseFloat(item.salePriceUsd);
    const weight = scaleInfo.isScaleBarcode && scaleInfo.weightKg ? scaleInfo.weightKg : 1;
    const linePrice = unitPrice * weight;

    return {
      ...item,
      currentStock: stockRow ? stockRow.totalStock : '0.000',
      isVenezuelanProduct: eanCheck.isVenezuelanPrefix,
      isScaleBarcode: scaleInfo.isScaleBarcode,
      embeddedWeightKg: scaleInfo.weightKg || null,
      calculatedLinePriceUsd: parseFloat(linePrice.toFixed(2)),
    };
  }

  static async create(
    tenantId: string,
    userId: string,
    data: {
      sku?: string;
      name: string;
      categoryId?: string;
      costPriceUsd?: number;
      salePriceUsd: number;
      taxRate?: number;
      isExempt?: boolean;
      minStockAlert?: number;
      barcodes?: Array<{ barcode: string; barcodeType: 'EAN13' | 'EAN8' | 'CODE128' | 'UPC' | 'INTERNAL'; isPrimary?: boolean }>;
    }
  ) {
    // Si viene código EAN13, validar dígito verificador antes de guardar
    if (data.barcodes) {
      for (const bc of data.barcodes) {
        if (bc.barcodeType === 'EAN13') {
          const validation = VenezuelaUtils.validateEan13(bc.barcode);
          if (!validation.isValid) {
            throw new Error(`El código de barras EAN-13 ${bc.barcode} tiene un dígito verificador inválido.`);
          }
        }
      }
    }

    return await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          tenantId,
          sku: data.sku || null,
          name: data.name.trim(),
          categoryId: data.categoryId || null,
          costPriceUsd: (data.costPriceUsd || 0).toFixed(4),
          salePriceUsd: data.salePriceUsd.toFixed(4),
          taxRate: (data.taxRate ?? 16.0).toFixed(2),
          isExempt: !!data.isExempt,
          minStockAlert: (data.minStockAlert ?? 5).toFixed(3),
          isActive: true,
        })
        .returning();

      if (data.barcodes && data.barcodes.length > 0) {
        for (let i = 0; i < data.barcodes.length; i++) {
          const bc = data.barcodes[i];
          await tx.insert(productBarcodes).values({
            tenantId,
            productId: product.id,
            barcode: bc.barcode.trim(),
            barcodeType: bc.barcodeType,
            isPrimary: bc.isPrimary ?? i === 0,
          });
        }
      }

      await AuditService.log({
        tenantId,
        userId,
        action: 'PRODUCT_CREATE',
        entity: 'product',
        entityId: product.id,
        payload: { name: product.name, price: product.salePriceUsd },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
      });

      return product;
    });
  }

  static async list(tenantId: string) {
    return db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(products.name);
  }

  static async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      costPriceUsd?: number;
      salePriceUsd?: number;
      taxRate?: number;
      isExempt?: boolean;
      minStockAlert?: number;
      isActive?: boolean;
    }
  ) {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.costPriceUsd !== undefined) updateData.costPriceUsd = data.costPriceUsd.toFixed(4);
    if (data.salePriceUsd !== undefined) updateData.salePriceUsd = data.salePriceUsd.toFixed(4);
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate.toFixed(2);
    if (data.isExempt !== undefined) updateData.isExempt = data.isExempt;
    if (data.minStockAlert !== undefined) updateData.minStockAlert = data.minStockAlert.toFixed(3);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)))
      .returning();
    return updated || null;
  }

  static async delete(tenantId: string, id: string) {
    const [deleted] = await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)))
      .returning();
    return deleted || null;
  }

  /**
   * Aplica un margen de ganancia global (%) masivamente a todos los productos del inventario
   * basándose en el costo unitario (salePrice = costPrice * (1 + margin / 100))
   */
  static async applyGlobalProfitMargin(
    tenantId: string,
    userId: string,
    marginPercentage: number,
    categoryId?: string
  ): Promise<{ updatedCount: number; marginPercentage: number }> {
    const conditions = [eq(products.tenantId, tenantId), eq(products.isActive, true)];
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    const allProducts = await db
      .select()
      .from(products)
      .where(and(...conditions));

    let count = 0;
    const factor = 1 + marginPercentage / 100;

    for (const prod of allProducts) {
      const cost = parseFloat(prod.costPriceUsd);
      if (cost > 0) {
        const newSalePrice = +(cost * factor).toFixed(4);
        await db
          .update(products)
          .set({ salePriceUsd: newSalePrice.toFixed(4), updatedAt: new Date() })
          .where(eq(products.id, prod.id));
        count++;
      }
    }

    await AuditService.log({
      tenantId,
      userId,
      action: 'APPLY_GLOBAL_PROFIT_MARGIN',
      entity: 'product',
      payload: { marginPercentage, categoryId, updatedCount: count },
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    return { updatedCount: count, marginPercentage };
  }
}
