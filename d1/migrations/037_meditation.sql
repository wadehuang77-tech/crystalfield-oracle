CREATE TABLE IF NOT EXISTS meditation_audio_tracks (
  id TEXT PRIMARY KEY,
  title_zh TEXT NOT NULL,
  description_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_en TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_free INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL,
  r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS meditation_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  order_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_code)
);
CREATE TABLE IF NOT EXISTS meditation_playback_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  track_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO meditation_audio_tracks (id,title_zh,description_zh,title_en,description_en,duration_seconds,is_free,sort_order) VALUES
('01','安定呼吸','用幾分鐘整理呼吸與注意力。','Grounding Breath','A short practice for breath and attention.',300,1,1),
('02','身體掃描','從頭到腳溫柔覺察身體。','Body Scan','Gently notice sensations from head to toe.',600,1,2),
('03','睡前放鬆','在睡前放下今天的忙碌。','Sleep Wind-Down','Release the day before sleep.',720,1,3),
('04','情緒容納','為情緒留出安全的空間。','Making Space for Emotion','Create room to meet emotions safely.',900,0,4),
('05','自我慈悲','練習以溫柔態度對待自己。','Self-Compassion','Practice a kinder inner voice.',900,0,5),
('06','專注工作','在任務開始前建立穩定專注。','Focused Work','Settle into steady focus before work.',600,0,6),
('07','界線練習','覺察需要與界線。','Healthy Boundaries','Notice needs and boundaries.',720,0,7),
('08','釋放壓力','讓身心從緊繃轉向休息。','Release Stress','Move from tension toward rest.',900,0,8),
('09','內在安全感','找回可依靠的內在空間。','Inner Safety','Reconnect with an inner sense of safety.',900,0,9),
('10','關係覺察','以清楚與慈悲聆聽關係。','Relational Awareness','Listen to relationships with clarity and care.',900,0,10),
('11','創意流動','讓想法在不評判中展開。','Creative Flow','Let ideas unfold without judgment.',720,0,11),
('12','夜間修復','為夜晚建立修復節奏。','Night Restoration','Create a restorative evening rhythm.',900,0,12),
('13','完整靜心','一段完整的整合練習。','Complete Stillness','A longer practice for integration.',1200,0,13);
