import { db, pool } from './index.js';
import { roles, tenants, users } from './schema.js';
import { PasswordService } from '../utils/password.js';

export async function runMigrationAndSeed() {
  console.log('Iniciando verificación y seed de base de datos...');
  try {
    // 0. DDL de Endurecimiento de Seguridad (Tablas y Columnas Fase 2)
    const client = await pool.connect();
    try {
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false NOT NULL;

        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          family_id UUID NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          revoked_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
        ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
      `);
      console.log('✓ Tablas y columnas de seguridad verificadas en PostgreSQL');

      // 0b. Habilitación de Row-Level Security (RLS) en todas las tablas multi-tenant
      const rlsTables = [
        'users',
        'categories',
        'warehouses',
        'products',
        'product_barcodes',
        'inventory_movements',
        'product_stock',
        'customers',
        'suppliers',
        'customer_contacts',
        'contact_interactions',
        'exchange_rate_snapshots',
        'invoice_sequences',
        'sales',
        'sale_lines',
        'payments',
        'change_vouchers',
        'idempotency_keys',
        'audit_logs',
        'tenant_configurations',
        'purchase_orders',
        'receivable_payments',
        'financial_transactions',
      ];

      for (const table of rlsTables) {
        try {
          await client.query(`
            ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
            ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS tenant_isolation ON ${table};
            CREATE POLICY tenant_isolation ON ${table}
              AS PERMISSIVE
              FOR ALL
              USING (
                current_setting('app.is_super_admin', true) = 'true'
                OR current_setting('app.current_tenant_id', true) IS NULL
                OR current_setting('app.current_tenant_id', true) = ''
                OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
              )
              WITH CHECK (
                current_setting('app.is_super_admin', true) = 'true'
                OR current_setting('app.current_tenant_id', true) IS NULL
                OR current_setting('app.current_tenant_id', true) = ''
                OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
              );
          `);
        } catch (tableErr: any) {
          console.warn(`Aviso en configuración RLS para ${table}:`, tableErr.message);
        }
      }
      console.log('✓ Políticas Row-Level Security (RLS) aplicadas a tablas multi-tenant');
    } finally {
      client.release();
    }

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

    const isProduction = process.env.NODE_ENV === 'production';
    const seedSuperadminUser = process.env.SEED_SUPERADMIN_USER || 'superadmin';
    const seedSuperadminPassword = process.env.SEED_SUPERADMIN_PASSWORD;
    const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
    const seedCashierPassword = process.env.SEED_CASHIER_PASSWORD;

    if (isProduction) {
      if (!seedSuperadminPassword || !seedAdminPassword || !seedCashierPassword) {
        throw new Error(
          'FATAL: En entorno de producción (NODE_ENV=production) es obligatorio definir las variables de entorno SEED_SUPERADMIN_PASSWORD, SEED_ADMIN_PASSWORD y SEED_CASHIER_PASSWORD.'
        );
      }
    }

    const effectiveSuperadminPass = seedSuperadminPassword || 'dev_superadmin_local_secret!';
    const effectiveAdminPass = seedAdminPassword || 'dev_admin_local_secret!';
    const effectiveCashierPass = seedCashierPassword || 'dev_cashier_local_secret!';

    if (demoTenant) {
      // 3. Usuario Administrador (Hash Argon2id OWASP 2024)
      const adminPasswordHash = await PasswordService.hash(effectiveAdminPass);
      await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          roleId: 'ADMIN',
          username: 'admin',
          email: 'admin@bodegacentral.ve',
          passwordHash: adminPasswordHash,
          fullName: 'Dueño Administrador',
          phone: '04141234567',
        })
        .onConflictDoNothing();

      // 4. Usuario Cajero (Hash Argon2id OWASP 2024)
      const cashierPasswordHash = await PasswordService.hash(effectiveCashierPass);
      await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          roleId: 'VENDEDOR',
          username: 'cajero1',
          email: 'cajero1@bodegacentral.ve',
          passwordHash: cashierPasswordHash,
          fullName: 'Carlos Mendoza',
          phone: '04129876543',
        })
        .onConflictDoNothing();

      // 5. Usuario Súper Administrador Maestro (Hash Argon2id OWASP 2024)
      const superAdminPasswordHash = await PasswordService.hash(effectiveSuperadminPass);
      await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          roleId: 'SUPER_ADMIN',
          username: seedSuperadminUser,
          email: `${seedSuperadminUser}@vuelto.app`,
          passwordHash: superAdminPasswordHash,
          fullName: 'Súper Administrador Maestro',
          phone: '04140000000',
        })
        .onConflictDoNothing();

      console.log(`✓ Tenant y usuarios iniciales verificados (${seedSuperadminUser}, admin, cajero1) con Argon2id`);
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
