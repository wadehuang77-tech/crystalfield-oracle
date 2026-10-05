import { getLanguageFromPath, getLocalizedPath, type Language } from './i18n';

export type AuthMode = 'login' | 'signup';

export function authPathFor(pathname: string, mode: AuthMode): string {
  const target = mode === 'signup' ? '/register' : '/login';
  return getLocalizedPath(target, getLanguageFromPath(pathname));
}

export function authUrlFor(pathname: string, mode: AuthMode, redirectTo?: string): string {
  const path = authPathFor(pathname, mode);
  if (!redirectTo) return path;
  return `${path}?${new URLSearchParams({ redirect: redirectTo })}`;
}

export function calculationLoginRedirect(
  authenticated: boolean,
  pathname: string,
  search = '',
  hash = '',
): string | null {
  if (authenticated) return null;
  return authUrlFor(pathname, 'login', `${pathname}${search}${hash}`);
}

export function authModeForPath(pathname: string, queryMode?: string | null): AuthMode {
  const normalized = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  return normalized === '/register' || queryMode === 'signup' ? 'signup' : 'login';
}

export function isSafeAuthRedirect(value: string | null): value is string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return false;
  const path = value.split(/[?#]/, 1)[0].replace(/^\/en(?=\/|$)/, '') || '/';
  return !['/auth', '/login', '/register'].includes(path);
}

const AUTH_ERROR_TRANSLATIONS: Array<[string, string]> = [
  ['電子郵件或密碼錯誤', 'Incorrect email or password.'],
  ['請輸入電子郵件和密碼', 'Please enter your email and password.'],
  ['電子郵件格式錯誤', 'Please enter a valid email address.'],
  ['此電子郵件已經註冊', 'This email is already registered.'],
  ['此 Email 尚未註冊', 'This email is not registered. Please create an account first.'],
  ['請輸入姓名', 'Please enter your name.'],
  ['請輸入手機號碼', 'Please enter your phone number.'],
  ['密碼長度至少 8 個字元', 'Password must be at least 8 characters long.'],
  ['密碼需包含至少一個英文字母和一個數字', 'Password must contain at least one letter and one number.'],
  ['姓名不可超過 100 個字元', 'Name must be 100 characters or fewer.'],
  ['姓名格式錯誤', 'Please enter a valid name.'],
  ['請填寫姓名', 'Please enter your name.'],
  ['手機號碼格式錯誤', 'Please enter a valid phone number.'],
  ['Google 帳戶驗證失敗', 'Google sign-in failed. Please try again.'],
  ['Google 登入服務載入失敗', 'Google sign-in could not load. Please try again.'],
  ['Google 未回傳登入資料', 'Google did not return sign-in credentials. Please try again.'],
  ['Google 登入失敗', 'Google sign-in failed. Please try again.'],
  ['登入嘗試次數過多', 'Too many sign-in attempts. Please try again later.'],
  ['註冊嘗試過多', 'Too many registration attempts. Please try again later.'],
  ['請求逾時', 'The request timed out. Please try again.'],
  ['網路', 'Network error. Please check your connection and try again.'],
  ['驗證碼錯誤', 'The verification code is incorrect.'],
  ['驗證碼格式錯誤', 'Please enter a valid 6-digit verification code.'],
  ['驗證碼請求過於頻繁', 'Too many verification code requests. Please try again later.'],
  ['驗證碼寄送失敗', 'We could not send the verification code. Please try again.'],
  ['請使用 Gmail 或 Google Workspace 帳戶登入', 'Please use a Gmail or Google Workspace account to sign in.'],
  ['驗證失敗', 'Verification failed. Please try again.'],
  ['寄送失敗', 'We could not send the verification code. Please try again.'],
  ['重送失敗', 'We could not resend the verification code. Please try again.'],
  ['重設失敗', 'Password reset failed. Please try again.'],
  ['重設密碼失敗', 'Password reset failed. Please try again.'],
];

export function localizeAuthError(message: string | null | undefined, language: Language, fallback: string): string {
  const value = message?.trim();
  if (!value) return fallback;
  if (language !== 'en') return value;

  for (const [source, translation] of AUTH_ERROR_TRANSLATIONS) {
    if (value.includes(source)) return translation;
  }

  if (/^HTTP \d{3}$/u.test(value) || /^(Failed to fetch|NetworkError|fetch failed)$/iu.test(value)) return fallback;
  return /[\u3400-\u9fff]/u.test(value) ? fallback : value;
}

export function googleButtonLocale(pathname: string): 'en' | 'zh_TW' {
  return getLanguageFromPath(pathname) === 'en' ? 'en' : 'zh_TW';
}