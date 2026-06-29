-- Bundle credit pool: tracks remaining paid uses per user per category
CREATE TABLE IF NOT EXISTS bundle_credits (
  user_id              TEXT NOT NULL UNIQUE,
  three_card_remaining INTEGER NOT NULL DEFAULT 0,
  three_card_expires   TEXT,
  ten_card_remaining   INTEGER NOT NULL DEFAULT 0,
  ten_card_expires     TEXT,
  pastlife_remaining   INTEGER NOT NULL DEFAULT 0,
  pastlife_expires     TEXT,
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id)
);
