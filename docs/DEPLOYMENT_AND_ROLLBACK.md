# Guía de Despliegue Controlado, Staging y Plan de Rollback — Vuelto

## 1. Variables de Entorno Obligatorias en Producción (`NODE_ENV=production`)

El backend aplica validación estricta (`fail-fast`) al iniciar mediante `backend/src/config/env.ts`. El arranque se aborta si falta cualquiera de las siguientes variables o si contienen secretos de desarrollo:

| Variable | Requisito en Producción | Notas |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Activa validaciones estrictas de CORS, SSL y secretos. |
| `DATABASE_URL` | PostgreSQL remoto con SSL | Nunca `localhost`. Se recomienda usuario de aplicación sin `SUPERUSER` ni `BYPASSRLS`. |
| `DATABASE_SSL_CA` | Ruta o PEM del certificado CA | Habilita verificación estricta de certificados (`rejectUnauthorized: true`). |
| `JWT_SECRET` | Mín. 32 caracteres aleatorios | Rotar inmediatamente ante cualquier compromiso. |
| `JWT_REFRESH_SECRET` | Mín. 32 caracteres aleatorios | Independiente de `JWT_SECRET`. |
| `ENCRYPTION_KEY` | Mín. 32 caracteres aleatorios | Cifra secretos TOTP 2FA en PostgreSQL (`AES-256-GCM`). |
| `ALLOWED_ORIGINS` | Orígenes exactos separados por coma | Ej: `https://vuelto.onrender.com`. **Prohibido usar `*`**. |
| `METRICS_TOKEN` | Mín. 16 caracteres | Token requerido en header `x-metrics-token` o `Authorization: Bearer` para `/metrics`. |
| `PAYMENT_WEBHOOK_SECRET` | Mín. 16 caracteres | Secreto HMAC-SHA256 para validar webhooks en `/api/v1/payments/webhooks`. |
| `INTERNAL_ADMIN_TOKEN` | Mín. 16 caracteres | Requerido si se consulta `/health/deep` sin JWT `ADMIN`/`SUPER_ADMIN`. |
| `MOCK_PAYMENT_ENABLED` | `false` | Obligatorio `false` en producción. |
| `SEED_SUPERADMIN_PASSWORD` | Clave fuerte (>= 12 chars) | Solo si se ejecuta migración inicial en BD nueva. |

---

## 2. Flujo Recomendado: Staging -> Producción

1. **Crear entorno Staging en Render:**
   - Servicio web separado (`vuelto-api-staging`) apuntando a una base de datos PostgreSQL de staging (nunca la base de datos comercial de producción).
2. **Respaldo previo obligatorio antes de migrar producción:**
   ```bash
   ./scripts/backup.sh
   ```
3. **Verificación previa al despliegue:**
   ```bash
   npm run build
   npm --prefix backend test
   ```
4. **Migración controlada:**
   ```bash
   npm --prefix backend run db:migrate
   npm --prefix backend run db:check
   ```
   - `db:migrate` registra versiones aplicadas en `schema_migrations` y fuerza políticas RLS **fail-closed**.
5. **Verificación post-despliegue (Smoke Test):**
   - `GET /health/live` -> `200 { status: "live" }`
   - `GET /health/ready` -> `200 { status: "ready", database: "connected" }`
   - Verificar carga del frontend (`/`), logos nuevos (`/vuelto-logo.jpg`, `/vuelto-icon.jpg`) y login de Súper Administrador.

---

## 3. Plan de Rollback

Si tras un despliegue se detecta regresión o incidente:

1. **Rollback de código en Render (inmediato, < 2 min):**
   - Desde Render Dashboard -> servicio `vuelto-api` -> **Events / Deploys** -> seleccionar el commit estable anterior -> **Rollback to this deploy**.
   - Alternativamente en Git: `git revert <commit_hash> && git push origin main`.
2. **Rollback de base de datos (si hubo cambio de esquema incompatible):**
   - Las tablas nuevas agregadas (`cash_sessions`, `schema_migrations`) son aditivas y retrocompatibles con versiones previas de la API (no eliminan ni alteran datos comerciales previos).
   - En caso de requerir reversión de políticas o restauración completa:
     1. Detener tráfico o activar modo mantenimiento en Render.
     2. Restaurar snapshot / dump previo de Supabase generado antes del despliegue.
     3. Verificar integridad con `npm --prefix backend run db:check` y `psql -f docs/RLS_VERIFY.sql`.

---

## 4. Checklist de Aceptación para Producción

- [ ] `ALLOWED_ORIGINS` configurado con dominio exacto (sin `*`).
- [ ] `MOCK_PAYMENT_ENABLED=false` y secretos aleatorios generados en Render.
- [ ] `npm run build` sincronizó `web/dist` en `backend/public`.
- [ ] `npm --prefix backend test` ejecutado y aprobado al 100%.
- [ ] Respaldo reciente de PostgreSQL confirmado antes de migrar.
- [ ] Contraseña del `SUPER_ADMIN` rotada desde la pestaña *Mi Cuenta & Clave*.

