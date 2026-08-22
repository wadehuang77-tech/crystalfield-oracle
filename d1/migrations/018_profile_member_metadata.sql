-- Extends the existing profiles account model without creating a second auth system.
-- Safe to apply once through Wrangler migrations; CREATE statements are repeatable.
CREATE TABLE IF NOT EXISTS profile_member_metadata (
  user_id            TEXT PRIMARY KEY,
  google_sub         TEXT,
  email_verified     INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  display_name       TEXT,
  picture_url        TEXT,
  tarot_usage_count  INTEGER NOT NULL DEFAULT 0 CHECK (tarot_usage_count >= 0),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at      TEXT,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_member_metadata_google_sub
  ON profile_member_metadata(google_sub)
  WHERE google_sub IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profile_member_metadata_last_login
  ON profile_member_metadata(last_login_at DESC);
