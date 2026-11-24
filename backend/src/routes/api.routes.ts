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
import { InventoryController } from '../controllers/inventory.controller.js';
import { PurchaseOrderController } from '../controllers/purchase-order.controller.js';
import { ReceivablesController } from '../controllers/receivables.controller.js';
import { LateFeeController } from '../controllers/late-fee.controller.js';
import { FinancesController } from '../controllers/finances.controller.js';
import { ExchangeRateService } from '../services/exchange-rate.service.js';
import { FiscalReportService } from '../services/fiscal-report.service.js';

export const apiRouter = Router();

// --- AUTENTICACIÓN PÚBLICA ---
apiRouter.post('/auth/login', AuthController.login);

// --- TASAS DE CAMBIO (Público / Monitor BCV, Paralelo, Euro, USDT) ---
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
apiRouter.get('/products/barcode/:barcode', ProductController.findByBarcode);
apiRouter.get('/products', ProductController.list);
apiRouter.post('/products', requireAdmin, validateRequest({ body: createProductSchema }), ProductController.create);
apiRouter.put('/products/:id', requireAdmin, ProductController.update);
apiRouter.delete('/products/:id', requireAdmin, ProductController.delete);

// --- INVENTARIO, STOCK Y KARDEX ---
apiRouter.get('/inventory/stock', requireCashierOrAdmin, InventoryController.getStock);
apiRouter.get('/inventory/kardex', requireAdmin, InventoryController.getKardex);
apiRouter.get('/inventory/low-stock', requireAdmin, InventoryController.getLowStock);
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
