import { verifyOrderToken } from './checkout';
import { hasActiveMembership } from './subscriptions';
import {
  badRequest,
  clientIp,
  Env,
  forbidden,
  json,
  readBody,
  readSession,
  unauthorized,
  validEmail,
} from './utils';

interface SpreadDef {
  deck_id: string;
  card_count: number;
  free?: boolean;
}

const SPREADS: Record<string, SpreadDef> = {
  tarot_single:           { deck_id: 'tarot',           card_count: 1, free: true },
  osho_single:            { deck_id: 'osho',            card_count: 1, free: true },
  lightworker_single:     { deck_id: 'lightworker',     card_count: 1, free: true },
  unicorns_single:        { deck_id: 'unicorns',        card_count: 1, free: true },
  egyptian_single:        { deck_id: 'egyptian_gods',   card_count: 1, free: true },
  dragons_single:         { deck_id: 'dragons',         card_count: 1, free: true },
  work_your_light_single: { deck_id: 'work_your_light', card_count: 1, free: true },

  tarot_three:            { deck_id: 'tarot',           card_count: 3 },
  tarot_celtic:           { deck_id: 'tarot',           card_count: 10 },
  tarot_pastlife:         { deck_id: 'tarot',           card_count: 7 },
  osho_three:             { deck_id: 'osho',            card_count: 3 },
  celtic_cross:           { deck_id: 'lightworker',     card_count: 10 },
  cosmic_cross:           { deck_id: 'work_your_light', card_count: 11 },
  dragons_three:          { deck_id: 'dragons',         card_count: 3 },
  unicorns_three:         { deck_id: 'unicorns',        card_count: 3 },
  egyptian_pastlife:      { deck_id: 'egyptian_gods',   card_count: 7 },
};

export async function listDecks(req: Request, env: Env): Promise<Response> {
  const result = await env.DB_CARDS.prepare(
    `SELECT id, name, card_count FROM decks ORDER BY id`,
  ).all();
  return json(req, env, { decks: result.results ?? [] });
}

export async function getDeckPreview(
  req: Request,
  env: Env,
  deckId: string,
): Promise<Response> {
  const result = await env.DB_CARDS.prepare(
    `SELECT id, deck_id, card_key, position, name, name_secondary, image,
            preview_payload, gated_payload
     FROM cards WHERE deck_id = ? ORDER BY position`,
  ).bind(deckId).all<{
    id: string; deck_id: string; card_key: string; position: number;
    name: string; name_secondary: string | null; image: string | null;
    preview_payload: string; gated_payload: string;
  }>();

  if (!result.results || result.results.length === 0) {
    return json(req, env, { error: 'deck not found', deck_id: deckId }, { status: 404 });
  }

  const cards = result.results.map((row) => {
    const gated = parseJson(row.gated_payload);
    return {
      id: row.id,
      deck_id: row.deck_id,
      card_key: row.card_key,
      position: row.position,
      name: row.name,
      name_secondary: row.name_secondary,
      image: row.image,
      preview: parseJson(row.preview_payload),
      ...buildExcerpts(row.deck_id, gated),
    };
  });
  return json(req, env, { deck_id: deckId, cards });
}

const EXCERPT_RATIO = 0.3;
const LIGHTWORKER_EXCERPT_RATIO = 0.3;
const EXCERPT_MIN = 20;

function clipExcerpt(text: string, ratio = EXCERPT_RATIO): string {
  const t = text.trim();
  const target = Math.max(EXCERPT_MIN, Math.floor(t.length * ratio));
  if (t.length <= target) return t;
  return t.slice(0, target).trimEnd() + '…';
}

function pickFirstString(value: unknown): string | null {
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length >= 20 ? t : null;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const found = pickFirstString(v);
      if (found) return found;
    }
  }
  return null;
}

