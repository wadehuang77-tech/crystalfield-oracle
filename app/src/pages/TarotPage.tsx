import { useState, useEffect, useRef } from 'react';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, RotateCcw, Sparkles, Layers, Columns3, Compass, Hourglass } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getPastLifePositionGuide } from '../utils/pastLifeInterpretation';
import { useAuth } from '../contexts/AuthContext';
import { LoginPromptModal } from '../components/LoginPromptModal';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { CrystalReminderBar } from '../components/CrystalReminderBar';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { PaywallModal } from '../components/PaywallModal';
import { PaywallGate } from '../components/PaywallGate';
import { useSpreadAccess } from '../hooks/useSpreadAccess';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { ResonanceCTA } from '../components/ResonanceCTA';
import TarotResonanceCTA from '../components/TarotResonanceCTA';
import SocialLinksFooter from '../components/SocialLinksFooter';
import { useConversionTracking } from '../hooks/useConversionTracking';
import { useDeck, pickRandomCards, unlockSpreadCards } from '../hooks/useDeck';
import { checkoutApi, type CardPreview, type UnlockedCard } from '../lib/api';
import { consumePendingDraw } from '../lib/pendingDraw';

interface TarotCard {
  id: string;
  name: string;
  nameChinese: string;
  arcana: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  number?: number;
  uprightMeaning: string;
  reversedMeaning: string;
  keywords: string[];
  image: string;
  detailedInterpretation?: {
    coreKeywords: { upright: string[]; reversed: string[]; uprightExplanation: string; reversedExplanation: string };
    energyFlow: { direction: string; type: string; description: string };
    timing: { speed: string; description: string };
    advice: { upright: string; reversed: string };
    chakra: { primary: string; issue: string; healingNote: string };
    soulMessage: { upright: string; reversed: string };
  };
}

interface TarotGated {
  uprightMeaning: string;
  reversedMeaning: string;
  detailedInterpretation?: TarotCard['detailedInterpretation'];
}

function buildShim(preview: CardPreview, gated?: TarotGated): TarotCard {
  const p = preview.preview as { keywords?: string[]; arcana?: string; suit?: string; number?: number };
  return {
    id: preview.card_key,
    name: preview.name_secondary ?? preview.name,
    nameChinese: preview.name,
    arcana: (p.arcana as 'major' | 'minor') ?? 'major',
    suit: p.suit as TarotCard['suit'],
    number: p.number,
    keywords: p.keywords ?? [],
    image: preview.image ?? '',
    uprightMeaning: gated?.uprightMeaning ?? preview.upright_excerpt ?? '',
    reversedMeaning: gated?.reversedMeaning ?? preview.reversed_excerpt ?? '',
    detailedInterpretation: gated?.detailedInterpretation,
  };
}

type SpreadType = 'single' | 'three' | 'celtic' | 'pastlife';

const SPREAD_IDS: Record<SpreadType, string> = {
  single: 'tarot_single',
  three: 'tarot_three',
  celtic: 'tarot_celtic',
  pastlife: 'tarot_pastlife'
};

interface DrawnCard {
  preview: CardPreview;
  card: TarotCard;
  isReversed: boolean;
  revealed: boolean;
  position?: string;
}

function TarotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cards: deck, error: deckError } = useDeck('tarot');
  const initialSpread = ((): SpreadType => {
    const q = searchParams.get('spread');
    return q === 'three' || q === 'celtic' || q === 'pastlife' || q === 'single' ? q : 'single';
  })();
  const [spreadType, setSpreadType] = useState<SpreadType>(initialSpread);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showCardLayout, setShowCardLayout] = useState(initialSpread !== 'single' || searchParams.get('spread') === 'single');
  const [showPaywall, setShowPaywall] = useState(false);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const allCardsRevealed = hasDrawn && drawnCards.every(card => card.revealed);
  const { showModal, showReminder, handleClose, handleReminderClose } = useCrystalPromo(allCardsRevealed);
  const { userState } = useSpreadAccess(SPREAD_IDS[spreadType]);
  const { trackEvent } = useConversionTracking();

  const isMultiCardSpread = spreadType !== 'single';

  const handleEmailSubmitted = (_email: string, card?: UnlockedCard) => {
    if (!card) return;
    setDrawnCards((prev) => prev.map((d, i) => (
      i === 0 ? { ...d, card: buildShim(d.preview, card.gated as TarotGated) } : d
    )));
    setIsUnlocked(true);
    trackEvent('unlocked', { readingType: 'tarot_single', email: _email });
  };

  const drawSingleCard = () => {
    if (!deck || deck.length === 0) return;

    setIsDrawing(true);
    setHasDrawn(false);
    setIsUnlocked(false);
    setIsLocallyUnlocked(false);

    setTimeout(() => {
      const pick = pickRandomCards(deck, 1)[0];
      const drawn: DrawnCard[] = [{
        preview: pick,
        card: buildShim(pick),
        isReversed: Math.random() > 0.5,
        revealed: false,
      }];

      setDrawnCards(drawn);
      setIsDrawing(false);
      setHasDrawn(true);
    }, 1500);
  };

  useEffect(() => {
    if (hasDrawn && drawnCards.length > 0) {
      drawnCards.forEach((_, index) => {
        setTimeout(() => {
          setDrawnCards(prev =>
            prev.map((card, i) =>
              i === index ? { ...card, revealed: true } : card
            )
          );
        }, index * 400);
      });
    }
  }, [hasDrawn]);

  useEffect(() => {
    if (hasDrawn) {
      window.scrollTo(0, 0);
    }
  }, [hasDrawn]);

  useEffect(() => {
    if (!deck || deck.length === 0) return;
    if (drawnCards.length > 0) return;
    if (searchParams.get('order_id')) return;
    const itemToSpread: Record<string, SpreadType> = {
      tarot_three: 'three', tarot_celtic: 'celtic', tarot_pastlife: 'pastlife',
    };
    for (const [item_id, sType] of Object.entries(itemToSpread)) {
      const pending = consumePendingDraw(item_id);
      if (!pending) continue;
      const pastLifePositions = [
        '前世身份能量', '前世關鍵事件', '帶來的影響', '今生呈現的問題',
        '重複的模式', '靈魂要釋放的', '解鎖與療癒方式',
      ];
      const restored: DrawnCard[] = [];
      for (let i = 0; i < pending.picks.length; i++) {
        const pick = pending.picks[i];
        const preview = deck.find((c) => c.card_key === pick.card_key);
        if (!preview) return;
        restored.push({
          preview,
          card: buildShim(preview),
          isReversed: pick.reversed ?? false,
          revealed: true,
          position: sType === 'pastlife' ? pastLifePositions[i] : undefined,
        });
      }
      setSpreadType(sType);
      setShowCardLayout(true);
      setDrawnCards(restored);
      setHasDrawn(true);
      break;
    }
  }, [deck, drawnCards.length, searchParams]);

  const restoreStartedRef = useRef(false);
  useEffect(() => {
    if (restoreStartedRef.current) return;
    const orderId = searchParams.get('order_id');
    if (!orderId || !deck || deck.length === 0) return;
    restoreStartedRef.current = true;

    (async () => {
      try {
        const { order } = await checkoutApi.getOrder(orderId);
        if (!order.picks || order.status !== 'paid') {
          setUnlockError('無法還原此訂單(status/picks 不符)');
          return;
        }

        const itemToSpread: Record<string, SpreadType> = {
          tarot_three: 'three',
          tarot_celtic: 'celtic',
          tarot_pastlife: 'pastlife',
        };
        const restoredSpread = itemToSpread[order.item_id];
        if (!restoredSpread) {
          setUnlockError(`此訂單是 ${order.item_id},不適用此頁`);
          return;
        }

        const pastLifePositions = [
          '前世身份能量', '前世關鍵事件', '帶來的影響', '今生呈現的問題',
          '重複的模式', '靈魂要釋放的', '解鎖與療癒方式',
        ];

        const restored: DrawnCard[] = [];
        for (let i = 0; i < order.picks.length; i++) {
          const pick = order.picks[i];
          const preview = deck.find((c) => c.card_key === pick.card_key);
          if (!preview) {
            setUnlockError(`牌組對不上,找不到 card_key=${pick.card_key}`);
            return;
          }
          restored.push({
            preview,
            card: buildShim(preview),
            isReversed: pick.reversed ?? false,
            revealed: true,
            position: restoredSpread === 'pastlife' ? pastLifePositions[i] : undefined,
          });
        }

        setSpreadType(restoredSpread);
        setShowCardLayout(true);
        setDrawnCards(restored);
        setHasDrawn(true);

        try {
          const picks = restored.map((d, i) => ({
            card_key: d.preview.card_key,
            position: i + 1,
            reversed: d.isReversed,
          }));
          const unlocked = await unlockSpreadCards(SPREAD_IDS[restoredSpread], picks, order.id);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          setDrawnCards((prev) => prev.map((d) => {
            const u = byKey.get(d.preview.card_key);
            return u ? { ...d, card: buildShim(d.preview, u.gated as TarotGated) } : d;
          }));
          setIsLocallyUnlocked(true);
        } catch (err) {
          setUnlockError(err instanceof Error ? err.message : '解鎖失敗,請稍後再試');
        }
      } catch (e) {
        setUnlockError(e instanceof Error ? `還原訂單失敗:${e.message}` : '還原訂單失敗');
      }
    })();
  }, [searchParams, deck]);

  const performDraw = () => {
    if (!deck || deck.length === 0) return;

    setIsDrawing(true);
    setHasDrawn(false);
    setIsLocallyUnlocked(false);
    setUnlockError(null);

    const cardCount = spreadType === 'single' ? 1 : spreadType === 'three' ? 3 : spreadType === 'pastlife' ? 7 : 10;

    setTimeout(() => {
      const pastLifePositions = [
        '前世身份能量',
        '前世關鍵事件',
        '帶來的影響',
        '今生呈現的問題',
        '重複的模式',
        '靈魂要釋放的',
        '解鎖與療癒方式',
      ];

      const picks = pickRandomCards(deck, cardCount);
      const drawn: DrawnCard[] = picks.map((pick, i) => ({
        preview: pick,
        card: buildShim(pick),
        isReversed: Math.random() > 0.5,
        revealed: false,
        position: spreadType === 'pastlife' ? pastLifePositions[i] : undefined,
      }));

      setDrawnCards(drawn);
      setIsDrawing(false);
      setHasDrawn(true);
    }, 1500);
  };

  const resetDraw = () => {
    setDrawnCards([]);
    setHasDrawn(false);
    setShowCardLayout(false);
    setIsUnlocked(false);
    setIsLocallyUnlocked(false);
  };

  const handleBack = () => {
    if (showCardLayout || hasDrawn || isDrawing || drawnCards.length > 0) {
      resetDraw();
      if (searchParams.get('spread')) {
        setSearchParams({}, { replace: true });
      }
      return;
    }
    navigate(-1);
  };

  const handleSpreadTypeChange = (newSpreadType: SpreadType) => {
    setSpreadType(newSpreadType);
    setIsLocallyUnlocked(false);
    setShowCardLayout(true);
  };

  const handleUnlockClick = () => {
    if (userState === 'guest') {
      setShowLoginPrompt(true);
    } else if (!showFullContent && userState !== 'guest') {
      setShowPaywall(true);
    }
  };

  const handleMockUnlock = async () => {
    if (!user) { setShowLoginPrompt(true); return; }
    setUnlockError(null);
  };

  const showFullContent = isLocallyUnlocked;

  const getSpreadName = (type: SpreadType): string => {
    switch (type) {
      case 'three': return '偉特塔羅三張牌陣';
      case 'celtic': return '偉特塔羅凱爾特十字牌陣';
      case 'pastlife': return '偉特塔羅前世今生牌陣';
      default: return '偉特塔羅單張牌';
    }
  };

  const shouldShowContent = (type: SpreadType): boolean => {
    if (type === 'single') return true;
    return showFullContent;
  };

  const getPreviewText = (text: string): string => {
    return text.slice(0, Math.floor(text.length * 0.5)) + '...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950 to-slate-900 text-white">
      <PageHeader title="偉特塔羅" accent="orange" onBack={handleBack} />

      <div className="relative max-w-[1100px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <section className="text-center pb-12">
          <div className="flex justify-center text-orange-500 mb-8">
            <DeckSigil />
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-orange-100 tracking-[0.25em] sm:tracking-[0.4em] mb-5">偉特塔羅</h1>
          <p className="text-base sm:text-lg text-orange-300/80 leading-loose tracking-wide max-w-md mx-auto">
            經典符碼的深度解讀。<br />
            正逆位皆有其聲,牌陣決定深度。
          </p>
        </section>

        <div className="max-w-6xl mx-auto">
          {!hasDrawn && !isDrawing && !showCardLayout && (
            <>
              <div className="mb-12">
                <p className="text-center text-xs sm:text-sm tracking-[0.6em] text-orange-400/80 mb-2">選　擇　牌　陣</p>
                <div className="ornamental-divider mb-10">
                  <svg viewBox="-8 -8 16 16" className="w-3 h-3" fill="currentColor">
                    <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" />
                    <circle r="1.2" fill="#07091a" />
                  </svg>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 max-w-5xl mx-auto">
                  {([
                    { key: 'single',   Icon: Layers,    name: '單張牌',         desc: '簡單直接的指引',         price: undefined },
                    { key: 'three',    Icon: Columns3,  name: '三張牌陣',       desc: '過去 · 現在 · 未來',     price: 250 },
                    { key: 'celtic',   Icon: Compass,   name: '凱爾特十字',     desc: '深度全面解讀',           price: 500 },
                    { key: 'pastlife', Icon: Hourglass, name: '前世因果解鎖陣', desc: '揭開前世今生的因果',     price: 800 },
                  ] as const).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => handleSpreadTypeChange(s.key)}
                      className={`spread-choice ${spreadType === s.key ? 'spread-choice-active' : ''}`}
                    >
                      <s.Icon className="w-7 h-7 mb-4 text-orange-400" strokeWidth={1.3} />
                      <h3 className="font-serif text-base sm:text-lg text-orange-100 mb-2 tracking-[0.18em]">{s.name}</h3>
                      <p className="text-xs sm:text-sm text-orange-300/75 leading-relaxed">{s.desc}</p>
                      {s.price !== undefined ? (
                        <p className="font-serif text-sm sm:text-base text-orange-300 tracking-[0.2em] mt-3">NT$ {s.price}</p>
                      ) : (
                        <p className="font-serif text-sm sm:text-base text-orange-300 tracking-[0.3em] mt-3">免 費</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-16">
                <div className="bg-slate-800 border-2 border-orange-500/20 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-orange-200 text-xl font-medium mb-4 tracking-wide">關於偉特塔羅</h3>
                  <p className="text-orange-100/80 leading-relaxed">
                    偉特塔羅牌是世界上最廣為人知的塔羅牌系統,由亞瑟·愛德華·偉特設計,帕梅拉·科爾曼·史密斯繪製。這套牌包含22張大阿爾克那牌,代表生命的重要階段和靈性旅程。
                  </p>
                </div>

                <div className="bg-slate-800 border-2 border-orange-500/20 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-orange-200 text-xl font-medium mb-4 tracking-wide">如何使用</h3>
                  <ul className="space-y-2 text-orange-100/80">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>深呼吸,讓心靈平靜</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>在心中清楚地想著你的問題</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>點擊按鈕,接收塔羅的指引</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>用心感受卡片的訊息與智慧</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {showCardLayout && !hasDrawn && !isDrawing && spreadType === 'single' && (
            <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-serif text-orange-100 mb-4">準備抽牌</h2>
                <p className="text-orange-200/80 text-lg">靜心感受,當你準備好時點擊下方按鈕</p>
              </div>

              <div className="bg-slate-900 border-2 border-orange-500/30 rounded-2xl p-12 mb-8 flex items-center justify-center">
                <div className="w-48 aspect-[2/3] bg-slate-800 rounded-xl border-2 border-orange-500/20 flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-orange-400/30" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={drawSingleCard} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-medium rounded-xl shadow-lg hover:shadow-orange-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Sparkles className="w-5 h-5" strokeWidth={1.4} />
                  抽　牌
                </button>
                <button onClick={resetDraw} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-orange-500/30 rounded-xl hover:bg-slate-700/60 hover:border-orange-400/50 transition-all text-orange-200">
                  <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                  重　選　牌　陣
                </button>
              </div>
            </div>
          )}

          {showCardLayout && !hasDrawn && !isDrawing && spreadType !== 'single' && (
            <div className="max-w-5xl mx-auto animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-serif text-orange-100 mb-3">
                  {spreadType === 'three' && '三張牌陣'}
                  {spreadType === 'celtic' && '凱爾特十字牌陣'}
                  {spreadType === 'pastlife' && '前世因果解鎖陣'}
                </h2>
                <p className="text-orange-200/80">
                  {spreadType === 'three' && '探索過去、現在與未來的時間軸'}
                  {spreadType === 'celtic' && '深度探索問題的各個面向'}
                  {spreadType === 'pastlife' && '揭開前世今生的因果連結'}
                </p>
              </div>

              {spreadType === 'three' && (
                <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
                  {['過去', '現在', '未來'].map((position, index) => (
                    <div key={index} className="bg-slate-800/80 border border-orange-500/30 rounded-lg p-4">
                      <div className="flex flex-col items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-orange-600/50 rounded-full text-sm font-bold border border-orange-400/50">
                          {index + 1}
                        </span>
                        <div className="w-full aspect-[2/3] bg-slate-800 rounded-lg border border-orange-500/20 flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-orange-400/30" />
                        </div>
                        <p className="text-sm text-orange-100 font-medium">{position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {spreadType === 'celtic' && (
                <div className="max-w-4xl mx-auto mb-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { pos: 1, name: '現況', col: 'md:col-start-2' },
                      { pos: 2, name: '挑戰', col: 'md:col-start-2' },
                      { pos: 3, name: '根源', col: 'md:col-start-1' },
                      { pos: 4, name: '過去', col: 'md:col-start-3' },
                      { pos: 5, name: '目標', col: 'md:col-start-2' },
                      { pos: 6, name: '未來', col: 'md:col-start-2' },
                      { pos: 7, name: '自己', col: 'md:col-start-4 md:row-start-1' },
                      { pos: 8, name: '環境', col: 'md:col-start-4' },
                      { pos: 9, name: '希望/恐懼', col: 'md:col-start-4' },
                      { pos: 10, name: '結果', col: 'md:col-start-4' }
                    ].map((card) => (
                      <div key={card.pos} className={`${card.col} bg-slate-800/80 border border-orange-500/30 rounded-lg p-3`}>
                        <div className="flex flex-col items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 bg-orange-600/50 rounded-full text-xs font-bold border border-orange-400/50">
                            {card.pos}
                          </span>
                          <div className="w-full aspect-[2/3] bg-slate-800 rounded border border-orange-500/20 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-orange-400/30" />
                          </div>
                          <p className="text-xs text-orange-100 text-center leading-tight">{card.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {spreadType === 'pastlife' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto mb-8">
                  {[
                    '前世身份能量',
                    '前世關鍵事件',
                    '帶來的影響',
                    '今生呈現的問題',
                    '重複的模式',
                    '靈魂要釋放的',
                    '解鎖與療癒方式'
                  ].map((position, index) => (
                    <div key={index} className="bg-slate-800/80 border border-orange-500/30 rounded-lg p-3">
                      <div className="flex flex-col items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 bg-orange-600/50 rounded-full text-xs font-bold border border-orange-400/50">
                          {index + 1}
                        </span>
                        <div className="w-full aspect-[2/3] bg-slate-800 rounded-lg border border-orange-500/20 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-orange-400/30" />
                        </div>
                        <p className="text-xs text-orange-100 text-center leading-tight">{position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={performDraw} disabled={isDrawing} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-medium rounded-xl shadow-lg hover:shadow-orange-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Sparkles className="w-5 h-5" strokeWidth={1.4} />
                  抽　牌
                </button>
                <button onClick={resetDraw} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-orange-500/30 rounded-xl hover:bg-slate-700/60 hover:border-orange-400/50 transition-all text-orange-200">
                  <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                  重　選　牌　陣
                </button>
              </div>
            </div>
          )}

          {isDrawing && <CardShuffleAnimation />}

          {hasDrawn && drawnCards.length > 0 && (
            <div className="space-y-8">
              {spreadType === 'single' && drawnCards[0].revealed && (
                <div className="bg-slate-900 border-2 border-orange-500/40 rounded-3xl p-8 md:p-12 shadow-2xl animate-fade-in">
                  <div className="text-center mb-8">
                    <div className="inline-block mb-4">
                      {drawnCards[0].isReversed && (
                        <div className="inline-block px-4 py-2 bg-orange-600/80 rounded-full text-sm border border-orange-400/50">
                          逆位 (Reversed)
                        </div>
                      )}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-serif text-orange-100 mb-2 tracking-wide">
                      {drawnCards[0].card.name}
                    </h2>
                    <p className="text-xl md:text-2xl text-orange-200/80 font-light mb-4">
                      {drawnCards[0].card.nameChinese}
                    </p>
                    {drawnCards[0].card.number !== undefined && (
                      <p className="text-orange-300/60 text-sm tracking-wider">
                        {drawnCards[0].card.arcana === 'major' ? '大阿爾克那' : '小阿爾克那'} • 第 {drawnCards[0].card.number} 號牌
                      </p>
                    )}
                  </div>

                  <div className="space-y-6">
                    {drawnCards[0].card.detailedInterpretation ? (
                      <>
                        {!isUnlocked && <div className="bg-slate-800 rounded-xl p-6 border-2 border-orange-400/50">
                          <h3 className="text-orange-100 text-xl font-medium mb-4 tracking-wide flex items-center gap-2">
                            <span className="font-serif text-xl text-orange-400 mr-1 tracking-[0.1em]">一</span>
                            牌面核心關鍵字（{drawnCards[0].isReversed ? '逆位' : '正位'}）
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {(drawnCards[0].isReversed
                              ? drawnCards[0].card.detailedInterpretation.coreKeywords.reversed
                              : drawnCards[0].card.detailedInterpretation.coreKeywords.upright
                            ).map((keyword, idx) => (
                              <span
                                key={idx}
                                className="px-4 py-2 bg-slate-800/40 border border-orange-300/50 rounded-full text-sm text-orange-100 font-medium"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                          <div className="bg-slate-900/40 rounded-lg p-4 border border-orange-400/30 relative">
                            <p className="text-orange-100/90 leading-relaxed">
                              {getPreviewText(drawnCards[0].isReversed ? drawnCards[0].card.reversedMeaning : drawnCards[0].card.uprightMeaning)}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none rounded-b-lg"></div>
                          </div>
                          <p className="text-orange-200/60 text-xs mt-3">前30%預覽，輸入 Email 解鎖完整解析</p>
                        </div>}

                        {!isUnlocked && (
                          <InlineEmailUnlock
                            onUnlocked={handleEmailSubmitted}
                            readingType="tarot_single"
                            theme="dark"
                            cardUnlock={{
                              spread_id: 'tarot_single',
                              card_key: drawnCards[0].preview.card_key,
                              reversed: drawnCards[0].isReversed,
                            }}
                            cardData={{
                              cardName: drawnCards[0].card.name,
                              cardNameChinese: drawnCards[0].card.nameChinese,
                              isReversed: drawnCards[0].isReversed,
                            }}
                          />
                        )}

                        {isUnlocked && (
                          <>
                            <div className="bg-slate-900/30 rounded-xl p-4 border border-orange-400/40">
                              <p className="text-sm font-medium text-orange-300 flex items-center gap-2">
                                <span>✨</span> 完整解析已解鎖
                              </p>
                            </div>

                            <div className="bg-slate-900/30 rounded-xl p-6 border border-orange-400/30">
                              <h3 className="text-orange-100 text-lg font-medium mb-3 tracking-wide">
                                {drawnCards[0].isReversed ? '逆位完整含義' : '正位完整含義'}
                              </h3>
                              <p className="text-orange-100/90 leading-relaxed">
                                {drawnCards[0].isReversed ? drawnCards[0].card.reversedMeaning : drawnCards[0].card.uprightMeaning}
                              </p>
                            </div>

                            <div className="bg-slate-900/30 rounded-xl p-6 border border-orange-500/20">
                              <h3 className="text-orange-300 text-lg font-medium mb-4 tracking-wide flex items-center gap-2">
                                <span className="font-serif text-xl text-orange-400 mr-1 tracking-[0.1em]">二</span>
                                能量流動（很少人教，但超強）
                              </h3>
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <span className="text-orange-400 font-bold text-lg">•</span>
                                  <p className="text-orange-100/90 flex-1">
                                    <span className="text-orange-200 font-medium">方向：</span>
                                    <span className="ml-2">{drawnCards[0].card.detailedInterpretation.energyFlow.direction}</span>
                                  </p>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-orange-400 font-bold text-lg">•</span>
                                  <p className="text-orange-100/90 flex-1">
                                    <span className="text-orange-200 font-medium">類型：</span>
                                    <span className="ml-2">{drawnCards[0].card.detailedInterpretation.energyFlow.type}</span>
                                  </p>
                                </div>
                                <div className="bg-slate-900/40 rounded-lg p-4 mt-3 border border-orange-500/20">
                                  <p className="text-orange-100/80 leading-relaxed text-sm">
                                    {drawnCards[0].card.detailedInterpretation.energyFlow.description}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-900/30 rounded-xl p-6 border border-orange-500/20">
                              <h3 className="text-orange-300 text-lg font-medium mb-4 tracking-wide flex items-center gap-2">
                                <span className="font-serif text-xl text-orange-400 mr-1 tracking-[0.1em]">三</span>
                                時間感（很多人忽略）
                              </h3>
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <span className="text-orange-400 font-bold text-lg">•</span>
                                  <p className="text-orange-100/90 flex-1">
                                    <span className="text-orange-200 font-medium">速度：</span>
                                    <span className="ml-2">{drawnCards[0].card.detailedInterpretation.timing.speed}</span>
                                  </p>
                                </div>
                                <div className="bg-slate-900/40 rounded-lg p-4 mt-3 border border-orange-500/20">
                                  <p className="text-orange-100/80 leading-relaxed text-sm">
                                    {drawnCards[0].card.detailedInterpretation.timing.description}
                                  </p>
                                </div>
                                <p className="text-orange-200/60 text-xs mt-2">可以回答：「多久會發生？」</p>
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl border-l-2 border-l-red-500/70">
                              <h3 className="text-orange-200 text-lg font-medium mb-4 tracking-wide flex items-center gap-2">
                                <span className="font-serif text-xl text-orange-400 mr-1 tracking-[0.1em]">四</span>
                                建議行動（最重要！）
                              </h3>
                              <div className="bg-slate-900 p-5 border border-orange-500/20">
                                <p className="text-orange-100/90 leading-relaxed">
                                  {drawnCards[0].isReversed
                                    ? drawnCards[0].card.detailedInterpretation.advice.reversed
                                    : drawnCards[0].card.detailedInterpretation.advice.upright
                                  }
                                </p>
                              </div>
                              <p className="text-orange-200/60 text-xs mt-3">不給建議 = 客人覺得不準</p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-900/20 to-orange-900/20 rounded-xl p-6 border border-orange-500/30">
                              <h3 className="text-orange-200 text-lg font-medium mb-4 tracking-wide flex items-center gap-2">
                                <span className="font-serif text-xl text-orange-400 mr-1 tracking-[0.1em]">五</span>
                                脈輪 / 能量解讀
                              </h3>
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <span className="text-orange-400 font-bold text-lg">•</span>
                                  <p className="text-orange-100/90 flex-1">
                                    <span className="text-orange-200 font-medium">對應脈輪：</span>
                                    <span className="ml-2">{drawnCards[0].card.detailedInterpretation.chakra.primary}</span>
                                  </p>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-orange-400 font-bold text-lg">•</span>
                                  <p className="text-orange-100/90 flex-1">
                                    <span className="text-orange-200 font-medium">能量問題：</span>
                                    <span className="ml-2">{drawnCards[0].card.detailedInterpretation.chakra.issue}</span>
                                  </p>
                                </div>
                                <div className="bg-orange-950/30 rounded-lg p-4 mt-3 border border-orange-500/20">
                                  <p className="text-orange-100/80 leading-relaxed text-sm">
                                    {drawnCards[0].card.detailedInterpretation.chakra.healingNote}
                                  </p>
                                </div>
                              </div>
                              <p className="text-orange-200/60 text-xs mt-3">脈輪問題直接找韋德老師水晶療癒</p>
                            </div>

                            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl">
                              <h3 className="text-orange-200 text-lg font-medium mb-4 tracking-wide flex items-center gap-2">
                                <span className="font-serif text-xl text-orange-400 mr-1 tracking-[0.1em]">六</span>
                                高我訊息 / 靈魂提醒
                              </h3>
                              <div className="bg-slate-900/40 rounded-lg p-5 border border-orange-500/30">
                                <p className="text-orange-100/90 leading-relaxed italic">
                                  {drawnCards[0].isReversed
                                    ? drawnCards[0].card.detailedInterpretation.soulMessage.reversed
                                    : drawnCards[0].card.detailedInterpretation.soulMessage.upright
                                  }
                                </p>
                              </div>
                              <p className="text-orange-200/60 text-xs mt-3">這是「升維版本」</p>
                            </div>

                            <ResonanceCTA />
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="bg-slate-900/30 rounded-xl p-6 border border-orange-500/20 relative">
                          <h3 className="text-orange-300 text-lg font-medium mb-3 tracking-wide">
                            {drawnCards[0].isReversed ? '逆位含義' : '正位含義'}
                          </h3>
                          <p className="leading-relaxed text-orange-100/90">
                            {isUnlocked
                              ? (drawnCards[0].isReversed ? drawnCards[0].card.reversedMeaning : drawnCards[0].card.uprightMeaning)
                              : getPreviewText(drawnCards[0].isReversed ? drawnCards[0].card.reversedMeaning : drawnCards[0].card.uprightMeaning)
                            }
                          </p>
                          {!isUnlocked && (
                            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none rounded-b-lg"></div>
                          )}
                        </div>
                        {!isUnlocked && (
                          <InlineEmailUnlock
                            onUnlocked={handleEmailSubmitted}
                            readingType="tarot_single"
                            theme="dark"
                            cardUnlock={{
                              spread_id: 'tarot_single',
                              card_key: drawnCards[0].preview.card_key,
                              reversed: drawnCards[0].isReversed,
                            }}
                            cardData={{
                              cardName: drawnCards[0].card.name,
                              cardNameChinese: drawnCards[0].card.nameChinese,
                              isReversed: drawnCards[0].isReversed,
                            }}
                          />
                        )}
                        {isUnlocked && <ResonanceCTA />}
                      </>
                    )}

                    {!isUnlocked && <TarotCourseCTA />}
                  </div>
                </div>
              )}

              {spreadType === 'three' && (
                <div className="space-y-8">
                  <div className="text-center mb-8 animate-fade-in">
                    <h2 className="text-3xl font-serif text-orange-100 mb-2">三張牌陣解讀</h2>
                    <p className="text-orange-200/70">過去 - 現在 - 未來</p>
                  </div>

                  <>
                    {unlockError && (
                      <div className="border border-red-500/45 bg-red-500/10 px-4 py-3 mb-5 text-sm text-orange-100 tracking-wide text-center">
                        {unlockError}
                      </div>
                    )}
                    <PaywallGate
                      spreadName="塔羅三張牌陣"
                      spreadId="tarot_three"
                      onUnlock={handleMockUnlock}
                      isPaid={isLocallyUnlocked}
                      picks={drawnCards.map((d, i) => ({
                        card_key: d.preview.card_key,
                        position: i + 1,
                        reversed: d.isReversed,
                      }))}
                      previewContent={
                        <div className="grid md:grid-cols-3 gap-6">
                          {drawnCards.map((drawn, index) => (
                            <div key={index} className="bg-slate-900 border-2 border-orange-500/40 rounded-2xl p-6 shadow-xl">
                              <h3 className="text-center text-xl font-serif text-orange-200 mb-4">{index === 0 ? '過去' : index === 1 ? '現在' : '未來'}</h3>
                              {drawn.isReversed && <div className="text-center mb-3"><span className="inline-block px-3 py-1 bg-orange-600/80 rounded-full text-xs border border-orange-400/50">逆位</span></div>}
                              <h4 className="text-lg font-serif text-orange-100 text-center mb-2">{drawn.card.nameChinese}</h4>
                              <p className="text-sm text-orange-200/60 text-center mb-3">{drawn.card.name}</p>
                              <div className="bg-slate-900/30 rounded-lg p-4 border border-orange-500/20">
                                <p className="text-sm leading-relaxed">
                                  {drawn.isReversed ? drawn.card.reversedMeaning : drawn.card.uprightMeaning}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      }
                      fullContent={
                        <div className="space-y-8">
                          <div className="grid md:grid-cols-3 gap-6">
                            {drawnCards.map((drawn, index) => (
                              <div key={index} className={`bg-slate-900 border-2 border-orange-500/40 rounded-2xl p-6 shadow-xl transition-all duration-500 ${drawn.revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <h3 className="text-center text-xl font-serif text-orange-200 mb-4">{index === 0 ? '過去' : index === 1 ? '現在' : '未來'}</h3>
                                {drawn.isReversed && <div className="text-center mb-3"><span className="inline-block px-3 py-1 bg-orange-600/80 rounded-full text-xs border border-orange-400/50">逆位</span></div>}
                                <h4 className="text-lg font-serif text-orange-100 text-center mb-2">{drawn.card.nameChinese}</h4>
                                <p className="text-sm text-orange-200/60 text-center mb-3">{drawn.card.name}</p>
                                <div className="bg-slate-900/30 rounded-lg p-4 border border-orange-500/20">
                                  <p className="text-sm leading-relaxed">{drawn.isReversed ? drawn.card.reversedMeaning : drawn.card.uprightMeaning}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {allCardsRevealed && (
                            <div className="bg-slate-900 border-2 border-orange-500/40 rounded-3xl p-8 shadow-2xl">
                              <h3 className="text-2xl font-serif text-orange-100 mb-6 text-center">整體解讀</h3>
                              <div className="space-y-6">
                                <div className="bg-slate-900/30 rounded-xl p-6 border border-orange-500/20">
                                  <h4 className="text-orange-200 font-semibold mb-3">時間軸能量流動</h4>
                                  <p className="text-orange-100/90 leading-relaxed mb-4">
                                    從過去到未來的能量流動顯示了你生命的重要轉折。過去的{drawnCards[0].card.nameChinese}帶來的經驗與學習，正在現在的{drawnCards[1].card.nameChinese}中展現，而未來的{drawnCards[2].card.nameChinese}則指引著你前進的方向。
                                  </p>
                                  <p className="text-orange-100/90 leading-relaxed">這三張牌共同訴說著一個完整的故事，提醒你如何從過去的經驗中學習，在當下做出最佳選擇，並為未來創造你想要的可能性。</p>
                                </div>
                                <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl">
                                  <h4 className="text-orange-200 font-semibold mb-3">行動建議</h4>
                                  <p className="text-orange-100/90 leading-relaxed">接納過去的自己，活在當下的覺知中，同時保持對未來的開放態度。讓這三個時間點的智慧在你心中整合，引導你走向更完整的自己。</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    />
                    </>
                </div>
              )}

              {spreadType === 'pastlife' && (
                <div className="space-y-10 animate-fade-in">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-serif text-orange-100 mb-3 tracking-wide">前世因果解鎖陣</h2>
                    <p className="text-orange-200/80 text-lg leading-relaxed max-w-3xl mx-auto">你的靈魂記得所有的故事。<br/>這些牌卡將為你揭開前世今生的因果連結，帶你走向真正的釋放與療癒。</p>
                  </div>

                  <>
                    {unlockError && (
                      <div className="border border-red-500/45 bg-red-500/10 px-4 py-3 mb-5 text-sm text-orange-100 tracking-wide text-center">
                        {unlockError}
                      </div>
                    )}
                    <PaywallGate
                      spreadName="塔羅前世因果解鎖陣"
                      spreadId="tarot_pastlife"
                      onUnlock={handleMockUnlock}
                      isPaid={isLocallyUnlocked}
                      picks={drawnCards.map((d, i) => ({
                        card_key: d.preview.card_key,
                        position: i + 1,
                        reversed: d.isReversed,
                      }))}
                      previewContent={
                        <div className="space-y-6">
                          {drawnCards.slice(0, 2).map((drawn, index) => {
                            const positionGuide = getPastLifePositionGuide(index);
                            const cardMeaning = drawn.isReversed ? drawn.card.reversedMeaning : drawn.card.uprightMeaning;
                            const interpretationText = positionGuide.guideText(cardMeaning, undefined);
                            return (
                              <div key={index} className="bg-slate-900 border-2 border-orange-500/40 rounded-3xl p-6 md:p-8 shadow-2xl">
                                <div className="flex flex-col md:flex-row gap-6">
                                  <div className="md:w-1/3">
                                    <div className="flex items-center gap-3 mb-4">
                                      <span className="flex items-center justify-center w-12 h-12 bg-orange-600/50 rounded-full text-xl font-bold border-2 border-orange-400/50">{index + 1}</span>
                                      <div><h3 className="text-xl font-serif text-orange-100">{positionGuide.sectionTitle}</h3><p className="text-sm text-orange-200/60">{drawn.position}</p></div>
                                    </div>
                                    <div className="bg-slate-900/40 rounded-xl p-4 border border-orange-500/30">
                                      {drawn.isReversed && <div className="text-center mb-2"><span className="inline-block px-3 py-1 bg-orange-600/80 rounded-full text-xs border border-orange-400/50">逆位</span></div>}
                                      <h4 className="text-lg font-serif text-orange-100 mb-1 text-center">{drawn.card.nameChinese}</h4>
                                      <p className="text-xs text-orange-200/60 text-center">{drawn.card.name}</p>
                                    </div>
                                  </div>
                                  <div className="md:w-2/3">
                                    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl">
                                      <h4 className="text-orange-200 text-lg font-medium mb-4">靈魂訊息（預覽）</h4>
                                      <p className="text-orange-100/90 leading-relaxed">{interpretationText.slice(0, Math.floor(interpretationText.length * 0.3)) + '...'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      }
                      fullContent={
                        <div className="space-y-6">
                          {drawnCards.map((drawn, index) => {
                            const positionGuide = getPastLifePositionGuide(index);
                            const cardMeaning = drawn.isReversed ? drawn.card.reversedMeaning : drawn.card.uprightMeaning;
                            const interpretationText = positionGuide.guideText(cardMeaning, undefined);
                            const hasHook = positionGuide.emotionalHook;
                            return (
                              <div key={index} className={`bg-slate-900 border-2 border-orange-500/40 rounded-3xl p-6 md:p-8 shadow-2xl transition-all duration-500 ${drawn.revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <div className="flex flex-col md:flex-row gap-6">
                                  <div className="md:w-1/3">
                                    <div className="flex items-center gap-3 mb-4">
                                      <span className="flex items-center justify-center w-12 h-12 bg-orange-600/50 rounded-full text-xl font-bold border-2 border-orange-400/50">{index + 1}</span>
                                      <div><h3 className="text-xl font-serif text-orange-100">{positionGuide.sectionTitle}</h3><p className="text-sm text-orange-200/60">{drawn.position}</p></div>
                                    </div>
                                    <div className="bg-slate-900/40 rounded-xl p-4 border border-orange-500/30">
                                      {drawn.isReversed && <div className="text-center mb-2"><span className="inline-block px-3 py-1 bg-orange-600/80 rounded-full text-xs border border-orange-400/50">逆位</span></div>}
                                      <h4 className="text-lg font-serif text-orange-100 mb-1 text-center">{drawn.card.nameChinese}</h4>
                                      <p className="text-xs text-orange-200/60 text-center">{drawn.card.name}</p>
                                    </div>
                                  </div>
                                  <div className="md:w-2/3">
                                    {hasHook && <div className="mb-4 bg-slate-800 rounded-xl p-4 border-2 border-orange-400/50"><p className="text-orange-100 font-medium leading-relaxed">{positionGuide.emotionalHook}</p></div>}
                                    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl">
                                      <h4 className="text-orange-200 text-lg font-medium mb-4 flex items-center gap-2"><span className="text-2xl">{positionGuide.sectionTitle.split(' ')[0]}</span><span>靈魂訊息</span></h4>
                                      <div className="prose prose-invert max-w-none">
                                        {interpretationText.split('\n\n').map((paragraph, pIndex) => (
                                          <p key={pIndex} className="text-orange-100/90 leading-relaxed mb-4 last:mb-0">{paragraph}</p>
                                        ))}
                                      </div>
                                    </div>
                                    {index === 6 && <div className="mt-4 bg-slate-800/60 rounded-xl p-5 border-2 border-orange-400/40"><p className="text-orange-100 leading-relaxed text-sm"><span className="font-semibold text-orange-200">💫 療癒提醒：</span>如果這段解讀讓你深有感觸，代表這股能量確實影響著你。我可以幫你進一步做能量調整，加速這段因果的釋放。當能量被釋放，你的人生會開始出現不同的選擇。</p></div>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      }
                    />
                    </>
                </div>
              )}

              {spreadType === 'celtic' && (
                <div className="space-y-8">
                  <div className="text-center mb-8 animate-fade-in">
                    <h2 className="text-3xl font-serif text-orange-100 mb-2">凱爾特十字牌陣</h2>
                    <p className="text-orange-200/70">深度全面的生命解讀</p>
                  </div>

                  <>
                    {unlockError && (
                      <div className="border border-red-500/45 bg-red-500/10 px-4 py-3 mb-5 text-sm text-orange-100 tracking-wide text-center">
                        {unlockError}
                      </div>
                    )}
                    <PaywallGate
                      spreadName="塔羅凱爾特十字牌陣"
                      spreadId="tarot_celtic"
                      onUnlock={handleMockUnlock}
                      isPaid={isLocallyUnlocked}
                      picks={drawnCards.map((d, i) => ({
                        card_key: d.preview.card_key,
                        position: i + 1,
                        reversed: d.isReversed,
                      }))}
                      previewContent={
                        <div className="space-y-6">
                          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-orange-200 text-lg font-medium mb-4 flex items-center gap-2">
                              <Sparkles className="w-5 h-5" />
                              解牌閱讀小提醒
                            </h3>
                            <div className="space-y-3 text-orange-100/90 text-sm leading-relaxed">
                              <p className="flex items-start gap-2">
                                <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                                <span><strong className="text-orange-200">第 1、5、10 張牌</strong> 是這次占卜的三個主軸，它們幫助你看清現在的位置、內在期待，以及整體走向。</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                                <span><strong className="text-orange-200">第 2 張牌</strong> 顯示影響你最深的能量干擾點，可能是阻礙，也可能是你尚未意識到的關鍵推力。</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                                <span><strong className="text-orange-200">第 3 張牌</strong> 往往是最容易被忽略，卻最接近事情真正原因的一張牌。</span>
                              </p>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {drawnCards.slice(0, 3).map((drawn, index) => {
                              const positions = ['當前狀況', '挑戰/障礙', '根源/過去'];
                              return (
                                <div key={index} className="bg-slate-900 border-2 border-orange-500/40 rounded-2xl p-6 shadow-xl">
                                  <div className="flex items-center gap-2 mb-4">
                                    <span className="flex items-center justify-center w-8 h-8 bg-orange-600/50 rounded-full text-sm font-bold border border-orange-400/50">{index + 1}</span>
                                    <h3 className="text-lg font-serif text-orange-200">{positions[index]}</h3>
                                  </div>
                                  {drawn.isReversed && (
                                    <div className="text-center mb-3">
                                      <span className="inline-block px-3 py-1 bg-orange-600/80 rounded-full text-xs border border-orange-400/50">逆位</span>
                                    </div>
                                  )}
                                  <h4 className="text-base font-serif text-orange-100 text-center mb-1">{drawn.card.nameChinese}</h4>
                                  <p className="text-xs text-orange-200/60 text-center mb-3">{drawn.card.name}</p>
                                  <div className="bg-slate-900/30 rounded-lg p-3 border border-orange-500/20">
                                    <p className="text-xs leading-relaxed">
                                      {drawn.isReversed ? drawn.card.reversedMeaning : drawn.card.uprightMeaning}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      }
                      fullContent={
                        <div className="space-y-6">
                          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-orange-200 text-lg font-medium mb-4 flex items-center gap-2">
                              <Sparkles className="w-5 h-5" />
                              解牌閱讀小提醒
                            </h3>
                            <div className="space-y-3 text-orange-100/90 text-sm leading-relaxed">
                              <p className="flex items-start gap-2">
                                <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                                <span><strong className="text-orange-200">第 1、5、10 張牌</strong> 是這次占卜的三個主軸，它們幫助你看清現在的位置、內在期待，以及整體走向。</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                                <span><strong className="text-orange-200">第 2 張牌</strong> 顯示影響你最深的能量干擾點，可能是阻礙，也可能是你尚未意識到的關鍵推力。</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                                <span><strong className="text-orange-200">第 3 張牌</strong> 往往是最容易被忽略，卻最接近事情真正原因的一張牌。</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                                <span><strong className="text-orange-200">第 10 張牌</strong> 顯示的是目前狀態下的發展趨勢，並不是固定不變的命運結果。</span>
                              </p>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {drawnCards.map((drawn, index) => {
                              const positions = [
                                '當前狀況', '挑戰/障礙', '根源/過去', '近期過去', '可能未來',
                                '近期未來', '內在態度', '外在影響', '希望/恐懼', '最終結果'
                              ];
                              return (
                                <div key={index} className={`bg-slate-900 border-2 border-orange-500/40 rounded-2xl p-6 shadow-xl transition-all duration-500 ${drawn.revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                  <div className="flex items-center gap-2 mb-4">
                                    <span className="flex items-center justify-center w-8 h-8 bg-orange-600/50 rounded-full text-sm font-bold border border-orange-400/50">{index + 1}</span>
                                    <h3 className="text-lg font-serif text-orange-200">{positions[index]}</h3>
                                  </div>
                                  {drawn.isReversed && (
                                    <div className="text-center mb-3">
                                      <span className="inline-block px-3 py-1 bg-orange-600/80 rounded-full text-xs border border-orange-400/50">逆位</span>
                                    </div>
                                  )}
                                  <h4 className="text-base font-serif text-orange-100 text-center mb-1">{drawn.card.nameChinese}</h4>
                                  <p className="text-xs text-orange-200/60 text-center mb-3">{drawn.card.name}</p>
                                  <div className="bg-slate-900/30 rounded-lg p-3 border border-orange-500/20">
                                    <p className="text-xs leading-relaxed">
                                      {drawn.isReversed ? drawn.card.reversedMeaning : drawn.card.uprightMeaning}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {allCardsRevealed && (
                            <div className="bg-slate-900 border-2 border-orange-500/40 rounded-3xl p-8 shadow-2xl mt-4">
                              <h3 className="text-2xl font-serif text-orange-100 mb-6 text-center">整體解讀總結</h3>
                              <div className="space-y-6">
                                <div className="bg-slate-900/30 rounded-xl p-6 border border-orange-500/20">
                                  <h4 className="text-orange-200 font-semibold mb-3">生命全貌解析</h4>
                                  <p className="text-orange-100/90 leading-relaxed mb-4">
                                    十張牌共同編織出你生命狀態的完整圖像。當前的{drawnCards[0].card.nameChinese}顯示你所處的位置，
                                    而{drawnCards[1].card.nameChinese}揭示了你面臨的挑戰。根源的{drawnCards[2].card.nameChinese}
                                    指出了一切的起點，而最終的{drawnCards[9].card.nameChinese}則預示著可能的結果。
                                  </p>
                                  <p className="text-orange-100/90 leading-relaxed">
                                    這個牌陣不僅回答你的問題，更展現了問題背後的深層結構。它提醒你，每個當下都是過去累積與未來創造的交會點，
                                    而你永遠擁有選擇的力量。
                                  </p>
                                </div>
                                <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-orange-500/30 rounded-2xl p-6 shadow-xl">
                                  <h4 className="text-orange-200 font-semibold mb-3">行動建議</h4>
                                  <p className="text-orange-100/90 leading-relaxed">
                                    重視第1、5、10張牌的訊息，它們是你的三個主軸。同時深入理解第2張牌揭示的挑戰，
                                    以及第3張牌指出的根源。當你整合這些智慧，你將看見更清晰的道路。
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    />
                    </>
                </div>
              )}

              <TarotCourseCTA />

              {isMultiCardSpread && allCardsRevealed && (
                <TarotResonanceCTA />
              )}

              <div className="flex justify-center gap-4 animate-fade-in">
                <button
                  onClick={resetDraw}
                  className="group flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-orange-500/40 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="tracking-wide">重新抽牌</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <SocialLinksFooter />
      </div>

      <LoginPromptModal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} redirectTo="/tarot" />
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        spreadName={getSpreadName(spreadType)}
        spreadType={SPREAD_IDS[spreadType]}
      />
      <CrystalGridPromoModal show={showModal} onClose={handleClose} />
      <CrystalReminderBar isVisible={showReminder} onClose={handleReminderClose} />
    </div>
  );
}

function DeckSigil() {
  return (
    <svg viewBox="-30 -30 60 60" className="w-20 h-20 sm:w-24 sm:h-24" stroke="currentColor" fill="none">
      <circle r="27" strokeWidth="0.7" />
      <circle r="22" strokeWidth="0.4" opacity="0.5" strokeDasharray="0.4 1.5" />
      <path d="M 0 -17 L 14.7 8.5 L -14.7 8.5 Z" strokeWidth="1" />
      <path d="M 0 17 L -14.7 -8.5 L 14.7 -8.5 Z" strokeWidth="1" />
      <circle r="2" fill="currentColor" />
    </svg>
  );
}

export default TarotPage;
