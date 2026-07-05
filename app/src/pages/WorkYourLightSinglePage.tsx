import { useEffect, useRef, useState } from 'react';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RotateCcw, Sparkles } from 'lucide-react';
import { cardsApi, type CardPreview, type UnlockedCard } from '../lib/api';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { ResonanceCTA } from '../components/ResonanceCTA';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';

interface DeepInterpretation {
  coreMeaning: string;
  higherSelfMessage: string;
  spiritualGuidance: string;
  energyQualities: string;
  suitableQuestions: string;
}

interface WorkYourLightGated {
  coreMeaning?: string;
  actionGuidance?: string | null;
  inquiryPrompt?: string | null;
  activationPrayer?: string | null;
  transmissionPrayer?: string | null;
  deepInterpretation?: DeepInterpretation | null;
}

function WorkYourLightSinglePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<CardPreview[] | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [drawnPreview, setDrawnPreview] = useState<CardPreview | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedCard | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const { showModal, handleClose } = useCrystalPromo(hasDrawn && revealed && !!drawnPreview);
  const { trackEvent } = useConversionTracking();

  usePageView('work_your_light_single');

  useEffect(() => {
    let cancelled = false;
    cardsApi.deckPreview('work_your_light')
      .then((res) => { if (!cancelled) setDeck(res.cards); })
      .catch((err) => { if (!cancelled) setDeckError(err instanceof Error ? err.message : '無法載入牌組'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!deck) return;
    const cardIdParam = searchParams.get('card');
    if (!cardIdParam) return;
    const found = deck.find((c) => c.card_key === cardIdParam);
    if (found) {
      setDrawnPreview(found);
      setHasDrawn(true);
      setRevealed(true);
    }
  }, [searchParams, deck]);

  useEffect(() => {
    if (revealed && hasDrawn) {
      window.scrollTo(0, 0);
    }
  }, [revealed, hasDrawn]);

  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  }, []);

  const drawCard = () => {
    if (!deck || deck.length === 0) return;
    setIsDrawing(true);
    setHasDrawn(false);
    setRevealed(false);

    if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
    drawTimerRef.current = setTimeout(() => {
      const pick = deck[Math.floor(Math.random() * deck.length)];
      setDrawnPreview(pick);
      setUnlocked(null);
      setIsDrawing(false);
      setHasDrawn(true);

      trackEvent('card_drawn', {
        cardName: pick.name_secondary ?? pick.name,
        readingType: 'work_your_light_single',
      });

      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => setRevealed(true), 300);
    }, 1500);
  };

  const resetDraw = () => {
    setDrawnPreview(null);
    setUnlocked(null);
    setHasDrawn(false);
    setRevealed(false);
    navigate('/work-your-light-single');
  };

  const handleUnlocked = (email: string, card?: UnlockedCard) => {
    if (!card) return;
    setUnlocked(card);
    trackEvent('unlocked', { readingType: 'work_your_light_single', email });
  };

  const isUnlocked = !!unlocked;
  const gated = unlocked?.gated as WorkYourLightGated | undefined;
  const deep = gated?.deepInterpretation;
  const previewSuit = (drawnPreview?.preview as { suit?: string } | undefined)?.suit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white relative overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6 py-12 min-h-screen">

        <header className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Sparkles className="w-20 h-20 text-violet-300 opacity-80" />
          </div>
          <h1 className="text-4xl md:text-6xl font-serif mb-4 tracking-wide text-violet-100 drop-shadow-lg">
            光之訊息塔羅 - 深度解說
          </h1>
          <p className="text-2xl md:text-3xl font-serif text-violet-200/90 mb-6">
            Work Your Light Oracle - Deep Interpretation
          </p>
          <p className="text-violet-200/70 text-lg md:text-xl font-light tracking-wider max-w-2xl mx-auto">
            單張牌陣 • 深度靈性解讀
          </p>
        </header>

        <div className="max-w-5xl mx-auto">
          {deckError && <p className="text-center text-red-500 mb-6">{deckError}</p>}

          {!hasDrawn && !isDrawing && (
            <>
              <div className="text-center mb-12">
                <button
                  onClick={drawCard}
                  disabled={!deck || deck.length === 0}
                  className="group relative px-12 py-6 bg-gradient-to-r from-violet-600 to-violet-600 hover:from-violet-500 hover:to-violet-500 rounded-2xl text-xl font-medium shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-violet-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <span className="relative text-violet-100 tracking-wide">{deck ? '抽取神聖訊息' : '載入牌組中…'}</span>
                </button>
                <p className="mt-6 text-violet-200/60 text-sm tracking-wider">
                  靜下心來,專注於你的問題,然後點擊按鈕
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-violet-500/20 rounded-2xl p-8 shadow-lg">
                <h3 className="text-violet-200 text-xl font-medium mb-4 tracking-wide">關於光之訊息單張牌陣</h3>
                <div className="space-y-4 text-violet-100/80 leading-relaxed">
                  <p>
                    光之訊息塔羅單張牌陣提供深度的靈性解讀,每張牌包含五個核心面向:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span><span><strong>核心含意</strong> - 這張牌的基本訊息與核心意涵</span></li>
                    <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span><span><strong>高我訊息</strong> - 來自你更高自我的智慧指引</span></li>
                    <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span><span><strong>靈性指引</strong> - 具體的修煉建議與行動方向</span></li>
                    <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span><span><strong>能量特質</strong> - 這張牌攜帶的能量頻率與作用</span></li>
                    <li className="flex items-start gap-2"><span className="text-violet-400 mt-1">•</span><span><strong>適合提問</strong> - 這張牌最能回應的問題類型</span></li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {isDrawing && <CardShuffleAnimation />}

          {hasDrawn && drawnPreview && revealed && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-2 border-violet-500/40 rounded-3xl p-8 md:p-12 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-violet-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-violet-100" />
                    </div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif text-violet-100 mb-2 tracking-wide">
                    {drawnPreview.name_secondary ?? drawnPreview.name}
                  </h2>
                  <p className="text-xl md:text-2xl text-violet-200/80 font-light mb-2">
                    {drawnPreview.name}
                  </p>
                  {previewSuit && (
                    <p className="text-violet-300/60 text-sm tracking-wider">
                      {previewSuit}
                    </p>
                  )}
                </div>

                {!isUnlocked && (
                  <>
                    <div className="bg-gradient-to-r from-violet-600/25 to-violet-600/25 rounded-xl p-6 border-2 border-violet-400/50">
                      <h3 className="text-violet-100 text-xl font-medium mb-4 tracking-wide flex items-center gap-2">
                        <span className="font-serif text-xl text-violet-400 mr-1 tracking-[0.1em]">一</span>
                        牌面核心訊息
                      </h3>

                      {drawnPreview.preview_excerpt && (
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-violet-400/30 relative">
                          <p className="text-violet-100/90 leading-relaxed">
                            {drawnPreview.preview_excerpt}
                          </p>
                          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-950/95 pointer-events-none rounded-b-lg"></div>
                        </div>
                      )}

                      <p className="text-violet-200/60 text-xs mt-3">前30%預覽，輸入 Email 解鎖完整解析</p>
                    </div>

                    <InlineEmailUnlock
                      onUnlocked={handleUnlocked}
                      readingType="work_your_light_single"
                      theme="dark"
                      cardUnlock={{
                        spread_id: 'work_your_light_single',
                        card_key: drawnPreview.card_key,
                      }}
                    />
                  </>
                )}

                {isUnlocked && (
                  <div className="space-y-6">
                    <div className="bg-slate-900/30 rounded-xl p-6 border border-violet-500/20">
                      <h3 className="text-violet-300 text-lg font-medium mb-3 tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 bg-slate-800/30 rounded-full"></span>
                        核心含意
                      </h3>
                      <p className="leading-relaxed text-violet-100/90">
                        {deep?.coreMeaning ?? gated?.coreMeaning ?? ''}
                      </p>
                    </div>

                    {deep?.higherSelfMessage && (
                      <div className="bg-slate-900/30 rounded-xl p-6 border border-violet-500/20">
                        <h3 className="text-violet-300 text-lg font-medium mb-3 tracking-wide flex items-center gap-2">
                          <span className="w-2 h-2 bg-slate-800/30 rounded-full"></span>
                          高我訊息
                        </h3>
                        <p className="leading-relaxed text-violet-100/90">{deep.higherSelfMessage}</p>
                      </div>
                    )}

                    {deep?.spiritualGuidance && (
                      <div className="bg-slate-900/30 rounded-xl p-6 border border-violet-500/20">
                        <h3 className="text-violet-300 text-lg font-medium mb-3 tracking-wide flex items-center gap-2">
                          <span className="w-2 h-2 bg-slate-800/30 rounded-full"></span>
                          靈性指引
                        </h3>
                        <p className="leading-relaxed text-violet-100/90">{deep.spiritualGuidance}</p>
                      </div>
                    )}

                    {deep?.energyQualities && (
                      <div className="bg-slate-900/30 rounded-xl p-6 border border-violet-500/20">
                        <h3 className="text-violet-300 text-lg font-medium mb-3 tracking-wide flex items-center gap-2">
                          <span className="w-2 h-2 bg-slate-800/30 rounded-full"></span>
                          能量特質
                        </h3>
                        <p className="leading-relaxed text-violet-100/90">{deep.energyQualities}</p>
                      </div>
                    )}

                    {deep?.suitableQuestions && (
                      <div className="bg-gradient-to-r from-violet-500/20 to-violet-500/20 rounded-xl p-6 border border-violet-400/30">
                        <h3 className="text-violet-200 text-lg font-medium mb-3 tracking-wide flex items-center gap-2">
                          <span className="w-2 h-2 bg-slate-800/30 rounded-full"></span>
                          適合提問
                        </h3>
                        <p className="leading-relaxed text-violet-100/90">{deep.suitableQuestions}</p>
                      </div>
                    )}

                    {gated?.actionGuidance && (
                      <div className="bg-slate-900/30 rounded-xl p-6 border border-violet-500/20">
                        <h3 className="text-violet-300 text-lg font-medium mb-3 tracking-wide flex items-center gap-2">
                          <span className="w-2 h-2 bg-slate-800/30 rounded-full"></span>
                          行動建議
                        </h3>
                        <p className="leading-relaxed text-violet-100/90">{gated.actionGuidance}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUnlocked && <ResonanceCTA />}
              {!isUnlocked && <TarotCourseCTA />}

              <div className="flex justify-center">
                <button
                  onClick={resetDraw}
                  className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-800/50 to-slate-800/50 hover:from-violet-600/60 hover:to-violet-600/60 border border-violet-500/30 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="tracking-wide">重新抽牌</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />
    </div>
  );
}

export default WorkYourLightSinglePage;
