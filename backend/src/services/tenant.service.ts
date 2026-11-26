import { eq, desc, sql, inArray, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tenants,
  tenantConfigurations,
  users,
  products,
  productBarcodes,
  productStock,
  inventoryMovements,
  categories,
  warehouses,
  customers,
  suppliers,
  customerContacts,
  contactInteractions,
  purchaseOrders,
  purchaseOrderLines,
  receivablePayments,
  financialTransactions,
  exchangeRateSnapshots,
  invoiceSequences,
  sales,
  saleLines,
  payments,
  changeVouchers,
  creditDebitNotes,
  cashSessions,
  taxRates,
  igtfRules,
  idempotencyKeys,
  refreshTokens,
  auditLogs,
} from '../db/schema.js';
import { AuditService } from './audit.service.js';
import { PasswordService } from '../utils/password.js';

export interface CreateTenantDto {
  slug: string;
  businessName: string;
  tradeName: string;
  documentType: 'J' | 'G' | 'V' | 'E';
  documentNumber: string;
  fiscalAddress: string;
  phone: string;
  email: string;
  isSpecialTaxpayer?: boolean;
  internalBarcodePrefix?: string;
  // Credenciales opcionales del Administrador inicial del Tenant
  adminUsername?: string;
  adminEmail?: string;
  adminFullName?: string;
  adminPassword?: string;
}

export interface UpdateTenantDto {
  businessName?: string;
  tradeName?: string;
  documentType?: 'J' | 'G' | 'V' | 'E';
  documentNumber?: string;
  fiscalAddress?: string;
  phone?: string;
  email?: string;
  isSpecialTaxpayer?: boolean;
  internalBarcodePrefix?: string;
  isActive?: boolean;
}

