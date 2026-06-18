export interface LightworkerCard {
  name: string;
  nameEn?: string;
  keywords: string[];
  cosmicMessage: string;
  currentSituation: string;
  deeperMeaning?: string;
  actionGuidance: string;
  energyHealing?: string;
  soulQuestion?: string;
}

export function generateConciseCardInterpretation(
  position: number,
  card: LightworkerCard
): string {
  const positionContext = {
    1: '你的核心自我正展現',
    2: '你面臨的主要挑戰是',
    3: '你擁有的內在資源是',
    4: '過去的經驗帶來',
    5: '建議你現在',
    6: '你的靈魂使命指向',
    7: '近期你將面對',
    8: '長期成長需要',
    9: '你可以依靠',
    10: '最終你將達成'
  };

  const context = positionContext[position as keyof typeof positionContext];
  const keyword = card.keywords[0];

  const cosmic = card.cosmicMessage.length > 70 ? card.cosmicMessage.substring(0, 65) + '...' : card.cosmicMessage;
  const situation = card.currentSituation.length > 60 ? card.currentSituation.substring(0, 55) + '...' : card.currentSituation;
  const action = card.actionGuidance.length > 50 ? card.actionGuidance.substring(0, 45) + '...' : card.actionGuidance;

  return `${context}「${keyword}」的能量。${card.name}提醒你：${cosmic}在當下，${situation}建議你${action}透過覺察與實踐，讓這份智慧真正整合進入你的生命中，成為內在轉化的力量。`;
}

export function generateSpiritualGrowthInterpretation(
  position: number,
  card: LightworkerCard
): string {
  const positionInsights = {
    1: {
      prefix: '你的核心自我正處於',
      focus: '這張牌揭示你當前靈魂狀態的核心能量。',
      guidance: '高我透過這張牌提醒你：內在覺察是一切轉化的起點。認識自己真實的靈性狀態，才能開啟更深層的覺醒之旅。此刻專注於傾聽內在聲音，觀察能量流動，讓自己與更高意識頻率對齊。'
    },
    2: {
      prefix: '你面臨的核心阻礙是',
      focus: '這張牌指出阻礙你靈性成長的關鍵因素。',
      guidance: '這個課題橫亘在你的靈性道路上，需要你直面並超越。它可能源自深層恐懼、限制性信念，或尚未釋放的過往創傷。覺察到這個阻礙本身就是突破的開始。不要抗拒它，而是帶著慈悲去理解它存在的意義。'
    },
    3: {
      prefix: '你擁有的潛能與資源是',
      focus: '這張牌揭示你可以運用的內在天賦與力量。',
      guidance: '你比自己想像的更有力量。這個潛能一直存在於你之中，只是等待被喚醒與運用。它是你靈魂特質的展現，是你此生帶來的獨特禮物。現在是時候相信自己，勇敢將這份天賦展現出來。'
    },
    4: {
      prefix: '過去的影響在於',
      focus: '這張牌顯示你的生命經驗如何塑造了現在的你。',
      guidance: '過去的經歷無論喜悅或痛苦，都是靈魂成長的養分。這些經驗形成了你的信念系統與行為模式。重要的是，你需要從過去中提取智慧，而非被困在其中。感謝這些經驗帶來的學習，同時允許自己超越它們。'
    },
    5: {
      prefix: '建議你採取的行動是',
      focus: '這張牌提供具體的靈性實踐方向。',
      guidance: '覺醒不僅是理解，更需要行動的實踐。這張牌指引你如何將靈性智慧融入日常生活。透過持續的練習與能量調整，你將逐步提升意識頻率。記住，每一個小小的覺知時刻，都在推動你的靈性進化。'
    },
    6: {
      prefix: '你的靈魂使命指向',
      focus: '這張牌揭示你此生最重要的靈性方向。',
      guidance: '你的靈魂帶著特定目的來到這個世界。這個使命不是外在成就，而是內在的覺醒與整合。它關乎你如何活出真實的自己，如何貢獻你獨特的光。當你與這個使命對齊時，生命將自然展現出意義與和諧。'
    },
    7: {
      prefix: '近期的挑戰將教導你',
      focus: '這張牌顯示即將到來的靈性考驗。',
      guidance: '靈性成長的道路上，挑戰是必經的階段。這個課題即將在你的生活中顯現，它不是懲罰，而是宇宙為你設計的成長機會。面對它時，保持覺察與開放的心。每一個挑戰都是靈魂在呼喚你提升到更高層次。'
    },
    8: {
      prefix: '長期的成長路徑需要',
      focus: '這張牌指出你持續需要面對的深層功課。',
      guidance: '這是一個長期的靈性修煉主題，它會以不同形式在你生命中反覆出現，直到你真正學會並整合這個課題。不要感到沮喪，這是靈魂進化的自然過程。每一次面對這個功課時，你都在更深層次上理解自己。'
    },
    9: {
      prefix: '你可以依靠的支援是',
      focus: '這張牌顯示能協助你成長的外在資源。',
      guidance: '在靈性旅程中，你不是孤單的。宇宙透過各種形式提供支持，可能是特定的人、環境、書籍或靈性社群。保持開放的心去接收這些幫助，同時也要學會分辨什麼才是真正適合你的。'
    },
    10: {
      prefix: '最終的靈性成就將是',
      focus: '這張牌揭示你可能達到的意識狀態。',
      guidance: '這是你在當前階段可以達到的靈性高度，不是終點，而是重要的里程碑。當你整合了前面所有的功課，並持續實踐靈性原則時，你將自然地進化到這個狀態。這個成就將為你的生命帶來深刻轉變。'
    }
  };

  const insight = positionInsights[position as keyof typeof positionInsights];

  return `${insight.prefix}${card.keywords[0]}的能量。${insight.focus}${card.name}代表${card.cosmicMessage.substring(0, 40)}...${insight.guidance}`;
}

