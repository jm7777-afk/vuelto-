# 🚀 Guía de Implementación: Vuelto con Supabase desde Cero

Esta guía está diseñada paso a paso para desplegar y conectar la plataforma **Vuelto** utilizando **Supabase** como infraestructura de base de datos PostgreSQL en la nube, sin necesidad de conocimientos previos.

---

## 1. ¿Qué es Supabase y por qué encaja perfectamente con Vuelto?

- **Supabase** es una plataforma que te entrega una base de datos **PostgreSQL 15+ gestionada en la nube**, segura, rápida y con copias de seguridad automáticas.
- **Vuelto** fue construido nativamente sobre **PostgreSQL con Drizzle ORM**.
- **Ventaja clave:** No tienes que cambiar ni una sola línea de código en Vuelto. Supabase simplemente reemplaza el PostgreSQL local por uno en la nube con un panel visual espectacular.

---

## 2. Paso 1: Crear tu Cuenta y Proyecto en Supabase (2 minutos)

1. Ingresa en tu navegador a [https://supabase.com](https://supabase.com).
2. Haz clic en el botón verde **Start your project**.
3. Selecciona **Continue with GitHub** (puedes usar la misma cuenta de GitHub donde está alojado el repositorio `vuelto-`).
4. Si es tu primera vez, te pedirá un nombre de organización: escribe por ejemplo `Vuelto Org`.
5. En el panel principal, haz clic en el botón verde **New Project** (Nuevo Proyecto):
   - **Name (Nombre):** `vuelto-pos`
   - **Database Password (Contraseña de BD):** Escribe una contraseña segura (ejemplo: `Vuelto2026!ClaveNube`).
     > ⚠️ **IMPORTANTE:** Guarda esta contraseña en un lugar seguro (bloc de notas), la necesitarás en el siguiente paso.
   - **Region (Región):** Selecciona **East US (North Virginia) - us-east-1** (es la región con menor latencia y ping hacia Venezuela).
   - **Pricing Plan:** Selecciona **Free Plan** ($0/mes, incluye 500 MB de base de datos y 1 GB de almacenamiento).
6. Haz clic en **Create new project**.
7. Espera aproximadamente 1 a 2 minutos mientras Supabase aprovisiona el servidor.

---

## 3. Paso 2: Obtener tu Cadena de Conexión (`DATABASE_URL`)

Una vez que tu proyecto esté activo:

1. En el menú lateral izquierdo de Supabase, haz clic en el ícono de **Project Settings** (engranaje ⚙️ abajo a la izquierda).
2. En la lista de opciones, entra en **Database** (Base de Datos).
3. Desplázate hacia abajo hasta la sección llamada **Connection string** (Cadena de conexión).
4. Selecciona la pestaña **URI**.
5. Verás dos modos:
   - **Session Mode / Direct** (puerto 5432):
     ```text
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres
     ```
   - **Transaction Mode / Pooler** (puerto 6543):
     ```text
     postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     ```
6. Copia la URL del modo **Session Mode** (o Pooler).
7. Reemplaza `[YOUR-PASSWORD]` por la contraseña exacta que creaste en el Paso 1.
8. Al final de la URL, añade `?sslmode=require` para conexión segura cifrada.
   Ejemplo final:
   ```text
   postgresql://postgres:Vuelto2026!ClaveNube@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=require
   ```

---

## 4. Paso 3: Crear las 21 Tablas en Supabase con 1 Solo Comando

No tienes que escribir SQL ni crear tablas manualmente en la interfaz. El comando `db:push` de Drizzle lee el esquema del proyecto y crea todo en Supabase automáticamente.

1. En tu computadora, abre la carpeta `c:\Users\Windows\Desktop\vuelto\backend`.
2. Crea o edita el archivo `.env` en `backend/` y pega tu cadena de conexión:
   ```env
   PORT=4000
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres:TU_PASSWORD_AQUI@db.TU_PROYECTO.supabase.co:5432/postgres?sslmode=require
   JWT_SECRET=super-secret-jwt-key-vuelto-2026-production-min32chars
   JWT_REFRESH_SECRET=super-secret-refresh-key-vuelto-2026-min32chars
   MOCK_PAYMENT_ENABLED=true
   ```
3. Abre una terminal en `backend` y ejecuta:
   ```bash
   npm run db:push
   ```
   > ✨ **¿Qué ocurre?** Drizzle se conecta a Supabase y crea de inmediato las 21 tablas relacionales: `tenants`, `users`, `products`, `product_barcodes`, `sales`, `sale_lines`, `customers`, `customer_contacts`, `vouchers`, `exchange_rate_snapshots`, `audit_logs`, etc.

4. Ahora ejecuta el sembrado inicial de datos (roles y tienda demo):
   ```bash
   npm run db:seed
   ```
   > ✨ **¿Qué ocurre?** Se insertan los 4 roles del sistema, la tienda de prueba *Bodega Central C.A.* y los usuarios iniciales:
   > - **Administrador:** Usuario: `admin` | Clave: `Vuelto2026!`
   > - **Cajero:** Usuario: `cajero1` | Clave: `Vuelto2026!`

---

## 5. Paso 4: Explorar tus Datos Visualmente en Supabase

1. Regresa a la pestaña de Supabase en tu navegador.
2. En el menú lateral izquierdo, haz clic en **Table Editor** (ícono de tabla 📊).
3. Verás la lista completa de tablas en el esquema `public`:
   - Haz clic en `tenants` y verás la tienda *Bodega Central C.A.*
   - Haz clic en `roles` y verás `SUPER_ADMIN`, `ADMIN`, `VENDEDOR`, `CONSULTA`.
   - Haz clic en `users` y verás los usuarios creados.
4. Puedes agregar productos, editar precios o consultar facturas directamente desde este panel visual como si fuera una hoja de cálculo.

---

## 6. Paso 5: Conectar Render con tu Base de Datos Supabase

Para que tu API pública en **Render** use esta base de datos en Supabase:

1. Ve a tu panel de [Render.com](https://dashboard.render.com).
2. Haz clic en tu servicio web **`vuelto-api`**.
3. En el menú izquierdo, entra en **Environment** (Variables de entorno).
4. Busca la variable **`DATABASE_URL`** y haz clic en editar.
5. Pega tu URL de Supabase:
   ```text
   postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres?sslmode=require
   ```
6. Haz clic en **Save Changes** (Guardar cambios).
7. Render redeplegará automáticamente la API conectada a Supabase.

---

## 7. Paso 6: Conectar la App Móvil y el Administrador Web

1. **Panel Web Admin:**
   En `web/.env` configuras:
   ```env
   VITE_API_URL=https://tu-api-en-render.onrender.com
   ```
2. **App Móvil (APK):**
   El archivo `vuelto-pos-v1.0.0.apk` ya tiene configurado el cliente HTTP para interactuar con la API REST conectada a la base de datos Supabase.

---

## 8. Funciones Avanzadas de Supabase Opcionales para Vuelto

| Función | Cómo aprovecharla en Vuelto |
|---|---|
| **SQL Editor** | Puedes ejecutar consultas SQL avanzadas, reportes fiscales o auditorías directas desde la web. |
| **Backups automáticos** | Supabase realiza copias de seguridad diarias de tu base de datos sin costo adicional. |
| **Supabase Storage** | Puedes crear un bucket `facturas-pdf` para alojar los comprobantes digitales generados por PDFKit. |
| **Row Level Security (RLS)** | Seguridad adicional a nivel de base de datos para aislar los datos de cada tienda por `tenant_id`. |
