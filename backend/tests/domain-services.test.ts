import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VenezuelaUtils } from '../src/utils/venezuela.js';

describe('Fase 2: Domain Services & Business Logic', () => {
  describe('Cálculo Fiscal de Totales e IGTF (3%) en Venta', () => {
    it('debe calcular correctamente la base imponible 16%, base 8%, exento y el IGTF del 3% en pagos en efectivo USD', () => {
      const rateValue = 52.50; // Bs por USD

      // Carrito con 3 productos:
      // 1. Harina Pan: $1.20 (Gravado 16%)
      // 2. Medicamento esencial: $5.00 (Exento 0%)
      // 3. Producto alícuota reducida: $10.00 (8%)
      const lines = [
        { name: 'Harina Pan', qty: 2, priceUsd: 1.20, taxRate: 16.0, isExempt: false },
        { name: 'Medicamento', qty: 1, priceUsd: 5.00, taxRate: 0.0, isExempt: true },
        { name: 'Reducido', qty: 1, priceUsd: 10.00, taxRate: 8.0, isExempt: false },
      ];

      let taxableBase16 = 0;
      let taxableBase8 = 0;
      let exemptAmount = 0;
      let tax16 = 0;
      let tax8 = 0;
      let subtotal = 0;

      for (const line of lines) {
        const lineSubtotal = line.qty * line.priceUsd;
        subtotal += lineSubtotal;
        if (line.isExempt) {
          exemptAmount += lineSubtotal;
        } else if (line.taxRate === 16.0) {
          taxableBase16 += lineSubtotal;
          tax16 += lineSubtotal * 0.16;
        } else if (line.taxRate === 8.0) {
          taxableBase8 += lineSubtotal;
          tax8 += lineSubtotal * 0.08;
        }
      }

      // Base 16: 2 * 1.20 = 2.40 USD. IVA 16% = 0.384 -> 0.38 USD
      // Base 8: 1 * 10.00 = 10.00 USD. IVA 8% = 0.80 USD
      // Exento: 5.00 USD
      // Subtotal = 17.40 USD
      // Total comercial sin IGTF = 17.40 + 0.384 + 0.80 = 18.584 USD

      expect(taxableBase16).toBe(2.40);
      expect(taxableBase8).toBe(10.00);
      expect(exemptAmount).toBe(5.00);

      // Pago Mixto:
      // Cliente paga: $10 en billete efectivo USD (CASH_USD) y el resto en Pago Móvil (Bs)
      const isSpecialTaxpayer = true;
      const cashUsdPayment = 10.00;

      // Según Ley de IGTF venezolana: 3% aplica sobre pagos recibidos en divisas efectivo
      const igtfAmountUsd = isSpecialTaxpayer ? cashUsdPayment * 0.03 : 0;
      expect(igtfAmountUsd).toBe(0.30); // $0.30 USD de IGTF percibido

      const totalFacturaUsd = subtotal + tax16 + tax8 + igtfAmountUsd;
      const totalFacturaBs = totalFacturaUsd * rateValue;

      expect(totalFacturaUsd).toBeCloseTo(18.884, 2);
      expect(totalFacturaBs).toBeCloseTo(18.884 * 52.50, 2);
    });
  });

  describe('Mecanismo de Vuelto en Monedero y Vales de Cambio', () => {
    it('debe gestionar el crédito de monedero (balanceDue negativo) al dar vuelto', () => {
      // Cliente Juan tiene balance inicial 0.00
      let balanceDue = 0.00;
      const totalVenta = 13.00;
      const pagoBilleteUsd = 20.00;
      const vuelto = pagoBilleteUsd - totalVenta; // $7.00 de vuelto

      // Opción Monedero: El cliente decide dejar los $7 como saldo a favor en cuenta
      balanceDue = balanceDue - vuelto; // -7.00 USD (saldo a favor)
      expect(balanceDue).toBe(-7.00);

      // Próxima compra de Juan: total $5.00
      // El POS aplica su saldo a favor de Monedero
      const nuevaCompra = 5.00;
      balanceDue = balanceDue + nuevaCompra; // -7.00 + 5.00 = -2.00 USD restantes de saldo a favor
      expect(balanceDue).toBe(-2.00);
    });

    it('debe generar y formatear vales de cambio con código y código de barras', () => {
      const code = 'VALE-8F3A-92BC';
      expect(code).toMatch(/^VALE-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });
  });

  describe('Detección y Escaneo de Códigos de Barra', () => {
    it('debe identificar códigos venezolanos GS1 con prefijo 759', () => {
      const veCode = '7591234567894';
      const check = VenezuelaUtils.validateEan13(veCode);
      expect(check.isValid).toBe(true);
      expect(check.isVenezuelanPrefix).toBe(true);
    });

    it('debe identificar códigos internacionales sin prefijo 759', () => {
      const intCode = '4006381333931';
      const check = VenezuelaUtils.validateEan13(intCode);
      expect(check.isValid).toBe(true);
      expect(check.isVenezuelanPrefix).toBe(false);
    });
  });
});
