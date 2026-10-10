import { isMayaDate, type MayaLocale, type MayaProductCode } from './maya';
import { MAYA_PRO_PRODUCT } from './mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT, RELATIONSHIP_TYPES, type RelationshipType } from './mayaRelationship';

export type MayaUnlockProduct = MayaProductCode | typeof MAYA_PRO_PRODUCT.code | typeof MAYA_RELATIONSHIP_PRODUCT.code;
export interface MayaUnlockIntent {
  userId: string;
  locale: MayaLocale;
  product: MayaUnlockProduct;
  orderId: string;
  profileId: string;
  profileBirthDate: string;
  partnerId?: string;
  partnerBirthDate?: string;
  relationshipType?: RelationshipType;
  consent?: boolean;
  idempotencyKey: string;
  reportId?: string;
  phase: 'waiting' | 'started' | 'completed';
}
const key = (userId: string, locale: MayaLocale, orderId: string) => `maya-unlock:${userId}:${locale}:${orderId}`;

export function saveMayaUnlockIntent(intent: MayaUnlockIntent): void {
  sessionStorage.setItem(key(intent.userId, intent.locale, intent.orderId), JSON.stringify(intent));
}

export function readMayaUnlockIntent(userId: string, locale: MayaLocale, orderId: string, product: MayaUnlockProduct): MayaUnlockIntent | null {
  const raw = sessionStorage.getItem(key(userId, locale, orderId));
  if (!raw) return null;
  const invalid = locale === 'en' ? 'Invalid saved report request.' : '已儲存的報告請求格式不符。';
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch (cause) {
    if (cause instanceof SyntaxError) throw new Error(invalid);
    throw cause;
  }
  if (!value || typeof value !== 'object') throw new Error(invalid);
  const v = value as Partial<MayaUnlockIntent>;
  if (v.userId !== userId || v.locale !== locale || v.orderId !== orderId || v.product !== product
    || typeof v.profileId !== 'string' || !v.profileId || !isMayaDate(v.profileBirthDate)
    || typeof v.idempotencyKey !== 'string' || !v.idempotencyKey
    || !['waiting', 'started', 'completed'].includes(v.phase ?? '') || v.reportId !== undefined && typeof v.reportId !== 'string'
    || (product === MAYA_RELATIONSHIP_PRODUCT.code && (typeof v.partnerId !== 'string' || !v.partnerId || !isMayaDate(v.partnerBirthDate)
      || v.consent !== true || !v.relationshipType || !RELATIONSHIP_TYPES.includes(v.relationshipType)))) {
    throw new Error(invalid);
  }
  return v as MayaUnlockIntent;
}
