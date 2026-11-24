import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/config.service.js';
import { ExchangeRateService } from '../services/exchange-rate.service.js';

export class ConfigController {
  static async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const config = await ConfigService.getConfig(tenantId);
      res.json(config);
    } catch (err) {
      next(err);
    }
  }

  static async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user?.id || 'system';
      const updated = await ConfigService.updateConfig(tenantId, userId, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async selectActiveRate(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user?.id || 'system';
      const { source, customRateValue } = req.body;
      const result = await ExchangeRateService.setActiveRate(tenantId, userId, source, customRateValue);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getActiveRate(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const result = await ExchangeRateService.getActiveRate(tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
