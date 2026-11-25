import { sql } from 'drizzle-orm';
import { db } from './index.js';
import * as schema from './schema.js';

export type TenantTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Ejecuta una operación de base de datos bajo el contexto estricto de Row-Level Security (RLS)
 * de PostgreSQL para un tenant específico.
 * Setea `app.current_tenant_id` con validez 'LOCAL' a la transacción actual.
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: TenantTransaction) => Promise<T>
): Promise<T> {
  if (!tenantId) {
    throw new Error('TENANT_ID_REQUIRED_FOR_RLS: No se puede ejecutar una consulta sin tenantId asignado.');
  }

  return await db.transaction(async (tx) => {
    // 1. Establecer el tenant activo en la sesión local de PostgreSQL (RLS)
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

    // 2. Ejecutar la función provista dentro del sandbox RLS
    return await callback(tx);
  });
}

/**
 * Ejecuta una operación de base de datos bajo el contexto privilegiado de Súper Administrador
 * permitiendo consultas transversales multi-tenant autorizadas.
 */
export async function withSuperAdmin<T>(
  callback: (tx: TenantTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.is_super_admin', 'true', true)`);
    return await callback(tx);
  });
}

/**
 * Instancia de acceso tenantDb para controllers y servicios
 */
export const tenantDb = {
  withTenant,
  withSuperAdmin,
  forTenant: (tenantId: string) => ({
    execute: <T>(callback: (tx: TenantTransaction) => Promise<T>) => withTenant(tenantId, callback),
  }),
};
