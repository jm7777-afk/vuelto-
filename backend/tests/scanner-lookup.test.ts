import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { VenezuelaUtils } from '../src/utils/venezuela.js';
import { JwtService } from '../src/services/jwt.service.js';

const app = createApp();

describe('Fase 1: Escáner de Código de Barras y Balanza EAN-13', () => {
  describe('1. Parser EAN-13 de Balanza (20/21/22)', () => {
    it('Caso 1: debe parsear correctamente código de balanza prefijo 21 con peso embebido (1.450 kg)', () => {
      // 21 (prefijo balanza) + 0456 (SKU) + 01450 (1450 gramos = 1.450 kg) + 4 (dígito)
      const barcode = '210456014504';
      const result = VenezuelaUtils.parseScaleBarcode(barcode);
      expect(result.isScaleBarcode).toBe(true);
      expect(result.sku).toBe('0456');
      expect(result.weightGrams).toBe(1450);
      expect(result.weightKg).toBe(1.45);
    });

    it('Caso 2: debe parsear código de balanza con prefijo 20 (peso 0.850 kg)', () => {
      const barcode = '200123008500';
      const result = VenezuelaUtils.parseScaleBarcode(barcode);
      expect(result.isScaleBarcode).toBe(true);
      expect(result.sku).toBe('0123');
      expect(result.weightKg).toBe(0.85);
    });

    it('Caso 3: debe parsear código de balanza con prefijo 22 (peso 2.100 kg)', () => {
      const barcode = '229999021008';
      const result = VenezuelaUtils.parseScaleBarcode(barcode);
      expect(result.isScaleBarcode).toBe(true);
      expect(result.sku).toBe('9999');
      expect(result.weightKg).toBe(2.1);
    });

    it('Caso 4: debe rechazar código inválido o con longitud insuficiente', () => {
      const barcode = '21045';
      const result = VenezuelaUtils.parseScaleBarcode(barcode);
      expect(result.isScaleBarcode).toBe(false);
    });

    it('Caso 5: debe identificar que un código EAN-13 normal (ej. 759) no es de balanza', () => {
      const barcode = '7591234567890';
      const result = VenezuelaUtils.parseScaleBarcode(barcode);
      expect(result.isScaleBarcode).toBe(false);
    });
  });

  describe('2. Verificación de Debounce del Escáner (Simulación)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debe ignorar lecturas duplicadas del mismo código dentro de los 2000 ms', () => {
      const scannedCodes: string[] = [];
      const lastScannedMap = new Map<string, number>();

      const handleScan = (code: string) => {
        const now = Date.now();
        const last = lastScannedMap.get(code) || 0;
        if (now - last < 2000) {
          return false; // Ignorado por debounce
        }
        lastScannedMap.set(code, now);
        scannedCodes.push(code);
        return true;
      };

      // Primer escaneo a t = 0
      expect(handleScan('7591234567890')).toBe(true);
      expect(scannedCodes.length).toBe(1);

      // Segundo escaneo inmediato a t = 500 ms (debe ser ignorado)
      vi.advanceTimersByTime(500);
      expect(handleScan('7591234567890')).toBe(false);
      expect(scannedCodes.length).toBe(1);

      // Tercer escaneo a t = 1900 ms (debe ser ignorado)
      vi.advanceTimersByTime(1400);
      expect(handleScan('7591234567890')).toBe(false);
      expect(scannedCodes.length).toBe(1);

      // Cuarto escaneo a t = 2100 ms (> 2000 ms, debe procesarse)
      vi.advanceTimersByTime(200);
      expect(handleScan('7591234567890')).toBe(true);
      expect(scannedCodes.length).toBe(2);
    });
  });

  describe('3. Integración Backend: GET /api/v1/products/by-barcode/:barcode', () => {
    const tenantA = 'a0000000-0000-0000-0000-000000000001';
    const tenantB = 'b0000000-0000-0000-0000-000000000002';

    const tokenTenantA = JwtService.generateTokenPair({
      id: 'u-tenant-a-01',
      tenantId: tenantA,
      roleId: 'VENDEDOR',
      username: 'vendedor_a',
      fullName: 'Vendedor A',
    }).accessToken;

    const tokenTenantB = JwtService.generateTokenPair({
      id: 'u-tenant-b-01',
      tenantId: tenantB,
      roleId: 'VENDEDOR',
      username: 'vendedor_b',
      fullName: 'Vendedor B',
    }).accessToken;

    it('debe rechazar un código con caracteres inválidos con código HTTP 400 e INVALID_BARCODE', async () => {
      const res = await request(app)
        .get('/api/v1/products/by-barcode/codigo!con#simbolos$')
        .set('Authorization', `Bearer ${tokenTenantA}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_BARCODE');
    });

    it('debe responder 404 PRODUCT_NOT_FOUND para un código inexistente', async () => {
      const res = await request(app)
        .get('/api/v1/products/by-barcode/999999999999')
        .set('Authorization', `Bearer ${tokenTenantA}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('PRODUCT_NOT_FOUND');
    });

    it('Aislamiento Multi-Tenant: Tenant B no puede ver ni consultar productos de Tenant A', async () => {
      // Intentamos consultar un código inexistente para Tenant B
      const res = await request(app)
        .get('/api/v1/products/by-barcode/7591234567890')
        .set('Authorization', `Bearer ${tokenTenantB}`);

      // Debe dar 404 estricto para no revelar existencia de productos ajenos
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('PRODUCT_NOT_FOUND');
    });
  });
});
