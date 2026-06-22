import { X, Lock, Sparkles, Check, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkoutApi, publicApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getSpreadPrice, formatPrice } from '../lib/spread-prices';
import { submitToEcpay } from '../lib/ecpayRedirect';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadName: string;
  spreadType: string;
}

export function PaywallModal({
  isOpen,
  onClose,
  spreadName,
  spreadType,
}: PaywallModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const price = getSpreadPrice(spreadType);

  if (!isOpen) return null;

  const handleGoToLogin = () => {
    const redirect = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?redirect=${redirect}`);
  };

  const handleCheckout = async () => {
    if (!user) {
      handleGoToLogin();
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      publicApi.conversionEvent(
        'spread_unlock_attempted',
        { spread_type: spreadType, spread_name: spreadName },
        user.email,
      ).catch(() => {});

      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(spreadType);
      if (admin_unlocked) {
        navigate(`/checkout/return?order_id=${encodeURIComponent(order_id)}`);
        return;
      }
      if (!ecpay) {
        setError('結帳資料缺失,請重試');
        setIsProcessing(false);
        return;
      }
      submitToEcpay(ecpay, () => {
        setError('跳轉至綠界失敗 — 請確認瀏覽器未阻擋自動表單送出後重試');
        setIsProcessing(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '結帳失敗,請稍後再試');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl max-w-md w-full p-8 max-w-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-blue-400/60 hover:text-blue-300 transition-colors z-10"
          disabled={isProcessing}
          aria-label="關閉"
        >
          <X className="w-5 h-5" strokeWidth={1.4} />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-blue-500/40 mb-5 text-blue-400">
            <Lock className="w-6 h-6" strokeWidth={1.4} />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-blue-100 tracking-[0.3em] mb-2">
            解　鎖　完　整　解　析
          </h2>
          <p className="text-sm sm:text-base text-blue-200/85 mt-3 tracking-wide">
            {spreadName}
          </p>
          {price !== null && (
            <p className="font-serif text-3xl text-blue-400 mt-5 tracking-[0.15em]">
              {formatPrice(price)}
            </p>
          )}
        </div>

        <div className="border-t border-b border-blue-500/15 py-5 mb-6 space-y-3">
          <Bullet>深度牌義解讀:每張牌在你生命中的真正意義</Bullet>
          <Bullet>實用行動建議:具體可執行的下一步</Bullet>
          <Bullet>靈性指引與療癒:深層的靈魂訊息</Bullet>
          <Bullet>整體解讀總結:綜合所有牌卡的能量</Bullet>
        </div>

        {!user && (
          <div className="border border-blue-500/30 bg-blue-500/8 px-4 py-3 mb-5 text-sm text-blue-200 tracking-wide leading-relaxed">
            購買前請先登入,登入後會回到此頁繼續結帳。
          </div>
        )}

        {error && (
          <div className="border border-red-500/50 bg-red-600/15 px-4 py-3 mb-5 text-sm text-blue-100 tracking-wide">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {user ? (
            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              {isProcessing ? (
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

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 w-full !justify-center"
          >
            稍　後　再　說
          </button>
        </div>

        <p className="mt-6 pt-5 border-t border-blue-500/10 text-center text-xs text-blue-400/60 tracking-wide leading-relaxed">
          付款由 ECPay 綠界金流安全處理。<br/>支援信用卡、ATM 轉帳、超商代碼、超商條碼。
        </p>
      </div>
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
