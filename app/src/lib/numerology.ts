export interface GridLine {
  id: string;
  numbers: [number, number, number];
  name: string;
  tag: string;
  tagColor: string;
  soulBlueprint: string;
  analysis: string;
  crystalPrescription: string;
  ritual: string;
  energyAdvice: string;
  crystals: string[];
  crystalEnergy: string;
}

export interface NumerologyReport {
  lifePathNumber: number;
  birthdayNumber: number;
  missingNumbers: number[];
  presentNumbers: number[];
  digits: number[];
  gridCounts: Record<number, number>;
  activeGridLines: GridLine[];
  personality: string;
  emotionalPattern: string;
  wealthEnergy: string;
  soulLesson: string;
  chakra: string;
  chakraColor: string;
  lifePathDescription: string;
}

export interface CrystalInfo {
  name: string;
  nameZh: string;
  color: string;
  hex: string;
  energy: string;
  chakra: string;
  reason?: string;
  usage?: string;
}

export interface MissingNumberData {
  number: number;
  traits: string[];
  challenge: string;
  blindspot: string;
  crystalFix: string;
  crystals: CrystalInfo[];
  affirmation: string;
}

function reduceToSingleDigit(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((sum, d) => sum + parseInt(d), 0);
  }
  return n;
}

export function calculateNumerology(dateStr: string): NumerologyReport {
  const [year, month, day] = dateStr.split('-').map(Number);
  const allDigits = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
    .split('').map(Number);

  const lifePathSum = allDigits.reduce((s, d) => s + d, 0);
  const lifePathNumber = reduceToSingleDigit(lifePathSum);
  const birthdayNumber = reduceToSingleDigit(day);

  // Life path number digits (expand master numbers for grid)
  const lpStr = String(lifePathSum);
  const lpDigits = lpStr.split('').map(Number);

  // All grid digits = birthday digits + life path sum digits (non-zero)
  const gridSourceDigits = [...allDigits, ...lpDigits].filter(d => d !== 0);

  const digits = allDigits.filter(d => d !== 0);
  const presentNumbers = [...new Set(digits)];
  const missingNumbers = [1,2,3,4,5,6,7,8,9].filter(n => !digits.includes(n));

  // Count each 1-9 in grid source
  const gridCounts: Record<number, number> = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0 };
  gridSourceDigits.forEach(d => { if (d >= 1 && d <= 9) gridCounts[d]++; });

  const activeGridLines = ALL_GRID_LINES.filter(
    line => line.numbers.every(n => gridCounts[n] > 0)
  );

  const lpDescriptions: Record<number, { personality: string; emotional: string; wealth: string; soul: string; chakra: string; chakraColor: string; desc: string }> = {
    1: { personality: '領導者、先驅、獨立自主', emotional: '容易孤立，需要學習接受幫助', wealth: '靠自身能力創造財富，適合創業', soul: '學習真正的獨立而非孤立', chakra: '太陽神經叢脈輪', chakraColor: '#fbbf24', desc: '你是天生的領袖，充滿開創精神與行動力。你的使命是帶領他人走向新的可能。' },
    2: { personality: '外交家、協調者、敏感直覺', emotional: '極度敏感，容易受外界影響', wealth: '透過合作與夥伴關係累積財富', soul: '學習在付出與接受之間找到平衡', chakra: '心輪', chakraColor: '#6ee7b7', desc: '你擁有精細的感知力與協調能力，是天然的和平締造者，你的溫柔是你最大的力量。' },
    3: { personality: '創作者、表達者、樂觀開朗', emotional: '情緒起伏大，需要創意出口', wealth: '透過創意、藝術與溝通創造財富', soul: '學習真實表達而非取悅他人', chakra: '喉輪', chakraColor: '#7dd3fc', desc: '你充滿創意與表達天賦，你的文字、聲音或藝術有改變他人生命的力量。' },
    4: { personality: '建設者、實踐者、穩定可靠', emotional: '壓抑情緒，習慣用工作逃避感受', wealth: '透過踏實努力與系統建立財富', soul: '學習在穩定中擁抱變化', chakra: '海底輪', chakraColor: '#f87171', desc: '你是穩定的基石，擁有建立持久事物的天賦，你的耐心與紀律是他人仰賴的力量。' },
    5: { personality: '探險家、自由靈魂、多才多藝', emotional: '逃避承諾，害怕被束縛', wealth: '透過變化、旅行與多元體驗創造財富', soul: '學習在自由中承擔責任', chakra: '臍輪', chakraColor: '#fb923c', desc: '你是充滿活力的探索者，對生命充滿好奇，你的天賦是為世界帶來新視角與活力。' },
    6: { personality: '療癒者、照顧者、責任感強', emotional: '過度付出導致自我犧牲', wealth: '透過服務、療癒與創造美麗獲得財富', soul: '學習先愛自己再愛他人', chakra: '心輪', chakraColor: '#6ee7b7', desc: '你是天生的療癒者與照顧者，你的愛能溫暖每一個接觸到你的人。' },
    7: { personality: '哲學家、研究者、靈性探索者', emotional: '情感封閉，難以信任他人', wealth: '透過智慧、研究與靈性工作獲得財富', soul: '學習在孤獨中連結，在知識中信任', chakra: '頂輪', chakraColor: '#a78bfa', desc: '你是深度思考者與靈性探索者，你的洞察力能穿透表象，揭示隱藏的真相。' },
    8: { personality: '企業家、執行者、權威管理', emotional: '控制慾強，難以示弱', wealth: '天生財富磁石，擅長商業與投資', soul: '學習善用權力而非控制他人', chakra: '太陽神經叢脈輪', chakraColor: '#fbbf24', desc: '你是天生的領導者與財富創造者，你的執行力與商業直覺是天賦，善用則能成就巨大。' },
    9: { personality: '人道主義者、智者、大愛', emotional: '難以放下過去，容易揹負他人痛苦', wealth: '透過大愛服務與靈性事業獲得豐盛', soul: '學習放下，完成靈魂的最終圓滿', chakra: '頂輪', chakraColor: '#a78bfa', desc: '你是靈魂旅程接近圓滿的靈性存在，你的大愛與智慧能照亮許多迷途的靈魂。' },
    11: { personality: '靈性先驅、直覺大師、光之使者', emotional: '高度敏感，容易承受過多能量', wealth: '透過靈感、教導與啟發創造影響力', soul: '學習接地並信任直覺', chakra: '第三眼脈輪', chakraColor: '#818cf8', desc: '你是靈性覺醒的催化劑，擁有超凡的直覺與靈感，你的存在本身就是一個光的訊息。' },
    22: { personality: '大師建設者、夢想實踐者', emotional: '承受巨大壓力，容易感到責任過重', wealth: '有能力建立影響全球的系統與事業', soul: '學習將宏大願景化為現實', chakra: '全脈輪整合', chakraColor: '#fbbf24', desc: '你是大師建設者，擁有將宏偉願景化為現實的罕見天賦，你生來改變世界的格局。' },
    33: { personality: '大師療癒者、無條件之愛的化身', emotional: '容易為他人的痛苦而承受巨大負擔', wealth: '豐盛來自於真實服務與無條件的愛', soul: '學習以愛而非犧牲來療癒世界', chakra: '心輪整合', chakraColor: '#6ee7b7', desc: '你是大師療癒者，承載著無條件之愛的使命，你的療癒力量能觸及靈魂最深處。' },
  };

  const info = lpDescriptions[lifePathNumber] || lpDescriptions[9];

  return {
    lifePathNumber,
    birthdayNumber,
    missingNumbers,
    presentNumbers,
    digits,
    gridCounts,
    activeGridLines,
    personality: info.personality,
    emotionalPattern: info.emotional,
    wealthEnergy: info.wealth,
    soulLesson: info.soul,
    chakra: info.chakra,
    chakraColor: info.chakraColor,
    lifePathDescription: info.desc,
  };
}

