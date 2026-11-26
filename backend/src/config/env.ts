import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';

// Carga resiliente: busca en backend/.env o en el cwd actual
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config();

const DEV_JWT_DEFAULT = 'dev-only-jwt-secret-not-for-prod-32ch';
const DEV_REFRESH_DEFAULT = 'dev-only-refresh-secret-not-for-prod-32ch';
const DEV_ENC_DEFAULT = 'dev-only-aes-key-not-for-production-32';

const baseEnvSchema = z.object({
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/vuelto_dev'),
  DATABASE_SSL_CA: z.string().optional(),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).optional(),
  JWT_SECRET: z.string().min(16).default(DEV_JWT_DEFAULT),
  JWT_REFRESH_SECRET: z.string().min(16).default(DEV_REFRESH_DEFAULT),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().min(16).default(DEV_ENC_DEFAULT),
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000'),
  MOCK_PAYMENT_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  METRICS_TOKEN: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  INTERNAL_ADMIN_TOKEN: z.string().optional(),
});

const parsed = baseEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Error fatal en variables de entorno:');
  console.error(parsed.error.format());
  process.exit(1);
}

const KNOWN_INSECURE_SECRETS = new Set([
  DEV_JWT_DEFAULT,
  DEV_REFRESH_DEFAULT,
  DEV_ENC_DEFAULT,
  'vuelto-super-secret-jwt-key-2026-min-16',
  'vuelto-super-secret-refresh-key-2026-min-16',
  'vuelto-256-bit-aes-encryption-key-32ch',
  'vuelto-metrics-token-2026',
  'vuelto-deep-check-2026',
  'vuelto-payment-webhook-secret-2026',
]);

// Validación estricta para entorno de producción (OWASP / Hardening P0)
if (parsed.data.NODE_ENV === 'production') {
  const prodSchema = z.object({
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL es obligatoria en producción')
      .refine(
        (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
        { message: 'DATABASE_URL no puede apuntar a localhost en producción' }
      ),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET debe tener al menos 32 caracteres en producción')
      .refine((v) => !KNOWN_INSECURE_SECRETS.has(v), { message: 'JWT_SECRET no puede usar un valor de desarrollo' }),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres en producción')
      .refine((v) => !KNOWN_INSECURE_SECRETS.has(v), { message: 'JWT_REFRESH_SECRET no puede usar un valor de desarrollo' }),
    ENCRYPTION_KEY: z
      .string()
      .min(32, 'ENCRYPTION_KEY debe tener al menos 32 caracteres en producción')
      .refine((v) => !KNOWN_INSECURE_SECRETS.has(v), { message: 'ENCRYPTION_KEY no puede usar un valor de desarrollo' }),
    ALLOWED_ORIGINS: z
      .string()
      .min(1, 'ALLOWED_ORIGINS es obligatorio en producción')
      .refine((v) => !v.split(',').map((s) => s.trim()).includes('*'), {
        message: 'ALLOWED_ORIGINS no puede incluir wildcard (*) en producción',
      }),
    METRICS_TOKEN: z
      .string()
      .min(16, 'METRICS_TOKEN es obligatorio (mínimo 16 caracteres) en producción')
      .refine((v) => !KNOWN_INSECURE_SECRETS.has(v), { message: 'METRICS_TOKEN no puede usar un valor predeterminado' }),
    PAYMENT_WEBHOOK_SECRET: z
      .string()
      .min(16, 'PAYMENT_WEBHOOK_SECRET es obligatorio (mínimo 16 caracteres) en producción')
      .refine((v) => !KNOWN_INSECURE_SECRETS.has(v), { message: 'PAYMENT_WEBHOOK_SECRET no puede usar un valor predeterminado' }),
    INTERNAL_ADMIN_TOKEN: z
      .string()
      .min(16, 'INTERNAL_ADMIN_TOKEN es obligatorio (mínimo 16 caracteres) en producción')
      .refine((v) => !KNOWN_INSECURE_SECRETS.has(v), { message: 'INTERNAL_ADMIN_TOKEN no puede usar un valor predeterminado' }),
    MOCK_PAYMENT_ENABLED: z
      .string()
      .optional()
      .refine((v) => v !== 'true', {
        message: 'MOCK_PAYMENT_ENABLED debe estar desactivado (false) en producción',
      }),
  });

  const prodValidation = prodSchema.safeParse(process.env);
  if (!prodValidation.success) {
    console.error('❌ Error fatal de validación de entorno en PRODUCCIÓN:');
    console.error(prodValidation.error.format());
    process.exit(1);
  }
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
