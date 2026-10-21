import { Link } from 'react-router-dom';
import { numberGuide } from '../data/numerology/numberGuide';

export default function NumerologyNumberGuide() {
  return <section aria-labelledby="number-guide-heading" className="space-y-5">
    <header>
      <h2 id="number-guide-heading" className="text-2xl text-purple-100">生命靈數1-9號人解析：工作、關係與成長練習</h2>
      <p className="mt-3 leading-8">完成生命靈數計算後，選擇你的數字開始閱讀。以下主題是自我觀察的提問，不是職業、伴侶配對或命運的判定；若結果為 11、22、33，本站保留大師數，不在此強制對應成個位數。</p>
    </header>
    <nav aria-label="選擇生命靈數" className="flex flex-wrap gap-3">{numberGuide.map(item => <a key={item.number} href={`#life-path-${item.number}`} className="rounded-lg border border-purple-200/30 px-4 py-2 underline underline-offset-4">{item.number} 號</a>)}</nav>
    <section aria-labelledby="crystal-guide-heading" className="rounded-2xl border border-amber-200/20 bg-amber-200/5 p-5">
      <h3 id="crystal-guide-heading" className="text-xl text-purple-100">生命靈數能量水晶：把象徵化成日常提醒</h3>
      <p className="mt-3 leading-8">以下是本站編寫的水晶搭配靈感，並非唯一對應法，也不是科學證實的效果。紅玉髓、紫水晶、粉晶等可依色彩與個人喜好選擇，作為書寫或練習的提示；不必購買水晶，也能完成所有練習。水晶不會改變命運、治療疾病或保證財富。</p>
    </section>
    <div className="numerology-number-grid">{numberGuide.map(item => <article key={item.number} id={`life-path-${item.number}`} className="numerology-number-card scroll-mt-24 rounded-2xl border border-purple-200/20 bg-white/5 p-5 break-words">
      <span aria-hidden="true" className="numerology-number-badge">{item.number}</span>
      <h3 className="text-xl font-semibold text-purple-100">生命靈數 {item.number} 號人：{item.theme}</h3>
      <p className="mt-3 leading-7"><strong className="text-purple-200">特質探索：</strong>{item.trait}。可將這些象徵作為觀察方向，並以自己的實際經驗為準。</p>
      <dl className="mt-4 space-y-3 leading-7">
        <div><dt className="font-semibold text-purple-200">工作與合作</dt><dd>{item.career}</dd></div>
        <div><dt className="font-semibold text-purple-200">感情與人際</dt><dd>{item.relationships}</dd></div>
        <div><dt className="font-semibold text-purple-200">水晶象徵：{item.crystal}</dt><dd>{item.practice}</dd></div>
      </dl>
      <Link to={`/numerology/life-path-${item.number}/`} className="mt-5 inline-block py-2 text-purple-200 underline underline-offset-4">閱讀生命靈數 {item.number} 號人的完整解析 →</Link>
    </article>)}</div>
    <a href="#calculator" className="inline-block rounded-xl bg-amber-200 px-5 py-3 font-semibold text-slate-950">回到生命靈數計算器 ↑</a>
  </section>;
}
