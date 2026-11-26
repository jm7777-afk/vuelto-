import { eq, and, sql } from 'drizzle-orm';
import { withTenant, TenantTransaction } from '../db/tenantDb.js';
import { productStock, inventoryMovements, products, suppliers } from '../db/schema.js';
import { AuditService } from './audit.service.js';

export class InventoryService {
  /**
   * Registra un movimiento de inventario (Entrada, Salida, Ajuste) con bloqueo de fila y RLS.
   * Recalcula el costo promedio ponderado si es una entrada (IN).
   */
  static async createMovement(
    tenantId: string,
    userId: string,
    data: {
      warehouseId: string;
      productId: string;
      movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';
      quantity: number;
      unitCostUsd?: number;
      reason: string;
      referenceType?: string;
      referenceId?: string;
      channel?: 'POS_MOBILE' | 'MOBILE_ADMIN' | 'WEB_ADMIN';
    },
    externalTx?: TenantTransaction
  ) {
    const exec = async (tx: TenantTransaction) => {
      const [product] = await tx
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.id, data.productId)));

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      const [currentStockRow] = await tx
        .select()
        .from(productStock)
        .where(
          and(
            eq(productStock.tenantId, tenantId),
            eq(productStock.warehouseId, data.warehouseId),
            eq(productStock.productId, data.productId)
          )
        )
        .for('update');

      const currentQty = currentStockRow ? parseFloat(currentStockRow.quantity) : 0;
      let newQty = currentQty;
      const unitCost = data.unitCostUsd ?? parseFloat(product.costPriceUsd);

      if (data.movementType === 'IN' || data.movementType === 'RETURN') {
        newQty = currentQty + data.quantity;

        if (data.unitCostUsd !== undefined && data.unitCostUsd > 0 && newQty > 0) {
          const currentCost = parseFloat(product.costPriceUsd);
          const newAvgCost = (currentQty * currentCost + data.quantity * data.unitCostUsd) / newQty;

          await tx
            .update(products)
            .set({ costPriceUsd: newAvgCost.toFixed(4) })
            .where(and(eq(products.tenantId, tenantId), eq(products.id, data.productId)));
        }
      } else if (data.movementType === 'OUT') {
        if (!product.allowNegativeStock && currentQty < data.quantity) {
          throw new Error(`Stock insuficiente. Disponible: ${currentQty}, Requerido: ${data.quantity}`);
        }
        newQty = currentQty - data.quantity;
      } else if (data.movementType === 'ADJUSTMENT') {
        newQty = data.quantity;
      }

      if (currentStockRow) {
        await tx
          .update(productStock)
          .set({ quantity: newQty.toFixed(3), updatedAt: new Date() })
          .where(eq(productStock.id, currentStockRow.id));
      } else {
        await tx.insert(productStock).values({
          tenantId,
          warehouseId: data.warehouseId,
          productId: data.productId,
          quantity: newQty.toFixed(3),
        });
      }

      const [movement] = await tx
        .insert(inventoryMovements)
        .values({
          tenantId,
          warehouseId: data.warehouseId,
          productId: data.productId,
          userId,
          movementType: data.movementType,
          quantity: data.quantity.toFixed(3),
          unitCostUsd: unitCost.toFixed(4),
          referenceType: data.referenceType || 'MANUAL_ADJUSTMENT',
          referenceId: data.referenceId || null,
          reason: data.reason,
        })
        .returning();

      await AuditService.log({
        tenantId,
        userId,
        action: 'INVENTORY_MOVEMENT',
        entity: 'inventory_movement',
        entityId: movement.id,
        payload: {
          productId: data.productId,
          movementType: data.movementType,
          qty: data.quantity,
          previousStock: currentQty,
          newStock: newQty,
          reason: data.reason,
        },
        result: 'SUCCESS',
        channel: data.channel || 'MOBILE_ADMIN',
      }, tx);

      return { movement, newStock: newQty };
    };

    if (externalTx) return exec(externalTx);
    return withTenant(tenantId, exec);
  }

  static async getStock(tenantId: string) {
    return withTenant(tenantId, (tx) =>
      tx
        .select({
          productId: products.id,
          productName: products.name,
          sku: products.sku,
          warehouseId: productStock.warehouseId,
          quantity: productStock.quantity,
          costPriceUsd: products.costPriceUsd,
          salePriceUsd: products.salePriceUsd,
        })
        .from(products)
        .leftJoin(productStock, eq(products.id, productStock.productId))
        .where(eq(products.tenantId, tenantId))
    );
  }

  static async getKardex(tenantId: string, productId?: string, limit = 50) {
    return withTenant(tenantId, (tx) =>
      tx
        .select({
          id: inventoryMovements.id,
          productId: inventoryMovements.productId,
          productName: products.name,
          movementType: inventoryMovements.movementType,
          quantity: inventoryMovements.quantity,
          unitCostUsd: inventoryMovements.unitCostUsd,
          referenceType: inventoryMovements.referenceType,
          reason: inventoryMovements.reason,
          createdAt: inventoryMovements.createdAt,
        })
        .from(inventoryMovements)
        .innerJoin(products, eq(inventoryMovements.productId, products.id))
        .where(
          productId
            ? and(eq(inventoryMovements.tenantId, tenantId), eq(inventoryMovements.productId, productId))
            : eq(inventoryMovements.tenantId, tenantId)
        )
        .orderBy(sql`${inventoryMovements.createdAt} DESC`)
        .limit(limit)
    );
  }

  static async getLowStock(tenantId: string) {
    const allStock = await this.getStock(tenantId);
    return allStock.filter((s) => parseFloat(s.quantity || '0') <= 5);
  }

  static async getGlobalReplenishmentList(tenantId: string) {
    const list = await withTenant(tenantId, (tx) =>
      tx
        .select({
          productId: products.id,
          productName: products.name,
          sku: products.sku,
          costPriceUsd: products.costPriceUsd,
          salePriceUsd: products.salePriceUsd,
          minStockAlert: products.minStockAlert,
          currentStock: sql<string>`COALESCE(${productStock.quantity}, '0.000')`,
          supplierId: suppliers.id,
          supplierName: suppliers.name,
          supplierPhone: suppliers.phone,
          supplierRif: sql<string>`CONCAT(${suppliers.documentType}, '-', ${suppliers.documentNumber})`,
        })
        .from(products)
        .leftJoin(productStock, eq(products.id, productStock.productId))
        .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
        .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)))
    );

    const lowStockItems = list
      .map((item) => {
        const current = parseFloat(item.currentStock || '0');
        const minAlert = parseFloat(item.minStockAlert || '5');
        const isLow = current <= minAlert;
        const suggestedQty = Math.max(1, Math.ceil(minAlert * 2 - current));
        const estimatedCost = +(suggestedQty * parseFloat(item.costPriceUsd)).toFixed(4);
        return {
          ...item,
          currentStockNum: current,
          minAlertNum: minAlert,
          isLow,
          suggestedQty,
          estimatedCost,
        };
      })
      .filter((i) => i.isLow);

    const groupedBySupplier: Record<string, any> = {};
    for (const item of lowStockItems) {
      const supKey = item.supplierId || 'unassigned';
      if (!groupedBySupplier[supKey]) {
        groupedBySupplier[supKey] = {
          supplierId: item.supplierId || null,
          supplierName: item.supplierName || 'Proveedor General / No Asignado',
          supplierPhone: item.supplierPhone || '',
          supplierRif: item.supplierRif || 'N/A',
          items: [],
          totalEstimatedCost: 0,
        };
      }
      groupedBySupplier[supKey].items.push(item);
      groupedBySupplier[supKey].totalEstimatedCost = +(
        groupedBySupplier[supKey].totalEstimatedCost + item.estimatedCost
      ).toFixed(2);
    }

    return {
      totalProductsToReplenish: lowStockItems.length,
      globalEstimatedCost: +lowStockItems.reduce((acc, curr) => acc + curr.estimatedCost, 0).toFixed(2),
      items: lowStockItems,
      bySupplier: Object.values(groupedBySupplier),
    };
  }
}
