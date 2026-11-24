import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  numeric,
  bigint,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  check,
  integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. Tenants (Negocios / Comercios)
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    businessName: varchar('business_name', { length: 150 }).notNull(),
    tradeName: varchar('trade_name', { length: 150 }).notNull(),
    documentType: varchar('document_type', { length: 2 }).notNull(), // 'J', 'G', 'V', 'E'
    documentNumber: varchar('document_number', { length: 12 }).notNull(), // RIF
    fiscalAddress: text('fiscal_address').notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 100 }).notNull(),
    isSpecialTaxpayer: boolean('is_special_taxpayer').default(false).notNull(), // Aplica IGTF 3%
    internalBarcodePrefix: varchar('internal_barcode_prefix', { length: 5 }).default('200').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_rif').on(table.documentType, table.documentNumber),
  ]
);

// 2. Roles del Sistema (SUPER_ADMIN, ADMIN, VENDEDOR, CONSULTA)
export const roles = pgTable('roles', {
  id: varchar('id', { length: 30 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  description: text('description'),
});

// 3. Users (Usuarios pertenecientes a un Tenant)
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    roleId: varchar('role_id', { length: 30 })
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    username: varchar('username', { length: 50 }).notNull(),
    email: varchar('email', { length: 100 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_username').on(table.tenantId, table.username),
    uniqueIndex('uq_tenant_user_email').on(table.tenantId, table.email),
    index('idx_users_tenant_role').on(table.tenantId, table.roleId),
  ]
);

// 4. Categories
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_category_name').on(table.tenantId, table.name),
  ]
);

// 5. Warehouses (Depósitos / Almacenes)
export const warehouses = pgTable(
  'warehouses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    code: varchar('code', { length: 20 }).notNull(),
    address: text('address'),
    isDefault: boolean('is_default').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_warehouse_code').on(table.tenantId, table.code),
  ]
);

// 6. Products
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    sku: varchar('sku', { length: 50 }),
    name: varchar('name', { length: 150 }).notNull(),
    unitOfMeasure: varchar('unit_of_measure', { length: 20 }).default('UNIDAD').notNull(),
    description: text('description'),
    costPriceUsd: numeric('cost_price_usd', { precision: 14, scale: 4 }).default('0.0000').notNull(),
    salePriceUsd: numeric('sale_price_usd', { precision: 14, scale: 4 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('16.00').notNull(),
    isExempt: boolean('is_exempt').default(false).notNull(),
    minStockAlert: numeric('min_stock_alert', { precision: 12, scale: 3 }).default('5.000').notNull(),
    allowNegativeStock: boolean('allow_negative_stock').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_product_sku').on(table.tenantId, table.sku),
    index('idx_products_tenant_active').on(table.tenantId, table.isActive),
  ]
);

// 7. Product Barcodes (Tabla separada obligatoria)
export const productBarcodes = pgTable(
  'product_barcodes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    barcode: varchar('barcode', { length: 64 }).notNull(),
    barcodeType: varchar('barcode_type', { length: 15 }).notNull(), // 'EAN13', 'EAN8', 'CODE128', 'UPC', 'INTERNAL'
    isPrimary: boolean('is_primary').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_barcode').on(table.tenantId, table.barcode),
    index('idx_barcodes_lookup').on(table.tenantId, table.barcode),
  ]
);

// 8. Inventory Movements (Kardex inmutable)
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    movementType: varchar('movement_type', { length: 20 }).notNull(), // 'IN', 'OUT', 'ADJUSTMENT', 'SALE', 'RETURN'
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitCostUsd: numeric('unit_cost_usd', { precision: 14, scale: 4 }).notNull(),
    referenceType: varchar('reference_type', { length: 30 }).notNull(), // 'SALE', 'PURCHASE', 'MANUAL_ADJUSTMENT'
    referenceId: uuid('reference_id'),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_movements_product').on(table.tenantId, table.productId, table.createdAt),
  ]
);

// 9. Product Stock (Consolidado por almacén)
export const productStock = pgTable(
  'product_stock',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).default('0.000').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_warehouse_product').on(table.tenantId, table.warehouseId, table.productId),
  ]
);

// 10. Customers
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 2 }).notNull(), // 'V', 'E', 'J', 'G', 'P'
    documentNumber: varchar('document_number', { length: 12 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 25 }),
    email: varchar('email', { length: 100 }),
    fiscalAddress: text('fiscal_address'),
    creditLimit: numeric('credit_limit', { precision: 14, scale: 2 }).default('0.00').notNull(),
    balanceDue: numeric('balance_due', { precision: 14, scale: 2 }).default('0.00').notNull(), // Positivo: debe. Negativo: saldo a favor (monedero)
    isSpecialMoraCustomer: boolean('is_special_mora_customer').default(false).notNull(), // Requiere aprobación especial de admin
    createdVia: varchar('created_via', { length: 20 }).notNull(), // 'POS_QUICK', 'ADMIN', 'IMPORT'
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_customer_doc').on(table.tenantId, table.documentType, table.documentNumber),
    index('idx_customers_tenant_phone').on(table.tenantId, table.phone),
  ]
);

