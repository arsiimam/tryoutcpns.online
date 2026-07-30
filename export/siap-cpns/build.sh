#!/bin/bash
# =============================================================================
# SiapCPNS — Build Script
# Jalankan script ini untuk build frontend dan API server sebelum deployment
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/source"

echo "=============================="
echo "  SiapCPNS — Build Script"
echo "=============================="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "❌ Node.js tidak ditemukan. Install Node.js 20+ terlebih dahulu."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js versi $NODE_VERSION terlalu lama. Minimal Node.js 20."
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check pnpm
if ! command -v pnpm &>/dev/null; then
    echo "📦 Menginstal pnpm..."
    npm install -g pnpm
fi
echo "✅ pnpm $(pnpm --version)"

# Check .env
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo ""
    echo "⚠️  File .env tidak ditemukan!"
    echo "   Salin .env.example menjadi .env dan isi nilai yang diperlukan:"
    echo "   cp .env.example .env"
    echo ""
    read -p "Lanjutkan build tanpa .env? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

cd "$SOURCE_DIR"

echo ""
echo "📦 [1/4] Menginstal dependencies..."
pnpm install
echo "✅ Dependencies terinstal"

echo ""
echo "🔧 [2/4] Build TypeScript libs..."
pnpm run typecheck:libs
echo "✅ Libs berhasil di-build"

echo ""
echo "🎨 [3/4] Build frontend (React + Vite)..."
pnpm --filter @workspace/cpns-tryout run build
echo "✅ Frontend berhasil di-build"
echo "   Output: source/artifacts/cpns-tryout/dist/public/"

echo ""
echo "⚡ [4/4] Build API server..."
pnpm --filter @workspace/api-server run build
echo "✅ API server berhasil di-build"
echo "   Output: source/artifacts/api-server/dist/"

echo ""
echo "=============================="
echo "  ✅ Build selesai!"
echo "=============================="
echo ""
echo "Langkah selanjutnya:"
echo ""
echo "  Dengan Docker:"
echo "    docker compose up -d"
echo ""
echo "  Tanpa Docker:"
echo "    1. Pastikan PostgreSQL berjalan dan database sudah di-setup"
echo "    2. Jalankan: psql \"\$DATABASE_URL\" -f database/schema.sql"
echo "    3. Jalankan API: NODE_ENV=production PORT=8080 node source/artifacts/api-server/dist/index.mjs"
echo "    4. Serve frontend di: source/artifacts/cpns-tryout/dist/public/ (gunakan Nginx)"
echo ""
