import { useEffect, useState } from 'react';
import { Check, Crown, LogIn, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bundleApi, checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import {
  formatPrice,
  getSpreadCategory,
  getSpreadPrice,
  ORACLE_BUNDLES,
  type SpreadCategory,
} from '../lib/spread-prices';

interface OraclePricingPlansProps {
  spreadId: string;
  onSingleCheckout: () => void | Promise<void>;
  singleLoading?: boolean;
  error?: string | null;
}

const CATEGORY_LABELS: Record<SpreadCategory, string> = {
  three_card: '三張牌陣',
  pastlife: '前世因果陣',
  ten_card: '深度十字牌陣',
};

export function OraclePricingPlans({ spreadId, onSingleCheckout, singleLoading, error }: OraclePricingPlansProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bundleLoading, setBundleLoading] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState('');
  const price = getSpreadPrice(spreadId) ?? 0;

  const login = () => {
    const redirect = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?redirect=${redirect}`);
  };

  const checkoutBundle = async (bundleId: string) => {
    if (!user) { login(); return; }
    if (bundleLoading) return;
    setBundleError('');
    setBundleLoading(bundleId);
    try {
      const { ecpay, order_id, admin_unlocked } = await checkoutApi.createOrder(bundleId);
      if (admin_unlocked) {
        navigate(`/checkout/return?order_id=${encodeURIComponent(order_id)}`);
        return;
      }
      if (!ecpay) throw new Error('結帳資料缺失，請重試');
      submitToEcpay(ecpay, () => {
        setBundleError('跳轉至綠界失敗，請稍後再試');
        setBundleLoading(null);
      });
    } catch (err) {
      setBundleError(err instanceof Error ? err.message : '結帳失敗，請稍後再試');
      setBundleLoading(null);
    }
  };

  return (
    <div className="mt-6 text-left">
      <h4 className="mb-4 text-center font-serif text-xl tracking-wider text-white">選擇解鎖方案</h4>
      {(error || bundleError) && <p className="mb-4 text-center text-sm text-red-300">{error || bundleError}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <PlanCard
          title="單次解鎖"
          icon={<Sparkles className="h-5 w-5" />}
          price={price}
          description="本次牌陣完整解讀"
          bullets={['付款成功後立即解鎖', '不影響原有單次付款流程']}
          button={singleLoading ? '跳轉至綠界…' : `${formatPrice(price)} 立即解鎖`}
          disabled={!!singleLoading || !!bundleLoading}
          onClick={() => void onSingleCheckout()}
        />
        {ORACLE_BUNDLES.map((bundle) => (
          <PlanCard
            key={bundle.id}
            title={bundle.label}
            icon={<Crown className="h-5 w-5" />}
            price={bundle.price}
            originalPrice={bundle.originalPrice}
            saving={bundle.saving}
            description={`${bundle.usesLabel}・${bundle.daysLabel}`}
            bullets={['額度綁定會員帳號', '完整解讀成功後才扣 1 次', '失敗不扣次數']}
            button={!user ? '登入後購買' : bundleLoading === bundle.id ? '跳轉至綠界…' : '購買此方案'}
            disabled={!!singleLoading || !!bundleLoading}
            onClick={() => void checkoutBundle(bundle.id)}
          />
        ))}
      </div>
      {!user && (
        <button type="button" onClick={login} className="mx-auto mt-4 flex items-center gap-2 text-sm text-cyan-200 hover:text-white">
          <LogIn className="h-4 w-4" /> 套票需先登入，額度才能跨瀏覽器使用
        </button>
      )}
    </div>
  );
}

function PlanCard(props: {
  title: string;
  icon: React.ReactNode;
  price: number;
  originalPrice?: number;
  saving?: number;
  description: string;
  bullets: string[];
  button: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <article className="rounded-2xl border border-cyan-300/25 bg-slate-950/45 p-5 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 text-cyan-100">{props.icon}<h5 className="font-semibold leading-snug">{props.title}</h5></div>
        {!!props.saving && <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">省 {props.saving.toLocaleString('en-US')}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <strong className="text-xl text-white">{formatPrice(props.price)}</strong>
        {!!props.originalPrice && <span className="text-xs text-white/40 line-through">{formatPrice(props.originalPrice)}</span>}
      </div>
      <p className="mt-2 min-h-10 text-sm leading-relaxed text-cyan-100/75">{props.description}</p>
      <ul className="my-4 space-y-1.5 text-xs text-white/65">
        {props.bullets.map((bullet) => <li key={bullet} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />{bullet}</li>)}
      </ul>
      <button type="button" disabled={props.disabled} onClick={props.onClick} className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
        {props.button}
      </button>
    </article>
  );
}

export function BundleCreditStatus({ spreadId, remaining }: { spreadId: string; remaining?: number | null }) {
  const { user } = useAuth();
  const category = getSpreadCategory(spreadId);
  const [count, setCount] = useState<number | null>(remaining ?? null);

  useEffect(() => {
    if (remaining !== undefined && remaining !== null) { setCount(remaining); return; }
    if (!user || !category) { setCount(null); return; }
    void bundleApi.getCredits().then((r) => setCount(r.credits?.[category] ?? 0)).catch(() => setCount(null));
  }, [user, category, remaining]);

  if (!user || !category || count === null || count <= 0) return null;
  return (
    <div className="mb-5 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-center text-sm text-cyan-100">
      {CATEGORY_LABELS[category]}方案剩餘 <strong className="text-white">{count}</strong> 次
    </div>
  );
}
