import { SPREAD_PRICES } from './spread-prices';
import {
  ORACLE_SPREADS,
  type OracleDeckId,
  type OracleSpreadDefinition,
  type OracleSpreadId,
} from './oracle-catalog';
export { ORACLE_SPREADS } from './oracle-catalog';
export type { OracleDeckId, OracleSpreadId } from './oracle-catalog';
export type OracleTopic = 'love' | 'career' | 'wealth' | 'relationship' | 'self_growth' | 'general';
export type OracleNeedType = 'relationship' | 'career_finance' | 'past_life' | 'soul_guidance';

interface Ga4Item {
  item_id: string;
  item_name: string;
  item_category: 'oracle_reading' | 'tarot_subscription';
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
  purchase: { transaction_id: string; currency: 'TWD'; value: number; deck_id?: OracleDeckId; spread_id?: OracleSpreadId; reading_id?: string; payment_type: string; plan_id?: string; billing_type?: 'recurring'; items: Ga4Item[] };
  tarot_subscription_view: { plan_id: 'tarot_monthly_600'; value: 600; currency: 'TWD'; billing_type: 'recurring' };
  tarot_subscription_checkout: { plan_id: 'tarot_monthly_600'; value: 600; currency: 'TWD'; billing_type: 'recurring' };
  tarot_subscription_start: { plan_id: 'tarot_monthly_600'; value: 600; currency: 'TWD'; billing_type: 'recurring'; transaction_id: string };
  tarot_subscription_renewal: { plan_id: 'tarot_monthly_600'; value: 600; currency: 'TWD'; billing_type: 'recurring'; transaction_id: string; billing_cycle: number };
  tarot_subscription_payment_failed: { plan_id: 'tarot_monthly_600'; value: 600; currency: 'TWD'; billing_type: 'recurring'; billing_cycle: number };
  tarot_subscription_cancelled: { plan_id: 'tarot_monthly_600'; value: 600; currency: 'TWD'; billing_type: 'recurring' };
  oracle_need_selected: { need_type: OracleNeedType };
  oracle_reading_started: { need_type: OracleNeedType; spread_type: OracleSpreadId; deck_type: OracleDeckId };
  oracle_free_reading_completed: { free_reading_number: 1 | 2; remaining_free_readings: number; deck_type: OracleDeckId; spread_type: OracleSpreadId; need_type: OracleNeedType };
  oracle_paywall_viewed: { reason: 'free_limit_reached'; completed_free_readings: 2; deck_type: OracleDeckId; spread_type: OracleSpreadId; need_type: OracleNeedType };
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

const TAROT_SUBSCRIPTION_ANALYTICS = {
  plan_id: 'tarot_monthly_600',
  value: 600,
  currency: 'TWD',
  billing_type: 'recurring',
} as const;

function trackTarotSubscriptionOnce(
  eventName: 'tarot_subscription_view' | 'tarot_subscription_checkout' | 'tarot_subscription_cancelled',
): void {
  const key = `cf_ga4_${eventName}`;
  if (sessionGet(key) === '1') return;
  if (trackEvent(eventName, TAROT_SUBSCRIPTION_ANALYTICS)) sessionSet(key, '1');
}

export function trackTarotSubscriptionView(): void {
  trackTarotSubscriptionOnce('tarot_subscription_view');
}

export function trackTarotSubscriptionCheckout(): void {
  trackTarotSubscriptionOnce('tarot_subscription_checkout');
}

export function trackTarotSubscriptionCancelled(): void {
  trackTarotSubscriptionOnce('tarot_subscription_cancelled');
}

export function trackTarotSubscriptionStart(transactionId: string): void {
  if (!transactionId) return;
  const key = `cf_ga4_tarot_subscription_start_${transactionId}`;
  if (persistentGet(key) === '1') return;
  if (trackEvent('tarot_subscription_start', { ...TAROT_SUBSCRIPTION_ANALYTICS, transaction_id: transactionId })) {
    persistentSet(key, '1');
  }
}

export function trackTarotSubscriptionRenewal(transactionId: string, billingCycle: number): void {
  if (!transactionId || billingCycle < 2) return;
  const key = `cf_ga4_tarot_subscription_renewal_${transactionId}`;
  if (persistentGet(key) === '1') return;
  if (trackEvent('tarot_subscription_renewal', {
    ...TAROT_SUBSCRIPTION_ANALYTICS,
    transaction_id: transactionId,
    billing_cycle: billingCycle,
  })) persistentSet(key, '1');
}

export function trackTarotSubscriptionPaymentFailed(billingCycle: number): void {
  const key = `cf_ga4_tarot_subscription_payment_failed_${billingCycle}`;
  if (sessionGet(key) === '1') return;
  if (trackEvent('tarot_subscription_payment_failed', {
    ...TAROT_SUBSCRIPTION_ANALYTICS,
    billing_cycle: Math.max(1, billingCycle),
  })) sessionSet(key, '1');
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

export function trackOracleFreeReadingCompleted(readingId: string, params: Ga4EventMap['oracle_free_reading_completed']): void {
  const key = `cf_ga4_oracle_free_completed:${readingId}`;
  try {
    if (localStorage.getItem(key) === '1') return;
    localStorage.setItem(key, '1');
  } catch {
    // Analytics still works when persistent storage is unavailable.
  }
  trackEvent('oracle_free_reading_completed', params);
}

export function trackOraclePaywallViewed(params: Ga4EventMap['oracle_paywall_viewed']): void {
  trackEvent('oracle_paywall_viewed', params);
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
  if (!transactionId || !actualProductName || !paymentType || !Number.isFinite(value)) return;
  const storageKey = `cf_ga4_purchase_${transactionId}`;
  if (persistentGet(storageKey) === '1') return;
  const sent = productId === 'tarot_monthly_600'
    ? trackEvent('purchase', {
      transaction_id: transactionId, currency: 'TWD', value, payment_type: paymentType,
      plan_id: productId, billing_type: 'recurring',
      items: [{ ...item(productId, actualProductName, value), item_category: 'tarot_subscription' }],
    })
    : !!spread && trackEvent('purchase', {
      transaction_id: transactionId, currency: 'TWD', value, deck_id: spread.deck_id,
      spread_id: spread.spread_id, reading_id: ensureReading(spread), payment_type: paymentType,
      items: [item(productId, actualProductName, value)],
    });
  if (sent) persistentSet(storageKey, '1');
}
