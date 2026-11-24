export const API_BASE_URL = 'https://vuelto.onrender.com/api/v1';

export interface MobileLoginResponse {
  message: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
  };
  user: {
    id: string;
    tenantId: string;
    username: string;
    fullName: string;
    roleId: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
    businessName: string;
  };
}

export class MobileApiService {
  /**
   * Inicio de Sesión Real contra Supabase
   */
  static async login(username: string, password: string): Promise<MobileLoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error de credenciales en el servidor');
    }

    return res.json();
  }

  /**
   * Monitor de Tasas de Cambio en Vivo (BCV, Paralelo, Euro, USDT)
   */
  static async getExchangeRates(token?: string) {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/exchange-rates/monitor`, { headers });
    if (!res.ok) throw new Error('Error consultando tasas de cambio');
    return res.json();
  }

  /**
   * Catálogo de Productos y Balanza
   */
  static async getProducts(token: string) {
    const res = await fetch(`${API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error consultando inventario');
    return res.json();
  }

  /**
   * Búsqueda por Escáner de Código de Barras
   */
  static async findByBarcode(token: string, barcode: string) {
    const res = await fetch(`${API_BASE_URL}/products/barcode/${encodeURIComponent(barcode)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Facturación Atómica Idempotente (SENIAT Compliant)
   */
  static async confirmSale(token: string, saleData: any) {
    const idempotencyKey = `mob-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const res = await fetch(`${API_BASE_URL}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(saleData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error procesando la venta en el servidor');
    }

    return res.json();
  }
}
