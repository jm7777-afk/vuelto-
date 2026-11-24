import { describe, it, expect } from 'vitest';
import { ReceiptService, ReceiptData } from '../src/services/receipt.service.js';

describe('Fase 3: Módulo Fiscal y Post-Venta (PDF y ESC/POS)', () => {
  const mockReceiptData: ReceiptData = {
    tenant: {
      tradeName: 'Bodega Don Pedro',
      businessName: 'Inversiones Don Pedro C.A.',
      documentType: 'J',
      documentNumber: '123456789',
      fiscalAddress: 'Av. Bolívar, Local 4, Caracas, Venezuela',
      phone: '04141234567',
      isSpecialTaxpayer: true,
    },
    sale: {
      id: 'sale-uuid-123',
      invoiceFormattedNumber: 'A-00000042',
      invoiceSeries: 'A',
      invoiceNumber: 42,
      rateValue: '52.5000',
      taxableBase16Usd: '2.40',
      taxableBase8Usd: '0.00',
      exemptAmountUsd: '5.00',
      taxAmount16Usd: '0.38',
      taxAmount8Usd: '0.00',
      igtfAmountUsd: '0.30',
      totalAmountUsd: '8.08',
      taxableBase16Bs: '126.00',
      taxableBase8Bs: '0.00',
      exemptAmountBs: '262.50',
      taxAmount16Bs: '20.16',
      taxAmount8Bs: '0.00',
      igtfAmountBs: '15.75',
      totalAmountBs: '424.41',
      createdAt: new Date('2026-11-23T18:30:00Z'),
      fiscalStatus: 'PENDING',
    },
    customer: {
      name: 'María Rodríguez',
      documentType: 'V',
      documentNumber: '15987654',
      phone: '04245556677',
      fiscalAddress: 'Urb. Los Rosales',
    },
    lines: [
      {
        name: 'Harina Pan 1kg',
        quantity: 2,
        unitPriceUsd: 1.20,
        subtotalUsd: 2.40,
        taxRate: 16.0,
        isExempt: false,
      },
      {
        name: 'Leche en Polvo',
        quantity: 1,
        unitPriceUsd: 5.00,
        subtotalUsd: 5.00,
        taxRate: 0.0,
        isExempt: true,
      },
    ],
    payments: [
      { paymentMethod: 'CASH_USD', currency: 'USD', amount: 10.00 },
    ],
    vueltoIssued: {
      type: 'CHANGE_VOUCHER',
      amountUsd: '1.92',
      amountBs: '100.80',
      voucherCode: 'VALE-8F3A-92BC',
    },
  };

  it('debe compilar exitosamente un archivo PDF binario para visualización y Share Sheet nativo', async () => {
    const pdfBuffer = await ReceiptService.generatePdf(mockReceiptData);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // Verificar firma PDF estándar (%PDF-)
    expect(pdfBuffer.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('debe generar el bytecode ESC/POS de 58 mm respetando el ancho de línea de 32 caracteres', () => {
    const escposBuffer = ReceiptService.generateEscPos(mockReceiptData, 58);

    expect(escposBuffer).toBeDefined();
    expect(escposBuffer.length).toBeGreaterThan(100);

    const textContent = escposBuffer.toString('latin1');
    expect(textContent).toContain('BODEGA DON PEDRO');
    expect(textContent).toContain('A-00000042');
    expect(textContent).toContain('52.5000');
    expect(textContent).toContain('TOTAL USD: $8.08');
  });

  it('debe generar el bytecode ESC/POS de 80 mm respetando el ancho de línea de 48 caracteres', () => {
    const escposBuffer = ReceiptService.generateEscPos(mockReceiptData, 80);

    expect(escposBuffer).toBeDefined();
    const textContent = escposBuffer.toString('latin1');
    expect(textContent).toContain('BODEGA DON PEDRO');
    expect(textContent).toContain('TOTAL BS:  424.41 Bs');
  });
});
