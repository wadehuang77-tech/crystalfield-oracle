import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { MembershipGate } from '../components/MembershipGate';
import { ResonanceCTA } from '../components/ResonanceCTA';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';
import { useDeck, pickRandomCards } from '../hooks/useDeck';
import { useSingleCardGate } from '../hooks/useSingleCardGate';
import { formatPrice, getSpreadPrice } from '../lib/spread-prices';
import { type CardPreview, type UnlockedCard } from '../lib/api';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { consumePendingSingleDraw } from '../lib/pendingDraw';

interface LightworkerGated {
  cosmicMessage: string;
  currentSituation: string;
  deeperMeaning: string;
  actionGuidance: string;
  energyHealing: string;
  soulQuestion: string;
}

function LightworkerPage() {
  const navigate = useNavigate();
  const { cards: deck, error: deckError } = useDeck('lightworker');
  const [drawnPreview, setDrawnPreview] = useState<CardPreview | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedCard | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showDrawPage, setShowDrawPage] = useState(false);
  const { trackEvent } = useConversionTracking();

  usePageView('lightworker_single');

  useEffect(() => {
    if (!deck || drawnPreview) return;
    const pending = consumePendingSingleDraw('lightworker_single');
    if (!pending) return;
    const preview = deck.find((c) => c.card_key === pending.card_key);
    if (!preview) return;
    setShowDrawPage(true);
    setDrawnPreview(preview);
    setUnlocked(null);
    setHasDrawn(true);
  }, [deck, drawnPreview]);

  const drawCard = () => {
    if (!deck || deck.length === 0) return;
    setIsShuffling(true);
    setHasDrawn(false);
    setUnlocked(null);

    setTimeout(() => {
      const card = pickRandomCards(deck, 1)[0];
      setDrawnPreview(card);
      setIsShuffling(false);
      setHasDrawn(true);

      trackEvent('card_drawn', {
        cardName: card.name,
        readingType: 'lightworker_single',
      });
    }, 1500);
  };

  const handleCelticCrossClick = () => {
    navigate('/lightworker/celtic-cross');
  };

  const reset = () => {
    setDrawnPreview(null);
    setUnlocked(null);
    setHasDrawn(false);
    setIsShuffling(false);
    setShowDrawPage(false);
  };

  const handleBack = () => {
    if (showDrawPage || hasDrawn || isShuffling || drawnPreview) {
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

  const gate = useSingleCardGate({
    spreadId: 'lightworker_single',
    cardKey: drawnPreview?.card_key ?? null,
    enabled: !!(drawnPreview && hasDrawn && !unlocked),
  });

  useEffect(() => {
    if (gate.unlockedCard && !unlocked) setUnlocked(gate.unlockedCard);
  }, [gate.unlockedCard]);

  const handleUnlocked = (email: string, card?: UnlockedCard) => {
    gate.onEmailUnlocked(email, card);
    if (card) trackEvent('unlocked', { readingType: 'lightworker_single', email });
  };

  const previewKeywords = (drawnPreview?.preview as { keywords?: string[] })?.keywords ?? [];
  const gated = unlocked?.gated as LightworkerGated | undefined;
  const isUnlocked = !!gated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-blue-950 text-white relative overflow-hidden">


      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
        {deckError && (
          <p className="text-center text-red-300 mb-6 text-sm tracking-wide">{deckError}</p>
        )}

        {!drawnPreview && !isShuffling && !showDrawPage && (
          <>
            <section className="text-center pt-4 pb-12">
              <div className="flex justify-center mb-6">
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-300 opacity-80 animate-pulse" />
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif mb-4 tracking-wide text-cyan-100 drop-shadow-lg">
                光行者神諭
              </h1>
              <p className="text-cyan-200/80 text-base sm:text-lg font-light tracking-wider max-w-2xl mx-auto leading-loose">
                靈魂使命的方向，落在當下的腳步。<br />
                選一個牌陣，接收高我的指引。
              </p>
            </section>

            <section className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={() => setShowDrawPage(true)}
                    className="group relative w-full flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative h-full min-h-[8rem] sm:min-h-[9rem] px-6 py-5 sm:py-6 bg-gradient-to-r from-cyan-600 to-blue-600 group-hover:from-cyan-500 group-hover:to-blue-500 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                      <h3 className="text-xl sm:text-2xl font-serif text-white text-center tracking-wide flex flex-col items-center leading-relaxed">
                        <span>單張牌</span>
                        <span className="text-sm sm:text-base opacity-90">接收宇宙訊息</span>
                        <span className="text-xs sm:text-sm opacity-80 mt-1 tracking-[0.2em]">第 1 次免費</span>
                      </h3>
                    </div>
                  </button>
                  <p className="text-cyan-200/60 text-xs tracking-wider text-center">靜下心來,專注於你的問題</p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={handleCelticCrossClick}
                    className="group relative w-full flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative h-full min-h-[8rem] sm:min-h-[9rem] px-6 py-5 sm:py-6 bg-gradient-to-r from-cyan-600 to-blue-600 group-hover:from-cyan-500 group-hover:to-blue-500 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                      <h3 className="text-lg sm:text-xl font-serif text-white text-center tracking-wide flex flex-col items-center leading-relaxed">
                        <span>十字交叉使命陣</span>
                        <span className="text-sm sm:text-base opacity-90">(Celtic Cross)</span>
                        <span className="text-xs sm:text-sm opacity-80 mt-1">{formatPrice(getSpreadPrice('celtic_cross') ?? 0)}</span>
                      </h3>
                    </div>
                  </button>
                  <p className="text-cyan-200/60 text-xs tracking-wider text-center">深度探索靈魂使命與人生道路</p>
                </div>
              </div>

              <div className="mt-12 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-cyan-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
                <h2 className="text-cyan-200 text-sm tracking-[0.4em] mb-5">使 用 之 法</h2>
                <p className="text-center text-sm text-cyan-200/85 leading-loose">
                  閉上眼睛，深呼吸三次。<br />
                  將意圖專注在你想尋求指引的問題，<br />
                  選擇上方牌陣，開始你的靈性探索。
                </p>
              </div>
            </section>
          </>
        )}

        {showDrawPage && !isShuffling && !hasDrawn && (
          <section className="max-w-2xl mx-auto text-center py-8">
            <h2 className="text-3xl font-serif text-cyan-100 tracking-[0.3em] mb-5">準 備 抽 牌</h2>
            <p className="text-sm sm:text-base text-cyan-200/85 mb-12 leading-loose">
              閉上眼睛，專注於你的問題，當你準備好時點擊下方按鈕
            </p>

            <div className="flex justify-center mb-12">
              <div className="w-44 sm:w-56 aspect-[2/3] bg-gradient-to-br from-cyan-900/60 to-blue-900/60 border-2 border-cyan-400/50 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-xl">
                <Sparkles className="w-20 h-20 text-cyan-300/70 animate-pulse" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={drawCard}
                disabled={!deck || deck.length === 0}
                className="px-10 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all shadow-xl hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
              >
                {deck ? '抽 牌' : '載 入 中'}
              </button>
              <button
                onClick={reset}
                className="px-8 py-3 bg-slate-800/60 border-2 border-cyan-500/30 rounded-xl hover:bg-slate-700/60 hover:border-cyan-400/50 transition-all text-cyan-200 inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                返 回
              </button>
            </div>
          </section>
        )}

        {isShuffling && <CardShuffleAnimation message="連 接 高 我 中" />}

        {drawnPreview && hasDrawn && (
          <section className="max-w-3xl mx-auto space-y-10">
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-cyan-500/30 rounded-3xl p-8 shadow-2xl">
              <div className="text-center pb-8 border-b border-cyan-500/15">
                <div className="flex justify-center mb-6">
                  <Sparkles className="w-12 h-12 text-cyan-300" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif text-cyan-100 mb-3 tracking-[0.25em]">
                  {drawnPreview.name}
                </h2>
                {drawnPreview.name_secondary && (
                  <p className="text-sm tracking-[0.32em] text-cyan-300/80">
                    {drawnPreview.name_secondary}
                  </p>
                )}
                {previewKeywords.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6">
                    {previewKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 border border-cyan-500/40 rounded-full text-xs tracking-[0.2em] text-cyan-200"
                      >
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
                      <h3 className="text-cyan-200 text-sm tracking-[0.4em] mb-4">牌 面 訊 息</h3>
                      {drawnPreview.preview_excerpt && (
                        <div className="relative bg-slate-900/40 rounded-xl border border-cyan-500/20 p-5">
                          <p className="text-cyan-100/90 leading-loose">{drawnPreview.preview_excerpt}</p>
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none rounded-b-xl" />
                        </div>
                      )}
                      <p className="mt-4 text-xs text-cyan-300/70 tracking-wide">
                        前 30% 預覽 — 留下 Email 解鎖完整解析
                      </p>
                    </div>
                    {gate.phase === 'loading' && (
                      <div className="text-center text-cyan-300/70 py-4 tracking-wider">解鎖中…</div>
                    )}
                    {gate.phase === 'email_gate' && (
                      <InlineEmailUnlock
                        onUnlocked={handleUnlocked}
                        readingType="lightworker_single"
                        theme="dark"
                        cardUnlock={{ spread_id: 'lightworker_single', card_key: drawnPreview.card_key }}
                      />
                    )}
                    <MembershipGate
                      isOpen={gate.showMembership}
                      onClose={() => gate.setShowMembership(false)}
                      resumePath="/lightworker"
                      pendingSingleDraw={drawnPreview ? {
                        spread_id: 'lightworker_single',
                        card_key: drawnPreview.card_key,
                      } : undefined}
                    />
                  </>
                )}

                {isUnlocked && gated && (
                  <>
                    <p className="text-center text-sm tracking-[0.3em] text-cyan-300">完 整 解 析</p>
                    <Section title="宇宙訊息">{gated.cosmicMessage}</Section>
                    <Section title="現況解析">{gated.currentSituation}</Section>
                    <Section title="深層含義">{gated.deeperMeaning}</Section>
                    <Section title="行動建議">{gated.actionGuidance}</Section>
                    <Section title="能量療癒建議">{gated.energyHealing}</Section>
                    <div className="bg-slate-900/40 border-l-4 border-cyan-400 rounded-r-xl p-6">
                      <h3 className="text-cyan-200 text-sm tracking-[0.4em] mb-4">靈 魂 提 問</h3>
                      <p className="text-cyan-100/90 leading-loose italic">{gated.soulQuestion}</p>
                    </div>
                    <ResonanceCTA />
                  </>
                )}
              </div>
            </div>

            {!isUnlocked && <TarotCourseCTA />}

            <div className="flex justify-center pt-4">
              <button
                onClick={reset}
                className="px-8 py-3 bg-slate-800/60 border-2 border-cyan-500/30 rounded-xl hover:bg-slate-700/60 hover:border-cyan-400/50 transition-all text-cyan-200 inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重 新 抽 牌
              </button>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/40 border border-cyan-500/20 rounded-xl p-5">
      <h3 className="text-cyan-200 text-sm tracking-[0.4em] mb-3">{title}</h3>
      <p className="text-cyan-100/90 leading-loose whitespace-pre-line">{children}</p>
    </div>
  );
}

function SpreadCard({
  onClick, title, body, cta, price, sigil,
}: {
  onClick: () => void;
  title: string;
  body: string;
  cta: string;
  price?: number;
  sigil: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-cyan-500/30 rounded-2xl p-5 sm:p-6 shadow-xl group text-left transition-all duration-300 hover:border-cyan-500/70 hover:-translate-y-1 min-h-[15rem] sm:min-h-[18rem]"
    >
      <div className="flex flex-col items-center text-center h-full">
        <div className="text-cyan-400 mb-4 sm:mb-6 transition-transform duration-500 group-hover:rotate-12 scale-90 sm:scale-100">
          {sigil}
        </div>
        <h2 className="font-serif text-xl sm:text-2xl text-cyan-100 tracking-[0.25em] sm:tracking-[0.3em] mb-2 sm:mb-3">{title}</h2>
        <p className={`text-xs sm:text-sm text-cyan-300/80 leading-loose max-w-xs ${price !== undefined ? 'mb-2 sm:mb-3' : 'mb-6 sm:mb-8'}`}>{body}</p>
        {price !== undefined && (
          <p className="font-serif text-sm sm:text-base text-cyan-300 tracking-[0.2em] sm:tracking-[0.25em] mb-6 sm:mb-8">NT$ {price}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-2 px-5 py-2 border border-cyan-500/50 bg-cyan-500/10 rounded-lg text-xs tracking-[0.35em] sm:tracking-[0.4em] text-cyan-200 transition-all duration-300 group-hover:bg-cyan-500/25 group-hover:border-cyan-400/70 group-hover:translate-x-1">
          {cta}
          <ArrowRight className="w-4 h-4" strokeWidth={1.4} />
        </span>
      </div>
    </button>
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

function CelticCrossSigil() {
  return (
    <svg viewBox="-40 -40 80 80" className="w-16 h-16" stroke="currentColor" fill="none">
      <rect x="-9" y="-9" width="18" height="18" strokeWidth="0.9" />
      <rect x="-12" y="-6" width="24" height="12" strokeWidth="0.9" transform="rotate(90)" />
      <rect x="-9" y="-32" width="18" height="14" strokeWidth="0.7" />
      <rect x="-9" y="18" width="18" height="14" strokeWidth="0.7" />
      <rect x="-32" y="-7" width="14" height="14" strokeWidth="0.7" />
      <rect x="18" y="-7" width="14" height="14" strokeWidth="0.7" />
    </svg>
  );
}

export default LightworkerPage;
