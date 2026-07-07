import { useEffect, useRef, useState } from 'react';
import { cardsApi, publicApi, type UnlockedCard } from '../lib/api';
import { getMultiUnlockCount, incrementMultiUnlock } from './useDrawCounter';

export type MultiGatePhase = 'idle' | 'loading' | 'unlocked' | 'email_gate' | 'paywall';

interface Pick { card_key: string; position: number; reversed?: boolean; }

interface UseMultiSpreadGateOptions {
  spreadId: string;
  picks: Pick[] | null; // null = not drawn yet
  enabled: boolean;     // true when cards have been drawn
  emailGateAtCount?: number | null;
  emailSource?: string;
}

interface UseMultiSpreadGateResult {
  phase: MultiGatePhase;
  unlockedCards: UnlockedCard[] | null;
  error: string | null;
  onEmailUnlocked: (email: string) => Promise<void>;
}

export function useMultiSpreadGate({
  spreadId,
  picks,
  enabled,
  emailGateAtCount = null,
  emailSource,
}: UseMultiSpreadGateOptions): UseMultiSpreadGateResult {
  const [phase, setPhase] = useState<MultiGatePhase>('idle');
  const [unlockedCards, setUnlockedCards] = useState<UnlockedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);
  const lastPicksKeyRef = useRef<string>('');

  const unlockForFree = async (picksToUnlock: Pick[]) => {
    const { cards } = await cardsApi.freeUnlockSpread(spreadId, picksToUnlock);
    setUnlockedCards(cards);
    incrementMultiUnlock();
    setPhase('unlocked');
  };

  useEffect(() => {
    if (!enabled || !picks || picks.length === 0) { firedRef.current = false; return; }

    const picksKey = picks.map(p => p.card_key).join(',');
    if (lastPicksKeyRef.current === picksKey && firedRef.current) return;
    lastPicksKeyRef.current = picksKey;
    firedRef.current = true;

    const count = getMultiUnlockCount();

    if (emailGateAtCount !== null && count === emailGateAtCount) {
      setPhase('email_gate');
      return;
    }

    if (count < 3) {
      setPhase('loading');
      unlockForFree(picks)
        .then(() => {
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '解鎖失敗');
          setPhase('paywall');
        });
    } else {
      setPhase('paywall');
    }
  }, [emailGateAtCount, enabled, picks, spreadId]);

  const onEmailUnlocked = async (email: string) => {
    if (!picks || picks.length === 0) return;
    setPhase('loading');
    setError(null);
    try {
      await publicApi.saveEmail(email, emailSource ?? spreadId).catch(() => {});
      await unlockForFree(picks);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解鎖失敗');
      setPhase('email_gate');
      throw err;
    }
  };

  return { phase, unlockedCards, error, onEmailUnlocked };
}
