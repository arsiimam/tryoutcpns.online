#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Pull terbaru dari GitHub dan restart app di server
# Jalankan: bash deploy.sh
# =============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# Load .env
if [ -f "$APP_DIR/.env" ]; then
  set -a; source "$APP_DIR/.env"; set +a
else
  echo "⚠  File .env tidak ditemukan. Salin dari .env.example terlebih dahulu:"
  echo "   cp .env.example .env && nano .env"
  exit 1
fi

# Validasi env wajib
[ -z "${DATABASE_URL:-}" ] && { echo "ERROR: DATABASE_URL belum diisi di .env"; exit 1; }
[ -z "${SESSION_SECRET:-}" ] && { echo "ERROR: SESSION_SECRET belum diisi di .env"; exit 1; }

echo ""
echo "=== [1/5] Git pull dari GitHub ==="
git pull origin main

echo ""
echo "=== [2/5] Install dependencies ==="
pnpm install --frozen-lockfile

echo ""
echo "=== [3/5] Build library packages ==="
pnpm --filter @workspace/db run build 2>/dev/null || true
pnpm --filter @workspace/api-zod run build 2>/dev/null || true
pnpm --filter @workspace/api-client-react run build 2>/dev/null || true

echo ""
echo "=== [4/5] Build API server ==="
pnpm --filter @workspace/api-server run build

echo ""
echo "=== [5/5] Build frontend ==="
pnpm --filter @workspace/cpns-tryout run build

echo ""
echo "=== Restart aplikasi dengan PM2 ==="

if command -v pm2 &>/dev/null; then
  if pm2 describe cpns-api &>/dev/null; then
    # Sudah berjalan — delete & start ulang agar env vars terbaru terbaca
    pm2 delete cpns-api
  fi
  pm2 start "$APP_DIR/ecosystem.config.cjs"
  pm2 save
  echo "✓ PM2 process 'cpns-api' berjalan"
else
  echo "⚠  PM2 tidak terinstall. Install dengan: npm install -g pm2"
  echo "   Lalu jalankan: source .env && pm2 start ecosystem.config.cjs"
  exit 1
fi

echo ""
echo "✅ Deploy selesai!"
echo ""
echo "Cek status : pm2 status"
echo "Lihat log  : pm2 logs cpns-api"
echo "Test API   : curl http://localhost:${API_PORT:-3009}/api/healthz"
