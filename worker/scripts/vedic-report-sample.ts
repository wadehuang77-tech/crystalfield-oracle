import assert from 'node:assert/strict';
import { buildVedicFallbackReport, type VedicChartData } from '../src/vedicAstrology.ts';

const chart: VedicChartData = {
  ayanamsa: 'LAHIRI',
  lagna: 'Capricorn', sunSign: 'Libra', moonSign: 'Libra', moonNakshatra: 'Chitra - Pada 4',
  planets: {
    Sun: 'Libra', Moon: 'Libra', Mars: 'Gemini', Mercury: 'Scorpio', Jupiter: 'Virgo',
    Venus: 'Scorpio', Saturn: 'Capricorn', Rahu: 'Sagittarius', Ketu: 'Gemini',
  },
  planetLongitudes: {
    Sun: 188.44, Moon: 181.99, Mars: 86.95, Mercury: 211.2, Jupiter: 159.3,
    Venus: 223.08, Saturn: 288.13, Rahu: 240.24, Ketu: 60.24,
  },
  lagnaLongitude: 301.18,
  divisionalCharts: {
    d9: {
      lagna: 'Libra',
      planets: { Sun: 'Pisces', Moon: 'Libra', Mars: 'Sagittarius', Mercury: 'Capricorn', Jupiter: 'Leo', Venus: 'Capricorn', Saturn: 'Virgo', Rahu: 'Cancer', Ketu: 'Capricorn' },
    },
    d10: {
      lagna: 'Scorpio',
      planets: { Sun: 'Capricorn', Moon: 'Sagittarius', Mars: 'Virgo', Mercury: 'Pisces', Jupiter: 'Taurus', Venus: 'Cancer', Saturn: 'Aquarius', Rahu: 'Leo', Ketu: 'Aquarius' },
    },
  },
  mahaDasha: 'Jupiter', antarDasha: 'Saturn',
  dashaTimeline: [
    { lord: 'Jupiter', start: '01/01/2026', end: '31/12/2027', subPeriods: [{ lord: 'Saturn', start: '01/01/2026', end: '30/06/2027' }] },
    { lord: 'Saturn', start: '01/01/2028', end: '31/12/2030', subPeriods: [{ lord: 'Mercury', start: '01/01/2028', end: '31/12/2028' }] },
  ],
  housePlacements: { Sun: 10, Moon: 10, Mars: 6, Mercury: 11, Jupiter: 9, Venus: 11, Saturn: 1, Rahu: 12, Ketu: 6 },
  houseLords: { '1': 'Saturn', '2': 'Saturn', '3': 'Jupiter', '4': 'Mars', '5': 'Venus', '6': 'Mercury', '7': 'Moon', '8': 'Sun', '9': 'Mercury', '10': 'Venus', '11': 'Mars', '12': 'Jupiter' },
  karmaAspects: [], timezone: 'Asia/Kolkata', timezoneOffset: '+05:30',
};

const report = buildVedicFallbackReport('complete', chart, null);
assert.equal(report.formatVersion, 2);
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
assert.ok(report.sections[8].timeline?.length);

const normalized = report.sections.flatMap((section) => [
  section.conclusion, ...section.strengths, ...section.risks, ...section.examples, ...section.actions, section.direction,
  ...(section.timeline?.flatMap((stage) => [stage.theme, stage.career, stage.wealth, stage.relationship, stage.favorableDirection, stage.mainRisk, stage.action]) || []),
]).map((value) => value.replace(/[\s，。！？、；：：「」『』（）()]/g, '').toLowerCase());
assert.equal(new Set(normalized).size, normalized.length, 'report should not contain repeated sentences');

console.log(JSON.stringify(report, null, 2));
