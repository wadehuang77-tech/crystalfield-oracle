import assert from 'node:assert/strict';
import { buildVedicFallbackReport, buildVedicForecastPeriods, mergeVedicForecastInterpretations, validateCompleteVedicReport, auditCompleteVedicReport, type VedicChartData } from '../src/vedicAstrology.ts';

const chart: VedicChartData = {
  ayanamsa: 'LAHIRI', lagna: 'Capricorn', sunSign: 'Libra', moonSign: 'Libra', moonNakshatra: 'Chitra - Pada 4',
  planets: { Sun: 'Libra', Moon: 'Libra', Mars: 'Gemini', Mercury: 'Scorpio', Jupiter: 'Virgo', Venus: 'Scorpio', Saturn: 'Capricorn', Rahu: 'Sagittarius', Ketu: 'Gemini' },
  planetLongitudes: { Sun: 188.44, Moon: 181.99, Mars: 86.95, Mercury: 211.2, Jupiter: 159.3, Venus: 223.08, Saturn: 288.13, Rahu: 240.24, Ketu: 60.24 }, lagnaLongitude: 301.18,
  divisionalCharts: { d9: { lagna: 'Libra', planets: { Sun: 'Pisces', Moon: 'Libra', Venus: 'Capricorn' } }, d10: { lagna: 'Scorpio', planets: { Sun: 'Capricorn', Saturn: 'Aquarius', Rahu: 'Leo' } } },
  mahaDasha: 'Jupiter', antarDasha: 'Saturn',
  dashaTimeline: [
    { lord: 'Jupiter', start: '01/01/2025', end: '31/12/2027', subPeriods: [{ lord: 'Saturn', start: '01/01/2025', end: '30/06/2027' }, { lord: 'Mercury', start: '01/07/2027', end: '31/12/2027' }] },
    { lord: 'Saturn', start: '01/01/2028', end: '31/12/2035', subPeriods: [{ lord: 'Saturn', start: '01/01/2028', end: '31/12/2029' }, { lord: 'Venus', start: '01/01/2030', end: '31/12/2032' }] },
  ],
  housePlacements: { Sun: 10, Moon: 10, Mars: 6, Mercury: 11, Jupiter: 9, Venus: 11, Saturn: 1, Rahu: 12, Ketu: 6 },
  houseLords: { '1': 'Saturn', '2': 'Saturn', '5': 'Venus', '6': 'Mercury', '7': 'Moon', '9': 'Mercury', '10': 'Venus', '11': 'Mars' }, karmaAspects: [], timezone: 'Asia/Kolkata', timezoneOffset: '+05:30',
};

const skeleton = buildVedicForecastPeriods(chart, new Date('2026-08-25T00:00:00Z'), 5);
assert.deepEqual(skeleton.map(({ mahaDasha, antarDasha }) => [mahaDasha, antarDasha]), [['Jupiter', 'Saturn'], ['Jupiter', 'Mercury'], ['Saturn', 'Saturn'], ['Saturn', 'Venus']]);
const vedAstroTimestampChart: VedicChartData = {
  ...chart,
  dashaTimeline: chart.dashaTimeline.map((maha) => ({
    ...maha,
    start: `13:09 ${maha.start} +08:00`,
    end: `13:09 ${maha.end} +08:00`,
    subPeriods: maha.subPeriods.map((antar) => ({
      ...antar,
      start: `13:09 ${antar.start} +08:00`,
      end: `13:09 ${antar.end} +08:00`,
    })),
  })),
};
assert.equal(buildVedicForecastPeriods(vedAstroTimestampChart, new Date('2026-08-25T00:00:00Z'), 5).length, skeleton.length);
const consultation = (index: number) => `這是第${index}段依照實際大運與次運寫成的個人諮詢。這段文字不把行星當成百科條目，而是說明當事人在工作安排、金錢責任與關係互動上最可能遇到的現實卡點。長期背景與短期觸發因素必須一起看，因此建議先確認目前承擔的責任是否超過可用時間，再選一件最能留下成果的事推進。執行上，先把承諾、成本、期限及退出條件寫清楚，兩週後依實際結果調整，不因一時焦慮同時開啟多個計畫。這樣才能把此階段的壓力轉成可累積的成果，而不是反覆忙碌。`;
const ai = Object.fromEntries(skeleton.map((period, index) => [period.id, { consultation: consultation(index + 1), startDate: 'AI_CANNOT_OVERRIDE' }]));
const merged = mergeVedicForecastInterpretations(skeleton, ai, chart);
assert.equal(merged[0].startDate, skeleton[0].startDate);
assert.ok(merged.every((period) => period.interpretation.evidence.length >= 2));
const missing = { ...ai }; delete missing.period_2;
assert.throws(() => mergeVedicForecastInterpretations(skeleton, missing, chart), /VEDIC_FORECAST_AI_INCOMPLETE/);
assert.throws(() => mergeVedicForecastInterpretations(skeleton, { ...ai, period_1: { consultation: '太短' } }, chart), /VEDIC_FORECAST_AI_INCOMPLETE/);

const report = buildVedicFallbackReport('complete', chart, null);
assert.equal(report.formatVersion, 8);
assert.equal(report.sections.length, 9);
assert.equal(validateCompleteVedicReport(report), false, 'the compact deterministic fallback must not be mistaken for a premium AI report');
assert.ok(auditCompleteVedicReport(report).some((issue) => issue.includes('too_short')));
assert.ok(report.sections.every((section) => section.consultation.length >= 180 && section.evidence.length >= 2));
assert.match(report.sections[6].consultation, /D1|D9|年輕|成熟/);
assert.match(report.sections[7].consultation, /D1|D10|社會|職涯/);
assert.equal(report.sections[8].timeline?.length, skeleton.length);
assert.doesNotMatch(JSON.stringify(report), /"(conclusion|strengths|risks|analysisBlocks|opportunityScores|confidence)"\s*:/);
assert.doesNotMatch(JSON.stringify(report), /AI_CANNOT_OVERRIDE|fallback|保守版本/i);
assert.equal(new Set(report.sections.map((section) => section.consultation)).size, 9);
assert.ok(report.sections.every((section) => section.evidence.every((item) => item.factor.trim() && item.value.trim() && item.relevance.trim())), 'blank evidence must never reach the report');
const second = buildVedicFallbackReport('complete', { ...chart, lagna: 'Aries', planets: { ...chart.planets, Rahu: 'Leo', Ketu: 'Aquarius' }, housePlacements: { ...chart.housePlacements, Rahu: 5, Ketu: 11 } }, null);
assert.notEqual(second.sections[0].consultation, report.sections[0].consultation);
console.log(JSON.stringify({ report }, null, 2));
console.log('Vedic consultation-schema, evidence ownership, timeline and repetition tests: passed');
