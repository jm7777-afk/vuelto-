import { pool } from './index.js';

export async function ensureSchema() {
  console.log('Verificando y aplicando esquema DDL en PostgreSQL...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        late_fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
        late_fee_grace_days INTEGER NOT NULL DEFAULT 3,
        auto_apply_late_fee BOOLEAN NOT NULL DEFAULT true,
        currency_preference VARCHAR(10) NOT NULL DEFAULT 'USD',
        active_rate_source VARCHAR(20) NOT NULL DEFAULT 'BCV',
        custom_rate_value NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        enable_iva BOOLEAN NOT NULL DEFAULT true,
        enable_igtf BOOLEAN NOT NULL DEFAULT true,
        default_iva_percentage NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
        default_profit_margin NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
        require_admin_for_overdue_debt BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        order_number VARCHAR(30) NOT NULL,
        status VARCHAR(25) NOT NULL DEFAULT 'DRAFT',
        expected_delivery_date TIMESTAMPTZ,
        total_estimated_usd NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
        notes TEXT,
        received_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity_ordered NUMERIC(12, 3) NOT NULL,
        quantity_received NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
        unit_cost_usd NUMERIC(14, 4) NOT NULL,
        subtotal_usd NUMERIC(14, 4) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS receivable_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        payment_method VARCHAR(30) NOT NULL,
        amount_usd NUMERIC(14, 2) NOT NULL,
        amount_bs NUMERIC(14, 2) NOT NULL,
        rate_value NUMERIC(14, 4) NOT NULL,
        late_fee_applied_usd NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        reference_number VARCHAR(60),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(20) NOT NULL,
        category VARCHAR(40) NOT NULL,
        description TEXT NOT NULL,
        amount_usd NUMERIC(14, 2) NOT NULL,
        amount_bs NUMERIC(14, 2) NOT NULL,
        rate_value NUMERIC(14, 4) NOT NULL,
        reference_number VARCHAR(60),
        transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_special_mora_customer BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE tenant_configurations ADD COLUMN IF NOT EXISTS active_rate_source VARCHAR(20) NOT NULL DEFAULT 'BCV';
      ALTER TABLE tenant_configurations ADD COLUMN IF NOT EXISTS custom_rate_value NUMERIC(14, 4) NOT NULL DEFAULT 0.0000;
      ALTER TABLE tenant_configurations ADD COLUMN IF NOT EXISTS enable_iva BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE tenant_configurations ADD COLUMN IF NOT EXISTS enable_igtf BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE tenant_configurations ADD COLUMN IF NOT EXISTS default_iva_percentage NUMERIC(5, 2) NOT NULL DEFAULT 16.00;
      ALTER TABLE tenant_configurations ADD COLUMN IF NOT EXISTS default_profit_margin NUMERIC(5, 2) NOT NULL DEFAULT 30.00;
      ALTER TABLE tenant_configurations ADD COLUMN IF NOT EXISTS require_admin_for_overdue_debt BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log('✓ Tablas y columnas verificadas en PostgreSQL.');
  } catch (err) {
    console.error('Error aplicando esquema DDL:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].includes('ensure-schema.ts')) {
  ensureSchema().then(() => pool.end());
}
