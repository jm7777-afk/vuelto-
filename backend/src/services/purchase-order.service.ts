import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { purchaseOrders, purchaseOrderLines, suppliers, products, warehouses } from '../db/schema.js';
import { InventoryService } from './inventory.service.js';
import { AuditService } from './audit.service.js';

export interface CreatePurchaseOrderLineInput {
  productId: string;
  quantityOrdered: number;
  unitCostUsd: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  orderNumber?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  lines: CreatePurchaseOrderLineInput[];
}

export class PurchaseOrderService {
  static async create(tenantId: string, userId: string, input: CreatePurchaseOrderInput) {
    return await db.transaction(async (tx) => {
      // 1. Generar número de orden si no viene
      const orderNumber =
        input.orderNumber ||
        `OC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. Calcular total
      let totalEstimatedUsd = 0;
      for (const line of input.lines) {
        totalEstimatedUsd += line.quantityOrdered * line.unitCostUsd;
      }

      // 3. Crear orden
      const [order] = await tx
        .insert(purchaseOrders)
        .values({
          tenantId,
          supplierId: input.supplierId,
          orderNumber,
          status: 'DRAFT',
          expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
          totalEstimatedUsd: totalEstimatedUsd.toFixed(4),
          notes: input.notes,
        })
        .returning();

      // 4. Crear líneas
      for (const line of input.lines) {
        const subtotal = line.quantityOrdered * line.unitCostUsd;
        await tx.insert(purchaseOrderLines).values({
          orderId: order.id,
          productId: line.productId,
          quantityOrdered: line.quantityOrdered.toFixed(3),
          quantityReceived: '0.000',
          unitCostUsd: line.unitCostUsd.toFixed(4),
          subtotalUsd: subtotal.toFixed(4),
        });
      }

      await AuditService.log({
        tenantId,
        userId,
        action: 'PURCHASE_ORDER_CREATED',
        entity: 'purchase_order',
        entityId: order.id,
        payload: { orderNumber, totalUsd: totalEstimatedUsd.toFixed(2), linesCount: input.lines.length },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
      });

      return order;
    });
  }

  static async list(tenantId: string, status?: string) {
    let query = db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        totalEstimatedUsd: purchaseOrders.totalEstimatedUsd,
        notes: purchaseOrders.notes,
        receivedAt: purchaseOrders.receivedAt,
        createdAt: purchaseOrders.createdAt,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        supplierPhone: suppliers.phone,
        supplierDoc: sql`concat(${suppliers.documentType}, '-', ${suppliers.documentNumber})`,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        status
          ? and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.status, status))
          : eq(purchaseOrders.tenantId, tenantId)
      )
      .orderBy(desc(purchaseOrders.createdAt));

    return await query;
  }

  static async getById(tenantId: string, orderId: string) {
    const [order] = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        totalEstimatedUsd: purchaseOrders.totalEstimatedUsd,
        notes: purchaseOrders.notes,
        receivedAt: purchaseOrders.receivedAt,
        createdAt: purchaseOrders.createdAt,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        supplierPhone: suppliers.phone,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.id, orderId)));

    if (!order) return null;

    const lines = await db
      .select({
        id: purchaseOrderLines.id,
        productId: purchaseOrderLines.productId,
        productName: products.name,
        sku: products.sku,
        quantityOrdered: purchaseOrderLines.quantityOrdered,
        quantityReceived: purchaseOrderLines.quantityReceived,
        unitCostUsd: purchaseOrderLines.unitCostUsd,
        subtotalUsd: purchaseOrderLines.subtotalUsd,
      })
      .from(purchaseOrderLines)
      .innerJoin(products, eq(purchaseOrderLines.productId, products.id))
      .where(eq(purchaseOrderLines.orderId, order.id));

    return { ...order, lines };
  }

  static async updateStatus(tenantId: string, userId: string, orderId: string, status: string) {
    const [updated] = await db
      .update(purchaseOrders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.id, orderId)))
      .returning();

    if (updated) {
      await AuditService.log({
        tenantId,
        userId,
        action: 'PURCHASE_ORDER_STATUS_CHANGED',
        entity: 'purchase_order',
        entityId: orderId,
        payload: { newStatus: status },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
      });
    }

    return updated || null;
  }

  /**
   * Recepción de Pedido: Carga física a almacén en Kardex y actualiza costo de reposición
   */
  static async receive(
    tenantId: string,
    userId: string,
    orderId: string,
    warehouseId?: string
  ) {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.id, orderId)));

      if (!order) throw new Error('Orden de compra no encontrada');
      if (order.status === 'RECEIVED') throw new Error('La orden ya fue recibida previamente');

      // Buscar almacén predeterminado si no se pasa
      let targetWhId = warehouseId;
      if (!targetWhId) {
        const [defaultWh] = await tx
          .select()
          .from(warehouses)
          .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.isDefault, true)));
        targetWhId = defaultWh ? defaultWh.id : undefined;
      }

      if (!targetWhId) {
        const [anyWh] = await tx
          .select()
          .from(warehouses)
          .where(eq(warehouses.tenantId, tenantId))
          .limit(1);
        targetWhId = anyWh?.id;
      }

      if (!targetWhId) throw new Error('No existe almacén configurado para recepcionar stock');

      const lines = await tx
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.orderId, orderId));

      // Cargar cada producto al inventario mediante InventoryService
      for (const line of lines) {
        const qty = parseFloat(line.quantityOrdered);
        const cost = parseFloat(line.unitCostUsd);

        await InventoryService.createMovement(tenantId, userId, {
          warehouseId: targetWhId,
          productId: line.productId,
          movementType: 'IN',
          quantity: qty,
          unitCostUsd: cost,
          reason: `Recepción de orden de compra ${order.orderNumber}`,
          referenceType: 'PURCHASE',
          referenceId: order.id,
          channel: 'WEB_ADMIN',
        });

        // Actualizar línea con cantidad recibida
        await tx
          .update(purchaseOrderLines)
          .set({ quantityReceived: line.quantityOrdered })
          .where(eq(purchaseOrderLines.id, line.id));
      }

      // Marcar orden como recibida
      const [updatedOrder] = await tx
        .update(purchaseOrders)
        .set({ status: 'RECEIVED', receivedAt: new Date(), updatedAt: new Date() })
        .where(eq(purchaseOrders.id, orderId))
        .returning();

      await AuditService.log({
        tenantId,
        userId,
        action: 'PURCHASE_ORDER_RECEIVED',
        entity: 'purchase_order',
        entityId: orderId,
        payload: { orderNumber: order.orderNumber, linesReceived: lines.length },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
      });

      return updatedOrder;
    });
  }
}
