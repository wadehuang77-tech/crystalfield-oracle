import { json, readBody, readSession, unauthorized, badRequest, type Env } from './utils';
import { englishVedicFreeResults } from '../../shared/vedicBasicReading';

// A paid order must belong to the signed-in member and the requested chart.
export async function getVedicBasicReading(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env, true);
  if (!user) return unauthorized(req, env, '請先登入');
  const body = await readBody<{ order_id?: string; chart_id?: string; language?: string }>(req);
  if (!body.order_id || !body.chart_id) return badRequest(req, env, '缺少訂單或星盤資料');
  const order = await env.DB.prepare('SELECT user_id, status, item_id, picks_payload FROM orders WHERE id = ?')
    .bind(body.order_id).first<{ user_id: string; status: string; item_id: string; picks_payload: string }>();
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