// 11. Suppliers
export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 2 }).notNull(), // 'J', 'G', 'V', 'E'
    documentNumber: varchar('document_number', { length: 12 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 25 }).notNull(),
    email: varchar('email', { length: 100 }),
    address: text('address'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_supplier_doc').on(table.tenantId, table.documentType, table.documentNumber),
  ]
);

// 12. Customer Contacts (Personas de contacto para Clientes y Proveedores)
export const customerContacts = pgTable('customer_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 25 }),
  email: varchar('email', { length: 100 }),
  roleTitle: varchar('role_title', { length: 80 }),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Contact Interactions (Obligatorio en MVP - Historial inmutable)
export const contactInteractions = pgTable(
  'contact_interactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
    supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    channel: varchar('channel', { length: 20 }).notNull(), // 'LLAMADA', 'VISITA', 'NOTA', 'WHATSAPP', 'EMAIL'
    summary: varchar('summary', { length: 255 }).notNull(),
    result: text('result').notNull(),
    nextFollowupAt: timestamp('next_followup_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_interactions_customer').on(table.tenantId, table.customerId, table.createdAt),
    index('idx_interactions_supplier').on(table.tenantId, table.supplierId, table.createdAt),
  ]
);

// 14. Exchange Rate Snapshots
export const exchangeRateSnapshots = pgTable(
  'exchange_rate_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    source: varchar('source', { length: 20 }).notNull(), // 'BCV', 'PARALELO', 'P2P'
    rate: numeric('rate', { precision: 14, scale: 4 }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    isOfficial: boolean('is_official').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_exchange_rates').on(table.tenantId, table.source, table.validFrom),
  ]
);

// 15. Invoice Sequences (Control de Correlativo sin Saltos para SENIAT)
export const invoiceSequences = pgTable(
  'invoice_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    series: varchar('series', { length: 10 }).default('A').notNull(),
    currentNumber: bigint('current_number', { mode: 'number' }).default(0).notNull(),
    prefix: varchar('prefix', { length: 10 }).default('FACT-').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_invoice_series').on(table.tenantId, table.series),
  ]
);

// 16. Sales (Facturas / Ventas)
export const sales = pgTable(
  'sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    invoiceSeries: varchar('invoice_series', { length: 10 }).default('A').notNull(),
    invoiceNumber: bigint('invoice_number', { mode: 'number' }).notNull(),
    invoiceFormattedNumber: varchar('invoice_formatted_number', { length: 30 }).notNull(), // ej. 'A-00000042'
    
    exchangeRateId: uuid('exchange_rate_id')
      .notNull()
      .references(() => exchangeRateSnapshots.id, { onDelete: 'restrict' }),
    rateValue: numeric('rate_value', { precision: 14, scale: 4 }).notNull(), // Tasa congelada
    
    taxableBase16Usd: numeric('taxable_base_16_usd', { precision: 14, scale: 2 }).default('0.00').notNull(),
    taxableBase8Usd: numeric('taxable_base_8_usd', { precision: 14, scale: 2 }).default('0.00').notNull(),
    exemptAmountUsd: numeric('exempt_amount_usd', { precision: 14, scale: 2 }).default('0.00').notNull(),
    taxAmount16Usd: numeric('tax_amount_16_usd', { precision: 14, scale: 2 }).default('0.00').notNull(),
    taxAmount8Usd: numeric('tax_amount_8_usd', { precision: 14, scale: 2 }).default('0.00').notNull(),
    igtfAmountUsd: numeric('igtf_amount_usd', { precision: 14, scale: 2 }).default('0.00').notNull(),
    totalAmountUsd: numeric('total_amount_usd', { precision: 14, scale: 2 }).notNull(),

    taxableBase16Bs: numeric('taxable_base_16_bs', { precision: 14, scale: 2 }).default('0.00').notNull(),
    taxableBase8Bs: numeric('taxable_base_8_bs', { precision: 14, scale: 2 }).default('0.00').notNull(),
    exemptAmountBs: numeric('exempt_amount_bs', { precision: 14, scale: 2 }).default('0.00').notNull(),
    taxAmount16Bs: numeric('tax_amount_16_bs', { precision: 14, scale: 2 }).default('0.00').notNull(),
    taxAmount8Bs: numeric('tax_amount_8_bs', { precision: 14, scale: 2 }).default('0.00').notNull(),
    igtfAmountBs: numeric('igtf_amount_bs', { precision: 14, scale: 2 }).default('0.00').notNull(),
    totalAmountBs: numeric('total_amount_bs', { precision: 14, scale: 2 }).notNull(),

    status: varchar('status', { length: 20 }).default('COMPLETED').notNull(), // 'COMPLETED', 'CANCELLED'
    fiscalStatus: varchar('fiscal_status', { length: 25 }).default('PENDING').notNull(), // 'PENDING', 'TRANSMITTED', 'NON_FISCAL'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_invoice_num').on(table.tenantId, table.invoiceSeries, table.invoiceNumber),
    index('idx_sales_tenant_date').on(table.tenantId, table.createdAt),
  ]
);

