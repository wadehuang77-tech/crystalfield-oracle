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
assert.match(source, /VEDIC_REPORT_FORMAT_VERSION = 10/);
assert.match(source, /①至⑧每篇以350至500個繁體中文字為目標/);
assert.match(source, /length <= 900/);
assert.match(source, /section_\$\{sectionNumber\}_too_long_\$\{length\}/);
assert.match(source, /slice\(0, 3\)/);
assert.match(source, /Promise\.allSettled\(nextIndexes/);
assert.match(source, /reasoning: \{ effort: 'low' \}/);
assert.match(source, /verbosity: 'low'/);
assert.match(source, /OpenAI report incomplete/);
assert.match(source, /一個被說中的深層問題、一個當事人原本沒想到的成因、一個隱藏的心理回報或安全感來源/);
assert.match(source, /traditionalChineseLength/);
assert.match(source, /duplicate_or_high_similarity/);
assert.match(source, /const resolvedChartId = linkedChartId/);
assert.match(source, /if \(chartId \|\| chartToken\)/);
assert.match(source, /rateLimit\(env, 'vedic-report-order', orderId, 40, 3600\)/);
for (const field of ['consultation', 'evidence', 'timeline']) {
  assert.match(source, new RegExp(field), `missing structured report field: ${field}`);
}
assert.match(source, /reportHasDuplicateSentences/);
assert.match(source, /validStructuredSection/);
assert.match(source, /最高原則：不要問這個星體代表什麼/);
assert.match(source, /自然比較 D1 的早期關係反應與 D9/);
assert.match(source, /自然比較 D1 的職涯動機與 D10/);
assert.match(source, /forecast_periods 是程式固定骨架/);
assert.match(source, /現象→深層機制→吸引或重複模式→代價→真正核心→具體做法→成熟版本/);
assert.match(source, /VEDIC_REPORT_REGENERATE/);
assert.match(source, /buildVedicForecastPeriods/);
assert.match(source, /mergeVedicForecastInterpretations/);
assert.match(source, /VEDIC_FORECAST_MISSING_ANTARDASHA/);
assert.match(source, /不得增加、刪除、合併、改序或改日期/);
assert.match(source, /chart,/);
assert.match(source, /current_transits: transits/);
assert.match(source, /existingNeedsRefresh/);
assert.match(source, /validateCompleteVedicReport\(existingReport as VedicPaidReport\)/);
assert.match(source, /const maximumLength = kind === 'period' \? 600 : 1100/);
assert.match(source, /transientFallback: true/);
assert.match(source, /FREE_READING_MIN_CHARS = 250/);
assert.match(source, /Ayanamsa:\s*'LAHIRI'/);
assert.match(source, /order\.status !== 'paid'/);
assert.match(source, /order\.item_id\.startsWith\('vedic_'\)/);
assert.match(source, /order_id TEXT NOT NULL UNIQUE/);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_date/i);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_place/i);

console.log('Vedic astrology catalog, payment guard, timeline and privacy checks: passed');
