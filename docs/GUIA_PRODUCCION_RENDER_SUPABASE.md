# 🏢 Guía Maestra de Despliegue en Producción: Render + Supabase (100% Operativo)

Esta guía documenta la arquitectura y el procedimiento paso a paso para dejar la plataforma **Vuelto** completamente operativa en un entorno de producción real utilizando **Supabase** (Base de Datos PostgreSQL gestionada) y **Render** (Servidor de Aplicaciones y Panel Web).

---

## 📐 1. Arquitectura de Producción

```
                      INTERNET / CLIENTES
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     APP MÓVIL (ANDROID APK)   │               │       PANEL WEB ADMIN         │
│  • Modo POS (Cajero Rápido)   │               │  • Inventario y Proveedores   │
│  • Modo Administrador Móvil   │               │  • Clientes y Cuentas x Cobrar│
│  • Escáner Cámara / Báscula   │               │  • Reportes Fiscales SENIAT   │
│  • Impresora Térmica Bluetooth│               │  • React 18 SPA (Vite)        │
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │                                               │
                │        HTTPS / REST API (JWT Seguro)          │
                └───────────────────────┬───────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │      RENDER (WEB SERVICE)     │
                        │  Servicio: "vuelto-api"       │
                        │  • Node.js 24 + Express 5     │
                        │  • Aislamiento Multi-Tenant   │
                        │  • Generación PDF y ESC/POS   │
                        │  • Bloqueos Pesimistas        │
                        │  • Tasa Oficial BCV Polling   │
                        └───────────────┬───────────────┘
                                        │
                        PostgreSQL SSL (Puerto 6543/5432)
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │       SUPABASE (DATABASE)     │
                        │  • PostgreSQL 15+ Gestionado  │
                        │  • 21 Tablas Relacionales     │
                        │  • Supavisor Connection Pool  │
                        │  • Copias de Seguridad Diarias│
                        │  • Auditoría Inmutable        │
                        └───────────────────────────────┘
```

---

## 🗄️ 2. FASE 1: Configurar Supabase (La Base de Datos)

