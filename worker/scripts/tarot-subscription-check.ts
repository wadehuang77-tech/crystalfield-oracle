import { SPREAD_CATALOG } from '../src/ecpay';
import { TAROT_DECK_CATALOG, TAROT_SPREADS, TAROT_SUBSCRIPTION } from '../src/tarotCatalog';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(TAROT_DECK_CATALOG.length === 7, `Expected 7 tarot decks, found ${TAROT_DECK_CATALOG.length}`);

const spreads = TAROT_DECK_CATALOG.flatMap((deck) => deck.spreads);
assert(spreads.length === 16, `Expected 16 tarot spreads, found ${spreads.length}`);
assert(new Set(spreads.map((spread) => spread.id)).size === spreads.length, 'Tarot spread IDs must be unique');
assert(Object.keys(TAROT_SPREADS).length === spreads.length, 'Every catalog spread must be in the access map');

const membershipProduct = SPREAD_CATALOG[TAROT_SUBSCRIPTION.id];
assert(membershipProduct?.amount === 600, 'tarot_monthly_600 must cost NT$600');

const retiredProducts = [
  'tarot_three', 'tarot_celtic', 'tarot_pastlife', 'osho_three', 'celtic_cross',
  'cosmic_cross', 'unicorns_three', 'dragons_three', 'egyptian_pastlife',
  'three_card_5pack_30d', 'three_pastlife_3plus3_30d', 'deep_spread_5pack_30d',
  'three_card_3pack_7d', 'ten_card_3pack_7d', 'pastlife_3pack_7d',
  'bundle_1499_30d', 'bundle_1999_30d', 'membership_monthly',
];
assert(retiredProducts.every((id) => !SPREAD_CATALOG[id]), 'A retired tarot payment product is still purchasable');

assert(SPREAD_CATALOG.numerology_basic?.amount === 199, 'Numerology pricing changed unexpectedly');
assert(SPREAD_CATALOG.human_design_basic?.amount === 199, 'Human Design pricing changed unexpectedly');
assert(SPREAD_CATALOG.vedic_complete?.amount === 699, 'Vedic pricing changed unexpectedly');

for (const deck of TAROT_DECK_CATALOG) {
  console.log(`${deck.name}: ${deck.spreads.length} spreads`);
}
console.log(`PASS: ${TAROT_SUBSCRIPTION.id}, ${TAROT_SUBSCRIPTION.amount} TWD, ${TAROT_SUBSCRIPTION.entitlementDays} days, unlimited access`);
