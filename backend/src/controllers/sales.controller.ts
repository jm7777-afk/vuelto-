import { Request, Response, NextFunction } from 'express';
import { SalesService } from '../services/sales.service.js';
import { ReceiptService } from '../services/receipt.service.js';
import { AuditService } from '../services/audit.service.js';
import { db } from '../db/index.js';
import { sales, saleLines, customers, tenants, products } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export class SalesController {
  static async confirmSale(req: Request, res: Response, next: NextFunction) {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body.idempotencyKey as string);
      if (!idempotencyKey) {
        res.status(400).json({
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'El header Idempotency-Key es obligatorio para confirmar una venta.',
        });
        return;
      }

      const result = await SalesService.confirmSale(
        req.tenantId!,
        req.user!.id,
        idempotencyKey,
        req.body
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Sincronización en Lote para Modo Offline (Store-and-Forward)
   * Permite que la app móvil transmita todas las ventas acumuladas durante una caída de internet.
   */
  static async syncBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { batchId, sales: offlineSales } = req.body;
      if (!Array.isArray(offlineSales) || offlineSales.length === 0) {
        res.status(400).json({ code: 'INVALID_BATCH', message: 'Debe enviar un arreglo de ventas para sincronizar.' });
        return;
      }

      const results: any[] = [];
      let syncedCount = 0;
      let failedCount = 0;

      for (const item of offlineSales) {
        try {
          const synced = await SalesService.confirmSale(
            req.tenantId!,
            req.user!.id,
            item.idempotencyKey || `offline_${item.localOfflineId}`,
            item
          );
          results.push({
            localOfflineId: item.localOfflineId,
            status: 'CONSOLIDATED',
            invoiceFormattedNumber: synced.invoiceFormattedNumber,
            totalUsd: synced.totalAmountUsd,
          });
          syncedCount++;
        } catch (err: any) {
          results.push({
            localOfflineId: item.localOfflineId,
            status: 'FAILED',
            error: err.message,
          });
          failedCount++;
        }
      }

      res.status(200).json({
        batchId: batchId || `batch_${Date.now()}`,
        syncedCount,
        failedCount,
        results,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPdfReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const saleId = String(req.params.id);

      // Obtener venta con tenant, cliente y líneas
      const [sale] = await db
        .select()
        .from(sales)
        .where(and(eq(sales.tenantId, tenantId), eq(sales.id, saleId)));

      if (!sale) {
        res.status(404).json({ code: 'SALE_NOT_FOUND', message: 'Venta no encontrada' });
        return;
      }

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      const [customer] = await db.select().from(customers).where(eq(customers.id, sale.customerId));
      
      const lines = await db
        .select({
          name: products.name,
          quantity: saleLines.quantity,
          unitPriceUsd: saleLines.unitPriceUsd,
          subtotalUsd: saleLines.subtotalUsd,
          taxRate: saleLines.taxRate,
          isExempt: saleLines.isExempt,
        })
        .from(saleLines)
        .innerJoin(products, eq(saleLines.productId, products.id))
        .where(eq(saleLines.saleId, sale.id));

      const pdfBuffer = await ReceiptService.generatePdf({
        tenant: tenant as any,
        sale: {
          ...sale,
          taxableBase16Usd: sale.taxableBase16Usd,
          taxableBase8Usd: sale.taxableBase8Usd,
          exemptAmountUsd: sale.exemptAmountUsd,
          taxAmount16Usd: sale.taxAmount16Usd,
          taxAmount8Usd: sale.taxAmount8Usd,
          igtfAmountUsd: sale.igtfAmountUsd,
          totalAmountUsd: sale.totalAmountUsd,
          taxableBase16Bs: sale.taxableBase16Bs,
          taxableBase8Bs: sale.taxableBase8Bs,
          exemptAmountBs: sale.exemptAmountBs,
          taxAmount16Bs: sale.taxAmount16Bs,
          taxAmount8Bs: sale.taxAmount8Bs,
          igtfAmountBs: sale.igtfAmountBs,
          totalAmountBs: sale.totalAmountBs,
        },
        customer: customer as any,
        lines: lines.map((l) => ({
          name: l.name,
          quantity: parseFloat(l.quantity),
          unitPriceUsd: parseFloat(l.unitPriceUsd),
          subtotalUsd: parseFloat(l.subtotalUsd),
          taxRate: parseFloat(l.taxRate),
          isExempt: l.isExempt,
        })),
        payments: [],
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=factura_${sale.invoiceFormattedNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  static async getEscPosReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const saleId = String(req.params.id);
      const paperWidth = (req.body.paper_width === 80 ? 80 : 58) as 58 | 80;

      const [sale] = await db
        .select()
        .from(sales)
        .where(and(eq(sales.tenantId, tenantId), eq(sales.id, saleId)));

      if (!sale) {
        res.status(404).json({ code: 'SALE_NOT_FOUND', message: 'Venta no encontrada' });
        return;
      }

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      const [customer] = await db.select().from(customers).where(eq(customers.id, sale.customerId));
      
      const lines = await db
        .select({
          name: products.name,
          quantity: saleLines.quantity,
          unitPriceUsd: saleLines.unitPriceUsd,
          subtotalUsd: saleLines.subtotalUsd,
          taxRate: saleLines.taxRate,
          isExempt: saleLines.isExempt,
        })
        .from(saleLines)
        .innerJoin(products, eq(saleLines.productId, products.id))
        .where(eq(saleLines.saleId, sale.id));

      const escposBuffer = ReceiptService.generateEscPos({
        tenant: tenant as any,
        sale: sale as any,
        customer: customer as any,
        lines: lines.map((l) => ({
          name: l.name,
          quantity: parseFloat(l.quantity),
          unitPriceUsd: parseFloat(l.unitPriceUsd),
          subtotalUsd: parseFloat(l.subtotalUsd),
          taxRate: parseFloat(l.taxRate),
          isExempt: l.isExempt,
        })),
        payments: [],
      }, paperWidth);

      res.json({
        paperWidth,
        base64Data: escposBuffer.toString('base64'),
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const salesList = await db
        .select({
          id: sales.id,
          invoiceSeries: sales.invoiceSeries,
          invoiceNumber: sales.invoiceNumber,
          invoiceFormattedNumber: sales.invoiceFormattedNumber,
          rateValue: sales.rateValue,
          taxableBase16Usd: sales.taxableBase16Usd,
          taxableBase8Usd: sales.taxableBase8Usd,
          exemptAmountUsd: sales.exemptAmountUsd,
          taxAmount16Usd: sales.taxAmount16Usd,
          taxAmount8Usd: sales.taxAmount8Usd,
          igtfAmountUsd: sales.igtfAmountUsd,
          totalAmountUsd: sales.totalAmountUsd,
          totalAmountBs: sales.totalAmountBs,
          status: sales.status,
          fiscalStatus: sales.fiscalStatus,
          createdAt: sales.createdAt,
          customerId: sales.customerId,
          userId: sales.userId,
          customerName: customers.name,
          customerDocType: customers.documentType,
          customerDocNumber: customers.documentNumber,
        })
        .from(sales)
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .where(eq(sales.tenantId, tenantId))
        .orderBy(desc(sales.createdAt))
        .limit(limit);

      res.json(salesList);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const saleId = String(req.params.id);
      const [sale] = await db
        .select()
        .from(sales)
        .where(and(eq(sales.tenantId, req.tenantId!), eq(sales.id, saleId)))
        .limit(1);

      if (!sale) {
        res.status(404).json({ code: 'SALE_NOT_FOUND', message: 'Venta no encontrada' });
        return;
      }

      const lines = await db
        .select({
          id: saleLines.id,
          productId: saleLines.productId,
          productName: products.name,
          sku: products.sku,
          quantity: saleLines.quantity,
          unitPriceUsd: saleLines.unitPriceUsd,
          subtotalUsd: saleLines.subtotalUsd,
          taxRate: saleLines.taxRate,
          taxAmountUsd: saleLines.taxAmountUsd,
          totalUsd: saleLines.totalUsd,
          totalBs: saleLines.totalBs,
        })
        .from(saleLines)
        .innerJoin(products, eq(saleLines.productId, products.id))
        .where(eq(saleLines.saleId, sale.id));

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, sale.customerId))
        .limit(1);

      res.json({
        ...sale,
        customer,
        lines,
      });
    } catch (err) {
      next(err);
    }
  }

  static async auditShare(req: Request, res: Response, next: NextFunction) {
    try {
      const { result, channel } = req.body;
      await AuditService.log({
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'RECEIPT_SHARED',
        entity: 'sale',
        entityId: String(req.params.id),
        payload: { result, sharedVia: 'NATIVE_OS_SHARE_SHEET' },
        result: result === 'share_sheet_opened' ? 'SUCCESS' : result === 'share_cancelled' ? 'SHARE_CANCELLED' : 'SHARE_ERROR',
        channel: channel || 'POS_MOBILE',
      });
      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  }

  static async auditPrint(req: Request, res: Response, next: NextFunction) {
    try {
      const { result, channel, printerType } = req.body;
      await AuditService.log({
        tenantId: req.tenantId!,
        userId: req.user!.id,
        action: 'RECEIPT_PRINT_ATTEMPT',
        entity: 'sale',
        entityId: String(req.params.id),
        payload: { result, printerType: printerType || 'BLUETOOTH_58MM' },
        result: result === 'success' ? 'SUCCESS' : result === 'printer_unavailable' ? 'PRINTER_UNAVAILABLE' : 'FAILED',
        channel: channel || 'POS_MOBILE',
      });
      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  }
}
