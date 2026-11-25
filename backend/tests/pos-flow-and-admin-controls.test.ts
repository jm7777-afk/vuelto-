import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { TenantService } from '../src/services/tenant.service.js';
import { ConfigService } from '../src/services/config.service.js';
import { InventoryService } from '../src/services/inventory.service.js';
import { BackupService } from '../src/services/backup.service.js';
import { AuditService } from '../src/services/audit.service.js';
import { ExchangeRateService } from '../src/services/exchange-rate.service.js';

describe('Flujo de Ventas POS, Tasas y Controles Administrativos', () => {
  let tenantId: string;
  let userId: string;
  let superAdminId: string;

  beforeAll(async () => {
    const [sa] = await db
      .select()
      .from(users)
      .where(eq(users.roleId, 'SUPER_ADMIN'))
      .limit(1);
    if (!sa) {
      throw new Error('SUPER_ADMIN requerido para ejecutar pruebas de integración');
    }
    superAdminId = sa.id;

    const slug = `pos-flow-test-${Date.now()}`;
    const created = await TenantService.createTenant(superAdminId, {
      slug,
      businessName: 'Comercializadora Test POS C.A.',
      tradeName: 'Test POS',
      documentType: 'J',
      documentNumber: String(Math.floor(100000000 + Math.random() * 899999999)),
      fiscalAddress: 'Av. Principal Caracas',
      phone: '04141112233',
      email: `${slug}@vuelto.ve`,
      isSpecialTaxpayer: true,
      adminUsername: `adm_${Date.now()}`,
      adminEmail: `adm_${Date.now()}@vuelto.ve`,
      adminFullName: 'Admin Prueba POS',
      adminPassword: 'TestPosPassword123!',
    });
    tenantId = created.id;
    userId = created.adminUser!.id;
  });

  afterAll(async () => {
    if (tenantId && superAdminId) {
      await TenantService.deleteTenant(superAdminId, tenantId);
    }
  });

  it('debe obtener y actualizar la configuración de negocio con régimen fiscal flexible (IVA e IGTF)', async () => {
    const config = await ConfigService.getConfig(tenantId);
    expect(config).toBeDefined();
    expect(typeof config.enableIva).toBe('boolean');
    expect(typeof config.enableIgtf).toBe('boolean');
    expect(typeof config.defaultProfitMargin).toBe('number');

    // Desafiliación temporal para emprendimiento no registrado
    const updated = await ConfigService.updateConfig(tenantId, userId, {
      enableIva: false,
      enableIgtf: false,
      defaultProfitMargin: 35.0,
      activeRateSource: 'CUSTOM',
      customRateValue: 58.50,
    });

    expect(updated.enableIva).toBe(false);
    expect(updated.enableIgtf).toBe(false);
    expect(updated.defaultProfitMargin).toBe(35.0);
    expect(updated.activeRateSource).toBe('CUSTOM');
    expect(updated.customRateValue).toBe(58.50);

    // Restaurar a formal para pruebas generales
    await ConfigService.updateConfig(tenantId, userId, {
      enableIva: true,
      enableIgtf: true,
      activeRateSource: 'BCV',
    });
  });

  it('debe calcular la tasa activa seleccionada por el administrador', async () => {
    // 1. Con tasa BCV
    await ExchangeRateService.setActiveRate(tenantId, userId, 'BCV');
    const activeBcv = await ExchangeRateService.getActiveRate(tenantId);
    expect(activeBcv.activeSource).toBe('BCV');
    expect(activeBcv.rateValue).toBeGreaterThan(0);

    // 2. Con tasa Paralelo
    await ExchangeRateService.setActiveRate(tenantId, userId, 'PARALELO');
    const activeParalelo = await ExchangeRateService.getActiveRate(tenantId);
    expect(activeParalelo.activeSource).toBe('PARALELO');
    expect(activeParalelo.rateValue).toBeGreaterThan(activeBcv.rateValue);

    // 3. Restaurar a BCV
    await ExchangeRateService.setActiveRate(tenantId, userId, 'BCV');
  });

  it('debe generar la lista global de reposición consolidada a proveedores', async () => {
    const replenishment = await InventoryService.getGlobalReplenishmentList(tenantId);
    expect(replenishment).toBeDefined();
    expect(typeof replenishment.totalProductsToReplenish).toBe('number');
    expect(typeof replenishment.globalEstimatedCost).toBe('number');
    expect(Array.isArray(replenishment.items)).toBe(true);
    expect(Array.isArray(replenishment.bySupplier)).toBe(true);
  });

  it('debe consultar registros de auditoría inmutable', async () => {
    await AuditService.log({
      tenantId,
      userId,
      action: 'TEST_AUDIT_ACTION',
      entity: 'TEST_ENTITY',
      result: 'SUCCESS',
      channel: 'WEB_ADMIN',
    });

    const logsResult = await AuditService.listLogs(tenantId, { limit: 10 });
    expect(logsResult).toBeDefined();
    expect(Array.isArray(logsResult.logs)).toBe(true);
    expect(logsResult.logs.length).toBeGreaterThan(0);
  });

  it('debe exportar un respaldo de base de datos (Backup JSON) completo para el tenant', async () => {
    const backup = await BackupService.exportTenantBackup(tenantId, userId);
    expect(backup).toBeDefined();
    expect(backup.version).toBe('1.2.0');
    expect(backup.system).toBe('Vuelto SaaS Venezuela');
    expect(backup.tenant.id).toBe(tenantId);
    expect(backup.summary).toBeDefined();
    expect(backup.data).toBeDefined();
    expect(Array.isArray(backup.data.products)).toBe(true);
    expect(Array.isArray(backup.data.customers)).toBe(true);
  });
});
