# Guía de Integración de API Cliente — Vuelto

Esta guía describe cómo interactuar programáticamente con la API REST de Vuelto para autenticación, consulta de inventario, registro de ventas bimonetarias y sincronización fuera de línea.

---

## 1. Autenticación y Manejo de Tokens

La API utiliza autenticación basada en JWT con pares de tokens (Access Token de 15 minutos y Refresh Token con rotación automática).

### Iniciar Sesión (`POST /api/v1/auth/login`)

```bash
curl -X POST https://vuelto.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cajero_principal",
    "password": "TuPasswordSeguro123!"
  }'
```

**Respuesta Exitosa (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "username": "cajero_principal",
    "roleId": "CASHIER",
    "fullName": "Juan Pérez",
    "tenantId": "e0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c"
  }
}
```

### Renovar Token de Acceso (`POST /api/v1/auth/refresh`)

```bash
curl -X POST https://vuelto.onrender.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "TU_REFRESH_TOKEN"
  }'
```

---

## 2. Búsqueda de Productos por Código de Barras

Soporta códigos EAN-13 comerciales estándar y códigos de peso variable generados por balanzas (prefijos 20 y 21).

```bash
curl -X GET https://vuelto.onrender.com/api/v1/products/by-barcode/7591234567890 \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

**Respuesta:**
```json
{
  "id": "p1-uuid-...",
  "sku": "HARINA-01",
  "name": "Harina de Maíz Blanco 1kg",
  "salePriceUsd": "1.2000",
  "taxRate": "16.00",
  "isExempt": false,
  "unitOfMeasure": "UNIDAD",
  "stock": "45.000"
}
```

---

## 3. Confirmación de Venta con Clave de Idempotencia

Para evitar dobles cobros ante caídas de red, envíe siempre el header `Idempotency-Key` (UUIDv4).

```bash
curl -X POST https://vuelto.onrender.com/api/v1/sales \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" \
  -d '{
    "customerId": "00000000-0000-0000-0000-000000000001",
    "exchangeRateId": "rate-uuid-del-dia",
    "lines": [
      {
        "productId": "p1-uuid-...",
        "quantity": 2,
        "unitPriceUsd": 1.20
      }
    ],
    "payments": [
      {
        "paymentMethod": "CASH_USD",
        "currency": "USD",
        "amount": 2.78
      }
    ]
  }'
```

**Respuesta Exitosa (201 Created):**
```json
{
  "id": "sale-uuid-...",
  "invoiceFormattedNumber": "A-00000142",
  "rateValue": "920.0000",
  "totalAmountUsd": "2.78",
  "totalAmountBs": "2557.60",
  "igtfAmountUsd": "0.08",
  "status": "COMPLETED",
  "digitalDeliveryNote": {
    "whatsappUrl": "https://wa.me/584121234567?text=..."
  }
}
```

---

## 4. Sincronización Fuera de Línea (`POST /api/v1/sync/offline-batch`)

Permite a los terminales móviles sincronizar ventas acumuladas localmente durante cortes de energía o Internet.

```bash
curl -X POST https://vuelto.onrender.com/api/v1/sync/offline-batch \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "clientAssignedUuid": "offline-pos1-uuid-001",
      "customerId": "cust-uuid-...",
      "exchangeRateId": "rate-uuid-...",
      "lines": [{ "productId": "p1-uuid", "quantity": 1, "unitPriceUsd": 1.20 }],
      "payments": [{ "paymentMethod": "PAGO_MOVIL", "currency": "VES", "amount": 1280.00 }]
    }
  ]'
```

**Respuesta:**
```json
{
  "totalReceived": 1,
  "syncedCount": 1,
  "duplicateCount": 0,
  "deficitCount": 0,
  "sales": [...]
}
```
