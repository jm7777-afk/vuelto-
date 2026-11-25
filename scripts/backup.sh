#!/bin/bash
# ==============================================================================
# Script de Respaldo Automatizado y Cifrado para Vuelto PostgreSQL
# Periodicidad recomendada: Cron diario a las 02:00 UTC
# ==============================================================================

set -euo pipefail

# 1. Validación de variables requeridas
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL no está definida." >&2
  exit 1
fi

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "❌ Error: BACKUP_PASSPHRASE no está definida para el cifrado GPG." >&2
  exit 1
fi

BACKUP_DIR="/tmp/vuelto_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="vuelto_backup_${TIMESTAMP}.dump"
ENCRYPTED_FILENAME="${FILENAME}.gpg"
S3_BUCKET="${S3_BACKUP_BUCKET:-s3://vuelto-db-backups-secure/daily}"

mkdir -p "$BACKUP_DIR"

echo "⏳ [1/4] Iniciando volcado pg_dump de base de datos..."
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_DIR}/${FILENAME}"

echo "🔒 [2/4] Cifrando volcado con GPG (AES-256)..."
gpg --symmetric --cipher-algo AES256 --batch --yes \
  --passphrase "$BACKUP_PASSPHRASE" \
  --output "${BACKUP_DIR}/${ENCRYPTED_FILENAME}" \
  "${BACKUP_DIR}/${FILENAME}"

# Eliminar volcado plano
rm -f "${BACKUP_DIR}/${FILENAME}"

echo "☁️ [3/4] Transfiriendo a Object Storage Seguro (${S3_BUCKET})..."
if command -v aws &> /dev/null; then
  aws s3 cp "${BACKUP_DIR}/${ENCRYPTED_FILENAME}" "${S3_BUCKET}/${ENCRYPTED_FILENAME}"
elif command -v rclone &> /dev/null; then
  rclone copy "${BACKUP_DIR}/${ENCRYPTED_FILENAME}" "r2:${S3_BUCKET}/"
else
  echo "⚠️ Cliente de nube no detectado. El respaldo cifrado permanece localmente en: ${BACKUP_DIR}/${ENCRYPTED_FILENAME}"
fi

echo "🧹 [4/4] Limpiando respaldos locales mayores a 7 días..."
find "$BACKUP_DIR" -name "*.dump.gpg" -type f -mtime +7 -delete

echo "✅ Respaldo completado exitosamente: ${ENCRYPTED_FILENAME}"
