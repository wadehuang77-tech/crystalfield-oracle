import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { mayaForDate, mayaSignature } from '../src/lib/maya';

interface ReferenceCase {
  date: string;
  law_of_time_kin: number;
  law_of_time_name: string;
  ark_kin: number;
  ark_seal: string;
  ark_tone: string;
  ark_wavespell: number;
}
const evidence: { cases: ReferenceCase[] } = JSON.parse(await readFile(new URL('./maya-external-reference.json', import.meta.url), 'utf8'));
const ordinary = evidence.cases.filter((entry) => entry.date.slice(5) !== '02-29');
const normalize = (text: string) => text.toLowerCase().replace(/[\s-]/g, '');

test('Two original external calculators agree with the engine on 296 ordinary dates across 1900–2026', () => {
  assert.equal(ordinary.length, 296);
  for (const entry of ordinary) {
    const actual = mayaForDate(entry.date, 'en');
    assert.equal(actual.kin_number, entry.law_of_time_kin, `${entry.date}: Law of Time`);
    assert.equal(actual.kin_number, entry.ark_kin, `${entry.date}: Galactic Ark`);
    assert.equal(normalize(actual.solar_seal), normalize(entry.ark_seal), `${entry.date}: seal`);
    assert.equal(normalize(actual.galactic_tone), normalize(entry.ark_tone), `${entry.date}: tone`);
    const [color, ...seal] = actual.solar_seal.split(' ');
    assert.equal(normalize(entry.law_of_time_name), normalize(`${color} ${actual.galactic_tone} ${seal.join(' ')}`), `${entry.date}: Law of Time name`);
    assert.equal(actual.wavespell, entry.ark_wavespell, `${entry.date}: wavespell`);
  }
  assert.equal(mayaForDate('1987-07-26', 'en').kin_number, 34);
  assert.equal(new Set(ordinary.map((entry) => entry.ark_kin)).size, 260);
  assert.equal(new Set(ordinary.map((entry) => entry.ark_seal)).size, 20);
  assert.equal(new Set(ordinary.map((entry) => entry.ark_tone)).size, 13);
  assert.equal(new Set(ordinary.map((entry) => entry.ark_wavespell)).size, 20);
});

test('Five external February 29 examples expose the known legacy difference, not an authorized birthday rule', () => {
  const leapDays = evidence.cases.filter((entry) => entry.date.slice(5) === '02-29');
  assert.equal(leapDays.length, 5);
  for (const entry of leapDays) {
    assert.equal(entry.law_of_time_kin, entry.ark_kin);
    const actual = mayaForDate(entry.date, 'en').kin_number;
    assert.notEqual(actual, entry.ark_kin, `${entry.date}: retain explicit blocked rule`);
    assert.equal(actual, (entry.ark_kin % 260) + 1);
  }
});

test('Numeric castle boundaries match the independently published five 52-KIN groups; symbolism stays out of scope', () => {
  // LifeMoment's published grouping specification, not a second calculated date dataset.
  for (const [first, last, castle] of [[1, 52, 1], [53, 104, 2], [105, 156, 3], [157, 208, 4], [209, 260, 5]]) {
    assert.equal(mayaSignature(first, 'en').castle, castle);
    assert.equal(mayaSignature(last, 'en').castle, castle);
  }
});
