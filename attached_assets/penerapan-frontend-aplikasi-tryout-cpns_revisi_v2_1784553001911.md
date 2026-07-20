# Penerapan Frontend Aplikasi Tryout CPNS Berbayar

Dokumen ini fokus pada penerapan frontend menggunakan **Next.js App
Router, TypeScript, Tailwind CSS, dan shadcn/ui**. Seluruh data tahap
awal menggunakan **dummy JSON terpusat** sehingga seluruh UI selesai
sebelum integrasi backend.

------------------------------------------------------------------------

## Prinsip Frontend

-   Gunakan Next.js App Router.
-   Gunakan TypeScript.
-   Gunakan Tailwind CSS + shadcn/ui.
-   Responsive untuk Desktop dan Tablet.
-   Semua data berasal dari `src/data/dummy-cpns-data.ts`.
-   Tidak ada dummy data di dalam komponen.
-   Semua halaman mengakses data melalui `dummyApi`.
-   Struktur siap diganti REST API/backend.

------------------------------------------------------------------------

# Step 1 - Setup Project

## Checklist

-   [ ] Setup Next.js + TypeScript
-   [ ] Setup Tailwind CSS
-   [ ] Setup shadcn/ui
-   [ ] Setup lucide-react
-   [ ] Setup route group `(public)`, `(auth)`, `(dashboard)`, `(admin)`
-   [ ] Seluruh tombol, menu, CTA, dan navigasi harus saling terhubung (tidak ada tombol dummy).
-   [ ] Setup folder `components`, `data`, `types`, `lib`

## Struktur Folder

``` text
src/
 app/
   (public)/
     page.tsx
     pricing/
     faq/
     contact/
   (auth)/
     login/
     register/
     forgot-password/
   (dashboard)/
     dashboard/
     tryout/
     latihan/
     hasil/
     review/
     ranking/
     subscription/
     profile/
   (admin)/
     dashboard/
     questions/
     categories/
     tryouts/
     users/
     subscriptions/
     payments/
     reports/
     cms/
 components/
 data/
 lib/
 types/
```

------------------------------------------------------------------------

# Step 2 - Types & Dummy JSON

Semua data berada pada `src/data/dummy-cpns-data.ts`

## Checklist

-   [ ] User
-   [ ] Role
-   [ ] Subscription
-   [ ] Payment
-   [ ] Question
-   [ ] Category
-   [ ] SubCategory
-   [ ] Tryout
-   [ ] TryoutSession
-   [ ] Answer
-   [ ] Result
-   [ ] DashboardSummary

------------------------------------------------------------------------

# Step 3 - Landing Page

## Halaman

-   Home
-   Tentang
-   Fitur
-   Paket Berlangganan
-   Tryout Gratis
-   FAQ
-   Blog
-   Kontak

## Komponen

-   Hero
-   Navbar
    - Logo
    - Home
    - Fitur
    - Paket
    - FAQ
    - Blog
    - Kontak
    - Masuk
    - Daftar
-   Pricing Card
-   FAQ Accordion
-   CTA
-   Testimonial
-   Footer

## Integrasi Navigasi

- Semua tombol wajib memiliki tujuan (route).
- Tombol "Masuk" mengarah ke `/login`.
- Tombol "Daftar" mengarah ke `/register`.
- CTA "Mulai Tryout" mengarah ke halaman paket/login sesuai status pengguna.
- Setelah login berhasil diarahkan ke Dashboard.
- Setelah registrasi berhasil diarahkan ke proses verifikasi atau Dashboard.
- Semua menu Dashboard saling terhubung.
- Breadcrumb dan tombol Kembali berfungsi di seluruh halaman.


------------------------------------------------------------------------

# Step 4 - Dashboard Peserta

## Menu

-   Dashboard
-   Tryout
-   Latihan Soal
-   Hasil & Analisis
-   Review Soal
-   Ranking
-   Langganan
-   Profil

## Dashboard

-   Progress belajar
-   Skor terakhir
-   Grafik perkembangan
-   Paket aktif
-   Pengumuman

------------------------------------------------------------------------

# Step 5 - Simulasi CAT

## Checklist

-   [ ] Timer
-   [ ] Nomor soal
-   [ ] Navigasi soal
-   [ ] Flag soal
-   [ ] Auto Save
-   [ ] Submit
-   [ ] Konfirmasi selesai
-   [ ] Hasil otomatis

------------------------------------------------------------------------

