import { X, Crown, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { checkoutApi, tarotEntitlementApi, type TarotEntitlement } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { saveMembershipCheckoutRedirect, savePendingSingleDraw } from '../lib/pendingDraw';
import { TAROT_SUBSCRIPTION_PLANS } from '../lib/tarot-subscription';
import { TarotSubscriptionDetails } from './TarotSubscriptionDetails';
import { TarotLoginGate } from './TarotLoginGate';
import {
  trackClickTarotSubscribe, trackTarotPaymentStarted,
  trackTarotSubscriptionCheckout, trackViewTarotSubscription,
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
  const [selectedPlanId, setSelectedPlanId] = useState<string>(TAROT_SUBSCRIPTION_PLANS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !user) { setEntitlement(null); return; }
    void tarotEntitlementApi.me().then(({ entitlement: value }) => {
      setEntitlement(value);
      if (value.status === 'expired' || value.status === 'payment_pending' || value.status === 'payment_failed') trackViewTarotSubscription();
    }).catch((cause) => setError(cause instanceof Error ? cause.message : '無法確認塔羅權限'));
  }, [isOpen, user]);

  if (!isOpen) return null;
  const redirectPath = resumePath ?? (location.pathname + location.search);

  const subscribe = async () => {
    const selectedPlan = TAROT_SUBSCRIPTION_PLANS.find(plan => plan.id === selectedPlanId);
    const selectedPrice = selectedPlan?.price ?? 600;
    trackClickTarotSubscribe(selectedPlanId, selectedPrice);
    trackTarotSubscriptionCheckout(selectedPlanId, selectedPrice);
    saveMembershipCheckoutRedirect(redirectPath);
    if (pendingSingleDraw) savePendingSingleDraw({ ...pendingSingleDraw, route_path: redirectPath });
    setError(''); setIsProcessing(true);
    try {
      const { ecpay, admin_unlocked } = await checkoutApi.createOrder(selectedPlanId);
      if (admin_unlocked) { window.location.assign(redirectPath); return; }
      if (!ecpay) throw new Error('結帳資料缺失，請重試');
      trackTarotPaymentStarted(selectedPlanId, selectedPrice);
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
        ) : (
          <>
            <div className="mb-6 mt-2 text-center">
              <Crown className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <h2 className="font-serif text-xl tracking-wider text-amber-100">免費占卜 3 次已用完，或目前方案尚未包含此牌陣</h2>
              <p className="mt-3 text-sm leading-6 text-amber-100/70">選擇適合你的月費方案；會員期間內，方案涵蓋的牌陣可無限次完整占卜。每月續訂，可取消後續續訂。</p>
              {entitlement.free_readings_remaining > 0 && <p className="mt-2 text-sm text-amber-100/60">尚有 {entitlement.free_readings_remaining} 次免費占卜可用於其他牌陣。</p>}
            </div>
            <TarotSubscriptionDetails selectedPlanId={selectedPlanId} onSelect={setSelectedPlanId} disabled={isProcessing || entitlement.plan_tier > 0} />
            {entitlement.plan_tier > 0 && <p className="mt-4 text-center text-sm text-amber-100/70">目前方案權益至 {taipei(entitlement.current_period_end)}。請先取消後續續訂，並於到期後再選擇其他方案。</p>}
            {error && <p className="mb-4 rounded-lg border border-red-500/40 bg-red-600/15 p-3 text-sm text-red-200">{error}</p>}
            <button onClick={() => void subscribe()} disabled={isProcessing || entitlement.status === 'payment_pending' || entitlement.plan_tier > 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-3 font-bold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />{entitlement.status === 'payment_pending' ? '付款確認中' : isProcessing ? '跳轉至綠界…' : `立即訂閱 NT$${TAROT_SUBSCRIPTION_PLANS.find(plan => plan.id === selectedPlanId)?.price ?? 600}／月`}</button>
            <p className="mt-3 text-center text-xs leading-5 text-amber-100/55">點擊後將前往綠界完成付款。付款成功後才會開通會員資格。</p>
          </>
        )}
      </div>
    </div>
  );
}
