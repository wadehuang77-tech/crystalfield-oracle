import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import articles from '../data/vedic-astrology/articles.json';

export type VedicArticle = {
  title: string;
  description: string;
  h1: string;
  summary: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  faq: Array<[string, string]>;
  related: Array<[string, string]>;
};

export const VEDIC_ARTICLES = articles as unknown as Record<string, VedicArticle>;

export default function VedicAstrologyArticlePage({ slug }: { slug: keyof typeof articles }) {
  const article = VEDIC_ARTICLES[slug];
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070312] px-5 py-14 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" /><div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl" /></div>
      <article className="relative mx-auto max-w-4xl">
        <nav aria-label="麵包屑" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-amber-200/70"><Link to="/oracle">首頁</Link><span aria-hidden="true">/</span><Link to="/vedic-astrology">印度占星</Link><span aria-hidden="true">/</span><span>{article.h1}</span></nav>
        <header className="rounded-3xl border border-amber-200/15 bg-slate-950/60 p-7 shadow-2xl shadow-fuchsia-950/20 backdrop-blur sm:p-12">
          <div className="mb-5 flex items-center gap-2 text-sm tracking-[0.18em] text-amber-200/75"><BookOpen className="h-4 w-4" aria-hidden="true" /><span>印度占星・閱讀指南</span></div>
          <h1 className="text-3xl font-semibold leading-tight text-amber-50 sm:text-5xl">{article.h1}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-violet-100/80 sm:text-lg">{article.summary}</p>
          <div className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-violet-100/70"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-amber-200"><Sparkles className="h-4 w-4" aria-hidden="true" /></span><span>作者：韋德老師｜供自我覺察與生活實驗參考</span></div>
          <p className="mt-3 text-sm text-violet-100/55">發布日期：2026 年 9 月 17 日｜修改日期：2026 年 9 月 17 日</p>
        </header>
        <div className="mt-10 space-y-10">
          <nav aria-label="文章目錄" className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><h2 className="text-xl font-semibold">文章目錄</h2><ol className="mt-3 grid gap-2 text-amber-300 sm:grid-cols-2">{article.sections.map((section, index) => <li key={section.heading}><a className="underline decoration-amber-300/40 underline-offset-4" href={`#section-${index + 1}`}>{section.heading}</a></li>)}<li><a className="underline decoration-amber-300/40 underline-offset-4" href="#article-faq">常見問題</a></li></ol></nav>
          <section className="rounded-2xl border border-amber-200/15 bg-amber-950/20 p-6"><h2 className="text-xl font-semibold text-amber-50">重點整理</h2><ul className="mt-3 grid gap-2 leading-7 text-violet-100/80 sm:grid-cols-2">{article.sections.map((section) => <li key={section.heading}>．{section.heading}</li>)}</ul></section>
          {article.sections.map((section, index) => <section key={section.heading} id={`section-${index + 1}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-8"><h2 className="text-2xl font-semibold text-amber-100 sm:text-3xl">{section.heading}</h2><div className="mt-4 space-y-4 text-base leading-8 text-violet-100/80">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}
          <section id="article-faq" className="rounded-2xl border border-amber-200/15 bg-amber-950/20 p-6 sm:p-8"><h2 className="text-2xl font-semibold sm:text-3xl">常見問題</h2><div className="mt-5 space-y-3">{article.faq.map(([question, answer]) => <details key={question} className="rounded-xl border border-white/10 bg-black/10 px-4 py-3"><summary className="cursor-pointer font-medium text-amber-100">{question}</summary><p className="mt-3 leading-7 text-violet-100/75">{answer}</p></details>)}</div></section>
          <section className="rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-950/70 to-fuchsia-950/50 p-7 sm:p-9"><h2 className="text-2xl font-semibold">免費查看我的印度占星命盤</h2><p className="mt-3 max-w-2xl leading-8 text-violet-100/80">輸入出生年月日、準確出生時間與地點，查看上升、行星、月宿與大運，探索前世業力、人生使命、感情、事業及未來趨勢。</p><Link className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-fuchsia-500 px-5 py-3 font-semibold" to="/vedic-astrology">免費查看我的印度占星命盤 <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><h2 className="text-xl font-semibold">關於作者</h2><p className="mt-3 leading-7 text-violet-100/75">韋德老師擁有十年以上塔羅、水晶療癒及命理實務經驗，是水晶療癒老師與身心靈系統設計者，持續整合印度占星、生命靈數、人類圖、塔羅與水晶能量，協助使用者進行自我探索。</p></section>
          <aside className="rounded-2xl border border-amber-200/15 bg-amber-950/20 p-6 text-sm leading-7 text-violet-100/75">印度占星適合作為自我探索與生命週期整理的參考，不代表科學、醫療或心理診斷，也不能取代醫療、心理、法律、財務或其他專業意見。占星內容不保證特定事件一定發生，請結合真實情況及專業資訊進行判斷。</aside>
          <nav aria-label="延伸閱讀" className="border-t border-white/10 pt-7"><h2 className="text-xl font-semibold">延伸閱讀</h2><div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">{article.related.map(([label, href]) => <Link key={href} className="text-amber-300 underline decoration-amber-300/40 underline-offset-4" to={href}>{label}</Link>)}</div></nav>
        </div>
      </article>
    </main>
  );
}
