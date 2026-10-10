import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateDreamspellKin, DREAMSPELL_EPOCH, getDayDifferenceExcludingLeapDays, getSolarTotemByKin, getToneByKin, getWaveByKin, getCastleByKin } from './dreamspell';
import { isMayaDate, mayaForDate, mayaSignature, mockMayaReport, taipeiDate, validateMayaReport, MAYA_PRODUCTS } from './maya';

test('The Dreamspell epoch anchors to Kin 34', () => {
  const result = calculateDreamspellKin(DREAMSPELL_EPOCH.iso);
  assert.equal(result.kin, 34);
  assert.equal(result.tone.number, 8);
  assert.equal(result.tone.nameEn, 'Galactic');
  assert.equal(result.solarTotem.nameEn, 'White Wizard');
});

test('The day difference excludes February 29 from the count', () => {
  const first = calculateDreamspellKin('1988-02-29');
  const second = calculateDreamspellKin('1988-03-01');

  assert.equal(first.moonCalendar.isLeapDay, true);
  assert.equal(first.kin, second.kin);
  assert.equal(
    first.calculation.dayDifferenceExcludingLeapDays,
    second.calculation.dayDifferenceExcludingLeapDays,
  );
  assert.equal(
    getDayDifferenceExcludingLeapDays(new Date('1987-07-26T00:00:00Z'), new Date('1988-03-01T00:00:00Z')),
    first.calculation.dayDifferenceExcludingLeapDays,
  );
});

test('The Day Out of Time and Year-start rules remain deterministic', () => {
  const dayOutOfTime = calculateDreamspellKin('1988-07-25');
  const newYear = calculateDreamspellKin('1988-07-26');

  assert.equal(dayOutOfTime.moonCalendar.isDayOutOfTime, true);
  assert.equal(newYear.moonCalendar.isNewYear, true);
  assert.equal(newYear.moonCalendar.lunarDay, 1);
});

test('Cross-timezone inputs stay stable for the same local date', () => {
  const result = calculateDreamspellKin({ year: 2024, month: 7, day: 26, timezoneOffsetMinutes: -300 });
  const sameLocalDate = calculateDreamspellKin('2024-07-26');

  assert.equal(result.kin, sameLocalDate.kin);
  assert.equal(result.date, sameLocalDate.date);
});

test('All 260 KIN have canonical seals, tones, wavespells and castles', () => {
  const sealNames = ['Red Dragon', 'White Wind', 'Blue Night', 'Yellow Seed', 'Red Serpent', 'White Worldbridger', 'Blue Hand', 'Yellow Star', 'Red Moon', 'White Dog', 'Blue Monkey', 'Yellow Human', 'Red Skywalker', 'White Wizard', 'Blue Eagle', 'Yellow Warrior', 'Red Earth', 'White Mirror', 'Blue Storm', 'Yellow Sun'];
  for (let kin = 1; kin <= 260; kin++) {
    assert.equal(getSolarTotemByKin(kin).number, (kin - 1) % 20 + 1);
    assert.equal(getSolarTotemByKin(kin).nameEn, sealNames[(kin - 1) % 20]);
    assert.equal(getToneByKin(kin).number, (kin - 1) % 13 + 1);
    assert.equal(getWaveByKin(kin).number, Math.floor((kin - 1) / 13) + 1);
    assert.equal(getCastleByKin(kin).number, Math.floor((kin - 1) / 52) + 1);
  }
  assert.equal(getToneByKin(5).nameEn, 'Overtone');
  assert.equal(calculateDreamspellKin('1988-04-12').kin, 34);
  assert.equal(calculateDreamspellKin('1987-07-25').kin, 33);
});

test('Date-only API inputs are stable across browser timezones and years', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ['UTC', 'Asia/Taipei', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
      process.env.TZ = timezone;
      assert.deepEqual(mayaForDate('1987-07-26', 'en'), mayaSignature(34, 'en'));
      assert.equal(calculateDreamspellKin('2024-01-01').kin, calculateDreamspellKin('2023-12-31').kin % 260 + 1);
    }
  } finally { process.env.TZ = previous; }
  assert.equal(taipeiDate(new Date('2026-10-09T16:00:00Z')), '2026-10-10');
  assert.equal(taipeiDate(new Date('2026-10-09T15:59:59Z')), '2026-10-09');
  for (const invalid of ['2024-02-30', '2024-1-01', '1899-12-31', '9999-01-01', '1990-01-01T00:00:00Z']) assert.equal(isMayaDate(invalid), false);
});

test('Mock reports validate both languages and immutable calculation data for all products', () => {
  for (const locale of ['zh-TW', 'en'] as const) {
    for (const product of MAYA_PRODUCTS) {
      const signature = mayaSignature(34, locale);
      const relationship = product.code === 'MAYA_RELATIONSHIP_699' ? mayaSignature(260, locale) : null;
      const report = mockMayaReport(signature, relationship, locale, product.code);
      assert.equal(validateMayaReport(report, report), true);
      assert.equal(report.sections.length, product.code === 'MAYA_BASIC_199' ? 3 : 7);
      assert.equal(report.usage.cost_twd, 0);
      assert.equal(validateMayaReport({ ...report, extra: 'unvalidated content' }, report), false);
      assert.equal(validateMayaReport({ ...report, signature: { ...signature, kin_number: 1 } }, report), false);
      assert.equal(validateMayaReport({ ...report, sections: [{ heading: 'x', body: '<script>alert(1)</script>' }] }, report), false);
      if (locale === 'en') {
        assert.doesNotMatch(JSON.stringify(report), /[\u3400-\u9fff]/u);
        assert.equal(validateMayaReport({ ...report, sections: report.sections.map((section) => ({ ...section, body: `${section.body} 中文` })) }, report), false);
      }
    }
  }
});
