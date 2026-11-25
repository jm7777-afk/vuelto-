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

## 🐳 Despliegue con Docker (Producción en 1 Comando)

El repositorio incluye un `Dockerfile` multi-stage y `docker-compose.yml` listos para producción con base de datos PostgreSQL 16 y compilación automática del frontend y backend:

```bash
# Iniciar base de datos y aplicación Vuelto en producción
docker compose up -d --build

# Verificar estado de los contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f app
```

La aplicación quedará accesible en `http://localhost:4000` con la API REST y el panel web administrativo unificados.

---

## 🔑 Credenciales y Aprovisionamiento Seguro (Seed)

Al desplegar en producción y ejecutar las migraciones iniciales (`npm run db:migrate`), las contraseñas se configuran exclusivamente a través de las siguientes variables de entorno:

| Rol | Usuario | Variable de Entorno de Contraseña | Alcance y Permisos |
|---|---|---|---|
| **Súper Administrador** | Configurable (`SEED_SUPERADMIN_USER` o `superadmin`) | `SEED_SUPERADMIN_PASSWORD` | Acceso global a todos los tenants, creación de negocios, edición fiscal y suspensión/baja. |
| **Administrador de Tienda** | `admin` | `SEED_ADMIN_PASSWORD` | Control total de inventario, márgenes en USD, cuentas por cobrar y tasas de cambio. |
| **Cajero / Vendedor** | `cajero1` | `SEED_CASHIER_PASSWORD` | Facturación en mostrador, terminal POS ultra-limpio, escáner y cobro con vuelto. |

> **IMPORTANTE:** En producción (`NODE_ENV=production`), estas variables son **estrictamente obligatorias**. El proceso de seed abortará si no se definen explícitamente en el entorno.

---

## 🔐 Rotación de Credenciales

Si se desplegó una base de datos con contraseñas de desarrollo anteriores, ejecute la siguiente sentencia SQL en PostgreSQL para actualizar de inmediato los hashes de las 3 cuentas maestras:

```sql
-- Generar hashes seguros (bcrypt / argon2) y ejecutar en PostgreSQL:
UPDATE users 
SET password_hash = '$2a$10$NUEVO_HASH_BCRYPT_AQUI', 
    updated_at = NOW() 
WHERE username = 'superadmin';

UPDATE users 
SET password_hash = '$2a$10$NUEVO_HASH_BCRYPT_AQUI', 
    updated_at = NOW() 
WHERE username = 'admin';

UPDATE users 
SET password_hash = '$2a$10$NUEVO_HASH_BCRYPT_AQUI', 
    updated_at = NOW() 
WHERE username = 'cajero1';
```

Consulte [`docs/SECURITY_INCIDENT_2026-11-25.md`](./docs/SECURITY_INCIDENT_2026-11-25.md) para el reporte de contención detallado.

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
npm test            # Ejecutar suite de 50 pruebas automatizadas (100% passing)
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