function buildExcerpts(
  deckId: string,
  gated: Record<string, unknown>,
): {
  preview_excerpt?: string;
  upright_excerpt?: string;
  reversed_excerpt?: string;
} {
  if (deckId === 'tarot') {
    const u = typeof gated.uprightMeaning === 'string' ? gated.uprightMeaning : '';
    const r = typeof gated.reversedMeaning === 'string' ? gated.reversedMeaning : '';
    const out: { upright_excerpt?: string; reversed_excerpt?: string } = {};
    if (u) out.upright_excerpt = clipExcerpt(u);
    if (r) out.reversed_excerpt = clipExcerpt(r);
    return out;
  }
  if (deckId === 'work_your_light') {
    const deep = gated.deepInterpretation;
    if (deep && typeof deep === 'object') {
      const coreMeaning = (deep as Record<string, unknown>).coreMeaning;
      if (typeof coreMeaning === 'string' && coreMeaning.trim()) {
        return { preview_excerpt: clipExcerpt(coreMeaning, EXCERPT_RATIO) };
      }
    }
  }
  const teaser = pickFirstString(gated);
  const ratio = deckId === 'lightworker' ? LIGHTWORKER_EXCERPT_RATIO : EXCERPT_RATIO;
  return teaser ? { preview_excerpt: clipExcerpt(teaser, ratio) } : {};
}

interface SingleUnlockBody {
  spread_id: string;
  card_key: string;
  email: string;
  reversed?: boolean;
}

