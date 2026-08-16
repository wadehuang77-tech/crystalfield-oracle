import { SPREAD_PRICES } from './spread-prices';

export type OracleDeckId = 'tarot' | 'lightworker' | 'unicorns' | 'dragons' | 'egyptian_gods' | 'work_your_light' | 'osho';
export type OracleSpreadId =
  | 'tarot_single' | 'tarot_three' | 'tarot_celtic' | 'tarot_pastlife'
  | 'lightworker_single' | 'celtic_cross'
  | 'unicorns_single' | 'unicorns_three'
  | 'dragons_single' | 'dragons_three'
  | 'egyptian_single' | 'egyptian_pastlife'
  | 'work_your_light_single' | 'cosmic_cross'
  | 'osho_single' | 'osho_three';
export type OracleTopic = 'love' | 'career' | 'wealth' | 'relationship' | 'self_growth' | 'general';
export type OracleNeedType = 'relationship' | 'career_finance' | 'past_life' | 'soul_guidance';

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
  item_category: 'oracle_reading';
  price: number;
  quantity: 1;
}

type Ga4EventMap = {
  oracle_deck_select: { deck_id: OracleDeckId; deck_name: string; destination_path: string };
  reading_start: { deck_id: OracleDeckId; deck_name: string; spread_id: OracleSpreadId; spread_name: string; topic: OracleTopic; card_count: number };
  card_draw_complete: { deck_id: OracleDeckId; deck_name: string; spread_id: OracleSpreadId; spread_name: string; card_count: number; reading_id: string };
  free_reading_view: { deck_id: OracleDeckId; deck_name: string; spread_id: OracleSpreadId; spread_name: string; reading_id: string; content_source: string };
  unlock_click: { deck_id: OracleDeckId; spread_id: OracleSpreadId; reading_id: string; product_id: string; product_name: string; value: number; currency: 'TWD' };
  begin_checkout: { currency: 'TWD'; value: number; transaction_id: string; deck_id: OracleDeckId; spread_id: OracleSpreadId; reading_id: string; items: Ga4Item[] };
  purchase: { transaction_id: string; currency: 'TWD'; value: number; deck_id: OracleDeckId; spread_id: OracleSpreadId; reading_id: string; payment_type: string; items: Ga4Item[] };
  oracle_need_selected: { need_type: OracleNeedType };
  oracle_reading_started: { need_type: OracleNeedType; spread_type: OracleSpreadId; deck_type: OracleDeckId };
};

export type Ga4EventName = keyof Ga4EventMap;

const activeReadings = new Map<OracleSpreadId, string>();
const startedReadings = new Set<string>();
const completedReadings = new Set<string>();
const viewedFreeReadings = new Set<string>();
const unlockEvents = new Set<string>();
const checkoutEvents = new Set<string>();
const forbiddenParamKeys = new Set([
  'name', 'email', 'phone', 'birthday', 'birth_date', 'birth_time', 'birth_city', 'city', 'ip',
  'question', 'full_question', 'interpretation', 'report', 'prompt', 'response', 'payment_data',
]);

function sessionGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function sessionSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* In-memory guards remain active. */ }
}

function persistentGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function persistentSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* GA4 also deduplicates purchase by transaction_id. */ }
}

function newReadingId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null));
}

function containsForbiddenKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => forbiddenParamKeys.has(key.toLowerCase()) || containsForbiddenKey(child));
}

function debugParams(): Record<string, true> {
  const env = import.meta.env as ImportMetaEnv | undefined;
  return env?.DEV && env.VITE_GA_DEBUG === 'true' ? { debug_mode: true } : {};
}

export function trackEvent<Name extends Ga4EventName>(name: Name, params: Ga4EventMap[Name]): boolean {
  if (containsForbiddenKey(params) || typeof window === 'undefined' || !window.gtag) return false;
  window.gtag('event', name, { ...cleanParams(params as Record<string, unknown>), ...debugParams() });
  return true;
}

export function getOracleSpread(spreadId: string): OracleSpreadDefinition | null {
  return ORACLE_SPREADS[spreadId as OracleSpreadId] ?? null;
}

function safeTopic(topic: string | undefined): OracleTopic {
  const allowed: OracleTopic[] = ['love', 'career', 'wealth', 'relationship', 'self_growth', 'general'];
  return allowed.includes(topic as OracleTopic) ? topic as OracleTopic : 'general';
}

function activeReadingKey(spread: OracleSpreadDefinition): string {
  return `cf_ga4_active_reading_${spread.spread_id}`;
}

function ensureReading(spread: OracleSpreadDefinition): string {
  const existing = activeReadings.get(spread.spread_id) ?? sessionGet(activeReadingKey(spread));
  if (existing) {
    activeReadings.set(spread.spread_id, existing);
    return existing;
  }
  const readingId = newReadingId();
  activeReadings.set(spread.spread_id, readingId);
  sessionSet(activeReadingKey(spread), readingId);
  return readingId;
}

function productName(spread: OracleSpreadDefinition): string {
  return `${spread.deck_name}・${spread.spread_name}`;
}

function item(productId: string, name: string, value: number): Ga4Item {
  return { item_id: productId, item_name: name, item_category: 'oracle_reading', price: value, quantity: 1 };
}

export function trackDeckSelect(deckId: OracleDeckId, deckName: string, destinationPath: string): void {
  if (!destinationPath.startsWith('/')) return;
  trackEvent('oracle_deck_select', { deck_id: deckId, deck_name: deckName, destination_path: destinationPath });
}

export function trackOracleNeedSelected(needType: OracleNeedType): void {
  trackEvent('oracle_need_selected', { need_type: needType });
}

