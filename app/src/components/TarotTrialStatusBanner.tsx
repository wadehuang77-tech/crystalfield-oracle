import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';
import { tarotEntitlementApi, type TarotEntitlement } from '../lib/api';

const TAROT_PATHS = ['/oracle', '/tarot', '/tarot-single', '/lightworker', '/unicorns', '/dragons', '/egyptian-gods', '/work-your-light', '/work-your-light-single', '/cosmic-cross', '/osho'];

export function TarotTrialStatusBanner() {
  const [showMembership, setShowMembership] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<TarotEntitlement | null>(null);
  const tarotPath = useMemo(() => {
    const localizedPath = pathname.replace(/^\/en(?=\/)/, '');
    return TAROT_PATHS.some((path) => localizedPath === path || localizedPath.startsWith(`${path}/`));
  }, [pathname]);

  useEffect(() => {
    if (!tarotPath || !user) { setEntitlement(null); return; }
    const refresh = () => void tarotEntitlementApi.me().then(({ entitlement: value }) => setEntitlement(value)).catch(() => setEntitlement(null));
    refresh();
    window.addEventListener('tarot-entitlement-changed', refresh);
    return () => window.removeEventListener('tarot-entitlement-changed', refresh);
  }, [tarotPath, user]);

  if (!tarotPath || !entitlement || entitlement.status === 'login_required') return null;
  return (
    <aside className="border-y border-amber-400/25 bg-slate-950 px-4 py-3 text-center text-sm text-amber-100" aria-live="polite">
      <p className="font-semibold"><Sparkles className="mr-2 inline h-4 w-4" />{entitlement.plan_tier > 0 ? `塔羅會員第 ${entitlement.plan_tier} 級` : '塔羅免費占卜'}</p>
      <p className="mt-1 text-xs text-amber-100/75">{entitlement.plan_tier > 0 ? '月費期間內，方案涵蓋的牌陣可無限次完整占卜' : `剩餘免費完整占卜 ${entitlement.free_readings_remaining} 次`}</p>
      {entitlement.free_readings_remaining === 0 && entitlement.plan_tier === 0 && (
        <button type="button" onClick={() => setShowMembership(true)} className="mt-3 rounded-lg bg-amber-600 px-5 py-2 font-semibold text-white hover:bg-amber-500">
          {pathname.startsWith('/en/') ? 'Choose a plan to continue' : '免費次數已用完，選擇付費方案'}
        </button>
      )}
      <MembershipGate isOpen={showMembership} onClose={() => setShowMembership(false)} />
    </aside>
  );
}
