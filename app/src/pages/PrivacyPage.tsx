import { Link } from 'react-router-dom';

const sections = [
  {
    title: '一、我們蒐集的資料',
    paragraphs: [
      '當你使用晶域心語時，我們可能依你使用的功能蒐集帳戶資料（例如 Email）、你主動提供的占卜問題與選項、生命靈數、人類圖或印度占星計算所需的出生資料，以及訂單編號、商品、金額與付款狀態等交易紀錄。',
      '當你選擇使用 Google 帳戶登入時，我們會接收 Google 提供的唯一帳戶識別碼及已驗證的 Email，以建立或辨識你的晶域心語帳戶。我們不會取得或儲存你的 Google 密碼。',
      '網站也可能自動記錄瀏覽器類型、裝置資訊、頁面瀏覽、功能互動、Cookie、匿名訪客識別碼與概略連線資訊，以維持登入狀態、防止濫用並改善服務。',
    ],
  },
  {
    title: '二、資料使用目的',
    paragraphs: [
      '我們使用上述資料來提供帳戶登入、占卜與個人化解析、免費次數與會員權益管理、付款與訂單處理、客服回覆、安全防護、錯誤排查、服務品質分析及法令遵循。',
      '你提供的問題或出生資料，僅會在提供相應占卜、生命靈數、人類圖或印度占星服務所需的範圍內使用，不會作為公開內容；若你主動使用社群分享功能，公開頁面只會顯示經整理的摘要，不會公開完整付費報告或個人敏感資料。',
    ],
  },
  {
    title: '三、Google 使用者資料',
    paragraphs: [
      'Google 登入資料僅用於驗證身分、建立帳戶及維持登入狀態。我們不會將 Google 使用者資料出售，也不會用於與登入及帳戶服務無關的廣告用途。',
      '晶域心語對 Google API 所取得資訊的使用及傳輸，將遵守 Google API Services User Data Policy（包括 Limited Use 要求）。',
    ],
  },
  {
    title: '四、第三方服務',
    paragraphs: [
      '為提供網站功能，我們可能使用 Cloudflare 提供網站託管、資料庫與安全服務；Google Identity Services 提供 Google 登入；Google Analytics 4 與 Meta Pixel 協助分析網站使用情形；綠界科技處理付款；Resend 傳送必要郵件；VedAstro 依使用者明確同意處理出生日期、時間與地點以計算印度占星星盤；以及 AI 服務供應商根據去識別化的衍生星盤產生使用者要求的個人化解析。',
      '印度占星計算完成後，晶域心語只保存上升、行星星座、月宿與行星週期等衍生星盤，以及付款授權所需的關聯資料；不在印度占星資料表保存使用者輸入的原始出生日期、出生時間或出生地點文字。',
      '第三方服務會依其隱私權政策處理必要資料。付款卡號等敏感金流資料由金流服務商處理，晶域心語不會直接儲存完整信用卡資料。',
    ],
  },
  {
    title: '五、Cookie 與分析工具',
    paragraphs: [
      '我們使用必要 Cookie 維持登入、安全驗證與服務狀態，也使用分析及廣告衡量工具了解頁面瀏覽與功能使用情況。分析事件不應包含姓名、Email、完整生日、完整問題、完整解讀或付款資料。你可透過瀏覽器設定限制 Cookie，但部分登入或會員功能可能因此無法正常運作。',
    ],
  },
  {
    title: '六、資料保存與安全',
    paragraphs: [
      '我們只在提供服務、履行交易與法定義務、處理爭議及維護安全所需期間保存資料，並採取合理的技術與管理措施降低未授權存取、竄改、遺失或洩漏風險。網路傳輸與儲存無法保證絕對安全，但我們會持續改善保護措施。',
    ],
  },
  {
    title: '七、你的權利',
    paragraphs: [
      '你可聯絡我們要求查詢、更正或刪除帳戶與相關個人資料，或撤回先前同意。部分訂單、付款或安全紀錄可能因法律與營運需要保留至必要期限。若你不再希望使用 Google 登入，也可在 Google 帳戶的第三方連結設定中撤銷存取權。',
    ],
  },
  {
    title: '八、未成年人',
    paragraphs: [
      '本服務不是專為未滿法定年齡的兒童設計。未成年人應在法定代理人同意與陪同下使用本服務及進行付款。',
    ],
  },
  {
    title: '九、政策更新與聯絡方式',
    paragraphs: [
      '我們可能因服務、法令或第三方工具調整而更新本政策，更新後會在本頁公布並標示更新日期。若你對隱私權政策、Google 登入資料或資料刪除有任何疑問，請透過下方 Email 與我們聯絡。',
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070416] via-[#100723] to-[#060310] px-5 py-12 text-slate-100 sm:px-8 sm:py-16">
      <article className="mx-auto max-w-4xl rounded-3xl border border-purple-400/20 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(88,28,135,0.22)] backdrop-blur-sm sm:p-10">
        <p className="text-center text-xs font-medium uppercase tracking-[0.35em] text-amber-200/70">Crystal Field 101</p>
        <h1 className="mt-4 text-center font-serif text-3xl font-bold tracking-[0.12em] text-white sm:text-5xl">晶域心語隱私權政策</h1>
        <p className="mt-5 text-center text-sm leading-7 text-purple-100/65">最後更新日期：2026 年 8 月 23 日</p>

        <div className="mt-10 space-y-9">
          <section>
            <p className="leading-8 text-slate-200/85">
              晶域心語重視你的隱私。本政策說明我們在你使用網站、Google 帳戶登入、塔羅占卜、生命靈數、人類圖、印度占星、會員與付款服務時，如何蒐集、使用、保存及保護資料。
            </p>
          </section>

          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-serif text-xl font-semibold tracking-wide text-amber-100 sm:text-2xl">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="leading-8 text-slate-300/85">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-5 text-center">
          <p className="text-sm text-cyan-100/75">隱私權與資料相關聯絡信箱</p>
          <a className="mt-2 inline-block text-cyan-200 underline decoration-cyan-400/40 underline-offset-4 hover:text-white" href="mailto:wadehuang77@gmail.com">
            wadehuang77@gmail.com
          </a>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex rounded-full border border-purple-300/25 px-6 py-3 text-sm text-purple-100 transition hover:border-purple-200/50 hover:bg-purple-400/10">
            返回晶域心語首頁
          </Link>
        </div>
      </article>
    </main>
  );
}
