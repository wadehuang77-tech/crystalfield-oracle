import { useEffect, useMemo, useRef, useState } from 'react';
import { cardsApi, oracleFreeApi, profileApi, type UnlockedCard } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { trackCardDrawComplete, trackFreeReadingView, trackOracleFreeReadingCompleted, trackOraclePaywallViewed } from '../lib/ga4';
import { getOracleFreeIntent } from '../lib/oracleFreeAccess';
import { getSingleUnlockCount, hasSeenSingleEmailGate, incrementSingleUnlock, markSingleEmailGateSeen } from './useDrawCounter';

export type SingleGatePhase = 'idle' | 'loading' | 'unlocked' | 'email_gate' | 'membership_gate';

interface UseSingleCardGateOptions {
  spreadId: string;
  cardKey: string | null;
  reversed?: boolean;
  enabled: boolean; // true when card has been drawn and is visible
}

interface UseSingleCardGateResult {
  phase: SingleGatePhase;
  unlockedCard: UnlockedCard | null;
  error: string | null;
  onEmailUnlocked: (email: string, card?: UnlockedCard) => void;
  showMembership: boolean;
  setShowMembership: (v: boolean) => void;
}

export function useSingleCardGate({
  spreadId,
  cardKey,
  reversed = false,
  enabled,
}: UseSingleCardGateOptions): UseSingleCardGateResult {
  const { user } = useAuth();
  const [phase, setPhase] = useState<SingleGatePhase>('idle');
  const [unlockedCard, setUnlockedCard] = useState<UnlockedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMembership, setShowMembership] = useState(false);
  const firedRef = useRef(false);
  const lastCardKeyRef = useRef<string | null>(null);
  const userRef = useRef(user);
  const spreadIdRef = useRef(spreadId);
  const reversedRef = useRef(reversed);
  const completionSentRef = useRef(false);
  const paywallTrackedRef = useRef(false);
  const oracleIntent = useMemo(() => getOracleFreeIntent(spreadId), [spreadId]);
  userRef.current = user;
  spreadIdRef.current = spreadId;
  reversedRef.current = reversed;

  useEffect(() => {
    if (!enabled || !cardKey) { firedRef.current = false; return; }
    trackCardDrawComplete(spreadId, 1);
    if (lastCardKeyRef.current === cardKey && firedRef.current) return;
    lastCardKeyRef.current = cardKey;
    firedRef.current = true;

    const count = getSingleUnlockCount();
    const hasSeenEmailGate = hasSeenSingleEmailGate();

    const autoUnlock = () => {
      setPhase('loading');
      const readingId = oracleIntent?.access_mode === 'free' ? oracleIntent.reading_id : undefined;
      cardsApi.freeUnlockSingle(spreadIdRef.current, cardKey, reversedRef.current, readingId)
        .then(({ card }) => {
          setUnlockedCard(card);
          if (!oracleIntent) incrementSingleUnlock();
          setPhase('unlocked');
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : '解鎖失敗');
          if (oracleIntent) {
            setPhase('membership_gate'); setShowMembership(true);
          } else setPhase('email_gate');
        });
    };

    if (oracleIntent) {
      if (oracleIntent.access_mode === 'paywall_preview') {
        setPhase('membership_gate');
        setShowMembership(true);
        if (!paywallTrackedRef.current) {
          paywallTrackedRef.current = true;
          trackOraclePaywallViewed({
            reason: 'free_limit_reached', completed_free_readings: 2,
            deck_type: oracleIntent.deck_type,
            spread_type: oracleIntent.spread_type,
            need_type: oracleIntent.need_type,
          });
        }
      } else autoUnlock();
      return;
    }

    const continueForNonMember = () => {
      if (count === 2 && !hasSeenEmailGate) {
        markSingleEmailGateSeen(); setPhase('email_gate'); return;
      }
      autoUnlock();
    };

    if (userRef.current) {
      setPhase('loading');
      profileApi.me()
        .then(({ profile }) => {
          if (profile?.membership?.is_active || profile?.purchased_spreads?.includes('membership_monthly')) {
            autoUnlock();
            return;
          }
          continueForNonMember();
        })
        .catch(() => {
          continueForNonMember();
        });
      return;
    }

    continueForNonMember();
  }, [enabled, cardKey, spreadId, user?.id, oracleIntent]);

  useEffect(() => {
    if (phase === 'unlocked' && unlockedCard) {
      trackFreeReadingView(spreadId, 'free_unlock_api', Boolean(unlockedCard));
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
  }, [phase, spreadId, unlockedCard, oracleIntent]);

  const onEmailUnlocked = (_email: string, card?: UnlockedCard) => {
    if (card) {
      setUnlockedCard(card);
      incrementSingleUnlock();
      setPhase('unlocked');
    }
  };

  return { phase, unlockedCard, error, onEmailUnlocked, showMembership, setShowMembership };
}
