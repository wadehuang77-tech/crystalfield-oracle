import { useAuth } from '../contexts/AuthContext';

export type UserState = 'guest' | 'user_free' | 'user_paid';

interface SpreadAccessResult {
  userState: UserState;
  isPaid: boolean;
  isLoading: boolean;
  loadError: string | null;
  refreshAccess: () => Promise<void>;
}

export function useSpreadAccess(_spreadId: string): SpreadAccessResult {
  const { user } = useAuth();
  const userState: UserState = user ? 'user_free' : 'guest';
  return {
    userState,
    isPaid: false,
    isLoading: false,
    loadError: null,
    refreshAccess: async () => {},
  };
}