export async function unlockSingleCard(req: Request, env: Env): Promise<Response> {
  const body = await readBody<SingleUnlockBody>(req);
  if (!body.spread_id || !SPREADS[body.spread_id]) {
    return badRequest(req, env, 'spread_id invalid');
  }
  const spread = SPREADS[body.spread_id];
  if (!spread.free) {
    return badRequest(req, env, 'spread_id is not a free single-card spread');
  }
  if (spread.card_count !== 1) {
    return badRequest(req, env, 'spread is not single card');
  }
  if (!body.email || !validEmail(body.email)) {
    return badRequest(req, env, 'email required');
  }
  if (!body.card_key) return badRequest(req, env, 'card_key required');

  const email = body.email.toLowerCase().trim();
  const card = await loadFullCard(env, spread.deck_id, body.card_key);
  if (!card) return json(req, env, { error: 'card not found' }, { status: 404 });

  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO emails (id, email, source, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    ).bind(crypto.randomUUID(), email, body.spread_id, now),
    env.DB.prepare(
      `INSERT INTO leads (id, email, source, created_at, status)
       VALUES (?, ?, ?, ?, 'success')
       ON CONFLICT(email) DO NOTHING`,
    ).bind(crypto.randomUUID(), email, body.spread_id, now),
    env.DB.prepare(
      `INSERT INTO reading_unlocks (id, email, reading_type, card_data, unlocked_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      email,
      body.spread_id,
      JSON.stringify({ card_key: body.card_key, reversed: !!body.reversed }),
      now,
    ),
  ]);

  return json(req, env, { card: { ...card, reversed: !!body.reversed } });
}

interface SpreadUnlockPick {
  card_key: string;
  position: number;
  reversed?: boolean;
}

interface SpreadUnlockBody {
  spread_id: string;
  picks: SpreadUnlockPick[];
  order_id?: string;
  order_token?: string;
}

function picksMatch(a: SpreadUnlockPick[], b: SpreadUnlockPick[]): boolean {
  if (a.length !== b.length) return false;
  const norm = (p: SpreadUnlockPick) => `${p.position}|${p.card_key}|${p.reversed ? 1 : 0}`;
  const setA = new Set(a.map(norm));
  for (const p of b) if (!setA.has(norm(p))) return false;
  return true;
}

export async function unlockSpread(req: Request, env: Env): Promise<Response> {
  const session = await readSession(req, env);

  const body = await readBody<SpreadUnlockBody>(req);
  if (!body.spread_id || !SPREADS[body.spread_id]) {
    return badRequest(req, env, 'spread_id invalid');
  }
  const spread = SPREADS[body.spread_id];
  if (spread.free) {
    return badRequest(req, env, '此 spread 是免費單張,請用 /api/cards/single-unlock');
  }
  if (!Array.isArray(body.picks) || body.picks.length !== spread.card_count) {
    return badRequest(req, env, `此 spread 需要 ${spread.card_count} 張牌`);
  }

  if (!body.order_id || typeof body.order_id !== 'string') {
    return forbidden(req, env, '需要 order_id (請完成付款後從付款成功頁進入)');
  }

  const guestAuthorized = await verifyOrderToken(body.order_token ?? null, env, body.order_id);
  if (!session && !guestAuthorized) return unauthorized(req, env, '請先登入');

  const order = await env.DB.prepare(
    `SELECT user_id, email, item_id, status, picks_payload FROM orders WHERE id = ?`,
  ).bind(body.order_id).first<{
    user_id: string | null;
    email: string;
    item_id: string;
    status: string;
    picks_payload: string | null;
  }>();
  if (!order) return forbidden(req, env, '訂單不存在');
  if (!guestAuthorized && order.user_id !== session?.id) return forbidden(req, env, '此訂單不屬於你');
  if (order.status !== 'paid') return forbidden(req, env, '訂單尚未付款完成');
  if (order.item_id !== body.spread_id) return forbidden(req, env, '訂單對應的牌陣不符');

  let storedPicks: SpreadUnlockPick[] | null = null;
  if (order.picks_payload) {
    try { storedPicks = JSON.parse(order.picks_payload); } catch {}
  }
  if (storedPicks && !picksMatch(storedPicks, body.picks)) {
    return forbidden(req, env, '抽到的牌與訂單紀錄不符');
  }

  const cards: Array<Record<string, unknown>> = [];
  for (const pick of body.picks) {
    const card = await loadFullCard(env, spread.deck_id, pick.card_key);
    if (!card) {
      return json(req, env, { error: 'card not found', card_key: pick.card_key }, { status: 404 });
    }
    cards.push({ position: pick.position, reversed: !!pick.reversed, ...card });
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO advanced_reading_unlocks
       (id, email, reading_type, unlocked_at, card_data, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    session?.email ?? order.email,
    body.spread_id,
    now,
    JSON.stringify(body.picks),
    now,
  ).run();

  return json(req, env, { spread_id: body.spread_id, cards });
}

async function loadFullCard(
  env: Env,
  deckId: string,
  cardKey: string,
): Promise<Record<string, unknown> | null> {
  const row = await env.DB_CARDS.prepare(
    `SELECT id, deck_id, card_key, position, name, name_secondary, image,
            preview_payload, gated_payload
     FROM cards WHERE deck_id = ? AND card_key = ?`,
  ).bind(deckId, cardKey).first<{
    id: string; deck_id: string; card_key: string; position: number;
    name: string; name_secondary: string | null; image: string | null;
    preview_payload: string; gated_payload: string;
  }>();
  if (!row) return null;
  return {
    id: row.id,
    deck_id: row.deck_id,
    card_key: row.card_key,
    position: row.position,
    name: row.name,
    name_secondary: row.name_secondary,
    image: row.image,
    preview: parseJson(row.preview_payload),
    gated: parseJson(row.gated_payload),
  };
}

function parseJson(s: string | null | undefined): Record<string, unknown> {
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
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

export function getSpreadDef(spreadId: string): SpreadDef | undefined {
  return SPREADS[spreadId];
}

interface FreeUnlockSingleBody { spread_id: string; card_key: string; reversed?: boolean; reading_id?: string; }

export async function freeUnlockSingle(req: Request, env: Env): Promise<Response> {
  const body = await readBody<FreeUnlockSingleBody>(req);
  if (!body.spread_id || !SPREADS[body.spread_id]) return badRequest(req, env, 'spread_id invalid');
  const spread = SPREADS[body.spread_id];
  if (!spread.free) return badRequest(req, env, 'not a single-card spread');
  if (!body.card_key) return badRequest(req, env, 'card_key required');
  const card = await loadFullCard(env, spread.deck_id, body.card_key);
  if (!card) return json(req, env, { error: 'card not found' }, { status: 404 });
  const session = await readSession(req, env);
  const isMember = session ? await hasActiveMembership(env, session.id) : false;
  if (!isMember && body.reading_id) {
    const access = await verifyOracleReservation(req, env, body.reading_id, body.spread_id);
    if (access instanceof Response) return access;
  }
  return json(req, env, { card: { ...card, reversed: !!body.reversed }, free_readings_remaining: null });
}

interface FreeSpreadPick { card_key: string; position: number; reversed?: boolean; }
interface FreeUnlockSpreadBody { spread_id: string; picks: FreeSpreadPick[]; reading_id?: string; email?: string; }

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const GLOBAL_FREE_READING_LIMIT = 2;

async function oracleVisitorHash(req: Request, env: Env): Promise<string | null> {
  const ip = clientIp(req).split(',')[0]?.trim();
  return ip && ip !== 'unknown'
    ? hmacSha256Hex(env.JWT_SECRET, `multi-spread:${ip}`)
    : null;
}

async function completedOracleReadings(env: Env, visitorHash: string): Promise<number> {
  const visitorSuffix = `:${visitorHash}`;
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM multi_spread_free_unlocks
      WHERE substr(id, ?) = ? AND substr(id, 1, 19) != 'oracle-reservation:'`,
  ).bind(-visitorSuffix.length, visitorSuffix).first<{ count: number }>();
  return Math.max(0, Number(row?.count ?? 0));
}

