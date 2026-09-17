import { Link } from 'react-router-dom';

const faq = [
  ['印度占星是什麼？', '印度占星也常稱為吠陀占星或 Vedic Astrology，是以出生日期、時間與地點建立星盤，整理生命週期與自我探索方向的文化性占星系統。'],
  ['印度占星和西洋占星有什麼不同？', '兩者使用的黃道系統、星座位置與判讀方法可能不同；印度占星通常也重視月宿、羅喉與計都、大運週期，以及 D9、D10 分盤。'],
  ['印度占星需要哪些出生資料？', '需要出生年月日、儘量準確的出生時間，以及出生城市或地點。出生時間可能影響上升、宮位與分盤。'],
  ['不知道準確出生時間可以計算嗎？', '可以先整理可確認的資料，但結果應保留不確定性；請查閱出生證明或戶籍資料，不要自行捏造出生時間。'],
  ['什麼是羅喉與計都？', '計都可作為熟悉模式與過去慣性的象徵，羅喉可作為今生成長方向的象徵；兩者需要放在完整星盤中一起觀察。'],
  ['什麼是印度占星大運？', '大運用來整理不同人生階段的主題，次週期提供更細的時間層次，仍需結合本命盤與當下行運，不代表事件必然發生。'],
  ['什麼是月宿 Nakshatra？', '月宿 Nakshatra 是將黃道細分後觀察月亮位置的系統，可作為理解情緒反應、傾向與生命節奏的參考。'],
  ['D9 九分盤可以看什麼？', 'D9 九分盤可用來觀察婚姻、承諾、價值與生命成熟度，但需要可靠出生時間，並與 D1 本命盤一起判讀。'],
  ['D10 十分盤可以看什麼？', 'D10 十分盤可用來觀察職涯、社會角色、責任與專業發展，不應脫離 D1 本命盤單獨下結論。'],
  ['印度占星可以看前世嗎？', '前世業力是占星象徵與自我探索的語言，不能當成已被證實的歷史事實。'],
  ['印度占星可以預測未來嗎？', '印度占星可用來整理週期與可能的主題，不能保證特定事件一定發生，也不取代現實判斷。'],
  ['晶域心語有哪些印度占星內容可以免費查看？', '入口會先建立星盤並提供免費指引；完整深度解析的內容範圍依網站現有解鎖設定顯示。'],
  ['我的出生資料會被公開嗎？', '出生資料不會放入公開 SEO 內容或 Sitemap；實際保存與分享依網站登入、授權及隱私政策機制處理。'],
  ['印度占星可以代替醫療、心理、法律或財務建議嗎？', '不可以。印度占星適合自我覺察與生命週期整理，相關專業問題請尋求合格專業人士協助。'],
] as const;

