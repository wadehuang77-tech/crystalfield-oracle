import { useEffect, useRef, useState } from 'react';
import { cardsApi, type UnlockedCard } from '../lib/api';
import { getMultiUnlockCount, incrementMultiUnlock } from './useDrawCounter';

export type MultiGatePhase = 'idle' | 'loading' | 'unlocked' | 'paywall';

interface Pick { card_key: string; position: number; reversed?: boolean; }

interface UseMultiSpreadGateOptions {
  spreadId: string;
  picks: Pick[] | null; // null = not drawn yet
  enabled: boolean;     // true when cards have been drawn
}

interface UseMultiSpreadGateResult {
  phase: MultiGatePhase;
  unlockedCards: UnlockedCard[] | null;
  error: string | null;
}

export function useMultiSpreadGate({
  spreadId,
  picks,
  enabled,
}: UseMultiSpreadGateOptions): UseMultiSpreadGateResult {
  const [phase, setPhase] = useState<MultiGatePhase>('idle');
  const [unlockedCards, setUnlockedCards] = useState<UnlockedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);
  const lastPicksKeyRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !picks || picks.length === 0) { firedRef.current = false; return; }

    const picksKey = picks.map(p => p.card_key).join(',');
    if (lastPicksKeyRef.current === picksKey && firedRef.current) return;
    lastPicksKeyRef.current = picksKey;
    firedRef.current = true;

    const count = getMultiUnlockCount();

    if (count < 3) {
      setPhase('loading');
      cardsApi.freeUnlockSpread(spreadId, picks)
        .then(({ cards }) => {
          setUnlockedCards(cards);
          incrementMultiUnlock();
          setPhase('unlocked');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '解鎖失敗');
          setPhase('paywall');
        });
    } else {
      setPhase('paywall');
    }
  }, [enabled, picks, spreadId]);

  return { phase, unlockedCards, error };
}
