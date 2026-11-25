import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoring.controller.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

export const monitoringRouter = Router();

monitoringRouter.use(requireRoles('SUPER_ADMIN'));

monitoringRouter.get('/snapshot', MonitoringController.getSnapshot);
monitoringRouter.get('/logs', MonitoringController.getLogs);
monitoringRouter.get('/stream', MonitoringController.stream);