export function generateHealingInterpretation(
  position: number,
  card: LightworkerCard
): string {
  const positionHealing = {
    1: '你的情緒中心正在經歷重要的轉化。這張牌顯示你當前情緒體的狀態，以及需要關注的療癒焦點。深入感受這個能量，允許自己誠實地面對內在的情緒波動。療癒始於接納，當你能夠不批判地看見自己的情緒時，轉化就已經開始了。',
    2: '這是一個關鍵的情緒阻塞點。它可能源自未完成的悲傷、壓抑的憤怒或深埋的恐懼。這些情緒能量一直在消耗你的生命力。現在是時候溫柔地接近這些傷痛，給予它們被看見與被釋放的機會。釋放不等於忘記，而是將痛苦轉化為智慧。',
    3: '你擁有強大的自我療癒能力。這張牌揭示你內在的療癒資源，無論是情緒智慧、創造力或與生俱來的復原力。信任你的身體知道如何療癒自己，你的心靈也擁有處理情緒的天生能力。現在需要的是給自己空間與時間，允許這個自然的療癒過程發生。',
    4: '過去的情緒經驗在你的能量場中留下了印記。這些印記可能來自童年創傷、關係傷痛或累積的壓力。它們像是情緒的記憶，在特定情況下會被觸發。覺察這些模式是療癒的第一步。當你理解了它們的來源，就能夠選擇不同的回應方式。',
    5: '具體的療癒行動需要你主動投入。這可能包括情緒書寫、能量療法、專業諮商或身心靈練習。選擇能與你共鳴的方式，並持續實踐。療癒不是一次性的事件，而是一個過程。每一次你選擇面對而非逃避情緒時，你都在為自己創造更多的內在自由。',
    6: '你的情緒療癒與靈魂使命緊密相連。你經歷的痛苦不是無意義的，它們是靈魂成長的催化劑。當你深度療癒自己時，你也在學習如何療癒他人。你的敏感與同理心是禮物，當它們不再被傷痛淹沒時，將成為你服務世界的力量。',
    7: '即將面臨的情緒挑戰需要你的勇氣。可能是某個觸發點會喚起深層的情緒，或是需要面對一直逃避的感受。這不是倒退，而是療癒過程的自然展開。當情緒浮現時，給予它們空間，不要急於壓抑或修正。允許自己感受，這是通往真正釋放的道路。',
    8: '長期的情緒模式需要持續的關注。這可能是反覆出現的情緒反應或根深蒂固的感受方式。真正的療癒需要時間與耐心，每一次你帶著覺察回應而非反應時，你都在重新編程你的情緒系統。慶祝每一個小小的進步，它們累積起來就是深刻的轉變。',
    9: '尋求支持是力量的表現，不是軟弱。這張牌指引你找到能支持你療癒的資源，可能是療癒師、支持團體或療癒性的環境。允許自己接受幫助，你不需要獨自承擔一切。記得，最終的療癒力量來自你的內在，外在支持是輔助你連結這個力量。',
    10: '情緒的整合將帶來內在的和平。當你完成這個階段的療癒工作時，你將體驗到更深的情緒自由與穩定。你不會再被情緒控制，而是能夠帶著覺察與它們共處。這份情緒成熟將轉化你的人際關係與生活品質，你將成為自己最好的療癒者與支持者。'
  };

  return positionHealing[position as keyof typeof positionHealing];
}

