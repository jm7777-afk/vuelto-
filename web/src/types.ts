export interface UserProfile {
  id: string;
  tenantId: string | null;
  username: string;
  email?: string;
  fullName: string;
  roleId: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
  businessName: string;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
}

export interface ProductItem {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  category: string;
  unitOfMeasure?: string;
  supplier: string;
  supplierPhone: string;
  costPriceUsd: number;
  salePriceUsd: number;
  taxRate: number;
  stock: number;
  minStockAlert: number;
  lastPurchaseDate: string;
  inflationDeltaPercent: number;
}

export interface TenantUserItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roleId: 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface TenantItem {
  id: string;
  slug: string;
  businessName: string;
  tradeName: string;
  documentType: 'J' | 'G' | 'V' | 'E';
  documentNumber: string;
  fiscalAddress: string;
  phone: string;
  email: string;
  isSpecialTaxpayer: boolean;
  internalBarcodePrefix: string;
  isActive: boolean;
  usersCount?: number;
  productsCount?: number;
  invoicesCount?: number;
  totalSalesUsd?: number;
  users?: TenantUserItem[];
  createdAt: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  documentType: 'J' | 'G' | 'V' | 'E';
  documentNumber: string;
  phone: string;
  email: string;
  address: string;
  creditDays: number;
  isActive: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  status: 'DRAFT' | 'SENT_WHATSAPP' | 'RECEIVED' | 'CANCELLED';
  expectedDeliveryDate: string;
  totalEstimatedUsd: number;
  notes: string;
  createdAt: string;
  lines: Array<{ productName: string; qty: number; unitCostUsd: number; subtotalUsd: number }>;
}

export interface KardexMovementItem {
  id: string;
  productName: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'RETURN';
  quantity: number;
  unitCostUsd: number;
  reason: string;
  createdAt: string;
  user: string;
}

export interface CustomerDebt {
  id: string;
  name: string;
  document: string;
  phone: string;
  balanceDueUsd: number;
  dueDate: string;
  isOverdue: boolean;
  lateDays: number;
  surchargeUsd: number;
  waived?: boolean;
  itemsTaken?: Array<{ name: string; qty: number; priceUsd: number; subtotalUsd: number }>;
  invoiceNumber?: string;
  cashierName?: string;
}

export interface ReceivablePaymentRecord {
  id: string;
  customerName: string;
  customerDoc: string;
  amountUsd: number;
  amountBs: number;
  paymentMethod: string;
  referenceNumber: string;
  createdAt: string;
  notes: string;
}

export interface FinancialTransactionItem {
  id: string;
  type: 'INGRESO' | 'EGRESO';
  category: string;
  description: string;
  amountUsd: number;
  amountBs: number;
  referenceNumber: string;
  createdAt: string;
}

export interface SaleRecord {
  id: string;
  invoiceFormattedNumber: string;
  createdAt: string;
  customerName: string;
  customerDoc: string;
  cashierName: string;
  totalUsd: number;
  totalBs: number;
  rateValue: number;
  status: 'COMPLETADA' | 'ANULADA';
  items: { name: string; qty: number; priceUsd: number; subtotalUsd: number; taxRate: number }[];
  taxes: { base16: number; base8: number; exempt: number; tax16: number; tax8: number; igtf3: number };
}

export interface CashierStatus {
  id: string;
  name: string;
  username: string;
  roleId?: string;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  openCartsCount: number;
  salesTodayCount: number;
  salesTodayUsd: number;
  salesTodayBs: number;
  lastAction: string;
  lastActionTime: string;
}

export interface PosCustomerItem {
  id: string;
  name: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  balanceDue: number;
  isSpecialMoraCustomer: boolean;
}

export interface PosCartLine {
  id?: string;
  productId: string;
  name: string;
  barcode: string;
  priceUsd: number;
  qty: number;
  unitOfMeasure?: string;
  isExempt: boolean;
  taxRate: number;
}

export interface PosTicket {
  id: string;
  ticketNumber: number;
  label: string;
  customer: PosCustomerItem;
  cartLines: PosCartLine[];
  paymentMethod: 'CASH_USD' | 'CASH_VES' | 'PAGO_MOVIL' | 'DEBIT_CARD' | 'TRANSFER' | 'CREDIT_DEBT' | 'DERIVAR_ADMIN';
  cashAmountUsd: string;
  pagoMovilBank: string;
  pagoMovilPhone: string;
  pagoMovilRef: string;
  adminApproved: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  tenantId: string | null;
  tenantName?: string | null;
  tenantSlug?: string | null;
  userId?: string | null;
  username?: string | null;
  userFullName?: string | null;
  userRoleId?: string | null;
  action: string;
  entity: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: any;
  result: string;
  channel: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface SystemLogEvent {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: 'HTTP' | 'AUDIT' | 'SECURITY' | 'SYSTEM' | 'ERROR';
  message: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  reqId?: string;
  tenantId?: string | null;
  userId?: string | null;
  username?: string;
  action?: string;
  entity?: string;
  result?: string;
  channel?: string;
  ipAddress?: string | null;
  metadata?: Record<string, any>;
}

export interface MonitoringSnapshot {
  timestamp: string;
  system: {
    status: 'HEALTHY' | 'DEGRADED';
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
  database: {
    status: 'connected' | 'disconnected';
    latencyMs: number;
    pool: {
      total: number;
      idle: number;
      active: number;
    };
  };
  traffic: {
    requestsPerMin: number;
    errorsPerMin: number;
    avgLatencyMs: number;
    bufferedEventsCount: number;
    connectedMonitors: number;
  };
  platform: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    activeSessions: number;
    salesTodayCount: number;
    salesTodayUsd: number;
    auditLast24hCount: number;
  };
  recentEvents: SystemLogEvent[];
}
