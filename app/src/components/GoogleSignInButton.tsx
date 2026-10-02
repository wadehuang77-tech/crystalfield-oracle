import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '../lib/api';
import { getLanguageFromPath } from '../lib/i18n';
import { googleButtonLocale, localizeAuthError } from '../lib/authLocale';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityApi {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(locale: 'en' | 'zh_TW'): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google 登入服務載入失敗')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://accounts.google.com/gsi/client?hl=${locale === 'en' ? 'en' : 'zh-TW'}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google 登入服務載入失敗'));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string, csrfToken: string) => Promise<void>;
}) {
  const location = useLocation();
  const language = getLanguageFromPath(location.pathname);
  const gsiLocale = googleButtonLocale(location.pathname);
  const isEnglish = language === 'en';
  const fallback = isEnglish ? 'Google sign-in is temporarily unavailable.' : 'Google 登入服務暫時無法使用';
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const config = await authApi.googleConfig();
        if (!config.client_id) {
          if (!cancelled) setMessage(isEnglish ? 'Google sign-in is not configured yet.' : 'Google 登入尚未完成設定');
          return;
        }

        await loadGoogleIdentityScript(gsiLocale);
        if (cancelled || !buttonRef.current || !window.google?.accounts.id) return;

        window.google.accounts.id.initialize({
          client_id: config.client_id,
          callback: (response) => {
            if (!response.credential) {
              setMessage(isEnglish ? 'Google did not return sign-in credentials. Please try again.' : 'Google 未回傳登入資料，請重試');
              return;
            }
            setBusy(true);
            setMessage('');
            void onCredentialRef.current(response.credential, config.csrf_token)
              .catch((error: unknown) => {
                setMessage(localizeAuthError(error instanceof Error ? error.message : '', language, isEnglish ? 'Google sign-in failed. Please try again.' : 'Google 登入失敗，請稍後再試'));
              })
              .finally(() => setBusy(false));
          },
        });

        buttonRef.current.replaceChildren();
        const width = Math.min(360, Math.max(240, buttonRef.current.clientWidth || 320));
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: String(width),
          locale: gsiLocale,
        });
      } catch (error) {
        if (!cancelled) {
          setMessage(localizeAuthError(error instanceof Error ? error.message : '', language, fallback));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    void setup();
    return () => {
      cancelled = true;
    };
  }, [fallback, gsiLocale, isEnglish, language]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-blue-500/20" />
        <span className="text-xs text-blue-200/55">{isEnglish ? 'or' : '或'}</span>
        <span className="h-px flex-1 bg-blue-500/20" />
      </div>
      <div className="relative flex min-h-11 items-center justify-center">
        <div ref={buttonRef} className="w-full max-w-[360px]" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/75 text-sm text-blue-200">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isEnglish ? 'Loading Google sign-in…' : '載入 Google 登入…'}
          </div>
        )}
      </div>
      {message && <p className="text-center text-xs leading-relaxed text-amber-200">{message}</p>}
    </div>
  );
}
