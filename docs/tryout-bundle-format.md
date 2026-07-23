# Format Bundle Tryout CPNS — Spesifikasi v1.0

Bundle Tryout adalah satu paket ujian lengkap yang dapat diimpor, diekspor, dan dikelola sebagai satu file.

---

## Struktur JSON

```json
{
  "version": "1.0",
  "type": "tryout_bundle",
  "tryout": { ... },
  "sections": [ ... ]
}
```

### Objek `tryout` (metadata paket)

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `name` | string | ✅ | Nama tryout, e.g. "SKD Nasional #1" |
| `description` | string | — | Deskripsi singkat |
| `category` | string | — | SKD / SKB / CPNS / dll |
| `duration_minutes` | number | — | Durasi dalam menit (default: 100) |
| `passing_grade` | number | — | Nilai ambang batas kelulusan |
| `settings` | object | — | Pengaturan tambahan (lihat di bawah) |
| `metadata` | object | — | Data bebas: author, source, dll |

### Objek `settings` (pengaturan tryout)

```json
{
  "randomize_questions": false,
  "randomize_options":   false,
  "show_result_immediately": true,
  "allow_back_navigation":   true,
  "score_correct":   5,
  "score_wrong":     0,
  "score_empty":     0,
  "sections_scoring": {
    "TWK": { "correct": 5, "wrong": 0, "empty": 0 },
    "TIU": { "correct": 5, "wrong": 0, "empty": 0 },
    "TKP": { "min": 1, "max": 5 }
  }
}
```

### Array `sections`

Setiap elemen adalah satu seksi/bagian ujian (TWK, TIU, TKP, dll).

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `name` | string | ✅ | Nama seksi, e.g. "TWK" |
| `category` | string | — | TWK / TIU / TKP |
| `order` | number | — | Urutan seksi (default: index + 1) |
| `time_limit_minutes` | number | — | Batas waktu per seksi (null = ikut total) |
| `passing_score` | number | — | Nilai minimum seksi ini |
| `questions` | array | ✅ | Daftar soal dalam seksi |

### Objek `question`

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `order` | number | — | Nomor urut dalam seksi |
| `type` | string | — | `multiple_choice` (default) \| `true_false` \| `essay` |
| `content` | string | ✅ | Teks soal (HTML penuh) |
| `options` | array | — | `[{key, text}]` untuk pilihan ganda |
| `correct_answer` | string | — | "A" / "B" / "C" / "D" / "E" |
| `explanation` | string | — | Pembahasan (HTML) |
| `metadata` | object | — | difficulty, tags, source, year |
| `score_weight` | number | — | Bobot nilai soal (default: 1) |

---

## Format HTML

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="format"        content="cpns-tryout-bundle-v1" />
  <meta name="name"          content="SKD Nasional #1" />
  <meta name="category"      content="SKD" />
  <meta name="duration"      content="100" />
  <meta name="passing_grade" content="311" />
</head>
<body>
<article class="tryout-bundle">

  <section class="tryout-section" data-category="TWK">
    <h2>TWK</h2>
    <div class="question">
      <div class="content"><p>Teks soal TWK...</p></div>
      <ol class="options">
        <li data-key="A">Pilihan A</li>
        <li data-key="B">Pilihan B</li>
        <li data-key="C">Pilihan C</li>
        <li data-key="D">Pilihan D</li>
        <li data-key="E">Pilihan E</li>
      </ol>
      <div class="answer" data-key="C"></div>
      <div class="explanation">Pembahasan...</div>
    </div>
  </section>

  <section class="tryout-section" data-category="TIU">
    <h2>TIU</h2>
    ...
  </section>

</article>
</body>
</html>
```

---

## Contoh Generate Python

```python
import json

bundle = {
  "version": "1.0",
  "type": "tryout_bundle",
  "tryout": {
    "name": "SKD Nasional #1",
    "category": "SKD",
    "duration_minutes": 100,
    "passing_grade": 311,
    "settings": {
      "randomize_questions": False,
      "randomize_options": False,
    }
  },
  "sections": [
    {
      "name": "TWK", "category": "TWK", "order": 1,
      "passing_score": 65, "questions": []
    },
    {
      "name": "TIU", "category": "TIU", "order": 2,
      "passing_score": 80, "questions": []
    },
    {
      "name": "TKP", "category": "TKP", "order": 3,
      "passing_score": 166, "questions": []
    },
  ]
}

# Tambah soal TWK
for row in twk_rows:
    bundle["sections"][0]["questions"].append({
        "order": row["no"],
        "type": "multiple_choice",
        "content": f"<p>{row['soal']}</p>",
        "options": [{"key": k, "text": row[f"opt_{k.lower()}"]} for k in "ABCDE"],
        "correct_answer": row["kunci"],
        "explanation": f"<p>{row['pembahasan']}</p>",
        "metadata": {"difficulty": row["tingkat"], "tags": [row["topik"]]}
    })

with open("tryout-skd-1.json", "w", encoding="utf-8") as f:
    json.dump(bundle, f, ensure_ascii=False, indent=2)
```

---

## Kompatibilitas Masa Depan

Field yang tidak dikenal **diabaikan** saat import. Format ini dirancang _forward-compatible_:

| Fitur Masa Depan | Cara Tambah |
|---|---|
| Audio / Video | Tambah field `media: [{type, url}]` di question |
| Drag & Drop / Matching | Tambah `type: "matching"` + `pairs: [...]` |
| Randomisasi | Sudah ada di `settings.randomize_questions` |
| Adaptive Testing | Tambah `metadata.irt_params` per soal |
| Bank Soal Dinamis | Tambah `source_bundle_id` + `count` di section |

Versi: `"version": "1.0"` — increment ke `"1.1"` jika ada perubahan minor non-breaking.
