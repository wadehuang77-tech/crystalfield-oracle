import { SPREAD_PRICES } from './spread-prices';

export type OracleDeckId =
  | 'tarot'
  | 'lightworker'
  | 'unicorns'
  | 'dragons'
  | 'egyptian_gods'
  | 'work_your_light'
  | 'osho';

export type OracleSpreadId =
  | 'tarot_single'
  | 'tarot_three'
  | 'tarot_celtic'
  | 'tarot_pastlife'
  | 'lightworker_single'
  | 'celtic_cross'
  | 'unicorns_single'
  | 'unicorns_three'
  | 'dragons_single'
  | 'dragons_three'
  | 'egyptian_single'
  | 'egyptian_pastlife'
  | 'work_your_light_single'
  | 'cosmic_cross'
  | 'osho_single'
  | 'osho_three';

interface OracleSpreadDefinition {
  deck_id: OracleDeckId;
  deck_name: string;
  spread_id: OracleSpreadId;
  spread_name: string;
  card_count: number;
}

export const ORACLE_SPREADS: Record<OracleSpreadId, OracleSpreadDefinition> = {
  tarot_single: { deck_id: 'tarot', deck_name: '偉特塔羅', spread_id: 'tarot_single', spread_name: '單張牌陣', card_count: 1 },
  tarot_three: { deck_id: 'tarot', deck_name: '偉特塔羅', spread_id: 'tarot_three', spread_name: '三張牌陣', card_count: 3 },
  tarot_celtic: { deck_id: 'tarot', deck_name: '偉特塔羅', spread_id: 'tarot_celtic', spread_name: '凱爾特十字牌陣', card_count: 10 },
  tarot_pastlife: { deck_id: 'tarot', deck_name: '偉特塔羅', spread_id: 'tarot_pastlife', spread_name: '前世因果解鎖陣', card_count: 7 },
  lightworker_single: { deck_id: 'lightworker', deck_name: '光行者神諭', spread_id: 'lightworker_single', spread_name: '單張牌陣', card_count: 1 },
  celtic_cross: { deck_id: 'lightworker', deck_name: '光行者神諭', spread_id: 'celtic_cross', spread_name: '十字交叉使命陣', card_count: 10 },
  unicorns_single: { deck_id: 'unicorns', deck_name: '獨角獸塔羅', spread_id: 'unicorns_single', spread_name: '單張牌陣', card_count: 1 },
  unicorns_three: { deck_id: 'unicorns', deck_name: '獨角獸塔羅', spread_id: 'unicorns_three', spread_name: '三張牌陣', card_count: 3 },
  dragons_single: { deck_id: 'dragons', deck_name: '龍族塔羅', spread_id: 'dragons_single', spread_name: '單張牌陣', card_count: 1 },
  dragons_three: { deck_id: 'dragons', deck_name: '龍族塔羅', spread_id: 'dragons_three', spread_name: '三張牌陣', card_count: 3 },
  egyptian_single: { deck_id: 'egyptian_gods', deck_name: '埃及神諭', spread_id: 'egyptian_single', spread_name: '單張牌陣', card_count: 1 },
  egyptian_pastlife: { deck_id: 'egyptian_gods', deck_name: '埃及神諭', spread_id: 'egyptian_pastlife', spread_name: '前世因果解鎖陣', card_count: 7 },
  work_your_light_single: { deck_id: 'work_your_light', deck_name: 'Lightworker光之訊息', spread_id: 'work_your_light_single', spread_name: '單張牌陣', card_count: 1 },
  cosmic_cross: { deck_id: 'work_your_light', deck_name: 'Lightworker光之訊息', spread_id: 'cosmic_cross', spread_name: '宇宙十字牌陣', card_count: 11 },
  osho_single: { deck_id: 'osho', deck_name: '奧修禪卡', spread_id: 'osho_single', spread_name: '單張牌陣', card_count: 1 },
  osho_three: { deck_id: 'osho', deck_name: '奧修禪卡', spread_id: 'osho_three', spread_name: '三張牌陣', card_count: 3 },
};

interface Ga4Item {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

interface OracleEventParams {
  deck_id?: OracleDeckId;
  deck_name?: string;
  spread_id?: OracleSpreadId;
  topic?: string;
  card_count?: number;
  reading_id?: string;
  product_id?: string;
  value?: number;
  currency?: 'TWD';
}

type Ga4EventMap = {
  oracle_deck_select: Pick<OracleEventParams, 'deck_id' | 'deck_name'>;
  reading_start: Required<Pick<OracleEventParams, 'deck_id' | 'deck_name' | 'spread_id' | 'topic' | 'card_count' | 'reading_id'>>;
  card_draw_complete: Required<Pick<OracleEventParams, 'deck_id' | 'deck_name' | 'spread_id' | 'topic' | 'card_count' | 'reading_id'>>;
  free_reading_view: Required<Pick<OracleEventParams, 'deck_id' | 'deck_name' | 'spread_id' | 'topic' | 'card_count' | 'reading_id'>>;
  unlock_click: OracleEventParams;
  begin_checkout: OracleEventParams & { items: Ga4Item[] };
  purchase: OracleEventParams & { transaction_id: string; items: Ga4Item[] };
};

export type Ga4EventName = keyof Ga4EventMap;

const activeReadings = new Map<OracleSpreadId, string>();
const completedReadings = new Set<string>();
const viewedFreeReadings = new Set<string>();
const checkoutEvents = new Set<string>();

function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // In-memory guards remain active when browser storage is unavailable.
  }
}

