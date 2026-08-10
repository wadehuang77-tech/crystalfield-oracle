import { verifyOrderToken } from './checkout';
import { REPORT_VERSION } from './humanDesignReport';
import {
  badRequest, clientIp, Env, forbidden, json, rateLimit, readBody, readSession, tooManyRequests,
} from './utils';

const SITE_URL = 'https://www.crystalfield101.com/human-design';
const API_URL = 'https://api.crystalfield101.com';
const SHARE_TTL_DAYS = 90;
const CAPABILITY_TTL_DAYS = 365;
const MAX_IMAGE_BYTES = 1_600_000;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Group = 'identity' | 'core' | 'full' | 'summary';
type Proof = { order_id?: unknown; order_token?: unknown };
type AccessBody = { chart_id?: unknown; proofs?: unknown; capabilities?: unknown };
type Item = { orderId: string; itemId: string };

interface ChartRow {
  id: string; user_id: string | null; hd_type: string; hd_profile: string; hd_authority: string; chart_data: string;
}

interface ShareRow {
  id: string; hd_type: string; hd_profile: string; hd_authority: string; section_name: string;
  result_label: string; summary: string; guidance: string; highlights_json: string;
  image_mime: string; image_base64: string; expires_at: string; revoked_at: string | null;
}

const PLAN_NAMES: Record<string, string> = {
  human_design_basic: '核心解析',
  human_design_full: '專屬人生使用說明書',
  human_design_bundle: '完整組合方案',
};

const PLAN_GROUPS: Record<string, Group[]> = {
  human_design_basic: ['identity', 'core', 'summary'],
  human_design_full: ['identity', 'full', 'summary'],
  human_design_bundle: ['identity', 'core', 'full', 'summary'],
};

const CORE_KEYS = new Set(['core_type', 'core_profile', 'core_strategy', 'core_authority', 'core_definition', 'core_ai-summary', 'core_basic-talent', 'core_ai-tip']);
const TYPE_LABELS: Record<string, string> = {
  generator: '生產者', 'manifesting-generator': '顯示生產者', projector: '投射者', manifestor: '顯化者', reflector: '反映者',
};
const TYPE_STRATEGIES: Record<string, string> = {
  generator: '等待回應', 'manifesting-generator': '等待回應，然後告知', projector: '等待邀請', manifestor: '行動前告知', reflector: '等待月亮週期（28天）',
};
const AUTHORITY_LABELS: Record<string, string> = {
  sacral: '薦骨權威', emotional: '情緒（太陽神經叢）權威', splenic: '脾臟（直覺）權威', ego: '自我（意志力）權威',
  'self-projected': 'G中心（自我投射）權威', lunar: '月亮（無固定）權威',
};
const PROFILE_LABELS: Record<string, string> = {
  '1/3': '研究者 / 殉道者', '1/4': '研究者 / 機會主義者', '2/4': '隱士 / 機會主義者', '2/5': '隱士 / 異端',
  '3/5': '殉道者 / 異端', '3/6': '殉道者 / 榜樣', '4/6': '機會主義者 / 榜樣', '4/1': '機會主義者 / 研究者',
  '5/1': '異端 / 研究者', '5/2': '異端 / 隱士', '6/2': '榜樣 / 隱士', '6/3': '榜樣 / 殉道者',
};

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseProofs(value: unknown): Array<{ orderId: string; orderToken: string }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((entry) => {
    const proof = entry && typeof entry === 'object' ? entry as Proof : {};
    return { orderId: clean(proof.order_id, 80), orderToken: clean(proof.order_token, 4096) };
  }).filter((proof) => proof.orderId && proof.orderToken);
}

function parseCapabilities(value: unknown): string[] {
  return Array.isArray(value) ? value.slice(0, 6).map((token) => clean(token, 200)).filter(Boolean) : [];
}

