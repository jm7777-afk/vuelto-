export interface CachedProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  taxRate: number;
  stock: number;
  unit: string;
  isBulk: boolean;
}

/**
 * Servicio de Caché Local Offline de Productos para Vuelto POS Mobile
 * Almacena productos por tenant para permitir facturación y escaneo sin conexión
 */
export class ProductCacheService {
  private static cache = new Map<string, Map<string, CachedProduct>>();

  /**
   * Sincroniza un lote de productos en la caché local del tenant
   */
  static syncCatalog(tenantId: string, products: CachedProduct[]): void {
    if (!this.cache.has(tenantId)) {
      this.cache.set(tenantId, new Map());
    }
    const tenantMap = this.cache.get(tenantId)!;
    for (const p of products) {
      if (p.barcode) {
        tenantMap.set(p.barcode.trim(), p);
      }
    }
  }

  /**
   * Busca un producto por código de barras en la caché local
   */
  static findByBarcode(tenantId: string, barcode: string): CachedProduct | null {
    const tenantMap = this.cache.get(tenantId);
    if (!tenantMap) return null;
    return tenantMap.get(barcode.trim()) || null;
  }

  /**
   * Agrega o actualiza un producto individual en la caché
   */
  static upsertProduct(tenantId: string, product: CachedProduct): void {
    if (!this.cache.has(tenantId)) {
      this.cache.set(tenantId, new Map());
    }
    this.cache.get(tenantId)!.set(product.barcode.trim(), product);
  }

  /**
   * Obtiene todos los productos cacheados del tenant
   */
  static getAll(tenantId: string): CachedProduct[] {
    const tenantMap = this.cache.get(tenantId);
    if (!tenantMap) return [];
    return Array.from(tenantMap.values());
  }

  /**
   * Limpia la caché del tenant (ej. al cerrar sesión)
   */
  static clear(tenantId?: string): void {
    if (tenantId) {
      this.cache.delete(tenantId);
    } else {
      this.cache.clear();
    }
  }
}
