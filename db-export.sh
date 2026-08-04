#!/usr/bin/env bash
# =============================================================================
# db-export.sh — Backup database PostgreSQL ke file SQL
# Jalankan: bash db-export.sh
# Hasil backup disimpan di folder: backups/
# =============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Load .env
if [ -f "$APP_DIR/.env" ]; then
  set -a; source "$APP_DIR/.env"; set +a
fi

[ -z "${DATABASE_URL:-}" ] && { echo "ERROR: DATABASE_URL tidak ditemukan di .env" >&2; exit 1; }

# Buat folder backup
mkdir -p "$BACKUP_DIR"

echo "Membuat backup database..."

# Parse DATABASE_URL
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\)[:/].*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_PORT="${DB_PORT:-5432}"
DB_HOST="${DB_HOST:-localhost}"

PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  > "$BACKUP_FILE"

# Kompres
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✅ Backup selesai: $BACKUP_FILE ($SIZE)"

# Hapus backup lebih dari 30 hari
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
echo "   (Backup lama > 30 hari otomatis dihapus)"
