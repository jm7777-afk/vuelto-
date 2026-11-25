import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';

// Carga resiliente: busca en backend/.env o en el cwd actual
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config();

const baseEnvSchema = z.object({
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/vuelto_dev'),
  JWT_SECRET: z.string().min(16).default('vuelto-super-secret-jwt-key-2026-min-16'),
  JWT_REFRESH_SECRET: z.string().min(16).default('vuelto-super-secret-refresh-key-2026-min-16'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().min(16).default('vuelto-256-bit-aes-encryption-key-32ch'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://vuelto.onrender.com,*'),
  MOCK_PAYMENT_ENABLED: z.string().default('true').transform((v) => v === 'true'),
});

const parsed = baseEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Error fatal en variables de entorno:');
  console.error(parsed.error.format());
  process.exit(1);
}

// Validación estricta para entorno de producción (OWASP / Hardening)
if (parsed.data.NODE_ENV === 'production') {
  const prodSchema = z.object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria en producción').refine(
      (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
      { message: 'DATABASE_URL no puede apuntar a localhost en producción' }
    ),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres en producción'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres en producción'),
    ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY debe tener al menos 32 caracteres en producción'),
    ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS es obligatorio en producción'),
  });

  const prodValidation = prodSchema.safeParse(process.env);
  if (!prodValidation.success) {
    console.error('❌ Error fatal de validación de entorno en PRODUCCIÓN:');
    console.error(prodValidation.error.format());
    process.exit(1);
  }
}

export const env = parsed.data;
