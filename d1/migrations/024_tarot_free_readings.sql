CREATE TABLE IF NOT EXISTS tarot_free_readings (
  user_id    TEXT NOT NULL,
  reading_id TEXT NOT NULL,
  spread_id  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, reading_id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tarot_free_readings_user_created
  ON tarot_free_readings(user_id, created_at);

WITH RECURSIVE reading_number(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM reading_number WHERE n < 3
)
INSERT OR IGNORE INTO tarot_free_readings (user_id, reading_id, spread_id, created_at)
SELECT metadata.user_id, 'legacy-free-' || reading_number.n, 'legacy', datetime('now')
  FROM profile_member_metadata AS metadata
 CROSS JOIN reading_number
 WHERE reading_number.n <= MIN(3, metadata.tarot_usage_count);
