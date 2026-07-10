import { hashPassword, needsRehash, signJwt, verifyPassword } from './auth';
import {
  getDeckPreview,
  freeUnlockSingle,
  freeUnlockSpread,
  getSpreadDef,
  listDecks,
  unlockSingleCard,
  unlockSpread,
} from './cards';
import { computeEcpayCheckMac, SPREAD_CATALOG } from './ecpay';
import { checkoutResult, createOrder, getOrder } from './checkout';
import {
  cancelMyMembership,
  getMembershipSummary,
  getMyMembership,
  handleMembershipRecurringCallback,
  markMembershipFirstPaymentPaid,
  refreshMyMembership,
} from './subscriptions';
import {
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
} from './passwordReset';
import {
  saveHumanDesignChart,
  updateHumanDesignAnswers,
} from './humanDesign';
import {
  getHumanDesignFullReport,
} from './humanDesignReport';
import {
  badRequest,
  buildClearCookie,
  buildSessionCookie,
  clientIp,
  corsHeaders,
  Env,
  forbidden,
  isAllowedOrigin,
  json,
  PayloadTooLargeError,
  payloadTooLarge,
  rateLimit,
  readBody,
  readSession,
  requireAdmin,
  SessionUser,
  serverError,
  tooManyRequests,
  unauthorized,
  validEmail,
} from './utils';

