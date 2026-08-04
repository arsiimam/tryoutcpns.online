-- =============================================================================
-- seed.sql — Data awal SiapCPNS
-- Jalankan: source /var/www/tryoutcpns/.env && psql "$DATABASE_URL" -f seed.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SUBSCRIPTION PLANS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO subscription_plans (id, name, price, original_price, duration_days, benefits, max_tryouts, is_active, color_tag, sort_order, created_at, updated_at)
VALUES
  ('deb0cb4d-8f44-4dcd-ab11-2c6dca641c11', 'Gratis', 0, 0, 365,
   '["Akses 1 Tryout Gratis","Pembahasan Dasar","Latihan Soal Terbatas"]',
   1, true, 'slate', 0,
   '2026-07-22 09:09:19.629517+00', '2026-07-22 09:09:19.629517+00'),

  ('866bc5c3-9d92-4309-851f-8b9faed917b3', 'Silver', 149000, 149000, 30,
   '["Akses Semua Tryout (1 Bulan)","Pembahasan Lengkap","Analisis Skor","Latihan Soal Bebas"]',
   999, true, 'blue', 1,
   '2026-07-22 09:09:19.629517+00', '2026-07-30 05:23:07.819+00'),

  ('e4a93a2d-de63-411d-b9a8-e4214127e79d', 'Gold', 199000, 349000, 90,
   '["Akses Semua Tryout (3 Bulan)","Pembahasan Lengkap & Video","Analisis Skor Detail","Latihan Soal Bebas","Grup Diskusi Telegram"]',
   999, true, 'gold', 2,
   '2026-07-22 09:09:19.629517+00', '2026-07-22 09:10:19.017+00'),

  ('83f8ca57-0fe0-453f-9269-66333981cf81', 'Platinum', 299000, 599000, 180,
   '["Akses Semua Tryout (6 Bulan)","Pembahasan Lengkap & Video","Analisis Skor Detail","Latihan Soal Bebas","Grup Diskusi Telegram","Konsultasi 1on1"]',
   999, true, 'emerald', 3,
   '2026-07-22 09:09:19.629517+00', '2026-07-22 23:48:24.548+00')

ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  price          = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  duration_days  = EXCLUDED.duration_days,
  benefits       = EXCLUDED.benefits,
  max_tryouts    = EXCLUDED.max_tryouts,
  is_active      = EXCLUDED.is_active,
  color_tag      = EXCLUDED.color_tag,
  sort_order     = EXCLUDED.sort_order,
  updated_at     = EXCLUDED.updated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. QUESTION BUNDLES (Bank Soal)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO question_bundles (id, name, description, category, status, question_count, created_at, updated_at)
VALUES
  (1, 'TWK Nasionalisme — Pancasila & UUD 1945',
   'Kumpulan soal pilihan ganda Tes Wawasan Kebangsaan (TWK) materi Nasionalisme, Pancasila, dan UUD 1945 untuk persiapan CPNS.',
   'TWK', 'published', 5,
   '2026-07-23 01:30:15.735138+00', '2026-07-23 01:33:37.032+00')

ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  description    = EXCLUDED.description,
  category       = EXCLUDED.category,
  status         = EXCLUDED.status,
  question_count = EXCLUDED.question_count,
  updated_at     = EXCLUDED.updated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. QUESTIONS (Soal Bank)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO questions (id, bundle_id, order_num, type, content, options, correct_answer, explanation, metadata, created_at, updated_at)
VALUES

(1, 1, 1, 'multiple_choice',
 '<p>Pancasila sebagai dasar negara Indonesia ditetapkan secara resmi pada tanggal...</p>',
 '[{"key":"A","text":"1 Juni 1945"},{"key":"B","text":"18 Agustus 1945"},{"key":"C","text":"17 Agustus 1945"},{"key":"D","text":"22 Juni 1945"},{"key":"E","text":"1 Maret 1945"}]',
 'B',
 '<p>Pancasila ditetapkan secara resmi sebagai dasar negara pada tanggal <strong>18 Agustus 1945</strong> ketika PPKI mengesahkan UUD 1945. Tanggal 1 Juni 1945 adalah hari lahir Pancasila (pidato Soekarno), bukan penetapan resmi.</p>',
 '{"tags":["pancasila","sejarah","ppki"],"year":2021,"source":"CPNS 2021","difficulty":"mudah"}',
 '2026-07-23 01:30:15.743296+00', '2026-07-23 01:30:15.743296+00'),

