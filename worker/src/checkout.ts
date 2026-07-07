import { signJwt, verifyJwt } from './auth';
import {
  buildAioCheckOutForm,
  makeMerchantTradeNo,
  SPREAD_CATALOG,
} from './ecpay';
import {
  badRequest,
  Env,
  json,
  rateLimit,
  readBody,
  readSession,
  requireAdmin,
  serverError,
  tooManyRequests,
  clientIp,
  unauthorized,
  validEmail,
} from './utils';

interface OrderPick {
  card_key: string;
  position: number;
  reversed?: boolean;
}

interface CreateOrderBody {
  spread_id: string;
  picks?: OrderPick[];
  guest_email?: string;
}

const ORDER_TOKEN_SEC = 60 * 60 * 24 * 7;

function sanitizePicks(raw: unknown, expectedCount: number): OrderPick[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length !== expectedCount) return null;
  const out: OrderPick[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const r = item as Record<string, unknown>;
    if (typeof r.card_key !== 'string' || r.card_key.length === 0 || r.card_key.length > 100) return null;
    if (typeof r.position !== 'number' || !Number.isFinite(r.position)) return null;
    const pick: OrderPick = { card_key: r.card_key, position: r.position };
    if (typeof r.reversed === 'boolean') pick.reversed = r.reversed;
    out.push(pick);
  }
  return out;
}

const SPREAD_CARD_COUNT: Record<string, number> = {
  tarot_three:        3,
  tarot_celtic:       10,
  tarot_pastlife:     7,
  celtic_cross:       10,
  unicorns_three:     3,
  dragons_three:      3,
  egyptian_pastlife:  7,
  cosmic_cross:       11,
  osho_three:         3,
};

