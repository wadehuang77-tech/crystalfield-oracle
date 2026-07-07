import { X, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkoutApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { submitToEcpay } from '../lib/ecpayRedirect';

interface MembershipGateProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MembershipGate({ isOpen, onClose }: MembershipGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(location.pathname));
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder('membership_monthly');
      if (admin_unlocked) {
        onClose();
        window.location.reload();
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
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-500/40 rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
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
            加入月費會員
          </h2>
          <p className="text-3xl font-serif text-amber-400 mt-4 tracking-[0.15em]">NT$ 99 / 月</p>
          <p className="text-xs text-amber-400/60 mt-2">解鎖所有塔羅單張牌陣，不限次數完整查看</p>
        </div>

        <div className="border-t border-b border-amber-500/15 py-5 mb-6 space-y-3">
          <Perk>所有塔羅單張牌陣免費，不限次數</Perk>
          <Perk>7 副牌組單張皆可完整解鎖查看</Perk>
          <Perk>第 4 次起不用再逐次付費解鎖</Perk>
        </div>

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
              <><Sparkles className="w-4 h-4" strokeWidth={1.4} />{user ? '立即加入 NT$99 / 月' : '登入並加入會員'}</>
            )}
          </button>
          <button onClick={onClose} disabled={isProcessing}
            className="inline-flex items-center justify-center w-full px-8 py-3 bg-slate-800/60 border-2 border-amber-500/30 rounded-xl hover:bg-slate-700/60 transition-all text-amber-200">
            稍後再說
          </button>
        </div>

        <p className="mt-5 pt-4 border-t border-amber-500/10 text-center text-xs text-amber-400/50 leading-relaxed">
          付款由 ECPay 綠界金流安全處理。<br />支援信用卡、ATM、超商代碼。
        </p>
      </div>
    </div>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.6} />
      <p className="text-sm text-amber-100/85 leading-relaxed">{children}</p>
    </div>
  );
}
