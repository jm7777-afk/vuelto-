import { Router } from 'express';
import { requireTenantAuth } from '../middlewares/tenant.middleware.js';
import { requireRoles, requireAdmin, requireCashierOrAdmin } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { barcodeLookupRateLimiter, authRateLimiter } from '../middlewares/rate-limit.middleware.js';
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
import { InventoryController } from '../controllers/inventory.controller.js';
import { PurchaseOrderController } from '../controllers/purchase-order.controller.js';
import { ReceivablesController } from '../controllers/receivables.controller.js';
import { LateFeeController } from '../controllers/late-fee.controller.js';
import { FinancesController } from '../controllers/finances.controller.js';
import { ConfigController } from '../controllers/config.controller.js';
import { AuditController } from '../controllers/audit.controller.js';
import { tenantRouter } from './tenant.routes.js';
import { ExchangeRateService } from '../services/exchange-rate.service.js';
import { FiscalReportService } from '../services/fiscal-report.service.js';
import { FiscalService } from '../services/fiscal.service.js';
import { SalesService } from '../services/sales.service.js';

export const apiRouter = Router();

// --- AUTENTICACIÓN PÚBLICA ---
apiRouter.post('/auth/login', authRateLimiter, AuthController.login);
apiRouter.post('/auth/refresh', AuthController.refresh);

