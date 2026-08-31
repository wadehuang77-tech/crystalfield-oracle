import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Sparkles, Check, LogIn, Gift } from 'lucide-react';
import { formatPrice } from '../lib/spread-prices';
import { useAuth } from '../contexts/AuthContext';
import { useSpreadAccess } from '../hooks/useSpreadAccess';
import { checkoutApi, publicApi, type OrderPick } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { savePendingDraw } from '../lib/pendingDraw';
import { FreeReadingModal } from './FreeReadingModal';
import {
  canUseAsFreeGuest,
  needsRegistrationForFree,
  canUseAsFreeUser,
  consumeGuestFree,
  consumeMemberFree,
  freeReadsLeft,
} from '../lib/freeReadings';
import { TAROT_SUBSCRIPTION } from '../lib/tarot-subscription';

interface PaywallGateProps {
  spreadName: string;
  spreadId?: string;
  onUnlock?: () => Promise<void>;
  previewContent: ReactNode;
  fullContent: ReactNode;
  isPaid?: boolean;
  picks?: OrderPick[];
}

export function PaywallGate({
  spreadName,
  spreadId,
  previewContent,
  fullContent,
  isPaid: isPaidProp,
  picks,
}: PaywallGateProps) {
  const access = useSpreadAccess();
  const isPaidByOrder = isPaidProp ?? access.isPaid;
  const accessLoadError = isPaidProp === undefined ? access.loadError : null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const price = TAROT_SUBSCRIPTION.price;

  const [progress, setProgress] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [showFreeModal, setShowFreeModal] = useState(false);

  // ── Free reading state ────────────────────────────────────────────
  const [freeGranted, setFreeGranted] = useState(false);

  // Check free / bundle access when gate first appears (isPaidByOrder = false)
  useEffect(() => {
    if (isPaidByOrder) return;

    // 1. Guest free read (no registration)
    if (canUseAsFreeGuest()) {
      consumeGuestFree();
      setFreeGranted(true);
      return;
    }

    // 2. Member free read (2 more after registration)
    if (user && canUseAsFreeUser()) {
      consumeMemberFree();
      setFreeGranted(true);
      return;
    }

    // 3. Guest needs to register to get 2 more free reads
    if (!user && needsRegistrationForFree()) {
      setShowFreeModal(true);
    }

    // 4. Paywall. Paid bundle credits are consumed only by the successful
    // spread-unlock API, never merely because this gate rendered.
    startProgressThenPaywall();
  }, [isPaidByOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectivePaid = isPaidByOrder || freeGranted;

  function startProgressThenPaywall() {
    setProgress(0);
    setShowPaywall(false);
    let frame: ReturnType<typeof setTimeout>;
    const animate = (current: number) => {
      if (current >= 30) {
        setProgress(30);
        frame = setTimeout(() => setShowPaywall(true), 400);
        return;
      }
      const next = Math.min(current + (Math.random() * 5 + 1), 30);
      setProgress(next);
      frame = setTimeout(() => animate(next), 75);
    };
    animate(0);
    return () => clearTimeout(frame);
  }

  const handleGoToLogin = () => {
    if (spreadId && picks && picks.length > 0) savePendingDraw(spreadId, picks);
    const redirect = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?redirect=${redirect}`);
  };

  const handleCheckout = async () => {
    if (!user) { handleGoToLogin(); return; }
    if (!spreadId) { setError('商品代號缺失,無法結帳'); return; }

    const targetId = TAROT_SUBSCRIPTION.id;
    setError('');
    setIsCheckingOut(true);
    try {
      publicApi.conversionEvent(
        'spread_unlock_attempted',
        { spread_id: targetId, spread_name: spreadName },
        user.email,
      ).catch(() => {});

      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(targetId);
      if (admin_unlocked) {
        navigate(`/checkout/return?order_id=${encodeURIComponent(order_id)}`);
        return;
      }
      if (!ecpay) { setError('結帳資料缺失,請重試'); setIsCheckingOut(false); return; }
      submitToEcpay(ecpay, () => {
        setError('跳轉至綠界失敗 — 請確認瀏覽器未阻擋自動表單送出後重試');
        setIsCheckingOut(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '結帳失敗,請稍後再試');
      setIsCheckingOut(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  if (effectivePaid) {
    const badge = freeGranted
      ? `免費體驗（剩餘 ${freeReadsLeft()} 次）`
      : null;
    return (
      <>
        {badge && (
          <div className="mb-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300/80 tracking-wide">
              <Gift className="w-3 h-3" /> {badge}
            </span>
          </div>
        )}
        {fullContent}
      </>
    );
  }

  if (accessLoadError) {
    return (
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-6 shadow-xl text-center my-6">
        <p className="text-sm text-blue-200/85 mb-3 tracking-wide">無法確認購買狀態</p>
        <p className="text-xs text-blue-400/70 mb-5">{accessLoadError}</p>
        <button
          onClick={() => access.refreshAccess()}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs"
        >
          重 新 載 入
        </button>
      </div>
    );
  }

  return (
    <>
      <FreeReadingModal
        isOpen={showFreeModal}
        onClose={() => { setShowFreeModal(false); startProgressThenPaywall(); }}
      />

      <div className="w-full">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-[0.3em] text-blue-400/80">解 讀 進 度</span>
            <span className="text-sm text-blue-300 font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-px bg-blue-500/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-300 transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-400/60 mt-2 tracking-wide">
            {progress < 30 ? '正在讀取牌義能量⋯' : '核心解讀已備妥,等待解鎖'}
          </p>
        </div>

        {/* Preview (blurred) */}
        <div className="relative mb-2">
          <div className="pointer-events-none select-none">{previewContent}</div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
        </div>

        {/* Paywall panel */}
        {showPaywall && (
          <div className="mt-6 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-6 shadow-xl">

            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 border border-blue-500/40 mb-4 text-blue-400">
                <Lock className="w-5 h-5" strokeWidth={1.4} />
              </div>
              <h3 className="font-serif text-lg sm:text-xl text-blue-100 tracking-[0.2em] mb-1">解鎖完整解析</h3>
              <p className="text-sm text-blue-200/70 tracking-wide">{spreadName}</p>
            </div>

            {/* Included features */}
            <div className="border-t border-b border-blue-500/15 py-4 mb-5 space-y-2.5">
              <Bullet>每張牌的完整深度解讀（100% 內容）</Bullet>
              <Bullet>實用行動建議與靈性指引</Bullet>
              <Bullet>整體牌陣能量總結</Bullet>
              <Bullet>靈魂提問與療癒方向</Bullet>
            </div>

            {error && (
              <div className="border border-red-500/50 bg-red-600/15 px-4 py-3 mb-4 text-sm text-blue-100 tracking-wide rounded-lg">
                {error}
              </div>
            )}

            {/* Pricing options */}
            <div className="space-y-3">

              {/* Single */}
              {price !== null && (
                <PriceCard
                  icon={<Sparkles className="w-4 h-4" strokeWidth={1.4} />}
                  label={TAROT_SUBSCRIPTION.name}
                  price={formatPrice(price)}
                  sub="信用卡每月自動續訂，7 大塔羅牌組與全部牌陣不限次數"
                  cta={user ? `${formatPrice(price)} 立即加入` : '先登入・再加入'}
                  loading={isCheckingOut}
                  onClick={() => user ? handleCheckout() : handleGoToLogin()}
                />
              )}

              {/* Login prompt for guests */}
              {!user && (
                <div className="mt-2">
                  <button
                    onClick={handleGoToLogin}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg transition-all duration-300"
                  >
                    <LogIn className="w-4 h-4" strokeWidth={1.4} />
                    先登入・再加入會員
                  </button>
                </div>
              )}
            </div>

            <p className="mt-5 text-center text-xs text-blue-400/50 tracking-wide leading-relaxed">
              付款由 ECPay 綠界金流安全處理<br />
              月費會員以信用卡定期定額付款
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-1" strokeWidth={1.6} />
      <p className="text-sm text-blue-200/85 leading-relaxed">{children}</p>
    </div>
  );
}

function PriceCard({
  icon, label, price, sub, badge, highlight, cta, loading, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  price: string;
  sub: string;
  badge?: string;
  highlight?: boolean;
  cta: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`border rounded-xl p-4 ${highlight ? 'border-blue-400/50 bg-blue-500/8' : 'border-blue-500/20 bg-slate-900/30'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-400">{icon}</span>
          <span className="text-sm font-medium text-blue-100">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`font-bold text-lg ${highlight ? 'text-blue-300' : 'text-blue-200'}`}>{price}</span>
          {badge && (
            <span className="text-[10px] border border-yellow-500/40 text-yellow-400/80 rounded px-1.5 py-0.5 ml-1">{badge}</span>
          )}
        </div>
      </div>
      <p className="text-xs text-blue-400/60 mb-3">{sub}</p>
      <button
        onClick={onClick}
        disabled={loading}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          highlight
            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg'
            : 'bg-slate-800/60 border border-blue-500/30 hover:bg-slate-700/60 text-blue-200'
        }`}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
            跳轉至綠界…
          </>
        ) : (
          cta
        )}
      </button>
    </div>
  );
}
