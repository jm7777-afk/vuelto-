import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs';

export interface ReceiptData {
  tenant: {
    businessName: string;
    tradeName: string;
    documentType: string;
    documentNumber: string;
    fiscalAddress: string;
    phone: string;
    isSpecialTaxpayer: boolean;
  };
  sale: {
    id: string;
    invoiceFormattedNumber: string;
    invoiceSeries: string;
    invoiceNumber: number;
    rateValue: string;
    taxableBase16Usd: string;
    taxableBase8Usd: string;
    exemptAmountUsd: string;
    taxAmount16Usd: string;
    taxAmount8Usd: string;
    igtfAmountUsd: string;
    totalAmountUsd: string;
    taxableBase16Bs: string;
    taxableBase8Bs: string;
    exemptAmountBs: string;
    taxAmount16Bs: string;
    taxAmount8Bs: string;
    igtfAmountBs: string;
    totalAmountBs: string;
    createdAt: Date;
    fiscalStatus: string;
  };
  customer: {
    name: string;
    documentType: string;
    documentNumber: string;
    phone?: string | null;
    fiscalAddress?: string | null;
  };
  lines: Array<{
    name: string;
    quantity: number;
    unitPriceUsd: number;
    subtotalUsd: number;
    taxRate: number;
    isExempt: boolean;
  }>;
  payments: Array<{
    paymentMethod: string;
    currency: string;
    amount: number;
  }>;
  vueltoIssued?: {
    type: string;
    amountUsd: string;
    amountBs: string;
    voucherCode?: string;
  };
}

