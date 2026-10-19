import { Link } from 'react-router-dom';
import { useRouteLanguage } from '../../hooks/useRouteLanguage';
import faqs from '../../data/human-design/faqs.json';
import { humanDesignLimit, humanDesignReadingLinks } from '../../lib/humanDesignSeo';

export const HUMAN_DESIGN_FAQS = faqs;
export default function HumanDesignSeoContent() {
  const en = useRouteLanguage() === 'en';
  const prefix = en ? '/en' : '';
  const sections = en ? [
    ['What is Human Design?', 'Human Design is a symbolic framework for self-reflection. Type, strategy, authority and profile offer different questions to explore; they are not scientifically established personality diagnoses or predictions.'],
    ['Birth details and current limitations', 'Enter your recorded local birth date, time and city. Do not substitute an arbitrary time for an unknown one. This tool currently produces reproducible simulated charts without astronomical ephemerides or full timezone conversion. Even accurate inputs do not produce a verified personal chart.'],
    ['Free access and paid readings', 'Public guides are readable without signing in. Personal calculation keeps the existing sign-in requirement and offers a free type entry point; core content and AI deep readings require the relevant paid access. Check the plan scope before purchasing.'],
    ['Suggested reading order', 'Start with type and strategy, then authority, profile, and finally definition, centers and other details. Strategy concerns interaction with opportunities; authority concerns the decision process. A type alone cannot determine how every person should decide.'],
  ] : [
    ['人類圖是什麼？', '人類圖結合占星、易經、脈輪等象徵觀念，提供觀察互動、決策與學習方式的框架。它不是經科學證實的人格診斷，也不保證命運、成功或醫療效果。可以用來提出問題，但不必勉強讓生活符合某個標籤。'],
    ['出生日期、時間與地點怎麼填？', '請使用西元出生日期、出生紀錄中的當地時分及出生城市，不要把目前所在地時間當成出生地時間。若不知道時、分，先查閱可靠紀錄，不要把任意填入或中午 12 點當作準確替代值；本站沒有出生時間校正功能。'],
    ['目前工具的實際能力', humanDesignLimit],
    ['免費結果與付費深度解析', '本頁與教學文章免登入。使用個人計算時維持原有登入規則，可先查看免費類型入口；完整核心內容與 AI 深度解析依方案及已取得權限解鎖，不是所有解析免費。購買前請核對內容範圍、價格與工具限制。'],
    ['排圖後，建議依什麼順序閱讀？', '類型與策略 → 內在權威 → 人生角色 → 定義、中心及其他項目。先理解如何接觸機會，再看作出承諾的節奏，接著探索學習與關係經驗。中心顏色和人生角色回答不同問題，不要混成一個性格結論。'],
  ];
  const links = en ? [
    ['The five types and strategies', 'types'], ['Generator', 'generator'], ['Manifesting Generator', 'manifesting-generator'],
    ['Projector', 'projector'], ['Manifestor', 'manifestor'], ['Reflector', 'reflector'], ['Authority', 'authority'], ['Profile', 'profile'],
  ] : humanDesignReadingLinks;
  const questions = en ? [
    ['Can an estimated birth time give an accurate result?', 'No. Check reliable records. This tool currently generates simulated charts and does not verify an accurate personal chart even with exact inputs.'],
    ['Is every report free?', 'No. Public learning content is free to read; personal calculations require sign-in, and core or AI deep readings depend on paid access.'],
    ['Why five types?', 'Manifesting Generators are presented separately for readability, but belong to the Generator family in the source system.'],
  ] : faqs;
  return <section className="relative mx-auto mt-10 w-full max-w-3xl space-y-8 text-left text-slate-300" aria-label={en ? 'Human Design beginner guide' : '人類圖新手閱讀導覽'}>
    {sections.map(([heading, text]) => <section key={heading}><h2 className="mb-3 text-2xl font-semibold text-cyan-100">{heading}</h2><p className="text-base leading-8">{text}</p></section>)}
    <nav aria-label={en ? 'Human Design reading guides' : '人類圖教學文章'}>
      <h2 className="mb-4 text-2xl font-semibold text-cyan-100">{en ? 'Choose a reading guide' : '從一篇教學開始'}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{links.map(([label, slug]) => <Link key={slug} to={`${prefix}/human-design/${slug}/`} className="rounded-xl border border-cyan-200/20 bg-white/5 p-4 leading-7 text-cyan-200 underline underline-offset-4 hover:bg-white/10">{label}</Link>)}</div>
    </nav>
    <section><h2 className="mb-4 text-2xl font-semibold text-cyan-100">{en ? 'Frequently asked questions' : '人類圖常見問題'}</h2><div className="space-y-3">{questions.map(([q,a]) => <details key={q} className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer font-semibold text-cyan-100">{q}</summary><p className="mt-3 leading-7">{a}</p></details>)}</div></section>
    <nav className="flex flex-wrap gap-4 border-t border-white/10 pt-5 text-sm" aria-label={en ? 'Other tools' : '其他探索工具'}>{[['numerology', '生命靈數', 'Numerology'], ['oracle', '塔羅占卜', 'Tarot'], ['vedic-astrology', '印度占星', 'Vedic Astrology'], ['maya-calendar', '瑪雅曆', 'Maya Calendar']].map(([path, zh, english]) => <Link key={path} to={`${prefix}/${path}/`} className="text-cyan-300 underline">{en ? english : zh}</Link>)}</nav>
  </section>;
}
