import { TarotReadingLoginDialog } from './TarotReadingLoginDialog';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';
import { tarotEntitlementApi, type TarotEntitlement } from '../lib/api';
import { TAROT_READING_ACCESS_EVENT } from '../lib/tarotPartialReading';

const TAROT_PATHS = ['/oracle', '/tarot', '/tarot-single', '/lightworker', '/unicorns', '/dragons', '/egyptian-gods', '/work-your-light', '/work-your-light-single', '/cosmic-cross', '/osho'];

export function TarotTrialStatusBanner() {
  const [showMembership, setShowMembership] = useState(false);
  const { pathname } = useLocation();
  const [showReadingLogin, setShowReadingLogin] = useState(false);

  const { user, loading: authLoading } = useAuth();
  useEffect(() => { setShowReadingLogin(false); }, [user?.id, pathname]);
  const [entitlement, setEntitlement] = useState<TarotEntitlement | null>(null);
  const [partialReading, setPartialReading] = useState(false);
  const isEnglish = pathname.startsWith('/en/');
  const tarotPath = useMemo(() => {
    const localizedPath = pathname.replace(/^\/en(?=\/)/, '');
    return TAROT_PATHS.some((path) => localizedPath === path || localizedPath.startsWith(`${path}/`));
  }, [pathname]);

  useEffect(() => {
    if (!tarotPath) { setEntitlement(null); return; }
    const refresh = () => void tarotEntitlementApi.me().then(({ entitlement: value }) => setEntitlement(value)).catch(() => setEntitlement(null));
    refresh();
    window.addEventListener('tarot-entitlement-changed', refresh);
    return () => window.removeEventListener('tarot-entitlement-changed', refresh);
  }, [tarotPath, user]);

  useEffect(() => {
    setPartialReading(false);
    const changed = (event: Event) => setPartialReading((event as CustomEvent<{ partial: boolean }>).detail?.partial === true);
    window.addEventListener(TAROT_READING_ACCESS_EVENT, changed);
    return () => window.removeEventListener(TAROT_READING_ACCESS_EVENT, changed);
  }, [pathname]);

  const signIn = () => setShowReadingLogin(true);
  // Every spread page needs an accessible sign-in action, including local previews
  // rendered before the API event or after another inactive spread resets its state.
  const spreadPage = tarotPath && !['/oracle', '/oracle/', '/en/oracle', '/en/oracle/'].includes(pathname);
  const showPartial = tarotPath && (partialReading || spreadPage) && !authLoading && !user;
  const partialCopy = isEnglish
    ? 'Card readings preview 50%. Sign in with your account or Google to see the remaining 50% without drawing again.'
    : '牌卡解讀先顯示 50%；登入晶域心語或 Google 帳號後，查看剩餘 50%，不用重新抽牌。';
  const signInLabel = isEnglish ? 'Sign in / Google · View the remaining 50%' : '登入／Google 登入，查看剩餘 50%';

  if (!tarotPath || ((!entitlement || entitlement.status === 'login_required') && !showPartial)) return null;
  return (
    <>
      <TarotReadingLoginDialog open={showReadingLogin && !user} onClose={() => setShowReadingLogin(false)} english={isEnglish} />
      <aside className="border-y border-amber-400/25 bg-slate-950 px-4 py-3 text-center text-sm text-amber-100" aria-live="polite">
        {entitlement && entitlement.status !== 'login_required' && <>
          <p className="font-semibold"><Sparkles className="mr-2 inline h-4 w-4" />{entitlement.plan_tier > 0 ? `塔羅會員第 ${entitlement.plan_tier} 級` : '塔羅免費占卜'}</p>
          <p className="mt-1 text-xs text-amber-100/75">{entitlement.plan_tier > 0 ? '月費期間內，方案涵蓋的牌陣可無限次完整占卜' : `所有牌陣共用額度，剩餘免費 ${entitlement.free_readings_remaining} 次`}</p>
        </>}
        {showPartial && <div className="mt-2">
          <p className="font-semibold text-amber-50">{partialCopy}</p>
          <button type="button" onClick={signIn} className="mt-2 rounded-lg bg-amber-500 px-5 py-2 font-semibold text-slate-950 hover:bg-amber-400">{signInLabel}</button>
        </div>}
        {entitlement && entitlement.free_readings_remaining === 0 && entitlement.plan_tier === 0 && entitlement.status !== 'login_required' && (
          <button type="button" onClick={() => setShowMembership(true)} className="mt-3 rounded-lg bg-amber-600 px-5 py-2 font-semibold text-white hover:bg-amber-500">
            {isEnglish ? 'Choose a plan to continue' : '7 次免費占卜已用完，選擇月費方案'}
          </button>
        )}
        <MembershipGate isOpen={showMembership} onClose={() => setShowMembership(false)} />
      </aside>
      {/* Keeps the sign-in prompt in reach while the visitor scrolls through the half reading. */}
      {showPartial && <><div className="h-36 sm:h-24" aria-hidden="true" /><div data-tarot-login-bar role="region" aria-label={isEnglish ? 'Unlock the remaining reading' : '登入查看剩餘解讀'} className="fixed inset-x-0 bottom-0 z-[60] border-t border-amber-400/40 bg-slate-950/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-sm text-amber-50 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        <span className="mr-3">{partialCopy}</span>
        <button type="button" onClick={signIn} className="mt-2 min-h-11 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:mt-0">{signInLabel}</button>
      </div></>}
    </>
  );
}
