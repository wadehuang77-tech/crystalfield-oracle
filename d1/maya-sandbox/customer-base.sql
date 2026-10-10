-- Empty sandbox only. Minimal dependencies of Google sign-in and session reads.
-- Token generation and member metadata follow in migrations 006 and 018.
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  age INTEGER,
  gender TEXT,
  occupation TEXT,
  healing_interest TEXT,
  purchased_spreads TEXT DEFAULT '[]'
);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Google sign-in merges anonymous oracle usage through the existing helper.
CREATE TABLE multi_spread_free_unlocks (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  spread_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(email_hash, spread_id)
);
CREATE INDEX idx_multi_spread_free_unlocks_created
  ON multi_spread_free_unlocks(created_at DESC);
