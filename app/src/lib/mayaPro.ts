import { calculateDreamspellOracle, type DreamspellOracle } from './dreamspellOracle';
import { calculateDreamspellWavespell, type DreamspellWavespell } from './dreamspellWavespell';
import { mayaForDate, mayaSignature, isMayaDate, type MayaLocale } from './maya';
import { chineseCharacterCount, validateLifeBlueprintV2, type LifeBlueprintV2 } from './mayaLifeBlueprint';

// Deliberately separate from the legacy checkout/product allowlist.
export const MAYA_PRO_PRODUCT = { code: 'MAYA_SOUL_MISSION_PRO_699', price: 699, zh: '星際靈魂使命藍圖 Pro', en: 'Galactic Soul Mission Blueprint Pro' } as const;
export const MAYA_PRO_VERSION = 'dreamspell-soul-mission-pro-v1';
export const PRO_CHAPTERS = [
  { id: 'oracle-integration', zh: '五大神諭整合解讀', en: 'Five-force oracle integration' },
  { id: 'wavespell-journey', zh: '生命波符與成長旅程', en: 'Wavespell and growth journey' },
  { id: 'soul-mission-synthesis', zh: '星際靈魂使命總結', en: 'Soul mission synthesis' },
] as const;
export interface ProEvidence { oracle: DreamspellOracle; wavespell: DreamspellWavespell }
export interface ProSection {
  id: typeof PRO_CHAPTERS[number]['id'];
  evidence: ProEvidence;
  interpretation: string;
  lifeExamples: string[];
  reflectionQuestions: string[];
  actionSteps: string[];
}
export interface MayaProReport {
  reportVersion: typeof MAYA_PRO_VERSION;
  productCode: typeof MAYA_PRO_PRODUCT.code;
  locale: MayaLocale;
  kinNumber: number;
  parts: {
    a: { id: 'deep-life-explanations'; blueprint: LifeBlueprintV2 };
    b: { id: 'galactic-visualization'; birthDate: string; kinNumber: number; iconStyle: 'original-modern-geometry' };
    c: { id: 'oracle-and-wavespell'; oracle: DreamspellOracle; wavespell: DreamspellWavespell };
    d: { id: 'soul-mission-integration'; sections: ProSection[] };
  };
  provider: 'mock-local' | 'openai';
}
function keys(value: unknown, expected: string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
}
function list(value: unknown, max: number): value is string[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= max
    && value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 6000);
}
export function validateMayaProReport(value: unknown, expectedKin: number, locale: MayaLocale): value is MayaProReport {
  if (!Number.isInteger(expectedKin) || expectedKin < 1 || expectedKin > 260) return false;
  if (!keys(value, ['reportVersion', 'productCode', 'locale', 'kinNumber', 'parts', 'provider'])
    || value.reportVersion !== MAYA_PRO_VERSION || value.productCode !== MAYA_PRO_PRODUCT.code || value.locale !== locale
    || value.kinNumber !== expectedKin || !['mock-local', 'openai'].includes(String(value.provider)) || !keys(value.parts, ['a', 'b', 'c', 'd'])) return false;
  const { a, b, c, d } = value.parts;
  if (!keys(a, ['id', 'blueprint']) || a.id !== 'deep-life-explanations'
    || !validateLifeBlueprintV2(a.blueprint, mayaSignature(expectedKin, locale), locale)) return false;
  if (!keys(b, ['id', 'birthDate', 'kinNumber', 'iconStyle']) || b.id !== 'galactic-visualization' || b.kinNumber !== expectedKin
    || b.iconStyle !== 'original-modern-geometry' || !isMayaDate(b.birthDate) || b.birthDate.slice(5) === '02-29'
    || mayaForDate(b.birthDate, locale).kin_number !== expectedKin) return false;
  const evidence: ProEvidence = { oracle: calculateDreamspellOracle(expectedKin, locale), wavespell: calculateDreamspellWavespell(expectedKin, locale) };
  if (!keys(c, ['id', 'oracle', 'wavespell']) || c.id !== 'oracle-and-wavespell'
    || JSON.stringify(c.oracle) !== JSON.stringify(evidence.oracle) || JSON.stringify(c.wavespell) !== JSON.stringify(evidence.wavespell)
    || !keys(d, ['id', 'sections']) || d.id !== 'soul-mission-integration' || !Array.isArray(d.sections) || d.sections.length !== 3) return false;
  const seen = new Set<string>();
  for (const [index, section] of d.sections.entries()) {
    if (!keys(section, ['id', 'evidence', 'interpretation', 'lifeExamples', 'reflectionQuestions', 'actionSteps'])
      || section.id !== PRO_CHAPTERS[index].id || JSON.stringify(section.evidence) !== JSON.stringify(evidence)
      || typeof section.interpretation !== 'string' || section.interpretation.length < 100 || section.interpretation.length > 6000
      || !list(section.lifeExamples, 3) || !list(section.reflectionQuestions, 3) || !list(section.actionSteps, 6)) return false;
    const text = [section.interpretation, ...section.lifeExamples, ...section.reflectionQuestions, ...section.actionSteps].join('\n');
    if (locale === 'zh-TW' && (chineseCharacterCount(text) < 250 || chineseCharacterCount(text) > 500)) return false;
    const words = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu)?.length ?? 0;
    if (locale === 'en' && (words < 120 || words > 450)) return false;
    if (locale === 'en' && /[\u3400-\u9fff]/u.test(text)) return false;
    if (locale === 'zh-TW' && /[这为与疗财爱际问长发]/u.test(text)) return false;
    if (/保證.*(?:財富|收益)|治癒疾病|必定.*發財|guaranteed (?:wealth|returns)|cure disease|you will become rich/iu.test(text)) return false;
    if (!text.includes(evidence.oracle.positions.destiny.sealName)) return false;
    const normalized = section.interpretation.toLowerCase().replace(/[\s\p{P}]/gu, '');
    if (seen.has(normalized) || a.blueprint.sections.some(item => item.interpretation.toLowerCase().replace(/[\s\p{P}]/gu, '') === normalized)) return false;
    seen.add(normalized);
  }
  return true;
}
