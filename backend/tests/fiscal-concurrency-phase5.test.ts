import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import {
  tenants,
  users,
  warehouses,
  products,
  productStock,
  sales,
  saleLines,
  payments,
  customers,
  exchangeRateSnapshots,
  creditDebitNotes,
  suppliers,
  purchaseOrders,
} from '../src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { JwtService } from '../src/services/jwt.service.js';
import { SalesService } from '../src/services/sales.service.js';

describe('Fase 5: Concurrencia, Fiscalidad Dinámica y Reconciliación Offline', () => {
  const app = createApp();
  let testTenantId: string;
  let testUserId: string;
  let testAdminToken: string;
  let testWarehouseId: string;
  let testCustomerId: string;
  let testRateSnapshotId: string;
  let testProduct1Id: string;
  let testProduct2Id: string;

  beforeAll(async () => {
    // 1. Crear tenant de prueba
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `tenant-fisc-${Date.now()}`,
        businessName: 'Inversiones Fiscales C.A.',
        tradeName: 'Fiscal Test',
        documentType: 'J',
        documentNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        fiscalAddress: 'Valencia, Carabobo',
        phone: '04141112233',
        email: `fisc_${Date.now()}@vuelto.app`,
        isSpecialTaxpayer: true,
      })
      .returning();
    testTenantId = tenant.id;

    // 2. Crear usuario Admin
    const [user] = await db
      .insert(users)
      .values({
        tenantId: testTenantId,
        roleId: 'ADMIN',
        username: `admin_fisc_${Date.now()}`,
        email: `admin_fisc_${Date.now()}@vuelto.app`,
        passwordHash: 'dummy_hash',
        fullName: 'Admin Fiscal',
        isActive: true,
      })
      .returning();
    testUserId = user.id;

    testAdminToken = JwtService.generateTokenPair({
      id: testUserId,
      tenantId: testTenantId,
      roleId: 'ADMIN',
      username: user.username,
      fullName: user.fullName,
    }).accessToken;

    // 3. Crear almacén principal
    const [warehouse] = await db
      .insert(warehouses)
      .values({
        tenantId: testTenantId,
        code: 'ALM-01',
        name: 'Almacén Central',
        isDefault: true,
      })
      .returning();
    testWarehouseId = warehouse.id;

    // 4. Crear cliente
    const [customer] = await db
      .insert(customers)
      .values({
        tenantId: testTenantId,
        documentType: 'V',
        documentNumber: '19876543',
        name: 'Cliente Prueba Fiscal',
        creditLimit: '100.00',
        balanceDue: '0.00',
        createdVia: 'ADMIN',
      })
      .returning();
    testCustomerId = customer.id;

    // 5. Crear tasa de cambio
    const [rate] = await db
      .insert(exchangeRateSnapshots)
      .values({
        tenantId: testTenantId,
        source: 'BCV',
        rate: '920.0000',
        fetchedAt: new Date(),
        validFrom: new Date(),
        isOfficial: true,
      })
      .returning();
    testRateSnapshotId = rate.id;

    // 6. Crear productos con stock suficiente para 10 ventas
    const [p1] = await db
      .insert(products)
      .values({
        tenantId: testTenantId,
        sku: `P-CONC-${Date.now()}`,
        name: 'Harina Pan 1kg',
        costPriceUsd: '0.9000',
        salePriceUsd: '1.2000',
        taxRate: '16.00',
        isExempt: false,
        unitOfMeasure: 'UNIDAD',
      })
      .returning();
    testProduct1Id = p1.id;

    await db.insert(productStock).values({
      tenantId: testTenantId,
      warehouseId: testWarehouseId,
      productId: testProduct1Id,
      quantity: '50.000',
    });

    // Producto 2: Stock bajo (para probar déficit offline)
    const [p2] = await db
      .insert(products)
      .values({
        tenantId: testTenantId,
        sku: `P-DEFICIT-${Date.now()}`,
        name: 'Aceite de Oliva 500ml',
        costPriceUsd: '4.0000',
        salePriceUsd: '6.0000',
        taxRate: '16.00',
        isExempt: false,
        unitOfMeasure: 'UNIDAD',
      })
      .returning();
    testProduct2Id = p2.id;

    await db.insert(productStock).values({
      tenantId: testTenantId,
      warehouseId: testWarehouseId,
      productId: testProduct2Id,
      quantity: '1.000', // Solo 1 unidad
    });
  });

  afterAll(async () => {
    try {
      await db.delete(creditDebitNotes).where(eq(creditDebitNotes.tenantId, testTenantId));
      await db.delete(saleLines).where(eq(saleLines.tenantId, testTenantId));
      await db.delete(payments).where(eq(payments.tenantId, testTenantId));
      await db.delete(sales).where(eq(sales.tenantId, testTenantId));
      await db.delete(productStock).where(eq(productStock.tenantId, testTenantId));
      await db.delete(products).where(eq(products.tenantId, testTenantId));
      await db.delete(warehouses).where(eq(warehouses.tenantId, testTenantId));
      await db.delete(customers).where(eq(customers.tenantId, testTenantId));
      await db.delete(exchangeRateSnapshots).where(eq(exchangeRateSnapshots.tenantId, testTenantId));
      await db.delete(users).where(eq(users.tenantId, testTenantId));
      await db.delete(tenants).where(eq(tenants.id, testTenantId));
    } catch {}
  });

  // 1. Concurrencia estricta en correlativos de factura
  it('1. Concurrencia de Facturación: 10 ventas simultáneas generan correlativos estrictos sin duplicados ni huecos', async () => {
    const salePromises = Array.from({ length: 10 }, (_, i) => {
      return SalesService.confirmSale(
        testTenantId,
        testUserId,
        `idemp-conc-${Date.now()}-${i}-${Math.random()}`,
        {
          customerId: testCustomerId,
          warehouseId: testWarehouseId,
          exchangeRateId: testRateSnapshotId,
          lines: [
            {
              productId: testProduct1Id,
              quantity: 1,
              unitPriceUsd: 1.20,
            },
          ],
          payments: [
            {
              paymentMethod: 'PAGO_MOVIL',
              currency: 'VES',
              amount: 1.20 * 1.16 * 920,
            },
          ],
        }
      );
    });

    const results = await Promise.all(salePromises);
    expect(results).toHaveLength(10);

    const invoiceNumbers = results.map((r: any) => r.invoiceFormattedNumber);
    // Verificar que los 10 números sean únicos
    const uniqueNumbers = new Set(invoiceNumbers);
    expect(uniqueNumbers.size).toBe(10);

    // Extraer sufijos numéricos y ordenar
    const numericValues = invoiceNumbers
      .map((num: string) => parseInt(num.split('-')[1], 10))
      .sort((a: number, b: number) => a - b);

    // Deben ser correlativos consecutivos estrictos: ej. 1, 2, 3, ... 10
    for (let i = 0; i < numericValues.length; i++) {
      if (i > 0) {
        expect(numericValues[i]).toBe(numericValues[i - 1] + 1);
      }
    }
  }, 30000);

  // 2. Sincronización Offline e Idempotencia
  it('2. Sincronización Offline: lote de 5 ventas es idempotente (doble envío no duplica)', async () => {
    const offlineBatch = Array.from({ length: 5 }, (_, i) => ({
      clientAssignedUuid: `offline-uuid-test-${i}-${Date.now()}`,
      customerId: testCustomerId,
      warehouseId: testWarehouseId,
      exchangeRateId: testRateSnapshotId,
      lines: [
        {
          productId: testProduct1Id,
          quantity: 1,
          unitPriceUsd: 1.20,
        },
      ],
      payments: [
        {
          paymentMethod: 'CASH_USD' as const,
          currency: 'USD' as const,
          amount: 1.20 * 1.16,
        },
      ],
    }));

    // Primer envío del lote offline
    const res1 = await request(app)
      .post('/api/v1/sync/offline-batch')
      .set('Authorization', `Bearer ${testAdminToken}`)
      .send(offlineBatch);

    expect(res1.status).toBe(200);
    expect(res1.body.syncedCount).toBe(5);
    expect(res1.body.duplicateCount).toBe(0);

    // Segundo envío EXACTAMENTE con los mismos clientAssignedUuid (simula reintento por pérdida de red)
    const res2 = await request(app)
      .post('/api/v1/sync/offline-batch')
      .set('Authorization', `Bearer ${testAdminToken}`)
      .send(offlineBatch);

    expect(res2.status).toBe(200);
    expect(res2.body.syncedCount).toBe(0);
    expect(res2.body.duplicateCount).toBe(5); // Las 5 fueron reconocidas como duplicadas
  }, 30000);

  // 3. Resolución de conflicto por stock insuficiente en offline sync
  it('3. Reconciliación Offline: venta offline con déficit de stock se registra con SYNCED_WITH_STOCK_DEFICIT', async () => {
    // Intentamos vender 5 unidades de un producto con solo 1 unidad
    const deficitSale = {
      clientAssignedUuid: `offline-deficit-${Date.now()}`,
      customerId: testCustomerId,
      warehouseId: testWarehouseId,
      exchangeRateId: testRateSnapshotId,
      lines: [
        {
          productId: testProduct2Id,
          quantity: 5, // Stock es 1
          unitPriceUsd: 6.0,
        },
      ],
      payments: [
        {
          paymentMethod: 'PAGO_MOVIL' as const,
          currency: 'VES' as const,
          amount: 5 * 6.0 * 1.16 * 920,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/sync/offline-batch')
      .set('Authorization', `Bearer ${testAdminToken}`)
      .send([deficitSale]);

    expect(res.status).toBe(200);
    expect(res.body.deficitCount).toBe(1);

    // Verificar en endpoint de discrepancias
    const discRes = await request(app)
      .get('/api/v1/sync/discrepancies')
      .set('Authorization', `Bearer ${testAdminToken}`);

    expect(discRes.status).toBe(200);
    const found = discRes.body.find((d: any) => d.clientAssignedUuid === deficitSale.clientAssignedUuid);
    expect(found).toBeDefined();
    expect(found.status).toBe('SYNCED_WITH_STOCK_DEFICIT');
  });

  // 4. Notas de Crédito, anulación y retorno de stock
  it('4. Notas de Crédito: emite NC, anula factura original y reintegra stock', async () => {
    // A. Realizar venta para anular
    const initialSaleRes = await SalesService.confirmSale(
      testTenantId,
      testUserId,
      `idemp-nc-${Date.now()}`,
      {
        customerId: testCustomerId,
        warehouseId: testWarehouseId,
        exchangeRateId: testRateSnapshotId,
        lines: [{ productId: testProduct1Id, quantity: 3, unitPriceUsd: 1.20 }],
        payments: [{ paymentMethod: 'PAGO_MOVIL', currency: 'VES', amount: 3 * 1.20 * 1.16 * 920 }],
      }
    );

    // Consultar stock antes de anulación
    const [stockBefore] = await db
      .select()
      .from(productStock)
      .where(and(eq(productStock.tenantId, testTenantId), eq(productStock.productId, testProduct1Id)));
    const qtyBefore = parseFloat(stockBefore.quantity);

    // B. Emitir Nota de Crédito
    const ncRes = await request(app)
      .post(`/api/v1/sales/${initialSaleRes.id}/credit-note`)
      .set('Authorization', `Bearer ${testAdminToken}`)
      .send({
        reason: 'Devolución de cliente por producto defectuoso',
        returnInventory: true,
      });

    expect(ncRes.status).toBe(201);
    expect(ncRes.body.note.noteNumber).toMatch(/^NC-/);

    // C. Verificar estado de la factura original
    const [updatedSale] = await db.select().from(sales).where(eq(sales.id, initialSaleRes.id));
    expect(updatedSale.status).toBe('ANNULLED_BY_NC');

    // D. Verificar retorno de stock (+3 unidades)
    const [stockAfter] = await db
      .select()
      .from(productStock)
      .where(and(eq(productStock.tenantId, testTenantId), eq(productStock.productId, testProduct1Id)));
    expect(parseFloat(stockAfter.quantity)).toBe(qtyBefore + 3);
  });

  // 5. Libro de Compras SENIAT en formato CSV con BOM UTF-8
  it('5. Libro de Compras SENIAT: descarga CSV con BOM UTF-8 y columnas oficiales de Providencia 0071', async () => {
    // Crear un proveedor y orden de compra de prueba
    const [supplier] = await db
      .insert(suppliers)
      .values({
        tenantId: testTenantId,
        documentType: 'J',
        documentNumber: '998877665',
        name: 'Proveedor Mayorista Central S.A.',
        phone: '04140003344',
      })
      .returning();

    await db.insert(purchaseOrders).values({
      tenantId: testTenantId,
      supplierId: supplier.id,
      orderNumber: `OC-${Date.now()}`,
      status: 'RECEIVED',
      totalEstimatedUsd: '150.0000',
    });

    const res = await request(app)
      .get('/api/v1/reports/purchases-book/csv')
      .set('Authorization', `Bearer ${testAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');

    // Debe contener el BOM UTF-8 al inicio
    expect(res.text.startsWith('\uFEFF')).toBe(true);

    // Columnas requeridas por la Providencia 0071
    expect(res.text).toContain('LIBRO DE COMPRAS FISCAL');
    expect(res.text).toContain('RIF Proveedor');
    expect(res.text).toContain('N° Factura / Documento');
    expect(res.text).toContain('Base Imponible 16%');
    expect(res.text).toContain('Proveedor Mayorista Central S.A.');
  });

  // 6. Actualización dinámica de tasas fiscales sin redesplegar
  it('6. Fiscalidad Dinámica: actualiza tasas impositivas en caliente vía PUT /admin/fiscal/rates', async () => {
    const updateRes = await request(app)
      .put('/api/v1/admin/fiscal/rates')
      .set('Authorization', `Bearer ${testAdminToken}`)
      .send({
        generalRate: 0.18, // Subir IVA a 18%
        igtfRate: 0.04,    // Subir IGTF a 4%
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.rates.GENERAL).toBe(0.18);
  });

  // 7. Ajuste manual de tasa de cambio por el administrador con auditoría
  it('7. Ajuste Manual de Tasa: ADMIN puede sobreescribir la tasa oficial registrando motivo', async () => {
    const manualRes = await request(app)
      .put('/api/v1/exchange-rates/manual')
      .set('Authorization', `Bearer ${testAdminToken}`)
      .send({
        newRate: 935.50,
        reason: 'Cierre de mercado oficial del viernes con tasa pactada',
      });

    expect(manualRes.status).toBe(200);
    expect(manualRes.body.rate.rate).toBe(935.50);
  });
});
