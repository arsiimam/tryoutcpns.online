-- Migration: add sort_order to tryout_bundles
-- Reason: admin ingin urutan paket tryout (yang tampil ke peserta) bisa
-- digeser-geser manual, bukan selalu mengikuti urutan input/dibuat.
-- Backfill: isi sort_order sesuai urutan created_at yang sudah ada saat ini,
-- supaya urutan yang sudah ada TIDAK berubah begitu migrasi ini jalan.
-- Safe to run multiple times: ADD COLUMN IF NOT EXISTS + UPDATE idempotent.
ALTER TABLE tryout_bundles ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE tryout_bundles t
SET sort_order = ranked.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM tryout_bundles
) ranked
WHERE t.id = ranked.id;
