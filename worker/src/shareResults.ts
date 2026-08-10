import {
  badRequest,
  clientIp,
  Env,
  json,
  rateLimit,
  readBody,
  tooManyRequests,
} from './utils';

const SITE_URL = 'https://www.crystalfield101.com/';
const API_URL = 'https://api.crystalfield101.com';
const MAX_IMAGE_BYTES = 1_600_000;
const SHARE_TTL_DAYS = 90;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PublicCard {
  name: string;
  position?: string;
}

interface CreateShareBody {
  deck_id?: unknown;
  deck_name?: unknown;
  spread_name?: unknown;
  cards?: unknown;
  summary?: unknown;
  image_base64?: unknown;
}

interface ShareRow {
  id: string;
  deck_id: string;
  deck_name: string;
  spread_name: string;
  cards_json: string;
  summary: string;
  image_mime: string;
  image_base64: string;
  expires_at: string;
}

function textValue(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeCards(value: unknown): PublicCard[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((entry) => {
    const card = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
    return {
      name: textValue(card.name, 80),
      position: textValue(card.position, 40) || undefined,
    };
  }).filter((card) => card.name);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] ?? char));
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function isApprovedCardImage(url: URL): boolean {
  return url.protocol === 'https:' && (
    url.hostname === 'images.pexels.com' ||
    url.hostname === 'www.crystalfield101.com' ||
    url.hostname === 'crystalfield101.com'
  );
}

export async function createShareResult(req: Request, env: Env): Promise<Response> {
  const limit = await rateLimit(env, 'share-create-ip', clientIp(req), 30, 3600);
  if (!limit.allowed) return tooManyRequests(req, env, '分享建立次數過多，請稍後再試');

  const body = await readBody<CreateShareBody>(req, 2_300_000);
  const deckId = textValue(body.deck_id, 60);
  const deckName = textValue(body.deck_name, 80);
  const spreadName = textValue(body.spread_name, 80);
  const summary = textValue(body.summary, 280);
  const cards = normalizeCards(body.cards);
  const rawImage = textValue(body.image_base64, 2_200_000);
  const imageBase64 = rawImage.replace(/^data:image\/jpeg;base64,/, '');

  if (!deckId || !deckName || !spreadName || !summary || cards.length === 0) {
    return badRequest(req, env, '分享資料不完整');
  }
  if (!/^[A-Za-z0-9_-]+$/.test(deckId)) return badRequest(req, env, '牌組格式錯誤');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return badRequest(req, env, '分享圖片格式錯誤');

  const estimatedBytes = Math.floor(imageBase64.length * 0.75);
  if (estimatedBytes < 1_000 || estimatedBytes > MAX_IMAGE_BYTES) {
    return badRequest(req, env, '分享圖片大小不符');
  }

  const id = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SHARE_TTL_DAYS * 86400_000);
  await env.DB.prepare('DELETE FROM share_results WHERE expires_at <= ?')
    .bind(createdAt.toISOString()).run();
  await env.DB.prepare(
    `INSERT INTO share_results
      (id, deck_id, deck_name, spread_name, cards_json, summary, image_mime, image_base64, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'image/jpeg', ?, ?, ?)`,
  ).bind(
    id, deckId, deckName, spreadName, JSON.stringify(cards), summary,
    imageBase64, createdAt.toISOString(), expiresAt.toISOString(),
  ).run();

  return json(req, env, {
    id,
    url: `${API_URL}/share/${id}`,
    expires_at: expiresAt.toISOString(),
  }, { status: 201 });
}

async function getShareRow(env: Env, id: string): Promise<ShareRow | null> {
  if (!ID_PATTERN.test(id)) return null;
  const row = await env.DB.prepare(
    `SELECT id, deck_id, deck_name, spread_name, cards_json, summary,
            image_mime, image_base64, expires_at
       FROM share_results WHERE id = ?`,
  ).bind(id).first<ShareRow>();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

export async function getSharePage(req: Request, env: Env, id: string): Promise<Response> {
  const row = await getShareRow(env, id);
  if (!row) return new Response('分享結果不存在或已過期', { status: 404 });

  const cards = normalizeCards(JSON.parse(row.cards_json));
  const title = `${row.deck_name}・${row.spread_name}｜晶域心語`;
  const description = `${cards.map((card) => card.name).join('、')} — ${row.summary}`.slice(0, 220);
  const canonical = `${API_URL}/share/${row.id}`;
  const image = `${canonical}/image`;
  const cardsHtml = cards.map((card) => `<li>${escapeHtml(card.position ? `${card.position}：${card.name}` : card.name)}</li>`).join('');
  const html = `<!doctype html><html lang="zh-Hant"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}"><meta name="robots" content="noindex,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:site_name" content="晶域心語">
<meta property="og:locale" content="zh_TW"><meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}">
<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1080"><meta property="og:image:height" content="1350">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${image}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0820;color:#f8edff;font-family:system-ui,sans-serif}.card{box-sizing:border-box;width:min(92vw,680px);padding:42px;border:1px solid #b99af155;border-radius:28px;background:linear-gradient(145deg,#201343,#100b28);box-shadow:0 20px 80px #0008}h1{color:#e9d18a}p,li{line-height:1.8;color:#e8ddf4}a{display:inline-block;margin-top:18px;padding:13px 24px;border-radius:999px;background:linear-gradient(90deg,#ae7df4,#d8b85b);color:#160b2e;text-decoration:none;font-weight:700}</style>
</head><body><main class="card"><p>晶域心語</p><h1>${escapeHtml(row.deck_name)}・${escapeHtml(row.spread_name)}</h1><ul>${cardsHtml}</ul><p>${escapeHtml(row.summary)}</p><a href="${SITE_URL}" rel="noopener noreferrer">進行免費占卜</a></main></body></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function getShareImage(req: Request, env: Env, id: string): Promise<Response> {
  const row = await getShareRow(env, id);
  if (!row) return new Response('not found', { status: 404 });
  return new Response(decodeBase64(row.image_base64), {
    headers: {
      'Content-Type': row.image_mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="crystalfield-${row.id}.jpg"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function getShareCardImage(req: Request, env: Env, url: URL): Promise<Response> {
  const deckId = textValue(url.searchParams.get('deck_id'), 60);
  const cardKey = textValue(url.searchParams.get('card_key'), 100);
  if (!deckId || !cardKey) return badRequest(req, env, '缺少牌卡參數');

  const row = await env.DB_CARDS.prepare(
    'SELECT image FROM cards WHERE deck_id = ? AND card_key = ?',
  ).bind(deckId, cardKey).first<{ image: string | null }>();
  if (!row?.image) return new Response('not found', { status: 404 });

  let source: URL;
  try { source = new URL(row.image); } catch { return new Response('not found', { status: 404 }); }
  if (!isApprovedCardImage(source)) return new Response('image host not allowed', { status: 403 });

  const upstream = await fetch(source.toString(), {
    headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png' },
    cf: { cacheTtl: 86400, cacheEverything: true },
  });
  const contentType = upstream.headers.get('Content-Type') ?? '';
  if (!upstream.ok || !contentType.startsWith('image/')) return new Response('image unavailable', { status: 502 });
  return new Response(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
