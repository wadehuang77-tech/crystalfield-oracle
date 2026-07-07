import { useState, useEffect, useRef } from 'react';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock, RotateCcw } from 'lucide-react';
import { getPastLifePositionGuide } from '../utils/pastLifeInterpretation';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { CrystalReminderBar } from '../components/CrystalReminderBar';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { MembershipGate } from '../components/MembershipGate';
import { ResonanceCTA } from '../components/ResonanceCTA';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';
import { useDeck, pickRandomCards, unlockSpreadCards } from '../hooks/useDeck';
import { useSingleCardGate } from '../hooks/useSingleCardGate';
import { useMultiSpreadGate } from '../hooks/useMultiSpreadGate';
import { type CardPreview, type UnlockedCard, checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { formatPrice, getSpreadPrice } from '../lib/spread-prices';
import { consumePendingSingleDraw } from '../lib/pendingDraw';

type SpreadType = 'single' | 'pastlife';

interface EgyptianGated {
  godStory: string;
  coreMeaning: string;
  coreEnergy: string;
  guidance: string;
  soulReminder: string;
  questions: string;
  energyFocus: string;
}

interface PastlifeSlot {
  preview: CardPreview;
  position: string;
  full: (EgyptianGated & { titleChinese: string; title: string; symbol: string }) | null;
}

const PASTLIFE_POSITIONS = [
  '前世身份能量',
  '前世關鍵事件',
  '帶來的影響',
  '今生呈現的問題',
  '重複的模式',
  '靈魂要釋放的',
  '解鎖與療癒方式',
];

function EgyptianGodsPage() {
  const navigate = useNavigate();
  const { cards: deck, error: deckError } = useDeck('egyptian_gods');
  const [searchParams] = useSearchParams();
  const initialSpread: SpreadType = searchParams.get('spread') === 'pastlife' ? 'pastlife' : 'single';
  const autoLayout = searchParams.get('spread') === 'pastlife';
  const [spreadType, setSpreadType] = useState<SpreadType>(initialSpread);
  const [singlePreview, setSinglePreview] = useState<CardPreview | null>(null);
  const [singleUnlocked, setSingleUnlocked] = useState<UnlockedCard | null>(null);
  const [pastlifeSlots, setPastlifeSlots] = useState<PastlifeSlot[]>([]);
  const [isPastlifeUnlocked, setIsPastlifeUnlocked] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showCardLayout, setShowCardLayout] = useState(autoLayout);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { showModal, showReminder, handleClose, handleReminderClose } = useCrystalPromo(hasDrawn && !isDrawing);
  const { trackEvent } = useConversionTracking();

  usePageView('egyptian_gods_single');

  useEffect(() => {
    if (!deck || singlePreview) return;
    const pending = consumePendingSingleDraw('egyptian_single');
    if (!pending) return;
    const preview = deck.find((c) => c.card_key === pending.card_key);
    if (!preview) return;
    setSpreadType('single');
    setShowCardLayout(true);
    setSinglePreview(preview);
    setSingleUnlocked(null);
    setHasDrawn(true);
  }, [deck, singlePreview]);

  const handleEmailSubmitted = (email: string, card?: UnlockedCard) => {
    singleGate.onEmailUnlocked(email, card);
    if (card) trackEvent('unlocked', {
      readingType: 'egyptian_gods_single',
      cardName: card.name,
      email,
    });
  };

  const drawCard = () => {
    if (!deck || deck.length === 0) return;
    setIsDrawing(true);
    setHasDrawn(false);
    setSingleUnlocked(null);
    setIsPastlifeUnlocked(false);
    setUnlockError(null);

    setTimeout(() => {
      if (spreadType === 'single') {
        const card = pickRandomCards(deck, 1)[0];
        setSinglePreview(card);
        trackEvent('card_drawn', {
          cardName: card.name,
          readingType: 'egyptian_gods_single',
        });
      } else {
        const drawn = pickRandomCards(deck, 7);
        setPastlifeSlots(drawn.map((preview, i) => ({
          preview,
          position: PASTLIFE_POSITIONS[i],
          full: null,
        })));
      }
      setIsDrawing(false);
      setHasDrawn(true);
    }, 1500);
  };

  const resetDraw = () => {
    setSinglePreview(null);
    setSingleUnlocked(null);
    setPastlifeSlots([]);
    setHasDrawn(false);
    setShowCardLayout(false);
    setIsPastlifeUnlocked(false);
    setUnlockError(null);
  };

  const handleBack = () => {
    if (showCardLayout || hasDrawn || isDrawing || singlePreview || pastlifeSlots.length > 0) {
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

  const restoreStartedRef = useRef(false);
  useEffect(() => {
    if (restoreStartedRef.current) return;
    const orderId = searchParams.get('order_id');
    const orderToken = searchParams.get('order_token');
    if (!orderId || !deck || deck.length === 0) return;
    restoreStartedRef.current = true;

    (async () => {
      try {
        const { order } = await checkoutApi.getOrder(orderId, orderToken);
        if (order.item_id !== 'egyptian_pastlife' || order.status !== 'paid' || !order.picks) {
          setUnlockError('無法還原此訂單(item_id/status/picks 不符)');
          return;
        }
        const slots = order.picks
          .map((p, i) => {
            const preview = deck.find((c) => c.card_key === p.card_key);
            if (!preview) return null;
            return { preview, position: PASTLIFE_POSITIONS[i], full: null };
          })
          .filter((s): s is PastlifeSlot => !!s);
        if (slots.length !== order.picks.length) {
          setUnlockError('牌組對不上,無法還原');
          return;
        }
        setSpreadType('pastlife');
        setShowCardLayout(true);
        setPastlifeSlots(slots);
        setHasDrawn(true);

        try {
          const picks = slots.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }));
          const unlocked = await unlockSpreadCards('egyptian_pastlife', picks, order.id, orderToken);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          setPastlifeSlots((prev) => prev.map((s) => {
            const u = byKey.get(s.preview.card_key);
            if (!u) return s;
            const previewSymbol = (s.preview.preview as { symbol?: string }).symbol ?? '';
            return {
              ...s,
              full: {
                ...(u.gated as EgyptianGated),
                titleChinese: u.name,
                title: u.name_secondary ?? '',
                symbol: previewSymbol,
              },
            };
          }));
          setIsPastlifeUnlocked(true);
        } catch (err) {
          setUnlockError(err instanceof Error ? err.message : '解鎖失敗,請稍後再試');
        }
      } catch (e) {
        setUnlockError(e instanceof Error ? `還原訂單失敗:${e.message}` : '還原訂單失敗');
      }
    })();
  }, [searchParams, deck]);

  const handleSpreadTypeChange = (newSpreadType: SpreadType) => {
    setSpreadType(newSpreadType);
    setShowCardLayout(true);
  };

  const handleCheckoutPastlife = async () => {
    if (isCheckingOut) return;
    setUnlockError(null);
    setIsCheckingOut(true);
    try {
      const checkoutPicks = pastlifeSlots.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }));
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder('egyptian_pastlife', checkoutPicks);
      if (admin_unlocked) { navigate(`/checkout/return?order_id=${encodeURIComponent(order_id)}`); return; }
      if (!ecpay) { setUnlockError('結帳資料缺失,請重試'); setIsCheckingOut(false); return; }
      submitToEcpay(ecpay, () => { setUnlockError('跳轉至綠界失敗'); setIsCheckingOut(false); });
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : '結帳失敗,請稍後再試');
      setIsCheckingOut(false);
    }
  };

  const singleGate = useSingleCardGate({
    spreadId: 'egyptian_single',
    cardKey: singlePreview?.card_key ?? null,
    enabled: !!(singlePreview && hasDrawn && spreadType === 'single' && !singleUnlocked),
  });

  useEffect(() => {
    if (singleGate.unlockedCard && !singleUnlocked) setSingleUnlocked(singleGate.unlockedCard);
  }, [singleGate.unlockedCard]);

  const pastlifePicks = hasDrawn && pastlifeSlots.length === 7 && spreadType === 'pastlife'
    ? pastlifeSlots.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }))
    : null;

  const pastlifeGate = useMultiSpreadGate({
    spreadId: 'egyptian_pastlife',
    picks: pastlifePicks,
    enabled: hasDrawn && pastlifeSlots.length === 7 && !isPastlifeUnlocked,
  });

  useEffect(() => {
    if (!pastlifeGate.unlockedCards || isPastlifeUnlocked) return;
    const byKey = new Map(pastlifeGate.unlockedCards.map((u: UnlockedCard) => [u.card_key, u]));
    setPastlifeSlots((prev) => prev.map((s) => {
      const u = byKey.get(s.preview.card_key);
      if (!u) return s;
      const previewSymbol = (s.preview.preview as { symbol?: string }).symbol ?? '';
      return {
        ...s,
        full: { ...(u.gated as EgyptianGated), titleChinese: u.name, title: u.name_secondary ?? '', symbol: previewSymbol },
      };
    }));
    setIsPastlifeUnlocked(true);
  }, [pastlifeGate.unlockedCards]);

  const singleGated = singleUnlocked?.gated as EgyptianGated | undefined;
  const isSingleUnlocked = !!singleGated;
  const singleSymbol = (singlePreview?.preview as { symbol?: string })?.symbol;

  const showIndex = !hasDrawn && !isDrawing && !showCardLayout;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-yellow-950 to-slate-900 text-white">

      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
        {deckError && <p className="text-center text-red-500 mb-6 text-sm tracking-wide">{deckError}</p>}

        {showIndex && (
          <>
            <section className="text-center pb-12">
              <div className="flex justify-center text-yellow-500 mb-8">
                <DeckSigil />
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl text-yellow-100 tracking-[0.25em] sm:tracking-[0.4em] mb-5">埃及神諭</h1>
              <p className="text-base sm:text-lg text-yellow-300/80 leading-loose tracking-wide max-w-md mx-auto">
                古文明的智慧迴響。<br />
                連結尼羅河彼岸的神聖指引。
              </p>
            </section>

            <section className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <SpreadChoice
                  onClick={() => handleSpreadTypeChange('single')}
                  sigil={<SingleSpreadSigil />}
                  title="單張神諭"
                  body="一張牌,直接的神性指引。"
                  cta="抽　牌"
                />
                <SpreadChoice
                  onClick={() => handleSpreadTypeChange('pastlife')}
                  sigil={<PastlifeSigil />}
                  title="前世因果解鎖陣"
                  body="七張牌交疊,揭開前世今生的因果連結。"
                  cta="展　陣"
                  price={800}
                />
              </div>
            </section>
          </>
        )}

        {showCardLayout && !isDrawing && !hasDrawn && (
          <section className="max-w-2xl mx-auto text-center py-8">
            <h2 className="font-serif text-3xl text-yellow-100 tracking-[0.3em] mb-5">準　備　抽　牌</h2>
            <p className="text-sm sm:text-base text-yellow-300/85 mb-12 leading-loose">
              {spreadType === 'pastlife'
                ? '七張牌將為你揭開前世今生的因果連結'
                : '閉上眼睛,專注於你的問題'}
            </p>
            <div className="flex justify-center mb-12 gap-3">
              {(spreadType === 'pastlife' ? Array.from({ length: 7 }) : Array.from({ length: 1 })).map((_, i) => (
                <div key={i} className={spreadType === 'pastlife' ? 'w-12 sm:w-16' : 'w-44 sm:w-56'}>
                  <div className="tarot-card-back">
                    <div className="text-yellow-500 opacity-70 scale-50 sm:scale-75">
                      <CardBackOrnament />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={drawCard} disabled={!deck || deck.length === 0} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-medium rounded-xl shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                抽　牌
              </button>
              <button onClick={resetDraw} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-yellow-500/30 rounded-xl hover:bg-slate-700/60 hover:border-yellow-400/50 transition-all text-yellow-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                返　回
              </button>
            </div>
          </section>
        )}

        {isDrawing && <CardShuffleAnimation message="神　祇　傳　遞　訊　息　中" />}

        {hasDrawn && spreadType === 'single' && singlePreview && (
          <section className="max-w-3xl mx-auto space-y-10">
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-yellow-500/30 rounded-2xl p-6 shadow-xl">
              <div className="text-center pb-8 border-b border-yellow-500/15">
                <div className="flex justify-center text-yellow-500 mb-6">
                  <DeckSigil />
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl text-yellow-100 mb-3 tracking-[0.25em]">
                  {singlePreview.name_secondary || singlePreview.name}
                </h2>
                {singlePreview.name_secondary && (
                  <p className="text-sm tracking-[0.32em] text-yellow-400/80">{singlePreview.name}</p>
                )}
              </div>

              <div className="pt-8 space-y-6">
                {singleSymbol && (
                  <div>
                    <h3 className="text-yellow-200 text-sm tracking-[0.4em] uppercase mb-3">牌 卡 象 徵</h3>
                    <p className="text-yellow-100/90 leading-loose whitespace-pre-line">{singleSymbol}</p>
                  </div>
                )}

                {!isSingleUnlocked && (
                  <>
                    <div>
                      <h3 className="text-yellow-200 text-sm tracking-[0.4em] uppercase mb-3">牌 面 訊 息</h3>
                      {singlePreview.preview_excerpt && (
                        <div className="relative">
                          <p className="text-yellow-100/90 leading-loose whitespace-pre-line">{singlePreview.preview_excerpt}</p>
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none" />
                        </div>
                      )}
                      <p className="mt-3 text-xs text-yellow-400/70 tracking-wide">
                        前 30% 預覽 — 留下 Email 解鎖完整解析
                      </p>
                    </div>
                    {singleGate.phase === 'loading' && (
                      <div className="text-center text-yellow-300/70 py-4 tracking-wider">解鎖中…</div>
                    )}
                    {singleGate.phase === 'email_gate' && (
                      <InlineEmailUnlock
                        onUnlocked={handleEmailSubmitted}
                        readingType="egyptian_gods_single"
                        theme="dark"
                        cardUnlock={{ spread_id: 'egyptian_single', card_key: singlePreview.card_key }}
                      />
                    )}
                    <MembershipGate
                      isOpen={singleGate.showMembership}
                      onClose={() => singleGate.setShowMembership(false)}
                      resumePath="/egyptian-gods?spread=single"
                      pendingSingleDraw={singlePreview ? {
                        spread_id: 'egyptian_single',
                        card_key: singlePreview.card_key,
                      } : undefined}
                    />
                  </>
                )}

                {isSingleUnlocked && singleGated && (
                  <>
                    <Section title="核心含意">{singleGated.coreMeaning}</Section>
                    <Section title="核心能量">{singleGated.coreEnergy}</Section>
                    <Section title="指引">{singleGated.guidance}</Section>
                    <Section title="靈魂提醒">{singleGated.soulReminder}</Section>
                    <Section title="可以問的問題">{singleGated.questions}</Section>
                    <Section title="能量重點">{singleGated.energyFocus}</Section>
                  </>
                )}
              </div>
            </div>

            {isSingleUnlocked ? <ResonanceCTA /> : <TarotCourseCTA />}

            <div className="flex justify-center">
              <button onClick={resetDraw} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-yellow-500/30 rounded-xl hover:bg-slate-700/60 hover:border-yellow-400/50 transition-all text-yellow-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                重　新　抽　牌
              </button>
            </div>
          </section>
        )}

        {hasDrawn && spreadType === 'pastlife' && pastlifeSlots.length === 7 && (
          <section className="max-w-4xl mx-auto space-y-10">
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl text-yellow-100 tracking-[0.3em] mb-4">前世因果解鎖陣</h2>
              <p className="text-sm sm:text-base text-yellow-300/80 leading-loose max-w-2xl mx-auto">
                你的靈魂記得所有的故事。<br />
                這些牌卡將揭開前世今生的因果連結,帶你走向真正的釋放與療癒。
              </p>
            </div>

            {!isPastlifeUnlocked && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {pastlifeSlots.map((slot, index) => {
                    const positionGuide = getPastLifePositionGuide(index);
                    return (
                      <div key={index} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-yellow-500/30 rounded-2xl p-6 shadow-xl !p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="chapter-glyph text-2xl shrink-0 w-9 h-9 flex items-center justify-center border border-yellow-500/40">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-yellow-200 text-sm tracking-[0.4em] uppercase text-xs">{positionGuide.sectionTitle}</p>
                            <p className="text-xs text-yellow-300/70 truncate">{slot.position}</p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-yellow-500/15">
                          <h4 className="deck-name text-base text-yellow-100 text-center mb-1">{slot.preview.name}</h4>
                          {slot.preview.name_secondary && (
                            <p className="text-xs text-yellow-400/80 tracking-wide text-center mb-3">{slot.preview.name_secondary}</p>
                          )}
                          {slot.preview.preview_excerpt && (
                            <div className="relative mt-2">
                              <p className="text-yellow-100/85 text-xs leading-loose whitespace-pre-line">
                                {slot.preview.preview_excerpt}
                              </p>
                              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none" />
                            </div>
                          )}
                          <p className="mt-2 text-[0.65rem] text-yellow-400/70 tracking-wide text-center">
                            前 30% 預覽
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {pastlifeGate.phase === 'loading' && (
                  <div className="text-center text-yellow-300/70 py-6 tracking-wider">解鎖中…</div>
                )}
                {pastlifeGate.phase === 'paywall' && (
                  <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-yellow-500/30 rounded-2xl p-6 shadow-xl text-center space-y-5">
                    <Lock className="w-10 h-10 text-yellow-500 mx-auto" strokeWidth={1.2} />
                    <h3 className="font-serif text-2xl text-yellow-100 tracking-[0.3em]">解鎖完整前世因果訊息</h3>
                    <p className="text-sm text-yellow-300/85 leading-loose max-w-md mx-auto">
                      解鎖七張牌的完整靈魂解讀,揭開你前世與今生的連結。
                    </p>
                    <p className="font-serif text-2xl text-yellow-200 tracking-[0.3em]">{formatPrice(getSpreadPrice('egyptian_pastlife') ?? 0)}</p>
                    {unlockError && <p className="text-red-500 text-sm">{unlockError}</p>}
                    <button onClick={handleCheckoutPastlife} disabled={isCheckingOut} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-medium rounded-xl shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isCheckingOut ? '跳　轉　至　綠　界…' : '立　即　解　鎖'}
                    </button>
                  </div>
                )}
              </>
            )}

            {isPastlifeUnlocked && (
              <div className="space-y-6">
                {pastlifeSlots.map((slot, index) => {
                  const positionGuide = getPastLifePositionGuide(index);
                  if (!slot.full) return null;
                  const interpretationText = positionGuide.guideText(slot.full.coreEnergy, slot.full.godStory);
                  return (
                    <div key={index} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-yellow-500/30 rounded-2xl p-6 shadow-xl">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="chapter-glyph text-2xl shrink-0 w-10 h-10 flex items-center justify-center border border-yellow-500/50">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-yellow-200 text-sm tracking-[0.4em] uppercase">{positionGuide.sectionTitle}</p>
                              <p className="text-xs text-yellow-300/70 mt-1">{slot.position}</p>
                            </div>
                          </div>
                          <div className="border-t border-yellow-500/15 pt-4">
                            <h4 className="deck-name text-lg text-yellow-100 text-center mb-1">{slot.full.titleChinese}</h4>
                            {slot.full.title && (
                              <p className="text-xs text-yellow-400/80 text-center tracking-wide mb-4">{slot.full.title}</p>
                            )}
                            {slot.full.symbol && (
                              <div className="mb-3">
                                <p className="text-xs text-yellow-400/85 tracking-[0.18em] mb-1">牌卡象徵</p>
                                <p className="text-xs text-yellow-200/85 leading-loose">{slot.full.symbol}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-yellow-400/85 tracking-[0.18em] mb-1">神的故事</p>
                              <p className="text-xs text-yellow-200/85 leading-loose">{slot.full.godStory}</p>
                            </div>
                          </div>
                        </div>

                        <div className="md:w-2/3">
                          {positionGuide.emotionalHook && (
                            <div className="mb-5 border-l-2 border-yellow-500/70 pl-4 py-1">
                              <p className="text-sm text-yellow-300/90 leading-loose">{positionGuide.emotionalHook}</p>
                            </div>
                          )}
                          <h4 className="text-yellow-200 text-sm tracking-[0.4em] uppercase mb-4">靈 魂 訊 息</h4>
                          <div className="text-yellow-100/90 leading-loose whitespace-pre-line">
                            {interpretationText.split('\n\n').map((paragraph, pIndex) => {
                              const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                              return (
                                <p key={pIndex} className="mb-4 last:mb-0">
                                  {parts.map((part, partIndex) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                      return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
                                    }
                                    return part;
                                  })}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <ResonanceCTA />
              </div>
            )}

            <TarotCourseCTA />

            <div className="flex justify-center pt-4">
              <button onClick={resetDraw} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-yellow-500/30 rounded-xl hover:bg-slate-700/60 hover:border-yellow-400/50 transition-all text-yellow-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                重　新　抽　牌
              </button>
            </div>
          </section>
        )}

      </div>

      <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />
      <CrystalReminderBar isVisible={showReminder} onClose={handleReminderClose} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <ArrowRight className="w-3 h-3 text-yellow-500" strokeWidth={1.6} />
        <h3 className="text-yellow-200 text-sm tracking-[0.4em] uppercase">{title}</h3>
      </div>
      <p className="text-yellow-100/90 leading-loose whitespace-pre-line pl-6">{children}</p>
    </div>
  );
}

function SpreadChoice({
  onClick, sigil, title, body, cta, price,
}: {
  onClick: () => void; sigil: React.ReactNode; title: string;
  body: string; cta: string; price?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-yellow-500/30 rounded-2xl p-5 sm:p-6 shadow-xl group text-left transition-all duration-300 hover:border-yellow-500/70 hover:-translate-y-1 min-h-[15rem] sm:min-h-[18rem]"
    >
      <div className="flex flex-col items-center text-center h-full">
        <div className="text-yellow-500 mb-4 sm:mb-6 transition-transform duration-500 group-hover:rotate-12 scale-90 sm:scale-100">
          {sigil}
        </div>
        <h2 className="font-serif text-xl sm:text-2xl text-yellow-100 tracking-[0.25em] sm:tracking-[0.3em] mb-2 sm:mb-3">{title}</h2>
        <p className="text-xs sm:text-sm text-yellow-300/80 leading-loose max-w-xs mb-2 sm:mb-3">{body}</p>
        {price !== undefined ? (
          <p className="font-serif text-sm sm:text-base text-yellow-300 tracking-[0.2em] sm:tracking-[0.25em] mb-6 sm:mb-8">NT$ {price}</p>
        ) : (
          <p className="font-serif text-sm sm:text-base text-yellow-300 tracking-[0.3em] sm:tracking-[0.35em] mb-6 sm:mb-8">免　費</p>
        )}
        <span className="mt-auto inline-flex items-center gap-2 px-5 py-2 border border-yellow-500/50 bg-yellow-500/10 rounded-lg text-xs tracking-[0.35em] sm:tracking-[0.4em] text-yellow-200 transition-all duration-300 group-hover:bg-yellow-500/25 group-hover:border-yellow-400/70 group-hover:translate-x-1">
          {cta}
          <ArrowRight className="w-4 h-4" strokeWidth={1.4} />
        </span>
      </div>
    </button>
  );
}

function DeckSigil() {
  return (
    <svg viewBox="-30 -30 60 60" className="w-20 h-20 sm:w-24 sm:h-24" stroke="currentColor" fill="none">
      <circle r="27" strokeWidth="0.7" />
      <circle r="22" strokeWidth="0.4" opacity="0.5" strokeDasharray="0.4 1.5" />
      <path d="M -16 0 Q 0 -10 16 0 Q 0 10 -16 0 Z" strokeWidth="1" />
      <circle r="4.5" fill="currentColor" />
      <path d="M -16 0 Q -16 8 -10 12" strokeWidth="0.9" />
      <path d="M 14 4 L 18 8" strokeWidth="0.9" />
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

function PastlifeSigil() {
  return (
    <svg viewBox="-40 -40 80 80" className="w-16 h-16" stroke="currentColor" fill="none">
      {[
        { x: -28, y: 0, r: -12 },
        { x: -16, y: -4, r: -6 },
        { x: -4, y: -8, r: 0 },
        { x: 8, y: -10, r: 4 },
        { x: 18, y: -6, r: 8 },
        { x: 26, y: 0, r: 12 },
      ].map((card, i) => (
        <g key={i} transform={`translate(${card.x}, ${card.y}) rotate(${card.r})`}>
          <rect x="-5" y="-12" width="10" height="22" strokeWidth="0.7" fill="#07091a" />
        </g>
      ))}
      <g transform={`translate(0, 12)`}>
        <rect x="-7" y="-10" width="14" height="22" strokeWidth="1.1" fill="#07091a" />
        <circle cx="0" cy="1" r="2.5" fill="currentColor" />
      </g>
    </svg>
  );
}

function CardBackOrnament() {
  return (
    <svg viewBox="-30 -30 60 60" className="w-20 h-20" stroke="currentColor" fill="none">
      <circle r="22" strokeWidth="0.5" strokeDasharray="0.4 2" opacity="0.6" />
      <path d="M -16 0 Q 0 -10 16 0 Q 0 10 -16 0 Z" strokeWidth="0.8" />
      <circle r="3" fill="currentColor" />
    </svg>
  );
}

export default EgyptianGodsPage;
