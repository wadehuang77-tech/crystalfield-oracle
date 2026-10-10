import { isMayaLocale, mayaSignature, MAYA_CALCULATION_VERSION, type MayaLocale, type MayaSignature } from './maya';

export const LIFE_BLUEPRINT_VERSION = 'dreamspell-life-blueprint-v2';
export const LIFE_BLUEPRINT_UNSUPPORTED = ['oracle', 'wavespell', 'castle', 'personalFortuneCycles', 'leapDayBirth'] as const;

export const BLUEPRINT_CHAPTERS = [
  { id: 'soul-identity', zh: '你的星際靈魂身份', en: 'Your symbolic soul identity', focus: 'identity and chosen values, not a literal extraterrestrial origin' },
  { id: 'tone-and-realization', zh: '銀河音調與人生實現方式', en: 'Galactic tone and realizing intentions', focus: 'action, collaboration, pacing and feedback' },
  { id: 'mission-and-direction', zh: '生命使命與人生方向', en: 'Life mission and direction', focus: 'motivation, values and freely chosen growth goals' },
  { id: 'hidden-talents', zh: '隱藏天賦與未開發潛能', en: 'Hidden talents and undeveloped potential', focus: 'learning, creativity and small experiments' },
  { id: 'shadows-and-lessons', zh: '內在陰影與反覆出現的課題', en: 'Inner shadows and recurring lessons', focus: 'overused strengths, pressure and revisable blind spots' },
  { id: 'love-and-intimacy', zh: '愛情與親密關係', en: 'Love and intimacy', focus: 'expressing needs, consent, listening and repair, not partner compatibility' },
  { id: 'career-and-work', zh: '事業與工作天賦', en: 'Career and working strengths', focus: 'roles, leadership, teamwork and work environments' },
  { id: 'money-and-resources', zh: '金錢與豐盛模式', en: 'Money and resource patterns', focus: 'resource values, spending habits and planning, never financial predictions' },
  { id: 'relationships-and-support', zh: '人際關係與支持系統', en: 'Relationships and support systems', focus: 'social boundaries, reciprocal support and communication' },
  { id: 'rhythm-and-growth', zh: '生命節奏與當下成長', en: 'Life rhythm and present growth', focus: 'observed daily rhythms, never invented personal fortune cycles' },
  { id: 'care-and-balance', zh: '自我療癒與能量平衡', en: 'Self-care and balance', focus: 'emotional awareness, writing, meditation and everyday care, not medical treatment' },
  { id: 'ninety-day-practice', zh: '90 天生命實踐計畫', en: 'A ninety-day practice plan', focus: 'synthesize the preceding eleven chapters into three actionable stages' },
] as const;
export type BlueprintSectionId = typeof BLUEPRINT_CHAPTERS[number]['id'];
export interface BlueprintEvidence {
  kinNumber: number;
  solarSeal: { number: number; name: string };
  galacticTone: { number: number; name: string };
  calculationVersion: string;
}
export interface BlueprintSection {
  id: BlueprintSectionId;
  evidence: BlueprintEvidence;
  interpretation: string;
  lifeExamples: string[];
  reflectionQuestions: string[];
  actionSteps: string[];
}
export interface NinetyDayStage {
  id: 'awareness' | 'action-adjustment' | 'integration';
  startDay: number;
  endDay: number;
  actionSteps: string[];
  reflectionQuestions: string[];
}
export interface LifeBlueprintV2 {
  reportVersion: typeof LIFE_BLUEPRINT_VERSION;
  productCode: 'MAYA_FULL_499';
  kinNumber: number;
  solarSeal: BlueprintEvidence['solarSeal'];
  galacticTone: BlueprintEvidence['galacticTone'];
  locale: MayaLocale;
  evidence: BlueprintEvidence;
  unsupportedFields: readonly string[];
  sections: BlueprintSection[];
  ninetyDayPlan: NinetyDayStage[];
}

export function blueprintEvidence(signature: MayaSignature, locale: MayaLocale): BlueprintEvidence {
  if (!isMayaLocale(locale)) throw new Error('Invalid blueprint locale');
  const verified = mayaSignature(signature.kin_number, locale);
  for (const key of ['solar_seal_number', 'solar_seal', 'tone_number', 'galactic_tone', 'calculation_version'] as const) {
    if (signature[key] !== verified[key]) throw new Error('Blueprint requires a canonical server signature');
  }
  return {
    kinNumber: verified.kin_number,
    solarSeal: { number: verified.solar_seal_number, name: verified.solar_seal },
    galacticTone: { number: verified.tone_number, name: verified.galactic_tone },
    calculationVersion: MAYA_CALCULATION_VERSION,
  };
}

export function blueprintSectionText(section: BlueprintSection): string {
  return [section.interpretation, ...section.lifeExamples, ...section.reflectionQuestions, ...section.actionSteps].join('\n');
}
export function chineseCharacterCount(text: string): number {
  return (text.match(/[\u3400-\u9fff]/gu) ?? []).length;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}
function strings(value: unknown, min: number, max: number): value is string[] {
  return Array.isArray(value) && value.length >= min && value.length <= max
    && value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 6000);
}
function sameEvidence(value: unknown, expected: BlueprintEvidence): boolean {
  if (!record(value) || !exactKeys(value, ['kinNumber', 'solarSeal', 'galacticTone', 'calculationVersion'])) return false;
  return value.kinNumber === expected.kinNumber && value.calculationVersion === expected.calculationVersion
    && [value.solarSeal, value.galacticTone].every((entry, index) => {
      const basis = index === 0 ? expected.solarSeal : expected.galacticTone;
      return record(entry) && exactKeys(entry, ['number', 'name']) && entry.number === basis.number && entry.name === basis.name;
    });
}

