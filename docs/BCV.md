# Estrategia de Consulta y Resiliencia de Tasas de Cambio BCV - Vuelto

Este documento especifica la arquitectura de consulta, almacenamiento, caducidad y fallback de la tasa oficial del Banco Central de Venezuela (BCV) y tasas complementarias en **Vuelto**.

---

## 1. Cadena de Fallback (Resiliencia 99.99%)

Debido a la volatilidad de conectividad y bloqueos de red en Venezuela, la plataforma implementa una estrategia jerárquica de 4 niveles:

```
[Cliente POS / App]
       │
       ▼
 1. Fuente Primaria: API en Vivo Oficial (ve.dolarapi.com / BCV directo)
       │ (Timeout: 8s con AbortController)
       ▼ (Si falla)
 2. Fallback 1: Mirror de Contingencia / Caché en Memoria del Proceso
       │ (Último valor exitoso registrado en RAM)
       ▼ (Si reinicio en frío)
 3. Fallback 2: Último Snapshot Registrado en PostgreSQL
       │ (SELECT ... FROM exchange_rate_snapshots ORDER BY valid_from DESC)
       ▼ (Si base de datos vacía o >24h)
 4. Fallback 3: Tasa de Emergencia Ajustada Manualmente por Administrador
```

---

## 2. Detección de Tasa Caducada (Stale Rate > 24 Horas)

- Si la última tasa registrada tiene una antigüedad mayor a **24 horas** respecto a la hora del servidor:
  - El payload de respuesta incluye: `isStale: true`.
  - Se genera el campo `warningMessage`: `"ADVERTENCIA: La tasa de cambio tiene más de 24 horas sin actualizar."`.
  - La interfaz de caja (POS) muestra una alerta visual amarilla/naranja informando al cajero y permitiendo reintentar la sincronización o solicitar intervención del administrador.

---

## 3. Ajuste Manual de Tasa por Administrador

Cuando la red externa colapsa totalmente o se decreta una tasa especial autorizada:

- **Endpoint:** `PUT /api/v1/exchange-rates/manual`
- **Permisos:** Requiere rol `ADMIN` del tenant.
- **Payload:**
  ```json
  {
    "newRate": 925.50,
    "reason": "Caída prolongada de conectividad externa; ajuste según publicación BCV en prensa"
  }
  ```
- **Auditoría Inmutable:**
  Cada ajuste manual genera obligatoriamente un registro en `audit_logs` con:
  - `action`: `EXCHANGE_RATE_MANUAL_OVERRIDE`
  - `userId`: Identificador del administrador
  - `payload`: `{ oldRate, newRate, reason, adjustedBy }`
  - `result`: `SUCCESS`
