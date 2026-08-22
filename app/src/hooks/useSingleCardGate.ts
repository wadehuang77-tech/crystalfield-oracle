import { useEffect, useRef, useState } from 'react';
import { cardsApi, oracleFreeApi, profileApi, type UnlockedCard } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { trackCardDrawComplete, trackFreeReadingView, trackOracleFreeReadingCompleted, trackOraclePaywallViewed } from '../lib/ga4';
import { clearOracleFreeIntent, getOracleFreeIntent } from '../lib/oracleFreeAccess';

export type SingleGatePhase = 'idle' | 'loading' | 'unlocked' | 'login_gate' | 'membership_gate';

interface UseSingleCardGateOptions { spreadId: string; cardKey: string | null; reversed?: boolean; enabled: boolean; }
interface UseSingleCardGateResult {
  phase: SingleGatePhase;
  unlockedCard: UnlockedCard | null;
  error: string | null;
  onEmailUnlocked: (email: string, card?: UnlockedCard) => void;
  showMembership: boolean;
  setShowMembership: (v: boolean) => void;
}

export function useSingleCardGate({ spreadId, cardKey, reversed = false, enabled }: UseSingleCardGateOptions): UseSingleCardGateResult {
  const { user } = useAuth();
  const [phase, setPhase] = useState<SingleGatePhase>('idle');
  const [unlockedCard, setUnlockedCard] = useState<UnlockedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMembership, setShowMembership] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const attemptRef = useRef('');
  const identityRef = useRef('');
  const completionSentRef = useRef('');
  const paywallTrackedRef = useRef(false);
  const [oracleIntent, setOracleIntent] = useState(() => getOracleFreeIntent(spreadId));

  useEffect(() => { setOracleIntent(getOracleFreeIntent(spreadId)); }, [spreadId]);

  useEffect(() => {
    if (!enabled || !cardKey) return;
    const identity = `${spreadId}:${cardKey}:${reversed ? 1 : 0}`;
    if (identityRef.current && identityRef.current !== identity) {
      identityRef.current = identity;
      attemptRef.current = '';
      completionSentRef.current = '';
      setUnlockedCard(null);
      setReadingId(null);
      setPhase('idle');
      setOracleIntent(getOracleFreeIntent(spreadId));
      return;
    }
    identityRef.current = identity;
    if (phase === 'unlocked') return;
    trackCardDrawComplete(spreadId, 1);
    const attemptKey = `${spreadId}:${cardKey}:${user?.id ?? 'anonymous'}:${oracleIntent?.reading_id ?? 'direct'}`;
    if (attemptRef.current === attemptKey) return;
    attemptRef.current = attemptKey;

    const showPaywall = () => {
      setPhase('membership_gate');
      setShowMembership(true);
      if (oracleIntent && !paywallTrackedRef.current) {
        paywallTrackedRef.current = true;
        trackOraclePaywallViewed({
          reason: 'free_limit_reached', completed_free_readings: 2,
          deck_type: oracleIntent.deck_type, spread_type: oracleIntent.spread_type, need_type: oracleIntent.need_type,
        });
      }
    };

    const run = async () => {
      setPhase('loading');
      setError(null);
      try {
        if (user) {
          const { profile } = await profileApi.me().catch(() => ({ profile: null }));
          if (profile?.membership?.is_active || profile?.purchased_spreads?.includes('membership_monthly')) {
            const { card } = await cardsApi.freeUnlockSingle(spreadId, cardKey, reversed);
            setUnlockedCard(card);
            setPhase('unlocked');
            return;
          }
        }
        if (oracleIntent?.access_mode === 'paywall_preview') { showPaywall(); return; }
        const activeReadingId = oracleIntent?.access_mode === 'free'
          ? oracleIntent.reading_id!
          : (await oracleFreeApi.start(spreadId)).reading_id;
        const { card } = await cardsApi.freeUnlockSingle(spreadId, cardKey, reversed, activeReadingId);
        setReadingId(activeReadingId);
        setUnlockedCard(card);
        setPhase('unlocked');
      } catch (err) {
        const apiError = err as Error & { status?: number; body?: { code?: string } };
        if (apiError.status === 401 && apiError.body?.code === 'TAROT_LOGIN_REQUIRED') { setPhase('login_gate'); return; }
        if (apiError.body?.code === 'FREE_GLOBAL_LIMIT_REACHED') { showPaywall(); return; }
        setError(apiError.message || '解鎖失敗');
        setPhase('membership_gate');
        setShowMembership(true);
      }
    };
    void run();
  }, [enabled, cardKey, reversed, spreadId, user, oracleIntent, phase]);

  useEffect(() => {
    if (phase !== 'unlocked' || !unlockedCard) return;
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
  }, [phase, spreadId, unlockedCard, readingId, oracleIntent]);

  const onEmailUnlocked = (_email: string, card?: UnlockedCard) => { if (card) setUnlockedCard(card); };
  return { phase, unlockedCard, error, onEmailUnlocked, showMembership, setShowMembership };
}