export const ALL_GRID_LINES: GridLine[] = [
  {
    id: '1-2-3',
    numbers: [1, 2, 3],
    name: '藝術・才華線',
    tag: '顯化的創作者',
    tagColor: '#a78bfa',
    soulBlueprint: '擁有 1-2-3 連線的靈魂，帶著將無形靈感轉化為有形物質的強大天賦來到地球。1 的獨立開創、2 的陰性能量感知與 3 的創意表達，讓你在藝術、美學或任何需要原創性的領域中如魚得水。然而，當你的能量場失衡時，容易陷入深層的自我懷疑或過度在意世俗評價。這會導致頂輪與眉心輪的直覺管道產生淤塞，讓源頭的靈感無法順暢落地，進而引發焦慮與自我價值低落的循環。',
    analysis: '擁有 1-2-3 連線的靈魂，帶著將無形靈感轉化為有形物質的強大天賦來到地球。1 的獨立開創、2 的陰性能量感知與 3 的創意表達，讓你在藝術、美學或任何需要原創性的領域中如魚得水。然而，當你的能量場失衡時，容易陷入深層的自我懷疑或過度在意世俗評價，導致頂輪與眉心輪的直覺管道產生淤塞，靈感無法順暢落地。',
    crystalPrescription: '建議將「高頻紫水晶」與「透石膏」作為你日常的能量護理工具。紫水晶能穩定眉心輪的過度活躍，而透石膏能快速清理理智體的雜訊。',
    ritual: '請在安靜的空間中，將紫水晶置於眉心，透石膏握於雙手。閉上雙眼，進行深沉的呼吸。運用意念引導水晶的高頻純淨白光，進行能量的「垂直貫穿」——想像這道光束從頂輪筆直而下，穿透眉心輪與喉輪，將你腦中散亂的思緒與自我懷疑徹底沖刷乾淨，穩固你的靈性管道，讓靈魂的創造力得以毫無阻礙地在三維世界中顯化。',
    energyAdvice: '建議使用「高頻紫水晶」與「透石膏」作為日常能量護理工具。在靜心時進行能量「垂直貫穿」，從頂輪筆直而下穿透眉心輪與喉輪，清理自我懷疑的雜訊，穩固靈性管道，讓靈魂的創造力毫無阻礙地在三維世界顯化。',
    crystals: ['高頻紫水晶', '透石膏'],
    crystalEnergy: '頂輪・眉心輪',
  },
  {
    id: '4-5-6',
    numbers: [4, 5, 6],
    name: '組織・完美線',
    tag: '物質與心靈的建築師',
    tagColor: '#6ee7b7',
    soulBlueprint: '這是一條極具責任感與結構力的連線。4 的穩定、5 的溝通與 6 的療癒愛心，使你成為群體中解決問題與提供安全感的核心支柱。但你的深層靈魂挑戰在於「過度承擔」與「極端完美主義」。在潛意識中，你經常無意識地將他人的責任與情緒重擔扛在自己肩上。長期下來，這會導致你的心輪與太陽神經叢能量過度緊繃、耗竭，甚至在你的外圍氣場與能量場上，產生因壓力撕裂的微小裂痕。',
    analysis: '這是一條極具責任感與結構力的連線。4 的穩定、5 的溝通與 6 的療癒愛心，使你成為群體中解決問題與提供安全感的核心支柱。深層靈魂挑戰在於「過度承擔」與「極端完美主義」，長期將他人的責任扛在肩上，導致心輪與太陽神經叢能量耗竭，能量場產生壓力型裂痕。',
    crystalPrescription: '你極度需要能深層滋養心輪的礦石，強烈建議使用「祖母綠掌中石」或是「綠色電氣石」。它們蘊含的強大綠色光頻，能為枯竭的心輪注入生機。',
    ritual: '當你感到耗竭時，請平躺並將祖母綠掌中石放置於胸口心輪處。搭配深長緩慢的呼吸，運用你的意念引導這股綠色療癒光頻，溫柔地「縫合」你因過度消耗而破損的能量場。允許這股頻率修補氣場的裂縫，並告訴自己：「我願意放下不屬於我的重擔，我允許自己被無條件地愛與滋養。」',
    energyAdvice: '強烈建議使用「祖母綠掌中石」或「綠色電氣石」深層滋養心輪。耗竭時平躺，將水晶置於胸口，以綠色療癒光頻「縫合」破損的能量場，釋放過度承擔的緊繃，允許自己被無條件地愛與滋養。',
    crystals: ['祖母綠', '綠色電氣石', '透石膏'],
    crystalEnergy: '心輪・太陽神經叢',
  },
  {
    id: '7-8-9',
    numbers: [7, 8, 9],
    name: '貴人・權力線',
    tag: '靈性與物質的整合者',
    tagColor: '#fbbf24',
    soulBlueprint: '擁有這條連線代表你帶著老靈魂的深邃智慧與業力法則來到此生。7 的深度覺察、8 的豐盛顯化與 9 的無私大愛，讓你在掌握資源、影響群眾或引領靈性覺醒上有著不可思議的潛能。你的終極考驗在於如何完美平衡「世俗權力」與「靈性法則」。若能量過度偏向物質，太陽神經叢會失衡，引發控制慾與內在空虛；若過度偏向靈性，海底輪會漂浮，導致在現實生活中頻頻受挫，無法落實藍圖。',
    analysis: '擁有這條連線代表你帶著老靈魂的深邃智慧與業力法則來到此生。7 的深度覺察、8 的豐盛顯化與 9 的無私大愛，讓你在掌握資源、影響群眾或引領靈性覺醒上有著不可思議的潛能。終極考驗在於平衡「世俗權力」與「靈性法則」，避免太陽神經叢失衡引發的控制慾，或海底輪漂浮導致的無法落地。',
    crystalPrescription: '強大且具備古老地球智慧的「骨幹水晶（Skeletal Quartz）」是你的靈魂首選。它能協助你將極高維度的靈性頻率，穩穩地向下扎根。',
    ritual: '在靜心時，雙手握住骨幹水晶，將注意力集中在海底輪與腳底的湧泉穴。想像骨幹水晶的能量如古老神木的根系般，深深扎入地球核心。這不僅能強化你的能量邊界，更能協助你將高維度的直覺與靈感，實際轉化為三維物質界中的豐盛與事業版圖，實現靈物合一的境界。',
    energyAdvice: '首選「骨幹水晶（Skeletal Quartz）」協助將高靈性頻率向下扎根。靜心時雙手握住，意念如古老神木根系般扎入地球核心，強化能量邊界，將高維直覺轉化為物質界的豐盛，實現靈物合一。',
    crystals: ['骨幹水晶', '黃水晶'],
    crystalEnergy: '海底輪・太陽神經叢・頂輪',
  },
  {
    id: '1-4-7',
    numbers: [1, 4, 7],
    name: '物質・行動線',
    tag: '大地能量的實踐家',
    tagColor: '#fb923c',
    soulBlueprint: '這是顯化物質法則最強大、最具落地能量的一條連線。1 的衝勁、4 的執行力與 7 的分析力，使你具備極高的世俗成就潛力與行動力。你是極佳的開疆闢土者，講究實際與效率。然而，這股強大的接地能量，有時會讓你過度聚焦於生存與成就，忽略了內在的情感流動或高維度的靈性指引。這會導致能量過度淤積於下三輪（海底輪、臍輪），引發思想固執、對未知的恐懼，或是靈性意識的僵化。',
    analysis: '這是顯化物質法則最強大、最具落地能量的一條連線。1 的衝勁、4 的執行力與 7 的分析力，使你具備極高的世俗成就潛力。你是極佳的開疆闢土者，但強大的接地能量有時會讓你忽略靈性指引，導致能量淤積於下三輪，引發思想固執或對未知的恐懼。',
    crystalPrescription: '你需要打通上下脈輪的能量迴路。下三輪可維持使用「紅石榴石」或「黑曜石」保持動能，但強烈建議搭配「透石膏」或「白水晶」放置於頂輪周圍。',
    ritual: '靜坐時，感受下三輪的紅色與橘色光芒穩定扎根，同時意念引導頂輪接收透石膏的純白光頻。讓上下能量在心輪交會，建立完整的全身能量迴路。這能幫助你在衝刺事業的同時，保持對宇宙更高指引的敞開，避免陷入純物質的執著與僵化。',
    energyAdvice: '打通上下脈輪能量迴路：下三輪搭配「紅石榴石」或「黑曜石」，頂輪搭配「透石膏」或「白水晶」。靜坐時讓上下能量在心輪交會，在衝刺事業的同時保持對宇宙高指引的敞開，避免純物質的僵化。',
    crystals: ['紅石榴石', '黑曜石', '白水晶'],
    crystalEnergy: '海底輪・頂輪',
  },
  {
    id: '2-5-8',
    numbers: [2, 5, 8],
    name: '感情・表達線',
    tag: '共情與情緒的煉金術士',
    tagColor: '#fda4af',
    soulBlueprint: '這是一條情感豐沛、同理心極強且充滿張力的連線。2 的敏感、5 的表達與 8 的掌控力，讓你能輕易讀懂他人的深層情緒，並成為優秀的溝通者或療癒者。但作為高敏感族群，你極容易像海綿般吸收周遭環境的負面情緒與低頻能量，導致情緒體嚴重超載。當臍輪與喉輪受阻時，你可能會選擇壓抑真實感受，委屈求全，或反過來用情緒勒索來獲取安全感，能量場邊界極度模糊。',
    analysis: '這是一條情感豐沛、同理心極強且充滿張力的連線。2 的敏感、5 的表達與 8 的掌控力，讓你能輕易讀懂他人的深層情緒，成為優秀的療癒者。但高敏感特質讓你極易吸收負面情緒導致情緒體超載，臍輪與喉輪受阻時容易壓抑真實感受，能量場邊界模糊。',
    crystalPrescription: '建立堅實的能量界線是你一生的功課。建議運用「海藍寶」疏通喉輪，勇敢表達真實的自我；同時搭配「粉晶」療癒臍輪與心輪的匱乏感。',
    ritual: '在每日睡前，進行「能量場縫合與淨化」練習。握住海藍寶，想像一層淡藍色的光罩包圍全身。運用你的意念，將白天不小心吸收的他人的情緒碎片，從你的能量場中一一剔除、釋放回歸大地。接著觀想粉晶的粉紅光芒填補這些空缺，宣告：「我尊重我的感受，我只對我自己的情緒負責。」',
    energyAdvice: '每日睡前進行「能量場縫合與淨化」儀式。手握「海藍寶」觀想淡藍色光罩包圍全身，剔除吸收的他人情緒碎片；再用「粉晶」的粉紅光芒填補空缺，宣告：我只對自己的情緒負責。',
    crystals: ['海藍寶', '粉晶', '孔雀石'],
    crystalEnergy: '臍輪・心輪・喉輪',
  },
  {
    id: '3-6-9',
    numbers: [3, 6, 9],
    name: '智慧・理想線',
    tag: '高維意識的傳遞者',
    tagColor: '#60a5fa',
    soulBlueprint: '具備這條連線的你，是天生的理想主義者與宇宙智慧傳承者。3 的靈活、6 的奉獻與 9 的宏大靈性視野，讓你的思考經常超越當下的時空，關注人類集體的覺醒或形而上的真理。你的終極挑戰在於「如何將高遠的理想錨定於地球」。當你發現現實世界充滿粗糙與不完美，無法跟上你的願景時，極易產生嚴重的失落感、憤世嫉俗，甚至出現頂輪過度開啟而海底輪虛弱的「逃避現實」傾向。',
    analysis: '你是天生的理想主義者與宇宙智慧傳承者。3 的靈活、6 的奉獻與 9 的宏大靈性視野讓你的思考超越時空，終極挑戰在於「如何將高遠理想錨定地球」。現實無法跟上願景時，易產生失落感與憤世嫉俗，出現頂輪過度開啟而海底輪虛弱的逃避現實傾向。',
    crystalPrescription: '你需要能連結天地、同時保護意識頻率的水晶。使用「青金石」或「拉長石」可以保護你的能量場免於世俗低頻的消耗。',
    ritual: '你的靜心必須包含強烈的「接地」意圖。請在腳底放置深色「骨幹水晶」或「黑碧璽」，雙手握住拉長石。觀想頂輪接收宇宙的智慧藍光，並將這股藍光一路往下導引，穿透全身，最終與腳底的骨幹水晶結合，釘入地球深處。這能將你的高頻智慧與理想，一步步透過實際行動與耐性，顯化在地球的日常之中。',
    energyAdvice: '靜心需包含強烈接地意圖：腳底放「黑碧璽」或「骨幹水晶」，雙手握「拉長石」。觀想頂輪宇宙藍光往下貫穿全身，釘入地球深處，將高頻智慧一步步透過實際行動顯化在日常生活中。',
    crystals: ['青金石', '拉長石', '黑碧璽'],
    crystalEnergy: '眉心輪・喉輪・海底輪',
  },
  {
    id: '1-5-9',
    numbers: [1, 5, 9],
    name: '事業・企圖心線',
    tag: '意志與願景的開創者',
    tagColor: '#e8a838',
    soulBlueprint: '這是一條充滿狂野動能與極強個人魅力的連線。1 的自我意志、5 的自由突破與 9 的遠大願景，賦予你極強的開創精神與領袖風範。你渴望在世界上留下自己的印記，不斷追求擴張。然而，這股強大的企圖心若缺乏內在覺察，容易演變成專斷、強勢，或是因為過度燃燒太陽神經叢的意志力，導致能量系統的枯竭（Burnout），甚至切斷與心輪的連結，變得冷酷。',
    analysis: '這是一條充滿狂野動能與極強個人魅力的連線。1 的自我意志、5 的自由突破與 9 的遠大願景，賦予你極強的開創精神與領袖風範。強大企圖心若缺乏覺察，容易演變成強勢獨斷，或因過度燃燒太陽神經叢導致 Burnout，切斷與心輪的連結。',
    crystalPrescription: '你需要能同時供應強大動能並校準頻率的高階礦石，強烈建議配戴「超級七（Super Seven）」或「紫水晶」。它們能確保你的個人意志不偏離宇宙法則。',
    ritual: '當你感到身心俱疲但又無法停下腳步時，請進行「意志與神聖藍圖校準」儀式。握住超級七，進行「垂直貫穿」的能量觀想。將太陽神經叢（個人意志）的金黃色光芒，向上延伸與頂輪（宇宙意志）的紫光融合。祈請高我接管你的事業路徑，讓你學會以「順流與共創」的方式前進，而非單憑一己之力的「強求與消耗」。',
    energyAdvice: '進行「意志與神聖藍圖校準」儀式：握住「超級七」，將太陽神經叢的金黃意志之光向上與頂輪紫光融合，祈請高我接管事業路徑，學會以「順流共創」而非「強求消耗」的方式前進。',
    crystals: ['超級七', '紫水晶', '鈦晶'],
    crystalEnergy: '太陽神經叢・頂輪・全脈輪',
  },
  {
    id: '3-5-7',
    numbers: [3, 5, 7],
    name: '人緣・成名線',
    tag: '群眾能量的吸引者',
    tagColor: '#f97316',
    soulBlueprint: '這是一條自帶聚光燈、極具群眾吸引力與影響力的連線。3 的舞台魅力、5 的公眾溝通與 7 的神祕氣質，讓你在人群中總是特別亮眼，天生適合自媒體、教學或幕前工作。但你的深層課題在於「真實核心與外界投射的平衡」。長期暴露在公眾目光下，過度接收大眾的投射、期待甚至嫉妒，會讓你的外圍氣場黏附太多他人的能量索（Energy Cords），導致你失去與內在真實自我的連結，感到莫名疲倦。',
    analysis: '這是一條自帶聚光燈、極具群眾吸引力的連線。3 的舞台魅力、5 的公眾溝通與 7 的神祕氣質讓你天生亮眼，適合幕前工作。深層課題在於「真實核心與外界投射的平衡」，長期的公眾暴露讓氣場黏附他人能量索，失去與內在自我的連結。',
    crystalPrescription: '維持個人氣場的純淨度與切斷能量索是你日常必備的工作。建議使用「透石膏」作為氣場的清理工具，並配戴「太陽石」來穩固內在的核心自信。',
    ritual: '每天結束與大眾的接觸後，務必進行氣場清理。手持透石膏，像梳子一樣，從頭頂到腳底，距離身體約 5 公分處，緩慢而堅定地「梳理」你的能量場。意念設定為切斷所有不屬於你的能量連結與他人投射。接著，感受太陽神經叢處的太陽石散發出溫暖的金光，重新建立起明亮、堅固且充滿力量的個人能量防護罩。',
    energyAdvice: '每日結束公眾接觸後，手持「透石膏」距身體 5 公分緩慢梳理氣場，切斷所有能量索與他人投射。再以「太陽石」的溫暖金光重建明亮堅固的個人能量防護罩，維持氣場純淨。',
    crystals: ['透石膏', '太陽石', '金太陽'],
    crystalEnergy: '太陽神經叢・心輪',
  },
];

