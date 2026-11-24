import { Request, Response, NextFunction } from 'express';
import { PurchaseOrderService } from '../services/purchase-order.service.js';

export class PurchaseOrderController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await PurchaseOrderService.create(req.tenantId!, req.user!.id, req.body);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      const orders = await PurchaseOrderService.list(req.tenantId!, status);
      res.json(orders);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const order = await PurchaseOrderService.getById(req.tenantId!, id);
      if (!order) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Orden de compra no encontrada' });
        return;
      }
      res.json(order);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { status } = req.body;
      const updated = await PurchaseOrderService.updateStatus(req.tenantId!, req.user!.id, id, status);
      if (!updated) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Orden de compra no encontrada' });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async receive(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { warehouseId } = req.body;
      const received = await PurchaseOrderService.receive(req.tenantId!, req.user!.id, id, warehouseId);
      res.json({
        status: 'ok',
        message: 'Orden de compra recibida con éxito y cargada en Kardex.',
        order: received,
      });
    } catch (err) {
      next(err);
    }
  }
}
