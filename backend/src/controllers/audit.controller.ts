import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service.js';
import { BackupService } from '../services/backup.service.js';

export class AuditController {
  static async listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isSuperAdmin = req.user?.roleId === 'SUPER_ADMIN';
      const tenantId = isSuperAdmin ? ((req.query.tenantId as string) || null) : req.tenantId!;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const action = req.query.action ? String(req.query.action) : undefined;
      const channel = req.query.channel ? String(req.query.channel) : undefined;

      const logs = await AuditService.listLogs(tenantId, { page, limit, action, channel });
      res.json(logs);
    } catch (err) {
      next(err);
    }
  }

  static async downloadBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user?.id || 'admin';
      const backup = await BackupService.exportTenantBackup(tenantId, userId);

      const filename = `backup_vuelto_${tenantId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(backup);
    } catch (err) {
      next(err);
    }
  }
}
