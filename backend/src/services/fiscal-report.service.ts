import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sales, customers, tenants } from '../db/schema.js';

export interface SalesBookRow {
  operationNumber: number;
  invoiceDate: string;
  customerRif: string;
  customerName: string;
  invoiceNumber: string;
  invoiceSeries: string;
  totalWithTaxBs: number;
  exemptBs: number;
  taxableBase16Bs: number;
  taxRate16: number;
  taxAmount16Bs: number;
  taxableBase8Bs: number;
  taxRate8: number;
  taxAmount8Bs: number;
  igtfBaseBs: number;
  igtfAmountBs: number;
  rateValue: number;
  totalUsd: number;
}

export class FiscalReportService {
  /**
   * Genera el Libro de Ventas Fiscal conforme a la Providencia SENIAT 0071 / 102
   * y la Ley del IGTF (Reforma Gaceta N° 6.687 Extraordinario).
   */
  static async getSalesBookData(
    tenantId: string,
    options: { year?: number; month?: number }
  ): Promise<{ tenant: any; rows: SalesBookRow[]; summary: any }> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error('Tenant no encontrado');

    const conditions = [eq(sales.tenantId, tenantId)];

    if (options.year && options.month) {
      const startDate = new Date(Date.UTC(options.year, options.month - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(options.year, options.month, 0, 23, 59, 59));
      conditions.push(gte(sales.createdAt, startDate));
      conditions.push(lte(sales.createdAt, endDate));
    }

    const salesList = await db
      .select({
        id: sales.id,
        invoiceFormattedNumber: sales.invoiceFormattedNumber,
        invoiceSeries: sales.invoiceSeries,
        invoiceNumber: sales.invoiceNumber,
        createdAt: sales.createdAt,
        rateValue: sales.rateValue,
        taxableBase16Bs: sales.taxableBase16Bs,
        taxableBase8Bs: sales.taxableBase8Bs,
        exemptAmountBs: sales.exemptAmountBs,
        taxAmount16Bs: sales.taxAmount16Bs,
        taxAmount8Bs: sales.taxAmount8Bs,
        igtfAmountBs: sales.igtfAmountBs,
        totalAmountBs: sales.totalAmountBs,
        totalAmountUsd: sales.totalAmountUsd,
        customerName: customers.name,
        customerDocType: customers.documentType,
        customerDocNumber: customers.documentNumber,
      })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(sales.invoiceNumber);

    let totalVentasBs = 0;
    let totalExentoBs = 0;
    let totalBase16Bs = 0;
    let totalIva16Bs = 0;
    let totalBase8Bs = 0;
    let totalIva8Bs = 0;
    let totalIgtfBs = 0;
    let totalVentasUsd = 0;

    const rows: SalesBookRow[] = salesList.map((sale, index) => {
      const totalBs = parseFloat(sale.totalAmountBs);
      const exentoBs = parseFloat(sale.exemptAmountBs);
      const base16Bs = parseFloat(sale.taxableBase16Bs);
      const iva16Bs = parseFloat(sale.taxAmount16Bs);
      const base8Bs = parseFloat(sale.taxableBase8Bs);
      const iva8Bs = parseFloat(sale.taxAmount8Bs);
      const igtfBs = parseFloat(sale.igtfAmountBs);
      const totalUsd = parseFloat(sale.totalAmountUsd);

      totalVentasBs += totalBs;
      totalExentoBs += exentoBs;
      totalBase16Bs += base16Bs;
      totalIva16Bs += iva16Bs;
      totalBase8Bs += base8Bs;
      totalIva8Bs += iva8Bs;
      totalIgtfBs += igtfBs;
      totalVentasUsd += totalUsd;

      return {
        operationNumber: index + 1,
        invoiceDate: new Date(sale.createdAt).toLocaleDateString('es-VE'),
        customerRif: `${sale.customerDocType}-${sale.customerDocNumber}`,
        customerName: sale.customerName,
        invoiceNumber: sale.invoiceFormattedNumber,
        invoiceSeries: sale.invoiceSeries,
        totalWithTaxBs: totalBs,
        exemptBs: exentoBs,
        taxableBase16Bs: base16Bs,
        taxRate16: 16.0,
        taxAmount16Bs: iva16Bs,
        taxableBase8Bs: base8Bs,
        taxRate8: 8.0,
        taxAmount8Bs: iva8Bs,
        igtfBaseBs: igtfBs > 0 ? igtfBs / 0.03 : 0,
        igtfAmountBs: igtfBs,
        rateValue: parseFloat(sale.rateValue),
        totalUsd,
      };
    });

    return {
      tenant,
      rows,
      summary: {
        totalFacturas: rows.length,
        totalVentasBs: parseFloat(totalVentasBs.toFixed(2)),
        totalExentoBs: parseFloat(totalExentoBs.toFixed(2)),
        totalBase16Bs: parseFloat(totalBase16Bs.toFixed(2)),
        totalIva16Bs: parseFloat(totalIva16Bs.toFixed(2)),
        totalBase8Bs: parseFloat(totalBase8Bs.toFixed(2)),
        totalIva8Bs: parseFloat(totalIva8Bs.toFixed(2)),
        totalIgtfBs: parseFloat(totalIgtfBs.toFixed(2)),
        totalVentasUsd: parseFloat(totalVentasUsd.toFixed(2)),
      },
    };
  }

