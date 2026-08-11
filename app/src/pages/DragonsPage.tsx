import { useState, useEffect, useRef } from 'react';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { CrystalReminderBar } from '../components/CrystalReminderBar';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { MembershipGate } from '../components/MembershipGate';
import { ResonanceCTA } from '../components/ResonanceCTA';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { useDeck, pickRandomCards, unlockSpreadCards } from '../hooks/useDeck';
import { useSingleCardGate } from '../hooks/useSingleCardGate';
import { useMultiSpreadGate } from '../hooks/useMultiSpreadGate';
import { type CardPreview, type UnlockedCard, checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { getMultiSpreadCheckoutGuestEmail, saveMultiSpreadEmail } from '../lib/multiSpreadEmail';
import { formatPrice, getSpreadPrice } from '../lib/spread-prices';
import { consumePendingSingleDraw } from '../lib/pendingDraw';
import { useAuth } from '../contexts/AuthContext';
import ShareReadingSection from '../components/ShareReadingSection';

const DRAGON_THREE_CARD_PROMPTS = [
  '拖延不決的關係，只是在消耗你的靈魂。讓龍族的火焰，幫你斬斷不健康的能量連結。',
  '告別情感綁架與毒性關係！召喚龍族力量，拿回屬於你的內在主導權。',
  '最近總是莫名疲憊、運勢卡卡？讓龍族的烈火為你燒盡沉重氣場，還原清爽自己。',
  '深層淨化心靈死角，清除內在的恐懼與焦慮，重新啟動高頻能量。',
  '你需要的不只是安慰，而是破局的勇氣。龍族將賦予你突破現狀的強大力量。',
];

function DragonThreeCardIntro() {
  return (
    <div className="max-w-3xl mx-auto mb-10 rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-slate-900/85 to-emerald-500/10 px-5 py-6 sm:px-8 sm:py-7 shadow-[0_0_34px_rgba(251,146,60,0.14)]">
      <div className="space-y-4 text-left">
        {DRAGON_THREE_CARD_PROMPTS.map((prompt) => (
          <p key={prompt} className="flex items-start gap-3 text-base sm:text-lg leading-relaxed text-emerald-50/95">
            <Sparkles className="mt-1 h-4 w-4 shrink-0 text-amber-300" strokeWidth={1.5} />
            <span>{prompt}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

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
  const [showCardLayout, setShowCardLayout] = useState(initialSpread !== null);
  const [isThreeUnlocked, setIsThreeUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { showModal, showReminder, handleClose, handleReminderClose } = useCrystalPromo(hasDrawn && !isShuffling);
  const { trackEvent } = useConversionTracking();

  usePageView('dragons_single');

  useEffect(() => {
    if (!deck || singlePreview) return;
    const pending = consumePendingSingleDraw('dragons_single');
    if (!pending) return;
    const preview = deck.find((c) => c.card_key === pending.card_key);
    if (!preview) return;
    setSpreadType('single');
    setShowCardLayout(true);
    setSinglePreview(preview);
    setSingleUnlocked(null);
    setHasDrawn(true);
  }, [deck, singlePreview]);

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
    singleGate.onEmailUnlocked(email, card);
    if (card) trackEvent('unlocked', { readingType: 'dragons_single', cardName: card.name, email });
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
    if (isCheckingOut) return;
    const guestEmail = getMultiSpreadCheckoutGuestEmail();
    setUnlockError(null);
    setIsCheckingOut(true);
    try {
      const checkoutPicks = threeSlots.map((s, i) => ({
        card_key: s.preview.card_key,
        position: i + 1,
      }));
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(
        'dragons_three',
        checkoutPicks,
        !user ? { guest_email: guestEmail } : undefined,
      );
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
          const unlocked = await unlockSpreadCards('dragons_three', picks, order.id, orderToken);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          setThreeSlots((prev) => prev.map((s) => {
            const u = byKey.get(s.preview.card_key);
            if (!u) return s;
            const previewKw = (s.preview.preview as { keywords?: string[] }).keywords ?? [];
            return {
              ...s,
              full: {
                ...(u.gated as unknown as DragonGated),
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

  const singleGate = useSingleCardGate({
    spreadId: 'dragons_single',
    cardKey: singlePreview?.card_key ?? null,
    enabled: !!(singlePreview && hasDrawn && !singleUnlocked),
  });

  useEffect(() => {
    if (singleGate.unlockedCard) {
      setSingleUnlocked((current) => current ?? singleGate.unlockedCard);
    }
  }, [singleGate.unlockedCard]);

  const threePicks = hasDrawn && threeSlots.length > 0
    ? threeSlots.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }))
    : null;

  const threeGate = useMultiSpreadGate({
    spreadId: 'dragons_three',
    picks: threePicks,
    enabled: hasDrawn && threeSlots.length > 0 && !isThreeUnlocked,
  });

  useEffect(() => {
    if (!threeGate.unlockedCards) return;
    const byKey = new Map(threeGate.unlockedCards.map((u) => [u.card_key, u]));
    setThreeSlots((prev) => prev.map((s) => {
      const u = byKey.get(s.preview.card_key);
      if (!u) return s;
      const previewKw = (s.preview.preview as { keywords?: string[] }).keywords ?? [];
      return { ...s, full: { ...(u.gated as unknown as DragonGated), name: u.name, nameEn: u.name_secondary ?? '', keywords: previewKw } };
    }));
    setIsThreeUnlocked(true);
  }, [threeGate.unlockedCards]);

  const singleGated = singleUnlocked?.gated as unknown as DragonGated | undefined;
  const isSingleUnlocked = !!singleGated;
  const singlePreviewKw = (singlePreview?.preview as { keywords?: string[] })?.keywords ?? [];
  const handleThreeEmailSubmitted = async (email: string) => {
    await threeGate.onEmailUnlocked(email);
    saveMultiSpreadEmail(email);
  };

  const showIndex = !singlePreview && !isShuffling && threeSlots.length === 0 && !showCardLayout;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white">

      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
        {deckError && <p className="text-center text-red-500 mb-6 text-sm tracking-wide">{deckError}</p>}

        {showIndex && (
          <>
            <section className="text-center pb-12">
              <div className="flex justify-center text-emerald-500 mb-8">
                <DeckSigil />
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl text-emerald-100 tracking-[0.25em] sm:tracking-[0.4em] mb-5">龍族塔羅</h1>
              <div className="max-w-3xl mx-auto mb-8 rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-slate-900/85 to-emerald-500/10 px-5 py-6 sm:px-8 sm:py-8 text-left shadow-[0_0_34px_rgba(251,146,60,0.14)]">
                <h2 className="mb-6 text-center font-serif text-2xl sm:text-3xl leading-relaxed text-amber-100">
                  龍族能量清理｜斷除消耗，拿回屬於你的力量
                </h2>
                <div className="space-y-4 text-base sm:text-lg leading-loose text-emerald-50/90">
                  <p>你是不是正忍受著一段讓你不斷委屈、內耗的關係？</p>
                  <p>或是感覺最近氣場沉重，怎麼努力都跨不過眼前的僵局？</p>
                  <p>
                    龍族代表著最純粹的
                    <strong className="font-semibold text-amber-200">破局之火與神聖防護</strong>
                    。
                  </p>
                  <p>
                    祂們不說好聽的空話，而是以強大的能量協助你
                    <strong className="font-semibold text-amber-200">燒盡負面連結、斬斷毒性關係、重塑氣場</strong>
                    。
                  </p>
                  <p className="font-semibold text-amber-100">
                    是時候停止委屈自己了。在這裡，讓龍族的烈火為你開道！
                  </p>
                </div>

                <div className="mt-7 border-t border-amber-400/20 pt-6">
                  <h3 className="mb-5 text-center text-lg sm:text-xl font-semibold tracking-wide text-amber-100">
                    【龍族斷除與淨化三步驟】
                  </h3>
                  <ol className="space-y-4 text-sm sm:text-base leading-loose text-emerald-50/90">
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/50 bg-amber-500/15 font-semibold text-amber-200">1</span>
                      <p><strong className="text-amber-100">挺直脊椎，深胸呼吸</strong>：想像雙腳扎根大地，感受內在的堅定。</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/50 bg-amber-500/15 font-semibold text-amber-200">2</span>
                      <p><strong className="text-amber-100">在心中默想</strong>：「請龍族協助我清理（某段關係/某種焦慮），帶給我斬斷與突破的勇氣。」</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/50 bg-amber-500/15 font-semibold text-amber-200">3</span>
                      <p><strong className="text-amber-100">憑直覺選一張牌</strong>：接收專屬於你的龍族聖火指引與強大保護。</p>
                    </li>
                  </ol>
                </div>
              </div>
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
            <p className="text-sm sm:text-base text-emerald-300/85 mb-8 leading-loose">
              龍族將引領你看見過去、現在與未來的智慧連結
            </p>
            <DragonThreeCardIntro />

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
                抽 牌
              </button>
              <button onClick={reset} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-emerald-500/30 rounded-xl hover:bg-slate-700/60 hover:border-emerald-400/50 transition-all text-emerald-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                返 回
              </button>
            </div>
          </section>
        )}

        {isShuffling && <CardShuffleAnimation message="龍 族 火 焰 翻 湧 中" />}

        {threeSlots.length > 0 && hasDrawn && (
          <section className="max-w-3xl mx-auto space-y-10">
            <div className="text-center">
              <h2 className="font-serif text-3xl text-emerald-100 tracking-[0.3em] mb-3">過   現   未</h2>
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

                {threeGate.phase === 'loading' && (
                  <div className="text-center text-emerald-300/70 py-6 tracking-wider">解鎖中…</div>
                )}
                {threeGate.phase === 'email_gate' && (
                  <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-6 shadow-xl text-center space-y-5">
                    <Lock className="w-10 h-10 text-emerald-500 mx-auto" strokeWidth={1.2} />
                    <h3 className="font-serif text-2xl text-emerald-100 tracking-[0.2em]">首次免費試算・Email 解鎖</h3>
                    <p className="text-sm text-emerald-300/85 leading-loose max-w-md mx-auto">
                      輸入 Email 後可免費查看這個三張牌陣的完整解讀；同一牌陣第二次起需付費。
                    </p>
                    <InlineEmailUnlock
                      onUnlocked={(email) => { void handleThreeEmailSubmitted(email); }}
                      readingType="dragons_three"
                      theme="dark"
                    />
                  </div>
                )}
                {threeGate.phase === 'paywall' && (
                  <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-6 shadow-xl text-center space-y-5">
                    <Lock className="w-10 h-10 text-emerald-500 mx-auto" strokeWidth={1.2} />
                    <h3 className="font-serif text-2xl text-emerald-100 tracking-[0.3em]">解鎖完整龍族訊息</h3>
                    <p className="text-sm text-emerald-300/85 leading-loose max-w-md mx-auto">
                      展開三張牌的完整解讀,揭示過去、現在、未來的能量脈絡。
                    </p>
                    <p className="font-serif text-2xl text-emerald-200 tracking-[0.3em]">{formatPrice(getSpreadPrice('dragons_three') ?? 0)}</p>
                    {unlockError && <p className="text-red-500 text-sm">{unlockError}</p>}
                    <button onClick={handleUnlockThree} disabled={isCheckingOut} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isCheckingOut ? '跳 轉 至 綠 界…' : '立 即 解 鎖'}
                    </button>
                  </div>
                )}
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

            <ShareReadingSection
              deckId="dragons"
              deckName="龍族塔羅"
              spreadName="三張牌陣"
              cards={threeSlots.map((slot, index) => ({
                cardKey: slot.preview.card_key,
                name: slot.preview.name,
                position: ['過去', '現在', '未來'][index],
              }))}
              summary={threeSlots[0]?.preview.preview_excerpt || '龍族正在為你斬斷消耗，點燃突破現狀的勇氣。'}
            />

            <TarotCourseCTA />

            <div className="flex justify-center pt-4">
              <button onClick={reset} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-emerald-500/30 rounded-xl hover:bg-slate-700/60 hover:border-emerald-400/50 transition-all text-emerald-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                重 新 抽 牌
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
                    {singleGate.phase === 'loading' && (
                      <div className="text-center text-emerald-300/70 py-4 tracking-wider">解鎖中…</div>
                    )}
                    {singleGate.phase === 'email_gate' && (
                      <InlineEmailUnlock
                        onUnlocked={handleSingleEmailSubmitted}
                        readingType="dragons_single"
                        theme="dark"
                        cardUnlock={{ spread_id: 'dragons_single', card_key: singlePreview.card_key }}
                      />
                    )}
                    <MembershipGate
                      isOpen={singleGate.showMembership}
                      onClose={() => singleGate.setShowMembership(false)}
                      resumePath="/dragons?spread=single"
                      pendingSingleDraw={singlePreview ? {
                        spread_id: 'dragons_single',
                        card_key: singlePreview.card_key,
                      } : undefined}
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

            <ShareReadingSection
              deckId="dragons"
              deckName="龍族塔羅"
              spreadName="單張牌陣"
              cards={[{ cardKey: singlePreview.card_key, name: singlePreview.name }]}
              summary={singlePreview.preview_excerpt || '龍族正在為你斬斷消耗，點燃突破現狀的勇氣。'}
            />

            {isSingleUnlocked ? <ResonanceCTA /> : <TarotCourseCTA />}

            <div className="flex justify-center">
              <button onClick={reset} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-emerald-500/30 rounded-xl hover:bg-slate-700/60 hover:border-emerald-400/50 transition-all text-emerald-200">
                <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
                重 新 抽 牌
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



function DrawPrep({ onDraw, onCancel, disabled, hint }: { onDraw: () => void; onCancel: () => void; disabled: boolean; hint: string }) {
  return (
    <section className="max-w-2xl mx-auto text-center py-8">
      <h2 className="font-serif text-3xl text-emerald-100 tracking-[0.3em] mb-5">準 備 抽 牌</h2>
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
          抽 牌
        </button>
        <button onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-emerald-500/30 rounded-xl hover:bg-slate-700/60 hover:border-emerald-400/50 transition-all text-emerald-200">
          <RotateCcw className="w-4 h-4" strokeWidth={1.4} />
          返 回
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
