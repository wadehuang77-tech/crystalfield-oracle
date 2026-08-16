import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cardsApi, oracleFreeApi, type UnlockedCard } from '../lib/api';
import { trackCardDrawComplete, trackFreeReadingView, trackOracleFreeReadingCompleted } from '../lib/ga4';
import { getOracleFreeIntent } from '../lib/oracleFreeAccess';
import { getMultiUnlockCount, getMultiSpreadGateDecision, incrementMultiUnlock, MULTI_SPREAD_FREE_LIMIT } from './useDrawCounter';

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
  const completionSentRef = useRef(false);
  const oracleIntent = useMemo(() => getOracleFreeIntent(spreadId), [spreadId]);

  const unlockForFree = useCallback(async (picksToUnlock: Pick[], email?: string) => {
    if (!oracleIntent && getMultiUnlockCount(spreadId) >= MULTI_SPREAD_FREE_LIMIT) {
      throw new Error('這個牌陣的免費體驗已使用完畢');
    }
    const { cards } = await cardsApi.freeUnlockSpread(spreadId, picksToUnlock, oracleIntent?.reading_id, email);
    setUnlockedCards(cards);
    if (!oracleIntent) incrementMultiUnlock(spreadId);
    setPhase('unlocked');
  }, [spreadId, oracleIntent]);

  useEffect(() => {
    if (!enabled || !picks || picks.length === 0) { firedRef.current = false; return; }

    trackCardDrawComplete(spreadId, picks.length);

    const picksKey = picks.map(p => p.card_key).join(',');
    if (lastPicksKeyRef.current === picksKey && firedRef.current) return;
    lastPicksKeyRef.current = picksKey;
    firedRef.current = true;

    if (oracleIntent) {
      setPhase('loading'); setError(null);
      void unlockForFree(picks).catch((err) => { setError(err instanceof Error ? err.message : '解鎖失敗'); setPhase('paywall'); });
      return;
    }
    const nextPhase = getMultiSpreadGateDecision(getMultiUnlockCount(spreadId));
    if (nextPhase === 'auto_unlock') {
      setPhase('loading'); setError(null);
      void unlockForFree(picks).catch((err: unknown) => {
        const apiError = err as Error & { body?: { code?: string } };
        if (apiError.body?.code === 'FREE_SPREAD_EMAIL_REQUIRED') {
          if (getMultiUnlockCount(spreadId) === 0) incrementMultiUnlock(spreadId);
          setPhase('email_gate'); return;
        }
        setError(apiError instanceof Error ? apiError.message : '解鎖失敗'); setPhase('email_gate');
      });
    } else setPhase(nextPhase);
  }, [enabled, picks, spreadId, unlockForFree, oracleIntent]);

  useEffect(() => {
    if (phase === 'unlocked' && unlockedCards?.length) {
      trackFreeReadingView(spreadId, 'free_unlock_api', unlockedCards.length > 0);
      if (oracleIntent && !completionSentRef.current) {
        completionSentRef.current = true;
        void oracleFreeApi.complete(oracleIntent.reading_id).then((result) => {
          trackOracleFreeReadingCompleted(oracleIntent.reading_id, {
            free_reading_number: result.free_reading_number,
            remaining_free_readings: result.remaining_free_readings,
            deck_type: oracleIntent.deck_type,
            spread_type: oracleIntent.spread_type,
            need_type: oracleIntent.need_type,
          });
        }).catch(() => { completionSentRef.current = false; });
      }
    }
  }, [phase, spreadId, unlockedCards, oracleIntent]);

  const onEmailUnlocked = async (email: string) => {
    if (!picks || picks.length === 0) return;
    if (!oracleIntent && getMultiUnlockCount(spreadId) >= MULTI_SPREAD_FREE_LIMIT) {
      setPhase('paywall'); return;
    }
    setPhase('loading');
    setError(null);
    try {
      await unlockForFree(picks, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解鎖失敗');
      setPhase('paywall');
      throw err;
    }
  };

  return { phase, unlockedCards, error, onEmailUnlocked };
}