  /**
   * Exporta el Libro de Ventas en formato CSV oficial con BOM UTF-8
   * compatible directamente con Microsoft Excel para contadores venezolanos.
   */
  static async exportSalesBookCsv(
    tenantId: string,
    options: { year?: number; month?: number }
  ): Promise<string> {
    const { tenant, rows, summary } = await this.getSalesBookData(tenantId, options);

    const periodStr = options.month && options.year ? `${options.month}/${options.year}` : 'Consolidado General';

    // Encabezado Fiscal Oficial
    let csv = '\uFEFF'; // BOM UTF-8 para apertura directa en Excel sin caracteres rotos
    csv += `LIBRO DE VENTAS FISCAL (PROVIDENCIA SENIAT 0071 / 102)\n`;
    csv += `Razón Social:;${tenant.businessName}\n`;
    csv += `RIF:;${tenant.documentType}-${tenant.documentNumber}\n`;
    csv += `Dirección Fiscal:;${tenant.fiscalAddress.replace(/\n/g, ' ')}\n`;
    csv += `Período Fiscal:;${periodStr}\n\n`;

    // Cabecera de Columnas
    const headers = [
      'N° Operación',
      'Fecha Factura',
      'RIF/Cédula Comprador',
      'Nombre o Razón Social',
      'N° Factura',
      'Total Ventas Incluyendo IVA (Bs)',
      'Ventas Exentas (Bs)',
      'Base Imponible Alícuota 16% (Bs)',
      '% Alíc.',
      'Impuesto IVA 16% (Bs)',
      'Base Imponible Alícuota 8% (Bs)',
      '% Alíc.',
      'Impuesto IVA 8% (Bs)',
      'Percibido IGTF 3% (Bs)',
      'Tasa BCV (Bs/$)',
      'Total Venta (USD)',
    ];
    csv += headers.join(';') + '\n';

    // Filas
    for (const r of rows) {
      const line = [
        r.operationNumber,
        r.invoiceDate,
        r.customerRif,
        `"${r.customerName.replace(/"/g, '""')}"`,
        r.invoiceNumber,
        r.totalWithTaxBs.toFixed(2).replace('.', ','),
        r.exemptBs.toFixed(2).replace('.', ','),
        r.taxableBase16Bs.toFixed(2).replace('.', ','),
        '16%',
        r.taxAmount16Bs.toFixed(2).replace('.', ','),
        r.taxableBase8Bs.toFixed(2).replace('.', ','),
        '8%',
        r.taxAmount8Bs.toFixed(2).replace('.', ','),
        r.igtfAmountBs.toFixed(2).replace('.', ','),
        r.rateValue.toFixed(4).replace('.', ','),
        r.totalUsd.toFixed(2).replace('.', ','),
      ];
      csv += line.join(';') + '\n';
    }

    // Totales
    csv += `\nTOTALES:;;;;;${summary.totalVentasBs.toFixed(2).replace('.', ',')};${summary.totalExentoBs.toFixed(2).replace('.', ',')};${summary.totalBase16Bs.toFixed(2).replace('.', ',')};;${summary.totalIva16Bs.toFixed(2).replace('.', ',')};${summary.totalBase8Bs.toFixed(2).replace('.', ',')};;${summary.totalIva8Bs.toFixed(2).replace('.', ',')};${summary.totalIgtfBs.toFixed(2).replace('.', ',')};;${summary.totalVentasUsd.toFixed(2).replace('.', ',')}\n`;

    return csv;
  }
}
