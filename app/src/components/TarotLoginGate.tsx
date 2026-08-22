import { useState, type FormEvent } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignInButton } from './GoogleSignInButton';

export function TarotLoginGate({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (loading || user) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await signIn(email.trim().toLowerCase(), password);
    if (result.error) setError(result.error.message || '登入失敗，請確認帳號與密碼');
    setBusy(false);
  };

  const googleSignIn = async (credential: string, csrfToken: string) => {
    const result = await signInWithGoogle(credential, csrfToken);
    if (result.error) throw result.error;
  };

  const dark = theme === 'dark';
  return (
    <section className={`rounded-2xl border p-6 shadow-2xl sm:p-8 ${dark ? 'border-blue-400/30 bg-slate-900/90 text-blue-50' : 'border-blue-200 bg-white text-slate-900'}`}>
      <div className="mb-5 text-center">
        <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${dark ? 'border-blue-300/35 bg-blue-400/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          <Lock className="h-6 w-6" />
        </span>
        <h3 className="text-xl font-bold">登入即可免費解鎖第 2 次占卜</h3>
        <p className={`mt-2 text-sm leading-6 ${dark ? 'text-blue-100/70' : 'text-slate-600'}`}>
          完成登入即可免費繼續本次占卜，第 3 次占卜起需付費。
        </p>
      </div>
      <form onSubmit={submit} className="mx-auto max-w-sm space-y-3">
        <input
          type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}
          placeholder="電子郵件"
          className={`w-full rounded-xl border px-4 py-3 outline-none ${dark ? 'border-blue-400/25 bg-slate-950/65 text-white focus:border-blue-300/60' : 'border-slate-300 bg-white focus:border-blue-500'}`}
        />
        <input
          type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}
          placeholder="密碼"
          className={`w-full rounded-xl border px-4 py-3 outline-none ${dark ? 'border-blue-400/25 bg-slate-950/65 text-white focus:border-blue-300/60' : 'border-slate-300 bg-white focus:border-blue-500'}`}
        />
        {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 font-bold text-white disabled:opacity-60">
          <LogIn className="h-4 w-4" />{busy ? '登入中…' : '登入並免費繼續'}
        </button>
        <GoogleSignInButton onCredential={googleSignIn} />
      </form>
    </section>
  );
}
