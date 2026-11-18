import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const gods = [
  ['set', '賽特（Set）：荒漠風暴・混沌之力・生命主權重奪', '【 邊界建立・從「討好」回到「真實」｜10 分鐘深度引導 】 在古埃及神話中，賽特並非單純的破壞者，而是守護太陽船穿越黑夜的狂野戰神。當你長期習慣委屈求全、害怕衝突而失去自我時，這場 10 分鐘的荒漠風暴引導，將召喚賽特強悍而純粹的混沌之力。在聲頻與意象的震盪中，我們一起斬斷消耗你的能量糾纏，粉碎「過度討好」的虛假面具。這是一場神聖的邊界建立儀式，陪你在風暴中心站穩腳跟，無懼他人的眼光，霸氣重奪屬於自己的生命主權，活出最真實、無需妥協的靈魂姿態。'],
  ['osiris', '歐西里斯（Osiris）：靈魂重生', '【 冥界之王・心死道生與內在導師覺醒｜10 分鐘深度終章引導 】 作為掌管死後世界與重生的冥界之王，歐西里斯象徵著「唯有徹底放下舊我，才能迎來真正的復活」。如果你正經歷關係的結束、事業的轉折，或深陷低谷感到迷惘，這段 10 分鐘的終章引導將帶你走入神聖的幽冥聖殿。透過深沉的能量轉化，協助你哀悼並釋放不再服務於你的執念與創傷。在「心死道生」的靜謐時刻，你將與內在最高智慧導師連結，於靈魂的灰燼中孕育出嶄新且不可動搖的生命力量。'],
  ['isis', '艾西斯（Isis）：魔法奇蹟重生', '【 藍白魔法光流・細胞煉金・復活之力｜10 分鐘深度引導 】 偉大的魔法女神艾西斯，曾以無盡的愛與神聖咒語拼湊並復活了歐西里斯，她是宇宙間最溫柔卻最具穿透力的療癒之母。這場 10 分鐘的深度冥想，將引導璀璨的藍白魔法光流注入你的能量場，進行一場細膩的「細胞煉金」。當光流穿透身體的每一寸疲憊與印記，過往的匱乏與無力感將被溫柔改寫。無論你正渴望修復破碎的心，或為人生注入新的奇蹟，艾西斯都將以復活之力，喚醒你內在創造豐盛的魔法天賦。'],
  ['hathor', '哈索爾（Hathor）：心輪開啟・愛之淨化', '【 丹德拉神廟・神聖之鏡・天地普拉納｜10 分鐘深度引導 】 掌管愛、美、音樂與喜悅的女神哈索爾，守護著充滿療癒頻率的丹德拉神廟。在日常的防備與傷痛中，我們的心輪往往層層上鎖。這段 10 分鐘的冥想將帶你步入神廟聖殿，面對映照靈魂本質的「神聖之鏡」，並引導天地間純淨的普拉納（Prana）生命能量流經心輪。在女神溫柔的聲頻包裹下，所有自我批判與情感阻塞都將被愛之光融化，讓你重新學會無條件地接納自己，敞開懷抱迎接生命中所有的美好與滋養。'],
  ['horus', '荷魯斯（Horus）：天眼開啟・高空俯瞰・神聖王權', '【 眉心輪激活・老鷹視角・奪回生命主導權｜10 分鐘深度引導 】 擁有全視之眼的隼頭神荷魯斯，代表著絕對的清明、洞察力與天命王權。當你深陷眼前的混亂局勢、被情緒蒙蔽而看不清方向時，這場 10 分鐘的引導將聚焦於激活你的眉心輪。跟隨荷魯斯的振翅，你的意識將抽離地面上的紛擾，切換至萬尺高空的「老鷹視角」。在極致的清晰與冷靜中，所有迷霧瞬間消散，你將一眼看穿問題的核心與因果脈絡，重新加冕內在的神聖王權，篤定地奪回人生主導權。'],
  ['sekhmet', '塞赫邁特（Sekhmet）：神聖之火・淨化恐懼・建立界線', '【 獅首之怒・埃及光權靈氣・深層陰影釋放｜10 分鐘深度引導 】 獅首戰神塞赫邁特是太陽神拉的烈焰之眼，她擁有焚盡一切邪惡與恐懼的強大破壞力，同時也是帶來極致重生的療癒者。當你內心積壓著難以言說的委屈、深層恐懼或無力感時，這場 10 分鐘的冥想將引入埃及光權靈氣的金色烈焰。獅首之怒並非失控，而是精準燒毀負面能量索與深層陰影的「神聖之火」。在這場高頻淨化中，恐懼將化為灰燼，為你鍛造出堅不可摧的能量界線與無畏勇氣。'],
  ['ra', '拉（Ra）：太陽神經叢・內在之光', '【 太陽神經叢激活・神聖意志點燃・智能無限靜默｜10 分鐘深度引導 】 身為創造萬物的太陽神，拉代表著生命最原始的熱力、自信與神聖意志。如果你常感到能量低落、自我懷疑，或缺乏採取行動的動力，這段 10 分鐘的引導將直接為你的「太陽神經叢」充電。透過觀想金色烈陽在腹部中心升起，我們點燃你內在沉睡的意志之火，驅散猶豫與陰霾。最終，在光輝的最中心進入「智能無限的靜默」，讓你同時擁有如太陽般耀眼的行動力，以及如宇宙中心般穩固的內在定力。'],
  ['maat', "瑪特（Ma'at）：內在秩序・心輪減負", '【 天平羽毛・42律・神聖中立觀察者｜10 分鐘深度引導 】 手持真理之羽的瑪特女神，掌管著宇宙的法則、正義與和諧秩序。現代人的焦慮往往源於「背負了太多不屬於自己的責任與情緒重量」。這場 10 分鐘的冥想，將帶你來到瑪特的真理之秤前，以 42 律的純粹智慧檢視內在狀態，為過載的心輪徹底減負。你將練習成為一名「神聖中立觀察者」，不評判、不捲入外在的混亂，讓心靈的重量變得比羽毛還要輕盈，在平靜與秩序中找回身心的完美平衡。'],
  ['thoth', '托特（Thoth）：翡翠石板・阿卡西紀錄・神聖幾何', '【 眉心輪喉輪雙啟・宇宙書記官・真理之殿｜10 分鐘深度引導 】 朱鷺頭身的智慧之神托特，是掌管魔法、文字、宇宙法則與阿卡西紀錄的書記官。當你渴望獲得靈感啟發、釐清靈魂藍圖，或希望更清晰地表達內在真理時，這場 10 分鐘的引導將帶你走入托特的「真理之殿」。在神聖幾何的頻率共振與翡翠石板的古老智慧中，我們同步開啟你的眉心輪與喉輪。你將學會接收來自高維度的清晰洞見，並擁有將靈感轉化為現實創造力與精準表達的智慧。'],
  ['anubis', '阿努比斯（Anubis）：靈魂審判・陰影整合・煉金轉化', '【 心靈法庭・天平稱量・從陰影中提煉黃金｜10 分鐘深度引導 】 胡狼頭身的引魂者阿努比斯，是穿梭於光明與黑暗邊界的守護神，他不帶批判地陪伴每一個靈魂面對真實的自己。這場 10 分鐘的深度引導，將帶你走入神聖的「心靈法庭」，溫柔地檢視那些你平時逃避、壓抑的內在陰影與羞愧感。在阿努比斯沉穩而慈悲的守護下，天平稱量的不是罪過，而是靈魂的真實重量。你將學會接納並整合自己的黑暗面，完成一場深刻的「陰影煉金」，從最深的痛點中提煉出屬於你的生命黃金。'],
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
  useEffect(() => {
    if (english) return;
    const syncCards = () => {
      document.querySelectorAll<HTMLElement>('[data-meditation-page] section.mt-14 > div.mt-6.grid > div').forEach((card) => {
        const heading = card.querySelector('h3')?.textContent?.trim() ?? '';
        const deityName = heading.split(/\s|（/)[0];
        const match = gods.find(([, title]) => deityName && title.includes(deityName));
        if (!match) return;
        card.tabIndex = 0;
        const description = card.querySelector('p');
        if (description && description.textContent !== match[2]) description.textContent = match[2];
      });
    };
    syncCards();
    const observer = new MutationObserver(syncCards);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [english]);
  if (english) return <><style>{`[data-meditation-page] section.mt-14 > div.mt-6.grid > div { max-height: 5.5rem; overflow: hidden; transition: max-height .3s ease, border-color .3s ease, box-shadow .3s ease; } [data-meditation-page] section.mt-14 > div.mt-6.grid > div:hover, [data-meditation-page] section.mt-14 > div.mt-6.grid > div:focus-within { max-height: 40rem; border-color: rgba(201,167,91,.6); box-shadow: 0 8px 24px rgba(201,167,91,.14); outline: 2px solid rgba(240,216,140,.8); outline-offset: 3px; }`}</style><section className="mx-auto max-w-4xl space-y-6 bg-[#071323] px-5 pb-16 text-[#e9dfc9]" aria-label="Egyptian Gods meditation guide">
    <h2 className="font-serif text-2xl text-[#fff8e8]">What is Egyptian Gods Guided Meditation?</h2>
    <p>Explore guided audio inspired by ancient Egyptian symbols as a gentle practice for stillness and self-reflection.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">Free preview</h2><p>Three currently published tracks are available as free previews. Full access follows the existing member and purchase rules.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">How to begin</h2><p>Choose a quiet place, use comfortable headphones, and listen at your own pace.</p>
    <h2 className="font-serif text-2xl text-[#fff8e8]">FAQ</h2><details><summary>Can beginners join?</summary><p className="mt-2">Yes. The free previews are suitable for people starting a meditation practice.</p></details>
  </section></>;
  return <><style>{`[data-meditation-page] section.mt-14 > div.mt-6.grid > div { max-height: 5.5rem; overflow: hidden; transition: max-height .3s ease, border-color .3s ease, box-shadow .3s ease; } [data-meditation-page] section.mt-14 > div.mt-6.grid > div:hover, [data-meditation-page] section.mt-14 > div.mt-6.grid > div:focus-within { max-height: 40rem; border-color: rgba(201,167,91,.6); box-shadow: 0 8px 24px rgba(201,167,91,.14); outline: 2px solid rgba(240,216,140,.8); outline-offset: 3px; }`}</style><section className="mx-auto max-w-4xl space-y-6 bg-[#071323] px-5 pb-16 text-[#e9dfc9]" aria-label="埃及十神冥想 SEO 介紹">
    <h2 className="font-serif text-2xl text-[#fff8e8]">認識埃及十神：神祇象徵與冥想引導</h2><p>每個主題以古埃及神祇象徵為入口，保留原有冥想意象與 10 分鐘引導說明，內容用於靈性觀想與自我探索。</p>
    <nav aria-label="埃及十神導覽" className="flex flex-wrap gap-3 text-sm">{gods.map(([id, title]) => <a key={id} href={`#${id}`} className="text-[#f2c96d] underline">{title.split('｜')[0]}</a>)}</nav>
    <div className="space-y-5">{gods.map(([id, title, text]) => <article id={id} key={id} className="scroll-mt-20 border-b border-[#c9a75b]/30 pb-5"><h3 className="font-serif text-xl text-[#fff8e8]">{title}</h3><p>{text}</p></article>)}</div>
    <h2 className="font-serif text-2xl text-[#fff8e8]">常見問題 FAQ</h2>
    {faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p className="mt-2">{answer}</p></details>)}
  </section></>;
}
