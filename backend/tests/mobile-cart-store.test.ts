import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../mobile/src/stores/cart.store.js';
import { useAuthStore } from '../../mobile/src/stores/auth.store.js';

describe('Fase 5: Mobile POS State & Cuentas Abiertas (Zustand)', () => {
  beforeEach(() => {
    useCartStore.getState().clearActiveCart();
    useCartStore.setState({ heldCarts: [] });
    useAuthStore.getState().logout();
  });

  it('debe agregar productos y calcular correctamente totales bimoneda a tasa congelada', () => {
    const store = useCartStore.getState();

    // Congelar tasa BCV a 52.50
    store.setExchangeRate(52.50, 'rate-123');

    // Agregar Harina Pan ($1.20 + 16% IVA = $1.392)
    store.addProduct({
      id: 'prod-1',
      name: 'Harina Pan',
      barcode: '7591234567894',
      salePriceUsd: 1.20,
      taxRate: 16.0,
      isExempt: false,
    });

    expect(useCartStore.getState().activeLines.length).toBe(1);
    expect(useCartStore.getState().activeLines[0].quantity).toBe(1);
    expect(useCartStore.getState().getSubtotalUsd()).toBe(1.20);
    expect(useCartStore.getState().getTotalUsd()).toBeCloseTo(1.392, 3);
    expect(useCartStore.getState().getTotalBs()).toBeCloseTo(1.392 * 52.50, 2);
  });

  it('debe incrementar cantidad al volver a escanear el mismo producto', () => {
    const store = useCartStore.getState();

    store.addProduct({
      id: 'prod-1',
      name: 'Harina Pan',
      barcode: '7591234567894',
      salePriceUsd: 1.20,
      taxRate: 16.0,
      isExempt: false,
    });

    // Segundo escaneo del mismo código
    store.addProduct({
      id: 'prod-1',
      name: 'Harina Pan',
      barcode: '7591234567894',
      salePriceUsd: 1.20,
      taxRate: 16.0,
      isExempt: false,
    });

    expect(useCartStore.getState().activeLines[0].quantity).toBe(2);
    expect(useCartStore.getState().getSubtotalUsd()).toBe(2.40);
  });

  it('debe eliminar la línea cuando la cantidad se reduce a 0', () => {
    const store = useCartStore.getState();

    store.addProduct({
      id: 'prod-1',
      name: 'Harina Pan',
      barcode: '7591234567894',
      salePriceUsd: 1.20,
      taxRate: 16.0,
      isExempt: false,
    });

    store.updateQuantity('prod-1', 0);
    expect(useCartStore.getState().activeLines.length).toBe(0);
  });

  it('debe gestionar Cuentas Abiertas (Held Carts): pausar, reanudar y descartar', () => {
    const store = useCartStore.getState();
    store.setExchangeRate(52.50, 'rate-123');

    // Agregar producto
    store.addProduct({
      id: 'prod-1',
      name: 'Harina Pan',
      barcode: '7591234567894',
      salePriceUsd: 1.20,
      taxRate: 16.0,
      isExempt: false,
    });

    // 1. Pausar cuenta (Held Cart)
    const parkRes = store.parkCurrentCart('Mesa 1 - Cliente Juan');
    expect(parkRes.success).toBe(true);
    expect(useCartStore.getState().activeLines.length).toBe(0); // Carrito activo queda vacío
    expect(useCartStore.getState().heldCarts.length).toBe(1);
    expect(useCartStore.getState().heldCarts[0].label).toBe('Mesa 1 - Cliente Juan');

    const heldId = useCartStore.getState().heldCarts[0].id;

    // 2. Reanudar cuenta
    useCartStore.getState().resumeHeldCart(heldId);
    expect(useCartStore.getState().activeLines.length).toBe(1);
    expect(useCartStore.getState().heldCarts.length).toBe(0); // Sale de la cola de espera

    // 3. Volver a pausar y descartar
    useCartStore.getState().parkCurrentCart('Cuenta Descartable');
    expect(useCartStore.getState().heldCarts.length).toBe(1);
    const discardId = useCartStore.getState().heldCarts[0].id;

    useCartStore.getState().discardHeldCart(discardId);
    expect(useCartStore.getState().heldCarts.length).toBe(0);
  });

  it('debe respetar el límite de 10 cuentas abiertas por dispositivo', () => {
    const store = useCartStore.getState();

    // Llenar 10 cuentas
    for (let i = 1; i <= 10; i++) {
      store.addProduct({
        id: `prod-${i}`,
        name: `Producto ${i}`,
        barcode: `75900000000${i}`,
        salePriceUsd: 1.00,
        taxRate: 0,
        isExempt: true,
      });
      const res = store.parkCurrentCart(`Cuenta ${i}`);
      expect(res.success).toBe(true);
    }

    expect(useCartStore.getState().heldCarts.length).toBe(10);

    // Intentar pausar la 11va cuenta
    store.addProduct({
      id: 'prod-11',
      name: 'Producto 11',
      barcode: '7590000000011',
      salePriceUsd: 1.00,
      taxRate: 0,
      isExempt: true,
    });

    const overflowRes = store.parkCurrentCart('Cuenta 11');
    expect(overflowRes.success).toBe(false);
    expect(overflowRes.error).toContain('Máximo 10');
  });

  it('RBAC en Móvil: Usuario VENDEDOR no puede activar Modo Administrador', () => {
    const auth = useAuthStore.getState();

    // Autenticado como VENDEDOR
    auth.setAuth(
      {
        id: 'usr-vendedor',
        tenantId: 'tenant-1',
        username: 'cajero',
        fullName: 'Cajero Mostrador',
        roleId: 'VENDEDOR',
        businessName: 'Bodega Central',
      },
      'token_vendedor',
      'refresh_vendedor'
    );

    // Intento de switch a Modo Admin
    const switchSuccess = auth.toggleMode('ADMIN');
    expect(switchSuccess).toBe(false);
    expect(useAuthStore.getState().activeMode).toBe('POS'); // Permanece en POS
  });

  it('RBAC en Móvil: Usuario ADMIN puede alternar libremente entre Modo POS y Modo Admin', () => {
    const auth = useAuthStore.getState();

    // Autenticado como ADMIN
    auth.setAuth(
      {
        id: 'usr-admin',
        tenantId: 'tenant-1',
        username: 'admin',
        fullName: 'Dueño Administrador',
        roleId: 'ADMIN',
        businessName: 'Bodega Central',
      },
      'token_admin',
      'refresh_admin'
    );

    const toAdmin = auth.toggleMode('ADMIN');
    expect(toAdmin).toBe(true);
    expect(useAuthStore.getState().activeMode).toBe('ADMIN');

    const backToPos = auth.toggleMode('POS');
    expect(backToPos).toBe(true);
    expect(useAuthStore.getState().activeMode).toBe('POS');
  });
});
