# Reporte de Incidente de Seguridad: Exposición de Credenciales Demo en Repositorio Público

**Identificador:** INC-SEC-2026-11-25-01  
**Fecha de Detección:** 25 de Noviembre de 2026  
**Severidad:** ALTA (Exposición de credenciales de desarrollo y demostración en frontend y scripts de base de datos)  
**Estado:** MITIGADO / EN ROTACIÓN  

---

## 1. Resumen Ejecutivo
Durante la auditoría de preparación para producción de la plataforma **Vuelto**, se detectó la presencia de credenciales predefinidas de demostración (`superadmin`, `admin`, `cajero1`) visibles en el código fuente de los clientes frontend (Web SPA y Mobile App React Native), así como en el script de migración inicial de la base de datos (`migrate.ts`).

Aunque estas contraseñas estaban destinadas originalmente a pruebas de desarrollo locales, su exposición en el repositorio y en la interfaz de inicio de sesión representa un riesgo de seguridad en implementaciones conectadas a bases de datos compartidas o productivas.

---

## 2. Activos y Cuentas Afectadas
1. **Cuenta Súper Administrador Global (`superadmin`)**:
   - Rol: `SUPER_ADMIN` (Control multi-tenant total de la plataforma).
2. **Cuenta Administrador de Negocio (`admin`)**:
   - Rol: `ADMIN` (Control total sobre inventario, margen de ganancia, tasas y cuentas por cobrar).
3. **Cuenta Cajero / Punto de Venta (`cajero1`)**:
   - Rol: `VENDEDOR` (Operación del terminal POS y facturación).

---

## 3. Acciones de Contención Inmediata Implementadas (Fase 0)
1. **Frontend Web y Móvil**:
   - Se eliminaron por completo las tarjetas de credenciales visibles (`🔑 Credenciales del Sistema`) del componente de Login.
   - Se removieron los accesos directos con contraseñas fijas. En modo desarrollo (`import.meta.env.DEV`), únicamente se incluye un enlace discreto hacia documentación interna (`/docs/demo`).
   - Se restablecieron los campos de usuario y contraseña por defecto a cadenas vacías (`useState('')`).
2. **Script de Inicialización y Seed (`migrate.ts` / `seed.ts`)**:
   - Las contraseñas se leen ahora estrictamente de variables de entorno seguras (`SEED_SUPERADMIN_PASSWORD`, `SEED_ADMIN_PASSWORD`, `SEED_CASHIER_PASSWORD`).
   - En entorno productivo (`NODE_ENV=production`), el script valida obligatoriamente la presencia de estas variables y aborta la ejecución con un error explícito si no se proporcionan, bloqueando cualquier contraseña por defecto.
3. **Infraestructura de Producción (`render.yaml`)**:
   - Se configuró `MOCK_PAYMENT_ENABLED: "false"`.
   - Se validó que las claves criptográficas (`JWT_SECRET`, `JWT_REFRESH_SECRET`) se generen de manera aleatoria y única por instancia mediante `generateValue: true`.
4. **Política de Divulgación Responsable (`SECURITY.md`)**:
   - Creación de la política formal de reporte de vulnerabilidades con SLA de respuesta máximo de 72 horas.

---

## 4. Plan de Acción y Rotación Obligatoria para Operadores

Cualquier instancia de base de datos previamente desplegada en la nube (ej. Supabase, Render Postgres) que haya ejecutado el seed anterior **DEBE rotar inmediatamente los hashes de contraseña** ejecutando el siguiente script SQL con nuevos hashes bcrypt:

```sql
-- ============================================================================
-- SCRIPT DE ROTACIÓN DE CONTRASEÑAS - INC-SEC-2026-11-25-01
-- ============================================================================
-- Genere hashes bcrypt individuales (cost factor >= 10) para cada cuenta.
-- Ejemplo de hash para reemplazo: '$2a$10$NUEVO_HASH_BCRYPT_AQUI'

BEGIN;

UPDATE users 
SET password_hash = '$2a$10$NUEVO_HASH_BCRYPT_SUPERADMIN', 
    updated_at = NOW() 
WHERE username = 'superadmin';

UPDATE users 
SET password_hash = '$2a$10$NUEVO_HASH_BCRYPT_ADMIN', 
    updated_at = NOW() 
WHERE username = 'admin';

UPDATE users 
SET password_hash = '$2a$10$NUEVO_HASH_BCRYPT_CAJERO', 
    updated_at = NOW() 
WHERE username = 'cajero1';

COMMIT;
```

---

## 5. Prevención Futura
- Implementación de pre-commit hooks (Husky + Gitleaks) para escanear tokens, claves y patrones de credenciales antes de confirmar cambios en git.
- Adición de pruebas automatizadas en CI que auditan la ausencia de credenciales predefinidas en el código fuente compilado.
