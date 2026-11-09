import { TarotAccountLogin } from './TarotAccountLogin';
import { useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

import { getLanguageFromPath } from '../lib/i18n';
import { savePendingTarotPlan, TAROT_SUBSCRIPTION_PLANS } from '../lib/tarot-subscription';


export function TarotLoginGate({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const { loading } = useAuth();
  const { pathname } = useLocation();
  const language = getLanguageFromPath(pathname);
  const isEnglish = language === 'en';
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);


  if (loading) return null;

  const dark = theme === 'dark';
  return (
    <section className={`rounded-2xl border p-6 shadow-2xl sm:p-8 ${dark ? 'border-blue-400/30 bg-slate-900/90 text-blue-50' : 'border-blue-200 bg-white text-slate-900'}`}>
      <div className="mb-5 text-center">
        <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${dark ? 'border-blue-300/35 bg-blue-400/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          <Lock className="h-6 w-6" />
        </span>
        <h3 className="text-xl font-bold">{isEnglish ? 'Sign in to View Your Full Reading' : '登入帳號，查看剩餘 50% 解讀'}</h3>
        <p className={`mt-2 text-sm leading-6 ${dark ? 'text-blue-100/70' : 'text-slate-600'}`}>
          {isEnglish
            ? 'All spreads share seven free readings without sign-in. Preview 50%, then sign in for the rest. Monthly plans are available after your free quota is used.'
            : '免登入，所有牌陣跨七種牌組共可免費體驗 7 次；先看 50%，登入後查看剩餘 50%，不需重新抽牌。次數用完後可選擇月費方案。'}
        </p>
      </div>
      <div className={`mx-auto mb-6 grid max-w-2xl gap-2 text-left sm:grid-cols-3 ${dark ? 'text-blue-50' : 'text-slate-900'}`}>
        {TAROT_SUBSCRIPTION_PLANS.map((plan) => {
          const scope = plan.tier === 1 ? (isEnglish ? 'All single- and three-card spreads' : '所有單張與三張牌陣') : plan.tier === 2 ? (isEnglish ? 'Plus all past-life spreads' : '再加所有前世因果陣') : (isEnglish ? 'All decks and spreads' : '所有牌組與全部牌陣');
          const selected = selectedPlanId === plan.id;
          return <button key={plan.id} type="button" aria-pressed={selected} onClick={() => { setSelectedPlanId(plan.id); savePendingTarotPlan(plan.id); }} className={`rounded-lg border p-3 text-center transition hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${selected ? 'border-amber-300 bg-amber-300/15' : dark ? 'border-blue-300/20 bg-blue-400/5' : 'border-blue-200 bg-blue-50'}`}>
            <span className="block font-semibold">NT${plan.price.toLocaleString()}{isEnglish ? '/month' : '／月'}</span>
            <span className={`mt-1 block text-xs leading-5 ${dark ? 'text-blue-100/70' : 'text-slate-600'}`}>{scope}</span>
            <span className={`mt-1 block text-xs font-medium ${dark ? 'text-amber-200' : 'text-amber-700'}`}>{isEnglish ? 'Select, sign in, then continue to ECPay' : '選擇後登入，即可前往綠界付款'}</span>
          </button>;
        })}
      </div>
      <TarotAccountLogin />
    </section>
  );
}
