import { calculateDreamspellKin, getSolarTotemByKin, getToneByKin } from './dreamspell';

export const MAYA_CALCULATION_VERSION = 'dreamspell-2026.2';
export const MAYA_CONTENT_VERSION = 'maya-reflection-1';
export type MayaLocale = 'zh-TW' | 'en';
export interface MayaFeatures {
  public: boolean;
  member: boolean;
  payment: boolean;
  sandbox: boolean;
  ai: boolean;
  admin_preview?: boolean;
  admin_live?: boolean;
}
export const MAYA_DISABLED_FEATURES: MayaFeatures = { public: false, member: false, payment: false, sandbox: false, ai: false };
export const MAYA_PRODUCTS = [
  { code: 'MAYA_BASIC_199', price: 199, en: 'Personal Life Gifts', zh: '個人生命天賦報告' },
  { code: 'MAYA_FULL_499', price: 499, en: 'Full Life Blueprint', zh: '完整生命藍圖' },
  { code: 'MAYA_RELATIONSHIP_699', price: 699, en: 'Legacy Relationship Blueprint', zh: '舊版雙人關係合盤' },
] as const;
export type MayaProductCode = typeof MAYA_PRODUCTS[number]['code'];

export function mayaOrderAmounts(product: MayaProductCode): readonly number[] {
  // Existing relationship orders retain their original contracted price.
  return [MAYA_PRODUCTS.find(item => item.code === product)!.price];
}

export const MAYA_BLOCKED_RULES = ['fifth_force_oracle', 'castle_symbolism', 'leap_day_birth_signature', 'legacy_moon_calendar'] as const;

export interface MayaSignature {
  kin_number: number;
  solar_seal_number: number;
  solar_seal: string;
  tone_number: number;
  galactic_tone: string;
  wavespell: number;
  castle: number;
  calculation_version: string;
}
export interface MayaProfile extends MayaSignature {
  id: string;
  birth_date: string;
  role: 'personal' | 'relationship';
  free_summary: string;
}
export interface MayaDaily extends MayaSignature {
  date: string;
  timezone: 'Asia/Taipei';
  free_summary: string;
  awareness_prompt: string;
  special_day: 'day_out_of_time' | 'new_year' | null;
}
export interface MayaReport {
  locale: MayaLocale;
  product_code: MayaProductCode;
  signature: MayaSignature;
  relationship_signature: MayaSignature | null;
  sections: Array<{ heading: string; body: string }>;
  model_name: 'mock-dreamspell-ai' | 'gpt-4o-mini';
  prompt_version: string;
  usage: { input_tokens: number; output_tokens: number; cost_twd: number };
  blocked_rules: readonly string[];
}
export interface MayaReportEntry {
  id: string;
  locale: MayaLocale;
  product_code: MayaProductCode;
  report_status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_status: string;
  created_at: string;
}

export function isMayaLocale(value: unknown): value is MayaLocale {
  return value === 'en' || value === 'zh-TW';
}
export function isMayaProduct(value: unknown): value is MayaProductCode {
  return MAYA_PRODUCTS.some((product) => product.code === value);
}
export function taipeiDate(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}
export function isMayaDate(value: unknown, maximum = taipeiDate()): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > maximum) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function mayaSignature(kin: number, locale: MayaLocale): MayaSignature {
  const seal = getSolarTotemByKin(kin);
  const tone = getToneByKin(kin);
  return {
    kin_number: kin,
    solar_seal_number: seal.number,
    solar_seal: locale === 'en' ? seal.nameEn : seal.nameZh,
    tone_number: tone.number,
    galactic_tone: locale === 'en' ? tone.nameEn : tone.nameZh,
    wavespell: Math.floor((kin - 1) / 13) + 1,
    castle: Math.floor((kin - 1) / 52) + 1,
    calculation_version: MAYA_CALCULATION_VERSION,
  };
}
export function mayaForDate(date: string, locale: MayaLocale): MayaSignature {
  return mayaSignature(calculateDreamspellKin(date).kin, locale);
}
export function mayaSummary(signature: MayaSignature, locale: MayaLocale): string {
  return locale === 'en'
    ? `KIN ${signature.kin_number}: ${signature.solar_seal}, ${signature.galactic_tone} tone. Use this combination as a reflection prompt: notice a strength you can practice today, rather than a prediction.`
    : `KIN ${signature.kin_number}：${signature.solar_seal}，${signature.galactic_tone}音調。以這個組合為自我覺察提示，觀察今天能實踐的優勢，不將它視為命運預測。`;
}
const sectionTopics = {
  'zh-TW': ['生命天賦', '潛在優勢', '成長課題', '波符與城堡編號', '事業與創造力', '每日實踐', '關係互動'],
  en: ['Life gifts', 'Potential strengths', 'Growth questions', 'Wavespell and castle numbers', 'Career and creativity', 'Daily practice', 'Relationship reflection'],
};

