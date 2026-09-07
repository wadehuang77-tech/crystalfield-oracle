import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { tarotEntitlementApi } from '../lib/api';
import { trackLoginForTarotTrial, trackTarotTrialOffer, trackTarotTrialStarted } from '../lib/ga4';

export function TarotLoginGate({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const { loading, signInWithGoogle } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => { trackTarotTrialOffer('login_required'); }, []);
  if (loading) return null;

  const googleSignIn = async (credential: string, csrfToken: string) => {
    setError('');
    trackLoginForTarotTrial();
    const result = await signInWithGoogle(credential, csrfToken);
    if (result.error) throw result.error;
    const trial = await tarotEntitlementApi.startTrial();
    if (trial.trial_created) trackTarotTrialStarted();
    window.dispatchEvent(new Event('tarot-entitlement-changed'));
  };

  const dark = theme === 'dark';
  return (
    <section className={`rounded-2xl border p-6 shadow-2xl sm:p-8 ${dark ? 'border-blue-400/30 bg-slate-900/90 text-blue-50' : 'border-blue-200 bg-white text-slate-900'}`}>
      <div className="mb-5 text-center">
        <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${dark ? 'border-blue-300/35 bg-blue-400/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          <Lock className="h-6 w-6" />
        </span>
        <h3 className="text-xl font-bold">塔羅全館免費試用 7 天</h3>
        <p className={`mt-2 text-sm leading-6 ${dark ? 'text-blue-100/70' : 'text-slate-600'}`}>
          登入後即可免費使用本站 7 套塔羅／神諭卡與全部牌陣，免費試用 7 天，不需要輸入信用卡，也不會自動扣款。
        </p>
      </div>
      <div className="mx-auto max-w-sm">
        {error && <p className="mb-3 text-sm text-rose-400" role="alert">{error}</p>}
        <p className="mb-3 text-center text-sm font-semibold text-blue-100">登入並開始免費試用</p>
        <GoogleSignInButton onCredential={async (credential, csrfToken) => {
          try { await googleSignIn(credential, csrfToken); }
          catch (cause) {
            const message = cause instanceof Error ? cause.message : 'Google 登入失敗';
            setError(message);
            throw cause;
          }
        }} />
      </div>
    </section>
  );
}
