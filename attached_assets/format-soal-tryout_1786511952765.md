# Spesifikasi Format Soal & Pembahasan — Platform Tryout Online

Dokumen ini adalah acuan format data soal, aturan render tampilan, dan alur import bundle untuk platform tryout. Gunakan sebagai referensi saat membangun fitur input soal, importer, dan renderer di frontend.

---

## 1. Prinsip Dasar

- **Rumus matematika**: ditulis dalam LaTeX, dirender di client pakai **KaTeX** (lebih cepat & ringan dibanding MathJax untuk soal dalam jumlah besar).
- **Gambar**: disimpan sebagai path relatif dalam bundle import, di-upload otomatis ke storage (S3/Cloudinary/dsb) saat proses import, lalu path diganti jadi URL CDN.
- **Pembahasan**: selalu dipecah jadi **langkah bernomor** (array), bukan satu paragraf panjang — supaya bisa dirender step-by-step.
- **Satu soal = satu objek JSON.** Kumpulan soal (paket tryout) = array objek + metadata paket.

---

## 2. Skema JSON — Satu Soal

```json
{
  "id": "MTK-001",
  "subtes": "Penalaran Matematika",
  "tipe": "pilihan_ganda",
  "tingkat_kesulitan": "sedang",
  "stem": "Sebuah tangki air berbentuk tabung memiliki jari-jari $r = 7$ cm dan tinggi $h = 20$ cm. Jika air diisi hingga $\\frac{3}{4}$ bagian, berapa volume air dalam tangki?",
  "gambar_soal": ["images/tangki-air.png"],
  "opsi": [
    { "label": "A", "teks": "2.310 cm³" },
    { "label": "B", "teks": "2.940 cm³" },
    { "label": "C", "teks": "3.080 cm³" },
    { "label": "D", "teks": "3.850 cm³" }
  ],
  "jawaban_benar": "C",
  "pembahasan": {
    "ringkasan": "Gunakan rumus volume tabung, lalu ambil bagian yang terisi air.",
    "langkah": [
      "Volume tabung penuh: $V = \\pi r^2 h$",
      "Substitusi nilai: $V = \\frac{22}{7} \\times 7^2 \\times 20 = 3.080\\text{ cm}^3$"
    ],
    "gambar_pembahasan": ["images/ilustrasi-tabung.png"],
    "tag": ["geometri", "bangun-ruang", "tabung"]
  }
}
```

### Keterangan field

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `id` | string | ya | ID unik soal, dipakai untuk referensi di analitik & bank soal |
| `subtes` | string | ya | Kategori/subtes (misal: Penalaran Matematika, Literasi Bahasa Indonesia) |
| `tipe` | enum | ya | `pilihan_ganda`, `pilihan_ganda_kompleks`, `isian_singkat`, `benar_salah` |
| `tingkat_kesulitan` | enum | tidak | `mudah`, `sedang`, `sulit` — untuk analitik & adaptive test |
| `stem` | string | ya | Teks soal. Rumus inline pakai `$...$`, block formula pakai `$$...$$` |
| `gambar_soal` | array\<string\> | tidak | Path relatif ke gambar dalam bundle, boleh lebih dari satu |
| `opsi` | array\<object\> | ya (jika PG) | Tiap opsi punya `label` dan `teks` (teks juga boleh mengandung LaTeX) |
| `jawaban_benar` | string / array | ya | Label opsi benar. Array jika `pilihan_ganda_kompleks` |
| `pembahasan.ringkasan` | string | ya | Satu kalimat pendekatan/strategi solusi |
| `pembahasan.langkah` | array\<string\> | ya | Langkah solusi berurutan, tiap elemen satu langkah |
| `pembahasan.gambar_pembahasan` | array\<string\> | tidak | Gambar pendukung pembahasan (grafik, ilustrasi tambahan) |
| `pembahasan.tag` | array\<string\> | tidak | Untuk filter bank soal & rekomendasi latihan serupa |

---

## 3. Skema Bundle (Paket Tryout)

