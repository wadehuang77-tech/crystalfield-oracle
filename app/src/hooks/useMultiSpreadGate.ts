import { useEffect, useRef, useState } from 'react';
import { cardsApi, type UnlockedCard } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { trackCardDrawComplete, trackUseTarotDuringTrial } from '../lib/ga4';

export type MultiGatePhase = 'idle' | 'loading' | 'unlocked' | 'login_gate' | 'paywall';
interface Pick { card_key: string; position: number; reversed?: boolean; }
interface UseMultiSpreadGateOptions { spreadId: string; picks: Pick[] | null; enabled: boolean; }
interface UseMultiSpreadGateResult {
  phase: MultiGatePhase;
  unlockedCards: UnlockedCard[] | null;
  error: string | null;
  onEmailUnlocked: (email: string) => Promise<void>;
  unlockSource: 'free' | 'subscription' | null;
  bundleRemaining: number | null;
}

export function useMultiSpreadGate({ spreadId, picks, enabled }: UseMultiSpreadGateOptions): UseMultiSpreadGateResult {
  const { user } = useAuth();
  const [phase, setPhase] = useState<MultiGatePhase>('idle');
  const [unlockedCards, setUnlockedCards] = useState<UnlockedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockSource, setUnlockSource] = useState<'free' | 'subscription' | null>(null);
  const [accessVersion, setAccessVersion] = useState(0);
  const attemptRef = useRef('');

  useEffect(() => {
    const changed = () => { attemptRef.current = ''; setAccessVersion((value) => value + 1); };
    window.addEventListener('tarot-entitlement-changed', changed);
    return () => window.removeEventListener('tarot-entitlement-changed', changed);
  }, []);

  useEffect(() => {
    if (!enabled || !picks?.length || phase === 'unlocked') return;
    const picksKey = picks.map((pick) => `${pick.position}:${pick.card_key}:${pick.reversed ? 1 : 0}`).join(',');
    const key = `${spreadId}:${picksKey}:${user?.id ?? 'guest'}:${accessVersion}`;
    if (attemptRef.current === key) return;
    attemptRef.current = key;
    trackCardDrawComplete(spreadId, picks.length);

    if (!user) { setPhase('login_gate'); return; }
    setPhase('loading'); setError(null); setUnlockSource(null);
    void cardsApi.freeUnlockSpread(spreadId, picks).then((result) => {
      setUnlockedCards(result.cards);
      setUnlockSource(result.entitlement_status === 'trialing' ? 'free' : 'subscription');
      setPhase('unlocked');
      if (result.entitlement_status === 'trialing') trackUseTarotDuringTrial(spreadId);
    }).catch((cause: Error & { status?: number }) => {
      if (cause.status === 401) { setPhase('login_gate'); return; }
      setError(cause.message || '解鎖失敗');
      setPhase('paywall');
    });
  }, [enabled, picks, spreadId, user, accessVersion, phase]);

  const onEmailUnlocked = async () => {};
  return { phase, unlockedCards, error, onEmailUnlocked, unlockSource, bundleRemaining: null };
}
