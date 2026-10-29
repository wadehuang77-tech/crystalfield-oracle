import { useId, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { getLanguageFromPath, getLocalizedPath } from '../lib/i18n';
import { localizeAuthError } from '../lib/authLocale';

export function TarotAccountLogin() {
  const { signIn, signInWithGoogle } = useAuth();
  const location = useLocation();
  const language = getLanguageFromPath(location.pathname), en = language === 'en';
  const id = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const redirect = new URLSearchParams({ redirect: location.pathname + location.search + location.hash });
  const fail = (cause: unknown) => setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, en ? 'Sign-in failed. Please try again.' : '登入失敗，請再試一次。'));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) throw result.error;
      window.dispatchEvent(new Event('tarot-entitlement-changed'));
    } catch (cause) { fail(cause); }
    finally { setBusy(false); }
  };
  const field = 'mt-2 min-h-12 w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-600';
  return <section className="mx-auto w-full max-w-xl rounded-2xl border border-violet-200 bg-white p-5 text-slate-900 shadow-xl sm:p-8" aria-labelledby={`${id}-title`}>
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-violet-200 pb-4">
      <h2 id={`${id}-title`} className="text-2xl font-bold text-violet-900">{en ? 'Member sign-in' : '登入會員'}</h2>
      <Link className="inline-flex min-h-11 items-center text-sm text-violet-800 underline underline-offset-4" to={`${getLocalizedPath('/register', language)}?${redirect}`}>{en ? 'New here? Join now' : '還不是會員？點此加入'}</Link>
    </header>
    <h3 className="mb-3 text-center text-lg font-semibold">{en ? 'Quick sign-in with Google' : '使用社群帳號快速登入'}</h3>
    <p className="mb-4 text-center text-sm leading-6 text-slate-700">{en ? 'Sign in or create an account with Google' : '使用 Google 登入或註冊即可開始免費占卜'}</p>
    <GoogleSignInButton onCredential={async (credential, csrfToken) => {
      setError('');
      try {
        const result = await signInWithGoogle(credential, csrfToken);
        if (result.error) throw result.error;
        window.dispatchEvent(new Event('tarot-entitlement-changed'));
      } catch (cause) { fail(cause); throw cause; }
    }} />
    <h3 className="mb-5 mt-7 border-t border-slate-200 pt-6 text-center text-lg font-semibold">{en ? 'Or sign in with your Crystal Field account' : '或用晶域心語帳號登入'}</h3>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-base font-medium" htmlFor={`${id}-email`}>Email<input id={`${id}-email`} type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} className={field} /></label>
      <label className="block text-base font-medium" htmlFor={`${id}-password`}>{en ? 'Password' : '密碼'}<input id={`${id}-password`} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className={field} /></label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <button disabled={busy} type="submit" className="min-h-12 w-full rounded-xl bg-violet-800 px-5 py-3 text-lg font-bold text-white hover:bg-violet-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-wait disabled:opacity-60">{busy ? (en ? 'Signing in…' : '登入中…') : (en ? 'Sign in' : '登入')}</button>
    </form>
  </section>;
}
