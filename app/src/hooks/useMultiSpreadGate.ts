import { useCallback, useEffect, useRef, useState } from 'react';
import { cardsApi, oracleFreeApi, profileApi, type UnlockedCard } from '../lib/api';
import { trackCardDrawComplete, trackFreeReadingView, trackOracleFreeReadingCompleted, trackOraclePaywallViewed } from '../lib/ga4';
import { clearOracleFreeIntent, getOracleFreeIntent } from '../lib/oracleFreeAccess';
import { useAuth } from '../contexts/AuthContext';

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
  const [readingId, setReadingId] = useState<string | null>(null);
  const attemptRef = useRef('');
  const identityRef = useRef('');
  const completionSentRef = useRef('');
  const paywallTrackedRef = useRef(false);
  const [oracleIntent, setOracleIntent] = useState(() => getOracleFreeIntent(spreadId));

  useEffect(() => { setOracleIntent(getOracleFreeIntent(spreadId)); }, [spreadId]);

  const unlockWithSubscription = useCallback(async (picksToUnlock: Pick[]): Promise<boolean> => {
    if (!user) return false;
    const { profile } = await profileApi.me();
    if (!profile?.hasActiveTarotSubscription) return false;
    const result = await cardsApi.freeUnlockSpread(spreadId, picksToUnlock);
    setUnlockedCards(result.cards);
    setUnlockSource('subscription');
    setPhase('unlocked');
    return true;
  }, [user, spreadId]);

  const showPaywall = useCallback(() => {
    setPhase('paywall');
    if (oracleIntent && !paywallTrackedRef.current) {
      paywallTrackedRef.current = true;
      trackOraclePaywallViewed({
        reason: 'free_limit_reached', completed_free_readings: 2,
        deck_type: oracleIntent.deck_type, spread_type: oracleIntent.spread_type, need_type: oracleIntent.need_type,
      });
    }
  }, [oracleIntent]);

  useEffect(() => {
    if (!enabled || !picks?.length) return;
    const picksKey = picks.map((pick) => `${pick.position}:${pick.card_key}:${pick.reversed ? 1 : 0}`).join(',');
    const identity = `${spreadId}:${picksKey}`;
    if (identityRef.current && identityRef.current !== identity) {
      identityRef.current = identity;
      attemptRef.current = '';
      completionSentRef.current = '';
      setUnlockedCards(null);
      setReadingId(null);
      setPhase('idle');
      setOracleIntent(getOracleFreeIntent(spreadId));
      return;
    }
    identityRef.current = identity;
    if (phase === 'unlocked') return;
    trackCardDrawComplete(spreadId, picks.length);
    const attemptKey = `${spreadId}:${picksKey}:${user?.id ?? 'anonymous'}:${oracleIntent?.reading_id ?? 'direct'}`;
    if (attemptRef.current === attemptKey) return;
    attemptRef.current = attemptKey;
    setUnlockSource(null);

    const run = async () => {
      setPhase('loading');
      setError(null);
      try {
        if (await unlockWithSubscription(picks)) return;
        if (oracleIntent?.access_mode === 'paywall_preview') { showPaywall(); return; }
        const activeReadingId = oracleIntent?.access_mode === 'free'
          ? oracleIntent.reading_id!
          : (await oracleFreeApi.start(spreadId)).reading_id;
        const { cards } = await cardsApi.freeUnlockSpread(spreadId, picks, activeReadingId);
        setReadingId(activeReadingId);
        setUnlockedCards(cards);
        setUnlockSource('free');
        setPhase('unlocked');
      } catch (err) {
        const apiError = err as Error & { status?: number; body?: { code?: string } };
        if (apiError.status === 401 && apiError.body?.code === 'TAROT_LOGIN_REQUIRED') { setPhase('login_gate'); return; }
        if (apiError.body?.code === 'FREE_GLOBAL_LIMIT_REACHED') { showPaywall(); return; }
        setError(apiError.message || '解鎖失敗');
        showPaywall();
      }
    };
    void run();
  }, [enabled, picks, spreadId, user?.id, oracleIntent, phase, showPaywall, unlockWithSubscription]);

  useEffect(() => {
    if (phase !== 'unlocked' || !unlockedCards?.length || unlockSource !== 'free') return;
    trackFreeReadingView(spreadId, 'free_unlock_api', true);
    if (!readingId || completionSentRef.current === readingId) return;
    completionSentRef.current = readingId;
    void oracleFreeApi.complete(readingId).then((result) => {
      clearOracleFreeIntent(readingId);
      setOracleIntent(null);
      if (oracleIntent) trackOracleFreeReadingCompleted(readingId, {
        free_reading_number: result.free_reading_number,
        remaining_free_readings: result.remaining_free_readings,
        deck_type: oracleIntent.deck_type, spread_type: oracleIntent.spread_type, need_type: oracleIntent.need_type,
      });
    }).catch(() => { completionSentRef.current = ''; });
  }, [phase, spreadId, unlockedCards, oracleIntent, unlockSource, readingId]);

  const onEmailUnlocked = async () => { /* retained for existing page callback compatibility */ };
  return { phase, unlockedCards, error, onEmailUnlocked, unlockSource, bundleRemaining: null };
}
