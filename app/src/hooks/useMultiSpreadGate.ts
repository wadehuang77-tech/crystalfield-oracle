import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bundleApi, cardsApi, oracleFreeApi, type UnlockedCard } from '../lib/api';
import { trackCardDrawComplete, trackFreeReadingView, trackOracleFreeReadingCompleted, trackOraclePaywallViewed } from '../lib/ga4';
import { getOracleFreeIntent } from '../lib/oracleFreeAccess';
import { useAuth } from '../contexts/AuthContext';
import { getSpreadCategory } from '../lib/spread-prices';
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
  unlockSource: 'free' | 'bundle' | null;
  bundleRemaining: number | null;
}

export function useMultiSpreadGate({
  spreadId,
  picks,
  enabled,
}: UseMultiSpreadGateOptions): UseMultiSpreadGateResult {
  const { user } = useAuth();
  const [phase, setPhase] = useState<MultiGatePhase>('idle');
  const [unlockedCards, setUnlockedCards] = useState<UnlockedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockSource, setUnlockSource] = useState<'free' | 'bundle' | null>(null);
  const [bundleRemaining, setBundleRemaining] = useState<number | null>(null);
  const firedRef = useRef(false);
  const lastPicksKeyRef = useRef<string>('');
  const completionSentRef = useRef(false);
  const paywallTrackedRef = useRef(false);
  const oracleIntent = useMemo(() => getOracleFreeIntent(spreadId), [spreadId]);
  const category = useMemo(() => getSpreadCategory(spreadId), [spreadId]);

  const unlockForFree = useCallback(async (picksToUnlock: Pick[], email?: string) => {
    if (!oracleIntent && getMultiUnlockCount(spreadId) >= MULTI_SPREAD_FREE_LIMIT) {
      throw new Error('這個牌陣的免費體驗已使用完畢');
    }
    const readingId = oracleIntent?.access_mode === 'free' ? oracleIntent.reading_id : undefined;
    const { cards } = await cardsApi.freeUnlockSpread(spreadId, picksToUnlock, readingId, email);
    setUnlockedCards(cards);
    setUnlockSource('free');
    if (!oracleIntent) incrementMultiUnlock(spreadId);
    setPhase('unlocked');
  }, [spreadId, oracleIntent]);

  const unlockWithBundle = useCallback(async (picksToUnlock: Pick[], picksKey: string): Promise<boolean> => {
    if (!user || !category) return false;
    const creditResult = await bundleApi.getCredits();
    if (!creditResult.credits || creditResult.credits[category] <= 0) return false;
    const storageKey = `cf_bundle_reading:${spreadId}:${picksKey}`;
    let readingId = '';
    try { readingId = sessionStorage.getItem(storageKey) ?? ''; } catch { /* storage unavailable */ }
    if (!readingId) {
      readingId = crypto.randomUUID();
      try { sessionStorage.setItem(storageKey, readingId); } catch { /* storage unavailable */ }
    }
    const result = await bundleApi.unlockSpread(spreadId, picksToUnlock, readingId);
    setUnlockedCards(result.cards);
    setBundleRemaining(result.remaining);
    setUnlockSource('bundle');
    setPhase('unlocked');
    return true;
  }, [user, category, spreadId]);

  const showPaywallOrUseBundle = useCallback(async (picksToUnlock: Pick[], picksKey: string) => {
    if (user && category) {
      setPhase('loading');
      try {
        if (await unlockWithBundle(picksToUnlock, picksKey)) return;
      } catch (err) {
        const apiError = err as Error & { status?: number };
        if (apiError.status !== 402) setError(apiError.message || '套票解鎖失敗');
      }
    }
    setPhase('paywall');
    if (oracleIntent && !paywallTrackedRef.current) {
      paywallTrackedRef.current = true;
      trackOraclePaywallViewed({
        reason: 'free_limit_reached', completed_free_readings: 2,
        deck_type: oracleIntent.deck_type,
        spread_type: oracleIntent.spread_type,
        need_type: oracleIntent.need_type,
      });
    }
  }, [user, category, unlockWithBundle, oracleIntent]);

  useEffect(() => {
    if (!enabled || !picks || picks.length === 0) { firedRef.current = false; return; }

    trackCardDrawComplete(spreadId, picks.length);

    const picksKey = picks.map(p => p.card_key).join(',');
    if (lastPicksKeyRef.current === picksKey && firedRef.current) return;
    lastPicksKeyRef.current = picksKey;
    firedRef.current = true;
    setUnlockSource(null);
    setBundleRemaining(null);

    if (oracleIntent) {
      if (oracleIntent.access_mode === 'paywall_preview') {
        void showPaywallOrUseBundle(picks, picksKey);
        return;
      }
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
    } else if (nextPhase === 'paywall') {
      void showPaywallOrUseBundle(picks, picksKey);
    } else setPhase(nextPhase);
  }, [enabled, picks, spreadId, unlockForFree, oracleIntent, showPaywallOrUseBundle]);

  useEffect(() => {
    if (phase === 'unlocked' && unlockedCards?.length) {
      if (unlockSource === 'free') trackFreeReadingView(spreadId, 'free_unlock_api', unlockedCards.length > 0);
      if (oracleIntent?.access_mode === 'free' && oracleIntent.reading_id && !completionSentRef.current) {
        const readingId = oracleIntent.reading_id;
        completionSentRef.current = true;
        void oracleFreeApi.complete(readingId).then((result) => {
          trackOracleFreeReadingCompleted(readingId, {
            free_reading_number: result.free_reading_number,
            remaining_free_readings: result.remaining_free_readings,
            deck_type: oracleIntent.deck_type,
            spread_type: oracleIntent.spread_type,
            need_type: oracleIntent.need_type,
          });
        }).catch(() => { completionSentRef.current = false; });
      }
    }
  }, [phase, spreadId, unlockedCards, oracleIntent, unlockSource]);

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

  return { phase, unlockedCards, error, onEmailUnlocked, unlockSource, bundleRemaining };
}
