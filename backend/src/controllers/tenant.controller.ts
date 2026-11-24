import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service.js';

export class TenantController {
  static async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantsList = await TenantService.listAllTenants();
      res.json(tenantsList);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenant = await TenantService.getTenantById(id);
      if (!tenant) {
        res.status(404).json({ code: 'TENANT_NOT_FOUND', message: 'Negocio no encontrado' });
        return;
      }
      res.json(tenant);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const superAdminUserId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const created = await TenantService.createTenant(superAdminUserId, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const superAdminUserId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const updated = await TenantService.updateTenant(superAdminUserId, id, req.body);
      if (!updated) {
        res.status(404).json({ code: 'TENANT_NOT_FOUND', message: 'Negocio no encontrado' });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { isActive } = req.body;
      const superAdminUserId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const updated = await TenantService.toggleTenantActive(superAdminUserId, id, Boolean(isActive));
      if (!updated) {
        res.status(404).json({ code: 'TENANT_NOT_FOUND', message: 'Negocio no encontrado' });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
}
