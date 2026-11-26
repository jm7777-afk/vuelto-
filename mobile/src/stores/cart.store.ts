import { create } from 'zustand';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

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
  balanceDue: number;
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
  activeLines: CartLine[];
  activeCustomer: CustomerSummary | null;
  frozenRate: number | null;
  exchangeRateId: string | null;
  heldCarts: HeldCart[];

  setExchangeRate: (rate: number, rateId: string, force?: boolean) => void;
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

  parkCurrentCart: (label?: string) => { success: boolean; error?: string };
  resumeHeldCart: (heldCartId: string) => void;
  discardHeldCart: (heldCartId: string) => void;

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

  setExchangeRate: (rate, rateId, force = false) => {
    if (force || !get().frozenRate || !get().exchangeRateId) {
      set({ frozenRate: rate, exchangeRateId: rateId });
    }
  },

  setCustomer: (customer) => set({ activeCustomer: customer }),

  addProduct: (product) => {
    const lines = get().activeLines;
    const existingIndex = lines.findIndex((l) => l.productId === product.id);

    if (existingIndex >= 0) {
      const current = lines[existingIndex];
      get().updateQuantity(product.id, round2(current.quantity + 1));
    } else {
      const price = round2(product.salePriceUsd);
      const taxRate = product.isExempt ? 0 : product.taxRate;
      const taxAmount = round2(price * (taxRate / 100));

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
        totalUsd: round2(price + taxAmount),
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
        const subtotal = round2(quantity * line.unitPriceUsd);
        const taxAmount = line.isExempt ? 0 : round2(subtotal * (line.taxRate / 100));
        return {
          ...line,
          quantity,
          subtotalUsd: subtotal,
          taxAmountUsd: taxAmount,
          totalUsd: round2(subtotal + taxAmount),
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
    });
  },

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
      frozenRate: get().frozenRate || 0,
      exchangeRateId: get().exchangeRateId || '',
      createdAt: new Date(),
      totalUsd: get().getTotalUsd(),
    };

    set({
      heldCarts: [...heldCarts, newHold],
      activeLines: [],
      activeCustomer: null,
    });

    return { success: true };
  },

  resumeHeldCart: (heldCartId) => {
    const target = get().heldCarts.find((h) => h.id === heldCartId);
    if (!target) return;

    if (get().activeLines.length > 0) {
      get().parkCurrentCart();
    }

    set({
      activeLines: target.lines,
      activeCustomer: target.customer,
      frozenRate: target.frozenRate || get().frozenRate,
      exchangeRateId: target.exchangeRateId || get().exchangeRateId,
      heldCarts: get().heldCarts.filter((h) => h.id !== heldCartId),
    });
  },

  discardHeldCart: (heldCartId) => {
    set({ heldCarts: get().heldCarts.filter((h) => h.id !== heldCartId) });
  },

  getSubtotalUsd: () => round2(get().activeLines.reduce((acc, l) => acc + l.subtotalUsd, 0)),
  getTaxAmountUsd: () => round2(get().activeLines.reduce((acc, l) => acc + l.taxAmountUsd, 0)),
  getTotalUsd: () => round2(get().getSubtotalUsd() + get().getTaxAmountUsd()),
  getTotalBs: () => {
    const rate = get().frozenRate || 0;
    return round2(get().getTotalUsd() * rate);
  },
}));
