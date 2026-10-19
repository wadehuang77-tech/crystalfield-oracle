import { Link } from 'react-router-dom';
import { numerologyArticles, type NumerologySlug } from '../lib/numerologySeo';

export default function NumerologyArticlePage({ slug }: { slug: NumerologySlug }) {
  const article = numerologyArticles[slug];
  return <main lang="zh-Hant" className="mx-auto max-w-3xl px-5 py-10 text-purple-100 sm:py-16">
    <nav aria-label="麵包屑" className="mb-7 flex flex-wrap gap-2 text-sm text-purple-300">
      <Link to="/" className="underline">首頁</Link><span>/</span><Link to="/numerology/" className="underline">生命靈數</Link><span>/</span><span>{article.h1}</span>
    </nav>
    <article className="space-y-8 break-words">
      <header className="rounded-3xl border border-purple-200/20 bg-white/5 p-6 sm:p-9">
        <h1 className="font-serif text-3xl leading-snug sm:text-4xl">{article.h1}</h1>
        <p className="mt-5 text-base leading-8 text-purple-100/80">{article.intro}</p>
        <p className="mt-4 text-sm text-purple-200/70">更新日期：<time dateTime={article.updated}>{article.updated}</time></p>
      </header>
      {article.sections.map(section => <section key={section.heading}>
        <h2 className="mb-3 text-2xl font-semibold leading-snug">{section.heading}</h2>
        {section.paragraphs.map(text => <p key={text} className="mb-4 text-base leading-8 text-purple-100/80">{text}</p>)}
      </section>)}
      <p className="text-sm leading-7 text-purple-200/70">生命靈數是象徵性的自我探索工具，不保證個人特質或未來結果，也不取代專業建議。</p>
      <Link to="/numerology/#calculator" className="inline-flex min-h-12 items-center rounded-xl bg-amber-200 px-5 py-3 font-semibold text-slate-950 focus-visible:outline focus-visible:outline-offset-4">免費計算我的生命靈數 →</Link>
      <nav aria-label="延伸閱讀" className="border-t border-purple-200/20 pt-6">
        <h2 className="mb-4 text-xl">延伸閱讀</h2>
        <ul className="space-y-3">{article.related.map(key => <li key={key}><Link className="text-purple-200 underline underline-offset-4" to={`/numerology/${key}/`}>{numerologyArticles[key as NumerologySlug].h1}</Link></li>)}</ul>
      </nav>
    </article>
  </main>;
}
