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
echo "=== [1/4] Git pull dari GitHub ==="
git pull origin main

echo ""
echo "=== [2/4] Install dependencies ==="
pnpm install --frozen-lockfile

echo ""
echo "=== [3/4] Build API server ==="
pnpm --filter @workspace/api-server run build

echo ""
echo "=== [4/4] Build frontend ==="
pnpm --filter @workspace/cpns-tryout run build

echo ""
echo "=== Restart aplikasi dengan PM2 ==="

if command -v pm2 &>/dev/null; then
  if pm2 describe cpns-api &>/dev/null; then
    pm2 delete cpns-api
  fi
  pm2 start "$APP_DIR/ecosystem.config.cjs"
  pm2 save
  echo "✓ PM2 process 'cpns-api' berjalan"
else
  echo "⚠  PM2 tidak terinstall. Install dengan: npm install -g pm2"
  exit 1
fi

echo ""
echo "✅ Deploy selesai!"
echo ""
echo "Cek status : pm2 status"
echo "Lihat log  : pm2 logs cpns-api"
echo "Test API   : curl http://localhost:${API_PORT:-3009}/api/healthz"
echo ""
echo "──────────────────────────────────────────────────────"
echo "📌 Nginx: pastikan config proxy SEMUA traffic ke port ${API_PORT:-3009}"
echo "   Express sekarang melayani frontend + API sekaligus."
echo ""
echo "   Contoh config nginx yang benar:"
echo ""
echo "   location / {"
echo "       proxy_pass http://127.0.0.1:${API_PORT:-3009};"
echo "       proxy_http_version 1.1;"
echo "       proxy_set_header Host \$host;"
echo "       proxy_set_header X-Real-IP \$remote_addr;"
echo "       proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "       proxy_set_header X-Forwarded-Proto \$scheme;"
echo "       proxy_read_timeout 120s;"
echo "   }"
echo ""
echo "   Hapus block 'location /api/' terpisah jika ada — tidak diperlukan lagi."
echo "──────────────────────────────────────────────────────"
