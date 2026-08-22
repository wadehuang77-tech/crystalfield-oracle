export const TAROT_FREE_READING_LIMIT = 2;

export type TarotQuotaDecision = 'allow_free' | 'login_required' | 'payment_required';

export function decideTarotQuota(completed: number, authenticated: boolean): TarotQuotaDecision {
  const used = Math.max(0, Math.floor(completed));
  if (used === 0) return 'allow_free';
  if (used === 1) return authenticated ? 'allow_free' : 'login_required';
  return 'payment_required';
}

export function mergeTarotUsageCounts(accountUsage: number, anonymousUsage: number): number {
  return Math.max(0, Math.floor(accountUsage), Math.floor(anonymousUsage));
}
