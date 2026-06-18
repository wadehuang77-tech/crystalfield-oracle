import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Sparkles, Check, LogIn } from 'lucide-react';
import { getSpreadPrice, formatPrice } from '../lib/spread-prices';
import { useAuth } from '../contexts/AuthContext';
import { useSpreadAccess } from '../hooks/useSpreadAccess';
import { checkoutApi, publicApi, type OrderPick } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { savePendingDraw } from '../lib/pendingDraw';

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
  const access = useSpreadAccess(spreadId ?? '');
  const isPaid = isPaidProp ?? access.isPaid;
  const accessLoadError = isPaidProp === undefined ? access.loadError : null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const price = spreadId ? getSpreadPrice(spreadId) : null;

  const [progress, setProgress] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isPaid) return;
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
  }, [spreadName, isPaid]);

  const handleGoToLogin = () => {
    if (spreadId && picks && picks.length > 0) {
      savePendingDraw(spreadId, picks);
    }
    const redirect = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?redirect=${redirect}`);
  };

  const handleCheckout = async () => {
    if (!user) {
      handleGoToLogin();
      return;
    }
    if (!spreadId) {
      setError('商品代號缺失,無法結帳');
      return;
    }
    setError('');
    setIsCheckingOut(true);
    try {
      publicApi.conversionEvent(
        'spread_unlock_attempted',
        { spread_id: spreadId, spread_name: spreadName },
        user.email,
      ).catch(() => {});

      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(spreadId, picks);
      if (admin_unlocked) {
        navigate(`/checkout/return?order_id=${encodeURIComponent(order_id)}`);
        return;
      }
      if (!ecpay) {
        setError('結帳資料缺失,請重試');
        setIsCheckingOut(false);
        return;
      }
      submitToEcpay(ecpay, () => {
        setError('跳轉至綠界失敗 — 請確認瀏覽器未阻擋自動表單送出後重試');
        setIsCheckingOut(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '結帳失敗,請稍後再試');
      setIsCheckingOut(false);
    }
  };

  if (isPaid) return <>{fullContent}</>;

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
    <div className="w-full">
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

      <div className="relative mb-2">
        <div className="pointer-events-none select-none">{previewContent}</div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
      </div>

      {showPaywall && (
        <div className="mt-6 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 border border-blue-500/40 mb-5 text-blue-400">
              <Lock className="w-6 h-6" strokeWidth={1.4} />
            </div>
            <h3 className="font-serif text-lg sm:text-2xl text-blue-100 tracking-[0.15em] sm:tracking-[0.3em] mb-2">
              解鎖完整解析
            </h3>
            <p className="text-sm sm:text-base text-blue-200/85 mt-3 tracking-wide">{spreadName}</p>
            {price !== null && (
              <p className="font-serif text-3xl text-blue-400 mt-5 tracking-[0.15em]">
                {formatPrice(price)}
              </p>
            )}
          </div>

          <div className="border-t border-b border-blue-500/15 py-5 mb-6 space-y-3">
            <Bullet>每張牌的完整深度解讀(100% 內容)</Bullet>
            <Bullet>實用行動建議與靈性指引</Bullet>
            <Bullet>整體牌陣能量總結</Bullet>
            <Bullet>靈魂提問與療癒方向</Bullet>
          </div>

          {!user && (
            <div className="border border-blue-500/30 bg-blue-500/10 px-4 py-3 mb-5 text-sm text-blue-200 tracking-wide leading-relaxed">
              購買前請先登入,登入後會回到此頁繼續結帳。
            </div>
          )}

          {error && (
            <div className="border border-red-500/50 bg-red-600/15 px-4 py-3 mb-5 text-sm text-blue-100 tracking-wide">
              {error}
            </div>
          )}

          {user ? (
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              {isCheckingOut ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  跳轉至綠界…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" strokeWidth={1.4} />
                  {price !== null ? `${formatPrice(price)} 立即結帳` : '立即結帳'}
                </>
              )}
            </button>
          ) : (
            <button onClick={handleGoToLogin} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full">
              <LogIn className="w-4 h-4" strokeWidth={1.4} />
              先登入
            </button>
          )}

          <p className="mt-5 text-center text-xs text-blue-400/60 tracking-wide leading-relaxed">
            付款由 ECPay 綠界金流安全處理。<br/>支援信用卡、ATM 轉帳、超商代碼、超商條碼。
          </p>
        </div>
      )}
    </div>
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
