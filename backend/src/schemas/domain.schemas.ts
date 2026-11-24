import { z } from 'zod';
import { VenezuelaUtils } from '../utils/venezuela.js';

export const quickCustomerSchema = z.object({
  documentType: z.enum(['V', 'E', 'J', 'G', 'P']),
  documentNumber: z.string().min(5).max(12),
  name: z.string().min(3).max(150),
  phone: z.string().optional(),
});

export const createCustomerSchema = quickCustomerSchema.extend({
  email: z.string().email().optional(),
  fiscalAddress: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
});

export const createSupplierSchema = z.object({
  documentType: z.enum(['J', 'G', 'V', 'E']),
  documentNumber: z.string().min(5).max(12),
  name: z.string().min(3).max(150),
  phone: z.string().min(7).max(25),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export const createContactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  roleTitle: z.string().max(80).optional(),
  notes: z.string().optional(),
});

export const createInteractionSchema = z.object({
  channel: z.enum(['LLAMADA', 'VISITA', 'NOTA', 'WHATSAPP', 'EMAIL']),
  summary: z.string().min(3).max(255),
  result: z.string().min(3),
  nextFollowupAt: z.string().datetime().optional(),
});

export const createProductSchema = z.object({
  sku: z.string().max(50).optional(),
  name: z.string().min(2).max(150),
  categoryId: z.string().uuid().optional(),
  costPriceUsd: z.number().min(0).default(0),
  salePriceUsd: z.number().min(0),
  taxRate: z.number().default(16.0),
  isExempt: z.boolean().default(false),
  minStockAlert: z.number().default(5),
  barcodes: z.array(z.object({
    barcode: z.string().min(3).max(64),
    barcodeType: z.enum(['EAN13', 'EAN8', 'CODE128', 'UPC', 'INTERNAL']),
    isPrimary: z.boolean().default(true),
  })).optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  exchangeRateId: z.string().uuid(),
  lines: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPriceUsd: z.number().positive(),
  })).min(1),
  payments: z.array(z.object({
    paymentMethod: z.enum(['CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD', 'CREDIT_DEBT', 'TRANSFER', 'VUELTO_WALLET', 'CHANGE_VOUCHER']),
    currency: z.enum(['USD', 'VES']),
    amount: z.number().positive(),
    referenceNumber: z.string().optional(),
    voucherCode: z.string().optional(),
  })).min(1),
  vueltoOption: z.object({
    type: z.enum(['CASH', 'WALLET_CREDIT', 'CHANGE_VOUCHER', 'PAGO_MOVIL']),
    amountUsd: z.number().min(0),
    pagoMovilPhone: z.string().optional(),
    pagoMovilBank: z.string().optional(),
  }).optional(),
});
