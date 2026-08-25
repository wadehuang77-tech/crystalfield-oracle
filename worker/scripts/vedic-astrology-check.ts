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
assert.match(source, /AllPlanetLongitude/);
assert.match(source, /AllHouseLongitudes/);
assert.match(source, /deriveDivisionalCharts/);
assert.match(source, /housePlacements/);
assert.match(source, /houseLords/);
assert.match(source, /karmaAspects/);
for (const heading of [
  '① 前世業力',
  '② 今生的人生課題',
  '③ 羅喉／計都靈魂軸線',
  '④ 愛情與婚姻',
  '⑤ 財富模式',
  '⑥ 事業天賦',
  '⑦ D9 婚姻／靈魂成熟度',
  '⑧ D10 事業分盤',
  '⑨ 未來 3～5 年大運時間軸',
]) {
  assert.match(source, new RegExp(heading), `missing complete report heading: ${heading}`);
}
assert.match(source, /loadCurrentTransits/);
assert.match(source, /current_transits/);
assert.match(source, /VEDIC_REPORT_FORMAT_VERSION = 4/);
for (const field of ['conclusion', 'strengths', 'risks', 'examples', 'actions', 'direction', 'evidence', 'transition', 'timeline']) {
  assert.match(source, new RegExp(field), `missing structured report field: ${field}`);
}
assert.match(source, /reportHasDuplicateSentences/);
assert.match(source, /validStructuredSection/);
assert.match(source, /第4項綜合D1第7宮、第7宮主、金星、木星、月亮、羅喉計都、D9與大運/);
assert.match(source, /第7項將D9與D1交叉/);
assert.match(source, /第8項將D10、D1第10宮與目前大運交叉/);
assert.match(source, /第9項的時間骨架已由 forecastPeriods 固定建立/);
assert.match(source, /buildVedicForecastPeriods/);
assert.match(source, /mergeVedicForecastInterpretations/);
assert.match(source, /VEDIC_FORECAST_MISSING_ANTARDASHA/);
assert.match(source, /不得新增、刪除、合併、拆分、排序或修改 forecastPeriods/);
assert.match(source, /chart,/);
assert.match(source, /current_transits: transits/);
assert.match(source, /existingNeedsRefresh/);
assert.match(source, /FREE_READING_MIN_CHARS = 250/);
assert.match(source, /Ayanamsa:\s*'LAHIRI'/);
assert.match(source, /order\.status !== 'paid'/);
assert.match(source, /order\.item_id\.startsWith\('vedic_'\)/);
assert.match(source, /order_id TEXT NOT NULL UNIQUE/);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_date/i);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_place/i);

console.log('Vedic astrology catalog, payment guard, timeline and privacy checks: passed');
