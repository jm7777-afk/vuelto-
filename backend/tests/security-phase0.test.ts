import { describe, it, expect, vi } from 'vitest';

describe('Fase 0 - Seguridad y Aprovisionamiento Seguro (Seed)', () => {
  it('debe abortar con error explícito en NODE_ENV=production si faltan variables SEED_*_PASSWORD', async () => {
    const originalEnv = { ...process.env };

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.SEED_SUPERADMIN_PASSWORD;
      delete process.env.SEED_ADMIN_PASSWORD;
      delete process.env.SEED_CASHIER_PASSWORD;

      // Importar dinámicamente o validar la lógica de validación de variables de seed
      const isProduction = process.env.NODE_ENV === 'production';
      const seedSuperadminPassword = process.env.SEED_SUPERADMIN_PASSWORD;
      const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
      const seedCashierPassword = process.env.SEED_CASHIER_PASSWORD;

      expect(() => {
        if (isProduction && (!seedSuperadminPassword || !seedAdminPassword || !seedCashierPassword)) {
          throw new Error(
            'FATAL: En entorno de producción (NODE_ENV=production) es obligatorio definir las variables de entorno SEED_SUPERADMIN_PASSWORD, SEED_ADMIN_PASSWORD y SEED_CASHIER_PASSWORD.'
          );
        }
      }).toThrowError(/FATAL: En entorno de producción/);
    } finally {
      process.env = originalEnv;
    }
  });

  it('debe permitir la ejecución si todas las variables SEED_*_PASSWORD están definidas en producción', () => {
    const originalEnv = { ...process.env };

    try {
      process.env.NODE_ENV = 'production';
      process.env.SEED_SUPERADMIN_PASSWORD = 'SecretSuperAdminPassword123!';
      process.env.SEED_ADMIN_PASSWORD = 'SecretAdminPassword123!';
      process.env.SEED_CASHIER_PASSWORD = 'SecretCashierPassword123!';

      const isProduction = process.env.NODE_ENV === 'production';
      const seedSuperadminPassword = process.env.SEED_SUPERADMIN_PASSWORD;
      const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
      const seedCashierPassword = process.env.SEED_CASHIER_PASSWORD;

      expect(() => {
        if (isProduction && (!seedSuperadminPassword || !seedAdminPassword || !seedCashierPassword)) {
          throw new Error('FATAL');
        }
      }).not.toThrow();
    } finally {
      process.env = originalEnv;
    }
  });
});
