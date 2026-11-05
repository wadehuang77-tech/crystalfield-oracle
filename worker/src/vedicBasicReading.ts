import { verifyJwt } from './auth';
import { json, readBody, readSession, unauthorized, badRequest, type Env } from './utils';
import { englishVedicFreeResults } from '../../shared/vedicBasicReading';

// Guests need their signed chart token; members can read their complete basic guidance.
// Historical purchases remain available through the existing owner/order check.
export async function getVedicBasicReading(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env, true);

  const body = await readBody<{ order_id?: string; chart_id?: string; language?: string; chart_token?: string }>(req);
  if (!body.chart_id) return badRequest(req, env, '缺少星盤資料');
  const owned = await env.DB.prepare('SELECT user_id, chart_json, free_result_json FROM vedic_charts WHERE id = ?')
    .bind(body.chart_id).first<{user_id:string|null;chart_json:string;free_result_json:string}>();
  const token = body.chart_token ? await verifyJwt(body.chart_token, env.JWT_SECRET) : null;
  const tokenAccess = token?.sub === body.chart_id && token.email === 'vedic-chart@crystalfield.local';
  if (owned && ((user && owned.user_id === user.id) || (owned.user_id === null && tokenAccess))) {
    const full = body.language === 'en' ? englishVedicFreeResults(JSON.parse(owned.chart_json)) : JSON.parse(owned.free_result_json);
    const half = (section: typeof full.archetype) => ({...section, body: section.body.slice(0, Math.ceil(section.body.length / 2))});
    const results = user ? full : {archetype:half(full.archetype),talents:{...half(full.talents),items:full.talents.items.slice(0,1)},currentCycle:half(full.currentCycle)};
    return json(req, env, {chart_id:body.chart_id,results,preview:!user}, {headers:{'Cache-Control':'no-store'}});
  }
  if (!user) return unauthorized(req, env, '請先登入或重新計算星盤');
  type OrderRow = { user_id: string; status: string; item_id: string; picks_payload: string };
  const order = body.order_id
    ? await env.DB.prepare('SELECT user_id, status, item_id, picks_payload FROM orders WHERE id = ?')
      .bind(body.order_id).first<OrderRow>()
    // A returning member opens the chart without the checkout link, so look up their paid order for this chart.
    : await env.DB.prepare(`SELECT user_id, status, item_id, picks_payload FROM orders
        WHERE user_id = ? AND status = 'paid' AND item_id LIKE 'vedic%'
          AND CASE WHEN json_valid(picks_payload) THEN json_extract(picks_payload, '$.vedic_chart_id') END = ?
        ORDER BY created_at DESC LIMIT 1`)
      .bind(user.id, body.chart_id).first<OrderRow>();
  let linked: unknown;
  try { linked = JSON.parse(order?.picks_payload || '{}').vedic_chart_id; } catch { /* deny */ }
  if (!order || order.user_id !== user.id || order.status !== 'paid'
    || !order.item_id.startsWith('vedic_') || linked !== body.chart_id) {
    return unauthorized(req, env, '此星盤尚未完成付款解鎖');
  }
  const row = await env.DB.prepare('SELECT chart_json, free_result_json FROM vedic_charts WHERE id = ?')
    .bind(body.chart_id).first<{ chart_json: string; free_result_json: string }>();
  if (!row) return badRequest(req, env, '找不到星盤資料');
  const result = body.language === 'en' ? englishVedicFreeResults(JSON.parse(row.chart_json)) : JSON.parse(row.free_result_json);
  return json(req, env, { chart_id: body.chart_id, results: result }, { headers: { 'Cache-Control': 'no-store' } });
}
