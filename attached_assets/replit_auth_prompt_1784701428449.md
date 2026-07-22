# Perbaikan Sistem Autentikasi

Ubah alur autentikasi aplikasi menjadi lebih sederhana tanpa menggunakan
OTP, magic link, maupun email verification. Tetap pertahankan dua tombol
utama pada landing page, yaitu **Masuk** dan **Daftar**.

## 1. Landing Page

Tetap tampilkan dua tombol utama:

-   **Masuk**
-   **Daftar**

------------------------------------------------------------------------

## 2. Halaman Daftar

Saat pengguna memilih **Daftar**, tampilkan dua opsi:

### Daftar dengan Email

Form: - Nama Lengkap - Email - Password - Konfirmasi Password - Tombol
**Daftar**

Setelah berhasil mendaftar: - Buat akun baru. - Login otomatis. -
Redirect ke Dashboard. - Tidak perlu verifikasi email. - Tidak perlu
OTP.

### Daftar dengan Google

Tambahkan tombol **Lanjutkan dengan Google** menggunakan Google OAuth.

Alur: 1. Browser menampilkan akun Google yang sudah login. 2. Pengguna
memilih akun. 3. Jika email belum terdaftar: - Buat akun baru. - Simpan
nama dan email dari Google. - Login otomatis. - Redirect ke Dashboard.
4. Jika email sudah terdaftar: - Langsung login. - Redirect ke
Dashboard.

Tidak meminta password dan tidak menggunakan OTP.

------------------------------------------------------------------------

## 3. Halaman Login

Form login tetap menggunakan:

-   Email
-   Password
-   Tombol **Masuk**

Tambahkan pemisah:

``` text
──────── atau ────────
```

Kemudian tambahkan tombol:

**Masuk dengan Google**

Alur: - Klik tombol. - Browser menampilkan akun Google yang sudah
login. - Pengguna memilih akun.

Jika email sudah memiliki akun: - Login otomatis. - Redirect ke
Dashboard.

Jika email belum memiliki akun: - Tampilkan pesan: \> Akun belum
terdaftar. Silakan daftar terlebih dahulu.

Jangan membuat akun baru dari halaman Login.

------------------------------------------------------------------------

## 4. Hapus Seluruh OTP

Hilangkan seluruh mekanisme berikut:

-   Email OTP
-   SMS OTP
-   Magic Link
-   Verification Code
-   Verify Email Page
-   OTP Input
-   Countdown OTP
-   Resend OTP

Autentikasi hanya menggunakan: - Email + Password - Google OAuth

------------------------------------------------------------------------

## 5. Session

-   Simpan session setelah login berhasil.
-   Pengguna tetap login hingga Logout.
-   Jika session masih valid, langsung masuk ke Dashboard saat aplikasi
    dibuka kembali.

------------------------------------------------------------------------

## 6. Logout

Logout harus: - Menghapus session aplikasi. - Tidak menghapus akun
Google dari browser. - Saat login kembali dengan Google, daftar akun
Google tetap tersedia.

------------------------------------------------------------------------

## 7. Database

Gunakan satu tabel `users`.

Field minimal:

-   id
-   full_name
-   email (unique)
-   password_hash (nullable untuk akun Google)
-   auth_provider (`email` atau `google`)
-   avatar_url (nullable)
-   created_at
-   updated_at

Email harus unik.

Jika email sudah ada, jangan membuat akun baru.

------------------------------------------------------------------------

## 8. User Experience

Landing Page

-   Masuk
-   Daftar

Daftar

-   Daftar dengan Email
-   Daftar dengan Google

Login

-   Email + Password
-   Masuk dengan Google

Google Login

-   Pilih akun Google yang sudah login di browser.
-   Jika akun sudah ada → Login otomatis.
-   Jika belum ada → Minta pengguna melakukan pendaftaran.

Tidak ada OTP pada seluruh alur.

------------------------------------------------------------------------

## 9. Implementasi

-   Gunakan Google OAuth bawaan framework.
-   Simpan password menggunakan hash yang aman (bcrypt atau Argon2).
-   Jangan mengubah desain UI secara signifikan.
-   Fokus pada perubahan alur autentikasi.
-   Perbarui route, middleware, dan validasi agar sesuai dengan alur
    baru.
