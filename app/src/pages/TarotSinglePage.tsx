import { useEffect, useRef, useState } from 'react';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Sparkles } from 'lucide-react';
import { cardsApi, type CardPreview, type UnlockedCard } from '../lib/api';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { MembershipGate } from '../components/MembershipGate';
import { ResonanceCTA } from '../components/ResonanceCTA';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';
import { useSingleCardGate } from '../hooks/useSingleCardGate';
import { consumePendingSingleDraw } from '../lib/pendingDraw';

interface TarotPreview {
  keywords: string[];
  arcana?: string;
  number?: number;
}

interface TarotGated {
  uprightMeaning: string;
  reversedMeaning: string;
  detailedInterpretation?: {
    coreKeywords: {
      upright: string[];
      reversed: string[];
      uprightExplanation: string;
      reversedExplanation: string;
    };
    energyFlow: { direction: string; type: string; description: string };
    timing: { speed: string; description: string };
    advice: { upright: string; reversed: string };
    chakra: { primary: string; issue: string; healingNote: string };
    soulMessage: { upright: string; reversed: string };
  };
}

interface DrawnCard {
  preview: CardPreview;
  isReversed: boolean;
  unlocked: UnlockedCard | null;
}

function TarotSinglePage() {
  const navigate = useNavigate();
  const [deck, setDeck] = useState<CardPreview[] | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [drawnCard, setDrawnCard] = useState<DrawnCard | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { showModal, handleClose } = useCrystalPromo(hasDrawn && revealed);
  const { trackEvent } = useConversionTracking();

  usePageView('tarot_single');

  useEffect(() => {
    let cancelled = false;
    cardsApi.deckPreview('tarot')
      .then((res) => { if (!cancelled) setDeck(res.cards); })
      .catch((err) => { if (!cancelled) setDeckError(err instanceof Error ? err.message : '無法載入牌組'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!deck || drawnCard) return;
    const pending = consumePendingSingleDraw('tarot_single');
    if (!pending) return;
    const preview = deck.find((c) => c.card_key === pending.card_key);
    if (!preview) return;
    setDrawnCard({ preview, isReversed: !!pending.reversed, unlocked: null });
    setHasDrawn(true);
    setRevealed(true);
  }, [deck, drawnCard]);

  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
  }, []);

  const drawCard = () => {
    if (!deck || deck.length === 0) return;

    setIsDrawing(true);
    setHasDrawn(false);
    setRevealed(false);

    if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
    drawTimerRef.current = setTimeout(() => {
      const idx = Math.floor(Math.random() * deck.length);
      const isReversed = Math.random() > 0.5;
      const card: DrawnCard = { preview: deck[idx], isReversed, unlocked: null };
      setDrawnCard(card);
      setIsDrawing(false);
      setHasDrawn(true);

      trackEvent('card_drawn', {
        cardName: card.preview.name_secondary ?? card.preview.name,
        isReversed,
        readingType: 'tarot_single',
      });
    }, 1500);
  };

  useEffect(() => {
    if (hasDrawn && drawnCard) {
      const t = setTimeout(() => setRevealed(true), 300);
      return () => clearTimeout(t);
    }
  }, [hasDrawn, drawnCard]);

  useEffect(() => {
    if (revealed) {
      window.scrollTo(0, 0);
    }
  }, [revealed]);

  const reset = () => {
    setDrawnCard(null);
    setHasDrawn(false);
    setRevealed(false);
  };

  const gate = useSingleCardGate({
    spreadId: 'tarot_single',
    cardKey: drawnCard?.preview.card_key ?? null,
    reversed: drawnCard?.isReversed,
    enabled: !!(hasDrawn && revealed && drawnCard && !drawnCard.unlocked),
  });

  useEffect(() => {
    if (gate.unlockedCard && drawnCard && !drawnCard.unlocked) {
      setDrawnCard(prev => prev ? { ...prev, unlocked: gate.unlockedCard } : null);
    }
  }, [gate.unlockedCard]);

  const handleUnlocked = (email: string, card?: UnlockedCard) => {
    gate.onEmailUnlocked(email, card);
    if (card) trackEvent('unlocked', { readingType: 'tarot_single', email });
  };

  const formatInterpretation = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim());
    return lines.map((line, idx) => {
      if (line.includes('【') && line.includes('】')) {
        return (
          <div key={idx} className="mt-6 first:mt-0">
            <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-orange-600">✦</span>
              {line}
            </h4>
          </div>
        );
      }
      return (
        <p key={idx} className="text-gray-700 leading-relaxed mb-3">{line}</p>
      );
    });
  };

  const previewData = drawnCard?.preview.preview as TarotPreview | undefined;
  const gated = drawnCard?.unlocked?.gated as TarotGated | undefined;
  const isUnlocked = !!gated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950 to-slate-900 text-white">
      <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />


      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
        {hasDrawn && (
          <div className="flex justify-end mb-6">
            <button onClick={reset} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-orange-500/30 rounded-xl hover:bg-slate-700/60 hover:border-orange-400/50 transition-all text-orange-200 !text-xs">
              <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
              重新抽牌
            </button>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl sm:text-5xl text-orange-100 tracking-[0.25em] sm:tracking-[0.4em] mb-5">
            偉特塔羅
          </h1>
          <p className="text-base sm:text-lg text-orange-300/80 leading-loose tracking-wide max-w-md mx-auto">
            靜心冥想你的問題，<br />
            讓牌卡為你指引方向。
          </p>
        </div>

        {deckError && (
          <div className="text-center text-red-600 mb-6">{deckError}</div>
        )}

        {!hasDrawn && !isDrawing && (
          <div className="text-center">
            <button
              onClick={drawCard}
              disabled={!deck || deck.length === 0}
              className="group relative px-12 py-6 bg-gradient-to-r from-orange-600 via-slate-600 to-orange-600 text-orange-100 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 animate-pulse" />
                {deck ? '抽取你的牌卡' : '載入牌組中…'}
                <Sparkles className="w-6 h-6 animate-pulse" />
              </span>
            </button>
          </div>
        )}

        {isDrawing && <CardShuffleAnimation />}

        {hasDrawn && drawnCard && (
          <div className={`transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2 text-gray-800">
                    {drawnCard.preview.name_secondary ?? drawnCard.preview.name}
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    {drawnCard.preview.name}
                  </p>

                  <div className={`inline-block px-6 py-2 rounded-full text-sm font-bold ${
                    drawnCard.isReversed
                      ? 'bg-slate-800 text-slate-950'
                      : 'bg-slate-800 text-slate-950'
                  }`}>
                    {drawnCard.isReversed ? '逆位 ⭣' : '正位 ⭡'}
                  </div>
                </div>

                <div className="prose prose-lg max-w-none">
                  <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/10 rounded-2xl p-6 mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">🔮</span>
                      核心關鍵字
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(previewData?.keywords ?? []).map((keyword, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-slate-800 text-slate-950 rounded-full text-sm font-medium"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">✨</span>
                      牌義解讀
                    </h3>

                    {!isUnlocked && (
                      <>
                        {gate.phase === 'loading' && (
                          <div className="text-center text-orange-300/70 py-6 tracking-wider">解鎖中…</div>
                        )}
                        {gate.phase === 'email_gate' && (
                          <>
                            {(() => {
                              const excerpt = drawnCard.isReversed
                                ? drawnCard.preview.reversed_excerpt
                                : drawnCard.preview.upright_excerpt;
                              if (!excerpt) return null;
                              return (
                                <div className="mb-4">
                                  <div className="relative bg-slate-800 border border-orange-300 rounded-xl p-6 overflow-hidden">
                                    <p className="text-slate-950 leading-relaxed">{excerpt}</p>
                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-orange-500/10 pointer-events-none"></div>
                                  </div>
                                  <p className="text-slate-500 text-xs mt-2">前30%預覽，輸入 Email 解鎖完整解析</p>
                                </div>
                              );
                            })()}
                            <InlineEmailUnlock
                              onUnlocked={handleUnlocked}
                              readingType="tarot_single"
                              theme="light"
                              cardUnlock={{
                                spread_id: 'tarot_single',
                                card_key: drawnCard.preview.card_key,
                                reversed: drawnCard.isReversed,
                              }}
                              cardData={{
                                cardName: drawnCard.preview.name_secondary,
                                cardNameChinese: drawnCard.preview.name,
                                isReversed: drawnCard.isReversed,
                              }}
                            />
                          </>
                        )}
                        <MembershipGate
                          isOpen={gate.showMembership}
                          onClose={() => gate.setShowMembership(false)}
                          resumePath="/tarot-single"
                          pendingSingleDraw={drawnCard ? {
                            spread_id: 'tarot_single',
                            card_key: drawnCard.preview.card_key,
                            reversed: drawnCard.isReversed,
                          } : undefined}
                        />
                      </>
                    )}

                    {isUnlocked && gated && (
                      <div className="pt-2">
                        <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/10 rounded-xl p-4 mb-4">
                          <p className="text-sm font-medium text-slate-900 mb-2">
                            ✨ 完整解析已解鎖
                          </p>
                        </div>
                        <div className="text-gray-700 leading-relaxed">
                          {formatInterpretation(
                            drawnCard.isReversed ? gated.reversedMeaning : gated.uprightMeaning,
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {isUnlocked && gated?.detailedInterpretation && (
                    <>
                      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <span className="text-xl">💫</span>
                          核心關鍵字詳解
                        </h3>
                        <div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(drawnCard.isReversed
                              ? gated.detailedInterpretation.coreKeywords.reversed
                              : gated.detailedInterpretation.coreKeywords.upright
                            ).map((keyword, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-slate-800 text-slate-900 rounded-full text-sm font-medium"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                          <p className="text-gray-700 leading-relaxed">
                            {drawnCard.isReversed
                              ? gated.detailedInterpretation.coreKeywords.reversedExplanation
                              : gated.detailedInterpretation.coreKeywords.uprightExplanation}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-slate-800 rounded-2xl p-6">
                          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="text-xl">🌊</span>
                            能量流動
                          </h3>
                          <div className="space-y-2 text-gray-700">
                            <p><strong>方向：</strong>{gated.detailedInterpretation.energyFlow.direction}</p>
                            <p><strong>類型：</strong>{gated.detailedInterpretation.energyFlow.type}</p>
                            <p className="leading-relaxed">{gated.detailedInterpretation.energyFlow.description}</p>
                          </div>
                        </div>

                        <div className="bg-slate-800 rounded-2xl p-6">
                          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="text-xl">⏰</span>
                            時機
                          </h3>
                          <div className="space-y-2 text-gray-700">
                            <p><strong>速度：</strong>{gated.detailedInterpretation.timing.speed}</p>
                            <p className="leading-relaxed">{gated.detailedInterpretation.timing.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/10 rounded-2xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <span className="text-xl">💡</span>
                          建議
                        </h3>
                        <p className="text-gray-700 leading-relaxed">
                          {drawnCard.isReversed
                            ? gated.detailedInterpretation.advice.reversed
                            : gated.detailedInterpretation.advice.upright}
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/10 rounded-2xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <span className="text-xl">🧘</span>
                          脈輪與療癒
                        </h3>
                        <div className="space-y-3 text-gray-700">
                          <p><strong>主要脈輪：</strong>{gated.detailedInterpretation.chakra.primary}</p>
                          <p><strong>相關議題：</strong>{gated.detailedInterpretation.chakra.issue}</p>
                          <p className="leading-relaxed bg-slate-800/50 p-4 rounded-lg">
                            <strong>療癒建議：</strong>{gated.detailedInterpretation.chakra.healingNote}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-orange-100 to-orange-100 rounded-2xl p-6 mb-6 border-2 border-orange-300">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <span className="text-xl">🌟</span>
                          靈魂訊息
                        </h3>
                        <p className="text-gray-700 leading-relaxed text-lg italic">
                          {drawnCard.isReversed
                            ? gated.detailedInterpretation.soulMessage.reversed
                            : gated.detailedInterpretation.soulMessage.upright}
                        </p>
                      </div>
                    </>
                  )}

                  {isUnlocked && <ResonanceCTA />}
                </div>
              </div>

              {!isUnlocked && <TarotCourseCTA />}

              <div className="text-center">
                <button
                  onClick={reset}
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-600 text-orange-100 text-lg font-bold rounded-xl shadow-xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    重新抽牌
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TarotSinglePage;
