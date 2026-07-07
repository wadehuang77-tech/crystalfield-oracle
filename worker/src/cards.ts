import {
  badRequest,
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
const EXCERPT_MIN = 20;

function clipExcerpt(text: string): string {
  const t = text.trim();
  const target = Math.max(EXCERPT_MIN, Math.floor(t.length * EXCERPT_RATIO));
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
  const teaser = pickFirstString(gated);
  return teaser ? { preview_excerpt: clipExcerpt(teaser) } : {};
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
       ON CONFLICT(email) DO UPDATE SET source = excluded.source`,
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
  if (!session) return unauthorized(req, env, '請先登入');

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

  const order = await env.DB.prepare(
    `SELECT user_id, item_id, status, picks_payload FROM orders WHERE id = ?`,
  ).bind(body.order_id).first<{
    user_id: string | null;
    item_id: string;
    status: string;
    picks_payload: string | null;
  }>();
  if (!order) return forbidden(req, env, '訂單不存在');
  if (order.user_id !== session.id) return forbidden(req, env, '此訂單不屬於你');
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
    session.email,
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

interface FreeUnlockSingleBody { spread_id: string; card_key: string; reversed?: boolean; }

export async function freeUnlockSingle(req: Request, env: Env): Promise<Response> {
  const body = await readBody<FreeUnlockSingleBody>(req);
  if (!body.spread_id || !SPREADS[body.spread_id]) return badRequest(req, env, 'spread_id invalid');
  const spread = SPREADS[body.spread_id];
  if (!spread.free) return badRequest(req, env, 'not a single-card spread');
  if (!body.card_key) return badRequest(req, env, 'card_key required');
  const card = await loadFullCard(env, spread.deck_id, body.card_key);
  if (!card) return json(req, env, { error: 'card not found' }, { status: 404 });
  return json(req, env, { card: { ...card, reversed: !!body.reversed } });
}

interface FreeSpreadPick { card_key: string; position: number; reversed?: boolean; }
interface FreeUnlockSpreadBody { spread_id: string; picks: FreeSpreadPick[]; }

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
  return json(req, env, { spread_id: body.spread_id, cards });
}
