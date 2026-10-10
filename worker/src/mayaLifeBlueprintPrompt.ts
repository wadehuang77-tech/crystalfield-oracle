import { blueprintEvidence, BLUEPRINT_CHAPTERS, LIFE_BLUEPRINT_UNSUPPORTED, LIFE_BLUEPRINT_VERSION } from '../../app/src/lib/mayaLifeBlueprint';
import { mockLifeBlueprintV2 } from '../../app/src/lib/mayaLifeBlueprintMock';
import type { MayaLocale, MayaSignature } from '../../app/src/lib/maya';

const text = { type: 'string', minLength: 1 };
function textList(minItems: number, maxItems: number) {
  return { type: 'array', items: text, minItems, maxItems };
}
function strictObject(properties: Record<string, unknown>) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
export function lifeBlueprintResponseSchema(signature: MayaSignature, locale: MayaLocale) {
  const evidence = blueprintEvidence(signature, locale);
  const seal = strictObject({ number: { type: 'integer', enum: [evidence.solarSeal.number] }, name: { type: 'string', enum: [evidence.solarSeal.name] } });
  const tone = strictObject({ number: { type: 'integer', enum: [evidence.galacticTone.number] }, name: { type: 'string', enum: [evidence.galacticTone.name] } });
  const basis = strictObject({
    kinNumber: { type: 'integer', enum: [evidence.kinNumber] }, solarSeal: seal, galacticTone: tone,
    calculationVersion: { type: 'string', enum: [evidence.calculationVersion] },
  });
  return strictObject({
    reportVersion: { type: 'string', enum: [LIFE_BLUEPRINT_VERSION] },
    productCode: { type: 'string', enum: ['MAYA_FULL_499'] },
    kinNumber: { type: 'integer', enum: [evidence.kinNumber] }, solarSeal: seal, galacticTone: tone,
    locale: { type: 'string', enum: [locale] }, evidence: basis,
    unsupportedFields: { type: 'array', minItems: LIFE_BLUEPRINT_UNSUPPORTED.length, maxItems: LIFE_BLUEPRINT_UNSUPPORTED.length,
      items: { type: 'string', enum: LIFE_BLUEPRINT_UNSUPPORTED } },
    sections: { type: 'array', minItems: 12, maxItems: 12, items: strictObject({
      id: { type: 'string', enum: BLUEPRINT_CHAPTERS.map(chapter => chapter.id) }, evidence: basis,
      interpretation: text, lifeExamples: textList(1, 3), reflectionQuestions: textList(1, 3), actionSteps: textList(1, 6),
    }) },
    ninetyDayPlan: { type: 'array', minItems: 3, maxItems: 3, items: strictObject({
      id: { type: 'string', enum: ['awareness', 'action-adjustment', 'integration'] },
      startDay: { type: 'integer', enum: [1, 31, 61] }, endDay: { type: 'integer', enum: [30, 60, 90] },
      actionSteps: textList(3, 6), reflectionQuestions: textList(3, 6),
    }) },
  });
}

export function buildLifeBlueprintPrompt(signature: MayaSignature, locale: MayaLocale) {
  const evidence = blueprintEvidence(signature, locale);
  return {
    system: [
      'Design ONLY the NT$499 Full Life Blueprint, reportVersion=dreamspell-life-blueprint-v2. Return structured JSON, never Markdown.',
      locale === 'en' ? 'Use natural, complete English only, including all twelve chapters and the entire plan. No Chinese prose. Each chapter totals 120–450 English words; chapter 12 includes the ninety-day plan.'
        : '所有敘述、情境、問題與行動使用自然繁體中文，不得混入簡體中文。每篇目標 350–500 個中文字，計入五層文字；第十二篇連同九十天計畫合計。',
      'The server supplies verified birth KIN, solar seal, galactic tone and calculationVersion. Copy evidence exactly; never calculate or invent numbers or configurations.',
      'All derived oracle, wavespell, castle, personal fortune cycles and February 29 birth signatures are unsupported. Copy unsupportedFields exactly; do not interpret these fields or fill gaps.',
      'Names are verified identifiers, not verified personality traits. Explain symbolism as an invitation and optional hypothesis, never psychological diagnosis or scientific fact.',
      'Do not claim knowledge of actual experiences, literal extraterrestrial origins, past lives or inevitable destiny. Use conditional life examples, not statements that events happened.',
      'No disease diagnosis or cure, wealth prediction, investment advice, guaranteed returns or relationship compatibility score.',
      'Each fixed section ID has five layers: A evidence (exact server object); B interpretation; C lifeExamples; D 1–3 reflectionQuestions; E concrete actionSteps.',
      'Use a distinct analytical focus, situation and practice in each chapter. Do not repeat paragraphs, lists, descriptive adjectives or boilerplate. Connect each interpretation to the supplied seal and tone without making empirical claims.',
      'Only evidence contains numeric KIN and configured identifiers. Prose must not invent alternative KIN, seal/tone names or additional configurations.',
      'Chapter 10 reflects observed present routines only; never compute a personal fortune cycle.',
      'Chapter 12 synthesizes the actual themes of chapters 1–11. ninetyDayPlan must have awareness days 1–30, action-adjustment days 31–60, integration days 61–90; each has at least three concrete actions and three reflection questions.',
      'These ninety days are an optional practice schedule, not a forecast. Keep actions feasible, allow adjustment and seek qualified help when needed.',
    ].join('\n'),
    user: JSON.stringify({
      reportVersion: LIFE_BLUEPRINT_VERSION, productCode: 'MAYA_FULL_499', locale, evidence,
      unsupportedFields: LIFE_BLUEPRINT_UNSUPPORTED,
      chapters: BLUEPRINT_CHAPTERS.map(chapter => ({ id: chapter.id, title: locale === 'en' ? chapter.en : chapter.zh, focus: chapter.focus })),
    }),
    responseSchema: lifeBlueprintResponseSchema(signature, locale),
  };
}

// Phase 1 intentionally has no network/provider path. Live generation requires a later reviewed release.
export function generateLocalLifeBlueprint(signature: MayaSignature, locale: MayaLocale) {
  const prompt = buildLifeBlueprintPrompt(signature, locale);
  return { provider: 'mock' as const, prompt, report: mockLifeBlueprintV2(signature, locale) };
}