# Step 6 - Bank Soal

## Filter

-   TWK
-   TIU
-   TKP

Sub Materi

-   Pancasila
-   UUD
-   Nasionalisme
-   Numerik
-   Analogi
-   Silogisme
-   Logika
-   Integritas
-   Pelayanan Publik

------------------------------------------------------------------------

# Step 7 - Review Soal

-   Semua soal
-   Soal salah
-   Soal favorit
-   Pembahasan
-   Riwayat jawaban

------------------------------------------------------------------------

# Step 8 - User Management

## Peserta

-   Daftar peserta
-   Detail peserta
-   Status akun
-   Paket aktif
-   Reset password
-   Nonaktifkan akun

## Admin

-   Daftar admin
-   Role
-   Permission

------------------------------------------------------------------------

# Step 9 - Subscription & Payment

## Subscription

- Daftar Paket
- Benefit Paket
- Harga
- Durasi
- Upgrade Paket
- Perpanjang Langganan
- Riwayat Langganan

## Payment Gateway (Duitku)

### Checkout
- Pilih Paket
- Ringkasan Pembayaran
- Generate Invoice Duitku
- Redirect ke halaman pembayaran Duitku

### Payment Method
- Virtual Account
- QRIS
- E-Wallet
- Retail

### Status Pembayaran
- Pending
- Success
- Failed
- Expired
- Cancelled

### Webhook
- Verifikasi Signature
- Update Status Otomatis
- Aktivasi Paket Otomatis
- Log Callback

### Riwayat Pembayaran
- Daftar Transaksi
- Detail Invoice
- Download Invoice
- Nomor Referensi Duitku

### Promo & Coupon
- Voucher
- Coupon / Kode Kupon
- Kode Promo
- Diskon Persentase
- Diskon Nominal
- Minimum Pembelian
- Maksimum Potongan
- Masa Berlaku
- Kuota Penggunaan
- Berlaku untuk Paket Tertentu
- Berlaku untuk Pengguna Baru
- Validasi Coupon sebelum pembayaran
- Menampilkan nominal diskon pada ringkasan checkout
- Riwayat penggunaan coupon


## Admin Coupon Management

- Daftar Coupon
- Tambah Coupon
- Edit Coupon
- Nonaktifkan Coupon
- Jenis Diskon (Persentase/Nominal)
- Batas Penggunaan
- Masa Berlaku
- Paket yang Berlaku
- Statistik Penggunaan

------------------------------------------------------------------------

# Step 10 - Manajemen Soal

-   Bank Soal
-   Import Excel
-   Export
-   Kategori
-   Subkategori
-   Tingkat Kesulitan
-   Randomisasi

------------------------------------------------------------------------

# Step 11 - Manajemen Tryout

-   Daftar Tryout
-   Jadwal
-   Durasi
-   Passing Score
-   Komposisi TWK/TIU/TKP
-   Publish / Draft

------------------------------------------------------------------------

# Step 12 - Laporan

-   Pendapatan
-   Pengguna
-   Tryout
-   Soal
-   Subscription
-   Payment

------------------------------------------------------------------------

# Step 13 - CMS

-   Hero Landing Page
-   Banner
-   FAQ
-   Artikel
-   Testimoni
-   Kontak
-   SEO

------------------------------------------------------------------------

# Step 14 - Shared Components

-   MetricCard
-   StatCard
-   StatusBadge
-   DataToolbar
-   ResponsiveTable
-   ConfirmDialog
-   FormDrawer
-   LoadingSkeleton
-   EmptyState
-   Pagination

------------------------------------------------------------------------

# Step 15 - Persiapan Backend

-   [ ] Semua halaman menggunakan dummyApi
-   [ ] Tidak ada import dummy JSON langsung
-   [ ] Repository Pattern
-   [ ] apiDataSource placeholder
-   [ ] Loading & Error State
-   [ ] Siap migrasi ke REST API

------------------------------------------------------------------------

# Definition of Done

-   [ ] Landing Page lengkap
-   [ ] Login & Register
-   [ ] Dashboard peserta
-   [ ] Simulasi CAT
-   [ ] Latihan Soal
-   [ ] Review Soal
-   [ ] Analisis Nilai
-   [ ] User Management
-   [ ] Payment Management
-   [ ] Subscription
-   [ ] CMS
-   [ ] Responsive Desktop & Tablet
-   [ ] Dummy JSON terpusat
-   [ ] Siap integrasi backend