export function mockMayaReport(signature: MayaSignature, relationship: MayaSignature | null, locale: MayaLocale, product: MayaProductCode): MayaReport {
  const topics = sectionTopics[locale];
  const selected = product === 'MAYA_BASIC_199' ? topics.slice(0, 3) : topics;
  return {
    locale,
    product_code: product,
    signature,
    relationship_signature: relationship,
    sections: selected.map((heading, index) => ({
      heading,
      body: locale === 'en'
        ? `Mock reflection ${index + 1} for KIN ${signature.kin_number}, ${signature.solar_seal}, ${signature.galactic_tone}. Wavespell ${signature.wavespell}; castle ${signature.castle}.${relationship ? ` Partner: KIN ${relationship.kin_number}, ${relationship.solar_seal}, ${relationship.galactic_tone}. Compare your real experiences without assigning compatibility scores.` : ''} Choose one small action and review what you learn. Symbolic oracle rules remain disabled. This is test content, not scientific, medical, financial or future-event prediction.`
        : `測試覺察段落 ${index + 1}：KIN ${signature.kin_number}，${signature.solar_seal}，${signature.galactic_tone}音調。波符 ${signature.wavespell}；城堡 ${signature.castle}。${relationship ? `另一人：KIN ${relationship.kin_number}，${relationship.solar_seal}，${relationship.galactic_tone}音調。比較真實經驗，不設定相容分數。` : ''}選擇一個小行動並回顧收穫。未確認的神諭保持停用。這是測試內容，並非科學、醫療、財務或未來事件預測。`,
    })),
    model_name: 'mock-dreamspell-ai',
    prompt_version: `maya-${locale}-${product}-mock-1`,
    usage: { input_tokens: 0, output_tokens: 0, cost_twd: 0 },
    blocked_rules: MAYA_BLOCKED_RULES,
  };
}

export function validateMayaReport(value: unknown, expected: MayaReport): value is MayaReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  if (JSON.stringify(Object.keys(report).sort()) !== JSON.stringify(Object.keys(expected).sort())) return false;
  if ((expected.product_code === 'MAYA_RELATIONSHIP_699') !== (expected.relationship_signature !== null)) return false;
  if (report.locale !== expected.locale || report.product_code !== expected.product_code
    || report.model_name !== expected.model_name || report.prompt_version !== expected.prompt_version
    || JSON.stringify(report.signature) !== JSON.stringify(expected.signature)
    || JSON.stringify(report.relationship_signature) !== JSON.stringify(expected.relationship_signature)
    || JSON.stringify(report.usage) !== JSON.stringify(expected.usage)
    || JSON.stringify(report.blocked_rules) !== JSON.stringify(expected.blocked_rules)) return false;
  if (!Array.isArray(report.sections) || report.sections.length !== expected.sections.length) return false;
  if (!['mock-dreamspell-ai', 'gpt-4o-mini'].includes(expected.model_name)
    || !Number.isInteger(expected.usage.input_tokens) || !Number.isInteger(expected.usage.output_tokens)
    || expected.usage.input_tokens < 0 || expected.usage.output_tokens < 0
    || !Number.isFinite(expected.usage.cost_twd) || expected.usage.cost_twd < 0 || expected.usage.cost_twd > 1) return false;
  return report.sections.every((section: unknown, index: number) => {
    if (!section || typeof section !== 'object') return false;
    const entry = section as Record<string, unknown>;
    if (Object.keys(entry).length !== 2 || !('heading' in entry) || !('body' in entry)) return false;
    return entry.heading === expected.sections[index].heading && typeof entry.body === 'string'
      && entry.body.length >= 40 && entry.body.length <= 4000
      && !/[<>]/.test(entry.body)
      && (expected.locale !== 'en' || !/[\u3400-\u9fff]/u.test(entry.body))
      && (expected.locale !== 'zh-TW' || /[\u3400-\u9fff]/u.test(entry.body));
  });
}
