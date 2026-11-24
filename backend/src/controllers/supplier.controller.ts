import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service.js';

export class SupplierController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SupplierService.create(req.tenantId!, req.user!.id, req.body);
      res.status(201).json(supplier);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const suppliers = await SupplierService.list(req.tenantId!);
      res.json(suppliers);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const supplier = await SupplierService.getById(req.tenantId!, id);
      if (!supplier) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Proveedor no encontrado' });
        return;
      }
      res.json(supplier);
    } catch (err) {
      next(err);
    }
  }

  static async addContact(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const contact = await SupplierService.addContact(req.tenantId!, id, req.body);
      res.status(201).json(contact);
    } catch (err) {
      next(err);
    }
  }

  static async addInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const interaction = await SupplierService.addInteraction(
        req.tenantId!,
        id,
        req.user!.id,
        req.body
      );
      res.status(201).json(interaction);
    } catch (err) {
      next(err);
    }
  }

  static async getInteractions(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const interactions = await SupplierService.getInteractions(req.tenantId!, id);
      res.json(interactions);
    } catch (err) {
      next(err);
    }
  }
}