export const missingNumberData: Record<number, MissingNumberData> = {
  1: {
    number: 1,
    traits: ['缺乏行動力', '自信不足', '自我意識薄弱', '依賴他人決定'],
    challenge: '自我與開創的盲點',
    blindspot: '缺乏 1 的能量，容易在潛意識中對「展現自我」感到深層恐懼。你可能習慣等待別人給予許可才行動，在需要獨立決策的時刻不斷退縮，將自己的力量外包給外界。長期如此，太陽神經叢的能量逐漸萎縮，導致即使知道方向，卻始終踏不出那一步。在人際關係中，也容易因邊界模糊而讓他人代替自己做出重要選擇，最終活成別人期望的版本，而非靈魂本有的藍圖。',
    crystalFix: '以下水晶組合專為激活太陽神經叢、重建個人意志力而設計，搭配使用能顯著提升「自我啟動」的能量頻率：',
    crystals: [
      { name: 'Skeletal Quartz', nameZh: '骨幹水晶', color: 'amber', hex: '#fb923c', energy: '穩固下三輪，重燃內在意志與自我認同', chakra: '太陽神經叢', reason: '骨幹水晶的古老地球頻率能直接錨定飄忽的自我意識，幫助你感受「我存在、我有力量」的根本確定感，是修復缺失 1 能量最核心的礦石。', usage: '每天早晨握住骨幹水晶，站立或坐下，閉眼深呼吸，觀想金黃色光流從腳底升起貫穿太陽神經叢，重複三次心念：「我是自己生命的主宰。」可持續配戴於身上加強效果。' },
      { name: 'Obsidian', nameZh: '黑曜石', color: 'gray', hex: '#374151', energy: '強力接地，清除恐懼，建立自我保護屏障', chakra: '海底輪', reason: '黑曜石能清理潛意識中對「獨立」的恐懼印記——那些讓你不斷退縮的深層信念，正需要黑曜石的高頻淨化能量加以溶解。', usage: '睡前將黑曜石放置於床頭或枕下，讓它在夜間深層清理恐懼信念。也可於靜心時置於海底輪（脊椎底部），觀想黑色光芒吸收並轉化所有「我不夠好」的能量。' },
    ],
    affirmation: '我是自己生命的主宰，我勇敢地邁向我的使命。',
  },
  2: {
    number: 2,
    traits: ['情緒表達生硬', '人際能量拉扯', '難以設立界限', '心輪能量受阻'],
    challenge: '陰性能量與連結的盲點',
    blindspot: '2 代表陰性能量的接收與關係的平衡。缺失此數字，你在情感表達上往往較為生硬，對他人細膩的情緒需求感知力不足，容易在親密關係中拉扯與防衛，讓對方感到難以真正靠近。另一面向是過度付出——沒有建立健康的能量界限，持續為他人輸出而不知如何接收，最終造成能量耗竭。心輪與臍輪的流動受阻，讓你在渴望連結的同時，又本能地抗拒被真正看見。',
    crystalFix: '以下水晶組合專為修復心輪防衛、重建付出與接收平衡而設計，能溫柔地軟化長期積累的情感盔甲：',
    crystals: [
      { name: 'Emerald', nameZh: '祖母綠', color: 'emerald', hex: '#34d399', energy: '深層療癒心輪，修補關係能量裂痕', chakra: '心輪', reason: '祖母綠是心輪療癒最直接的礦石，其強大的綠色頻率能直接溶解缺失 2 能量所造成的情感防護罩，協助重建「敞開即安全」的深層信任。', usage: '將祖母綠作為掌中石，在與重要他人互動前握持五分鐘，感受綠色光頻柔化你的防衛。也可配戴為項鍊緊鄰心輪位置，持續滋養日常關係中的情感流動。' },
      { name: 'Rose Quartz', nameZh: '粉晶', color: 'rose', hex: '#fda4af', energy: '開啟心輪，帶來無條件的愛與自我接納', chakra: '心輪', reason: '粉晶的振動頻率與「無條件的愛」完全共振，能修復缺失 2 帶來的「我不值得被愛」的深層信念，讓你學會先接納自己，才能真實地在關係中付出與接收。', usage: '每晚睡前將粉晶放於心輪（胸口），輕輕閉眼感受溫柔的粉色光芒包裹你的心，搭配深呼吸，允許自己接收宇宙無條件的愛。可於浴室放置粉晶水，以此洗臉啟動每日愛的頻率。' },
    ],
    affirmation: '我在愛中保有自己，我的需求同樣值得被重視。',
  },
  3: {
    number: 3,
    traits: ['壓抑真實表達', '喉輪能量淤塞', '溝通焦慮', '創意受阻'],
    challenge: '表達與創意的盲點',
    blindspot: '缺乏 3 的頻率，往往會深層壓抑真實的自我表達。你可能腦中有豐富的想法與感受，卻在開口前就被內在審查員攔截——「這樣說對嗎？」「別人會怎麼想？」——久而久之形成溝通焦慮，習慣隱藏自己真實的聲音與光芒。長期壓抑使喉輪能量淤塞，可能伴隨喉嚨不適或慢性喉炎。創意能量受阻不僅影響藝術表達，也讓你在工作與人際中無法清晰傳遞自己的核心價值與獨特觀點。',
    crystalFix: '以下水晶組合專為疏通喉輪淤積、重啟真實表達能量而設計，搭配使用能顯著提升溝通頻率與創意流動：',
    crystals: [
      { name: 'Aquamarine', nameZh: '海藍寶', color: 'teal', hex: '#5eead4', energy: '清理喉輪阻塞，暢通真實表達能力', chakra: '喉輪', reason: '海藍寶的海水頻率與喉輪能量完全共振，能溫柔而有力地清理因長期壓抑所形成的表達阻塞，幫助缺失 3 的你找回屬於靈魂本有的清晰聲音。', usage: '在重要溝通前，握住海藍寶深呼吸三次，或配戴於鎖骨附近。進行「書寫療癒」時，將海藍寶置於桌上，讓它協助你毫無保留地將真實感受書寫出來，不需修飾、不需審查。' },
      { name: 'Blue Lace Agate', nameZh: '藍紋瑪瑙', color: 'sky', hex: '#7dd3fc', energy: '帶來平靜溝通，化解表達恐懼', chakra: '喉輪', reason: '藍紋瑪瑙對於「表達恐懼」有針對性的療癒作用，其細膩的條紋頻率能化解溝通焦慮，讓你在最緊張的場合中仍能找到冷靜清晰的表達狀態。', usage: '在開會、演講或重要對話前，手握藍紋瑪瑙靜心兩分鐘，感受它帶來的平靜感。可作為隨身石放入口袋，在感到溝通焦慮時隨時取出握持，快速恢復表達的從容。' },
      { name: 'Selenite', nameZh: '透石膏', color: 'white', hex: '#e5e7eb', energy: '梳理心輪至喉輪氣場通道，清除淤積', chakra: '心輪・喉輪', reason: '透石膏能疏通從心輪到喉輪的氣場通道，清除那些「說不出口的話」所積累的能量淤積，讓心中的感受得以流暢轉化為清晰的語言表達。', usage: '每週一次，使用透石膏棒從下巴沿喉嚨輕輕向下「梳理」至胸口，重複七次，觀想淡白色光芒清掃氣場中的淤積能量。睡前將透石膏置於枕旁，加速夜間深層的喉輪修復。' },
    ],
    affirmation: '我的聲音值得被聽見，我自由地表達我的真實。',
  },
  4: {
    number: 4,
    traits: ['缺乏安全感', '海底輪漂浮', '難以建立規律', '物質焦慮'],
    challenge: '穩定與落實的盲點',
    blindspot: '4 代表物質界的結構、規律與安全感。缺失此能量，你在生活中容易缺乏秩序感，計劃做了又改、事情開了頭卻難以持續推進。對未來的物質生存常有莫名的底層焦慮，即使現實狀況尚可，仍無法真正感到安心。海底輪能量處於「漂浮」狀態，讓你難以扎根於當下，思緒容易游移於過去的悔恨或未來的擔憂之間，難以穩穩活在此刻並將能量落實為具體行動。',
    crystalFix: '以下水晶組合專為強化海底輪接地能量、重建物質安全感而設計，能有效穩定浮動的底層焦慮：',
    crystals: [
      { name: 'Skeletal Quartz', nameZh: '深色骨幹水晶', color: 'gray', hex: '#4b5563', energy: '如樹根扎入地心，錨定飄忽的安全感', chakra: '海底輪', reason: '深色骨幹水晶攜帶地球古老智慧的穩定頻率，能直接針對缺失 4 所造成的「根基缺失感」進行深層補充，幫助你在心理層面建立真實的安全感基礎。', usage: '赤腳站立時，將深色骨幹水晶放在腳邊，感受地球能量透過腳底湧泉穴進入身體。每天早晨靜心五分鐘，手握此石，觀想自己是一棵樹，根系深入地心，穩固而踏實。' },
      { name: 'Smoky Quartz', nameZh: '茶晶', color: 'brown', hex: '#78716c', energy: '接地氣，轉化不安全感為穩定力量', chakra: '海底輪', reason: '茶晶是轉化能量的接地大師，能將缺失 4 帶來的焦慮與不安全感，轉化為腳踏實地的穩定動力，特別適合需要將想法落實為具體行動的情境使用。', usage: '在處理財務、制定計劃或面對物質焦慮時，將茶晶握在慣用手中，感受沉穩的棕色能量為你帶來清晰與落地感。也可放置於工作桌或書桌右側，持續穩定工作空間的接地能量。' },
    ],
    affirmation: '我是安全的，大地支撐著我，我在穩定中創造美好。',
  },
  5: {
    number: 5,
    traits: ['抗拒改變', '思維僵化', '缺乏彈性', '能量通道斷層'],
    challenge: '自由與突破的盲點',
    blindspot: '缺失 5 的能量，在面對改變時容易產生強烈的抗拒與恐懼，習慣用「再等一下」「條件還不夠好」作為推遲改變的理由，緊抓著舒適圈不放。或走向反面：生活缺乏明確方向，隨波逐流、什麼都嘗試卻什麼都無法深入。思維的彈性不足導致在人際與工作上容易被認為固執或難以合作。太陽神經叢與喉輪之間的能量通道出現斷層，讓你的想法無法有效轉化為行動與清晰的語言表達。',
    crystalFix: '以下水晶組合專為鬆動固化信念、重建思維彈性與突破能量而設計：',
    crystals: [
      { name: 'Amethyst', nameZh: '高頻紫水晶', color: 'violet', hex: '#a78bfa', energy: '垂直貫穿疏通，轉換僵化思維', chakra: '頂輪・眉心輪', reason: '高頻紫水晶的頂輪頻率能從上而下「垂直貫穿」疏通因缺失 5 所形成的固化信念層，讓你的思維系統重新獲得彈性與開放性，更願意接受生命帶來的新方向。', usage: '每週進行一次「突破靜心」：仰臥，將紫水晶置於眉心輪，閉眼觀想紫色光束從頂輪向下貫穿喉輪直至太陽神經叢，停留十五分鐘。期間允許任何關於改變的念頭浮現，不加評判地觀察它們。' },
      { name: 'Fluorite', nameZh: '螢石', color: 'teal', hex: '#5eead4', energy: '清理固化信念，帶來思維靈活度', chakra: '心輪・喉輪', reason: '螢石的多色頻率象徵多元視角，能有效清理缺失 5 所造成的「只有一條路」的思維定式，為你打開看見更多可能性的心智空間。', usage: '在面臨需要做出改變決策時，手持螢石靜坐五分鐘，允許它的能量鬆動你的既定立場。可將螢石放於電腦或工作空間，持續清理思維場中的僵化頻率，促進創意與彈性。' },
    ],
    affirmation: '我擁抱改變，每個新體驗都帶我走向更豐盛的人生。',
  },
  6: {
    number: 6,
    traits: ['心輪封閉', '深層匱乏感', '付出接收失衡', '難以感受恩典'],
    challenge: '療癒與自我價值的盲點',
    blindspot: '6 代表無條件的愛、療癒與家庭責任。缺失此數字，你在付出與接收之間難以找到平衡——要麼過度付出至自我耗盡，要麼難以打開接收他人關愛的通道。深層有「我不值得被愛」或「我需要不斷付出才有價值」的信念在運作。心輪能量封閉，難以感受到生命中細微的恩典與喜悅；面對他人的痛苦時，可能擺盪於過度共情（耗竭自己）與情感隔離（保護自己）兩個極端之間。',
    crystalFix: '以下水晶組合專為深層療癒心輪、重建自我價值感而設計，幫助你在付出的同時學會優雅地接收：',
    crystals: [
      { name: 'Emerald', nameZh: '祖母綠', color: 'emerald', hex: '#34d399', energy: '強大綠色頻率消融心輪防護罩', chakra: '心輪', reason: '祖母綠是心輪療癒最強大的礦石之一，其頻率直接針對缺失 6 帶來的「自我價值匱乏」進行深層修復，幫助你感受到自己本有的完整與值得被愛的本質。', usage: '進行「心輪療癒冥想」：仰臥，將祖母綠放於胸口，閉眼深呼吸，每次吸氣觀想綠色光芒流入心輪，每次呼氣釋放「我不夠好」的信念。每週至少進行三次，每次十分鐘。' },
      { name: 'Green Tourmaline', nameZh: '綠色電氣石', color: 'emerald', hex: '#6ee7b7', energy: '深層修復心輪，注入自我價值感', chakra: '心輪', reason: '綠色電氣石攜帶高頻的轉化能量，能有效修復缺失 6 造成的付出與接收失衡，協助你重新校準「愛自己」與「愛他人」之間的神聖平衡。', usage: '將綠色電氣石配戴為貼近心輪的項鍊，或放入上衣左胸口袋（靠近心臟位置）。在感到自我耗盡或過度付出時，觸碰它並對自己說：「我允許宇宙的豐盛也流向我。」' },
    ],
    affirmation: '我值得被愛，我在給予的同時，也慷慨地愛自己。',
  },
  7: {
    number: 7,
    traits: ['直覺管道關閉', '過度依賴邏輯', '頂輪接收器封閉', '理智困境'],
    challenge: '直覺與靈性信任的盲點',
    blindspot: '7 關乎內在智慧、靈性信任與對未知的接納。缺失此能量，你傾向過度依賴大腦邏輯分析，對靈性法則抱持懷疑，難以信任那些「感覺對但說不清楚」的直覺訊號。遇到壓力時，習慣用不斷分析來替代感受，陷入鑽牛角尖的理智困境。頂輪的能量接收器幾乎關閉，讓你即使有靈感浮現也難以接收並相信，容易在外界資訊的洪流中迷失，喪失與自身高我的連結。對孤獨的抗拒也可能讓你逃避那些最能帶來靈魂洞見的靜默時刻。',
    crystalFix: '以下水晶組合專為清理理智體雜訊、重啟直覺管道而設計，協助你與靈魂的深層智慧重新建立連結：',
    crystals: [
      { name: 'Amethyst', nameZh: '紫水晶', color: 'violet', hex: '#a78bfa', energy: '提升直覺與靈性連結，開啟頂輪', chakra: '頂輪・眉心輪', reason: '紫水晶是所有缺失 7 能量的礦石首選，其高頻振動能直接激活幾乎關閉的頂輪接收器，幫助你從「純粹邏輯模式」逐漸過渡到「直覺與邏輯整合」的更高運作狀態。', usage: '每日靜心十分鐘，將紫水晶放於眉心輪（眉心正中），閉眼，放下對分析的執著，只是靜靜感受。若有任何畫面或感受浮現，不加評判地接收並記錄於日記。睡前置於枕旁可加強夢境洞見。' },
      { name: 'Labradorite', nameZh: '拉長石', color: 'blue', hex: '#60a5fa', energy: '喚醒靈性天賦，重建對高我的信任', chakra: '頂輪・眉心輪', reason: '拉長石被稱為「靈性覺醒石」，能有效協助缺失 7 的你重建對直覺的信任，穿透理智的迷霧，讓你開始相信並回應那些來自高我的微弱指引聲音。', usage: '在需要做決策時，握住拉長石，閉眼深呼吸三次，問自己：「排除所有外界因素，我內心深處知道答案是什麼？」靜靜等待第一個浮現的感受，那即是直覺的聲音，無需再分析。' },
      { name: 'Selenite', nameZh: '白透石膏', color: 'white', hex: '#f3f4f6', energy: '深度清理理智體雜訊，淨化頂輪', chakra: '頂輪', reason: '透石膏能清掃頂輪積累的思維雜訊，為缺失 7 的你創造一個清明的靈性接收空間，讓直覺的訊號不再被過度活躍的大腦聲音所淹沒。', usage: '每週進行一次「理智清理儀式」：用透石膏棒在頭頂輕輕順時針畫圈三次，觀想白色光芒清掃腦部的混沌。靜心後，在完全靜默中坐五分鐘，體驗那個沒有思緒的清明狀態。' },
      { name: 'Lapis Lazuli', nameZh: '青金石', color: 'blue', hex: '#1d4ed8', energy: '強化內在智慧與靈性表達', chakra: '眉心輪・喉輪', reason: '青金石連接眉心輪與喉輪，幫助缺失 7 的你不僅接收直覺洞見，還能進一步將這些內在智慧清晰地表達出來，讓你的靈性智慧真正對生命產生影響。', usage: '進行靈性學習或寫作時，將青金石放置於桌前或握在非慣用手中，感受它協助你將深層的靈魂知曉轉化為清晰的文字或言語。可配戴青金石項鍊強化日常的靈性洞察力。' },
    ],
    affirmation: '我信任宇宙的安排，我的直覺是引導我的光。',
  },
  8: {
    number: 8,
    traits: ['豐盛顯化不足', '恐懼金錢與權力', '海底輪動能萎縮', '匱乏信念'],
    challenge: '豐盛與顯化的盲點',
    blindspot: '8 掌管物質權力、豐盛顯化與資源流動。缺乏此數字，在面對金錢、事業或權威時容易感到無力與深層匱乏，即使客觀條件已足夠，仍覺得「永遠不夠多、永遠不夠安全」。潛意識中可能對「有錢有權」抱持負面信念（如「錢會讓人變壞」），主動迴避財富機會。海底輪與太陽神經叢的顯化動能不足，導致好的想法和計劃難以落地為實際財富。在職場上，也容易低估自己的市場價值，長期在不對等的關係中付出超過所得。',
    crystalFix: '以下水晶組合專為激活豐盛顯化能量、清理匱乏信念而設計，搭配使用能顯著提升財富吸引力：',
    crystals: [
      { name: 'Rutilated Quartz', nameZh: '鈦晶', color: 'gold', hex: '#fbbf24', energy: '強力啟動太陽神經叢，吸引豐盛顯化', chakra: '太陽神經叢', reason: '鈦晶是財富顯化能量最強的礦石之一，其金色金針能直接激活缺失 8 所造成的顯化動能不足，快速提升你對財富機會的感知力與吸引力。', usage: '每天清晨握住鈦晶，面向東方或窗外光線，閉眼深呼吸，清晰地設定當天一個具體的豐盛意圖（如「今天我開放地接收意外之財的機會」），感受金黃色光芒充滿太陽神經叢。可配戴於腰帶或右手手鍊增強財富磁場。' },
      { name: 'Citrine', nameZh: '黃水晶', color: 'yellow', hex: '#fde68a', energy: '豐盛顯化能量，溶解匱乏信念', chakra: '太陽神經叢', reason: '黃水晶被稱為「商人石」，能有效溶解缺失 8 帶來的「金錢是負面的」潛意識信念，讓你對豐盛的接收管道重新打開，允許財富自然地流入你的生命。', usage: '將黃水晶放置於家中或辦公室的財位（通常為門口對角線的右後方），或置於收納錢包與財務文件的地方。每次處理金錢事務時，讓黃水晶在旁，感受它持續清理你與財富關係中的障礙。' },
      { name: 'Skeletal Quartz', nameZh: '骨幹水晶', color: 'amber', hex: '#d97706', energy: '古老地球智慧接地，將靈感落實為豐盛', chakra: '海底輪', reason: '骨幹水晶的接地能量是將豐盛「落地」的關鍵——缺失 8 的你往往有想法卻無法執行，骨幹水晶能補足這個「最後一里路」的落實能量。', usage: '在制定財務計劃或商業決策時，握住骨幹水晶進行頭腦風暴，感受它協助你將抽象的豐盛意圖轉化為可執行的具體步驟。可放置於工作區域，持續錨定你的財富顯化能量。' },
    ],
    affirmation: '財富自然流向我，我值得豐盛，我自信地創造成功。',
  },
  9: {
    number: 9,
    traits: ['視野侷限自我', '無法放下執念', '頂輪封閉', '業力印記積累'],
    challenge: '大愛與靈性視野的盲點',
    blindspot: '缺失 9 的能量，容易使視野侷限於個人的短期利益，難以理解更高的宇宙法則或群體意識的運作。寬恕對你而言格外困難——不論是對他人還是對自己——導致大量的心理能量被束縛在過去的創傷、委屈與遺憾中，無法釋放。頂輪的開啟受阻，讓你難以接收宇宙智慧的指引，容易在生命的大局中感到困惑與失向。長期累積的業力印記如沉重包袱，影響當下的關係與決策，卻難以有意識地識別和清理。',
    crystalFix: '以下水晶組合專為擴展意識維度、清理業力印記並開啟頂輪而設計：',
    crystals: [
      { name: 'Clear Quartz', nameZh: '白水晶', color: 'white', hex: '#e5e7eb', energy: '頂輪垂直貫穿，洗滌業力印記', chakra: '頂輪', reason: '白水晶是所有礦石的能量放大器，其純淨頻率能從頂輪向下垂直貫穿，洗滌缺失 9 所積累的業力印記，幫助你以更清明的視角看待生命的課題，不再被過去束縛。', usage: '每月在滿月夜將白水晶置於月光下充電整夜。進行「業力清理冥想」：仰臥，將白水晶放於頭頂，觀想純白光芒從頂輪流遍全身，每次呼氣釋放一個讓你耿耿於懷的舊有執念。' },
      { name: 'Super Seven', nameZh: '超級七', color: 'violet', hex: '#c084fc', energy: '高頻擴展意識，開啟大愛視野', chakra: '全脈輪', reason: '超級七攜帶七種礦石的複合高頻，是擴展缺失 9 意識維度最強大的礦石，能同時激活所有脈輪，協助你突破個人視角的局限，接觸到宇宙大愛的智慧頻率。', usage: '在靜心時握住超級七，閉眼，邀請你的靈性指導靈或高我降臨指引，允許視野超越當下的個人困境，從更高的角度接收關於你靈魂使命的洞見。建議每週進行一次二十分鐘的深度冥想。' },
    ],
    affirmation: '我放下執念，我的靈魂使命在大愛中圓滿實現。',
  },
};

