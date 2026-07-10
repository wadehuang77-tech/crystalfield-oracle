CREATE TABLE IF NOT EXISTS hd_report_section_defs (
  id          TEXT PRIMARY KEY,
  sort_order  INTEGER NOT NULL UNIQUE,
  icon        TEXT NOT NULL,
  title       TEXT NOT NULL,
  focus       TEXT NOT NULL,
  is_paid     INTEGER NOT NULL DEFAULT 1,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO hd_report_section_defs (id, sort_order, icon, title, focus, is_paid, active)
VALUES
  ('centers', 1, '◉', '九大中心完整解析', '逐一分析頭頂、邏輯、喉嚨、G中心、心臟、薦骨、情緒、脾臟、根部中心的定義狀態、制約入口與能量校準方式。', 1, 1),
  ('gates', 2, '✦', '64 閘門分析', '解析個案關鍵閘門的天賦語彙、陰影模式、成熟表達與日常練習。', 1, 1),
  ('channels', 3, '◈', '通道分析', '說明主要通道如何形成穩定能量迴路，並連結到行動風格、關係互動與工作節奏。', 1, 1),
  ('personality', 4, '◇', 'AI 深度人格分析', '整合類型、策略、權威、人生角色與本命十字，產出可閱讀的人格藍圖。', 1, 1),
  ('prescription', 5, '★', 'AI 能量處方', '提供具體的能量管理、決策練習、環境調整與七日校準建議。', 1, 1),
  ('career', 6, '◎', 'AI 職涯方向建議', '從天賦輸出方式、適合角色、合作條件與職涯風險點給出專業建議。', 1, 1),
  ('love', 7, '◈', 'AI 愛情關係分析', '分析親密關係中的需求、界線、投射、溝通節奏與相處提醒。', 1, 1),
  ('wealth', 8, '◇', 'AI 財富能量模式', '解析金錢決策、價值交換、接案/創業/收入模式與豐盛阻塞。', 1, 1),
  ('mission', 9, '✦', 'AI 靈魂使命', '以本命十字、人生角色與主要通道總結靈魂任務、成熟方向與年度提醒。', 1, 1)
ON CONFLICT(id) DO UPDATE SET
  sort_order = excluded.sort_order,
  icon       = excluded.icon,
  title      = excluded.title,
  focus      = excluded.focus,
  is_paid    = excluded.is_paid,
  active     = excluded.active,
  updated_at = datetime('now');

CREATE TABLE IF NOT EXISTS hd_full_reports (
  id          TEXT PRIMARY KEY,
  chart_id    TEXT NOT NULL,
  session_id  TEXT NOT NULL DEFAULT '',
  user_id     TEXT,
  user_email  TEXT DEFAULT '',
  birth_date  TEXT NOT NULL DEFAULT '',
  birth_time  TEXT NOT NULL DEFAULT '',
  birth_city  TEXT NOT NULL DEFAULT '',
  hd_type     TEXT NOT NULL DEFAULT '',
  hd_profile  TEXT NOT NULL DEFAULT '',
  report_version TEXT NOT NULL DEFAULT 'professional-v1',
  chart_data  TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(chart_id, report_version)
);

CREATE INDEX IF NOT EXISTS idx_hd_full_reports_chart
  ON hd_full_reports(chart_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hd_full_reports_user
  ON hd_full_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hd_full_reports_email
  ON hd_full_reports(user_email, created_at DESC);

CREATE TABLE IF NOT EXISTS hd_full_report_sections (
  id          TEXT PRIMARY KEY,
  report_id   TEXT NOT NULL,
  section_id  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL,
  icon        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(report_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_hd_full_report_sections_report
  ON hd_full_report_sections(report_id, sort_order);