async function getChart(env: Env, chartId: string): Promise<ChartRow | null> {
  if (!ID_PATTERN.test(chartId)) return null;
  return env.DB.prepare(
    `SELECT id, user_id, hd_type, hd_profile, hd_authority, chart_data FROM hd_charts WHERE id = ? LIMIT 1`,
  ).bind(chartId).first<ChartRow>();
}

async function bindOrder(env: Env, chartId: string, item: Item, allowRebind = false): Promise<string | null> {
  const existing = await env.DB.prepare(
    `SELECT chart_id FROM hd_share_capabilities WHERE order_id = ? LIMIT 1`,
  ).bind(item.orderId).first<{ chart_id: string }>();
  if (existing && existing.chart_id !== chartId && !allowRebind) return null;
  const token = `${crypto.randomUUID()}.${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CAPABILITY_TTL_DAYS * 86400_000).toISOString();
  if (existing) {
    await env.DB.prepare(
      `UPDATE hd_share_capabilities
          SET token_hash = ?, chart_id = ?, item_id = ?, expires_at = ?, revoked_at = NULL
        WHERE order_id = ?`,
    ).bind(await sha256(token), chartId, item.itemId, expiresAt, item.orderId).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO hd_share_capabilities (id, token_hash, order_id, chart_id, item_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), await sha256(token), item.orderId, chartId, item.itemId, now.toISOString(), expiresAt).run();
  }
  return token;
}

async function authorizedItems(req: Request, env: Env, chartId: string, body: AccessBody): Promise<{ items: Item[]; issued: string[] }> {
  const found = new Map<string, Item>();
  const issued: string[] = [];
  const user = await readSession(req, env);
  const chart = await getChart(env, chartId);

  for (const token of parseCapabilities(body.capabilities)) {
    const row = await env.DB.prepare(
      `SELECT c.order_id, c.item_id FROM hd_share_capabilities c
       JOIN orders o ON o.id = c.order_id
       WHERE c.token_hash = ? AND c.chart_id = ? AND c.revoked_at IS NULL
         AND datetime(c.expires_at) > datetime('now') AND o.status = 'paid' AND o.item_id = c.item_id`,
    ).bind(await sha256(token), chartId).first<{ order_id: string; item_id: string }>();
    if (row && PLAN_GROUPS[row.item_id]) found.set(row.order_id, { orderId: row.order_id, itemId: row.item_id });
  }

  // Signed-in members may use their own paid plans on charts owned by the same account.
  // Do not bind every account order to the first chart opened: that made later unlocked charts unshareable.
  if (user && chart?.user_id === user.id) {
    const rows = await env.DB.prepare(
      `SELECT id, item_id FROM orders WHERE user_id = ? AND status = 'paid' AND item_id LIKE 'human_design_%'`,
    ).bind(user.id).all<{ id: string; item_id: string }>();
    for (const row of rows.results ?? []) {
      if (PLAN_GROUPS[row.item_id]) found.set(row.id, { orderId: row.id, itemId: row.item_id });
    }
  }

  const proofCandidates = new Map<string, Item>();
  for (const proof of parseProofs(body.proofs)) {
    if (!await verifyOrderToken(proof.orderToken, env, proof.orderId)) continue;
    const row = await env.DB.prepare(
      `SELECT id, item_id FROM orders WHERE id = ? AND status = 'paid' AND item_id LIKE 'human_design_%'`,
    ).bind(proof.orderId).first<{ id: string; item_id: string }>();
    if (row && PLAN_GROUPS[row.item_id]) proofCandidates.set(row.id, { orderId: row.id, itemId: row.item_id });
  }

  // A valid signed order proof is authoritative for guests and may repair a capability
  // that an earlier release accidentally bound to another chart.
  for (const item of proofCandidates.values()) {
    if (user && found.has(item.orderId)) continue;
    const token = await bindOrder(env, chartId, item, true);
    if (!token) continue;
    found.set(item.orderId, item);
    issued.push(token);
  }
  return { items: [...found.values()], issued };
}

export async function hasHumanDesignPaidGroup(
  req: Request,
  env: Env,
  chartId: string,
  body: AccessBody,
  group: Group,
): Promise<boolean> {
  if (!await getChart(env, chartId)) return false;
  const access = await authorizedItems(req, env, chartId, body);
  return access.items.some((item) => PLAN_GROUPS[item.itemId]?.includes(group));
}

function accessPayload(items: Item[]) {
  const groups = new Set<Group>();
  const planFor: Partial<Record<Group, string>> = {};
  for (const item of items) for (const group of PLAN_GROUPS[item.itemId] ?? []) {
    groups.add(group); planFor[group] ??= PLAN_NAMES[item.itemId];
  }
  return { groups: [...groups], plan_names: [...new Set(items.map((item) => PLAN_NAMES[item.itemId]))], plan_for: planFor };
}

export async function getHumanDesignShareAccess(req: Request, env: Env): Promise<Response> {
  const limit = await rateLimit(env, 'hd-share-access', clientIp(req), 60, 3600);
  if (!limit.allowed) return tooManyRequests(req, env);
  const body = await readBody<AccessBody>(req, 64 * 1024);
  const chartId = clean(body.chart_id, 80);
  if (!await getChart(env, chartId)) return badRequest(req, env, '找不到人類圖資料');
  const access = await authorizedItems(req, env, chartId, body);
  return json(req, env, { ...accessPayload(access.items), issued_capabilities: access.issued });
}

function requiredGroup(sectionKey: string): Group | null {
  if (sectionKey === 'report_summary') return 'summary';
  if (sectionKey === 'core_type') return 'identity';
  if (CORE_KEYS.has(sectionKey)) return 'core';
  if (/^full_[a-z0-9_-]{1,60}$/.test(sectionKey)) return 'full';
  return null;
}

function parseChart(row: ChartRow): Record<string, unknown> {
  try { const parsed = JSON.parse(row.chart_data); return parsed && typeof parsed === 'object' ? parsed : {}; }
  catch { return {}; }
}

function safeType(row: ChartRow) { return TYPE_LABELS[row.hd_type] ?? '人類圖能量類型'; }
function safeProfile(row: ChartRow) { return /^([1-6])\/([1-6])$/.test(row.hd_profile) ? row.hd_profile : '人生角色'; }
function safeAuthority(row: ChartRow) { return AUTHORITY_LABELS[row.hd_authority] ?? '內在權威'; }
function stripPrivate(value: string, privateValues: string[] = []) {
  let result = value;
  for (const privateValue of privateValues.map((item) => item.trim()).filter(Boolean)) result = result.split(privateValue).join('');
  return result
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
    .replace(/\b(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, '')
    .replace(/(?:19|20)\d{2}年\d{1,2}月\d{1,2}日/g, '')
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/g, '')
    .replace(/(?:\+?886[- ]?)?0?9\d{2}[- ]?\d{3}[- ]?\d{3}/g, '');
}

function firstSentence(value: string, max = 190): string {
  const normalized = clean(value, 2000);
  const sentence = normalized.split(/(?<=[。！？!?.])/u)[0] || normalized;
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence;
}

function coreContent(sectionKey: string, row: ChartRow, chart: Record<string, unknown>) {
  const typeName = safeType(row);
  const profile = safeProfile(row);
  const profileName = PROFILE_LABELS[profile] ?? '';
  const authorityName = safeAuthority(row);
  const strategy = TYPE_STRATEGIES[row.hd_type] ?? '依循你的正確策略';
  const centers = Array.isArray(chart.definedCenters) ? chart.definedCenters.length : 0;
  const definition = centers === 0 ? '無定義（反映者）' : centers <= 3 ? '單一定義' : centers <= 6 ? '雙重定義' : '多重定義';
  const map: Record<string, { name: string; result: string; summary: string; guidance: string }> = {
    core_type: { name: '能量類型 Type', result: typeName, summary: `你的能量類型是${typeName}，適合以符合自身節奏的方式投入生命。`, guidance: strategy ? `記得運用「${strategy}」回應生活。` : '信任你的自然能量節奏。' },
    core_profile: { name: '人生角色 Profile', result: `${profile}${profileName ? ` ${profileName}` : ''}`, summary: `人生角色 ${profile} 描繪了你學習、互動與影響世界的自然方式。`, guidance: '允許自己按照真實角色成長，不必迎合別人的生命腳本。' },
    core_strategy: { name: '人生策略 Strategy', result: strategy, summary: `「${strategy}」是降低阻力、讓能量順暢流動的重要導航。`, guidance: '在行動前回到策略，答案會比頭腦的催促更清晰。' },
    core_authority: { name: '內在權威 Authority', result: authorityName, summary: `${authorityName}提醒你，真正可靠的決定來自身體與內在清明。`, guidance: '給自己足夠空間，等待內在訊號變得清楚。' },
    core_definition: { name: '定義 Definition', result: definition, summary: `${definition}呈現了你內在能量連結與整合資訊的方式。`, guidance: '理解自己的整合節奏，就不必用他人的方式要求自己。' },
    'core_ai-summary': { name: '人格能量摘要', result: typeName, summary: `身為${typeName}，你的能量會在依循「${strategy}」時展現更自然的流動。`, guidance: '看見自己的設計，是停止自我懷疑的第一步。' },
    'core_basic-talent': { name: '天賦與優勢', result: typeName, summary: `身為${typeName}，你的天賦會在正確的邀請、回應與環境中自然展現。`, guidance: '把能量留給真正適合你的事，你的優勢會更明亮。' },
    'core_ai-tip': { name: '當下行動指引', result: strategy, summary: `今天先回到「${strategy}」，再決定下一個值得投入的行動。`, guidance: '不必急著證明自己，對齊之後再前進。' },
  };
  return map[sectionKey] ?? null;
}

async function fullContent(env: Env, chartId: string, sectionKey: string) {
  const sectionId = sectionKey.slice('full_'.length);
  const row = await env.DB.prepare(
    `SELECT s.title, s.body, r.birth_date, r.birth_time, r.birth_city, r.user_email FROM hd_full_report_sections s
     JOIN hd_full_reports r ON r.id = s.report_id
     WHERE r.chart_id = ? AND r.report_version = ? AND s.section_id = ? LIMIT 1`,
  ).bind(chartId, REPORT_VERSION, sectionId).first<{ title: string; body: string; birth_date: string; birth_time: string; birth_city: string; user_email: string }>();
  if (!row) return null;
  const guidance: Record<string, string> = {
    centers: '照顧開放中心的界線，也信任已定義中心的穩定力量。', gates: '讓天賦成熟展現，而不必被陰影模式定義。', channels: '你的穩定能量迴路，是獨一無二的生命資源。',
    personality: '理解自己之後，選擇會變得更溫柔而清楚。', prescription: '一次實踐一個小步驟，能量便會開始重新校準。', career: '適合你的工作方式，會讓天賦與生命力一起流動。',
    love: '在關係中尊重彼此設計，愛才能保有空間與真實。', wealth: '用符合權威的方式決策，豐盛會建立在穩定價值上。', mission: '你的生命使命不必追趕，它會在對齊時自然展開。',
  };
  const publicBody = stripPrivate(row.body, [row.birth_date, row.birth_time, row.birth_city, row.user_email]);
  return { name: row.title.replace(/^AI\s+/, ''), result: sectionId, summary: firstSentence(publicBody), guidance: guidance[sectionId] ?? '信任你的獨特設計，讓這份指引落實在日常。' };
}

async function fullSummaryHighlights(env: Env, chartId: string): Promise<string[]> {
  const rows = await env.DB.prepare(
    `SELECT s.title, s.body, r.birth_date, r.birth_time, r.birth_city, r.user_email FROM hd_full_report_sections s
     JOIN hd_full_reports r ON r.id = s.report_id
     WHERE r.chart_id = ? AND r.report_version = ?
     ORDER BY s.sort_order ASC LIMIT 3`,
  ).bind(chartId, REPORT_VERSION).all<{ title: string; body: string; birth_date: string; birth_time: string; birth_city: string; user_email: string }>();
  return (rows.results ?? []).map((row) => {
    const publicBody = stripPrivate(row.body, [row.birth_date, row.birth_time, row.birth_city, row.user_email]);
    return `${row.title.replace(/^AI\s+/, '')}：${firstSentence(publicBody, 72)}`;
  });
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

export async function createHumanDesignShareResult(req: Request, env: Env): Promise<Response> {
  const limit = await rateLimit(env, 'hd-share-create', clientIp(req), 30, 3600);
  if (!limit.allowed) return tooManyRequests(req, env, '分享建立次數過多，請稍後再試');
  const body = await readBody<Record<string, unknown>>(req, 2_300_000);
  const chartId = clean(body.chart_id, 80);
  const sectionKey = clean(body.section_key, 80);
  const chartRow = await getChart(env, chartId);
  const group = requiredGroup(sectionKey);
  if (!chartRow || !group) return badRequest(req, env, '分享項目格式錯誤');
  const access = await authorizedItems(req, env, chartId, body);
  const eligible = access.items.filter((item) => PLAN_GROUPS[item.itemId]?.includes(group));
  const matching = eligible.sort((a, b) => {
    const rank: Record<string, number> = { human_design_bundle: 3, human_design_full: 2, human_design_basic: 1 };
    return (rank[b.itemId] ?? 0) - (rank[a.itemId] ?? 0);
  })[0];
  if (!matching) return forbidden(req, env, '此解析尚未完成付款解鎖');
  const chart = parseChart(chartRow);
  let content = group === 'full' ? await fullContent(env, chartId, sectionKey) : coreContent(sectionKey === 'report_summary' ? 'core_type' : sectionKey, chartRow, chart);
  let highlights: string[] = [];
  if (sectionKey === 'report_summary') {
    content = coreContent('core_type', chartRow, chart);
    const hasFull = access.items.some((item) => PLAN_GROUPS[item.itemId]?.includes('full'));
    highlights = hasFull ? await fullSummaryHighlights(env, chartId) : [];
    if (!highlights.length) {
      highlights = [
        `人生角色 ${safeProfile(chartRow)}`,
        `內在權威 ${safeAuthority(chartRow)}`,
        `人生策略 ${TYPE_STRATEGIES[chartRow.hd_type] ?? '依循你的正確策略'}`,
      ].filter((value) => !value.endsWith(' '));
    }
  }
  if (!content?.summary || !content.result) return badRequest(req, env, '此報告項目尚未生成');
  const imageBase64 = clean(body.image_base64, 2_200_000).replace(/^data:image\/jpeg;base64,/, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return badRequest(req, env, '分享圖片格式錯誤');
  const imageBytes = Math.floor(imageBase64.length * .75);
  if (imageBytes < 1_000 || imageBytes > MAX_IMAGE_BYTES) return badRequest(req, env, '分享圖片大小不符');
  const now = new Date(); const id = crypto.randomUUID();
  const revokeToken = `${crypto.randomUUID()}.${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(now.getTime() + SHARE_TTL_DAYS * 86400_000).toISOString();
  const typeName = safeType(chartRow);
  const authorityName = safeAuthority(chartRow);
  await env.DB.prepare(
    `INSERT INTO hd_share_results
      (id, chart_id, section_key, hd_type, hd_profile, hd_authority, section_name, result_label,
       plan_name, share_scope, summary, guidance, highlights_json, image_mime, image_base64,
       revoke_token_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'image/jpeg', ?, ?, ?, ?)`,
  ).bind(id, chartId, sectionKey, typeName, safeProfile(chartRow), authorityName, content.name, content.result,
    PLAN_NAMES[matching.itemId], sectionKey === 'report_summary' ? 'report_summary' : 'single_section',
    clean(content.summary, 220), clean(content.guidance, 160), JSON.stringify(highlights.slice(0, 3)), imageBase64,
    await sha256(revokeToken), now.toISOString(), expiresAt).run();
  return json(req, env, { id, url: `${API_URL}/human-design/share/${id}`, revoke_token: revokeToken, expires_at: expiresAt, issued_capabilities: access.issued }, { status: 201 });
}

async function getRow(env: Env, id: string): Promise<ShareRow | null> {
  if (!ID_PATTERN.test(id)) return null;
  const row = await env.DB.prepare(
    `SELECT id, hd_type, hd_profile, hd_authority, section_name, result_label, summary, guidance,
            highlights_json, image_mime, image_base64, expires_at, revoked_at FROM hd_share_results WHERE id = ?`,
  ).bind(id).first<ShareRow>();
  return row && !row.revoked_at && Date.parse(row.expires_at) > Date.now() ? row : null;
}

export async function getHumanDesignSharePage(req: Request, env: Env, id: string): Promise<Response> {
  const row = await getRow(env, id);
  if (!row) return new Response('分享結果不存在、已撤銷或已過期', { status: 404 });
  const title = `我的人類圖能量藍圖｜${row.section_name}｜晶域心語`;
  const description = `${row.hd_type}・${row.hd_profile}：${row.summary}`.slice(0, 220);
  const canonical = `${API_URL}/human-design/share/${row.id}`;
  const image = `${canonical}/image`;
  const highlights = (JSON.parse(row.highlights_json) as unknown[]).map((value) => clean(value, 100)).filter(Boolean);
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta name="robots" content="noindex,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="晶域心語"><meta property="og:locale" content="zh_TW"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1080"><meta property="og:image:height" content="1350"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${image}"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070c1a;color:#edf8ff;font-family:system-ui,sans-serif}.card{box-sizing:border-box;width:min(92vw,680px);padding:42px;border:1px solid #67e8f955;border-radius:28px;background:linear-gradient(145deg,#17204d,#10152e);box-shadow:0 20px 80px #0008}.type{font:700 54px serif;color:#9fe7ff}h1{color:#f2dd9b}p,li{line-height:1.8;color:#dceeff}a{display:inline-block;margin-top:18px;padding:13px 24px;border-radius:999px;background:linear-gradient(90deg,#6fb8ff,#e8cf75);color:#07101f;text-decoration:none;font-weight:700}</style></head><body><main class="card"><p>晶域心語・我的人類圖能量藍圖</p><div class="type">${escapeHtml(row.hd_type)}</div><p>${escapeHtml(row.hd_profile)}・${escapeHtml(row.hd_authority)}</p><h1>${escapeHtml(row.section_name)}</h1><p>${escapeHtml(row.summary)}</p>${highlights.length ? `<ul>${highlights.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>` : ''}<p>${escapeHtml(row.guidance)}</p><a href="${SITE_URL}" rel="noopener noreferrer">探索你獨一無二的能量設計</a></main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'public, max-age=300', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' } });
}

export async function getHumanDesignShareImage(req: Request, env: Env, id: string): Promise<Response> {
  const row = await getRow(env, id); if (!row) return new Response('not found', { status: 404 });
  return new Response(decodeBase64(row.image_base64), { headers: { 'Content-Type': row.image_mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Disposition': `inline; filename="crystalfield-human-design-${row.id}.jpg"`, 'X-Content-Type-Options': 'nosniff' } });
}

export async function revokeHumanDesignShare(req: Request, env: Env, id: string): Promise<Response> {
  if (!ID_PATTERN.test(id)) return badRequest(req, env, '分享 ID 格式錯誤');
  const body = await readBody<{ revoke_token?: unknown }>(req); const token = clean(body.revoke_token, 200);
  if (!token) return forbidden(req, env, '缺少撤銷憑證');
  const result = await env.DB.prepare(`UPDATE hd_share_results SET revoked_at = ? WHERE id = ? AND revoke_token_hash = ? AND revoked_at IS NULL`).bind(new Date().toISOString(), id, await sha256(token)).run();
  if (!result.meta.changes) return forbidden(req, env, '撤銷憑證錯誤');
  return json(req, env, { ok: true });
}
