# Guía de Configuración de Base de Datos y Roles PostgreSQL (RLS Hardening)

Este documento describe la configuración de seguridad a nivel de base de datos para la arquitectura Multi-Tenant de **Vuelto**, asegurando que las políticas de **Row-Level Security (RLS)** no puedan ser burladas por usuarios con privilegios excesivos.

---

## 1. El Principio de Menor Privilegio (Non-Superuser Role)

En PostgreSQL, los usuarios con atributo `SUPERUSER` o `BYPASSRLS` ignoran todas las políticas de Row-Level Security por defecto.

Para entornos de producción (Render, AWS RDS o Supabase):

> [!CAUTION]
> La cadena de conexión (`DATABASE_URL`) utilizada por la aplicación Express en producción **NUNCA** debe conectarse con el usuario `postgres` superadmin. Debe utilizar un rol de servicio restringido (`vuelto_app_user`).

### Comandos SQL para crear el rol de aplicación restringido:

Ejecute los siguientes comandos como administrador de PostgreSQL (por ejemplo, desde la consola SQL de Supabase o `psql`):

```sql
-- 1. Crear el usuario de la aplicación sin privilegios de superusuario ni bypass
CREATE ROLE vuelto_app_user WITH LOGIN PASSWORD 'GeneraUnPasswordMuySeguro2026#';
ALTER ROLE vuelto_app_user NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

-- 2. Conceder permisos de conexión a la base de datos
GRANT CONNECT ON DATABASE vuelto_prod TO vuelto_app_user;

-- 3. Conceder uso sobre el esquema public
GRANT USAGE ON SCHEMA public TO vuelto_app_user;

-- 4. Conceder permisos CRUD únicamente sobre las tablas de datos
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vuelto_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vuelto_app_user;

-- 5. Asegurar que futuras tablas mantengan estos permisos mínimos
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vuelto_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vuelto_app_user;
```

---

## 2. Row-Level Security (RLS) y FORCE RLS

Para garantizar que ni siquiera el propietario de las tablas pueda saltarse el aislamiento si la conexión no es superadmin, se aplica:

```sql
ALTER TABLE <nombre_tabla> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <nombre_tabla> FORCE ROW LEVEL SECURITY;
```

La directiva `FORCE ROW LEVEL SECURITY` instruye al motor de PostgreSQL a evaluar las políticas de RLS incluso para consultas del usuario propietario de la tabla (`table owner`).

---

## 3. Política de Aislamiento de Tenant (`app.current_tenant_id`)

Cada transacción autenticada en Vuelto ejecuta:

```sql
SELECT set_config('app.current_tenant_id', '<tenant_uuid>', true);
```

El parámetro `true` (`is_local`) asegura que la configuración exista **únicamente durante la vida de la transacción actual**. Al finalizar la transacción o devolverse la conexión al pool, el setting se resetea automáticamente, previniendo fuga de contexto entre clientes distintos.

La política evaluada en cada lectura y escritura es:

```sql
CREATE POLICY tenant_isolation ON <nombre_tabla>
  AS PERMISSIVE
  FOR ALL
  USING (
    current_setting('app.is_super_admin', true) = 'true'
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true'
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );
```

---

## 4. Auditoría y Verificación de Aislamiento

Para verificar manualmente las políticas RLS en la base de datos, consulte el script [`docs/RLS_VERIFY.sql`](file:///C:/Users/Windows/Desktop/vuelto/docs/RLS_VERIFY.sql).
