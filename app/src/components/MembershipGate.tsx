import { X, Crown, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkoutApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { saveMembershipCheckoutRedirect, savePendingSingleDraw } from '../lib/pendingDraw';
import { TAROT_SUBSCRIPTION } from '../lib/tarot-subscription';
import { TarotSubscriptionDetails } from './TarotSubscriptionDetails';
import { trackTarotSubscriptionCheckout, trackTarotSubscriptionView } from '../lib/ga4';

interface MembershipGateProps {
  isOpen: boolean;
  onClose: () => void;
  resumePath?: string;
  pendingSingleDraw?: {
    spread_id: string;
    card_key: string;
    reversed?: boolean;
  };
}

export function MembershipGate({ isOpen, onClose, resumePath, pendingSingleDraw }: MembershipGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) trackTarotSubscriptionView();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    trackTarotSubscriptionCheckout();
    const redirectPath = resumePath ?? (location.pathname + location.search);
    saveMembershipCheckoutRedirect(redirectPath);
    if (pendingSingleDraw) {
      savePendingSingleDraw({
        ...pendingSingleDraw,
        route_path: redirectPath,
      });
    }
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(redirectPath));
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const { ecpay, admin_unlocked } = await checkoutApi.createOrder(TAROT_SUBSCRIPTION.id);
      if (admin_unlocked) {
        window.location.assign(redirectPath);
        return;
      }
      if (!ecpay) { setError('結帳資料缺失，請重試'); setIsProcessing(false); return; }
      submitToEcpay(ecpay, () => {
        setError('跳轉至綠界失敗，請重試');
        setIsProcessing(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '結帳失敗，請稍後再試');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-2xl sm:p-8">
        <button onClick={onClose} disabled={isProcessing}
          className="absolute top-4 right-4 text-amber-400/60 hover:text-amber-300 transition-colors"
          aria-label="關閉">
          <X className="w-5 h-5" strokeWidth={1.4} />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-amber-500/40 mb-5 text-amber-400 rounded-full">
            <Crown className="w-7 h-7" strokeWidth={1.4} />
          </div>
          <h2 className="font-serif text-xl text-amber-100 tracking-[0.2em] mb-2">
            {TAROT_SUBSCRIPTION.name}
          </h2>
          <p className="mt-4 font-serif text-3xl tracking-[0.15em] text-amber-400">NT${TAROT_SUBSCRIPTION.price} / 月</p>
          <p className="mt-2 text-sm font-medium text-amber-300">信用卡每月自動續訂</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/70">
            會員有效期間可不限次數使用本站 7 大塔羅牌組與全部牌陣。
          </p>
        </div>

        <TarotSubscriptionDetails />

        {error && (
          <div className="border border-red-500/50 bg-red-600/15 px-4 py-3 mb-4 text-sm text-amber-100 tracking-wide rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button onClick={handleSubscribe} disabled={isProcessing}
            className="inline-flex items-center justify-center gap-2 w-full px-8 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-medium rounded-xl shadow-lg hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {isProcessing ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>跳轉至綠界…</>
            ) : (
              <><Sparkles className="w-4 h-4" strokeWidth={1.4} />NT${TAROT_SUBSCRIPTION.price} / 月 立即加入</>
            )}
          </button>
          <button onClick={onClose} disabled={isProcessing}
            className="inline-flex items-center justify-center w-full px-8 py-3 bg-slate-800/60 border-2 border-amber-500/30 rounded-xl hover:bg-slate-700/60 transition-all text-amber-200">
            稍後再說
          </button>
        </div>

        <p className="mt-3 text-center text-xs leading-relaxed text-amber-100/55">
          使用信用卡定期定額付款，每月自動續訂 NT${TAROT_SUBSCRIPTION.price}。
        </p>

        <p className="mt-5 pt-4 border-t border-amber-500/10 text-center text-xs text-amber-400/50 leading-relaxed">
          付款由 ECPay 綠界金流安全處理。<br />可於會員中心取消後續自動續訂。
        </p>
      </div>
    </div>
  );
}
