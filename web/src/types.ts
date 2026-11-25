export interface UserProfile {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  roleId: string;
  businessName: string;
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
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  openCartsCount: number;
  salesTodayCount: number;
  salesTodayUsd: number;
  salesTodayBs: number;
  lastAction: string;
  lastActionTime: string;
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
  customer: {
    id: string;
    name: string;
    documentType: string;
    documentNumber: string;
    phone: string;
    balanceDue: number;
    isSpecialMoraCustomer: boolean;
  };
  cartLines: PosCartLine[];
  paymentMethod: 'CASH_USD' | 'CASH_VES' | 'PAGO_MOVIL' | 'DEBIT_CARD' | 'TRANSFER' | 'CREDIT_DEBT' | 'DERIVAR_ADMIN';
  cashAmountUsd: string;
  pagoMovilBank: string;
  pagoMovilPhone: string;
  pagoMovilRef: string;
  adminApproved: boolean;
  createdAt: string;
}
