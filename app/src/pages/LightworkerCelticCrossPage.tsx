import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, RotateCcw, Lock } from 'lucide-react';
import {
  generateOverallSpiritualGrowthSummary,
  generateOverallHealingSummary,
  generateOverallLifePathSummary,
  type LightworkerCard,
} from '../utils/celticCrossInterpretation';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { useConversionTracking, usePageView } from '../hooks/useConversionTracking';
import { InlineEmailUnlock } from '../components/InlineEmailUnlock';
import { checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import CardShuffleAnimation from '../components/CardShuffleAnimation';
import { useMultiSpreadGate } from '../hooks/useMultiSpreadGate';
import { useDeck, pickRandomCards, unlockSpreadCards } from '../hooks/useDeck';
import { type CardPreview, type UnlockedCard } from '../lib/api';
import { getMultiSpreadCheckoutGuestEmail, saveMultiSpreadEmail } from '../lib/multiSpreadEmail';
import { formatPrice, getSpreadPrice } from '../lib/spread-prices';
import { useAuth } from '../contexts/AuthContext';
import ShareReadingSection from '../components/ShareReadingSection';

const SPREAD_ID = 'celtic_cross';

const LIGHTWORKER_MISSION_PROMPTS = [
  '常常覺得自己不屬於這個世界？抽一張牌，解鎖你來到地球的「靈魂合約與使命」。',
  '不只是為了生存而工作！揭示你今生真正想完成的心願與靈魂藍圖。',
  '連結你的光之團隊（指導靈與天使），領取此刻專屬於你的神聖提醒。',
];

function LightworkerMissionIntro() {
  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-slate-900/85 to-blue-500/10 px-5 py-6 sm:px-8 sm:py-7 shadow-[0_0_34px_rgba(34,211,238,0.13)]">
      <div className="space-y-4 text-left">
        {LIGHTWORKER_MISSION_PROMPTS.map((prompt) => (
          <p key={prompt} className="flex items-start gap-3 text-base sm:text-lg leading-relaxed text-cyan-50/95">
            <Sparkles className="mt-1 h-4 w-4 shrink-0 text-cyan-300" strokeWidth={1.5} />
            <span>{prompt}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

interface CardPosition {
  position: number;
  title: string;
  subtitle: string;
  description: string;
  preview: CardPreview | null;
  full: LightworkerCard | null;
}

const POSITIONS: Omit<CardPosition, 'preview' | 'full'>[] = [
  { position: 1,  title: '中央牌',   subtitle: '核心自我 + 高我訊息',  description: '你目前的靈魂狀態、能量中心、主要課題' },
  { position: 2,  title: '交叉牌',   subtitle: '核心課題 / 阻礙',       description: '阻礙你實現使命或靈性成長的因素' },
  { position: 3,  title: '下方牌',   subtitle: '潛能與資源',             description: '你可運用的天賦、資源、潛能' },
  { position: 4,  title: '左側牌',   subtitle: '過去影響',               description: '你生命經驗對使命的影響' },
  { position: 5,  title: '右側牌',   subtitle: '建議行動',               description: '具體可執行的行動、能量調整' },
  { position: 6,  title: '上方牌',   subtitle: '靈魂使命 / 長期方向',    description: '你此生最重要的功課與方向' },
  { position: 7,  title: '第七牌',   subtitle: '近期挑戰 / 短期課題',    description: '即將面臨的挑戰與需要面對的課題' },
  { position: 8,  title: '第八牌',   subtitle: '長期挑戰 / 成長路徑',    description: '長遠的成長道路與需要持續面對的功課' },
  { position: 9,  title: '第九牌',   subtitle: '外部資源 / 支援力量',    description: '可以依靠的外在力量與資源' },
  { position: 10, title: '第十牌',   subtitle: '最終結果 / 潛在成就',    description: '最終可能達到的成果與靈性成就' },
];

function getPreviewInterpretation(position: CardPosition): string {
  if (!position.preview) return '';
  const excerpt = position.preview.preview_excerpt?.trim();
  if (excerpt) return excerpt;

  const keywords = (position.preview.preview as { keywords?: string[] }).keywords ?? [];
  const keywordText = keywords.length > 0 ? `關鍵能量：${keywords.join('、')}。` : '';
  return `「${position.preview.name}」出現在「${position.subtitle}」牌位，提醒你留意${position.description}。${keywordText}`;
}

type MissionCardMode = 'layout' | 'preview' | 'full';

function MissionCardVisual({ position, children, expand = false }: { position: CardPosition; children: ReactNode; expand?: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[10.5rem] pt-4">
      <div className="absolute left-1/2 top-0 z-20 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-cyan-100/60 bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.55)]">
        {position.position}
      </div>
      <div className={`relative rounded-xl border border-cyan-300/40 bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-950 p-2 shadow-[0_14px_34px_-16px_rgba(34,211,238,0.75)] ${expand ? 'min-h-[16rem]' : 'aspect-[2/3] overflow-hidden'}`}>
        <div className={`rounded-lg border border-cyan-300/20 bg-slate-950/35 px-3 pb-3 pt-7 ${expand ? 'min-h-[15rem]' : 'h-full overflow-y-auto scrollbar-thin'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function MissionReadingCard({ position, mode }: { position: CardPosition; mode: MissionCardMode }) {
  const previewInterpretation = getPreviewInterpretation(position);
  const isFull = mode === 'full' && position.full;
  const sections = position.full ? [
    { title: '宇宙訊息', text: position.full.cosmicMessage },
    { title: '當下狀態', text: position.full.currentSituation },
    { title: '深層含義', text: position.full.deeperMeaning },
    { title: '行動指引', text: position.full.actionGuidance },
    { title: '能量療癒', text: position.full.energyHealing },
  ].filter((section) => section.text?.trim()) : [];

  return (
    <article
      data-preview-card={mode === 'preview' ? position.position : undefined}
      data-full-card={mode === 'full' ? position.position : undefined}
      className="min-w-0"
    >
      <MissionCardVisual position={position} expand={mode === 'full'}>
        <div className="space-y-3 text-center">
          <div>
            <h3 className="font-serif text-sm leading-snug text-cyan-50 sm:text-base">{position.title}</h3>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-cyan-200/75 sm:text-xs">{position.subtitle}</p>
          </div>

          {mode === 'layout' && (
            <p className="border-t border-cyan-400/15 pt-3 text-xs leading-6 text-cyan-100/80">{position.description}</p>
          )}

          {mode !== 'layout' && position.preview && (
            <p className="border-t border-cyan-400/15 pt-3 font-serif text-base text-cyan-100">{position.preview.name}</p>
          )}

          {mode === 'preview' && (
            <div className="space-y-2 text-left">
              <h4 className="text-center font-serif text-xs text-cyan-100">牌義解讀（前 30% 預覽）</h4>
              <p className="whitespace-pre-line text-xs leading-6 text-cyan-50/90">{previewInterpretation}</p>
              <p className="text-center text-[0.62rem] leading-5 tracking-wide text-cyan-200/80">前 30% 預覽・解鎖看完整解讀</p>
            </div>
          )}

          {isFull && (
            <div className="space-y-3 text-left">
              <h4 className="text-center font-serif text-xs text-cyan-100">完整牌義解讀（100%）</h4>
              {position.full!.keywords.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                  {position.full!.keywords.map((keyword) => (
                    <span key={keyword} className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-[0.58rem] text-cyan-200">{keyword}</span>
                  ))}
                </div>
              )}
              {sections.map((section) => (
                <section key={section.title} className="border-t border-cyan-400/15 pt-2">
                  <h5 className="mb-1 text-[0.68rem] font-medium text-cyan-200">{section.title}</h5>
                  <p className="whitespace-pre-line text-xs leading-6 text-cyan-50/90">{section.text}</p>
                </section>
              ))}
              {position.full!.soulQuestion && (
                <section className="border-t border-cyan-300/30 pt-2">
                  <h5 className="mb-1 text-[0.68rem] font-medium text-cyan-200">靈魂提問</h5>
                  <p className="text-xs italic leading-6 text-cyan-50/90">{position.full!.soulQuestion}</p>
                </section>
              )}
            </div>
          )}
        </div>
      </MissionCardVisual>
    </article>
  );
}

function LightworkerCelticCrossPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { cards: deck, error: deckError } = useDeck('lightworker');
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const { showModal, handleClose } = useCrystalPromo(hasDrawn && !isShuffling);
  const { trackEvent } = useConversionTracking();

  usePageView('lightworker_celtic_cross');

  const [selectedCards, setSelectedCards] = useState<CardPosition[]>(
    POSITIONS.map((p) => ({ ...p, preview: null, full: null })),
  );

  const drawCards = () => {
    if (!deck || deck.length === 0) return;
    setIsShuffling(true);
    setHasDrawn(false);
    setIsLocallyUnlocked(false);

    setTimeout(() => {
      const drawn = pickRandomCards(deck, 10);
      setSelectedCards(POSITIONS.map((p, i) => ({
        ...p,
        preview: drawn[i] ?? null,
        full: null,
      })));

      setIsShuffling(false);
      setHasDrawn(true);

      trackEvent('cards_drawn', {
        readingType: 'lightworker_celtic_cross',
        cardCount: 10,
      });
    }, 2000);
  };

  const reset = () => {
    setSelectedCards(POSITIONS.map((p) => ({ ...p, preview: null, full: null })));
    setHasDrawn(false);
    setIsShuffling(false);
    setIsLocallyUnlocked(false);
    setUnlockError(null);
  };

  useEffect(() => {
    if (hasDrawn) {
      window.scrollTo(0, 0);
    }
  }, [hasDrawn]);

  const restoreStartedRef = useRef(false);
  const [restoreState, setRestoreState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  useEffect(() => {
    if (restoreStartedRef.current) return;
    const orderId = searchParams.get('order_id');
    const orderToken = searchParams.get('order_token');
    if (!orderId || !deck || deck.length === 0) return;
    restoreStartedRef.current = true;
    setRestoreState('pending');

    (async () => {
      try {
        const { order } = await checkoutApi.getOrder(orderId, orderToken);
        if (order.item_id !== SPREAD_ID || order.status !== 'paid' || !order.picks) {
          setRestoreState('error');
          return;
        }
        const next: CardPosition[] = POSITIONS.map((p) => {
          const pick = order.picks!.find((q) => q.position === p.position);
          if (!pick) return { ...p, preview: null, full: null };
          const preview = deck.find((c) => c.card_key === pick.card_key);
          return { ...p, preview: preview ?? null, full: null };
        });
        if (next.some((c) => !c.preview)) { setRestoreState('error'); return; }
        setSelectedCards(next);
        setHasDrawn(true);

        try {
          const picks = next
            .filter((c) => c.preview)
            .map((c) => ({ card_key: c.preview!.card_key, position: c.position }));
          const unlocked = await unlockSpreadCards(SPREAD_ID, picks, order.id, orderToken);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          setSelectedCards((prev) => prev.map((c) => {
            if (!c.preview) return c;
            const u = byKey.get(c.preview.card_key);
            if (!u) return c;
            const previewKw = (c.preview.preview as { keywords?: string[] }).keywords ?? [];
            const g = u.gated as Partial<LightworkerCard>;
            return {
              ...c,
              full: {
                name: u.name,
                nameEn: u.name_secondary ?? undefined,
                keywords: previewKw,
                cosmicMessage: g.cosmicMessage ?? '',
                currentSituation: g.currentSituation ?? '',
                deeperMeaning: g.deeperMeaning ?? '',
                actionGuidance: g.actionGuidance ?? '',
                energyHealing: g.energyHealing ?? '',
                soulQuestion: g.soulQuestion ?? '',
              },
            };
          }));
          setIsLocallyUnlocked(true);
        } catch (err) {
          setUnlockError(err instanceof Error ? err.message : '解鎖失敗,請稍後再試');
        }
        setRestoreState('done');
      } catch {
        setRestoreState('error');
      }
    })();
  }, [searchParams, deck]);


  const handleCheckout = async () => {
    if (isCheckingOut) return;
    const guestEmail = getMultiSpreadCheckoutGuestEmail();
    setUnlockError(null);
    setIsCheckingOut(true);
    try {
      const checkoutPicks = selectedCards.filter((c) => c.preview).map((c) => ({ card_key: c.preview!.card_key, position: c.position }));
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

  const gatePicks = hasDrawn && selectedCards.some((c) => c.preview)
    ? selectedCards.filter((c) => c.preview).map((c) => ({ card_key: c.preview!.card_key, position: c.position }))
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
    setSelectedCards((prev) => prev.map((c) => {
      if (!c.preview) return c;
      const u = byKey.get(c.preview.card_key);
      if (!u) return c;
      const previewKw = (c.preview.preview as { keywords?: string[] }).keywords ?? [];
      const g = u.gated as Partial<LightworkerCard>;
      return {
        ...c,
        full: {
          name: u.name,
          nameEn: u.name_secondary ?? undefined,
          keywords: previewKw,
          cosmicMessage: g.cosmicMessage ?? '',
          currentSituation: g.currentSituation ?? '',
          deeperMeaning: g.deeperMeaning ?? '',
          actionGuidance: g.actionGuidance ?? '',
          energyHealing: g.energyHealing ?? '',
          soulQuestion: g.soulQuestion ?? '',
        },
      };
    }));
    setIsLocallyUnlocked(true);
  }, [gate.unlockedCards]);

  const showFullContent = isLocallyUnlocked && selectedCards.every((c) => c.full !== null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 text-white relative overflow-hidden">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-screen">

        <header className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-300 opacity-80 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif mb-4 tracking-wide text-cyan-100 drop-shadow-lg">
            十字交叉使命陣
          </h1>
          <p className="text-xl md:text-2xl font-serif text-cyan-200/90 mb-4">
            Celtic Cross Mission Spread
          </p>
          <p className="text-cyan-200/80 text-base sm:text-lg md:text-xl font-light tracking-wider max-w-2xl mx-auto px-4">
            深度探索靈魂使命與人生道路的完整指引
          </p>
        </header>

        {deckError && <p className="text-center text-red-500 mb-6">{deckError}</p>}

        {searchParams.get('order_id') && restoreState === 'pending' && !hasDrawn && (
          <div className="max-w-md mx-auto bg-slate-800/60 backdrop-blur-md border-2 border-cyan-500/30 rounded-2xl p-6 mb-6 text-center">
            <div className="inline-flex items-center gap-3 text-cyan-200">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="tracking-wide">正在還原你的牌陣...</span>
            </div>
          </div>
        )}

        {searchParams.get('order_id') && restoreState === 'error' && !hasDrawn && (
          <div className="max-w-2xl mx-auto bg-red-900/20 border-2 border-red-500/40 rounded-2xl p-6 mb-6 text-center">
            <p className="text-red-200 tracking-wide mb-2">無法還原此訂單的牌陣</p>
            <p className="text-red-300/70 text-xs tracking-wide leading-relaxed">
              order_id: <span className="font-mono">{searchParams.get('order_id')}</span>
              <br />
              可能原因:訂單不屬於目前登入帳號 / 訂單未完成付款 / 牌組對不上。
              <br />
              請通知客服或重新整理頁面再試。
            </p>
          </div>
        )}

        {!hasDrawn && !isShuffling && (
          <div className="max-w-5xl mx-auto space-y-8">
            <LightworkerMissionIntro />

            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-cyan-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
              <h2 className="text-2xl sm:text-3xl font-serif text-cyan-100 mb-6">準備開始</h2>
              <p className="text-cyan-200/70 leading-relaxed text-sm sm:text-base mb-8">
                閉上眼睛，深呼吸三次。<br />
                將你的意圖專注於你想要探索的靈魂使命與人生方向。<br />
                準備好後，點擊下方按鈕開始抽取十張指引牌。
              </p>

              <button
                onClick={drawCards}
                disabled={!deck || deck.length === 0}
                className="group relative px-10 py-5 bg-gradient-to-r from-cyan-600 to-cyan-600 hover:from-cyan-500 hover:to-cyan-500 rounded-xl text-xl font-medium shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-400 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <span className="relative text-cyan-100 tracking-wide flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  {deck ? '開始抽牌' : '載入牌組中…'}
                </span>
              </button>
            </div>

            <div className="rounded-3xl border-2 border-cyan-500/30 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6 shadow-2xl backdrop-blur-md sm:p-10">
              <p className="mb-2 text-center text-sm tracking-[0.45em] text-cyan-300/70">十 字 交 叉 使 命 陣</p>
              <h3 className="mb-8 text-center font-serif text-2xl text-cyan-100 sm:text-3xl">10 張牌的代號與主旨</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-5">
                {selectedCards.map((position) => (
                  <MissionReadingCard key={position.position} position={position} mode="layout" />
                ))}
              </div>
            </div>
          </div>
        )}

        {isShuffling && <CardShuffleAnimation message="連　接　高　我　抽　牌　中" />}

        {hasDrawn && (
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-serif text-cyan-100 mb-4">你的靈魂使命指引</h2>
              <p className="text-cyan-200/80 text-base sm:text-lg">以下是為你抽取的十張牌，依序解讀將為你揭示完整的靈性道路</p>
            </div>

            {!showFullContent && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-5">
                  {selectedCards.map((position) => (
                    <MissionReadingCard key={position.position} position={position} mode="preview" />
                  ))}
                </div>

                {gate.phase === 'loading' && (
                  <div className="text-center text-cyan-300/70 py-6 tracking-wider">解鎖中…</div>
                )}
                {gate.phase === 'email_gate' && (
                  <div className="bg-gradient-to-br from-slate-900/40 to-slate-900/40 border-2 border-cyan-400/50 rounded-2xl p-8 text-center shadow-2xl shadow-cyan-900/30 space-y-5">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/30 to-cyan-500/30 rounded-full flex items-center justify-center border-2 border-cyan-400/40">
                        <Lock className="w-7 h-7 text-cyan-300" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-serif text-cyan-100 tracking-wide">第二次免費試算・Email 解鎖</h3>
                    <p className="text-cyan-200/80 text-base leading-relaxed max-w-md mx-auto">
                      第一次可直接免費查看完整解讀；第二次輸入 Email 後仍可免費解鎖，同一牌陣第三次起需付費。
                    </p>
                    <InlineEmailUnlock
                      onUnlocked={(email) => { void handleEmailUnlock(email); }}
                      readingType={SPREAD_ID}
                      theme="dark"
                    />
                  </div>
                )}
                {gate.phase === 'paywall' && (
                  <div className="bg-gradient-to-br from-slate-900/40 to-slate-900/40 border-2 border-cyan-400/50 rounded-2xl p-8 text-center shadow-2xl shadow-cyan-900/30">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/30 to-cyan-500/30 rounded-full flex items-center justify-center border-2 border-cyan-400/40">
                        <Lock className="w-7 h-7 text-cyan-300" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-serif text-cyan-100 mb-3 tracking-wide">解鎖完整使命指引</h3>
                    <p className="text-cyan-200/80 text-base leading-relaxed mb-4 max-w-md mx-auto">
                      更深層的指引與轉化在後面。解鎖十張牌的完整靈魂使命解讀，揭示你的靈性道路全貌。
                    </p>
                    <p className="font-serif text-2xl text-cyan-200 tracking-[0.3em] mb-6">{formatPrice(getSpreadPrice(SPREAD_ID) ?? 0)}</p>
                    {unlockError && <p className="text-red-500 text-sm mb-4">{unlockError}</p>}
                    <button
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                      className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-cyan-500 hover:from-cyan-400 hover:to-cyan-400 text-cyan-100 font-bold rounded-xl text-lg shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isCheckingOut ? '跳轉至綠界…' : '立即解鎖'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {showFullContent && (
              <>
                <section className="rounded-2xl border-2 border-cyan-400/45 bg-slate-900/70 px-5 py-6 shadow-[0_0_28px_rgba(34,211,238,0.12)] sm:px-8 sm:py-7">
                  <div className="mb-5 text-center">
                    <h3 className="font-serif text-2xl text-cyan-100 sm:text-3xl">解牌閱讀小提醒</h3>
                    <p className="mt-2 text-sm text-cyan-200/90 sm:text-base">
                      重點看以下 <strong className="text-cyan-100">5 張關鍵牌</strong>：
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm leading-relaxed text-cyan-50 sm:grid-cols-2 sm:text-base lg:grid-cols-5">
                    <p className="rounded-xl border border-cyan-400/20 bg-cyan-950/25 p-4">
                      <strong className="block text-cyan-200">位置 1（核心現狀）</strong>
                      <span className="mt-1 block">你當前的靈魂狀態與生命起跑點。</span>
                    </p>
                    <p className="rounded-xl border border-cyan-400/20 bg-cyan-950/25 p-4">
                      <strong className="block text-cyan-200">位置 2（核心挑戰）</strong>
                      <span className="mt-1 block">阻礙使命落實的主要障礙與靈魂功課。</span>
                    </p>
                    <p className="rounded-xl border border-cyan-400/20 bg-cyan-950/25 p-4">
                      <strong className="block text-cyan-200">位置 4（潛意識根基）</strong>
                      <span className="mt-1 block">深層的靈魂天賦與未察覺的真正渴望。</span>
                    </p>
                    <p className="rounded-xl border border-cyan-400/20 bg-cyan-950/25 p-4">
                      <strong className="block text-cyan-200">位置 6（近期方向）</strong>
                      <span className="mt-1 block">突破現狀、將使命落地的下一個關鍵行動。</span>
                    </p>
                    <p className="rounded-xl border border-cyan-400/20 bg-cyan-950/25 p-4 sm:col-span-2 lg:col-span-1">
                      <strong className="block text-cyan-200">位置 10（最終使命）</strong>
                      <span className="mt-1 block">整合所有歷程後，最終實現的靈魂願景與成就。</span>
                    </p>
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-5">
                  {selectedCards.map((position) => (
                    <MissionReadingCard key={position.position} position={position} mode="full" />
                  ))}
                </div>

                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border-2 border-cyan-400/40 rounded-3xl p-8 sm:p-12 shadow-2xl mt-12">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl sm:text-4xl font-serif text-cyan-100 mb-3">整體解讀總結</h2>
                    <p className="text-cyan-200/70 text-base sm:text-lg">綜合十張牌的智慧指引</p>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900/30 to-slate-900/30 border-2 border-cyan-400/40 rounded-2xl p-6 sm:p-8">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-500 flex items-center justify-center text-xl font-bold flex-shrink-0">1</div>
                        <h3 className="text-2xl sm:text-3xl font-serif text-cyan-200">自我覺醒與靈性成長</h3>
                      </div>
                      <p className="text-cyan-100/90 leading-relaxed text-base sm:text-lg">
                        {generateOverallSpiritualGrowthSummary(selectedCards.map(c => c.full))}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-slate-900/30 to-slate-900/30 border-2 border-cyan-400/40 rounded-2xl p-6 sm:p-8">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-500 flex items-center justify-center text-xl font-bold flex-shrink-0">2</div>
                        <h3 className="text-2xl sm:text-3xl font-serif text-cyan-200">療癒與釋放情緒</h3>
                      </div>
                      <p className="text-cyan-100/90 leading-relaxed text-base sm:text-lg">
                        {generateOverallHealingSummary(selectedCards.map(c => c.full))}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-slate-900/30 to-slate-900/30 border-2 border-cyan-400/40 rounded-2xl p-6 sm:p-8">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-500 flex items-center justify-center text-xl font-bold flex-shrink-0">3</div>
                        <h3 className="text-2xl sm:text-3xl font-serif text-cyan-200">人生方向與使命</h3>
                      </div>
                      <p className="text-cyan-100/90 leading-relaxed text-base sm:text-lg">
                        {generateOverallLifePathSummary(selectedCards.map(c => c.full))}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <ShareReadingSection
              deckId="lightworker"
              deckName="光行者神諭"
              spreadName="十字交叉使命陣"
              cards={selectedCards.filter((card) => card.preview).map((card) => ({
                cardKey: card.preview!.card_key,
                name: card.preview!.name,
                position: card.subtitle,
              }))}
              summary={selectedCards.find((card) => card.preview)?.preview?.preview_excerpt || '光之團隊正在協助你看見靈魂使命與下一步方向。'}
            />

            <TarotCourseCTA />

            <div className="flex justify-center pt-8">
              <button
                onClick={reset}
                className="group relative px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl font-medium text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <RotateCcw className="w-5 h-5" />
                  重新抽牌
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
      `}</style>

      <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />
    </div>
  );
}

export default LightworkerCelticCrossPage;