```json
{
  "paket": "Tryout SNBT Agustus #3",
  "deskripsi": "Simulasi UTBK dengan bobot soal setara tahun berjalan",
  "durasi_menit": 90,
  "total_soal": 40,
  "soal": [
    /* array objek soal seperti skema di atas */
  ]
}
```

### Struktur file ZIP untuk import

```
paket-soal.zip
├── data.json          ← berisi objek paket + array soal
└── images/
    ├── tangki-air.png
    ├── ilustrasi-tabung.png
    └── ...
```

Semua path di `gambar_soal` dan `gambar_pembahasan` merujuk ke file dalam folder `images/` pada ZIP yang sama.

---

## 4. Alur Import Bundle

1. Tim pembuat soal mengisi konten (langsung di JSON, atau di spreadsheet lalu dikonversi — lihat bagian 5).
2. Semua file dikumpulkan jadi satu ZIP sesuai struktur di atas.
3. Sistem melakukan:
   - Validasi skema JSON (field wajib, tipe data, referensi gambar ada di folder `images/`).
   - Upload tiap file gambar ke storage (S3/Cloudinary), lalu **replace path relatif → URL CDN** di objek soal.
   - Simpan tiap soal ke database (tabel `soal`) dan buat entri paket di tabel `paket_tryout`.
4. Tampilkan ringkasan hasil import: jumlah soal berhasil, soal gagal (dengan alasan), gambar yang tidak ditemukan.

### Aturan validasi minimum
- `id` harus unik dalam satu paket.
- Jumlah `opsi` untuk `pilihan_ganda` minimal 2.
- `jawaban_benar` harus cocok dengan salah satu `label` di `opsi`.
- Setiap path di `gambar_soal`/`gambar_pembahasan` harus ada filenya di dalam ZIP — jika tidak, tandai warning tapi tetap import (gambar kosong, bisa diedit manual nanti).

---

## 5. Alternatif Input via Spreadsheet (untuk tim non-teknis)

Kolom yang disarankan di Google Sheets/Excel:

| id | subtes | stem | gambar_soal | opsi_a | opsi_b | opsi_c | opsi_d | jawaban_benar | pembahasan_ringkasan | pembahasan_langkah | tag |
|---|---|---|---|---|---|---|---|---|---|---|---|

- `pembahasan_langkah`: pisahkan tiap langkah dengan delimiter `||` dalam satu sel, contoh:
  `Volume tabung penuh: $V = \pi r^2 h$ || Substitusi nilai: $V = 3.080 cm^3$`
- `gambar_soal`: isi dengan nama file saja (misal `tangki-air.png`), file gambar diupload terpisah dalam satu folder lalu di-zip bareng spreadsheet.
- Sistem konversi CSV → JSON mengikuti skema di bagian 2 sebelum masuk ke alur import bundle.

---

## 6. Aturan Render (Frontend)

- **Formula**: gunakan library `katex` + `auto-render` (dari CDN atau bundled). Scan seluruh teks (`stem`, `opsi.teks`, `pembahasan.langkah`) untuk delimiter `$...$` (inline) dan `$$...$$` (block), render saat komponen mount.
- **Gambar**: lazy-load dengan placeholder ukuran tetap (hindari layout shift), max-width 100% dari kartu soal, klik untuk zoom (lightbox) jika gambar detail seperti grafik/diagram kompleks.
- **Pembahasan**: render tiap elemen `langkah` sebagai baris bernomor terpisah (lingkaran angka + teks), bukan digabung jadi satu paragraf.
- **Highlight jawaban benar**: gunakan warna latar lembut (bukan warna solid mencolok) + ikon centang, supaya nyaman dibaca saat siswa review banyak soal berturut-turut.
- **Tag/kategori**: tampilkan sebagai pill kecil di bawah pembahasan, dipakai juga untuk fitur "soal serupa" atau filter bank soal.

---

## 7. Contoh Komponen Render (ringkasan alur, bukan kode lengkap)

```
QuestionCard
├── Header (nomor soal, subtes, timer)
├── Stem (render KaTeX)
├── Gambar soal (jika ada)
└── Opsi (render KaTeX per opsi, radio/checkbox sesuai tipe)

ExplanationPanel
├── Ringkasan pendekatan
├── Langkah 1, 2, 3, ... (render KaTeX per langkah)
├── Gambar pembahasan (jika ada)
└── Tag
```

