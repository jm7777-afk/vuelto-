import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tenants, tenantConfigurations, users, products, sales } from '../db/schema.js';
import { AuditService } from './audit.service.js';

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
   * Lista global de todos los tenants para el Súper Administrador
   * Incluye conteo de usuarios, productos e ingresos agregados
   */
  static async listAllTenants() {
    const allTenants = await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt));

    // Obtener métricas agregadas por tenant
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

        return {
          ...t,
          usersCount: usersCount?.count || 0,
          productsCount: productsCount?.count || 0,
          invoicesCount: invoicesCount?.count || 0,
          totalSalesUsd: parseFloat(invoicesCount?.totalSalesUsd || '0'),
          configuration: config || null,
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

    return {
      ...t,
      configuration: config || null,
    };
  }

  /**
   * Crea un nuevo negocio (Tenant) y su configuración fiscal inicial
   */
  static async createTenant(superAdminUserId: string, data: CreateTenantDto) {
    const cleanDoc = data.documentNumber.replace(/[^0-9]/g, '');
    const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const [newTenant] = await db
      .insert(tenants)
      .values({
        slug: cleanSlug,
        businessName: data.businessName.trim(),
        tradeName: data.tradeName.trim(),
        documentType: data.documentType,
        documentNumber: cleanDoc,
        fiscalAddress: data.fiscalAddress.trim(),
        phone: data.phone.trim(),
        email: data.email.trim().toLowerCase(),
        isSpecialTaxpayer: data.isSpecialTaxpayer ?? false,
        internalBarcodePrefix: data.internalBarcodePrefix?.trim() || '200',
        isActive: true,
      })
      .returning();

    // Crear la configuración fiscal inicial por defecto
    const [initialConfig] = await db
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

    await AuditService.log({
      tenantId: newTenant.id,
      userId: superAdminUserId,
      action: 'TENANT_CREATED_BY_SUPER_ADMIN',
      entity: 'tenant',
      entityId: newTenant.id,
      channel: 'WEB_ADMIN',
      payload: {
        slug: newTenant.slug,
        businessName: newTenant.businessName,
        rif: `${newTenant.documentType}-${newTenant.documentNumber}`,
      },
      result: 'SUCCESS',
    });

    return {
      ...newTenant,
      configuration: initialConfig,
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
      await AuditService.log({
        tenantId: updated.id,
        userId: superAdminUserId,
        action: 'TENANT_UPDATED_BY_SUPER_ADMIN',
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
}
