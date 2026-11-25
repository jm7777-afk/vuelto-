import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { createApp } from '../src/app.js';
import { requireTenantAuth } from '../src/middlewares/tenant.middleware.js';
import { requireRoles, requireAdmin } from '../src/middlewares/rbac.middleware.js';
import { JwtService } from '../src/services/jwt.service.js';
import { AuthUser } from '../src/types/express.js';

describe('Multi-Tenant Isolation & RBAC Security', () => {
  // Tenant A
  const tenantAId = '11111111-1111-1111-1111-111111111111';
  const userTenantA_Admin: AuthUser = {
    id: 'user-a-admin',
    tenantId: tenantAId,
    roleId: 'ADMIN',
    username: 'admin_a',
    fullName: 'Admin Bodega A',
  };
  const userTenantA_Cashier: AuthUser = {
    id: 'user-a-vendedor',
    tenantId: tenantAId,
    roleId: 'VENDEDOR',
    username: 'cajero_a',
    fullName: 'Cajero Bodega A',
  };

  // Tenant B
  const tenantBId = '22222222-2222-2222-2222-222222222222';
  const userTenantB_Admin: AuthUser = {
    id: 'user-b-admin',
    tenantId: tenantBId,
    roleId: 'ADMIN',
    username: 'admin_b',
    fullName: 'Admin Bodega B',
  };

  // Mock data store por tenant
  const tenantData: Record<string, { secretNote: string; stockCount: number }> = {
    [tenantAId]: { secretNote: 'Datos Privados Bodega A', stockCount: 150 },
    [tenantBId]: { secretNote: 'Datos Confidenciales Bodega B', stockCount: 80 },
  };

  // Servidor de prueba con middleware multi-tenant y RBAC
  const app = createApp();

  // Ruta protegida multi-tenant general
  app.get('/api/v1/business-data', requireTenantAuth, (req: Request, res: Response) => {
    // REGLA FUNDAMENTAL: Se consulta ÚNICAMENTE con req.tenantId inyectado del JWT
    const data = tenantData[req.tenantId!];
    res.json({
      tenantId: req.tenantId,
      userRole: req.user?.roleId,
      data,
    });
  });

  // Ruta protegida administrativa (Modo Admin Móvil y Web)
  app.get('/api/v1/admin/financial-summary', requireTenantAuth, requireAdmin, (req: Request, res: Response) => {
    res.json({
      tenantId: req.tenantId,
      authorized: true,
      summary: 'Reporte Financiero Sensible',
    });
  });

  it('debe rechazar peticiones sin token de autorización (401)', async () => {
    const res = await request(app).get('/api/v1/business-data');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('debe aislar estrictamente los datos: Tenant A solo puede leer datos de Tenant A', async () => {
    const tokenA = JwtService.generateTokenPair(userTenantA_Admin).accessToken;

    const res = await request(app)
      .get('/api/v1/business-data')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe(tenantAId);
    expect(res.body.data.secretNote).toBe('Datos Privados Bodega A');
  });

  it('debe aislar estrictamente los datos: Tenant B solo puede leer datos de Tenant B', async () => {
    const tokenB = JwtService.generateTokenPair(userTenantB_Admin).accessToken;

    const res = await request(app)
      .get('/api/v1/business-data')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe(tenantBId);
    expect(res.body.data.secretNote).toBe('Datos Confidenciales Bodega B');
  });

  it('NO debe permitir cross-tenant bajo ninguna circunstancia, incluso si se envía tenant_id malicioso en headers, query o body', async () => {
    const tokenA = JwtService.generateTokenPair(userTenantA_Admin).accessToken;

    // Intento de ataque: Usuario de Tenant A intenta leer datos de Tenant B mediante header o query manipulado
    const res = await request(app)
      .get(`/api/v1/business-data?tenant_id=${tenantBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Id', tenantBId);

    expect(res.status).toBe(200);
    // El servidor IGNORA completamente los parámetros del cliente y usa exclusivamente el JWT verificado
    expect(res.body.tenantId).toBe(tenantAId);
    expect(res.body.data.secretNote).toBe('Datos Privados Bodega A');
  });

  it('RBAC: Usuario VENDEDOR tiene acceso a rutas generales pero es bloqueado en rutas ADMIN (403)', async () => {
    const tokenCashier = JwtService.generateTokenPair(userTenantA_Cashier).accessToken;

    // Ruta permitida a cualquier usuario autenticado
    const allowedRes = await request(app)
      .get('/api/v1/business-data')
      .set('Authorization', `Bearer ${tokenCashier}`);
    expect(allowedRes.status).toBe(200);

    // Ruta de Modo Administrador: debe denegar acceso al cajero
    const deniedRes = await request(app)
      .get('/api/v1/admin/financial-summary')
      .set('Authorization', `Bearer ${tokenCashier}`);
    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.code).toBe('FORBIDDEN');
  });

  it('RBAC: Usuario ADMIN tiene acceso exitoso a rutas de Modo Administrador', async () => {
    const tokenAdmin = JwtService.generateTokenPair(userTenantA_Admin).accessToken;

    const res = await request(app)
      .get('/api/v1/admin/financial-summary')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body.authorized).toBe(true);
  });

  describe('3.3 Aislamiento Cross-Tenant en Base de Datos & API Endpoints', () => {
    let dbTenantA: string;
    let dbTenantB: string;
    let tokenDbA: string;
    let tokenDbB: string;
    const barcodeA = `759${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    beforeAll(async () => {
      const { db } = await import('../src/db/index.js');
      const { tenants, products, productBarcodes, users } = await import('../src/db/schema.js');

      // Crear dos tenants reales
      const [tA] = await db
        .insert(tenants)
        .values({
          slug: `tenant-a-${Date.now()}`,
          businessName: 'Tienda Alpha C.A.',
          tradeName: 'Tienda Alpha',
          documentType: 'J',
          documentNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
          fiscalAddress: 'Caracas',
          phone: '04141112233',
          email: `alpha_${Date.now()}@vuelto.app`,
        })
        .returning();
      dbTenantA = tA.id;

      const [tB] = await db
        .insert(tenants)
        .values({
          slug: `tenant-b-${Date.now()}`,
          businessName: 'Tienda Beta C.A.',
          tradeName: 'Tienda Beta',
          documentType: 'J',
          documentNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
          fiscalAddress: 'Valencia',
          phone: '04144445566',
          email: `beta_${Date.now()}@vuelto.app`,
        })
        .returning();
      dbTenantB = tB.id;

      tokenDbA = JwtService.generateTokenPair({
        id: 'user-db-a',
        tenantId: dbTenantA,
        roleId: 'ADMIN',
        username: 'admin_alpha',
        fullName: 'Admin Alpha',
      }).accessToken;

      tokenDbB = JwtService.generateTokenPair({
        id: 'user-db-b',
        tenantId: dbTenantB,
        roleId: 'ADMIN',
        username: 'admin_beta',
        fullName: 'Admin Beta',
      }).accessToken;

      // Insertar producto exclusivo de Tenant A
      const [prodA] = await db
        .insert(products)
        .values({
          tenantId: dbTenantA,
          name: 'Producto Secreto Tenant A',
          salePriceUsd: 12.5,
          costPriceUsd: 8.0,
          taxRate: 16.0,
        })
        .returning();

      await db.insert(productBarcodes).values({
        tenantId: dbTenantA,
        productId: prodA.id,
        barcode: barcodeA,
        barcodeType: 'EAN13',
        isPrimary: true,
      });
    });

    afterAll(async () => {
      try {
        const { db } = await import('../src/db/index.js');
        const { tenants, products, productBarcodes } = await import('../src/db/schema.js');
        const { eq } = await import('drizzle-orm');

        await db.delete(productBarcodes).where(eq(productBarcodes.tenantId, dbTenantA));
        await db.delete(products).where(eq(products.tenantId, dbTenantA));
        await db.delete(tenants).where(eq(tenants.id, dbTenantA));
        await db.delete(tenants).where(eq(tenants.id, dbTenantB));
      } catch {}
    });

    it('Tenant B no puede ver productos de Tenant A en listado GET /products', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${tokenDbB}`);

      expect(res.status).toBe(200);
      const names = (res.body.products || []).map((p: any) => p.name);
      expect(names).not.toContain('Producto Secreto Tenant A');
    });

    it('Tenant B no puede consultar por código de barras el producto de Tenant A (404)', async () => {
      const res = await request(app)
        .get(`/api/v1/products/by-barcode/${barcodeA}`)
        .set('Authorization', `Bearer ${tokenDbB}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('PRODUCT_NOT_FOUND');
    });

    it('Intento de inyección cross-tenant en creación: tenant_id malicioso es ignorado o sanitizado', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${tokenDbB}`)
        .send({
          name: 'Producto de Tenant B con inyeccion',
          salePriceUsd: 5.0,
          tenantId: dbTenantA, // Intento de inyectar en Tenant A
          tenant_id: dbTenantA,
        });

      // Zod .strict() rechaza campos no permitidos (400) o se crea en Tenant B sin leak
      if (res.status === 200 || res.status === 201) {
        const createdProduct = res.body.product || res.body;
        expect(createdProduct.tenantId).toBe(dbTenantB);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('Aislamiento de auditoría: Tenant B no ve registros de Tenant A en GET /api/v1/audit', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${tokenDbB}`);

      expect(res.status).toBe(200);
      for (const log of res.body.logs || []) {
        expect(log.tenantId).toBe(dbTenantB);
      }
    });
  });
});