(2, 1, 2, 'multiple_choice',
 '<p>Perhatikan tabel perbandingan ideologi berikut:</p><table border=''1'' cellpadding=''6'' style=''border-collapse:collapse;width:100%''><thead><tr><th>Aspek</th><th>Liberalisme</th><th>Komunisme</th><th>Pancasila</th></tr></thead><tbody><tr><td>Kebebasan Individu</td><td>Mutlak</td><td>Sangat terbatas</td><td>Seimbang</td></tr><tr><td>Peran Negara</td><td>Minimal</td><td>Dominan</td><td>Proporsional</td></tr></tbody></table><p>Berdasarkan tabel di atas, pernyataan yang <strong>TEPAT</strong> mengenai Pancasila adalah...</p>',
 '[{"key":"A","text":"Pancasila cenderung mengikuti paham liberalisme dalam hal kebebasan individu"},{"key":"B","text":"Pancasila menempatkan kebebasan individu dan peran negara secara seimbang"},{"key":"C","text":"Pancasila identik dengan komunisme karena mengedepankan kepentingan kolektif"},{"key":"D","text":"Pancasila tidak relevan dibandingkan ideologi global lainnya"},{"key":"E","text":"Peran negara dalam Pancasila bersifat dominan seperti komunisme"}]',
 'B',
 '<p>Pancasila merupakan ideologi yang menempatkan kebebasan individu dan kepentingan kolektif secara <strong>seimbang</strong>. Berbeda dengan liberalisme yang memberikan kebebasan mutlak, dan komunisme yang membatasi kebebasan individu secara ekstrem.</p>',
 '{"tags":["pancasila","ideologi","perbandingan"],"year":2022,"source":"CPNS 2022","difficulty":"sedang"}',
 '2026-07-23 01:30:15.743296+00', '2026-07-23 01:30:15.743296+00'),

(3, 1, 3, 'multiple_choice',
 '<p>Diketahui pasal 28C ayat (1) UUD 1945 berbunyi:</p><blockquote><em>"Setiap orang berhak mengembangkan diri melalui pemenuhan kebutuhan dasarnya, berhak mendapat pendidikan dan memperoleh manfaat dari ilmu pengetahuan dan teknologi, seni dan budaya, demi meningkatkan kualitas hidupnya dan demi kesejahteraan umat manusia."</em></blockquote><p>Hak yang dijamin oleh pasal tersebut termasuk dalam kategori hak...</p>',
 '[{"key":"A","text":"Hak sipil dan politik"},{"key":"B","text":"Hak ekonomi, sosial, dan budaya"},{"key":"C","text":"Hak asasi kolektif"},{"key":"D","text":"Hak atas pembangunan"},{"key":"E","text":"Hak solidaritas internasional"}]',
 'B',
 '<p>Pasal 28C ayat (1) UUD 1945 menjamin hak atas pendidikan, iptek, seni, dan budaya yang termasuk dalam kategori <strong>hak ekonomi, sosial, dan budaya (Ekosob)</strong>.</p>',
 '{"tags":["uud1945","ham","pasal-28"],"year":2023,"source":"CPNS 2023","difficulty":"sedang"}',
 '2026-07-23 01:30:15.743296+00', '2026-07-23 01:30:15.743296+00'),

