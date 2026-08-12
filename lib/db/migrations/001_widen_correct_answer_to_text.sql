-- Migration: widen questions.correct_answer from varchar(10) to text
-- Reason: pilihan_ganda_kompleks (PGK) questions can have multiple correct answers
-- stored as comma-separated keys (e.g. "A,B,C,D,E,F"), which exceeds varchar(10).
-- Safe to run multiple times: ALTER TYPE is a no-op if already text.
ALTER TABLE questions ALTER COLUMN correct_answer TYPE text;
