import { useCallback, useEffect, useRef, useState } from 'react';
import { cardsApi, type UnlockedCard } from '../lib/api';
import {
  getMultiUnlockCount,
  getMultiSpreadGateDecision,
  incrementMultiUnlock,
  MULTI_SPREAD_FREE_LIMIT,
} from './useDrawCounter';
import { trackCardDrawComplete, trackFreeReadingView } from '../lib/ga4';

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

  const unlockForFree = useCallback(async (picksToUnlock: Pick[], email?: string) => {
    if (getMultiUnlockCount(spreadId) >= MULTI_SPREAD_FREE_LIMIT) {
      throw new Error('這個牌陣的免費體驗已使用完畢');
    }
    const { cards } = await cardsApi.freeUnlockSpread(spreadId, picksToUnlock, email);
    setUnlockedCards(cards);
    incrementMultiUnlock(spreadId);
    setPhase('unlocked');
  }, [spreadId]);

  useEffect(() => {
    if (!enabled || !picks || picks.length === 0) { firedRef.current = false; return; }

    trackCardDrawComplete(spreadId, picks.length);

    const picksKey = picks.map(p => p.card_key).join(',');
    if (lastPicksKeyRef.current === picksKey && firedRef.current) return;
    lastPicksKeyRef.current = picksKey;
    firedRef.current = true;

    const count = getMultiUnlockCount(spreadId);

    const nextPhase = getMultiSpreadGateDecision(count);
    if (nextPhase === 'auto_unlock') {
      setPhase('loading');
      setError(null);
      void unlockForFree(picks).catch((err: unknown) => {
        const apiError = err as Error & { status?: number; body?: { code?: string } };
        if (apiError.body?.code === 'FREE_SPREAD_EMAIL_REQUIRED') {
          if (getMultiUnlockCount(spreadId) === 0) incrementMultiUnlock(spreadId);
          setPhase('email_gate');
          return;
        }
        setError(apiError instanceof Error ? apiError.message : '解鎖失敗');
        setPhase('email_gate');
      });
    } else if (nextPhase === 'email_gate') {
      setPhase('email_gate');
    } else {
      setPhase('paywall');
    }
  }, [enabled, picks, spreadId, unlockForFree]);

  useEffect(() => {
    if (phase === 'unlocked' && unlockedCards?.length) {
      trackFreeReadingView(spreadId, 'free_unlock_api', unlockedCards.length > 0);
    }
  }, [phase, spreadId, unlockedCards]);

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
      await unlockForFree(picks, email);
    } catch (err) {
      const apiError = err as Error & { status?: number; body?: { code?: string } };
      setError(apiError instanceof Error ? apiError.message : '解鎖失敗');
      if (apiError.status === 409) {
        if (apiError.body?.code === 'FREE_SPREAD_EMAIL_REQUIRED') {
          setPhase('email_gate');
          return;
        }
        while (getMultiUnlockCount(spreadId) < MULTI_SPREAD_FREE_LIMIT) {
          incrementMultiUnlock(spreadId);
        }
        setPhase('paywall');
        return;
      } else {
        setPhase('email_gate');
      }
      throw err;
    }
  };

  return { phase, unlockedCards, error, onEmailUnlocked };
}
