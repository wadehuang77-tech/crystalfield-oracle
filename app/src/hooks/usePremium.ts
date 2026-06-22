import { useState } from 'react';

// 0 = free, 1 = 基礎版 NT$250, 2 = 進階版 NT$399, 3 = 完整靈魂版 NT$599
export type PlanTier = 0 | 1 | 2 | 3;

const KEY = 'lcc_tier_v1';

export function usePremium() {
  const [tier, setTier] = useState<PlanTier>(() => {
    try {
      const v = parseInt(localStorage.getItem(KEY) ?? '0', 10);
      return (v >= 0 && v <= 3 ? v : 0) as PlanTier;
    } catch { return 0; }
  });

  const upgradeTo = (t: PlanTier) => {
    try { localStorage.setItem(KEY, String(t)); } catch {}
    setTier(t);
  };

  const resetToFree = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setTier(0);
  };

  // Legacy compat: isPremium = any paid tier
  const isPremium = tier > 0;

  return { tier, isPremium, upgradeTo, resetToFree };
}
