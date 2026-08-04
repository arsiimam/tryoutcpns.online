#!/usr/bin/env bash
# =============================================================================
# db-import.sh — Restore database PostgreSQL dari file backup
#
# Cara pakai:
#   bash db-import.sh                          ← pakai file terbaru di backups/
#   bash db-import.sh backups/backup_xxx.sql.gz  ← pakai file tertentu
#   bash db-import.sh database/schema.sql      ← install schema fresh (tanpa data)
# =============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$APP_DIR/backups"

# Load .env
if [ -f "$APP_DIR/.env" ]; then
  set -a; source "$APP_DIR/.env"; set +a
fi

[ -z "${DATABASE_URL:-}" ] && { echo "ERROR: DATABASE_URL tidak ditemukan di .env" >&2; exit 1; }

# Tentukan file yang akan diimport
if [ -n "${1:-}" ]; then
  IMPORT_FILE="$1"
else
  # Cari file backup terbaru
  IMPORT_FILE=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -1)
  if [ -z "$IMPORT_FILE" ]; then
    echo "ERROR: Tidak ada file backup di $BACKUP_DIR" >&2
    echo "Gunakan: bash db-import.sh <path/ke/file.sql.gz>" >&2
    exit 1
  fi
fi

[ ! -f "$IMPORT_FILE" ] && { echo "ERROR: File tidak ditemukan: $IMPORT_FILE" >&2; exit 1; }

echo "File yang akan diimport: $IMPORT_FILE"
echo ""
read -rp "⚠️  PERHATIAN: Ini akan MENIMPA data database saat ini. Lanjutkan? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Dibatalkan."; exit 0; }

# Parse DATABASE_URL
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\)[:/].*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_PORT="${DB_PORT:-5432}"
DB_HOST="${DB_HOST:-localhost}"

echo "Mengimport ke database '$DB_NAME'..."

if [[ "$IMPORT_FILE" == *.gz ]]; then
  gunzip -c "$IMPORT_FILE" | PGPASSWORD="$DB_PASS" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --set ON_ERROR_STOP=0 \
    -q
else
  PGPASSWORD="$DB_PASS" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --set ON_ERROR_STOP=0 \
    -q \
    -f "$IMPORT_FILE"
fi

echo "✅ Import selesai!"
