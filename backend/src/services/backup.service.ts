import { eq } from 'drizzle-orm';
import { withTenant } from '../db/tenantDb.js';
import {
  tenants,
  tenantConfigurations,
  products,
  productStock,
  productBarcodes,
  customers,
  suppliers,
  purchaseOrders,
  sales,
  payments,
  financialTransactions,
  inventoryMovements,
  auditLogs,
} from '../db/schema.js';
import { AuditService } from './audit.service.js';

export class BackupService {
  /**
   * Genera un volcado completo de seguridad (Backup JSON) de la base de datos para el tenant bajo contexto RLS
   */
  static async exportTenantBackup(tenantId: string, userId: string) {
    const timestamp = new Date();

    const backupPayload = await withTenant(tenantId, async (tx) => {
      const [tenantData] = await tx.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      const [configData] = await tx.select().from(tenantConfigurations).where(eq(tenantConfigurations.tenantId, tenantId)).limit(1);
      const productsData = await tx.select().from(products).where(eq(products.tenantId, tenantId));
      const stockData = await tx.select().from(productStock).where(eq(productStock.tenantId, tenantId));
      const barcodesData = await tx.select().from(productBarcodes).where(eq(productBarcodes.tenantId, tenantId));
      const customersData = await tx.select().from(customers).where(eq(customers.tenantId, tenantId));
      const suppliersData = await tx.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));
      const ordersData = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.tenantId, tenantId));
      const salesData = await tx.select().from(sales).where(eq(sales.tenantId, tenantId)).limit(500);
      const paymentsData = await tx.select().from(payments).where(eq(payments.tenantId, tenantId)).limit(500);
      const financesData = await tx.select().from(financialTransactions).where(eq(financialTransactions.tenantId, tenantId));
      const movementsData = await tx.select().from(inventoryMovements).where(eq(inventoryMovements.tenantId, tenantId)).limit(500);
      const auditData = await tx.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId)).limit(200);

      const payload = {
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
          summary: payload.summary,
        },
        result: 'SUCCESS',
        channel: 'WEB_ADMIN',
      }, tx);

      return payload;
    });

    return backupPayload;
  }
}