export function generateLifePathInterpretation(
  position: number,
  card: LightworkerCard
): string {
  const positionPath = {
    1: '你的人生核心正圍繞著這個主題展開。這張牌揭示你當前生命階段的中心課題與能量頻率。它不僅反映你現在的位置，也指出你需要專注的方向。理解這個核心能量將幫助你做出更符合靈魂藍圖的選擇，讓你的行動與真實使命對齊。',
    2: '你的使命道路上存在這個需要跨越的障礙。它可能表現為外在的限制或內在的自我懷疑。這個挑戰的存在有其深層目的，它在考驗你的決心，同時也在磨練你所需的特質。突破它將為你的人生開啟新的可能性。',
    3: '你擁有實現使命所需的獨特天賦。這張牌顯示你可以開發與運用的能力、資源或機會。這些潛能可能尚未被充分發揮，或是你還沒有意識到它們的價值。現在是時候投資自己，發展這些才華，它們將成為你創造理想人生的基石。',
    4: '你的過去經歷形塑了你看待人生方向的方式。這些經驗可能包括家庭影響、重要的人生轉折或深刻的學習。它們既是你的基礎，也可能是你的限制。重新檢視這些影響，保留有助於成長的部分，釋放阻礙你前進的信念。',
    5: '具體的行動步驟將推動你朝向使命前進。這張牌提供實用的指引，告訴你現在可以做什麼來實現你的人生目標。可能是學習新技能、建立連結、改變習慣或踏出舒適圈。小步驟累積成大改變，從今天就開始採取行動。',
    6: '你的靈魂渴望透過這個方向表達自己。這是你此生最重要的人生主題，是你來到這個世界想要體驗與貢獻的核心。當你的生活與這個使命對齊時，你會感到深刻的滿足與意義。這不是你必須追求的外在成就，而是你需要活出的內在真實。',
    7: '即將到來的機會或考驗將測試你的準備度。這個短期課題會顯現你是否真正準備好踏上你的使命之路。它可能以決定、機會或挑戰的形式出現。保持警覺與彈性，這個時刻將為你帶來重要的洞見與成長。',
    8: '長遠的人生道路需要你培養這些特質。這是一個持續性的發展主題，它會貫穿你生命的多個階段。不要期待快速的結果，而是以馬拉松的心態面對。每一年你都會在這個課題上更加成熟，最終這將成為你最大的優勢與智慧來源。',
    9: '宇宙透過這些管道提供支持。這可能是貴人、機會、資源或是恰好出現的訊息。保持開放與感恩的心，認出生命中的禮物。同時，也要記得互惠，當你能夠給予時，也要慷慨分享。你與世界的連結會帶來意想不到的支持。',
    10: '你的人生使命將結出這樣的果實。這是你堅持走在正道上可能達到的成就與影響。它不一定是世俗意義上的成功，而是靈魂層次的圓滿。想像這個未來的自己，讓這個願景激勵你持續前行，即使道路有時崎嶇不平。'
  };

  return positionPath[position as keyof typeof positionPath];
}

export function generateOverallSpiritualGrowthSummary(cards: (LightworkerCard | null)[]): string {
  const validCards = cards.filter((c): c is LightworkerCard => c !== null);
  if (validCards.length === 0) return '';

  const coreCard = validCards[0];
  const obstacleCard = validCards[1];
  const missionCard = validCards[5];

  return `你的靈性旅程正處於關鍵轉化期。核心牌「${coreCard?.name}」顯示你靈魂當前在${coreCard?.keywords[0]}的能量中運作，而「${obstacleCard?.name}」揭示需要超越的內在阻礙。你的靈魂使命「${missionCard?.name}」指向更高意識層次，邀請你透過覺察與臣服提升振動頻率。這十張牌描繪出從當下困境走向靈性圓滿的道路。關鍵在於接納現在的位置，勇敢面對內在黑暗，同時保持對光的信念，轉化就會自然發生。`;
}

export function generateOverallHealingSummary(cards: (LightworkerCard | null)[]): string {
  const validCards = cards.filter((c): c is LightworkerCard => c !== null);
  if (validCards.length === 0) return '';

  const coreCard = validCards[0];
  const obstacleCard = validCards[1];
  const resourceCard = validCards[2];

  return `你的療癒之旅需要溫柔與勇氣並存。核心能量「${coreCard?.name}」反映你情緒體當前狀態，可能存在需要被看見的傷痛。「${obstacleCard?.name}」指出阻塞的能量中心，這些是長期累積的情緒包袱。值得慶幸的是，「${resourceCard?.name}」顯示你擁有強大的內在療癒資源。療癒不是要你變成另一個人，而是成為更完整的自己。允許自己感受被壓抑的情緒，給予它們空間。透過溫柔面對傷痛，你將釋放困在身體裡的能量，讓生命力重新流動。`;
}

export function generateOverallLifePathSummary(cards: (LightworkerCard | null)[]): string {
  const validCards = cards.filter((c): c is LightworkerCard => c !== null);
  if (validCards.length === 0) return '';

  const coreCard = validCards[0];
  const actionCard = validCards[4];
  const missionCard = validCards[5];
  const outcomeCard = validCards[9];

  return `你的生命藍圖正在逐步顯現。「${coreCard?.name}」作為核心能量，揭示你當前人生階段的主要課題。「${missionCard?.name}」指出你此生最重要的靈魂目的——這不是你要「做」什麼，而是你要「成為」什麼。實踐層面上，「${actionCard?.name}」給出明確的行動指引。最終，「${outcomeCard?.name}」展示當你忠於自己的道路時可能達到的成就。這個牌陣描繪出完整的使命地圖，從你現在的位置到最終活出靈魂的真實呼喚。你的使命是活出最真實的樣貌，當你與內在真理對齊時，你的存在本身就是對世界的服務。`;
}