const SESSION_SEC = 60 * 60 * 24 * 7;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(req, env) });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    const isMutating = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
    const isEcpayBack = path === '/api/ecpay-webhook' || path === '/api/checkout/result';
    if (isMutating && !isEcpayBack && !isAllowedOrigin(req, env)) {
      return await forbidden(req, env, 'Bad origin');
    }

    try {
      if (path === '/api/auth/signup'  && req.method === 'POST') return await signup(req, env);
      if (path === '/api/auth/signin'  && req.method === 'POST') {
        const rl = await rateLimit(env, 'signin-ip', clientIp(req), 30, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env, '登入嘗試過於頻繁,請稍後再試');
        return await signin(req, env);
      }
      if (path === '/api/auth/signout' && req.method === 'POST') return await signout(req, env);
      if (path === '/api/auth/me'      && req.method === 'GET')  return await me(req, env);
      if (path === '/api/auth/request-password-reset' && req.method === 'POST') {
        const rl = await rateLimit(env, 'reset-req-ip', clientIp(req), 20, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await requestPasswordReset(req, env);
      }
      if (path === '/api/auth/verify-reset-code'      && req.method === 'POST') {
        const rl = await rateLimit(env, 'reset-verify-ip', clientIp(req), 20, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await verifyResetCode(req, env);
      }
      if (path === '/api/auth/reset-password'         && req.method === 'POST') {
        const rl = await rateLimit(env, 'reset-pwd-ip', clientIp(req), 10, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await resetPassword(req, env);
      }

      if (path === '/api/profile/me'               && req.method === 'GET')  return await getMyProfile(req, env);
      if (path === '/api/membership/me'            && req.method === 'GET')  return await getMyMembership(req, env);
      if (path === '/api/membership/refresh'       && req.method === 'POST') return await refreshMyMembership(req, env);
      if (path === '/api/membership/cancel'        && req.method === 'POST') return await cancelMyMembership(req, env);

      if (path === '/api/decks' && req.method === 'GET') return await listDecks(req, env);
      if (path.startsWith('/api/decks/') && path.endsWith('/preview') && req.method === 'GET') {
        const deckId = decodeURIComponent(path.slice('/api/decks/'.length, -('/preview'.length)));
        return await getDeckPreview(req, env, deckId);
      }
      if (path === '/api/cards/free-unlock-single' && req.method === 'POST') {
        const rl = await rateLimit(env, 'free-unlock', clientIp(req), 20, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await freeUnlockSingle(req, env);
      }
      if (path === '/api/cards/free-unlock-spread' && req.method === 'POST') {
        const rl = await rateLimit(env, 'free-unlock', clientIp(req), 20, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await freeUnlockSpread(req, env);
      }
      if (path === '/api/cards/single-unlock' && req.method === 'POST') {
        const rl = await rateLimit(env, 'cards-unlock', clientIp(req), 30, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await unlockSingleCard(req, env);
      }
      if (path === '/api/cards/spread-unlock' && req.method === 'POST') {
        const rl = await rateLimit(env, 'cards-unlock', clientIp(req), 30, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await unlockSpread(req, env);
      }

      if (path === '/api/save-email' && req.method === 'POST') {
        const rl = await rateLimit(env, 'save-email', clientIp(req), 10, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await saveEmail(req, env);
      }
      if (path === '/api/track'      && req.method === 'POST') {
        const rl = await rateLimit(env, 'track-ip', clientIp(req), 200, 300);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await trackEvent(req, env);
      }

      if (path === '/api/conversion-events' && req.method === 'POST') {
        const rl = await rateLimit(env, 'conv-event-ip', clientIp(req), 100, 300);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await saveConversionEvent(req, env);
      }

      if (path === '/api/human-design/charts' && req.method === 'POST') {
        const rl = await rateLimit(env, 'hd-chart-ip', clientIp(req), 20, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await saveHumanDesignChart(req, env);
      }
      if (path.startsWith('/api/human-design/charts/') && path.endsWith('/answers') && req.method === 'POST') {
        const id = decodeURIComponent(path.slice('/api/human-design/charts/'.length, -'/answers'.length));
        const rl = await rateLimit(env, 'hd-answers-ip', clientIp(req), 30, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await updateHumanDesignAnswers(req, env, id);
      }
      if (path.startsWith('/api/human-design/charts/') && path.endsWith('/full-report') && req.method === 'GET') {
        const id = decodeURIComponent(path.slice('/api/human-design/charts/'.length, -'/full-report'.length));
        const rl = await rateLimit(env, 'hd-full-report-ip', clientIp(req), 30, 3600);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await getHumanDesignFullReport(req, env, id);
      }

      if (path === '/api/admin/check'          && req.method === 'GET')  return await adminCheck(req, env);
      if (path === '/api/admin/users'          && req.method === 'GET')  return await adminListUsers(req, env);
      if (path === '/api/admin/guest-emails'   && req.method === 'GET')  return await adminListGuestEmails(req, env);
      if (path === '/api/admin/orders'         && req.method === 'GET')  return await adminListOrders(req, env, url);
      if (path === '/api/admin/orders/bulk-delete' && req.method === 'POST') {
        return await adminBulkDeleteOrders(req, env);
      }
      if (path.startsWith('/api/admin/orders/') && path.endsWith('/reading') && req.method === 'GET') {
        const id = decodeURIComponent(path.slice('/api/admin/orders/'.length, -'/reading'.length));
        return await adminOrderReading(req, env, id);
      }
      if (path.startsWith('/api/admin/orders/') && path.endsWith('/repair-access') && req.method === 'POST') {
        const id = decodeURIComponent(path.slice('/api/admin/orders/'.length, -'/repair-access'.length));
        return await adminRepairAccess(req, env, id);
      }
      if (path.startsWith('/api/admin/orders/') && req.method === 'DELETE') {
        return await adminDeleteOrder(req, env, decodeURIComponent(path.slice('/api/admin/orders/'.length)));
      }
      if (path === '/api/admin/admins'         && req.method === 'GET')  return await adminListAdmins(req, env);
      if (path === '/api/admin/admins'         && req.method === 'POST') return await adminAddAdmin(req, env);
      if (path.startsWith('/api/admin/admins/') && req.method === 'DELETE') {
        return await adminRemoveAdmin(req, env, decodeURIComponent(path.split('/').pop() || ''));
      }
      if (path === '/api/metrics/daily' && req.method === 'GET') return await adminMetricsDaily(req, env, url);

      if (path === '/api/checkout/create-order' && req.method === 'POST') return await createOrder(req, env);
      if (path === '/api/checkout/result' && req.method === 'POST') return await checkoutResult(req, env);
      if (path === '/api/checkout/catalog'      && req.method === 'GET')  {
        return await json(req, env, { catalog: SPREAD_CATALOG });
      }
      if (path.startsWith('/api/orders/') && req.method === 'GET') {
        const rl = await rateLimit(env, 'order-get-ip', clientIp(req), 100, 300);
        if (!rl.allowed) return await tooManyRequests(req, env);
        return await getOrder(req, env, decodeURIComponent(path.slice('/api/orders/'.length)));
      }

      if (path === '/api/ecpay-webhook' && req.method === 'POST') return await ecpayWebhook(req, env);

      // ── Bundle credits ────────────────────────────────────────────
      if (path === '/api/bundle-credits' && req.method === 'GET') return await getBundleCredits(req, env);
      if (path === '/api/bundle-credits/consume' && req.method === 'POST') return await consumeBundleCredit(req, env);

      return await json(req, env, { error: 'not found', path }, { status: 404 });
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return payloadTooLarge(req, env);
      }
      return await serverError(req, env, err);
    }
  },
} satisfies ExportedHandler<Env>;

interface SignupBody {
  email: string;
  password: string;
  age?: number;
  gender?: string;
  occupation?: string;
  healing_interest?: string;
}

async function signup(req: Request, env: Env): Promise<Response> {
  const ip = clientIp(req);
  const rl = await rateLimit(env, 'signup', ip, 5, 3600);
  if (!rl.allowed) return await tooManyRequests(req, env, '註冊嘗試過多,請 1 小時後再試');

  const body = await readBody<SignupBody>(req);
  if (!body.email || !validEmail(body.email)) return await badRequest(req, env, '電子郵件格式錯誤');
  if (!body.password || body.password.length < 8) {
    return await badRequest(req, env, '密碼長度至少 8 個字元');
  }
  if (!/[A-Za-z]/.test(body.password) || !/\d/.test(body.password)) {
    return await badRequest(req, env, '密碼需包含至少一個英文字母和一個數字');
  }

  const email = body.email.toLowerCase().trim();

  const existing = await env.DB.prepare('SELECT id FROM profiles WHERE email = ?')
    .bind(email).first();
  if (existing) return await badRequest(req, env, '此電子郵件已經註冊');

  const id = crypto.randomUUID();
  const hash = await hashPassword(body.password);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO profiles
      (id, email, password_hash, created_at, updated_at,
       age, gender, occupation, healing_interest, purchased_spreads)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`
  ).bind(
    id, email, hash, now, now,
    body.age ?? null,
    body.gender ?? null,
    body.occupation ?? null,
    body.healing_interest ?? null,
  ).run();

  const token = await signJwt({ sub: id, email, gen: 0 }, env.JWT_SECRET, SESSION_SEC);
  return await json(req, env, { user: { id, email } }, {
    headers: { 'Set-Cookie': buildSessionCookie(token, SESSION_SEC) },
  });
}

const AUTH_FAIL_WINDOW_SEC = 15 * 60;
const AUTH_FAIL_MAX        = 5;

async function recordAuthFail(env: Env, email: string, ip: string | null): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO auth_attempts (id, email, ip, created_at) VALUES (?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), email, ip, new Date().toISOString()).run();
  } catch {
  }
}

async function signin(req: Request, env: Env): Promise<Response> {
  const body = await readBody<{ email: string; password: string }>(req);
  if (!body.email || !body.password) return await badRequest(req, env, '請輸入電子郵件和密碼');
  const email = body.email.toLowerCase().trim();
  const ip = req.headers.get('CF-Connecting-IP');

  try {
    const cutoff = new Date(Date.now() - AUTH_FAIL_WINDOW_SEC * 1000).toISOString();
    const r = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM auth_attempts WHERE email = ? AND created_at > ?`
    ).bind(email, cutoff).first<{ c: number }>();
    if (r && r.c >= AUTH_FAIL_MAX) {
      return await json(req, env, { error: '登入嘗試次數過多,請稍後再試' }, { status: 429 });
    }
  } catch {}

  const row = await env.DB.prepare(
    'SELECT id, email, password_hash, token_generation FROM profiles WHERE email = ?'
  ).bind(email).first<{
    id: string; email: string;
    password_hash: string | null;
    token_generation: number | null;
  }>();

  if (!row || !row.password_hash) {
    await recordAuthFail(env, email, ip);
    return await unauthorized(req, env, '電子郵件或密碼錯誤');
  }

  const ok = await verifyPassword(body.password, row.password_hash);
  if (!ok) {
    await recordAuthFail(env, email, ip);
    return await unauthorized(req, env, '電子郵件或密碼錯誤');
  }

  try {
    await env.DB.prepare('DELETE FROM auth_attempts WHERE email = ?').bind(email).run();
  } catch {}

  if (needsRehash(row.password_hash)) {
    try {
      const fresh = await hashPassword(body.password);
      await env.DB.prepare('UPDATE profiles SET password_hash = ? WHERE id = ?')
        .bind(fresh, row.id).run();
    } catch {}
  }

  const token = await signJwt(
    { sub: row.id, email: row.email, gen: row.token_generation ?? 0 },
    env.JWT_SECRET,
    SESSION_SEC,
  );
  return await json(req, env, { user: { id: row.id, email: row.email } }, {
    headers: { 'Set-Cookie': buildSessionCookie(token, SESSION_SEC) },
  });
}

async function signout(req: Request, env: Env): Promise<Response> {
  return await json(req, env, { ok: true }, {
    headers: { 'Set-Cookie': buildClearCookie() },
  });
}

async function me(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return await json(req, env, { user: null });
  return await json(req, env, { user });
}

async function getMyProfile(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return await unauthorized(req, env);

  const row = await env.DB.prepare(
    `SELECT id, email, age, gender, occupation, healing_interest,
            purchased_spreads, created_at, updated_at
     FROM profiles WHERE id = ?`
  ).bind(user.id).first<{
    id: string; email: string; age: number | null; gender: string | null;
    occupation: string | null; healing_interest: string | null;
    purchased_spreads: string; created_at: string; updated_at: string;
  }>();
  if (!row) return await json(req, env, { profile: null }, { status: 404 });
  const membership = await getMembershipSummary(env, user.id);

  return await json(req, env, {
    profile: {
      ...row,
      purchased_spreads: parseJsonArray(row.purchased_spreads),
      membership,
    },
  });
}

async function saveEmail(req: Request, env: Env): Promise<Response> {
  const body = await readBody<{ email: string; source?: string }>(req);
  const email = (body.email ?? '').toLowerCase().trim();
  const source = (body.source ?? '').trim() || 'single_card';
  if (!validEmail(email)) {
    return await json(req, env, { success: false, message: 'Invalid email format' }, { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO emails (id, email, source, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           source = excluded.source,
           created_at = excluded.created_at`
      ).bind(crypto.randomUUID(), email, source, now),

      env.DB.prepare(
        `INSERT INTO leads (id, email, source, created_at, status)
         VALUES (?, ?, ?, ?, 'success')
         ON CONFLICT(email) DO UPDATE SET
           source = excluded.source,
           created_at = excluded.created_at,
           status = 'success'`
      ).bind(crypto.randomUUID(), email, source, now),
    ]);
    return await json(req, env, { success: true });
  } catch {
    return await json(req, env, { success: false, message: 'save failed' }, { status: 500 });
  }
}

const ALLOWED_KPI_EVENTS = new Set(['page_view', 'email_submit', 'pay_success']);

async function trackEvent(req: Request, env: Env): Promise<Response> {
  const body = await readBody<{
    event_type?: string;
    meta?: Record<string, unknown>;
  }>(req);
  if (!body.event_type || !ALLOWED_KPI_EVENTS.has(body.event_type)) {
    return await badRequest(req, env, 'Invalid event_type');
  }

  const sessionUser = await readSession(req, env);

  await env.DB.prepare(
    `INSERT INTO events (id, user_id, event_type, created_at, meta)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    sessionUser?.id ?? null,
    body.event_type,
    new Date().toISOString(),
    JSON.stringify(body.meta ?? {}),
  ).run();

  return await json(req, env, { ok: true });
}

async function saveConversionEvent(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  const body = await readBody<{
    email?: string | null;
    event_type: string;
    event_data?: unknown;
  }>(req);
  if (!body.event_type || typeof body.event_type !== 'string') return await badRequest(req, env, 'event_type required');
  if (body.event_type.length > 100) return await badRequest(req, env, 'event_type too long');

  let recordedEmail: string | null = null;
  if (user) {
    recordedEmail = user.email;
  } else if (typeof body.email === 'string' && validEmail(body.email)) {
    recordedEmail = body.email.toLowerCase().trim();
  }

  const dataStr = JSON.stringify(body.event_data ?? {});
  if (dataStr.length > 8 * 1024) return await badRequest(req, env, 'event_data too large');

  await env.DB.prepare(
    `INSERT INTO conversion_events (id, email, user_id, event_type, event_data, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    recordedEmail,
    user?.id ?? null,
    body.event_type,
    dataStr,
    new Date().toISOString(),
  ).run();
  return await json(req, env, { ok: true });
}

async function adminCheck(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return await json(req, env, { isAdmin: false });
  return await json(req, env, { isAdmin: await requireAdmin(req, env, user) });
}

async function guardAdmin(req: Request, env: Env): Promise<SessionUser | Response> {
  const user = await readSession(req, env);
  if (!user) return await unauthorized(req, env);
  if (!(await requireAdmin(req, env, user))) return await forbidden(req, env);
  return user;
}

async function adminListUsers(req: Request, env: Env): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;
  const result = await env.DB.prepare(
    `SELECT id, email, age, gender, occupation, healing_interest,
            purchased_spreads, created_at, updated_at
     FROM profiles ORDER BY created_at DESC LIMIT 1000`
  ).all<Record<string, unknown>>();
  const users = (result.results || []).map((u) => ({
    ...u,
    purchased_spreads: parseJsonArray(u.purchased_spreads as string),
  }));
  return await json(req, env, { users });
}

async function adminListGuestEmails(req: Request, env: Env): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;
  const result = await env.DB.prepare(
    `SELECT id, email, source, created_at, status
     FROM leads ORDER BY created_at DESC LIMIT 1000`
  ).all();
  return await json(req, env, { guests: result.results || [] });
}

async function adminListOrders(req: Request, env: Env, url: URL): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;

  const status = url.searchParams.get('status');
  const rawLimit = Number(url.searchParams.get('limit') ?? '500');
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.floor(rawLimit), 1000)) : 500;

  let sql = `SELECT id, merchant_trade_no, user_id, email, item_type, item_id, item_name,
                    amount, status, ecpay_trade_no, ecpay_payment_type,
                    created_at, paid_at
             FROM orders`;
  const binds: unknown[] = [];
  if (status) {
    sql += ' WHERE status = ?';
    binds.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  binds.push(limit);

  const result = await env.DB.prepare(sql).bind(...binds).all();
  const rows = result.results || [];

  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*)        AS paid_count,
       COALESCE(SUM(amount), 0) AS revenue
     FROM orders WHERE status = 'paid'`
  ).first<{ paid_count: number; revenue: number }>();

  return await json(req, env, {
    orders: rows,
    summary: {
      paid_count: totals?.paid_count ?? 0,
      revenue: totals?.revenue ?? 0,
    },
  });
}

const SPREAD_POSITION_LABELS: Record<string, string[]> = {
  celtic_cross:      ['中央牌', '交叉牌', '下方牌', '左側牌', '右側牌', '上方牌', '第七牌', '第八牌', '第九牌', '第十牌'],
  cosmic_cross:      ['目前現狀', '靈魂的召喚', '正在升起的能量', '正在消逝的事物', '靈魂天賦', '正在顯化的事物', '下一步', '前世的影響', '你需要知道的事', '希望與恐懼', '潛在結果'],
  unicorns_three:    ['過去', '現在', '未來'],
  dragons_three:     ['過去', '現在', '未來'],
  osho_three:        ['內在感受', '外在表現', '整合建議'],
  tarot_three:       ['過去', '現在', '未來'],
  tarot_celtic:      ['現況', '挑戰', '根源', '過去', '目標', '未來', '自己', '環境', '希望/恐懼', '結果'],
  tarot_pastlife:    ['前世身份能量', '前世關鍵事件', '帶來的影響', '今生呈現的問題', '重複的模式', '靈魂要釋放的', '解鎖與療癒方式'],
  egyptian_pastlife: ['前世身份能量', '前世關鍵事件', '帶來的影響', '今生呈現的問題', '重複的模式', '靈魂要釋放的', '解鎖與療癒方式'],
};

interface EnrichedPick {
  position: number;
  position_label: string;
  card_key: string;
  card_name: string;
  card_name_secondary: string | null;
  reversed?: boolean;
  gated: Record<string, unknown> | null;
}

async function adminOrderReading(req: Request, env: Env, id: string): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;
  if (!id) return await badRequest(req, env, 'order id required');

  const order = await env.DB.prepare(
    `SELECT id, merchant_trade_no, user_id, email, item_id, item_name, status, paid_at, created_at
       FROM orders WHERE id = ?`,
  ).bind(id).first<{
    id: string;
    merchant_trade_no: string;
    user_id: string | null;
    email: string;
    item_id: string;
    item_name: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>();
  if (!order) return await json(req, env, { error: '訂單不存在' }, { status: 404 });

  const accessGranted = order.status === 'paid' && !!order.user_id;

  const advanced = await env.DB.prepare(
    `SELECT id, reading_type, card_data, unlocked_at
       FROM advanced_reading_unlocks
      WHERE email = ? AND reading_type = ?
      ORDER BY unlocked_at DESC
      LIMIT 50`,
  ).bind(order.email.toLowerCase().trim(), order.item_id).all<{
    id: string;
    reading_type: string;
    card_data: string | null;
    unlocked_at: string;
  }>();

  const single = await env.DB.prepare(
    `SELECT id, reading_type, card_data, unlocked_at
       FROM reading_unlocks
      WHERE email = ? AND reading_type = ?
      ORDER BY unlocked_at DESC
      LIMIT 50`,
  ).bind(order.email.toLowerCase().trim(), order.item_id).all<{
    id: string;
    reading_type: string;
    card_data: string | null;
    unlocked_at: string;
  }>();

  const spreadDef = getSpreadDef(order.item_id);
  const cardByKey = new Map<string, { name: string; name_secondary: string | null; gated: Record<string, unknown> | null }>();
  if (spreadDef) {
    const cards = await env.DB_CARDS.prepare(
      `SELECT card_key, name, name_secondary, gated_payload FROM cards WHERE deck_id = ?`,
    ).bind(spreadDef.deck_id).all<{ card_key: string; name: string; name_secondary: string | null; gated_payload: string | null }>();
    for (const c of cards.results ?? []) {
      let gated: Record<string, unknown> | null = null;
      if (c.gated_payload) {
        try {
          const parsed = JSON.parse(c.gated_payload);
          if (parsed && typeof parsed === 'object') gated = parsed;
        } catch {}
      }
      cardByKey.set(c.card_key, { name: c.name, name_secondary: c.name_secondary, gated });
    }
  }

  const positionLabels = SPREAD_POSITION_LABELS[order.item_id] ?? [];

  const enrichRow = (row: { id: string; reading_type: string; card_data: string | null; unlocked_at: string }) => {
    const parsed = row.card_data ? safeParse(row.card_data) : null;
    let picks: EnrichedPick[] = [];
    if (Array.isArray(parsed)) {
      picks = parsed.map((p) => buildEnrichedPick(p, positionLabels, cardByKey));
    } else if (parsed && typeof parsed === 'object') {
      picks = [buildEnrichedPick(parsed as Record<string, unknown>, positionLabels, cardByKey)];
    }
    return {
      id: row.id,
      reading_type: row.reading_type,
      unlocked_at: row.unlocked_at,
      picks,
      raw_card_data: parsed,
    };
  };

  return await json(req, env, {
    order,
    accessGranted,
    readings: {
      advanced: (advanced.results ?? []).map(enrichRow),
      single:   (single.results   ?? []).map(enrichRow),
    },
  });
}

function buildEnrichedPick(
  raw: Record<string, unknown> | unknown,
  positionLabels: string[],
  cardByKey: Map<string, { name: string; name_secondary: string | null; gated: Record<string, unknown> | null }>,
): EnrichedPick {
  const r = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  const card_key = typeof r.card_key === 'string' ? r.card_key : '';
  const positionRaw = typeof r.position === 'number' ? r.position : 0;
  const reversed = typeof r.reversed === 'boolean' ? r.reversed : undefined;
  const card = cardByKey.get(card_key);
  return {
    position: positionRaw,
    position_label: positionLabels[positionRaw - 1] ?? '',
    card_key,
    card_name: card?.name ?? '(找不到牌名)',
    card_name_secondary: card?.name_secondary ?? null,
    ...(reversed !== undefined ? { reversed } : {}),
    gated: card?.gated ?? null,
  };
}

async function adminRepairAccess(req: Request, env: Env, id: string): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;
  if (!id) return await badRequest(req, env, 'order id required');

  const order = await env.DB.prepare(
    `SELECT user_id, item_id, item_type, status FROM orders WHERE id = ?`,
  ).bind(id).first<{ user_id: string | null; item_id: string; item_type: string; status: string }>();
  if (!order) return await json(req, env, { error: '訂單不存在' }, { status: 404 });
  if (order.status !== 'paid') return await badRequest(req, env, '只能修復已付款訂單');
  if (!order.user_id) return await badRequest(req, env, '此訂單無對應用戶,無法修復');
  if (order.item_type !== 'spread') return await badRequest(req, env, '此訂單類型不支援修復');

  const profile = await env.DB.prepare('SELECT purchased_spreads FROM profiles WHERE id = ?')
    .bind(order.user_id).first<{ purchased_spreads: string }>();
  if (!profile) return await json(req, env, { error: '找不到對應 profile' }, { status: 404 });

  let alreadyGranted = false;
  try {
    const arr = JSON.parse(profile.purchased_spreads || '[]') as string[];
    alreadyGranted = arr.includes(order.item_id);
  } catch {}

  if (alreadyGranted) {
    return await json(req, env, { ok: true, alreadyGranted: true });
  }

  const result = await env.DB.prepare(
    `UPDATE profiles
        SET purchased_spreads = (
              SELECT json_group_array(value) FROM (
                SELECT value FROM json_each(COALESCE(NULLIF(purchased_spreads, ''), '[]'))
                UNION
                SELECT ? AS value
              )
            ),
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(order.item_id, order.user_id).run();

  if (result.meta.changes === 0) {
    return await json(req, env, { error: '找不到對應 profile' }, { status: 404 });
  }
  return await json(req, env, { ok: true, alreadyGranted: false });
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch {
    return { _parseError: true, _raw: s };
  }
}

async function adminDeleteOrder(req: Request, env: Env, id: string): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;
  if (!id) return await badRequest(req, env, 'order id required');

  const exists = await env.DB.prepare('SELECT id FROM orders WHERE id = ?')
    .bind(id).first<{ id: string }>();
  if (!exists) return await json(req, env, { error: '訂單不存在' }, { status: 404 });

  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
  return await json(req, env, { ok: true });
}

async function adminBulkDeleteOrders(req: Request, env: Env): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;

  const body = await readBody<{ ids?: unknown }>(req);
  if (!Array.isArray(body.ids)) return await badRequest(req, env, 'ids array required');
  const ids = body.ids
    .filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 100);
  if (ids.length === 0) return await badRequest(req, env, 'ids 為空');
  if (ids.length > 500) return await badRequest(req, env, '單次最多刪除 500 筆');

  const stmts = ids.map((id) =>
    env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id),
  );
  let deleted = 0;
  let failed = 0;
  try {
    const results = await env.DB.batch(stmts);
    for (const r of results) {
      if (r.success && r.meta.changes > 0) deleted += 1;
      else failed += 1;
    }
  } catch (e) {
    return await serverError(req, env, e);
  }
  return await json(req, env, { ok: true, deleted, failed });
}

async function adminListAdmins(req: Request, env: Env): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;
  const result = await env.DB.prepare(
    `SELECT a.id, p.email, a.created_at
     FROM admins a
     LEFT JOIN profiles p ON p.id = a.id
     ORDER BY a.created_at DESC`
  ).all();
  return await json(req, env, { admins: result.results || [] });
}

async function adminAddAdmin(req: Request, env: Env): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;

  const body = await readBody<{ email: string }>(req);
  if (!body.email) return await badRequest(req, env, 'email required');
  const email = body.email.toLowerCase().trim();

  const profile = await env.DB.prepare(
    'SELECT id, email FROM profiles WHERE email = ?'
  ).bind(email).first<{ id: string; email: string }>();
  if (!profile) return await badRequest(req, env, '找不到此電子郵件的用戶');

  const exists = await env.DB.prepare('SELECT id FROM admins WHERE id = ?')
    .bind(profile.id).first();
  if (exists) return await badRequest(req, env, '此用戶已經是管理員');

  await env.DB.prepare(
    `INSERT INTO admins (id, email, created_at) VALUES (?, ?, ?)`
  ).bind(profile.id, profile.email, new Date().toISOString()).run();

  return await json(req, env, { ok: true, admin: profile });
}

async function adminRemoveAdmin(req: Request, env: Env, id: string): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;
  if (r.id === id) return await badRequest(req, env, '無法移除自己的管理員權限');

  await env.DB.prepare('DELETE FROM admins WHERE id = ?').bind(id).run();
  return await json(req, env, { ok: true });
}

interface DailyBucket {
  page_view: number;
  email_submit: number;
  pay_success: number;
  revenue: number;
  payments: PaymentDetail[];
}

interface PaymentDetail {
  paid_at: string;
  email: string;
  item_id: string;
  item_name: string;
  deck_name: string;
  spread_name: string;
  amount: number;
}

const KPI_SPREAD_LABELS: Record<string, { deck_name: string; spread_name: string }> = {
  tarot_three:        { deck_name: '偉特塔羅',     spread_name: '三張牌陣' },
  tarot_celtic:       { deck_name: '偉特塔羅',     spread_name: '凱爾特十字牌陣' },
  tarot_pastlife:     { deck_name: '偉特塔羅',     spread_name: '前世因果陣' },
  unicorns_three:     { deck_name: '獨角獸神諭卡', spread_name: '三張牌陣' },
  dragons_three:      { deck_name: '龍族神諭卡',   spread_name: '三張牌陣' },
  osho_three:         { deck_name: '奧修禪卡',     spread_name: '三張牌陣' },
  celtic_cross:       { deck_name: '光行者神諭',   spread_name: '十字交叉使命陣' },
  cosmic_cross:       { deck_name: '光之訊息',     spread_name: '宇宙十字牌陣' },
  egyptian_pastlife:  { deck_name: '埃及神諭',     spread_name: '前世因果陣' },
};

function emptyDailyBucket(): DailyBucket {
  return { page_view: 0, email_submit: 0, pay_success: 0, revenue: 0, payments: [] };
}

async function adminMetricsDaily(req: Request, env: Env, url: URL): Promise<Response> {
  const r = await guardAdmin(req, env);
  if (r instanceof Response) return r;

  const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? '7'), 1), 60);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const result = await env.DB.prepare(
    `SELECT
        substr(created_at, 1, 10) AS day,
        event_type,
        COUNT(*) AS cnt
       FROM events
      WHERE created_at >= ?
        AND event_type IN ('page_view', 'email_submit')
      GROUP BY day, event_type`
  ).bind(since).all<{ day: string; event_type: string; cnt: number }>();

  const byDay: Record<string, DailyBucket> = {};
  for (const row of result.results || []) {
    const k = row.day;
    if (!byDay[k]) byDay[k] = emptyDailyBucket();
    if (row.event_type === 'page_view') byDay[k].page_view = row.cnt;
    else if (row.event_type === 'email_submit') byDay[k].email_submit = row.cnt;
  }

  const paidOrders = await env.DB.prepare(
    `SELECT
        substr(COALESCE(paid_at, updated_at, created_at), 1, 10) AS day,
        COALESCE(paid_at, updated_at, created_at) AS paid_at,
        email,
        item_id,
        item_name,
        amount
       FROM orders
      WHERE status = 'paid'
        AND COALESCE(paid_at, updated_at, created_at) >= ?
      ORDER BY COALESCE(paid_at, updated_at, created_at) DESC`
  ).bind(since).all<{
    day: string;
    paid_at: string;
    email: string;
    item_id: string;
    item_name: string;
    amount: number;
  }>();

  for (const order of paidOrders.results || []) {
    const k = order.day;
    if (!byDay[k]) byDay[k] = emptyDailyBucket();
    const label = KPI_SPREAD_LABELS[order.item_id] ?? {
      deck_name: order.item_name,
      spread_name: order.item_name,
    };
    byDay[k].pay_success += 1;
    byDay[k].revenue += Number(order.amount) || 0;
    byDay[k].payments.push({
      paid_at: order.paid_at,
      email: order.email,
      item_id: order.item_id,
      item_name: order.item_name,
      deck_name: label.deck_name,
      spread_name: label.spread_name,
      amount: Number(order.amount) || 0,
    });
  }

  const daily = Object.entries(byDay)
    .map(([date, v]) => ({
      date,
      ...v,
      email_conversion_rate: v.page_view ? v.email_submit / v.page_view : 0,
      pay_conversion_rate: v.email_submit ? v.pay_success / v.email_submit : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayKey = new Date().toISOString().slice(0, 10);
  const today = byDay[todayKey] ?? emptyDailyBucket();

  const totals = daily.reduce(
    (acc, d) => ({
      page_view:     acc.page_view + d.page_view,
      email_submit:  acc.email_submit + d.email_submit,
      pay_success:   acc.pay_success + d.pay_success,
      revenue:       acc.revenue + d.revenue,
      payments:      acc.payments.concat(d.payments),
    }),
    { page_view: 0, email_submit: 0, pay_success: 0, revenue: 0, payments: [] as PaymentDetail[] },
  );

  return await json(req, env, {
    today: {
      ...today,
      email_conversion_rate: today.page_view ? today.email_submit / today.page_view : 0,
      pay_conversion_rate:   today.email_submit ? today.pay_success / today.email_submit : 0,
    },
    totals: {
      ...totals,
      email_conversion_rate: totals.page_view ? totals.email_submit / totals.page_view : 0,
      pay_conversion_rate:   totals.email_submit ? totals.pay_success / totals.email_submit : 0,
    },
    daily,
  });
}

function parseEcpayDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h - 8, +mi, +se);
  return new Date(utcMs);
}

async function ecpayWebhook(req: Request, env: Env): Promise<Response> {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return new Response('0|Unsupported content-type', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }

  const params: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [k, v] of form.entries()) params[k] = String(v);
  } catch {
    return new Response('0|Bad body', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }

  if (!env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV) {
    return new Response('0|Webhook not configured', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
  if (!params.CheckMacValue) {
    return new Response('0|Missing CheckMacValue', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }
  const expected = await computeEcpayCheckMac(params, env.ECPAY_HASH_KEY, env.ECPAY_HASH_IV);
  if (expected !== params.CheckMacValue) {
    return new Response('0|Invalid signature', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }

  const merchantTradeNo = params.MerchantTradeNo ?? '';
  if (!merchantTradeNo) return new Response('0|Missing MerchantTradeNo', { status: 400, headers: { 'Content-Type': 'text/plain' } });

  if (!/^[0-9]{14}[A-Z0-9]{6}$/.test(merchantTradeNo)) {
    try {
      await env.DB.prepare(
        `INSERT INTO events (id, user_id, event_type, created_at, meta)
         VALUES (?, NULL, 'ecpay_orphan_callback', ?, ?)`
      ).bind(
        crypto.randomUUID(),
        new Date().toISOString(),
        JSON.stringify({ reason: 'bogus_merchant_trade_no_format', merchant_trade_no: merchantTradeNo, raw: params }),
      ).run();
    } catch {}
    return new Response('1|OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  const order = await env.DB.prepare(
    `SELECT id, user_id, merchant_trade_no, item_id, item_type, amount, status
       FROM orders WHERE merchant_trade_no = ?`
  ).bind(merchantTradeNo).first<{
    id: string; user_id: string | null; merchant_trade_no: string; item_id: string;
    item_type: string; amount: number; status: string;
  }>();
  const now = new Date().toISOString();
  const rawCallback = JSON.stringify(params);

  if (!order) {
    const tradeDate = parseEcpayDate(params.MerchantTradeDate);
    const ageMs = tradeDate ? Date.now() - tradeDate.getTime() : Infinity;
    if (ageMs < 30_000) {
      return new Response('0|Order not yet committed', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
    try {
      await env.DB.prepare(
        `INSERT INTO events (id, user_id, event_type, created_at, meta)
         VALUES (?, NULL, 'ecpay_orphan_callback', ?, ?)`
      ).bind(
        crypto.randomUUID(),
        now,
        JSON.stringify({ merchant_trade_no: merchantTradeNo, raw: params }),
      ).run();
    } catch {}
    return new Response('1|OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  if (order.item_id === 'membership_monthly' && params.TotalSuccessTimes) {
    await handleMembershipRecurringCallback(env, params).catch(() => {});
    return new Response('1|OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  if (params.RtnCode === '1') {
    if (Number(params.TradeAmt) !== order.amount) {
      return new Response('0|Amount mismatch', { status: 400 });
    }

    if (order.status === 'paid') {
      return new Response('1|OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    const stmts: D1PreparedStatement[] = [];

    stmts.push(env.DB.prepare(
      `UPDATE orders SET
         status = 'paid',
         ecpay_trade_no = ?,
         ecpay_payment_type = ?,
         raw_callback = ?,
         paid_at = ?,
         updated_at = ?
       WHERE id = ?`
    ).bind(
      params.TradeNo ?? null,
      params.PaymentType ?? null,
      rawCallback,
      now, now,
      order.id,
    ));

    stmts.push(env.DB.prepare(
      `INSERT INTO events (id, user_id, event_type, created_at, meta)
       VALUES (?, ?, 'pay_success', ?, ?)`
    ).bind(
      crypto.randomUUID(),
      order.user_id,
      now,
      JSON.stringify({
        amount: order.amount,
        order_id: order.id,
        item_id: order.item_id,
        trade_no: params.TradeNo ?? null,
        payment_type: params.PaymentType ?? null,
      }),
    ));

    if (stmts.length > 0) {
      try {
        await env.DB.batch(stmts);
      } catch {
        return new Response('0|DB write failed', { status: 500, headers: { 'Content-Type': 'text/plain' } });
      }
    }

    // Grant bundle credits or numerology access after successful payment
    if (order.user_id) {
      const catalogItem = SPREAD_CATALOG[order.item_id];
      if (catalogItem?.bundle) {
        await grantBundleCredits(env, order.user_id, catalogItem.bundle).catch(() => {});
      } else if (order.item_id === 'membership_monthly') {
        await markMembershipFirstPaymentPaid(env, order, params).catch(() => {});
      } else if (order.item_id.startsWith('numerology_')) {
        await env.DB.prepare(`
          UPDATE profiles
          SET purchased_spreads = (
            SELECT json_group_array(value) FROM (
              SELECT value FROM json_each(COALESCE(NULLIF(purchased_spreads, ''), '[]'))
              UNION SELECT ?
            )
          ), updated_at = ?
          WHERE id = ?
        `).bind(order.item_id, now, order.user_id).run().catch(() => {});
      }
    }
  } else {
    if (order.status === 'pending') {
      try {
        await env.DB.prepare(
          `UPDATE orders SET
             status = 'failed',
             raw_callback = ?,
             updated_at = ?
           WHERE id = ?`
        ).bind(rawCallback, now, order.id).run();
        if (order.item_id === 'membership_monthly') {
          await env.DB.prepare(
            `UPDATE subscriptions
                SET status = 'failed',
                    last_charge_status = ?,
                    last_error_message = ?,
                    updated_at = datetime('now')
              WHERE merchant_trade_no = ?`
          ).bind(
            String(params.RtnCode ?? ''),
            params.RtnMsg ?? null,
            merchantTradeNo,
          ).run().catch(() => {});
        }
      } catch {
        return new Response('0|DB write failed', { status: 500, headers: { 'Content-Type': 'text/plain' } });
      }
    }
  }

  return new Response('1|OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ── Bundle credit helpers ─────────────────────────────────────────────────────

interface BundleGrant { three_card: number; ten_card: number; pastlife: number; days: number }

async function grantBundleCredits(env: Env, userId: string, grant: BundleGrant): Promise<void> {
  const expiresThreeCard = grant.three_card > 0
    ? new Date(Date.now() + grant.days * 86400_000).toISOString() : null;
  const expiresTenCard = grant.ten_card > 0
    ? new Date(Date.now() + grant.days * 86400_000).toISOString() : null;
  const expiresPastlife = grant.pastlife > 0
    ? new Date(Date.now() + grant.days * 86400_000).toISOString() : null;

  await env.DB.prepare(`
    INSERT INTO bundle_credits
      (user_id, three_card_remaining, three_card_expires,
                ten_card_remaining,   ten_card_expires,
                pastlife_remaining,   pastlife_expires, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      three_card_remaining = three_card_remaining + excluded.three_card_remaining,
      three_card_expires   = CASE WHEN excluded.three_card_remaining > 0 THEN excluded.three_card_expires ELSE three_card_expires END,
      ten_card_remaining   = ten_card_remaining + excluded.ten_card_remaining,
      ten_card_expires     = CASE WHEN excluded.ten_card_remaining > 0 THEN excluded.ten_card_expires ELSE ten_card_expires END,
      pastlife_remaining   = pastlife_remaining + excluded.pastlife_remaining,
      pastlife_expires     = CASE WHEN excluded.pastlife_remaining > 0 THEN excluded.pastlife_expires ELSE pastlife_expires END,
      updated_at           = datetime('now')
  `).bind(
    userId,
    grant.three_card, expiresThreeCard,
    grant.ten_card,   expiresTenCard,
    grant.pastlife,   expiresPastlife,
  ).run();
}

async function getBundleCredits(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return json(req, env, { credits: null });

  const row = await env.DB.prepare(
    `SELECT three_card_remaining, three_card_expires,
            ten_card_remaining,   ten_card_expires,
            pastlife_remaining,   pastlife_expires
       FROM bundle_credits WHERE user_id = ?`
  ).bind(user.id).first<{
    three_card_remaining: number; three_card_expires: string | null;
    ten_card_remaining:   number; ten_card_expires:   string | null;
    pastlife_remaining:   number; pastlife_expires:   string | null;
  }>();

  if (!row) return json(req, env, { credits: { three_card: 0, ten_card: 0, pastlife: 0 } });

  const now = new Date().toISOString();
  return json(req, env, {
    credits: {
      three_card: (row.three_card_expires && row.three_card_expires < now) ? 0 : row.three_card_remaining,
      ten_card:   (row.ten_card_expires   && row.ten_card_expires   < now) ? 0 : row.ten_card_remaining,
      pastlife:   (row.pastlife_expires   && row.pastlife_expires   < now) ? 0 : row.pastlife_remaining,
    },
  });
}

async function consumeBundleCredit(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  if (!user) return unauthorized(req, env, '請先登入');

  const body = await readBody<{ category: string }>(req);
  const cat = body.category;
  if (cat !== 'three_card' && cat !== 'ten_card' && cat !== 'pastlife') {
    return badRequest(req, env, '無效的類別');
  }

  const col = `${cat}_remaining` as const;
  const expCol = `${cat}_expires` as const;
  const now = new Date().toISOString();

  const row = await env.DB.prepare(
    `SELECT ${col}, ${expCol} FROM bundle_credits WHERE user_id = ?`
  ).bind(user.id).first<Record<string, number | string | null>>();

  if (!row || (row[expCol] && String(row[expCol]) < now) || Number(row[col] ?? 0) <= 0) {
    return json(req, env, { ok: false, error: '無可用套票' }, { status: 402 });
  }

  await env.DB.prepare(
    `UPDATE bundle_credits SET ${col} = ${col} - 1, updated_at = ? WHERE user_id = ?`
  ).bind(now, user.id).run();

  return json(req, env, { ok: true, remaining: Number(row[col]) - 1 });
}

function parseJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
