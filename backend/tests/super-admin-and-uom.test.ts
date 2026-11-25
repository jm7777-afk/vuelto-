import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { users, auditLogs } from '../src/db/schema.js';
import { TenantService } from '../src/services/tenant.service.js';

describe('Súper Administrador, Contraseña, Monitoreo y Ciclo de Vida de Tenants', () => {
  const app = createApp();
  const baseSuperPass = process.env.SEED_SUPERADMIN_PASSWORD || 'VueltoSuper2026!';
  let superAdminUserId: string;
  let superAdminUsername: string;
  let superAdminToken: string;
  let createdTenantId: string;

  beforeAll(async () => {
    const [sa] = await db
      .select()
      .from(users)
      .where(eq(users.roleId, 'SUPER_ADMIN'))
      .limit(1);

    if (!sa) {
      throw new Error('Debe existir un SUPER_ADMIN sembrado en BD antes de correr las pruebas');
    }
    superAdminUserId = sa.id;
    superAdminUsername = sa.username;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: superAdminUsername, password: baseSuperPass });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.roleId).toBe('SUPER_ADMIN');
    expect(loginRes.body.user.tenantId).toBeNull();
    superAdminToken = loginRes.body.tokens.accessToken;
  });

  afterAll(async () => {
    if (createdTenantId && superAdminUserId) {
      await TenantService.deleteTenant(superAdminUserId, createdTenantId).catch(() => {});
    }
    await db
      .delete(auditLogs)
      .where(eq(auditLogs.action, 'TENANT_PERMANENTLY_DELETED_BY_SUPER_ADMIN'))
      .catch(() => {});
  });

  it('debe autenticar al SUPER_ADMIN con tenantId null y responder en /auth/me y /monitoring/snapshot', async () => {
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.roleId).toBe('SUPER_ADMIN');
    expect(meRes.body.tenantId).toBeNull();

    const monRes = await request(app)
      .get('/api/v1/super-admin/monitoring/snapshot')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(monRes.status).toBe(200);
    expect(monRes.body.database.status).toBe('connected');
    expect(monRes.body.system.memory).toHaveProperty('heapUsedMb');
  });

  it('debe permitir al SUPER_ADMIN cambiar su contraseña desde su consola y restaurarla', async () => {
    const tempPass = 'TempSuperAdmin2026!#';
    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ currentPassword: baseSuperPass, newPassword: tempPass, confirmPassword: tempPass });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.tokens.accessToken).toBeDefined();
    superAdminToken = changeRes.body.tokens.accessToken;

    const restoreRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ currentPassword: tempPass, newPassword: baseSuperPass, confirmPassword: baseSuperPass });

    expect(restoreRes.status).toBe(200);
    superAdminToken = restoreRes.body.tokens.accessToken;
  });

  it('debe crear manualmente un tenant con admin inicial, actualizarlo, listar auditoría y eliminarlo permanentemente', async () => {
    const slug = `test-biz-${Date.now()}`;
    const randomRif = String(Math.floor(100000000 + Math.random() * 899999999));

    const createRes = await request(app)
      .post('/api/v1/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
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
        adminUsername: `adm_${Date.now()}`,
        adminEmail: `adm_${Date.now()}@vuelto.ve`,
        adminFullName: 'Admin Barquisimeto',
        adminPassword: 'AdminPassword2026!',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.slug).toBe(slug);
    expect(createRes.body.adminUser).toBeDefined();
    createdTenantId = createRes.body.id;

    const listRes = await request(app)
      .get('/api/v1/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((t: any) => t.id === createdTenantId)).toBe(true);

    const updated = await TenantService.updateTenant(superAdminUserId, createdTenantId, {
      phone: '+584149998877',
      isSpecialTaxpayer: false,
    });
    expect(updated?.phone).toBe('+584149998877');
    expect(updated?.isSpecialTaxpayer).toBe(false);

    const auditRes = await request(app)
      .get('/api/v1/audit/logs?limit=20')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body.logs)).toBe(true);
    expect(auditRes.body.logs.length).toBeGreaterThan(0);

    const deleteRes = await request(app)
      .delete(`/api/v1/tenants/${createdTenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.tenant.id).toBe(createdTenantId);
    createdTenantId = '';
  });
});
