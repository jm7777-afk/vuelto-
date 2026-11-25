import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../services/monitoring.service.js';

export class MonitoringController {
  static async getSnapshot(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const snapshot = await MonitoringService.getSnapshot();
      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  }

  static async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const level = req.query.level ? String(req.query.level) : undefined;
      const category = req.query.category ? String(req.query.category) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 150;

      const logs = MonitoringService.getRecentLogs({ level, category, search, limit });
      res.json({ logs });
    } catch (err) {
      next(err);
    }
  }

  static stream(req: Request, res: Response): void {
    MonitoringService.subscribe(req, res, req.user?.id || 'superadmin');
  }
}
