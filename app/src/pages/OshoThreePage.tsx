import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, RefreshCw, Lock, Loader2 } from 'lucide-react';
import { generateThreeCardInterpretation } from '../utils/oshoThreeCardInterpretation';
import { CrystalGridPromoModal } from '../components/CrystalGridPromoModal';
import { useCrystalPromo } from '../hooks/useCrystalPromo';
import TarotCourseCTA from '../components/TarotCourseCTA';
import { PaywallModal } from '../components/PaywallModal';
import { PaywallGate } from '../components/PaywallGate';
import { useAuth } from '../contexts/AuthContext';
import { LoginPromptModal } from '../components/LoginPromptModal';
import { useSpreadAccess } from '../hooks/useSpreadAccess';
import { useDeck, pickRandomCards, unlockSpreadCards } from '../hooks/useDeck';
import { type CardPreview, checkoutApi } from '../lib/api';
import { consumePendingDraw } from '../lib/pendingDraw';
import CardShuffleAnimation from '../components/CardShuffleAnimation';

const SPREAD_ID = 'osho_three';

interface OshoMeanings {
  currentEnergy: string;
  dailyGuidance: string;
  emotionalInsight: string;
  blockageAnalysis: string;
  meditationEntry: string;
}

interface FullCard {
  card_key: string;
  name: string;
  subtitle: string;
  meanings: OshoMeanings;
}

interface ThreeCardReading {
  inner: { preview: CardPreview; full: FullCard | null };
  outer: { preview: CardPreview; full: FullCard | null };
  integration: { preview: CardPreview; full: FullCard | null };
}

