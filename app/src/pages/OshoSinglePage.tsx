import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { cardsApi, type CardPreview, type UnlockedCard } from '../lib/api';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { ResonanceCTA } from '../components/ResonanceCTA';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import SocialLinksFooter from '../components/SocialLinksFooter';

interface OshoGated {
  meanings: {
    currentEnergy: string;
    dailyGuidance: string;
    emotionalInsight: string;
    blockageAnalysis: string;
    meditationEntry: string;
  };
}

export default function OshoSinglePage() {
  const navigate = useNavigate();
  const [deck, setDeck] = useState<CardPreview[] | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [drawnPreview, setDrawnPreview] = useState<CardPreview | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [unlocked, setUnlocked] = useState<UnlockedCard | null>(null);
  const { showModal, handleClose } = useCrystalPromo(!!drawnPreview && !isRevealing);
  const { trackEvent } = useConversionTracking();

  usePageView('osho_single');

  useEffect(() => {
    let cancelled = false;
    cardsApi.deckPreview('osho')
      .then((res) => { if (!cancelled) setDeck(res.cards); })
      .catch((err) => { if (!cancelled) setDeckError(err instanceof Error ? err.message : '無法載入牌組'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (drawnPreview && !isRevealing) {
      window.scrollTo(0, 0);
    }
  }, [drawnPreview, isRevealing]);

  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
  }, []);

  const drawCard = () => {
    if (!deck || deck.length === 0) return;
    setIsRevealing(true);

    if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
    drawTimerRef.current = setTimeout(() => {
      const pick = deck[Math.floor(Math.random() * deck.length)];
      setDrawnPreview(pick);
      setUnlocked(null);
      setIsRevealing(false);

      trackEvent('card_drawn', {
        cardName: pick.name,
        readingType: 'osho_single',
      });
    }, 800);
  };

  const reset = () => {
    setDrawnPreview(null);
    setUnlocked(null);
    setIsRevealing(false);
  };

  const handleUnlocked = (email: string, card?: UnlockedCard) => {
    if (!card) return;
    setUnlocked(card);
    trackEvent('unlocked', { readingType: 'osho_single', email });
  };

  const isUnlocked = !!unlocked;
  const meanings = (unlocked?.gated as OshoGated | undefined)?.meanings;

  if (!drawnPreview && !isRevealing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white">
        <PageHeader title="奧修禪卡 · 單張" accent="teal" />
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif mb-4 bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              單張牌陣
            </h1>
            <p className="text-teal-200/80 text-lg mb-2">覺察當下，照見內在</p>
            <p className="text-teal-300/60 text-sm">靜心片刻，讓你的直覺引導你</p>
          </div>

          {deckError && (
            <p className="text-center text-red-300 mb-6">{deckError}</p>
          )}

          <div className="flex flex-col items-center gap-8">
            <div className="grid grid-cols-5 gap-4 mb-8">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="w-20 h-32 bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border-2 border-teal-500/40 rounded-lg backdrop-blur-sm animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>

            <button
              onClick={drawCard}
              disabled={!deck || deck.length === 0}
              className="group relative px-12 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all shadow-2xl hover:shadow-teal-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-xl font-medium">{deck ? '抽一張牌' : '載入牌組中…'}</span>
                <Sparkles className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
              </div>
            </button>
          </div>

          <SocialLinksFooter />
        </div>
      </div>
    );
  }

  if (isRevealing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
        <CardShuffleAnimation message="禪　心　顯　現　中" />
      </div>
    );
  }

  if (!drawnPreview) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white">
      <PageHeader title="奧修禪卡 · 單張" accent="teal" />
      <div className="max-w-6xl mx-auto p-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2 text-teal-100">你抽到的牌</h1>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-4xl font-serif mb-2 text-teal-100">{drawnPreview.name}</h2>
          {drawnPreview.name_secondary && (
            <p className="text-teal-300/80 text-lg italic">{drawnPreview.name_secondary}</p>
          )}
        </div>

        <div className="max-w-3xl mx-auto mb-8">
          <div className="space-y-6">
            {isUnlocked && meanings && (
              <>
                <MeaningCard accent="teal" index="1" title="當下能量狀態" body={meanings.currentEnergy} />
                <MeaningCard accent="cyan" index="2" title="今日指引 / 靈性訊息" body={meanings.dailyGuidance} />
                <MeaningCard accent="teal" index="3" title="情緒與潛意識" body={meanings.emotionalInsight} />
                <MeaningCard accent="cyan" index="4" title="卡關點解析" body={meanings.blockageAnalysis} />
                <MeaningCard accent="teal" index="5" title="冥想入口" body={meanings.meditationEntry} />

                <ResonanceCTA />
              </>
            )}

            {!isUnlocked && (
              <>
                <div className="bg-slate-800/60 backdrop-blur-sm border-2 border-teal-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-3 text-teal-200 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-teal-400/50 text-sm font-serif text-teal-200">1</span>
                    當下能量狀態
                  </h3>
                  {drawnPreview.preview_excerpt && (
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-teal-400/30 relative">
                      <p className="text-teal-100/90 leading-relaxed">
                        {drawnPreview.preview_excerpt}
                      </p>
                      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-900/95 pointer-events-none rounded-b-lg" />
                    </div>
                  )}
                  <p className="text-teal-200/60 text-xs mt-3">前30%預覽，輸入 Email 解鎖完整解析</p>
                </div>

                <InlineEmailUnlock
                  onUnlocked={handleUnlocked}
                  readingType="osho_single"
                  theme="dark"
                  cardUnlock={{
                    spread_id: 'osho_single',
                    card_key: drawnPreview.card_key,
                  }}
                />
              </>
            )}
          </div>
        </div>

        {!isUnlocked && <TarotCourseCTA />}

        <div className="flex justify-center">
          <button
            onClick={reset}
            className="group flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all shadow-xl hover:shadow-teal-500/50 hover:scale-105"
          >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-lg font-medium">重新抽牌</span>
          </button>
        </div>

        <SocialLinksFooter />
      </div>

      <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />
    </div>
  );
}

function MeaningCard({
  accent, index, title, body,
}: {
  accent: 'teal' | 'cyan';
  index: string;
  title: string;
  body: string;
}) {
  const borderClass = accent === 'teal' ? 'border-teal-500/30 hover:border-teal-400/50' : 'border-cyan-500/30 hover:border-cyan-400/50';
  const titleColor = accent === 'teal' ? 'text-teal-200' : 'text-cyan-200';
  const badgeColor = accent === 'teal' ? 'border-teal-400/50 text-teal-200' : 'border-cyan-400/50 text-cyan-200';
  const bodyColor = accent === 'teal' ? 'text-teal-100/90' : 'text-cyan-100/90';
  return (
    <div className={`bg-slate-800/60 backdrop-blur-sm border-2 ${borderClass} rounded-xl p-6 transition-all`}>
      <h3 className={`text-xl font-semibold mb-3 ${titleColor} flex items-center gap-3`}>
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border ${badgeColor} text-sm font-serif`}>{index}</span>
        {title}
      </h3>
      <p className={`${bodyColor} leading-relaxed whitespace-pre-line`}>{body}</p>
    </div>
  );
}
