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
  env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export type AppDatabase = typeof db;
