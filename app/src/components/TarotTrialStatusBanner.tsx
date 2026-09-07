import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tarotEntitlementApi, type TarotEntitlement } from '../lib/api';

const TAROT_PATHS = ['/oracle', '/tarot', '/tarot-single', '/lightworker', '/unicorns', '/dragons', '/egyptian-gods', '/work-your-light', '/work-your-light-single', '/cosmic-cross', '/osho'];

function taipei(value: string): string {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}

export function TarotTrialStatusBanner() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<TarotEntitlement | null>(null);
  const [now, setNow] = useState(Date.now());
  const tarotPath = useMemo(() => TAROT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)), [pathname]);

  useEffect(() => {
    if (!tarotPath || !user) { setEntitlement(null); return; }
    const refresh = () => void tarotEntitlementApi.me().then(({ entitlement: value }) => setEntitlement(value)).catch(() => setEntitlement(null));
    refresh();
    window.addEventListener('tarot-entitlement-changed', refresh);
    return () => window.removeEventListener('tarot-entitlement-changed', refresh);
  }, [tarotPath, user]);

  useEffect(() => {
    if (entitlement?.status !== 'trialing') return;
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [entitlement?.status]);

  useEffect(() => {
    if (entitlement?.status !== 'trialing' || !entitlement.trial_ends_at || now < Date.parse(entitlement.trial_ends_at)) return;
    void tarotEntitlementApi.me().then(({ entitlement: value }) => setEntitlement(value));
  }, [entitlement, now]);

  if (!tarotPath || entitlement?.status !== 'trialing' || !entitlement.trial_ends_at) return null;
  const remainingMs = Math.max(0, Date.parse(entitlement.trial_ends_at) - now);
  const days = Math.floor(remainingMs / 86_400_000);
  const hours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
  return (
    <aside className="border-y border-amber-400/25 bg-slate-950 px-4 py-3 text-center text-sm text-amber-100" aria-live="polite">
      <p className="font-semibold"><Clock3 className="mr-2 inline h-4 w-4" />塔羅全館免費試用中</p>
      <p className="mt-1 text-xs text-amber-100/75">免費試用將於 {taipei(entitlement.trial_ends_at)} 到期・約剩 {days} 天 {hours} 小時</p>
      <p className="mt-1 text-xs text-amber-100/60">試用期間可使用 7 套牌卡與所有牌陣；實際權限以伺服器時間為準。</p>
    </aside>
  );
}
