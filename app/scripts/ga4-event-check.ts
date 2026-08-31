type SentEvent = { name: string; params: Record<string, unknown> };

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

const events: SentEvent[] = [];
const session = new MemoryStorage();
const persistent = new MemoryStorage();

Object.assign(globalThis, {
  window: {
    gtag(command: string, name: string, params: Record<string, unknown>) {
      if (command === 'event') events.push({ name, params });
    },
  },
  sessionStorage: session,
  localStorage: persistent,
});

const analytics = await import('../src/lib/ga4.ts');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function count(name: string): number {
  return events.filter((event) => event.name === name).length;
}

function event(name: string): SentEvent {
  const found = events.find((candidate) => candidate.name === name);
  assert(found, `Missing ${name}`);
  return found;
}

function hasSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const forbidden = new Set([
    'name', 'email', 'phone', 'birthday', 'birth_date', 'birth_time', 'birth_city', 'city', 'ip',
    'question', 'full_question', 'interpretation', 'report', 'prompt', 'response', 'payment_data',
  ]);
  return Object.entries(value).some(([key, child]) => forbidden.has(key.toLowerCase()) || hasSensitiveKey(child));
}

analytics.trackDeckSelect('tarot', '偉特塔羅', '/tarot');
assert(count('oracle_deck_select') === 1, 'One deck click must send exactly one oracle_deck_select');
assert(event('oracle_deck_select').params.destination_path === '/tarot', 'Deck event must include destination_path');

analytics.trackOracleNeedSelected('career_finance');
assert(count('oracle_need_selected') === 1, 'One need click must send exactly one oracle_need_selected');
assert(event('oracle_need_selected').params.need_type === 'career_finance', 'Need event must include need_type');

analytics.trackOracleReadingStarted('career_finance', 'tarot_three', 'tarot');
assert(count('oracle_reading_started') === 1, 'One need-based start must send exactly one oracle_reading_started');
assert(event('oracle_reading_started').params.spread_type === 'tarot_three', 'Need-based start must include spread_type');
assert(event('oracle_reading_started').params.deck_type === 'tarot', 'Need-based start must include deck_type');

analytics.trackOracleFreeReadingCompleted('reading-free-1', {
  free_reading_number: 1,
  remaining_free_readings: 1,
  deck_type: 'tarot',
  spread_type: 'tarot_three',
  need_type: 'career_finance',
});
analytics.trackOracleFreeReadingCompleted('reading-free-1', {
  free_reading_number: 1,
  remaining_free_readings: 1,
  deck_type: 'tarot',
  spread_type: 'tarot_three',
  need_type: 'career_finance',
});
assert(count('oracle_free_reading_completed') === 1, 'Free completion must be once per reading_id');

analytics.trackOraclePaywallViewed({
  reason: 'free_limit_reached', completed_free_readings: 2,
  deck_type: 'tarot', spread_type: 'tarot_three', need_type: 'career_finance',
});
assert(count('oracle_paywall_viewed') === 1, 'Paywall event must be emitted once per view');

const firstReadingId = analytics.trackReadingStart('tarot_three', 'not-a-free-text-question');
const duplicateReadingId = analytics.trackReadingStart('tarot_three', 'love');
assert(firstReadingId && firstReadingId === duplicateReadingId, 'Repeated start before completion must reuse reading_id');
assert(count('reading_start') === 1, 'Repeated start must not duplicate reading_start');
assert(event('reading_start').params.topic === 'general', 'Unknown topic must be normalized to general');

analytics.trackCardDrawComplete('tarot_three', 2);
assert(count('card_draw_complete') === 0, 'Incomplete spread must not send card_draw_complete');
analytics.trackCardDrawComplete('tarot_three', 3);
analytics.trackCardDrawComplete('tarot_three', 3);
assert(count('card_draw_complete') === 1, 'card_draw_complete must be once per reading_id');