function newReadingId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null));
}

export function trackEvent<Name extends Ga4EventName>(name: Name, params: Ga4EventMap[Name]): void {
  window.gtag?.('event', name, cleanParams(params as Record<string, unknown>));
}

export function getOracleSpread(spreadId: string): OracleSpreadDefinition | null {
  return ORACLE_SPREADS[spreadId as OracleSpreadId] ?? null;
}

function readingParams(spread: OracleSpreadDefinition, readingId: string): Ga4EventMap['reading_start'] {
  return {
    deck_id: spread.deck_id,
    deck_name: spread.deck_name,
    spread_id: spread.spread_id,
    topic: 'general',
    card_count: spread.card_count,
    reading_id: readingId,
  };
}

export function trackDeckSelect(deckId: OracleDeckId, deckName: string): void {
  trackEvent('oracle_deck_select', { deck_id: deckId, deck_name: deckName });
}

export function trackReadingStart(spreadId: string): string | null {
  const spread = getOracleSpread(spreadId);
  if (!spread) return null;
  const readingId = newReadingId();
  activeReadings.set(spread.spread_id, readingId);
  sessionSet(`cf_ga4_active_reading_${spread.spread_id}`, readingId);
  trackEvent('reading_start', readingParams(spread, readingId));
  return readingId;
}

function ensureReading(spread: OracleSpreadDefinition): string {
  const existing = activeReadings.get(spread.spread_id)
    ?? sessionGet(`cf_ga4_active_reading_${spread.spread_id}`);
  if (existing) return existing;
  const readingId = newReadingId();
  activeReadings.set(spread.spread_id, readingId);
  sessionSet(`cf_ga4_active_reading_${spread.spread_id}`, readingId);
  return readingId;
}

export function trackCardDrawComplete(spreadId: string): void {
  const spread = getOracleSpread(spreadId);
  if (!spread) return;
  const readingId = ensureReading(spread);
  const storageKey = `cf_ga4_card_draw_complete_${readingId}`;
  if (completedReadings.has(readingId) || sessionGet(storageKey) === '1') return;
  completedReadings.add(readingId);
  sessionSet(storageKey, '1');
  trackEvent('card_draw_complete', readingParams(spread, readingId));
}

export function trackFreeReadingView(spreadId: string): void {
  const spread = getOracleSpread(spreadId);
  if (!spread) return;
  const readingId = ensureReading(spread);
  const storageKey = `cf_ga4_free_reading_view_${readingId}`;
  if (viewedFreeReadings.has(readingId) || sessionGet(storageKey) === '1') return;
  viewedFreeReadings.add(readingId);
  sessionSet(storageKey, '1');
  trackEvent('free_reading_view', readingParams(spread, readingId));
}

function commerceParams(productId: string): (OracleEventParams & { items: Ga4Item[] }) | null {
  const spread = getOracleSpread(productId);
  if (!spread) return null;
  const value = SPREAD_PRICES[productId];
  if (typeof value !== 'number') return null;
  return {
    ...readingParams(spread, ensureReading(spread)),
    product_id: productId,
    value,
    currency: 'TWD',
    items: [{ item_id: productId, item_name: spread.spread_name, price: value, quantity: 1 }],
  };
}

export function trackUnlockClick(productId: string): void {
  const params = commerceParams(productId);
  if (!params) return;
  trackEvent('unlock_click', {
    deck_id: params.deck_id,
    deck_name: params.deck_name,
    spread_id: params.spread_id,
    topic: params.topic,
    card_count: params.card_count,
    reading_id: params.reading_id,
    product_id: params.product_id,
    value: params.value,
    currency: params.currency,
  });
}

export function trackBeginCheckout(productId: string, orderId: string): void {
  const params = commerceParams(productId);
  const dedupeKey = `${productId}:${orderId}`;
  const storageKey = `cf_ga4_begin_checkout_${orderId}`;
  if (!params || checkoutEvents.has(dedupeKey) || sessionGet(storageKey) === '1') return;
  checkoutEvents.add(dedupeKey);
  sessionSet(storageKey, '1');
  trackEvent('begin_checkout', params);
}

export function trackPurchase(productId: string, transactionId: string, value: number): void {
  const spread = getOracleSpread(productId);
  if (!spread || !transactionId || !Number.isFinite(value)) return;
  const storageKey = `cf_ga4_purchase_${transactionId}`;
  try {
    if (localStorage.getItem(storageKey) === '1') return;
  } catch {
    // GA4 still provides transaction_id deduplication when storage is unavailable.
  }
  trackEvent('purchase', {
    ...readingParams(spread, ensureReading(spread)),
    transaction_id: transactionId,
    product_id: productId,
    value,
    currency: 'TWD',
    items: [{ item_id: productId, item_name: spread.spread_name, price: value, quantity: 1 }],
  });
  try {
    localStorage.setItem(storageKey, '1');
  } catch {
    // Do not interrupt the payment success page when storage is unavailable.
  }
}
