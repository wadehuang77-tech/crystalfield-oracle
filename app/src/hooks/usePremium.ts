export type PlanTier = 0 | 1 | 2 | 3;

export function usePremium(tier: PlanTier, updateTier: (t: PlanTier) => Promise<void>) {
  const isPremium = tier > 0;
  const upgradeTo = (t: PlanTier) => updateTier(t);
  const resetToFree = () => updateTier(0);
  return { tier, isPremium, upgradeTo, resetToFree };
}
