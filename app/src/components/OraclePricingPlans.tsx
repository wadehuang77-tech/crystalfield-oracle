import { useEffect, useState } from 'react';
import { Crown, Clock3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkoutApi, tarotEntitlementApi, type TarotEntitlement } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { saveMembershipCheckoutRedirect } from '../lib/pendingDraw';
import { TAROT_SUBSCRIPTION } from '../lib/tarot-subscription';
import { TarotSubscriptionDetails } from './TarotSubscriptionDetails';
import { TarotLoginGate } from './TarotLoginGate';
import {
  trackClickTarotSubscribe, trackStartTarotTrial, trackTarotPaymentStarted,
  trackTarotTrialExpired, trackTarotTrialOffer, trackTarotTrialStarted, trackViewTarotSubscription,
} from '../lib/ga4';

interface OraclePricingPlansProps {
  spreadId: string;
  onSingleCheckout?: () => void | Promise<void>;
  singleLoading?: boolean;
  error?: string | null;
}

export function OraclePricingPlans({ error }: OraclePricingPlansProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [entitlement, setEntitlement] = useState<TarotEntitlement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const currentPath = location.pathname + location.search;

  useEffect(() => {
    if (!user) return;
    void tarotEntitlementApi.me().then(({ entitlement: value }) => {
      setEntitlement(value);
      if (value.status === 'trial_available') trackTarotTrialOffer('trial_available');
      else {
        if (value.status === 'expired') trackTarotTrialExpired();
        trackViewTarotSubscription();
      }
    }).catch((cause) => setCheckoutError(cause instanceof Error ? cause.message : '無法確認塔羅權限'));
  }, [user]);

  const startTrial = async () => {
    setIsLoading(true); setCheckoutError(''); trackStartTarotTrial();
    try {
      const result = await tarotEntitlementApi.startTrial();
      setEntitlement(result.entitlement);
      if (result.trial_created) trackTarotTrialStarted();
      window.dispatchEvent(new Event('tarot-entitlement-changed'));
    } catch (cause) { setCheckoutError(cause instanceof Error ? cause.message : '無法開始免費試用'); }
    finally { setIsLoading(false); }
  };

  const subscribe = async () => {
    trackClickTarotSubscribe(); saveMembershipCheckoutRedirect(currentPath);
    setCheckoutError(''); setIsLoading(true);
    try {
      const { ecpay, admin_unlocked } = await checkoutApi.createOrder(TAROT_SUBSCRIPTION.id);
      if (admin_unlocked) { window.location.assign(currentPath); return; }
      if (!ecpay) throw new Error('結帳資料缺失，請重試');
      trackTarotPaymentStarted();
      submitToEcpay(ecpay, () => { setCheckoutError('跳轉至綠界失敗，請稍後再試'); setIsLoading(false); });
    } catch (cause) { setCheckoutError(cause instanceof Error ? cause.message : '結帳失敗，請稍後再試'); setIsLoading(false); }
  };

  if (!user || entitlement?.status === 'login_required') return <div className="mt-6"><TarotLoginGate theme="dark" /></div>;
  if (!entitlement) return <p className="mt-6 text-center text-amber-100">正在確認塔羅資格…</p>;
  if (entitlement?.status === 'trial_available') return (
    <article className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-300/30 bg-slate-950/45 p-6 text-center">
      <Clock3 className="mx-auto h-10 w-10 text-amber-300" />
      <h4 className="mt-3 font-serif text-xl text-amber-100">免費試用塔羅全館 7 天</h4>
      <p className="mt-3 text-sm leading-6 text-amber-100/75">免費試用期間可使用 7 套塔羅與全部牌陣。不需要綁定信用卡；7 天到期後，您可以自行決定是否訂閱。</p>
      <button onClick={() => void startTrial()} disabled={isLoading} className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-3 font-bold text-white disabled:opacity-50">{isLoading ? '啟用中…' : '開始免費試用 7 天'}</button>
      <p className="mt-2 text-xs text-amber-100/55">不需要輸入信用卡，也不會自動扣款。</p>
    </article>
  );

  return (
    <article className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-300/30 bg-slate-950/45 p-5 sm:p-6">
      <div className="text-center">
        <Crown className="mx-auto h-10 w-10 text-amber-300" />
        <h4 className="mt-3 font-serif text-xl text-amber-100">您的塔羅全館免費試用已結束</h4>
        <p className="mt-2 text-sm text-amber-100/75">訂閱塔羅全館月費會員，即可繼續使用本站 7 套塔羅／神諭卡與全部牌陣。</p>
        <strong className="mt-3 block text-3xl text-white">NT$600／月</strong>
      </div>
      <TarotSubscriptionDetails />
      {(error || checkoutError) && <p className="mb-4 text-center text-sm text-red-300">{error || checkoutError}</p>}
      <button disabled={isLoading || entitlement?.status === 'payment_pending'} onClick={() => void subscribe()} className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{entitlement?.status === 'payment_pending' ? '付款確認中' : isLoading ? '跳轉至綠界…' : '立即訂閱 NT$600／月'}</button>
      <p className="mt-3 text-center text-xs text-amber-100/55">點擊後將前往綠界完成付款。付款成功後才會開通會員資格。</p>
    </article>
  );
}

export function BundleCreditStatus(props: { spreadId: string; remaining?: number | null }) {
  void props;
  return null;
}
