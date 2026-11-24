import crypto from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  sales,
  saleLines,
  payments,
  products,
  productStock,
  inventoryMovements,
  invoiceSequences,
  exchangeRateSnapshots,
  customers,
  warehouses,
  idempotencyKeys,
  tenants,
  tenantConfigurations,
} from '../db/schema.js';
import { VoucherService } from './voucher.service.js';
import { AuditService } from './audit.service.js';
import { MockPaymentGateway } from '../gateways/mock-payment.gateway.js';

export interface ConfirmSaleLineInput {
  productId: string;
  quantity: number;
  unitPriceUsd: number;
}

export interface ConfirmSalePaymentInput {
  paymentMethod: 'CASH_USD' | 'CASH_BS' | 'PAGO_MOVIL' | 'DEBIT_CARD' | 'CREDIT_DEBT' | 'TRANSFER' | 'VUELTO_WALLET' | 'CHANGE_VOUCHER';
  currency: 'USD' | 'VES';
  amount: number;
  referenceNumber?: string;
  voucherCode?: string;
}

export interface ConfirmSaleInput {
  customerId: string;
  warehouseId?: string;
  exchangeRateId: string;
  lines: ConfirmSaleLineInput[];
  payments: ConfirmSalePaymentInput[];
  adminAuthorized?: boolean;
  vueltoOption?: {
    type: 'CASH' | 'WALLET_CREDIT' | 'CHANGE_VOUCHER' | 'PAGO_MOVIL';
    amountUsd: number;
    pagoMovilPhone?: string;
    pagoMovilBank?: string;
  };
}

