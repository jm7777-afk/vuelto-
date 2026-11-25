import { z } from 'zod';
import { VenezuelaUtils } from '../utils/venezuela.js';

export const quickCustomerSchema = z
  .object({
    documentType: z.enum(['V', 'E', 'J', 'G', 'P']),
    documentNumber: z.string().trim().min(5).max(12),
    name: z.string().trim().min(3).max(150),
    phone: z.string().trim().optional(),
  })
  .strict();

export const createCustomerSchema = z
  .object({
    documentType: z.enum(['V', 'E', 'J', 'G', 'P']),
    documentNumber: z.string().trim().min(5).max(12),
    name: z.string().trim().min(3).max(150),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    fiscalAddress: z.string().trim().optional(),
    creditLimit: z.number().min(0).default(0),
  })
  .strict();

export const createSupplierSchema = z
  .object({
    documentType: z.enum(['J', 'G', 'V', 'E']),
    documentNumber: z.string().trim().min(5).max(12),
    name: z.string().trim().min(3).max(150),
    phone: z.string().trim().min(7).max(25),
    email: z.string().trim().email().optional(),
    address: z.string().trim().optional(),
  })
  .strict();

export const createContactSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    roleTitle: z.string().trim().max(80).optional(),
    notes: z.string().trim().optional(),
  })
  .strict();

export const createInteractionSchema = z
  .object({
    channel: z.enum(['LLAMADA', 'VISITA', 'NOTA', 'WHATSAPP', 'EMAIL']),
    summary: z.string().trim().min(3).max(255),
    result: z.string().trim().min(3),
    nextFollowupAt: z.string().datetime().optional(),
  })
  .strict();

export const createProductSchema = z
  .object({
    sku: z.string().trim().max(50).optional(),
    name: z.string().trim().min(2).max(150),
    unitOfMeasure: z.string().trim().max(20).default('UNIDAD').optional(),
    categoryId: z.string().uuid().optional(),
    costPriceUsd: z.number().min(0).default(0),
    salePriceUsd: z.number().min(0),
    taxRate: z.number().default(16.0),
    isExempt: z.boolean().default(false),
    minStockAlert: z.number().default(5),
    barcodes: z
      .array(
        z
          .object({
            barcode: z.string().trim().min(3).max(64),
            barcodeType: z.enum(['EAN13', 'EAN8', 'CODE128', 'UPC', 'INTERNAL']),
            isPrimary: z.boolean().default(true),
          })
          .strict()
      )
      .optional(),
  })
  .strict();

export const createSaleSchema = z
  .object({
    customerId: z.string().uuid(),
    warehouseId: z.string().uuid().optional(),
    exchangeRateId: z.string().uuid(),
    lines: z
      .array(
        z
          .object({
            productId: z.string().uuid(),
            quantity: z.number().positive(),
            unitPriceUsd: z.number().positive(),
          })
          .strict()
      )
      .min(1),
    payments: z
      .array(
        z
          .object({
            paymentMethod: z.enum([
              'CASH_USD',
              'CASH_BS',
              'PAGO_MOVIL',
              'DEBIT_CARD',
              'CREDIT_DEBT',
              'TRANSFER',
              'VUELTO_WALLET',
              'CHANGE_VOUCHER',
            ]),
            currency: z.enum(['USD', 'VES']),
            amount: z.number().positive(),
            referenceNumber: z.string().trim().optional(),
            voucherCode: z.string().trim().optional(),
          })
          .strict()
      )
      .min(1),
    vueltoOption: z
      .object({
        type: z.enum(['CASH', 'WALLET_CREDIT', 'CHANGE_VOUCHER', 'PAGO_MOVIL']),
        amountUsd: z.number().min(0),
        pagoMovilPhone: z.string().trim().optional(),
        pagoMovilBank: z.string().trim().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
