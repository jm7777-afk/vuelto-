import fs from 'fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { env } from '../config/env.js';

const { Pool } = pg;

const isSslRequired =
  env.DATABASE_URL.includes('supabase.co') ||
  env.DATABASE_URL.includes('pooler.supabase.com') ||
  env.DATABASE_URL.includes('render.com') ||
  env.DATABASE_URL.includes('sslmode=require') ||
  env.DATABASE_URL.includes('sslmode=verify') ||
  env.NODE_ENV === 'production';

function buildSslConfig(): pg.PoolConfig['ssl'] {
  if (!isSslRequired) return undefined;

  let ca: string | undefined;
  if (env.DATABASE_SSL_CA) {
    ca = env.DATABASE_SSL_CA.includes('BEGIN CERTIFICATE')
      ? env.DATABASE_SSL_CA.replace(/\\n/g, '\n')
      : fs.existsSync(env.DATABASE_SSL_CA)
      ? fs.readFileSync(env.DATABASE_SSL_CA, 'utf-8')
      : undefined;
  }

  // En producción se verifica certificado TLS por defecto (fail-closed)
  const defaultReject = env.NODE_ENV === 'production';
  const rejectUnauthorized =
    env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
      ? true
      : env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false'
      ? false
      : ca
      ? true
      : defaultReject;

  if (env.NODE_ENV === 'production' && !rejectUnauthorized) {
    console.warn('⚠️ AVISO DE SEGURIDAD: DATABASE_SSL_REJECT_UNAUTHORIZED=false activo en producción.');
  }

  return ca ? { rejectUnauthorized, ca } : { rejectUnauthorized };
}

const sslConfig = buildSslConfig();

// Limpiar sslmode de query solo cuando construimos explícitamente el objeto ssl para pg
const connectionString = sslConfig
  ? env.DATABASE_URL.replace(/([?&])sslmode=[^&]+(&|$)/, (_m, p1, p2) => (p1 === '?' && p2 ? '?' : p2 ? p1 : ''))
  : env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: 12,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: sslConfig,
});

export const db = drizzle(pool, { schema });
export type AppDatabase = typeof db;
