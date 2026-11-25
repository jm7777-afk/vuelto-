/**
 * @vuelto/shared
 * Tipos, constantes de dominio y contratos bimonetarios compartidos entre Backend, Web y Mobile.
 */

// Monedas
export type Currency = 'USD' | 'VES';

// Roles de usuario
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'CASHIER';

// Métodos de pago venezolanos
export type PaymentMethod =
  | 'CASH_USD'
  | 'CASH_VES'
  | 'PAGO_MOVIL'
  | 'POINT_OF_SALE'
  | 'BIOPAGO'
  | 'TRANSFER'
  | 'VUELTO_WALLET'
  | 'CHANGE_VOUCHER'
  | 'CREDIT_DEBT';

// Opciones de entrega de vuelto
export type VueltoType = 'WALLET_CREDIT' | 'CHANGE_VOUCHER' | 'PAGO_MOVIL' | 'CASH_USD' | 'CASH_VES';

// Documentos de identidad venezolanos
export type VenezuelanDocType = 'V' | 'E' | 'J' | 'G' | 'P';

// Estados de venta y facturación
export type SaleStatus =
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ANNULLED_BY_NC'
  | 'SYNCED_WITH_STOCK_DEFICIT';

export type FiscalStatus = 'PENDING' | 'TRANSMITTED' | 'NON_FISCAL';

// Tasas impositivas
export interface TaxRatesConfig {
  ivaGeneral: number;   // 0.16 (16%)
  ivaReducido: number;  // 0.08 (8%)
  igtfDivisas: number;  // 0.03 (3%)
}

// Modelo de Producto en POS
export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  salePriceUsd: number;
  taxRate: number;
  isExempt: boolean;
  unitOfMeasure: string;
  stock?: number;
  barcode?: string;
}

// Línea de venta
export interface SaleLineInput {
  productId: string;
  quantity: number;
  unitPriceUsd: number;
  barcodeScanned?: string;
}

// Pago en venta
export interface SalePaymentInput {
  paymentMethod: PaymentMethod;
  currency: Currency;
  amount: number;
  referenceNumber?: string;
  bankCode?: string;
}

// Solicitud de confirmación de venta
export interface ConfirmSaleRequest {
  customerId: string;
  warehouseId?: string;
  exchangeRateId: string;
  clientAssignedUuid?: string;
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
  vueltoOption?: {
    type: VueltoType;
    amountUsd: number;
    pagoMovilPhone?: string;
    pagoMovilBank?: string;
  };
  adminAuthorized?: boolean;
}

// Resultado de decodificación de código de barras
export interface BarcodeDecodeResult {
  code: string;
  isScaleBarcode: boolean;
  itemCode?: string;
  weightOrAmount?: number;
  scaleType?: 'WEIGHT' | 'PRICE';
}