export const lifePathCrystals: Record<number, CrystalInfo[]> = {
  1: [
    { name: 'Sunstone', nameZh: '太陽石', color: 'amber', hex: '#fb923c', energy: '強化領導力與自信', chakra: '太陽神經叢' },
    { name: 'Ruby', nameZh: '紅寶石', color: 'red', hex: '#ef4444', energy: '點燃熱情與勇氣', chakra: '海底輪' },
  ],
  2: [
    { name: 'Moonstone', nameZh: '月光石', color: 'blue', hex: '#bae6fd', energy: '平衡情緒，增強直覺', chakra: '心輪' },
    { name: 'Rose Quartz', nameZh: '粉晶', color: 'rose', hex: '#fda4af', energy: '開啟心輪，帶來愛的能量', chakra: '心輪' },
  ],
  3: [
    { name: 'Citrine', nameZh: '黃水晶', color: 'yellow', hex: '#fbbf24', energy: '激活創意與表達力', chakra: '太陽神經叢' },
    { name: 'Blue Lace Agate', nameZh: '藍紋瑪瑙', color: 'sky', hex: '#7dd3fc', energy: '暢通溝通能量', chakra: '喉輪' },
  ],
  4: [
    { name: 'Obsidian', nameZh: '黑曜石', color: 'gray', hex: '#374151', energy: '接地保護，帶來穩定', chakra: '海底輪' },
    { name: 'Hematite', nameZh: '赤鐵礦', color: 'gray', hex: '#6b7280', energy: '強化意志，增加耐力', chakra: '海底輪' },
  ],
  5: [
    { name: 'Turquoise', nameZh: '土耳其石', color: 'teal', hex: '#5eead4', energy: '保護旅行者，帶來冒險運', chakra: '喉輪' },
    { name: 'Carnelian', nameZh: '紅玉髓', color: 'orange', hex: '#fb923c', energy: '激活創意與行動力', chakra: '臍輪' },
  ],
  6: [
    { name: 'Rose Quartz', nameZh: '粉晶', color: 'rose', hex: '#fda4af', energy: '帶來愛與療癒能量', chakra: '心輪' },
    { name: 'Green Aventurine', nameZh: '綠東陵', color: 'emerald', hex: '#34d399', energy: '帶來幸運與情感療癒', chakra: '心輪' },
  ],
  7: [
    { name: 'Amethyst', nameZh: '紫水晶', color: 'violet', hex: '#a78bfa', energy: '深化直覺與靈性智慧', chakra: '第三眼' },
    { name: 'Labradorite', nameZh: '拉長石', color: 'blue', hex: '#60a5fa', energy: '喚醒靈性天賦', chakra: '頂輪' },
  ],
  8: [
    { name: 'Golden Rutilated Quartz', nameZh: '金髮晶', color: 'gold', hex: '#fbbf24', energy: '吸引財富與成功', chakra: '太陽神經叢' },
    { name: 'Tiger\'s Eye', nameZh: '虎眼石', color: 'amber', hex: '#d97706', energy: '增強商業直覺與財運', chakra: '太陽神經叢' },
  ],
  9: [
    { name: 'Clear Quartz', nameZh: '白水晶', color: 'white', hex: '#e5e7eb', energy: '放大能量，連結宇宙', chakra: '頂輪' },
    { name: 'Amethyst', nameZh: '紫水晶', color: 'violet', hex: '#a78bfa', energy: '深化靈性使命', chakra: '頂輪' },
  ],
  11: [
    { name: 'Selenite', nameZh: '透石膏', color: 'white', hex: '#f3f4f6', energy: '連結天使能量與高我', chakra: '頂輪' },
    { name: 'Labradorite', nameZh: '拉長石', color: 'blue', hex: '#60a5fa', energy: '強化靈性直覺', chakra: '第三眼' },
  ],
  22: [
    { name: 'Lapis Lazuli', nameZh: '青金石', color: 'blue', hex: '#1d4ed8', energy: '連結古老智慧，強化創造力', chakra: '第三眼' },
    { name: 'Malachite', nameZh: '孔雀石', color: 'emerald', hex: '#059669', energy: '帶來轉化與建設能量', chakra: '心輪' },
  ],
  33: [
    { name: 'Rose Quartz', nameZh: '粉晶', color: 'rose', hex: '#fda4af', energy: '傳遞無條件的愛', chakra: '心輪' },
    { name: 'Clear Quartz', nameZh: '白水晶', color: 'white', hex: '#e5e7eb', energy: '放大療癒能量', chakra: '頂輪' },
  ],
};

