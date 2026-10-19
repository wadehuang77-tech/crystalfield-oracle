import { Link } from 'react-router-dom';
import { useRouteLanguage } from '../../hooks/useRouteLanguage';

const types = [
  { name: '顯示者', english: 'Manifestor', strategy: '行動前告知', strategyEn: 'Inform before acting',
    text: '在人類圖中象徵啟動與開創。當你準備採取行動時，先讓受影響的人了解你的方向，為彼此保留溝通空間。',
    textEn: 'Associated with initiating and starting new things. Inform people affected by your actions so they can understand your direction and communicate with you.' },
  { name: '生產者', english: 'Generator', strategy: '等待回應', strategyEn: 'Wait to respond',
    text: '在人類圖中象徵投入與持續創造。留意生活帶來的具體機會，以及身體的回應；答應之前，觀察自己是否願意投入。',
    textEn: 'Associated with sustained engagement and creation. Notice concrete opportunities and your response to them before deciding where to invest your energy.' },
  { name: '顯示生產者', english: 'Manifesting Generator', strategy: '先回應，再行動與告知', strategyEn: 'Respond, then act and inform',
    text: '在人類圖中兼具投入與快速探索的主題。先確認自己的回應，再嘗試與調整；方向改變時，也讓受影響的人知道。',
    textEn: 'Associated with engagement and rapid exploration. Check your response before experimenting, allow adjustments, and inform others when your direction changes.' },
  { name: '投射者', english: 'Projector', strategy: '等待認可與邀請', strategyEn: 'Wait for recognition and invitation',
    text: '在人類圖中象徵觀察與引導。面對重要合作或關係，留意自己的洞察是否受到認可，以及是否獲得適合的邀請。',
    textEn: 'Associated with observation and guidance. In significant relationships and collaborations, notice whether your insight is recognized and your contribution invited.' },
  { name: '反映者', english: 'Reflector', strategy: '重要決定留待月亮週期觀察', strategyEn: 'Allow a lunar cycle for major decisions',
    text: '在人類圖中象徵對環境的敏銳觀察。重大決定可在現實條件允許時，透過約一個月亮週期觀察感受變化，不必急著定案。',
    textEn: 'Associated with sensitivity to surroundings. When practical, allow roughly a lunar cycle to observe changing impressions before making a major decision.' },
];

export default function HumanDesignTypesSection() {
  const en = useRouteLanguage() === 'en';
  const prefix = en ? '/en' : '';
  const button = 'inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-cyan-300/30 px-5 py-3 text-base font-semibold text-cyan-100 transition-colors hover:border-cyan-200 hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300';
  return (
    <section aria-labelledby="human-design-types-heading" className="relative mt-10 w-full max-w-3xl rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-left text-slate-100 sm:p-8">
      <h2 id="human-design-types-heading" className="text-2xl font-semibold leading-snug sm:text-3xl">
        {en ? 'The 5 Human Design Types and Decision Strategies' : '人類圖 5 大類型與決策策略'}
      </h2>
      <p className="mt-4 text-base leading-8 text-slate-300">
        {en ? 'The five-category presentation includes Manifesting Generators within the Generator family. Read strategy alongside authority and the complete chart; this tool currently produces simulated results.' : '本站以五類呈現，其中顯示生產者屬於生產者家族。類型策略需搭配權威及完整圖表理解；本站目前為模擬結果，不據此確認個人類型。'}
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {types.map((type, index) => (
          <article key={type.english} className={`rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 ${index === types.length - 1 ? 'sm:col-span-2' : ''}`}>
            <h3 className="text-xl font-semibold text-white">{en ? type.english : type.name}</h3>
            {!en && <p className="mt-1 text-sm tracking-wide text-slate-400" lang="en">{type.english}</p>}
            <p className="mt-4 text-base font-medium leading-7 text-cyan-200">{en ? type.strategyEn : type.strategy}</p>
            <p className="mt-2 text-base leading-8 text-slate-300">{en ? type.textEn : type.text}</p>
            <Link className="mt-4 inline-block text-cyan-200 underline underline-offset-4" to={`${prefix}/human-design/${type.english.toLowerCase().replace(/ /g, '-')}/`}>{en ? `Read about ${type.english}` : `閱讀${type.name}的策略與練習`}</Link>
          </article>
        ))}
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-400">{en ? 'These symbolic interpretations support self-reflection; they do not define your abilities or replace your own judgment.' : '以上為人類圖系統的象徵性解讀，可用於自我探索，不是對能力的定論，也不取代你自己的判斷。'}</p>
      <nav aria-label={en ? 'Explore related tools' : '探索其他查詢工具'} className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:flex-wrap">
        <Link to={`${prefix}/maya-calendar`} className={button}>{en ? 'Explore the Maya Calendar' : '查詢瑪雅曆印記'}<span aria-hidden="true">→</span></Link>
        <Link to={`${prefix}/numerology`} className={button}>{en ? 'Explore Numerology' : '探索生命靈數'}<span aria-hidden="true">→</span></Link>
      </nav>
    </section>
  );
}
