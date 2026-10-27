import type { ReactNode } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authUrlFor } from '../lib/authLocale';

/** Keep public introductions visible; only the birth-data form requires sign-in. */
export function AuthRequiredBirthDate({children}:{children:ReactNode}) {
  const {user,loading,authError,refreshAuth}=useAuth(),location=useLocation(),navigate=useNavigate();
  const en=location.pathname.startsWith('/en/');
  if(user&&!loading)return <>{children}</>;
  return <div className="relative" data-birth-login-gate>
    <fieldset disabled aria-hidden="true" className="m-0 min-w-0 border-0 p-0">{children}</fieldset>
    <button type="button" disabled={loading} aria-label={en?'Sign in before entering birth details':'登入後填寫出生資料'}
      onClick={()=>authError?void refreshAuth():navigate(authUrlFor(location.pathname,'login',`${location.pathname}${location.search}${location.hash}`),{state:{returnState:location.state}})}
      className="absolute inset-0 z-10 w-full cursor-pointer rounded-2xl bg-transparent focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-violet-400 disabled:cursor-wait">
      <span className="absolute inset-x-3 bottom-3 rounded-xl border border-violet-200/50 bg-slate-950/95 px-4 py-3 text-center text-base font-semibold text-white shadow-lg">
        {loading?(en?'Checking sign-in…':'確認登入狀態中…'):authError?(en?'Unable to check sign-in. Click to retry.':'無法確認登入狀態，點此重試'):en?'Sign in to enter your birth details':'登入會員，開始填寫出生資料'}
      </span>
    </button>
  </div>;
}