export function trackOracleReadingStarted(
  needType: OracleNeedType,
  spreadType: OracleSpreadId,
  deckType: OracleDeckId,
): void {
  trackEvent('oracle_reading_started', {
    need_type: needType,
    spread_type: spreadType,
    deck_type: deckType,
  });
}

export function trackReadingStart(spreadId: string, topic?: string): string | null {
  const spread = getOracleSpread(spreadId);
  if (!spread) return null;
  const existing = activeReadings.get(spread.spread_id) ?? sessionGet(activeReadingKey(spread));
  if (existing && sessionGet(`cf_ga4_card_draw_complete_${existing}`) !== '1') {
    const startKey = `cf_ga4_reading_start_${existing}`;
    if (!startedReadings.has(existing) && sessionGet(startKey) !== '1') {
      const sent = trackEvent('reading_start', {
        deck_id: spread.deck_id, deck_name: spread.deck_name, spread_id: spread.spread_id,
        spread_name: spread.spread_name, topic: safeTopic(topic), card_count: spread.card_count,
      });
      if (sent) {
        startedReadings.add(existing);
        sessionSet(startKey, '1');
      }
    }
    return existing;
  }

  const readingId = newReadingId();
  activeReadings.set(spread.spread_id, readingId);
  sessionSet(activeReadingKey(spread), readingId);
  const sent = trackEvent('reading_start', {
    deck_id: spread.deck_id, deck_name: spread.deck_name, spread_id: spread.spread_id,
    spread_name: spread.spread_name, topic: safeTopic(topic), card_count: spread.card_count,
  });
  if (sent) {
    startedReadings.add(readingId);
    sessionSet(`cf_ga4_reading_start_${readingId}`, '1');
  }
  return readingId;
}

export function trackCardDrawComplete(spreadId: string, drawnCardCount: number): void {
  const spread = getOracleSpread(spreadId);
  if (!spread || drawnCardCount !== spread.card_count) return;
  const readingId = ensureReading(spread);
  const storageKey = `cf_ga4_card_draw_complete_${readingId}`;
  if (completedReadings.has(readingId) || sessionGet(storageKey) === '1') return;
  const sent = trackEvent('card_draw_complete', {
    deck_id: spread.deck_id, deck_name: spread.deck_name, spread_id: spread.spread_id,
    spread_name: spread.spread_name, card_count: spread.card_count, reading_id: readingId,
  });
  if (sent) {
    completedReadings.add(readingId);
    sessionSet(storageKey, '1');
  }
}

export function trackFreeReadingView(spreadId: string, contentSource = 'free_unlock_api', hasContent = true): void {
  if (!hasContent) return;
  const spread = getOracleSpread(spreadId);
  if (!spread) return;
  const readingId = ensureReading(spread);
  const storageKey = `cf_ga4_free_reading_view_${readingId}`;
  if (viewedFreeReadings.has(readingId) || sessionGet(storageKey) === '1') return;
  const sent = trackEvent('free_reading_view', {
    deck_id: spread.deck_id, deck_name: spread.deck_name, spread_id: spread.spread_id,
    spread_name: spread.spread_name, reading_id: readingId, content_source: contentSource,
  });
  if (sent) {
    viewedFreeReadings.add(readingId);
    sessionSet(storageKey, '1');
  }
}

export function trackUnlockClick(productId: string): void {
  const spread = getOracleSpread(productId);
  const value = SPREAD_PRICES[productId];
  if (!spread || typeof value !== 'number' || !Number.isFinite(value)) return;
  const readingId = ensureReading(spread);
  const dedupeKey = `${readingId}:${productId}`;
  const storageKey = `cf_ga4_unlock_click_${dedupeKey}`;
  if (unlockEvents.has(dedupeKey) || sessionGet(storageKey) === '1') return;
  const sent = trackEvent('unlock_click', {
    deck_id: spread.deck_id, spread_id: spread.spread_id, reading_id: readingId,
    product_id: productId, product_name: productName(spread), value, currency: 'TWD',
  });
  if (sent) {
    unlockEvents.add(dedupeKey);
    sessionSet(storageKey, '1');
  }
}

export function trackBeginCheckout(productId: string, transactionId: string, value: number, actualProductName: string): void {
  const spread = getOracleSpread(productId);
  if (!spread || !transactionId || !actualProductName || !Number.isFinite(value)) return;
  const storageKey = `cf_ga4_begin_checkout_${transactionId}`;
  if (checkoutEvents.has(transactionId) || sessionGet(storageKey) === '1') return;
  const sent = trackEvent('begin_checkout', {
    currency: 'TWD', value, transaction_id: transactionId, deck_id: spread.deck_id,
    spread_id: spread.spread_id, reading_id: ensureReading(spread), items: [item(productId, actualProductName, value)],
  });
  if (sent) {
    checkoutEvents.add(transactionId);
    sessionSet(storageKey, '1');
  }
}

export function trackPurchase(productId: string, transactionId: string, value: number, actualProductName: string, paymentType: string): void {
  const spread = getOracleSpread(productId);
  if (!spread || !transactionId || !actualProductName || !paymentType || !Number.isFinite(value)) return;
  const storageKey = `cf_ga4_purchase_${transactionId}`;
  if (persistentGet(storageKey) === '1') return;
  const sent = trackEvent('purchase', {
    transaction_id: transactionId, currency: 'TWD', value, deck_id: spread.deck_id,
    spread_id: spread.spread_id, reading_id: ensureReading(spread), payment_type: paymentType,
    items: [item(productId, actualProductName, value)],
  });
  if (sent) persistentSet(storageKey, '1');
}
