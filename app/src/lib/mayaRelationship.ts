import { mayaForDate, type MayaLocale } from './maya';
import { calculateDreamspellOracle, type DreamspellOracle } from './dreamspellOracle';
import { calculateDreamspellWavespell, type DreamspellWavespell } from './dreamspellWavespell';
import { chineseCharacterCount, type NinetyDayStage } from './mayaLifeBlueprint';

export const MAYA_RELATIONSHIP_PRODUCT = {
  code: 'MAYA_RELATIONSHIP_899', price: 899,
  zh: '雙人星際共振・靈魂關係藍圖', en: 'Galactic Relationship Blueprint',
} as const;

export const RELATIONSHIP_VERSION = 'dreamspell-relationship-blueprint-v2';
export const RELATIONSHIP_TYPES = ['partners', 'friends', 'family', 'colleagues'] as const;
export type RelationshipType = typeof RELATIONSHIP_TYPES[number];
export const RELATIONSHIP_CHAPTERS = [
  { id: 'shared-identity', zh: '雙人星際身份與相遇', en: 'Two identities and meeting', focus: 'two individual values without assuming actual history' },
  { id: 'communication', zh: '溝通與理解', en: 'Communication and understanding', focus: 'listening, requests and checking assumptions' },
  { id: 'emotional-needs', zh: '情感需要與安全感', en: 'Emotional needs and safety', focus: 'consent, emotional needs and freely chosen closeness' },
  { id: 'support-and-talents', zh: '互補天賦與支持', en: 'Complementary strengths and support', focus: 'support without assigning fixed roles' },
  { id: 'tension-and-repair', zh: '差異、張力與修復', en: 'Differences, tension and repair', focus: 'conflict de-escalation, accountability and repair' },
  { id: 'boundaries', zh: '親密與個人界線', en: 'Closeness and boundaries', focus: 'privacy, autonomy, consent and independent support' },
  { id: 'cooperation', zh: '共同目標與合作', en: 'Shared goals and cooperation', focus: 'negotiable responsibilities and realistic feedback' },
  { id: 'shared-resources', zh: '金錢與共享資源', en: 'Money and shared resources', focus: 'resource agreements without financial predictions' },
  { id: 'oracle-dialogue', zh: '五大神諭的雙人對話', en: 'A dialogue between two oracles', focus: 'compare the two verified symbolic sets; no invented pair KIN or compatibility score' },
  { id: 'wavespell-comparison', zh: '生命波符與成長步調', en: 'Wavespells and growth pacing', focus: 'compare verified sequence positions, never ages or future fortune cycles' },
  { id: 'shared-care', zh: '共同照顧與關係整合', en: 'Shared care and integration', focus: 'daily care, independent agency and summaries of actual prior chapters' },
  { id: 'ninety-day-resonance', zh: '90 天雙人共振計畫', en: 'A ninety-day shared practice', focus: 'three practical stages synthesized from actual chapters; not a prediction' },
] as const;
export interface RelationshipPerson {
  birthDate: string;
  kinNumber: number;
  oracle: DreamspellOracle;
  wavespell: DreamspellWavespell;
}
export interface RelationshipSection {
  id: typeof RELATIONSHIP_CHAPTERS[number]['id'];
  interpretation: string;
  perspectives: { a: string; b: string; shared: string };
  lifeExamples: string[];
  reflectionQuestions: string[];
  actionSteps: string[];
}
export interface RelationshipReport {
  reportVersion: typeof RELATIONSHIP_VERSION;
  productCode: typeof MAYA_RELATIONSHIP_PRODUCT.code;
  locale: MayaLocale;
  relationshipType: RelationshipType;
  people: { a: RelationshipPerson; b: RelationshipPerson };
  sections: RelationshipSection[];
  ninetyDayPlan: NinetyDayStage[];
  provider: 'openai';
}
export function relationshipPerson(birthDate: string, locale: MayaLocale): RelationshipPerson {
  if (birthDate.slice(5) === '02-29') throw new Error('Leap-day birth unsupported');
  const kinNumber = mayaForDate(birthDate, locale).kin_number;
  return { birthDate, kinNumber, oracle: calculateDreamspellOracle(kinNumber, locale), wavespell: calculateDreamspellWavespell(kinNumber, locale) };
}
export function validPracticePlan(value: unknown): value is NinetyDayStage[] {
  const ids = ['awareness', 'action-adjustment', 'integration'];
  return Array.isArray(value) && value.length === 3 && value.every((s: unknown, i) => {
    if (!s || typeof s !== 'object') return false;
    const stage = s as Record<string, unknown>;
    return Object.keys(stage).sort().join(',') === 'actionSteps,endDay,id,reflectionQuestions,startDay'
      && stage.id === ids[i] && stage.startDay === i * 30 + 1 && stage.endDay === (i + 1) * 30
      && [stage.actionSteps, stage.reflectionQuestions].every(v => Array.isArray(v) && v.length >= 3 && v.length <= 6
        && v.every(t => typeof t === 'string' && t.trim().length > 0 && t.length <= 2000));
  });
}
export function validateRelationshipReport(value: unknown): value is RelationshipReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const report = value as RelationshipReport;
  if (Object.keys(report).sort().join(',') !== 'locale,ninetyDayPlan,people,productCode,provider,relationshipType,reportVersion,sections'
    || report.reportVersion !== RELATIONSHIP_VERSION || report.productCode !== MAYA_RELATIONSHIP_PRODUCT.code
    || !['en', 'zh-TW'].includes(report.locale) || report.provider !== 'openai'
    || !RELATIONSHIP_TYPES.includes(report.relationshipType) || !report.people
    || Object.keys(report.people).sort().join(',') !== 'a,b') return false;
  try {
    for (const person of [report.people.a, report.people.b]) {
      if (JSON.stringify(person) !== JSON.stringify(relationshipPerson(person.birthDate, report.locale))) return false;
    }
  } catch { return false; }
  if (!Array.isArray(report.sections) || report.sections.length !== 12 || !validPracticePlan(report.ninetyDayPlan)) return false;
  const paragraphs = new Set<string>();
  for (const [i, section] of report.sections.entries()) {
    if (!section || Object.keys(section).sort().join(',') !== 'actionSteps,id,interpretation,lifeExamples,perspectives,reflectionQuestions'
      || section.id !== RELATIONSHIP_CHAPTERS[i].id || typeof section.interpretation !== 'string'
      || !section.perspectives || Object.keys(section.perspectives).sort().join(',') !== 'a,b,shared'
      || Object.values(section.perspectives).some(t => typeof t !== 'string' || !t.trim())
      || ![section.lifeExamples, section.reflectionQuestions, section.actionSteps].every(v => Array.isArray(v) && v.length >= 1 && v.length <= 3 && v.every(t => typeof t === 'string' && !!t.trim()))) return false;
    const text = [section.interpretation, ...Object.values(section.perspectives), ...section.lifeExamples,
      ...section.reflectionQuestions, ...section.actionSteps,
      ...(i === 11 ? report.ninetyDayPlan.flatMap(s => [...s.actionSteps, ...s.reflectionQuestions]) : [])].join('\n');
    const count = chineseCharacterCount(text);
    const words = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu)?.length ?? 0;
    if (report.locale === 'zh-TW' && (count < 350 || count > 500 || /[这为与疗财爱际问长发]/u.test(text))) return false;
    if (report.locale === 'en' && (count !== 0 || words < 120 || words > 450)) return false;
    if (/保證.*(?:財富|收益)|治癒疾病|必定.*發財|guaranteed (?:wealth|returns)|cure disease|you will become rich|compatibility score|合盤分數|\bKIN\s*\d/iu.test(text)) return false;
    for (const paragraph of [section.interpretation, ...Object.values(section.perspectives), ...section.lifeExamples]) {
      const normalized = paragraph.toLowerCase().replace(/[\s\p{P}]/gu, '');
      if (paragraphs.has(normalized)) return false;
      paragraphs.add(normalized);
    }
  }
  return true;
}
