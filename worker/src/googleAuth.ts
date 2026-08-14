import { signJwt } from './auth';
import {
  badRequest,
  buildSessionCookie,
  Env,
  forbidden,
  isAllowedOrigin,
  json,
  readBody,
  unauthorized,
  validEmail,
} from './utils';

const SESSION_SEC = 60 * 60 * 24 * 7;
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_CSRF_COOKIE = 'google_oauth_csrf';

interface GoogleJwtHeader {
  alg?: string;
  kid?: string;
}

interface GoogleJwtPayload {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  aud?: string | string[];
  azp?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  hd?: string;
}

interface GoogleJwk extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

let cachedGoogleKeys: { expiresAt: number; keys: GoogleJwk[] } | null = null;

function decodeBase64Url(value: string): Uint8Array {
  let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  const decoded = atob(normalized);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function decodeJwtPart<T>(value: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
  } catch {
    return null;
  }
}

function parseCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get('Cookie');
  if (!cookie) return null;
  for (const item of cookie.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return parts.join('=');
  }
  return null;
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

function googleCsrfCookie(token: string, maxAge = 600): string {
  return `${GOOGLE_CSRF_COOKIE}=${token}; Path=/api/auth/google; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None`;
}

async function getGoogleKeys(): Promise<GoogleJwk[]> {
  if (cachedGoogleKeys && cachedGoogleKeys.expiresAt > Date.now()) return cachedGoogleKeys.keys;

  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) throw new Error('Unable to load Google public keys');
  const data = await response.json<{ keys?: GoogleJwk[] }>();
  if (!Array.isArray(data.keys) || data.keys.length === 0) throw new Error('Google public keys missing');

  const cacheControl = response.headers.get('Cache-Control') ?? '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] ?? 3600);
  cachedGoogleKeys = {
    keys: data.keys,
    expiresAt: Date.now() + Math.max(300, Math.min(maxAge, 86_400)) * 1000,
  };
  return data.keys;
}

async function verifyGoogleCredential(credential: string, clientId: string): Promise<GoogleJwtPayload | null> {
  const parts = credential.split('.');
  if (parts.length !== 3) return null;

  const header = decodeJwtPart<GoogleJwtHeader>(parts[0]);
  const payload = decodeJwtPart<GoogleJwtPayload>(parts[1]);
  if (!header || !payload || header.alg !== 'RS256' || !header.kid) return null;

  const keys = await getGoogleKeys();
  const jwk = keys.find((key) => key.kid === header.kid && (!key.alg || key.alg === 'RS256'));
  if (!jwk) {
    cachedGoogleKeys = null;
    return null;
  }

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const validSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!validSignature) return null;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(clientId)) return null;
  if (audiences.length > 1 && payload.azp !== clientId) return null;
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') return null;
  if (!payload.exp || payload.exp <= now - 30) return null;
  if (payload.iat && payload.iat > now + 300) return null;
  if (!payload.sub || !/^\d+$/.test(payload.sub)) return null;
  if (!payload.email || !validEmail(payload.email) || payload.email_verified !== true) return null;
  return payload;
}

export async function googleAuthConfig(req: Request, env: Env): Promise<Response> {
  if (!isAllowedOrigin(req, env)) return forbidden(req, env, 'Bad origin');
  const csrfToken = crypto.randomUUID();
  return json(req, env, {
    client_id: env.GOOGLE_CLIENT_ID?.trim() || null,
    csrf_token: csrfToken,
  }, {
    headers: { 'Set-Cookie': googleCsrfCookie(csrfToken) },
  });
}

export async function googleSignin(req: Request, env: Env): Promise<Response> {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return json(req, env, { error: 'Google 登入尚未完成設定' }, { status: 503 });

  const body = await readBody<{ credential?: string; csrf_token?: string }>(req, 32 * 1024);
  const cookieToken = parseCookie(req, GOOGLE_CSRF_COOKIE);
  if (!cookieToken || !body.csrf_token || !constantTimeEqual(cookieToken, body.csrf_token)) {
    return forbidden(req, env, 'Google 登入驗證已過期，請重新整理後再試');
  }
  if (!body.credential || body.credential.length > 16_000) {
    return badRequest(req, env, 'Google 登入資料格式錯誤');
  }

  const googleUser = await verifyGoogleCredential(body.credential, clientId);
  if (!googleUser?.email || !googleUser.sub) {
    return unauthorized(req, env, 'Google 帳戶驗證失敗');
  }

  const email = googleUser.email.toLowerCase().trim();
  const googleIsAuthoritative = email.endsWith('@gmail.com')
    || email.endsWith('@googlemail.com')
    || Boolean(googleUser.hd);
  if (!googleIsAuthoritative) {
    return badRequest(req, env, '請使用 Gmail 或 Google Workspace 帳戶登入');
  }

  let profile = await env.DB.prepare(
    'SELECT id, email, token_generation FROM profiles WHERE email = ?',
  ).bind(email).first<{ id: string; email: string; token_generation: number | null }>();

  if (!profile) {
    const now = new Date().toISOString();
    const googleProfileId = `google_${googleUser.sub}`;
    await env.DB.prepare(
      `INSERT OR IGNORE INTO profiles
        (id, email, password_hash, created_at, updated_at, purchased_spreads)
       VALUES (?, ?, NULL, ?, ?, '[]')`,
    ).bind(googleProfileId, email, now, now).run();
    profile = await env.DB.prepare(
      'SELECT id, email, token_generation FROM profiles WHERE email = ?',
    ).bind(email).first<{ id: string; email: string; token_generation: number | null }>();
  }

  if (!profile) throw new Error('Unable to create Google profile');

  const token = await signJwt(
    { sub: profile.id, email: profile.email, gen: profile.token_generation ?? 0 },
    env.JWT_SECRET,
    SESSION_SEC,
  );
  const response = json(req, env, { user: { id: profile.id, email: profile.email } }, {
    headers: { 'Set-Cookie': buildSessionCookie(token, SESSION_SEC) },
  });
  response.headers.append('Set-Cookie', googleCsrfCookie('', 0));
  return response;
}
