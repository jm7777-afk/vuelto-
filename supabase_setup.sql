-- =============================================================================
-- ESQUEMA COMPLETO Y DATOS INICIALES PARA SUPABASE - PROYECTO VUELTO (VENEZUELA)
-- =============================================================================
-- Instrucciones para Supabase:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com).
-- 2. En el menú lateral izquierdo, haz clic en "SQL Editor".
-- 3. Haz clic en "New query".
-- 4. Copia y pega TODO este archivo y haz clic en "RUN".
-- =============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA: ROLES DEL SISTEMA
CREATE TABLE IF NOT EXISTS "roles" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text
);

-- 2. TABLA: TENANTS (NEGOCIOS/COMERCIOS)
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"business_name" varchar(150) NOT NULL,
	"trade_name" varchar(150) NOT NULL,
	"document_type" varchar(2) NOT NULL,
	"document_number" varchar(12) NOT NULL,
	"fiscal_address" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(100) NOT NULL,
	"is_special_taxpayer" boolean DEFAULT false NOT NULL,
	"internal_barcode_prefix" varchar(5) DEFAULT '200' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);

-- 3. TABLA: USUARIOS
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE,
	"role_id" varchar(30) NOT NULL REFERENCES "roles"("id") ON DELETE RESTRICT,
	"username" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. TABLA: ALMACENES
CREATE TABLE IF NOT EXISTS "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"name" varchar(80) NOT NULL,
	"code" varchar(20) NOT NULL,
	"address" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. TABLA: CATEGORÍAS
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"name" varchar(80) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. TABLA: PRODUCTOS
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
	"sku" varchar(50),
	"name" varchar(150) NOT NULL,
	"description" text,
	"cost_price_usd" numeric(14, 4) DEFAULT '0.0000' NOT NULL,
	"sale_price_usd" numeric(14, 4) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16.00' NOT NULL,
	"is_exempt" boolean DEFAULT false NOT NULL,
	"min_stock_alert" numeric(12, 3) DEFAULT '5.000' NOT NULL,
	"allow_negative_stock" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. TABLA: CÓDIGOS DE BARRA
CREATE TABLE IF NOT EXISTS "product_barcodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
	"barcode" varchar(64) NOT NULL,
	"barcode_type" varchar(15) NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. TABLA: STOCK POR ALMACÉN
CREATE TABLE IF NOT EXISTS "product_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"warehouse_id" uuid NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
	"product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
	"quantity" numeric(12, 3) DEFAULT '0.000' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 9. TABLA: CLIENTES
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"document_type" varchar(2) NOT NULL,
	"document_number" varchar(12) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(25),
	"email" varchar(100),
	"fiscal_address" text,
	"credit_limit" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"balance_due" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"created_via" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. TABLA: PROVEEDORES
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"document_type" varchar(2) NOT NULL,
	"document_number" varchar(12) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(25) NOT NULL,
	"email" varchar(100),
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 11. TABLA: CONTACTOS CRM
CREATE TABLE IF NOT EXISTS "customer_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"customer_id" uuid REFERENCES "customers"("id") ON DELETE CASCADE,
	"supplier_id" uuid REFERENCES "suppliers"("id") ON DELETE CASCADE,
	"name" varchar(100) NOT NULL,
	"phone" varchar(25),
	"email" varchar(100),
	"role_title" varchar(80),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 12. TABLA: INTERACCIONES CRM
CREATE TABLE IF NOT EXISTS "contact_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
	"customer_id" uuid REFERENCES "customers"("id") ON DELETE RESTRICT,
	"supplier_id" uuid REFERENCES "suppliers"("id") ON DELETE RESTRICT,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
	"channel" varchar(20) NOT NULL,
	"summary" varchar(255) NOT NULL,
	"result" text NOT NULL,
	"next_followup_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 13. TABLA: TASAS DE CAMBIO
CREATE TABLE IF NOT EXISTS "exchange_rate_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
	"source" varchar(20) NOT NULL,
	"rate" numeric(14, 4) NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"is_official" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 14. TABLA: SECUENCIA DE FACTURAS
CREATE TABLE IF NOT EXISTS "invoice_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
	"series" varchar(10) DEFAULT 'A' NOT NULL,
	"current_number" bigint DEFAULT 0 NOT NULL,
	"prefix" varchar(10) DEFAULT 'FACT-' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 15. TABLA: VENTAS / FACTURAS
CREATE TABLE IF NOT EXISTS "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
	"customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
	"warehouse_id" uuid NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
	"invoice_series" varchar(10) DEFAULT 'A' NOT NULL,
	"invoice_number" bigint NOT NULL,
	"invoice_formatted_number" varchar(30) NOT NULL,
	"exchange_rate_id" uuid NOT NULL REFERENCES "exchange_rate_snapshots"("id") ON DELETE RESTRICT,
	"rate_value" numeric(14, 4) NOT NULL,
	"taxable_base_16_usd" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"taxable_base_8_usd" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"exempt_amount_usd" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount_16_usd" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount_8_usd" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"igtf_amount_usd" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_amount_usd" numeric(14, 2) NOT NULL,
	"taxable_base_16_bs" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"taxable_base_8_bs" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"exempt_amount_bs" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount_16_bs" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount_8_bs" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"igtf_amount_bs" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_amount_bs" numeric(14, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'COMPLETED' NOT NULL,
	"fiscal_status" varchar(25) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 16. TABLA: LÍNEAS DE VENTA
