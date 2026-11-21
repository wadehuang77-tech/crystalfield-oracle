import { useState } from 'react';

const stories = [
  ['哈索爾 Hathor｜讓喜悅回來', '在一則傳說中，太陽神拉鬱鬱寡歡，哈索爾逗得他笑了，讓他重新回到眾神之中。冥想時可以回想，最近有哪一件小事曾讓你真心笑出來。'],
  ['艾希斯 Isis｜在失去之後重新凝聚', '奧西里斯遇害後，艾希斯四處尋找他的遺體，並以魔法為他恢復一線生機。冥想時可以問自己，此刻有哪一部分需要被多照顧一點。'],
  ['阿努比斯 Anubis｜陪你走過未知', '在古埃及的亡者審判圖像中，胡狼頭的阿努比斯在天秤旁檢視秤量。冥想可以借用天秤的畫面，回想一段轉變裡，有什麼值得帶走。'],
  ['賽特 Set｜為自己守住界線', '在一些古埃及傳統中，風暴之神賽特站在太陽船上，抵擋攔路的巨蛇阿波菲斯。冥想時可以想一想，在一段讓你經常委屈自己的關係裡，有哪一道界線值得守住。'],
  ['奧西里斯 Osiris｜在結束之後重新開始', '奧西里斯遭賽特殺害，後來在艾希斯的協助下重獲生機，成為冥界的統治者。可以從他的故事出發，靜靜整理自己正在告別的一段經歷。'],
  ['荷魯斯 Horus｜受傷之後，重新看見方向', '荷魯斯與賽特爭奪王位時，一隻眼睛受傷，後來得以復原。冥想時可以問自己，經歷挫折之後，現在看得清楚的下一步是什麼。'],
  ['托特 Thoth｜聽見自己真正想說的話', '在亡者的心臟接受秤量時，掌管書寫的托特在一旁記下結果。冥想時可以借用他落筆前的片刻安靜，把紛亂的想法整理成一句話。'],
  ['拉 Ra｜在黑夜裡等待天亮', '太陽神拉白天乘船穿越天空，夜裡行經冥界，清晨再度升起。冥想時可以想像這段旅程，在還看不見方向時，先跟著呼吸安靜地待一會兒。'],
  ['巴斯特 Bastet｜安穩地待在自己的空間', '古埃及人以貓的形象敬奉巴斯特，並曾在布巴斯提斯為她舉行盛大的節慶。冥想時可以想像一隻貓安靜休息的樣子，留意什麼會讓自己感到自在。'],
  ['塞赫麥特 Sekhmet｜讓怒氣慢慢平息', '有一則傳說說，獅首女神的怒火席捲人間，眾神用染紅的啤酒讓她停下，怒火才漸漸平息。冥想時可以先察覺身體哪裡繃緊，等情緒降下來，再想下一步。'],
] as const;