export async function createOrder(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env);
  const isAdmin = user ? await requireAdmin(req, env, user) : false;

  if (!isAdmin) {
    const rl = await rateLimit(env, 'create-order', clientIp(req), 10, 3600);
    if (!rl.allowed) return tooManyRequests(req, env, '建立訂單過於頻繁,請稍後再試');
  }

  const body = await readBody<CreateOrderBody>(req);
  const item = SPREAD_CATALOG[body.spread_id];
  if (!item) return badRequest(req, env, '商品代號錯誤');

  const expectedCount = SPREAD_CARD_COUNT[item.id] ?? 0;
  const isGuestSpreadCheckout = !user && expectedCount > 0;
  if (!user && !isGuestSpreadCheckout) {
    return unauthorized(req, env, '請先登入');
  }

  const guestEmail = typeof body.guest_email === 'string' ? body.guest_email.toLowerCase().trim() : '';
  if (isGuestSpreadCheckout && !validEmail(guestEmail)) {
    return badRequest(req, env, 'guest_email required');
  }

  if (user) {
    await env.DB.prepare(
      `UPDATE orders SET status = 'cancelled', updated_at = datetime('now')
         WHERE user_id = ? AND status = 'pending'
           AND created_at < datetime('now', '-30 minutes')`
    ).bind(user.id).run().catch(() => {});
  }

  if (!isAdmin && (!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV)) {
    return serverError(req, env, new Error('ECPay 未設定'));
  }

  const picks = expectedCount > 0 ? sanitizePicks(body.picks, expectedCount) : null;
  const picksPayload = picks ? JSON.stringify(picks) : null;

  const recentPending = user
    ? await env.DB.prepare(
      `SELECT id, merchant_trade_no FROM orders
         WHERE user_id = ? AND item_id = ? AND status = 'pending'
           AND created_at >= datetime('now', '-5 minutes')
         ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id, item.id).first<{ id: string; merchant_trade_no: string }>()
    : null;

  let orderId: string;
  let merchantTradeNo: string;

  if (recentPending) {
    orderId = recentPending.id;
    merchantTradeNo = recentPending.merchant_trade_no;
    if (picksPayload) {
      await env.DB.prepare(
        `UPDATE orders SET picks_payload = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(picksPayload, orderId).run();
    }
  } else {
    orderId = crypto.randomUUID();
    merchantTradeNo = makeMerchantTradeNo();

    await env.DB.prepare(
      `INSERT INTO orders
         (id, merchant_trade_no, user_id, email, item_type, item_id, item_name, amount, status, picks_payload)
       VALUES (?, ?, ?, ?, 'spread', ?, ?, ?, 'pending', ?)`
    ).bind(
      orderId,
      merchantTradeNo,
      user?.id ?? null,
      user?.email ?? guestEmail,
      item.id,
      item.name,
      item.amount,
      picksPayload,
    ).run();
  }

  const orderEmail = user?.email ?? guestEmail ?? 'guest-order@crystalfield.local';
  const orderToken = await signJwt(
    { sub: orderId, email: orderEmail },
    env.JWT_SECRET,
    ORDER_TOKEN_SEC,
  );

  if (isAdmin) {
    if (!user) {
      return unauthorized(req, env, '請先登入');
    }
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE orders
          SET status = 'paid',
              paid_at = datetime('now'),
              ecpay_payment_type = 'admin',
              updated_at = datetime('now')
        WHERE id = ? AND status = 'pending'`
    ).bind(orderId).run();

    // Grant access immediately (mirrors webhook logic) so admins can test unlock flow
    if (item.id.startsWith('numerology_') || item.id === 'membership_monthly') {
      await env.DB.prepare(`
        UPDATE profiles
        SET purchased_spreads = (
          SELECT json_group_array(value) FROM (
            SELECT value FROM json_each(COALESCE(NULLIF(purchased_spreads, ''), '[]'))
            UNION SELECT ?
          )
        ), updated_at = ?
        WHERE id = ?
      `).bind(item.id, now, user.id).run().catch(() => {});
    }

    return json(req, env, {
      order_id: orderId,
      merchant_trade_no: merchantTradeNo,
      ecpay: null,
      admin_unlocked: true,
      order_token: orderToken,
    });
  }

  const merchantId = env.ECPAY_MERCHANT_ID;
  const hashKey = env.ECPAY_HASH_KEY;
  const hashIV = env.ECPAY_HASH_IV;
  if (!merchantId || !hashKey || !hashIV) {
    return serverError(req, env, new Error('ECPay 未設定'));
  }

  const apiOrigin = new URL(req.url).origin;
  const frontendOrigin = inferFrontendOrigin(env);

  const form = await buildAioCheckOutForm({
    merchantId,
    hashKey,
    hashIV,
    merchantTradeNo,
    amount:          item.amount,
    itemName:        item.name,
    tradeDesc:       `晶域心語 — ${item.name}`,
    returnURL:       `${apiOrigin}/api/ecpay-webhook`,
    clientBackURL:   `${frontendOrigin}/checkout/return?order_id=${orderId}&order_token=${encodeURIComponent(orderToken)}`,
    orderResultURL:  `${apiOrigin}/api/checkout/result`,
  }, env.ECPAY_ENV);

  return json(req, env, {
    order_id: orderId,
    merchant_trade_no: merchantTradeNo,
    ecpay: form,
    order_token: orderToken,
  });
}

function inferFrontendOrigin(env: Env): string {
  const list = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const o of list) if (o !== '*') return o;
  return 'https://crystalfield101.com';
}

export async function checkoutResult(req: Request, env: Env): Promise<Response> {
  const frontendOrigin = inferFrontendOrigin(env);
  let merchantTradeNo = '';
  try {
    const form = await req.formData();
    merchantTradeNo = String(form.get('MerchantTradeNo') ?? '');
  } catch {}

  if (!merchantTradeNo) {
    return Response.redirect(frontendOrigin, 302);
  }

  const order = await env.DB.prepare(
    'SELECT id, email FROM orders WHERE merchant_trade_no = ?'
  ).bind(merchantTradeNo).first<{ id: string; email: string }>();

  if (!order) {
    return Response.redirect(`${frontendOrigin}/checkout/return`, 302);
  }
  const orderToken = await signJwt(
    { sub: order.id, email: order.email || 'guest-order@crystalfield.local' },
    env.JWT_SECRET,
    ORDER_TOKEN_SEC,
  );
  return Response.redirect(
    `${frontendOrigin}/checkout/return?order_id=${encodeURIComponent(order.id)}&order_token=${encodeURIComponent(orderToken)}`,
    302,
  );
}

export async function getOrder(req: Request, env: Env, orderId: string): Promise<Response> {
  const user = await readSession(req, env);
  const orderToken = new URL(req.url).searchParams.get('order_token');
  const guestAuthorized = await verifyOrderToken(orderToken, env, orderId);
  if (!user && !guestAuthorized) return unauthorized(req, env, '請先登入');

  const row = await env.DB.prepare(
    `SELECT id, merchant_trade_no, item_type, item_id, item_name, amount, status,
            ecpay_payment_type, picks_payload, created_at, paid_at, user_id
       FROM orders
      WHERE id = ?`
  ).bind(orderId).first<{
    id: string;
    merchant_trade_no: string;
    item_type: string;
    item_id: string;
    item_name: string;
    amount: number;
    status: string;
    ecpay_payment_type: string | null;
    picks_payload: string | null;
    created_at: string;
    paid_at: string | null;
    user_id: string | null;
  }>();

  if (!row) return json(req, env, { error: '找不到訂單' }, { status: 404 });
  if (!guestAuthorized && row.user_id !== user?.id) {
    return json(req, env, { error: '找不到訂單' }, { status: 404 });
  }

  let picks: OrderPick[] | null = null;
  if (row.picks_payload) {
    try {
      const parsed = JSON.parse(row.picks_payload);
      const cleaned = sanitizePicks(parsed, Array.isArray(parsed) ? parsed.length : 0);
      picks = cleaned;
    } catch {}
  }

  const { picks_payload: _omit, user_id: _userId, ...orderForClient } = row;
  return json(req, env, { order: { ...orderForClient, picks } });
}

export async function verifyOrderToken(
  token: string | null,
  env: Env,
  orderId: string,
): Promise<boolean> {
  if (!token) return false;
  const payload = await verifyJwt(token, env.JWT_SECRET);
  return payload?.sub === orderId;
}
