import { X, Crown, Sparkles, Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { checkoutApi, tarotEntitlementApi, type TarotEntitlement } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { saveMembershipCheckoutRedirect, savePendingSingleDraw } from '../lib/pendingDraw';
import { TAROT_SUBSCRIPTION } from '../lib/tarot-subscription';
import { TarotSubscriptionDetails } from './TarotSubscriptionDetails';
import { TarotLoginGate } from './TarotLoginGate';
import {
  trackClickTarotSubscribe, trackStartTarotTrial, trackTarotPaymentStarted,
  trackTarotSubscriptionCheckout, trackTarotTrialExpired, trackTarotTrialOffer,
  trackTarotTrialStarted, trackViewTarotSubscription,
} from '../lib/ga4';

interface MembershipGateProps {
  isOpen: boolean;
  onClose: () => void;
  resumePath?: string;
  pendingSingleDraw?: { spread_id: string; card_key: string; reversed?: boolean };
}

function taipei(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}

export function MembershipGate({ isOpen, onClose, resumePath, pendingSingleDraw }: MembershipGateProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [entitlement, setEntitlement] = useState<TarotEntitlement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !user) { setEntitlement(null); return; }
    void tarotEntitlementApi.me().then(({ entitlement: value }) => {
      setEntitlement(value);
      if (value.status === 'trial_available') trackTarotTrialOffer('trial_available');
      if (value.status === 'expired') trackTarotTrialExpired();
      if (['expired', 'payment_pending', 'payment_failed'].includes(value.status)) trackViewTarotSubscription();
    }).catch((cause) => setError(cause instanceof Error ? cause.message : '無法確認塔羅權限'));
  }, [isOpen, user]);

  if (!isOpen) return null;
  const redirectPath = resumePath ?? (location.pathname + location.search);

  const startTrial = async () => {
    setIsProcessing(true); setError(''); trackStartTarotTrial();
    try {
      const result = await tarotEntitlementApi.startTrial();
      setEntitlement(result.entitlement);
      if (result.trial_created) trackTarotTrialStarted();
      window.dispatchEvent(new Event('tarot-entitlement-changed'));
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '無法開始免費試用');
    } finally { setIsProcessing(false); }
  };

  const subscribe = async () => {
    trackClickTarotSubscribe(); trackTarotSubscriptionCheckout();
    saveMembershipCheckoutRedirect(redirectPath);
    if (pendingSingleDraw) savePendingSingleDraw({ ...pendingSingleDraw, route_path: redirectPath });
    setError(''); setIsProcessing(true);
    try {
      const { ecpay, admin_unlocked } = await checkoutApi.createOrder(TAROT_SUBSCRIPTION.id);
      if (admin_unlocked) { window.location.assign(redirectPath); return; }
      if (!ecpay) throw new Error('結帳資料缺失，請重試');
      trackTarotPaymentStarted();
      submitToEcpay(ecpay, () => { setError('跳轉至綠界失敗，請重試'); setIsProcessing(false); });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '結帳失敗，請稍後再試');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-2xl sm:p-8">
        <button onClick={onClose} disabled={isProcessing} className="absolute right-4 top-4 text-amber-400/60 hover:text-amber-300" aria-label="關閉"><X className="h-5 w-5" /></button>

        {!user || entitlement?.status === 'login_required' ? <TarotLoginGate theme="dark" /> : !entitlement ? (
          <p className="py-12 text-center text-amber-100">正在確認塔羅資格…</p>
        ) : entitlement.status === 'trial_available' ? (
          <div className="py-3 text-center text-amber-50">
            <Clock3 className="mx-auto mb-4 h-12 w-12 text-amber-300" />
            <h2 className="font-serif text-2xl text-amber-100">免費試用塔羅全館 7 天</h2>
            <p className="mx-auto mt-4 max-w-lg leading-7 text-amber-100/75">免費試用期間可使用 7 套塔羅與全部牌陣。不需要綁定信用卡；7 天到期後，您可以自行決定是否訂閱。</p>
            <button onClick={() => void startTrial()} disabled={isProcessing} className="mt-7 w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-3 font-bold text-white disabled:opacity-50">{isProcessing ? '啟用中…' : '開始免費試用 7 天'}</button>
            <p className="mt-3 text-xs text-amber-100/55">不需要輸入信用卡，也不會自動扣款。</p>
          </div>
        ) : entitlement?.status === 'trialing' ? (
          <div className="py-5 text-center text-amber-50">
            <Clock3 className="mx-auto mb-4 h-12 w-12 text-amber-300" />
            <h2 className="font-serif text-2xl">塔羅全館免費試用中</h2>
            <p className="mt-4 text-amber-100/80">免費試用將於 {taipei(entitlement.trial_ends_at)} 到期</p>
            <p className="mt-2 text-sm text-amber-100/65">試用期間可使用 7 套牌卡與所有牌陣。</p>
            <button onClick={onClose} className="mt-6 w-full rounded-xl bg-amber-600 px-6 py-3 font-bold text-white">繼續占卜</button>
          </div>
        ) : (
          <>
            <div className="mb-6 mt-2 text-center">
              <Crown className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <h2 className="font-serif text-xl tracking-wider text-amber-100">您的塔羅全館免費試用已結束</h2>
              <p className="mt-3 text-sm leading-6 text-amber-100/70">訂閱塔羅全館月費會員，即可繼續使用本站 7 套塔羅／神諭卡與全部牌陣。</p>
              <p className="mt-4 font-serif text-3xl text-amber-400">NT${TAROT_SUBSCRIPTION.price}／月</p>
            </div>
            <TarotSubscriptionDetails />
            {error && <p className="mb-4 rounded-lg border border-red-500/40 bg-red-600/15 p-3 text-sm text-red-200">{error}</p>}
            <button onClick={() => void subscribe()} disabled={isProcessing || entitlement?.status === 'payment_pending'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-3 font-bold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />{entitlement?.status === 'payment_pending' ? '付款確認中' : isProcessing ? '跳轉至綠界…' : '立即訂閱 NT$600／月'}</button>
            <p className="mt-3 text-center text-xs leading-5 text-amber-100/55">點擊後將前往綠界完成付款。付款成功後才會開通會員資格。</p>
          </>
        )}
      </div>
    </div>
  );
}
