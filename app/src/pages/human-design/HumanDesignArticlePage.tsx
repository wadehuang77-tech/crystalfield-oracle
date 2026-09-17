import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import articles from '../../data/human-design/articles.json';

export type HumanDesignArticle = {
  title: string;
  description: string;
  section: string;
  h1: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  faq: Array<[string, string]>;
  related: Array<[string, string]>;
};

export const HUMAN_DESIGN_ARTICLES = articles as unknown as Record<string, HumanDesignArticle>;

type HumanDesignArticlePageProps = {
  slug: keyof typeof articles;
};

export default function HumanDesignArticlePage({ slug }: HumanDesignArticlePageProps) {
  const article = HUMAN_DESIGN_ARTICLES[slug];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0E17] px-5 py-14 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>
      <article className="relative mx-auto max-w-4xl">
        <nav aria-label="麵包屑" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-cyan-200/60">
          <Link className="transition hover:text-cyan-100" to="/human-design">人類圖</Link>
          <span aria-hidden="true">/</span>
          <span className="text-white/80">{article.section}</span>
        </nav>

        <header className="rounded-3xl border border-cyan-200/15 bg-slate-950/55 p-7 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-12">
          <div className="mb-5 flex items-center gap-2 text-sm tracking-[0.18em] text-cyan-200/75">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>{article.section}・閱讀指南</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight text-white sm:text-5xl">{article.h1}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-200/80 sm:text-lg">{article.intro}</p>
          <div className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-slate-300/70">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>作者：韋德老師｜供自我覺察與生活實驗參考</span>
          </div>
          <p className="mt-3 text-sm text-slate-300/60">更新日期：2026 年 9 月 17 日</p>
        </header>

        <div className="mt-10 space-y-10">
          <nav aria-label="文章目錄" className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-xl font-semibold text-white">文章目錄</h2>
            <ol className="mt-3 grid gap-2 text-cyan-300 sm:grid-cols-2">
              {article.sections.map((section, index) => (
                <li key={section.heading}><a className="underline decoration-cyan-300/40 underline-offset-4" href={`#section-${index + 1}`}>{section.heading}</a></li>
              ))}
              <li><a className="underline decoration-cyan-300/40 underline-offset-4" href="#article-faq">常見問題</a></li>
            </ol>
          </nav>
          {article.sections.map((section) => (
            <section key={section.heading} id={`section-${article.sections.indexOf(section) + 1}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-cyan-100 sm:text-3xl">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-200/80">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}

          <section aria-labelledby="article-faq" className="rounded-2xl border border-cyan-200/15 bg-cyan-950/20 p-6 sm:p-8">
            <h2 id="article-faq" className="text-2xl font-semibold text-white sm:text-3xl">常見問題</h2>
            <div className="mt-5 space-y-3">
              {article.faq.map(([question, answer]) => (
                <details key={question} className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                  <summary className="cursor-pointer font-medium text-cyan-100">{question}</summary>
                  <p className="mt-3 leading-7 text-slate-200/75">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-300/20 bg-gradient-to-br from-blue-950/70 to-cyan-950/50 p-7 sm:p-9">
            <h2 className="text-2xl font-semibold text-white">把閱讀變成一次生活實驗</h2>
            <p className="mt-3 max-w-2xl leading-8 text-slate-200/80">
              了解概念後，輸入自己的出生資料建立人類圖，從類型、內在權威和人生角色開始觀察。請保留判斷空間，讓結果服務於你的生活，而不是限制你的選擇。
            </p>
            <Link className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3 font-semibold text-white transition hover:from-blue-400 hover:to-cyan-400" to="/human-design">
              免費計算我的人類圖
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>

          <aside className="rounded-2xl border border-amber-200/15 bg-amber-950/20 p-6 text-sm leading-7 text-slate-200/75">
            人類圖適合作為自我探索與生活實驗的參考，不代表科學、醫療或心理診斷，也不能取代醫療、心理、法律、財務或其他專業意見。請結合自己的真實經驗及現實情況進行判斷。
          </aside>

          <nav aria-label="延伸閱讀" className="border-t border-white/10 pt-7">
            <h2 className="text-xl font-semibold text-white">延伸閱讀</h2>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {article.related.map(([label, href]) => (
                <Link key={href} className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-4 transition hover:text-white" to={href}>{label}</Link>
              ))}
            </div>
          </nav>
        </div>
      </article>
    </main>
  );
}