CREATE TABLE IF NOT EXISTS "sale_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"sale_id" uuid NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
	"product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_cost_usd" numeric(14, 4) NOT NULL,
	"unit_price_usd" numeric(14, 4) NOT NULL,
	"tax_rate" numeric(5, 2) NOT NULL,
	"is_exempt" boolean NOT NULL,
	"subtotal_usd" numeric(14, 2) NOT NULL,
	"tax_amount_usd" numeric(14, 2) NOT NULL,
	"total_usd" numeric(14, 2) NOT NULL,
	"subtotal_bs" numeric(14, 2) NOT NULL,
	"tax_amount_bs" numeric(14, 2) NOT NULL,
	"total_bs" numeric(14, 2) NOT NULL
);

-- 17. TABLA: PAGOS
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
	"sale_id" uuid NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
	"customer_id" uuid REFERENCES "customers"("id") ON DELETE RESTRICT,
	"payment_method" varchar(25) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"amount_in_usd" numeric(14, 2) NOT NULL,
	"amount_in_bs" numeric(14, 2) NOT NULL,
	"reference_number" varchar(50),
	"applies_igtf" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 18. TABLA: VALES DE CAMBIO
CREATE TABLE IF NOT EXISTS "change_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
	"code" varchar(32) NOT NULL,
	"barcode" varchar(64) NOT NULL,
	"sale_id" uuid NOT NULL REFERENCES "sales"("id") ON DELETE RESTRICT,
	"customer_id" uuid REFERENCES "customers"("id") ON DELETE RESTRICT,
	"amount_usd" numeric(14, 2) NOT NULL,
	"amount_bs" numeric(14, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"redeemed_sale_id" uuid REFERENCES "sales"("id") ON DELETE RESTRICT,
	"redeemed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 19. TABLA: MOVIMIENTOS DE INVENTARIO (KARDEX)
CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
	"warehouse_id" uuid NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
	"product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
	"movement_type" varchar(20) NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_cost_usd" numeric(14, 4) NOT NULL,
	"reference_type" varchar(30) NOT NULL,
	"reference_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 20. TABLA: CLAVES DE IDEMPOTENCIA
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"key" varchar(128) NOT NULL,
	"request_path" varchar(200) NOT NULL,
	"request_params_hash" varchar(64) NOT NULL,
	"response_code" integer,
	"response_body" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 21. TABLA: AUDITORÍA INMUTABLE
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid REFERENCES "tenants"("id") ON DELETE SET NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"action" varchar(60) NOT NULL,
	"entity" varchar(50) NOT NULL,
	"entity_id" varchar(64),
	"payload" jsonb,
	"result" varchar(30) NOT NULL,
	"channel" varchar(30) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- =============================================================================
-- ÍNDICES Y RESTRICCIONES COMPUESTAS MULTI-TENANT
-- =============================================================================
CREATE INDEX IF NOT EXISTS "idx_audit_tenant_action" ON "audit_logs" ("tenant_id","action","created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_category_name" ON "categories" ("tenant_id","name");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_voucher_code" ON "change_vouchers" ("tenant_id","code");
CREATE INDEX IF NOT EXISTS "idx_vouchers_barcode" ON "change_vouchers" ("tenant_id","barcode");
CREATE INDEX IF NOT EXISTS "idx_interactions_customer" ON "contact_interactions" ("tenant_id","customer_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_interactions_supplier" ON "contact_interactions" ("tenant_id","supplier_id","created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_customer_doc" ON "customers" ("tenant_id","document_type","document_number");
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_phone" ON "customers" ("tenant_id","phone");
CREATE INDEX IF NOT EXISTS "idx_exchange_rates" ON "exchange_rate_snapshots" ("tenant_id","source","valid_from");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_user_idempotency" ON "idempotency_keys" ("tenant_id","user_id","key");
CREATE INDEX IF NOT EXISTS "idx_movements_product" ON "inventory_movements" ("tenant_id","product_id","created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_invoice_series" ON "invoice_sequences" ("tenant_id","series");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_barcode" ON "product_barcodes" ("tenant_id","barcode");
CREATE INDEX IF NOT EXISTS "idx_barcodes_lookup" ON "product_barcodes" ("tenant_id","barcode");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_warehouse_product" ON "product_stock" ("tenant_id","warehouse_id","product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_product_sku" ON "products" ("tenant_id","sku");
CREATE INDEX IF NOT EXISTS "idx_products_tenant_active" ON "products" ("tenant_id","is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_invoice_num" ON "sales" ("tenant_id","invoice_series","invoice_number");
CREATE INDEX IF NOT EXISTS "idx_sales_tenant_date" ON "sales" ("tenant_id","created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_supplier_doc" ON "suppliers" ("tenant_id","document_type","document_number");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_rif" ON "tenants" ("document_type","document_number");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_username" ON "users" ("tenant_id","username");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_user_email" ON "users" ("tenant_id","email");
CREATE INDEX IF NOT EXISTS "idx_users_tenant_role" ON "users" ("tenant_id","role_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_warehouse_code" ON "warehouses" ("tenant_id","code");

-- =============================================================================
-- SEMBRADO DE DATOS INICIALES (ÚNICAMENTE ROLES DEL SISTEMA)
-- Nota: Ejecute `npm --prefix backend run db:migrate` para crear el Súper Administrador.
-- =============================================================================

-- Roles
INSERT INTO "roles" ("id", "name", "description") VALUES
('SUPER_ADMIN', 'Super Administrador', 'Control total de la plataforma multi-tenant'),
('ADMIN', 'Administrador de Negocio', 'Control total de la tienda (inventario, precios, ventas y modo admin móvil)'),
('VENDEDOR', 'Cajero / Vendedor', 'Facturación rápida, escaneo y cuentas abiertas en mostrador'),
('CONSULTA', 'Consulta / Auditor', 'Solo lectura para contadores o fiscalizadores')
ON CONFLICT ("id") DO NOTHING;
