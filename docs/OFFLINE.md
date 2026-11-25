# Arquitectura de Sincronización y Reconciliación Offline - Vuelto

Este documento detalla el funcionamiento del motor de sincronización fuera de línea para la aplicación móvil (POS Cajero) y la resolución de discrepancias en el backend.

---

## 1. Almacenamiento Local en Dispositivo Móvil

Cuando el dispositivo móvil pierde conexión a internet o WiFi:
1. Las ventas se persisten en almacenamiento local seguro (SQLite / Zustand persistido en FileSystem).
2. Cada venta offline recibe un identificador universal único inmutable generado en el cliente: `clientAssignedUuid` (UUID v4).
3. Se registra `localTimestamp` con la hora exacta en la que el cliente realizó el pago frente al cajero.
4. El cajero puede imprimir el ticket fiscal/recibo localmente mediante Bluetooth o compartir comprobante sin requerir internet.

---

## 2. Protocolo de Sincronización Idempotente en Batch

Al recuperar la conexión a internet:
- El cliente ejecuta automáticamente:
  `POST /api/v1/sync/offline-batch`
- **Garantía de Idempotencia:**
  - El backend verifica si ya existe una venta con ese `client_assigned_uuid` para el tenant.
  - Si ya existe (por ejemplo, timeout de red tras un envío previo): **ignora la duplicación y retorna la venta existente sin duplicar cobros ni descontar inventario doble**.

---

## 3. Resolución de Discrepancias y Déficit de Stock

En un entorno offline, es posible que dos cajeros vendan la última unidad de un producto al mismo tiempo:

| Escenario | Comportamiento del Sistema |
| :--- | :--- |
| **Stock Suficiente** | Se aprueba la venta con estado `COMPLETED`, se descuenta el stock en `product_stock` y se registra el movimiento en Kardex. |
| **Stock Insuficiente (Déficit)** | **La venta NO se rechaza.** Se guarda con estado `SYNCED_WITH_STOCK_DEFICIT`. |
| **Alerta Operativa** | Se incrementa el contador de Prometheus `alerts_low_stock_total` para el tenant y se genera un log de auditoría. |
| **Panel de Revisión** | El administrador puede auditar todas las ventas con déficit mediante `GET /api/v1/sync/discrepancies` para coordinar compras o inventario físico. |
