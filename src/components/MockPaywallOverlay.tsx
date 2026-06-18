import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Sparkles, Check, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkoutApi, publicApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { getSpreadPrice, formatPrice } from '../lib/spread-prices';

interface MockPaywallOverlayProps {
  spreadName: string;
  spreadId?: string;
  onUnlock?: () => Promise<void>;
}

export function MockPaywallOverlay({ spreadName, spreadId }: MockPaywallOverlayProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const price = spreadId ? getSpreadPrice(spreadId) : null;

  const [progress, setProgress] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let frame: ReturnType<typeof setTimeout>;
    const animate = (current: number) => {
      if (current >= 30) {
        setProgress(30);
        frame = setTimeout(() => setShowPaywall(true), 500);
        return;
      }
      const next = Math.min(current + (Math.random() * 4 + 1), 30);
      setProgress(next);
      frame = setTimeout(() => animate(next), 80);
    };
    animate(0);
    return () => clearTimeout(frame);
  }, []);

  const handleGoToLogin = () => {
    const redirect = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?redirect=${redirect}`);
  };

  const handleCheckout = async () => {
    if (!user) { handleGoToLogin(); return; }
    if (!spreadId) { setError('商品代號缺失,無法結帳'); return; }
    setError('');
    setIsCheckingOut(true);
    try {
      publicApi.conversionEvent(
        'spread_unlock_attempted',
        { spread_id: spreadId, spread_name: spreadName },
        user.email,
      ).catch(() => {});
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(spreadId);
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

  return (
    <div className="relative w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs tracking-[0.3em] text-blue-400/80">解 讀 進 度</span>
          <span className="text-sm text-blue-300 font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-px bg-blue-500/15 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-300 transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-blue-400/60 mt-2 tracking-wide">
          {progress < 30 ? '正在讀取牌義能量⋯' : '核心解讀已備妥,等待解鎖'}
        </p>
      </div>

      {showPaywall && (
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 border border-blue-500/40 mb-5 text-blue-400">
              <Lock className="w-6 h-6" strokeWidth={1.4} />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl text-blue-100 tracking-[0.3em] mb-2">
              解　鎖　完　整　牌　陣　解　析
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
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"/>
                  跳　轉　至　綠　界…
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
              先　登　入
            </button>
          )}

          <p className="mt-5 text-center text-xs text-blue-400/60 tracking-wide leading-relaxed">
            付款由 ECPay 綠界金流安全處理。
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
