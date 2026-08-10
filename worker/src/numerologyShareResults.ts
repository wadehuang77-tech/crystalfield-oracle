import { verifyOrderToken } from './checkout';
import {
  badRequest,
  clientIp,
  Env,
  forbidden,
  json,
  rateLimit,
  readBody,
  readSession,
  tooManyRequests,
} from './utils';

const SITE_URL = 'https://www.crystalfield101.com/numerology';
const API_URL = 'https://api.crystalfield101.com';
const SHARE_TTL_DAYS = 90;
const CAPABILITY_TTL_DAYS = 365;
const MAX_IMAGE_BYTES = 1_600_000;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Group = 'profile' | 'missing' | 'grid' | 'oracle' | 'forecast' | 'bracelet' | 'summary';

const PLAN_NAMES: Record<string, string> = {
  numerology_basic: '基礎版',
  numerology_advanced: '進階版',
  numerology_full: '完整靈魂版',
  numerology_forecast: '完整流年報告',
};

const PLAN_GROUPS: Record<string, Group[]> = {
  numerology_basic: ['profile', 'missing', 'summary'],
  numerology_advanced: ['profile', 'missing', 'grid', 'oracle', 'bracelet', 'summary'],
  numerology_full: ['profile', 'missing', 'grid', 'oracle', 'bracelet', 'summary'],
  numerology_forecast: ['profile', 'forecast', 'summary'],
};

interface AccessProof { order_id?: unknown; order_token?: unknown }
interface AccessBody { proofs?: unknown; capabilities?: unknown }
interface AuthorizedItem { orderId: string; itemId: string }
interface ShareRow {
  id: string; section_key: string; numerology_number: number; section_name: string;
  plan_name: string; share_scope: string; summary: string; guidance: string;
  highlights_json: string; image_mime: string; image_base64: string;
  expires_at: string; revoked_at: string | null;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function looksSensitive(value: string): boolean {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
    || /\b(?:19|20)\d{2}[\/.年-]\d{1,2}[\/.月-]\d{1,2}日?\b/.test(value)
    || /\b(?:order|訂單)\s*[:#：]?\s*[A-Z0-9-]{8,}\b/i.test(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseProofs(value: unknown): Array<{ orderId: string; orderToken: string }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((entry) => {
    const proof = entry && typeof entry === 'object' ? entry as AccessProof : {};
    return { orderId: cleanText(proof.order_id, 80), orderToken: cleanText(proof.order_token, 4096) };
  }).filter((proof) => proof.orderId && proof.orderToken);
}

function parseCapabilities(value: unknown): string[] {
  return Array.isArray(value) ? value.slice(0, 8).map((token) => cleanText(token, 200)).filter(Boolean) : [];
}

