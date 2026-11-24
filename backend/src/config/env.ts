import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';

// Carga resiliente: busca en backend/.env o en el cwd actual
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/vuelto_dev'),
  JWT_SECRET: z.string().min(16).default('vuelto-super-secret-jwt-key-2026-min-16'),
  JWT_REFRESH_SECRET: z.string().min(16).default('vuelto-super-secret-refresh-key-2026-min-16'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MOCK_PAYMENT_ENABLED: z.string().default('true').transform((v) => v === 'true'),
});

export const env = envSchema.parse(process.env);
