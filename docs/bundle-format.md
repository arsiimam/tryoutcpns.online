# Format Bundle Soal CPNS — Spesifikasi v1.0

Bundle adalah unit manajemen soal: satu file berisi satu set soal yang dapat diimpor, diekspor, dan dikelola sebagai satu kesatuan.

---

## Mengapa Bundle?

- Mengelola ribuan soal secara efisien (per topik / per paket)
- Dapat dihasilkan oleh script Python, AI, atau konverter otomatis
- Portable: dipindahkan antar server, dijadikan backup, dibagikan ke tim
- Mendukung konten kompleks: HTML, gambar, LaTeX, tabel

---

## Format yang Didukung

| Format | Prioritas | Keterangan |
|--------|-----------|------------|
| JSON   | ✅ Utama  | Semua fitur, mudah digenerate dari script |
| HTML   | ✅ Sekunder | Bisa dibaca langsung di browser |

---

## Format JSON

### Struktur Atas

```json
{
  "version": "1.0",
  "bundle": { ... },
  "questions": [ ... ]
}
```

### Objek `bundle`

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `name` | string | ✅ | Nama bundle, e.g. "TWK Nasionalisme 2024" |
| `description` | string | — | Deskripsi singkat |
| `category` | string | — | TWK / TIU / TKP / Campuran |
| `metadata` | object | — | Data bebas: author, source, dll |

### Objek `question` (item array `questions`)

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `order` | number | — | Nomor urut (default: index + 1) |
| `type` | string | — | `multiple_choice` (default) \| `true_false` \| `essay` |
| `content` | string | ✅ | Teks soal (boleh HTML penuh) |
| `options` | array | — | Array `{key, text}` untuk pilihan ganda |
| `correct_answer` | string | — | Kunci jawaban: "A", "B", "C", "D", "E" |
| `explanation` | string | — | Pembahasan (boleh HTML) |
| `metadata` | object | — | difficulty, tags, source, year, dll |

### Objek `option`

```json
{ "key": "A", "text": "Teks pilihan A (boleh HTML)" }
```

---

## Format HTML

HTML bundle menggunakan struktur semantik dengan `data-*` attribute.

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="format"      content="cpns-bundle-v1" />
  <meta name="name"        content="Nama Bundle" />
  <meta name="category"    content="TWK" />
  <meta name="description" content="Deskripsi bundle" />
</head>
<body>
<article class="bundle">

  <section class="question" data-type="multiple_choice">
    <div class="content">Teks soal di sini (boleh HTML)</div>
    <ol class="options">
      <li data-key="A">Pilihan A</li>
      <li data-key="B">Pilihan B</li>
      <li data-key="C">Pilihan C</li>
      <li data-key="D">Pilihan D</li>
      <li data-key="E">Pilihan E</li>
    </ol>
    <div class="answer" data-key="C"></div>
    <div class="explanation">Pembahasan soal di sini</div>
  </section>

</article>
</body>
</html>
```

---

## Fitur Konten yang Didukung

| Fitur | Cara Penggunaan |
|-------|----------------|
| Rich Text / Bold / Italic | HTML biasa dalam `content` |
| Gambar | `<img src="data:image/...;base64,..." />` atau URL |
| Tabel | Tag `<table>` standar HTML |
| Bullet / Numbering | `<ul>` / `<ol>` |
| Superscript / Subscript | `<sup>` / `<sub>` |
| Rumus Matematika (LaTeX) | `$$E = mc^2$$` atau `\( ... \)` — KaTeX di frontend |
| Kode | `<code>` / `<pre>` |

### Contoh konten dengan rumus:
```json
"content": "<p>Jika <strong>x² + 5x + 6 = 0</strong>, maka nilai \\(x\\) adalah...</p>"
```

---

## Metadata Soal (rekomendasi field)

```json
{
  "difficulty": "mudah | sedang | sulit",
  "tags": ["nasionalisme", "pancasila"],
  "source": "CPNS 2023 - Kemenkes",
  "year": 2023,
  "region": "Nasional",
  "verified": true,
  "author": "Tim Redaksi"
}
```

---

## Contoh Generate dari Python

```python
import json

bundle = {
  "version": "1.0",
  "bundle": {
    "name": "TWK Nasionalisme Batch 1",
    "category": "TWK",
    "metadata": {"author": "script-gen", "generated_at": "2024-01-01"}
  },
  "questions": []
}

for i, row in enumerate(data_rows):
    bundle["questions"].append({
        "order": i + 1,
        "type": "multiple_choice",
        "content": f"<p>{row['soal']}</p>",
        "options": [{"key": k, "text": row[f"opt_{k.lower()}"]} for k in "ABCDE"],
        "correct_answer": row["kunci"],
        "explanation": f"<p>{row['pembahasan']}</p>",
        "metadata": {"difficulty": row["difficulty"]}
    })

with open("bundle-output.json", "w") as f:
    json.dump(bundle, f, ensure_ascii=False, indent=2)
```

---

## Kompatibilitas Masa Depan

Field yang tidak dikenal **diabaikan** saat import sehingga format ini _forward-compatible_. Penambahan fitur baru (audio, video, tipe soal baru) cukup menambah field baru tanpa merusak bundle lama.

Versi format: `"version": "1.0"` — increment ke `"1.1"` jika ada perubahan minor, ke `"2.0"` jika ada breaking change.
