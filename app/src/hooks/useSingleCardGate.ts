import { useEffect, useRef, useState } from 'react';
import { cardsApi, profileApi, type UnlockedCard } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getSingleUnlockCount, incrementSingleUnlock } from './useDrawCounter';

export type SingleGatePhase = 'idle' | 'loading' | 'unlocked' | 'email_gate' | 'membership_gate';

interface UseSingleCardGateOptions {
  spreadId: string;
  cardKey: string | null;
  reversed?: boolean;
  enabled: boolean; // true when card has been drawn and is visible
}

interface UseSingleCardGateResult {
  phase: SingleGatePhase;
  unlockedCard: UnlockedCard | null;
  error: string | null;
  onEmailUnlocked: (email: string, card?: UnlockedCard) => void;
  showMembership: boolean;
  setShowMembership: (v: boolean) => void;
}

export function useSingleCardGate({
  spreadId,
  cardKey,
  reversed = false,
  enabled,
}: UseSingleCardGateOptions): UseSingleCardGateResult {
  const { user } = useAuth();
  const [phase, setPhase] = useState<SingleGatePhase>('idle');
  const [unlockedCard, setUnlockedCard] = useState<UnlockedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMembership, setShowMembership] = useState(false);
  const firedRef = useRef(false);
  const lastCardKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !cardKey) { firedRef.current = false; return; }
    if (lastCardKeyRef.current === cardKey && firedRef.current) return;
    lastCardKeyRef.current = cardKey;
    firedRef.current = true;

    const count = getSingleUnlockCount();
    const autoUnlock = () => {
      setPhase('loading');
      cardsApi.freeUnlockSingle(spreadId, cardKey, reversed)
        .then(({ card }) => {
          setUnlockedCard(card);
          incrementSingleUnlock();
          setPhase('unlocked');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '解鎖失敗');
          setPhase('email_gate');
        });
    };

    const showMembershipGate = () => {
      setPhase('membership_gate');
      setShowMembership(true);
    };

    const continueForNonMember = () => {
      if (count === 0 || count === 2) {
        autoUnlock();
        return;
      }
      if (count === 1) {
        setPhase('email_gate');
        return;
      }
      showMembershipGate();
    };

    if (user) {
      setPhase('loading');
      profileApi.me()
        .then(({ profile }) => {
          if (profile?.membership?.is_active || profile?.purchased_spreads?.includes('membership_monthly')) {
            return cardsApi.freeUnlockSingle(spreadId, cardKey, reversed)
              .then(({ card }) => {
                setUnlockedCard(card);
                setPhase('unlocked');
              });
          }
          continueForNonMember();
        })
        .catch(() => {
          continueForNonMember();
        });
      return;
    }

    continueForNonMember();
  }, [enabled, cardKey, user?.id]);

  const onEmailUnlocked = (_email: string, card?: UnlockedCard) => {
    if (card) {
      setUnlockedCard(card);
      incrementSingleUnlock();
      setPhase('unlocked');
    }
  };

  return { phase, unlockedCard, error, onEmailUnlocked, showMembership, setShowMembership };
}
