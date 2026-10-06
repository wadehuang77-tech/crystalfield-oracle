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
import { TAROT_SUBSCRIPTION } from '../lib/tarot-subscription';
import { saveMultiSpreadEmail } from '../lib/multiSpreadEmail';
import ShareReadingSection from '../components/ShareReadingSection';
import { trackReadingStart } from '../lib/ga4';
import { BundleCreditStatus, OraclePricingPlans } from '../components/OraclePricingPlans';
import { getLanguageFromPath, getLocalizedPath } from '../lib/i18n';

const SPREAD_ID = 'cosmic_cross';
const CARD_COUNT = 11;

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
  { id: 1,  label: '目前現狀',          labelEn: 'Present Situation',     description: 'Where you are in present time',        englishShort: 'Present',       interpretation: '這張牌揭示你當下所站之處，照亮此刻的真實狀態。', interpretationEn: 'This card reflects where you are right now and brings your present circumstances into clearer view.' },
  { id: 2,  label: '靈魂的召喚',        labelEn: 'Soul Calling',           description: 'What your soul is calling you to do', englishShort: 'Soul Calling',   interpretation: '你的靈魂正透過這張牌向你低語，呼喚你踏上真正的使命之路。', interpretationEn: 'This card points to what is calling you from within and the path that feels true to your purpose.' },
  { id: 3,  label: '正在升起的能量',    labelEn: 'Rising Energy',          description: 'What is rising in you',               englishShort: 'Rising',         interpretation: '內在深處有新的力量正在甦醒，這張牌顯示即將湧現的能量與品質。', interpretationEn: 'A new strength may be awakening within you. This card reveals the qualities and energy beginning to emerge.' },
  { id: 4,  label: '正在消逝的事物',    labelEn: 'What Is Falling Away',   description: 'What is falling away',                englishShort: 'Falling Away',   interpretation: '這張牌溫柔地提示你，什麼正在從你的生命中離開。', interpretationEn: 'This card gently draws attention to what may be leaving your life or no longer needs to be carried forward.' },
  { id: 5,  label: '靈魂天賦',          labelEn: 'Soul Gifts',             description: 'Soul Gifts',                          englishShort: 'Soul Gifts',     interpretation: '你內在擁有獨特的光之禮物，這張牌揭示你靈魂深處的天賦與能力。', interpretationEn: 'This card highlights the distinctive gifts and abilities you can draw on throughout your journey.' },
  { id: 6,  label: '正在顯化的事物',    labelEn: 'What Is Manifesting',    description: 'What is being manifested',            englishShort: 'Manifesting',    interpretation: '宇宙正在回應你的振動頻率，這張牌顯示即將在你生命中具體顯現的事物。', interpretationEn: 'This card points to what may be taking shape in your life as a result of your current choices and circumstances.' },
  { id: 7,  label: '下一步',            labelEn: 'The Next Step',          description: 'The next step',                       englishShort: 'Next Step',      interpretation: '這張牌為你指出前方的道路，揭示此刻最需要採取的行動或態度。', interpretationEn: 'This card offers perspective on a useful next step or attitude to consider from where you are now.' },
  { id: 8,  label: '前世的影響',        labelEn: 'Past-Life Influence',    description: 'Past-life influence',                 englishShort: 'Past Life',      interpretation: '你的靈魂攜帶著跨越生世的記憶與智慧，這張牌揭示過去世的經驗如何影響當前的旅程。', interpretationEn: 'This position explores how familiar patterns, inherited stories, or past experiences may be shaping your present path.' },
  { id: 9,  label: '你需要知道的事',    labelEn: 'What You Need to Know',  description: 'What you need to know',               englishShort: 'Need to Know',   interpretation: '宇宙透過這張牌傳遞重要的訊息給你，揭示此刻最需要覺察的真理。', interpretationEn: 'This card brings forward an important perspective or truth that may be helpful to recognize now.' },
  { id: 10, label: '希望與恐懼',        labelEn: 'Hopes and Fears',        description: 'Hopes and fears',                     englishShort: 'Hopes & Fears',  interpretation: '這張牌照亮你內心深處的渴望與恐懼。', interpretationEn: 'This card reflects the hopes and fears influencing how you approach the situation.' },
  { id: 11, label: '潛在結果',          labelEn: 'Potential Outcome',      description: 'Potential outcome',                   englishShort: 'Outcome',        interpretation: '這張牌揭示如果你遵循當前的路徑，可能展開的未來景象。', interpretationEn: 'This card suggests one possible direction the situation could take if current patterns continue.' },
];

