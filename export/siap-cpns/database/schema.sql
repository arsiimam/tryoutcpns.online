-- =============================================================================
-- SiapCPNS - Database Schema
-- PostgreSQL 14+
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',  -- 'email' | 'google'
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'participant',  -- 'participant' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- app_settings  (key-value store for admin-editable config)
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- subscription_plans
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  price          INTEGER NOT NULL DEFAULT 0,           -- IDR, 0 = free
  original_price INTEGER NOT NULL DEFAULT 0,           -- for strikethrough display
  duration_days  INTEGER NOT NULL DEFAULT 30,
  benefits       TEXT NOT NULL DEFAULT '[]',           -- JSON array of benefit strings
  max_tryouts    INTEGER NOT NULL DEFAULT 999,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  color_tag      TEXT NOT NULL DEFAULT 'blue',         -- blue | gold | emerald | slate
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- user_subscriptions_plan
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions_plan (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id    TEXT NOT NULL,
  plan_name  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'expired' | 'cancelled'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- payment_transactions
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  merchant_order_id TEXT NOT NULL UNIQUE,
  plan_id           TEXT NOT NULL,
  plan_name         TEXT NOT NULL,
  amount            INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | success | failed | expired | cancelled
  payment_method    TEXT,
  duitku_reference  TEXT,
  callback_data     TEXT,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- question_bundles
-- =============================================================================
CREATE TABLE IF NOT EXISTS question_bundles (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  category       VARCHAR(100),
  status         VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | published
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- questions
-- =============================================================================
CREATE TABLE IF NOT EXISTS questions (
  id             SERIAL PRIMARY KEY,
  bundle_id      INTEGER NOT NULL REFERENCES question_bundles(id) ON DELETE CASCADE,
  order_num      INTEGER NOT NULL DEFAULT 1,
  type           VARCHAR(50) NOT NULL DEFAULT 'multiple_choice',
  content        TEXT NOT NULL,
  options        JSONB,          -- [{key:"A", text:"..."}, ...]
  correct_answer VARCHAR(10),
  explanation    TEXT,
  metadata       JSONB,          -- {difficulty, tags, source, ...}
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- tryout_bundles
-- =============================================================================
CREATE TABLE IF NOT EXISTS tryout_bundles (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  category         VARCHAR(100),
  duration_minutes INTEGER NOT NULL DEFAULT 100,
  passing_grade    INTEGER NOT NULL DEFAULT 0,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | published
  settings         JSONB,
  total_questions  INTEGER NOT NULL DEFAULT 0,
  is_free          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- tryout_sections
-- =============================================================================
CREATE TABLE IF NOT EXISTS tryout_sections (
  id                 SERIAL PRIMARY KEY,
  tryout_id          INTEGER NOT NULL REFERENCES tryout_bundles(id) ON DELETE CASCADE,
  name               VARCHAR(255) NOT NULL,
  category           VARCHAR(100),
  order_num          INTEGER NOT NULL DEFAULT 1,
  question_count     INTEGER NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER,
  passing_score      INTEGER
);

-- =============================================================================
-- tryout_questions
-- =============================================================================
CREATE TABLE IF NOT EXISTS tryout_questions (
  id             SERIAL PRIMARY KEY,
  tryout_id      INTEGER NOT NULL REFERENCES tryout_bundles(id) ON DELETE CASCADE,
  section_id     INTEGER NOT NULL REFERENCES tryout_sections(id) ON DELETE CASCADE,
  order_num      INTEGER NOT NULL DEFAULT 1,
  type           VARCHAR(50) NOT NULL DEFAULT 'multiple_choice',
  content        TEXT NOT NULL,
  options        JSONB,
  correct_answer VARCHAR(10),
  explanation    TEXT,
  metadata       JSONB,
  score_weight   INTEGER NOT NULL DEFAULT 1
);

-- =============================================================================
-- tryout_sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS tryout_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tryout_id      INTEGER NOT NULL REFERENCES tryout_bundles(id) ON DELETE CASCADE,
  status         VARCHAR(20) NOT NULL DEFAULT 'in_progress',  -- in_progress | submitted
  answers        JSONB NOT NULL DEFAULT '{}',
  flagged        JSONB NOT NULL DEFAULT '[]',
  time_remaining INTEGER,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- tryout_results
-- =============================================================================
CREATE TABLE IF NOT EXISTS tryout_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES tryout_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tryout_id       INTEGER NOT NULL REFERENCES tryout_bundles(id) ON DELETE CASCADE,
  twk_score       INTEGER NOT NULL DEFAULT 0,
  tiu_score       INTEGER NOT NULL DEFAULT 0,
  tkp_score       INTEGER NOT NULL DEFAULT 0,
  total_score     INTEGER NOT NULL DEFAULT 0,
  twk_correct     INTEGER NOT NULL DEFAULT 0,
  tiu_correct     INTEGER NOT NULL DEFAULT 0,
  tkp_correct     INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  passed          BOOLEAN NOT NULL DEFAULT FALSE,
  rank            INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- user_sessions  (managed by connect-pg-simple — express-session store)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions_plan(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions_plan(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_merchant_order ON payment_transactions(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_questions_bundle_id ON questions(bundle_id);
CREATE INDEX IF NOT EXISTS idx_tryout_sessions_user_id ON tryout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tryout_sessions_tryout_id ON tryout_sessions(tryout_id);
CREATE INDEX IF NOT EXISTS idx_tryout_results_user_id ON tryout_results(user_id);
CREATE INDEX IF NOT EXISTS idx_tryout_results_tryout_id ON tryout_results(tryout_id);

-- =============================================================================
-- Seed: default admin user
-- Password: Admin123! (bcrypt hash — CHANGE THIS in production)
-- =============================================================================
INSERT INTO users (full_name, email, password_hash, auth_provider, role)
VALUES (
  'Administrator',
  'admin@siapcpns.id',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- password: password
  'email',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Default app settings
INSERT INTO app_settings (key, value) VALUES
  ('site_name', 'SiapCPNS'),
  ('site_tagline', 'Platform Tryout CPNS Online Terpercaya'),
  ('google_client_id', ''),
  ('google_client_secret', ''),
  ('duitku_merchant_code', ''),
  ('duitku_api_key', ''),
  ('duitku_environment', 'sandbox'),
  ('duitku_expiry_period', '1440')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- IMPORTANT: After running this schema, update the admin password:
--   UPDATE users SET password_hash = '<bcrypt_hash>' WHERE email = 'admin@siapcpns.id';
-- Generate a bcrypt hash: node -e "const b=require('bcryptjs'); console.log(b.hashSync('YourNewPassword', 10))"
-- =============================================================================