// --- TASAS DE CAMBIO (Público / Monitor BCV, Paralelo, Euro, USDT) ---
apiRouter.get('/exchange-rates/live', async (_req, res, next) => {
  try {
    const live = await ExchangeRateService.fetchLiveVenezuelanRates();
    res.json(live);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/exchange-rates/monitor', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId || 'a0000000-0000-0000-0000-000000000001';
    const monitor = await ExchangeRateService.getMonitorRates(tenantId);
    res.json(monitor);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/exchange-rates/current', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId || 'a0000000-0000-0000-0000-000000000001';
    const rates = await ExchangeRateService.getCurrentRates(tenantId);
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

// --- WEBHOOK PÚBLICO (Verificación criptográfica con X-Signature-SHA256) ---
apiRouter.post('/payments/webhooks', PaymentController.handleWebhook);

// Todas las demás rutas de dominio bajo /api/v1 requieren autenticación de tenant
apiRouter.use(requireTenantAuth);

// --- PAGOS Y PASARELA C2P ---
apiRouter.post('/payments/c2p/intent', PaymentController.createIntent);

// --- PRODUCTOS Y ESCÁNER ---
apiRouter.get('/products/by-barcode/:barcode', barcodeLookupRateLimiter, ProductController.findByBarcode);
apiRouter.get('/products/barcode/:barcode', barcodeLookupRateLimiter, ProductController.findByBarcode);
apiRouter.get('/products', ProductController.list);
apiRouter.post('/products', requireAdmin, validateRequest({ body: createProductSchema }), ProductController.create);
apiRouter.post('/products/apply-global-margin', requireAdmin, ProductController.applyGlobalMargin);
apiRouter.put('/products/:id', requireAdmin, ProductController.update);
apiRouter.delete('/products/:id', requireAdmin, ProductController.delete);

// --- INVENTARIO, STOCK Y KARDEX ---
apiRouter.get('/inventory/stock', requireCashierOrAdmin, InventoryController.getStock);
apiRouter.get('/inventory/kardex', requireAdmin, InventoryController.getKardex);
apiRouter.get('/inventory/low-stock', requireAdmin, InventoryController.getLowStock);
apiRouter.get('/inventory/replenishment-list', requireAdmin, InventoryController.getReplenishmentList);
apiRouter.post('/inventory/adjust', requireAdmin, InventoryController.adjustStock);

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
apiRouter.put('/suppliers/:id', requireAdmin, SupplierController.update);
apiRouter.delete('/suppliers/:id', requireAdmin, SupplierController.delete);
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

// --- PEDIDOS / ÓRDENES DE COMPRA (PURCHASE ORDERS) ---
apiRouter.get('/purchase-orders', requireAdmin, PurchaseOrderController.list);
apiRouter.get('/purchase-orders/:id', requireAdmin, PurchaseOrderController.getById);
apiRouter.post('/purchase-orders', requireAdmin, PurchaseOrderController.create);
apiRouter.put('/purchase-orders/:id/status', requireAdmin, PurchaseOrderController.updateStatus);
apiRouter.post('/purchase-orders/:id/receive', requireAdmin, PurchaseOrderController.receive);

// --- COBRANZAS (RECEIVABLES) Y ABONOS ---
apiRouter.get('/receivables/debtors', requireAdmin, ReceivablesController.listDebtors);
apiRouter.post('/receivables/payment', requireAdmin, ReceivablesController.registerPayment);
apiRouter.get('/receivables/history', requireAdmin, ReceivablesController.getPaymentHistory);

// --- MORA Y PENALIZACIONES (LATE FEES) ---
apiRouter.get('/late-fees/config', requireAdmin, LateFeeController.getConfig);
apiRouter.put('/late-fees/config', requireAdmin, LateFeeController.updateConfig);
apiRouter.get('/late-fees/calculate/:customerId', requireAdmin, LateFeeController.calculate);

// --- FINANZAS, FLUJO DE CAJA Y GASTOS (OPEX / COGS) ---
apiRouter.get('/finances/metrics', requireAdmin, FinancesController.getMetrics);
apiRouter.get('/finances/transactions', requireAdmin, FinancesController.listTransactions);
apiRouter.post('/finances/transactions', requireAdmin, FinancesController.createTransaction);

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

// --- CONFIGURACIÓN DEL NEGOCIO, TASAS Y RÉGIMEN FISCAL ---
apiRouter.get('/config', requireCashierOrAdmin, ConfigController.getConfig);
apiRouter.put('/config', requireAdmin, ConfigController.updateConfig);
apiRouter.get('/exchange-rates/active', requireCashierOrAdmin, ConfigController.getActiveRate);
apiRouter.post('/exchange-rates/select-active', requireAdmin, ConfigController.selectActiveRate);

// --- AUDITORÍA INMUTABLE Y RESPALDOS (BACKUPS) ---
apiRouter.post('/auth/2fa/generate', AuthController.generate2FA);
apiRouter.post('/auth/2fa/enable', AuthController.enable2FA);
apiRouter.get('/audit', requireAdmin, AuditController.listLogs);
apiRouter.get('/audit/logs', requireAdmin, AuditController.listLogs);
apiRouter.get('/admin/backup', requireAdmin, AuditController.downloadBackup);

// --- REPORTES FISCALES SENIAT Y LIBRO DE COMPRAS (FASE 5) ---
apiRouter.get('/reports/purchases-book/csv', requireAdmin, async (req, res, next) => {
  try {
    const csvData = await FiscalReportService.getPurchasesBookCsv(req.tenantId!, req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=Libro_Compras_SENIAT.csv');
    res.send(csvData);
  } catch (err) {
    next(err);
  }
});

// --- TASAS DINÁMICAS Y FISCALIDAD (FASE 5) ---
apiRouter.put('/admin/fiscal/rates', requireAdmin, async (req, res, next) => {
  try {
    const updated = await FiscalService.updateRates(req.tenantId!, req.user!.id, req.body);
    res.json({ message: 'Tasas fiscales actualizadas correctamente', rates: updated });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/exchange-rates/manual', requireAdmin, async (req, res, next) => {
  try {
    const rate = await ExchangeRateService.setManualRate(
      req.tenantId!,
      req.user!.id,
      parseFloat(req.body.newRate),
      req.body.reason || 'Ajuste manual de tasa'
    );
    res.json({ message: 'Tasa de cambio manual establecida correctamente', rate });
  } catch (err) {
    next(err);
  }
});

// --- NOTAS DE CRÉDITO Y ANULACIONES (FASE 5) ---
apiRouter.post('/sales/:id/credit-note', requireCashierOrAdmin, async (req, res, next) => {
  try {
    const note = await SalesService.createCreditNote(req.tenantId!, req.user!.id, String(req.params.id), req.body);
    res.status(201).json({ message: 'Nota de crédito emitida y factura anulada con éxito', note });
  } catch (err) {
    next(err);
  }
});

// --- SINCRONIZACIÓN OFFLINE Y DISCREPANCIAS (FASE 5) ---
apiRouter.post('/sync/offline-batch', requireCashierOrAdmin, async (req, res, next) => {
  try {
    const batch = Array.isArray(req.body) ? req.body : req.body.sales || [];
    const result = await SalesService.syncOfflineBatch(req.tenantId!, req.user!.id, batch);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/sync/discrepancies', requireAdmin, async (req, res, next) => {
  try {
    const discrepancies = await SalesService.getDiscrepancies(req.tenantId!);
    res.json(discrepancies);
  } catch (err) {
    next(err);
  }
});

// --- SÚPER ADMINISTRADOR GLOBAL (CRUD DE TODOS LOS NEGOCIOS / TENANTS) ---
apiRouter.use('/tenants', tenantRouter);
apiRouter.use('/super-admin/tenants', tenantRouter);
