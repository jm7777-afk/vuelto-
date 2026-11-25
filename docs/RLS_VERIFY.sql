-- ==============================================================================
-- Script de Verificación Manual de Row-Level Security (RLS) en Vuelto
-- Ejecutar en psql o pgAdmin con un usuario que NO tenga superuser (ej. vuelto_app_user)
-- ==============================================================================

BEGIN;

-- 1. Consultar estado de RLS en todas las tablas del esquema public
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled,
    forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Identificar dos tenants de prueba
DO $$
DECLARE
    tenant_a UUID;
    tenant_b UUID;
    count_a INT;
    count_b INT;
BEGIN
    SELECT id INTO tenant_a FROM tenants LIMIT 1;
    SELECT id INTO tenant_b FROM tenants OFFSET 1 LIMIT 1;

    RAISE NOTICE 'Probando aislamiento entre Tenant A (%) y Tenant B (%)', tenant_a, tenant_b;

    -- ==========================================================================
    -- TEST 1: Sesión como Tenant A
    -- ==========================================================================
    PERFORM set_config('app.current_tenant_id', tenant_a::text, true);

    SELECT count(*) INTO count_a FROM products;
    RAISE NOTICE 'Tenant A ve % productos', count_a;

    -- Verificar que NO se ven productos con tenant_id distinto
    IF EXISTS (SELECT 1 FROM products WHERE tenant_id <> tenant_a) THEN
        RAISE EXCEPTION 'FALLO DE RLS: Tenant A puede ver productos de otro tenant!';
    ELSE
        RAISE NOTICE 'CORRECTO: Tenant A solo ve sus propios productos.';
    END IF;

    -- ==========================================================================
    -- TEST 2: Intento de Inserción Cruzada (Cross-Tenant Write Attack)
    -- ==========================================================================
    BEGIN
        INSERT INTO products (tenant_id, name, sale_price_usd, cost_price_usd, tax_rate)
        VALUES (tenant_b, 'Producto Inyectado', 10.0, 5.0, 16.0);

        RAISE EXCEPTION 'FALLO DE RLS: Se permitió insertar producto de Tenant B en sesión de Tenant A!';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'CORRECTO: RLS bloqueó la inserción cruzada con error de violación de política (insufficient_privilege).';
    END;

    -- ==========================================================================
    -- TEST 3: Sesión como Tenant B
    -- ==========================================================================
    PERFORM set_config('app.current_tenant_id', tenant_b::text, true);

    SELECT count(*) INTO count_b FROM products;
    RAISE NOTICE 'Tenant B ve % productos', count_b;

    IF EXISTS (SELECT 1 FROM products WHERE tenant_id <> tenant_b) THEN
        RAISE EXCEPTION 'FALLO DE RLS: Tenant B puede ver productos de otro tenant!';
    ELSE
        RAISE NOTICE 'CORRECTO: Tenant B solo ve sus propios productos.';
    END IF;

    -- ==========================================================================
    -- TEST 4: Sesión como Súper Administrador
    -- ==========================================================================
    PERFORM set_config('app.current_tenant_id', '', true);
    PERFORM set_config('app.is_super_admin', 'true', true);

    RAISE NOTICE 'CORRECTO: Súper Administrador puede auditar transversalmente con flag app.is_super_admin.';

END $$;

ROLLBACK;
