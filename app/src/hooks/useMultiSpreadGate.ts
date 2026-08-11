import { useCallback, useEffect, useRef, useState } from 'react';
import { cardsApi, publicApi, type UnlockedCard } from '../lib/api';
import {
  getMultiUnlockCount,
  getMultiSpreadGateDecision,
  incrementMultiUnlock,
  MULTI_SPREAD_FREE_LIMIT,
} from './useDrawCounter';

export type MultiGatePhase = 'idle' | 'loading' | 'unlocked' | 'email_gate' | 'paywall';

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
  onEmailUnlocked: (email: string) => Promise<void>;
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

  const unlockForFree = useCallback(async (picksToUnlock: Pick[]) => {
    if (getMultiUnlockCount(spreadId) >= MULTI_SPREAD_FREE_LIMIT) {
      throw new Error('這個牌陣的免費體驗已使用完畢');
    }
    const { cards } = await cardsApi.freeUnlockSpread(spreadId, picksToUnlock);
    setUnlockedCards(cards);
    incrementMultiUnlock(spreadId);
    setPhase('unlocked');
  }, [spreadId]);

  useEffect(() => {
    if (!enabled || !picks || picks.length === 0) { firedRef.current = false; return; }

    const picksKey = picks.map(p => p.card_key).join(',');
    if (lastPicksKeyRef.current === picksKey && firedRef.current) return;
    lastPicksKeyRef.current = picksKey;
    firedRef.current = true;

    const count = getMultiUnlockCount(spreadId);

    const nextPhase = getMultiSpreadGateDecision(count);
    if (nextPhase === 'email_gate') {
      setPhase('email_gate');
    } else {
      setPhase('paywall');
    }
  }, [enabled, picks, spreadId]);

  const onEmailUnlocked = async (email: string) => {
    if (!picks || picks.length === 0) return;
    if (getMultiUnlockCount(spreadId) >= MULTI_SPREAD_FREE_LIMIT) {
      setError('這個牌陣的免費體驗已使用完畢');
      setPhase('paywall');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      await publicApi.saveEmail(email, spreadId).catch(() => {});
      await unlockForFree(picks);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解鎖失敗');
      setPhase('email_gate');
      throw err;
    }
  };

  return { phase, unlockedCards, error, onEmailUnlocked };
}
