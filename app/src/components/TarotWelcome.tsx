import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLanguageFromPath, getLocalizedPath, translations } from '../lib/i18n';

const decks = ['偉特塔羅', '光行者神諭', '獨角獸塔羅', '龍族塔羅', '埃及神諭', 'Lightworker 光之訊息', '奧修禪卡'];

export function TarotWelcome() {
  const { user } = useAuth();
  const location = useLocation();
  const language = getLanguageFromPath(location.pathname);
  const en = language === 'en';
  const redirect = location.pathname + location.search + location.hash;
  return (
    <section aria-labelledby="tarot-welcome-title" className="mb-8 w-full rounded-3xl border border-violet-300/40 bg-slate-900 p-5 text-slate-100 shadow-xl sm:p-8">
      <div className="grid gap-6 md:grid-cols-[1fr_2fr] md:gap-10">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-widest text-violet-200">{en ? 'YOUR TAROT JOURNEY' : '你的塔羅探索，從這裡開始'}</p>
          <h2 id="tarot-welcome-title" className="text-2xl font-bold leading-relaxed sm:text-3xl">{en ? '7 free readings across all decks and spreads' : '免登入，七套牌組所有牌陣共免費 7 次'}</h2>
          <p className="mt-4 text-base leading-7 text-slate-200">{en ? 'Preview 50% without signing in. Sign in with your account or Google to see the remaining 50% of the same reading.' : '單張與多張牌陣共用 7 次額度；訪客先看 50%，登入晶域心語或 Google 帳號後，接續查看剩餘 50%。'}</p>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold">{en ? 'Explore these seven decks' : '包含以下七套塔羅與神諭卡'}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {decks.map((deck, index) => <li key={deck} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3">
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-200 font-bold text-violet-950">{index + 1}</span>
              <span className="text-base font-medium">{en ? translations.en.oraclePage.deckNames[index] : deck}</span>
            </li>)}
          </ul>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-4 border-t border-slate-600 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base leading-7 text-slate-200">{en ? 'Guest credits are shared per IP, not per deck. Usage carries over after sign-in; monthly plans are unchanged.' : '訪客次數依同一 IP 累計，並非每套各 7 次；登入後接續已用額度，月費方案維持不變。'}</p>
        {!user && <Link to={`${getLocalizedPath('/login', language)}?${new URLSearchParams({ redirect })}`} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-violet-200 px-6 py-3 text-base font-bold text-violet-950 hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-violet-300">{en ? 'Sign in for the full reading' : '登入，查看完整解讀'}</Link>}
      </div>
    </section>
  );
}
