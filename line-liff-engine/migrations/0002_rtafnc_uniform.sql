-- RTAFNC Governance Supplies / Uniform LIFF extension
-- Apply AFTER 0001_init.sql on STAGING D1 only.

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'
  CHECK (role IN ('admin','storekeeper','auditor','student','viewer'));
ALTER TABLE users ADD COLUMN student_id TEXT;

CREATE TABLE IF NOT EXISTS personnel (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    TEXT NOT NULL UNIQUE,
  rank_name     TEXT,
  full_name     TEXT NOT NULL,
  class_year    INTEGER,
  cohort        TEXT,
  line_user_id  TEXT UNIQUE,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_personnel_name ON personnel(full_name);
CREATE INDEX IF NOT EXISTS idx_personnel_class_year ON personnel(class_year);

CREATE TABLE IF NOT EXISTS item_variants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_code  TEXT NOT NULL,
  size          TEXT,
  color         TEXT,
  gender        TEXT,
  barcode       TEXT UNIQUE,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, variant_code)
);
CREATE INDEX IF NOT EXISTS idx_variant_product ON item_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_size ON item_variants(size);

CREATE TABLE IF NOT EXISTS variant_stock_levels (
  variant_id    INTEGER NOT NULL REFERENCES item_variants(id) ON DELETE CASCADE,
  location_id   INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  qty           REAL NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (variant_id, location_id)
);

CREATE TABLE IF NOT EXISTS issue_entitlements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  personnel_id   INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  academic_year  TEXT NOT NULL,
  allowed_qty    REAL NOT NULL DEFAULT 0,
  issued_qty     REAL NOT NULL DEFAULT 0,
  note           TEXT,
  UNIQUE(personnel_id, product_id, academic_year)
);

CREATE TABLE IF NOT EXISTS uniform_transactions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ref            TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN (
                   'issue','receive','return','exchange_out','exchange_in',
                   'adjust','transfer_out','transfer_in','damaged','lost'
                 )),
  personnel_id   INTEGER REFERENCES personnel(id) ON DELETE SET NULL,
  variant_id     INTEGER NOT NULL REFERENCES item_variants(id) ON DELETE CASCADE,
  location_id    INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  qty            REAL NOT NULL,
  delta          REAL NOT NULL,
  balance_after  REAL NOT NULL,
  note           TEXT,
  actor_line_id  TEXT,
  actor_name     TEXT,
  source         TEXT NOT NULL DEFAULT 'liff' CHECK (source IN ('line','liff','system','import')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_uniform_tx_ref ON uniform_transactions(ref);
CREATE INDEX IF NOT EXISTS idx_uniform_tx_person ON uniform_transactions(personnel_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_uniform_tx_variant ON uniform_transactions(variant_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_uniform_tx_created ON uniform_transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_line_id  TEXT,
  actor_role     TEXT,
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      TEXT,
  detail_json    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
