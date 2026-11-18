import { useLocation } from 'react-router-dom';

const gods = [
  ['set', '賽特 Set｜建立界線、重奪生命主權', '荒漠風暴與混沌象徵界線與勇氣，適合探索不再討好、重新拿回選擇權的課題。10 分鐘引導陪你從討好回到真實。'],
  ['osiris', '歐西里斯 Osiris｜靈魂重生、放下過去', '以死亡與重生的神話意象，陪你整理告別、轉化與重新開始。10 分鐘引導帶你安靜看見仍可放下的舊故事。'],
  ['isis', '艾西斯 Isis｜魔法奇蹟、愛與內在療癒', '艾西斯象徵愛、智慧與守護，適合探索溫柔照顧自己和修復關係的可能。10 分鐘引導以愛的意象支持內在安定。'],
  ['hathor', '哈索爾 Hathor｜心輪冥想、自我接納', '哈索爾連結喜悅、美與滋養，適合練習接納感受、放鬆防備。10 分鐘引導從心輪意象開始回到自己。'],
  ['horus', '荷魯斯 Horus｜荷魯斯之眼、直覺與洞察', '荷魯斯之眼象徵觀察與清晰，適合在資訊繁雜時整理注意力。10 分鐘引導邀請你辨識直覺與重要訊息。'],
  ['sekhmet', '塞赫邁特 Sekhmet｜神聖之火、恐懼轉化', '獅首女神的火焰象徵力量與淨化，適合覺察恐懼、憤怒與界線。10 分鐘引導讓情緒被看見。'],
  ['ra', '太陽神拉 Ra｜太陽神經叢、自信與意志', '拉代表光與生命力，適合探索自信、行動與意志的平衡。10 分鐘引導以太陽神經叢意象找回步調。'],
  ['maat', "瑪特 Ma'at｜真理之羽、內在平衡", '瑪特象徵真理、秩序與平衡，適合整理價值觀和選擇。10 分鐘引導以真理之羽觀想回到中心。'],
  ['thoth', '托特 Thoth｜智慧之神、神聖幾何', '托特連結文字、知識與神聖幾何，適合沉澱思緒與整合學習。10 分鐘引導讓理解慢慢成形。'],
  ['anubis', '阿努比斯 Anubis｜陰影整合、靈魂轉化', '阿努比斯守護過渡與靈魂旅程，適合面對未知、整理陰影與人生轉折。10 分鐘引導陪你走向新的理解。'],
] as const;
const faqs = [
  ['埃及十神冥想是什麼？', '這是一套以十位埃及神祇象徵為靈感的引導式冥想，透過聲音與意象進行自我探索。'],
  ['埃及十神分別象徵什麼力量？', '每位神祇代表不同的象徵入口，例如界線、重生、愛、洞察、平衡與轉化。'],
  ['埃及十神冥想適合初學者嗎？', '適合。每堂約 10 分鐘，可依自己的節奏聆聽。'],
  ['每堂冥想需要多少時間？', '每個主題目前以約 10 分鐘的引導式冥想為主，實際長度以播放器顯示為準。'],
  ['如何免費試聽埃及十神冥想？', '頁面上方提供目前已發布的三個免費試聽音頻。'],
  ['如何選擇適合自己的埃及神祇冥想？', '先閱讀象徵與內在課題，選擇當下最有共鳴的主題。'],
] as const;

export default function MeditationSeoContent() {
  const english = useLocation().pathname.startsWith('/en/');
  if (english) return <><style>{`[data-meditation-page] section.mt-14 > div.mt-6.grid > div { max-height: 5.5rem; overflow: hidden; transition: max-height .3s ease, border-color .3s ease, box-shadow .3s ease; } [data-meditation-page] section.mt-14 > div.mt-6.grid > div:hover, [data-meditation-page] section.mt-14 > div.mt-6.grid > div:focus-within { max-height: 12rem; border-color: rgba(201,167,91,.6); box-shadow: 0 8px 24px rgba(201,167,91,.14); }`}</style><section className="mx-auto max-w-4xl space-y-6 bg-[#071323] px-5 pb-16 text-[#e9dfc9]" aria-label="Egyptian Gods meditation guide">
    <h2 className="font-serif text-2xl text-[#fff8e8]">What is Egyptian Gods Guided Meditation?</h2>
    <p>Explore guided audio inspired by ancient Egyptian symbols as a gentle practice for stillness and self-reflection.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">Free preview</h2><p>Three currently published tracks are available as free previews. Full access follows the existing member and purchase rules.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">How to begin</h2><p>Choose a quiet place, use comfortable headphones, and listen at your own pace.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">FAQ</h2><details><summary>Can beginners join?</summary><p className="mt-2">Yes. The free previews are suitable for people starting a meditation practice.</p></details>
  </section></>;
  return <><style>{`[data-meditation-page] section.mt-14 > div.mt-6.grid > div { max-height: 5.5rem; overflow: hidden; transition: max-height .3s ease, border-color .3s ease, box-shadow .3s ease; } [data-meditation-page] section.mt-14 > div.mt-6.grid > div:hover, [data-meditation-page] section.mt-14 > div.mt-6.grid > div:focus-within { max-height: 12rem; border-color: rgba(201,167,91,.6); box-shadow: 0 8px 24px rgba(201,167,91,.14); }`}</style><section className="mx-auto max-w-4xl space-y-6 bg-[#071323] px-5 pb-16 text-[#e9dfc9]" aria-label="埃及十神冥想 SEO 介紹">
    <h2 className="font-serif text-2xl text-[#fff8e8]">認識埃及十神：神祇象徵與冥想引導</h2><p>每個主題以古埃及神祇象徵為入口，保留原有冥想意象與 10 分鐘引導說明，內容用於靈性觀想與自我探索。</p>
    <nav aria-label="埃及十神導覽" className="flex flex-wrap gap-3 text-sm">{gods.map(([id, title]) => <a key={id} href={`#${id}`} className="text-[#f2c96d] underline">{title.split('｜')[0]}</a>)}</nav>
    <div className="space-y-5">{gods.map(([id, title, text]) => <article id={id} key={id} className="scroll-mt-20 border-b border-[#c9a75b]/30 pb-5"><h3 className="font-serif text-xl text-[#fff8e8]">{title}</h3><p>{text}</p></article>)}</div>
    <h2 className="font-serif text-2xl text-[#fff8e8]">常見問題 FAQ</h2>
    {faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p className="mt-2">{answer}</p></details>)}
  </section></>;
}