// 17. Sale Lines
export const saleLines = pgTable('sale_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  saleId: uuid('sale_id')
    .notNull()
    .references(() => sales.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCostUsd: numeric('unit_cost_usd', { precision: 14, scale: 4 }).notNull(),
  unitPriceUsd: numeric('unit_price_usd', { precision: 14, scale: 4 }).notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull(),
  isExempt: boolean('is_exempt').notNull(),
  subtotalUsd: numeric('subtotal_usd', { precision: 14, scale: 2 }).notNull(),
  taxAmountUsd: numeric('tax_amount_usd', { precision: 14, scale: 2 }).notNull(),
  totalUsd: numeric('total_usd', { precision: 14, scale: 2 }).notNull(),
  subtotalBs: numeric('subtotal_bs', { precision: 14, scale: 2 }).notNull(),
  taxAmountBs: numeric('tax_amount_bs', { precision: 14, scale: 2 }).notNull(),
  totalBs: numeric('total_bs', { precision: 14, scale: 2 }).notNull(),
});

// 18. Payments
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  saleId: uuid('sale_id')
    .notNull()
    .references(() => sales.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
  paymentMethod: varchar('payment_method', { length: 25 }).notNull(), // 'CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD', 'CREDIT_DEBT', 'TRANSFER', 'VUELTO_WALLET', 'CHANGE_VOUCHER'
  currency: varchar('currency', { length: 3 }).notNull(), // 'USD', 'VES'
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  amountInUsd: numeric('amount_in_usd', { precision: 14, scale: 2 }).notNull(),
  amountInBs: numeric('amount_in_bs', { precision: 14, scale: 2 }).notNull(),
  referenceNumber: varchar('reference_number', { length: 50 }),
  appliesIgtf: boolean('applies_igtf').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 19. Change Vouchers (Vales de Cambio Impresos con código de barras)
export const changeVouchers = pgTable(
  'change_vouchers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 32 }).notNull(), // ej. 'VALE-8F3A-92BC'
    barcode: varchar('barcode', { length: 64 }).notNull(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
    amountUsd: numeric('amount_usd', { precision: 14, scale: 2 }).notNull(),
    amountBs: numeric('amount_bs', { precision: 14, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(), // 'ACTIVE', 'REDEEMED', 'EXPIRED'
    redeemedSaleId: uuid('redeemed_sale_id').references(() => sales.id, { onDelete: 'restrict' }),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_voucher_code').on(table.tenantId, table.code),
    index('idx_vouchers_barcode').on(table.tenantId, table.barcode),
  ]
);

// 20. Idempotency Keys
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 128 }).notNull(),
    requestPath: varchar('request_path', { length: 200 }).notNull(),
    requestParamsHash: varchar('request_params_hash', { length: 64 }).notNull(),
    responseCode: integer('response_code'),
    responseBody: jsonb('response_body'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_user_idempotency').on(table.tenantId, table.userId, table.key),
  ]
);

// 21. Audit Logs (Inmutable)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 60 }).notNull(),
    entity: varchar('entity', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 64 }),
    payload: jsonb('payload'),
    result: varchar('result', { length: 30 }).notNull(), // 'SUCCESS', 'FAILED', 'VALIDATION_ERROR', 'PRINTER_UNAVAILABLE'
    channel: varchar('channel', { length: 30 }).notNull(), // 'POS_MOBILE', 'MOBILE_ADMIN', 'WEB_ADMIN', 'SYSTEM_JOB'
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_tenant_action').on(table.tenantId, table.action, table.createdAt),
  ]
);

