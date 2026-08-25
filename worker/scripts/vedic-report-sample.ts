import assert from 'node:assert/strict';
import {
  buildVedicFallbackReport,
  buildVedicForecastPeriods,
  mergeVedicForecastInterpretations,
  type VedicChartData,
} from '../src/vedicAstrology.ts';

const chart: VedicChartData = {
  ayanamsa: 'LAHIRI', lagna: 'Capricorn', sunSign: 'Libra', moonSign: 'Libra', moonNakshatra: 'Chitra - Pada 4',
  planets: { Sun: 'Libra', Moon: 'Libra', Mars: 'Gemini', Mercury: 'Scorpio', Jupiter: 'Virgo', Venus: 'Scorpio', Saturn: 'Capricorn', Rahu: 'Sagittarius', Ketu: 'Gemini' },
  planetLongitudes: { Sun: 188.44, Moon: 181.99, Mars: 86.95, Mercury: 211.2, Jupiter: 159.3, Venus: 223.08, Saturn: 288.13, Rahu: 240.24, Ketu: 60.24 },
  lagnaLongitude: 301.18,
  divisionalCharts: {
    d9: { lagna: 'Libra', planets: { Sun: 'Pisces', Moon: 'Libra', Mars: 'Sagittarius', Mercury: 'Capricorn', Jupiter: 'Leo', Venus: 'Capricorn', Saturn: 'Virgo', Rahu: 'Cancer', Ketu: 'Capricorn' } },
    d10: { lagna: 'Scorpio', planets: { Sun: 'Capricorn', Moon: 'Sagittarius', Mars: 'Virgo', Mercury: 'Pisces', Jupiter: 'Taurus', Venus: 'Cancer', Saturn: 'Aquarius', Rahu: 'Leo', Ketu: 'Aquarius' } },
  },
  mahaDasha: 'Jupiter', antarDasha: 'Saturn',
  dashaTimeline: [
    { lord: 'Jupiter', start: '01/01/2025', end: '31/12/2027', subPeriods: [
      { lord: 'Saturn', start: '01/01/2025', end: '30/06/2027' },
      { lord: 'Mercury', start: '01/07/2027', end: '31/12/2027' },
    ] },
    { lord: 'Saturn', start: '01/01/2028', end: '31/12/2035', subPeriods: [
      { lord: 'Saturn', start: '01/01/2028', end: '31/12/2029' },
      { lord: 'Venus', start: '01/01/2030', end: '31/12/2032' },
      { lord: 'Sun', start: '01/01/2033', end: '31/12/2035' },
    ] },
  ],
  housePlacements: { Sun: 10, Moon: 10, Mars: 6, Mercury: 11, Jupiter: 9, Venus: 11, Saturn: 1, Rahu: 12, Ketu: 6 },
  houseLords: { '1': 'Saturn', '2': 'Saturn', '3': 'Jupiter', '4': 'Mars', '5': 'Venus', '6': 'Mercury', '7': 'Moon', '8': 'Sun', '9': 'Mercury', '10': 'Venus', '11': 'Mars', '12': 'Jupiter' },
  karmaAspects: [], timezone: 'Asia/Kolkata', timezoneOffset: '+05:30',
};

const referenceDate = new Date('2026-08-25T00:00:00Z');
const skeleton = buildVedicForecastPeriods(chart, referenceDate, 5);

// Test A + E: every real Antardasha is retained, including a Mahadasha boundary.
assert.deepEqual(skeleton.map(({ mahaDasha, antarDasha }) => [mahaDasha, antarDasha]), [
  ['Jupiter', 'Saturn'], ['Jupiter', 'Mercury'], ['Saturn', 'Saturn'], ['Saturn', 'Venus'],
]);
assert.deepEqual(skeleton.map(({ startDate, endDate }) => [startDate, endDate]), [
  ['01/01/2025', '30/06/2027'], ['01/07/2027', '31/12/2027'], ['01/01/2028', '31/12/2029'], ['01/01/2030', '31/12/2032'],
]);

const interpretationFor = (index: number) => ({
  theme: `第${index}段專屬主題`, overall: `第${index}段整體趨勢，內容依次運而不同。`,
  career: { trend: `第${index}段事業趨勢`, advice: [`第${index}段事業建議`], avoid: [`第${index}段事業避免事項`] },
  wealth: { trend: `第${index}段財運趨勢`, advice: [`第${index}段財務建議`], avoid: [`第${index}段財務避免事項`] },
  relationship: { trend: `第${index}段感情趨勢`, advice: [`第${index}段關係建議`], avoid: [`第${index}段關係避免事項`] },
  growth: { trend: `第${index}段成長方向` },
  opportunityScores: { career: 1 + (index % 5), wealth: 1 + ((index + 1) % 5), relationship: 1 + ((index + 2) % 5), growth: 1 + ((index + 3) % 5) },
  turningPoint: { isImportant: index === 3, reason: `第${index}段轉折判斷依據。` },
  annualFocus: Array.from({ length: index === 2 ? 1 : 2 }, (_, offset) => ({ year: index === 1 ? 2026 + offset : index === 2 ? 2027 : index === 3 ? 2028 + offset : 2030 + offset, priority: `第${index}段年度重點${offset + 1}`, why: `第${index}段年度星盤理由${offset + 1}` })),
  confidence: 'high' as const,
  why: `第${index}段大運背景與次運觸發依據。`, keyMessage: `第${index}段一句話提醒。`,
});
const completeAiResponse = Object.fromEntries(skeleton.map((period, index) => [period.id, { ...interpretationFor(index + 1), startDate: 'AI_MUST_NOT_OVERRIDE_THIS_DATE' }]));
const merged = mergeVedicForecastInterpretations(skeleton, completeAiResponse);
assert.equal(merged.length, skeleton.length);

