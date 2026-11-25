# Runbook de Recuperación de Desastres (Disaster Recovery) - Vuelto

Este manual define el protocolo de actuación operativa ante una caída catastrófica del centro de datos o corrupción de datos en **Vuelto**.

---

## 1. Métricas de Recuperación (SLAs)

- **RTO (Recovery Time Objective - Tiempo de Recuperación):** `< 2 Horas`  
  Tiempo máximo permitido desde la declaración formal de desastre hasta el restablecimiento completo del servicio POS.
- **RPO (Recovery Point Objective - Pérdida de Datos Máxima):** `< 1 Hora`  
  Pérdida máxima admisible de transacciones, mitigada mediante respaldos completos diarios y logs continuos.

---

## 2. Niveles de Desastre y Escalación

| Nivel | Escenario | Acciones | Responsable |
| :--- | :--- | :--- | :--- |
| **P0 - Catastrófico** | Caída total de Render / Región de Postgres caída | Activar provisión en nueva región / restaurar dump cifrado | Tech Lead / DevOps |
| **P1 - Corrupción de Datos** | Corrupción parcial o borrado accidental en un tenant | Restauración selectiva de tenant desde tabla o backup | Tech Lead |
| **P2 - Degeneración de Rendimiento** | DB saturada por consultas lentas o pool agotado | Escalado vertical de PostgreSQL y kill de queries lentas | Backend Engineer |

---

## 3. Protocolo de Restauración Paso a Paso (P0 - Desastre Total)

### Paso 1: Notificación y Modo de Emergencia
1. Publicar estado de mantenimiento en la aplicación móvil y web (los cajeros pasan a **Modo Offline con SQLite/LocalStore** para seguir facturando localmente sin interrumpir colas).
2. Declarar el incidente en el canal de seguridad y operaciones.

### Paso 2: Provisión de Nueva Base de Datos en Render o Cloud Provider
1. En el panel de Render / AWS RDS, desplegar una nueva instancia de PostgreSQL 16:
   - Nombre: `vuelto-prod-restore`
   - Versión: `PostgreSQL 16`
   - Plan: Min. `Starter / Standard (RAM >= 1GB)`
2. Copiar la nueva cadena de conexión: `postgres://...`

### Paso 3: Descarga y Restauración del Último Backup
1. Descargar el último archivo `.dump.gpg` desde Cloudflare R2 o AWS S3:
   ```bash
   aws s3 cp s3://vuelto-db-backups-secure/daily/vuelto_backup_LATEST.dump.gpg .
   ```
2. Descifrar con la clave maestra de seguridad:
   ```bash
   gpg --decrypt --batch --passphrase "$BACKUP_PASSPHRASE" --output restore.dump vuelto_backup_LATEST.dump.gpg
   ```
3. Ejecutar `pg_restore`:
   ```bash
   pg_restore --dbname="$NEW_DATABASE_URL" --no-owner --no-privileges --jobs=4 restore.dump
   ```

### Paso 4: Verificación de Políticas RLS y Migraciones
1. Conectar con `psql` y validar las políticas de Row-Level Security:
   ```bash
   psql "$NEW_DATABASE_URL" -f docs/RLS_VERIFY.sql
   ```
2. Correr la migración de sanidad del backend:
   ```bash
   npm --prefix backend run db:migrate
   ```

### Paso 5: Conmutación de DNS y Variables en Producción
1. Actualizar la variable de entorno `DATABASE_URL` en el servicio Web de Render con la nueva conexión.
2. Render reinicia automáticamente el contenedor backend.
3. Probar los probes:
   - `curl -f https://vuelto.onrender.com/health/live` -> 200
   - `curl -f https://vuelto.onrender.com/health/ready` -> 200
4. Desactivar modo de mantenimiento y permitir que los terminales móviles sincronicen las ventas offline acumuladas mediante `POST /api/v1/sync/offline-batch`.
