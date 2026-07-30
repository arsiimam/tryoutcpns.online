# 🎯 SiapCPNS — Panduan Instalasi Self-Hosted

Platform simulasi CAT BKN untuk persiapan ujian CPNS. Dokumen ini menjelaskan cara menginstal dan menjalankan SiapCPNS di server Anda sendiri.

---

## Daftar Isi

1. [Persyaratan Sistem](#persyaratan-sistem)
2. [Cara Cepat dengan Docker](#cara-cepat-dengan-docker-direkomendasikan)
3. [Instalasi Manual (Tanpa Docker)](#instalasi-manual-tanpa-docker)
4. [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
5. [Build Frontend (Static Files)](#build-frontend-static-files)
6. [Pengaturan Google OAuth (Opsional)](#pengaturan-google-oauth-opsional)
7. [Pengaturan Duitku Payment (Opsional)](#pengaturan-duitku-payment-opsional)
8. [Deploy ke Production (VPS/Nginx)](#deploy-ke-production-vpsnginx)
9. [Manajemen Admin](#manajemen-admin)
10. [Troubleshooting](#troubleshooting)

---

## Persyaratan Sistem

| Komponen       | Minimal              | Direkomendasikan       |
|----------------|----------------------|------------------------|
| OS             | Ubuntu 20.04+        | Ubuntu 22.04 LTS       |
| CPU            | 1 vCPU               | 2 vCPU                 |
| RAM            | 1 GB                 | 2 GB                   |
| Storage        | 10 GB                | 20 GB SSD              |
| Node.js        | v20+                 | v22 LTS                |
| PostgreSQL     | v14+                 | v16                    |
| pnpm           | v9+                  | v10 terbaru            |
| Docker         | v24+ (opsional)      | Docker + Compose v2    |

---

## Cara Cepat dengan Docker (Direkomendasikan)

### Langkah 1 — Build frontend terlebih dahulu

```bash
# Di direktori source/
cd source
npm install -g pnpm
pnpm install
pnpm --filter @workspace/cpns-tryout run build
cd ..
```

### Langkah 2 — Buat file .env

```bash
cp .env.example .env
```

Edit `.env` dan isi minimal:
- `DB_PASSWORD` — password database PostgreSQL
- `SESSION_SECRET` — string acak panjang (minimal 32 karakter)
- `APP_URL` — URL publik aplikasi Anda (contoh: `https://siapcpns.id`)

Generate SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Langkah 3 — Jalankan

```bash
docker compose up -d
```

Akses aplikasi di: `http://localhost` (atau sesuai `APP_URL` Anda)

### Perintah Docker berguna

```bash
# Lihat status container
docker compose ps

# Lihat log API server
docker compose logs -f api

# Lihat log database
docker compose logs -f db

# Restart semua service
docker compose restart

# Stop semua
docker compose down

# Stop + hapus database (HATI-HATI: data hilang)
docker compose down -v
```

---

## Instalasi Manual (Tanpa Docker)

### 1. Instal PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Buat database dan user:
```bash
sudo -u postgres psql <<EOF
CREATE USER siapcpns WITH PASSWORD 'password_anda';
CREATE DATABASE siapcpns OWNER siapcpns;
GRANT ALL PRIVILEGES ON DATABASE siapcpns TO siapcpns;
EOF
```

### 2. Setup database schema

```bash
psql -U siapcpns -d siapcpns -h localhost -f database/schema.sql
```

Atau dengan DATABASE_URL:
```bash
psql "postgres://siapcpns:password_anda@localhost:5432/siapcpns" -f database/schema.sql
```

### 3. Instal Node.js 22 dan pnpm

```bash
# Install Node.js 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# Install pnpm
npm install -g pnpm
```

### 4. Install dependencies

```bash
cd source
pnpm install
```

### 5. Buat .env

```bash
cp ../.env.example ../.env
```

Isi semua variabel di `.env` (lihat bagian [Konfigurasi](#konfigurasi-environment-variables)).

### 6. Build frontend

```bash
# Di dalam direktori source/
pnpm --filter @workspace/cpns-tryout run build
# Output: source/artifacts/cpns-tryout/dist/public/
```

### 7. Build API server

```bash
pnpm --filter @workspace/api-server run build
# Output: source/artifacts/api-server/dist/
```

### 8. Jalankan API server

```bash
export DATABASE_URL="postgres://siapcpns:password_anda@localhost:5432/siapcpns"
export SESSION_SECRET="session_secret_anda_yang_panjang"
export APP_URL="http://localhost"
export PORT=8080
export NODE_ENV=production

node --enable-source-maps source/artifacts/api-server/dist/index.mjs
```

### 9. Serve frontend

Gunakan Nginx untuk serve file statis (lihat bagian [Deploy ke Production](#deploy-ke-production-vpsnginx)).

---

## Konfigurasi Environment Variables

Salin `.env.example` menjadi `.env` dan isi nilai berikut:

| Variable              | Wajib | Keterangan |
|-----------------------|-------|------------|
| `DATABASE_URL`        | ✅    | Connection string PostgreSQL |
| `DB_PASSWORD`         | ✅    | Password PostgreSQL (untuk Docker) |
| `SESSION_SECRET`      | ✅    | String acak min. 32 karakter untuk enkripsi session |
| `APP_URL`             | ✅    | URL publik aplikasi (tanpa trailing slash) |
| `HTTP_PORT`           | ➖    | Port HTTP untuk Docker (default: 80) |
| `GOOGLE_CLIENT_ID`    | ➖    | Untuk fitur Login dengan Google |
| `GOOGLE_CLIENT_SECRET`| ➖    | Untuk fitur Login dengan Google |
| `DUITKU_MERCHANT_CODE`| ➖    | Untuk fitur pembayaran Duitku |
| `DUITKU_API_KEY`      | ➖    | Untuk fitur pembayaran Duitku |

> **Catatan**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DUITKU_MERCHANT_CODE`, dan `DUITKU_API_KEY` juga bisa diisi via panel Admin di aplikasi (Settings → Pengaturan Sistem) — tidak perlu diisi di `.env`.

---

## Build Frontend (Static Files)

Frontend dibangun sebagai file statis (HTML/CSS/JS) yang bisa dihost di mana saja.

```bash
cd source
pnpm install
pnpm --filter @workspace/cpns-tryout run build
```

File statis tersedia di: `source/artifacts/cpns-tryout/dist/public/`

**Catatan penting**: File statis ini perlu dihost bersama dengan API server. Nginx digunakan untuk:
- Serve file statis di `/`
- Proxy request `/api/*` ke API server (port 8080)

---

## Pengaturan Google OAuth (Opsional)

Fitur "Masuk dengan Google" memerlukan Google OAuth credentials.

### Langkah setup Google Cloud Console:

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Aktifkan **Google+ API** dan **Google People API**
4. Ke **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Pilih **Web application**
6. Tambahkan **Authorized redirect URIs**:
   ```
   https://domain-anda.com/api/auth/google/callback
   ```
7. Copy **Client ID** dan **Client Secret**

### Cara mengaktifkan di aplikasi:

**Opsi A** — Via panel Admin (direkomendasikan):
1. Login sebagai admin
2. Buka **Admin** → **Pengaturan**
3. Isi `Google Client ID` dan `Google Client Secret`
4. Simpan

**Opsi B** — Via `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## Pengaturan Duitku Payment (Opsional)

Fitur pembayaran menggunakan [Duitku Payment Gateway](https://duitku.com/).

1. Daftar di [dashboard.duitku.com](https://dashboard.duitku.com/)
2. Dapatkan **Merchant Code** dan **API Key**
3. Set **Callback URL** di dashboard Duitku:
   ```
   https://domain-anda.com/api/payment/callback
   ```

### Cara mengaktifkan:

**Opsi A** — Via panel Admin:
1. Login sebagai admin
2. Buka **Admin** → **Pengaturan**
3. Isi `Duitku Merchant Code`, `Duitku API Key`, dan `Environment` (sandbox/production)

**Opsi B** — Via `.env`:
```env
DUITKU_MERCHANT_CODE=your-merchant-code
DUITKU_API_KEY=your-api-key
DUITKU_ENVIRONMENT=production
```

---

## Deploy ke Production (VPS/Nginx)

### Instalasi Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### Konfigurasi Nginx

Salin isi `nginx.conf` ke konfigurasi Nginx:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/siapcpns
sudo ln -s /etc/nginx/sites-available/siapcpns /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Edit `/etc/nginx/sites-available/siapcpns` dan sesuaikan path ke file statis:
```nginx
root /path/ke/source/artifacts/cpns-tryout/dist/public;
```

### Tambahkan SSL dengan Certbot (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domain-anda.com
```

Certbot akan otomatis memodifikasi konfigurasi Nginx untuk HTTPS.

### Jalankan API server sebagai service (PM2)

```bash
npm install -g pm2

# Buat ecosystem file
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'siapcpns-api',
    script: 'source/artifacts/api-server/dist/index.mjs',
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      DATABASE_URL: 'postgres://siapcpns:password@localhost:5432/siapcpns',
      SESSION_SECRET: 'session_secret_anda',
      APP_URL: 'https://domain-anda.com'
    }
  }]
}
EOF

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Atau gunakan systemd

```bash
sudo tee /etc/systemd/system/siapcpns-api.service << 'EOF'
[Unit]
Description=SiapCPNS API Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/ubuntu/siapcpns/source/artifacts/api-server
ExecStart=/usr/bin/node --enable-source-maps /home/ubuntu/siapcpns/source/artifacts/api-server/dist/index.mjs
Restart=on-failure
RestartSec=5

Environment=NODE_ENV=production
Environment=PORT=8080
EnvironmentFile=/home/ubuntu/siapcpns/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable siapcpns-api
sudo systemctl start siapcpns-api
```

---

## Manajemen Admin

### Akun Admin Default

Setelah menjalankan `schema.sql`, akun admin default dibuat:

| Field  | Nilai                 |
|--------|-----------------------|
| Email  | `admin@siapcpns.id`   |
| Password | `password`          |

> ⚠️ **WAJIB ganti password ini segera setelah login pertama!**

### Ganti Password Admin via SQL

Generate hash bcrypt:
```bash
node -e "const b = require('bcryptjs'); console.log(b.hashSync('PasswordBaruAnda123!', 10))"
```

Kemudian update di database:
```sql
UPDATE users 
SET password_hash = '<hash_bcrypt_di_sini>' 
WHERE email = 'admin@siapcpns.id';
```

### Buat Admin Baru via SQL

```sql
-- Generate hash dulu via Node, lalu:
INSERT INTO users (full_name, email, password_hash, auth_provider, role)
VALUES ('Nama Admin', 'admin@domain.com', '<bcrypt_hash>', 'email', 'admin');
```

### Fitur Panel Admin

Login sebagai admin untuk mengakses:
- **Dashboard** — statistik ringkasan
- **Pengguna** — kelola data pengguna
- **Bank Soal** — kelola bundle soal dan pertanyaan
- **Tryout** — kelola paket tryout dan sesi
- **Langganan** — kelola paket berlangganan
- **Pembayaran** — riwayat transaksi
- **Laporan** — laporan dan analitik
- **Pengaturan** — konfigurasi sistem (Google OAuth, Duitku, dll)

---

## Troubleshooting

### API server tidak bisa connect ke database

```
Error: DATABASE_URL must be set
```
Pastikan `DATABASE_URL` sudah diset dan PostgreSQL berjalan:
```bash
psql "$DATABASE_URL" -c "SELECT 1"
```

### Session tidak tersimpan

Pastikan tabel `user_sessions` sudah ada:
```sql
SELECT tablename FROM pg_tables WHERE tablename = 'user_sessions';
```
Jika belum ada, jalankan ulang `schema.sql`.

### CORS error di browser

Pastikan `APP_URL` di `.env` sesuai dengan URL yang diakses browser. Tanpa trailing slash:
```env
APP_URL=https://domain-anda.com  # ✅ Benar
APP_URL=https://domain-anda.com/ # ❌ Salah (ada slash di akhir)
```

### Google OAuth redirect mismatch

Di Google Cloud Console, pastikan **Authorized redirect URIs** menggunakan URL yang sama persis:
```
https://domain-anda.com/api/auth/google/callback
```

### Port 80 sudah digunakan

```bash
# Cek apa yang menggunakan port 80
sudo lsof -i :80
# Atau ubah HTTP_PORT di .env
HTTP_PORT=8888
```

### Frontend menampilkan halaman kosong

Pastikan file statis sudah di-build:
```bash
ls source/artifacts/cpns-tryout/dist/public/
# Harus ada: index.html, assets/, dll
```

### Regenerasi API client (jika ada perubahan API)

```bash
cd source
pnpm --filter @workspace/api-spec run codegen
```

---

## Struktur Direktori

```
siap-cpns/
├── README.md                    ← Panduan ini
├── .env.example                 ← Template environment variables
├── .env                         ← File env Anda (dibuat dari .env.example)
├── docker-compose.yml           ← Docker Compose untuk deployment mudah
├── Dockerfile.api               ← Docker image untuk API server
├── nginx.conf                   ← Konfigurasi Nginx
├── database/
│   └── schema.sql               ← SQL schema + seed data awal
└── source/                      ← Source code lengkap
    ├── artifacts/
    │   ├── api-server/          ← Express API server
    │   └── cpns-tryout/         ← React frontend (Vite)
    ├── lib/
    │   ├── db/                  ← Drizzle ORM schema & koneksi DB
    │   ├── api-client-react/    ← Generated React Query hooks
    │   ├── api-spec/            ← OpenAPI spec + codegen config
    │   └── api-zod/             ← Generated Zod schemas
    ├── package.json
    └── pnpm-workspace.yaml
```

---

## Tech Stack

| Komponen     | Teknologi                                      |
|--------------|------------------------------------------------|
| Frontend     | React 19, Vite 7, Tailwind CSS 4, shadcn/ui    |
| Backend      | Node.js 22, Express 5, TypeScript              |
| Database     | PostgreSQL 16, Drizzle ORM                     |
| Auth         | Session-based (express-session + connect-pg-simple + bcryptjs) |
| Payment      | Duitku Payment Gateway                         |
| API Contract | OpenAPI 3.0, Orval codegen                     |

---

## Lisensi & Dukungan

Hubungi tim pengembang untuk dukungan teknis dan lisensi komersial.