type CosmicPosition = (typeof positions)[number];

function positionLabel(position: CosmicPosition, language: 'zh-Hant' | 'en'): string {
  return language === 'en' ? position.labelEn : position.label;
}

function CosmicCrossPositionGuide({ language }: { language: 'zh-Hant' | 'en' }) {
  const isEnglish = language === 'en';
  return (
    <section className="mt-2 rounded-3xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 via-slate-900/80 to-violet-500/10 px-3 py-7 sm:px-8 sm:py-10 shadow-[0_0_34px_rgba(251,146,60,0.12)]">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs sm:text-sm tracking-[0.35em] text-orange-300/75">
          {isEnglish ? 'COSMIC CROSS SPREAD' : '宇 宙 十 字 牌 陣'}
        </p>
        <h2 className="font-serif text-xl sm:text-3xl tracking-wide text-orange-100">
          {isEnglish ? 'The 11 Positions and Their Meanings' : '11 張牌的代號與主旨'}
        </h2>
      </div>

      <div className="space-y-7 sm:space-y-10">
        <div className="grid grid-cols-6 gap-1.5 sm:gap-4">
          {positions.slice(0, 6).map((position) => (
            <CosmicCrossPositionCard key={position.id} position={position} language={language} />
          ))}
        </div>
        <div className="mx-auto grid w-5/6 grid-cols-5 gap-1.5 sm:gap-4">
          {positions.slice(6).map((position) => (
            <CosmicCrossPositionCard key={position.id} position={position} language={language} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CosmicCrossPositionCard({ position, language }: { position: CosmicPosition; language: 'zh-Hant' | 'en' }) {
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
        {positionLabel(position, language)}
      </p>
    </div>
  );
}

function CosmicCrossPreviewCard({
  position,
  slot,
  language,
}: {
  position: CosmicPosition;
  slot: DrawnSlot;
  language: 'zh-Hant' | 'en';
}) {
  const isEnglish = language === 'en';
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
              <h3 className="font-serif text-base leading-snug text-orange-50">{positionLabel(position, language)}</h3>
              <p className="mt-1 text-[0.68rem] leading-relaxed text-orange-200">{position.englishShort}</p>
              <p className="mt-1 text-[0.65rem] leading-relaxed text-orange-100">{position.description}</p>
            </div>
            <p className="border-t border-orange-300/25 pt-3 font-serif text-base leading-snug text-orange-50">
              {slot.preview.name}
            </p>
            <div className="space-y-2 text-left">
              <h4 className="text-center font-serif text-xs text-orange-100">
                {isEnglish ? 'Card Interpretation (30% Preview)' : '牌義解讀（前 30% 預覽）'}
              </h4>
              {slot.preview.preview_excerpt ? (
                <p className="whitespace-pre-line text-xs leading-6 text-orange-50">
                  {slot.preview.preview_excerpt}
                </p>
              ) : (
                <p className="text-center text-xs leading-6 text-orange-50">
                  {isEnglish ? 'Unlock to view the full card interpretation' : '解鎖後可查看完整牌義解讀'}
                </p>
              )}
              <p className="border-t border-orange-300/20 pt-2 text-center text-[0.62rem] leading-5 tracking-wide text-orange-200">
                {isEnglish ? 'First 30% preview · Scroll to read' : '前 30% 預覽・向下捲動閱讀'}
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
  const [searchParams] = useSearchParams();
  const language = getLanguageFromPath(window.location.pathname);
  const isEnglish = language === 'en';
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
    trackReadingStart(SPREAD_ID);

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
          const unlocked = await unlockSpreadCards(SPREAD_ID, picks, order.id, orderToken, language);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          setSelectedCards((prev) => prev.map((s) => {
            const u = byKey.get(s.preview.card_key);
            if (!u) return s;
            const g = u.gated as CosmicGated;
            const previewSuit = (s.preview.preview as { suit?: string }).suit;
            return {
              ...s,
              full: {
                ...g,
                titleChinese: isEnglish ? u.name : u.name_secondary ?? u.name,
                title: isEnglish ? '' : u.name,
                suit: previewSuit,
              },
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
  }, [searchParams, deck, language, isEnglish]);

  const handleCheckout = async () => {
    if (isCheckingOut) return;
    setUnlockError(null);
    setIsCheckingOut(true);
    try {
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(
        TAROT_SUBSCRIPTION.id,
      );
      if (admin_unlocked) {
        navigate(`${getLocalizedPath('/checkout/return', language)}?order_id=${encodeURIComponent(order_id)}`);
        return;
      }
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
    language,
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
      return {
        ...s,
        full: {
          ...g,
          titleChinese: isEnglish ? u.name : u.name_secondary ?? u.name,
          title: isEnglish ? '' : u.name,
          suit: previewSuit,
        },
      };
    }));
    setIsLocallyUnlocked(true);
  }, [gate.unlockedCards, isEnglish]);

  const showFullContent = isLocallyUnlocked && selectedCards.every((s) => s.full !== null);
  const keyPositionGuides = isEnglish
    ? [
      { card: 1, title: 'Core Theme / Current Energy', location: 'At the foundation of the cross.', meaning: 'This card represents your central state and the theme you are experiencing now. It is the foundation of the spread and highlights the energy asking for your attention.' },
      { card: 2, title: 'Challenge / What Is Blocking You', location: 'Crossing Card 1.', meaning: 'This card points to a central obstacle to connecting with your light or living your purpose. It may reflect fear, an old pattern, or outside pressure. Understanding it can help you find a new way forward.' },
      { card: 5, title: 'Soul’s Calling / Subconscious', location: 'At the base of the cross.', meaning: 'This card reflects a deep desire or gift that may be easy to overlook. It can point toward a direction that matters to you beneath your everyday thoughts.' },
      { card: 9, title: 'Action / Spiritual Guidance', location: 'A key action position on the right-hand axis.', meaning: 'This is a practical guide to an action or attitude you can consider now. It helps translate reflection into steps you can take in everyday life.' },
      { card: 11, title: 'Integration / Soul’s Vision', location: 'At the top of the cross and its final point.', meaning: 'This card describes one possible way your path may develop as you meet challenges and use the guidance available to you. It offers a wider view of your journey, not a guaranteed outcome.' },
    ]
    : [
      { card: 1, title: '核心議題 / 當下能量', location: '牌陣中央最底層的基礎。', meaning: '代表你當前靈魂的核心狀態與當下正在經歷的主題。它是整個牌陣的基石，點出你此刻最需要覺察的能量焦點。' },
      { card: 2, title: '阻礙與挑戰', location: '橫跨在第 1 張牌之上。', meaning: '代表阻礙你連結光或落實使命的核心卡關點，可能是內在恐懼、舊有模式或外在干擾。理解這張牌，有助於讓能量重新流動。' },
      { card: 5, title: '靈魂渴望 / 潛意識', location: '十字的底部（根基）。', meaning: '代表你靈魂深處真正的渴望與天賦根基。它揭示了頭腦可能忽略、但靈魂一直在召喚你的深層方向。' },
      { card: 9, title: '靈魂解藥 / 宇宙指引', location: '右側軸線的關鍵行動牌。', meaning: '這是最直接的行動指南，告訴你現在可以採取什麼行動來調和阻礙，將靈性指引落實在日常生活中。' },
      { card: 11, title: '最終整合 / 靈魂願景', location: '十字頂端或最終落腳點。', meaning: '代表你跨越挑戰、順應指引後，可能展現的靈魂姿態與意識狀態，為整體旅程提供更宏觀的視野。' },
    ];

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
            {isEnglish ? 'Cosmic Cross Spread' : '宇宙十字牌陣'}
          </h1>
          <p className="text-xl md:text-2xl font-serif text-orange-200/90 mb-2">
            Cosmic Cross
          </p>
        </header>

        {deckError && <p className="text-center text-red-500 mb-6">{deckError}</p>}

        <div className="max-w-6xl mx-auto">
          {!hasDrawn && !isDrawing && (
            <>
              <div className="flex justify-center mb-12">
                <button
                  onClick={drawCards}
                  disabled={!deck || deck.length < CARD_COUNT}
                  className="group relative px-12 py-6 bg-gradient-to-r from-orange-600 to-orange-600 hover:from-orange-500 hover:to-orange-500 rounded-xl text-xl font-medium shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-400 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <span className="relative text-orange-100 tracking-wide">
                    {!deck || deck.length < CARD_COUNT
                      ? (isEnglish ? 'Loading cards…' : '卡片資料載入中…')
                      : (isEnglish ? 'Draw 11 Cards' : '開始抽取 11 張牌')}
                  </span>
                </button>
              </div>

              <CosmicCrossPositionGuide language={language} />
            </>
          )}

          {isDrawing && (
            <CardShuffleAnimation message={isEnglish ? 'Connecting with your inner guidance' : undefined} />
          )}

          {hasDrawn && selectedCards.length === CARD_COUNT && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-serif text-orange-100 mb-3">
                  {isEnglish ? 'Your Cosmic Cross Reading' : '你的宇宙十字牌陣'}
                </h2>
                <p className="text-orange-200/70 text-lg">Cosmic Cross Spread Reading</p>
              </div>

              {!showFullContent && (
                <div className="space-y-6">
                  <div className="space-y-8 sm:space-y-10">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
                      {positions.slice(0, 6).map((position, index) => (
                        <CosmicCrossPreviewCard key={position.id} position={position} slot={selectedCards[index]} language={language} />
                      ))}
                    </div>
                    <div className="mx-auto grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:w-5/6 lg:grid-cols-5">
                      {positions.slice(6).map((position, index) => (
                        <CosmicCrossPreviewCard key={position.id} position={position} slot={selectedCards[index + 6]} language={language} />
                      ))}
                    </div>
                  </div>

                  {gate.phase === 'loading' && (
                            <div className="text-center text-orange-300/70 py-6 tracking-wider">
                              {isEnglish ? 'Unlocking…' : '解鎖中…'}
                            </div>
                  )}
                  {gate.phase === 'login_gate' && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-8 text-center shadow-2xl space-y-5">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500/30 to-orange-500/30 rounded-full flex items-center justify-center border-2 border-orange-400/40">
                          <Lock className="w-7 h-7 text-orange-300" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-serif text-orange-100 tracking-wide">
                        {isEnglish ? 'Sign in for 3 free readings' : '登入後享有 3 次免費占卜'}
                      </h3>
                      <p className="text-orange-200/80 text-base leading-relaxed max-w-md mx-auto">
                        {isEnglish
                          ? 'Use your three free readings across all decks. Each completed spread uses one reading.'
                          : '登入後可跨所有牌組免費占卜 3 次；完成一次完整牌陣會扣除一次免費額度。'}
                      </p>
                      <InlineEmailUnlock
                        onUnlocked={(email) => { void handleEmailUnlock(email); }}
                        readingType={SPREAD_ID}
                        theme="dark"
                        language={language}
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
                      <h3 className="text-2xl font-serif text-orange-100 mb-3 tracking-wide">
                        {isEnglish ? 'Unlock the Full Cosmic Reading' : '解鎖完整宇宙訊息'}
                      </h3>
                      <p className="text-orange-200/80 text-base leading-relaxed mb-4 max-w-md mx-auto">
                        {isEnglish
                          ? 'Unlock the complete interpretation and deeper guidance for all eleven cards.'
                          : '更深層的指引與靈魂訊息在後面。解鎖十一張牌的完整宇宙解讀。'}
                      </p>
                      <OraclePricingPlans spreadId={SPREAD_ID} onSingleCheckout={handleCheckout} singleLoading={isCheckingOut} error={unlockError} />
                    </div>
                  )}
                </div>
              )}

              {showFullContent && (
                <>
                  <BundleCreditStatus spreadId={SPREAD_ID} remaining={gate.bundleRemaining} />
                  <section className="rounded-2xl border-2 border-orange-400/45 bg-slate-900/75 px-5 py-6 shadow-[0_0_30px_rgba(249,115,22,0.12)] sm:px-8 sm:py-8">
                    <div className="mb-6 text-center">
                      <h3 className="font-serif text-2xl text-orange-100 sm:text-3xl">
                        {isEnglish ? 'How to Read Your Spread' : '解牌閱讀小提醒'}
                      </h3>
                      <p className="mt-2 text-sm text-orange-200/90 sm:text-base">
                        {isEnglish ? 'Pay special attention to these ' : '重點看以下 '}
                        <strong className="text-orange-100">5 {isEnglish ? 'key cards' : '張關鍵牌'}</strong>
                        {isEnglish ? '.' : '：'}
                      </p>
                    </div>
                    <div className="grid gap-4 text-sm leading-relaxed text-orange-50 lg:grid-cols-2 sm:text-base">
                      {keyPositionGuides.map((guide, index) => (
                        <article
                          key={guide.card}
                          className={`rounded-xl border border-orange-400/20 bg-orange-950/20 p-5 ${index === keyPositionGuides.length - 1 ? 'lg:col-span-2' : ''}`}
                        >
                          <h4 className="font-semibold text-orange-200">
                            {index + 1}. Card {guide.card}: {guide.title}
                          </h4>
                          <p className="mt-3">
                            <strong className="text-orange-200">{isEnglish ? 'Position: ' : '位置：'}</strong>
                            {guide.location}
                          </p>
                          <p className="mt-2">
                            <strong className="text-orange-200">{isEnglish ? 'Meaning: ' : '重點：'}</strong>
                            {guide.meaning}
                          </p>
                        </article>
                      ))}
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
                            <h3 className="text-orange-200 font-medium text-lg mb-1">{positionLabel(position, language)}</h3>
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
                              <h5 className="text-orange-200/90 text-xs font-medium mb-2 uppercase tracking-wide">
                                {isEnglish ? 'Position Meaning' : '位置意義'}
                              </h5>
                              <p className="text-orange-100/70 text-xs leading-relaxed">
                                {isEnglish ? position.interpretationEn : position.interpretation}
                              </p>
                            </div>

                            {coreExplanation && (
                              <div className="pt-3 border-t border-orange-500/20">
                                <h5 className="text-orange-200/90 text-xs font-medium mb-2 uppercase tracking-wide">
                                  {isEnglish ? 'In-Depth Card Message' : '深度牌卡訊息'}
                                </h5>
                                <p className="text-orange-100/90 text-sm leading-relaxed">{coreExplanation}</p>
                              </div>
                            )}

                            {full.actionGuidance && (
                              <div className="bg-slate-900/30 rounded-lg p-3 border border-orange-400/10">
                                <p className="text-orange-200/80 text-xs italic">
                                  <span className="font-medium">{isEnglish ? 'Action Guidance: ' : '行動指引：'}</span>{full.actionGuidance}
                                </p>
                              </div>
                            )}

                            {full.inquiryPrompt && (
                              <div className="bg-slate-900/30 rounded-lg p-3 border border-orange-400/10">
                                <p className="text-orange-200/80 text-xs italic">
                                  <span className="font-medium">{isEnglish ? 'Questions for Reflection: ' : '深入探問：'}</span>{full.inquiryPrompt}
                                </p>
                              </div>
                            )}

                            {full.activationPrayer && (
                              <div className="bg-gradient-to-br from-slate-900/40 to-slate-900/40 rounded-lg p-3 border border-orange-400/20">
                                <p className="text-orange-200/90 text-xs leading-relaxed">
                                  <span className="font-medium block mb-1">{isEnglish ? 'Activation Prayer:' : '啟動祈禱文：'}</span>
                                  <span className="italic">{full.activationPrayer}</span>
                                </p>
                              </div>
                            )}

                            {full.transmissionPrayer && (
                              <div className="bg-gradient-to-br from-slate-900/40 to-slate-900/40 rounded-lg p-3 border border-orange-400/20">
                                <p className="text-orange-200/90 text-xs leading-relaxed">
                                  <span className="font-medium block mb-1">{isEnglish ? 'Transmission Prayer:' : '傳遞祈禱文：'}</span>
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
                    <h3 className="text-orange-200 text-xl font-serif mb-4 text-center">
                      {isEnglish ? 'Putting the Reading Together' : '整體解讀提示'}
                    </h3>
                    <div className="space-y-3 text-orange-100/80 text-sm leading-relaxed">
                      {(isEnglish
                        ? [
                          'Use the spread as a reflective tool; each position represents one aspect of your journey.',
                          'Notice how the cards relate to one another and what they may suggest about your current circumstances.',
                          'Pay particular attention to Soul Gifts (Card 5) and Potential Outcome (Card 11) as you consider your strengths and possible directions.',
                          'If the cards include prayers, you may use them as optional prompts for personal reflection or meditation.',
                        ]
                        : [
                          '宇宙十字牌陣是深度靈性指引的工具，每個位置都代表你生命旅程中的重要面向。',
                          '仔細感受每張牌的訊息，它們如何相互連結，共同描繪出你當前的靈性狀態。',
                          '特別留意「靈魂天賦」（第5張）和「潛在結果」（第11張），它們揭示了你的內在力量和未來可能性。',
                          '將啟動祈禱文和傳遞祈禱文運用在日常冥想中，它們能幫助你更深入地整合這些靈性訊息。',
                        ]).map((tip) => (
                        <p key={tip} className="flex items-start gap-2">
                          <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                          <span>{tip}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <ShareReadingSection
                deckId="work_your_light"
                deckName={isEnglish ? 'Work Your Light Oracle' : 'Lightwork 光之訊息'}
                spreadName={isEnglish ? 'Cosmic Cross Spread' : '宇宙十字牌陣'}
                cards={selectedCards.map((slot, index) => ({
                  cardKey: slot.preview.card_key,
                  name: slot.preview.name,
                  position: positions[index] ? positionLabel(positions[index], language) : undefined,
                }))}
                summary={selectedCards[0]?.preview.preview_excerpt
                  || (isEnglish
                    ? 'Reconnect with your inner light and the gifts that matter to you.'
                    : '宇宙正在喚醒你內在的光芒與靈魂天賦。')}
                deepAnalysis={{
                  deckId: 'work_your_light', spreadId: 'cosmic_cross',
                  hasFullAccess: isLocallyUnlocked,
                  resultComplete: showFullContent,
                }}
              />

              <TarotCourseCTA />

              <div className="flex justify-center gap-4 mt-12">
                <button
                  onClick={resetDraw}
                  className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-800/50 to-slate-800/50 hover:from-orange-600/60 hover:to-orange-600/60 border border-orange-500/30 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="tracking-wide">{isEnglish ? 'Draw Again' : '重新抽牌'}</span>
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
