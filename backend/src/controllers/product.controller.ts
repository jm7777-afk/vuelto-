import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service.js';

export class ProductController {
  static async findByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const barcode = String(req.params.barcode);
      const product = await ProductService.findByBarcode(req.tenantId!, barcode);
      if (!product) {
        res.status(404).json({
          code: 'PRODUCT_NOT_FOUND',
          message: 'Código de barras no encontrado en el inventario',
          barcode,
        });
        return;
      }
      res.json(product);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.create(req.tenantId!, req.user!.id, req.body);
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await ProductService.list(req.tenantId!);
      res.json(products);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const updated = await ProductService.update(req.tenantId!, id, req.body);
      if (!updated) {
        res.status(404).json({ code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado' });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const deleted = await ProductService.delete(req.tenantId!, id);
      if (!deleted) {
        res.status(404).json({ code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado' });
        return;
      }
      res.json({ status: 'ok', message: 'Producto desactivado del inventario' });
    } catch (err) {
      next(err);
    }
  }
}
