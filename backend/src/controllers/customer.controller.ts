import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service.js';

export class CustomerController {
  static async lookup(req: Request, res: Response, next: NextFunction) {
    try {
      const { document_number, document_type, phone } = req.query as any;
      const result = await CustomerService.lookup(req.tenantId!, {
        documentNumber: document_number,
        documentType: document_type,
        phone,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async quickCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.quickCreate(req.tenantId!, req.user!.id, req.body);
      res.status(201).json(customer);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const customers = await CustomerService.list(req.tenantId!);
      res.json(customers);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const customer = await CustomerService.getById(req.tenantId!, id);
      if (!customer) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Cliente no encontrado' });
        return;
      }
      res.json(customer);
    } catch (err) {
      next(err);
    }
  }

  static async addContact(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const contact = await CustomerService.addContact(req.tenantId!, id, req.body);
      res.status(201).json(contact);
    } catch (err) {
      next(err);
    }
  }

  static async addInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const interaction = await CustomerService.addInteraction(
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
      const interactions = await CustomerService.getInteractions(req.tenantId!, id);
      res.json(interactions);
    } catch (err) {
      next(err);
    }
  }
}
