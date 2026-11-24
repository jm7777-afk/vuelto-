import { Request, Response, NextFunction } from 'express';
import { FinancesService } from '../services/finances.service.js';

export class FinancesController {
  static async createTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const tx = await FinancesService.createTransaction(req.tenantId!, req.user!.id, req.body);
      res.status(201).json(tx);
    } catch (err) {
      next(err);
    }
  }

  static async listTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.query.type ? String(req.query.type) : undefined;
      const category = req.query.category ? String(req.query.category) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const transactions = await FinancesService.listTransactions(req.tenantId!, { type, category, limit });
      res.json(transactions);
    } catch (err) {
      next(err);
    }
  }

  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await FinancesService.getFinancialMetrics(req.tenantId!);
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
}
