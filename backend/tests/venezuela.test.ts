import { describe, it, expect } from 'vitest';
import { VenezuelaUtils } from '../src/utils/venezuela.js';

describe('VenezuelaUtils', () => {
  describe('validateRif (Módulo 11)', () => {
    it('debe validar RIFs venezolanos con dígito verificador correcto', () => {
      // SENIAT algoritmo Módulo 11
      // J-00002967-9 (Banco Central de Venezuela)
      // Tipo J (peso 3 * 4 = 12), dígitos 00002967
      const validJ = VenezuelaUtils.validateRif('J', '000029679');
      expect(validJ.isValid).toBe(true);

      // V-18765432-? cálculo
      const calcV = VenezuelaUtils.validateRif('V', '18765432');
      expect(calcV.expectedDigit).toBeDefined();

      const validWithCalculated = VenezuelaUtils.validateRif('V', `18765432${calcV.expectedDigit}`);
      expect(validWithCalculated.isValid).toBe(true);
    });

    it('debe rechazar RIFs con dígito verificador incorrecto', () => {
      const result = VenezuelaUtils.validateRif('J', '000029670'); // Dígito incorrecto
      expect(result.isValid).toBe(false);
    });

    it('debe rechazar tipos de documento no permitidos', () => {
      const result = VenezuelaUtils.validateRif('X', '123456789');
      expect(result.isValid).toBe(false);
    });
  });

  describe('normalizePhone', () => {
    it('debe normalizar números con formato +58 a formato local 04XX', () => {
      expect(VenezuelaUtils.normalizePhone('+58 414 123-4567')).toBe('04141234567');
      expect(VenezuelaUtils.normalizePhone('+58-412-9876543')).toBe('04129876543');
      expect(VenezuelaUtils.normalizePhone('584161112233')).toBe('04161112233');
      expect(VenezuelaUtils.normalizePhone('0424 555 66 77')).toBe('04245556677');
    });
  });

  describe('validateEan13', () => {
    it('debe validar códigos EAN-13 válidos y detectar prefijo venezolano 759 (GS1 Venezuela)', () => {
      // Código de ejemplo venezolano con prefijo 759
      // 759123456789X -> calcular check digit
      // 7*1 + 5*3 + 9*1 + 1*3 + 2*1 + 3*3 + 4*1 + 5*3 + 6*1 + 7*3 + 8*1 + 9*3
      // = 7 + 15 + 9 + 3 + 2 + 9 + 4 + 15 + 6 + 21 + 8 + 27 = 126 % 10 = 6 -> check digit = 4
      const veCode = '7591234567894';
      const result = VenezuelaUtils.validateEan13(veCode);
      expect(result.isValid).toBe(true);
      expect(result.isVenezuelanPrefix).toBe(true);
    });

    it('debe validar códigos internacionales pero indicar que no tienen prefijo 759', () => {
      // 4006381333931 (Alemania)
      const intCode = '4006381333931';
      const result = VenezuelaUtils.validateEan13(intCode);
      expect(result.isValid).toBe(true);
      expect(result.isVenezuelanPrefix).toBe(false);
    });

    it('debe rechazar códigos con dígito verificador inválido o longitud errónea', () => {
      expect(VenezuelaUtils.validateEan13('7591234567890').isValid).toBe(false);
      expect(VenezuelaUtils.validateEan13('12345').isValid).toBe(false);
    });
  });
});
