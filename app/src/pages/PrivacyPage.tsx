import { Link, useLocation } from 'react-router-dom';
import { getLanguageFromPath, getLocalizedPath, t, translations } from '../lib/i18n';

export default function PrivacyPage() {
  const location = useLocation();
  const language = getLanguageFromPath(location.pathname);
  const copy = translations[language].privacy;
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070416] via-[#100723] to-[#060310] px-5 py-12 text-slate-100 sm:px-8 sm:py-16">
      <article className="mx-auto max-w-4xl rounded-3xl border border-purple-400/20 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(88,28,135,0.22)] backdrop-blur-sm sm:p-10">
        <p className="text-center text-xs font-medium uppercase tracking-[0.35em] text-amber-200/70">Crystal Field 101</p>
        <h1 className="mt-4 text-center font-serif text-3xl font-bold tracking-[0.12em] text-white sm:text-5xl">{t('privacy.title', language)}</h1>
        <p className="mt-5 text-center text-sm leading-7 text-purple-100/65">{t('privacy.updated', language)}</p>

        <div className="mt-10 space-y-9">
          <section>
            <p className="leading-8 text-slate-200/85">
              {t('privacy.intro', language)}
            </p>
          </section>

          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-serif text-xl font-semibold tracking-wide text-amber-100 sm:text-2xl">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="leading-8 text-slate-300/85">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-5 text-center">
          <p className="text-sm text-cyan-100/75">{t('privacy.contactLabel', language)}</p>
          <a className="mt-2 inline-block text-cyan-200 underline decoration-cyan-400/40 underline-offset-4 hover:text-white" href="mailto:wadehuang77@gmail.com">
            wadehuang77@gmail.com
          </a>
        </div>

        <div className="mt-8 text-center">
          <Link to={getLocalizedPath('/', language)} className="inline-flex rounded-full border border-purple-300/25 px-6 py-3 text-sm text-purple-100 transition hover:border-purple-200/50 hover:bg-purple-400/10">
            {t('privacy.home', language)}
          </Link>
        </div>
      </article>
    </main>
  );
}
