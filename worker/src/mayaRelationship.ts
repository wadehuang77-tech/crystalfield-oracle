import { MAYA_RELATIONSHIP_PRODUCT } from '../../app/src/lib/mayaRelationship';
import { mayaRelationshipPaymentEnabled } from './mayaPayments';
import { mayaSessionFeatures } from './mayaFeatures';
import { isAllowedOrigin, json, readSession, type Env } from './utils';
import { premiumLiveEnabled, PremiumError, routePremiumReports } from './mayaPremiumLive';

export async function routeMayaRelationship(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const en = url.searchParams.get('locale') === 'en';
  const respond = (value: unknown, status = 200) => json(req, env, value, {
    status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
  const reject = (status: number, code: string, zh: string, english: string) => {
    console.warn(JSON.stringify({ event: 'maya_relationship_rejected', code }));
    return respond({ code, error: en ? english : zh }, status);
  };
  try {
    if (Object.keys(Object.fromEntries(url.searchParams)).some(key => key !== 'locale')
      || url.searchParams.has('locale') && !['en', 'zh-TW'].includes(url.searchParams.get('locale') ?? '')) {
      return reject(400, 'INVALID_INPUT', '語言或請求格式不符。', 'Invalid locale or request format.');
    }
    if (url.pathname === '/api/maya/relationship/config' && req.method === 'GET') {
      return respond({ product: MAYA_RELATIONSHIP_PRODUCT, payment: mayaRelationshipPaymentEnabled(env),
        reportAvailable: premiumLiveEnabled(env) && mayaRelationshipPaymentEnabled(env) });
    }
    if (req.method !== 'GET' && !isAllowedOrigin(req, env)) return reject(403, 'BAD_ORIGIN', '請求來源不受允許。', 'Request origin is not allowed.');
    const user = await readSession(req, env, true);
    if (!user) return reject(401, 'LOGIN_REQUIRED', '請先登入。', 'Please sign in first.');
    if (!(await mayaSessionFeatures(req, env, user)).member) return reject(503, 'FEATURE_DISABLED', '會員功能尚未開放。', 'Member features are unavailable.');
    const grants = async (entitlementId: string | null) => {
      if (!mayaRelationshipPaymentEnabled(env)) return respond({ entitlements: [] });
      const rows = await env.DB.prepare(`SELECT e.id,e.product_code FROM maya_relationship_entitlements e
        JOIN orders o ON o.id=e.order_id JOIN maya_relationship_payment_orders p ON p.order_id=o.id
        WHERE e.user_id=? AND (? IS NULL OR e.id=?) AND o.user_id=e.user_id AND p.user_id=e.user_id
          AND e.product_code=? AND o.item_id=e.product_code AND p.product_code=e.product_code
          AND o.amount=? AND o.item_type='maya' AND o.status='paid' AND o.paid_at IS NOT NULL
          AND e.status='active' AND e.source='verified_payment' AND p.payment_state='paid'
          AND o.ecpay_trade_no IS NOT NULL AND p.trade_no=o.ecpay_trade_no
          AND julianday(e.starts_at)<=julianday('now') AND (e.expires_at IS NULL OR julianday(e.expires_at)>julianday('now'))
        ORDER BY e.created_at DESC LIMIT 100`).bind(user.id, entitlementId, entitlementId,
          MAYA_RELATIONSHIP_PRODUCT.code, MAYA_RELATIONSHIP_PRODUCT.price).all<{ id: string; product_code: string }>();
      return rows.results;
    };
    if (url.pathname === '/api/maya/relationship/entitlements' && req.method === 'GET') {
      const rows = await grants(null);
      return rows instanceof Response ? rows : respond({ entitlements: rows });
    }
    if (url.pathname.startsWith('/api/maya/relationship/reports')) {
      if (premiumLiveEnabled(env) && mayaRelationshipPaymentEnabled(env)) {
        return await routePremiumReports(req, env, user.id, MAYA_RELATIONSHIP_PRODUCT.code, en ? 'en' : 'zh-TW', async id => {
          const current = await readSession(req, env, true);
          if (!current || current.id !== user.id) throw new PremiumError('LOGIN_REQUIRED', 401);
          const rows = await grants(id);
          if (rows instanceof Response || !rows[0]) throw new PremiumError('PAYMENT_REQUIRED', 403);
          const grant = await env.DB.prepare('SELECT order_id FROM maya_relationship_entitlements WHERE id=? AND user_id=?')
            .bind(id, user.id).first<{ order_id: string }>();
          if (!grant) throw new PremiumError('PAYMENT_REQUIRED', 403);
          return { id, order_id: grant.order_id, source: 'verified_payment' };
        });
      }
      return reject(503, 'RELATIONSHIP_REPORT_UNAVAILABLE', '十二篇雙人報告尚待完整規格，未開放生成或讀取。', 'The twelve-chapter relationship report awaits its full specification; generation and retrieval are unavailable.');
    }
    return reject(404, 'NOT_FOUND', '找不到資料。', 'Not found.');
  } catch (error) {
    if (error instanceof PremiumError) return reject(error.status, error.code,
      '報告請求未完成，請保留錯誤代碼並稍後重試；不會自動重新扣款或重複呼叫 AI。',
      'The report request could not be completed. Keep the error code and retry later; payment and AI calls are not repeated automatically.');
    return reject(500, 'INTERNAL_ERROR', '雙人商品服務暫時無法使用，請稍後重試。', 'Relationship service temporarily unavailable. Please retry.');
  }
}
