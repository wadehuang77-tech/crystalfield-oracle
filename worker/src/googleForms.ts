import {
  badRequest,
  Env,
  forbidden,
  json,
  readBody,
  readSession,
  requireAdmin,
  unauthorized,
} from './utils';

export const AI_TAROT_BUTTON_KEY = 'resonance-ai-tarot-design';

const BUTTON_LABELS: Record<string, string> = {
  [AI_TAROT_BUTTON_KEY]: 'AI 塔羅設計學活動按鈕',
};

interface GoogleFormBody {
  name?: unknown;
  url?: unknown;
  is_active?: unknown;
}

interface ButtonLinkBody {
  google_form_id?: unknown;
}

interface DeleteGoogleFormBody {
  confirm?: unknown;
}

interface GoogleFormRow {
  id: string;
  name: string;
  url: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ButtonSettingRow {
  button_key: string;
  google_form_id: string | null;
  updated_at: string;
  form_id: string | null;
  form_name: string | null;
  form_url: string | null;
  form_is_active: number | null;
  form_deleted_at: string | null;
}

async function guardAdmin(req: Request, env: Env): Promise<Response | null> {
  const user = await readSession(req, env);
  if (!user) return await unauthorized(req, env);
  if (!(await requireAdmin(req, env, user))) return await forbidden(req, env);
  return null;
}

function validateName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length > 0 && name.length <= 120 ? name : null;
}

export function validateGoogleFormUrl(value: unknown):
  | { ok: true; url: string }
  | { ok: false; message: string } {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, message: '請輸入 Google 表單網址' };
  }

  const raw = value.trim();
  if (!raw.toLowerCase().startsWith('https://')) {
    return { ok: false, message: 'Google 表單網址必須以 https:// 開頭' };
  }

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    const isShortForm = hostname === 'forms.gle' && parsed.pathname.length > 1;
    const isGoogleForm = hostname === 'docs.google.com'
      && (parsed.pathname === '/forms' || parsed.pathname.startsWith('/forms/'));

    if (!isShortForm && !isGoogleForm) {
      return { ok: false, message: '僅允許 forms.gle 或 docs.google.com/forms 的網址' };
    }
    if (parsed.username || parsed.password || parsed.port) {
      return { ok: false, message: 'Google 表單網址格式錯誤' };
    }

    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false, message: 'Google 表單網址格式錯誤' };
  }
}

function serializeForm(row: GoogleFormRow) {
  return {
    ...row,
    is_active: row.is_active === 1,
  };
}

function settingWarning(row: ButtonSettingRow | null): string | null {
  if (!row?.google_form_id) return '尚未選擇 Google 表單';
  if (!row.form_id || row.form_deleted_at) return '目前選擇的表單已被刪除，前台按鈕已停用';
  if (row.form_is_active !== 1) return '目前選擇的表單已停用，前台按鈕已停用';
  return null;
}

async function getButtonSettingRow(env: Env, buttonKey: string): Promise<ButtonSettingRow | null> {
  return await env.DB.prepare(
    `SELECT
       s.button_key,
       s.google_form_id,
       s.updated_at,
       f.id AS form_id,
       f.name AS form_name,
       f.url AS form_url,
       f.is_active AS form_is_active,
       f.deleted_at AS form_deleted_at
     FROM button_link_settings s
     LEFT JOIN google_forms f ON f.id = s.google_form_id
     WHERE s.button_key = ?`,
  ).bind(buttonKey).first<ButtonSettingRow>();
}

export async function adminListGoogleForms(req: Request, env: Env): Promise<Response> {
  const denied = await guardAdmin(req, env);
  if (denied) return denied;

  const result = await env.DB.prepare(
    `SELECT id, name, url, is_active, created_at, updated_at, deleted_at
     FROM google_forms
     WHERE deleted_at IS NULL
     ORDER BY updated_at DESC, created_at DESC`,
  ).all<GoogleFormRow>();

  return await json(req, env, {
    forms: (result.results ?? []).map(serializeForm),
  });
}

