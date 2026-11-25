/**
 * Utilidades para códigos de barras venezolanos y balanzas en Vuelto Mobile
 * Compatible con formato estándar EAN-13: Prefijos balanza (20, 21, 22)
 * Estructura: Prefijo (2 dígitos) + SKU (4 dígitos) + Peso/Precio en gramos (5 dígitos) + Checksum (1 dígito)
 */

export interface ParsedScaleBarcode {
  isScaleBarcode: boolean;
  prefix?: '20' | '21' | '22';
  sku?: string;
  weightKg?: number;
  weightGrams?: number;
}

export class MobileScaleBarcodeUtils {
  /**
   * Parsea un código de barras de balanza para charcutería, carnicería o víveres
   * Formato venezolano estándar: 20/21/22 + 4 dígitos SKU + 5 dígitos peso + 1 dígito checksum
   * Ejemplo: 210142004506 -> Prefijo 21, SKU 0142, 450g (0.450 kg)
   */
  static parseScaleBarcode(barcode: string): ParsedScaleBarcode {
    const clean = barcode.replace(/[^0-9]/g, '');
    if (
      (clean.length === 12 || clean.length === 13) &&
      (clean.startsWith('20') || clean.startsWith('21') || clean.startsWith('22'))
    ) {
      const prefix = clean.slice(0, 2) as '20' | '21' | '22';
      const sku = clean.slice(2, 6);
      const gramsStr = clean.slice(6, 11);
      const grams = parseInt(gramsStr, 10);
      const weightKg = parseFloat((grams / 1000).toFixed(3));

      return {
        isScaleBarcode: true,
        prefix,
        sku,
        weightKg,
        weightGrams: grams,
      };
    }

    return { isScaleBarcode: false };
  }

  /**
   * Valida checksum EAN-13 y detecta prefijo de Venezuela (759)
   */
  static validateEan13(barcode: string): { isValid: boolean; isVenezuelanPrefix: boolean } {
    const clean = barcode.replace(/[^0-9]/g, '');
    if (clean.length !== 13) {
      return { isValid: false, isVenezuelanPrefix: false };
    }

    const isVenezuelanPrefix = clean.startsWith('759');

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;
    const providedCheckDigit = parseInt(clean[12], 10);

    return {
      isValid: checkDigit === providedCheckDigit,
      isVenezuelanPrefix,
    };
  }
}
