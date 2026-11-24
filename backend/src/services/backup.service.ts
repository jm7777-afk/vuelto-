import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tenants,
  tenantConfigurations,
  products,
  productStock,
  productBarcodes,
  customers,
  suppliers,
  purchaseOrders,
  purchaseOrderLines,
  sales,
  saleLines,
  payments,
  financialTransactions,
  inventoryMovements,
  auditLogs,
} from '../db/schema.js';
import { AuditService } from './audit.service.js';

export class BackupService {
  /**
   * Genera un volcado completo de seguridad (Backup JSON) de la base de datos para el tenant
   */
  static async exportTenantBackup(tenantId: string, userId: string) {
    const timestamp = new Date();

    const [tenantData] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const [configData] = await db.select().from(tenantConfigurations).where(eq(tenantConfigurations.tenantId, tenantId)).limit(1);
    const productsData = await db.select().from(products).where(eq(products.tenantId, tenantId));
    const stockData = await db.select().from(productStock).where(eq(productStock.tenantId, tenantId));
    const barcodesData = await db.select().from(productBarcodes).where(eq(productBarcodes.tenantId, tenantId));
    const customersData = await db.select().from(customers).where(eq(customers.tenantId, tenantId));
    const suppliersData = await db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));
    const ordersData = await db.select().from(purchaseOrders).where(eq(purchaseOrders.tenantId, tenantId));
    const salesData = await db.select().from(sales).where(eq(sales.tenantId, tenantId)).limit(500);
    const paymentsData = await db.select().from(payments).where(eq(payments.tenantId, tenantId)).limit(500);
    const financesData = await db.select().from(financialTransactions).where(eq(financialTransactions.tenantId, tenantId));
    const movementsData = await db.select().from(inventoryMovements).where(eq(inventoryMovements.tenantId, tenantId)).limit(500);
    const auditData = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId)).limit(200);

    const backupPayload = {
      version: '1.2.0',
      system: 'Vuelto SaaS Venezuela',
      generatedAt: timestamp.toISOString(),
      tenant: {
        id: tenantId,
        businessName: tenantData?.businessName || 'Comercio',
        rif: tenantData ? `${tenantData.documentType}-${tenantData.documentNumber}` : 'N/A',
      },
      configuration: configData || null,
      summary: {
        productsCount: productsData.length,
        customersCount: customersData.length,
        suppliersCount: suppliersData.length,
        ordersCount: ordersData.length,
        salesCount: salesData.length,
        financesCount: financesData.length,
      },
      data: {
        products: productsData,
        stock: stockData,
        barcodes: barcodesData,
        customers: customersData,
        suppliers: suppliersData,
        purchaseOrders: ordersData,
        sales: salesData,
        payments: paymentsData,
        finances: financesData,
        inventoryMovements: movementsData,
        recentAudits: auditData,
      },
    };

    await AuditService.log({
      tenantId,
      userId,
      action: 'BACKUP_EXPORTED',
      entity: 'SYSTEM_BACKUP',
      payload: {
        timestamp: timestamp.toISOString(),
        summary: backupPayload.summary,
      },
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    return backupPayload;
  }
}
