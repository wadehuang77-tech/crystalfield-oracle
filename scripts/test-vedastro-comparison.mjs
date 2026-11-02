import assert from 'node:assert/strict';
import { compareChartData } from './compare-vedastro-engines.mjs';

const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const d1 = Object.fromEntries([['Ascendant', 12.5], ...planets.map((name, index) => [name, index * 31.25])]);
const d9 = Object.fromEntries(['Ascendant', ...planets].map(name => [name, 'Cancer']));
const d10 = Object.fromEntries(['Ascendant', ...planets].map(name => [name, 'Leo']));
const dasha = {
  mahadasha: 'Jupiter',
  antardasha: 'Saturn',
  mahadashaStart: '2024-01-01T00:00:00+08:00',
  mahadashaEnd: '2040-01-01T00:00:00+08:00',
  antardashaStart: '2025-01-01T00:00:00+08:00',
  antardashaEnd: '2027-06-01T00:00:00+08:00',
};
const selfhost = {
  d1: Object.fromEntries(Object.entries(d1).map(([name, longitude]) => [name, { longitude }])),
  d9: Object.fromEntries(Object.entries(d9).map(([name, sign]) => [name, { sign }])),
  d10: Object.fromEntries(Object.entries(d10).map(([name, sign]) => [name, { sign }])),
  dasha: { ...dasha },
};

const exact = compareChartData({ d1, d9, d10, dasha }, selfhost);
assert.ok(exact.d1.every(item => item.result === 'PASS'));
assert.ok(exact.d9.every(item => item.result === 'PASS'));
assert.ok(exact.d10.every(item => item.result === 'PASS'));
assert.equal(exact.dasha.result, 'PASS');

const formattedDashaDates = compareChartData(
  {
    d1,
    d9,
    d10,
    dasha: {
      ...dasha,
      mahadashaStart: '11:28 07/10/2026 +08:00',
      mahadashaEnd: '11:28 26/01/2033 +08:00',
      antardashaStart: '11:28 07/10/2026 +08:00',
      antardashaEnd: '11:28 22/09/2027 +08:00',
    },
  },
  {
    ...selfhost,
    dasha: {
      ...dasha,
      mahadashaStart: '2026-10-07T11:28:00+08:00',
      mahadashaEnd: '2033-01-26T11:28:00+08:00',
      antardashaStart: '2026-10-07T11:28:00+08:00',
      antardashaEnd: '2027-09-22T11:28:00+08:00',
    },
  },
);
assert.equal(formattedDashaDates.dasha.mahadashaStartDifferenceHours, 0);
assert.equal(formattedDashaDates.dasha.mahadashaEndDifferenceHours, 0);

const outsideTolerance = compareChartData(
  { d1: { ...d1, Sun: d1.Sun + 0.0101 }, d9, d10, dasha },
  selfhost,
);
assert.equal(outsideTolerance.d1.find(item => item.name === 'Sun')?.result, 'FAIL');

const wrongVarga = compareChartData(
  { d1, d9: { ...d9, Moon: 'Aries' }, d10, dasha },
  selfhost,
);
assert.equal(wrongVarga.d9.find(item => item.name === 'Moon')?.result, 'FAIL');

const wrongDasha = compareChartData(
  { d1, d9, d10, dasha: { ...dasha, antardasha: 'Mercury' } },
  selfhost,
);
assert.equal(wrongDasha.dasha.result, 'FAIL');

const unavailableDivisions = compareChartData(
  { d1, dasha },
  { d1: selfhost.d1, dasha: selfhost.dasha },
);
assert.equal(unavailableDivisions.d9[0].result, 'NOT VERIFIED');
assert.equal(unavailableDivisions.d10[0].result, 'NOT VERIFIED');

console.log('PASS comparison thresholds and Dasha date parsing; D9/D10 sign-match logic and NOT VERIFIED state');