// Test C: an AI-provided date is ignored; the program-owned skeleton wins.
assert.equal(merged[0].startDate, skeleton[0].startDate);
assert.notEqual(merged[0].startDate, 'AI_MUST_NOT_OVERRIDE_THIS_DATE');

// Test B: one missing period fails validation.
const incompleteAiResponse = { ...completeAiResponse };
delete incompleteAiResponse.period_2;
assert.throws(() => mergeVedicForecastInterpretations(skeleton, incompleteAiResponse), /VEDIC_FORECAST_AI_INCOMPLETE/);
const invalidScoreResponse = structuredClone(completeAiResponse);
invalidScoreResponse.period_1.opportunityScores.career = 6;
assert.throws(() => mergeVedicForecastInterpretations(skeleton, invalidScoreResponse), /VEDIC_FORECAST_AI_INCOMPLETE/);
assert.throws(() => buildVedicForecastPeriods({ ...chart, dashaTimeline: [{ ...chart.dashaTimeline[0], subPeriods: [] }] }, referenceDate, 5), /VEDIC_FORECAST_MISSING_ANTARDASHA/);

// Test D: service-failure fallback still contains every Antardasha period.
const report = buildVedicFallbackReport('complete', chart, null);
assert.equal(report.formatVersion, 4);
assert.equal(report.sections.length, 9);
for (const [index, section] of report.sections.entries()) {
  assert.ok(section.conclusion, `section ${index + 1} conclusion`);
  assert.ok(section.strengths.length >= 2, `section ${index + 1} strengths`);
  assert.ok(section.risks.length >= 2, `section ${index + 1} risks`);
  assert.ok(section.examples.length >= 2, `section ${index + 1} examples`);
  assert.equal(section.actions.length, 3, `section ${index + 1} actions`);
  assert.ok(section.direction, `section ${index + 1} direction`);
  assert.ok(section.evidence.length >= 2, `section ${index + 1} evidence`);
}
assert.ok(report.sections[2].transition);
assert.ok(report.sections.every((section) => section.coreTension && section.depth && section.reasoningBasis?.length));
assert.equal(new Set(report.sections.map((section) => section.analysisBlocks?.map((block) => block.label).join('|'))).size, 9, 'all section blueprints must differ');
assert.ok(report.sections.every((section) => section.evidence.every((item) => item.trim() && !/^[-–—*•·]+$/.test(item))), 'evidence cannot be blank placeholders');
assert.doesNotMatch(JSON.stringify(report), /svg(?:能|容易|工作)/i);
const fallbackTimeline = report.sections[8].timeline || [];
assert.equal(fallbackTimeline.length, skeleton.length);
assert.deepEqual(fallbackTimeline.map(({ id, mahaDasha, antarDasha, startDate, endDate }) => ({ id, mahaDasha, antarDasha, startDate, endDate })), skeleton.map(({ id, mahaDasha, antarDasha, startDate, endDate }) => ({ id, mahaDasha, antarDasha, startDate, endDate })));

// Test F: different Antardasha periods cannot collapse to identical fallback text.
const fallbackSignatures = fallbackTimeline.map((period) => JSON.stringify(period.interpretation));
assert.equal(new Set(fallbackSignatures).size, fallbackSignatures.length);
for (const period of fallbackTimeline) assert.ok(Object.values(period.interpretation.opportunityScores).every((score) => score >= 1 && score <= 5));
const fallbackSentences = fallbackTimeline.flatMap(({ interpretation }) => [
  interpretation.theme, interpretation.overall,
  interpretation.career.trend, ...interpretation.career.advice, ...interpretation.career.avoid,
  interpretation.wealth.trend, ...interpretation.wealth.advice, ...interpretation.wealth.avoid,
  interpretation.relationship.trend, ...interpretation.relationship.advice, ...interpretation.relationship.avoid,
  interpretation.growth.trend, interpretation.why, interpretation.keyMessage,
]).map((value) => value.replace(/[\s，。！？、；：：「」『』（）()]/g, '').toLowerCase());
assert.equal(new Set(fallbackSentences).size, fallbackSentences.length, 'fallback period sentences must not repeat');

const secondChart: VedicChartData = { ...chart, lagna: 'Aries', planets: { ...chart.planets, Rahu: 'Leo', Ketu: 'Aquarius', Venus: 'Pisces' }, housePlacements: { ...chart.housePlacements, Rahu: 5, Ketu: 11, Venus: 12 } };
const secondReport = buildVedicFallbackReport('complete', secondChart, null);
assert.notEqual(secondReport.sections[0].conclusion, report.sections[0].conclusion, 'different charts need visibly different karma conclusions');
assert.notEqual(secondReport.sections[3].evidence.join('|'), report.sections[3].evidence.join('|'), 'different charts need visibly different relationship evidence');

console.log(JSON.stringify({ skeleton, timeline: fallbackTimeline }, null, 2));
console.log('Forecast tests A-F: passed');
