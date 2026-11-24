import { describe, it, expect } from 'vitest';
import { VenezuelaUtils } from '../src/utils/venezuela.js';
import { ReceiptService, ReceiptData } from '../src/services/receipt.service.js';

describe('Recomendaciones Avanzadas Implementadas', () => {
  describe('1. Parser de Balanzas Electrónicas (Charcutería/Carnicería)', () => {
    it('debe extraer el SKU y el peso exacto en kilogramos de códigos de balanza (prefijos 20, 21, 22)', () => {
      // Código de balanza: 20 (prefijo) + 0142 (código de queso blanco) + 00450 (450 gramos) + 6 (verificador)
      const scaleBarcode = '200142004506';
      const parsed = VenezuelaUtils.parseScaleBarcode(scaleBarcode);

      expect(parsed.isScaleBarcode).toBe(true);
      expect(parsed.sku).toBe('0142');
      expect(parsed.weightGrams).toBe(450);
      expect(parsed.weightKg).toBe(0.45);
    });

    it('debe indicar isScaleBarcode: false para códigos normales de fabricante (prefijo 759)', () => {
      const normalBarcode = '7591234567894';
      const parsed = VenezuelaUtils.parseScaleBarcode(normalBarcode);

      expect(parsed.isScaleBarcode).toBe(false);
      expect(parsed.sku).toBeUndefined();
    });
  });

  describe('2. Disparo Automático de Cajón de Dinero (Cash Drawer RJ11) en ESC/POS', () => {
    const cashReceiptData: ReceiptData = {
      tenant: {
        tradeName: 'Bodega Don Pedro',
        businessName: 'Inversiones Don Pedro C.A.',
        documentType: 'J',
        documentNumber: '123456789',
        fiscalAddress: 'Caracas, Venezuela',
        phone: '04141234567',
        isSpecialTaxpayer: false,
      },
      sale: {
        id: 'sale-1',
        invoiceFormattedNumber: 'A-00000010',
        invoiceSeries: 'A',
        invoiceNumber: 10,
        rateValue: '52.5000',
        taxableBase16Usd: '5.00',
        taxableBase8Usd: '0.00',
        exemptAmountUsd: '0.00',
        taxAmount16Usd: '0.80',
        taxAmount8Usd: '0.00',
        igtfAmountUsd: '0.00',
        totalAmountUsd: '5.80',
        taxableBase16Bs: '262.50',
        taxableBase8Bs: '0.00',
        exemptAmountBs: '0.00',
        taxAmount16Bs: '42.00',
        taxAmount8Bs: '0.00',
        igtfAmountBs: '0.00',
        totalAmountBs: '304.50',
        createdAt: new Date(),
        fiscalStatus: 'PENDING',
      },
      customer: {
        name: 'Cliente Mostrador',
        documentType: 'V',
        documentNumber: '12345678',
      },
      lines: [
        { name: 'Arroz 1kg', quantity: 5, unitPriceUsd: 1.00, subtotalUsd: 5.00, taxRate: 16, isExempt: false },
      ],
      // Pago en Efectivo USD -> Debe disparar pulso de cajón de dinero
      payments: [
        { paymentMethod: 'CASH_USD', currency: 'USD', amount: 5.80 },
      ],
    };

    it('debe incluir el comando ESC/POS de pulso de cajón (ESC p 0 25 250) cuando hay pago en efectivo', () => {
      const escpos = ReceiptService.generateEscPos(cashReceiptData, 58);

      // Byte sequence para ESC p 0 25 250: [0x1b, 0x70, 0x00, 0x19, 0xfa]
      const pulseBytes = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
      expect(escpos.includes(pulseBytes)).toBe(true);
    });

    it('NO debe disparar el cajón de dinero si el pago fue 100% digital (ej. Pago Móvil o Débito)', () => {
      const digitalReceipt = {
        ...cashReceiptData,
        payments: [{ paymentMethod: 'PAGO_MOVIL', currency: 'VES', amount: 304.50 }],
      };

      const escpos = ReceiptService.generateEscPos(digitalReceipt, 58);
      const pulseBytes = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
      expect(escpos.includes(pulseBytes)).toBe(false);
    });
  });

  describe('3. Generador de QR Dinámico de Pago Móvil Interoperable', () => {
    it('debe formatear el payload estándar bancario con RIF, banco, teléfono y monto exacto en Bs', () => {
      const payload = VenezuelaUtils.generatePagoMovilQrPayload({
        bankCode: '0102', // Banco de Venezuela
        phone: '0414 123 4567',
        documentType: 'J',
        documentNumber: '12345678-9',
        amountBs: 845.25,
        concept: 'Factura-A000042',
      });

      expect(payload).toBe('PAGOMOVIL:J123456789:0102:04141234567:845.25:Factura-A000042');
    });
  });
});