export class TenantService {
  /**
   * Lista global de todos los tenants para el Súper Administrador.
   * Incluye conteo de usuarios, productos e ingresos agregados desde PostgreSQL.
   */
  static async listAllTenants() {
    const allTenants = await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt));

    const enriched = await Promise.all(
      allTenants.map(async (t) => {
        const [usersCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.tenantId, t.id));

        const [productsCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(eq(products.tenantId, t.id));

        const [invoicesCount] = await db
          .select({
            count: sql<number>`count(*)::int`,
            totalSalesUsd: sql<string>`coalesce(sum(total_amount_usd), 0)::text`,
          })
          .from(sales)
          .where(eq(sales.tenantId, t.id));

        const [config] = await db
          .select()
          .from(tenantConfigurations)
          .where(eq(tenantConfigurations.tenantId, t.id))
          .limit(1);

        const tenantUsers = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            fullName: users.fullName,
            roleId: users.roleId,
            isActive: users.isActive,
            lastLoginAt: users.lastLoginAt,
          })
          .from(users)
          .where(eq(users.tenantId, t.id));

        return {
          ...t,
          usersCount: usersCount?.count || 0,
          productsCount: productsCount?.count || 0,
          invoicesCount: invoicesCount?.count || 0,
          totalSalesUsd: parseFloat(invoicesCount?.totalSalesUsd || '0'),
          configuration: config || null,
          users: tenantUsers,
        };
      })
    );

    return enriched;
  }

  /**
   * Obtiene los datos detallados de un negocio específico
   */
  static async getTenantById(id: string) {
    const [t] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!t) return null;

    const [config] = await db
      .select()
      .from(tenantConfigurations)
      .where(eq(tenantConfigurations.tenantId, id))
      .limit(1);

    const tenantUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        roleId: users.roleId,
        phone: users.phone,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, id));

    return {
      ...t,
      configuration: config || null,
      users: tenantUsers,
    };
  }

  /**
   * Crea un nuevo negocio (Tenant), su configuración fiscal, almacén principal,
   * correlativo de facturas, cliente genérico Consumidor Final y opcionalmente su usuario Administrador.
   */
  static async createTenant(superAdminUserId: string, data: CreateTenantDto) {
    const cleanDoc = data.documentNumber.replace(/[^0-9]/g, '');
    const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const result = await db.transaction(async (tx) => {
      const [newTenant] = await tx
        .insert(tenants)
        .values({
          slug: cleanSlug,
          businessName: data.businessName.trim(),
          tradeName: (data.tradeName || data.businessName).trim(),
          documentType: data.documentType,
          documentNumber: cleanDoc,
          fiscalAddress: (data.fiscalAddress || 'Venezuela').trim(),
          phone: data.phone.trim(),
          email: data.email.trim().toLowerCase(),
          isSpecialTaxpayer: data.isSpecialTaxpayer ?? false,
          internalBarcodePrefix: data.internalBarcodePrefix?.trim() || '200',
          isActive: true,
        })
        .returning();

      const [initialConfig] = await tx
        .insert(tenantConfigurations)
        .values({
          tenantId: newTenant.id,
          activeRateSource: 'BCV',
          enableIva: true,
          enableIgtf: newTenant.isSpecialTaxpayer,
          defaultIvaPercentage: '16.00',
          defaultProfitMargin: '30.00',
          requireAdminForOverdueDebt: true,
        })
        .returning();

      // Almacén principal por defecto
      await tx.insert(warehouses).values({
        tenantId: newTenant.id,
        name: 'Almacén Principal / Tienda',
        code: 'ALM-01',
        address: newTenant.fiscalAddress,
        isDefault: true,
        isActive: true,
      });

      // Secuencia inicial de facturación SENIAT
      await tx.insert(invoiceSequences).values({
        tenantId: newTenant.id,
        series: 'A',
        currentNumber: 0,
        prefix: 'FACT-',
      });

      // Cliente genérico Consumidor Final para ventas rápidas de mostrador
      await tx.insert(customers).values({
        tenantId: newTenant.id,
        documentType: 'V',
        documentNumber: '00000000',
        name: 'Consumidor Final',
        phone: null,
        creditLimit: '0.00',
        balanceDue: '0.00',
        createdVia: 'ADMIN',
        isActive: true,
      });

      let createdAdmin: any = null;
      if (data.adminUsername && data.adminPassword) {
        const passwordHash = await PasswordService.hash(data.adminPassword);
        const [adminUser] = await tx
          .insert(users)
          .values({
            tenantId: newTenant.id,
            roleId: 'ADMIN',
            username: data.adminUsername.trim().toLowerCase(),
            email: (data.adminEmail || newTenant.email || `${data.adminUsername.trim()}@${cleanSlug}.ve`).toLowerCase(),
            passwordHash,
            fullName: (data.adminFullName || `Administrador ${newTenant.tradeName}`).trim(),
            phone: newTenant.phone,
            isActive: true,
          })
          .returning({
            id: users.id,
            username: users.username,
            email: users.email,
            fullName: users.fullName,
            roleId: users.roleId,
          });
        createdAdmin = adminUser;
      }

      return { newTenant, initialConfig, createdAdmin };
    });

    await AuditService.log({
      tenantId: result.newTenant.id,
      userId: superAdminUserId,
      action: 'TENANT_CREATED_BY_SUPER_ADMIN',
      entity: 'tenant',
      entityId: result.newTenant.id,
      channel: 'WEB_ADMIN',
      payload: {
        slug: result.newTenant.slug,
        businessName: result.newTenant.businessName,
        rif: `${result.newTenant.documentType}-${result.newTenant.documentNumber}`,
        adminUsername: result.createdAdmin?.username || null,
      },
      result: 'SUCCESS',
    });

    return {
      ...result.newTenant,
      configuration: result.initialConfig,
      adminUser: result.createdAdmin,
      usersCount: result.createdAdmin ? 1 : 0,
      productsCount: 0,
      invoicesCount: 0,
      totalSalesUsd: 0,
    };
  }

  /**
   * Actualiza los datos de un negocio
   */
  static async updateTenant(superAdminUserId: string, id: string, data: UpdateTenantDto) {
    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.businessName !== undefined) updatePayload.businessName = data.businessName.trim();
    if (data.tradeName !== undefined) updatePayload.tradeName = data.tradeName.trim();
    if (data.documentType !== undefined) updatePayload.documentType = data.documentType;
    if (data.documentNumber !== undefined) updatePayload.documentNumber = data.documentNumber.replace(/[^0-9]/g, '');
    if (data.fiscalAddress !== undefined) updatePayload.fiscalAddress = data.fiscalAddress.trim();
    if (data.phone !== undefined) updatePayload.phone = data.phone.trim();
    if (data.email !== undefined) updatePayload.email = data.email.trim().toLowerCase();
    if (data.isSpecialTaxpayer !== undefined) updatePayload.isSpecialTaxpayer = data.isSpecialTaxpayer;
    if (data.internalBarcodePrefix !== undefined) updatePayload.internalBarcodePrefix = data.internalBarcodePrefix.trim();
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    const [updated] = await db
      .update(tenants)
      .set(updatePayload)
      .where(eq(tenants.id, id))
      .returning();

    if (updated) {
      // Si se suspende el comercio, revocar todas las sesiones activas de sus usuarios
      if (data.isActive === false) {
        const tenantUserRows = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, id));
        const userIds = tenantUserRows.map((u) => u.id);
        if (userIds.length > 0) {
          await db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(inArray(refreshTokens.userId, userIds));
        }
      }

      await AuditService.log({
        tenantId: updated.id,
        userId: superAdminUserId,
        action: data.isActive !== undefined
          ? (data.isActive ? 'TENANT_ACTIVATED_BY_SUPER_ADMIN' : 'TENANT_SUSPENDED_BY_SUPER_ADMIN')
          : 'TENANT_UPDATED_BY_SUPER_ADMIN',
        entity: 'tenant',
        entityId: updated.id,
        channel: 'WEB_ADMIN',
        payload: updatePayload,
        result: 'SUCCESS',
      });
    }

    return updated || null;
  }

  /**
   * Alterna el estado activo/suspendido de un negocio
   */
  static async toggleTenantActive(superAdminUserId: string, id: string, isActive: boolean) {
    return this.updateTenant(superAdminUserId, id, { isActive });
  }

  /**
   * Crea un usuario (ADMIN, VENDEDOR, CONSULTA) dentro de un Tenant desde el Súper Admin
   */
  static async createTenantUser(
    superAdminUserId: string,
    tenantId: string,
    data: {
      username: string;
      email: string;
      fullName: string;
      password: string;
      roleId: 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
      phone?: string;
    }
  ) {
    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenantRow) {
      throw new Error('TENANT_NOT_FOUND');
    }

    const passwordHash = await PasswordService.hash(data.password);
    const [created] = await db
      .insert(users)
      .values({
        tenantId,
        roleId: data.roleId,
        username: data.username.trim().toLowerCase(),
        email: data.email.trim().toLowerCase(),
        passwordHash,
        fullName: data.fullName.trim(),
        phone: data.phone?.trim() || null,
        isActive: true,
      })
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    await AuditService.log({
      tenantId,
      userId: superAdminUserId,
      action: 'TENANT_USER_CREATED_BY_SUPER_ADMIN',
      entity: 'users',
      entityId: created.id,
      payload: { username: created.username, roleId: created.roleId },
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    return created;
  }

  /**
   * Cambia la contraseña de un usuario de un Tenant desde el Súper Admin
   */
  static async resetTenantUserPassword(
    superAdminUserId: string,
    tenantId: string,
    targetUserId: string,
    newPassword: string
  ) {
    const [target] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!target) {
      return null;
    }

    const passwordHash = await PasswordService.hash(newPassword);
    await db
      .update(users)
      .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, targetUserId));

    await AuditService.log({
      tenantId,
      userId: superAdminUserId,
      action: 'TENANT_USER_PASSWORD_RESET_BY_SUPER_ADMIN',
      entity: 'users',
      entityType: 'security',
      entityId: targetUserId,
      payload: { targetUsername: target.username },
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    return { id: target.id, username: target.username };
  }

  /**
   * Elimina PERMANENTEMENTE un negocio (Tenant) y todos sus datos dependientes en una transacción atómica.
   * Conserva un registro de auditoría a nivel de plataforma (tenantId = null) con la trazabilidad de la eliminación.
   */
  static async deleteTenant(superAdminUserId: string, id: string) {
    const [existing] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!existing) return null;

    await db.transaction(async (tx) => {
      // Orden seguro respetando todas las Foreign Keys (onDelete: 'restrict')
      await tx.delete(creditDebitNotes).where(eq(creditDebitNotes.tenantId, id));
      await tx.delete(changeVouchers).where(eq(changeVouchers.tenantId, id));
      await tx.delete(cashSessions).where(eq(cashSessions.tenantId, id));
      await tx.delete(payments).where(eq(payments.tenantId, id));
      await tx.delete(saleLines).where(eq(saleLines.tenantId, id));
      await tx.delete(sales).where(eq(sales.tenantId, id));
      await tx.delete(invoiceSequences).where(eq(invoiceSequences.tenantId, id));

      await tx.delete(inventoryMovements).where(eq(inventoryMovements.tenantId, id));
      await tx.delete(productStock).where(eq(productStock.tenantId, id));
      await tx.delete(productBarcodes).where(eq(productBarcodes.tenantId, id));

      const tenantOrders = await tx
        .select({ id: purchaseOrders.id })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.tenantId, id));
      const orderIds = tenantOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.delete(purchaseOrderLines).where(inArray(purchaseOrderLines.orderId, orderIds));
      }
      await tx.delete(purchaseOrders).where(eq(purchaseOrders.tenantId, id));

      await tx.delete(receivablePayments).where(eq(receivablePayments.tenantId, id));
      await tx.delete(financialTransactions).where(eq(financialTransactions.tenantId, id));
      await tx.delete(contactInteractions).where(eq(contactInteractions.tenantId, id));
      await tx.delete(customerContacts).where(eq(customerContacts.tenantId, id));
      await tx.delete(customers).where(eq(customers.tenantId, id));
      await tx.delete(products).where(eq(products.tenantId, id));
      await tx.delete(suppliers).where(eq(suppliers.tenantId, id));
      await tx.delete(categories).where(eq(categories.tenantId, id));
      await tx.delete(warehouses).where(eq(warehouses.tenantId, id));

      await tx.delete(exchangeRateSnapshots).where(eq(exchangeRateSnapshots.tenantId, id));
      await tx.delete(taxRates).where(eq(taxRates.tenantId, id));
      await tx.delete(igtfRules).where(eq(igtfRules.tenantId, id));
      await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.tenantId, id));
      await tx.delete(tenantConfigurations).where(eq(tenantConfigurations.tenantId, id));

      // Desvincular logs históricos del tenant o limpiarlos según integridad (audit_logs tiene onDelete: set null,
      // pero actualizamos explícitamente tenantId = null para preservar trazabilidad sin bloquear la eliminación).
      await tx
        .update(auditLogs)
        .set({ tenantId: null })
        .where(eq(auditLogs.tenantId, id));

      const tenantUsers = await tx.select({ id: users.id }).from(users).where(eq(users.tenantId, id));
      const userIds = tenantUsers.map((u) => u.id);
      if (userIds.length > 0) {
        await tx.delete(refreshTokens).where(inArray(refreshTokens.userId, userIds));
      }
      await tx.delete(users).where(eq(users.tenantId, id));

      await tx.delete(tenants).where(eq(tenants.id, id));
    });

    await AuditService.log({
      tenantId: null,
      userId: superAdminUserId,
      action: 'TENANT_PERMANENTLY_DELETED_BY_SUPER_ADMIN',
      entity: 'tenant',
      entityType: 'security',
      entityId: id,
      channel: 'WEB_ADMIN',
      payload: {
        deletedTenantId: id,
        businessName: existing.businessName,
        slug: existing.slug,
        rif: `${existing.documentType}-${existing.documentNumber}`,
      },
      result: 'SUCCESS',
    });

    return existing;
  }
}
