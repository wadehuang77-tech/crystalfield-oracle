import { calculateDreamspellKin } from './dreamspell';
import { isMayaDate, taipeiDate, MAYA_CALCULATION_VERSION, type MayaLocale } from './maya';

export const MAYA_ANNUAL_PRODUCT = { code: 'MAYA_ANNUAL_599', price: 599, zh: '馬雅流年運勢', en: 'Dreamspell Birthday Year' } as const;
export const ANNUAL_VERSION = 'birthday-year-1';
export const ANNUAL_CHAPTERS = [
  ['你的年度主題', 'Your annual theme'], ['流年印記解析', 'Your birthday-year signature'],
  ['今年如何分配力氣', 'Where to direct your energy'], ['工作與創作', 'Work and creativity'],
  ['關係與溝通', 'Relationships and communication'], ['資源與金錢習慣', 'Resources and money habits'],
  ['身心節奏', 'Everyday wellbeing and rhythm'], ['52 年生命循環定位', 'Your place in the 52-year cycle'],
  ['三個可執行的年度行動', 'Three practical annual actions'], ['給你的年度提醒', 'A personal reminder for your year'],
] as const;
export const ANNUAL_CASTLES = [
  ['紅城堡：啟動與建立', 'Red castle: initiation and foundations'],
  ['白城堡：淨化與釐清', 'White castle: purification and clarity'],
  ['藍城堡：轉變與更新', 'Blue castle: transformation and renewal'],
  ['黃城堡：成熟與收穫', 'Yellow castle: maturity and harvest'],
  ['綠城堡：整合與超越', 'Green castle: integration and transcendence'],
] as const;
export interface AnnualSnapshot {
  product: typeof MAYA_ANNUAL_PRODUCT.code; birthDate: string; start: string; end: string;
  startYear: number; age: number; cycleNumber: number; cyclePosition: number;
  birthKin: number; kin: number; tone: number; seal: number; castle: number;
  algorithmVersion: string; contentVersion: string; timezone: 'Asia/Taipei';
}
export function annualSnapshot(birth: string, year?: number, today = taipeiDate()): AnnualSnapshot {
  if (!isMayaDate(birth, today)) throw new Error('INVALID_DATE');
  // Existing member system explicitly blocks leap-day birth signatures. No invented substitute birthday.
  if (birth.slice(5) === '02-29') throw new Error('LEAP_DAY_BLOCKED');
  const current = Number(today.slice(0, 4));
  const startYear = year ?? current - (today.slice(5) < birth.slice(5) ? 1 : 0);
  if (!Number.isInteger(startYear) || startYear < Number(birth.slice(0, 4)) || startYear > current + 1) throw new Error('INVALID_YEAR');
  const start = `${startYear}-${birth.slice(5)}`;
  const next = `${startYear + 1}-${birth.slice(5)}`;
  const end = new Date(Date.parse(`${next}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const signature = calculateDreamspellKin(start);
  const birthKin = calculateDreamspellKin(birth).kin;
  const age = startYear - Number(birth.slice(0, 4));
  // Every same-month/day year advances 365 non-leap days. 365*52 is divisible by 260.
  if (signature.kin !== (birthKin - 1 + age * 365) % 260 + 1) throw new Error('CYCLE_VALIDATION_FAILED');
  return { product: MAYA_ANNUAL_PRODUCT.code, birthDate: birth, start, end, startYear, age,
    cycleNumber: Math.floor(age / 52) + 1, cyclePosition: age % 52 + 1, birthKin,
    kin: signature.kin, tone: signature.tone.number, seal: signature.solarTotem.number,
    castle: signature.castle.number,
    algorithmVersion: `${MAYA_CALCULATION_VERSION}:${ANNUAL_VERSION}`, contentVersion: ANNUAL_VERSION, timezone: 'Asia/Taipei' };
}
export interface AnnualState {
  orderId: string; snapshot: AnnualSnapshot; locale: MayaLocale;
  status: 'pending' | 'processing' | 'failed' | 'blocked' | 'completed';
  completed: number; percent: number; error: string | null;
  sections: Array<{ heading: string; body: string }> | null;
}
export function annualError(code: string, en: boolean): string {
  const errors: Record<string, [string, string]> = {
    LEAP_DAY_BLOCKED: ['2 月 29 日出生者的生日流年規則尚待確認，目前不能購買。', 'February 29 birthday-year rules are not defined yet. Purchasing is unavailable.'],
    INVALID_DATE: ['請輸入有效出生日期。', 'Enter a valid birth date.'],
    INVALID_YEAR: ['請選擇出生年份至明年之間的流年起始年份。', 'Choose a start year between your birth year and next year.'],
    LOGIN_REQUIRED: ['請先登入。', 'Please sign in.'],
    PAYMENT_REQUIRED: ['尚未確認付款，或權限已撤銷。請勿重複付款。', 'Payment is not confirmed or access was revoked. Do not pay again.'],
    FEATURE_DISABLED: ['流年報告尚未開放。', 'Birthday-year reports are not enabled yet.'],
    AI_OUTCOME_UNKNOWN: ['生成結果待核對，已購權限保留。請聯絡客服，勿重複付款。', 'Generation needs reconciliation. Your purchase is retained. Contact support; do not pay again.'],
    AI_COST_LIMIT: ['生成已達費用上限，已購權限保留，請聯絡客服。', 'The generation cost limit was reached. Your purchase is retained; contact support.'],
  };
  return errors[code]?.[en ? 1 : 0] ?? (en ? `Unable to complete this step (${code}). Retry without paying again.` : `暫時無法完成（${code}），可重試，不需再次付款。`);
}
