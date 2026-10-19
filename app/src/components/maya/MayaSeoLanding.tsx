import { Link } from 'react-router-dom';
import type { MayaFeatures, MayaLocale } from '../../lib/maya';
import { MAYA_PRODUCTS } from '../../lib/maya';
import { mayaSeoContent } from '../../lib/mayaSeo';
import { mayaPremiumCopy } from '../../lib/mayaPremiumCopy';
import MayaPremiumProductIntro from './MayaPremiumProductIntro';
import MayaVisualization from './MayaVisualization';
import MayaCalendarAbout from './MayaCalendarAbout';

export default function MayaSeoLanding({ locale, features, configLoading, configError, availability, availabilityError, enter, adminPreview }: {
  locale: MayaLocale; features: MayaFeatures; configLoading: boolean; configError: string;
  availability: { pro: boolean; relationship: boolean } | null; availabilityError: string;
  enter: () => void; adminPreview: boolean;
}) {
  const en = locale === 'en';
  const content = mayaSeoContent(locale);
  const prefix = en ? '/en' : '';
  const member = `${prefix}/maya-calendar/member`;
  const panel = 'maya-cosmic-panel';
  const cta = 'inline-block rounded-xl bg-cyan-300 px-4 py-3 text-center font-semibold text-slate-950';
  const full = MAYA_PRODUCTS.find(product => product.code === 'MAYA_FULL_499')!;
  const basic = MAYA_PRODUCTS.find(product => product.code === 'MAYA_BASIC_199')!;
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-slate-100" data-maya-seo-landing>
    <section className={panel} data-maya-hero>
      <nav className="mb-4 flex flex-wrap justify-between gap-3 text-sm" aria-label={en ? 'Breadcrumb' : '麵包屑導覽'}>
        <span><Link className="underline" to={`${prefix}/`}>{en ? 'Home' : '首頁'}</Link> / <span>{en ? 'Dreamspell' : '馬雅曆'}</span></span>
        <Link className="underline" to={`${en ? '' : '/en'}/maya-calendar/`}>{en ? '繁體中文' : 'English'}</Link>
      </nav>
      <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">{content.h1}</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-cyan-100" data-maya-subtitle>{content.intro[0]}</p>
      <nav className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3" aria-label={en ? 'Dreamspell navigation' : '馬雅曆導覽'}>
        <a className={`${cta} w-full sm:w-auto`} href="#free-kin">{en ? 'Free Dreamspell KIN Calculator' : '馬雅曆免費解盤'}</a>
        <a className="underline" href="#full-blueprint">{en ? 'View Advanced Dreamspell Readings' : '查看馬雅曆進階解讀'}</a>
        <Link className="underline" to={member} aria-disabled={!features.member} onClick={event => {
          if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); enter(); }
        }}>{en ? 'Sign In to My Reports' : '登入查看我的報告'}</Link>
      </nav>
      <p className="mt-6 max-w-3xl leading-relaxed text-slate-200">{content.intro[1]}</p>
      {adminPreview && <p className="mt-3 text-amber-200">{en ? 'Admin Mock preview: no payment or AI calls.' : '管理者 Mock 預覽：不扣款、不呼叫 AI。'}</p>}
    </section>
    <section className="grid gap-4 md:grid-cols-3" data-maya-features>
      {(en ? ['Meet Your Galactic Signature', 'Explore Your Life Blueprint', 'Connect with the People Who Matter']
        : ['探索你的星際身份', '解讀你的生命藍圖', '了解你與重要的人']).map((heading, i) => <article className={panel} key={heading}>
        <h2 className="text-xl font-semibold">{heading}</h2>
        <p className="mt-3">{(en ? ['Explore your KIN, solar seal, and galactic tone.', 'Reflect on strengths and bring insights into daily life.', 'Consider each other’s perspectives and grow together.']
          : ['認識你的 KIN、太陽圖騰與銀河音調。', '探索天賦與生命方向，將覺察化為日常行動。', '從不同視角理解彼此，練習溝通與共同成長。'])[i]}</p>
      </article>)}
    </section>
    {configError && <p role="alert">{configError}</p>}
    <div id="free-kin" className="scroll-mt-6">
      <MayaVisualization locale={locale} publicPage showMatrixGrid={false} enabled={!configLoading && features.public} />
    </div>
    <MayaCalendarAbout locale={locale} />
    {content.sections.map(section => <section id={section.id} className={panel} key={section.id}>
      <h2 className="mb-4 text-2xl font-semibold">{section.heading}</h2>
      <p className="max-w-3xl leading-relaxed text-slate-200">{section.text}</p>
      {section.id === 'how-to' && <ol className="mt-4 list-inside list-decimal space-y-2">{(en
        ? ['Enter your birth date', 'Find your KIN', 'View your solar seal', 'Explore your galactic tone']
        : ['輸入出生日期', '取得 KIN', '查看太陽圖騰', '了解銀河音調']).map(step => <li key={step}>{step}</li>)}</ol>}
      {section.id === 'how-to' && <a className="mt-4 inline-block underline" href="#free-kin">{en ? 'Try the free KIN calculator' : '前往免費 KIN 查詢'}</a>}
    </section>)}
    <section className={panel} id="full-blueprint">
      <h2 className="mb-4 text-2xl font-semibold">{en ? 'Advanced Dreamspell Readings' : '馬雅曆進階解讀與現有方案'}</h2>
      <p className="mb-4">{en ? 'For a closer look at strengths, learning patterns and everyday interactions, choose a written reflection report after exploring the free signature.'
        : '想進一步整理天賦、學習方式與日常互動，可以先試用免費印記查詢，再依自我探索需求選擇文字解讀。'}</p>
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <article><h3 className="text-lg font-semibold">{en ? basic.en : basic.zh} · NT${basic.price}</h3>
          <p className="mt-2">{en ? 'Three topics: life gifts, potential strengths and growth questions.' : '三項解讀：生命天賦、潛在優勢、成長課題。'}</p>
          <Link className={`${cta} mt-4`} to={`${member}#MAYA_BASIC_199`}>{en ? 'Unlock Life Gifts' : '解鎖個人生命天賦報告'} · NT${basic.price}</Link></article>
        <article><h3 className="text-lg font-semibold">{en ? full.en : full.zh} · NT${full.price}</h3>
          <p className="mt-2">{en ? 'Seven topics: the three personal topics, plus wavespell and castle index explanations, career and creativity, daily practice and relationship reflection.'
            : '七項解讀：包含前三項，另有波符與城堡編號說明、事業與創造力、每日實踐、關係互動。'}</p>
          <Link className={`${cta} mt-4`} to={`${member}#MAYA_FULL_499`}>{en ? 'Unlock Full Life Blueprint' : '解鎖完整生命藍圖'} · NT${full.price}</Link></article>
      </div>
      <p className="mb-4">{en ? 'Sign in, enter your birth date and choose the unlock button for your report. Your birth profile is saved automatically; no separate save step is needed. Reports start after verified payment, or immediately with existing access.'
        : '使用流程：登入、輸入出生年月日，按下對應方案的解鎖按鈕；系統會自動儲存出生資料，不必先按儲存。付款驗證成功後開始解讀；已有權限可直接解鎖。'}</p>
      <Link className={cta} to={member}>{en ? 'Sign In to View Report Options' : '登入查看解讀方案與本人報告'}</Link>
    </section>
    {(['pro', 'relationship'] as const).map(kind => <section className={panel} id={`${kind}-blueprint`} key={kind}>
      <MayaPremiumProductIntro kind={kind} locale={locale} available={availability?.[kind] ?? null} headingLevel={2}>
        <Link className={cta} to={`${prefix}/maya-calendar/${kind}`}>{mayaPremiumCopy(kind, locale).cta}</Link>
      </MayaPremiumProductIntro>
      <p className="mt-4 text-sm text-slate-300">{kind === 'pro'
        ? en ? 'The Pro report is designed around 15 life insights, a personal identity chart, five-force oracle, 13-stage wavespell, and 90-day practice. Availability is confirmed above.'
          : 'Pro 報告設計包含 15 大生命解析、個人星際身份圖、五大神諭、13 階段波符及 90 天生命實踐計畫；實際可用狀態以本區提示為準。'
        : en ? 'The relationship report is designed around 12 relationship insights, paired visuals, oracles, wavespells, three perspectives, and a 90-day shared practice. Availability is confirmed above.'
          : '雙人報告設計包含 12 大關係解析、雙人星際共振圖、五大神諭、生命波符、三種視角及 90 天共振計畫；實際可用狀態以本區提示為準。'}</p>
    </section>)}
    {availabilityError && <p role="alert">{availabilityError}</p>}
    <section className={panel} id="faq">
      <h2 className="mb-4 text-2xl font-semibold">{content.faqHeading}</h2>
      {content.faq.map(([question, answer]) => <div className="mb-5" key={question}>
        <h3 className="mb-2 text-lg font-semibold text-cyan-100">{question}</h3><p className="leading-relaxed text-slate-200">{answer}</p>
      </div>)}
    </section>
    <p className="text-sm leading-relaxed text-slate-400">{mayaPremiumCopy('pro', locale).disclaimer}</p>
    <nav aria-label={en ? 'Explore other services' : '探索其他服務'} className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-sm">
      <Link className="text-cyan-300 underline" to={`${prefix}/oracle`}>{en ? 'Tarot' : '塔羅牌'}</Link>
      <Link className="text-cyan-300 underline" to={`${prefix}/numerology`}>{en ? 'Numerology' : '生命靈數'}</Link>
      <Link className="text-cyan-300 underline" to={`${prefix}/human-design`}>{en ? 'Human Design' : '人類圖'}</Link>
      <Link className="text-cyan-300 underline" to={`${prefix}/vedic-astrology`}>{en ? 'Vedic Astrology' : '印度占星'}</Link>
    </nav>
  </main>;
}
