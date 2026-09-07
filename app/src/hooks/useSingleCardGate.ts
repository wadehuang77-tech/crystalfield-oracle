import { useEffect, useRef, useState } from 'react';
import { cardsApi, type UnlockedCard } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { trackCardDrawComplete, trackUseTarotDuringTrial } from '../lib/ga4';

export type SingleGatePhase = 'idle' | 'loading' | 'unlocked' | 'login_gate' | 'membership_gate';

interface UseSingleCardGateOptions { spreadId: string; cardKey: string | null; reversed?: boolean; enabled: boolean; }
interface UseSingleCardGateResult {
  phase: SingleGatePhase;
  unlockedCard: UnlockedCard | null;
  error: string | null;
  onEmailUnlocked: (email: string, card?: UnlockedCard) => void;
  showMembership: boolean;
  setShowMembership: (value: boolean) => void;
}

export function useSingleCardGate({ spreadId, cardKey, reversed = false, enabled }: UseSingleCardGateOptions): UseSingleCardGateResult {
  const { user } = useAuth();
  const [phase, setPhase] = useState<SingleGatePhase>('idle');
  const [unlockedCard, setUnlockedCard] = useState<UnlockedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMembership, setShowMembership] = useState(false);
  const [accessVersion, setAccessVersion] = useState(0);
  const attemptRef = useRef('');

  useEffect(() => {
    const changed = () => { attemptRef.current = ''; setAccessVersion((value) => value + 1); };
    window.addEventListener('tarot-entitlement-changed', changed);
    return () => window.removeEventListener('tarot-entitlement-changed', changed);
  }, []);

  useEffect(() => {
    if (!enabled || !cardKey || phase === 'unlocked') return;
    const key = `${spreadId}:${cardKey}:${reversed ? 1 : 0}:${user?.id ?? 'guest'}:${accessVersion}`;
    if (attemptRef.current === key) return;
    attemptRef.current = key;
    trackCardDrawComplete(spreadId, 1);

    if (!user) { setPhase('login_gate'); return; }
    setPhase('loading'); setError(null);
    void cardsApi.freeUnlockSingle(spreadId, cardKey, reversed).then((result) => {
      setUnlockedCard(result.card);
      setPhase('unlocked');
      setShowMembership(false);
      if (result.entitlement_status === 'trialing') trackUseTarotDuringTrial(spreadId);
    }).catch((cause: Error & { status?: number }) => {
      if (cause.status === 401) { setPhase('login_gate'); return; }
      setError(cause.message || '解鎖失敗');
      setPhase('membership_gate');
      setShowMembership(true);
    });
  }, [enabled, cardKey, reversed, spreadId, user, accessVersion, phase]);

  const onEmailUnlocked = (_email: string, card?: UnlockedCard) => { if (card) setUnlockedCard(card); };
  return { phase, unlockedCard, error, onEmailUnlocked, showMembership, setShowMembership };
}
