#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Pull terbaru dari GitHub dan restart app di server
# Jalankan: bash deploy.sh
# =============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo ""
echo "=== [1/5] Git pull dari GitHub ==="
git pull origin main

echo ""
echo "=== [2/5] Install dependencies ==="
pnpm install --frozen-lockfile

echo ""
echo "=== [3/5] Build library packages ==="
pnpm --filter @workspace/db build 2>/dev/null || true
pnpm --filter @workspace/api-zod build 2>/dev/null || true
pnpm --filter @workspace/api-spec build 2>/dev/null || true

echo ""
echo "=== [4/5] Build API server ==="
pnpm --filter @workspace/api-server run build

echo ""
echo "=== [5/5] Build frontend ==="
pnpm --filter @workspace/cpns-tryout run build

echo ""
echo "=== Restart aplikasi ==="

# --- PM2 (jika menggunakan PM2) ---
if command -v pm2 &>/dev/null; then
  if pm2 list | grep -q "cpns-api"; then
    pm2 restart cpns-api
    echo "✓ PM2 process 'cpns-api' direstart"
  else
    echo "⚠  PM2 process 'cpns-api' tidak ditemukan."
    echo "   Jalankan sekali: pm2 start artifacts/api-server/dist/index.mjs --name cpns-api"
  fi

# --- systemd (jika menggunakan systemd) ---
elif systemctl is-active --quiet cpns-api 2>/dev/null; then
  sudo systemctl restart cpns-api
  echo "✓ systemd service 'cpns-api' direstart"

else
  echo "⚠  Tidak terdeteksi PM2 atau systemd service 'cpns-api'."
  echo "   Restart app secara manual:"
  echo "   PORT=3001 NODE_ENV=production node artifacts/api-server/dist/index.mjs"
fi

echo ""
echo "✅ Deploy selesai!"
