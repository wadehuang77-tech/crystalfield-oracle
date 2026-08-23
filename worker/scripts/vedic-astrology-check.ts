import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPREAD_CATALOG } from '../src/ecpay.ts';

const expectedPrices: Record<string, number> = {
  vedic_career: 399,
  vedic_relationship: 399,
  vedic_karma: 399,
  vedic_timeline: 399,
  vedic_full: 999,
  vedic_soul_karma: 499,
  vedic_life_full: 499,
  vedic_complete: 999,
};

for (const [productId, price] of Object.entries(expectedPrices)) {
  assert.equal(SPREAD_CATALOG[productId]?.amount, price, `${productId} price`);
}

const source = readFileSync(new URL('../src/vedicAstrology.ts', import.meta.url), 'utf8');
assert.match(source, /DasaAtRange/);
assert.match(source, /housePlacements/);
assert.match(source, /houseLords/);
assert.match(source, /karmaAspects/);
for (const heading of [
  '① 前世因果與業力',
  '② 今生的人生課題',
  '③ 天賦、使命與人生方向',
  '④ 感情、婚姻與業力關係',
  '⑤ 財富與事業業力',
  '⑥ 未來人生時間軸',
  '⑦ 靈魂業力總結',
]) {
  assert.match(source, new RegExp(heading), `missing complete report heading: ${heading}`);
}
assert.match(source, /loadCurrentTransits/);
assert.match(source, /current_transits/);
assert.match(source, /至少 200 個中文字/);
assert.match(source, /section\.body\.length < 200/);
assert.match(source, /existingNeedsRefresh/);
assert.match(source, /FREE_READING_MIN_CHARS = 250/);
assert.match(source, /Ayanamsa:\s*'LAHIRI'/);
assert.match(source, /order\.status !== 'paid'/);
assert.match(source, /order\.item_id\.startsWith\('vedic_'\)/);
assert.match(source, /order_id TEXT NOT NULL UNIQUE/);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_date/i);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_place/i);

console.log('Vedic astrology catalog, payment guard, timeline and privacy checks: passed');