// 22. Tenant Configurations (Reglas de mora, preferencias)
export const tenantConfigurations = pgTable(
  'tenant_configurations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .unique()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    lateFeePercentage: numeric('late_fee_percentage', { precision: 5, scale: 2 }).default('5.00').notNull(),
    lateFeeGraceDays: integer('late_fee_grace_days').default(3).notNull(),
    autoApplyLateFee: boolean('auto_apply_late_fee').default(true).notNull(),
    currencyPreference: varchar('currency_preference', { length: 10 }).default('USD').notNull(),
    
    // Tasa Activa Seleccionada por el Administrador
    activeRateSource: varchar('active_rate_source', { length: 20 }).default('BCV').notNull(), // 'BCV', 'PARALELO', 'EURO', 'CUSTOM'
    customRateValue: numeric('custom_rate_value', { precision: 14, scale: 4 }).default('0.0000').notNull(),
    
    // Régimen Fiscal Flexible (Emprendimientos / Desafiliación de IVA e IGTF)
    enableIva: boolean('enable_iva').default(true).notNull(), // Si es false, se emite a 0% IVA (Emprendimientos / Negocios no registrados)
    enableIgtf: boolean('enable_igtf').default(true).notNull(), // Si es false, 0% IGTF
    defaultIvaPercentage: numeric('default_iva_percentage', { precision: 5, scale: 2 }).default('16.00').notNull(),
    
    // Margen de Ganancia Global Predeterminado para Inventario (%)
    defaultProfitMargin: numeric('default_profit_margin', { precision: 5, scale: 2 }).default('30.00').notNull(),
    
    // Bloqueo y Aprobación de Administrador para Clientes Morosos
    requireAdminForOverdueDebt: boolean('require_admin_for_overdue_debt').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// 23. Purchase Orders (Pedidos / Órdenes de Compra a Proveedores)
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    orderNumber: varchar('order_number', { length: 30 }).notNull(), // ej. 'OC-2026-0001'
    status: varchar('status', { length: 25 }).default('DRAFT').notNull(), // 'DRAFT', 'SENT_WHATSAPP', 'RECEIVED', 'CANCELLED'
    expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),
    totalEstimatedUsd: numeric('total_estimated_usd', { precision: 14, scale: 4 }).default('0.0000').notNull(),
    notes: text('notes'),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_tenant_order_number').on(table.tenantId, table.orderNumber),
    index('idx_orders_tenant_status').on(table.tenantId, table.status),
  ]
);

// 24. Purchase Order Lines
export const purchaseOrderLines = pgTable(
  'purchase_order_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityOrdered: numeric('quantity_ordered', { precision: 12, scale: 3 }).notNull(),
    quantityReceived: numeric('quantity_received', { precision: 12, scale: 3 }).default('0.000').notNull(),
    unitCostUsd: numeric('unit_cost_usd', { precision: 14, scale: 4 }).notNull(),
    subtotalUsd: numeric('subtotal_usd', { precision: 14, scale: 4 }).notNull(),
  }
);

// 25. Receivable Payments (Abonos de Cobranza)
export const receivablePayments = pgTable(
  'receivable_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    paymentMethod: varchar('payment_method', { length: 30 }).notNull(), // 'CASH_USD', 'PAGO_MOVIL', 'TRANSFER', 'DEBIT_CARD'
    amountUsd: numeric('amount_usd', { precision: 14, scale: 2 }).notNull(),
    amountBs: numeric('amount_bs', { precision: 14, scale: 2 }).notNull(),
    rateValue: numeric('rate_value', { precision: 14, scale: 4 }).notNull(),
    lateFeeAppliedUsd: numeric('late_fee_applied_usd', { precision: 14, scale: 2 }).default('0.00').notNull(),
    referenceNumber: varchar('reference_number', { length: 60 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_receivable_customer').on(table.tenantId, table.customerId, table.createdAt),
  ]
);

// 26. Financial Transactions (Flujo de Caja, Gastos Operativos y Finanzas)
export const financialTransactions = pgTable(
  'financial_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 20 }).notNull(), // 'INGRESO', 'EGRESO'
    category: varchar('category', { length: 40 }).notNull(), // 'VENTAS', 'PAGO_PROVEEDOR', 'NOMINA', 'ALQUILER', 'SERVICIOS', 'MANTENIMIENTO', 'IMPUESTOS', 'OTROS'
    description: text('description').notNull(),
    amountUsd: numeric('amount_usd', { precision: 14, scale: 2 }).notNull(),
    amountBs: numeric('amount_bs', { precision: 14, scale: 2 }).notNull(),
    rateValue: numeric('rate_value', { precision: 14, scale: 4 }).notNull(),
    referenceNumber: varchar('reference_number', { length: 60 }),
    transactionDate: timestamp('transaction_date', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_fin_tx_date').on(table.tenantId, table.type, table.transactionDate),
  ]
);
