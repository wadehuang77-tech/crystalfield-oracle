const faqs = [
  ['人類圖是什麼？', '人類圖是一套用於自我觀察的系統，可以從出生資料產生個人能量圖，探索能量類型、策略、內在權威、人生角色、定義與能量中心。'],
  ['人類圖怎麼計算？', '系統會依照出生年月日、時間與出生城市建立人類圖，並產生入口頁可查看的能量藍圖與後續報告內容。'],
  ['計算人類圖需要哪些出生資料？', '需要出生年月日、儘量準確的出生時間，以及出生城市或地點。出生時間可能影響計算結果。'],
  ['不知道準確出生時間怎麼辦？', '可以嘗試查閱出生證明或戶籍資料；不應自行捏造時間，也不應把估計時間產生的結果當成完全準確。'],
  ['人類圖有哪5種能量類型？', '包括生產者、顯示生產者、投射者、顯示者與反映者。'],
  ['人類圖的策略是什麼？', '策略是減少阻力的觀察方向，不是強迫自己遵守的規定；不同能量類型會有不同的策略重點。'],
  ['什麼是內在權威？', '內在權威用來觀察適合自己的決策過程。本系統實際支援情緒、薦骨、脾臟、意志力、自我投射與月亮週期等類型。'],
  ['什麼是人生角色？', '人生角色由兩條線組合，例如 1/3、2/4、4/6，反映學習方式、關係互動與人生經驗。'],
  ['人類圖結果會隨著時間改變嗎？', '出生資料產生的基本圖表不會因時間改變；你對圖表的理解與生活實驗觀察，會隨經驗累積而深化。'],
  ['人類圖分析可以代替醫療或心理諮詢嗎？', '不可以。人類圖適合自我覺察與生活實驗，醫療或心理問題請尋求合格專業人士協助。'],
  ['晶域心語的人類圖有哪些內容可以免費查看？', '目前入口會先建立人類圖並提供免費報告入口；完整內容與其他功能依網站現有解鎖與會員設定顯示，並非所有報告內容都保證免費。'],
  ['我的出生資料會公開嗎？', '出生資料不會放入公開 SEO 內容或 Sitemap；實際保存與分享依網站登入、授權及隱私政策機制處理。'],
];

export const HUMAN_DESIGN_FAQS = faqs;

