import { Link } from 'react-router-dom';
import landingContent from '../data/vedic-astrology/landing.json';
import { useRouteLanguage } from '../hooks/useRouteLanguage';

export default function VedicAstrologySeoContent() {
  const isEnglish = useRouteLanguage() === 'en';
  if (isEnglish) {
    const englishLinks = [
      ['Vedic vs Western Astrology', 'vedic-vs-western'], ['Rahu and Ketu', 'rahu-ketu'], ['Planetary periods', 'dasha'], ['Nakshatra', 'nakshatra'], ['D9 Navamsa', 'd9-navamsa'], ['D10 Dasamsa', 'd10-dasamsa'], ['Birth time', 'birth-time'], ['Love and marriage', 'love-marriage'], ['Career and wealth', 'career-wealth'],
    ];
    return (
      <section className="mx-auto mt-16 max-w-4xl space-y-10 text-violet-100/80" aria-labelledby="vedic-seo-heading">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-2 text-sm text-amber-200/75">
            <li><Link to="/en/" className="underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Vedic Astrology</li>
          </ol>
        </nav>
        <div><h2 id="vedic-seo-heading" className="font-serif text-3xl text-amber-50">What Is Vedic Astrology (Jyotish)?</h2><p className="mt-4 leading-8">Vedic Astrology, also called Jyotish, is a traditional Indian astrology system that interprets a chart calculated from birth date, time, and place. It uses planetary placements, houses, lunar mansions, and timing periods as symbolic perspectives. Astrology is not a scientifically verified prediction method and should not replace professional advice.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">Vedic and Western Astrology</h2><p className="mt-4 leading-8">The traditions commonly use different zodiac coordinates and interpretive frameworks, so sign placements may differ. Jyotish often gives particular attention to the ascendant, Moon and Nakshatra, Rahu and Ketu, planetary periods, and divisional charts. Comparisons are most useful when each system's calculation settings are kept clear.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">What Is the D1 Birth Chart?</h2><p className="mt-4 leading-8">D1, or the Rashi chart, is the primary chart for a birth moment. It brings the ascendant, houses, and planetary placements into one framework. A considered reading looks at how placements relate to one another instead of treating a single planet or sign as a complete answer.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">D9 Navamsa: Relationships and Maturity</h2><p className="mt-4 leading-8">D9 is traditionally used to explore commitment, shared values, and how a person's understanding may mature over time. It is read with D1 rather than as a standalone verdict on marriage or a relationship. Accurate birth time matters because divisional placements can change with time.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">D10 Dasamsa: Career Themes</h2><p className="mt-4 leading-8">D10 offers another lens on work, professional roles, responsibilities, and contribution. It is interpreted alongside D1 and a person's real circumstances; it cannot guarantee a job, promotion, or financial outcome.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">Nakshatra and Pada</h2><p className="mt-4 leading-8">Nakshatras divide the zodiac into lunar mansions, each with four Padas, or quarters. The Moon's Nakshatra and Pada can offer symbolic prompts for reflecting on emotional responses, preferences, and recurring patterns. They are not fixed personality labels.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">Vimshottari Dasha Periods</h2><p className="mt-4 leading-8">Vimshottari Dasha organizes planetary major periods and sub-periods into a traditional timing framework. Readers may use it to consider changing life themes alongside the birth chart and current circumstances. It does not establish that an event will happen on a particular date.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">Relationships, Marriage, Career, and Wealth</h2><p className="mt-4 leading-8">A Vedic reading may bring together D1 houses and planetary relationships, relevant divisional charts, and Dasha periods to discuss possible themes in relationships, marriage, work, and finances. These interpretations are reflective—not guarantees—and should be weighed with communication, practical information, and qualified professional advice where relevant.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">Free Birth Chart and Nine In-Depth Readings</h2><p className="mt-4 leading-8">The birth chart and introductory information help you review basic placements. Nine optional in-depth readings explore topics such as life lessons, relationships, wealth, career, D9, D10, and planetary periods. They are separate from the introductory chart, and availability and pricing are shown before purchase.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">How to Get Your Vedic Astrology Report</h2><ol className="mt-4 list-decimal space-y-2 pl-6 leading-8"><li>Enter your birth date, the most accurate birth time available, and birthplace.</li><li>Sign in to create and view your personal chart.</li><li>Review the introductory information, then choose an optional in-depth reading if you wish.</li></ol><p className="mt-4 leading-8">Birth time can affect the ascendant, houses, and divisional charts. If you are unsure of the time, check a reliable record and treat time-sensitive placements with care.</p></div>
        <div><h2 className="font-serif text-3xl text-amber-50">Vedic Astrology Knowledge Library</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{englishLinks.map(([label, slug]) => <Link key={slug} className="rounded-xl border border-white/10 bg-white/5 p-4 text-amber-200 underline" to={`/en/vedic-astrology/${slug}`}>{label}</Link>)}</div></div>
        <div><h2 className="font-serif text-3xl text-amber-50">Frequently Asked Questions</h2><div className="mt-4 space-y-3">{landingContent.en.faq.map(([question, answer]) => <details key={question} className="rounded-xl border border-white/10 bg-white/5 p-4"><summary className="cursor-pointer font-medium text-amber-100">{question}</summary><p className="mt-3 leading-7">{answer}</p></details>)}</div></div>
        <nav aria-label="Explore more" className="border-t border-white/10 pt-6 text-sm">
          <ul className="flex flex-wrap gap-x-5 gap-y-3">
            <li><Link className="text-amber-300 underline" to="/en/">Home</Link></li>
            <li><Link className="text-amber-300 underline" to="/en/oracle">Tarot and Oracle Cards</Link></li>
            <li><Link className="text-amber-300 underline" to="/en/numerology">Numerology</Link></li>
            <li><Link className="text-amber-300 underline" to="/en/human-design">Human Design</Link></li>
          </ul>
        </nav>
        <p className="text-sm leading-7 text-violet-200/65">Astrology is offered for cultural context and personal reflection. Past-life themes are not established historical facts, and no reading can guarantee a future event or replace medical, legal, psychological, or financial advice.</p>
      </section>
    );
  }
  const knowledgeLinks = [
    ['印度占星與西洋占星', 'vedic-vs-western'], ['羅喉計都與前世業力', 'rahu-ketu'], ['印度占星大運', 'dasha'], ['月宿 Nakshatra', 'nakshatra'], ['D9 九分盤', 'd9-navamsa'], ['D10 十分盤', 'd10-dasamsa'], ['出生時間怎麼辦？', 'birth-time'], ['感情與婚姻', 'love-marriage'], ['事業與財富', 'career-wealth'],
  ];
  return (
    <section className="mx-auto mt-16 max-w-4xl space-y-10 text-violet-100/80" aria-labelledby="vedic-seo-heading">
      <nav aria-label="麵包屑">
        <ol className="flex flex-wrap gap-2 text-sm text-amber-200/75">
          <li><Link to="/" className="underline">首頁</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">印度占星</li>
        </ol>
      </nav>
      <div><h2 id="vedic-seo-heading" className="font-serif text-3xl text-amber-50">印度占星是什麼？什麼是吠陀占星（Vedic Astrology）？</h2><p className="mt-4 leading-8">印度占星也稱吠陀占星或 Jyotish，依出生日期、時間與地點建立星盤，透過行星、宮位、月宿與週期作象徵性解讀。它是歷史悠久的占星傳統與自我觀察工具，不是科學已證實的預測方法，也不取代專業諮詢。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">印度占星與西洋占星有何不同？</h2><p className="mt-4 leading-8">兩種傳統常採用不同的黃道座標與判讀架構，因此星座位置可能不同。吠陀占星常著重上升、月宿 Nakshatra、羅喉與計都、Vimshottari Dasha 大運，以及 D9、D10 分盤；比較時應先確認各自採用的計算設定。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">出生盤 D1 是什麼？</h2><p className="mt-4 leading-8">D1 又稱 Rashi 本命盤，是依出生時刻繪製的主要星盤，可用來整理上升、宮位與行星配置。判讀時應觀察整體盤面及行星之間的關係，不宜只根據一個星座或單一行星下結論。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">D9 Navamsa：婚姻與靈魂成熟度</h2><p className="mt-4 leading-8">D9 九分盤常用來延伸觀察關係承諾、價值觀與成熟歷程，並需和 D1 一起閱讀。它不會單獨決定婚姻結果；出生時間的準確度也會影響分盤位置。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">D10 Dasamsa：事業分盤</h2><p className="mt-4 leading-8">D10 十分盤提供另一個觀察職涯角色、責任與專業發展的角度。分析時會與 D1 及個人現實處境合併參考，不能保證職位、升遷或財務結果。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">月宿 Nakshatra 與 Pada</h2><p className="mt-4 leading-8">Nakshatra 將黃道細分為月宿，每個月宿再分為四個 Pada。月亮所在的月宿與 Pada 可作為觀察情緒反應、偏好與慣性的象徵線索，而不是固定的人格標籤。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">Vimshottari Dasha 大運系統</h2><p className="mt-4 leading-8">Vimshottari Dasha 以行星主運與子運整理人生階段的主題，是印度占星傳統中的時間架構。閱讀時仍需結合本命盤與現實情況；大運不代表特定事件必然在某個日期發生。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">印度占星如何分析感情、婚姻、事業與財富？</h2><p className="mt-4 leading-8">解讀時可綜合 D1 宮位與行星關係、相關分盤及大運週期，整理感情互動、婚姻承諾、工作角色與財務觀察等可能主題。這些象徵不能取代當事人的選擇、實際資料或專業建議。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">免費出生盤與付費九大深度解析有何差別？</h2><p className="mt-4 leading-8">出生盤及入口提供的基礎資訊可先用來認識星盤；九大深度解析則是另外解鎖的個人化內容，主題包含生命課題、關係、財富、事業、D9、D10 與行星週期。是否提供及價格以頁面當時顯示為準。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">如何取得自己的印度占星報告？</h2><ol className="mt-4 list-decimal space-y-2 pl-6 leading-8"><li>填寫出生年月日、儘量準確的出生時間及出生地點。</li><li>登入後建立並查看個人出生盤。</li><li>先閱讀基礎資訊，再依頁面說明選擇是否解鎖深度解析。</li></ol><p className="mt-4 leading-8">出生時間可能影響上升、宮位與分盤；若不確定，建議查閱可靠紀錄，並審慎看待受時間影響的配置。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">印度占星知識專區</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{knowledgeLinks.map(([label, slug]) => <Link key={slug} className="rounded-xl border border-white/10 bg-white/5 p-4 text-amber-200 underline" to={`/vedic-astrology/${slug}`}>{label}</Link>)}</div></div>
      <div><h2 className="font-serif text-3xl text-amber-50">常見問題</h2><div className="mt-4 space-y-3">{landingContent.zhHant.faq.map(([question, answer]) => <details key={question} className="rounded-xl border border-white/10 bg-white/5 p-4"><summary className="cursor-pointer font-medium text-amber-100">{question}</summary><p className="mt-3 leading-7">{answer}</p></details>)}</div></div>
      <nav aria-label="延伸探索" className="border-t border-white/10 pt-6 text-sm">
        <ul className="flex flex-wrap gap-x-5 gap-y-3">
          <li><Link className="text-amber-300 underline" to="/">首頁</Link></li>
          <li><Link className="text-amber-300 underline" to="/oracle">塔羅牌與神諭卡</Link></li>
          <li><Link className="text-amber-300 underline" to="/numerology">生命靈數</Link></li>
          <li><Link className="text-amber-300 underline" to="/human-design">人類圖</Link></li>
        </ul>
      </nav>
      <p className="text-sm leading-7 text-violet-200/65">印度占星僅供文化理解與自我探索參考。前世業力並非已證實的歷史事實，占星也不保證未來事件或取代醫療、法律、心理及財務專業建議。</p>
    </section>
  );
}
