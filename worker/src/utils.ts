import { verifyJwt } from './auth';

export interface Env {
  DB: D1Database;
  DB_CARDS: D1Database;
  JWT_SECRET: string;
  ENV?: string;
  ALLOWED_ORIGINS?: string;
  ECPAY_MERCHANT_ID?: string;
  ECPAY_HASH_KEY?: string;
  ECPAY_HASH_IV?: string;
  ECPAY_ENV?: string;

  RESEND_API_KEY?: string;
  MAIL_FROM_ADDRESS?: string;
  MAIL_FROM_NAME?: string;
  MAIL_REPLY_TO?: string;
}

export interface SessionUser {
  id: string;
  email: string;
}

function parseAllowed(env: Env): string[] {
  const raw = (env.ALLOWED_ORIGINS ?? '').trim();
  if (!raw) return [];
  if (raw === '*') {
    return env.ENV === 'dev' ? ['*'] : [];
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function corsHeaders(req: Request, env: Env): Record<string, string> {
  const allowed = parseAllowed(env);
  const origin = req.headers.get('Origin') ?? '';

  if (allowed.includes('*')) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': origin ? 'true' : 'false',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    };
  }

  const allow = allowed.includes(origin) ? origin : '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export function json(
  req: Request,
  env: Env,
  data: unknown,
  init: ResponseInit = {},
): Response {
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(req, env),
    ...(init.headers || {}),
  };
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function badRequest(req: Request, env: Env, message: string) {
  return json(req, env, { error: message }, { status: 400 });
}

export function unauthorized(req: Request, env: Env, message = 'Unauthorized') {
  return json(req, env, { error: message }, { status: 401 });
}

export function forbidden(req: Request, env: Env, message = 'Forbidden') {
  return json(req, env, { error: message }, { status: 403 });
}

export function serverError(req: Request, env: Env, err: unknown) {
  return json(req, env, { error: 'Internal server error' }, { status: 500 });
}

const COOKIE_NAME = 'bolt_session';

export function buildSessionCookie(token: string, maxAgeSec: number): string {
  return [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'HttpOnly',
    'Secure',
    'SameSite=None',
  ].join('; ');
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`;
}

function parseCookie(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const [k, ...rest] = pair.trim().split('=');
    if (k) out[k] = rest.join('=');
  }
  return out;
}

export async function readSession(req: Request, env: Env): Promise<SessionUser | null> {
  const cookies = parseCookie(req.headers.get('Cookie'));
  let token: string | null = cookies[COOKIE_NAME] || null;
  if (!token) {
    const auth = req.headers.get('Authorization');
    if (auth?.startsWith('Bearer ')) token = auth.slice(7);
  }
  if (!token) return null;

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) return null;

  const tokenGen = payload.gen ?? 0;
  try {
    const row = await env.DB.prepare(
      'SELECT token_generation FROM profiles WHERE id = ?'
    ).bind(payload.sub).first<{ token_generation: number | null }>();
    if (!row) return null;
    const currentGen = row.token_generation ?? 0;
    if (tokenGen !== currentGen) return null;
  } catch {
  }

  return { id: payload.sub, email: payload.email };
}

export async function requireAdmin(
  req: Request,
  env: Env,
  user: SessionUser,
): Promise<boolean> {
  const row = await env.DB.prepare('SELECT id FROM admins WHERE id = ?')
    .bind(user.id)
    .first();
  return !!row;
}

export function isAllowedOrigin(req: Request, env: Env): boolean {
  const allowed = parseAllowed(env);
  if (allowed.includes('*')) return true;
  if (allowed.length === 0) return false;
  const origin = req.headers.get('Origin');
  if (origin && allowed.includes(origin)) return true;
  const referer = req.headers.get('Referer');
  if (referer) {
    try {
      const o = new URL(referer).origin;
      if (allowed.includes(o)) return true;
    } catch {
    }
  }
  return false;
}

export function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export class PayloadTooLargeError extends Error {
  constructor() { super('payload too large'); this.name = 'PayloadTooLargeError'; }
}

export async function readBody<T = unknown>(
  req: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<T> {
  const lenHeader = req.headers.get('Content-Length');
  if (lenHeader && Number(lenHeader) > maxBytes) {
    throw new PayloadTooLargeError();
  }
  const text = await req.text();
  if (text.length > maxBytes) {
    throw new PayloadTooLargeError();
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function payloadTooLarge(req: Request, env: Env): Response {
  return json(req, env, { error: 'Payload too large' }, { status: 413 });
}

export function clientIp(req: Request): string {
  return req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
}

export async function rateLimit(
  env: Env,
  scope: string,
  key: string,
  max: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const cutoff = new Date(Date.now() - windowSec * 1000).toISOString();
  try {
    const r = await env.DB.prepare(
      'SELECT COUNT(*) AS c FROM rate_limit_events WHERE scope = ? AND rl_key = ? AND created_at > ?'
    ).bind(scope, key, cutoff).first<{ c: number }>();
    const used = r?.c ?? 0;
    if (used >= max) return { allowed: false, remaining: 0 };

    await env.DB.prepare(
      'INSERT INTO rate_limit_events (id, scope, rl_key) VALUES (?, ?, ?)'
    ).bind(crypto.randomUUID(), scope, key).run();

    if (Math.random() < 0.01) {
      const stale = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      env.DB.prepare('DELETE FROM rate_limit_events WHERE created_at < ?')
        .bind(stale).run().catch(() => {});
    }

    return { allowed: true, remaining: max - used - 1 };
  } catch {
    return { allowed: true, remaining: max };
  }
}

export function tooManyRequests(req: Request, env: Env, message = '請求過於頻繁,請稍後再試') {
  return json(req, env, { error: message }, { status: 429 });
}
