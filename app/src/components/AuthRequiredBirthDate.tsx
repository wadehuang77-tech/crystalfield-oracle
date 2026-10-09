import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authUrlFor } from '../lib/authLocale';
import { getLanguageFromPath } from '../lib/i18n';

export function AuthRequiredBirthDate({ children }: { children: ReactNode }) {
  const { user, loading, authError, refreshAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const isEnglish = getLanguageFromPath(location.pathname) === 'en';

  const closePrompt = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePrompt();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closePrompt, isOpen]);

  const handleLogin = () => {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    navigate(authUrlFor(location.pathname, 'login', returnTo), { state: { returnState: location.state } });
    setIsOpen(false);
  };

  if (user && !loading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <fieldset disabled className="m-0 min-w-0 border-0 p-0" aria-hidden="true">
        {children}
      </fieldset>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={isEnglish ? 'Birth date. Sign in to access the free reading.' : '出生日期。請先登入會員以免費使用解盤功能。'}
        className="absolute inset-0 z-10 w-full cursor-pointer bg-transparent focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        {loading && (
          <span role="status" className="flex h-full items-center justify-center gap-2 rounded-xl bg-slate-950/70 px-3 text-sm text-white/80">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {isEnglish ? 'Checking sign-in status…' : '正在確認登入狀態…'}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePrompt();
        }}>
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="birth-date-auth-title"
            aria-describedby="birth-date-auth-message"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
              );
              if (!focusable?.length) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
            className="relative w-full max-w-md rounded-2xl border border-amber-300/30 bg-slate-900 p-6 text-center shadow-2xl sm:p-8"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={closePrompt}
              aria-label={isEnglish ? 'Close' : '關閉'}
              className="absolute right-3 top-3 rounded-lg p-2 text-white/65 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <CalendarDays className="mx-auto mb-4 h-10 w-10 text-amber-200" aria-hidden="true" />
            <h2 id="birth-date-auth-title" className="text-2xl font-semibold text-white">
              {authError
                ? (isEnglish ? 'Unable to Verify Sign-In' : '目前無法確認登入狀態')
                : loading
                  ? (isEnglish ? 'Checking Sign-In' : '正在確認登入狀態')
                  : (isEnglish ? 'Sign In to Continue' : '請先登入會員')}
            </h2>
            <p id="birth-date-auth-message" className="mt-3 text-sm leading-7 text-white/75" aria-live="polite">
              {authError
                ? (isEnglish ? 'We could not verify your sign-in status. Please try again.' : '目前無法確認登入狀態，請重試。')
                : loading
                  ? (isEnglish ? 'Please wait while we check your session.' : '請稍候，正在確認會員登入狀態。')
                  : (isEnglish
                    ? 'Sign in to access your free reading and explore your personalized insights.'
                    : '登入後即可免費使用解盤功能，探索專屬於你的生命藍圖。')}
            </p>
            <div className="mt-6 grid gap-3">
              {authError ? (
                <button
                  type="button"
                  onClick={() => void refreshAuth()}
                  disabled={loading}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isEnglish ? 'Retry' : '重新確認'}
                </button>
              ) : !loading ? (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {isEnglish ? 'Continue with Google' : '使用 Google 登入'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={closePrompt}
                className="min-h-12 rounded-xl border border-white/20 px-5 py-3 font-medium text-white/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                {isEnglish ? 'Maybe Later' : '稍後再說'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