### Paso 1.1: Crear el Proyecto
1. Ingresa a [https://supabase.com](https://supabase.com) e inicia sesión con tu cuenta de GitHub.
2. Crea un proyecto con los siguientes parámetros:
   - **Nombre:** `vuelto-pos`
   - **Database Password:** Elige una contraseña alfanumérica segura (ej. `Vuelto2026!ProdSecure`). Guárdala.
   - **Región:** `East US (North Virginia) - us-east-1` (menor latencia hacia Venezuela).
   - **Plan:** Free ($0/mes) o Pro según tu volumen.

### Paso 1.2: Crear el Esquema y los Datos Iniciales
1. En el menú lateral izquierdo de Supabase, entra a **SQL Editor** (ícono `>_`).
2. Haz clic en **+ New query**.
3. Abre el archivo [`supabase_setup.sql`](../supabase_setup.sql) de este repositorio, copia todo su contenido y pégalo en la ventana de Supabase.
4. Haz clic en **RUN**.
5. Ve a **Table Editor** (ícono 📊) y confirma que aparezcan las 21 tablas relacionales y el comercio de prueba en `tenants`.

### Paso 1.3: Copiar la Cadena de Conexión
1. Ve a **Project Settings** (engranaje ⚙️) ➔ **Database**.
2. Desplázate hasta **Connection string** y selecciona **URI**.
3. Copia la URL del modo **Session Mode** (o Pooler puerto 6543) y añade `?sslmode=require` al final:
   ```text
   postgresql://postgres:[TU_PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres?sslmode=require
   ```

---

## ☁️ 3. FASE 2: Configurar Render (El Servidor Backend)

### Paso 2.1: Crear el Servicio Web
1. Entra a [https://dashboard.render.com](https://dashboard.render.com).
2. Haz clic en **New +** ➔ **Web Service**.
3. Selecciona tu repositorio de GitHub: `jm7777-afk/vuelto-`.
4. Configura los parámetros principales:
   - **Name:** `vuelto-api`
   - **Region:** `Ohio (US East)` o `Oregon (US West)` (cercano a Supabase us-east-1).
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
   - **Plan Type:** `Free` ($0/mes).

### Paso 2.2: Configurar las Variables de Entorno en Render
En la pestaña **Environment** de tu servicio en Render, agrega las siguientes variables:

| Clave (Key) | Valor (Value) | Descripción |
|---|---|---|
| `NODE_ENV` | `production` | Activa optimizaciones y cachés de producción |
| `PORT` | `10000` | Puerto interno de escucha de Render |
| `DATABASE_URL` | `postgresql://postgres:TU_CLAVE@db.TU_PROYECTO.supabase.co:5432/postgres?sslmode=require` | Conexión cifrada a Supabase |
| `JWT_SECRET` | `super-secret-jwt-key-vuelto-2026-production-min32chars` | Firma criptográfica de tokens de acceso (15m) |
| `JWT_REFRESH_SECRET` | `super-secret-refresh-key-vuelto-2026-min32chars` | Firma de tokens de refresco rotativos (7d) |
| `MOCK_PAYMENT_ENABLED` | `true` | Habilita pasarela de pruebas Pago Móvil / C2P |

### Paso 2.3: Configurar el Health Check
1. En la configuración del servicio en Render, ve a **Advanced**.
2. En **Health Check Path**, coloca:
   ```text
   /health
   ```
3. Guarda los cambios. Render verificará la salud de la aplicación consultando este endpoint.

---

## 🌐 4. FASE 3: Configurar el Panel Web Admin en Render

1. En Render, haz clic en **New +** ➔ **Static Site**.
2. Selecciona el mismo repositorio `jm7777-afk/vuelto-`.
3. Parámetros:
   - **Name:** `vuelto-admin`
   - **Branch:** `main`
   - **Root Directory:** `web`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. En **Environment Variables**:
   - `VITE_API_URL`: La URL pública que Render le asignó a tu backend (ej. `https://vuelto-api.onrender.com`).
5. Haz clic en **Create Static Site**.

---

## 📱 5. FASE 4: Configurar la Aplicación Móvil (APK)

El archivo instalable compilado se encuentra listo en la raíz del proyecto:
👉 [`vuelto-pos-v1.0.0.apk`](../vuelto-pos-v1.0.0.apk)

### Pasos de instalación y prueba:
1. Pasa el archivo `.apk` a tu teléfono Android o terminal POS (por WhatsApp Web, USB o Google Drive).
2. Toca el archivo en el teléfono e instálalo (permite "Instalar aplicaciones de fuentes desconocidas").
3. Abre la app:
   - **Modo POS:** Permite facturación rápida, escaneo de códigos de barras (incluso balanzas 20/21/22), manejo de hasta 10 cuentas abiertas simultáneas (Held Carts) y cobro bimoneda (USD / Bs).
   - **Modo Administrador Móvil:** Accesible tocando el selector de rol (para usuarios con rol `ADMIN`), permitiendo ajustes de stock, auditoría y consulta de cuentas por cobrar.

---

## 🧪 6. Checklist de Verificación 100% Operativo

Ejecuta estas pruebas para certificar que todo el flujo funciona de extremo a extremo:

### Prueba 1: Diagnóstico de Base de Datos
Accede desde tu navegador a:
`https://vuelto-api.onrender.com/health`
- **Resultado esperado:**
  ```json
  {
    "status": "ok",
    "service": "vuelto-api",
    "database": "connected"
  }
  ```

### Prueba 2: Inicio de Sesión y Auditoría
Realiza una petición de login desde terminal o Postman:
```bash
curl -X POST https://vuelto-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Vuelto2026!"}'
```
- **Resultado esperado:** Devuelve un token JWT con el perfil del usuario.
- **Verificación en Supabase:** Ve a **Table Editor ➔ users** y verás actualizado `last_login_at`. En **audit_logs** verás el registro inmutable `LOGIN_SUCCESS`.

### Prueba 3: Consulta de Tasa Oficial BCV
```bash
curl -X GET https://vuelto-api.onrender.com/api/v1/exchange-rates/current \
  -H "Authorization: Bearer [TU_ACCESS_TOKEN]"
```
- **Resultado esperado:** Devuelve la tasa oficial del Banco Central de Venezuela congelada para la facturación.

---

## 🛡️ 7. Mantenimiento y Respaldos

1. **Backups en Supabase:** Supabase realiza respaldos diarios automáticos de la base de datos sin necesidad de scripts externos.
2. **Logs en Tiempo Real:** Puedes ver cualquier error en vivo desde la pestaña **Logs** de Render.
3. **Despliegues Continuos:** Cada vez que hagas `git push origin main` a tu repositorio de GitHub, Render compilará y actualizará el servicio automáticamente sin tiempo de inactividad (Zero-Downtime Deployment).
