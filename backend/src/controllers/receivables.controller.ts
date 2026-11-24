import { Request, Response, NextFunction } from 'express';
import { ReceivablesService } from '../services/receivables.service.js';

export class ReceivablesController {
  static async listDebtors(req: Request, res: Response, next: NextFunction) {
    try {
      const debtors = await ReceivablesService.listDebtors(req.tenantId!);
      res.json(debtors);
    } catch (err) {
      next(err);
    }
  }

  static async registerPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReceivablesService.registerPayment(req.tenantId!, req.user!.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = req.query.customerId ? String(req.query.customerId) : undefined;
      const history = await ReceivablesService.getPaymentHistory(req.tenantId!, customerId);
      res.json(history);
    } catch (err) {
      next(err);
    }
  }
}
