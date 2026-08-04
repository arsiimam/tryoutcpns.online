#!/usr/bin/env bash
# =============================================================================
# install.sh — Installer SiapCPNS di VPS (fresh install)
# Jalankan sekali saja saat pertama kali setup server
#
# Cara pakai:
#   bash install.sh
#
# Prerequisite OS: Ubuntu 22.04 / 24.04 LTS
# =============================================================================
set -e

REPO_URL="https://github.com/arsiimam/tryoutcpns.online.git"
APP_DIR="/var/www/tryoutcpns"
APP_USER="$(whoami)"
NODE_VERSION="22"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           SiapCPNS — Installer VPS                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ---------------------------------------------------------------------------
# Fungsi bantu
# ---------------------------------------------------------------------------
info()    { echo -e "\e[32m[✓]\e[0m $1"; }
warning() { echo -e "\e[33m[!]\e[0m $1"; }
step()    { echo -e "\n\e[34m══► $1\e[0m"; }
die()     { echo -e "\e[31m[✗] ERROR: $1\e[0m" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Update system & install dependencies dasar
# ---------------------------------------------------------------------------
step "1/9 — Update sistem & install dependency dasar"
sudo apt-get update -qq
sudo apt-get install -y -qq curl git wget gnupg ca-certificates unzip

# ---------------------------------------------------------------------------
# 2. Install Node.js
# ---------------------------------------------------------------------------
step "2/9 — Install Node.js $NODE_VERSION"
if command -v node &>/dev/null && node -v | grep -q "^v$NODE_VERSION"; then
  info "Node.js $(node -v) sudah terinstall"
else
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs
  info "Node.js $(node -v) berhasil diinstall"
fi

# ---------------------------------------------------------------------------
# 3. Install pnpm
# ---------------------------------------------------------------------------
step "3/9 — Install pnpm"
if command -v pnpm &>/dev/null; then
  info "pnpm $(pnpm -v) sudah terinstall"
else
  npm install -g pnpm
  info "pnpm $(pnpm -v) berhasil diinstall"
fi

# ---------------------------------------------------------------------------
# 4. Install PostgreSQL
# ---------------------------------------------------------------------------
step "4/9 — Install PostgreSQL"
if command -v psql &>/dev/null; then
  info "PostgreSQL sudah terinstall"
else
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
  info "PostgreSQL berhasil diinstall"
fi

# ---------------------------------------------------------------------------
# 5. Install PM2
# ---------------------------------------------------------------------------
step "5/9 — Install PM2"
if command -v pm2 &>/dev/null; then
  info "PM2 sudah terinstall"
else
  npm install -g pm2
  pm2 startup systemd -u "$APP_USER" --hp "$HOME" | tail -1 | sudo bash || true
  info "PM2 berhasil diinstall"
fi

# ---------------------------------------------------------------------------
# 6. Install nginx
# ---------------------------------------------------------------------------
step "6/9 — Install nginx"
if command -v nginx &>/dev/null; then
  info "nginx sudah terinstall"
else
  sudo apt-get install -y nginx
  sudo systemctl enable nginx
  sudo systemctl start nginx
  info "nginx berhasil diinstall"
fi

# ---------------------------------------------------------------------------
# 7. Clone repository
# ---------------------------------------------------------------------------
step "7/9 — Clone repository dari GitHub"
if [ -d "$APP_DIR/.git" ]; then
  warning "Folder $APP_DIR sudah ada. Pakai 'bash deploy.sh' untuk update."
else
  sudo mkdir -p "$(dirname "$APP_DIR")"
  sudo chown "$APP_USER":"$APP_USER" "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
  info "Repository berhasil di-clone ke $APP_DIR"
fi
cd "$APP_DIR"

# ---------------------------------------------------------------------------
# 8. Setup file .env
# ---------------------------------------------------------------------------
step "8/9 — Setup file .env"
if [ -f "$APP_DIR/.env" ]; then
  warning ".env sudah ada, dilewati"
else
  if [ ! -f "$APP_DIR/.env.example" ]; then
    die ".env.example tidak ditemukan di repository"
  fi
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"

  echo ""
  echo "  ┌────────────────────────────────────────────────────────────┐"
  echo "  │  Isi file .env sebelum lanjut!                            │"
  echo "  │                                                            │"
  echo "  │  nano $APP_DIR/.env                    │"
  echo "  │                                                            │"
  echo "  │  Nilai WAJIB diisi:                                       │"
  echo "  │    DATABASE_URL   — connection string PostgreSQL           │"
  echo "  │    SESSION_SECRET — string acak minimal 32 karakter        │"
  echo "  │    APP_URL        — URL public server (https://domain.com) │"
  echo "  └────────────────────────────────────────────────────────────┘"
  echo ""
  read -rp "  Tekan ENTER setelah selesai mengisi .env ..."
fi

# Load env
set -a; source "$APP_DIR/.env"; set +a

# Validasi env wajib
[ -z "${DATABASE_URL:-}" ] && die "DATABASE_URL belum diisi di .env"
[ -z "${SESSION_SECRET:-}" ] && die "SESSION_SECRET belum diisi di .env"

# ---------------------------------------------------------------------------
# 9. Setup database PostgreSQL
# ---------------------------------------------------------------------------
step "Setup database PostgreSQL"

# Ambil info dari DATABASE_URL
# Format: postgres://user:password@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\)[:/].*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_PORT="${DB_PORT:-5432}"
DB_HOST="${DB_HOST:-localhost}"

if [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
  # Buat user & database di PostgreSQL lokal
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" \
    | grep -q 1 || sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" \
    | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
  info "Database '$DB_NAME' dan user '$DB_USER' siap"

  # Import schema
  echo ""
  echo "  Mengimport schema database..."
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$APP_DIR/database/schema.sql"
  info "Schema database berhasil diimport"
else
  warning "Database host bukan localhost. Pastikan database sudah dibuat secara manual."
  warning "Lalu import schema: psql \"\$DATABASE_URL\" -f $APP_DIR/database/schema.sql"
fi

# ---------------------------------------------------------------------------
# Build & Start
# ---------------------------------------------------------------------------
step "Install dependencies & build"
cd "$APP_DIR"
pnpm install --frozen-lockfile

pnpm --filter @workspace/db run build 2>/dev/null || true
pnpm --filter @workspace/api-zod run build 2>/dev/null || true
pnpm --filter @workspace/api-client-react run build 2>/dev/null || true

pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/cpns-tryout run build

info "Build selesai"

# ---------------------------------------------------------------------------
# Setup nginx
# ---------------------------------------------------------------------------
step "Setup nginx"
NGINX_CONF="/etc/nginx/sites-available/tryoutcpns"
APP_URL="${APP_URL:-http://localhost}"
DOMAIN=$(echo "$APP_URL" | sed 's|https\?://||' | sed 's|/.*||')
FRONTEND_DIST="$APP_DIR/artifacts/cpns-tryout/dist/public"

sudo tee "$NGINX_CONF" > /dev/null <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend (Vite build)
    root $FRONTEND_DIST;
    index index.html;

    # API proxy ke Express
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Aset statis — cache 1 tahun
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/tryoutcpns
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
info "nginx dikonfigurasi untuk domain: $DOMAIN"

# ---------------------------------------------------------------------------
# Start API server dengan PM2
# ---------------------------------------------------------------------------
step "Start API server dengan PM2"
PORT="${API_PORT:-3001}"

# Hapus proses lama jika ada
pm2 describe cpns-api &>/dev/null && pm2 delete cpns-api || true

# Start dengan env vars
PORT="$PORT" \
  DATABASE_URL="$DATABASE_URL" \
  SESSION_SECRET="$SESSION_SECRET" \
  APP_URL="${APP_URL:-}" \
  GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}" \
  GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}" \
  DUITKU_MERCHANT_CODE="${DUITKU_MERCHANT_CODE:-}" \
  DUITKU_API_KEY="${DUITKU_API_KEY:-}" \
  NODE_ENV="production" \
  pm2 start "$APP_DIR/artifacts/api-server/dist/index.mjs" --name cpns-api

pm2 save
info "API server berjalan di port $PORT"

# ---------------------------------------------------------------------------
# Selesai
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅  Instalasi selesai!                                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  Website : $APP_URL"
echo "║  API     : $APP_URL/api/healthz"
echo "║                                                              ║"
echo "║  Command berguna:                                            ║"
echo "║    pm2 status          — cek status proses                   ║"
echo "║    pm2 logs cpns-api   — lihat log API                       ║"
echo "║    bash deploy.sh      — update & restart app                ║"
echo "║    bash db-export.sh   — backup database                     ║"
echo "║    bash db-import.sh   — restore database                    ║"
echo "║                                                              ║"
echo "║  Login admin default:                                        ║"
echo "║    Email    : admin@siapcpns.id                              ║"
echo "║    Password : password  ← SEGERA GANTI!                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
