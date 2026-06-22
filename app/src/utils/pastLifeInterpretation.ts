export interface PastLifeCardPosition {
  index: number;
  title: string;
  sectionTitle: string;
  guideText: (cardMeaning: string, godStory?: string) => string;
  emotionalHook?: string;
}

export const pastLifePositions: PastLifeCardPosition[] = [
  {
    index: 0,
    title: '前世身份能量',
    sectionTitle: '🧩 前世身份能量',
    emotionalHook: '你現在遇到的問題，很可能不是從今生開始。',
    guideText: (cardMeaning, godStory) =>
      `${godStory ? `**這位神的故事：**\n${godStory}\n\n` : ''}在某一世，你帶著這樣的能量活著：\n\n${cardMeaning}\n\n你不是天生如此，而是那一世的環境，讓你必須成為那樣的人。你站在某個位置上，承擔著不容退讓的責任。那時候的你，不能軟弱，也不允許自己倒下。`
  },
  {
    index: 1,
    title: '前世關鍵事件',
    sectionTitle: '⚡ 前世關鍵事件',
    emotionalHook: '這張牌顯示，你的靈魂帶著一段尚未完成的故事。',
    guideText: (cardMeaning, godStory) =>
      `${godStory ? `**神話的啟示：**\n${godStory}\n\n就像這位神的故事一樣，` : '那一世，'}發生了一件事：\n\n${cardMeaning}\n\n你面對了一個選擇。你可能選擇了放棄某些東西，或是承擔了不該你一個人背負的重量。有人離開了，有些話沒說出口，有些傷沒來得及癒合。\n\n那段關係，那個承諾，從來沒有真正結束。`
  },
  {
    index: 2,
    title: '帶來的影響',
    sectionTitle: '🌊 帶來的影響',
    guideText: (cardMeaning, godStory) =>
      `${cardMeaning}\n\n那段經歷之後，你開始相信：「我不能再這樣了。」你學會了一種保護自己的方式，可能是冷漠、可能是堅強、可能是逃避。\n\n你把某些感受鎖在心底，告訴自己「這樣比較安全」。你的靈魂記住了那股痛，也記住了「不能再讓這件事發生」。`
  },
  {
    index: 3,
    title: '今生呈現的問題',
    sectionTitle: '🔍 今生呈現的問題',
    guideText: (cardMeaning, godStory) =>
      `所以在今生，你會發現某些情境，讓你莫名地緊張、抗拒、或是無法前進。\n\n${cardMeaning}\n\n明明是新的人、新的關係、新的機會，但你的身體卻記得那股恐懼。你會不自覺地用同一種方式反應，即使理智告訴你「這次不一樣」，但內在有個聲音說：「不行，太危險了。」`
  },
  {
    index: 4,
    title: '重複的模式',
    sectionTitle: '🔄 重複的模式',
    guideText: (cardMeaning, godStory) =>
      `你開始注意到，某些劇情，一再重演。\n\n${cardMeaning}\n\n不同的人，卻說著相似的話。不同的場景，卻有同樣的結局。你以為是運氣不好，但其實是靈魂在試圖讓你「再經歷一次」，希望這次你能做出不同的選擇。\n\n你不是被困住，你是在等自己準備好，走出這個循環。`
  },
  {
    index: 5,
    title: '靈魂要釋放的',
    sectionTitle: '💫 靈魂要釋放的',
    guideText: (cardMeaning, godStory) =>
      `${cardMeaning}\n\n你不是不夠好，而是從未真正為自己而活。你一直在用「那一世的方式」活著，但這一世，你可以有不同的選擇。\n\n你不是放不下，而是那段故事還沒有被理解、被看見、被療癒。這一世，你不需要再證明什麼，不需要再扛著那個不屬於你的重量。\n\n你可以放下了。`
  },
  {
    index: 6,
    title: '解鎖與療癒方式',
    sectionTitle: '🔑 解鎖與療癒方式',
    guideText: (cardMeaning, godStory) =>
      `${cardMeaning}\n\n當你開始允許自己「不一樣」，當你開始對那些熟悉的劇情說「不」，這段能量就會開始鬆動。\n\n但有些影響，藏得很深。它不只在你的記憶裡，而是刻在你的能量場中。我可以幫你進一步做能量調整，清理這些前世殘留的頻率，加速這段因果的釋放。\n\n當能量被真正釋放，你的人生會開始出現不同的選擇，那些曾經卡住你的，會自然地消失。`
  }
];

export function getPastLifePositionGuide(index: number): PastLifeCardPosition {
  if (index >= 0 && index < pastLifePositions.length) {
    return pastLifePositions[index];
  }
  return pastLifePositions[0];
}

export function generatePastLifeReading(cardName: string, cardMeaning: string, positionIndex: number, godStory?: string): string {
  const position = getPastLifePositionGuide(positionIndex);

  const hook = position.emotionalHook ? `${position.emotionalHook}\n\n` : '';
  const guide = position.guideText(cardMeaning, godStory);

  return `${hook}${guide}`;
}
