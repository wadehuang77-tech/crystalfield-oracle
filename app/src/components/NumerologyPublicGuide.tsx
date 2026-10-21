import NumerologyNumberGuide from './NumerologyNumberGuide';
import { Link } from 'react-router-dom';
import { numerologyArticles, numerologyFaq } from '../lib/numerologySeo';

export default function NumerologyPublicGuide() {
  return <section className="mt-12 space-y-8 text-left text-purple-100/80" aria-label="生命靈數公開教學">
    <section><h2 className="mb-3 font-serif text-2xl text-purple-100">生命靈數是什麼？</h2><p className="leading-8">生命靈數把出生日期整理為數字，用象徵主題協助觀察天賦、習慣與選擇。可以把它當作寫日記與對話的起點，而不是固定性格、命運或職業的答案。</p></section>
    <section><h2 className="mb-3 font-serif text-2xl text-purple-100">如何使用本站計算器</h2><ol className="list-decimal space-y-2 pl-6 leading-8"><li>準備西元出生年月日，不需要時、分或出生地。</li><li>在上方計算器依提示登入，輸入生日並送出計算。</li><li>先閱讀免費基礎結果；需要更深入內容時，再查看方案範圍與價格。</li></ol><p className="mt-3 leading-8">本頁介紹、以下虛構示範與所有教學文章均可免登入閱讀。個人結果與會員功能仍依原有登入及授權流程提供。</p></section>
    <section><h2 className="mb-3 font-serif text-2xl text-purple-100">免費結果與付費深度報告有何差異？</h2><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-purple-200/20 p-5"><h3 className="mb-2 text-lg font-semibold">登入後免費計算</h3><p className="leading-8">產生主命數、生日數與基礎結果，從數字認識自己的探索方向。</p></div><div className="rounded-2xl border border-purple-200/20 p-5"><h3 className="mb-2 text-lg font-semibold">依方案付費解鎖</h3><p className="leading-8">AI 深度解讀、進階內容與完整流年報告依方案開放，不代表所有解析免費。購買前請確認畫面的內容範圍與價格。</p></div></div></section>
    <section className="rounded-2xl border border-amber-200/20 bg-amber-200/5 p-5"><h2 className="mb-3 text-2xl text-purple-100">公開示範：虛構生日 1990-12-31</h2><p className="leading-8">此為教學示範，非會員資料。生日逐位相加 1＋9＋9＋0＋1＋2＋3＋1＝26，再以 2＋6＝8 得到主命數 8；生日數為 3＋1＝4。生日中未出現的缺失數是 4、5、6、7、8。</p><p className="mt-3 leading-8">本站目前流年固定計算 2026：12＋31＋2026＝2069，2＋0＋6＋9＝17，1＋7＝8。遇到 11、22、33 時會保留，詳細規則請見計算教學。</p></section>
    <nav aria-label="生命靈數教學文章"><h2 className="mb-4 text-2xl text-purple-100">生命靈數教學與數字解析</h2><div className="grid gap-4 sm:grid-cols-2">{Object.entries(numerologyArticles).filter(([slug]) => slug === 'how-to-calculate').map(([slug, article]) => <Link key={slug} to={`/numerology/${slug}/`} className="rounded-2xl border border-purple-200/20 bg-white/5 p-5 leading-7 underline underline-offset-4 hover:bg-white/10"><span className="block font-semibold">{article.h1}</span><span className="mt-2 block text-sm leading-7 text-purple-100/70 no-underline">{article.description}</span></Link>)}</div></nav>
    <NumerologyNumberGuide />
    <section id="faq"><h2 className="mb-4 text-2xl text-purple-100">生命靈數常見問題</h2><div className="space-y-3">{numerologyFaq.map(([q,a]) => <details key={q} className="rounded-xl border border-purple-200/20 p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-3 leading-8">{a}</p></details>)}</div></section>
    <p className="text-sm leading-7">以上解讀用於自我探索，不保證命運或準確率，不提供醫療效果承諾。</p>
    <nav aria-label="其他探索工具" className="flex flex-wrap gap-4 border-t border-purple-200/20 pt-5 text-sm"><Link to="/oracle/" className="underline">探索塔羅與神諭卡</Link><Link to="/human-design/" className="underline">深入探索人類圖</Link><Link to="/vedic-astrology/" className="underline">查看印度占星分析</Link><Link to="/maya-calendar/" className="underline">查看瑪雅曆</Link></nav>
  </section>;
}
