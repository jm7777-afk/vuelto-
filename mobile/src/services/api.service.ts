import * as FileSystem from 'expo-file-system';
import { useAuthStore, MobileUserProfile } from '../stores/auth.store';

export const API_BASE_URL = 'https://vuelto.onrender.com/api/v1';
export const AUTH_FILE = `${FileSystem.documentDirectory}vuelto_auth.json`;

export interface MobileLoginResponse {
  requiresTwoFactor?: boolean;
  message?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
  };
  user?: MobileUserProfile;
}

let refreshPromise: Promise<string | null> | null = null;

async function persistTokensToStorage(
  user: MobileUserProfile | null,
  accessToken: string,
  refreshToken?: string | null
) {
  if (!user) return;
  try {
    await FileSystem.writeAsStringAsync(
      AUTH_FILE,
      JSON.stringify({ user, accessToken, refreshToken: refreshToken || null })
    );
  } catch {
    // Ignorar error de disco en persistencia
  }
}

export async function clearPersistedSession() {
  try {
    await FileSystem.deleteAsync(AUTH_FILE, { idempotent: true });
  } catch {
    // Ignorar
  }
  useAuthStore.getState().logout();
}

export async function tryRefreshAccessToken(): Promise<string | null> {
  const { refreshToken, user, updateTokens } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.tokens?.accessToken) {
          const nextRefresh = data.tokens.refreshToken || refreshToken;
          updateTokens(data.tokens.accessToken, nextRefresh);
          await persistTokensToStorage(user, data.tokens.accessToken, nextRefresh);
          return data.tokens.accessToken as string;
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function mobileFetch(
  path: string,
  options: RequestInit = {},
  explicitToken?: string
): Promise<Response> {
  const storeToken = explicitToken || useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (storeToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${storeToken}`;
  }
  if (options.body && !headers['Content-Type'] && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    const newToken = await tryRefreshAccessToken();
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { ...options, headers: retryHeaders });
    } else {
      await clearPersistedSession();
    }
  }

  return res;
}

async function parseJsonOrThrow<T = any>(res: Response, fallbackMsg: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || fallbackMsg);
  }
  return data as T;
}

export class MobileApiService {
  static async login(
    username: string,
    password: string,
    twoFactorCode?: string
  ): Promise<MobileLoginResponse> {
    const payload: Record<string, string> = { username, password };
    if (twoFactorCode && twoFactorCode.trim()) {
      payload.twoFactorCode = twoFactorCode.trim();
    }

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return parseJsonOrThrow<MobileLoginResponse>(res, 'Usuario o contraseña incorrectos');
  }

  static async getMe() {
    const res = await mobileFetch('/auth/me');
    return parseJsonOrThrow(res, 'Sesión inválida o expirada');
  }

  static async logout(refreshToken?: string | null) {
    try {
      await mobileFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
    } catch {
      // Ignora error de red al cerrar sesión
    } finally {
      await clearPersistedSession();
    }
  }

  static async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    const res = await mobileFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    return parseJsonOrThrow(res, 'No se pudo actualizar la contraseña');
  }

  /**
   * Monitor público de tasas en vivo (BCV, Paralelo, Euro)
   */
  static async getExchangeRates(token?: string) {
    const res = await mobileFetch('/exchange-rates/monitor', {}, token);
    return parseJsonOrThrow<{
      bcv: number;
      paralelo: number;
      euro: number;
      updatedAt?: string;
      source?: string;
    }>(res, 'Error consultando tasas de cambio');
  }

  /**
   * Tasa activa del comercio con exchangeRateSnapshotId real
   */
  static async getActiveRate() {
    const res = await mobileFetch('/exchange-rates/active');
    return parseJsonOrThrow<{
      exchangeRateSnapshotId?: string;
      activeRate?: number;
      rate?: number;
      source?: string;
    }>(res, 'Error consultando tasa activa del comercio');
  }

  static async selectActiveRate(source: 'BCV' | 'PARALELO' | 'EURO' | 'CUSTOM', customRateValue?: number) {
    const res = await mobileFetch('/exchange-rates/select-active', {
      method: 'POST',
      body: JSON.stringify({ source, customRateValue }),
    });
    return parseJsonOrThrow(res, 'No se pudo actualizar la tasa activa');
  }

  static async setManualRate(newRate: number, reason?: string) {
    const res = await mobileFetch('/exchange-rates/manual', {
      method: 'PUT',
      body: JSON.stringify({ newRate, reason: reason || 'Ajuste manual desde app móvil' }),
    });
    return parseJsonOrThrow(res, 'No se pudo establecer la tasa manual');
  }

  // --- CAJA (APERTURA Y CIERRE) ---
  static async getCurrentCashSession() {
    const res = await mobileFetch('/cash-sessions/current');
    return parseJsonOrThrow<{ session: any | null }>(res, 'Error consultando turno de caja');
  }

  static async openCashSession(openingBalanceUsd: number, openingBalanceBs: number, notes?: string) {
    const res = await mobileFetch('/cash-sessions/open', {
      method: 'POST',
      body: JSON.stringify({ openingBalanceUsd, openingBalanceBs, notes: notes || undefined }),
    });
    return parseJsonOrThrow(res, 'No se pudo abrir la caja');
  }

  static async closeCashSession(closingDeclaredUsd: number, closingDeclaredBs?: number, notes?: string) {
    const res = await mobileFetch('/cash-sessions/close', {
      method: 'POST',
      body: JSON.stringify({ closingDeclaredUsd, closingDeclaredBs, notes: notes || undefined }),
    });
    return parseJsonOrThrow(res, 'No se pudo cerrar la caja');
  }

  // --- PRODUCTOS E INVENTARIO ---
  static async getProducts(token?: string) {
    const res = await mobileFetch('/products', {}, token);
    return parseJsonOrThrow(res, 'Error consultando inventario');
  }

  static async findByBarcode(token: string, barcode: string) {
    const res = await mobileFetch(`/products/by-barcode/${encodeURIComponent(barcode)}`, {}, token);
    if (res.status === 404) return null;
    return parseJsonOrThrow(res, 'Error en consulta de código de barras');
  }

  static async createProduct(token: string, productData: any) {
    const res = await mobileFetch('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }, token);
    return parseJsonOrThrow(res, 'Error registrando el producto');
  }

  static async adjustStock(productId: string, newQuantity: number, reason: string) {
    const res = await mobileFetch('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ productId, newQuantity, reason }),
    });
    return parseJsonOrThrow(res, 'Error ajustando inventario');
  }

  static async applyGlobalMargin(marginPercent: number) {
    const res = await mobileFetch('/products/apply-global-margin', {
      method: 'POST',
      body: JSON.stringify({ marginPercent }),
    });
    return parseJsonOrThrow(res, 'Error aplicando margen global');
  }

  // --- CLIENTES ---
  static async getCustomers() {
    const res = await mobileFetch('/customers');
    return parseJsonOrThrow(res, 'Error consultando clientes');
  }

  static async lookupCustomer(documentType: string, documentNumber: string) {
    const res = await mobileFetch(
      `/customers/lookup?document_type=${encodeURIComponent(documentType)}&document_number=${encodeURIComponent(documentNumber)}`
    );
    if (res.status === 404) return null;
    return parseJsonOrThrow(res, 'Error consultando cliente');
  }

  static async createQuickCustomer(payload: {
    documentType: 'V' | 'E' | 'J' | 'G' | 'P';
    documentNumber: string;
    name: string;
    phone?: string;
  }) {
    const res = await mobileFetch('/customers/quick', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return parseJsonOrThrow(res, 'No se pudo registrar el cliente');
  }

  // --- VENTAS Y FACTURACIÓN ---
  static async getSales() {
    const res = await mobileFetch('/sales');
    return parseJsonOrThrow(res, 'Error consultando ventas');
  }

  static async confirmSale(token: string, saleData: any, idempotencyKey?: string) {
    const key = idempotencyKey || `mob-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const res = await mobileFetch(
      '/sales',
      {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify(saleData),
      },
      token
    );
    return parseJsonOrThrow(res, 'Error procesando la venta en el servidor');
  }

  static async auditShare(saleId: string, result: string) {
    try {
      await mobileFetch(`/sales/${encodeURIComponent(saleId)}/audit-share`, {
        method: 'POST',
        body: JSON.stringify({ result }),
      });
    } catch {
      // No bloquear al usuario por telemetría
    }
  }

  static async auditPrint(saleId: string) {
    try {
      await mobileFetch(`/sales/${encodeURIComponent(saleId)}/audit-print`, {
        method: 'POST',
        body: JSON.stringify({ channel: 'MOBILE_THERMAL' }),
      });
    } catch {
      // No bloquear
    }
  }

  // --- PROVEEDORES, PEDIDOS Y COBRANZAS ---
  static async getSuppliers() {
    const res = await mobileFetch('/suppliers');
    return parseJsonOrThrow(res, 'Error consultando proveedores');
  }

  static async createSupplier(payload: any) {
    const res = await mobileFetch('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return parseJsonOrThrow(res, 'No se pudo guardar el proveedor');
  }

  static async getPurchaseOrders() {
    const res = await mobileFetch('/purchase-orders');
    return parseJsonOrThrow(res, 'Error consultando órdenes de compra');
  }

  static async createPurchaseOrder(payload: any) {
    const res = await mobileFetch('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return parseJsonOrThrow(res, 'No se pudo crear la orden de compra');
  }

  static async getDebtors() {
    const res = await mobileFetch('/receivables/debtors');
    return parseJsonOrThrow(res, 'Error consultando deudores');
  }

  static async registerReceivablePayment(payload: any) {
    const res = await mobileFetch('/receivables/payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return parseJsonOrThrow(res, 'Error registrando abono');
  }

  // --- CAJEROS Y CONFIGURACIÓN ---
  static async getCashiersLive() {
    const res = await mobileFetch('/cashiers/live');
    return parseJsonOrThrow(res, 'Error consultando cajeros en vivo');
  }

  static async getConfig() {
    const res = await mobileFetch('/config');
    return parseJsonOrThrow(res, 'Error consultando configuración');
  }

  static async updateConfig(payload: any) {
    const res = await mobileFetch('/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return parseJsonOrThrow(res, 'Error guardando configuración');
  }

  // --- SÚPER ADMINISTRADOR ---
  static async getSuperAdminTenants() {
    const res = await mobileFetch('/super-admin/tenants');
    return parseJsonOrThrow(res, 'Error consultando comercios');
  }

  static async createTenant(payload: any) {
    const res = await mobileFetch('/super-admin/tenants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return parseJsonOrThrow(res, 'Error creando comercio');
  }

  static async toggleTenantActive(tenantId: string) {
    const res = await mobileFetch(`/super-admin/tenants/${encodeURIComponent(tenantId)}/toggle-active`, {
      method: 'PATCH',
    });
    return parseJsonOrThrow(res, 'Error cambiando estado del comercio');
  }

  static async getBackup() {
    const res = await mobileFetch('/admin/backup');
    return parseJsonOrThrow(res, 'Error generando respaldo');
  }
}