export class SalesService {
  /**
   * Confirmación Atómica e Idempotente de Venta (SENIAT Compliant)
   * - Bloqueo pesimista de correlativo sin saltos
   * - Recálculo obligatorio de bases imponibles (16%, 8%, 0%) en servidor
   * - Determinación automática de IGTF (3%) en pagos en efectivo divisas
   * - Descuento de stock en Kardex
   * - Gestión de Vueltos (Monedero, Vale Impreso, Pago Móvil o Efectivo)
   */
  static async confirmSale(
    tenantId: string,
    userId: string,
    idempotencyKey: string,
    input: ConfirmSaleInput
  ) {
    // 1. Verificación de Idempotencia previa
    const paramsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');

    const [existingIdempotency] = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.tenantId, tenantId),
          eq(idempotencyKeys.userId, userId),
          eq(idempotencyKeys.key, idempotencyKey)
        )
      );

    if (existingIdempotency && existingIdempotency.responseBody) {
      // Reintento de red: devolver exactamente la misma respuesta sin reprocesar
      return existingIdempotency.responseBody as any;
    }

    // 2. Ejecutar transacción atómica en PostgreSQL
    const saleResult = await db.transaction(async (tx) => {
      // A. Validar Tenant y Contribuyente Especial
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId));

      if (!tenant) throw new Error('Tenant no encontrado');

      // A2. Obtener Configuración del Tenant (Desafiliación IVA/IGTF, Margen y Reglas de Mora)
      const [config] = await tx
        .select()
        .from(tenantConfigurations)
        .where(eq(tenantConfigurations.tenantId, tenantId))
        .limit(1);

      const enableIva = config ? config.enableIva : true;
      const enableIgtf = config ? config.enableIgtf : true;
      const requireAdminForDebt = config ? config.requireAdminForOverdueDebt : true;

      // B. Validar Almacén
      let warehouseId = input.warehouseId;
      if (!warehouseId) {
        const [defaultWh] = await tx
          .select()
          .from(warehouses)
          .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.isActive, true)))
          .limit(1);
        if (!defaultWh) throw new Error('No se encontró un almacén activo');
        warehouseId = defaultWh.id;
      }

      // C. Obtener Tasa de Cambio Congelada
      const [rateSnapshot] = await tx
        .select()
        .from(exchangeRateSnapshots)
        .where(
          and(
            eq(exchangeRateSnapshots.tenantId, tenantId),
            eq(exchangeRateSnapshots.id, input.exchangeRateId)
          )
        );

      if (!rateSnapshot) {
        throw new Error('Tasa de cambio no encontrada o no válida');
      }

      const rateValue = parseFloat(rateSnapshot.rate);

      // D. Validar Cliente y verificación de mora/bloqueo de crédito
      const [customer] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.id, input.customerId)));

      if (!customer) {
        throw new Error('Cliente no encontrado');
      }

      const customerBalanceDue = parseFloat(customer.balanceDue || '0');
      const isSpecialCustomer = (customer as any).isSpecialMoraCustomer || customerBalanceDue > 0;
      const hasCreditPayment = input.payments.some((p) => p.paymentMethod === 'CREDIT_DEBT');

      if (hasCreditPayment && isSpecialCustomer && requireAdminForDebt && !input.adminAuthorized) {
        throw new Error(
          `El cliente "${customer.name}" presenta saldo deudor / mora activa ($${customerBalanceDue.toFixed(2)} USD). Esta venta a crédito requiere autorización del Administrador.`
        );
      }

      // E. Recalcular Líneas, Precios, Bases Imponibles e IVA
      let taxableBase16Usd = 0;
      let taxableBase8Usd = 0;
      let exemptAmountUsd = 0;
      let taxAmount16Usd = 0;
      let taxAmount8Usd = 0;
      let subtotalUsd = 0;

      const processedLines: any[] = [];

      for (const line of input.lines) {
        const [prod] = await tx
          .select()
          .from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.id, line.productId)));

        if (!prod || !prod.isActive) {
          throw new Error(`Producto ${line.productId} no encontrado o inactivo`);
        }

        const unitPrice = line.unitPriceUsd;
        const lineSubtotal = line.quantity * unitPrice;
        const taxRate = parseFloat(prod.taxRate);
        let lineTax = 0;

        // Si el comercio desafilió el IVA (emprendimiento no registrado) o el producto es exento
        if (!enableIva || prod.isExempt || taxRate === 0) {
          exemptAmountUsd += lineSubtotal;
        } else if (taxRate === 16.0) {
          taxableBase16Usd += lineSubtotal;
          lineTax = lineSubtotal * 0.16;
          taxAmount16Usd += lineTax;
        } else if (taxRate === 8.0) {
          taxableBase8Usd += lineSubtotal;
          lineTax = lineSubtotal * 0.08;
          taxAmount8Usd += lineTax;
        }

        subtotalUsd += lineSubtotal;

        processedLines.push({
          productId: prod.id,
          name: prod.name,
          quantity: line.quantity,
          unitCostUsd: parseFloat(prod.costPriceUsd),
          unitPriceUsd: unitPrice,
          taxRate: enableIva ? taxRate : 0,
          isExempt: !enableIva || prod.isExempt,
          subtotalUsd: lineSubtotal,
          taxAmountUsd: lineTax,
          totalUsd: lineSubtotal + lineTax,
          subtotalBs: lineSubtotal * rateValue,
          taxAmountBs: lineTax * rateValue,
          totalBs: (lineSubtotal + lineTax) * rateValue,
        });

        // Validar y Descontar Stock
        const [stock] = await tx
          .select()
          .from(productStock)
          .where(
            and(
              eq(productStock.tenantId, tenantId),
              eq(productStock.warehouseId, warehouseId),
              eq(productStock.productId, prod.id)
            )
          );

        const currentQty = stock ? parseFloat(stock.quantity) : 0;
        if (!prod.allowNegativeStock && currentQty < line.quantity) {
          throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${currentQty}`);
        }

        const newQty = currentQty - line.quantity;
        if (stock) {
          await tx
            .update(productStock)
            .set({ quantity: newQty.toFixed(3), updatedAt: new Date() })
            .where(eq(productStock.id, stock.id));
        } else {
          await tx.insert(productStock).values({
            tenantId,
            warehouseId,
            productId: prod.id,
            quantity: newQty.toFixed(3),
          });
        }
      }

      // F. Cálculo de IGTF (3% sobre divisas en efectivo para Contribuyentes Especiales)
      let cashUsdPayments = 0;
      for (const p of input.payments) {
        if (p.paymentMethod === 'CASH_USD') {
          cashUsdPayments += p.currency === 'USD' ? p.amount : p.amount / rateValue;
        }
      }

      let igtfAmountUsd = 0;
      if (enableIgtf && tenant.isSpecialTaxpayer && cashUsdPayments > 0) {
        igtfAmountUsd = cashUsdPayments * 0.03;
      }

      const totalAmountUsd = subtotalUsd + taxAmount16Usd + taxAmount8Usd + igtfAmountUsd;
      const totalAmountBs = totalAmountUsd * rateValue;

      // G. Asignar Correlativo Consecutivo sin Saltos (Lock Pesimista)
      const series = 'A';
      // Bloqueo SELECT ... FOR UPDATE en la secuencia
      const [seq] = await tx
        .select()
        .from(invoiceSequences)
        .where(and(eq(invoiceSequences.tenantId, tenantId), eq(invoiceSequences.series, series)))
        .for('update');

      let nextNumber = 1;
      let prefix = 'FACT-';

      if (seq) {
        nextNumber = seq.currentNumber + 1;
        prefix = seq.prefix;
        await tx
          .update(invoiceSequences)
          .set({ currentNumber: nextNumber, updatedAt: new Date() })
          .where(eq(invoiceSequences.id, seq.id));
      } else {
        await tx.insert(invoiceSequences).values({
          tenantId,
          series,
          currentNumber: 1,
          prefix: 'FACT-',
        });
      }

      const invoiceFormattedNumber = `${series}-${String(nextNumber).padStart(8, '0')}`;

      // H. Persistir Registro Principal de Venta / Factura
      const [sale] = await tx
        .insert(sales)
        .values({
          tenantId,
          userId,
          customerId: input.customerId,
          warehouseId,
          invoiceSeries: series,
          invoiceNumber: nextNumber,
          invoiceFormattedNumber,
          exchangeRateId: input.exchangeRateId,
          rateValue: rateValue.toFixed(4),
          taxableBase16Usd: taxableBase16Usd.toFixed(2),
          taxableBase8Usd: taxableBase8Usd.toFixed(2),
          exemptAmountUsd: exemptAmountUsd.toFixed(2),
          taxAmount16Usd: taxAmount16Usd.toFixed(2),
          taxAmount8Usd: taxAmount8Usd.toFixed(2),
          igtfAmountUsd: igtfAmountUsd.toFixed(2),
          totalAmountUsd: totalAmountUsd.toFixed(2),

          taxableBase16Bs: (taxableBase16Usd * rateValue).toFixed(2),
          taxableBase8Bs: (taxableBase8Usd * rateValue).toFixed(2),
          exemptAmountBs: (exemptAmountUsd * rateValue).toFixed(2),
          taxAmount16Bs: (taxAmount16Usd * rateValue).toFixed(2),
          taxAmount8Bs: (taxAmount8Usd * rateValue).toFixed(2),
          igtfAmountBs: (igtfAmountUsd * rateValue).toFixed(2),
          totalAmountBs: totalAmountBs.toFixed(2),

          status: 'COMPLETED',
          fiscalStatus: 'PENDING',
        })
        .returning();

      // I. Persistir Líneas de Venta y Movimientos de Inventario (Kardex)
      for (const line of processedLines) {
        await tx.insert(saleLines).values({
          tenantId,
          saleId: sale.id,
          productId: line.productId,
          quantity: line.quantity.toFixed(3),
          unitCostUsd: line.unitCostUsd.toFixed(4),
          unitPriceUsd: line.unitPriceUsd.toFixed(4),
          taxRate: line.taxRate.toFixed(2),
          isExempt: line.isExempt,
          subtotalUsd: line.subtotalUsd.toFixed(2),
          taxAmountUsd: line.taxAmountUsd.toFixed(2),
          totalUsd: line.totalUsd.toFixed(2),
          subtotalBs: line.subtotalBs.toFixed(2),
          taxAmountBs: line.taxAmountBs.toFixed(2),
          totalBs: line.totalBs.toFixed(2),
        });

        await tx.insert(inventoryMovements).values({
          tenantId,
          warehouseId,
          productId: line.productId,
          userId,
          movementType: 'SALE',
          quantity: (-line.quantity).toFixed(3),
          unitCostUsd: line.unitCostUsd.toFixed(4),
          referenceType: 'SALE',
          referenceId: sale.id,
          reason: `Venta Factura ${invoiceFormattedNumber}`,
        });
      }

      // J. Persistir Pagos y Validar Métodos de Vuelto / Redención
      for (const p of input.payments) {
        const isUsd = p.currency === 'USD';
        const amountUsd = isUsd ? p.amount : p.amount / rateValue;
        const amountBs = isUsd ? p.amount * rateValue : p.amount;

        // Si paga con Monedero (VUELTO_WALLET), deducir del saldo a favor del cliente
        if (p.paymentMethod === 'VUELTO_WALLET') {
          const currentBalance = parseFloat(customer.balanceDue);
          // balanceDue negativo indica saldo a favor
          await tx
            .update(customers)
            .set({
              balanceDue: (currentBalance + amountUsd).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(customers.id, customer.id));
        }

        // Si paga con Vale de Cambio Impreso (CHANGE_VOUCHER), redimir
        if (p.paymentMethod === 'CHANGE_VOUCHER' && p.voucherCode) {
          await VoucherService.redeem(tenantId, userId, p.voucherCode, sale.id);
        }

        await tx.insert(payments).values({
          tenantId,
          saleId: sale.id,
          customerId: customer.id,
          paymentMethod: p.paymentMethod,
          currency: p.currency,
          amount: p.amount.toFixed(2),
          amountInUsd: amountUsd.toFixed(2),
          amountInBs: amountBs.toFixed(2),
          referenceNumber: p.referenceNumber || null,
          appliesIgtf: p.paymentMethod === 'CASH_USD' && tenant.isSpecialTaxpayer,
        });
      }

      // K. Gestión del Vuelto si aplica
      let vueltoIssued: any = null;
      if (input.vueltoOption && input.vueltoOption.amountUsd > 0) {
        const vAmountUsd = input.vueltoOption.amountUsd;
        const vAmountBs = vAmountUsd * rateValue;

        if (input.vueltoOption.type === 'WALLET_CREDIT') {
          // Acreditar al monedero del cliente (disminuye balanceDue a saldo a favor negativo)
          const currentBal = parseFloat(customer.balanceDue);
          const newBal = currentBal - vAmountUsd;
          await tx
            .update(customers)
            .set({ balanceDue: newBal.toFixed(2), updatedAt: new Date() })
            .where(eq(customers.id, customer.id));

          vueltoIssued = {
            type: 'WALLET_CREDIT',
            amountUsd: vAmountUsd.toFixed(2),
            amountBs: vAmountBs.toFixed(2),
            newCustomerCredit: Math.abs(newBal).toFixed(2),
          };
        } else if (input.vueltoOption.type === 'CHANGE_VOUCHER') {
          // Emitir Vale de Cambio Impreso
          const voucher = await VoucherService.createVoucher(tenantId, {
            saleId: sale.id,
            customerId: customer.id,
            amountUsd: vAmountUsd,
            amountBs: vAmountBs,
          });

          vueltoIssued = {
            type: 'CHANGE_VOUCHER',
            amountUsd: vAmountUsd.toFixed(2),
            amountBs: vAmountBs.toFixed(2),
            voucherCode: voucher.code,
            barcode: voucher.barcode,
            expiresAt: voucher.expiresAt,
          };
        } else if (input.vueltoOption.type === 'PAGO_MOVIL' && input.vueltoOption.pagoMovilPhone) {
          const gateway = new MockPaymentGateway();
          const pmResult = await gateway.sendVueltoPagoMovil({
            tenantId,
            amountBs: vAmountBs,
            destinationBankCode: input.vueltoOption.pagoMovilBank || '0102',
            destinationPhone: input.vueltoOption.pagoMovilPhone,
            destinationDocType: customer.documentType,
            destinationDocNumber: customer.documentNumber,
            saleId: sale.id,
          });

          vueltoIssued = {
            type: 'PAGO_MOVIL',
            amountUsd: vAmountUsd.toFixed(2),
            amountBs: vAmountBs.toFixed(2),
            referenceNumber: pmResult.referenceNumber,
          };
        }
      }

      // L. Registrar en Auditoría
      await AuditService.log({
        tenantId,
        userId,
        action: 'SALE_CONFIRMED',
        entity: 'sale',
        entityId: sale.id,
        payload: {
          invoice: invoiceFormattedNumber,
          totalUsd: totalAmountUsd.toFixed(2),
          totalBs: totalAmountBs.toFixed(2),
          igtfUsd: igtfAmountUsd.toFixed(2),
          vuelto: vueltoIssued,
        },
        result: 'SUCCESS',
        channel: 'POS_MOBILE',
      });

      const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
      const whatsappText = `*${tenant.businessName || 'VUELTO POS'}* - *Nota de Entrega / Factura Digital*
*N°:* ${invoiceFormattedNumber}
*Fecha:* ${new Date().toLocaleString('es-VE')}
*Cliente:* ${customer.name} (${customer.documentType}-${customer.documentNumber})
--------------------------------
${processedLines.map((l: any) => `• ${l.quantity}x ${l.name || 'Ítem'}: $${l.totalUsd.toFixed(2)} (${l.totalBs.toFixed(2)} Bs)`).join('\n')}
--------------------------------
*Total a Pagar:* $${totalAmountUsd.toFixed(2)} USD ≈ ${totalAmountBs.toFixed(2)} Bs
*Tasa Oficial:* ${rateValue.toFixed(2)} Bs/$
*Pago:* ${input.payments.map((p) => `${p.paymentMethod} ($${p.amount.toFixed(2)})`).join(', ')}
${vueltoIssued ? `*Vuelto (${vueltoIssued.type}):* $${vueltoIssued.amountUsd} USD (${vueltoIssued.amountBs} Bs)` : ''}

_¡Gracias por su compra! Conserve este comprobante digital._`;

      const whatsappUrl = cleanPhone
        ? `https://wa.me/${cleanPhone.startsWith('58') ? cleanPhone : '58' + cleanPhone.replace(/^0+/, '')}?text=${encodeURIComponent(whatsappText)}`
        : null;

      const responsePayload = {
        id: sale.id,
        invoiceFormattedNumber,
        rateValue: rateValue.toFixed(4),
        totalAmountUsd: totalAmountUsd.toFixed(2),
        totalAmountBs: totalAmountBs.toFixed(2),
        igtfAmountUsd: igtfAmountUsd.toFixed(2),
        vueltoIssued,
        digitalDeliveryNote: {
          whatsappText,
          whatsappUrl,
          customerPhone: customer.phone,
        },
      };

      // M. Guardar respuesta en Idempotency Keys (TTL: 24 horas)
      await tx.insert(idempotencyKeys).values({
        tenantId,
        userId,
        key: idempotencyKey,
        requestPath: '/api/v1/sales',
        requestParamsHash: paramsHash,
        responseCode: 201,
        responseBody: responsePayload,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return responsePayload;
    });

    return saleResult;
  }
}