export async function adminCreateGoogleForm(req: Request, env: Env): Promise<Response> {
  const denied = await guardAdmin(req, env);
  if (denied) return denied;

  const body = await readBody<GoogleFormBody>(req);
  const name = validateName(body.name);
  if (!name) return await badRequest(req, env, '表單名稱為必填，且不可超過 120 個字元');

  const validatedUrl = validateGoogleFormUrl(body.url);
  if (!validatedUrl.ok) return await badRequest(req, env, validatedUrl.message);
  if (typeof body.is_active !== 'boolean') {
    return await badRequest(req, env, '狀態必須為啟用或停用');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO google_forms (id, name, url, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(id, name, validatedUrl.url, body.is_active ? 1 : 0, now, now).run();

  const form = await env.DB.prepare(
    `SELECT id, name, url, is_active, created_at, updated_at, deleted_at
     FROM google_forms WHERE id = ?`,
  ).bind(id).first<GoogleFormRow>();

  return await json(req, env, { form: form ? serializeForm(form) : null }, { status: 201 });
}

export async function adminUpdateGoogleForm(
  req: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const denied = await guardAdmin(req, env);
  if (denied) return denied;
  if (!id) return await badRequest(req, env, '缺少表單 ID');

  const body = await readBody<GoogleFormBody>(req);
  const name = validateName(body.name);
  if (!name) return await badRequest(req, env, '表單名稱為必填，且不可超過 120 個字元');

  const validatedUrl = validateGoogleFormUrl(body.url);
  if (!validatedUrl.ok) return await badRequest(req, env, validatedUrl.message);
  if (typeof body.is_active !== 'boolean') {
    return await badRequest(req, env, '狀態必須為啟用或停用');
  }

  const result = await env.DB.prepare(
    `UPDATE google_forms
     SET name = ?, url = ?, is_active = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
  ).bind(
    name,
    validatedUrl.url,
    body.is_active ? 1 : 0,
    new Date().toISOString(),
    id,
  ).run();

  if (result.meta.changes === 0) {
    return await json(req, env, { error: '找不到 Google 表單' }, { status: 404 });
  }

  const form = await env.DB.prepare(
    `SELECT id, name, url, is_active, created_at, updated_at, deleted_at
     FROM google_forms WHERE id = ?`,
  ).bind(id).first<GoogleFormRow>();

  return await json(req, env, { form: form ? serializeForm(form) : null });
}

export async function adminDeleteGoogleForm(
  req: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const denied = await guardAdmin(req, env);
  if (denied) return denied;
  if (!id) return await badRequest(req, env, '缺少表單 ID');

  const body = await readBody<DeleteGoogleFormBody>(req);
  const affected = await env.DB.prepare(
    `SELECT button_key FROM button_link_settings WHERE google_form_id = ?`,
  ).bind(id).all<{ button_key: string }>();
  const affectedButtons = (affected.results ?? []).map((row) => ({
    button_key: row.button_key,
    label: BUTTON_LABELS[row.button_key] ?? row.button_key,
  }));

  if (body.confirm !== true) {
    return await badRequest(
      req,
      env,
      affectedButtons.length > 0
        ? `此表單目前連結到 ${affectedButtons.map((item) => item.label).join('、')}，刪除後前台按鈕將停用。請再次確認`
        : '刪除 Google 表單前必須再次確認',
    );
  }

  const result = await env.DB.prepare(
    `UPDATE google_forms
     SET is_active = 0, deleted_at = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
  ).bind(new Date().toISOString(), new Date().toISOString(), id).run();

  if (result.meta.changes === 0) {
    return await json(req, env, { error: '找不到 Google 表單' }, { status: 404 });
  }

  return await json(req, env, { ok: true, affected_buttons: affectedButtons });
}

export async function adminListButtonLinkSettings(req: Request, env: Env): Promise<Response> {
  const denied = await guardAdmin(req, env);
  if (denied) return denied;

  const settings = await Promise.all(
    Object.keys(BUTTON_LABELS).map(async (buttonKey) => {
      const row = await getButtonSettingRow(env, buttonKey);
      return {
        button_key: buttonKey,
        label: BUTTON_LABELS[buttonKey],
        google_form_id: row?.google_form_id ?? null,
        selected_form: row?.form_id
          ? {
              id: row.form_id,
              name: row.form_name,
              url: row.form_url,
              is_active: row.form_is_active === 1,
              deleted_at: row.form_deleted_at,
            }
          : null,
        warning: settingWarning(row),
        updated_at: row?.updated_at ?? null,
      };
    }),
  );

  return await json(req, env, { settings });
}

export async function adminUpdateButtonLinkSetting(
  req: Request,
  env: Env,
  buttonKey: string,
): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return await unauthorized(req, env);
  if (!(await requireAdmin(req, env, user))) return await forbidden(req, env);
  if (!BUTTON_LABELS[buttonKey]) return await badRequest(req, env, '不支援的活動按鈕');

  const body = await readBody<ButtonLinkBody>(req);
  if (typeof body.google_form_id !== 'string' || !body.google_form_id.trim()) {
    return await badRequest(req, env, '請選擇一份啟用中的 Google 表單');
  }
  const formId = body.google_form_id.trim();
  const form = await env.DB.prepare(
    `SELECT id FROM google_forms
     WHERE id = ? AND is_active = 1 AND deleted_at IS NULL`,
  ).bind(formId).first<{ id: string }>();
  if (!form) return await badRequest(req, env, '選擇的 Google 表單不存在、已停用或已刪除');

  await env.DB.prepare(
    `INSERT INTO button_link_settings (button_key, google_form_id, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(button_key) DO UPDATE SET
       google_form_id = excluded.google_form_id,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`,
  ).bind(buttonKey, formId, user.id, new Date().toISOString()).run();

  return await json(req, env, {
    ok: true,
    setting: {
      button_key: buttonKey,
      google_form_id: formId,
    },
  });
}

export async function getPublicButtonLink(
  req: Request,
  env: Env,
  buttonKey: string,
): Promise<Response> {
  if (!BUTTON_LABELS[buttonKey]) {
    return await json(req, env, { error: '找不到活動按鈕' }, { status: 404 });
  }

  const row = await getButtonSettingRow(env, buttonKey);
  const available = !!row?.form_id && row.form_is_active === 1 && !row.form_deleted_at;

  return await json(req, env, {
    button_key: buttonKey,
    available,
    form: available
      ? {
          id: row.form_id,
          name: row.form_name,
          url: row.form_url,
        }
      : null,
    label: available ? row.form_name : '報名尚未開放',
  });
}
