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
import { CashSessionController } from '../controllers/cash-session.controller.js';
import { tenantRouter } from './tenant.routes.js';
import { monitoringRouter } from './monitoring.routes.js';
import { MonitoringController } from '../controllers/monitoring.controller.js';
import { MonitoringService } from '../services/monitoring.service.js';
import { ExchangeRateService } from '../services/exchange-rate.service.js';
import { FiscalReportService } from '../services/fiscal-report.service.js';
import { FiscalService } from '../services/fiscal.service.js';
import { SalesService } from '../services/sales.service.js';
import { withTenant } from '../db/tenantDb.js';
import { users, sales, auditLogs } from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

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
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      const live = await ExchangeRateService.fetchLiveVenezuelanRates();
      res.json({ liveApi: live, bcv: { rate: live.bcv }, paralelo: { rate: live.paralelo }, euro: { rate: live.euro } });
      return;
    }
    const monitor = await ExchangeRateService.getMonitorRates(tenantId);
    res.json(monitor);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/exchange-rates/current', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      const live = await ExchangeRateService.fetchLiveVenezuelanRates();
      res.json({ bcv: { source: 'BCV', rate: live.bcv, fetchedAt: new Date(), validFrom: new Date(), isStale: false } });
      return;
    }
    const rates = await ExchangeRateService.getCurrentRates(tenantId);
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

// --- WEBHOOK PÚBLICO (Verificación criptográfica con X-Signature-SHA256) ---
apiRouter.post('/payments/webhooks', PaymentController.handleWebhook);

// --- STREAM SSE CON TICKET EFÍMERO DE UN SOLO USO (SIN JWT EN QUERY STRING) ---
apiRouter.get('/super-admin/monitoring/stream', (req, res) => {
  const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : undefined;
  if (ticket) {
    const ticketUserId = MonitoringService.consumeStreamTicket(ticket);
    if (!ticketUserId) {
      res.status(401).json({ code: 'INVALID_STREAM_TICKET', message: 'Ticket SSE inválido o expirado.' });
      return;
    }
    req.user = {
      id: ticketUserId,
      tenantId: null,
      roleId: 'SUPER_ADMIN',
      username: 'superadmin',
      fullName: 'Súper Administrador',
    };
    MonitoringController.stream(req, res);
    return;
  }

  requireTenantAuth(req, res, () => {
    if (req.user?.roleId !== 'SUPER_ADMIN') {
      res.status(403).json({ code: 'FORBIDDEN', message: 'Requiere rol SUPER_ADMIN' });
      return;
    }
    MonitoringController.stream(req, res);
  });
});

// Todas las demás rutas de dominio bajo /api/v1 requieren autenticación de tenant
apiRouter.use(requireTenantAuth);

// --- SESIÓN Y SEGURIDAD DE CUENTA (TODOS LOS ROLES, INCLUYENDO SUPER_ADMIN) ---
apiRouter.get('/auth/me', AuthController.me);
apiRouter.post('/auth/change-password', AuthController.changePassword);
apiRouter.post('/auth/logout', AuthController.logout);

// --- VENDEDORES EN VIVO (REAL DESDE POSTGRESQL, SIN N+1 Y CON RLS) ---
apiRouter.get('/cashiers/live', requireAdmin, async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.json([]);
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const enriched = await withTenant(tenantId, async (tx) => {
      const tenantUsers = await tx
        .select({
          id: users.id,
          name: users.fullName,
          username: users.username,
          roleId: users.roleId,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.tenantId, tenantId));

      if (tenantUsers.length === 0) return [];

      const salesAgg = await tx
        .select({
          userId: sales.userId,
          count: sql<number>`count(*)::int`,
          totalUsd: sql<string>`coalesce(sum(${sales.totalAmountUsd}), 0)::text`,
          totalBs: sql<string>`coalesce(sum(${sales.totalAmountBs}), 0)::text`,
        })
        .from(sales)
        .where(and(eq(sales.tenantId, tenantId), gte(sales.createdAt, startOfDay)))
        .groupBy(sales.userId);

      const recentAudits = await tx
        .select({
          userId: auditLogs.userId,
          action: auditLogs.action,
          entity: auditLogs.entity,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100);

      const salesMap = new Map(salesAgg.map((s) => [s.userId, s]));
      const auditMap = new Map<string, (typeof recentAudits)[0]>();
      for (const row of recentAudits) {
        if (row.userId && !auditMap.has(row.userId)) {
          auditMap.set(row.userId, row);
        }
      }

      const recentMs = Date.now() - 30 * 60 * 1000;
      return tenantUsers.map((u) => {
        const todaySales = salesMap.get(u.id);
        const lastAudit = auditMap.get(u.id);
        const lastLoginMs = u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0;
        const status = !u.isActive ? 'OFFLINE' : lastLoginMs >= recentMs ? 'ONLINE' : 'IDLE';

        return {
          id: u.id,
          name: u.name,
          username: u.username,
          roleId: u.roleId,
          status,
          openCartsCount: 0,
          salesTodayCount: todaySales?.count || 0,
          salesTodayUsd: parseFloat(todaySales?.totalUsd || '0'),
          salesTodayBs: parseFloat(todaySales?.totalBs || '0'),
          lastAction: lastAudit ? `${lastAudit.action} (${lastAudit.entity})` : 'Sin actividad reciente',
          lastActionTime: lastAudit?.createdAt ? new Date(lastAudit.createdAt).toLocaleString('es-VE') : 'Nunca',
        };
      });
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

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

// --- APERTURA Y CIERRE DE CAJA (TURNOS DE CAJERO) ---
apiRouter.get('/cash-sessions/current', requireCashierOrAdmin, CashSessionController.getCurrent);
apiRouter.post('/cash-sessions/open', requireCashierOrAdmin, CashSessionController.open);
apiRouter.post('/cash-sessions/close', requireCashierOrAdmin, CashSessionController.close);
apiRouter.get('/cash-sessions/history', requireCashierOrAdmin, CashSessionController.history);

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

// --- SÚPER ADMINISTRADOR GLOBAL (CRUD DE TODOS LOS NEGOCIOS / TENANTS & MONITOREO EN TIEMPO REAL) ---
apiRouter.use('/tenants', tenantRouter);
apiRouter.use('/super-admin/tenants', tenantRouter);
apiRouter.use('/super-admin/monitoring', monitoringRouter);
