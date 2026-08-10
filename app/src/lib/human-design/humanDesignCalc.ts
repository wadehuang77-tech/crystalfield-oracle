// Deterministic Human Design chart calculation from birth data.
// Same input always produces the same chart (no randomness at runtime).

export type HDTypeName =
  | 'generator'
  | 'manifesting-generator'
  | 'projector'
  | 'manifestor'
  | 'reflector';

export type CenterName =
  | 'head'
  | 'ajna'
  | 'throat'
  | 'g'
  | 'heart'
  | 'sacral'
  | 'solar-plexus'
  | 'spleen'
  | 'root';

export interface HDChart {
  type: HDTypeName;
  typeName: string;
  profile: string;
  profileName: string;
  authority: string;
  authorityName: string;
  strategy: string;
  notSelf: string;
  signature: string;
  definedCenters: CenterName[];
  undefinedCenters: CenterName[];
  keyChannels: string[];
  keyGates: number[];
  incarnationCross: string;
  aiIntro: string;
}

// FNV-1a 32-bit hash for stable, deterministic seeding
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
    hash = hash >>> 0;
  }
  return hash;
}

// Xorshift32 PRNG — fast, good distribution, deterministic
function createPRNG(seed: number) {
  let s = seed === 0 ? 1 : seed;
  return (): number => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    s = s >>> 0;
    return s / 0x100000000;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function weightedPick<T>(items: T[], weights: number[], rand: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const ALL_CENTERS: CenterName[] = [
  'head', 'ajna', 'throat', 'g', 'heart',
  'sacral', 'solar-plexus', 'spleen', 'root',
];

const PROFILES = [
  '1/3', '1/4', '2/4', '2/5',
  '3/5', '3/6', '4/6', '4/1',
  '5/1', '5/2', '6/2', '6/3',
];

const CROSSES = [
  '右角十字架：人面獅身', '右角十字架：穿透',
  '右角十字架：計劃', '右角十字架：保護',
  '並列十字架：想像力', '並列十字架：服務',
  '並列十字架：訓誡', '並列十字架：獨處',
  '左角十字架：融合', '左角十字架：業力',
  '左角十字架：革命', '左角十字架：靜默',
];

const CHANNELS = [
  '34-57 力量通道', '20-34 超時通道', '1-8 靈感通道',
  '13-33 足跡通道', '2-14 脈動通道', '5-15 韻律通道',
  '11-56 求知通道', '7-31 阿爾法通道', '36-35 多變通道',
  '19-49 融合通道', '37-40 共同通道', '6-59 親密通道',
  '10-20 警覺通道', '25-51 啟動通道', '28-38 掙扎通道',
  '39-55 情緒通道', '26-44 投降通道', '21-45 貨幣通道',
];

// Type-specific authority options
const AUTHORITIES: Record<HDTypeName, string[]> = {
  'generator': ['sacral', 'emotional', 'splenic'],
  'manifesting-generator': ['sacral', 'emotional', 'splenic'],
  'projector': ['emotional', 'splenic', 'ego', 'self-projected'],
  'manifestor': ['emotional', 'splenic', 'ego'],
  'reflector': ['lunar'],
};

// Center configs per type (definable centers)
const TYPE_CENTER_POOLS: Record<HDTypeName, CenterName[][]> = {
  'generator': [
    ['sacral', 'throat', 'g', 'root'],
    ['sacral', 'solar-plexus', 'spleen', 'root', 'g'],
    ['sacral', 'throat', 'solar-plexus', 'ajna', 'head'],
    ['sacral', 'spleen', 'root', 'g', 'heart'],
  ],
  'manifesting-generator': [
    ['sacral', 'throat', 'g', 'root', 'solar-plexus'],
    ['sacral', 'throat', 'heart', 'g', 'ajna'],
    ['sacral', 'throat', 'spleen', 'root', 'g'],
    ['sacral', 'throat', 'solar-plexus', 'root', 'head'],
  ],
  'projector': [
    ['throat', 'g', 'ajna', 'head'],
    ['solar-plexus', 'spleen', 'g', 'throat'],
    ['heart', 'g', 'throat', 'ajna'],
    ['throat', 'ajna', 'head', 'spleen'],
  ],
  'manifestor': [
    ['throat', 'heart', 'g', 'root'],
    ['throat', 'solar-plexus', 'root', 'spleen'],
    ['throat', 'heart', 'ajna', 'head'],
    ['throat', 'spleen', 'g', 'ajna'],
  ],
  'reflector': [[], [], [], []],
};

const AI_INTROS: Record<HDTypeName, string[]> = {
  'generator': [
    '你的生命力像一座溫暖的泉源，遇見真正有回應的事，能量會自然湧出；不必對所有期待都說好。',
    '你的靈魂透過身體說話。當下腹對一個人或方向亮起來，持續投入會為你帶來深深的滿足。',
    '你來到這裡，不是為了勉強撐住每件事，而是把珍貴的生命力交給真正讓你有感覺的選擇。',
  ],
  'manifesting-generator': [
    '你的靈魂不是直線前進，而是透過好奇、嘗試與轉彎開出新路；先聽身體，再放心展開速度。',
    '你可以同時熱愛很多事。真正重要的不是逼自己專一，而是分辨哪些方向此刻仍讓生命能量發亮。',
    '你帶著快速創造的火花；啟動前的一次身體確認與清楚告知，會讓自由和關係一起順流。',
  ],
  'projector': [
    '你帶著一雙能看見深處的眼睛。當智慧被真正認可與邀請，它能溫柔照亮別人忽略的方向。',
    '你不必靠不停付出證明價值。合適的人會看見你的洞察，而休息會讓這份光保持清澈。',
    '你的靈魂擅長引導而不是硬撐；把能量留給真心邀請你的人，成功感會從被看見中自然生長。',
  ],
  'manifestor': [
    '你帶著開路的火種，能感受到新的開始何時到來。行動前清楚告知，會讓自由與周圍的關係更和諧。',
    '你的靈魂需要自主，也有能力點燃改變。你不用等待所有人同意，只需誠實說明方向並尊重自己的休息。',
    '當內在的啟動感清楚升起，你能替尚未成形的可能打開入口；告知會讓這股力量更平和地被接住。',
  ],
  'reflector': [
    '你像月光下的清澈鏡面，細膩感受人與空間的真實狀態。好的環境會讓你的靈魂展現驚喜與喜悅。',
    '你的開放不是空白，而是能感受生命多種面貌的禮物；重大決定請讓時間與月亮替感受慢慢澄清。',
    '你會映照周圍能量，也需要記得哪些感受只是經過。選擇滋養的場域，是你最重要的靈性照顧。',
  ],
};

export function calculateHDChart(
  birthDate: string,
  birthTime: string,
  birthCity: string
): HDChart {
  const key = `${birthDate}|${birthTime}|${birthCity.toLowerCase().slice(0, 6)}`;
  const seed = fnv1a(key);
  const rand = createPRNG(seed);

  // Type (weighted realistic distribution)
  const typeKey = weightedPick<HDTypeName>(
    ['generator', 'manifesting-generator', 'projector', 'manifestor', 'reflector'],
    [35, 33, 22, 9, 1],
    rand
  );

  // Profile
  const profile = pick(PROFILES, rand);

  // Authority constrained by type
  const authorityKey = pick(AUTHORITIES[typeKey], rand);

  // Defined centers
  const centerPool = TYPE_CENTER_POOLS[typeKey];
  const definedCenters: CenterName[] = typeKey === 'reflector'
    ? []
    : [...pick(centerPool, rand)];

  const undefinedCenters: CenterName[] = ALL_CENTERS.filter(
    c => !definedCenters.includes(c)
  );

  // Key channels (2-4)
  const channelCount = 2 + Math.floor(rand() * 3);
  const shuffled = [...CHANNELS].sort(() => rand() - 0.5);
  const keyChannels = shuffled.slice(0, channelCount);

  // Key gates (4-8)
  const gateSet = new Set<number>();
  while (gateSet.size < 6) {
    gateSet.add(1 + Math.floor(rand() * 64));
  }
  const keyGates = [...gateSet];

  // Incarnation cross
  const incarnationCross = pick(CROSSES, rand);

  // AI intro
  const intro = pick(AI_INTROS[typeKey], rand);

  // Human-readable labels
  const TYPE_NAMES: Record<HDTypeName, string> = {
    'generator': '生產者',
    'manifesting-generator': '顯示生產者',
    'projector': '投射者',
    'manifestor': '顯化者',
    'reflector': '反映者',
  };

  const PROFILE_NAMES: Record<string, string> = {
    '1/3': '研究者 / 殉道者',
    '1/4': '研究者 / 機會主義者',
    '2/4': '隱士 / 機會主義者',
    '2/5': '隱士 / 異端',
    '3/5': '殉道者 / 異端',
    '3/6': '殉道者 / 榜樣',
    '4/6': '機會主義者 / 榜樣',
    '4/1': '機會主義者 / 研究者',
    '5/1': '異端 / 研究者',
    '5/2': '異端 / 隱士',
    '6/2': '榜樣 / 隱士',
    '6/3': '榜樣 / 殉道者',
  };

  const AUTHORITY_NAMES: Record<string, string> = {
    'sacral': '薦骨權威',
    'emotional': '情緒（太陽神經叢）權威',
    'splenic': '脾臟（直覺）權威',
    'ego': '自我（意志力）權威',
    'self-projected': 'G中心（自我投射）權威',
    'lunar': '月亮（無固定）權威',
  };

  const STRATEGIES: Record<HDTypeName, string> = {
    'generator': '等待回應',
    'manifesting-generator': '等待回應，然後告知',
    'projector': '等待邀請',
    'manifestor': '行動前告知',
    'reflector': '等待月亮週期（28天）',
  };

  const NOT_SELF: Record<HDTypeName, string> = {
    'generator': '挫折感',
    'manifesting-generator': '憤怒與挫折',
    'projector': '苦澀感',
    'manifestor': '憤怒感',
    'reflector': '失望感',
  };

  const SIGNATURES: Record<HDTypeName, string> = {
    'generator': '滿足感',
    'manifesting-generator': '滿足與和平',
    'projector': '成功感',
    'manifestor': '和平感',
    'reflector': '驚喜與喜悅',
  };

  return {
    type: typeKey,
    typeName: TYPE_NAMES[typeKey],
    profile,
    profileName: PROFILE_NAMES[profile] ?? profile,
    authority: authorityKey,
    authorityName: AUTHORITY_NAMES[authorityKey] ?? authorityKey,
    strategy: STRATEGIES[typeKey],
    notSelf: NOT_SELF[typeKey],
    signature: SIGNATURES[typeKey],
    definedCenters,
    undefinedCenters,
    keyChannels,
    keyGates,
    incarnationCross,
    aiIntro: intro,
  };
}

export const CENTER_NAMES_ZH: Record<CenterName, string> = {
  head: '頭頂中心',
  ajna: '邏輯中心',
  throat: '喉嚨中心',
  g: 'G 中心（自我認同）',
  heart: '心臟中心（意志力）',
  sacral: '薦骨中心',
  'solar-plexus': '太陽神經叢中心（情緒）',
  spleen: '脾臟中心（直覺）',
  root: '根部中心',
};
