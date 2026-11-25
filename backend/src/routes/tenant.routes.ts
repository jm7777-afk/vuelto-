import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

export const tenantRouter = Router();

// Endpoints exclusivos del Súper Administrador Global (CRUD completo de Comercios / Tenants y sus usuarios)
tenantRouter.use(requireRoles('SUPER_ADMIN'));

tenantRouter.get('/', TenantController.listAll);
tenantRouter.get('/:id', TenantController.getById);
tenantRouter.post('/', TenantController.create);
tenantRouter.put('/:id', TenantController.update);
tenantRouter.patch('/:id', TenantController.update);
tenantRouter.patch('/:id/toggle-active', TenantController.toggleActive);
tenantRouter.post('/:id/users', TenantController.createUser);
tenantRouter.post('/:id/users/:userId/reset-password', TenantController.resetUserPassword);
tenantRouter.delete('/:id', TenantController.delete);