export class ReceiptService {
  /**
   * Genera el documento PDF ligero optimizado para visualización móvil y Share Sheet nativo
   */
  static async generatePdf(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Dimensiones de ticket térmico alargado o formato A6/móvil
      const doc = new PDFDocument({
        size: [226, 650], // 80mm equivalent en puntos tipográficos (~58mm a 80mm compacto)
        margins: { top: 15, bottom: 15, left: 10, right: 10 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // 0. Logo Oficial Vuelto
      const logoPath = path.resolve(process.cwd(), 'public/vuelto-icon.jpg');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, (226 - 36) / 2, 8, { width: 36 });
          doc.moveDown(2);
        } catch {
          // Continuar si hay error de renderizado de imagen
        }
      }

      // 1. Encabezado
      doc.fontSize(10).font('Helvetica-Bold').text(data.tenant.tradeName.toUpperCase(), { align: 'center' });
      doc.fontSize(7).font('Helvetica').text(data.tenant.businessName, { align: 'center' });
      doc.text(`RIF: ${data.tenant.documentType}-${data.tenant.documentNumber}`, { align: 'center' });
      doc.text(data.tenant.fiscalAddress, { align: 'center' });
      doc.text(`Tel: ${data.tenant.phone}`, { align: 'center' });
      doc.moveDown(0.5);

      // Aviso de contingencia legal pre-homologación SENIAT
      doc.fontSize(6).font('Helvetica-Bold').text('*** COMPROBANTE NO FISCAL - ORDEN DE DESPACHO ***', { align: 'center' });
      doc.fontSize(8).font('Helvetica-Bold').text(`FACTURA N°: ${data.sale.invoiceFormattedNumber}`, { align: 'center' });
      doc.fontSize(7).font('Helvetica').text(`Fecha: ${new Date(data.sale.createdAt).toLocaleString('es-VE')}`, { align: 'center' });
      doc.text(`Tasa Oficial BCV: ${data.sale.rateValue} Bs/USD`, { align: 'center' });
      doc.moveDown(0.5);

      // 2. Datos del Cliente
      doc.text('------------------------------------------------', { align: 'center' });
      doc.fontSize(7).font('Helvetica-Bold').text('CLIENTE:');
      doc.font('Helvetica').text(`${data.customer.name}`);
      doc.text(`CI/RIF: ${data.customer.documentType}-${data.customer.documentNumber}`);
      if (data.customer.phone) doc.text(`Tel: ${data.customer.phone}`);
      doc.text('------------------------------------------------', { align: 'center' });
      doc.moveDown(0.3);

      // 3. Detalle de Ítems
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('CANT  DESCRIPCIÓN         P.UNIT    TOTAL');
      doc.font('Helvetica');

      for (const line of data.lines) {
        const shortName = line.name.length > 14 ? line.name.slice(0, 13) + '..' : line.name.padEnd(14);
        const qtyStr = line.quantity.toFixed(0).padEnd(4);
        const priceStr = `$${line.unitPriceUsd.toFixed(2)}`.padEnd(8);
        const totalStr = `$${line.subtotalUsd.toFixed(2)}`;
        doc.text(`${qtyStr}  ${shortName}  ${priceStr}  ${totalStr}`);
      }
      doc.text('------------------------------------------------', { align: 'center' });
      doc.moveDown(0.3);

      // 4. Desglose Fiscal (Providencia 0071/102 e IGTF)
      doc.fontSize(7);
      if (parseFloat(data.sale.taxableBase16Usd) > 0) {
        doc.text(`Base Imponible (16%):   $${data.sale.taxableBase16Usd} (${data.sale.taxableBase16Bs} Bs)`);
        doc.text(`IVA (16%):              $${data.sale.taxAmount16Usd} (${data.sale.taxAmount16Bs} Bs)`);
      }
      if (parseFloat(data.sale.taxableBase8Usd) > 0) {
        doc.text(`Base Imponible (8%):    $${data.sale.taxableBase8Usd} (${data.sale.taxableBase8Bs} Bs)`);
        doc.text(`IVA (8%):               $${data.sale.taxAmount8Usd} (${data.sale.taxAmount8Bs} Bs)`);
      }
      if (parseFloat(data.sale.exemptAmountUsd) > 0) {
        doc.text(`Monto Exento (0%):      $${data.sale.exemptAmountUsd} (${data.sale.exemptAmountBs} Bs)`);
      }
      if (parseFloat(data.sale.igtfAmountUsd) > 0) {
        doc.font('Helvetica-Bold').text(`Percibido IGTF (3%):    $${data.sale.igtfAmountUsd} (${data.sale.igtfAmountBs} Bs)`);
        doc.font('Helvetica');
      }

      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`TOTAL USD: $${data.sale.totalAmountUsd}`, { align: 'right' });
      doc.text(`TOTAL BS:  Bs ${data.sale.totalAmountBs}`, { align: 'right' });
      doc.moveDown(0.5);

      // 5. Vueltos emitidos (si aplica)
      if (data.vueltoIssued) {
        doc.fontSize(7).font('Helvetica-Bold');
        doc.text('*** INFORMACIÓN DE VUELTO ***', { align: 'center' });
        doc.font('Helvetica');
        if (data.vueltoIssued.type === 'WALLET_CREDIT') {
          doc.text(`Vuelto en Monedero: $${data.vueltoIssued.amountUsd} (${data.vueltoIssued.amountBs} Bs)`, { align: 'center' });
          doc.text('Acreditado a su saldo a favor para próxima compra', { align: 'center' });
        } else if (data.vueltoIssued.type === 'CHANGE_VOUCHER') {
          doc.text(`Vale de Cambio: ${data.vueltoIssued.voucherCode}`, { align: 'center' });
          doc.text(`Monto: $${data.vueltoIssued.amountUsd} (${data.vueltoIssued.amountBs} Bs)`, { align: 'center' });
          doc.text('Presente este ticket en su próxima visita', { align: 'center' });
        }
        doc.moveDown(0.5);
      }

