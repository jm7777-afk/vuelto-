import { Router } from 'express';
import { requireTenantAuth } from '../middlewares/tenant.middleware.js';
import { requireRoles, requireAdmin, requireCashierOrAdmin } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  quickCustomerSchema,
  createCustomerSchema,
  createSupplierSchema,
  createContactSchema,
  createInteractionSchema,
  createProductSchema,
  createSaleSchema,
} from '../schemas/domain.schemas.js';

import { CustomerController } from '../controllers/customer.controller.js';
import { ProductController } from '../controllers/product.controller.js';
import { SupplierController } from '../controllers/supplier.controller.js';
import { SalesController } from '../controllers/sales.controller.js';
import { VoucherController } from '../controllers/voucher.controller.js';
import { PaymentController } from '../controllers/payment.controller.js';
import { AuthController } from '../controllers/auth.controller.js';
import { ExchangeRateService } from '../services/exchange-rate.service.js';
import { FiscalReportService } from '../services/fiscal-report.service.js';

export const apiRouter = Router();

// --- AUTENTICACIÓN PÚBLICA ---
apiRouter.post('/auth/login', AuthController.login);

// --- WEBHOOK PÚBLICO (Verificación criptográfica con X-Signature-SHA256) ---
apiRouter.post('/payments/webhooks', PaymentController.handleWebhook);

// Todas las demás rutas de dominio bajo /api/v1 requieren autenticación de tenant
apiRouter.use(requireTenantAuth);

// --- TASAS DE CAMBIO (BCV / Paralelo) ---
apiRouter.get('/exchange-rates/current', async (req, res, next) => {
  try {
    const rates = await ExchangeRateService.getCurrentRates(req.tenantId!);
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/exchange-rates/monitor', async (req, res, next) => {
  try {
    const monitor = await ExchangeRateService.getMonitorRates(req.tenantId!);
    res.json(monitor);
  } catch (err) {
    next(err);
  }
});

// --- PAGOS Y PASARELA C2P ---
apiRouter.post('/payments/c2p/intent', PaymentController.createIntent);

// --- PRODUCTOS Y ESCÁNER ---
apiRouter.get('/products/barcode/:barcode', ProductController.findByBarcode);
apiRouter.get('/products', ProductController.list);
apiRouter.post('/products', requireAdmin, validateRequest({ body: createProductSchema }), ProductController.create);

// --- CLIENTES Y CONTACTO ---
apiRouter.get('/customers/lookup', CustomerController.lookup);
apiRouter.post(
  '/customers/quick',
  requireCashierOrAdmin,
  validateRequest({ body: quickCustomerSchema }),
  CustomerController.quickCreate
);
apiRouter.get('/customers', CustomerController.list);
apiRouter.get('/customers/:id', CustomerController.getById);
apiRouter.post(
  '/customers',
  requireAdmin,
  validateRequest({ body: createCustomerSchema }),
  CustomerController.quickCreate
);
apiRouter.post(
  '/customers/:id/contacts',
  validateRequest({ body: createContactSchema }),
  CustomerController.addContact
);
apiRouter.post(
  '/customers/:id/interactions',
  validateRequest({ body: createInteractionSchema }),
  CustomerController.addInteraction
);
apiRouter.get('/customers/:id/interactions', CustomerController.getInteractions);

// --- PROVEEDORES Y CONTACTO ---
apiRouter.get('/suppliers', SupplierController.list);
apiRouter.get('/suppliers/:id', SupplierController.getById);
apiRouter.post(
  '/suppliers',
  requireAdmin,
  validateRequest({ body: createSupplierSchema }),
  SupplierController.create
);
apiRouter.post(
  '/suppliers/:id/contacts',
  validateRequest({ body: createContactSchema }),
  SupplierController.addContact
);
apiRouter.post(
  '/suppliers/:id/interactions',
  validateRequest({ body: createInteractionSchema }),
  SupplierController.addInteraction
);
apiRouter.get('/suppliers/:id/interactions', SupplierController.getInteractions);

// --- VENTAS Y FACTURACIÓN ATÓMICA ---
apiRouter.get('/sales', SalesController.list);
apiRouter.get('/sales/:id', SalesController.getById);
apiRouter.post(
  '/sales',
  requireCashierOrAdmin,
  validateRequest({ body: createSaleSchema }),
  SalesController.confirmSale
);
apiRouter.post('/sales/sync-batch', requireCashierOrAdmin, SalesController.syncBatch);
apiRouter.get('/sales/:id/receipt/pdf', SalesController.getPdfReceipt);
apiRouter.post('/sales/:id/receipt/escpos', SalesController.getEscPosReceipt);
apiRouter.post('/sales/:id/audit-share', SalesController.auditShare);
apiRouter.post('/sales/:id/audit-print', SalesController.auditPrint);

// --- REPORTES FISCALES SENIAT (Providencia 0071) ---
apiRouter.get('/reports/sales-book/csv', requireAdmin, async (req, res, next) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const csvData = await FiscalReportService.exportSalesBookCsv(req.tenantId!, { month, year });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=Libro_Ventas_SENIAT_${month || 'Todos'}_${year || 'Consolidado'}.csv`);
    res.send(csvData);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/reports/sales-book/json', requireAdmin, async (req, res, next) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const report = await FiscalReportService.getSalesBookData(req.tenantId!, { month, year });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// --- VALES DE CAMBIO (VUELTOS) ---
apiRouter.get('/vouchers/:code', VoucherController.getByCode);
apiRouter.post('/vouchers/redeem', requireCashierOrAdmin, VoucherController.redeem);