(4, 1, 4, 'multiple_choice',
 '<p>Sebuah diagram menunjukkan proses pembentukan UUD 1945:</p><ul><li>BPUPKI dibentuk 29 April 1945</li><li>Sidang BPUPKI I: 29 Mei – 1 Juni 1945</li><li>Piagam Jakarta: 22 Juni 1945</li><li>PPKI dibentuk 7 Agustus 1945</li><li>Sidang PPKI: 18 Agustus 1945</li></ul><p>Perubahan yang dilakukan PPKI pada 18 Agustus 1945 terhadap rancangan UUD yang disiapkan BPUPKI adalah...</p>',
 '[{"key":"A","text":"Menghapus seluruh isi Piagam Jakarta"},{"key":"B","text":"Mengubah \"tujuh kata\" dalam Piagam Jakarta pada sila pertama Pancasila"},{"key":"C","text":"Menambahkan pasal-pasal tentang hak asasi manusia"},{"key":"D","text":"Mengganti sistem pemerintahan dari presidensial ke parlementer"},{"key":"E","text":"Mengubah nama negara dari Republik Indonesia Serikat menjadi Republik Indonesia"}]',
 'B',
 '<p>Pada sidang PPKI tanggal 18 Agustus 1945, dilakukan perubahan penting: <strong>menghapus tujuh kata</strong> dalam Piagam Jakarta pada sila pertama yang semula berbunyi <em>"Ketuhanan dengan kewajiban menjalankan syariat Islam bagi pemeluk-pemeluknya"</em> menjadi <em>"Ketuhanan Yang Maha Esa"</em>.</p>',
 '{"tags":["sejarah","ppki","uud1945","piagam-jakarta"],"year":2022,"source":"CPNS 2022","difficulty":"sulit"}',
 '2026-07-23 01:30:15.743296+00', '2026-07-23 01:30:15.743296+00'),

(5, 1, 5, 'multiple_choice',
 '<p>Dalam konteks bela negara, yang merupakan contoh implementasi sila ke-3 Pancasila <strong>"Persatuan Indonesia"</strong> dalam kehidupan berbangsa adalah...</p>',
 '[{"key":"A","text":"Memaksakan pendapat sendiri dalam musyawarah desa"},{"key":"B","text":"Mengutamakan kepentingan suku dan daerah asal dalam pengambilan kebijakan nasional"},{"key":"C","text":"Aktif berpartisipasi dalam kegiatan gotong royong lintas agama dan suku"},{"key":"D","text":"Hanya bergaul dengan orang-orang yang memiliki latar belakang budaya yang sama"},{"key":"E","text":"Menyebarkan konten yang membanggakan suku sendiri di media sosial"}]',
 'C',
 '<p>Sila ke-3 <strong>Persatuan Indonesia</strong> diwujudkan melalui sikap dan perilaku yang menjunjung kebersamaan melampaui perbedaan SARA. Gotong royong lintas agama dan suku merupakan implementasi nyata dari nilai persatuan.</p>',
 '{"tags":["pancasila","sila-3","persatuan","bela-negara"],"year":2023,"source":"CPNS 2023","difficulty":"mudah"}',
 '2026-07-23 01:30:15.743296+00', '2026-07-23 01:30:15.743296+00')

ON CONFLICT (id) DO UPDATE SET
  bundle_id      = EXCLUDED.bundle_id,
  order_num      = EXCLUDED.order_num,
  content        = EXCLUDED.content,
  options        = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation    = EXCLUDED.explanation,
  metadata       = EXCLUDED.metadata,
  updated_at     = EXCLUDED.updated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TRYOUT BUNDLES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO tryout_bundles (id, name, description, category, duration_minutes, passing_grade, status, settings, total_questions, is_free, created_at, updated_at)
VALUES
  (1, 'Tryout Akbar #1 (Gratis)',
   'Tryout gratis untuk semua peserta. Uji kemampuan TWK, TIU, dan TKP Anda.',
   'SKD', 100, 311, 'published',
   '{"sections_scoring":[{"wrong":0,"correct":5,"category":"TWK","passing_score":65},{"wrong":0,"correct":5,"category":"TIU","passing_score":80},{"wrong":0,"correct":0,"category":"TKP","passing_score":166}]}',
   3, true,
   '2026-07-23 02:01:32.693037+00', '2026-07-23 02:01:32.693037+00')

ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  description     = EXCLUDED.description,
  category        = EXCLUDED.category,
  duration_minutes= EXCLUDED.duration_minutes,
  passing_grade   = EXCLUDED.passing_grade,
  status          = EXCLUDED.status,
  settings        = EXCLUDED.settings,
  total_questions = EXCLUDED.total_questions,
  is_free         = EXCLUDED.is_free,
  updated_at      = EXCLUDED.updated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRYOUT SECTIONS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO tryout_sections (id, tryout_id, name, category, order_num, question_count, time_limit_minutes, passing_score)
