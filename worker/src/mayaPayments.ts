import { buildAioCheckOutForm, computeEcpayCheckMac, makeMerchantTradeNo } from './ecpay';
import { isMayaLocale, isMayaProduct, MAYA_PRODUCTS, mayaOrderAmounts } from '../../app/src/lib/maya';
import { MAYA_PRO_PRODUCT } from '../../app/src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../../app/src/lib/mayaRelationship';
import { isAllowedOrigin, json, PayloadTooLargeError, readBody, readSession, requireAdmin, type Env } from './utils';
import { mayaFeatures } from './mayaFeatures';

export const MAYA_STAGE_ENDPOINT = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
class SandboxError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
function origin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== value || url.protocol !== 'https:' || url.username || url.password
      || ['www.crystalfield101.com', 'crystalfield101.com', 'api.crystalfield101.com'].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}
export function mayaSandboxEnabled(env: Env): boolean {
  // Never reuse the existing production merchant secrets or endpoint defaults.
  return mayaFeatures(env).sandbox && env.ENV === 'dev'
    && ['mock', 'live'].includes(env.MAYA_AI_MODE ?? '')
    && env.MAYA_SANDBOX_MERCHANT_ID === '3002607'
    && Boolean(env.MAYA_SANDBOX_HASH_KEY && env.MAYA_SANDBOX_HASH_IV)
    && Boolean(origin(env.MAYA_SANDBOX_API_ORIGIN) && origin(env.MAYA_SANDBOX_FRONTEND_ORIGIN))
    && (env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).includes(env.MAYA_SANDBOX_FRONTEND_ORIGIN!);
}
export function mayaPaymentEnabled(env: Env): boolean {
  return mayaFeatures(env).payment && env.ENV === 'production' && env.ECPAY_ENV === 'production'
    && Boolean(env.ECPAY_MERCHANT_ID && /^\d{7,10}$/.test(env.ECPAY_MERCHANT_ID) && !['3002607', '2000132'].includes(env.ECPAY_MERCHANT_ID)
      && env.ECPAY_HASH_KEY && env.ECPAY_HASH_IV)
    && env.MAYA_PAYMENT_API_ORIGIN === 'https://api.crystalfield101.com'
    && env.MAYA_PAYMENT_FRONTEND_ORIGIN === 'https://www.crystalfield101.com'
    && (env.ALLOWED_ORIGINS ?? '').split(',').map(item => item.trim()).includes(env.MAYA_PAYMENT_FRONTEND_ORIGIN);
}
export function mayaProPaymentEnabled(env: Env): boolean {
  return env.MAYA_PRO_PAYMENT_ENABLED === 'true' && mayaPaymentEnabled(env);
}
export function mayaRelationshipPaymentEnabled(env: Env): boolean {
  return env.MAYA_RELATIONSHIP_V2_PAYMENT_ENABLED === 'true' && mayaPaymentEnabled(env);
}
function paymentTable(product: string, env: Env, production: boolean) {
  if (product === MAYA_RELATIONSHIP_PRODUCT.code) return 'maya_relationship_payment_orders';
  return product === MAYA_PRO_PRODUCT.code ? 'maya_pro_payment_orders' : settings(env, production).table;
}
function entitlementTable(product: string) {
  if (product === MAYA_RELATIONSHIP_PRODUCT.code) return 'maya_relationship_entitlements';
  return product === MAYA_PRO_PRODUCT.code ? 'maya_pro_entitlements' : 'maya_entitlements';
}
function adjustmentTable(product: string) {
  if (product === MAYA_RELATIONSHIP_PRODUCT.code) return 'maya_relationship_payment_adjustments';
  return product === MAYA_PRO_PRODUCT.code ? 'maya_pro_payment_adjustments' : 'maya_payment_adjustments';
}
function settings(env: Env, production: boolean) {
  return production ? {
    table: 'maya_payment_orders', type: 'maya', merchant: env.ECPAY_MERCHANT_ID!,
    key: env.ECPAY_HASH_KEY!, iv: env.ECPAY_HASH_IV!,
    api: env.MAYA_PAYMENT_API_ORIGIN!, frontend: env.MAYA_PAYMENT_FRONTEND_ORIGIN!,
    prefix: '/api/maya/payments', scope: 'maya_checkout',
  } : {
    table: 'maya_sandbox_orders', type: 'maya_sandbox', merchant: env.MAYA_SANDBOX_MERCHANT_ID!,
    key: env.MAYA_SANDBOX_HASH_KEY!, iv: env.MAYA_SANDBOX_HASH_IV!,
    api: env.MAYA_SANDBOX_API_ORIGIN!, frontend: env.MAYA_SANDBOX_FRONTEND_ORIGIN!,
    prefix: '/api/maya/sandbox', scope: 'sandbox_checkout',
  };
}
interface SandboxOrder {
  order_id: string; user_id: string; product_code: string; merchant_id: string;
  locale: 'zh-TW' | 'en'; merchant_trade_no: string; amount: number;
  status: string; item_id: string; item_type: string; order_user: string;
  trade_no: string | null;
  payment_state?: string;
}
function orderSelect(env: Env, production: boolean) {
  const table = settings(env, production).table;
  const tables = [table];
  if (production && env.MAYA_PRO_PAYMENT_ENABLED === 'true') tables.push('maya_pro_payment_orders');
  if (production && env.MAYA_RELATIONSHIP_V2_PAYMENT_ENABLED === 'true') tables.push('maya_relationship_payment_orders');
  const source = tables.length === 1 ? table : `(${tables.map(name =>
    `SELECT order_id,user_id,product_code,merchant_id,locale,checkout_key,trade_no,payment_state FROM ${name}`).join(' UNION ALL ')})`;
  return `SELECT s.*, o.merchant_trade_no, o.amount, o.status, o.item_id, o.item_type, o.user_id AS order_user
    FROM ${source} s JOIN orders o ON o.id = s.order_id`;
}
function validOrder(order: SandboxOrder, env: Env, production: boolean) {
  const product = order.product_code === MAYA_RELATIONSHIP_PRODUCT.code && production && mayaRelationshipPaymentEnabled(env)
    ? MAYA_RELATIONSHIP_PRODUCT : order.product_code === MAYA_PRO_PRODUCT.code && production && mayaProPaymentEnabled(env)
    ? MAYA_PRO_PRODUCT : MAYA_PRODUCTS.find((entry) => entry.code === order.product_code);
  const amounts = isMayaProduct(order.product_code) ? mayaOrderAmounts(order.product_code) : product ? [product.price] : [];
  if (!product || order.item_id !== product.code || !amounts.includes(order.amount)
    || order.item_type !== settings(env, production).type || order.order_user !== order.user_id
    || order.merchant_id !== settings(env, production).merchant) throw new SandboxError(409, 'ORDER_MISMATCH');
  return product;
}
function returnURL(order: SandboxOrder, env: Env, production: boolean): string {
  const path = order.product_code === MAYA_RELATIONSHIP_PRODUCT.code ? '/maya-calendar/relationship'
    : order.product_code === MAYA_PRO_PRODUCT.code ? '/maya-calendar/pro' : '/maya-calendar/member';
  const url = new URL(`${order.locale === 'en' ? '/en' : ''}${path}`, settings(env, production).frontend);
  url.searchParams.set('maya_order', order.order_id);
  return url.toString();
}
async function verifiedCallback(req: Request, env: Env, production: boolean): Promise<{ fields: Record<string, string>; order: SandboxOrder }> {
  const length = Number(req.headers.get('Content-Length') ?? 0);
  if (length > 16_384) throw new SandboxError(413, 'TOO_LARGE');
  if (!req.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) throw new SandboxError(415, 'INVALID_CALLBACK');
  const reader = req.body?.getReader();
  if (!reader) throw new SandboxError(400, 'INVALID_CALLBACK');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 16_384) { await reader.cancel(); throw new SandboxError(413, 'TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  const params = new URLSearchParams(new TextDecoder().decode(buffer));
  const fields: Record<string, string> = {};
  const keys = new Set<string>();
  for (const [key, value] of params) {
    if (!/^[A-Za-z0-9_]+$/.test(key)) throw new SandboxError(400, 'INVALID_CALLBACK');
    if (keys.has(key.toLowerCase())) throw new SandboxError(400, 'DUPLICATE_FIELD');
    keys.add(key.toLowerCase());
    fields[key] = value;
  }
  const supplied = fields.CheckMacValue;
  if (!supplied || !/^[A-F0-9]{64}$/.test(supplied)) throw new SandboxError(400, 'INVALID_SIGNATURE');
  const expected = await computeEcpayCheckMac(fields, settings(env, production).key, settings(env, production).iv);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  if (difference) throw new SandboxError(400, 'INVALID_SIGNATURE');
  if (fields.MerchantID !== settings(env, production).merchant
    || !/^[A-Za-z0-9]{20}$/.test(fields.MerchantTradeNo ?? '')
    || !/^[A-Za-z0-9]{1,40}$/.test(fields.TradeNo ?? '')
    || !/^[1-9]\d{0,5}$/.test(fields.TradeAmt ?? '')
    || !/^-?\d+$/.test(fields.RtnCode ?? '')
    || fields.SimulatePaid !== '0') throw new SandboxError(400, 'INVALID_CALLBACK');
  const order = await env.DB.prepare(`${orderSelect(env, production)} WHERE o.merchant_trade_no = ?`)
    .bind(fields.MerchantTradeNo).first<SandboxOrder>();
  if (!order) throw new SandboxError(404, 'ORDER_NOT_FOUND');
  validOrder(order, env, production);
  if (fields.CustomField1 !== order.product_code || fields.CustomField2 !== order.order_id
    || Number(fields.TradeAmt) !== order.amount || (order.trade_no && order.trade_no !== fields.TradeNo)) {
    throw new SandboxError(409, 'ORDER_MISMATCH');
  }
  return { fields, order };
}

export async function routeMayaPayment(req: Request, env: Env, production: boolean): Promise<Response> {
  const url = new URL(req.url);
  const config = settings(env, production);
  const callbackPath = `${config.prefix}/callback`;
  const resultPath = `${config.prefix}/result`;
  const external = url.pathname === callbackPath || url.pathname === resultPath;
  const english = url.searchParams.get('locale') === 'en';
  const respond = (data: unknown, status = 200) => json(req, env, data, { status, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    if (url.pathname === '/api/maya/checkout/config' && req.method === 'GET' && env.MAYA_MEMBER_TEST_USER_IDS && !mayaFeatures(env).member) {
      const user = await readSession(req, env, true);
      if (!user) throw new SandboxError(401, 'LOGIN_REQUIRED');
      if (!mayaFeatures(env, user.id).member) throw new SandboxError(503, 'FEATURE_DISABLED');
      return respond({ enabled: false, mode: production ? 'production' : 'sandbox' });
    }
    if (!mayaFeatures(env).member) throw new SandboxError(503, 'FEATURE_DISABLED');
    if (!external && req.method !== 'GET' && !isAllowedOrigin(req, env)) throw new SandboxError(403, 'BAD_ORIGIN');
    const user = external ? null : await readSession(req, env, true);
    if (!external && !user) throw new SandboxError(401, 'LOGIN_REQUIRED');
    const enabled = production ? mayaPaymentEnabled(env) : mayaSandboxEnabled(env);
    if (url.pathname === '/api/maya/checkout/config' && req.method === 'GET') return respond({ enabled, mode: production ? 'production' : 'sandbox' });
    if (!enabled) throw new SandboxError(503, production ? 'PAYMENT_DISABLED' : 'SANDBOX_BLOCKED');
    if (external) {
      if (req.method !== 'POST') throw new SandboxError(405, 'METHOD_NOT_ALLOWED');
      const { fields, order } = await verifiedCallback(req, env, production);
      const table = paymentTable(order.product_code, env, production);
      const grantsTable = entitlementTable(order.product_code);
      // A browser return never changes payment or entitlement state.
      if (url.pathname === resultPath) return new Response(null, { status: 303, headers: { Location: returnURL(order, env, production), 'Cache-Control': 'no-store' } });
      if (fields.RtnCode === '1') {
        if (order.status !== 'pending' && order.status !== 'paid') throw new SandboxError(409, 'PAYMENT_STATE_CONFLICT');
        if (production && !['pending', 'paid'].includes(order.payment_state ?? '')) throw new SandboxError(409, 'PAYMENT_STATE_CONFLICT');
        await env.DB.batch([
          env.DB.prepare(`UPDATE ${table} SET trade_no = ? ${production ? ", payment_state = 'paid'" : ''}
            WHERE order_id = ? AND (trade_no IS NULL OR trade_no = ?)
            ${production ? "AND payment_state IN ('pending','paid')" : ''}`)
            .bind(fields.TradeNo, order.order_id, fields.TradeNo),
          env.DB.prepare(`UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, datetime('now')),
            ecpay_trade_no = ?, ecpay_payment_type = '${production ? 'maya_verified' : 'maya_sandbox'}', updated_at = datetime('now')
            WHERE id = ? AND user_id = ? AND item_id = ? AND amount = ? AND item_type = '${config.type}'
              AND status IN ('pending', 'paid') AND (ecpay_trade_no IS NULL OR ecpay_trade_no = ?)
              AND EXISTS (SELECT 1 FROM ${table} WHERE order_id = orders.id AND trade_no = ?
                ${production ? "AND payment_state = 'paid'" : ''})`)
            .bind(fields.TradeNo, order.order_id, order.user_id, order.product_code, order.amount, fields.TradeNo, fields.TradeNo),
          env.DB.prepare(`INSERT OR IGNORE INTO ${grantsTable}(id, user_id, product_code, order_id, status, source, starts_at)
            SELECT ?, o.user_id, o.item_id, o.id, 'active', 'verified_payment', datetime('now') FROM orders o
            JOIN ${table} s ON s.order_id = o.id AND s.user_id = o.user_id AND s.product_code = o.item_id
            WHERE o.id = ? AND o.status = 'paid' AND o.item_type = '${config.type}' AND o.amount = ?
              AND o.ecpay_trade_no = ? AND s.trade_no = ? ${production ? "AND s.payment_state = 'paid'" : ''}`)
            .bind(`${production ? 'maya-payment' : 'maya-sandbox'}-${order.order_id}`, order.order_id, order.amount, fields.TradeNo, fields.TradeNo),
        ]);
        const saved = await env.DB.prepare('SELECT status, ecpay_trade_no FROM orders WHERE id = ?')
          .bind(order.order_id).first<{ status: string; ecpay_trade_no: string }>();
        if (saved?.status !== 'paid' || saved.ecpay_trade_no !== fields.TradeNo) throw new SandboxError(409, 'PAYMENT_STATE_CONFLICT');
      } else {
        await env.DB.batch([
          env.DB.prepare(`UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE id = ? AND item_type = ? AND status = 'pending'`)
            .bind(order.order_id, config.type),
          ...(production ? [env.DB.prepare(`UPDATE ${table} SET payment_state='failed' WHERE order_id=? AND payment_state='pending'`).bind(order.order_id)] : []),
        ]);
      }
      console.info(JSON.stringify({ event: production ? 'maya_payment_callback' : 'maya_sandbox_callback', outcome: fields.RtnCode === '1' ? 'verified_success' : 'verified_failure' }));
      return new Response('1|OK', { headers: { 'Cache-Control': 'no-store' } });
    }
    const adjustment = url.pathname.match(/^\/api\/maya\/payments\/([A-Za-z0-9_-]{1,80})\/adjust$/);
    if (production && adjustment && req.method === 'POST' && user) {
      if (!await requireAdmin(req, env, user)) throw new SandboxError(403, 'ADMIN_REQUIRED');
      const body = await readBody<Record<string, unknown>>(req, 2048);
      if (!body || Object.keys(body).some(key => !['action', 'reference'].includes(key))
        || !['refunded', 'revoked'].includes(String(body.action))
        || typeof body.reference !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(body.reference)) throw new SandboxError(400, 'INVALID_INPUT');
      const order = await env.DB.prepare(`${orderSelect(env, true)} WHERE s.order_id=?`).bind(adjustment[1]).first<SandboxOrder>();
      if (!order) throw new SandboxError(404, 'ORDER_NOT_FOUND');
      validOrder(order, env, true);
      const table = paymentTable(order.product_code, env, true);
      const adjustments = adjustmentTable(order.product_code);
      const existing = await env.DB.prepare(`SELECT order_id,action,actor_id FROM ${adjustments} WHERE reference=?`)
        .bind(body.reference).first<{ order_id: string; action: string; actor_id: string }>();
      if (existing && (existing.order_id !== order.order_id || existing.action !== body.action || existing.actor_id !== user.id)) throw new SandboxError(409, 'CONFLICT');
      if (existing) return respond({ adjusted: true, status: body.action });
      if (order.status !== 'paid' || order.payment_state !== 'paid') throw new SandboxError(409, 'PAYMENT_STATE_CONFLICT');
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO ${adjustments}(id,order_id,actor_id,action,reference) VALUES (?,?,?,?,?)`)
          .bind(crypto.randomUUID(), order.order_id, user.id, body.action, body.reference),
        env.DB.prepare(`UPDATE ${table} SET payment_state=? WHERE order_id=? AND payment_state='paid'`).bind(body.action, order.order_id),
        env.DB.prepare("UPDATE orders SET status=?,updated_at=datetime('now') WHERE id=? AND item_type='maya' AND status='paid'").bind(body.action, order.order_id),
        env.DB.prepare(`UPDATE ${entitlementTable(order.product_code)} SET status='revoked' WHERE order_id=?`).bind(order.order_id),
      ]);
      // Records an already verified external refund/revocation; does not send money.
      return respond({ adjusted: true, status: body.action });
    }
    if (url.pathname === '/api/maya/checkout' && req.method === 'POST' && user) {
      const body = await readBody<Record<string, unknown>>(req, 4096);
      if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).some((key) => !['locale', 'product_code', 'idempotency_key'].includes(key))
        || !isMayaLocale(body.locale) || !(isMayaProduct(body.product_code) || (production && [MAYA_PRO_PRODUCT.code, MAYA_RELATIONSHIP_PRODUCT.code].some(code => code === body.product_code)))
        || typeof body.idempotency_key !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(body.idempotency_key)) throw new SandboxError(400, 'INVALID_INPUT');
      if (body.product_code === MAYA_PRO_PRODUCT.code && !mayaProPaymentEnabled(env)) throw new SandboxError(503, 'PRO_PAYMENT_DISABLED');
      if (body.product_code === MAYA_RELATIONSHIP_PRODUCT.code && !mayaRelationshipPaymentEnabled(env)) throw new SandboxError(503, 'RELATIONSHIP_PAYMENT_DISABLED');
      const product = body.product_code === MAYA_RELATIONSHIP_PRODUCT.code ? MAYA_RELATIONSHIP_PRODUCT
        : body.product_code === MAYA_PRO_PRODUCT.code ? MAYA_PRO_PRODUCT : MAYA_PRODUCTS.find((entry) => entry.code === body.product_code)!;
      const table = paymentTable(product.code, env, production);
      const locale = body.locale;
      const previous = await env.DB.prepare(`${orderSelect(env, production)} WHERE s.user_id=? AND s.checkout_key=?`)
        .bind(user.id, body.idempotency_key).first<SandboxOrder>();
      if (production && product.code === 'MAYA_RELATIONSHIP_699' && !previous) throw new SandboxError(409, 'LEGACY_PRODUCT_RETIRED');
      if (previous && (previous.product_code !== product.code || previous.locale !== locale || previous.status !== 'pending')) {
        throw new SandboxError(409, 'CHECKOUT_CONFLICT');
      }
      const rate = await env.DB.prepare(`INSERT INTO maya_rate_limits(scope,user_id,bucket,used) VALUES (?, ?,?,1)
        ON CONFLICT(scope,user_id,bucket) DO UPDATE SET used=used+1 WHERE used<10 RETURNING used`)
        .bind(config.scope, user.id, Math.floor(Date.now() / 3600_000)).first();
      if (!rate) throw new SandboxError(429, 'RATE_LIMITED');
      const id = crypto.randomUUID();
      const trade = makeMerchantTradeNo();
      if (!previous) await env.DB.batch([
        env.DB.prepare(`INSERT INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status)
          SELECT ?,?,?,?,'${config.type}',?,?,?,'pending'
          WHERE NOT EXISTS (${orderSelect(env, production)} WHERE s.user_id=? AND s.checkout_key=?)`)
          .bind(id, trade, user.id, user.email, product.code, locale === 'en' ? product.en : product.zh, product.price, user.id, body.idempotency_key),
        env.DB.prepare(`INSERT OR IGNORE INTO ${table}(order_id,user_id,product_code,merchant_id,locale,checkout_key)
          SELECT id,user_id,item_id,?,?,? FROM orders WHERE id=?`)
          .bind(config.merchant, locale, body.idempotency_key, id),
      ]);
      const order = await env.DB.prepare(`${orderSelect(env, production)} WHERE s.user_id=? AND s.checkout_key=?`)
        .bind(user.id, body.idempotency_key).first<SandboxOrder>();
      if (!order) throw new Error('Sandbox order persistence failed');
      validOrder(order, env, production);
      if (order.product_code !== product.code || order.locale !== locale || order.status !== 'pending') throw new SandboxError(409, 'CHECKOUT_CONFLICT');
      const form = await buildAioCheckOutForm({
        merchantId: config.merchant, hashKey: config.key, hashIV: config.iv,
        merchantTradeNo: order.merchant_trade_no, amount: order.amount, itemName: locale === 'en' ? product.en : product.zh,
        tradeDesc: production ? 'Dreamspell reflection report' : 'Dreamspell sandbox test only', locale, returnURL: new URL(callbackPath, config.api).toString(),
        clientBackURL: returnURL(order, env, production), orderResultURL: new URL(resultPath, config.api).toString(),
        customField1: product.code, customField2: order.order_id,
      }, production ? 'production' : 'stage');
      return respond({ order_id: order.order_id, ...form });
    }
    const match = url.pathname.match(/^\/api\/maya\/checkout\/([A-Za-z0-9_-]{1,80})$/);
    if (match && req.method === 'GET' && user) {
      const order = await env.DB.prepare(`${orderSelect(env, production)} WHERE s.order_id=? AND s.user_id=?`)
        .bind(match[1], user.id).first<SandboxOrder>();
      if (!order) throw new SandboxError(404, 'ORDER_NOT_FOUND');
      validOrder(order, env, production);
      return respond({ order_id: order.order_id, product_code: order.product_code, locale: order.locale, status: order.status, amount: order.amount });
    }
    throw new SandboxError(404, 'NOT_FOUND');
  } catch (error) {
    const status = error instanceof SandboxError ? error.status : error instanceof PayloadTooLargeError ? 413 : 500;
    const code = error instanceof SandboxError ? error.code : error instanceof PayloadTooLargeError ? 'TOO_LARGE' : error instanceof SyntaxError ? 'INVALID_INPUT' : 'INTERNAL_ERROR';
    console.warn(JSON.stringify({ event: production ? 'maya_payment_rejected' : 'maya_sandbox_rejected', code }));
    if (external) return new Response(`0|${code}`, { status, headers: { 'Cache-Control': 'no-store' } });
    return respond({ code, error: english ? `Payment request unavailable (${code}).` : `付款請求無法完成（${code}）。` }, error instanceof SyntaxError ? 400 : status);
  }
}