async function authorizedItems(req: Request, env: Env, body: AccessBody): Promise<{ items: AuthorizedItem[]; issued: string[] }> {
  const user = await readSession(req, env);
  const found = new Map<string, AuthorizedItem>();
  const issued: string[] = [];

  if (user) {
    const rows = await env.DB.prepare(
      `SELECT id, item_id FROM orders
        WHERE user_id = ? AND status = 'paid' AND item_id LIKE 'numerology_%'`,
    ).bind(user.id).all<{ id: string; item_id: string }>();
    for (const row of rows.results ?? []) {
      if (PLAN_GROUPS[row.item_id]) found.set(row.id, { orderId: row.id, itemId: row.item_id });
    }
  }

  for (const token of parseCapabilities(body.capabilities)) {
    const tokenHash = await sha256(token);
    const row = await env.DB.prepare(
      `SELECT c.order_id, c.item_id
         FROM numerology_share_capabilities c
         JOIN orders o ON o.id = c.order_id
        WHERE c.token_hash = ? AND c.revoked_at IS NULL AND c.expires_at > datetime('now')
          AND o.status = 'paid' AND o.item_id = c.item_id`,
    ).bind(tokenHash).first<{ order_id: string; item_id: string }>();
    if (row && PLAN_GROUPS[row.item_id]) found.set(row.order_id, { orderId: row.order_id, itemId: row.item_id });
  }

  for (const proof of parseProofs(body.proofs)) {
    if (!await verifyOrderToken(proof.orderToken, env, proof.orderId)) continue;
    const row = await env.DB.prepare(
      `SELECT id, item_id FROM orders
        WHERE id = ? AND status = 'paid' AND item_id LIKE 'numerology_%'`,
    ).bind(proof.orderId).first<{ id: string; item_id: string }>();
    if (!row || !PLAN_GROUPS[row.item_id]) continue;
    const alreadyAuthorized = found.has(row.id);
    found.set(row.id, { orderId: row.id, itemId: row.item_id });

    if (alreadyAuthorized) continue;

    const capability = `${crypto.randomUUID()}.${crypto.randomUUID().replace(/-/g, '')}`;
    const now = new Date();
    const expires = new Date(now.getTime() + CAPABILITY_TTL_DAYS * 86400_000).toISOString();
    await env.DB.prepare(
      `INSERT INTO numerology_share_capabilities
        (id, token_hash, order_id, item_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), await sha256(capability), row.id, row.item_id, now.toISOString(), expires).run();
    issued.push(capability);
  }
  return { items: [...found.values()], issued };
}

function accessPayload(items: AuthorizedItem[]) {
  const groups = new Set<Group>();
  const planFor: Partial<Record<Group, string>> = {};
  for (const item of items) {
    for (const group of PLAN_GROUPS[item.itemId] ?? []) {
      groups.add(group);
      planFor[group] ??= PLAN_NAMES[item.itemId];
    }
  }
  return {
    groups: [...groups],
    plan_names: [...new Set(items.map((item) => PLAN_NAMES[item.itemId]).filter(Boolean))],
    plan_for: planFor,
  };
}

export async function getNumerologyShareAccess(req: Request, env: Env): Promise<Response> {
  const limit = await rateLimit(env, 'numerology-share-access', clientIp(req), 60, 3600);
  if (!limit.allowed) return tooManyRequests(req, env);
  const body = await readBody<AccessBody>(req, 64 * 1024);
  const access = await authorizedItems(req, env, body);
  return json(req, env, { ...accessPayload(access.items), issued_capabilities: access.issued });
}

function requiredGroup(sectionKey: string): Group | null {
  if (['life_path', 'emotional', 'wealth', 'soul_lesson', 'chakra'].includes(sectionKey)) return 'profile';
  if (sectionKey === 'report_summary') return 'summary';
  if (/^missing_[1-9]$/.test(sectionKey)) return 'missing';
  if (/^grid_[1-9]-[1-9]-[1-9]$/.test(sectionKey)) return 'grid';
  if (['oracle_blueprint', 'oracle_energy', 'oracle_blockpoint', 'oracle_crystal_grid', 'oracle_ritual'].includes(sectionKey)) return 'oracle';
  if (['forecast_summary', 'forecast_career', 'forecast_love', 'forecast_spiritual', 'forecast_warning', 'forecast_crystals'].includes(sectionKey)) return 'forecast';
  if (['crystal_grid', 'crystal_bracelet'].includes(sectionKey)) return 'bracelet';
  return null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function createNumerologyShareResult(req: Request, env: Env): Promise<Response> {
  const limit = await rateLimit(env, 'numerology-share-create', clientIp(req), 30, 3600);
  if (!limit.allowed) return tooManyRequests(req, env, '分享建立次數過多，請稍後再試');
  const body = await readBody<Record<string, unknown>>(req, 2_300_000);
  const access = await authorizedItems(req, env, body);
  const sectionKey = cleanText(body.section_key, 80);
  const group = requiredGroup(sectionKey);
  if (!group) return badRequest(req, env, '分享項目格式錯誤');
  const matching = access.items.find((item) => PLAN_GROUPS[item.itemId]?.includes(group));
  if (!matching) return forbidden(req, env, '此解析尚未完成付款解鎖');

  const number = Number(body.numerology_number);
  const sectionName = cleanText(body.section_name, 80);
  const summary = cleanText(body.summary, 220);
  const guidance = cleanText(body.guidance, 160);
  const scope = sectionKey === 'report_summary' ? 'report_summary' : 'single_section';
  const highlights = Array.isArray(body.highlights)
    ? body.highlights.slice(0, 3).map((value) => cleanText(value, 100)).filter(Boolean)
    : [];
  const imageBase64 = cleanText(body.image_base64, 2_200_000).replace(/^data:image\/jpeg;base64,/, '');
  if (!Number.isInteger(number) || number < 1 || number > 33 || !sectionName || !summary || !guidance) {
    return badRequest(req, env, '分享摘要資料不完整');
  }
  if ([sectionName, summary, guidance, ...highlights].some(looksSensitive)) {
    return badRequest(req, env, '分享摘要疑似包含個人或訂單資料');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return badRequest(req, env, '分享圖片格式錯誤');
  const imageBytes = Math.floor(imageBase64.length * 0.75);
  if (imageBytes < 1_000 || imageBytes > MAX_IMAGE_BYTES) return badRequest(req, env, '分享圖片大小不符');

  const now = new Date();
  const id = crypto.randomUUID();
  const revokeToken = `${crypto.randomUUID()}.${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(now.getTime() + SHARE_TTL_DAYS * 86400_000).toISOString();
  await env.DB.prepare(
    `INSERT INTO numerology_share_results
      (id, section_key, numerology_number, section_name, plan_name, share_scope,
       summary, guidance, highlights_json, image_mime, image_base64, revoke_token_hash,
       created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'image/jpeg', ?, ?, ?, ?)`,
  ).bind(
    id, sectionKey, number, sectionName, PLAN_NAMES[matching.itemId], scope,
    summary, guidance, JSON.stringify(highlights), imageBase64, await sha256(revokeToken),
    now.toISOString(), expiresAt,
  ).run();
  return json(req, env, {
    id, url: `${API_URL}/numerology/share/${id}`, revoke_token: revokeToken,
    expires_at: expiresAt, issued_capabilities: access.issued,
  }, { status: 201 });
}

async function getRow(env: Env, id: string): Promise<ShareRow | null> {
  if (!ID_PATTERN.test(id)) return null;
  const row = await env.DB.prepare(
    `SELECT id, section_key, numerology_number, section_name, plan_name, share_scope,
            summary, guidance, highlights_json, image_mime, image_base64, expires_at, revoked_at
       FROM numerology_share_results WHERE id = ?`,
  ).bind(id).first<ShareRow>();
  return row && !row.revoked_at && Date.parse(row.expires_at) > Date.now() ? row : null;
}

export async function getNumerologySharePage(req: Request, env: Env, id: string): Promise<Response> {
  const row = await getRow(env, id);
  if (!row) return new Response('分享結果不存在、已撤銷或已過期', { status: 404 });
  const title = `我的生命靈數指引｜${row.section_name}｜晶域心語`;
  const description = `生命靈數 ${row.numerology_number}：${row.summary}`.slice(0, 220);
  const canonical = `${API_URL}/numerology/share/${row.id}`;
  const image = `${canonical}/image`;
  const highlights = (JSON.parse(row.highlights_json) as unknown[]).map((value) => cleanText(value, 100)).filter(Boolean);
  const highlightHtml = highlights.map((value) => `<li>${escapeHtml(value)}</li>`).join('');
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}">
<meta name="robots" content="noindex,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="晶域心語"><meta property="og:locale" content="zh_TW">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1080"><meta property="og:image:height" content="1350">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${image}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0820;color:#f8edff;font-family:system-ui,sans-serif}.card{box-sizing:border-box;width:min(92vw,680px);padding:42px;border:1px solid #b99af155;border-radius:28px;background:linear-gradient(145deg,#28134d,#0d1832);box-shadow:0 20px 80px #0008}.number{font:700 72px serif;color:#efd486}h1{color:#f2dd9b}p,li{line-height:1.8;color:#e8ddf4}a{display:inline-block;margin-top:18px;padding:13px 24px;border-radius:999px;background:linear-gradient(90deg,#ae7df4,#d8b85b);color:#160b2e;text-decoration:none;font-weight:700}</style>
</head><body><main class="card"><p>晶域心語・我的生命靈數指引</p><div class="number">${row.numerology_number}</div><h1>${escapeHtml(row.section_name)}</h1><p>${escapeHtml(row.summary)}</p>${highlightHtml ? `<ul>${highlightHtml}</ul>` : ''}<p>${escapeHtml(row.guidance)}</p><a href="${SITE_URL}" rel="noopener noreferrer">探索你的靈魂數字</a></main></body></html>`;
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'public, max-age=300',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
  } });
}

export async function getNumerologyShareImage(req: Request, env: Env, id: string): Promise<Response> {
  const row = await getRow(env, id);
  if (!row) return new Response('not found', { status: 404 });
  return new Response(decodeBase64(row.image_base64), { headers: {
    'Content-Type': row.image_mime, 'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': `inline; filename="crystalfield-numerology-${row.id}.jpg"`,
    'X-Content-Type-Options': 'nosniff',
  } });
}

export async function revokeNumerologyShare(req: Request, env: Env, id: string): Promise<Response> {
  if (!ID_PATTERN.test(id)) return badRequest(req, env, '分享 ID 格式錯誤');
  const body = await readBody<{ revoke_token?: unknown }>(req);
  const token = cleanText(body.revoke_token, 200);
  if (!token) return forbidden(req, env, '缺少撤銷憑證');
  const result = await env.DB.prepare(
    `UPDATE numerology_share_results SET revoked_at = ?
      WHERE id = ? AND revoke_token_hash = ? AND revoked_at IS NULL`,
  ).bind(new Date().toISOString(), id, await sha256(token)).run();
  if (!result.meta.changes) return forbidden(req, env, '撤銷憑證錯誤');
  return json(req, env, { ok: true });
}
