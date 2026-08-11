import { useState, useEffect, useRef } from 'react';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RotateCcw, Lock, Sparkles } from 'lucide-react';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { useDeck, pickRandomCards, unlockSpreadCards } from '../hooks/useDeck';
import { useMultiSpreadGate } from '../hooks/useMultiSpreadGate';
import { type CardPreview, type UnlockedCard, checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { getMultiSpreadCheckoutGuestEmail, saveMultiSpreadEmail } from '../lib/multiSpreadEmail';
import { formatPrice, getSpreadPrice } from '../lib/spread-prices';
import { useAuth } from '../contexts/AuthContext';
import ShareReadingSection from '../components/ShareReadingSection';

const SPREAD_ID = 'cosmic_cross';
const CARD_COUNT = 11;

const COSMIC_CROSS_LIGHT_PROMPTS = [
  '覺得自己不夠好、閃閃發不起來？點亮你內在沉睡已久的靈魂光芒。',
  '給習慣照顧別人的你：今天，把愛與注意力重新收回自己身上。',
  '擁抱你的脆弱與不完美！每一張卡片，都是宇宙寫給你的溫柔情書。',
  '感到孤單迷惘？你並不孤單，讓高頻光芒卡片陪伴你度過每一個低潮。',
  '呼喚你的靈魂光芒！點亮你今生的專屬天賦與星際記憶。',
];

function CosmicCrossLightIntro() {
  return (
    <div className="mb-8 rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-slate-900/85 to-orange-500/10 px-5 py-6 sm:px-8 sm:py-7 shadow-[0_0_34px_rgba(167,139,250,0.13)]">
      <div className="space-y-4 text-left">
        {COSMIC_CROSS_LIGHT_PROMPTS.map((prompt) => (
          <p key={prompt} className="flex items-start gap-3 text-base sm:text-lg leading-relaxed text-orange-50/95">
            <Sparkles className="mt-1 h-4 w-4 shrink-0 text-violet-300" strokeWidth={1.5} />
            <span>{prompt}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

interface CosmicGated {
  coreMeaning?: string;
  actionGuidance?: string | null;
  inquiryPrompt?: string | null;
  activationPrayer?: string | null;
  transmissionPrayer?: string | null;
  deepInterpretation?: {
    coreMeaning?: string;
    higherSelfMessage?: string;
    spiritualGuidance?: string;
    energyQualities?: string;
    suitableQuestions?: string;
  } | null;
}

interface DrawnSlot {
  preview: CardPreview;
  full: (CosmicGated & { titleChinese: string; title: string; suit?: string }) | null;
}

const positions = [
  { id: 1,  label: '目前現狀',          description: 'Where you are in present time',     englishShort: 'Present',       interpretation: '這張牌揭示你當下所站之處，照亮此刻的真實狀態。' },
  { id: 2,  label: '靈魂的召喚',        description: 'What your soul is calling you to do', englishShort: 'Soul Calling',   interpretation: '你的靈魂正透過這張牌向你低語，呼喚你踏上真正的使命之路。' },
  { id: 3,  label: '正在升起的能量',    description: 'What is rising in you',              englishShort: 'Rising',          interpretation: '內在深處有新的力量正在甦醒，這張牌顯示即將湧現的能量與品質。' },
  { id: 4,  label: '正在消逝的事物',    description: 'What is falling away',               englishShort: 'Falling Away',    interpretation: '這張牌溫柔地提示你，什麼正在從你的生命中離開。' },
  { id: 5,  label: '靈魂天賦',          description: 'Soul Gifts',                          englishShort: 'Soul Gifts',      interpretation: '你內在擁有獨特的光之禮物，這張牌揭示你靈魂深處的天賦與能力。' },
  { id: 6,  label: '正在顯化的事物',    description: 'What is being manifested',           englishShort: 'Manifesting',     interpretation: '宇宙正在回應你的振動頻率，這張牌顯示即將在你生命中具體顯現的事物。' },
  { id: 7,  label: '下一步',            description: 'The next step',                      englishShort: 'Next Step',       interpretation: '這張牌為你指出前方的道路，揭示此刻最需要採取的行動或態度。' },
  { id: 8,  label: '前世的影響',        description: 'Past-life influence',                englishShort: 'Past Life',       interpretation: '你的靈魂攜帶著跨越生世的記憶與智慧，這張牌揭示過去世的經驗如何影響當前的旅程。' },
  { id: 9,  label: '你需要知道的事',    description: 'What you need to know',              englishShort: 'Need to Know',    interpretation: '宇宙透過這張牌傳遞重要的訊息給你，揭示此刻最需要覺察的真理。' },
  { id: 10, label: '希望與恐懼',        description: 'Hopes and fears',                    englishShort: 'Hopes & Fears',   interpretation: '這張牌照亮你內心深處的渴望與恐懼。' },
  { id: 11, label: '潛在結果',          description: 'Potential outcome',                  englishShort: 'Outcome',         interpretation: '這張牌揭示如果你遵循當前的路徑，可能展開的未來景象。' },
];

function CosmicCrossPositionGuide() {
  return (
    <section className="mt-2 rounded-3xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 via-slate-900/80 to-violet-500/10 px-3 py-7 sm:px-8 sm:py-10 shadow-[0_0_34px_rgba(251,146,60,0.12)]">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs sm:text-sm tracking-[0.35em] text-orange-300/75">宇 宙 十 字 牌 陣</p>
        <h2 className="font-serif text-xl sm:text-3xl tracking-wide text-orange-100">11 張牌的代號與主旨</h2>
      </div>

      <div className="space-y-7 sm:space-y-10">
        <div className="grid grid-cols-6 gap-1.5 sm:gap-4">
          {positions.slice(0, 6).map((position) => (
            <CosmicCrossPositionCard key={position.id} position={position} />
          ))}
        </div>
        <div className="mx-auto grid w-5/6 grid-cols-5 gap-1.5 sm:gap-4">
          {positions.slice(6).map((position) => (
            <CosmicCrossPositionCard key={position.id} position={position} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CosmicCrossPositionCard({ position }: { position: (typeof positions)[number] }) {
  return (
    <div className="min-w-0 flex flex-col items-center text-center">
      <div className="relative w-full aspect-[2/3] rounded-md sm:rounded-xl border border-orange-300/35 bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 shadow-[0_10px_28px_-12px_rgba(249,115,22,0.6)] flex items-center justify-center overflow-visible">
        <div className="pointer-events-none absolute inset-1 sm:inset-2 rounded-[0.2rem] sm:rounded-lg border border-orange-300/15" />
        <span className="absolute -top-2 sm:-top-3 left-1/2 z-10 -translate-x-1/2 flex h-5 w-5 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-orange-200/70 bg-gradient-to-br from-orange-500 to-orange-700 text-[9px] sm:text-sm font-semibold text-white shadow-lg">
          {position.id}
        </span>
        <Sparkles className="h-3.5 w-3.5 sm:h-7 sm:w-7 text-orange-300/45" strokeWidth={1.2} />
      </div>
      <p className="mt-2 sm:mt-3 min-h-[2.25rem] sm:min-h-[2.75rem] text-[9px] sm:text-sm leading-snug text-orange-100/90 break-words flex items-start justify-center">
        {position.label}
      </p>
    </div>
  );
}

function CosmicCrossPreviewCard({
  position,
  slot,
}: {
  position: (typeof positions)[number];
  slot: DrawnSlot;
}) {
  return (
    <article className="relative min-w-0 pt-4" data-cosmic-preview-card={position.id}>
      <span className="absolute left-1/2 top-0 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-orange-100/70 bg-orange-600 text-sm font-semibold text-white shadow-[0_0_18px_rgba(249,115,22,0.55)]">
        {position.id}
      </span>
      <div className="h-[28rem] overflow-hidden rounded-xl border border-orange-300/40 bg-slate-950 p-2 shadow-[0_14px_34px_-16px_rgba(249,115,22,0.7)]">
        <div
          className="h-full overflow-y-scroll rounded-lg border border-orange-300/20 bg-slate-900 px-3 pb-4 pt-7"
          style={{ scrollbarColor: '#fb923c rgba(15, 23, 42, 0.55)', scrollbarWidth: 'thin' }}
        >
          <div className="space-y-3 text-center">
            <div>
              <h3 className="font-serif text-base leading-snug text-orange-50">{position.label}</h3>
              <p className="mt-1 text-[0.68rem] leading-relaxed text-orange-200">{position.englishShort}</p>
              <p className="mt-1 text-[0.65rem] leading-relaxed text-orange-100">{position.description}</p>
            </div>
            <p className="border-t border-orange-300/25 pt-3 font-serif text-base leading-snug text-orange-50">
              {slot.preview.name}
            </p>
            <div className="space-y-2 text-left">
              <h4 className="text-center font-serif text-xs text-orange-100">牌義解讀（前 30% 預覽）</h4>
              {slot.preview.preview_excerpt ? (
                <p className="whitespace-pre-line text-xs leading-6 text-orange-50">
                  {slot.preview.preview_excerpt}
                </p>
              ) : (
                <p className="text-center text-xs leading-6 text-orange-50">解鎖後可查看完整牌義解讀</p>
              )}
              <p className="border-t border-orange-300/20 pt-2 text-center text-[0.62rem] leading-5 tracking-wide text-orange-200">
                前 30% 預覽・向下捲動閱讀
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function CosmicCrossPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { cards: deck, error: deckError } = useDeck('work_your_light');
  const [selectedCards, setSelectedCards] = useState<DrawnSlot[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { showModal, handleClose } = useCrystalPromo(hasDrawn && selectedCards.length === CARD_COUNT);

  const drawCards = () => {
    if (!deck || deck.length < CARD_COUNT) return;

    setIsDrawing(true);
    setHasDrawn(false);
    setIsLocallyUnlocked(false);
    setUnlockError(null);

    setTimeout(() => {
      const drawn = pickRandomCards(deck, CARD_COUNT);
      setSelectedCards(drawn.map((preview) => ({ preview, full: null })));
      setIsDrawing(false);
      setHasDrawn(true);
    }, 2000);
  };

  const resetDraw = () => {
    setSelectedCards([]);
    setHasDrawn(false);
    setIsLocallyUnlocked(false);
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
        if (order.item_id !== SPREAD_ID || order.status !== 'paid' || !order.picks) {
          setUnlockError('無法還原此訂單(item_id/status/picks 不符)');
          return;
        }
        const slots = order.picks
          .map((p) => deck.find((c) => c.card_key === p.card_key))
          .filter((c): c is CardPreview => !!c)
          .map((preview) => ({ preview, full: null as DrawnSlot['full'] }));
        if (slots.length !== order.picks.length) {
          setUnlockError('牌組對不上,無法還原');
          return;
        }
        setSelectedCards(slots);
        setHasDrawn(true);

        try {
          const picks = slots.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }));
          const unlocked = await unlockSpreadCards(SPREAD_ID, picks, order.id, orderToken);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          setSelectedCards((prev) => prev.map((s) => {
            const u = byKey.get(s.preview.card_key);
            if (!u) return s;
            const g = u.gated as CosmicGated;
            const previewSuit = (s.preview.preview as { suit?: string }).suit;
            return {
              ...s,
              full: { ...g, titleChinese: u.name, title: u.name_secondary ?? '', suit: previewSuit },
            };
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

  const handleCheckout = async () => {
    if (isCheckingOut) return;
    const guestEmail = getMultiSpreadCheckoutGuestEmail();
    setUnlockError(null);
    setIsCheckingOut(true);
    try {
      const checkoutPicks = selectedCards.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }));
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(
        SPREAD_ID,
        checkoutPicks,
        !user ? { guest_email: guestEmail } : undefined,
      );
      if (admin_unlocked) { navigate(`/checkout/return?order_id=${encodeURIComponent(order_id)}`); return; }
      if (!ecpay) { setUnlockError('結帳資料缺失,請重試'); setIsCheckingOut(false); return; }
      submitToEcpay(ecpay, () => { setUnlockError('跳轉至綠界失敗'); setIsCheckingOut(false); });
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : '結帳失敗,請稍後再試');
      setIsCheckingOut(false);
    }
  };

  const gatePicks = hasDrawn && selectedCards.length === CARD_COUNT
    ? selectedCards.map((s, i) => ({ card_key: s.preview.card_key, position: i + 1 }))
    : null;

  const gate = useMultiSpreadGate({
    spreadId: SPREAD_ID,
    picks: gatePicks,
    enabled: hasDrawn && !isLocallyUnlocked,
  });

  const handleEmailUnlock = async (email: string) => {
    await gate.onEmailUnlocked(email);
    saveMultiSpreadEmail(email);
  };

  useEffect(() => {
    if (!gate.unlockedCards) return;
    const byKey = new Map(gate.unlockedCards.map((u: UnlockedCard) => [u.card_key, u]));
    setSelectedCards((prev) => prev.map((s) => {
      const u = byKey.get(s.preview.card_key);
      if (!u) return s;
      const g = u.gated as CosmicGated;
      const previewSuit = (s.preview.preview as { suit?: string }).suit;
      return { ...s, full: { ...g, titleChinese: u.name, title: u.name_secondary ?? '', suit: previewSuit } };
    }));
    setIsLocallyUnlocked(true);
  }, [gate.unlockedCards]);

  const showFullContent = isLocallyUnlocked && selectedCards.every((s) => s.full !== null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950 to-slate-900 text-white relative overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6 py-12 min-h-screen">

        <header className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <svg className="w-20 h-20 text-orange-300 opacity-80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="50" cy="50" r="30" strokeWidth="2" />
              <path d="M 50 20 L 50 35 M 50 65 L 50 80 M 20 50 L 35 50 M 65 50 L 80 50" strokeWidth="3" />
              <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.6" />
              <path d="M 50 30 L 55 45 L 70 50 L 55 55 L 50 70 L 45 55 L 30 50 L 45 45 Z" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif mb-3 tracking-wide text-orange-100 drop-shadow-lg">
            宇宙十字牌陣
          </h1>
          <p className="text-xl md:text-2xl font-serif text-orange-200/90 mb-2">
            Cosmic Cross
          </p>
        </header>

        {deckError && <p className="text-center text-red-500 mb-6">{deckError}</p>}

        <div className="max-w-6xl mx-auto">
          {!hasDrawn && !isDrawing && (
            <>
              <CosmicCrossLightIntro />

              <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-8 mb-8 shadow-xl">
                <h2 className="text-2xl font-serif text-orange-100 mb-4 text-center">使用建議</h2>
                <div className="space-y-4 text-orange-100/90 leading-relaxed">
                  <p className="text-center text-lg">
                    在使用此牌陣前，作者建議先從內心深處提出你的問題，並想像這個祈禱在心中心發光。接著抽牌
                  </p>
                  <div className="bg-slate-900/40 rounded-xl p-6 border border-orange-500/20 mt-6">
                    <h3 className="text-orange-200 font-medium mb-3">準備步驟：</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2"><span className="text-orange-400 mt-1">•</span><span>找一個安靜的空間，深呼吸放鬆</span></li>
                      <li className="flex items-start gap-2"><span className="text-orange-400 mt-1">•</span><span>將問題清晰地在心中形成</span></li>
                      <li className="flex items-start gap-2"><span className="text-orange-400 mt-1">•</span><span>想像你的問題在心輪處發出光芒</span></li>
                      <li className="flex items-start gap-2"><span className="text-orange-400 mt-1">•</span><span>當你感到準備好時，點擊下方按鈕抽牌</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mb-12">
                <button
                  onClick={drawCards}
                  disabled={!deck || deck.length < CARD_COUNT}
                  className="group relative px-12 py-6 bg-gradient-to-r from-orange-600 to-orange-600 hover:from-orange-500 hover:to-orange-500 rounded-xl text-xl font-medium shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-400 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <span className="relative text-orange-100 tracking-wide">
                    {!deck || deck.length < CARD_COUNT ? '卡片資料載入中…' : '開始抽取 11 張牌'}
                  </span>
                </button>
              </div>

              <CosmicCrossPositionGuide />
            </>
          )}

          {isDrawing && <CardShuffleAnimation />}

          {hasDrawn && selectedCards.length === CARD_COUNT && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-serif text-orange-100 mb-3">你的宇宙十字牌陣</h2>
                <p className="text-orange-200/70 text-lg">Cosmic Cross Spread Reading</p>
              </div>

              {!showFullContent && (
                <div className="space-y-6">
                  <div className="space-y-8 sm:space-y-10">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
                      {positions.slice(0, 6).map((position, index) => (
                        <CosmicCrossPreviewCard key={position.id} position={position} slot={selectedCards[index]} />
                      ))}
                    </div>
                    <div className="mx-auto grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:w-5/6 lg:grid-cols-5">
                      {positions.slice(6).map((position, index) => (
                        <CosmicCrossPreviewCard key={position.id} position={position} slot={selectedCards[index + 6]} />
                      ))}
                    </div>
                  </div>

                  {gate.phase === 'loading' && (
                    <div className="text-center text-orange-300/70 py-6 tracking-wider">解鎖中…</div>
                  )}
                  {gate.phase === 'email_gate' && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-8 text-center shadow-2xl space-y-5">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500/30 to-orange-500/30 rounded-full flex items-center justify-center border-2 border-orange-400/40">
                          <Lock className="w-7 h-7 text-orange-300" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-serif text-orange-100 tracking-wide">首次免費試算・Email 解鎖</h3>
                      <p className="text-orange-200/80 text-base leading-relaxed max-w-md mx-auto">
                        輸入 Email 後可免費查看這個宇宙十字牌陣的完整解讀；同一牌陣第二次起需付費。
                      </p>
                      <InlineEmailUnlock
                        onUnlocked={(email) => { void handleEmailUnlock(email); }}
                        readingType={SPREAD_ID}
                        theme="dark"
                      />
                    </div>
                  )}
                  {gate.phase === 'paywall' && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-8 text-center shadow-2xl">
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500/30 to-orange-500/30 rounded-full flex items-center justify-center border-2 border-orange-400/40">
                          <Lock className="w-7 h-7 text-orange-300" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-serif text-orange-100 mb-3 tracking-wide">解鎖完整宇宙訊息</h3>
                      <p className="text-orange-200/80 text-base leading-relaxed mb-4 max-w-md mx-auto">
                        更深層的指引與靈魂訊息在後面。解鎖十一張牌的完整宇宙解讀。
                      </p>
                      <p className="font-serif text-2xl text-orange-200 tracking-[0.3em] mb-6">{formatPrice(getSpreadPrice(SPREAD_ID) ?? 0)}</p>
                      {unlockError && <p className="text-red-500 text-sm mb-4">{unlockError}</p>}
                      <button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="px-10 py-4 bg-gradient-to-r from-orange-500 to-orange-500 hover:from-orange-400 hover:to-orange-400 text-orange-100 font-bold rounded-xl text-lg shadow-xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {isCheckingOut ? '跳轉至綠界…' : '立即解鎖'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {showFullContent && (
                <>
                  <section className="rounded-2xl border-2 border-orange-400/45 bg-slate-900/75 px-5 py-6 shadow-[0_0_30px_rgba(249,115,22,0.12)] sm:px-8 sm:py-8">
                    <div className="mb-6 text-center">
                      <h3 className="font-serif text-2xl text-orange-100 sm:text-3xl">解牌閱讀小提醒</h3>
                      <p className="mt-2 text-sm text-orange-200/90 sm:text-base">
                        重點看以下 <strong className="text-orange-100">5 張關鍵牌</strong>：
                      </p>
                    </div>
                    <div className="grid gap-4 text-sm leading-relaxed text-orange-50 lg:grid-cols-2 sm:text-base">
                      <article className="rounded-xl border border-orange-400/20 bg-orange-950/20 p-5">
                        <h4 className="font-semibold text-orange-200">1. Card 1：核心議題（The Core / Current Energy）</h4>
                        <p className="mt-3"><strong className="text-orange-200">位置：</strong>牌陣中央最底層的基礎。</p>
                        <p className="mt-2"><strong className="text-orange-200">重點：</strong>代表你當前靈魂的核心狀態與當下正在經歷的主題。它是整個牌陣的基石，點出你此刻最需要覺察的能量焦點。</p>
                      </article>
                      <article className="rounded-xl border border-orange-400/20 bg-orange-950/20 p-5">
                        <h4 className="font-semibold text-orange-200">2. Card 2：阻礙與挑戰（The Challenge / What’s Blocking You）</h4>
                        <p className="mt-3"><strong className="text-orange-200">位置：</strong>橫跨在 Card 1 之上的交叉牌。</p>
                        <p className="mt-2"><strong className="text-orange-200">重點：</strong>代表阻礙你連結光或落實使命的核心卡關點（可能是內在恐懼、舊有模式或外在干擾）。解開這張牌，能量才能重新流動。</p>
                      </article>
                      <article className="rounded-xl border border-orange-400/20 bg-orange-950/20 p-5">
                        <h4 className="font-semibold text-orange-200">3. Card 5：靈魂渴望 / 潛意識（The Soul’s Calling / Subconscious）</h4>
                        <p className="mt-3"><strong className="text-orange-200">位置：</strong>十字的底部（根基）。</p>
                        <p className="mt-2"><strong className="text-orange-200">重點：</strong>代表你靈魂深處真正的渴望與天賦根基。它揭示了頭腦可能忽略、但靈魂一直在召喚你的深層方向。</p>
                      </article>
                      <article className="rounded-xl border border-orange-400/20 bg-orange-950/20 p-5">
                        <h4 className="font-semibold text-orange-200">4. Card 9：靈魂解藥 / 宇宙指引（The Action / Spiritual Prescription）</h4>
                        <p className="mt-3"><strong className="text-orange-200">位置：</strong>右側軸線的關鍵行動牌。</p>
                        <p className="mt-2"><strong className="text-orange-200">重點：</strong>這是最直接的行動指南。它告訴你「現在該採取什麼行動」來調和阻礙，是將高維度的宇宙指引落實在現實生活中的橋樑。</p>
                      </article>
                      <article className="rounded-xl border border-orange-400/20 bg-orange-950/20 p-5 lg:col-span-2">
                        <h4 className="font-semibold text-orange-200">5. Card 11：最終整合 / 靈魂願景（The Outcome / Cosmic Vision）</h4>
                        <p className="mt-3"><strong className="text-orange-200">位置：</strong>十字頂端或最終落腳點。</p>
                        <p className="mt-2"><strong className="text-orange-200">重點：</strong>代表你跨越挑戰、順應指引後，最終展現的靈魂姿態與更高的意識狀態。它為你指引整體靈魂旅程的宏觀遠景。</p>
                      </article>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {positions.map((position, index) => {
                      const full = selectedCards[index].full!;
                      const coreExplanation = full.deepInterpretation?.coreMeaning?.trim()
                        || full.coreMeaning?.trim();
                      return (
                        <div
                          key={position.id}
                          className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-2 border-orange-500/40 rounded-2xl p-6 shadow-xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02]"
                        >
                          <div className="text-center mb-5">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-600/40 to-orange-600/40 rounded-full mb-3 border-2 border-orange-400/30">
                              <span className="text-orange-100 font-bold text-lg">{position.id}</span>
                            </div>
                            <h3 className="text-orange-200 font-medium text-lg mb-1">{position.label}</h3>
                            <p className="text-orange-300/70 text-xs tracking-wide uppercase">{position.englishShort}</p>
                            <p className="text-orange-400/60 text-xs mt-1 italic">{position.description}</p>
                          </div>

                          <div className="bg-slate-900/50 rounded-xl p-5 border border-orange-400/20 space-y-4">
                            <div className="text-center pb-3 border-b border-orange-500/20">
                              <h4 className="text-orange-100 font-semibold text-base mb-1">{full.titleChinese}</h4>
                              <p className="text-orange-200/70 text-sm italic">{full.title}</p>
                              {full.suit && <p className="text-orange-300/60 text-xs mt-1">{full.suit}</p>}
                            </div>

                            <div>
                              <h5 className="text-orange-200/90 text-xs font-medium mb-2 uppercase tracking-wide">位置意義</h5>
                              <p className="text-orange-100/70 text-xs leading-relaxed">{position.interpretation}</p>
                            </div>

                            {coreExplanation && (
                              <div className="pt-3 border-t border-orange-500/20">
                                <h5 className="text-orange-200/90 text-xs font-medium mb-2 uppercase tracking-wide">深度牌卡訊息</h5>
                                <p className="text-orange-100/90 text-sm leading-relaxed">{coreExplanation}</p>
                              </div>
                            )}

                            {full.actionGuidance && (
                              <div className="bg-slate-900/30 rounded-lg p-3 border border-orange-400/10">
                                <p className="text-orange-200/80 text-xs italic">
                                  <span className="font-medium">行動指引：</span>{full.actionGuidance}
                                </p>
                              </div>
                            )}

                            {full.inquiryPrompt && (
                              <div className="bg-slate-900/30 rounded-lg p-3 border border-orange-400/10">
                                <p className="text-orange-200/80 text-xs italic">
                                  <span className="font-medium">深入探問：</span>{full.inquiryPrompt}
                                </p>
                              </div>
                            )}

                            {full.activationPrayer && (
                              <div className="bg-gradient-to-br from-slate-900/40 to-slate-900/40 rounded-lg p-3 border border-orange-400/20">
                                <p className="text-orange-200/90 text-xs leading-relaxed">
                                  <span className="font-medium block mb-1">啟動祈禱文：</span>
                                  <span className="italic">{full.activationPrayer}</span>
                                </p>
                              </div>
                            )}

                            {full.transmissionPrayer && (
                              <div className="bg-gradient-to-br from-slate-900/40 to-slate-900/40 rounded-lg p-3 border border-orange-400/20">
                                <p className="text-orange-200/90 text-xs leading-relaxed">
                                  <span className="font-medium block mb-1">傳遞祈禱文：</span>
                                  <span className="italic">{full.transmissionPrayer}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-gradient-to-br from-slate-900/40 to-slate-900/40 backdrop-blur-sm border-2 border-orange-400/30 rounded-2xl p-8 mt-12">
                    <h3 className="text-orange-200 text-xl font-serif mb-4 text-center">整體解讀提示</h3>
                    <div className="space-y-3 text-orange-100/80 text-sm leading-relaxed">
                      <p className="flex items-start gap-2"><span className="text-orange-400 mt-1 flex-shrink-0">•</span><span>宇宙十字牌陣是深度靈性指引的工具，每個位置都代表你生命旅程中的重要面向。</span></p>
                      <p className="flex items-start gap-2"><span className="text-orange-400 mt-1 flex-shrink-0">•</span><span>仔細感受每張牌的訊息，它們如何相互連結，共同描繪出你當前的靈性狀態。</span></p>
                      <p className="flex items-start gap-2"><span className="text-orange-400 mt-1 flex-shrink-0">•</span><span>特別留意「靈魂天賦」（第5張）和「潛在結果」（第11張），它們揭示了你的內在力量和未來可能性。</span></p>
                      <p className="flex items-start gap-2"><span className="text-orange-400 mt-1 flex-shrink-0">•</span><span>將啟動祈禱文和傳遞祈禱文運用在日常冥想中，它們能幫助你更深入地整合這些靈性訊息。</span></p>
                    </div>
                  </div>
                </>
              )}

              <ShareReadingSection
                deckId="work_your_light"
                deckName="Lightwork 光之訊息"
                spreadName="宇宙十字牌陣"
                cards={selectedCards.map((slot, index) => ({
                  cardKey: slot.preview.card_key,
                  name: slot.preview.name,
                  position: positions[index]?.label,
                }))}
                summary={selectedCards[0]?.preview.preview_excerpt || '宇宙正在喚醒你內在的光芒與靈魂天賦。'}
              />

              <TarotCourseCTA />

              <div className="flex justify-center gap-4 mt-12">
                <button
                  onClick={resetDraw}
                  className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-800/50 to-slate-800/50 hover:from-orange-600/60 hover:to-orange-600/60 border border-orange-500/30 rounded-xl transition-all duration-300 hover:scale-105"
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

export default CosmicCrossPage;
