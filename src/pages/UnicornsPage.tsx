import { useState, useEffect, useRef } from 'react';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Lock, RotateCcw, Search, X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPromptModal } from '../components/LoginPromptModal';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { ResonanceCTA } from '../components/ResonanceCTA';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';
import { PaywallModal } from '../components/PaywallModal';
import { PaywallGate } from '../components/PaywallGate';
import { useSpreadAccess } from '../hooks/useSpreadAccess';
import { useDeck, pickRandomCards, unlockSpreadCards } from '../hooks/useDeck';
import { type CardPreview, type UnlockedCard, checkoutApi } from '../lib/api';
import { consumePendingDraw } from '../lib/pendingDraw';
import { formatPrice, getSpreadPrice } from '../lib/spread-prices';
import SocialLinksFooter from '../components/SocialLinksFooter';

const SPREAD_ID = 'unicorns_three';

interface UnicornGated {
  point1: string; point2: string; point3: string;
  point4: string; point5: string; point6: string; point7: string;
}

interface DrawnSlot {
  preview: CardPreview;
  unlocked: UnlockedCard | null;
}

const POINTS_LABELS: [keyof UnicornGated, string][] = [
  ['point1', '牌卡象徵'],
  ['point2', '核心訊息'],
  ['point3', '能量頻率'],
  ['point4', '生命課題'],
  ['point5', '實踐指引'],
  ['point6', '療癒建議'],
  ['point7', '靈性成長'],
];

