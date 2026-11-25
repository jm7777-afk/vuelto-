# Plan de Respaldos y Backup de Base de Datos - Vuelto

Este documento establece la estrategia formal de copias de seguridad de datos para la plataforma SaaS multi-tenant **Vuelto**, garantizando la integridad, confidencialidad y disponibilidad de la información fiscal y operativa de los negocios.

---

## 1. Política de Periodicidad y Retención

| Tipo de Respaldo | Periodicidad | Retención | Almacenamiento Primario | Cifrado |
| :--- | :--- | :--- | :--- | :--- |
| **Respaldo Completo (Full Dump)** | Diario (02:00 UTC / 22:00 VET) | 30 días | Cloudflare R2 / AWS S3 (Bucket inmutable) | AES-256 (GPG simétrico o asimétrico) |
| **Archivado de WAL (Continuous Archiving)** | Cada 60 minutos | 7 días | Object Storage con versionado | AES-256 en reposo |
| **Snapshot de Disco Administrado** | Diario automático (Render / AWS) | 14 días | Nube del proveedor | Proveedor de infraestructura |

---

## 2. Ejecución Manual de Respaldo (`pg_dump`)

Para generar un dump binario comprimido con integridad criptográfica de la base de datos de producción:

```bash
# 1. Definir variables de entorno de producción
export DATABASE_URL="postgres://vuelto_admin:SECRET@prod-db.render.com/vuelto_prod"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="vuelto_prod_${TIMESTAMP}.dump"

# 2. Generar el dump en formato binario con compresión máxima (-Fc)
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE"

# 3. Cifrar con GPG antes de almacenar o transferir
gpg --symmetric --cipher-algo AES256 --batch --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" "$BACKUP_FILE"
rm "$BACKUP_FILE" # Eliminar archivo sin cifrar
# El archivo resultante es vuelto_prod_${TIMESTAMP}.dump.gpg
```

---

## 3. Restauración desde un Respaldo

Para restaurar el respaldo en una base de datos limpia o entorno de recuperación de desastres (DR):

```bash
# 1. Descifrar el dump
gpg --decrypt --batch --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" \
  --output "vuelto_restore.dump" "vuelto_prod_20261125_020000.dump.gpg"

# 2. Restaurar usando pg_restore con limpieza previa (--clean) y ejecución paralela
pg_restore \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --jobs=4 \
  "vuelto_restore.dump"

# 3. Limpieza del archivo descifrado
rm "vuelto_restore.dump"
```

---

## 4. Auditoría y Pruebas Periódicas de Restauración

- Se realiza un simulacro de restauración automático o manual el primer lunes de cada mes en una base de datos efímera de staging.
- Se verifica la integridad de las tablas multi-tenant y las políticas RLS ejecutando el script `docs/RLS_VERIFY.sql`.
