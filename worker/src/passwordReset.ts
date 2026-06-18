import { hashPassword, signJwt, verifyJwt } from './auth';
import { sendEmail, passwordResetEmail } from './email';
import {
  badRequest,
  Env,
  json,
  readBody,
  serverError,
  validEmail,
} from './utils';

const RESET_CODE_TTL_SEC      = 15 * 60;
const RESET_TOKEN_TTL_SEC     = 10 * 60;
const REQUEST_RATE_WINDOW_SEC = 60 * 60;
const REQUEST_RATE_MAX        = 3;
const MAX_VERIFY_ATTEMPTS     = 5;

function generateSixDigitCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, '0');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(req: Request): string | null {
  return req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || null;
}

interface ResetTokenPayload {
  sub: string;
  email: string;
  type: 'password_reset';
  iat: number;
  exp: number;
}

async function signResetToken(email: string, secret: string): Promise<string> {
  return signJwt(
    { sub: email, email, type: 'password_reset' } as never,
    secret,
    RESET_TOKEN_TTL_SEC,
  );
}

async function verifyResetToken(token: string, secret: string): Promise<string | null> {
  const payload = await verifyJwt(token, secret);
  if (!payload) return null;
  if ((payload as unknown as ResetTokenPayload).type !== 'password_reset') return null;
  return payload.email;
}

interface RequestResetBody { email: string; }

export async function requestPasswordReset(req: Request, env: Env): Promise<Response> {
  const body = await readBody<RequestResetBody>(req);
  if (!body.email || !validEmail(body.email)) {
    return badRequest(req, env, '電子郵件格式錯誤');
  }
  const email = body.email.toLowerCase().trim();

  try {
    const profile = await env.DB.prepare(
      'SELECT id FROM profiles WHERE email = ?'
    ).bind(email).first();
    if (!profile) {
      return badRequest(req, env, '此 Email 尚未註冊,請先註冊帳號');
    }

    const since = new Date(Date.now() - REQUEST_RATE_WINDOW_SEC * 1000).toISOString();
    const recent = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM password_reset_codes WHERE email = ? AND created_at > ?'
    ).bind(email, since).first<{ n: number }>();
    if ((recent?.n ?? 0) >= REQUEST_RATE_MAX) {
      return badRequest(req, env, '驗證碼請求過於頻繁,請 1 小時後再試');
    }

    const code = generateSixDigitCode();
    const codeHash = await sha256Hex(code);
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_SEC * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO password_reset_codes (id, email, code_hash, expires_at, ip)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, email, codeHash, expiresAt, clientIp(req)).run();

    const tpl = passwordResetEmail(code);
    try {
      await sendEmail(env, {
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    } catch {
      await env.DB.prepare('DELETE FROM password_reset_codes WHERE id = ?')
        .bind(id).run().catch(() => {});
      return badRequest(req, env, '驗證碼寄送失敗,請稍後再試或聯繫客服');
    }

    return json(req, env, { ok: true });
  } catch (err) {
    return serverError(req, env, err);
  }
}

interface VerifyCodeBody { email: string; code: string; }

export async function verifyResetCode(req: Request, env: Env): Promise<Response> {
  const body = await readBody<VerifyCodeBody>(req);
  if (!body.email || !validEmail(body.email)) {
    return badRequest(req, env, '電子郵件格式錯誤');
  }
  if (!body.code || !/^\d{6}$/.test(body.code)) {
    return badRequest(req, env, '驗證碼格式錯誤(必須是 6 位數字)');
  }

  const email = body.email.toLowerCase().trim();
  const codeHash = await sha256Hex(body.code);
  const now = new Date().toISOString();

  const row = await env.DB.prepare(
    `SELECT id, code_hash, attempts FROM password_reset_codes
     WHERE email = ?
       AND used_at IS NULL
       AND expires_at > ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(email, now).first<{ id: string; code_hash: string; attempts: number }>();

  if (!row) {
    return badRequest(req, env, '驗證碼錯誤或已過期,請重新申請');
  }

  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    await env.DB.prepare(
      'UPDATE password_reset_codes SET used_at = ? WHERE id = ?'
    ).bind(now, row.id).run();
    return badRequest(req, env, '錯誤次數過多,請重新申請驗證碼');
  }

  if (row.code_hash !== codeHash) {
    await env.DB.prepare(
      'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = ?'
    ).bind(row.id).run();
    const remaining = MAX_VERIFY_ATTEMPTS - row.attempts - 1;
    return badRequest(req, env, `驗證碼錯誤(還可嘗試 ${Math.max(remaining, 0)} 次)`);
  }

  await env.DB.prepare(
    'UPDATE password_reset_codes SET used_at = ? WHERE id = ?'
  ).bind(now, row.id).run();

  const resetToken = await signResetToken(email, env.JWT_SECRET);
  return json(req, env, { reset_token: resetToken });
}

interface ResetPasswordBody { reset_token: string; password: string; }

export async function resetPassword(req: Request, env: Env): Promise<Response> {
  const body = await readBody<ResetPasswordBody>(req);
  if (!body.reset_token || typeof body.reset_token !== 'string') {
    return badRequest(req, env, 'reset_token 缺失');
  }
  if (!body.password || body.password.length < 8) {
    return badRequest(req, env, '密碼長度至少 8 個字元');
  }
  if (!/[A-Za-z]/.test(body.password) || !/\d/.test(body.password)) {
    return badRequest(req, env, '密碼需包含至少一個英文字母和一個數字');
  }

  const email = await verifyResetToken(body.reset_token, env.JWT_SECRET);
  if (!email) {
    return badRequest(req, env, 'reset_token 已失效,請重新申請驗證碼');
  }

  try {
    const profile = await env.DB.prepare(
      'SELECT id FROM profiles WHERE email = ?'
    ).bind(email).first<{ id: string }>();
    if (!profile) {
      return badRequest(req, env, '帳號不存在');
    }

    const newHash = await hashPassword(body.password);
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE profiles
          SET password_hash = ?,
              updated_at = ?,
              token_generation = COALESCE(token_generation, 0) + 1
        WHERE id = ?`
    ).bind(newHash, now, profile.id).run();

    await env.DB.prepare(
      `UPDATE password_reset_codes SET used_at = ?
       WHERE email = ? AND used_at IS NULL`
    ).bind(now, email).run();

    return json(req, env, { ok: true });
  } catch (err) {
    return serverError(req, env, err);
  }
}