export default function UnicornsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cards: deck, error: deckError } = useDeck('unicorns');
  const [searchParams] = useSearchParams();
  const initialSpread: 'single' | 'three' = searchParams.get('spread') === 'three' ? 'three' : 'single';
  const autoLayout = searchParams.get('spread') === 'three';
  const [searchTerm, setSearchTerm] = useState('');
  const [showDrawPage, setShowDrawPage] = useState(true);
  const [drawnCards, setDrawnCards] = useState<DrawnSlot[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [spreadType, setSpreadType] = useState<'single' | 'three'>(initialSpread);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showCardLayout, setShowCardLayout] = useState(autoLayout);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [librarySelectedCard, setLibrarySelectedCard] = useState<CardPreview | null>(null);
  const [libraryUnlocked, setLibraryUnlocked] = useState<UnlockedCard | null>(null);
  const hasDrawn = drawnCards.length > 0;
  const { showModal, handleClose } = useCrystalPromo(hasDrawn && !isDrawing);
  const { trackEvent } = useConversionTracking();
  useSpreadAccess(SPREAD_ID);

  usePageView('unicorns_single');

  const filteredCards = (deck ?? []).filter((card) => {
    const previewKw = (card.preview as { keywords?: string[] }).keywords ?? [];
    return (
      (card.name_secondary ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.name.includes(searchTerm) ||
      previewKw.some((k) => k.includes(searchTerm))
    );
  });

  const handleSpreadTypeChange = (type: 'single' | 'three') => {
    setSpreadType(type);
    setShowCardLayout(true);
  };

  const handleMockUnlock = async () => {
    if (!user) { setShowLoginPrompt(true); return; }
    setUnlockError(null);
  };

  const drawSingleCard = () => {
    if (!deck || deck.length === 0) return;
    setIsDrawing(true);
    setTimeout(() => {
      const drawn = pickRandomCards(deck, 1);
      setDrawnCards(drawn.map((p) => ({ preview: p, unlocked: null })));
      setIsDrawing(false);
      trackEvent('card_drawn', {
        cardName: drawn[0]?.name,
        readingType: 'unicorns_single',
      });
    }, 600);
  };

  const performThreeCardDraw = () => {
    if (!deck || deck.length === 0) return;
    setIsDrawing(true);
    setIsLocallyUnlocked(false);
    setTimeout(() => {
      const drawn = pickRandomCards(deck, 3);
      setDrawnCards(drawn.map((p) => ({ preview: p, unlocked: null })));
      setIsDrawing(false);
    }, 600);
  };

  const resetDraw = () => {
    setDrawnCards([]);
    setSpreadType('single');
    setShowCardLayout(false);
    setIsLocallyUnlocked(false);
    setUnlockError(null);
  };

  const handleDrawHeaderBack = () => {
    if (showCardLayout || drawnCards.length > 0 || isDrawing) {
      resetDraw();
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
    if (drawnCards.length > 0) return;
    if (searchParams.get('order_id')) return;
    const pending = consumePendingDraw(SPREAD_ID);
    if (!pending) return;
    const slots: DrawnSlot[] = pending.picks
      .map((p) => deck.find((c) => c.card_key === p.card_key))
      .filter((c): c is CardPreview => !!c)
      .map((preview) => ({ preview, unlocked: null }));
    if (slots.length !== pending.picks.length) return;
    setSpreadType('three');
    setShowDrawPage(true);
    setShowCardLayout(true);
    setDrawnCards(slots);
  }, [deck, drawnCards.length]);

  const [restoreState, setRestoreState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [restoreReason, setRestoreReason] = useState<string | null>(null);
  const restoreStartedRef = useRef(false);
  useEffect(() => {
    if (restoreStartedRef.current) return;
    const orderId = searchParams.get('order_id');
    if (!orderId || !deck || deck.length === 0) return;
    restoreStartedRef.current = true;
    setRestoreState('pending');

    (async () => {
      try {
        const { order } = await checkoutApi.getOrder(orderId);
        if (order.item_id !== SPREAD_ID) {
          setRestoreReason(`此訂單是 ${order.item_id},不是 ${SPREAD_ID}`);
          setRestoreState('error');
          return;
        }
        if (order.status !== 'paid') {
          setRestoreReason(`訂單狀態為 ${order.status},非 paid`);
          setRestoreState('error');
          return;
        }
        if (!order.picks) {
          setRestoreReason('訂單沒有 picks 資料');
          setRestoreState('error');
          return;
        }
        const slots: DrawnSlot[] = order.picks
          .map((p) => deck.find((c) => c.card_key === p.card_key))
          .filter((c): c is CardPreview => !!c)
          .map((preview) => ({ preview, unlocked: null }));
        if (slots.length !== order.picks.length) {
          setRestoreReason(`牌組對不上:訂單 ${order.picks.length} 張,但只在牌組找到 ${slots.length} 張`);
          setRestoreState('error');
          return;
        }
        setSpreadType('three');
        setShowDrawPage(true);
        setShowCardLayout(true);
        setDrawnCards(slots);

        try {
          const picks = slots.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }));
          const unlocked = await unlockSpreadCards(SPREAD_ID, picks, order.id);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          setDrawnCards((prev) => prev.map((s) => ({
            ...s,
            unlocked: byKey.get(s.preview.card_key) ?? null,
          })));
          setIsLocallyUnlocked(true);
        } catch (err) {
          setUnlockError(err instanceof Error ? err.message : '解鎖失敗,請稍後再試');
        }
        setRestoreState('done');
      } catch (e) {
        setRestoreReason(e instanceof Error ? `getOrder 失敗:${e.message}` : '未知錯誤');
        setRestoreState('error');
      }
    })();
  }, [searchParams, deck]);

  const handleSingleEmailSubmitted = (email: string, card?: UnlockedCard) => {
    if (!card) return;
    setDrawnCards([{ preview: drawnCards[0].preview, unlocked: card }]);
    trackEvent('unlocked', { email, cardName: card.name, readingType: 'unicorns_single' });
  };

  const handleLibraryEmailSubmitted = (_email: string, card?: UnlockedCard) => {
    if (!card) return;
    setLibraryUnlocked(card);
  };

  if (showDrawPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-900 text-white">
        <header className="relative z-10 border-b border-pink-500/20">
          <div className="max-w-[1100px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
            <button onClick={handleDrawHeaderBack} className="inline-flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.4} />
              返　回
            </button>
            <span className="font-serif text-base text-pink-100 tracking-[0.3em]">獨角獸塔羅</span>
          </div>
        </header>

        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
          <section className="text-center pb-12">
            <div className="flex justify-center text-pink-500 mb-8">
              <DeckSigil />
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl text-pink-100 tracking-[0.25em] sm:tracking-[0.4em] mb-5">獨角獸塔羅</h1>
            <p className="text-base text-pink-300/80 leading-loose tracking-wide max-w-md mx-auto mb-8">
              純淨能量,神聖之光。<br />
              一張牌,即是一道魔法的指引。
            </p>
            <button onClick={() => setShowDrawPage(false)} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-pink-500/30 rounded-xl hover:bg-slate-700/60 hover:border-pink-400/50 transition-all text-pink-200">
              <BookOpen className="w-4 h-4" strokeWidth={1.4} />
              查　看　所　有　牌
            </button>
          </section>

          {deckError && <p className="text-center text-red-500 mb-6 text-sm tracking-wide">{deckError}</p>}

          {searchParams.get('order_id') && restoreState === 'pending' && drawnCards.length === 0 && (
            <div className="max-w-md mx-auto bg-slate-800/60 border-2 border-pink-500/30 rounded-2xl p-6 mb-6 text-center">
              <p className="text-pink-200 tracking-wide">正在還原你的牌陣...</p>
            </div>
          )}

          {searchParams.get('order_id') && restoreState === 'error' && drawnCards.length === 0 && (
            <div className="max-w-2xl mx-auto bg-red-900/20 border-2 border-red-500/40 rounded-2xl p-6 mb-6 text-center">
              <p className="text-red-200 tracking-wide mb-2">無法還原此訂單的牌陣</p>
              <p className="text-red-300/70 text-xs tracking-wide leading-relaxed">
                order_id: <span className="font-mono">{searchParams.get('order_id')}</span>
                <br />
                {restoreReason ?? '未知原因'}
              </p>
            </div>
          )}

          {drawnCards.length === 0 && !showCardLayout && !isDrawing && (
            <section className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-fuchsia-900/60 to-rose-900/60 backdrop-blur-sm border-2 border-fuchsia-400/30 rounded-2xl shadow-2xl p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-fuchsia-100 mb-3 text-center">靜心抽牌</h2>
                <p className="text-fuchsia-200/80 text-center mb-8 text-sm sm:text-base">靜心片刻，專注於你的問題，讓獨角獸的智慧指引你</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
                  <button
                    onClick={() => handleSpreadTypeChange('single')}
                    disabled={!deck}
                    className="group relative w-full flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-400 to-rose-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative h-full min-h-[8rem] sm:min-h-[9rem] px-6 py-5 sm:py-6 bg-gradient-to-r from-fuchsia-600 to-rose-600 group-hover:from-fuchsia-500 group-hover:to-rose-500 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                      <h3 className="text-xl sm:text-2xl font-serif text-white text-center tracking-wide flex flex-col items-center leading-relaxed">
                        <span>單張神諭</span>
                        <span className="text-sm sm:text-base opacity-90">今日的靈性指引</span>
                        <span className="text-xs sm:text-sm opacity-80 mt-1 tracking-[0.3em]">免　費</span>
                      </h3>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSpreadTypeChange('three')}
                    disabled={!deck}
                    className="group relative w-full flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-400 to-rose-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative h-full min-h-[8rem] sm:min-h-[9rem] px-6 py-5 sm:py-6 bg-gradient-to-r from-fuchsia-600 to-rose-600 group-hover:from-fuchsia-500 group-hover:to-rose-500 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                      <h3 className="text-lg sm:text-xl font-serif text-white text-center tracking-wide flex flex-col items-center leading-relaxed">
                        <span>三張牌陣</span>
                        <span className="text-sm sm:text-base opacity-90">過去・現在・未來</span>
                        <span className="text-xs sm:text-sm opacity-80 mt-1">{formatPrice(getSpreadPrice('unicorns_three') ?? 0)}</span>
                      </h3>
                    </div>
                  </button>
                </div>
              </div>
            </section>
          )}

          {showCardLayout && drawnCards.length === 0 && !isDrawing && spreadType === 'single' && (
            <DrawPrep onDraw={drawSingleCard} onCancel={resetDraw} disabled={!deck} />
          )}

          {showCardLayout && drawnCards.length === 0 && !isDrawing && spreadType === 'three' && (
            <section className="max-w-2xl mx-auto text-center py-8">
              <h2 className="font-serif text-3xl text-pink-100 tracking-[0.3em] mb-5">三 張 牌 陣</h2>
              <p className="text-sm text-pink-300/85 leading-loose mb-12">
                獨角獸將引領你看見過去、現在與未來的魔法連結
              </p>
              <div className="flex justify-center mb-12 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-24 sm:w-32">
                    <div className="tarot-card-back">
                      <div className="text-pink-500 opacity-70 scale-75"><CardBackOrnament /></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={performThreeCardDraw} disabled={!deck} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium rounded-xl shadow-lg hover:shadow-pink-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  抽　牌
                </button>
                <button onClick={resetDraw} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-pink-500/30 rounded-xl hover:bg-slate-700/60 hover:border-pink-400/50 transition-all text-pink-200">
                  <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                  返　回
                </button>
              </div>
            </section>
          )}

          {isDrawing && <CardShuffleAnimation />}

          {drawnCards.length > 0 && (
            <section className="max-w-3xl mx-auto space-y-10">
              <div className="text-center">
                <h2 className="font-serif text-3xl text-pink-100 tracking-[0.3em] mb-5">
                  {spreadType === 'three' ? '三 張 牌 陣 指 引' : '此 刻 指 引'}
                </h2>
                <button onClick={resetDraw} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-pink-500/30 rounded-xl hover:bg-slate-700/60 hover:border-pink-400/50 transition-all text-pink-200">
                  <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                  重　新　抽　牌
                </button>
              </div>

              {spreadType === 'three' && drawnCards.length === 3 && (
                <>
                  {unlockError && (
                    <div className="border border-red-500/45 bg-red-500/10 px-4 py-3 mb-5 text-sm text-pink-100 tracking-wide text-center">
                      {unlockError}
                    </div>
                  )}
                  <PaywallGate
                    spreadName="獨角獸三張牌陣"
                    spreadId="unicorns_three"
                    onUnlock={handleMockUnlock}
                    isPaid={isLocallyUnlocked}
                    picks={drawnCards.map((s, i) => ({
                      card_key: s.preview.card_key,
                      position: i + 1,
                    }))}
                    previewContent={
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                          {drawnCards.map((slot, index) => {
                            const positions = ['過去', '現在', '未來'];
                            const previewKw = (slot.preview.preview as { keywords?: string[] }).keywords ?? [];
                            return (
                              <div key={slot.preview.id} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-pink-500/30 rounded-2xl p-6 shadow-xl !p-5">
                                <p className="text-pink-200 text-sm tracking-[0.4em] uppercase text-center mb-3">{positions[index]}</p>
                                <h3 className="deck-name text-xl text-pink-100 text-center mb-1">{slot.preview.name}</h3>
                                <p className="text-xs text-pink-400/80 text-center tracking-wider mb-3">{slot.preview.name_secondary}</p>
                                {previewKw.length > 0 && (
                                  <div className="flex flex-wrap gap-1 justify-center mb-3">
                                    {previewKw.slice(0, 3).map((keyword, idx) => (
                                      <span key={idx} className="px-2 py-0.5 border border-pink-500/40 text-[0.65rem] tracking-wider text-pink-200">
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {slot.preview.preview_excerpt && (
                                  <div className="relative mt-2 pt-3 border-t border-pink-500/15">
                                    <p className="text-pink-100/85 text-xs leading-loose whitespace-pre-line">
                                      {slot.preview.preview_excerpt}
                                    </p>
                                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none" />
                                  </div>
                                )}
                                <p className="mt-2 text-[0.65rem] text-pink-400/70 tracking-wide text-center">
                                  前 30% 預覽
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        {unlockError && <p className="text-center text-red-500 text-sm">{unlockError}</p>}
                      </div>
                    }
                    fullContent={
                      isLocallyUnlocked && drawnCards.every((s) => s.unlocked) ? (
                        <div className="space-y-6">
                          {drawnCards.map((slot, index) => {
                            const labels = ['過去的能量根源', '當下的能量焦點', '未來的能量趨勢'];
                            const sym = ['過', '現', '未'][index];
                            const g = (slot.unlocked!.gated as UnicornGated);
                            return (
                              <div key={slot.preview.id} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-pink-500/30 rounded-2xl p-6 shadow-xl">
                                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-pink-500/15">
                                  <div className="chapter-glyph text-3xl">{sym}</div>
                                  <h3 className="deck-name text-xl text-pink-100">{labels[index]} — {slot.preview.name}</h3>
                                </div>
                                <div className="space-y-4">
                                  {POINTS_LABELS.slice(0, 5).map(([k, label]) => (
                                    <div key={k}>
                                      <h4 className="text-pink-200 text-sm tracking-[0.4em] uppercase mb-2">{label}</h4>
                                      <p className="text-sm text-pink-200/85 leading-loose">{g[k]}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                            {drawnCards.map((slot, index) => {
                              const positions = ['過去', '現在', '未來'];
                              return (
                                <div key={slot.preview.id} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-pink-500/30 rounded-2xl p-6 shadow-xl !p-5">
                                  <p className="text-pink-200 text-sm tracking-[0.4em] uppercase text-center mb-3">{positions[index]}</p>
                                  <h3 className="deck-name text-xl text-pink-100 text-center mb-1">{slot.preview.name}</h3>
                                  <p className="text-xs text-pink-400/80 text-center tracking-wider mb-4">{slot.preview.name_secondary}</p>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-center gap-3 py-6 text-pink-300 text-sm tracking-wide">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            正在為你載入完整解讀…
                          </div>
                        </div>
                      )
                    }
                  />
                  </>
              )}

              {spreadType === 'single' && drawnCards.map((slot) => {
                const previewKw = (slot.preview.preview as { keywords?: string[] }).keywords ?? [];
                const g = slot.unlocked?.gated as UnicornGated | undefined;
                const isUnlocked = !!g;
                return (
                  <div key={slot.preview.id} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-pink-500/30 rounded-2xl p-6 shadow-xl">
                    <div className="text-center pb-8 border-b border-pink-500/15">
                      <div className="flex justify-center text-pink-500 mb-6">
                        <DeckSigil />
                      </div>
                      <h3 className="font-serif text-3xl sm:text-4xl text-pink-100 mb-3 tracking-[0.25em]">
                        {slot.preview.name}
                      </h3>
                      {slot.preview.name_secondary && (
                        <p className="text-sm tracking-[0.32em] text-pink-400/80">
                          {slot.preview.name_secondary}
                        </p>
                      )}
                      {previewKw.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6">
                          {previewKw.map((keyword, idx) => (
                            <span key={idx} className="px-3 py-1 border border-pink-500/40 text-xs tracking-[0.2em] text-pink-200">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-8 space-y-8">
                      {!isUnlocked && (
                        <>
                          <div>
                            <h3 className="text-pink-200 text-sm tracking-[0.4em] uppercase mb-4">牌 面 訊 息</h3>
                            {slot.preview.preview_excerpt && (
                              <div className="relative">
                                <p className="text-pink-100/90 leading-loose whitespace-pre-line">{slot.preview.preview_excerpt}</p>
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none" />
                              </div>
                            )}
                            <p className="mt-4 text-xs text-pink-400/70 tracking-wide">
                              前 30% 預覽 — 留下 Email 解鎖完整解析
                            </p>
                          </div>
                          <InlineEmailUnlock
                            onUnlocked={handleSingleEmailSubmitted}
                            readingType="unicorns_single"
                            theme="dark"
                            cardUnlock={{ spread_id: 'unicorns_single', card_key: slot.preview.card_key }}
                          />
                        </>
                      )}

                      {isUnlocked && g && (
                        <div className="space-y-6">
                          {POINTS_LABELS.map(([k, label]) => (
                            <Section key={k} title={label}>{g[k]}</Section>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {spreadType === 'single' && drawnCards.some((s) => s.unlocked) ? <ResonanceCTA /> : <TarotCourseCTA />}
            </section>
          )}

          <SocialLinksFooter />
        </div>

        <LoginPromptModal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} redirectTo="/unicorns" />
        <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          spreadName="獨角獸三張牌陣"
          spreadType={SPREAD_ID}
        />
      </div>
    );
  }

  const libraryGated = libraryUnlocked?.gated as UnicornGated | undefined;
  const librarySelectedKw = librarySelectedCard
    ? ((librarySelectedCard.preview as { keywords?: string[] }).keywords ?? [])
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950 to-slate-900 text-white">
      <header className="relative z-10 border-b border-pink-500/20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.4} />
            返　回
          </button>
          <span className="font-serif text-base text-pink-100 tracking-[0.3em]">獨角獸塔羅</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <section className="text-center pb-10">
          <div className="flex justify-center text-pink-500 mb-8">
            <DeckSigil />
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-pink-100 tracking-[0.25em] sm:tracking-[0.4em] mb-5">牌 卡 名 簿</h1>
          <p className="text-base text-pink-300/80 leading-loose tracking-wide max-w-md mx-auto mb-8">
            44 張獨角獸神諭卡。<br />
            點選任一張,展開完整訊息。
          </p>
          <button onClick={() => setShowDrawPage(true)} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-pink-500/30 rounded-xl hover:bg-slate-700/60 hover:border-pink-400/50 transition-all text-pink-200">
            <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
            返　回　抽　牌
          </button>
        </section>

        <div className="max-w-md mx-auto mb-12 relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" strokeWidth={1.4} />
          <input
            type="text"
            placeholder="搜　尋　牌　卡"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border-2 border-pink-500/30 rounded-lg text-pink-100 placeholder-pink-400/50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-colors pl-7 text-center"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
          {filteredCards.map((card) => {
            const previewKw = (card.preview as { keywords?: string[] }).keywords ?? [];
            return (
              <button
                key={card.id}
                onClick={() => { setLibrarySelectedCard(card); setLibraryUnlocked(null); }}
                className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-pink-500/30 rounded-2xl p-6 shadow-xl !p-5 text-left transition-all duration-300 hover:border-pink-500/70 hover:-translate-y-1"
              >
                <h3 className="deck-name text-lg text-pink-100 mb-1">{card.name}</h3>
                {card.name_secondary && (
                  <p className="text-xs tracking-[0.2em] text-pink-400/80 mb-4">{card.name_secondary}</p>
                )}
                <p className="text-xs text-pink-400/70 mb-3 tracking-wide">點 擊 展 開</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewKw.slice(0, 3).map((keyword, idx) => (
                    <span key={idx} className="px-2 py-0.5 border border-pink-500/30 text-[0.65rem] tracking-wider text-pink-200/85">
                      {keyword}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {librarySelectedCard && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => { setLibrarySelectedCard(null); setLibraryUnlocked(null); }}
          >
            <div
              className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-pink-500/50 rounded-2xl shadow-2xl max-w-md w-full p-8 !max-w-2xl !p-0"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: '90vh' }}
            >
              <div className="relative px-8 pt-8 pb-6 border-b border-pink-500/15">
                <button
                  onClick={() => { setLibrarySelectedCard(null); setLibraryUnlocked(null); }}
                  className="absolute top-4 right-4 text-pink-300/60 hover:text-pink-400 transition-colors z-10"
                  aria-label="關閉"
                >
                  <X className="w-5 h-5" strokeWidth={1.4} />
                </button>
                <h2 className="font-serif text-3xl text-pink-100 tracking-[0.25em]">{librarySelectedCard.name}</h2>
                {librarySelectedCard.name_secondary && (
                  <p className="text-sm tracking-[0.32em] text-pink-400/80 mt-2">{librarySelectedCard.name_secondary}</p>
                )}
              </div>

              <div className="px-8 py-6 space-y-6">
                {!libraryGated && (
                  <>
                    <div>
                      <h3 className="text-pink-200 text-sm tracking-[0.4em] uppercase mb-3">關 鍵 字</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {librarySelectedKw.map((keyword, idx) => (
                          <span key={idx} className="px-3 py-1 border border-pink-500/40 text-xs tracking-[0.18em] text-pink-200">
                            {keyword}
                          </span>
                        ))}
                      </div>
                      {librarySelectedCard.preview_excerpt && (
                        <div className="relative">
                          <p className="text-pink-100/90 leading-loose whitespace-pre-line !text-sm">{librarySelectedCard.preview_excerpt}</p>
                          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none" />
                        </div>
                      )}
                      <p className="mt-3 text-xs text-pink-400/70 tracking-wide">
                        前 30% 預覽 — 留下 Email 解鎖完整解析
                      </p>
                    </div>
                    <InlineEmailUnlock
                      onUnlocked={handleLibraryEmailSubmitted}
                      readingType="unicorns_single"
                      theme="dark"
                      cardUnlock={{ spread_id: 'unicorns_single', card_key: librarySelectedCard.card_key }}
                    />
                  </>
                )}

                {libraryGated && (
                  <div className="space-y-5">
                    {POINTS_LABELS.map(([k, label]) => (
                      <Section key={k} title={label}>{libraryGated[k]}</Section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <SocialLinksFooter />
      </div>

      <LoginPromptModal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
      <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        spreadName="獨角獸三張牌陣"
        spreadType={SPREAD_ID}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <ArrowRight className="w-3 h-3 text-pink-500" strokeWidth={1.6} />
        <h4 className="text-pink-200 text-sm tracking-[0.4em] uppercase">{title}</h4>
      </div>
      <p className="text-pink-100/90 leading-loose whitespace-pre-line pl-6">{children}</p>
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
      className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-pink-500/30 rounded-2xl p-5 sm:p-6 shadow-xl group text-left transition-all duration-300 hover:border-pink-500/70 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed min-h-[15rem] sm:min-h-[18rem]"
    >
      <div className="flex flex-col items-center text-center h-full">
        <div className="text-pink-500 mb-4 sm:mb-6 transition-transform duration-500 group-hover:rotate-12 scale-90 sm:scale-100">
          {sigil}
        </div>
        <h2 className="font-serif text-xl sm:text-2xl text-pink-100 tracking-[0.25em] sm:tracking-[0.3em] mb-2 sm:mb-3">{title}</h2>
        <p className={`text-xs sm:text-sm text-pink-300/80 leading-loose max-w-xs ${price !== undefined ? 'mb-2 sm:mb-3' : 'mb-6 sm:mb-8'}`}>{body}</p>
        {price !== undefined && (
          <p className="font-serif text-sm sm:text-base text-pink-300 tracking-[0.2em] sm:tracking-[0.25em] mb-6 sm:mb-8">NT$ {price}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-2 px-5 py-2 border border-pink-500/50 bg-pink-500/10 rounded-lg text-xs tracking-[0.35em] sm:tracking-[0.4em] text-pink-200 transition-all duration-300 group-hover:bg-pink-500/25 group-hover:border-pink-400/70 group-hover:translate-x-1">
          {cta}
          <ArrowRight className="w-4 h-4" strokeWidth={1.4} />
        </span>
      </div>
    </button>
  );
}

function DrawPrep({ onDraw, onCancel, disabled }: { onDraw: () => void; onCancel: () => void; disabled: boolean }) {
  return (
    <section className="max-w-2xl mx-auto text-center py-8">
      <h2 className="font-serif text-3xl text-pink-100 tracking-[0.3em] mb-5">準　備　抽　牌</h2>
      <p className="text-sm sm:text-base text-pink-300/85 mb-12 leading-loose">
        閉上眼睛,感受獨角獸的魔法能量,當你準備好時點擊下方按鈕
      </p>
      <div className="flex justify-center mb-12">
        <div className="w-44 sm:w-56">
          <div className="tarot-card-back">
            <div className="text-pink-500 opacity-70"><CardBackOrnament /></div>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button onClick={onDraw} disabled={disabled} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium rounded-xl shadow-lg hover:shadow-pink-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          抽　牌
        </button>
        <button onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-pink-500/30 rounded-xl hover:bg-slate-700/60 hover:border-pink-400/50 transition-all text-pink-200">
          <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
          返　回
        </button>
      </div>
    </section>
  );
}

function ShufflingState() {
  return (
    <section className="text-center py-24">
      <div className="relative inline-block">
        <div className="absolute inset-0 -m-12 bg-slate-800/15 blur-3xl rounded-full animate-pulse" />
        <div className="relative text-pink-500 animate-spin" style={{ animationDuration: '2.5s' }}>
          <ShuffleSigil />
        </div>
      </div>
      <p className="font-serif text-xl sm:text-2xl text-pink-100 mt-10 tracking-[0.4em] animate-pulse">
        獨 角 獸 為 你 選 牌 中
      </p>
    </section>
  );
}

function DeckSigil() {
  return (
    <svg viewBox="-30 -30 60 60" className="w-20 h-20 sm:w-24 sm:h-24" stroke="currentColor" fill="none">
      <circle r="27" strokeWidth="0.7" />
      <circle r="22" strokeWidth="0.4" opacity="0.5" strokeDasharray="0.4 1.5" />
      <path d="M 0 -16 L 4.7 -4.9 L 16.5 -4.9 L 7 2 L 10.5 13.4 L 0 6 L -10.5 13.4 L -7 2 L -16.5 -4.9 L -4.7 -4.9 Z" strokeWidth="0.9" />
      <circle r="1.2" fill="currentColor" />
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
      <path d="M 0 -16 L 4.7 -4.9 L 16.5 -4.9 L 7 2 L 10.5 13.4 L 0 6 L -10.5 13.4 L -7 2 L -16.5 -4.9 L -4.7 -4.9 Z" strokeWidth="0.8" />
      <circle r="1.2" fill="currentColor" />
    </svg>
  );
}

function ShuffleSigil() {
  return (
    <svg viewBox="-40 -40 80 80" className="w-20 h-20 sm:w-24 sm:h-24" stroke="currentColor" fill="none">
      <circle r="36" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.6" />
      <circle r="28" strokeWidth="0.7" />
      <path d="M 0 -22 L 6 -6 L 0 0 L -6 -6 Z" fill="currentColor" fillOpacity="0.4" />
      <path d="M 22 0 L 6 6 L 0 0 L 6 -6 Z" fill="currentColor" fillOpacity="0.4" />
      <path d="M 0 22 L -6 6 L 0 0 L 6 6 Z" fill="currentColor" fillOpacity="0.25" />
      <path d="M -22 0 L -6 -6 L 0 0 L -6 6 Z" fill="currentColor" fillOpacity="0.25" />
      <circle r="2" fill="currentColor" />
    </svg>
  );
}
