import { create } from 'zustand';

export interface CartLine {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  unitPriceUsd: number;
  taxRate: number; // 16, 8, 0
  isExempt: boolean;
  subtotalUsd: number;
  taxAmountUsd: number;
  totalUsd: number;
  unitOfMeasure?: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  documentType: string;
  documentNumber: string;
  phone?: string;
  balanceDue: number; // Negativo: saldo a favor (monedero)
}

export interface HeldCart {
  id: string;
  label: string;
  lines: CartLine[];
  customer: CustomerSummary | null;
  frozenRate: number;
  exchangeRateId: string;
  createdAt: Date;
  totalUsd: number;
}

interface CartState {
  // Carrito Activo
  activeLines: CartLine[];
  activeCustomer: CustomerSummary | null;
  frozenRate: number | null;
  exchangeRateId: string | null;

  // Cuentas Abiertas (Held Carts) - Máx 10
  heldCarts: HeldCart[];

  // Acciones sobre el Carrito Activo
  setExchangeRate: (rate: number, rateId: string) => void;
  setCustomer: (customer: CustomerSummary | null) => void;
  addProduct: (product: {
    id: string;
    name: string;
    barcode: string;
    salePriceUsd: number;
    taxRate: number;
    isExempt: boolean;
    unitOfMeasure?: string;
  }) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  clearActiveCart: () => void;

  // Acciones sobre Cuentas Abiertas
  parkCurrentCart: (label?: string) => { success: boolean; error?: string };
  resumeHeldCart: (heldCartId: string) => void;
  discardHeldCart: (heldCartId: string) => void;

  // Totales Calculados
  getSubtotalUsd: () => number;
  getTaxAmountUsd: () => number;
  getTotalUsd: () => number;
  getTotalBs: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  activeLines: [],
  activeCustomer: null,
  frozenRate: null,
  exchangeRateId: null,
  heldCarts: [],

  setExchangeRate: (rate, rateId) => {
    // Solo congela si no está ya congelada en el carrito
    if (!get().frozenRate) {
      set({ frozenRate: rate, exchangeRateId: rateId });
    }
  },

  setCustomer: (customer) => set({ activeCustomer: customer }),

  addProduct: (product) => {
    const lines = get().activeLines;
    const existingIndex = lines.findIndex((l) => l.productId === product.id);

    if (existingIndex >= 0) {
      // Incrementar cantidad en 1
      const current = lines[existingIndex];
      const newQty = current.quantity + 1;
      get().updateQuantity(product.id, newQty);
    } else {
      const price = product.salePriceUsd;
      const taxRate = product.isExempt ? 0 : product.taxRate;
      const taxAmount = price * (taxRate / 100);

      const newLine: CartLine = {
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        quantity: 1,
        unitPriceUsd: price,
        taxRate,
        isExempt: product.isExempt,
        subtotalUsd: price,
        taxAmountUsd: taxAmount,
        totalUsd: price + taxAmount,
        unitOfMeasure: product.unitOfMeasure || 'unidad',
      };

      set({ activeLines: [...lines, newLine] });
    }
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeLine(productId);
      return;
    }

    const lines = get().activeLines.map((line) => {
      if (line.productId === productId) {
        const subtotal = quantity * line.unitPriceUsd;
        const taxAmount = line.isExempt ? 0 : subtotal * (line.taxRate / 100);
        return {
          ...line,
          quantity,
          subtotalUsd: subtotal,
          taxAmountUsd: taxAmount,
          totalUsd: subtotal + taxAmount,
        };
      }
      return line;
    });

    set({ activeLines: lines });
  },

  removeLine: (productId) => {
    set({ activeLines: get().activeLines.filter((l) => l.productId !== productId) });
  },

  clearActiveCart: () => {
    set({
      activeLines: [],
      activeCustomer: null,
      frozenRate: null,
      exchangeRateId: null,
    });
  },

  // Poner en espera el carrito actual (Held Cart)
  parkCurrentCart: (label) => {
    const lines = get().activeLines;
    if (lines.length === 0) {
      return { success: false, error: 'El carrito está vacío' };
    }

    const heldCarts = get().heldCarts;
    if (heldCarts.length >= 10) {
      return { success: false, error: 'Límite alcanzado: Máximo 10 cuentas abiertas simultáneas' };
    }

    const autoLabel = label || get().activeCustomer?.name || `Cuenta #${heldCarts.length + 1}`;
    const newHold: HeldCart = {
      id: `hold_${Date.now()}`,
      label: autoLabel,
      lines: [...lines],
      customer: get().activeCustomer,
      frozenRate: get().frozenRate || 52.5,
      exchangeRateId: get().exchangeRateId || '',
      createdAt: new Date(),
      totalUsd: get().getTotalUsd(),
    };

    set({
      heldCarts: [...heldCarts, newHold],
      activeLines: [],
      activeCustomer: null,
      frozenRate: null,
      exchangeRateId: null,
    });

    return { success: true };
  },

  // Reanudar una cuenta abierta exactamente como estaba
  resumeHeldCart: (heldCartId) => {
    const target = get().heldCarts.find((h) => h.id === heldCartId);
    if (!target) return;

    // Si había un carrito activo con líneas, se pone en espera automáticamente
    if (get().activeLines.length > 0) {
      get().parkCurrentCart();
    }

    set({
      activeLines: target.lines,
      activeCustomer: target.customer,
      frozenRate: target.frozenRate,
      exchangeRateId: target.exchangeRateId,
      heldCarts: get().heldCarts.filter((h) => h.id !== heldCartId),
    });
  },

  discardHeldCart: (heldCartId) => {
    set({ heldCarts: get().heldCarts.filter((h) => h.id !== heldCartId) });
  },

  // Totales
  getSubtotalUsd: () => get().activeLines.reduce((acc, l) => acc + l.subtotalUsd, 0),
  getTaxAmountUsd: () => get().activeLines.reduce((acc, l) => acc + l.taxAmountUsd, 0),
  getTotalUsd: () => get().getSubtotalUsd() + get().getTaxAmountUsd(),
  getTotalBs: () => {
    const rate = get().frozenRate || 52.5;
    return get().getTotalUsd() * rate;
  },
}));