const faqs = [
  ['什麼是埃及十神冥想？', '這是一系列以古埃及神話為靈感的中文引導音頻。每一篇用不同的神祇與故事，搭配語音、呼吸和想像畫面，陪你留一段時間給自己。'],
  ['哪些人適合做埃及十神冥想？', '適合想在忙碌後安靜一下、練習覺察情緒，或對古埃及神話有興趣的人。第一次接觸冥想，也可以跟著語音從哈索爾女神篇開始。'],
  ['第一次做引導冥想，要怎麼開始？', '找個安靜的地方坐穩，把音量調到舒服的程度。可以閉眼，也可以放鬆視線。跟著語音慢慢呼吸，分心時再回到呼吸或引導聲音。'],
  ['冥想時一定要看見神殿或女神的畫面嗎？', '每個人感受意象的方式不同。如果腦中沒有畫面，可以聽著聲音，留意呼吸、肩膀的鬆緊或雙腳接觸地面的感覺。'],
  ['哈索爾女神冥想可以免費完整試聽嗎？', '請到上方免費試聽區選擇哈索爾女神冥想；實際可播放範圍依頁面目前公開設定。'],
  ['什麼時候適合聽引導冥想？', '下班後、睡前，或任何有空安靜坐下來的時段都可以。第一次可以挑一段不用趕時間的空檔。'],
  ['第一次需要一次聽完整篇嗎？', '可以先聽幾分鐘，感受語音的速度和主題。想繼續就聽完，也可以下次再從頭開始。'],
  ['要準備水晶、蠟燭或香嗎？', '找個安靜的位置，準備能播放音頻的裝置就可以開始。有喜歡的水晶，也可以放在身旁，提醒自己慢下來。'],
  ['聽引導冥想一定要戴耳機嗎？', '耳機和手機喇叭都可以。想聽清楚語音細節時，可以戴耳機，把音量調到舒服的程度。'],
  ['冥想時可以躺著嗎？', '可以。想放鬆時可以躺著聽；想保持清醒、跟上語音，可以坐在有靠背的椅子上，讓雙腳自然踩地。'],
  ['冥想時一直有念頭，怎麼辦？', '發現自己走神時，聽聽下一句引導，或感受一次吸氣與吐氣。每次把注意力帶回來，都是練習的一部分。'],
  ['埃及十神冥想有固定的聆聽順序嗎？', '可以依當下最有共鳴的主題選擇；發布順序與可用音頻以頁面目前設定為準。'],
  ['同一篇冥想可以重複聽嗎？', '可以。第一次先熟悉引導，下次再留意哪一句話、哪個畫面，或哪種身體感受讓你印象最深。'],
  ['冥想結束後，可以做什麼？', '先動一動手指和腳趾，慢慢睜開眼睛。也可以寫下一句：「此刻，我最想怎麼照顧自己？」'],
  ['可以一邊開車一邊聽嗎？', '請在停好車、能安全休息時再播放，留到能專心聆聽時再做。'],
  ['免費試聽和付費系列有什麼差別？', '免費試聽可以先體驗語音引導的方式與節奏；完整系列的篇章數量、價格與解鎖方式依頁面目前設定。'],
] as const;

export default function MeditationStoriesFaq() {
  const [openStory, setOpenStory] = useState<number | null>(null);
  return <>
    <section className="mt-10 rounded-3xl border border-[#c9a75b]/30 bg-[#111323] p-5 sm:p-8" aria-labelledby="meditation-stories-title">
      <h2 id="meditation-stories-title" className="font-serif text-2xl text-[#fff8e8]">埃及十神的故事｜認識冥想中的神祇</h2>
      <p className="mt-3 leading-7 text-[#d8d1c4]">從古埃及的神話故事出發，選一個你此刻有共鳴的主題，開始冥想。</p>
      <div className="mt-5 space-y-2">{stories.map(([title, text], i) => <details key={title} open={openStory === i} onToggle={e => setOpenStory(e.currentTarget.open ? i : null)} className="rounded-xl border border-[#c9a75b]/20 bg-[#0d1b2d]">
        <summary className="cursor-pointer px-4 py-3 font-semibold text-[#fff8e8]">{title}</summary><p className="border-t border-[#c9a75b]/15 px-4 py-3 leading-7 text-[#d8d1c4]">{text}</p>
      </details>)}</div>
    </section>
    <section className="mt-10 rounded-3xl border border-[#c9a75b]/30 bg-[#111323] p-5 sm:p-8" aria-labelledby="meditation-faq-title">
      <h2 id="meditation-faq-title" className="font-serif text-2xl text-[#fff8e8]">埃及十神冥想常見問題</h2>
      <div className="mt-5 space-y-2">{faqs.map(([question, answer], i) => <details key={question} open={i === 0} className="rounded-xl border border-[#c9a75b]/20 bg-[#0d1b2d]"><summary className="cursor-pointer px-4 py-3 font-semibold text-[#fff8e8]">{question}</summary><p className="border-t border-[#c9a75b]/15 px-4 py-3 leading-7 text-[#d8d1c4]">{answer}</p></details>)}</div>
    </section>
  </>;
}
