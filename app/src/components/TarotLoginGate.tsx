import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { getLanguageFromPath } from '../lib/i18n';
import { localizeAuthError } from '../lib/authLocale';

export function TarotLoginGate({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const { loading, signInWithGoogle } = useAuth();
  const { pathname } = useLocation();
  const language = getLanguageFromPath(pathname);
  const isEnglish = language === 'en';
  const [error, setError] = useState('');

  if (loading) return null;

  const googleSignIn = async (credential: string, csrfToken: string) => {
    setError('');
    const result = await signInWithGoogle(credential, csrfToken);
    if (result.error) throw result.error;
    window.dispatchEvent(new Event('tarot-entitlement-changed'));
  };

  const dark = theme === 'dark';
  return (
    <section className={`rounded-2xl border p-6 shadow-2xl sm:p-8 ${dark ? 'border-blue-400/30 bg-slate-900/90 text-blue-50' : 'border-blue-200 bg-white text-slate-900'}`}>
      <div className="mb-5 text-center">
        <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${dark ? 'border-blue-300/35 bg-blue-400/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          <Lock className="h-6 w-6" />
        </span>
        <h3 className="text-xl font-bold">{isEnglish ? 'Sign in for 3 Free Full Readings' : '登入帳號，享有 3 次免費完整占卜'}</h3>
        <p className={`mt-2 text-sm leading-6 ${dark ? 'text-blue-100/70' : 'text-slate-600'}`}>
          {isEnglish
            ? 'Use your three readings across all tarot and oracle decks. Each completed spread uses one reading.'
            : '免費次數可跨所有塔羅與神諭卡牌組使用；每完成一個牌陣計 1 次。'}
        </p>
      </div>
      <div className={`mx-auto mb-6 grid max-w-2xl gap-2 text-left sm:grid-cols-3 ${dark ? 'text-blue-50' : 'text-slate-900'}`}>
        {[
          { price: 'NT$600', scope: isEnglish ? 'All single- and three-card spreads' : '所有單張與三張牌陣' },
          { price: 'NT$1,000', scope: isEnglish ? 'Plus all past-life spreads' : '再加所有前世因果陣' },
          { price: 'NT$1,500', scope: isEnglish ? 'All decks and spreads' : '所有牌組與全部牌陣' },
        ].map((plan) => (
          <div key={plan.price} className={`rounded-lg border p-3 text-center ${dark ? 'border-blue-300/20 bg-blue-400/5' : 'border-blue-200 bg-blue-50'}`}>
            <p className="font-semibold">{plan.price}{isEnglish ? '/month' : '／月'}</p>
            <p className={`mt-1 text-xs leading-5 ${dark ? 'text-blue-100/70' : 'text-slate-600'}`}>{plan.scope}</p>
            <p className={`mt-1 text-xs font-medium ${dark ? 'text-amber-200' : 'text-amber-700'}`}>{isEnglish ? 'Unlimited readings during membership' : '月費期間內涵蓋牌陣無限次占卜'}</p>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-sm">
        {error && <p className="mb-3 text-sm text-rose-400" role="alert">{error}</p>}
        <p className="mb-3 text-center text-sm font-semibold text-blue-100">{isEnglish ? 'Sign in or create an account with Google' : '使用 Google 登入或註冊即可開始免費占卜'}</p>
        <GoogleSignInButton onCredential={async (credential, csrfToken) => {
          try { await googleSignIn(credential, csrfToken); }
          catch (cause) {
            setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, isEnglish ? 'Google sign-in failed. Please try again.' : 'Google 登入失敗'));
            throw cause;
          }
        }} />
      </div>
    </section>
  );
}
