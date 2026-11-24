/**
 * Utilidades de validación y cálculo para el ecosistema comercial y fiscal venezolano.
 */

export class VenezuelaUtils {
  /**
   * Valida un RIF venezolano (V, E, J, G, P) mediante el algoritmo oficial Módulo 11 del SENIAT.
   * Formato de entrada aceptado: 'J-12345678-9', 'J123456789', 'V-18765432-1', etc.
   */
  static validateRif(documentType: string, rawNumber: string): { isValid: boolean; expectedDigit?: number } {
    const cleanType = documentType.toUpperCase();
    const cleanNumber = rawNumber.replace(/[^0-9]/g, '');

    // Un RIF completo tiene tipo + 8 dígitos del número + 1 dígito verificador = 9 dígitos numéricos
    if (!['V', 'E', 'J', 'G', 'P'].includes(cleanType)) {
      return { isValid: false };
    }

    if (cleanNumber.length < 8 || cleanNumber.length > 9) {
      return { isValid: false };
    }

    // Si viene con 9 dígitos, el último es el verificador a cotejar
    const bodyDigits = cleanNumber.length === 9 ? cleanNumber.slice(0, 8) : cleanNumber.padStart(8, '0');
    const providedCheckDigit = cleanNumber.length === 9 ? parseInt(cleanNumber[8], 10) : null;

    // Factores de ponderación oficiales del SENIAT
    const typeWeights: Record<string, number> = {
      V: 1,
      E: 2,
      J: 3,
      P: 4,
      G: 5,
    };

    const typeWeight = typeWeights[cleanType];
    // Coeficientes oficiales del SENIAT para los 8 dígitos: [3, 2, 7, 6, 5, 4, 3, 2]
    const factors = [3, 2, 7, 6, 5, 4, 3, 2];

    let sum = typeWeight * 4; // Multiplicador para el prefijo según SENIAT
    for (let i = 0; i < 8; i++) {
      sum += parseInt(bodyDigits[i], 10) * factors[i];
    }

    const remainder = sum % 11;
    let expectedDigit = 0;
    if (remainder > 1) {
      expectedDigit = 11 - remainder;
    }

    if (providedCheckDigit !== null) {
      return {
        isValid: providedCheckDigit === expectedDigit,
        expectedDigit,
      };
    }

    return { isValid: true, expectedDigit };
  }

  /**
   * Normaliza números telefónicos venezolanos para búsqueda y comparación sin duplicados.
   * Convierte: '+58 414 123-4567' -> '04141234567'
   */
  static normalizePhone(phone: string): string {
    let clean = phone.replace(/[^0-9+]/g, '');
    if (clean.startsWith('+58')) {
      clean = '0' + clean.slice(3);
    } else if (clean.startsWith('58') && clean.length > 10) {
      clean = '0' + clean.slice(2);
    }
    return clean;
  }

  /**
   * Genera el payload interoperable para Códigos QR de Pago Móvil venezolano (Suiche 7B / BCV).
   * Permite al cliente escanear desde su app bancaria con monto y datos ya precargados.
   */
  static generatePagoMovilQrPayload(params: {
    bankCode: string; // ej. '0102' (Banco de Venezuela), '0105' (Mercantil), '0108' (Provincial), '0134' (Banesco)
    phone: string; // ej. '04141234567'
    documentType: string; // ej. 'J', 'V', 'E', 'G'
    documentNumber: string; // ej. '123456789'
    amountBs: number; // Monto exacto calculado a tasa oficial
    concept?: string; // ej. 'Factura A-000042'
  }): string {
    const cleanPhone = this.normalizePhone(params.phone);
    const cleanDoc = `${params.documentType.toUpperCase()}${params.documentNumber.replace(/[^0-9]/g, '')}`;
    const amountStr = params.amountBs.toFixed(2);
    const concept = params.concept ? params.concept.replace(/[:;]/g, '') : 'Vuelto';

    // Formato estándar de URI de Pago Móvil Interoperable
    return `PAGOMOVIL:${cleanDoc}:${params.bankCode}:${cleanPhone}:${amountStr}:${concept}`;
  }

  /**
   * Formato estándar EAN-13: Prefijo (20, 21 o 22) + 4 o 5 dígitos de SKU + 5 dígitos de peso en gramos + Dígito verificador.
   * Ejemplo: '200142004506' -> SKU: '0142', Peso: 0.450 kg (450 gramos).
   */
  static parseScaleBarcode(barcode: string): {
    isScaleBarcode: boolean;
    sku?: string;
    weightKg?: number;
    weightGrams?: number;
  } {
    const clean = barcode.replace(/[^0-9]/g, '');
    if ((clean.length === 12 || clean.length === 13) && (clean.startsWith('20') || clean.startsWith('21') || clean.startsWith('22'))) {
      const sku = clean.slice(2, 6);
      const gramsStr = clean.slice(6, 11);
      const grams = parseInt(gramsStr, 10);
      const weightKg = parseFloat((grams / 1000).toFixed(3));

      return {
        isScaleBarcode: true,
        sku,
        weightKg,
        weightGrams: grams,
      };
    }

    return { isScaleBarcode: false };
  }
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
