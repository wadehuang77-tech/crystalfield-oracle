import { json, readBody, readSession, unauthorized, badRequest, type Env } from './utils';
import { englishVedicFreeResults } from '../../shared/vedicBasicReading';

// Free personal guidance still requires the signed-in chart owner.
export async function getVedicBasicReading(req: Request, env: Env): Promise<Response> {
  const user = await readSession(req, env, true);
  if (!user) return unauthorized(req, env, 'LOGIN_REQUIRED');
  const body = await readBody<{ order_id?: string; chart_id?: string; language?: string }>(req);
  if (!body.chart_id) return badRequest(req, env, 'CHART_REQUIRED');
  const row = await env.DB.prepare('SELECT user_id, chart_json, free_result_json FROM vedic_charts WHERE id = ?')
    .bind(body.chart_id).first<{ user_id: string | null; chart_json: string; free_result_json: string }>();
  if (!row) return badRequest(req, env, 'CHART_NOT_FOUND');
  if (row.user_id !== user.id) {
    // Preserve access for historical guest charts attached to a paid member order.
    const order = body.order_id ? await env.DB.prepare('SELECT user_id, status, item_id, picks_payload FROM orders WHERE id = ?')
      .bind(body.order_id).first<{ user_id: string; status: string; item_id: string; picks_payload: string }>() : null;
    let linked: unknown;
    try { linked = JSON.parse(order?.picks_payload || '{}').vedic_chart_id; } catch { /* deny */ }
    if (!order || order.user_id !== user.id || order.status !== 'paid' || !order.item_id.startsWith('vedic_') || linked !== body.chart_id) return unauthorized(req, env, 'CHART_ACCESS_DENIED');
  }
  const result = body.language === 'en' ? englishVedicFreeResults(JSON.parse(row.chart_json)) : JSON.parse(row.free_result_json);
  return json(req, env, { chart_id: body.chart_id, results: result }, { headers: { 'Cache-Control': 'no-store' } });
}