VALUES
  (1, 1, 'TWK - Tes Wawasan Kebangsaan', 'TWK', 1, 30, 35, 65),
  (2, 1, 'TIU - Tes Intelegensi Umum',   'TIU', 2, 35, 40, 80),
  (3, 1, 'TKP - Tes Karakteristik Pribadi','TKP',3, 45, 25, 166)

ON CONFLICT (id) DO UPDATE SET
  name               = EXCLUDED.name,
  category           = EXCLUDED.category,
  order_num          = EXCLUDED.order_num,
  question_count     = EXCLUDED.question_count,
  time_limit_minutes = EXCLUDED.time_limit_minutes,
  passing_score      = EXCLUDED.passing_score;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TRYOUT QUESTIONS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO tryout_questions (id, tryout_id, section_id, order_num, type, content, options, correct_answer, explanation, metadata, score_weight)
VALUES

(1, 1, 1, 1, 'multiple_choice',
 'Pancasila sebagai dasar negara Indonesia ditetapkan secara resmi pada tanggal?',
 '[{"key":"A","text":"1 Juni 1945"},{"key":"B","text":"18 Agustus 1945"},{"key":"C","text":"17 Agustus 1945"},{"key":"D","text":"22 Juni 1945"},{"key":"E","text":"29 Agustus 1945"}]',
 'B', 'Pancasila ditetapkan secara resmi sebagai dasar negara pada sidang PPKI tanggal 18 Agustus 1945.', NULL, 1),

(2, 1, 1, 2, 'multiple_choice',
 'Sila ke-3 Pancasila berbunyi...',
 '[{"key":"A","text":"Ketuhanan Yang Maha Esa"},{"key":"B","text":"Kemanusiaan yang Adil dan Beradab"},{"key":"C","text":"Persatuan Indonesia"},{"key":"D","text":"Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan"},{"key":"E","text":"Keadilan Sosial bagi Seluruh Rakyat Indonesia"}]',
 'C', 'Sila ke-3 Pancasila adalah Persatuan Indonesia.', NULL, 1),

(3, 1, 1, 3, 'multiple_choice',
 'UUD 1945 pertama kali disahkan oleh...',
 '[{"key":"A","text":"BPUPKI"},{"key":"B","text":"PPKI"},{"key":"C","text":"DPR"},{"key":"D","text":"MPR"},{"key":"E","text":"Presiden"}]',
 'B', 'UUD 1945 disahkan oleh PPKI (Panitia Persiapan Kemerdekaan Indonesia) pada 18 Agustus 1945.', NULL, 1)

ON CONFLICT (id) DO UPDATE SET
  tryout_id      = EXCLUDED.tryout_id,
  section_id     = EXCLUDED.section_id,
  order_num      = EXCLUDED.order_num,
  content        = EXCLUDED.content,
  options        = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation    = EXCLUDED.explanation,
  score_weight   = EXCLUDED.score_weight;

-- Reset sequences agar ID auto-increment tidak bentrok
SELECT setval('question_bundles_id_seq', (SELECT MAX(id) FROM question_bundles));
SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions));
SELECT setval('tryout_bundles_id_seq', (SELECT MAX(id) FROM tryout_bundles));
SELECT setval('tryout_sections_id_seq', (SELECT MAX(id) FROM tryout_sections));
SELECT setval('tryout_questions_id_seq', (SELECT MAX(id) FROM tryout_questions));

\echo '✅ Seed selesai!'
\echo '   - 4 paket langganan'
\echo '   - 1 bank soal TWK (5 soal)'
\echo '   - 1 tryout gratis (3 soal contoh, 3 seksi)'