export interface OracleCard {
  id: string;
  name: string;
  nameEn: string;
  archetype: string;
  element: string;
  elementColor: string;
  message: string;
  shadow: string;
  animalSpirit?: string;
}

export const SHAMANIC_ORACLE_CARDS: OracleCard[] = [
  {
    id: 'wolf',
    name: '狼．領路者',
    nameEn: 'Wolf — The Pathfinder',
    archetype: '領導者・孤獨的智者',
    element: '月亮',
    elementColor: '#bae6fd',
    message: '你被召喚去走一條屬於自己的道路，即使無人同行。狼提醒你：真正的領導不是站在人群前方，而是傾聽靈魂深處的嚎叫，勇敢追隨它。你的直覺正在呼喚你脫離舊有的群體，踏入屬於你靈魂藍圖的荒野。',
    shadow: '對孤獨的恐懼讓你留在不屬於你的群體中，壓抑了真實的本能。',
    animalSpirit: '🐺',
  },
  {
    id: 'eagle',
    name: '鷹．遠見者',
    nameEn: 'Eagle — The Visionary',
    archetype: '先知・大局觀守護者',
    element: '風・太陽',
    elementColor: '#fbbf24',
    message: '鷹賦予你從高空俯瞰全局的視野。此刻你面對的困境，只是更大旅程中的一個轉折點。升高你的視角，你將看見在地面時看不見的出路與契機。宇宙正在為你創造更宏大的版圖。',
    shadow: '執著於細節讓你看不見更大的藍圖，請允許自己抬頭。',
    animalSpirit: '🦅',
  },
  {
    id: 'serpent',
    name: '蛇．蛻變者',
    nameEn: 'Serpent — The Transformer',
    archetype: '療癒師・業力清理者',
    element: '大地・火',
    elementColor: '#6ee7b7',
    message: '蛇的出現意味著一個重要的蛻變週期已經到來。你需要脫去不再適合你的舊皮——無論是信念、關係還是身份認同。這個脫皮的過程雖然不適，卻是通往嶄新自我的唯一通道。',
    shadow: '對改變的抗拒讓舊有的傷口持續積膿，蛻變之痛遠小於停滯之苦。',
    animalSpirit: '🐍',
  },
  {
    id: 'bear',
    name: '熊．內在聖所',
    nameEn: 'Bear — The Inner Sanctum',
    archetype: '療癒者・內省的力量',
    element: '大地・月亮',
    elementColor: '#d97706',
    message: '熊邀請你進入深沉的內在聖所。此刻最重要的修復，不是向外追求，而是像熊冬眠一樣，回到自己內在最深的靜默之處。你需要休息、滋養，以及對自己深沉的疼愛。',
    shadow: '不停的忙碌是一種逃避——你在逃避與自己真實感受的相遇。',
    animalSpirit: '🐻',
  },
  {
    id: 'hummingbird',
    name: '蜂鳥．喜悅的使者',
    nameEn: 'Hummingbird — The Joy Messenger',
    archetype: '療癒師・當下時刻',
    element: '風・花朵',
    elementColor: '#fda4af',
    message: '蜂鳥提醒你：靈魂的旅途不只是使命與課題，更是喜悅的體驗。你是否已經忘記讓自己感到輕盈快樂是什麼感覺？此刻，讓自己追隨任何一個能帶來純粹喜悅的事物，那就是宇宙為你指引的方向。',
    shadow: '對未來的焦慮讓你無法活在當下，錯過了生命最美麗的細節。',
    animalSpirit: '🐦',
  },
  {
    id: 'jaguar',
    name: '美洲豹．黑暗中的力量',
    nameEn: 'Jaguar — Power in Darkness',
    archetype: '薩滿獵手・陰影整合者',
    element: '星際・黑暗',
    elementColor: '#374151',
    message: '美洲豹掌管著黑暗、死亡與重生。它的出現提醒你：你擁有在最黑暗的深淵中看見光的能力。現在你正在面對的陰暗面，正是你最強大力量的藏身之處。擁抱你的陰影，才能整合你的完整性。',
    shadow: '你壓抑和否認的部分，正在以更大的力量從潛意識中爆發。',
    animalSpirit: '🐆',
  },
  {
    id: 'white-buffalo',
    name: '白水牛．神聖豐盛',
    nameEn: 'White Buffalo — Sacred Abundance',
    archetype: '豐盛顯化者・神聖女性',
    element: '大地・神聖',
    elementColor: '#f3f4f6',
    message: '白水牛是北美薩滿傳統中最神聖的豐盛符號。它的降臨代表：你的祈禱已被宇宙聽見，豐盛的能量正在向你流動。請打開你的能量場，帶著感恩與謙遜接收這份宇宙的恩典。',
    shadow: '匱乏的信念系統正在阻擋你本應接收到的豐盛。',
    animalSpirit: '🦬',
  },
  {
    id: 'raven',
    name: '渡鴉．神諭的使者',
    nameEn: 'Raven — Oracle Messenger',
    archetype: '魔法師・薩滿的眼睛',
    element: '風・宇宙',
    elementColor: '#1e293b',
    message: '渡鴉是薩滿世界中傳遞神諭的使者，連結看見與看不見的兩個世界。它的出現意味著一個重要的訊息即將透過夢境、靈感或直覺來到你身邊。請保持高度的覺知，記錄下你的夢境與突發的靈感。',
    shadow: '對理性的過度依賴阻斷了更高維度的訊息抵達你的意識。',
    animalSpirit: '🦅',
  },
  {
    id: 'salmon',
    name: '鮭魚．靈魂溯源',
    nameEn: 'Salmon — Soul Return',
    archetype: '祖先連結者・業力完結者',
    element: '水・火',
    elementColor: '#fb923c',
    message: '鮭魚逆流而上回到出生地的壯闊旅程，象徵著靈魂對本源的回歸。此刻你被召喚去檢視那些根深蒂固的家族業力或童年傷口。回溯才能釋放，釋放才能自由。',
    shadow: '你一直在逃離過去，卻不知道正是那些未解的業力在塑造你的現在。',
    animalSpirit: '🐟',
  },
  {
    id: 'coyote',
    name: '郊狼．神聖的愚者',
    nameEn: 'Coyote — Sacred Trickster',
    archetype: '煉金師・幽默的智者',
    element: '風・火',
    elementColor: '#a16207',
    message: '郊狼是薩滿傳統中的「神聖愚者」，它用幽默和弔詭的方式打破你的執著與固化的思維。生命中某些看似「失敗」或「意外」的事件，其實是宇宙精心設計的課題。請不要太嚴肅地看待自己。',
    shadow: '你的自我認真得快要窒息了，笑看自己的困境才能從中看見智慧。',
    animalSpirit: '🐺',
  },
  {
    id: 'turtle',
    name: '龜．大地之母',
    nameEn: 'Turtle — Mother Earth',
    archetype: '守護者・耐心的智慧',
    element: '大地・水',
    elementColor: '#15803d',
    message: '龜的殼是她的家，也是她的力量。龜提醒你：你所有需要的資源，早已在你之內。不需要向外奔波尋找你以為缺少的東西。此刻放慢腳步，回到腳下這片大地，在此時此刻扎根，智慧自然會浮現。',
    shadow: '你對「不夠快、不夠好」的焦慮，讓你失去了穩定前進的節奏。',
    animalSpirit: '🐢',
  },
  {
    id: 'dragonfly',
    name: '蜻蜓．幻象的揭示者',
    nameEn: 'Dragonfly — Illusion Revealer',
    archetype: '清醒夢者・現實解構者',
    element: '水・光',
    elementColor: '#38bdf8',
    message: '蜻蜓的翅膀能反射七彩光芒，它提醒你：你所看見的現實，可能只是更大真相的一個折射面。此刻，有什麼信念或感知可能是你創造的幻象？穿越表象，直視真相，才是你靈魂此刻的召喚。',
    shadow: '你讓自己相信了一個限制你的故事，而那個故事從來都不是真相的全部。',
    animalSpirit: '🌊',
  },
  {
    id: 'owl',
    name: '貓頭鷹．夜的智慧者',
    nameEn: 'Owl — Keeper of Night Wisdom',
    archetype: '靈視者・深夜的洞察者',
    element: '風・月亮',
    elementColor: '#818cf8',
    message: '貓頭鷹能在最深的黑暗中無聲地看見一切。它的降臨提醒你：此刻你所面對的困惑，不是缺少答案，而是你還沒有準備好進入靜默，聆聽那個早已在你內在等待的真相。關掉外界的喧囂，讓直覺在黑暗中為你指引。',
    shadow: '你假裝自己什麼都看見，卻選擇性地對某些不舒服的真相閉上眼睛。',
    animalSpirit: '🦉',
  },
  {
    id: 'butterfly',
    name: '蝴蝶．蛻變的精靈',
    nameEn: 'Butterfly — Spirit of Metamorphosis',
    archetype: '轉化者・輕盈的靈魂',
    element: '風・花朵',
    elementColor: '#f9a8d4',
    message: '蝴蝶曾是毛毛蟲，在繭中經歷徹底的溶解，才能以全新的形態翱翔。它提醒你：你正在經歷的混亂與不確定，不是終點，而是蛻變的繭。允許舊有的自己徹底瓦解，喜悅的新生正在其中醞釀。',
    shadow: '你渴望改變，卻不願放下讓你感到安全的舊有身份，兩者無法同時並存。',
    animalSpirit: '🦋',
  },
  {
    id: 'horse',
    name: '馬．自由的奔馳者',
    nameEn: 'Horse — The Free Runner',
    archetype: '旅行者・無拘的力量',
    element: '大地・火',
    elementColor: '#f97316',
    message: '馬的精神象徵著最純粹的自由與力量。它的出現提醒你：你靈魂深處有一股被壓抑的力量渴望奔騰。是什麼在束縛你的步伐？那些你允許限制自己的框架，已不再是你的真實。解開韁繩，相信你的力量足以帶你走向任何你渴望的地方。',
    shadow: '你以責任或義務為名，壓制了靈魂最深的自由渴望。',
    animalSpirit: '🐎',
  },
  {
    id: 'deer',
    name: '鹿．溫柔的力量',
    nameEn: 'Deer — The Gentle Power',
    archetype: '慈悲者・寧靜的守護者',
    element: '大地・月亮',
    elementColor: '#86efac',
    message: '鹿以溫柔和優雅穿越森林，它提醒你：真正的力量不需要攻擊性。此刻你所面對的挑戰，需要的不是硬碰硬的對抗，而是以慈悲與溫柔化解。用愛的頻率回應，比任何防禦都更加強大。',
    shadow: '你將溫柔誤解為軟弱，因而在需要輕柔的時刻，反而用盔甲武裝了自己。',
    animalSpirit: '🦌',
  },
  {
    id: 'condor',
    name: '神鷲．天地的橋樑',
    nameEn: 'Condor — Bridge of Heaven and Earth',
    archetype: '神聖使者・高維傳遞者',
    element: '風・太陽',
    elementColor: '#fbbf24',
    message: '在安地斯山脈的薩滿傳統中，神鷲是連結物質界與靈性界的神聖使者。它帶著來自祖先與高維導師的訊息到來。你此刻所感受到的直覺與靈感，不是隨機的念頭，而是宇宙特意為你傳遞的指引，請認真傾聽。',
    shadow: '你對靈感的懷疑與自我審查，讓宇宙的訊息在抵達你之前就被攔截了。',
    animalSpirit: '🦅',
  },
  {
    id: 'dolphin',
    name: '海豚．喜悅的療癒者',
    nameEn: 'Dolphin — The Joyful Healer',
    archetype: '療癒師・水域的智慧者',
    element: '水・光',
    elementColor: '#38bdf8',
    message: '海豚以聲波療癒，以遊戲創造連結。它提醒你：療癒不一定是嚴肅的過程，喜悅本身就是強大的治癒頻率。允許自己玩耍、歌唱、嬉戲。此刻靈魂需要的，是輕鬆喜悅帶來的能量解封。',
    shadow: '你把療癒當成了苦行，忘記了喜悅才是最高頻的療癒工具。',
    animalSpirit: '🐬',
  },
  {
    id: 'otter',
    name: '水獺．豐盛的玩耍者',
    nameEn: 'Otter — The Abundant Player',
    archetype: '創造者・豐盛接收者',
    element: '大地・水',
    elementColor: '#34d399',
    message: '水獺是最善於享受當下豐盛的生物，它從不為明天的食物過度焦慮。它提醒你：豐盛不是努力來的，而是在放鬆與玩耍中流入的。你對成功的緊繃抓取，反而推開了它。放鬆雙手，讓豐盛自然流向你。',
    shadow: '你的焦慮與匱乏感創造了一道牆，阻擋了本應流向你的豐盛。',
    animalSpirit: '🦦',
  },
  {
    id: 'lion',
    name: '獅子．陽性力量',
    nameEn: 'Lion — The Solar Power',
    archetype: '領導者・太陽神的化身',
    element: '大地・火',
    elementColor: '#fbbf24',
    message: '獅子代表太陽般的陽性力量——不是壓迫，而是自然的權威。它的出現提醒你：你擁有成為領導者的力量，但真正的王者不需要通過恐懼來統治，而是以自身的光芒自然地吸引與帶領。此刻，讓你內在的太陽升起吧。',
    shadow: '你壓制了內在的光芒，用謙遜的外衣掩蓋了本應展現的力量。',
    animalSpirit: '🦁',
  },
  {
    id: 'hawk',
    name: '鷹隼．覺察之眼',
    nameEn: 'Hawk — The Eye of Awareness',
    archetype: '觀察者・靈性警醒者',
    element: '風・太陽',
    elementColor: '#fbbf24',
    message: '鷹隼擁有鳥類中最敏銳的視力，能從天空精準鎖定地面的細節。它的出現提醒你：此刻你的覺知需要同時兼具宏觀視野與精準聚焦的能力。有什麼重要的訊號你還沒有注意到？靜下來，讓鷹隼之眼為你打開。',
    shadow: '你看見了，卻選擇假裝沒看見——因為那需要你採取行動。',
    animalSpirit: '🦅',
  },
  {
    id: 'fox',
    name: '狐狸．機智的適應者',
    nameEn: 'Fox — The Clever Adapter',
    archetype: '智謀者・靈活的觀察者',
    element: '風・火',
    elementColor: '#fb923c',
    message: '狐狸以智謀與靈活著稱，它能在任何環境中找到生存之道而不失去本性。此刻宇宙召喚你運用你的智慧與靈活性，在現有的限制中找到創意的出路。問題的解方，往往不在你直覺想到的方向，請從側面觀察。',
    shadow: '你的智謀有時變成了過度算計，讓你錯過了直接、單純的最佳路徑。',
    animalSpirit: '🦊',
  },
  {
    id: 'swan',
    name: '天鵝．優雅的轉化',
    nameEn: 'Swan — The Graceful Transformer',
    archetype: '美的化身・靈魂的優雅',
    element: '水・光',
    elementColor: '#bae6fd',
    message: '天鵝醜小鴨的故事，是靈魂認出自身真實本質的永恆寓言。它提醒你：你一直以為自己是那隻不夠好的醜小鴨，但真相是你本來就是一隻天鵝。此刻是你接受自己真實美麗與價值的時刻。',
    shadow: '你對自我的苛刻批判，阻止了你真正看見並接受自己本有的美與完整性。',
    animalSpirit: '🦢',
  },
  {
    id: 'spider',
    name: '蜘蛛．命運的編織者',
    nameEn: 'Spider — The Fate Weaver',
    archetype: '創造者・業力編織者',
    element: '星際・黑暗',
    elementColor: '#6d28d9',
    message: '在許多原住民傳統中，蜘蛛女神是用思想編織宇宙的創造者。它的出現提醒你：你的每一個念頭和信念，都在編織你的現實之網。此刻，退後一步，審視你正在編織的故事——那是你真心想要的嗎？',
    shadow: '你在無意識中編織了一張恐懼之網，並困在裡面自以為是命運。',
    animalSpirit: '🕷️',
  },
  {
    id: 'crow',
    name: '烏鴉．業力的守門人',
    nameEn: 'Crow — Keeper of Karma',
    archetype: '法則守護者・神聖律法的執行者',
    element: '風・宇宙',
    elementColor: '#1e293b',
    message: '烏鴉是薩滿傳統中業力法則的守護者，它連結過去、現在與未來。它的出現告訴你：你當下所經歷的一切，都是宇宙精確的能量返還。沒有所謂的「不公平」，只有尚未理解的業力課題。接受並從中學習，是唯一的解藥。',
    shadow: '你在怨恨與受害者意識中消耗著本可用於創造的能量。',
    animalSpirit: '🐦‍⬛',
  },
  {
    id: 'frog',
    name: '青蛙．雨水的淨化者',
    nameEn: 'Frog — The Rain Cleanser',
    archetype: '淨化者・新生的催化劑',
    element: '水・火',
    elementColor: '#4ade80',
    message: '在許多薩滿傳統中，青蛙召喚淨化的雨水，帶來清洗與新生。它的出現意味著一個深層的情緒清理與能量排毒的時機已到。允許那些積壓已久的情緒如雨水般流下，清洗過後的大地，才能長出嶄新的綠意。',
    shadow: '你壓抑著需要被釋放的情緒，讓它在內在積累成毒。',
    animalSpirit: '🐸',
  },
  {
    id: 'bat',
    name: '蝙蝠．黑暗中的重生',
    nameEn: 'Bat — Rebirth in Darkness',
    archetype: '死亡與重生的薩滿',
    element: '星際・黑暗',
    elementColor: '#312e81',
    message: '蝙蝠居住在黑暗中，用聲波感知世界，象徵著靈魂死亡與重生的薩滿旅程。它的出現代表一個舊有的自我或生命章節即將走到終點，而另一個更高版本的你正在黑暗中孕育。不要恐懼這個終結，它是重生的必要前提。',
    shadow: '你對「結束」的恐懼讓你死抓著已經死去的事物，阻礙了重生的到來。',
    animalSpirit: '🦇',
  },
  {
    id: 'crane',
    name: '丹頂鶴．長壽的智慧',
    nameEn: 'Crane — Wisdom of Longevity',
    archetype: '長老・優雅的時間守護者',
    element: '風・月亮',
    elementColor: '#f1f5f9',
    message: '丹頂鶴是東方靈性傳統中長壽與高德的象徵，它的一生都在優雅地實踐存在的藝術。它的出現告訴你：此刻你需要的不是更快、更多，而是更深、更精準。像鶴一樣，在行動之前靜靜觀察，一擊必中。',
    shadow: '你在浮躁與急切中，錯過了需要等待與觀察才能看見的最佳時機。',
    animalSpirit: '🕊️',
  },
  {
    id: 'antelope',
    name: '羚羊．神速的行動者',
    nameEn: 'Antelope — The Swift Mover',
    archetype: '行動者・本能的智慧',
    element: '大地・火',
    elementColor: '#fcd34d',
    message: '羚羊靠著閃電般的本能反應在草原上生存，它從不在危險來臨時猶豫不決。它提醒你：你已經知道你需要做什麼了，此刻缺少的只是行動。過度分析與計劃是恐懼的偽裝，信任你的本能，現在就行動。',
    shadow: '你用無止盡的計劃與準備作為推遲行動的藉口，而不是真正的準備。',
    animalSpirit: '🦌',
  },
  {
    id: 'mountain-lion',
    name: '山獅．使命的領導者',
    nameEn: 'Mountain Lion — Leader of Purpose',
    archetype: '領導者・靈魂使命的執行者',
    element: '大地・火',
    elementColor: '#ef4444',
    message: '山獅是山林中的頂級領導者，它不是靠強迫，而是靠著對使命的清晰確知來引領。它提醒你：你已經準備好承擔更大的靈魂使命了。停止等待「完全準備好」的那天，那一天不會來——領導是在行動中學會的。',
    shadow: '對「尚未準備好」的恐懼，讓你逃避了靈魂早已確知你能承擔的責任。',
    animalSpirit: '🐱',
  },
  {
    id: 'peacock',
    name: '孔雀．真實的展現',
    nameEn: 'Peacock — The Authentic Display',
    archetype: '展現者・靈魂美麗的彰顯',
    element: '風・花朵',
    elementColor: '#22d3ee',
    message: '孔雀開屏是宇宙中最美麗的自我展現儀式，它從不因羽毛太豔麗而感到抱歉。它提醒你：你有責任展現你全部的美麗與天賦，收斂你的光是一種對宇宙的不尊重。此刻，讓你的羽毛完全展開，世界需要看見你真實的全貌。',
    shadow: '你用謙遜包裝了你對他人嫉妒的恐懼，以此作為不展現自己的藉口。',
    animalSpirit: '🦚',
  },
  {
    id: 'whale',
    name: '鯨魚．深海的記憶者',
    nameEn: 'Whale — Keeper of Deep Memory',
    archetype: '古老記憶的守護者・宇宙意識',
    element: '大地・月亮',
    elementColor: '#1d4ed8',
    message: '鯨魚攜帶著地球幾千萬年的聲音記憶在深海遨遊。它的出現提醒你：你的靈魂比你以為的更古老，你此生帶來的天賦與智慧，有一部分來自比這一生更久遠的源頭。讓自己沉入深海，那裡有你早已知道的答案。',
    shadow: '你在表面的喧囂中迷失了與靈魂深層記憶的連結，誤以為自己什麼都不知道。',
    animalSpirit: '🐋',
  },
  {
    id: 'scarab',
    name: '聖甲蟲．再生的循環',
    nameEn: 'Scarab — The Cycle of Rebirth',
    archetype: '再生者・神聖循環的守護者',
    element: '大地・神聖',
    elementColor: '#d4af37',
    message: '古埃及薩滿視聖甲蟲為太陽神的化身，象徵從死亡中不斷再生的神聖循環。它的出現告訴你：你正在走到一個業力循環的終點，也是新循環的起點。放下對過去的執著，以感恩之心完成這個章節，迎接太陽的再次升起。',
    shadow: '你還沒有從上一個循環中汲取智慧，就急著進入下一個，讓舊的課題不斷重複。',
    animalSpirit: '🪲',
  },
  {
    id: 'panther',
    name: '黑豹．黑暗中的修煉',
    nameEn: 'Panther — Forged in Darkness',
    archetype: '黑暗修行者・力量的煉金師',
    element: '星際・黑暗',
    elementColor: '#4c1d95',
    message: '黑豹是黑夜的主人，它在人類恐懼的暗處修煉出最強大的力量。它提醒你：此刻你正在經歷的黑暗與試煉，不是懲罰，而是宇宙為你量身設計的淬煉熔爐。你在黑暗中學到的一切，將成為你最不可撼動的力量。',
    shadow: '你把自己的脆弱與黑暗視為羞恥，殊不知那正是你力量最深的來源。',
    animalSpirit: '🐆',
  },
  {
    id: 'elk',
    name: '麋鹿．耐力的行者',
    nameEn: 'Elk — The Endurance Walker',
    archetype: '耐力者・長途旅程的守護者',
    element: '大地・水',
    elementColor: '#84cc16',
    message: '麋鹿能在惡劣的地形中穿越漫長的距離，靠的不是速度而是穩定的耐力。它的出現告訴你：你正在走的這條路，是一場長途旅程，而非短跑。放棄焦急地尋找捷徑，培養深長的耐力，你的靈魂旅程有其神聖的速度。',
    shadow: '你想要的結果比你願意付出的過程更快到來，這種不一致正在消耗你的能量。',
    animalSpirit: '🦌',
  },
  {
    id: 'heron',
    name: '蒼鷺．耐心的等待者',
    nameEn: 'Heron — The Patient One',
    archetype: '冥想者・精準時機的掌握者',
    element: '水・光',
    elementColor: '#94a3b8',
    message: '蒼鷺能在水邊靜靜等待數小時，不動如山，然後在完美的時機精準出擊。它教導你：此刻不是行動的時機，而是深度冥想與等待的時機。強迫事情在還未成熟時發生，只會適得其反。信任時機，讓宇宙的節奏引導你。',
    shadow: '你對「什麼都沒有發生」的不耐煩，讓你在最佳時機到來之前就放棄了。',
    animalSpirit: '🦩',
  },
  {
    id: 'crab',
    name: '螃蟹．保護邊界的守護',
    nameEn: 'Crab — Guardian of Boundaries',
    archetype: '守護者・殼中的智慧',
    element: '水・火',
    elementColor: '#fb923c',
    message: '螃蟹用堅硬的殼保護柔軟的內在，並以側行的方式前進——它提醒你有時候間接的路徑才是最有效的。此刻你需要審視：你的邊界是否健康？你是否在保護你真正需要保護的內在？以及，是否用側面迂迴的方式前進更有智慧？',
    shadow: '你的殼已經成為牢籠而非保護，讓任何真正的連結和愛都無法進入。',
    animalSpirit: '🦀',
  },
  {
    id: 'hawk-moth',
    name: '天蛾．月夜的神諭使者',
    nameEn: 'Hawk Moth — Oracle of the Night',
    archetype: '夢境導航者・潛意識的使者',
    element: '風・月亮',
    elementColor: '#c4b5fd',
    message: '天蛾在月光下飛行，在花朵的深處汲取甜蜜。它的出現提醒你：你最深的答案，藏在你的夢境與潛意識中，而不在白日清醒的分析裡。今晚入睡前，帶著你的問題進入夢境，明日清晨記錄你的夢，神諭在夜晚向你說話。',
    shadow: '你習慣在清醒的邏輯中尋找答案，卻忽視了夢境為你帶來的深層靈性訊息。',
    animalSpirit: '🦋',
  },
  {
    id: 'black-bear',
    name: '黑熊．大地的藥方',
    nameEn: 'Black Bear — Medicine of the Earth',
    archetype: '藥師・大地能量的通道',
    element: '大地・月亮',
    elementColor: '#78716c',
    message: '北美原住民薩滿傳統中，熊是偉大的「藥師」，懂得從大地汲取療癒的能量。它的出現告訴你：答案就在腳下的大地中。此刻你需要的不是更多的靈性追求，而是回到大地、回到身體、回到當下時刻中，讓大地的古老療癒能量在你之內生根。',
    shadow: '你在靈性的高空飛翔，卻與身體和大地母親失去了連結，失根的靈性是危險的。',
    animalSpirit: '🐻',
  },
  {
    id: 'firefly',
    name: '螢火蟲．希望的微光',
    nameEn: 'Firefly — The Light of Hope',
    archetype: '希望的使者・黑暗中的光',
    element: '水・光',
    elementColor: '#fef08a',
    message: '螢火蟲在最深的黑夜中發出光芒，它的存在本身就是一個信念——黑暗永遠終結不了光。它的出現告訴你：即使此刻一切看起來漆黑茫然，你內在那一點微小的光從未熄滅。那個光就是你的靈魂使命，無論外在如何，它永遠在那裡等待你回歸。',
    shadow: '你在黑暗中看著別人的光，卻忘記了自己也攜帶著無需任何外在條件就能點亮的光。',
    animalSpirit: '✨',
  },
];