      // Pie
      doc.fontSize(6).font('Helvetica').text('Gracias por su preferencia!', { align: 'center' });
      doc.text('Sistema Vuelto - Facturación e Inventario', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Genera el payload de comandos ESC/POS para impresoras térmicas de 58 mm (32 chars) y 80 mm (48 chars)
   */
  static generateEscPos(data: ReceiptData, paperWidth: 58 | 80 = 58): Buffer {
    const lineWidth = paperWidth === 58 ? 32 : 48;
    const divider = '-'.repeat(lineWidth);

    const parts: Buffer[] = [];

    const append = (str: string) => {
      // Convertir a codepage CP1252/ASCII amigable con impresoras chinas económicas
      parts.push(Buffer.from(str, 'latin1'));
    };

    const appendCmd = (bytes: number[]) => {
      parts.push(Buffer.from(bytes));
    };

    // Inicializar impresora ESC @
    appendCmd([0x1b, 0x40]);

    // Centrado: ESC a 1
    appendCmd([0x1b, 0x61, 0x01]);

    // Negrita activada: ESC E 1
    appendCmd([0x1b, 0x45, 0x01]);
    append(`${data.tenant.tradeName.toUpperCase()}\n`);
    // Negrita desactivada: ESC E 0
    appendCmd([0x1b, 0x45, 0x00]);

    append(`${data.tenant.businessName}\n`);
    append(`RIF: ${data.tenant.documentType}-${data.tenant.documentNumber}\n`);
    append(`${data.tenant.phone}\n\n`);

    append(`FACTURA: ${data.sale.invoiceFormattedNumber}\n`);
    append(`Fecha: ${new Date(data.sale.createdAt).toLocaleDateString('es-VE')}\n`);
    append(`Tasa BCV: ${data.sale.rateValue} Bs/$\n`);
    append(`${divider}\n`);

    // Alinear izquierda: ESC a 0
    appendCmd([0x1b, 0x61, 0x00]);
    append(`Cliente: ${data.customer.name.slice(0, lineWidth - 9)}\n`);
    append(`CI/RIF:  ${data.customer.documentType}-${data.customer.documentNumber}\n`);
    append(`${divider}\n`);

    // Líneas
    append('CANT DESCRIPCION        TOTAL\n');
    for (const l of data.lines) {
      const q = l.quantity.toFixed(0).padEnd(4);
      const name = l.name.length > 16 ? l.name.slice(0, 15) + '.' : l.name.padEnd(16);
      const tot = `$${l.subtotalUsd.toFixed(2)}`.padStart(lineWidth - 20);
      append(`${q}${name}${tot}\n`);
    }
    append(`${divider}\n`);

    // Totales
    // Alinear derecha: ESC a 2
    appendCmd([0x1b, 0x61, 0x02]);
    if (parseFloat(data.sale.igtfAmountUsd) > 0) {
      append(`IGTF 3%: $${data.sale.igtfAmountUsd}\n`);
    }
    appendCmd([0x1b, 0x45, 0x01]); // Bold
    append(`TOTAL USD: $${data.sale.totalAmountUsd}\n`);
    append(`TOTAL BS:  ${data.sale.totalAmountBs} Bs\n`);
    appendCmd([0x1b, 0x45, 0x00]);

    // Pie
    appendCmd([0x1b, 0x61, 0x01]); // Center
    append('\nGracias por su compra!\n');
    append('vuelto.ve\n\n\n\n');

    // Apertura Automática de Cajón de Dinero (Cash Drawer vía puerto RJ11)
    // Si la venta contiene pagos en efectivo (CASH_USD o CASH_BS), disparar el pulso eléctrico
    const hasCashPayment = data.payments.some(
      (p) => p.paymentMethod === 'CASH_USD' || p.paymentMethod === 'CASH_BS'
    );
    if (hasCashPayment) {
      // Comando ESC p 0 25 250 (pulso en Pin 2 de RJ11)
      appendCmd([0x1b, 0x70, 0x00, 0x19, 0xfa]);
      // Comando ESC p 1 25 250 (pulso en Pin 5 de RJ11 para compatibilidad total)
      appendCmd([0x1b, 0x70, 0x01, 0x19, 0xfa]);
    }

    // Cortar papel: GS V 66 0
    appendCmd([0x1d, 0x56, 0x42, 0x00]);

    return Buffer.concat(parts);
  }
}