export default function OshoThreePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { cards: deck, error: deckError } = useDeck('osho');
  const [reading, setReading] = useState<ThreeCardReading | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const { showModal, handleClose } = useCrystalPromo(!!reading && !isRevealing);
  const { userState } = useSpreadAccess(SPREAD_ID);

  const drawCards = () => {
    if (!deck || deck.length === 0) return;
    setIsRevealing(true);
    setIsLocallyUnlocked(false);
    setUnlockError(null);

    const shuffled = pickRandomCards(deck, 3);
    const newReading: ThreeCardReading = {
      inner:       { preview: shuffled[0], full: null },
      outer:       { preview: shuffled[1], full: null },
      integration: { preview: shuffled[2], full: null },
    };

    setTimeout(() => {
      setReading(newReading);
      setIsRevealing(false);
    }, 2400);
  };

  const reset = () => {
    setReading(null);
    setIsRevealing(false);
    setIsLocallyUnlocked(false);
    setUnlockError(null);
  };

  const handleUnlockClick = () => {
    if (userState === 'guest') {
      setShowLoginPrompt(true);
    } else if (userState === 'user_free') {
      setShowPaywall(true);
    }
  };

  useEffect(() => {
    if (reading && !isRevealing) {
      window.scrollTo(0, 0);
    }
  }, [reading, isRevealing]);

  useEffect(() => {
    if (!deck || deck.length === 0) return;
    if (reading) return;
    if (searchParams.get('order_id')) return;
    const pending = consumePendingDraw(SPREAD_ID);
    if (!pending) return;
    const find = (pos: number): CardPreview | undefined => {
      const pick = pending.picks.find((p) => p.position === pos);
      if (!pick) return undefined;
      return deck.find((c) => c.card_key === pick.card_key);
    };
    const inner = find(1);
    const outer = find(2);
    const integration = find(3);
    if (!inner || !outer || !integration) return;
    setReading({
      inner:       { preview: inner,       full: null },
      outer:       { preview: outer,       full: null },
      integration: { preview: integration, full: null },
    });
  }, [deck, reading]);

  const restoreStartedRef = useRef(false);
  useEffect(() => {
    if (restoreStartedRef.current) return;
    const orderId = searchParams.get('order_id');
    if (!orderId || !deck || deck.length === 0) return;
    restoreStartedRef.current = true;

    (async () => {
      try {
        const { order } = await checkoutApi.getOrder(orderId);
        if (order.item_id !== SPREAD_ID || order.status !== 'paid' || !order.picks) {
          setUnlockError('無法還原此訂單(item_id/status/picks 不符)');
          return;
        }
        const find = (pos: number): CardPreview | undefined => {
          const pick = order.picks!.find((p) => p.position === pos);
          if (!pick) return undefined;
          return deck.find((c) => c.card_key === pick.card_key);
        };
        const inner = find(1);
        const outer = find(2);
        const integration = find(3);
        if (!inner || !outer || !integration) {
          setUnlockError('牌組對不上,無法還原');
          return;
        }
        const baseReading: ThreeCardReading = {
          inner:       { preview: inner,       full: null },
          outer:       { preview: outer,       full: null },
          integration: { preview: integration, full: null },
        };
        setReading(baseReading);

        try {
          const picks = [
            { card_key: inner.card_key,       position: 1 },
            { card_key: outer.card_key,       position: 2 },
            { card_key: integration.card_key, position: 3 },
          ];
          const unlocked = await unlockSpreadCards(SPREAD_ID, picks, order.id);
          const byKey = new Map(unlocked.map((u) => [u.card_key, u]));
          const synth = (slot: { preview: CardPreview }): FullCard | null => {
            const u = byKey.get(slot.preview.card_key);
            if (!u) return null;
            const m = (u.gated as { meanings?: OshoMeanings }).meanings;
            if (!m) return null;
            return { card_key: slot.preview.card_key, name: u.name, subtitle: u.name_secondary ?? '', meanings: m };
          };
          setReading({
            inner:       { ...baseReading.inner,       full: synth(baseReading.inner) },
            outer:       { ...baseReading.outer,       full: synth(baseReading.outer) },
            integration: { ...baseReading.integration, full: synth(baseReading.integration) },
          });
          setIsLocallyUnlocked(true);
        } catch (err) {
          setUnlockError(err instanceof Error ? err.message : '解鎖失敗,請稍後再試');
        }
      } catch (e) {
        setUnlockError(e instanceof Error ? `還原訂單失敗:${e.message}` : '還原訂單失敗');
      }
    })();
  }, [searchParams, deck]);

  const handleMockUnlock = async () => {
    if (!user) { setShowLoginPrompt(true); return; }
    setShowPaywall(true);
  };

  if (!reading && !isRevealing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif mb-4 bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              三張牌陣
            </h1>
            <p className="text-teal-200/80 text-lg mb-6">適合用於深度冥想或了解個人身心狀態</p>

            <div className="max-w-2xl mx-auto space-y-4 text-left bg-slate-800/60 backdrop-blur-sm border-2 border-teal-500/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <span className="text-teal-300 font-bold text-lg">1.</span>
                <div>
                  <h3 className="text-teal-200 font-semibold mb-1">內在感受 (Inner)</h3>
                  <p className="text-teal-100/70 text-sm">你的靈魂現在想告訴你什麼？</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-cyan-300 font-bold text-lg">2.</span>
                <div>
                  <h3 className="text-cyan-200 font-semibold mb-1">外在表現 (Outer)</h3>
                  <p className="text-cyan-100/70 text-sm">世界是如何看待你的，或是環境對你的影響。</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-teal-300 font-bold text-lg">3.</span>
                <div>
                  <h3 className="text-teal-200 font-semibold mb-1">整合建議 (Integration)</h3>
                  <p className="text-teal-100/70 text-sm">如何平衡內外，達到中心點的寧靜。</p>
                </div>
              </div>
            </div>
          </div>

          {deckError && <p className="text-center text-red-300 mb-6">{deckError}</p>}

          <div className="flex flex-col items-center gap-8">
            <div className="flex gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-32 h-48 bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border-2 border-teal-500/40 rounded-lg backdrop-blur-sm animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>

            <button
              onClick={drawCards}
              disabled={!deck || deck.length === 0}
              className="group relative px-12 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all shadow-2xl hover:shadow-teal-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-xl font-medium">{deck ? '開始抽牌' : '載入牌組中…'}</span>
                <Sparkles className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
              </div>
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (isRevealing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
        <CardShuffleAnimation message="禪　心　牌　陣　顯　現　中" />
      </div>
    );
  }

  if (!reading) return null;
  const showFullContent = isLocallyUnlocked && reading.inner.full && reading.outer.full && reading.integration.full;

  const previewSlot = (slot: { preview: CardPreview }, label: string, label_en: string, accent: 'teal' | 'cyan') => {
    const borderClass = accent === 'teal' ? 'border-teal-500/40' : 'border-cyan-500/40';
    const titleColor = accent === 'teal' ? 'text-teal-200' : 'text-cyan-200';
    const subColor = accent === 'teal' ? 'text-teal-300/60' : 'text-cyan-300/60';
    const nameColor = accent === 'teal' ? 'text-teal-100' : 'text-cyan-100';
    const italicColor = accent === 'teal' ? 'text-teal-300/70' : 'text-cyan-300/70';
    const lockBoxBorder = accent === 'teal' ? 'border-teal-500/30' : 'border-cyan-500/30';
    const bodyColor = accent === 'teal' ? 'text-teal-100/85' : 'text-cyan-100/85';
    const hintColor = accent === 'teal' ? 'text-teal-300/70' : 'text-cyan-300/70';

    return (
      <div className={`bg-slate-800/60 backdrop-blur-sm border-2 ${borderClass} rounded-xl p-6`}>
        <div className="text-center mb-4">
          <h3 className={`text-2xl font-serif ${titleColor} mb-1`}>{label}</h3>
          <p className={`text-sm ${subColor} italic mb-3`}>{label_en}</p>
          <h2 className={`text-3xl font-serif ${nameColor} mb-1`}>{slot.preview.name}</h2>
          {slot.preview.name_secondary && (
            <p className={`${italicColor} italic text-sm`}>{slot.preview.name_secondary}</p>
          )}
        </div>
        <div className={`bg-slate-900/60 border ${lockBoxBorder} rounded-lg p-4`}>
          {slot.preview.preview_excerpt ? (
            <>
              <div className="relative">
                <p className={`${bodyColor} text-sm leading-loose whitespace-pre-line`}>
                  {slot.preview.preview_excerpt}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-slate-900 pointer-events-none" />
              </div>
              <p className={`mt-3 text-[0.65rem] ${hintColor} tracking-wide text-center`}>
                前 30% 預覽
              </p>
            </>
          ) : (
            <p className={`${hintColor} text-sm text-center`}>解鎖後可看完整解讀</p>
          )}
        </div>
      </div>
    );
  };

  const fullSlot = (full: FullCard, label: string, label_en: string, accent: 'teal' | 'cyan', sections: Array<{ heading: string; key: keyof OshoMeanings }>) => {
    const borderClass = accent === 'teal' ? 'border-teal-500/40' : 'border-cyan-500/40';
    const titleColor = accent === 'teal' ? 'text-teal-200' : 'text-cyan-200';
    const subColor = accent === 'teal' ? 'text-teal-300/60' : 'text-cyan-300/60';
    const nameColor = accent === 'teal' ? 'text-teal-100' : 'text-cyan-100';
    const italicColor = accent === 'teal' ? 'text-teal-300/70' : 'text-cyan-300/70';
    const sectionBorder = accent === 'teal' ? 'border-teal-500/30' : 'border-cyan-500/30';
    const headingColor = accent === 'teal' ? 'text-teal-200' : 'text-cyan-200';
    const bodyColor = accent === 'teal' ? 'text-teal-100/80' : 'text-cyan-100/80';

    return (
      <div className={`bg-slate-800/60 backdrop-blur-sm border-2 ${borderClass} rounded-xl p-6`}>
        <div className="text-center mb-6">
          <h3 className={`text-2xl font-serif ${titleColor} mb-1`}>{label}</h3>
          <p className={`text-sm ${subColor} italic mb-3`}>{label_en}</p>
          <h2 className={`text-3xl font-serif ${nameColor} mb-1`}>{full.name}</h2>
          <p className={`${italicColor} italic text-sm`}>{full.subtitle}</p>
        </div>
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.key} className={`bg-slate-900/60 border ${sectionBorder} rounded-lg p-4`}>
              <h4 className={`${headingColor} font-semibold mb-2 text-sm`}>{s.heading}</h4>
              <p className={`${bodyColor} text-sm leading-relaxed whitespace-pre-line`}>{full.meanings[s.key]}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2 text-teal-100">你的三張牌陣</h1>
          <p className="text-teal-300/70">內在與外在的整合之旅</p>
        </div>

        <>
          {unlockError && (
            <div className="border border-red-500/45 bg-red-500/10 px-4 py-3 mb-5 text-sm text-red-200 tracking-wide text-center rounded-lg">
              {unlockError}
            </div>
          )}
          <PaywallGate
            spreadName="奧修三張牌陣"
            spreadId="osho_three"
            onUnlock={handleMockUnlock}
            isPaid={isLocallyUnlocked}
            picks={[
              { card_key: reading.inner.preview.card_key,       position: 1 },
              { card_key: reading.outer.preview.card_key,       position: 2 },
              { card_key: reading.integration.preview.card_key, position: 3 },
            ]}
            previewContent={
              <div className="space-y-6 mb-8">
                <div className="grid lg:grid-cols-3 gap-8">
                  {previewSlot(reading.inner,       '內在感受', 'Inner',       'teal')}
                  {previewSlot(reading.outer,       '外在表現', 'Outer',       'cyan')}
                  {previewSlot(reading.integration, '整合建議', 'Integration', 'teal')}
                </div>
              </div>
            }
            fullContent={
              showFullContent ? (
                <div className="space-y-8 mb-8">
                  <div className="grid lg:grid-cols-3 gap-8">
                    {fullSlot(reading.inner.full!, '內在感受', 'Inner', 'teal', [
                      { heading: '當下能量狀態', key: 'currentEnergy' },
                      { heading: '情緒與潛意識', key: 'emotionalInsight' },
                    ])}
                    {fullSlot(reading.outer.full!, '外在表現', 'Outer', 'cyan', [
                      { heading: '今日指引 / 靈性訊息', key: 'dailyGuidance' },
                      { heading: '卡關點解析', key: 'blockageAnalysis' },
                    ])}
                    {fullSlot(reading.integration.full!, '整合建議', 'Integration', 'teal', [
                      { heading: '冥想入口', key: 'meditationEntry' },
                    ])}
                  </div>
                  <div className="max-w-4xl mx-auto bg-slate-800/60 backdrop-blur-sm border-2 border-teal-500/30 rounded-xl p-8">
                    <h3 className="text-2xl font-serif text-teal-200 mb-6 text-center">整體解讀</h3>
                    <div className="space-y-6 text-teal-100/90 leading-relaxed">
                      <div className="bg-slate-900/40 border border-teal-500/20 rounded-lg p-6">
                        <p className="text-base leading-loose whitespace-pre-line">
                          {generateThreeCardInterpretation({
                            inner:       { id: Number(reading.inner.preview.card_key)       || 0, name: reading.inner.full!.name,       subtitle: reading.inner.full!.subtitle,       meanings: reading.inner.full!.meanings },
                            outer:       { id: Number(reading.outer.preview.card_key)       || 0, name: reading.outer.full!.name,       subtitle: reading.outer.full!.subtitle,       meanings: reading.outer.full!.meanings },
                            integration: { id: Number(reading.integration.preview.card_key) || 0, name: reading.integration.full!.name, subtitle: reading.integration.full!.subtitle, meanings: reading.integration.full!.meanings },
                          })}
                        </p>
                      </div>
                      <div className="border-t border-teal-500/30 pt-6">
                        <p className="text-center text-teal-200/70 italic text-sm">這三張牌共同指引你找到內在與外在的平衡點，達到中心的寧靜。讓這些訊息在你心中迴響，找到屬於你的整合之道。</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 mb-8">
                  <div className="grid lg:grid-cols-3 gap-8">
                    {previewSlot(reading.inner,       '內在感受', 'Inner',       'teal')}
                    {previewSlot(reading.outer,       '外在表現', 'Outer',       'cyan')}
                    {previewSlot(reading.integration, '整合建議', 'Integration', 'teal')}
                  </div>
                  <div className="flex items-center justify-center gap-3 py-6 text-teal-300 text-sm tracking-wide">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在為你載入完整解讀…
                  </div>
                </div>
              )
            }
          />
          </>

        <TarotCourseCTA />

        <div className="flex justify-center">
          <button
            onClick={reset}
            className="group flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all shadow-xl hover:shadow-teal-500/50 hover:scale-105"
          >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-lg font-medium">重新抽牌</span>
          </button>
        </div>

      </div>

      <CrystalGridPromoModal isOpen={showModal} onClose={handleClose} />
      <LoginPromptModal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} redirectTo="/osho/three" />
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        spreadName="奧修三張牌陣"
        spreadType={SPREAD_ID}
      />
    </div>
  );
}
