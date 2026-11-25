import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TenantService } from '../services/tenant.service.js';

const createTenantSchema = z
  .object({
    slug: z.string().trim().min(2).max(50),
    businessName: z.string().trim().min(2).max(150),
    tradeName: z.string().trim().max(150).optional(),
    documentType: z.enum(['J', 'G', 'V', 'E']),
    documentNumber: z.string().trim().min(5).max(15),
    fiscalAddress: z.string().trim().optional(),
    phone: z.string().trim().min(7).max(20),
    email: z.string().trim().email().max(100),
    isSpecialTaxpayer: z.boolean().optional(),
    internalBarcodePrefix: z.string().trim().max(5).optional(),
    adminUsername: z.string().trim().min(3).max(50).optional(),
    adminEmail: z.string().trim().email().max(100).optional(),
    adminFullName: z.string().trim().min(2).max(100).optional(),
    adminPassword: z.string().min(8).max(128).optional(),
  })
  .strict();

const createTenantUserSchema = z
  .object({
    username: z.string().trim().min(3).max(50),
    email: z.string().trim().email().max(100),
    fullName: z.string().trim().min(2).max(100),
    password: z.string().min(8).max(128),
    roleId: z.enum(['ADMIN', 'VENDEDOR', 'CONSULTA']),
    phone: z.string().trim().max(20).optional(),
  })
  .strict();

const resetUserPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(128),
  })
  .strict();

export class TenantController {
  static async listAll(_req: Request, res: Response, next: NextFunction) {
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
      const parsed = createTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Datos de negocio inválidos',
          details: parsed.error.format(),
        });
        return;
      }

      const superAdminUserId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const created = await TenantService.createTenant(superAdminUserId, {
        ...parsed.data,
        tradeName: parsed.data.tradeName || parsed.data.businessName,
        fiscalAddress: parsed.data.fiscalAddress || 'Venezuela',
      });
      res.status(201).json(created);
    } catch (err: any) {
      if (err?.code === '23505') {
        res.status(409).json({
          code: 'DUPLICATE_TENANT',
          message: 'Ya existe un comercio registrado con ese Slug o RIF, o un usuario con ese username/email.',
        });
        return;
      }
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

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = String(req.params.id);
      const parsed = createTenantUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Datos de usuario inválidos',
          details: parsed.error.format(),
        });
        return;
      }

      const superAdminUserId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const created = await TenantService.createTenantUser(superAdminUserId, tenantId, parsed.data);
      res.status(201).json(created);
    } catch (err: any) {
      if (err?.message === 'TENANT_NOT_FOUND') {
        res.status(404).json({ code: 'TENANT_NOT_FOUND', message: 'Negocio no encontrado' });
        return;
      }
      if (err?.code === '23505') {
        res.status(409).json({ code: 'DUPLICATE_USER', message: 'Ya existe un usuario con ese username o email en este comercio.' });
        return;
      }
      next(err);
    }
  }

  static async resetUserPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = String(req.params.id);
      const targetUserId = String(req.params.userId);
      const parsed = resetUserPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Contraseña inválida',
        });
        return;
      }

      const superAdminUserId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const updated = await TenantService.resetTenantUserPassword(
        superAdminUserId,
        tenantId,
        targetUserId,
        parsed.data.newPassword
      );
      if (!updated) {
        res.status(404).json({ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado en este comercio' });
        return;
      }
      res.json({ message: `Contraseña restablecida para @${updated.username}`, user: updated });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const superAdminUserId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const deleted = await TenantService.deleteTenant(superAdminUserId, id);
      if (!deleted) {
        res.status(404).json({ code: 'TENANT_NOT_FOUND', message: 'Negocio no encontrado' });
        return;
      }
      res.json({ message: 'Negocio eliminado permanentemente de la plataforma', tenant: deleted });
    } catch (err) {
      next(err);
    }
  }
}
