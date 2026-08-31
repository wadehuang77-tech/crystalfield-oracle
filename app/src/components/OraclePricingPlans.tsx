import { useState } from 'react';
import { Check, Crown, LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import { formatPrice } from '../lib/spread-prices';
import { saveMembershipCheckoutRedirect } from '../lib/pendingDraw';
import { TAROT_SUBSCRIPTION } from '../lib/tarot-subscription';

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
      <h4 className="mb-4 text-center font-serif text-xl tracking-wider text-white">塔羅全館月費會員</h4>
      {(error || checkoutError) && <p className="mb-4 text-center text-sm text-red-300">{error || checkoutError}</p>}
      <article className="mx-auto max-w-xl rounded-2xl border border-amber-300/30 bg-slate-950/45 p-6 shadow-[0_0_28px_rgba(251,191,36,0.09)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-amber-100"><Crown className="h-5 w-5" /><h5 className="font-semibold">{TAROT_SUBSCRIPTION.name}</h5></div>
          <strong className="text-xl text-white">{formatPrice(TAROT_SUBSCRIPTION.price)}</strong>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-amber-100/75">付款成功日起 {TAROT_SUBSCRIPTION.durationDays} 天，本站 7 個牌組與全部牌陣不限次數使用。</p>
        <ul className="my-5 space-y-2 text-sm text-white/70">
          {['7 個牌組全部共用同一會員權限', '所有單張與多張牌陣不限次數', '完整解讀不限次數'].map((bullet) => (
            <li key={bullet} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{bullet}</li>
          ))}
        </ul>
        <button type="button" disabled={isLoading} onClick={() => void subscribe()} className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
          {isLoading ? '跳轉至綠界…' : user ? `${formatPrice(TAROT_SUBSCRIPTION.price)} 立即加入` : '登入後加入會員'}
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
