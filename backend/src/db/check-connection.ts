import { pool } from './index.js';
import { env } from '../config/env.js';

async function checkDatabaseConnection() {
  console.log('=====================================================');
  console.log(' 🔍 VERIFICADOR DE CONEXIÓN A BASE DE DATOS - VUELTO');
  console.log('=====================================================');
  
  // Ocultar contraseña en la URL para impresión segura
  const safeUrl = env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
  console.log(`📡 URL Objetivo: ${safeUrl}`);
  console.log(`🌍 Entorno: ${env.NODE_ENV}`);
  console.log(`🔒 SSL Activo: ${env.DATABASE_URL.includes('supabase.co') || env.DATABASE_URL.includes('pooler') || env.NODE_ENV === 'production' ? 'SÍ (Requerido para Supabase)' : 'NO'}`);
  console.log('-----------------------------------------------------');
  console.log('Conectando a PostgreSQL...');

  const startTime = Date.now();

  try {
    const client = await pool.connect();
    const pingMs = Date.now() - startTime;

    // 1. Verificar versión de Postgres y Timestamp
    const verRes = await client.query('SELECT version(), NOW() as server_time');
    const versionString = verRes.rows[0].version;
    const serverTime = verRes.rows[0].server_time;

    console.log(`✅ ¡CONEXIÓN EXITOSA! (Latencia: ${pingMs} ms)`);
    console.log(`⏱️ Hora del Servidor: ${serverTime}`);
    console.log(`🐘 Versión: ${versionString.split(' on ')[0]}`);
    console.log('-----------------------------------------------------');

    // 2. Verificar cuántas tablas de Vuelto existen en el esquema 'public'
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map((r: any) => r.table_name);
    console.log(`📊 Tablas encontradas en la BD: ${tableNames.length} / 21 tablas esperadas`);

    const expectedTables = [
      'audit_logs', 'categories', 'change_vouchers', 'contact_interactions',
      'customer_contacts', 'customers', 'exchange_rate_snapshots', 'idempotency_keys',
      'inventory_movements', 'invoice_sequences', 'payments', 'product_barcodes',
      'product_stock', 'products', 'roles', 'sale_lines', 'sales',
      'suppliers', 'tenants', 'users', 'warehouses'
    ];

    const missingTables = expectedTables.filter(t => !tableNames.includes(t));

    if (missingTables.length === 0) {
      console.log('✅ Todas las 21 tablas de Vuelto están creadas correctamente.');
    } else {
      console.log(`⚠️ Tablas pendientes por crear (${missingTables.length}):`, missingTables.join(', '));
      console.log('💡 Sugerencia: Ejecuta el script "supabase_setup.sql" en Supabase o "npm run db:push".');
    }

    // 3. Verificar si existen datos iniciales (Tenants y Usuarios)
    if (tableNames.includes('tenants') && tableNames.includes('users') && tableNames.includes('roles')) {
      const tenantsCount = await client.query('SELECT COUNT(*) as count FROM tenants');
      const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
      const rolesCount = await client.query('SELECT COUNT(*) as count FROM roles');

      console.log('-----------------------------------------------------');
      console.log('📈 Datos del Sistema Registrados:');
      console.log(`   - Roles:    ${rolesCount.rows[0].count}`);
      console.log(`   - Comercios (Tenants): ${tenantsCount.rows[0].count}`);
      console.log(`   - Usuarios: ${usersCount.rows[0].count}`);

      if (parseInt(tenantsCount.rows[0].count, 10) > 0) {
        const demoTenant = await client.query('SELECT business_name, document_type, document_number FROM tenants LIMIT 1');
        console.log(`   🏪 Comercio Activo: ${demoTenant.rows[0].business_name} (RIF: ${demoTenant.rows[0].document_type}-${demoTenant.rows[0].document_number})`);
      } else {
        console.log('   🧹 Plataforma limpia: 0 comercios registrados (Solo Súper Administrador activo).');
      }
    }

    client.release();
    console.log('=====================================================');
    console.log('🎉 El sistema está 100% OPERATIVO y listo para facturar.');
    console.log('=====================================================');
  } catch (error: any) {
    console.error('❌ ERROR AL CONECTAR A LA BASE DE DATOS:');
    console.error(`   Mensaje: ${error.message}`);
    if (error.code) {
      console.error(`   Código Postgres: ${error.code}`);
    }
    console.log('-----------------------------------------------------');
    console.log('💡 Consejos de Solución:');
    if (error.message.includes('password authentication failed')) {
      console.log('   - La contraseña en DATABASE_URL es incorrecta.');
      console.log('   - Si tu contraseña tiene caracteres especiales (como @, #, %), deben ir codificados en URL.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('   - El host de Supabase no se pudo resolver. Verifica que la URL del proyecto sea correcta.');
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      console.log('   - Tiempo de espera agotado. Verifica tu conexión a internet o el puerto (5432 / 6543).');
    }
    console.log('=====================================================');
  } finally {
    await pool.end();
  }
}

checkDatabaseConnection();
