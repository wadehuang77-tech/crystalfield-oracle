import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPREAD_CATALOG } from '../src/ecpay.ts';

const expectedPrices: Record<string, number> = {
  vedic_career: 399,
  vedic_relationship: 399,
  vedic_karma: 399,
  vedic_timeline: 399,
  vedic_full: 999,
};

for (const [productId, price] of Object.entries(expectedPrices)) {
  assert.equal(SPREAD_CATALOG[productId]?.amount, price, `${productId} price`);
}

const source = readFileSync(new URL('../src/vedicAstrology.ts', import.meta.url), 'utf8');
assert.match(source, /DasaAtRange/);
assert.match(source, /Ayanamsa:\s*'LAHIRI'/);
assert.match(source, /order\.status !== 'paid'/);
assert.match(source, /order\.item_id\.startsWith\('vedic_'\)/);
assert.match(source, /order_id TEXT NOT NULL UNIQUE/);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_date/i);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_place/i);

console.log('Vedic astrology catalog, payment guard, timeline and privacy checks: passed');
