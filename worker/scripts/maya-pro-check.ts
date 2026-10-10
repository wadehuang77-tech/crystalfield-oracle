import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, test } from 'node:test';
import { calculateDreamspellOracle } from '../../app/src/lib/dreamspellOracle';
import { calculateDreamspellWavespell } from '../../app/src/lib/dreamspellWavespell';
import { MAYA_PRODUCTS, isMayaProduct, mockMayaReport, mayaSignature } from '../../app/src/lib/maya';
import { MAYA_PRO_PRODUCT, PRO_CHAPTERS, validateMayaProReport } from '../../app/src/lib/mayaPro';
import { buildMayaProPrompt, estimateProCost, mockMayaProReport } from '../src/mayaProPrompt';
let reference: { rows: number[][]; sha256: string };
let dates: { cases: Array<{ date: string; ark_kin: number }> };
before(async () => {
  reference = JSON.parse(await readFile(new URL('../../app/scripts/maya-pro-reference.json', import.meta.url), 'utf8'));
  dates = JSON.parse(await readFile(new URL('../../app/scripts/maya-external-reference.json', import.meta.url), 'utf8'));
});

test('All 260 oracle and wavespell results match independently retrieved Galactic Ark output and primary guide groups', () => {
  assert.equal(reference.sha256, '6a95c4fa842f4d56b1f888870f47c64cc28a17ad933d6750e0cda11125fcd7cb');
  const groups = new Map<number, number[]>();
  for (const [kin, guide, analog, antipode, occult, wave, position, start, end] of reference.rows) {
    const oracle = calculateDreamspellOracle(kin, 'en');
    assert.deepEqual([oracle.positions.guide.kinNumber, oracle.positions.analog.kinNumber, oracle.positions.antipode.kinNumber, oracle.positions.occult.kinNumber], [guide, analog, antipode, occult], `KIN ${kin}`);
    const actual = calculateDreamspellWavespell(kin, 'en');
    assert.deepEqual([actual.number, actual.position, actual.startKin, actual.endKin], [wave, position, start, end]);
    assert.deepEqual(actual.stages.map(stage => stage.toneNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    groups.set(wave, [...(groups.get(wave) ?? []), kin]);
    const destiny = oracle.positions.destiny;
    const primaryOffsets: Record<number, number> = { 1: 0, 6: 0, 11: 0, 2: 12, 7: 12, 12: 12, 3: 4, 8: 4, 13: 4, 4: 16, 9: 16, 5: 8, 10: 8 };
    assert.equal((oracle.positions.guide.sealNumber - destiny.sealNumber + 20) % 20, primaryOffsets[destiny.toneNumber]);
    assert.equal(oracle.positions.guide.toneNumber, destiny.toneNumber);
    assert.equal(oracle.positions.analog.toneNumber, destiny.toneNumber);
    assert.equal(oracle.positions.antipode.toneNumber, destiny.toneNumber);
    assert.equal(oracle.positions.occult.toneNumber + destiny.toneNumber, 14);
    assert.equal(calculateDreamspellOracle(analog, 'en').positions.analog.kinNumber, kin);
    assert.equal(calculateDreamspellOracle(antipode, 'en').positions.antipode.kinNumber, kin);
    assert.equal(calculateDreamspellOracle(occult, 'en').positions.occult.kinNumber, kin);
  }
  assert.equal(groups.size, 20);
  assert.ok([...groups.values()].every(group => group.length === 13));
  for (const invalid of [0, 261, -1, 1.5, NaN]) {
    assert.throws(() => calculateDreamspellOracle(invalid, 'en'));
    assert.throws(() => calculateDreamspellWavespell(invalid, 'en'));
  }
});

test('All 260 KIN produce fifteen complete bilingual Pro Mock chapters at zero AI calls and preserve original products', () => {
  const originalFetch = globalThis.fetch;
  let network = 0;
  globalThis.fetch = () => { network++; throw new Error('Pro tests forbid network'); };
  try {
    for (let kin = 1; kin <= 260; kin++) {
      const date = dates.cases.find(row => row.ark_kin === kin && row.date.slice(5) !== '02-29')?.date;
      assert.ok(date, `Independent date for ${kin}`);
      for (const locale of ['en', 'zh-TW'] as const) {
        const report = mockMayaProReport(date, locale);
        assert.ok(validateMayaProReport(report, kin, locale), `KIN ${kin} ${locale}`);
        assert.equal(report.parts.a.blueprint.sections.length + report.parts.d.sections.length, 15);
        assert.deepEqual(report.parts.d.sections.map(section => section.id), PRO_CHAPTERS.map(chapter => chapter.id));
        const prompt = buildMayaProPrompt(date, locale);
        assert.doesNotMatch(prompt.integration.user, /birthDate|birth_date/);
        assert.match(prompt.integration.system, /prior chapter summaries/);
        assert.equal(prompt.estimate.allowed, true);
        const bad = structuredClone(report);
        bad.parts.c.oracle.positions.guide.kinNumber = kin === 1 ? 2 : 1;
        assert.equal(validateMayaProReport(bad, kin, locale), false);
      }
    }
    assert.equal(network, 0);
    assert.deepEqual(MAYA_PRODUCTS.map(item => [item.code, item.price]), [['MAYA_BASIC_199', 199], ['MAYA_FULL_499', 499],     ['MAYA_RELATIONSHIP_699', 699]]);
    assert.equal(isMayaProduct(MAYA_PRO_PRODUCT.code), false, 'Pro must not enter existing ECPay allowlist');
    for (const product of MAYA_PRODUCTS) assert.equal(mockMayaReport(mayaSignature(34, 'en'), product.code === 'MAYA_RELATIONSHIP_699' ? mayaSignature(199, 'en') : null, 'en', product.code).sections.length, product.price === 199 ? 3 : 7);
    assert.equal(estimateProCost().estimatedTwd, 0.42);
    assert.equal(estimateProCost(100000, 100000).allowed, false);
    assert.throws(() => estimateProCost(-1, 0));
    assert.throws(() => mockMayaProReport('2000-02-29', 'en'));
    const valid = mockMayaProReport('1987-07-26', 'en');
    const mutations: Array<(value: typeof valid) => void> = [
      value => { value.parts.d.sections.pop(); },
      value => { value.parts.d.sections[0].id = 'wavespell-journey'; },
      value => { value.parts.d.sections[1].interpretation = value.parts.d.sections[0].interpretation; },
      value => { value.parts.d.sections[0].reflectionQuestions = []; },
      value => { value.parts.d.sections[0].interpretation += ' guaranteed wealth'; },
      value => { value.parts.d.sections[0].interpretation += '中文'; },
      value => { value.parts.c.wavespell.stages[0].toneNumber = 13; },
      value => { value.parts.a.blueprint.sections.pop(); },
      value => { value.parts.b.birthDate = '1990-01-01'; },
    ];
    for (const mutate of mutations) {
      const bad = structuredClone(valid); mutate(bad);
      assert.equal(validateMayaProReport(bad, 34, 'en'), false);
    }
  } finally { globalThis.fetch = originalFetch; }
});
