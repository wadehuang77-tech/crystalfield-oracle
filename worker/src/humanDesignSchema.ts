import type { Env } from './utils';

let schemaReady: Promise<void> | null = null;

export function ensureHumanDesignSchema(env: Env): Promise<void> {
  schemaReady ??= ensureSchema(env).catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

async function ensureSchema(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hd_charts (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL,
      user_id       TEXT,
      user_name     TEXT DEFAULT '',
      user_email    TEXT DEFAULT '',
      birth_date    TEXT NOT NULL,
      birth_time    TEXT DEFAULT '',
      birth_city    TEXT DEFAULT '',
      hd_type       TEXT NOT NULL DEFAULT '',
      hd_profile    TEXT NOT NULL DEFAULT '',
      hd_authority  TEXT NOT NULL DEFAULT '',
      chart_data    TEXT NOT NULL DEFAULT '{}',
      chat_answers  TEXT NOT NULL DEFAULT '[]',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hd_charts_session ON hd_charts(session_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hd_charts_user ON hd_charts(user_id, created_at DESC)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hd_charts_email ON hd_charts(user_email)`).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hd_report_section_defs (
      id               TEXT PRIMARY KEY,
      sort_order       INTEGER NOT NULL UNIQUE,
      icon             TEXT NOT NULL,
      title            TEXT NOT NULL,
      focus            TEXT NOT NULL,
      generation_mode  TEXT NOT NULL DEFAULT 'fixed',
      is_paid          INTEGER NOT NULL DEFAULT 1,
      active           INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();

  try {
    await env.DB.prepare(`ALTER TABLE hd_report_section_defs ADD COLUMN generation_mode TEXT NOT NULL DEFAULT 'fixed'`).run();
  } catch {
  }

  await env.DB.prepare(
    `INSERT INTO hd_report_section_defs (id, sort_order, icon, title, focus, generation_mode, is_paid, active)
     VALUES
       ('centers', 1, '◉', '九大中心完整解析', '逐一分析九大中心的定義狀態、制約入口與能量校準方式。', 'fixed', 1, 1),
       ('gates', 2, '✦', '64 閘門分析', '解析關鍵閘門的天賦語彙、陰影模式與成熟表達。', 'fixed', 1, 1),
       ('channels', 3, '◈', '通道分析', '說明主要通道如何形成穩定能量迴路。', 'fixed', 1, 1),
       ('personality', 4, '◇', '深度人格分析', '整合類型、策略、權威、人生角色與本命十字。', 'openai', 1, 1),
       ('prescription', 5, '★', '能量處方', '提供能量管理、決策練習與環境調整建議。', 'openai', 1, 1),
       ('career', 6, '◎', '職涯方向建議', '從天賦輸出、適合角色與合作條件給出建議。', 'openai', 1, 1),
       ('love', 7, '◈', '愛情關係分析', '分析親密關係中的需求、界線與溝通節奏。', 'openai', 1, 1),
       ('wealth', 8, '◇', '財富能量模式', '解析金錢決策、價值交換與豐盛阻塞。', 'openai', 1, 1),
       ('mission', 9, '✦', '靈魂使命', '總結靈魂任務、成熟方向與年度提醒。', 'openai', 1, 1)
     ON CONFLICT(id) DO UPDATE SET
       sort_order = excluded.sort_order,
       icon = excluded.icon,
       title = excluded.title,
       focus = excluded.focus,
       generation_mode = excluded.generation_mode,
       is_paid = excluded.is_paid,
       active = excluded.active,
       updated_at = datetime('now')`
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hd_full_reports (
      id              TEXT PRIMARY KEY,
      chart_id        TEXT NOT NULL,
      session_id      TEXT NOT NULL DEFAULT '',
      user_id         TEXT,
      user_email      TEXT DEFAULT '',
      birth_date      TEXT NOT NULL DEFAULT '',
      birth_time      TEXT NOT NULL DEFAULT '',
      birth_city      TEXT NOT NULL DEFAULT '',
      hd_type         TEXT NOT NULL DEFAULT '',
      hd_profile      TEXT NOT NULL DEFAULT '',
      report_version  TEXT NOT NULL DEFAULT 'professional-v1',
      chart_data      TEXT NOT NULL DEFAULT '{}',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(chart_id, report_version)
    )`
  ).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hd_full_reports_chart ON hd_full_reports(chart_id, created_at DESC)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hd_full_reports_user ON hd_full_reports(user_id, created_at DESC)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hd_full_reports_email ON hd_full_reports(user_email, created_at DESC)`).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hd_full_report_sections (
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
    )`
  ).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hd_full_report_sections_report ON hd_full_report_sections(report_id, sort_order)`).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hd_fixed_knowledge (
      id          TEXT PRIMARY KEY,
      category    TEXT NOT NULL,
      key         TEXT NOT NULL,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(category, key)
    )`
  ).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_hd_fixed_knowledge_category ON hd_fixed_knowledge(category, sort_order, key)`).run();
}