export default function HumanDesignSeoContent() {
  return <section className="relative mt-12 w-full max-w-3xl space-y-10 text-left text-white/75">
    <div><h2 className="mb-3 text-2xl font-semibold text-white">什麼是人類圖？</h2><p className="leading-8">人類圖是一套用於自我觀察的系統，可以從出生資料產生個人能量圖，並從能量類型、策略、內在權威、人生角色、定義及能量中心等方向進行探索。它適合作為自我探索、生活實驗與覺察工具，不宣稱能決定命運，也不取代醫療或其他專業諮詢。</p></div>
    <div><h2 className="mb-3 text-2xl font-semibold text-white">人類圖計算需要哪些資料？</h2><p className="leading-8">需要出生年月日、儘量準確的出生時間，以及出生城市或地點。出生時間可能影響計算結果；如果不確定，可以查閱出生證明或戶籍資料，不應讓系統假裝估計結果完全準確，也不要自行捏造出生時間。</p></div>
    <div><h2 className="mb-4 text-2xl font-semibold text-white">人類圖的5種能量類型</h2><div className="space-y-4">{[
      ['生產者 Generator', '生產者通常以持續的生命力與回應作為觀察起點。當身體對外界的人事物有真實回應，投入過程可能帶來滿足感；策略重點是等待回應。'],
      ['顯示生產者 Manifesting Generator', '顯示生產者常有多元興趣與較快的行動節奏，適合先回應，再依身體與現況行動，過程中允許探索與修正。'],
      ['投射者 Projector', '投射者的觀察重點在洞察、引導與能量使用的節奏。被看見與認可時，分享觀點較容易形成交流；重要方向可練習等待正確邀請。'],
      ['顯示者 Manifestor', '顯示者常帶有啟動與開創的行動力，適合觀察如何發起事情。行動前告知相關的人，可以減少誤解與阻力。'],
      ['反映者 Reflector', '反映者對環境與群體氛圍較敏感，適合觀察不同環境中的身心感受。面對重要決定，可以給自己較完整的週期與時間。'],
    ].map(([title, text]) => <div key={title}><h3 className="text-lg font-semibold text-cyan-200">{title}</h3><p className="mt-1 leading-7">{text}</p></div>)}</div></div>
    <div><h2 className="mb-3 text-2xl font-semibold text-white">人類圖報告可以看到什麼？</h2><p className="leading-8">報告可能涉及能量類型、人生角色、人生策略、內在權威、定義、能量中心，以及天賦與優勢、關係與能量界線、職涯與生命方向和靈魂能量摘要。免費與付費內容依現有解鎖設定顯示，不代表整份報告全部免費。</p></div>
    <div><h2 className="mb-3 text-2xl font-semibold text-white">什麼是人類圖策略？</h2><p className="leading-8">策略是減少阻力的觀察方向，不是強迫使用者遵守的規定。生產者與顯示生產者觀察等待回應；投射者等待正確邀請；顯示者行動前告知；反映者觀察環境並給自己足夠時間。</p></div>
    <div><h2 className="mb-3 text-2xl font-semibold text-white">什麼是內在權威？</h2><p className="leading-8">本系統實際支援情緒、薦骨、脾臟、意志力、自我投射與月亮週期等權威類型，實際結果會依計算出的圖表顯示。</p></div>
    <div><h2 className="mb-3 text-2xl font-semibold text-white">什麼是人生角色？</h2><p className="leading-8">人生角色由兩條線組合，例如 1/3、2/4、4/6，反映學習方式、關係互動及人生經驗，實際角色以計算結果為準。</p></div>
    <div><h2 className="mb-3 text-2xl font-semibold text-white">為什麼選擇晶域心語人類圖？</h2><p className="leading-8">晶域心語由韋德老師建立。韋德老師擁有十年以上塔羅、水晶療癒及命理實務經驗，是水晶療癒老師與身心靈系統設計者，整合人類圖、生命靈數、塔羅、印度占星與水晶能量。</p></div>
    <div><h2 className="mb-4 text-2xl font-semibold text-white">人類圖常見問題</h2><div className="space-y-3">{faqs.map(([question, answer]) => <details key={question} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"><summary className="cursor-pointer font-semibold text-cyan-100">{question}</summary><p className="mt-2 leading-7">{answer}</p></details>)}</div></div>
    <nav className="border-t border-white/10 pt-5 text-sm" aria-label="人類圖延伸閱讀">
      <h2 className="mb-3 text-2xl font-semibold text-white">人類圖延伸閱讀</h2>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {[
          ['五大能量類型', '/human-design/types'],
          ['生產者 Generator', '/human-design/generator'],
          ['顯示生產者', '/human-design/manifesting-generator'],
          ['投射者 Projector', '/human-design/projector'],
          ['顯示者 Manifestor', '/human-design/manifestor'],
          ['反映者 Reflector', '/human-design/reflector'],
          ['內在權威', '/human-design/authority'],
          ['人生角色 Profile', '/human-design/profile'],
          ['出生時間與計算', '/human-design/birth-time'],
        ].map(([label, href]) => <a key={href} className="text-cyan-300 underline" href={href}>{label}</a>)}
      </div>
    </nav>
    <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-sm"><a className="text-cyan-300 underline" href="/numerology">查看生命靈數分析</a><a className="text-cyan-300 underline" href="/vedic-astrology">探索印度占星</a><a className="text-cyan-300 underline" href="/oracle">體驗塔羅與神諭卡</a></nav>
  </section>;
}
