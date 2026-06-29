import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { bundleApi, type BundleCredits } from '../lib/api';
import type { SpreadCategory } from '../lib/spread-prices';

interface UseBundleCreditsResult {
  credits: BundleCredits | null;
  isLoading: boolean;
  hasCredit: (category: SpreadCategory) => boolean;
  consume: (category: SpreadCategory) => Promise<boolean>;
}

export function useBundleCredits(): UseBundleCreditsResult {
  const { user } = useAuth();
  const [credits, setCredits] = useState<BundleCredits | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) { setCredits(null); return; }
    setIsLoading(true);
    bundleApi.getCredits()
      .then(r => setCredits(r.credits))
      .catch(() => setCredits(null))
      .finally(() => setIsLoading(false));
  }, [user]);

  const hasCredit = (category: SpreadCategory): boolean => {
    if (!credits) return false;
    return credits[category] > 0;
  };

  const consume = async (category: SpreadCategory): Promise<boolean> => {
    try {
      const r = await bundleApi.consume(category);
      if (r.ok) {
        setCredits(prev => prev ? { ...prev, [category]: r.remaining } : prev);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return { credits, isLoading, hasCredit, consume };
}
