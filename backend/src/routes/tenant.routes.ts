import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';

export const tenantRouter = Router();

// Endpoints del Súper Administrador Global (CRUD de Comercios / Inquilinos)
tenantRouter.get('/', TenantController.listAll);
tenantRouter.get('/:id', TenantController.getById);
tenantRouter.post('/', TenantController.create);
tenantRouter.put('/:id', TenantController.update);
tenantRouter.patch('/:id/toggle-active', TenantController.toggleActive);
