import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { warehouses } from '../db/schema.js';
import { InventoryService } from '../services/inventory.service.js';

export class InventoryController {
  static async getStock(req: Request, res: Response, next: NextFunction) {
    try {
      const stock = await InventoryService.getStock(req.tenantId!);
      res.json(stock);
    } catch (err) {
      next(err);
    }
  }

  static async getKardex(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.query.productId ? String(req.query.productId) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const kardex = await InventoryService.getKardex(req.tenantId!, productId, limit);
      res.json(kardex);
    } catch (err) {
      next(err);
    }
  }

  static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const lowStock = await InventoryService.getLowStock(req.tenantId!);
      res.json(lowStock);
    } catch (err) {
      next(err);
    }
  }

  static async getReplenishmentList(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await InventoryService.getGlobalReplenishmentList(req.tenantId!);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { warehouseId, productId, movementType, quantity, unitCostUsd, reason } = req.body;
      if (!productId || quantity === undefined || !reason) {
        res.status(400).json({
          code: 'INVALID_DATA',
          message: 'Debe especificar productId, quantity y reason para el ajuste de stock.',
        });
        return;
      }

      let targetWarehouseId = warehouseId;
      if (!targetWarehouseId) {
        const [defaultWh] = await db
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(and(eq(warehouses.tenantId, req.tenantId!), eq(warehouses.isActive, true)))
          .limit(1);
        if (!defaultWh) {
          res.status(400).json({ code: 'NO_WAREHOUSE', message: 'No hay almacén activo para este comercio.' });
          return;
        }
        targetWarehouseId = defaultWh.id;
      }

      const result = await InventoryService.createMovement(req.tenantId!, req.user!.id, {
        warehouseId: targetWarehouseId,
        productId,
        movementType: movementType || 'ADJUSTMENT',
        quantity: parseFloat(quantity),
        unitCostUsd: unitCostUsd ? parseFloat(unitCostUsd) : undefined,
        reason,
        channel: 'WEB_ADMIN',
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}
