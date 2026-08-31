import { useState } from 'react';
import { Crown, LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { saveMembershipCheckoutRedirect } from '../lib/pendingDraw';
import { TAROT_SUBSCRIPTION } from '../lib/tarot-subscription';
import { TarotSubscriptionDetails } from './TarotSubscriptionDetails';

interface OraclePricingPlansProps {
  spreadId: string;
  onSingleCheckout?: () => void | Promise<void>;
  singleLoading?: boolean;
  error?: string | null;
}

export function OraclePricingPlans({ error }: OraclePricingPlansProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const currentPath = location.pathname + location.search;
  const login = () => navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);

  const subscribe = async () => {
    saveMembershipCheckoutRedirect(currentPath);
    if (!user) { login(); return; }
    if (isLoading) return;
    setCheckoutError('');
    setIsLoading(true);
    try {
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(TAROT_SUBSCRIPTION.id);
      if (admin_unlocked) {
        navigate(`/checkout/return?order_id=${encodeURIComponent(order_id)}`);
        return;
      }
      if (!ecpay) throw new Error('結帳資料缺失，請重試');
      submitToEcpay(ecpay, () => {
        setCheckoutError('跳轉至綠界失敗，請稍後再試');
        setIsLoading(false);
      });
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : '結帳失敗，請稍後再試');
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 text-left">
      {(error || checkoutError) && <p className="mb-4 text-center text-sm text-red-300">{error || checkoutError}</p>}
      <article className="mx-auto max-w-3xl rounded-2xl border border-amber-300/30 bg-slate-950/45 p-5 shadow-[0_0_28px_rgba(251,191,36,0.09)] sm:p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-amber-100">
            <Crown className="h-5 w-5" />
            <h4 className="font-serif text-xl tracking-wider">{TAROT_SUBSCRIPTION.name}</h4>
          </div>
          <strong className="mt-3 block text-3xl text-white">NT${TAROT_SUBSCRIPTION.price}</strong>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-amber-100/75">
            付款成功日起 {TAROT_SUBSCRIPTION.durationDays} 天，可不限次數使用本站 7 大塔羅牌組與全部牌陣。
          </p>
        </div>
        <TarotSubscriptionDetails />
        <button type="button" disabled={isLoading} onClick={() => void subscribe()} className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
          {isLoading ? '跳轉至綠界…' : `NT$${TAROT_SUBSCRIPTION.price} 立即加入`}
        </button>
        {!user && <button type="button" onClick={login} className="mx-auto mt-4 flex items-center gap-2 text-sm text-amber-200 hover:text-white"><LogIn className="h-4 w-4" />會員權限綁定登入帳號</button>}
      </article>
    </div>
  );
}

export function BundleCreditStatus(props: { spreadId: string; remaining?: number | null }) {
  void props;
  return null;
}
