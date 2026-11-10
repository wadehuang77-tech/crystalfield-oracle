// Deterministic editorial copy: uses stored chart facts, never an AI provider.
const signs: Record<string, [string, string, string]> = {
  Aries: ['白羊', '直接積極，願意主動開展新的行動', '自主空間與坦率交流'],
  Taurus: ['金牛', '穩健務實，願意耐心累積具體成果', '安定節奏與實質支持'],
  Gemini: ['雙子', '靈活好奇，善於交流不同想法觀點', '自由交流與學習空間'],
  Cancer: ['巨蟹', '細膩體貼，留意周遭氣氛與人情味', '歸屬感與溫柔的陪伴'],
  Leo: ['獅子', '熱情鮮明，願意展現創意帶動氣氛', '真誠肯定與表達空間'],
  Virgo: ['處女', '細心有序，善於觀察細節改善方法', '清楚安排與實際協助'],
  Libra: ['天秤', '溫和協調，重視公平交流與互相理解', '平等互動與和諧氣氛'],
  Scorpio: ['天蠍', '專注敏銳，傾向深入理解事情本質', '信任關係與隱私界線'],
  Sagittarius: ['射手', '開朗坦誠，樂於探索經驗拓展視野', '探索自由與共同信念'],
  Capricorn: ['摩羯', '沉穩負責，願意為長期方向持續投入', '可靠承諾與穩定步調'],
  Aquarius: ['水瓶', '獨立開放，願意接觸新觀點與可能', '獨立空間與理念交流'],
  Pisces: ['雙魚', '柔和敏感，善於感受氣氛運用想像', '情感理解與安靜時光'],
};
const planets: Record<string, string> = {Sun:'太陽',Moon:'月亮',Mars:'火星',Mercury:'水星',Jupiter:'木星',Venus:'金星',Saturn:'土星'};
const houses = ['自我發展與身心照顧','收支資源與表達習慣','學習交流與日常行動','家庭歸屬與居住安排','創作樂趣與學習表達','工作習慣與日常責任','伴侶互動與合作協商','共享資源與變動調適','進修探索與價值信念','事業方向與社會責任','社群合作與長期目標','獨處休息與內在整理'];
const houseEn = ['self-development and self-care','resources and communication','learning and daily action','home and belonging','creativity and learning','routines and responsibilities','partnership and cooperation','shared resources and change','study and beliefs','career and public responsibility','community and long-term goals','rest and reflection'];
interface CoreChart { lagna?: string; moonSign?: string; houseLords?: Record<string,string>; housePlacements?: Record<string,number> }
function zhFreeReading(base: string, additions: string[]): string {
  const text = [base, ...additions].join(' ');
  return text.length > 300 ? `${text.slice(0, 299)}。` : text;
}
export function vedicCoreReading(chart: CoreChart, language = 'zh-Hant') {
  const en = language === 'en';
  const asc = signs[chart.lagna ?? ''];
  const moon = signs[chart.moonSign ?? ''];
  const lord = chart.houseLords?.['1'];
  const house = lord ? chart.housePlacements?.[lord] : undefined;
  const validHouse = !!lord && !!planets[lord] && Number.isInteger(house) && house! >= 1 && house! <= 12;
  return {
    archetype: {
      title: en ? `Ascendant: ${asc ? chart.lagna : 'Unavailable'}` : asc ? `上升${asc[0]}｜外在氣場` : '上升星座｜資料不足',
      body: asc ? en ? `Your ${chart.lagna} ascendant offers a symbolic lens on first impressions and how you approach new situations. Observe your actual responses rather than treating a sign as a fixed personality.` : zhFreeReading(`上升${asc[0]}象徵你${asc[1]}。面對新環境，留意自己的第一反應，也練習聆聽不同步調。`, [`在工作或合作中，你可以先觀察自己如何開始一項任務、如何回應陌生人的邀請，再分辨哪些行動是真正自然，哪些只是為了符合期待。當你願意保留一點調整空間，外在表現會更穩定，也較不必用急促或過度防衛來證明自己。`, `這個位置適合拿來做生活觀察，而不是替你下定論。每天記下一個讓你感到自在的互動，以及一個需要重新設定界線的時刻，回頭比較自己的反應與結果。如此能把上升星座的象徵，轉化成可驗證的自我理解與實際選擇。`]) : en ? 'The stored chart has no valid ascendant. A reading cannot be inferred without it.' : '目前星盤缺少有效上升星座，無法判讀外在氣場；請確認出生時間與地點，不以其他星座代替。',
    },
    talents: {
      title: en ? `Moon: ${moon ? chart.moonSign : 'Unavailable'}` : moon ? `月亮${moon[0]}｜內心情感` : '月亮星座｜資料不足',
      items: [],
      body: moon ? en ? `Your Moon in ${chart.moonSign} invites reflection on emotional needs and habitual responses. Notice what helps you feel secure, and communicate needs instead of expecting others to guess them.` : zhFreeReading(`月亮${moon[0]}提醒你關注${moon[2]}。情緒起伏時，先辨認真正需要，再清楚表達，不必期待別人自行猜懂。`, [`在關係裡，你可以留意自己是先尋求安定、先分析問題，還是先需要被理解；辨識這個順序，有助於避免把沉默誤認為冷漠，也避免在尚未整理情緒時急著答應或拒絕。把需要說成具體句子，通常比等待對方讀懂暗示更有效。`, `月亮星座不是情緒好壞的判決，而是一個觀察內在節奏的入口。當你感到疲憊或不安時，試著記下當下的身體感受、真正想保護的事，以及可以提出的一個小請求，逐步建立更可靠的自我照顧方式。`]) : en ? 'The stored chart has no valid Moon sign. Emotional themes cannot be assigned to an assumed sign.' : '目前星盤缺少有效月亮星座，暫不指定情感特質；請待資料完整後閱讀，不用猜測取代計算結果。',
    },
    currentCycle: {
      title: en ? 'Ascendant Ruler Placement | Life Focus' : '命主星落宮｜人生重心',
      body: validHouse ? en ? `Your ascendant ruler ${lord} is recorded in house ${house}, highlighting ${houseEn[house! - 1]}. Explore one practical action in this area; this placement does not guarantee an outcome.` : zhFreeReading(`命主星${planets[lord!]}落第${house}宮，可從${houses[house! - 1]}探索投入方向。選一項小行動實踐，這是自我觀察提示，並非必然命運。`, [`你可以把這個人生重心放回日常選擇：目前哪些時間、注意力與資源最常投入這個領域？哪些承諾其實已經超出可負擔的範圍？先整理現況，再挑選一個能在一週內完成的步驟，比急著追求宏大結果更能看見自己的節奏。`, `落宮提供的是象徵性的觀察方向，不代表事件必然發生，也不能單獨取代完整星盤、行星尊貴與大運判讀。請把它和實際經驗對照，記錄行動後的感受與回饋，再決定是否要調整長期投入方式。`]) : en ? 'The stored ascendant ruler or its house is missing. No house or life focus will be invented.' : '目前缺少命主星或有效落宮資料，無法指定人生重心；待星盤資料補齊再判讀，不以事業宮或其他宮位代替。',
    },
    challenge: { title: '', body: '' },
    nextYear: { title: '', body: '', lockedPrompts: [] },
  };
}