export function blueprintQualityIssues(report: LifeBlueprintV2): string[] {
  const issues: string[] = [];
  const paragraphs = new Set<string>();
  for (const section of report.sections) {
    const stageText = section.id === 'ninety-day-practice'
      ? report.ninetyDayPlan.flatMap(stage => [...stage.actionSteps, ...stage.reflectionQuestions]).join('\n') : '';
    const text = `${blueprintSectionText(section)}\n${stageText}`;
    if (!section.interpretation.includes(report.solarSeal.name) || !section.interpretation.includes(report.galacticTone.name)) {
      issues.push(`${section.id}: interpretation must connect to the supplied seal and tone`);
    }
    const count = chineseCharacterCount(text);
    if (report.locale === 'zh-TW' && (count < 350 || count > 500)) issues.push(`${section.id}: expected 350–500 Chinese characters, got ${count}`);
    if (report.locale === 'en' && chineseCharacterCount(text) !== 0) issues.push(`${section.id}: mixed-language prose`);
    const words = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu)?.length ?? 0;
    if (report.locale === 'en' && (words < 120 || words > 450)) issues.push(`${section.id}: expected 120–450 English words, got ${words}`);
    if (report.locale === 'zh-TW' && /[这为与疗财爱际问长发]/u.test(text)) issues.push(`${section.id}: simplified Chinese`);
    if (/\bKIN\s*[=:：]?\s*\d|波符|城堡|神諭|oracle|wavespell|castle|galactic configuration|運勢週期/iu.test(text)) issues.push(`${section.id}: unsupported or invented numeric evidence in prose`);
    if (/保證.*(?:財富|收益)|治癒疾病|醫療診斷|必定.*發財|guaranteed (?:wealth|returns)|cure disease|you will become rich/iu.test(text)) issues.push(`${section.id}: prediction or medical claim`);
    for (const paragraph of [section.interpretation, ...section.lifeExamples]) {
      const normalized = paragraph.toLowerCase().replace(/[\s\p{P}]/gu, '');
      if (paragraphs.has(normalized)) issues.push(`${section.id}: duplicate paragraph`);
      paragraphs.add(normalized);
    }
  }
  return issues;
}

export function validateLifeBlueprintV2(value: unknown, signature: MayaSignature, locale: MayaLocale): value is LifeBlueprintV2 {
  const evidence = blueprintEvidence(signature, locale);
  if (!record(value) || !exactKeys(value, ['reportVersion', 'productCode', 'kinNumber', 'solarSeal', 'galacticTone', 'locale', 'evidence', 'unsupportedFields', 'sections', 'ninetyDayPlan'])
    || value.reportVersion !== LIFE_BLUEPRINT_VERSION || value.productCode !== 'MAYA_FULL_499' || value.locale !== locale
    || !sameEvidence(value.evidence, evidence) || value.kinNumber !== evidence.kinNumber
    || !sameEvidence({ kinNumber: value.kinNumber, solarSeal: value.solarSeal, galacticTone: value.galacticTone, calculationVersion: evidence.calculationVersion }, evidence)
    || JSON.stringify(value.unsupportedFields) !== JSON.stringify(LIFE_BLUEPRINT_UNSUPPORTED)
    || !Array.isArray(value.sections) || value.sections.length !== 12
    || !Array.isArray(value.ninetyDayPlan) || value.ninetyDayPlan.length !== 3) return false;
  const sections: BlueprintSection[] = [];
  for (const [index, section] of value.sections.entries()) {
    if (!record(section) || !exactKeys(section, ['id', 'evidence', 'interpretation', 'lifeExamples', 'reflectionQuestions', 'actionSteps'])
      || section.id !== BLUEPRINT_CHAPTERS[index].id || !sameEvidence(section.evidence, evidence)
      || typeof section.interpretation !== 'string' || !section.interpretation.trim() || section.interpretation.length > 6000
      || !strings(section.lifeExamples, 1, 3) || !strings(section.reflectionQuestions, 1, 3) || !strings(section.actionSteps, 1, 6)) return false;
    sections.push({ id: BLUEPRINT_CHAPTERS[index].id, evidence, interpretation: section.interpretation,
      lifeExamples: section.lifeExamples, reflectionQuestions: section.reflectionQuestions, actionSteps: section.actionSteps });
  }
  const ninetyDayPlan: NinetyDayStage[] = [];
  for (const [index, stage] of value.ninetyDayPlan.entries()) {
    if (!record(stage) || !exactKeys(stage, ['id', 'startDay', 'endDay', 'actionSteps', 'reflectionQuestions'])
      || stage.id !== ['awareness', 'action-adjustment', 'integration'][index] || stage.startDay !== index * 30 + 1 || stage.endDay !== (index + 1) * 30
      || !strings(stage.actionSteps, 3, 6) || !strings(stage.reflectionQuestions, 3, 6)) return false;
    ninetyDayPlan.push({ id: (['awareness', 'action-adjustment', 'integration'] as const)[index],
      startDay: index * 30 + 1, endDay: (index + 1) * 30, actionSteps: stage.actionSteps, reflectionQuestions: stage.reflectionQuestions });
  }
  return blueprintQualityIssues({ reportVersion: LIFE_BLUEPRINT_VERSION, productCode: 'MAYA_FULL_499', locale,
    kinNumber: evidence.kinNumber, solarSeal: evidence.solarSeal, galacticTone: evidence.galacticTone,
    evidence, unsupportedFields: LIFE_BLUEPRINT_UNSUPPORTED, sections, ninetyDayPlan }).length === 0;
}