export function drawOracleCard(): OracleCard {
  return SHAMANIC_ORACLE_CARDS[Math.floor(Math.random() * SHAMANIC_ORACLE_CARDS.length)];
}

export function getDailyEnergy(date: Date, lifePathNumber: number): { energy: string; crystal: string; color: string; message: string } {
  const universalDay = reduceToSingleDigit(
    date.getFullYear() + date.getMonth() + 1 + date.getDate()
  );
  const personalDay = reduceToSingleDigit(universalDay + lifePathNumber);

  const energies = [
    { energy: '新開始能量', crystal: '太陽石', color: '#fb923c', message: '今日適合啟動新計畫，勇敢邁出第一步' },
    { energy: '合作與平衡', crystal: '月光石', color: '#bae6fd', message: '今日適合深化關係，傾聽他人的聲音' },
    { energy: '創意表達', crystal: '海藍寶', color: '#5eead4', message: '今日創意靈感充沛，大膽表達你的想法' },
    { energy: '穩定建設', crystal: '黑曜石', color: '#374151', message: '今日適合紮實工作，打好基礎' },
    { energy: '自由冒險', crystal: '石榴石', color: '#dc2626', message: '今日能量活躍，嘗試新事物帶來驚喜' },
    { energy: '愛與療癒', crystal: '粉晶', color: '#fda4af', message: '今日心輪開啟，給予並接受愛的能量' },
    { energy: '靈性洞察', crystal: '紫水晶', color: '#a78bfa', message: '今日靜心冥想，讓直覺引導你前行' },
    { energy: '豐盛顯化', crystal: '金髮晶', color: '#fbbf24', message: '今日財富能量強勁，設定豐盛意圖' },
    { energy: '圓滿完成', crystal: '白水晶', color: '#e5e7eb', message: '今日適合結束舊循環，為新的開始清場' },
  ];

  return energies[(personalDay - 1) % 9];
}
