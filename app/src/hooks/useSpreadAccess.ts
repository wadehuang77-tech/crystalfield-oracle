import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileApi } from '../lib/api';

export type UserState = 'guest' | 'user_free' | 'user_paid';

interface SpreadAccessResult {
  userState: UserState;
  isPaid: boolean;
  isLoading: boolean;
  loadError: string | null;
  refreshAccess: () => Promise<void>;
}

export function useSpreadAccess(): SpreadAccessResult {
  const { user } = useAuth();
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(!!user);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshAccess = useCallback(async () => {
    if (!user) { setIsPaid(false); setIsLoading(false); setLoadError(null); return; }
    setIsLoading(true);
    setLoadError(null);
    try {
      const { profile } = await profileApi.me();
      setIsPaid(profile?.hasActiveTarotSubscription === true);
    } catch (error) {
      setIsPaid(false);
      setLoadError(error instanceof Error ? error.message : '無法確認塔羅會員狀態');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void refreshAccess(); }, [refreshAccess]);

  return {
    userState: !user ? 'guest' : isPaid ? 'user_paid' : 'user_free',
    isPaid,
    isLoading,
    loadError,
    refreshAccess,
  };
}
