import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bundleApi, cardsApi, oracleFreeApi, type UnlockedCard } from '../lib/api';
import { trackCardDrawComplete, trackFreeReadingView, trackOracleFreeReadingCompleted, trackOraclePaywallViewed } from '../lib/ga4';
import { clearOracleFreeIntent, getOracleFreeIntent } from '../lib/oracleFreeAccess';
import { useAuth } from '../contexts/AuthContext';
import { getSpreadCategory } from '../lib/spread-prices';

export type MultiGatePhase = 'idle' | 'loading' | 'unlocked' | 'login_gate' | 'paywall';
interface Pick { card_key: string; position: number; reversed?: boolean; }
interface UseMultiSpreadGateOptions { spreadId: string; picks: Pick[] | null; enabled: boolean; }
interface UseMultiSpreadGateResult {
  phase: MultiGatePhase;
  unlockedCards: UnlockedCard[] | null;
  error: string | null;
  onEmailUnlocked: (email: string) => Promise<void>;
  unlockSource: 'free' | 'bundle' | null;
  bundleRemaining: number | null;
}

export function useMultiSpreadGate({ spreadId, picks, enabled }: UseMultiSpreadGateOptions): UseMultiSpreadGateResult {
  const { user } = useAuth();
  const [phase, setPhase] = useState<MultiGatePhase>('idle');
  const [unlockedCards, setUnlockedCards] = useState<UnlockedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockSource, setUnlockSource] = useState<'free' | 'bundle' | null>(null);
  const [bundleRemaining, setBundleRemaining] = useState<number | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const attemptRef = useRef('');
  const identityRef = useRef('');
  const completionSentRef = useRef('');
  const paywallTrackedRef = useRef(false);
  const [oracleIntent, setOracleIntent] = useState(() => getOracleFreeIntent(spreadId));
  const category = useMemo(() => getSpreadCategory(spreadId), [spreadId]);

  useEffect(() => { setOracleIntent(getOracleFreeIntent(spreadId)); }, [spreadId]);

  const unlockWithBundle = useCallback(async (picksToUnlock: Pick[], picksKey: string): Promise<boolean> => {
    if (!user || !category) return false;
    const creditResult = await bundleApi.getCredits();
    if (!creditResult.credits || creditResult.credits[category] <= 0) return false;
    const storageKey = `cf_bundle_reading:${spreadId}:${picksKey}`;
    let bundleReadingId = '';
    try { bundleReadingId = sessionStorage.getItem(storageKey) ?? ''; } catch { /* unavailable */ }
    if (!bundleReadingId) {
      bundleReadingId = crypto.randomUUID();
      try { sessionStorage.setItem(storageKey, bundleReadingId); } catch { /* unavailable */ }
    }
    const result = await bundleApi.unlockSpread(spreadId, picksToUnlock, bundleReadingId);
    setUnlockedCards(result.cards);
    setBundleRemaining(result.remaining);
    setUnlockSource('bundle');
    setPhase('unlocked');
    return true;
  }, [user, category, spreadId]);

  const showPaywallOrUseBundle = useCallback(async (picksToUnlock: Pick[], picksKey: string) => {
    if (user && category) {
      setPhase('loading');
      try { if (await unlockWithBundle(picksToUnlock, picksKey)) return; }
      catch (err) {
        const apiError = err as Error & { status?: number };
        if (apiError.status !== 402) setError(apiError.message || '套票解鎖失敗');
      }
    }
    setPhase('paywall');
    if (oracleIntent && !paywallTrackedRef.current) {
      paywallTrackedRef.current = true;
      trackOraclePaywallViewed({
        reason: 'free_limit_reached', completed_free_readings: 2,
        deck_type: oracleIntent.deck_type, spread_type: oracleIntent.spread_type, need_type: oracleIntent.need_type,
      });
    }
  }, [user, category, unlockWithBundle, oracleIntent]);

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
    setBundleRemaining(null);

    const run = async () => {
      setPhase('loading');
      setError(null);
      if (oracleIntent?.access_mode === 'paywall_preview') { await showPaywallOrUseBundle(picks, picksKey); return; }
      try {
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
        if (apiError.body?.code === 'FREE_GLOBAL_LIMIT_REACHED') { await showPaywallOrUseBundle(picks, picksKey); return; }
        setError(apiError.message || '解鎖失敗');
        setPhase('paywall');
      }
    };
    void run();
  }, [enabled, picks, spreadId, user?.id, oracleIntent, phase, showPaywallOrUseBundle]);

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
  return { phase, unlockedCards, error, onEmailUnlocked, unlockSource, bundleRemaining };
}
