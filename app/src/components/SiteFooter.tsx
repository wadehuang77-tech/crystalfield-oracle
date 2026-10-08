import { Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getLanguageFromPath, getLocalizedPath, t, translations } from '../lib/i18n';
import { useRenderYear } from '../contexts/RenderYearContext';

export default function SiteFooter() {
  const location = useLocation();
  const renderYear = useRenderYear();
  const language = getLanguageFromPath(location.pathname);
  const copy = translations[language];
  const copyT = (key: string) => t(key, language);

  return (
    <footer className="w-full bg-slate-950 border-t border-blue-500/15">
      <div className="max-w-[920px] mx-auto px-6 sm:px-10 py-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center sm:items-start gap-2">
          <span className="font-serif text-base text-blue-100 tracking-[0.3em]">{copy.siteName}</span>
          <p className="text-xs text-blue-300/70 tracking-wider">{copy.footerTagline}</p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <Link
            to={getLocalizedPath('/privacy', language)}
            className="inline-flex items-center gap-2 text-sm text-blue-200/80 hover:text-blue-100 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={1.4} />
            {copyT('footerPrivacy')}
          </Link>
          <a
            href="mailto:wadehuang77@gmail.com"
            className="inline-flex items-center gap-2 text-sm text-blue-300/75 hover:text-blue-300 transition-colors"
          >
            <Mail className="w-4 h-4" strokeWidth={1.4} />
            wadehuang77@gmail.com
          </a>
        </div>
      </div>
      <div className="border-t border-blue-500/10">
        <p className="text-center text-xs text-blue-400/50 tracking-[0.2em] py-3">
          © {renderYear} {copy.siteName}
        </p>
      </div>
    </footer>
  );
}
