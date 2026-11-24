import { describe, it, expect } from 'vitest';
import { TenantService } from '../src/services/tenant.service.js';

describe('Súper Administrador y Unidades de Medida', () => {
  const superAdminUserId = 'a0000000-0000-0000-0000-000000000001';

  it('debe listar todos los tenants con sus métricas para el Súper Administrador', async () => {
    const list = await TenantService.listAllTenants();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    const first = list[0];
    expect(first).toHaveProperty('businessName');
    expect(first).toHaveProperty('slug');
    expect(first).toHaveProperty('usersCount');
    expect(first).toHaveProperty('productsCount');
  });

  it('debe crear un nuevo tenant y su configuración fiscal inicial', async () => {
    const slug = `test-biz-${Date.now()}`;
    const randomRif = String(Math.floor(100000000 + Math.random() * 899999999));
    const newBiz = await TenantService.createTenant(superAdminUserId, {
      slug,
      businessName: 'Distribuidora Central Barquisimeto C.A.',
      tradeName: 'Central Barquisimeto',
      documentType: 'J',
      documentNumber: randomRif,
      fiscalAddress: 'Av. 20 con Calle 25, Barquisimeto, Edo. Lara',
      phone: '+584120001122',
      email: `${slug}@vuelto.ve`,
      isSpecialTaxpayer: true,
      internalBarcodePrefix: '210',
    });

    expect(newBiz).toHaveProperty('id');
    expect(newBiz.slug).toBe(slug);
    expect(newBiz.isSpecialTaxpayer).toBe(true);
    expect(newBiz.configuration).toBeDefined();
    expect(newBiz.configuration.activeRateSource).toBe('BCV');
  });

  it('debe actualizar los datos o suspender un tenant', async () => {
    const list = await TenantService.listAllTenants();
    const target = list[0];

    const updated = await TenantService.updateTenant(superAdminUserId, target.id, {
      phone: '+584149998877',
      isSpecialTaxpayer: false,
    });

    expect(updated).toBeDefined();
    expect(updated?.phone).toBe('+584149998877');
    expect(updated?.isSpecialTaxpayer).toBe(false);
  });
});
