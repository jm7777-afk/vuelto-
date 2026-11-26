import { pool } from './index.js';
import { runMigrationAndSeed } from './migrate.js';

/**
 * Limpia por completo todos los registros operacionales y de prueba en PostgreSQL,
 * dejando únicamente los 4 roles del sistema y la cuenta única de Súper Administrador.
 */
export async function resetAndCleanDatabase() {
  console.log('🧹 Iniciando limpieza completa de la base de datos...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tablesToTruncate = [
      'credit_debit_notes',
      'change_vouchers',
      'cash_sessions',
      'payments',
      'sale_lines',
      'sales',
      'invoice_sequences',
      'inventory_movements',
      'product_stock',
      'product_barcodes',
      'purchase_order_lines',
      'purchase_orders',
      'receivable_payments',
      'financial_transactions',
      'contact_interactions',
      'customer_contacts',
      'customers',
      'suppliers',
      'products',
      'categories',
      'warehouses',
      'exchange_rate_snapshots',
      'tax_rates',
      'igtf_rules',
      'idempotency_keys',
      'tenant_configurations',
      'refresh_tokens',
      'audit_logs',
      'users',
      'tenants',
    ];

    for (const table of tablesToTruncate) {
      const existsRes = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
      if (existsRes.rows[0]?.reg) {
        await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      }
    }

    await client.query('COMMIT');
    console.log('✓ Todas las tablas transaccionales, tenants y usuarios previos han sido limpiados.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error limpiando base de datos:', err);
    throw err;
  } finally {
    client.release();
  }

  // Aplicar migraciones/esquema limpio y crear únicamente roles + SUPER_ADMIN
  await runMigrationAndSeed();
}

if (process.argv[1] && process.argv[1].includes('reset-clean.ts')) {
  resetAndCleanDatabase()
    .then(() => {
      console.log('✨ Base de datos limpia y lista con Súper Administrador único.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error en reset-clean:', err);
      process.exit(1);
    });
}
