import { useLocation } from 'react-router-dom';

export default function MeditationSeoContent() {
  const english = useLocation().pathname.startsWith('/en/');
  if (english) return <section className="mx-auto max-w-4xl space-y-6 bg-[#071323] px-5 pb-16 text-[#e9dfc9]" aria-label="Egyptian Gods meditation guide">
    <h2 className="font-serif text-2xl text-[#fff8e8]">What is Egyptian Gods Guided Meditation?</h2>
    <p>Explore guided audio inspired by ancient Egyptian symbols as a gentle practice for stillness and self-reflection.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">Free preview</h2><p>Three currently published tracks are available as free previews. Full access follows the existing member and purchase rules.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">How to begin</h2><p>Choose a quiet place, use comfortable headphones, and listen at your own pace.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">FAQ</h2><details><summary>Can beginners join?</summary><p className="mt-2">Yes. The free previews are suitable for people starting a meditation practice.</p></details>
  </section>;
  return <section className="mx-auto max-w-4xl space-y-6 bg-[#071323] px-5 pb-16 text-[#e9dfc9]" aria-label="埃及十神冥想 SEO 介紹">
    <h2 className="font-serif text-2xl text-[#fff8e8]">什麼是埃及十神冥想？</h2><p>這是一套以埃及神祇象徵為靈感的引導式冥想，透過聲音、呼吸與意象，陪你安靜觀察內在感受。</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">埃及神祇冥想可以帶來哪些內在探索？</h2><p>每個主題提供不同的象徵入口，適合整理情緒、覺察生活節奏與思考下一步；內容用於自我探索，不宣稱治療效果。</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">免費試聽｜開始你的冥想旅程</h2><p>目前提供三個已發布的免費試聽音頻，無須登入即可開始播放；完整課程依現有會員與授權規則提供。</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">認識埃及十神與各自的象徵力量</h2><p>付費套裝區列出目前資料庫中的十個主題名稱與介紹，讓你先了解課程範圍，再決定是否購買。</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">如何開始引導式冥想？</h2><p>請選擇安靜環境，依自己的節奏聆聽；使用耳機、保持舒適坐姿，並在需要時暫停休息。</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">常見問題 FAQ</h2>
    {[
      ['埃及十神冥想是什麼？', '它是以埃及神祇象徵為靈感的聲音引導式自我探索課程。'],
      ['沒有冥想經驗也可以參加嗎？', '可以，免費試聽適合初學者依自己的步調開始。'],
      ['埃及十神冥想有免費試聽嗎？', '目前頁面提供三個已發布的免費試聽音頻。'],
      ['每次冥想需要準備什麼？', '準備安靜環境與舒適耳機，依身體狀態安排聆聽時間。'],
      ['購買後如何收聽完整課程？', '登入並完成既有付款流程後，依授權狀態在冥想頁面收聽完整十個音頻。'],
    ].map(([question, answer]) => <details key={question}><summary>{question}</summary><p className="mt-2">{answer}</p></details>)}
  </section>;
}