export default function VedicAstrologySeoContent() {
  const knowledgeLinks = [
    ['印度占星是什麼？', 'what-is-vedic-astrology'], ['印度占星與西洋占星', 'vedic-vs-western'], ['羅喉計都與前世業力', 'rahu-ketu'], ['印度占星大運', 'dasha'], ['月宿 Nakshatra', 'nakshatra'], ['D9 九分盤', 'd9-navamsa'], ['D10 十分盤', 'd10-dasamsa'], ['出生時間怎麼辦？', 'birth-time'], ['感情與婚姻', 'love-marriage'], ['事業與財富', 'career-wealth'],
  ];
  return (
    <section className="mx-auto mt-16 max-w-4xl space-y-12 text-violet-100/80" aria-labelledby="vedic-seo-heading">
      <div><h2 id="vedic-seo-heading" className="font-serif text-3xl text-amber-50">什麼是印度占星？</h2><p className="mt-4 leading-8">印度占星也常稱為吠陀占星或 Vedic Astrology，透過出生日期、時間與地點建立星盤。晶域心語以實際系統支援的恆星黃道與歲差設定，整理生命週期與自我觀察方向；它是文化性占星與自我探索工具，不是科學證實的預測，也不取代專業諮詢。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">印度占星和西洋占星有什麼不同？</h2><p className="mt-4 leading-8">兩者在黃道系統、星座位置與判讀方式上可能不同。印度占星常重視月亮與月宿 Nakshatra、羅喉與計都、大運週期，以及 D9 九分盤與 D10 十分盤；理解差異有助於選擇適合自己的觀察方法。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">計算印度占星需要哪些出生資料？</h2><p className="mt-4 leading-8">需要出生年月日、儘量準確的出生時間，以及出生城市或地點。出生時間可能影響上升、宮位與分盤；若時間不確定，請查閱出生證明或戶籍資料，不要讓系統假裝結果完全準確，也不應自行捏造時間。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">印度占星命盤可以看什麼？</h2><ul className="mt-4 grid gap-2 sm:grid-cols-2"><li>上升、太陽與月亮</li><li>行星星座與宮位</li><li>月宿 Nakshatra</li><li>羅喉與計都</li><li>大運與次週期</li><li>D1 本命盤、D9 九分盤、D10 十分盤</li></ul></div>
      <div><h2 className="font-serif text-3xl text-amber-50">9 大印度占星深度解析</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{['前世業力與今生課題','羅喉／計都靈魂軸線','愛情與婚姻','財富與金錢','天賦與事業方向','D9 婚姻／靈魂成熟度','D10 事業分盤','未來 3～5 年大運時間軸','生命使命與生活方向'].map((item) => <h3 key={item} className="rounded-xl border border-white/10 bg-white/5 p-4 text-lg text-amber-100">{item}</h3>)}</div></div>
      <div><h2 className="font-serif text-3xl text-amber-50">什麼是羅喉與計都？</h2><p className="mt-4 leading-8">計都可作為熟悉模式與過去慣性的象徵，羅喉可作為今生成長方向的象徵。兩者是星盤整體的一部分，不能只靠單一位置做出完整結論。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">什麼是印度占星大運？</h2><p className="mt-4 leading-8">大運用來整理不同人生階段的主題，次週期提供更細的時間層次，仍需結合本命盤與當下行運。相同大運不代表每個人會發生相同事件，也不能保證特定年份一定結婚、離婚、發財或失業。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">什麼是 D9 九分盤與 D10 十分盤？</h2><p className="mt-4 leading-8">D9 九分盤可觀察婚姻、承諾、價值與生命成熟度；D10 十分盤可觀察職涯、社會角色、責任與專業發展。分盤需要可靠出生時間，並與 D1 本命盤一起判讀。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">為什麼選擇晶域心語印度占星？</h2><p className="mt-4 leading-8">晶域心語由韋德老師建立。韋德老師擁有十年以上塔羅、水晶療癒及命理實務經驗，是水晶療癒老師與身心靈系統設計者，整合印度占星、生命靈數、人類圖、塔羅與水晶能量，以生活化語言整理複雜星盤資訊。</p></div>
      <div><h2 className="font-serif text-3xl text-amber-50">印度占星知識專區</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{knowledgeLinks.map(([label, slug]) => <Link key={slug} className="rounded-xl border border-white/10 bg-white/5 p-4 text-amber-200 underline" to={`/vedic-astrology/${slug}`}>{label}</Link>)}</div></div>
      <div><h2 className="font-serif text-3xl text-amber-50">印度占星常見問題</h2><div className="mt-4 space-y-3">{faq.map(([question, answer]) => <details key={question} className="rounded-xl border border-white/10 bg-white/5 p-4"><summary className="cursor-pointer font-medium text-amber-100">{question}</summary><p className="mt-3 leading-7">{answer}</p></details>)}</div></div>
      <nav className="border-t border-white/10 pt-6 text-sm"><Link className="mr-5 text-amber-300 underline" to="/numerology">查看生命靈數分析</Link><Link className="mr-5 text-amber-300 underline" to="/human-design">免費計算人類圖</Link><Link className="text-amber-300 underline" to="/oracle">體驗塔羅與神諭卡</Link></nav>
    </section>
  );
}
