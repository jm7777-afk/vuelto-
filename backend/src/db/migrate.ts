import { isNull, and, eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import { roles, users } from './schema.js';
import { PasswordService } from '../utils/password.js';

export async function runMigrationAndSeed() {
  console.log('Iniciando verificación y seed limpio de base de datos (Solo Súper Administrador)...');
  try {
    // 0. DDL de Endurecimiento de Seguridad (Tablas y Columnas Fase 2)
    const client = await pool.connect();
    try {
      await client.query(`
        ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_username ON users (username) WHERE tenant_id IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_user_email ON users (email) WHERE tenant_id IS NULL;

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

        ALTER TABLE audit_logs ALTER COLUMN tenant_id DROP NOT NULL;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
        ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
        ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_tenant_id_fkey;
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_tenant_id_fkey
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

        ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_assigned_uuid VARCHAR(64);
        ALTER TABLE sales ALTER COLUMN status TYPE VARCHAR(50);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_client_assigned_uuid ON sales(tenant_id, client_assigned_uuid);

        -- Tablas fiscales dinámicas (Fase 5)
        CREATE TABLE IF NOT EXISTS tax_rates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          code VARCHAR(30) NOT NULL,
          rate NUMERIC(6, 4) NOT NULL,
          description VARCHAR(100),
          valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          valid_to TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS igtf_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          currency VARCHAR(10) NOT NULL,
          payment_method VARCHAR(30) NOT NULL,
          rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0300,
          applies_to_special_taxpayer_only BOOLEAN NOT NULL DEFAULT true,
          valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          valid_to TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS credit_debit_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
          type VARCHAR(20) NOT NULL DEFAULT 'CREDIT_NOTE',
          note_number VARCHAR(50) NOT NULL,
          reason TEXT NOT NULL,
          amount_usd NUMERIC(14, 2) NOT NULL,
          tax_adjusted_usd NUMERIC(14, 2) NOT NULL,
          total_usd NUMERIC(14, 2) NOT NULL,
          amount_bs NUMERIC(14, 2) NOT NULL,
          tax_adjusted_bs NUMERIC(14, 2) NOT NULL,
          total_bs NUMERIC(14, 2) NOT NULL,
          return_inventory BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_note_number ON credit_debit_notes(tenant_id, note_number);

        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(60) NOT NULL UNIQUE,
          name VARCHAR(200) NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS cash_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
          status VARCHAR(15) NOT NULL DEFAULT 'OPEN',
          opening_balance_usd NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
          opening_balance_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
          closing_expected_usd NUMERIC(14, 2),
          closing_expected_bs NUMERIC(14, 2),
          closing_declared_usd NUMERIC(14, 2),
          closing_declared_bs NUMERIC(14, 2),
          discrepancy_usd NUMERIC(14, 2),
          sales_count INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          closed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant_status ON cash_sessions(tenant_id, status, opened_at DESC);
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON cash_sessions(tenant_id, user_id, status);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_open_cash_session_per_user ON cash_sessions(tenant_id, user_id) WHERE status = 'OPEN';
        CREATE INDEX IF NOT EXISTS idx_sales_tenant_created ON sales(tenant_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(tenant_id, sale_id);
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
        'tax_rates',
        'igtf_rules',
        'credit_debit_notes',
        'cash_sessions',
      ];

      for (const table of rlsTables) {
        await client.query(`
          ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
          ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS tenant_isolation ON ${table};
          CREATE POLICY tenant_isolation ON ${table}
            AS PERMISSIVE
            FOR ALL
            USING (
              current_setting('app.is_super_admin', true) = 'true'
              OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            )
            WITH CHECK (
              current_setting('app.is_super_admin', true) = 'true'
              OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            );
        `);
      }

      const appliedMigrations = [
        { version: '001', name: 'initial_multi_tenant_schema' },
        { version: '002', name: 'rls_fail_closed_policies' },
        { version: '003', name: 'cash_sessions_and_performance_indexes' },
      ];
      for (const mig of appliedMigrations) {
        await client.query(
          `INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
          [mig.version, mig.name]
        );
      }

      console.log('✓ Políticas Row-Level Security (RLS fail-closed) y migraciones versionadas aplicadas');
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

    // 2. Usuario Súper Administrador Maestro Único (Sin Tenants de demostración)
    const isProduction = process.env.NODE_ENV === 'production';
    const seedSuperadminUser = process.env.SEED_SUPERADMIN_USER || 'superadmin';
    const seedSuperadminPassword = process.env.SEED_SUPERADMIN_PASSWORD;

    if (isProduction && !seedSuperadminPassword) {
      throw new Error(
        'FATAL: En entorno de producción (NODE_ENV=production) es obligatorio definir SEED_SUPERADMIN_PASSWORD.'
      );
    }

    const effectiveSuperadminPass = seedSuperadminPassword || 'VueltoSuper2026!';

    const [existingSuperAdmin] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, seedSuperadminUser), eq(users.roleId, 'SUPER_ADMIN')))
      .limit(1);

    if (!existingSuperAdmin) {
      const superAdminPasswordHash = await PasswordService.hash(effectiveSuperadminPass);
      await db.insert(users).values({
        tenantId: null,
        roleId: 'SUPER_ADMIN',
        username: seedSuperadminUser,
        email: `${seedSuperadminUser}@vuelto.app`,
        passwordHash: superAdminPasswordHash,
        fullName: 'Súper Administrador Maestro',
        phone: '04140000000',
        isActive: true,
      });
      console.log(`✓ Súper Administrador creado (${seedSuperadminUser}) con hash Argon2id`);
    } else {
      console.log(`✓ Súper Administrador existente verificado (${seedSuperadminUser})`);
    }

    console.log('Migración y sembrado limpio completados con éxito (0 tenants demo).');
  } catch (error) {
    console.error('Error durante la migración o sembrado:', error);
    process.exitCode = 1;
    throw error;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('migrate.ts')) {
  runMigrationAndSeed();
}