export async function oracleFreeReadingStatus(req: Request, env: Env): Promise<Response> {
  const visitorHash = await oracleVisitorHash(req, env);
  if (!visitorHash) return json(req, env, { error: '無法確認免費體驗資格' }, { status: 400 });
  const completed = Math.min(GLOBAL_FREE_READING_LIMIT, await completedOracleReadings(env, visitorHash));
  return json(req, env, { completed_free_readings: completed, remaining_free_readings: GLOBAL_FREE_READING_LIMIT - completed });
}

export async function startOracleFreeReading(req: Request, env: Env): Promise<Response> {
  const body = await readBody<{ spread_id: string }>(req);
  if (!body.spread_id || !SPREADS[body.spread_id]) return badRequest(req, env, 'spread_id invalid');
  const visitorHash = await oracleVisitorHash(req, env);
  if (!visitorHash) return json(req, env, { error: '無法確認免費體驗資格' }, { status: 400 });
  await env.DB.prepare(
    `DELETE FROM multi_spread_free_unlocks
      WHERE id = ? AND created_at < datetime('now', '-30 minutes')`,
  ).bind(`oracle-reservation:${visitorHash}`).run();
  const completed = await completedOracleReadings(env, visitorHash);
  if (completed >= GLOBAL_FREE_READING_LIMIT) {
    return json(req, env, {
      error: '兩次免費占卜已使用完畢', code: 'FREE_GLOBAL_LIMIT_REACHED',
      completed_free_readings: Math.min(2, completed), remaining_free_readings: 0,
    }, { status: 409 });
  }
  // A deterministic reservation id makes concurrent tabs contend for the same
  // row instead of creating several reservations before any result completes.
  const reservationId = `oracle-reservation:${visitorHash}`;
  const readingId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO multi_spread_free_unlocks (id, email_hash, spread_id, created_at)
     VALUES (?, ?, ?, ?)`,
  ).bind(
    reservationId,
    `reservation:${readingId}`,
    body.spread_id,
    new Date().toISOString(),
  ).run();
  const reservation = await env.DB.prepare(
    `SELECT email_hash, spread_id FROM multi_spread_free_unlocks WHERE id = ?`,
  ).bind(reservationId).first<{ email_hash: string; spread_id: string }>();
  const activeReadingId = reservation?.email_hash.startsWith('reservation:')
    ? reservation.email_hash.slice('reservation:'.length)
    : '';
  if (!activeReadingId || reservation?.spread_id !== body.spread_id) {
    return json(req, env, {
      error: '已有一筆占卜正在進行，請先完成後再開始新的占卜',
      code: 'FREE_READING_IN_PROGRESS',
    }, { status: 409 });
  }
  return json(req, env, {
    reading_id: activeReadingId,
    remaining_free_readings: Math.max(0, GLOBAL_FREE_READING_LIMIT - completed),
  });
}

async function verifyOracleReservation(
  req: Request, env: Env, readingId: string, spreadId: string,
): Promise<true | Response> {
  const visitorHash = await oracleVisitorHash(req, env);
  if (!visitorHash) return forbidden(req, env, '免費占卜憑證無效');
  const id = `oracle-reservation:${visitorHash}`;
  const row = await env.DB.prepare(
    `SELECT email_hash, spread_id FROM multi_spread_free_unlocks WHERE id = ?`,
  ).bind(id).first<{ email_hash: string; spread_id: string }>();
  if (!row || row.spread_id !== spreadId || row.email_hash !== `reservation:${readingId}`) {
    return forbidden(req, env, '免費占卜憑證無效或已過期');
  }
  return true;
}

export async function completeOracleFreeReading(req: Request, env: Env): Promise<Response> {
  const body = await readBody<{ reading_id: string }>(req);
  if (!body.reading_id) return badRequest(req, env, 'reading_id required');
  const visitorHash = await oracleVisitorHash(req, env);
  if (!visitorHash) return forbidden(req, env, '免費占卜憑證無效');
  const reservationId = `oracle-reservation:${visitorHash}`;
  const completionId = `oracle-complete:${body.reading_id}:${visitorHash}`;
  const existing = await env.DB.prepare(`SELECT id FROM multi_spread_free_unlocks WHERE id = ?`)
    .bind(completionId).first<{ id: string }>();
  if (!existing) {
    const reservation = await env.DB.prepare(
      `SELECT email_hash, spread_id FROM multi_spread_free_unlocks WHERE id = ?`,
    ).bind(reservationId).first<{ email_hash: string; spread_id: string }>();
    if (!reservation || reservation.email_hash !== `reservation:${body.reading_id}`) {
      return forbidden(req, env, '免費占卜憑證無效或已過期');
    }
    const completedBefore = await completedOracleReadings(env, visitorHash);
    if (completedBefore >= GLOBAL_FREE_READING_LIMIT) {
      await env.DB.prepare(`DELETE FROM multi_spread_free_unlocks WHERE id = ?`).bind(reservationId).run();
      return json(req, env, { error: '兩次免費占卜已使用完畢', code: 'FREE_GLOBAL_LIMIT_REACHED' }, { status: 409 });
    }
    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO multi_spread_free_unlocks (id, email_hash, spread_id, created_at) VALUES (?, ?, ?, ?)`,
      ).bind(completionId, `complete:${body.reading_id}:${visitorHash}`, reservation.spread_id, new Date().toISOString()),
      env.DB.prepare(`DELETE FROM multi_spread_free_unlocks WHERE id = ?`).bind(reservationId),
    ]);
  }
  const completed = Math.min(GLOBAL_FREE_READING_LIMIT, await completedOracleReadings(env, visitorHash));
  return json(req, env, {
    free_reading_number: completed,
    completed_free_readings: completed,
    remaining_free_readings: GLOBAL_FREE_READING_LIMIT - completed,
  });
}

