import { db, pool } from './index.js';
import { roles, tenants, users } from './schema.js';
import bcrypt from 'bcryptjs';

export async function runMigrationAndSeed() {
  console.log('Iniciando verificación y seed de base de datos...');
  try {
    // 1. Roles del Sistema
    const systemRoles = [
      { id: 'SUPER_ADMIN', name: 'Super Administrador', description: 'Control de plataforma multi-tenant' },
      { id: 'ADMIN', name: 'Administrador de Negocio', description: 'Control total de la tienda (inventario, clientes, ventas y modo admin móvil)' },
      { id: 'VENDEDOR', name: 'Cajero / Vendedor', description: 'Facturación rápida en mostrador, escaneo y cuentas abiertas' },
      { id: 'CONSULTA', name: 'Consulta / Auditor', description: 'Solo lectura para contadores o fiscalización' },
    ];

    for (const r of systemRoles) {
      await db.insert(roles).values(r).onConflictDoNothing();
    }
    console.log('✓ Roles del sistema verificados');

    // 2. Tenant de Demostración
    const [demoTenant] = await db
      .insert(tenants)
      .values({
        slug: 'bodega-central',
        businessName: 'Inversiones Bodega Central C.A.',
        tradeName: 'Bodega Central',
        documentType: 'J',
        documentNumber: '123456789',
        fiscalAddress: 'Av. Libertador con Calle 4, Caracas, Venezuela',
        phone: '04141234567',
        email: 'contacto@bodegacentral.ve',
        isSpecialTaxpayer: true, // Aplica IGTF 3% en efectivo divisas
      })
      .onConflictDoNothing()
      .returning();

    if (demoTenant) {
      const passwordHash = await bcrypt.hash('Vuelto2026!', 10);

      // 3. Usuario Administrador de Prueba
      await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          roleId: 'ADMIN',
          username: 'admin',
          email: 'admin@bodegacentral.ve',
          passwordHash,
          fullName: 'Dueño Administrador',
          phone: '04141234567',
        })
        .onConflictDoNothing();

      // 4. Usuario Cajero de Prueba
      await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          roleId: 'VENDEDOR',
          username: 'cajero1',
          email: 'cajero1@bodegacentral.ve',
          passwordHash,
          fullName: 'Carlos Mendoza',
          phone: '04129876543',
        })
        .onConflictDoNothing();

      // 5. Usuario Súper Administrador Maestro (Control Global Multi-Tenant)
      const superAdminPasswordHash = await bcrypt.hash('SuperAdmin2026!', 10);
      await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          roleId: 'SUPER_ADMIN',
          username: 'superadmin',
          email: 'superadmin@vuelto.app',
          passwordHash: superAdminPasswordHash,
          fullName: 'Súper Administrador Maestro',
          phone: '04140000000',
        })
        .onConflictDoNothing();

      console.log('✓ Tenant y usuarios demo creados (superadmin [SuperAdmin2026!], admin / cajero1 [Vuelto2026!])');
    }

    console.log('Migración y sembrado completados con éxito.');
  } catch (error) {
    console.error('Error durante la migración o sembrado:', error);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('migrate.ts')) {
  runMigrationAndSeed();
}
