import { useState, useEffect, useRef } from 'react';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPromptModal } from '../components/LoginPromptModal';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { CrystalReminderBar } from '../components/CrystalReminderBar';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { ResonanceCTA } from '../components/ResonanceCTA';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { useDeck, pickRandomCards, unlockSpreadCards } from '../hooks/useDeck';
import { useSpreadAccess } from '../hooks/useSpreadAccess';
import { type CardPreview, type UnlockedCard, checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { savePendingDraw, consumePendingDraw } from '../lib/pendingDraw';
import { formatPrice, getSpreadPrice } from '../lib/spread-prices';
import SocialLinksFooter from '../components/SocialLinksFooter';

interface DragonGated {
  message: string;
  guidance: string;
  energy: string;
}

interface ThreeSlot {
  preview: CardPreview;
  full: (DragonGated & { name: string; nameEn: string; keywords: string[] }) | null;
}

function DragonsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cards: deck, error: deckError } = useDeck('dragons');
  const [singlePreview, setSinglePreview] = useState<CardPreview | null>(null);
  const [singleUnlocked, setSingleUnlocked] = useState<UnlockedCard | null>(null);
  const [threeSlots, setThreeSlots] = useState<ThreeSlot[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [searchParams] = useSearchParams();
  const initialSpread: 'single' | 'three' | null =
    searchParams.get('spread') === 'three' ? 'three' :
    searchParams.get('spread') === 'single' ? 'single' : null;
  const [spreadType, setSpreadType] = useState<'single' | 'three' | null>(initialSpread);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showCardLayout, setShowCardLayout] = useState(initialSpread !== null);
  const [isThreeUnlocked, setIsThreeUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { showModal, showReminder, handleClose, handleReminderClose } = useCrystalPromo(hasDrawn && !isShuffling);
  const { trackEvent } = useConversionTracking();
  useSpreadAccess('dragons_three');

  usePageView('dragons_single');

  const handleSingleCardClick = () => {
    setSpreadType('single');
    setShowCardLayout(true);
  };

  const drawCard = () => {
    if (!deck || deck.length === 0) return;
    setIsShuffling(true);
    setHasDrawn(false);
    setThreeSlots([]);
    setSingleUnlocked(null);

    setTimeout(() => {
      const card = pickRandomCards(deck, 1)[0];
      setSinglePreview(card);
      setIsShuffling(false);
      setHasDrawn(true);
      trackEvent('card_drawn', { cardName: card.name, readingType: 'dragons_single' });
    }, 1500);
  };

  const handleSingleEmailSubmitted = (email: string, card?: UnlockedCard) => {
    if (!card) return;
    setSingleUnlocked(card);
    trackEvent('unlocked', {
      readingType: 'dragons_single',
      cardName: card.name,
      email,
    });
  };

  const drawThreeCards = () => {
    setSpreadType('three');
    setShowCardLayout(true);
  };

  const performThreeCardDraw = () => {
    if (!deck || deck.length === 0) return;
    setIsShuffling(true);
    setHasDrawn(false);
    setSinglePreview(null);
    setIsThreeUnlocked(false);
    setUnlockError(null);

    setTimeout(() => {
      const drawn = pickRandomCards(deck, 3);
      setThreeSlots(drawn.map((p) => ({ preview: p, full: null })));
      setIsShuffling(false);
      setHasDrawn(true);
    }, 1500);
  };

  const handleUnlockThree = async () => {
    if (!user) {
      const pendingPicks = threeSlots.map((s, i) => ({
        card_key: s.preview.card_key,
        position: i + 1,
      }));
      savePendingDraw('dragons_three', pendingPicks);
      setShowLoginPrompt(true);
      return;
    }
    if (isCheckingOut) return;
    setUnlockError(null);
    setIsCheckingOut(true);
    try {
      const checkoutPicks = threeSlots.map((s, i) => ({
        card_key: s.preview.card_key,
        position: i + 1,
      }));
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder('dragons_three', checkoutPicks);
      if (admin_unlocked) {
        navigate(`/checkout/return?order_id=${encodeURIComponent(order_id)}`);
        return;
      }
      if (!ecpay) {
        setUnlockError('結帳資料缺失,請重試');
        setIsCheckingOut(false);
        return;
      }
      submitToEcpay(ecpay, () => {
        setUnlockError('跳轉至綠界失敗 — 請確認瀏覽器未阻擋自動表單送出後重試');
        setIsCheckingOut(false);
      });
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : '結帳失敗,請稍後再試');
      setIsCheckingOut(false);
    }
  };

  const reset = () => {
    setSinglePreview(null);
    setSingleUnlocked(null);
    setThreeSlots([]);
    setHasDrawn(false);
    setIsShuffling(false);
    setSpreadType(null);
    setShowCardLayout(false);
    setIsThreeUnlocked(false);
    setUnlockError(null);
  };

  const handleBack = () => {
    if (showCardLayout || hasDrawn || isShuffling || singlePreview || threeSlots.length > 0) {
      reset();
      return;
    }
    navigate(-1);
  };

  useEffect(() => {
    if (hasDrawn) {
      window.scrollTo(0, 0);
    }
  }, [hasDrawn]);

  useEffect(() => {
    if (!deck || deck.length === 0) return;
    if (threeSlots.length > 0) return;
    if (searchParams.get('order_id')) return;
    const pending = consumePendingDraw('dragons_three');
    if (!pending) return;
    const slots = pending.picks
      .map((p) => deck.find((c) => c.card_key === p.card_key))
      .filter((c): c is CardPreview => !!c)
      .map((preview) => ({ preview, full: null as ThreeSlot['full'] }));
    if (slots.length !== pending.picks.length) return;
    setSpreadType('three');
    setShowCardLayout(true);
    setThreeSlots(slots);
    setHasDrawn(true);
  }, [deck, threeSlots.length]);

  const restoreStartedRef = useRef(false);
  useEffect(() => {
    if (restoreStartedRef.current) return;
    const orderId = searchParams.get('order_id');
    if (!orderId || !deck || deck.length === 0) return;
    restoreStartedRef.current = true;

    (async () => {
      try {
        const { order } = await checkoutApi.getOrder(orderId);
        if (order.item_id !== 'dragons_three' || order.status !== 'paid' || !order.picks) {
          setUnlockError('無法還原此訂單(item_id/status/picks 不符)');
          return;
        }
        const slots = order.picks
          .map((p) => deck.find((c) => c.card_key === p.card_key))
          .filter((c): c is CardPreview => !!c)
          .map((preview) => ({ preview, full: null as ThreeSlot['full'] }));
        if (slots.length !== order.picks.length) {
          setUnlockError('牌組對不上,無法還原');
          return;
        }
        setSpreadType('three');
        setShowCardLayout(true);
        setThreeSlots(slots);
        setHasDrawn(true);

        try {
          const picks = slots.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }));
          const unlocked = await unlockSpreadCards('dragons_three', picks, order.id);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          setThreeSlots((prev) => prev.map((s) => {
            const u = byKey.get(s.preview.card_key);
            if (!u) return s;
            const previewKw = (s.preview.preview as { keywords?: string[] }).keywords ?? [];
            return {
              ...s,
              full: {
                ...(u.gated as DragonGated),
                name: u.name,
                nameEn: u.name_secondary ?? '',
                keywords: previewKw,
              },
            };
          }));
          setIsThreeUnlocked(true);
        } catch (err) {
          setUnlockError(err instanceof Error ? err.message : '解鎖失敗,請稍後再試');
        }
      } catch (e) {
        setUnlockError(e instanceof Error ? `還原訂單失敗:${e.message}` : '還原訂單失敗');
      }
    })();
  }, [searchParams, deck]);

  const singleGated = singleUnlocked?.gated as DragonGated | undefined;
  const isSingleUnlocked = !!singleGated;
  const singlePreviewKw = (singlePreview?.preview as { keywords?: string[] })?.keywords ?? [];

  const showIndex = !singlePreview && !isShuffling && threeSlots.length === 0 && !showCardLayout;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white">
      <header className="relative z-10 border-b border-emerald-500/20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <button onClick={handleBack} className="inline-flex items-center gap-2 text-emerald-300 hover:text-emerald-200 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.4} />
            返　回
          </button>
          <span className="font-serif text-base text-emerald-100 tracking-[0.3em]">龍族塔羅</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
        {deckError && <p className="text-center text-red-500 mb-6 text-sm tracking-wide">{deckError}</p>}

        {showIndex && (
          <>
            <section className="text-center pb-12">
              <div className="flex justify-center text-emerald-500 mb-8">
                <DeckSigil />
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl text-emerald-100 tracking-[0.25em] sm:tracking-[0.4em] mb-5">龍族塔羅</h1>
              <p className="text-base sm:text-lg text-emerald-300/80 leading-loose tracking-wide max-w-md mx-auto">
                古老龍族的智慧與火焰。<br />
                召喚轉化與突破的勇氣。
              </p>
            </section>

            <section className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <h2 className="text-2xl sm:text-3xl font-serif text-emerald-100 mb-4 sm:mb-6 text-center">召喚龍族的指引</h2>
                <p className="text-emerald-200/70 mb-8 leading-relaxed text-sm sm:text-base text-center">
                  閉上眼睛，深呼吸三次。<br />
                  感受龍族強大的能量環繞著你，賦予你力量與勇氣。<br />
                  當你準備好時，選擇你的牌陣方式。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
                  <button
                    onClick={handleSingleCardClick}
                    disabled={!deck}
                    className="group relative w-full flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative h-full min-h-[8rem] sm:min-h-[9rem] px-6 py-5 sm:py-6 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:from-emerald-500 group-hover:to-teal-500 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                      <h3 className="text-xl sm:text-2xl font-serif text-white text-center tracking-wide flex flex-col items-center leading-relaxed">
                        <span>單張神諭</span>
                        <span className="text-sm sm:text-base opacity-90">召喚龍族訊息</span>
                        <span className="text-xs sm:text-sm opacity-80 mt-1 tracking-[0.3em]">免　費</span>
                      </h3>
                    </div>
                  </button>
                  <button
                    onClick={drawThreeCards}
                    disabled={!deck}
                    className="group relative w-full flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative h-full min-h-[8rem] sm:min-h-[9rem] px-6 py-5 sm:py-6 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:from-emerald-500 group-hover:to-teal-500 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                      <h3 className="text-lg sm:text-xl font-serif text-white text-center tracking-wide flex flex-col items-center leading-relaxed">
                        <span>三張牌陣</span>
                        <span className="text-sm sm:text-base opacity-90">過去・現在・未來</span>
                        <span className="text-xs sm:text-sm opacity-80 mt-1">{formatPrice(getSpreadPrice('dragons_three') ?? 0)}</span>
                      </h3>
                    </div>
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {showCardLayout && !isShuffling && !hasDrawn && spreadType === 'single' && (
          <DrawPrep onDraw={drawCard} onCancel={reset} disabled={!deck} hint="閉上眼睛,感受龍族的能量" />
        )}

        {showCardLayout && !isShuffling && !hasDrawn && spreadType === 'three' && (
          <section className="max-w-2xl mx-auto text-center py-8">
            <h2 className="font-serif text-3xl text-emerald-100 tracking-[0.3em] mb-5">三 張 牌 陣</h2>
            <p className="text-sm sm:text-base text-emerald-300/85 mb-12 leading-loose">
              龍族將引領你看見過去、現在與未來的智慧連結
            </p>
            <div className="flex justify-center mb-12 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-24 sm:w-32">
                  <div className="tarot-card-back">
                    <div className="text-emerald-500 opacity-70 scale-75"><CardBackOrnament /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={performThreeCardDraw} disabled={!deck} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                抽　牌
              </button>
              <button onClick={reset} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-emerald-500/30 rounded-xl hover:bg-slate-700/60 hover:border-emerald-400/50 transition-all text-emerald-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                返　回
              </button>
            </div>
          </section>
        )}

        {isShuffling && <CardShuffleAnimation message="龍　族　火　焰　翻　湧　中" />}

        {threeSlots.length > 0 && hasDrawn && (
          <section className="max-w-3xl mx-auto space-y-10">
            <div className="text-center">
              <h2 className="font-serif text-3xl text-emerald-100 tracking-[0.3em] mb-3">過 　 現 　 未</h2>
              <p className="text-sm text-emerald-300/80">龍族為你揭示時間之流的智慧</p>
            </div>

            {!isThreeUnlocked && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {threeSlots.map((slot, index) => {
                    const titles = ['過去', '現在', '未來'];
                    const previewKw = (slot.preview.preview as { keywords?: string[] }).keywords ?? [];
                    return (
                      <div key={index} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-6 shadow-xl !p-5">
                        <p className="text-emerald-200 text-sm tracking-[0.4em] uppercase text-center mb-3">{titles[index]}</p>
                        <h3 className="deck-name text-xl text-emerald-100 text-center mb-1">{slot.preview.name}</h3>
                        {slot.preview.name_secondary && (
                          <p className="text-xs tracking-[0.2em] text-emerald-400/80 text-center mb-3">{slot.preview.name_secondary}</p>
                        )}
                        {previewKw.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                            {previewKw.slice(0, 3).map((keyword, i) => (
                              <span key={i} className="px-2 py-0.5 border border-emerald-500/40 text-[0.65rem] tracking-wider text-emerald-200">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                        {slot.preview.preview_excerpt && (
                          <div className="relative mt-2 pt-3 border-t border-emerald-500/15">
                            <p className="text-emerald-100/85 text-xs leading-loose whitespace-pre-line">
                              {slot.preview.preview_excerpt}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none" />
                          </div>
                        )}
                        <p className="mt-2 text-[0.65rem] text-emerald-400/70 tracking-wide text-center">
                          前 30% 預覽
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-6 shadow-xl text-center space-y-5">
                  <Lock className="w-10 h-10 text-emerald-500 mx-auto" strokeWidth={1.2} />
                  <h3 className="font-serif text-2xl text-emerald-100 tracking-[0.3em]">解鎖完整龍族訊息</h3>
                  <p className="text-sm text-emerald-300/85 leading-loose max-w-md mx-auto">
                    展開三張牌的完整解讀,揭示過去、現在、未來的能量脈絡。
                  </p>
                  <p className="font-serif text-2xl text-emerald-200 tracking-[0.3em]">{formatPrice(getSpreadPrice('dragons_three') ?? 0)}</p>
                  {unlockError && <p className="text-red-500 text-sm">{unlockError}</p>}
                  <button onClick={handleUnlockThree} disabled={isCheckingOut} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isCheckingOut ? '跳　轉　至　綠　界…' : '立　即　解　鎖'}
                  </button>
                </div>
              </>
            )}

            {isThreeUnlocked && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {threeSlots.map((slot, index) => {
                    if (!slot.full) return null;
                    const titles = ['過去', '現在', '未來'];
                    return (
                      <div key={index} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-6 shadow-xl !p-5">
                        <p className="text-emerald-200 text-sm tracking-[0.4em] uppercase text-center mb-3">{titles[index]}</p>
                        <h3 className="deck-name text-lg text-emerald-100 text-center mb-1">{slot.full.name}</h3>
                        {slot.full.nameEn && (
                          <p className="text-xs tracking-[0.2em] text-emerald-400/80 text-center mb-4">{slot.full.nameEn}</p>
                        )}
                        <div className="space-y-4 pt-4 border-t border-emerald-500/15">
                          <ThreeSection title="龍族訊息">{slot.full.message}</ThreeSection>
                          <ThreeSection title="行動指引">{slot.full.guidance}</ThreeSection>
                          <ThreeSection title="能量頻率">{slot.full.energy}</ThreeSection>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <ResonanceCTA />
              </>
            )}

            <TarotCourseCTA />

            <div className="flex justify-center pt-4">
              <button onClick={reset} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-emerald-500/30 rounded-xl hover:bg-slate-700/60 hover:border-emerald-400/50 transition-all text-emerald-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                重　新　抽　牌
              </button>
            </div>
          </section>
        )}

        {singlePreview && hasDrawn && (
          <section className="max-w-3xl mx-auto space-y-10">
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-6 shadow-xl">
              <div className="text-center pb-8 border-b border-emerald-500/15">
                <div className="flex justify-center text-emerald-500 mb-6">
                  <DeckSigil />
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl text-emerald-100 mb-3 tracking-[0.25em]">
                  {singlePreview.name}
                </h2>
                {singlePreview.name_secondary && (
                  <p className="text-sm tracking-[0.32em] text-emerald-400/80">{singlePreview.name_secondary}</p>
                )}
                {singlePreviewKw.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6">
                    {singlePreviewKw.map((keyword, idx) => (
                      <span key={idx} className="px-3 py-1 border border-emerald-500/40 text-xs tracking-[0.2em] text-emerald-200">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-8 space-y-8">
                {!isSingleUnlocked && (
                  <>
                    <div>
                      <h3 className="text-emerald-200 text-sm tracking-[0.4em] uppercase mb-4">牌 面 訊 息</h3>
                      {singlePreview.preview_excerpt && (
                        <div className="relative">
                          <p className="text-emerald-100/90 leading-loose whitespace-pre-line">{singlePreview.preview_excerpt}</p>
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none" />
                        </div>
                      )}
                      <p className="mt-4 text-xs text-emerald-400/70 tracking-wide">
                        前 30% 預覽 — 留下 Email 解鎖完整解析
                      </p>
                    </div>
                    <InlineEmailUnlock
                      onUnlocked={handleSingleEmailSubmitted}
                      readingType="dragons_single"
                      theme="dark"
                      cardUnlock={{ spread_id: 'dragons_single', card_key: singlePreview.card_key }}
                    />
                  </>
                )}

                {isSingleUnlocked && singleGated && (
                  <>
                    <Section title="龍族訊息">{singleGated.message}</Section>
                    <Section title="行動指引">{singleGated.guidance}</Section>
                    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-6 shadow-xl border-l-2 border-l-emerald-500/70">
                      <h3 className="text-emerald-200 text-sm tracking-[0.4em] uppercase mb-3">能 量 建 議</h3>
                      <p className="text-emerald-100/90 leading-loose whitespace-pre-line">{singleGated.energy}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isSingleUnlocked ? <ResonanceCTA /> : <TarotCourseCTA />}

            <div className="flex justify-center">
              <button onClick={reset} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-emerald-500/30 rounded-xl hover:bg-slate-700/60 hover:border-emerald-400/50 transition-all text-emerald-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                重　新　抽　牌
              </button>
            </div>
          </section>
        )}

        <SocialLinksFooter />
      </div>

      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        redirectTo={`/dragons?spread=${spreadType ?? 'three'}`}
      />
      <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />
      <CrystalReminderBar isVisible={showReminder} onClose={handleReminderClose} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ArrowRight className="w-3 h-3 text-emerald-500" strokeWidth={1.6} />
        <h3 className="text-emerald-200 text-sm tracking-[0.4em] uppercase">{title}</h3>
      </div>
      <p className="text-emerald-100/90 leading-loose whitespace-pre-line pl-6">{children}</p>
    </div>
  );
}

function ThreeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs text-emerald-400/85 mb-1.5 tracking-[0.18em] font-semibold">{title}</h4>
      <p className="text-xs text-emerald-200/85 leading-loose">{children}</p>
    </div>
  );
}

function SpreadChoice({
  onClick, sigil, title, body, cta, disabled, price,
}: {
  onClick: () => void; sigil: React.ReactNode; title: string;
  body: string; cta: string; disabled?: boolean; price?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl group text-left transition-all duration-300 hover:border-emerald-500/70 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed min-h-[15rem] sm:min-h-[18rem]"
    >
      <div className="flex flex-col items-center text-center h-full">
        <div className="text-emerald-500 mb-4 sm:mb-6 transition-transform duration-500 group-hover:rotate-12 scale-90 sm:scale-100">
          {sigil}
        </div>
        <h2 className="font-serif text-xl sm:text-2xl text-emerald-100 tracking-[0.25em] sm:tracking-[0.3em] mb-2 sm:mb-3">{title}</h2>
        <p className={`text-xs sm:text-sm text-emerald-300/80 leading-loose max-w-xs ${price !== undefined ? 'mb-2 sm:mb-3' : 'mb-6 sm:mb-8'}`}>{body}</p>
        {price !== undefined && (
          <p className="font-serif text-sm sm:text-base text-emerald-300 tracking-[0.2em] sm:tracking-[0.25em] mb-6 sm:mb-8">NT$ {price}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-2 px-5 py-2 border border-emerald-500/50 bg-emerald-500/10 rounded-lg text-xs tracking-[0.35em] sm:tracking-[0.4em] text-emerald-200 transition-all duration-300 group-hover:bg-emerald-500/25 group-hover:border-emerald-400/70 group-hover:translate-x-1">
          {cta}
          <ArrowRight className="w-4 h-4" strokeWidth={1.4} />
        </span>
      </div>
    </button>
  );
}

function DrawPrep({ onDraw, onCancel, disabled, hint }: { onDraw: () => void; onCancel: () => void; disabled: boolean; hint: string }) {
  return (
    <section className="max-w-2xl mx-auto text-center py-8">
      <h2 className="font-serif text-3xl text-emerald-100 tracking-[0.3em] mb-5">準　備　抽　牌</h2>
      <p className="text-sm sm:text-base text-emerald-300/85 mb-12 leading-loose">{hint}</p>
      <div className="flex justify-center mb-12">
        <div className="w-44 sm:w-56">
          <div className="tarot-card-back">
            <div className="text-emerald-500 opacity-70"><CardBackOrnament /></div>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button onClick={onDraw} disabled={disabled} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          抽　牌
        </button>
        <button onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-emerald-500/30 rounded-xl hover:bg-slate-700/60 hover:border-emerald-400/50 transition-all text-emerald-200">
          <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
          返　回
        </button>
      </div>
    </section>
  );
}

function DeckSigil() {
  return (
    <svg viewBox="-30 -30 60 60" className="w-20 h-20 sm:w-24 sm:h-24" stroke="currentColor" fill="none">
      <circle r="27" strokeWidth="0.7" />
      <circle r="22" strokeWidth="0.4" opacity="0.5" strokeDasharray="0.4 1.5" />
      <path d="M 0 16 C -10 8, -10 -2, -3 -10 C -3 -2, 3 -2, 4 -10 C 11 -4, 11 8, 0 16 Z" strokeWidth="1" fill="currentColor" fillOpacity="0.22" />
    </svg>
  );
}

function SingleSpreadSigil() {
  return (
    <svg viewBox="-30 -40 60 80" className="w-12 h-16" stroke="currentColor" fill="none">
      <rect x="-12" y="-20" width="24" height="40" strokeWidth="1" />
      <rect x="-9" y="-17" width="18" height="34" strokeWidth="0.4" opacity="0.5" />
      <circle cx="0" cy="0" r="5" strokeWidth="0.8" />
    </svg>
  );
}

function TripleSpreadSigil() {
  return (
    <svg viewBox="-40 -40 80 80" className="w-16 h-16" stroke="currentColor" fill="none">
      {[-22, 0, 22].map((x) => (
        <g key={x}>
          <rect x={x - 9} y={-15} width="18" height="30" strokeWidth="1" />
          <rect x={x - 7} y={-13} width="14" height="26" strokeWidth="0.4" opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}

function CardBackOrnament() {
  return (
    <svg viewBox="-30 -30 60 60" className="w-20 h-20" stroke="currentColor" fill="none">
      <circle r="22" strokeWidth="0.5" strokeDasharray="0.4 2" opacity="0.6" />
      <path d="M 0 16 C -10 8, -10 -2, -3 -10 C -3 -2, 3 -2, 4 -10 C 11 -4, 11 8, 0 16 Z" strokeWidth="1" />
      <circle r="2" fill="currentColor" />
    </svg>
  );
}

export default DragonsPage;
