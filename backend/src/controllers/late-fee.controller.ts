import { Request, Response, NextFunction } from 'express';
import { LateFeeService } from '../services/late-fee.service.js';

export class LateFeeController {
  static async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await LateFeeService.getConfig(req.tenantId!);
      res.json(config);
    } catch (err) {
      next(err);
    }
  }

  static async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await LateFeeService.updateConfig(req.tenantId!, req.user!.id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async calculate(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = String(req.params.customerId);
      const calculation = await LateFeeService.calculateCustomerLateFee(req.tenantId!, customerId);
      res.json(calculation);
    } catch (err) {
      next(err);
    }
  }
}