---

## 8. Form Input Soal Manual (Single Entry)

Selain import bundle, sediakan juga form input satu-per-satu untuk soal yang dibuat langsung di platform (revisi cepat, soal tambahan, dsb). Form ini menghasilkan objek JSON yang **sama persis strukturnya** dengan skema di Bagian 2 — jadi soal dari form manual dan dari bundle import bisa disimpan di tabel yang sama tanpa konversi tambahan.

### Field form dan tipe input-nya

| Bagian | Field | Tipe input | Catatan |
|---|---|---|---|
| Info dasar | Subtes, Tingkat kesulitan, Tag | Dropdown / multi-select | Tag bisa searchable-create (ketik tag baru langsung tersimpan) |
| Stem | Teks soal | Textarea dengan **live preview** | Preview render KaTeX real-time saat mengetik `$...$`, supaya penulis langsung tahu rumus sudah benar sebelum submit |
| Stem | Gambar soal | Upload gambar (drag & drop / pilih file) | Bisa lebih dari satu gambar, preview thumbnail langsung setelah upload, ada tombol hapus per gambar |
| Opsi jawaban | Teks tiap opsi (A, B, C, D, ...) | Textarea kecil dengan live preview KaTeX | Tombol tambah/hapus opsi (minimal 2, umumnya 4-5) |
| Opsi jawaban | **Gambar per opsi** | Upload gambar opsional per baris opsi | Untuk soal yang jawabannya berupa gambar/grafik (misal: "manakah grafik yang tepat"), bukan hanya teks. Field teks tetap ada sebagai alt text/keterangan singkat |
| Opsi jawaban | Jawaban benar | Radio (PG biasa) / checkbox (PG kompleks) | Pilih langsung dari daftar opsi yang sudah diisi, tidak input manual label terpisah — mengurangi risiko typo mismatch |
| Pembahasan | Ringkasan pendekatan | Text input satu baris | |
| Pembahasan | Langkah-langkah | Daftar textarea dinamis, tombol "+ Tambah langkah" | Tiap langkah punya live preview KaTeX sendiri, bisa di-drag untuk reorder, bisa dihapus per langkah |
| Pembahasan | Gambar pendukung | Upload gambar opsional | Sama seperti gambar soal, bisa lebih dari satu |

### Perilaku penting
- **Live preview wajib ada** di semua field yang menerima LaTeX (stem, teks opsi, tiap langkah pembahasan) — render di bawah textarea saat mengetik (debounce ~300ms), supaya penulis soal (yang belum tentu hafal syntax LaTeX) langsung lihat hasilnya, bukan baru tahu error setelah publish.
- **Sisipkan simbol cepat**: toolbar kecil di atas textarea dengan tombol untuk simbol umum (pecahan, akar, pangkat, integral, dll) yang otomatis menyisipkan syntax LaTeX ke posisi kursor — meringankan penulis yang tidak familiar mengetik LaTeX manual.
- **Upload gambar** langsung ke storage saat file dipilih (bukan menunggu submit form), supaya kalau form gagal submit karena field lain, gambar yang sudah diupload tidak hilang dan tidak perlu upload ulang.
- **Tombol "Preview soal"**: menampilkan render final kartu soal + panel pembahasan persis seperti yang akan dilihat siswa, sebelum penulis klik simpan.
- **Autosave draft**: simpan sebagai draft otomatis tiap beberapa detik supaya tidak hilang kalau browser tertutup tidak sengaja.

---

## 9. Checklist Sebelum Publish Paket Tryout

- [ ] Semua soal punya `jawaban_benar` yang valid
- [ ] Semua rumus LaTeX sudah dicek render-nya (tidak ada syntax error)
- [ ] Semua gambar termuat (tidak ada broken image)
- [ ] Pembahasan minimal 1 langkah untuk tiap soal
- [ ] Total soal sesuai `total_soal` di metadata paket
- [ ] Durasi (`durasi_menit`) sudah sesuai standar (misal UTBK per subtes)
