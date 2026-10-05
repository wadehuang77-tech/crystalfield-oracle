import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkoutApi, tarotEntitlementApi, type TarotEntitlement } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { saveMembershipCheckoutRedirect } from '../lib/pendingDraw';
import { TAROT_SUBSCRIPTION_PLANS } from '../lib/tarot-subscription';
import { TarotSubscriptionDetails } from './TarotSubscriptionDetails';
import { TarotLoginGate } from './TarotLoginGate';
import {
  trackClickTarotSubscribe, trackTarotPaymentStarted, trackViewTarotSubscription,
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
  const [selectedPlanId, setSelectedPlanId] = useState<string>(TAROT_SUBSCRIPTION_PLANS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const currentPath = location.pathname + location.search;

  useEffect(() => {
    if (!user) return;
    void tarotEntitlementApi.me().then(({ entitlement: value }) => {
      setEntitlement(value);
      trackViewTarotSubscription();
    }).catch((cause) => setCheckoutError(cause instanceof Error ? cause.message : '無法確認塔羅權限'));
  }, [user]);

  const subscribe = async (planId: string) => {
    const selectedPlan = TAROT_SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
    const selectedPrice = selectedPlan?.price ?? 600;
    trackClickTarotSubscribe(planId, selectedPrice);
    saveMembershipCheckoutRedirect(currentPath);
    setCheckoutError(''); setIsLoading(true);
    try {
      const { ecpay, admin_unlocked } = await checkoutApi.createOrder(planId);
      if (admin_unlocked) { window.location.assign(currentPath); return; }
      if (!ecpay) throw new Error('結帳資料缺失，請重試');
      trackTarotPaymentStarted(planId, selectedPrice);
      submitToEcpay(ecpay, () => { setCheckoutError('跳轉至綠界失敗，請稍後再試'); setIsLoading(false); });
    } catch (cause) { setCheckoutError(cause instanceof Error ? cause.message : '結帳失敗，請稍後再試'); setIsLoading(false); }
  };

  if (!user || entitlement?.status === 'login_required') return <div className="mt-6"><TarotLoginGate theme="dark" /></div>;
  if (!entitlement) return <p className="mt-6 text-center text-amber-100">正在確認塔羅資格…</p>;
  return (
    <article className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-300/30 bg-slate-950/45 p-5 sm:p-6">
      <div className="text-center">
        <Crown className="mx-auto h-10 w-10 text-amber-300" />
        <h4 className="mt-3 font-serif text-xl text-amber-100">塔羅方案</h4>
        <p className="mt-2 text-sm text-amber-100/75">全站帳號共可免費完整占卜 3 次；月費期間內，方案涵蓋的牌陣可無限次占卜。</p>
        <strong className="mt-2 block text-sm text-white/80">剩餘免費次數：{entitlement.free_readings_remaining}</strong>
      </div>
      <TarotSubscriptionDetails selectedPlanId={selectedPlanId} onSelect={setSelectedPlanId} disabled={isLoading || entitlement.plan_tier > 0} />
      {(error || checkoutError) && <p className="mb-4 text-center text-sm text-red-300">{error || checkoutError}</p>}
      {entitlement.plan_tier > 0 && <p className="mt-4 text-center text-sm text-amber-100/70">目前方案權益至 {entitlement.current_period_end ? new Date(entitlement.current_period_end).toLocaleDateString('zh-TW') : '到期日尚未確認'}；如需更換方案，請先取消續訂並於權益到期後再選擇。</p>}
      <button disabled={isLoading || entitlement.status === 'payment_pending' || entitlement.plan_tier > 0} onClick={() => void subscribe(selectedPlanId)} className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{entitlement.status === 'payment_pending' ? '付款確認中' : isLoading ? '跳轉至綠界…' : `立即訂閱 NT$${TAROT_SUBSCRIPTION_PLANS.find(plan => plan.id === selectedPlanId)?.price ?? 600}／月`}</button>
      <p className="mt-3 text-center text-xs text-amber-100/55">點擊後將前往綠界完成付款。付款成功後才會開通會員資格。</p>
    </article>
  );
}

export function BundleCreditStatus(props: { spreadId: string; remaining?: number | null }) {
  void props;
  return null;
}