export async function freeUnlockSpread(req: Request, env: Env): Promise<Response> {
  const body = await readBody<FreeUnlockSpreadBody>(req);
  if (!body.spread_id || !SPREADS[body.spread_id]) return badRequest(req, env, 'spread_id invalid');
  const spread = SPREADS[body.spread_id];
  if (spread.free) return badRequest(req, env, 'use free-unlock-single for single cards');
  if (!Array.isArray(body.picks) || body.picks.length !== spread.card_count) {
    return badRequest(req, env, `此牌陣需要 ${spread.card_count} 張牌`);
  }
  const cards: Array<Record<string, unknown>> = [];
  for (const pick of body.picks) {
    const card = await loadFullCard(env, spread.deck_id, pick.card_key);
    if (!card) return json(req, env, { error: 'card not found', card_key: pick.card_key }, { status: 404 });
    cards.push({ position: pick.position, reversed: !!pick.reversed, ...card });
  }

  if (body.reading_id) {
    const access = await verifyOracleReservation(req, env, body.reading_id, body.spread_id);
    if (access instanceof Response) return access;
    return json(req, env, { spread_id: body.spread_id, cards });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (email && !validEmail(email)) return badRequest(req, env, '請輸入有效的 Email 地址');
  const visitorHash = await oracleVisitorHash(req, env);
  if (!visitorHash) return json(req, env, { error: '無法確認免費體驗資格，請稍後再試' }, { status: 400 });
  const isEmailStage = email.length > 0;
  const claimId = `${isEmailStage ? 'multi-stage2' : 'multi-stage1'}:${body.spread_id}:${visitorHash}`;
  const claimHash = isEmailStage ? await sha256Hex(email) : `anonymous:${visitorHash}`;
  const claim = await env.DB.prepare(
    `INSERT OR IGNORE INTO multi_spread_free_unlocks (id, email_hash, spread_id, created_at) VALUES (?, ?, ?, ?)`,
  ).bind(claimId, claimHash, body.spread_id, new Date().toISOString()).run();
  if ((claim.meta.changes ?? 0) !== 1) {
    return json(req, env, isEmailStage
      ? { error: '此牌陣的免費體驗已使用完畢', code: 'FREE_SPREAD_ALREADY_USED' }
      : { error: '第一次免費體驗已使用，請輸入 Email 解鎖第二次免費體驗', code: 'FREE_SPREAD_EMAIL_REQUIRED' },
    { status: 409 });
  }
  return json(req, env, { spread_id: body.spread_id, cards });
}
