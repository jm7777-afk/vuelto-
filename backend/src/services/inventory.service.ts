import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { productStock, inventoryMovements, products, warehouses } from '../db/schema.js';
import { AuditService } from './audit.service.js';

export class InventoryService {
  /**
   * Registra un movimiento de inventario (Entrada, Salida, Ajuste)
   * Recalcula el costo promedio ponderado si es una entrada (IN)
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
    }
  ) {
    return await db.transaction(async (tx) => {
      // 1. Obtener producto y stock actual
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
        );

      const currentQty = currentStockRow ? parseFloat(currentStockRow.quantity) : 0;
      let newQty = currentQty;
      const unitCost = data.unitCostUsd ?? parseFloat(product.costPriceUsd);

      if (data.movementType === 'IN' || data.movementType === 'RETURN') {
        newQty = currentQty + data.quantity;

        // Recálculo de Costo Promedio Ponderado Móvil
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
        newQty = data.quantity; // En ajuste se fija la cantidad física contada
      }

      // 2. Actualizar o crear fila en product_stock
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

      // 3. Insertar movimiento en Kardex
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

      // 4. Registrar en Auditoría
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
      });

      return { movement, newStock: newQty };
    });
  }

  static async getStock(tenantId: string) {
    return db
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
      .where(eq(products.tenantId, tenantId));
  }

  static async getKardex(tenantId: string, productId?: string, limit = 50) {
    let query = db
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
      .limit(limit);

    return await query;
  }

  static async getLowStock(tenantId: string) {
    const allStock = await this.getStock(tenantId);
    return allStock.filter((s) => parseFloat(s.quantity || '0') <= 5);
  }
}
