import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mayaForDate, mayaSignature, mockMayaReport, validateMayaReport } from '../../app/src/lib/maya';
import { blueprintQualityIssues, blueprintSectionText, chineseCharacterCount, BLUEPRINT_CHAPTERS, LIFE_BLUEPRINT_VERSION, validateLifeBlueprintV2 } from '../../app/src/lib/mayaLifeBlueprint';
import { readVersionedLifeBlueprint, serializeLifeBlueprint } from '../../app/src/lib/mayaLifeBlueprintStorage';
import { generateLocalLifeBlueprint } from '../src/mayaLifeBlueprintPrompt';

const kins = [1, 34, 87, 142, 199, 260];
test('Six diverse KINs produce twelve complete bilingual chapters, five layers and exact ninety-day stages at zero provider cost', () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('No external network permitted in blueprint Phase 1'); };
  try {
    assert.equal(new Set(kins.map(kin => mayaSignature(kin, 'en').solar_seal_number)).size, 6);
    assert.equal(new Set(kins.map(kin => mayaSignature(kin, 'en').tone_number)).size, 6);
    for (const kin of kins) for (const locale of ['zh-TW', 'en'] as const) {
      const signature = mayaSignature(kin, locale);
      const { provider, report, prompt } = generateLocalLifeBlueprint(signature, locale);
      assert.equal(provider, 'mock');
      assert.ok(validateLifeBlueprintV2(report, signature, locale), JSON.stringify(blueprintQualityIssues(report)));
      assert.deepEqual(report.sections.map(section => section.id), BLUEPRINT_CHAPTERS.map(chapter => chapter.id));
      const counts = report.sections.map(section => {
        assert.deepEqual(section.evidence, report.evidence);
        assert.ok(section.reflectionQuestions.length >= 1 && section.reflectionQuestions.length <= 3);
        const plan = section.id === 'ninety-day-practice' ? report.ninetyDayPlan.flatMap(stage => [...stage.actionSteps, ...stage.reflectionQuestions]).join('\n') : '';
        return chineseCharacterCount(blueprintSectionText(section) + plan);
      });
      if (locale === 'zh-TW') assert.ok(counts.every(count => count >= 350 && count <= 500), counts.join(','));
      else assert.ok(counts.every(count => count === 0));
      assert.deepEqual(report.ninetyDayPlan.map(stage => [stage.startDay, stage.endDay]), [[1, 30], [31, 60], [61, 90]]);
      assert.ok(report.ninetyDayPlan.every(stage => stage.actionSteps.length >= 3 && stage.reflectionQuestions.length >= 3));
      const data = JSON.parse(prompt.user);
      assert.deepEqual(Object.keys(data.evidence).sort(), ['calculationVersion', 'galacticTone', 'kinNumber', 'solarSeal']);
      assert.equal(data.evidence.kinNumber, kin);
      assert.doesNotMatch(prompt.user, /"wavespell"\s*:|"castle"\s*:|"birth_date"\s*:/);
      assert.ok(prompt.system.includes('Chapter 12 synthesizes'));
      assert.deepEqual(Object.keys(prompt.responseSchema.properties).sort(), Object.keys(report).sort());
      const legacy = mockMayaReport(signature, null, locale, 'MAYA_FULL_499');
      const json = serializeLifeBlueprint(report, signature);
      assert.deepEqual(readVersionedLifeBlueprint(json, signature, locale, legacy), report);
      assert.deepEqual(readVersionedLifeBlueprint(JSON.stringify(legacy), signature, locale, legacy), legacy);
      const liveLegacy = { ...legacy, model_name: 'gpt-4o-mini' as const, prompt_version: `maya-${locale}-MAYA_FULL_499-live-1` };
      assert.deepEqual(readVersionedLifeBlueprint(JSON.stringify(liveLegacy), signature, locale, liveLegacy), liveLegacy);
      console.log(`KIN ${kin} ${locale}: PASS; Chinese chapter counts ${counts.join('/')}`);
    }
  } finally { globalThis.fetch = original; }
});

