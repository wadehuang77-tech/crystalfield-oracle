import {
  badRequest,
  Env,
  json,
  readBody,
  readSession,
  validEmail,
} from './utils';

interface SaveChartBody {
  user_name?: string;
  user_email?: string;
  birth_date?: string;
  birth_time?: string;
  birth_city?: string;
  hd_type?: string;
  hd_profile?: string;
  hd_authority?: string;
  chart_data?: unknown;
}

function cleanString(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export async function saveHumanDesignChart(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  const body = await readBody<SaveChartBody>(req, 96 * 1024);

  const birthDate = cleanString(body.birth_date, 20);
  if (!birthDate || !validDate(birthDate)) return badRequest(req, env, '出生日期格式錯誤');

  const email = user?.email ?? cleanString(body.user_email, 254).toLowerCase();
  if (email && !validEmail(email)) return badRequest(req, env, '電子郵件格式錯誤');

  const id = crypto.randomUUID();
  const sessionId = `hd_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO hd_charts
      (id, session_id, user_id, user_name, user_email, birth_date, birth_time, birth_city,
       hd_type, hd_profile, hd_authority, chart_data, chat_answers, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`
  ).bind(
    id,
    sessionId,
    user?.id ?? null,
    cleanString(body.user_name, 120),
    email,
    birthDate,
    cleanString(body.birth_time, 20),
    cleanString(body.birth_city, 160),
    cleanString(body.hd_type, 80),
    cleanString(body.hd_profile, 80),
    cleanString(body.hd_authority, 80),
    JSON.stringify(body.chart_data ?? {}),
    now,
    now,
  ).run();

  return json(req, env, { chart_id: id, session_id: sessionId });
}

export async function updateHumanDesignAnswers(req: Request, env: Env, chartId: string): Promise<Response> {
  const body = await readBody<{ chat_answers?: unknown }>(req, 16 * 1024);
  if (!Array.isArray(body.chat_answers)) return badRequest(req, env, 'answers 格式錯誤');
  const answers = body.chat_answers
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));
  if (answers.length > 50) return badRequest(req, env, 'answers 太多');

  const result = await env.DB.prepare(
    `UPDATE hd_charts
        SET chat_answers = ?, updated_at = ?
      WHERE id = ?`
  ).bind(JSON.stringify(answers), new Date().toISOString(), chartId).run();

  if ((result.meta?.changes ?? 0) === 0) {
    return json(req, env, { error: '找不到人類圖紀錄' }, { status: 404 });
  }

  return json(req, env, { ok: true });
}