analytics.trackFreeReadingView('tarot_three', 'free_unlock_api', false);
assert(count('free_reading_view') === 0, 'Empty content must not send free_reading_view');
analytics.trackFreeReadingView('tarot_three', 'free_unlock_api', true);
analytics.trackFreeReadingView('tarot_three', 'free_unlock_api', true);
assert(count('free_reading_view') === 1, 'Visible free content must send free_reading_view once');

analytics.trackUnlockClick('tarot_three');
analytics.trackUnlockClick('tarot_three');
assert(count('unlock_click') === 0, 'retired per-spread tarot products must not emit paid unlock events');

assert(count('begin_checkout') === 0, 'No successful order means no begin_checkout');
analytics.trackBeginCheckout('tarot_three', 'CF202608150001', 199, '偉特塔羅・三張牌陣');
analytics.trackBeginCheckout('tarot_three', 'CF202608150001', 199, '偉特塔羅・三張牌陣');
assert(count('begin_checkout') === 1, 'begin_checkout must be once per transaction_id');
assert(event('begin_checkout').params.transaction_id === 'CF202608150001', 'Checkout must use merchant transaction number');

assert(count('purchase') === 0, 'Unconfirmed payment must not send purchase');
analytics.trackPurchase('tarot_three', 'CF202608150001', 199, '偉特塔羅・三張牌陣', 'Credit_CreditCard');
analytics.trackPurchase('tarot_three', 'CF202608150001', 199, '偉特塔羅・三張牌陣', 'Credit_CreditCard');
assert(count('purchase') === 1, 'purchase must be persistently deduplicated by transaction_id');
assert(event('purchase').params.payment_type === 'Credit_CreditCard', 'purchase must include backend payment type');

analytics.trackTarotSubscriptionView();
analytics.trackTarotSubscriptionView();
analytics.trackTarotSubscriptionCheckout();
analytics.trackTarotSubscriptionCheckout();
analytics.trackTarotSubscriptionStart('CFSUBSCRIPTION001');
analytics.trackTarotSubscriptionStart('CFSUBSCRIPTION001');
analytics.trackPurchase('tarot_monthly_600', 'CFSUBSCRIPTION001', 600, '塔羅全館月費會員', 'Credit_CreditCard');
analytics.trackPurchase('tarot_monthly_600', 'CFSUBSCRIPTION001', 600, '塔羅全館月費會員', 'Credit_CreditCard');
analytics.trackTarotSubscriptionRenewal('CFSUBSCRIPTION001-2', 2);
analytics.trackTarotSubscriptionRenewal('CFSUBSCRIPTION001-2', 2);
analytics.trackTarotSubscriptionPaymentFailed(3);
analytics.trackTarotSubscriptionPaymentFailed(3);
analytics.trackTarotSubscriptionCancelled();
analytics.trackTarotSubscriptionCancelled();
assert(count('tarot_subscription_view') === 1, 'subscription view must be deduplicated');
assert(count('tarot_subscription_checkout') === 1, 'subscription checkout must be deduplicated');
assert(count('tarot_subscription_start') === 1, 'subscription start must be deduplicated by transaction');
assert(count('tarot_subscription_renewal') === 1, 'subscription renewal must be deduplicated by transaction');
assert(count('tarot_subscription_payment_failed') === 1, 'subscription failure must be deduplicated by cycle');
assert(count('tarot_subscription_cancelled') === 1, 'subscription cancellation must be deduplicated');
assert(count('purchase') === 2, 'subscription purchase must be emitted once with a unique transaction_id');
const subscriptionPurchase = events.find((sent) => sent.name === 'purchase' && sent.params.plan_id === 'tarot_monthly_600');
assert(subscriptionPurchase?.params.billing_type === 'recurring', 'subscription purchase must identify recurring billing');

for (const sent of events) {
  assert(!hasSensitiveKey(sent.params), `${sent.name} contains a sensitive parameter key`);
  const items = sent.params.items as Array<Record<string, unknown>> | undefined;
  if (items) assert(items.every((entry) => entry.item_category === 'oracle_reading' || entry.item_category === 'tarot_subscription'), `${sent.name} item_category is invalid`);
}

console.log(`GA4 oracle funnel checks passed (${events.length} events).`);
