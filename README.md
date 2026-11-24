# 🇻🇪 Vuelto - Plataforma SaaS Multi-Tenant de Facturación e Inventario

Plataforma integral de punto de venta (POS), inventario, clientes y facturación diseñada específicamente para el ecosistema comercial venezolano (abastos, bodegas, ferreterías, farmacias y medianos comercios).

---

## 🚀 Arquitectura y Componentes del Sistema

1. **Backend REST API (`/backend`)**:
   - **Node.js 20+** con **TypeScript (strict mode)** y **Express 5**.
   - **PostgreSQL** administrado a través de **Drizzle ORM** (21 tablas relacionales).
   - **Aislamiento Multi-Tenant por Fila**: Extracción estricta de `tenant_id` exclusivamente desde el JWT verificado en el servidor.
   - **Cumplimiento Fiscal SENIAT**:
     - Numeración correlativa consecutiva sin saltos mediante bloqueos pesimistas (`SELECT ... FOR UPDATE`).
     - Desglose formal de alícuotas (16% General, 8% Reducida, 0% Exenta).
     - Percepción obligatoria del **3% IGTF** sobre pagos en divisas / USD en efectivo.
     - Validador Módulo 11 oficial para RIF (V, E, J, G, P).
     - Detección de prefijo venezolano GS1 **759**.
     - Generador del Libro Oficial de Ventas SENIAT en formato CSV UTF-8 con BOM (`\uFEFF`).
   - **Bimoneda & Tasas**: Congelamiento de tasa de cambio oficial (BCV) por factura histórica (`exchange_rate_id`).
   - **Vuelto & Monedero**: Manejo de vuelto con Vale de Cambio térmico con QR/código de barras y saldo a favor en cuenta corriente del cliente.
   - **Básculas**: Parser de códigos EAN-13 generados por balanzas de carnicería/charcutería (prefijos 20, 21, 22).
   - **Apertura de Gaveta RJ11**: Pulso ESC/POS automático en ventas en efectivo (`0x1B, 0x70`).
   - **Sincronización Offline**: Endpoint idempotente por lotes `/api/v1/sales/sync-batch`.

2. **Mobile App POS & Admin (`/mobile`)**:
   - **React Native (Expo SDK 52)** en TypeScript.
   - **Modo POS**: Facturación ultra-rápida, escaneo de códigos de barra por cámara, hasta 10 cuentas abiertas simultáneas (Held Carts), cobro bimoneda en tiempo real.
   - **Modo Admin Móvil**: Ajuste de stock rápido, consulta de cuentas por cobrar, tasas de cambio y auditoría.
   - **Impresión Térmica**: Generación de tickets ESC/POS para impresoras Bluetooth de 58 mm (32 cols) y 80 mm (48 cols).
   - **Compartir Facturas**: Envío nativo de PDF mediante el Share Sheet del sistema operativo (WhatsApp, Telegram, Correo, etc.).

3. **Web Admin Panel (`/web`)**:
   - **React 18** SPA con **Vite** y **Lucide Icons** para administración de inventario, proveedores, clientes, reportes y tasas desde escritorio.

---

## ☁️ Despliegue en Render (Render Blueprint)

El repositorio incluye el archivo [`render.yaml`](./render.yaml) listo para el despliegue automático en Render mediante **Blueprints**:

### Pasos para desplegar en Render:
1. Conecta tu cuenta de GitHub con [Render.com](https://render.com).
2. Crea un **New +** -> **Blueprint**.
3. Selecciona este repositorio (`vuelto-`).
4. Render aprovisionará automáticamente:
   - **Base de Datos PostgreSQL** (`vuelto-db`).
   - **Web Service API** (`vuelto-api`) compilando TypeScript y levantando en Node.js.
   - **Static Site Web Admin** (`vuelto-admin`) compilando la SPA en Vite.
5. El endpoint de salud estará activo en: `https://vuelto-api.onrender.com/health`.

### Variables de Entorno del Backend:
| Variable | Descripción | Valor por Defecto / Producción |
|---|---|---|
| `PORT` | Puerto de escucha | Inyectado por Render (ej. 10000) o 4000 local |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL | Inyectada automáticamente por Render Postgres |
| `JWT_SECRET` | Clave secreta para tokens JWT | Generada aleatoriamente por Render Blueprint |
| `JWT_REFRESH_SECRET` | Clave secreta para Refresh Tokens | Generada aleatoriamente por Render Blueprint |
| `MOCK_PAYMENT_ENABLED` | Simulación de pasarela de pago | `true` para pruebas |

---

## 🛠️ Ejecución Local

### 1. Clonar e Instalar
```bash
git clone https://github.com/jm7777-afk/vuelto-.git
cd vuelto-
```

### 2. Backend
```bash
cd backend
npm install
npm test            # Ejecutar suite de 42 pruebas automatizadas
npm run dev         # Servidor de desarrollo con recarga en caliente
```

### 3. Frontend Web Admin
```bash
cd ../web
npm install
npm run dev         # Iniciar Vite en http://localhost:5173
```

### 4. App Móvil (React Native)
```bash
cd ../mobile
npm install
npx expo start      # Iniciar Metro Bundler
```

---

## 📱 Compilación del Instalador APK para Android

Para generar el archivo ejecutable `.apk` instalable en teléfonos Android:

```bash
cd mobile/android
./gradlew assembleRelease
```
El archivo compilado se genera en:
`mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## 📄 Licencia y Aviso Legal
Sistema desarrollado para el mercado venezolano con soporte para las normativas del **SENIAT**. Todos los derechos reservados.
