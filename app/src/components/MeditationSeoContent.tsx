import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const gods = [
  ['set', '賽特（Set）：荒漠風暴・混沌之力・生命主權重奪', '【邊界建立・從「討好」回到「真實」｜10 分鐘深度引導】在古埃及神話中，賽特並非單純的破壞者，而是守護太陽船穿越黑夜的狂野戰神。當你長期委屈求全、害怕衝突而失去自我時，這場荒漠風暴引導將召喚賽特的混沌之力，斬斷消耗你的能量糾纏，粉碎過度討好的面具。陪你在風暴中心站穩腳跟，重奪屬於自己的生命主權。'],
  ['osiris', '歐西里斯（Osiris）：靈魂重生', '【冥界之王・心死道生與內在導師覺醒｜10 分鐘深度終章引導】作為掌管死後世界與重生的冥界之王，歐西里斯象徵唯有放下舊我才能迎來復活。這段終章引導帶你走入幽冥聖殿，哀悼並釋放不再服務於你的執念，在靈魂灰燼中孕育嶄新的生命力量。'],
  ['isis', '艾西斯（Isis）：魔法奇蹟重生', '【藍白魔法光流・細胞煉金・復活之力｜10 分鐘深度引導】魔法女神艾西斯以愛與神聖咒語復活歐西里斯。藍白光流觀想陪你整理疲憊與匱乏感，為破碎的心注入新的創造力與希望。'],
  ['hathor', '哈索爾（Hathor）：心輪開啟・愛之淨化', '愛、美與喜悅女神守護丹德拉神廟。10 分鐘心輪引導以神聖之鏡與普拉納意象，陪你融化自我批判，重新接納自己。'],
  ['horus', '荷魯斯（Horus）：天眼開啟・高空俯瞰・神聖王權', '隼頭神代表清明與洞察。10 分鐘眉心輪引導帶你切換老鷹視角，穿過混亂看見核心，找回內在的神聖王權。'],
  ['sekhmet', '塞赫邁特（Sekhmet）：神聖之火・淨化恐懼・建立界線', '拉的烈焰之眼象徵精準的神聖之火。10 分鐘金色火焰引導陪你看見恐懼與委屈，釋放陰影並鍛造穩定界線。'],
  ['ra', '拉（Ra）：太陽神經叢・內在之光', '太陽神代表生命熱力、自信與意志。10 分鐘觀想金色烈陽在腹部升起，驅散猶豫，點燃行動力與穩固定力。'],
  ['maat', "瑪特（Ma'at）：內在秩序・心輪減負", '真理之羽女神象徵法則與和諧。10 分鐘天平羽毛引導陪你成為中立觀察者，放下不屬於自己的責任，在秩序中找回平衡。'],
  ['thoth', '托特（Thoth）：翡翠石板・阿卡西紀錄・神聖幾何', '智慧之神托特掌管文字與宇宙法則。10 分鐘真理之殿引導同步眉心輪與喉輪，讓靈感、理解與表達逐漸清晰。'],
  ['anubis', '阿努比斯（Anubis）：靈魂審判・陰影整合・煉金轉化', '引魂者阿努比斯不帶批判地守護過渡。10 分鐘心靈法庭引導，以天平觀想接納陰影，從生命痛點中提煉新的理解。'],
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
        const match = gods.find(([, title]) => heading && title.includes(heading.slice(0, 2)));
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
