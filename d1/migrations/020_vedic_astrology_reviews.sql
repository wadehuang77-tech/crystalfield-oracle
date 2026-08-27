CREATE TABLE IF NOT EXISTS vedic_astrology_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  report_id TEXT NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  accuracy_rating TEXT NOT NULL,
  most_resonant_sections TEXT NOT NULL DEFAULT '[]',
  review_content TEXT NOT NULL,
  allow_public INTEGER NOT NULL DEFAULT 0,
  display_name TEXT NOT NULL DEFAULT '匿名使用者',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vedic_reviews_public
  ON vedic_astrology_reviews(allow_public, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vedic_reviews_user
  ON vedic_astrology_reviews(user_id, created_at DESC);
