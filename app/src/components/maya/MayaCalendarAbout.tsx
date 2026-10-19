import { Link } from 'react-router-dom';
import type { MayaLocale } from '../../lib/maya';

export default function MayaCalendarAbout({ locale }: { locale: MayaLocale }) {
  const en = locale === 'en';
  const prefix = en ? '/en' : '';
  const linkStyle = 'inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-cyan-200/30 px-6 py-3 text-base font-semibold text-cyan-100 transition-colors hover:border-cyan-200 hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300';

  return (
    <section aria-labelledby="maya-about-heading" className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-slate-100 sm:p-8 lg:p-10">
      <h2 id="maya-about-heading" className="text-2xl font-semibold leading-snug tracking-wide sm:text-3xl">
        {en ? 'About the 13 Moon Calendar and Solar Seals' : '關於馬雅13月亮曆與圖騰能量'}
      </h2>
      <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
        {en
          ? 'Use the Dreamspell calendar calculator to explore your galactic signature. Each KIN combines one of 13 galactic tones with one of 20 solar seals, creating a cycle of 260 symbolic signatures for personal reflection.'
          : '透過馬雅曆查詢，你可以從出生日期認識自己的星系印記。每一個 KIN印記，都由一種銀河調性與一個太陽圖騰組成；13調性與20個圖騰交織成260種組合，提供探索天賦、關係與生命節奏的象徵視角。'}
      </p>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <span aria-hidden="true" className="text-3xl font-light text-cyan-300">13</span>
          <h3 className="mt-3 text-xl font-semibold text-cyan-100">{en ? 'Galactic tones: a rhythm for reflection' : '13調性：探索行動與成長的節奏'}</h3>
          <p className="mt-3 text-base leading-8 text-slate-300">
            {en
              ? 'The 13 tones describe a symbolic journey from intention to completion. Magnetic, Lunar and Electric are the first three tones; each offers a different prompt for considering how you begin, respond to challenges and put ideas into practice.'
              : '13個銀河調性象徵從啟動到完成的不同階段，例如磁性、月亮與電力調性，分別帶出目的、挑戰與服務等探索主題。了解自己的調性，可以作為觀察行動方式、面對課題與落實想法的參考。'}
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <span aria-hidden="true" className="text-3xl font-light text-amber-200">20</span>
          <h3 className="mt-3 text-xl font-semibold text-amber-100">{en ? 'Solar seals: symbolic themes and gifts' : '20個圖騰：認識天賦與生命主題'}</h3>
          <p className="mt-3 text-base leading-8 text-slate-300">
            {en
              ? 'The 20 solar seals use images such as Red Dragon, White Wind, Blue Night and Yellow Sun to express themes including nurturing, communication, dreams and awareness. Read your seal alongside your tone to reflect on your own experiences.'
              : '20個太陽圖騰以紅龍、白風、藍夜、黃太陽等意象，呈現滋養、溝通、夢想與覺察等生命主題。將圖騰與調性一起閱讀，能讓星系印記的解讀更有層次，也讓你從日常經驗中思考自己的特質與可能性。'}
          </p>
        </article>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-400">
        {en ? 'This tool uses the modern Dreamspell system, distinct from the traditional Maya Tzolk’in calendar. Interpretations are symbolic prompts for self-exploration.' : '本站採用現代 Dreamspell／13月亮曆系統，不等同於傳統馬雅 Tzolk’in 曆法；圖騰與調性的解讀用於象徵性的自我探索。'}
      </p>
      <nav aria-label={en ? 'Continue your self-exploration' : '繼續探索自我'} className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:flex-wrap">
        <Link to={`${prefix}/numerology`} className={linkStyle}>{en ? 'Explore Numerology' : '探索生命靈數'}<span aria-hidden="true">→</span></Link>
        <Link to={`${prefix}/oracle`} className={linkStyle}>{en ? 'Explore Tarot' : '體驗塔羅占卜'}<span aria-hidden="true">→</span></Link>
      </nav>
    </section>
  );
}