test('Strict v2 quality rejects altered evidence, malformed plans, duplicate chapters, invented rules and language/length failures', () => {
  const signature = mayaSignature(34, 'zh-TW');
  const { report } = generateLocalLifeBlueprint(signature, 'zh-TW');
  const mutations: Array<(copy: typeof report) => void> = [
    copy => { copy.sections.pop(); },
    copy => { copy.sections[1].id = copy.sections[0].id; },
    copy => { copy.sections[0].evidence.kinNumber = 12; },
    copy => { copy.solarSeal.name = '虛構圖騰'; },
    copy => { copy.sections[2].interpretation = copy.sections[1].interpretation; },
    copy => { copy.sections[0].interpretation = '太短'; },
    copy => { copy.sections[0].interpretation += '你的波符是三號。'; },
    copy => { copy.sections[0].interpretation += '保證獲得財富。'; },
    copy => { copy.sections[0].interpretation += '疗癒疾病。'; },
    copy => { copy.ninetyDayPlan[0].actionSteps.pop(); },
    copy => { copy.ninetyDayPlan[1].reflectionQuestions.pop(); },
    copy => { copy.ninetyDayPlan[2].startDay = 60; },
    copy => { copy.sections[0].reflectionQuestions.push('一？', '二？', '三？'); },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(report);
    mutate(copy);
    assert.equal(validateLifeBlueprintV2(copy, signature, 'zh-TW'), false);
  }
  assert.equal(validateLifeBlueprintV2({ ...report, oracle: { guide: 5 } }, signature, 'zh-TW'), false);
  const en = generateLocalLifeBlueprint(mayaSignature(34, 'en'), 'en').report;
  en.sections[0].interpretation += '中文';
  assert.equal(validateLifeBlueprintV2(en, mayaSignature(34, 'en'), 'en'), false);
  assert.throws(() => generateLocalLifeBlueprint({ ...signature, tone_number: 1 }, 'zh-TW'), /canonical/);
  const old = mockMayaReport(signature, null, 'zh-TW', 'MAYA_FULL_499');
  assert.throws(() => readVersionedLifeBlueprint('{', signature, 'zh-TW', old), SyntaxError);
  assert.throws(() => readVersionedLifeBlueprint(JSON.stringify(old), mayaSignature(1, 'zh-TW'), 'zh-TW', old), /Invalid legacy/);
  const enOld = mockMayaReport(mayaSignature(34, 'en'), null, 'en', 'MAYA_FULL_499');
  assert.throws(() => readVersionedLifeBlueprint(JSON.stringify(enOld), signature, 'zh-TW', enOld), /Invalid legacy/);
  assert.throws(() => readVersionedLifeBlueprint(JSON.stringify({ ...report, reportVersion: 'future-version' }), signature, 'zh-TW', old), /unsupported/);
});

test('199 and 699 reports and legacy 499 remain unchanged; engine anchor and leap-day restriction preserved', () => {
  for (const locale of ['zh-TW', 'en'] as const) {
    const signature = mayaSignature(34, locale);
    for (const product of ['MAYA_BASIC_199', 'MAYA_FULL_499', 'MAYA_RELATIONSHIP_699'] as const) {
      const partner = product === 'MAYA_RELATIONSHIP_699' ? mayaSignature(199, locale) : null;
      const report = mockMayaReport(signature, partner, locale, product);
      const before = JSON.stringify(report);
      generateLocalLifeBlueprint(signature, locale);
      assert.equal(JSON.stringify(mockMayaReport(signature, partner, locale, product)), before);
      assert.equal(report.sections.length, product === 'MAYA_BASIC_199' ? 3 : 7);
      assert.equal('reportVersion' in report, false);
      assert.ok(validateMayaReport(JSON.parse(before), report));
    }
    assert.equal(mayaForDate('1987-07-26', locale).kin_number, 34);
  }
  assert.equal(LIFE_BLUEPRINT_VERSION, 'dreamspell-life-blueprint-v2');
});
