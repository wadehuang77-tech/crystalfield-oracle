import tzLookup from 'tz-lookup';
import { signJwt, verifyJwt } from './auth';
import {
  badRequest,
  clientIp,
  Env,
  json,
  rateLimit,
  readBody,
  readSession,
  serverError,
  tooManyRequests,
  unauthorized,
} from './utils';

const VEDASTRO_BASE = 'https://api.vedastro.org/api/Calculate';
const CHART_TOKEN_SECONDS = 60 * 60 * 24 * 7;
const FREE_READING_MIN_CHARS = 250;
const VEDIC_REPORT_FORMAT_VERSION = 9;
const VEDIC_FORECAST_YEARS = 5;
const REPORT_SCOPES = [
  'career', 'relationship', 'karma', 'timeline', 'full',
  'soul_karma', 'life_full', 'complete',
] as const;

export type VedicReportScope = typeof REPORT_SCOPES[number];

export interface VedicChartData {
  ayanamsa: 'LAHIRI';
  lagna: string;
  sunSign: string;
  moonSign: string;
  moonNakshatra: string;
  planets: Record<string, string>;
  planetLongitudes: Record<string, number>;
  lagnaLongitude: number;
  divisionalCharts: {
    d9: { lagna: string; planets: Record<string, string> };
    d10: { lagna: string; planets: Record<string, string> };
  };
  mahaDasha: string;
  antarDasha: string | null;
  dashaTimeline: Array<{
    lord: string;
    start: string;
    end: string;
    subPeriods: Array<{ lord: string; start: string; end: string }>;
  }>;
  housePlacements: Record<string, number>;
  houseLords: Record<string, string>;
  karmaAspects: Array<{
    source: 'Rahu' | 'Ketu';
    target: string;
    relationship: 'conjunction' | 'opposition';
  }>;
  timezone: string;
  timezoneOffset: string;
}

export interface VedicFreeResults {
  archetype: { title: string; body: string };
  talents: { title: string; items: string[]; body: string };
  currentCycle: { title: string; body: string };
  challenge: { title: string; body: string };
  nextYear: { title: string; body: string; lockedPrompts: string[] };
}

interface VedicForecastInterpretation {
  consultation: string;
  evidence: VedicEvidence[];
}

interface VedicEvidence {
  factor: string;
  value: string;
  relevance: string;
}

interface InterpretationReason {
  factor: string;
  technicalMeaning: string;
  lifeMeaning: string;
  contribution: string;
}

export interface VedicForecastPeriod {
  id: string;
  mahaDasha: string;
  antarDasha: string;
  startDate: string;
  endDate: string;
  displayLabel: string;
  analysisStartDate?: string;
  analysisEndDate?: string;
  interpretation: VedicForecastInterpretation;
}

interface VedicReportSection {
  heading: string;
  consultation: string;
  evidence: VedicEvidence[];
  timeline?: VedicForecastPeriod[];
}

interface VedicPaidReport {
  formatVersion: number;
  title: string;
  introduction: string;
  sections: VedicReportSection[];
  closing: string;
  consultationQuestion?: string;
}

interface VedAstroEnvelope {
  Status?: string;
  Payload?: unknown;
}

interface StoredChart {
  id: string;
  user_id: string | null;
  chart_json: string;
  free_result_json: string;
  created_at: string;
  expires_at: string;
}

interface PaidOrder {
  id: string;
  user_id: string | null;
  item_id: string;
  item_name: string;
  status: string;
  picks_payload: string | null;
}

const SIGN_ARCHETYPES: Record<string, [string, string]> = {
  Aries: ['開創型引路者', '你的靈魂習慣用行動點燃生命。真正的力量不是永遠衝在最前面，而是辨認什麼值得你率先踏出第一步。'],
  Taurus: ['豐盛型建構者', '你擅長把抽象願景化為穩定、可被信任的成果。當你尊重自己的節奏，資源與安全感會逐步累積。'],
  Gemini: ['訊息型連結者', '你的天賦在於理解、整理與傳遞訊息。好奇心不是分心，而是靈魂探索世界、連結不同觀點的入口。'],
  Cancer: ['守護型療癒者', '你能感受到環境與人的細微變化。當照顧不再等於犧牲，你的敏銳會成為溫柔而堅定的守護力量。'],
  Leo: ['光芒型創造者', '你的生命課題與真誠展現有關。你不是為了取悅所有人而發光，而是要用創造力提醒自己與他人看見內在尊嚴。'],
  Virgo: ['智慧型整合者', '你能看見細節、秩序與改善的可能。當標準不再變成自我苛責，你的精準會化為服務世界的療癒能力。'],
  Libra: ['和諧型協調者', '你天生理解關係中的平衡與多元立場。今生的重要學習，是在照顧彼此之前，也清楚聽見自己的選擇。'],
  Scorpio: ['蛻變型洞察者', '你能深入表象之下，看見情緒、權力與真相。生命的轉折會教你放下控制，將強烈感受轉化為重生力量。'],
  Sagittarius: ['願景型探索者', '你的靈魂渴望意義、遠方與更大的視野。真正的自由不是逃離承諾，而是讓信念與日常行動彼此一致。'],
  Capricorn: ['使命型築夢者', '你帶著承擔、耐力與完成長程目標的能力。當責任不再壓過感受，你能建立既穩固又有靈魂溫度的人生。'],
  Aquarius: ['革新型覺醒者', '你常比周圍的人更早感覺到改變。與眾不同不是隔離，而是邀請你找到同頻社群，將新觀點帶入現實。'],
  Pisces: ['直覺型共感者', '你擁有豐富想像與共感能力。清楚的界線能讓敏感不再成為負擔，而成為藝術、療癒與慈悲的泉源。'],
};

const DASHA_THEMES: Record<string, [string, string]> = {
  Sun: ['自我定位與發光期', '太陽週期要求你重新定義自我、責任與生命中心。適合建立能代表你真正價值的方向，也要留意過度證明自己。'],
  Moon: ['情緒滋養與歸屬期', '月亮週期放大感受、家庭與安全需求。答案常先透過身體和情緒出現，穩定內在比急著做決定更重要。'],
  Mars: ['行動突破與鍛鍊期', '火星週期推動你處理競爭、界線與勇氣。把急躁轉化為聚焦行動，生命會開始快速打開新的路。'],
  Mercury: ['學習溝通與轉向期', '水星週期帶來知識、交流、商業與選擇。保持彈性很重要，但也需要建立清楚優先順序。'],
  Jupiter: ['擴張成長與信念期', '木星正在放大學習、教學、事業與財富機會，同時邀請你重新思考人生方向與長期信念。'],
  Venus: ['關係價值與豐盛期', '金星週期讓感情、美感、合作與資源成為主題。真正的豐盛來自知道自己珍惜什麼，而不是迎合外界標準。'],
  Saturn: ['重整結構與成熟期', '土星週期要求你面對責任、時間與長期承諾。進度或許不快，但正在留下真正穩固、可長久承載你的結構。'],
  Rahu: ['突破邊界與未知擴張期', '羅喉週期帶來強烈渴望、新領域與快速變化。機會與迷霧常同時出現，需要用現實驗證欲望的方向。'],
  Ketu: ['放下舊我與靈魂回收期', '計都週期促使你鬆開熟悉卻耗能的模式。外在成就感可能暫時降低，內在覺察與真正使命則逐漸浮現。'],
};

const ANTAR_DASHA_TRIGGERS: Record<string, {
  event: string; career: string; wealth: string; relationship: string; growth: string; risk: string; action: string;
  scores: { career: number; wealth: number; relationship: number; growth: number };
}> = {
  Sun: { event: '職責、權威與公開定位', career: '承擔能被看見的責任，重新確認職位與決策權。', wealth: '收入較受職位、定價與個人品牌影響。', relationship: '自尊與主導權議題會被放大，需要避免把協商變成輸贏。', growth: '建立不靠外界稱讚也能維持的自我定位。', risk: '為證明能力而承擔過量責任，或與權威正面衝突。', action: '把責任、權限與成果標準寫清楚，再接受新的角色。', scores: { career: 4, wealth: 3, relationship: 2, growth: 4 } },
  Moon: { event: '家庭、居住、情緒安全與照顧責任', career: '工作節奏容易受家庭或情緒狀態影響，適合調整日常安排。', wealth: '支出可能集中在家庭、住居與安全需求，需預留緩衝。', relationship: '親密需求增加，也更容易因缺乏回應而敏感。', growth: '學會辨認短期情緒與長期需要的差別。', risk: '在情緒高點做出永久決定，或過度替家人承擔。', action: '重大決定至少隔一晚，並先確認睡眠、家庭與時間負荷。', scores: { career: 3, wealth: 2, relationship: 4, growth: 4 } },
  Mars: { event: '競爭、執行、衝突與快速推進', career: '適合處理積壓任務、搶進度與需要膽量的工作。', wealth: '可因行動力增加收入，也容易有衝動支出或設備成本。', relationship: '吸引力與摩擦都會升高，界線要直接但不可攻擊。', growth: '把怒氣轉成明確行動，而不是壓抑或爆發。', risk: '急著證明、跳過檢查，造成衝突、損失或返工。', action: '每個高風險行動先列出成本、退出條件與第二方案。', scores: { career: 4, wealth: 3, relationship: 2, growth: 3 } },
  Mercury: { event: '學習、交易、溝通、文件與多重選擇', career: '有利提案、寫作、行銷、教學與流程優化。', wealth: '收入機會可能來自資訊、交易或多元服務，但需防分散。', relationship: '需要把期待說清楚，避免靠猜測維持表面和平。', growth: '練習在蒐集足夠資訊後做出選擇。', risk: '同時開太多計畫、反覆改方向或忽略合約細節。', action: '為每項選擇設定截止日，簽約前逐條確認金額與責任。', scores: { career: 4, wealth: 4, relationship: 3, growth: 3 } },
  Jupiter: { event: '擴張、進修、教學、制度與長期機會', career: '適合擴大專業影響力、考證照或承接更高層級任務。', wealth: '機會與支出可能同步增加，擴張前要先算回收期。', relationship: '更重視價值觀與長期藍圖，適合討論承諾。', growth: '建立能支持未來數年的知識與判斷框架。', risk: '過度樂觀、承諾太多，或把好機會誤當成零風險。', action: '只選一項長期回報最高的擴張計畫並設定里程碑。', scores: { career: 5, wealth: 4, relationship: 4, growth: 5 } },
  Venus: { event: '關係、合作、價值、享受與美感資源', career: '合作、品牌、設計、服務與客戶關係更容易成為機會入口。', wealth: '有利透過合作與價值提升增加收入，也要控制享樂支出。', relationship: '親密與社交機會增加，適合檢查吸引力之外的長期相容性。', growth: '練習在喜歡別人時仍保留自己的價格、時間與底線。', risk: '為維持和諧接受不合理條件，或因人情增加支出。', action: '合作與關係承諾前，先說清楚金額、分工、時間和退出方式。', scores: { career: 4, wealth: 4, relationship: 5, growth: 3 } },
  Saturn: { event: '責任、延遲、制度、考驗與長期建設', career: '責任可能變重，但也是建立流程與不可取代專業的時期。', wealth: '適合降低固定成本、處理負債並穩定累積。', relationship: '時間、承諾和現實分工會接受檢驗。', growth: '接受進度較慢，改用穩定執行建立可信度。', risk: '長期過勞、悲觀，或因害怕失敗而完全不開始。', action: '刪除低效責任，為核心工作設定每週固定投入時段。', scores: { career: 4, wealth: 3, relationship: 2, growth: 5 } },
  Rahu: { event: '新領域、強烈渴望、跨界機會與不確定性', career: '可能接觸新產業、科技、海外或非典型角色，需先小規模驗證。', wealth: '機會波動較大，所有高報酬說法都要用數據和合約確認。', relationship: '容易被不同背景或強烈特質吸引，也可能忽略警訊。', growth: '發展過去不熟悉的能力，同時維持現實檢查。', risk: '因急於翻轉而高估機會、隱瞞風險或追逐表象。', action: '所有新機會先做三十天測試，不在資訊不足時重押資源。', scores: { career: 4, wealth: 3, relationship: 3, growth: 5 } },
  Ketu: { event: '結束、精簡、專注、舊能力與意義重估', career: '適合清除低價值工作、回收專注力並深化已具基礎的能力。', wealth: '收入可能需要重整來源，避免因失去興趣而忽略必要管理。', relationship: '容易需要距離或重新檢視關係意義，溝通不可突然消失。', growth: '辨認哪些熟練模式已經完成任務，哪些仍值得保留。', risk: '抽離過快、失去現實動力，或把疲憊誤認為一切都不重要。', action: '先停止一項低回報承諾，把時間轉給真正需要完成的核心責任。', scores: { career: 2, wealth: 2, relationship: 2, growth: 5 } },
};

const TALENTS_BY_PLANET_SIGN: Record<string, string[]> = {
  Aries: ['開創行動', '快速決策'], Taurus: ['資源累積', '穩定實踐'], Gemini: ['溝通傳播', '跨域學習'],
  Cancer: ['情緒洞察', '照顧支持'], Leo: ['創意表達', '帶領群體'], Virgo: ['分析整理', '細節改善'],
  Libra: ['協調合作', '美感判斷'], Scorpio: ['深度洞察', '危機轉化'], Sagittarius: ['教學啟發', '願景拓展'],
  Capricorn: ['長期規劃', '組織管理'], Aquarius: ['創新思考', '社群連結'], Pisces: ['直覺想像', '療癒共感'],
};

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

const SIGN_LORDS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const PLANET_DIGNITIES: Record<string, { own: string[]; exalted?: string; debilitated?: string }> = {
  Sun: { own: ['Leo'], exalted: 'Aries', debilitated: 'Libra' }, Moon: { own: ['Cancer'], exalted: 'Taurus', debilitated: 'Scorpio' },
  Mars: { own: ['Aries', 'Scorpio'], exalted: 'Capricorn', debilitated: 'Cancer' }, Mercury: { own: ['Gemini', 'Virgo'], exalted: 'Virgo', debilitated: 'Pisces' },
  Jupiter: { own: ['Sagittarius', 'Pisces'], exalted: 'Cancer', debilitated: 'Capricorn' }, Venus: { own: ['Taurus', 'Libra'], exalted: 'Pisces', debilitated: 'Virgo' },
  Saturn: { own: ['Capricorn', 'Aquarius'], exalted: 'Libra', debilitated: 'Aries' },
};

const SIGN_ZH: Record<string, string> = {
  Aries: '牡羊座', Taurus: '金牛座', Gemini: '雙子座', Cancer: '巨蟹座',
  Leo: '獅子座', Virgo: '處女座', Libra: '天秤座', Scorpio: '天蠍座',
  Sagittarius: '射手座', Capricorn: '摩羯座', Aquarius: '水瓶座', Pisces: '雙魚座',
};

const PLANET_ZH: Record<string, string> = {
  Sun: '太陽', Moon: '月亮', Mars: '火星', Mercury: '水星', Jupiter: '木星',
  Venus: '金星', Saturn: '土星', Rahu: '羅喉', Ketu: '計都',
};

const NAKSHATRA_ZH: Record<string, string> = {
  Ashwini: '阿濕毗尼月宿', Bharani: '婆羅尼月宿', Krittika: '基栗底柯月宿', Rohini: '婁西尼月宿',
  Mrigashira: '鹿首月宿', Ardra: '阿陀羅月宿', Punarvasu: '復增月宿', Pushya: '普沙月宿',
  Ashlesha: '阿濕萊沙月宿', Magha: '摩伽月宿', 'Purva Phalguni': '前頗具尼月宿',
  'Uttara Phalguni': '後頗具尼月宿', Hasta: '哈斯塔月宿', Chitra: '質多羅月宿', Swati: '斯瓦提月宿',
  Vishakha: '毗舍佉月宿', Anuradha: '阿奴羅陀月宿', Jyeshtha: '哲逝陀月宿', Mula: '根本月宿',
  'Purva Ashadha': '前阿沙陀月宿', 'Uttara Ashadha': '後阿沙陀月宿', Shravana: '室羅伐拏月宿',
  Dhanishta: '陀尼須陀月宿', Shatabhisha: '百醫月宿', Satabhisha: '百醫月宿',
  'Purva Bhadrapada': '前婆陀羅月宿', 'Uttara Bhadrapada': '後婆陀羅月宿', Revati: '雷瓦蒂月宿',
};

function zhSign(value: string): string {
  return SIGN_ZH[value] || value;
}

function zhPlanet(value: string | null): string {
  return value ? (PLANET_ZH[value] || value) : '';
}

function zhNakshatra(value: string): string {
  const name = value.split(/\s+-\s+|\s+Pada\s+/i)[0].trim();
  const pada = value.match(/Pada\s*(\d+)/i)?.[1];
  return `${NAKSHATRA_ZH[name] || name}${pada ? `，第 ${pada} 分區` : ''}`;
}

function deriveHouseContext(lagna: string, planets: Record<string, string>): Pick<
  VedicChartData,
  'housePlacements' | 'houseLords' | 'karmaAspects'
> {
  const lagnaIndex = SIGNS.indexOf(lagna as typeof SIGNS[number]);
  const housePlacements: Record<string, number> = {};
  const houseLords: Record<string, string> = {};
  if (lagnaIndex < 0) return { housePlacements, houseLords, karmaAspects: [] };

  for (let house = 1; house <= 12; house += 1) {
    const sign = SIGNS[(lagnaIndex + house - 1) % 12];
    houseLords[String(house)] = SIGN_LORDS[sign];
  }
  for (const [planet, sign] of Object.entries(planets)) {
    const signIndex = SIGNS.indexOf(sign as typeof SIGNS[number]);
    if (signIndex >= 0) housePlacements[planet] = ((signIndex - lagnaIndex + 12) % 12) + 1;
  }

  const karmaAspects: VedicChartData['karmaAspects'] = [];
  for (const source of ['Rahu', 'Ketu'] as const) {
    const sourceHouse = housePlacements[source];
    if (!sourceHouse) continue;
    for (const [target, targetHouse] of Object.entries(housePlacements)) {
      if (target === source || target === (source === 'Rahu' ? 'Ketu' : 'Rahu')) continue;
      if (targetHouse === sourceHouse) karmaAspects.push({ source, target, relationship: 'conjunction' });
      if (((targetHouse - sourceHouse + 12) % 12) === 6) karmaAspects.push({ source, target, relationship: 'opposition' });
    }
  }
  return { housePlacements, houseLords, karmaAspects };
}

function hydrateChartData(chart: VedicChartData): VedicChartData {
  const context = deriveHouseContext(chart.lagna, chart.planets);
  return {
    ...chart,
    planetLongitudes: chart.planetLongitudes || {},
    lagnaLongitude: Number.isFinite(chart.lagnaLongitude) ? chart.lagnaLongitude : 0,
    divisionalCharts: chart.divisionalCharts || {
      d9: { lagna: '', planets: {} },
      d10: { lagna: '', planets: {} },
    },
    dashaTimeline: Array.isArray(chart.dashaTimeline) ? chart.dashaTimeline : [],
    housePlacements: chart.housePlacements || context.housePlacements,
    houseLords: chart.houseLords || context.houseLords,
    karmaAspects: Array.isArray(chart.karmaAspects) ? chart.karmaAspects : context.karmaAspects,
  };
}

function publicChartData(chart: VedicChartData): Omit<
  VedicChartData,
  'planetLongitudes' | 'lagnaLongitude' | 'divisionalCharts'
> {
  const { planetLongitudes, lagnaLongitude, divisionalCharts, ...publicChart } = chart;
  void planetLongitudes;
  void lagnaLongitude;
  void divisionalCharts;
  return publicChart;
}

function expandReading(text: string, additions: string[], minChars = FREE_READING_MIN_CHARS): string {
  let expanded = text.trim();
  for (const addition of additions) {
    if (expanded.length >= minChars) break;
    expanded += `\n\n${addition}`;
  }
  return expanded;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.trim().replace(/[<>]/g, '').replace(/^svg(?=[\p{Script=Han}A-Za-z])/iu, '').trim().slice(0, max)
    : '';
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
}

export async function ensureVedicSchema(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS vedic_charts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      chart_json TEXT NOT NULL,
      free_result_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_vedic_charts_user ON vedic_charts(user_id, created_at DESC)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS vedic_reports (
      id TEXT PRIMARY KEY,
      chart_id TEXT NOT NULL,
      order_id TEXT NOT NULL UNIQUE,
      scope TEXT NOT NULL,
      content_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_vedic_reports_chart ON vedic_reports(chart_id, created_at DESC)'),
  ]);
}

function timezoneOffsetAtLocal(date: string, time: string, timezone: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  const offsetAtInstant = (instant: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const localAsUtc = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute), Number(values.second),
    );
    return Math.round((localAsUtc - instant.getTime()) / 60000);
  };

  const first = offsetAtInstant(new Date(wallUtc));
  const second = offsetAtInstant(new Date(wallUtc - first * 60_000));
  const sign = second >= 0 ? '+' : '-';
  const absolute = Math.abs(second);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

function localNow(timezone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function vedicStdTime(date: string, time: string, offset: string): string {
  const [year, month, day] = date.split('-');
  return `${time} ${day}/${month}/${year} ${offset}`;
}

async function vedAstroCall(env: Env, method: string, body: Record<string, unknown>): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.VEDASTRO_API_KEY) headers['x-api-key'] = env.VEDASTRO_API_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${VEDASTRO_BASE}/${method}`, {
      method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`VedAstro ${method} HTTP ${response.status}`);
    const envelope = await response.json() as VedAstroEnvelope;
    if (envelope.Status !== 'Pass') throw new Error(`VedAstro ${method} failed`);
    const payload = envelope.Payload;
    if (payload && typeof payload === 'object' && method in payload) {
      return (payload as Record<string, unknown>)[method];
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function signOnly(value: unknown): string {
  return typeof value === 'string' ? value.split(':')[0].trim() : '';
}

function parsePlanetSigns(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!Array.isArray(value)) return result;
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const planet = cleanText(record.Planet, 20);
    const sign = signOnly(record.AllPlanetRasiSigns);
    if (planet && sign) result[planet] = sign;
  }
  return result;
}

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function signAtLongitude(value: number): string {
  return SIGNS[Math.floor(normalizeLongitude(value) / 30)] || '';
}

function parsePlanetLongitudes(value: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (typeof value !== 'string') return result;
  for (const entry of value.split(',')) {
    const [rawPlanet, rawLongitude] = entry.split('-').map((part) => part.trim());
    const longitude = Number(rawLongitude);
    if (rawPlanet && Number.isFinite(longitude)) result[rawPlanet] = normalizeLongitude(longitude);
  }
  return result;
}

function parseLagnaLongitude(value: unknown): number {
  if (!Array.isArray(value)) return Number.NaN;
  const firstHouse = value.find((row) => row && typeof row === 'object'
    && (row as Record<string, unknown>).House === 'House1') as Record<string, unknown> | undefined;
  const longitude = Number(firstHouse?.Mid);
  return Number.isFinite(longitude) ? normalizeLongitude(longitude) : Number.NaN;
}

function navamshaSign(longitude: number): string {
  const signIndex = Math.floor(normalizeLongitude(longitude) / 30);
  const degreesInSign = normalizeLongitude(longitude) % 30;
  const division = Math.min(8, Math.floor(degreesInSign / (30 / 9)));
  return SIGNS[(signIndex * 9 + division) % 12];
}

function dashamshaSign(longitude: number): string {
  const signIndex = Math.floor(normalizeLongitude(longitude) / 30);
  const degreesInSign = normalizeLongitude(longitude) % 30;
  const division = Math.min(9, Math.floor(degreesInSign / 3));
  const startSign = signIndex % 2 === 0 ? signIndex : (signIndex + 8) % 12;
  return SIGNS[(startSign + division) % 12];
}

function deriveDivisionalCharts(lagnaLongitude: number, planetLongitudes: Record<string, number>) {
  return {
    d9: {
      lagna: navamshaSign(lagnaLongitude),
      planets: Object.fromEntries(Object.entries(planetLongitudes)
        .map(([planet, longitude]) => [planet, navamshaSign(longitude)])),
    },
    d10: {
      lagna: dashamshaSign(lagnaLongitude),
      planets: Object.fromEntries(Object.entries(planetLongitudes)
        .map(([planet, longitude]) => [planet, dashamshaSign(longitude)])),
    },
  };
}

function parseDashaRange(value: unknown): {
  maha: string;
  antar: string | null;
  timeline: VedicChartData['dashaTimeline'];
} {
  if (!value || typeof value !== 'object') return { maha: 'Unknown', antar: null, timeline: [] };
  const periods = Object.entries(value as Record<string, unknown>);
  const first = periods[0];
  if (!first) return { maha: 'Unknown', antar: null, timeline: [] };
  const [maha, firstDetail] = first;
  let antar: string | null = null;
  if (firstDetail && typeof firstDetail === 'object') {
    const sub = (firstDetail as Record<string, unknown>).SubDasas;
    if (sub && typeof sub === 'object') antar = Object.keys(sub as Record<string, unknown>)[0] ?? null;
  }
  const timeline = periods.flatMap(([fallbackLord, raw]) => {
    if (!raw || typeof raw !== 'object') return [];
    const period = raw as Record<string, unknown>;
    const lord = cleanText(period.Lord, 20) || cleanText(fallbackLord, 20);
    const start = cleanText(period.Start, 40);
    const end = cleanText(period.End, 40);
    if (!lord || !start || !end) return [];
    const rawSubs = period.SubDasas;
    const subPeriods = rawSubs && typeof rawSubs === 'object'
      ? Object.entries(rawSubs as Record<string, unknown>).flatMap(([fallbackSubLord, rawSub]) => {
        if (!rawSub || typeof rawSub !== 'object') return [];
        const sub = rawSub as Record<string, unknown>;
        const subLord = cleanText(sub.Lord, 20) || cleanText(fallbackSubLord, 20);
        const subStart = cleanText(sub.Start, 40);
        const subEnd = cleanText(sub.End, 40);
        return subLord && subStart && subEnd ? [{ lord: subLord, start: subStart, end: subEnd }] : [];
      })
      : [];
    return [{ lord, start, end, subPeriods }];
  });
  return { maha, antar, timeline };
}

function deriveFreeResults(chart: VedicChartData): VedicFreeResults {
  const [archetypeTitle, archetypeBody] = SIGN_ARCHETYPES[chart.lagna] ?? SIGN_ARCHETYPES.Pisces;
  const talentSigns = [chart.planets.Mercury, chart.planets.Jupiter, chart.planets.Sun].filter(Boolean);
  const talents = Array.from(new Set(talentSigns.flatMap((sign) => TALENTS_BY_PLANET_SIGN[sign] ?? []))).slice(0, 3);
  const [cycleTitle, cycleBody] = DASHA_THEMES[chart.mahaDasha] ?? ['人生重新定位期', '你正走在重新理解方向與價值的週期。慢下來辨認真正重要的選擇，會比追趕外界進度更有力量。'];
  const rahu = chart.planets.Rahu || '未知';
  const ketu = chart.planets.Ketu || '未知';
  const saturn = chart.planets.Saturn || '未知';
  const currentYear = new Date().getUTCFullYear();
  const talentLabels = talents.length ? talents : ['直覺洞察', '穩定成長', '生命整合'];
  const archetypeBodyDetailed = expandReading(
    `${archetypeBody} 你的上升落在${zhSign(chart.lagna)}，月亮位於${zhSign(chart.moonSign)}的${zhNakshatra(chart.moonNakshatra)}，顯示外在行動與內在感受需要用不同節奏被理解。`,
    [
      `在人際與工作場合中，你可能先以${zhSign(chart.lagna)}的方式回應世界，展現出別人第一眼容易感受到的氣質；但真正需要安全感、休息或做重要決定時，${zhSign(chart.moonSign)}的情緒節奏會更明顯。當外在角色與內在需求不同步，你可能看起來很有方向，心裡卻需要更長時間消化感受。`,
      '這個人格原型不是要把你固定成某一種個性，而是幫助你分辨：哪些反應是自然天賦，哪些是為了適應環境而形成的保護。越能允許自己在不同情境中調整速度，你越不需要用勉強、壓抑或過度證明來換取認同。',
      '實際練習上，可以在每天結束前回想一次：今天哪些時刻讓我感到能量自然流動？哪些時刻讓我明明疲憊卻仍在扮演某種角色？持續記錄會讓你逐漸看懂自己的真實節奏，也更容易建立適合自己的界線與生活方式。',
    ],
  );
  const talentsBodyDetailed = expandReading(
    `水星、木星與太陽的落點顯示，你的核心能力包含${talentLabels.join('、')}。這些天賦需要透過真實經驗被鍛鍊；當你不再用別人的成功方式衡量自己，它們會逐漸形成可被世界看見的價值。`,
    [
      `水星位於${zhSign(chart.planets.Mercury || '未知')}，反映你吸收資訊、思考與表達的方式；木星位於${zhSign(chart.planets.Jupiter || '未知')}，顯示你透過什麼方向擴張視野、建立信念並把經驗傳遞給別人；太陽位於${zhSign(chart.sunSign)}，則提醒你要把能力發展成真正代表自己的創造與選擇。`,
      '天賦並不等於一開始就比別人熟練，它更像是一種反覆召喚你的能力。你可能因為覺得它太自然、太普通而低估它，也可能因為害怕表現不完美而一直停留在準備階段。真正的突破，是願意把天賦放進具體生活，透過作品、服務、溝通或日常決策慢慢累積信任。',
      `你可以先從「${talentLabels[0]}」開始，替自己設定一個能在七天內完成的小行動。完成後觀察：做這件事是否讓你更有精神、是否容易進入專注、別人是否自然向你尋求協助。這些現實回饋會比單純相信標籤，更能幫助你確認真正值得長期培養的方向。`,
    ],
  );
  const currentCycleBodyDetailed = expandReading(
    `${cycleBody}${chart.antarDasha ? ` 目前同時受到${zhPlanet(chart.antarDasha)}次週期影響，近期事件會更集中在這顆行星代表的選擇與學習。` : ''}`,
    [
      `你目前行經${zhPlanet(chart.mahaDasha)}大運，這是一段較長的人生背景能量；次週期則像聚光燈，讓某些關係、工作、內在狀態或現實責任在近期變得更需要被看見。它不是保證某件事情一定發生，而是指出哪些主題較容易成為成長與重新選擇的入口。`,
      '如果最近感到卡住，不必急著把停頓解讀成失敗。行星週期轉換時，舊目標、舊關係或原本熟悉的生活方式，可能暫時失去推動力，目的是讓你重新確認什麼仍值得投入。先整理已經耗能的承諾，再選擇真正符合長期方向的行動，通常比一次做出巨大改變更穩定。',
      '建議你用三個問題觀察這段週期：現在什麼事情正在被放大？哪些模式已經無法用過去的方法處理？我能採取哪一個不違背自身節奏的實際步驟？每隔一個月重新檢視答案，你會更清楚這段大運正在協助你建立什麼，而不是只看見眼前的不確定。',
    ],
  );

  return {
    archetype: {
      title: archetypeTitle,
      body: archetypeBodyDetailed,
    },
    talents: {
      title: '今生最重要的天賦',
      items: talentLabels,
      body: talentsBodyDetailed,
    },
    currentCycle: {
      title: cycleTitle,
      body: currentCycleBodyDetailed,
    },
    challenge: {
      title: '目前最需要突破的課題',
      body: `羅喉位於${zhSign(rahu)}、計都位於${zhSign(ketu)}，顯示靈魂正在離開熟悉卻容易反覆的安全模式，學習走向新的生命能力。土星位於${zhSign(saturn)}，提醒你：眼前的卡點未必是沒有機會，而是舊結構需要被重新整理。`,
    },
    nextYear: {
      title: `${currentYear}–${currentYear + 1} 的重要轉折窗口`,
      body: `未來一年仍以${zhPlanet(chart.mahaDasha)}大運為主軸。當你願意把注意力放回長期方向，而不是只處理眼前焦慮，事業、關係與資源會出現更清楚的轉折訊號。`,
      lockedPrompts: ['哪幾個月份的推進力量最強？', '適合主動擴張，還是先整頓守成？', '財富與關係機會可能從哪裡出現？'],
    },
  };
}

export async function createVedicChart(req: Request, env: Env): Promise<Response> {
  const limit = await rateLimit(env, 'vedic-chart', clientIp(req), env.VEDASTRO_API_KEY ? 12 : 4, 3600);
  if (!limit.allowed) return tooManyRequests(req, env, '印度占星計算過於頻繁，請稍後再試');

  const body = await readBody<{ birth_date?: string; birth_time?: string; birth_place?: string; consent?: boolean }>(req);
  const birthDate = cleanText(body.birth_date, 10);
  const birthTime = cleanText(body.birth_time, 5);
  const birthPlace = cleanText(body.birth_place, 160);
  if (!isDate(birthDate)) return badRequest(req, env, '出生日期格式錯誤');
  if (!isTime(birthTime)) return badRequest(req, env, '請提供正確的出生時間');
  if (birthPlace.length < 2) return badRequest(req, env, '請提供出生城市與國家／地區');
  if (body.consent !== true) return badRequest(req, env, '請先同意為產生星盤而處理出生資料');

  try {
    await ensureVedicSchema(env);
    const geo = await vedAstroCall(env, 'AddressToGeoLocation', { address: birthPlace, Ayanamsa: 'LAHIRI' }) as Record<string, unknown>;
    const latitude = Number(geo?.Latitude);
    const longitude = Number(geo?.Longitude);
    const locationName = cleanText(geo?.Name, 160) || birthPlace;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return badRequest(req, env, '找不到出生地，請輸入「城市, 國家／地區」');

    const timezone = tzLookup(latitude, longitude);
    const timezoneOffset = timezoneOffsetAtLocal(birthDate, birthTime, timezone);
    const birth = {
      StdTime: vedicStdTime(birthDate, birthTime, timezoneOffset),
      Location: { Name: locationName, Latitude: latitude, Longitude: longitude },
    };
    const now = localNow(timezone);
    const nowOffset = timezoneOffsetAtLocal(now.date, now.time, timezone);
    const check = {
      StdTime: vedicStdTime(now.date, now.time, nowOffset),
      Location: birth.Location,
    };
    const rangeEndDate = new Date();
    rangeEndDate.setUTCFullYear(rangeEndDate.getUTCFullYear() + 10);
    const rangeEndLocal = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(rangeEndDate);
    const rangeEndOffset = timezoneOffsetAtLocal(rangeEndLocal, now.time, timezone);
    const rangeEnd = {
      StdTime: vedicStdTime(rangeEndLocal, now.time, rangeEndOffset),
      Location: birth.Location,
    };

    const [planetLongitudeRaw, nakshatraRaw, houseLongitudeRaw, dashaRaw] = await Promise.all([
      vedAstroCall(env, 'AllPlanetLongitude', { time: birth, Ayanamsa: 'LAHIRI' }),
      vedAstroCall(env, 'MoonConstellation', { time: birth, Ayanamsa: 'LAHIRI' }),
      vedAstroCall(env, 'AllHouseLongitudes', { time: birth, Ayanamsa: 'LAHIRI' }),
      vedAstroCall(env, 'DasaAtRange', {
        birthTime: birth,
        startTime: check,
        endTime: rangeEnd,
        levels: 2,
        precisionHours: 168,
        Ayanamsa: 'LAHIRI',
      }),
    ]);

    const planetLongitudes = parsePlanetLongitudes(planetLongitudeRaw);
    const planets = Object.fromEntries(Object.entries(planetLongitudes)
      .map(([planet, longitude]) => [planet, signAtLongitude(longitude)]));
    const lagnaLongitude = parseLagnaLongitude(houseLongitudeRaw);
    const lagna = signAtLongitude(lagnaLongitude);
    const moonNakshatra = cleanText(nakshatraRaw, 80);
    const dasha = parseDashaRange(dashaRaw);
    if (!lagna || !planets.Moon || !planets.Sun || !Number.isFinite(lagnaLongitude) || dasha.maha === 'Unknown') throw new Error('VedAstro response incomplete');

    const houseContext = deriveHouseContext(lagna, planets);
    const chart: VedicChartData = {
      ayanamsa: 'LAHIRI', lagna, sunSign: planets.Sun, moonSign: planets.Moon,
      moonNakshatra, planets, planetLongitudes, lagnaLongitude,
      divisionalCharts: deriveDivisionalCharts(lagnaLongitude, planetLongitudes),
      mahaDasha: dasha.maha, antarDasha: dasha.antar,
      dashaTimeline: dasha.timeline,
      ...houseContext,
      timezone, timezoneOffset,
    };
    const freeResults = deriveFreeResults(chart);
    const id = crypto.randomUUID();
    const user = await readSession(req, env);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CHART_TOKEN_SECONDS * 1000).toISOString();
    await env.DB.prepare(
      `INSERT INTO vedic_charts (id, user_id, chart_json, free_result_json, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, user?.id ?? null, JSON.stringify(chart), JSON.stringify(freeResults), createdAt, expiresAt).run();
    const chartToken = await signJwt({ sub: id, email: 'vedic-chart@crystalfield.local' }, env.JWT_SECRET, CHART_TOKEN_SECONDS);
    return json(req, env, {
      chart_id: id,
      chart_token: chartToken,
      chart: publicChartData(chart),
      free_results: freeResults,
      expires_at: expiresAt,
      calculation: { provider: 'VedAstro', ayanamsa: 'Lahiri' },
    }, { status: 201 });
  } catch (error) {
    return serverError(req, env, error);
  }
}

export async function validateVedicCheckoutContext(
  env: Env,
  chartId: string,
  chartToken: string,
): Promise<boolean> {
  await ensureVedicSchema(env);
  const payload = await verifyJwt(chartToken, env.JWT_SECRET);
  if (payload?.sub !== chartId) return false;
  const chart = await env.DB.prepare('SELECT id FROM vedic_charts WHERE id = ? AND expires_at > ?')
    .bind(chartId, new Date().toISOString()).first<{ id: string }>();
  return !!chart;
}

function extractOpenAiText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const record = data as Record<string, unknown>;
  if (typeof record.output_text === 'string') return record.output_text;
  if (!Array.isArray(record.output)) return '';
  const pieces: string[] = [];
  for (const item of record.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string') {
        pieces.push((part as Record<string, string>).text);
      }
    }
  }
  return pieces.join('\n');
}

const SCOPE_NAMES: Record<VedicReportScope, string> = {
  career: '我的財富與事業', relationship: '我的感情與婚姻', karma: '我的前世業力',
  timeline: '我的未來十年', full: '印度占星完整靈魂業力人生地圖',
  soul_karma: '靈魂業力｜前世因果與今生課題',
  life_full: '人生全解｜使命、感情與財富事業',
  complete: '完整人生地圖｜9 大印度占星深度解析',
};

const REPORT_SECTION_HEADINGS: Record<VedicReportScope, string[]> = {
  career: ['財富來源與天賦', '事業方向與工作模式', '目前阻礙', '行動建議'],
  relationship: ['感情吸引模式', '關係中的靈魂課題', '適合的伴侶特質', '相處與承諾建議'],
  karma: ['你帶著什麼來到今生？', '反覆出現的業力模式', '今生需要完成的轉化'],
  timeline: ['目前人生週期', '未來十年時間軸', '轉換期的準備方向'],
  full: ['前世業力', '今生課題', '感情與關係', '財富與事業', '未來十年', '靈魂總結'],
  soul_karma: ['你帶著什麼來到今生？', '查看你的前世慣性', '查看今生需要完成的業力轉化'],
  life_full: ['前世因果與業力模式', '你的今生核心課題', '感情與關係方向', '財富與事業方向'],
  complete: [
    '① 前世業力',
    '② 今生的人生課題',
    '③ 羅喉／計都靈魂軸線',
    '④ 愛情與婚姻',
    '⑤ 財富模式',
    '⑥ 事業天賦',
    '⑦ D9 婚姻／靈魂成熟度',
    '⑧ D10 事業分盤',
    '⑨ 未來 3～5 年大運時間軸',
  ],
};

const COMPLETE_SECTION_BLUEPRINTS = [
  ['核心舊模式', '為什麼如此熟悉', '過去如何保護你', '現在為何成為限制', '最容易重複的情境', '不改變的代價', '鬆動方法'],
  ['今生主線', '最需要長出的能力', '為何特別困難', '哪些事件會逼你學會', '走對方向的徵兆', '應建立的生活方式'],
  ['人生轉換地圖'],
  ['你真正需要的愛', '容易被誰吸引', '吸引原因', '關係優勢', '最危險模式', '婚後現實問題', '適合伴侶', '不適合伴侶', '改善方式'],
  ['錢從哪裡來', '最適合的賺錢模式', '不適合的模式', '破財位置', '收入上升後的錯誤', '累積策略'],
  ['核心職業天賦', '最有價值的能力', '最適合的角色', '創業或組織', '最大瓶頸', '如何提高身價', '長期方向'],
  ['年輕時的關係模式', '成熟後的需求', '婚姻要學會什麼', '容易失衡的位置', '成熟關係的樣子'],
  ['社會角色', '領導方式', '權力與責任模式', '成就來源', '最容易被低估的能力', '專業定位'],
  ['未來時間軸'],
];

interface VedicTransitSnapshot {
  calculatedAt: string;
  planets: Record<string, string>;
}

async function loadCurrentTransits(env: Env): Promise<VedicTransitSnapshot | null> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 16);
  try {
    const raw = await vedAstroCall(env, 'AllPlanetRasiSigns', {
      time: {
        StdTime: vedicStdTime(date, time, '+00:00'),
        Location: { Name: 'Greenwich', Latitude: 51.4769, Longitude: 0 },
      },
      Ayanamsa: 'LAHIRI',
    });
    const planets = parsePlanetSigns(raw);
    return Object.keys(planets).length ? { calculatedAt: now.toISOString(), planets } : null;
  } catch {
    return null;
  }
}

function karmaFoundation(chart: VedicChartData) {
  const rahuHouse = chart.housePlacements.Rahu;
  const ketuHouse = chart.housePlacements.Ketu;
  const formatAspects = (source: 'Rahu' | 'Ketu') => chart.karmaAspects
    .filter((aspect) => aspect.source === source)
    .map((aspect) => `${zhPlanet(aspect.source)}與${zhPlanet(aspect.target)}${aspect.relationship === 'conjunction' ? '同宮' : '對宮呼應'}`);
  return {
    羅喉: {
      星座: zhSign(chart.planets.Rahu || ''),
      宮位: rahuHouse ? `第${rahuHouse}宮` : '資料不足',
      宮主星: rahuHouse ? zhPlanet(chart.houseLords[String(rahuHouse)]) : '資料不足',
      相關相位: formatAspects('Rahu'),
    },
    計都: {
      星座: zhSign(chart.planets.Ketu || ''),
      宮位: ketuHouse ? `第${ketuHouse}宮` : '資料不足',
      宮主星: ketuHouse ? zhPlanet(chart.houseLords[String(ketuHouse)]) : '資料不足',
      相關相位: formatAspects('Ketu'),
    },
  };
}

function parseDashaDate(value: string): Date | null {
  const text = value.trim();
  const dayFirst = text.match(/(?:^|\s)(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s|$)/);
  if (dayFirst) {
    const date = new Date(Date.UTC(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildVedicForecastPeriods(
  chart: VedicChartData,
  referenceDate = new Date(),
  forecastYears = VEDIC_FORECAST_YEARS,
): Array<Omit<VedicForecastPeriod, 'interpretation'>> {
  const rangeStart = new Date(referenceDate);
  rangeStart.setUTCHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCFullYear(rangeEnd.getUTCFullYear() + forecastYears);
  const mahaCount = chart.dashaTimeline.length;
  const antarCount = chart.dashaTimeline.reduce((sum, period) => sum + period.subPeriods.length, 0);
  if (!mahaCount || !antarCount) {
    console.error('VEDIC_FORECAST_MISSING_ANTARDASHA', { mahaDashaCount: mahaCount, antarDashaCount: antarCount });
    throw new Error('VEDIC_FORECAST_MISSING_ANTARDASHA');
  }

  const periods = chart.dashaTimeline.flatMap((maha) => maha.subPeriods.map((antar) => ({
    mahaDasha: maha.lord,
    antarDasha: antar.lord,
    startDate: antar.start,
    endDate: antar.end,
    start: parseDashaDate(antar.start),
    end: parseDashaDate(antar.end),
  }))).filter((period) => period.start && period.end
    && period.end >= rangeStart && period.start <= rangeEnd)
    .sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));

  if (!periods.length) {
    console.error('VEDIC_FORECAST_MISSING_ANTARDASHA', { mahaDashaCount: mahaCount, antarDashaCount: antarCount, forecastPeriodCount: 0 });
    throw new Error('VEDIC_FORECAST_MISSING_ANTARDASHA');
  }
  return periods.map((period, index) => ({
    id: `period_${index + 1}`,
    mahaDasha: period.mahaDasha,
    antarDasha: period.antarDasha,
    startDate: period.startDate,
    endDate: period.endDate,
    displayLabel: `${zhPlanet(period.mahaDasha)}大運／${zhPlanet(period.antarDasha)}次運`,
    ...(period.start && period.start < rangeStart ? { analysisStartDate: rangeStart.toISOString().slice(0, 10) } : {}),
    ...(period.end && period.end > rangeEnd ? { analysisEndDate: rangeEnd.toISOString().slice(0, 10) } : {}),
  }));
}

function fallbackForecastInterpretation(
  period: Omit<VedicForecastPeriod, 'interpretation'>,
  chart: VedicChartData,
  transits: VedicTransitSnapshot | null,
): VedicForecastInterpretation {
  const mahaTheme = DASHA_THEMES[period.mahaDasha]?.[0] || `${zhPlanet(period.mahaDasha)}長期主題`;
  const antar = ANTAR_DASHA_TRIGGERS[period.antarDasha] || ANTAR_DASHA_TRIGGERS.Saturn;
  const mahaHouse = chart.housePlacements[period.mahaDasha];
  const antarHouse = chart.housePlacements[period.antarDasha];
  const antarSign = chart.planets[period.antarDasha];
  const dignityRule = PLANET_DIGNITIES[period.antarDasha];
  const dignity = dignityRule && antarSign
    ? dignityRule.exalted === antarSign ? '擢升位置，較容易發揮建設性功能'
      : dignityRule.debilitated === antarSign ? '落陷位置，相關能力需要更多現實練習與校正'
        : dignityRule.own.includes(antarSign) ? '守護星座位置，表現通常較直接穩定' : '一般位置，需綜合宮位與宮主判讀'
    : '羅喉計都不採用與七曜完全相同的尊貴度判法';
  const antarLordships = Object.entries(chart.houseLords).filter(([, lord]) => lord === period.antarDasha).map(([house]) => `第${house}宮`);
  const aspects = chart.karmaAspects.filter((aspect) => aspect.target === period.antarDasha)
    .map((aspect) => `${zhPlanet(aspect.source)}與${zhPlanet(aspect.target)}${aspect.relationship === 'conjunction' ? '同宮' : '對宮'}`);
  const whyParts = [
    `${zhPlanet(period.mahaDasha)}大運提供「${mahaTheme}」的長期背景`,
    `${zhPlanet(period.antarDasha)}次運透過${antar.event}把背景轉成具體事件`,
    antarHouse ? `${zhPlanet(period.antarDasha)}本命位於第${antarHouse}宮` : '',
    antarSign ? `${zhPlanet(period.antarDasha)}位於${zhSign(antarSign)}，屬於${dignity}` : '',
    antarLordships.length ? `同時掌管${antarLordships.join('、')}` : '',
    mahaHouse ? `${zhPlanet(period.mahaDasha)}本命位於第${mahaHouse}宮` : '',
    aspects.join('、'),
    transits ? '並以當下重要行運位置校正轉折強度' : '未取得即時行運，因此不判定精確事件時點',
  ].filter(Boolean);
  const label = `${zhPlanet(period.mahaDasha)}／${zhPlanet(period.antarDasha)}`;
  const forecastEvidence = [
    mahaHouse ? legacyEvidence(`${zhPlanet(period.mahaDasha)}宮位：第${mahaHouse}宮`, '大運星所在宮位界定這段長期背景最常落入的生活領域。') : null,
    antarHouse ? legacyEvidence(`${zhPlanet(period.antarDasha)}宮位：第${antarHouse}宮`, '次運星所在宮位決定這個階段較具體的事件入口。') : null,
    antarSign ? legacyEvidence(`${zhPlanet(period.antarDasha)}星座：${zhSign(antarSign)}`, dignity) : null,
    antarLordships.length ? legacyEvidence(`${zhPlanet(period.antarDasha)}宮主：${antarLordships.join('、')}`, '次運同時啟動它掌管的宮位議題。') : null,
  ].filter((item): item is VedicEvidence => !!item);
  return {
    consultation: `這一段真正要處理的，是${antar.event}。${zhPlanet(period.mahaDasha)}大運把人生放在「${mahaTheme}」的長期背景裡，而${zhPlanet(period.antarDasha)}次運會讓它從抽象感受變成具體責任與選擇。工作上，${antar.career} 財務方面，${antar.wealth} 關係裡，${antar.relationship}\n\n這裡最大的風險是${antar.risk}。尤其${zhPlanet(period.antarDasha)}本命位於${antarHouse ? `第${antarHouse}宮` : '目前可確認的位置'}，並${antarLordships.length ? `掌管${antarLordships.join('、')}` : '需要配合現實狀況判讀'}，所以問題通常不會只停在想法，而會落到時間、責任或資源如何分配。${antar.growth}\n\n這段時間最實際的做法是：${antar.action} 不要同時展開太多改變，先選一項三年後仍有價值的方向，寫下投入上限、檢查日期與退出條件，再用實際成果決定是否擴大。`,
    evidence: forecastEvidence.map((item) => ({ ...item, relevance: `${item.relevance} ${whyParts.slice(0, 2).join('；')}。` })),
  };
}

function buildFallbackForecastPeriods(
  skeleton: Array<Omit<VedicForecastPeriod, 'interpretation'>>,
  chart: VedicChartData,
  transits: VedicTransitSnapshot | null,
): VedicForecastPeriod[] {
  return skeleton.map((period) => ({ ...period, interpretation: fallbackForecastInterpretation(period, chart, transits) }));
}

function buildLegacyVedicFallbackSource(
  scope: VedicReportScope,
  chart: VedicChartData,
  transits: VedicTransitSnapshot | null = null,
): any {
  const headings = REPORT_SECTION_HEADINGS[scope];
  const foundation = karmaFoundation(chart);
  const house = (planet: string) => chart.housePlacements[planet] ? `第${chart.housePlacements[planet]}宮` : '宮位資料不足';
  const placement = (planet: string) => `${zhPlanet(planet)}在${zhSign(chart.planets[planet] || '資料不足')}${house(planet)}`;
  const evList = (items: string[], relevance: string) => items
    .filter((item) => item && !item.includes('資料不足'))
    .map((item) => legacyEvidence(item, relevance));
  const evidenceBase = evList(
    [placement('Rahu'), placement('Ketu'), `月宿：${zhNakshatra(chart.moonNakshatra)}`],
    '這三項資料分別指出已熟練的反應、新方向與做決定時的本能節奏；諮詢時必須依各自位置交叉判讀。',
  );
  const forecastSkeleton = scope === 'complete' ? buildVedicForecastPeriods(chart) : [];
  const timeline = scope === 'complete' ? buildFallbackForecastPeriods(forecastSkeleton, chart, transits) : [];
  const section = (heading: string, overrides: Record<string, unknown>): any => ({
    heading,
    conclusion: '此區塊目前使用保守解讀；待 AI 深度分析完成後會依完整配置提供更精細的判讀。',
    strengths: ['能從既有經驗快速找到可行方法', '遇到問題時願意承擔並完成責任'],
    risks: ['壓力大時容易重複使用已經不適合的方法', '可能因熟悉感而忽略新的可行選項'],
    examples: ['工作或關係遇到相似問題時，可能再次扮演同一種角色。', '明知現況不理想，仍可能因不確定性而延後改變。'],
    actions: ['列出目前問題中可控制與不可控制的部分，只處理可控制項目。', '替重大決定設定明確期限與三項判斷標準。', '每月檢查一次實際成果，不以當下情緒代替長期證據。'],
    direction: '選擇能累積實際能力、關係品質與財務安全的方向。',
    evidence: evidenceBase,
    ...overrides,
  });

  const completeSections: any[] = [
    section(headings[0], {
      conclusion: `你最容易重複的舊模式，是過度依賴${foundation.計都.星座}${foundation.計都.宮位}所代表的熟悉做法；它讓你反應快，卻也可能讓同類問題一再出現。`,
      strengths: ['能迅速讀懂熟悉情境並掌握關鍵', '面對壓力時有一套可立即使用的生存方法'],
      risks: ['太相信過去有效的方法，較晚承認環境已經改變', '容易把熟練變成控制，讓別人難以參與'],
      examples: ['工作上可能主動接手善後，久而久之所有難題都落到你身上。', '關係中可能先配合或先處理問題，最後才發現自己的需求一直被延後。'],
      actions: ['同一問題第三次出現時，停止沿用原方法，至少提出兩個新方案。', '承接別人的責任前，先確認期限、權限與回報。', '每季刪除一項只因熟悉而保留、卻沒有成果的承諾。'],
      direction: `保留計都帶來的熟練能力，但把主要投入移向${foundation.羅喉.星座}${foundation.羅喉.宮位}需要發展的新經驗。`,
    }),
    section(headings[1], {
      conclusion: `這一生最需要學會的，是主動發展${foundation.羅喉.星座}${foundation.羅喉.宮位}代表的能力，而不是只做自己已經很熟的事。`,
      strengths: ['具備可立即上手的舊經驗', '能辨認哪些做法穩定、哪些做法只是習慣'],
      risks: ['新方向剛開始不順時，容易快速退回舒適圈', '可能等待完全有把握才行動，因此錯過練習機會'],
      examples: ['遇到新職位或新合作時，可能因不熟悉而低估自己。', '明明想改變生活方式，卻總在忙碌時恢復原本安排。'],
      actions: ['把新能力拆成每週一次、連續十二週的練習。', '選一位能提供具體回饋的人，每月檢查一次進度。', '做決定時分開列出「真的風險」與「只是陌生」。'],
      direction: `今生最值得發展的三項能力：承擔${foundation.羅喉.宮位}議題、練習${foundation.羅喉.星座}式做法、在不確定中以小步驟累積經驗。`,
    }),
    section(headings[2], {
      conclusion: '你的人生轉換不是拋棄舊能力，而是把舊能力改造成能支持新方向的工具。',
      strengths: ['過去累積的方法可作為穩定基礎', '一旦確認方向，能把經驗轉化為可重複的流程'],
      risks: ['過渡期容易兩邊都想保留，導致時間與注意力分散', '可能用準備代替行動，長期停在中間狀態'],
      examples: ['想換工作卻仍接下所有舊任務，使自己沒有時間準備新能力。', '想建立平等關係，遇到衝突時仍自動回到討好或控制。'],
      actions: ['明確列出一項要停止的舊行為與一項要開始的新行為。', '替過渡期設定九十天期限，不無限延後。', '每週用實際行動次數，而非想法或感受，衡量轉換進度。'],
      direction: '先減少舊模式佔用的時間，再把釋放出的資源投入新模式。',
      transition: {
        pastPattern: `過去習慣：依賴${foundation.計都.星座}${foundation.計都.宮位}帶來的熟悉反應。`,
        currentBlock: '現在容易卡住：知道舊方法有限，卻還沒有累積足夠的新經驗。',
        futurePattern: `未來應發展：主動練習${foundation.羅喉.星座}${foundation.羅喉.宮位}所要求的能力。`,
      },
    }),
    section(headings[3], {
      conclusion: `你的感情判讀需要同時看第7宮主${zhPlanet(chart.houseLords['7'])}、金星、木星、月亮與 D9；你重視的不是表面浪漫，而是能否長期合作並處理現實問題。`,
      strengths: ['願意為重要關係投入時間', '能觀察伴侶的實際需要並提供協助'],
      risks: ['可能把照顧、解決問題誤認為親密', '關係不明確時容易自行推測，增加不必要的消耗'],
      examples: ['對方遇到困難時，你可能先幫忙處理，卻沒有確認對方是否願意共同承擔。', '關係進展不明時，可能反覆分析訊息與態度，而不是直接談期待。'],
      actions: ['交往初期直接確認關係目標、金錢觀與生活安排。', '衝突時只談一個具體事件，不翻舊帳或猜測動機。', '重大承諾前至少觀察三個月內對方是否言行一致。'],
      direction: '適合能清楚溝通、願意分工、情緒穩定且尊重個人空間的伴侶；避免只靠承諾、拒絕面對現實責任的人。',
      evidence: evList([`第7宮主：${zhPlanet(chart.houseLords['7'])}`, placement('Venus'), placement('Jupiter'), placement('Moon'), `D9上升：${zhSign(chart.divisionalCharts.d9.lagna || '資料不足')}`], '第7宮、關係行星與D9共同說明吸引模式、相處需求和長期承諾方式。'),
    }),
    section(headings[4], {
      conclusion: '你比較適合靠可累積的專業、長期客戶或能反覆交付的服務賺錢，而不是只追逐短期機會。',
      strengths: ['能把經驗整理成具有交換價值的成果', '有機會透過長期合作放大收入'],
      risks: ['收入增加時可能同步擴張支出', '合作條件不清楚時容易承擔超出報酬的工作'],
      examples: ['接案時可能先把成果做好，最後才談修改次數與追加費用。', '看到新機會時可能同時投入太多項目，造成現金流與注意力分散。'],
      actions: ['每筆收入先固定保留20%作為安全準備，再安排支出。', '報價前寫清楚工作範圍、修改次數、付款節點與退出條件。', '每季依毛利與投入時間淘汰一項低效收入來源。'],
      direction: '優先發展專業服務、固定薪資加績效、內容或方法授權等可持續模式；投資需依風險承受度並諮詢合格專業人士。',
      evidence: evList([`第2宮主：${zhPlanet(chart.houseLords['2'])}`, `第5宮主：${zhPlanet(chart.houseLords['5'])}`, `第9宮主：${zhPlanet(chart.houseLords['9'])}`, `第11宮主：${zhPlanet(chart.houseLords['11'])}`, placement('Jupiter'), placement('Venus')], '收入、累積、機會與收益宮位共同界定較合適的賺錢方式及財務盲點。'),
    }),
    section(headings[5], {
      conclusion: `你的事業優勢來自第10宮主${zhPlanet(chart.houseLords['10'])}與 D10 配置的組合，適合建立可被信任的專業定位，而不是頻繁更換角色。`,
      strengths: ['能處理複雜問題並建立做事標準', '適合把個人能力發展成團隊可使用的方法', '面對長期目標時有持續累積的潛力'],
      risks: ['工作責任容易越接越多，形成過勞', '如果權責模糊，可能變成替主管或團隊收拾問題的人'],
      examples: ['你可能是團隊裡真正知道流程的人，但升遷與資源未必同步增加。', '新工作剛開始容易因想證明能力而答應過多任務。'],
      actions: ['每季整理一次可量化成果，主動用於談升遷、報價或資源。', '接新責任時同步確認決策權、期限與評估標準。', '選一項核心專業連續累積作品、案例或證照至少一年。'],
      direction: '適合重視專業自主、成果可衡量、能持續升級技能的環境；避免長期權責不清、只靠人情分工的組織。',
      evidence: evList([`第10宮主：${zhPlanet(chart.houseLords['10'])}`, `第6宮主：${zhPlanet(chart.houseLords['6'])}`, placement('Mercury'), placement('Jupiter'), placement('Saturn'), placement('Sun'), `D10上升：${zhSign(chart.divisionalCharts.d10.lagna || '資料不足')}`], '本命職涯動機、工作執行方式與D10社會角色共同形成專業定位。'),
    }),
    section(headings[6], {
      conclusion: `D1 與 D9 顯示，年輕時較容易依直覺或熟悉感進入關係；成熟後，你更需要價值觀、責任分配與生活節奏能長期配合。`,
      strengths: ['願意經營長期關係', '能從相處經驗中修正自己的期待'],
      risks: ['可能把忍耐當成承諾', '容易等到問題累積後才說出真正需求'],
      examples: ['剛開始可能被強烈吸引力打動，之後才發現生活方式差異很大。', '穩定交往後可能主動承擔較多日常責任，卻沒有重新協商分工。'],
      actions: ['每月安排一次只討論生活分工、財務與未來計畫的對話。', '出現不滿時在七天內提出具體事件與希望的改變。', '決定長期承諾前，實際討論居住、家庭、金錢與工作安排。'],
      direction: '適合願意共同規劃、能處理衝突且行動穩定的長期伴侶。',
      evidence: evList([`D1上升：${zhSign(chart.lagna)}`, `D9上升：${zhSign(chart.divisionalCharts.d9.lagna || '資料不足')}`, `D9月亮：${zhSign(chart.divisionalCharts.d9.planets.Moon || '資料不足')}`, `D9金星：${zhSign(chart.divisionalCharts.d9.planets.Venus || '資料不足')}`], 'D1描述早期慣性，D9顯示成熟後對關係品質、承諾與生活相容性的要求。'),
    }),
    section(headings[7], {
      conclusion: `D10 顯示你在社會上適合扮演能建立標準、解決問題並對成果負責的角色；職位名稱不是重點，決策權與專業影響力才是。`,
      strengths: ['能把混亂工作整理成流程', '適合承擔需要判斷與整合的任務'],
      risks: ['可能因標準高而難以授權', '在資源不足的環境中容易靠加班補漏洞'],
      examples: ['升任主管後可能仍親自處理大量細節，團隊因此難以成長。', '組織方向不明時，你可能自行建立規則，卻沒有取得正式授權。'],
      actions: ['把重複工作寫成流程並交由他人執行，自己保留關鍵判斷。', '每半年選一項能提高市場價值的能力進行系統訓練。', '評估創業前先驗證客源、毛利與六個月現金流，不只看熱情。'],
      direction: '適合先在能累積資源與案例的組織發展，再依客源與現金流決定是否創業。',
      evidence: evList([`D1第10宮主：${zhPlanet(chart.houseLords['10'])}`, `D10上升：${zhSign(chart.divisionalCharts.d10.lagna || '資料不足')}`, `D10太陽：${zhSign(chart.divisionalCharts.d10.planets.Sun || '資料不足')}`, `D10土星：${zhSign(chart.divisionalCharts.d10.planets.Saturn || '資料不足')}`, `目前大運：${zhPlanet(chart.mahaDasha)}`], 'D1第10宮顯示職涯核心動機，D10與大運顯示它在社會角色中的實際表現。'),
    }),
    section(headings[8], {
      conclusion: `未來三至五年的判讀以${zhPlanet(chart.mahaDasha)}大運及實際次週期為主；不同階段的重點不同，應依時間窗口調整投入，而非把所有計畫同時展開。`,
      strengths: ['能提前辨認需要準備與擴張的階段', '可以把長期目標拆成不同年度任務'],
      risks: ['把有利期理解成不用準備也會成功', '在整理期急著擴張，增加財務與工作壓力'],
      examples: ['事業機會增加時，如果作品與資源尚未準備好，可能忙碌卻沒有留下成果。', '關係議題變多時，若同時做重大財務決策，容易互相干擾。'],
      actions: ['依時間軸為每個階段只設定一項主要目標。', '進入新次週期前三個月完成現金、能力與關係承諾盤點。', '每季用實際數據修正計畫，不因單次事件改變全部方向。'],
      direction: '整理期先收斂與補強，轉換期小規模測試，較有利的擴張期再增加資源。',
      evidence: evList([`目前大運：${zhPlanet(chart.mahaDasha)}`, `目前次週期：${zhPlanet(chart.antarDasha) || '資料不足'}`, transits ? '重要行運：已納入當下行運位置' : ''], '大運提供長期背景，次運決定具體事件入口；行運只用於校正轉折強度。'),
      timeline,
    }),
  ];

  const sections = scope === 'complete'
    ? completeSections.map((item, index) => {
      const evidence = item.evidence.filter((entry: VedicEvidence) => entry.factor && entry.value && entry.relevance && !entry.value.includes('資料不足'));
      const sectionContent: string[][] = [
        [item.strengths[0], item.strengths[1], item.actions[0], item.risks[0], item.examples[0], item.risks[1], item.actions[1]],
        [item.direction, item.actions[0], item.risks[0], item.examples[0], item.strengths[0], item.actions[1]],
        [item.transition?.pastPattern || item.strengths[0]],
        [
          '你真正需要的是能共同承擔現實、願意把期待說清楚，也尊重彼此空間的關係。',
          '你容易被需要協助、願意接受照顧，或在相處初期讓你感覺自己很有價值的人吸引。',
          item.examples[0], item.strengths[0], item.risks[0], item.risks[1],
          '適合能清楚溝通、願意分工、情緒穩定且尊重個人空間的伴侶。',
          '不適合只靠口頭承諾、逃避現實責任、過度依賴或拒絕溝通的伴侶。',
          item.actions.join('；'),
        ],
        [item.strengths[0], item.direction, `不適合依賴條件不清的合作、短期投機或同時分散太多收入來源；${item.risks[1]}`, item.examples[0], item.risks[0], item.actions.join('；')],
        [item.strengths[0], item.strengths[1], item.direction, item.examples[0], item.risks[0], item.actions[0], item.actions[1]],
        [item.examples[0], item.direction, item.actions[0], item.risks[0], item.strengths[0]],
        [item.direction, item.strengths[0], item.examples[0], item.strengths[1], item.risks[0], item.actions[0]],
        [item.conclusion],
      ];
      const confidence = deterministicConfidence(evidence, {
        hasDivisional: index === 3 || index === 5 || index === 6 || index === 7,
        hasDasha: index === 7 || index === 8,
        hasTransit: index === 8 && !!transits,
      });
      const reasoningBasis = evidence.slice(0, 5).map((entry: VedicEvidence) => ({
        factor: entry.factor,
        technicalMeaning: entry.value,
        lifeMeaning: entry.relevance,
        contribution: `${entry.relevance}因此本段結論不是單看單一星體，而是以此配置與其他證據交叉判斷。`,
      }));
      return {
        ...item,
        evidence,
        analysisBlocks: COMPLETE_SECTION_BLUEPRINTS[index].map((label, blockIndex) => ({ label, content: sectionContent[index][blockIndex] || item.direction })),
        ...(index === 0 ? { depth: { surface: item.examples[0], deeperCause: reasoningBasis.map((reason: InterpretationReason) => reason.lifeMeaning).slice(0, 2).join('；'), unchangedCost: item.risks[0] } } : {}),
        ...([0, 3, 5, 7].includes(index) && evidence.length >= 3 ? { coreTension: {
          sideA: item.strengths[0], sideB: item.risks[0], astrologicalBasis: evidence.slice(0, 3).map((entry: VedicEvidence) => `${entry.factor}：${entry.value}`),
          lifeEffect: item.examples[0], integration: item.actions[0],
        } } : {}),
        reasoningBasis,
        adjustments: item.actions.map((action: string, actionIndex: number) => ({
          problem: item.risks[actionIndex % item.risks.length], astrologicalCause: evidence[actionIndex % Math.max(evidence.length, 1)]?.relevance || '目前可用星盤指標',
          realLifeEffect: item.examples[actionIndex % item.examples.length], action,
        })),
        confidence: confidence.level,
        confidenceReason: confidence.reason,
        ...(index === 6 ? { d9Evolution: {
          earlyPattern: item.examples[0], maturePattern: item.direction,
          transition: item.actions[0], relationshipLesson: item.actions[1],
        } } : {}),
        ...(index === 7 ? { d10Comparison: {
          natalCareerTheme: item.strengths[0], professionalExpression: item.direction,
          alignment: 'mixed' as const, interpretation: item.examples[0],
        } } : {}),
      };
    })
    : headings.map((heading) => section(heading, {
      conclusion: `${heading}的重點需要結合你的上升${zhSign(chart.lagna)}、月亮${zhSign(chart.moonSign)}與目前${zhPlanet(chart.mahaDasha)}大運判讀。`,
    }));
  return {
    formatVersion: VEDIC_REPORT_FORMAT_VERSION,
    title: SCOPE_NAMES[scope],
    introduction: `你的上升為${zhSign(chart.lagna)}、月亮位於${zhSign(chart.moonSign)}，目前行經${zhPlanet(chart.mahaDasha)}大運。以下先說人話與現實表現，再列出星盤依據。`,
    sections,
    closing: '這份報告提供可檢查、可執行的方向，但不取代醫療、法律、投資或心理專業意見。重大決定仍應結合現實資料與合格專業建議。',
  };
}

export function buildVedicFallbackReport(
  scope: VedicReportScope,
  chart: VedicChartData,
  transits: VedicTransitSnapshot | null = null,
): VedicPaidReport {
  const source = buildLegacyVedicFallbackSource(scope, chart, transits);
  const connect = (item: any, index: number) => {
    const scene = item.examples?.[0] || '';
    const gift = item.strengths?.[0] || '';
    const blindSpot = item.risks?.[0] || '';
    const nextStep = item.actions?.[0] || '';
    const variants = [
      `你反覆遇到的問題，通常不是能力不足，而是太快使用一套已經非常熟悉的生存方式。${item.conclusion} ${gift}，正是這張盤給你的本事；但同一項本事用得太快，就會變成${blindSpot}。${scene}\n\n真正要停止的不是這份能力，而是「事情一出現就自動接手」的反應。${nextStep} ${item.direction}`,
      `${item.conclusion} 這件事難，不是因為你完全不會，而是新的方向不會立刻給你熟悉感。你原本的優勢是${gift}，可是它也會讓你在不確定時退回舊方法。生活裡常像這樣：${scene}\n\n接下來不要等到完全有把握。${nextStep} ${item.actions?.[1] || ''} 你要累積的是新方向的實際證據，而不是更多準備感。`,
      `這一區真正要回答的不是羅喉或計都各自代表什麼，而是你怎麼離開舊模式。${item.transition?.pastPattern || item.conclusion} ${item.transition?.currentBlock || blindSpot} ${item.transition?.futurePattern || item.direction}\n\n轉換不能只靠想通。${nextStep} ${item.actions?.[1] || ''} 對你而言，真正的進步會表現在舊反應出現時，你能否做出一次不同的選擇。`,
      `你的感情盲點不是不願意付出，而是有時太快把「替對方處理問題」當成親密。${item.conclusion} ${scene} 久了最容易形成你負責維持關係、對方只需要回應的失衡。\n\n你適合的不是只會表達喜歡的人，而是願意共同分工、談金錢與生活安排，也能為自己的問題負責的人。${nextStep} ${item.actions?.[1] || ''} 關係能不能走長久，要看對方持續做了什麼，而不是一時說了什麼。`,
      `你不是沒有賺錢能力，真正要處理的是如何把成果留下來。${item.conclusion} ${gift}，但${blindSpot}。${scene}\n\n因此你要看的不是哪個機會最熱，而是哪一種收入能在不持續增加工時的情況下累積。${nextStep} ${item.actions?.[1] || ''} 當收入增加時，先提高保留比例與議價標準，再考慮放大支出。`,
      `別人真正願意為你付錢的，不只是執行速度，而是你能看見問題、整理方法並把事情做到可交付。${item.conclusion} ${scene} 如果長期只替團隊善後，你的能力會被需要，卻不一定被正確定價。\n\n${nextStep} ${item.actions?.[1] || ''} 你的下一階段不是再證明自己能做更多，而是把最強的判斷能力變成職稱、權限、案例與價格。`,
      `年輕時，你比較容易依熟悉感、吸引力或當下互動進入關係；成熟後，你會越來越在意兩個人能不能真正一起生活。${item.conclusion} ${scene}\n\nD1顯示的是早期自然反應，D9則把關係帶向成熟後的選擇。${nextStep} ${item.direction} 對你來說，感情成熟不是感覺變少，而是不再用感覺掩蓋責任分配與長期相容性。`,
      `你內心想做的工作，和社會真正願意交給你的角色不一定完全相同。${item.conclusion} ${gift}，但${blindSpot}。${scene}\n\nD1第10宮說明你為何想工作，D10則顯示你進入組織與市場後如何建立影響力。${nextStep} ${item.actions?.[1] || ''} 真正的升級，是把能處理難題的能力轉成制度、帶人方式與清楚的專業定位。`,
      `${item.conclusion} 這份時間軸不是把每一年硬貼上吉凶標籤，而是用大運看長期背景，再用次運判斷眼前哪個生活領域會被具體啟動。你現在最容易吃虧的地方，是把所有想做的事同時推進，結果每一項都只做到應付，沒有留下能累積的成果。\n\n閱讀下方各時段時，先找出當期唯一優先事項，再把資金、時間與承諾集中於它。每逢次運切換前，盤點未完成責任、現金緩衝與關係安排；新階段先做小規模測試，看到真實回饋後再擴張。這樣才能把時間資訊轉成決策工具，而不是把預測當成保證。`,
    ];
    return variants[index] || `${item.conclusion}\n\n${scene}\n\n${nextStep}`;
  };
  return {
    formatVersion: VEDIC_REPORT_FORMAT_VERSION,
    title: source.title,
    introduction: '這份報告不從術語開始，而是先回答：你現在真正卡在哪裡，這張命盤能提供什麼可執行的解決方法。',
    sections: source.sections.map((item: any, index: number) => ({
      heading: REPORT_SECTION_HEADINGS[scope][index],
      consultation: connect(item, index),
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      ...(index === 8 && item.timeline ? { timeline: item.timeline } : {}),
    })),
    closing: '命盤呈現的是較容易重複的模式與可發展方向，不是不可改變的判決。真正有價值的部分，是把看懂的問題轉成下一個可以執行的選擇。',
  };
}

function cleanTextList(value: unknown, maxItems: number, maxChars = 600): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => cleanText(item, maxChars))
    .filter((item) => item && !/^[-–—*•·]+$/.test(item));
}

function cleanEvidenceList(value: unknown, maxItems = 12): VedicEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const evidence = {
      factor: cleanText(row.factor, 160),
      value: cleanText(row.value, 300),
      relevance: cleanText(row.relevance, 800),
    };
    return Object.values(evidence).every(Boolean) ? [evidence] : [];
  });
}

function legacyEvidence(value: string, relevance: string): VedicEvidence {
  const [factor, ...rest] = value.split(/[：:]/);
  return { factor: factor || '星盤配置', value: rest.join('：') || value, relevance };
}

function deterministicConfidence(
  evidence: VedicEvidence[],
  options: { hasDivisional?: boolean; hasDasha?: boolean; hasTransit?: boolean } = {},
): { level: 'low' | 'medium' | 'high'; reason: string } {
  const layers = [evidence.length > 0, options.hasDivisional === true, options.hasDasha === true, options.hasTransit === true]
    .filter(Boolean).length;
  const independentFactors = new Set(evidence.map((item) => item.factor)).size;
  if (layers >= 3 && independentFactors >= 3) return { level: 'high', reason: `${independentFactors} 項主要配置，且至少 3 個判讀層次方向一致` };
  if (layers >= 2 && independentFactors >= 2) return { level: 'medium', reason: `${independentFactors} 項獨立配置、至少 2 個判讀層次方向一致` };
  return { level: 'low', reason: '目前只有 1 個主要判讀層次，結論採保守表述' };
}

function cleanObjectList(value: unknown, fields: string[], maxItems = 10): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const cleaned = Object.fromEntries(fields.map((field) => [field, cleanText(row[field], 1200)]));
    return Object.values(cleaned).every(Boolean) ? [cleaned] : [];
  });
}

function parseOpportunityScore(value: unknown): number | null {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
}

function parseForecastDomain(value: unknown): { trend: string; advice: string[]; avoid: string[] } | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const trend = cleanText(row.trend, 1000);
  const advice = cleanTextList(row.advice, 3, 500);
  const avoid = cleanTextList(row.avoid, 3, 500);
  return trend && advice.length >= 1 && avoid.length >= 1 ? { trend, advice, avoid } : null;
}

function mergeLegacyVedicForecastInterpretations(
  skeleton: Array<Omit<VedicForecastPeriod, 'interpretation'>>,
  value: unknown,
  chart?: VedicChartData,
  transits: VedicTransitSnapshot | null = null,
): any[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('VEDIC_FORECAST_AI_INCOMPLETE');
  const rows = value as Record<string, unknown>;
  const expectedIds = new Set(skeleton.map((period) => period.id));
  if (Object.keys(rows).length !== skeleton.length || Object.keys(rows).some((id) => !expectedIds.has(id))) {
    throw new Error('VEDIC_FORECAST_AI_INCOMPLETE');
  }
  return skeleton.map((period) => {
    const raw = rows[period.id];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('VEDIC_FORECAST_AI_INCOMPLETE');
    const row = raw as Record<string, unknown>;
    const career = parseForecastDomain(row.career);
    const wealth = parseForecastDomain(row.wealth);
    const relationship = parseForecastDomain(row.relationship);
    const growthRow = row.growth && typeof row.growth === 'object' ? row.growth as Record<string, unknown> : {};
    const scoresRow = row.opportunityScores && typeof row.opportunityScores === 'object'
      ? row.opportunityScores as Record<string, unknown> : {};
    const scores = {
      career: parseOpportunityScore(scoresRow.career), wealth: parseOpportunityScore(scoresRow.wealth),
      relationship: parseOpportunityScore(scoresRow.relationship), growth: parseOpportunityScore(scoresRow.growth),
    };
    const turningRow = row.turningPoint && typeof row.turningPoint === 'object' ? row.turningPoint as Record<string, unknown> : {};
    const expectedStart = parseDashaDate(period.analysisStartDate || period.startDate);
    const expectedEnd = parseDashaDate(period.analysisEndDate || period.endDate);
    const expectedYears = expectedStart && expectedEnd
      ? Array.from({ length: expectedEnd.getUTCFullYear() - expectedStart.getUTCFullYear() + 1 }, (_, index) => expectedStart.getUTCFullYear() + index) : [];
    const annualRows = Array.isArray(row.annualFocus) ? row.annualFocus : [];
    const annualFocus = expectedYears.map((year) => {
      const match = annualRows.find((entry) => entry && typeof entry === 'object' && Number((entry as Record<string, unknown>).year) === year) as Record<string, unknown> | undefined;
      return { year, priority: cleanText(match?.priority, 500), why: cleanText(match?.why, 800) };
    });
    const confidenceEvidence = chart ? [period.mahaDasha, period.antarDasha].flatMap((planet) => {
      const planetHouse = chart.housePlacements[planet];
      const sign = chart.planets[planet];
      return planetHouse && sign ? [{ factor: planet, value: `${sign}／第${planetHouse}宮`, relevance: '大運或次運星的本命位置' }] : [];
    }) : [];
    const confidence = deterministicConfidence(confidenceEvidence, { hasDasha: true, hasTransit: !!transits });
    const interpretation = {
      theme: cleanText(row.theme, 500), overall: cleanText(row.overall, 1200),
      career, wealth, relationship,
      growth: { trend: cleanText(growthRow.trend, 1000) },
      opportunityScores: scores,
      turningPoint: { isImportant: turningRow.isImportant === true, reason: cleanText(turningRow.reason, 1000) },
      annualFocus,
      confidence: confidence.level,
      confidenceReason: confidence.reason,
      why: cleanText(row.why, 1500), keyMessage: cleanText(row.keyMessage, 700),
    };
    if (!interpretation.theme || !interpretation.overall || !career || !wealth || !relationship
      || !interpretation.growth.trend || !interpretation.why || !interpretation.keyMessage
      || !interpretation.turningPoint.reason
      || annualFocus.length !== expectedYears.length || annualFocus.some((item) => !item.priority || !item.why)
      || Object.values(scores).some((score) => score === null)) {
      throw new Error('VEDIC_FORECAST_AI_INCOMPLETE');
    }
    return {
      ...period,
      interpretation: interpretation as any,
    };
  });
}

export function mergeVedicForecastInterpretations(
  skeleton: Array<Omit<VedicForecastPeriod, 'interpretation'>>,
  value: unknown,
  chart?: VedicChartData,
  transits: VedicTransitSnapshot | null = null,
): VedicForecastPeriod[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('VEDIC_FORECAST_AI_INCOMPLETE');
  const rows = value as Record<string, unknown>;
  const expectedIds = new Set(skeleton.map((period) => period.id));
  if (Object.keys(rows).length !== skeleton.length || Object.keys(rows).some((id) => !expectedIds.has(id))) {
    throw new Error('VEDIC_FORECAST_AI_INCOMPLETE');
  }
  return skeleton.map((period) => {
    const raw = rows[period.id];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('VEDIC_FORECAST_AI_INCOMPLETE');
    const row = raw as Record<string, unknown>;
    const consultation = cleanText(row.consultation, 6000);
    if (consultation.length < 180 || !chart) throw new Error('VEDIC_FORECAST_AI_INCOMPLETE');
    const evidence = fallbackForecastInterpretation(period, chart, transits).evidence;
    return { ...period, interpretation: { consultation, evidence } };
  });
}

function normalizeForDuplicateCheck(value: string): string {
  return value.replace(/[\s，。！？、；：：「」『』（）()]/g, '').toLowerCase();
}

function sentenceSimilarity(a: string, b: string): number {
  const grams = (value: string) => {
    const normalized = normalizeForDuplicateCheck(value);
    return new Set(Array.from({ length: Math.max(0, normalized.length - 1) }, (_, index) => normalized.slice(index, index + 2)));
  };
  const left = grams(a);
  const right = grams(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((item) => right.has(item)).length;
  return intersection / (left.size + right.size - intersection);
}

function reportHasDuplicateSentences(sections: any[]): boolean {
  const consultationTexts = sections.flatMap((section) => [
    section.consultation,
    ...(section.timeline || []).map((period: VedicForecastPeriod) => period.interpretation.consultation),
  ]).filter((value): value is string => typeof value === 'string' && value.length >= 40)
    .flatMap((value) => value.split(/[。！？\n]+/).map((sentence) => sentence.trim()).filter((sentence) => traditionalChineseLength(sentence) >= 24));
  for (let left = 0; left < consultationTexts.length; left += 1) {
    for (let right = left + 1; right < consultationTexts.length; right += 1) {
      if (normalizeForDuplicateCheck(consultationTexts[left]) === normalizeForDuplicateCheck(consultationTexts[right])) return true;
      if (sentenceSimilarity(consultationTexts[left], consultationTexts[right]) >= 0.9) return true;
    }
  }
  return false;
}

const GENERIC_VEDIC_PHRASES = [
  '相信自己', '提升覺察', '學習放下', '宇宙正在提醒你', '靈魂邀請你',
  '能量正在轉換', '開啟新的可能', '成為更完整的自己',
];

function traditionalChineseLength(value: string): number {
  return (value.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
}

function consultationQualityIssues(value: string, minimumChineseLength: number, maximumChineseLength: number, kind: 'section' | 'period' = 'section'): string[] {
  const text = value.trim();
  const length = traditionalChineseLength(text);
  const issues: string[] = [];
  if (length < minimumChineseLength) issues.push('too_short');
  if (length > maximumChineseLength) issues.push('too_long');
  const requirements = [
    { name: 'deep_problem', pattern: /真正|核心|問題不是|表面.+(?:其實|而是)|最深/ },
    { name: 'unexpected_cause', pattern: /因為|源自|背後|安全感|確認自己|之所以|根源/ },
    { name: 'real_scenarios', pattern: /例如|工作上|關係裡|感情中|合作時|收入|伴侶|主管|客戶/ },
    { name: 'wrong_decision', pattern: /最容易做錯|最容易誤判|最容易吃虧|不該|風險|代價/ },
    { name: 'executable_solution', pattern: /先.{0,30}(?:確認|寫下|設定|區分)|具體|每次|下一次|期限|比例|條件|步驟/ },
    ...(kind === 'section' ? [
      { name: 'talent_shadow', pattern: /天賦|優勢|擅長|能力.{0,35}(?:過度|代價|反而|卻)|越.{0,18}越/ },
      { name: 'mature_outcome', pattern: /成熟|處理好|轉化後|最後你會|不再.+而是|真正走對/ },
    ] : []),
  ];
  for (const requirement of requirements) if (!requirement.pattern.test(text)) issues.push(requirement.name);
  if (GENERIC_VEDIC_PHRASES.filter((phrase) => text.includes(phrase)).length >= 2) issues.push('generic_language');
  return issues;
}

function validStructuredSection(section: any, index: number): boolean {
  const consultation = typeof section.consultation === 'string' ? section.consultation.trim() : '';
  const evidence = Array.isArray(section.evidence) ? section.evidence : [];
  if (!consultation || consultation.length < 180 || evidence.length < 2
    || evidence.some((item: VedicEvidence) => !item?.factor || !item?.value || !item?.relevance)) return false;
  if (index === 8) return Array.isArray(section.timeline) && section.timeline.length > 0
    && section.timeline.every((period: VedicForecastPeriod) => period.id && period.startDate && period.endDate
      && period.interpretation.consultation.length >= 180 && period.interpretation.evidence.length >= 2);
  return true;
}

function consultationHasDepth(value: string, minimumLength: number, kind: 'section' | 'period' = 'section'): boolean {
  const maximumLength = kind === 'period' ? 600 : 1100;
  return consultationQualityIssues(value, minimumLength, maximumLength, kind).length === 0;
}

export function validateCompleteVedicReport(report: VedicPaidReport): boolean {
  return report.formatVersion === VEDIC_REPORT_FORMAT_VERSION
    && report.sections.length === REPORT_SECTION_HEADINGS.complete.length
    && report.sections.every((section, index) => section.heading === REPORT_SECTION_HEADINGS.complete[index]
      && validStructuredSection(section, index))
    && report.sections.slice(0, 8).every((section) => {
      const length = traditionalChineseLength(section.consultation);
      return length >= 650 && length <= 1100
        && GENERIC_VEDIC_PHRASES.filter((phrase) => section.consultation.includes(phrase)).length < 2;
    })
    && (report.sections[8]?.timeline || []).every((period) => {
      const length = traditionalChineseLength(period.interpretation.consultation);
      return length >= 250 && length <= 650;
    })
    && !reportHasDuplicateSentences(report.sections);
}

export function auditCompleteVedicReport(report: VedicPaidReport): string[] {
  const issues = report.sections.flatMap((section, index) => validStructuredSection(section, index) ? [] : [`section_${index + 1}`]);
  report.sections.slice(0, 8).forEach((section, index) => {
    for (const issue of consultationQualityIssues(section.consultation, 650, 1100)) issues.push(`section_${index + 1}_${issue}`);
  });
  report.sections[8]?.timeline?.forEach((period) => {
    for (const issue of consultationQualityIssues(period.interpretation.consultation, 300, 600, 'period')) issues.push(`period_${period.id}_${issue}`);
  });
  if (reportHasDuplicateSentences(report.sections)) issues.push('duplicate_or_high_similarity');
  return issues;
}

async function generatePaidReportPart(
  env: Env,
  scope: VedicReportScope,
  chart: VedicChartData,
  transits: VedicTransitSnapshot | null = null,
  generationAttempt = 0,
  requestedSectionIndexes?: number[],
) {
  const sectionIndexes = requestedSectionIndexes || REPORT_SECTION_HEADINGS[scope].map((_, index) => index);
  const includeForecast = scope === 'complete' && sectionIndexes.includes(8);
  const forecastPeriods = includeForecast ? buildVedicForecastPeriods(chart) : [];
  const diagnostics = {
    dashaApiSuccess: chart.dashaTimeline.length > 0,
    mahaDashaCount: chart.dashaTimeline.length,
    antarDashaCount: chart.dashaTimeline.reduce((sum, period) => sum + period.subPeriods.length, 0),
    forecastPeriodCount: forecastPeriods.length,
  };
  if (!env.OPENAI_API_KEY) {
    if (requestedSectionIndexes) throw new Error('OPENAI_API_KEY_MISSING');
    if (scope === 'complete') console.warn('VEDIC_FORECAST_FALLBACK', { ...diagnostics, aiInterpretationPeriodCount: 0, fallbackUsed: true, reason: 'OPENAI_API_KEY_MISSING' });
    return buildVedicFallbackReport(scope, chart, transits);
  }
  let aiInterpretationPeriodCount = 0;
  const legacyPrompt = {
    task: '像有經驗的印度占星老師面對面解盤：把占星配置翻成現實人生結論與可執行建議。',
    scope,
    scope_name: SCOPE_NAMES[scope],
    analysis_inputs: {
      d1_birth_chart: {
        lagna: chart.lagna,
        sunSign: chart.sunSign,
        moonSign: chart.moonSign,
        moonNakshatra: chart.moonNakshatra,
        planets: chart.planets,
        housePlacements: chart.housePlacements,
        houseLords: chart.houseLords,
        karmaAspects: chart.karmaAspects,
      },
      d9_navamsha: chart.divisionalCharts.d9,
      d10_dashamsha: chart.divisionalCharts.d10,
      vimshottari_dasha: {
        mahaDasha: chart.mahaDasha,
        antarDasha: chart.antarDasha,
        timeline: chart.dashaTimeline,
      },
      current_transits: transits,
    },
    forecastPeriods: forecastPeriods.map(({ id, mahaDasha, antarDasha, startDate, endDate, displayLabel, analysisStartDate, analysisEndDate }) => ({
      id, mahaDasha, antarDasha, startDate, endDate, displayLabel, analysisStartDate, analysisEndDate,
    })),
    karma_foundation_chinese: karmaFoundation(chart),
    required_section_headings: REPORT_SECTION_HEADINGS[scope],
    section_blueprints: scope === 'complete' ? COMPLETE_SECTION_BLUEPRINTS : [],
    output_schema: {
      formatVersion: VEDIC_REPORT_FORMAT_VERSION,
      title: 'string',
      introduction: 'string',
      sections: [{
        heading: '必須完全等於 required_section_headings 對應項目',
        conclusion: '1至2句直接結論',
        strengths: ['2至4項具體優勢'],
        risks: ['2至4項弱點或容易踩的坑'],
        examples: ['2至3個現實生活例子'],
        actions: ['恰好3個能真正執行的行動'],
        direction: '最適合方向或應避免方向',
        evidence: [{ factor: '配置名稱', value: '實際星座／宮位／宮主／分盤值', relevance: '此配置與本段結論的具體關係' }],
        analysisBlocks: [{ label: '必須依 section_blueprints 對應標籤', content: '具體個人化判讀' }],
        depth: { surface: '表面行為', deeperCause: '盤裡更深原因', unchangedCost: '持續不改的代價' },
        coreTension: { sideA: '只有真有衝突才回傳', sideB: '相反力量', astrologicalBasis: ['形成衝突的實際配置'], lifeEffect: '現實影響', integration: '整合方式' },
        reasoningBasis: [{ factor: '實際配置', technicalMeaning: '占星技術含義', lifeMeaning: '白話生活意義', contribution: '如何與其他配置共同形成結論' }],
        adjustments: [{ problem: '問題', astrologicalCause: '星盤原因', realLifeEffect: '生活表現', action: '對應行動' }],
        transition: { pastPattern: '僅第3項需要', currentBlock: '僅第3項需要', futurePattern: '僅第3項需要' },
        d9Evolution: { earlyPattern: '僅第7項', maturePattern: 'D9成熟後模式', transition: 'D1到D9的實際變化', relationshipLesson: '相處功課' },
        d10Comparison: { natalCareerTheme: '僅第8項D1職涯動機', professionalExpression: 'D10社會角色', alignment: 'aligned | mixed | conflicted', interpretation: '兩者一致或差異的現實意義' },
      }],
      forecastInterpretations: {
        period_1: {
          theme: '階段主題', overall: '整體趨勢',
          career: { trend: '事業趨勢', advice: ['具體建議'], avoid: ['避免事項'] },
          wealth: { trend: '財運趨勢', advice: ['具體建議'], avoid: ['避免事項'] },
          relationship: { trend: '感情趨勢', advice: ['具體建議'], avoid: ['避免事項'] },
          growth: { trend: '個人成長趨勢' },
          opportunityScores: { career: 1, wealth: 1, relationship: 1, growth: 1 },
          turningPoint: { isImportant: false, reason: '大運次運或重要行運是否重疊' },
          annualFocus: [{ year: 2027, priority: '該年唯一最重要事項', why: '星盤理由' }],
          why: '大運背景、次運觸發方式與本命盤依據', keyMessage: '一句話提醒',
        },
      },
      closing: 'string',
    },
    rules: [
      '只使用提供的星盤資料，不杜撰行星位置、日期、月份或事件。',
      '使用一般人看得懂的繁體中文，像資深老師當面說明；占星配置是證據，白話人生解讀才是答案。',
      '每個配置都必須回答「這對這個人的現實人生代表什麼」，不可只解釋術語。',
      '每一區先給結論；共用 strengths/risks/examples/actions 是摘要資料，但 analysisBlocks 必須嚴格依該區專屬標籤寫對應語意，不得以陣列索引猜內容。',
      '優勢、弱點與建議必須由此人的配置推導，不得使用固定人格模板。',
      '少用「能量流動、覺察、宇宙、靈魂邀請、生命路口、重新選擇、療癒自己、回到內在」；不得用抽象詞補篇幅。',
      '禁止使用「請回想近幾年反覆出現的人、事件與情緒」及「記錄觸發點、分辨恐懼與直覺、確認自己的界線」。',
      '不同區塊不得出現相同句子；同一建議不可換句話後在多區重複。',
      '9個區塊必須依 section_blueprints 使用不同分析角度與標籤；第3項只做舊模式→卡點→過渡→新模式，第9項只做時間軸，不得硬塞共同版型。',
      'coreTension 是選填；只有至少兩組實際配置互相衝突時才產生，否則完全省略，不得為版面硬造矛盾。',
      'reasoningBasis 必須逐步呈現 factor→technicalMeaning→lifeMeaning→contribution，至少用2至4句串起證據與結論，禁止只說「共同指向」。',
      '每個 adjustment 必須形成 problem→astrologicalCause→realLifeEffect→action，說明行動在修正哪個命盤模式。',
      '生成結論前檢查是否可套用在50%以上的人；若可以，必須加入具體宮位、宮主、分盤或大運背景後重寫。',
      'depth 只有第1項或確實需要表面／深層差異時才產生，其他區不要為了格式硬填。',
      '不要輸出 confidence；信心等級由程式依獨立證據數及D1、D9/D10、Dasha、Transit層次決定。',
      '占星術語第一次出現時，用一句白話說明該宮位或分盤掌管的現實領域。',
      '前世因果採象徵與自我探索語氣，使用「可能、傾向、邀請你觀察」，不得宣稱可證實的前世事實。',
      '不得宣稱命定、保證發財、保證婚姻或預測疾病死亡。',
      '財務、醫療、法律議題必須提醒讀者搭配合格專業意見。',
      'sections 必須依 required_section_headings 的順序與數量產出，不可省略或自行增加英文標題。',
      '第1項以前世業力為主：使用計都星座、宮位、宮主、月宿、羅喉計都軸線，必要時加入土星；回答舊模式、優勢、過度使用的代價及停止重複的方法。',
      '第2項以羅喉為核心：清楚說明計都是熟悉但易過度依賴、羅喉是不熟悉但需發展；direction 必須列出三個今生最值得發展的能力。',
      '第3項不得重複前兩項；必須輸出 transition，明確呈現「過去習慣→現在卡住→未來發展」。',
      '第4項綜合D1第7宮、第7宮主、金星、木星、月亮、羅喉計都、D9與大運；說明感情優缺點、吸引類型、問題點、適合與不適合的伴侶。資料不足要明說。',
      '第5項分析第2、11、5、9、10宮及宮主、木星、金星、大運；直接回答適合固定薪資、專業服務、創業、投資、合作或內容變現中的哪些模式，以及破財位置。',
      '第6項分析第10、6、2宮與宮主、水星、木星、土星、太陽、D1、D10；輸出最強三項能力、工作環境、職業類型、事業弱點與競爭力。不得固定產生「智慧傳遞者」。',
      '第7項將D9與D1交叉，解讀年輕與成熟後的關係模式、婚姻優缺點、相處能力與長期伴侶；不可只列星座。',
      '第7項必須輸出 d9Evolution，明確比較 D1早期慣性與D9成熟需求及中間轉變。',
      '第8項將D10、D1第10宮與目前大運交叉，回答社會角色、領導方式、創業或組織發展、職場問題、專業定位與升級方向。',
      '第8項必須輸出 d10Comparison，判斷本命職涯動機與D10社會角色為一致、部分一致或衝突，並說明現實意義。',
      '第9項的時間骨架已由 forecastPeriods 固定建立。你不得新增、刪除、合併、拆分、排序或修改 forecastPeriods。',
      '必須在 forecastInterpretations 中對每一個 forecastPeriods 的 id 恰好回傳一次 interpretation；不得遺漏或增加 period id。',
      '不要回傳或改寫 mahaDasha、antarDasha、startDate、endDate。即使回傳，程式也不會採用。',
      '大運決定長期背景，次運決定這段背景從哪個現實領域被具體啟動。每段 why 必須說明這個次運如何改變該大運的表現。',
      '不同次運的主題、事業、財運、感情、建議與風險必須明顯不同，不可用相同文字替換行星名稱。',
      'opportunityScores 的事業、財運、感情、成長皆須為1至5的整數；分數代表相對有利程度，不是成功保證。',
      '不要輸出 confidence；時間軸 confidence 也由程式按本命位置、Dasha與Transit的獨立層次決定。',
      'turningPoint 只有在大運或次運切換與木星、土星、羅喉計都重要行運相近時標為重要，並說明因素重疊；不得保證事件。',
      'annualFocus 必須涵蓋該 period 分析範圍內的每個自然年度，每年只選一件最值得優先處理的事；不得新增範圍外年份。',
      '其他方案每個 section 也應提供足夠完整的說明，至少包含星盤依據、生活表現、可能盲點與可實行的轉化方向。',
      'soul_karma 必須回答前世慣性、重複原因、執著、舒適圈、業力關係領域與今生方向。',
      'life_full 必須回答前世業力、今生核心課題、感情關係、財富事業與靈魂使命。',
      '凡包含「你的今生核心課題」段落，最後必須用一句「你的今生核心課題：＿＿＿＿」做出可分享的精簡總結。',
      '只能回傳符合 output_schema 的 JSON，不要加 Markdown code fence。',
    ],
  };
  void legacyPrompt;
  const programReport = buildVedicFallbackReport(scope, chart, transits);
  const prompt = {
    task: '撰寫一份像資深印度占星老師面對面解盤的一對一諮詢。最高原則：不要問這個星體代表什麼；要問這個人現在真正卡在哪裡，而這張命盤能告訴他什麼解決方法。',
    scope,
    scope_name: SCOPE_NAMES[scope],
    consultation_question: null,
    chart_facts: {
      d1: { lagna: chart.lagna, sunSign: chart.sunSign, moonSign: chart.moonSign, moonNakshatra: chart.moonNakshatra, planets: chart.planets, housePlacements: chart.housePlacements, houseLords: chart.houseLords, karmaAspects: chart.karmaAspects },
      d9: chart.divisionalCharts.d9,
      d10: chart.divisionalCharts.d10,
      dasha: { mahaDasha: chart.mahaDasha, antarDasha: chart.antarDasha, timeline: chart.dashaTimeline },
      transits,
    },
    sections: REPORT_SECTION_HEADINGS[scope].map((heading, index) => ({
      heading,
      program_evidence: cleanEvidenceList(programReport.sections[index]?.evidence || []),
      special_instruction: [
        '深入說明業力象徵中的熟悉模式如何形成、何時是天賦、何時變成控制或過度承擔、容易吸引誰、長期代價與成熟用法；交叉計都星座宮位、月宿、定位星、羅喉軸線及必要的土星或月亮。不得把前世寫成確定事件。',
        '把羅喉方向翻成三種具體人生能力，說明它為何特別難，以及通常哪些現實事件會逼當事人學會；不可只說發展某星座或宮位。',
        '回答當事人正在從哪種人變成哪種人，說明過渡期的不適、兩邊都想保留的原因、最容易退回舊模式的時刻與可觀察的轉變證據；不得重述前兩節。',
        '像真正的感情諮詢：交叉D1第7宮與宮主、金星、月亮、木星、羅喉計都、D9及大運，判斷吸引類型、危險吸引力、雙方角色、常見誤判、婚後現實議題，以及強烈但不適合和初期平淡但適合長期的人。',
        '回答錢為何透過特定方式進來、為何留不住、收入和自我價值如何連動；判斷靠時間、方法、品牌、授權或團隊放大，並指出最易吃虧的合作與財富升級優先順序。',
        '交叉D1第10宮與宮主、太陽、土星、木星、水星、D10及大運，直接判斷別人會為哪種能力付錢、適合的社會角色、不適合久待的環境、能力被低估的原因，以及下一階段真正需要增加的是定價、權限、可見度、案例、團隊、系統或品牌中的哪一項。',
        '自然比較 D1 的早期關係反應與 D9 顯示的成熟關係需求；說明年輕時被誰吸引、忽略什麼、經歷關係後如何改變，以及成熟後最不能妥協的事情。',
        '自然比較 D1 的職涯動機與 D10 顯示的社會角色；判斷最常被交付的責任、最能發揮與最耗損的角色、適合組織升遷或自建平台，以及創業或留在組織各自需要補什麼。',
        '本節開頭只寫總體諮詢；各個大運／次運時段另在 forecastInterpretations 撰寫。',
      ][index],
    })).filter((_, index) => sectionIndexes.includes(index)),
    forecast_periods: forecastPeriods.map(({ id, mahaDasha, antarDasha, startDate, endDate, displayLabel, analysisStartDate, analysisEndDate }, index) => ({
      id, mahaDasha, antarDasha, startDate, endDate, displayLabel, analysisStartDate, analysisEndDate,
      previous_period: index > 0 ? { mahaDasha: forecastPeriods[index - 1].mahaDasha, antarDasha: forecastPeriods[index - 1].antarDasha, displayLabel: forecastPeriods[index - 1].displayLabel } : null,
      program_evidence: chart ? fallbackForecastInterpretation(forecastPeriods[index], chart, transits).evidence : [],
    })),
    output_schema: {
      formatVersion: VEDIC_REPORT_FORMAT_VERSION,
      title: 'string',
      introduction: '自然的開場諮詢',
      consultationQuestion: 'optional string',
      sections: [{ heading: '必須與輸入 heading 完全相同', consultation: '一篇完整、自然、有個人化洞見與可執行解法的諮詢文章' }],
      forecastInterpretations: { period_id: { consultation: '依固定日期與大運／次運資料撰寫的自然諮詢文章' } },
      closing: '自然收束，不用口號',
    },
    rules: [
      '只回傳 JSON，不得加入 Markdown code fence。',
      '只能使用 chart_facts、program_evidence 與 forecast_periods 的事實；不得猜測或改寫行星、宮位、分盤、大運、次運與日期。',
      '①至⑧每節只輸出 heading 與 consultation；不得輸出固定的結論、優點、缺點、範例、建議、方向、信心、評分或卡片欄位。',
      '①至⑧每篇以750至950個繁體中文字為目標，必須是實質的新洞察，不可用重複配置、免責、鼓勵話或同義改寫湊字。第九節總論約500字、每個次運時段350至500字，這次不得改變第九節的篇幅與分析規則。',
      '文章內部依「現象→深層機制→吸引或重複模式→代價→真正核心→具體做法→成熟版本」推理，但必須寫成自然文章，絕不可顯示成固定小標或模板。',
      '①至⑧每篇至少要交付：一個被說中的深層問題、一個當事人原本沒想到的成因、一個隱藏的心理回報或安全感來源、一個最細微但反覆發生的行為訊號、一個長期代價，以及一個下週就能執行的解法。任何一項缺少就重寫，不得以字數取代洞察。',
      '像印度占星大師面對面追問到問題背後：本人為什麼明知不舒服仍重複、這個模式曾經保護了什麼、本人從中換得被需要、可控制、可預測或不必冒險等哪種隱性好處，以及真正害怕失去的是什麼。這些判斷必須來自本盤，不得套用固定童年或創傷故事。',
      '①至⑧要寫出細微到本人能辨認的早期訊號，例如答應前身體或語氣的反應、關係失衡最初如何出現、工作被低估前本人做了哪個習慣動作、財務漏損在決策哪一步開始。不要只描述事情已經惡化後的結果。',
      '每篇至少出現一至兩個只有結合這張命盤才成立的深層判斷。必須先交叉至少三個相關星盤因素，再翻成人生結論；不得將單顆行星關鍵字擴寫成整篇。',
      '每篇至少自然融入兩個不同場域的具體人生場景，清楚指出最容易做錯的選擇與長期代價。解法不能只寫建立界線、相信自己或學習放下，必須包含觸發情境、可執行步驟、判斷標準或時間限制，並說明為何正好修正盤中模式。',
      '每篇必須分析一次「天賦如何因過度使用而變成問題及代價」，最後讓當事人看見成熟後不是失去天賦，而是如何把它變成選擇權、專業、關係品質或實際回報。',
      '禁止「羅喉／計都軸線與月宿共同描述」「相信自己」「提升覺察」「學習放下」「宇宙正在提醒你」「靈魂邀請你」「能量正在轉換」等泛用句。撰寫後內部比對九篇：句子、場景、原因或建議若只替換星名就能搬到另一篇，必須重寫。',
      '正文約20至30%說明星盤證據，70至80%做白話人生判斷與解法。技術詞第一次出現後立即翻成現實影響，不連續堆疊月宿、定位星、宮主與相位。',
      '術語只作證據，第一次出現立即用白話說明對現實生活的影響；不寫百科式星體介紹。',
      '第七節必須由 D1 到 D9 的成熟變化形成一篇連續文章；第八節必須比較 D1 職涯動機與 D10 社會角色，不可只列配置。',
      '第九節的 forecast_periods 是程式固定骨架，每個 id 恰好回傳一次 consultation，不得增加、刪除、合併、改序或改日期。',
      '每段時間諮詢必須說明該 Mahadasha 長期背景如何被 Antardasha 具體啟動，並和上一段比較；回答核心主題、變化領域、錯誤決定、事業攻守、財務擴張或保留、感情確認調整或觀察、資源焦點及避免事項。每段同樣必須有一個深層問題、一個非直覺成因與一個可執行策略，不使用評分卡。',
      '不得保證事件、婚姻或獲利；財務、醫療與法律問題提醒搭配合格專業意見。',
    ],
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-5.4',
        input: [
          { role: 'system', content: '你是有多年一對一諮詢經驗的印度占星老師。最高原則：不要問這個星體代表什麼；要問這個人現在真正卡在哪裡，而這張命盤能告訴他什麼解決方法。忠於輸入事實，不套模板，不寫百科或心靈雞湯。' },
          { role: 'user', content: JSON.stringify(prompt) },
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: requestedSectionIndexes ? (includeForecast ? 10000 : 6500) : (scope === 'full' || scope === 'complete' ? 22000 : 6000),
      }),
    });
    if (!response.ok) throw new Error(`OpenAI report failed: ${response.status}`);
    const text = extractOpenAiText(await response.json());
    if (!text) throw new Error('OpenAI report empty');
    const parsed = JSON.parse(text) as Record<string, unknown>;
    aiInterpretationPeriodCount = parsed.forecastInterpretations && typeof parsed.forecastInterpretations === 'object'
      && !Array.isArray(parsed.forecastInterpretations)
      ? Object.keys(parsed.forecastInterpretations as Record<string, unknown>).length : 0;
    const title = cleanText(parsed.title, 120);
    const introduction = cleanText(parsed.introduction, 3000);
    const consultationQuestion = cleanText(parsed.consultationQuestion, 500);
    const closing = cleanText(parsed.closing, 2000);
    const forecastTimeline = includeForecast
      ? mergeVedicForecastInterpretations(forecastPeriods, parsed.forecastInterpretations, chart, transits)
      : [];
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections.slice(0, sectionIndexes.length).map((entry, localIndex) => {
        const index = sectionIndexes[localIndex];
        const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
        const consultation = cleanText(row.consultation, 8000);
        return {
          heading: REPORT_SECTION_HEADINGS[scope][index],
          consultation,
          evidence: cleanEvidenceList(programReport.sections[index]?.evidence || []),
          ...(includeForecast && index === 8 ? { timeline: forecastTimeline } : {}),
        } satisfies VedicReportSection;
      })
      : [];
    const invalidGeneratedSections = sections.some((section, localIndex) => !validStructuredSection(section, sectionIndexes[localIndex]))
      || sections.filter((_, localIndex) => sectionIndexes[localIndex] !== 8).some((section) => {
        const length = traditionalChineseLength(section.consultation);
        return scope === 'complete'
          ? length < 650 || length > 1100 || GENERIC_VEDIC_PHRASES.filter((phrase) => section.consultation.includes(phrase)).length >= 2
          : !consultationHasDepth(section.consultation, 400);
      })
      || (includeForecast && forecastTimeline.some((period) => {
        const length = traditionalChineseLength(period.interpretation.consultation);
        return length < 250 || length > 650;
      }))
      || reportHasDuplicateSentences(sections);
    if (!title || !introduction || sections.length !== sectionIndexes.length || invalidGeneratedSections) {
      const reasons = [
        !title ? 'missing_title' : '',
        !introduction ? 'missing_introduction' : '',
        sections.length !== sectionIndexes.length ? `section_count_${sections.length}_expected_${sectionIndexes.length}` : '',
        invalidGeneratedSections ? 'section_quality_invalid' : '',
      ].filter(Boolean);
      throw new Error(`OpenAI report invalid: ${reasons.join(',')}`);
    }
    if (scope === 'complete') console.info('VEDIC_FORECAST_DIAGNOSTICS', {
      ...diagnostics,
      aiInterpretationPeriodCount: forecastTimeline.length,
      fallbackUsed: false,
    });
    return { formatVersion: VEDIC_REPORT_FORMAT_VERSION, title, introduction, ...(consultationQuestion ? { consultationQuestion } : {}), sections, closing };
  } catch (error) {
    if (env.OPENAI_API_KEY && generationAttempt < 1) {
      console.warn('VEDIC_REPORT_REGENERATE', { attempt: generationAttempt + 1, reason: error instanceof Error ? error.message : 'unknown' });
      return generatePaidReportPart(env, scope, chart, transits, generationAttempt + 1, requestedSectionIndexes);
    }
    console.warn('VEDIC_FORECAST_FALLBACK', {
      ...diagnostics,
      aiInterpretationPeriodCount,
      fallbackUsed: true,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    if (requestedSectionIndexes) throw error;
    return buildVedicFallbackReport(scope, chart, transits);
  } finally {
    clearTimeout(timer);
  }
}

class VedicBatchGenerationError extends Error {
  constructor(readonly generation: Array<{ section: number; heading: string; status: 'completed' | 'failed'; error?: string }>) {
    super('VEDIC_BATCH_GENERATION_INCOMPLETE');
  }
}

async function generatePaidReport(
  env: Env,
  scope: VedicReportScope,
  chart: VedicChartData,
  transits: VedicTransitSnapshot | null = null,
): Promise<VedicPaidReport> {
  if (scope !== 'complete') return generatePaidReportPart(env, scope, chart, transits);

  // Smaller independent requests avoid one 9-section JSON response timing out.
  // Section 9 remains its own batch and continues to use the existing fixed
  // forecast skeleton + mergeVedicForecastInterpretations validation.
  const batches = REPORT_SECTION_HEADINGS.complete.map((_, index) => [index]);
  const results: PromiseSettledResult<VedicPaidReport>[] = new Array(batches.length);
  // Three workers keep latency reasonable without flooding the model with all
  // nine long generations at once. Each section has its own retry boundary.
  let nextBatch = 0;
  const worker = async () => {
    while (nextBatch < batches.length) {
      const batchIndex = nextBatch;
      nextBatch += 1;
      try {
        const value = await generatePaidReportPart(env, scope, chart, transits, 0, batches[batchIndex]);
        results[batchIndex] = { status: 'fulfilled', value };
      } catch (reason) {
        results[batchIndex] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  const generation = batches.flatMap((indexes, batchIndex) => indexes.map((index) => {
    const result = results[batchIndex];
    return result.status === 'fulfilled'
      ? { section: index + 1, heading: REPORT_SECTION_HEADINGS.complete[index], status: 'completed' as const }
      : { section: index + 1, heading: REPORT_SECTION_HEADINGS.complete[index], status: 'failed' as const, error: result.reason instanceof Error ? result.reason.message : 'generation_failed' };
  }));
  if (results.some((result) => result.status === 'rejected')) throw new VedicBatchGenerationError(generation);

  const reports = results.map((result) => (result as PromiseFulfilledResult<VedicPaidReport>).value);
  const sections = reports.flatMap((report) => report.sections)
    .sort((left, right) => REPORT_SECTION_HEADINGS.complete.indexOf(left.heading) - REPORT_SECTION_HEADINGS.complete.indexOf(right.heading));
  const report: VedicPaidReport = {
    formatVersion: VEDIC_REPORT_FORMAT_VERSION,
    title: reports[0].title,
    introduction: reports[0].introduction,
    sections,
    closing: reports[reports.length - 1].closing || reports[0].closing,
  };
  if (!validateCompleteVedicReport(report)) throw new VedicBatchGenerationError(
    generation.map((item) => ({ ...item, status: 'failed' as const, error: 'combined_report_quality_failed' })),
  );
  return report;
}

export async function getVedicPaidReport(req: Request, env: Env): Promise<Response> {
  const body = await readBody<{
    chart_id?: string; chart_token?: string; order_id?: string; order_token?: string;
  }>(req);
  const chartId = cleanText(body.chart_id, 80);
  const chartToken = cleanText(body.chart_token, 2400);
  const orderId = cleanText(body.order_id, 80);
  const orderToken = cleanText(body.order_token, 2400);
  if (!orderId || !orderToken) return badRequest(req, env, '缺少報告授權資料');

  await ensureVedicSchema(env);
  const orderPayload = await verifyJwt(orderToken, env.JWT_SECRET);
  if (orderPayload?.sub !== orderId) return unauthorized(req, env, '訂單授權已失效');

  const order = await env.DB.prepare(
    `SELECT id, user_id, item_id, item_name, status, picks_payload FROM orders WHERE id = ?`
  ).bind(orderId).first<PaidOrder>();
  if (!order || order.status !== 'paid' || !order.item_id.startsWith('vedic_')) {
    return unauthorized(req, env, '此報告尚未完成付款解鎖');
  }
  const limit = await rateLimit(env, 'vedic-report-order', orderId, 6, 3600);
  if (!limit.allowed) return tooManyRequests(req, env, '此筆報告重新產生過於頻繁，請稍後再試');
  let linkedChartId = '';
  try {
    const context = JSON.parse(order.picks_payload || '{}') as { vedic_chart_id?: string };
    linkedChartId = context.vedic_chart_id || '';
  } catch {}
  if (!linkedChartId) return unauthorized(req, env, '訂單沒有綁定星盤');
  if (chartId || chartToken) {
    if (!chartId || !chartToken) return badRequest(req, env, '星盤授權資料不完整');
    const chartPayload = await verifyJwt(chartToken, env.JWT_SECRET);
    if (chartPayload?.sub !== chartId) return unauthorized(req, env, '星盤授權已失效');
    if (linkedChartId !== chartId) return unauthorized(req, env, '訂單與星盤不相符');
  }
  const resolvedChartId = linkedChartId;

  const scope = order.item_id.replace(/^vedic_/, '') as VedicReportScope;
  if (!REPORT_SCOPES.includes(scope)) return badRequest(req, env, '印度占星商品設定錯誤');
  const existing = await env.DB.prepare(
    'SELECT content_json FROM vedic_reports WHERE order_id = ?'
  ).bind(orderId).first<{ content_json: string }>();
  let existingNeedsRefresh = false;
  if (existing) {
    try {
      const existingReport = JSON.parse(existing.content_json) as Partial<VedicPaidReport>;
      existingNeedsRefresh = scope === 'complete'
        && !validateCompleteVedicReport(existingReport as VedicPaidReport);
      if (!existingNeedsRefresh) return json(req, env, { scope, report: existingReport, cached: true });
    } catch {
      existingNeedsRefresh = true;
    }
  }

  const chartRow = await env.DB.prepare('SELECT * FROM vedic_charts WHERE id = ?')
    .bind(resolvedChartId).first<StoredChart>();
  if (!chartRow) return badRequest(req, env, '找不到星盤資料');
  const chart = hydrateChartData(JSON.parse(chartRow.chart_json) as VedicChartData);
  const transits = scope === 'complete' ? await loadCurrentTransits(env) : null;
  let report: VedicPaidReport;
  try {
    report = await generatePaidReport(env, scope, chart, transits);
  } catch (error) {
    if (error instanceof VedicBatchGenerationError) {
      const state = {
        generationOnly: true,
        formatVersion: VEDIC_REPORT_FORMAT_VERSION,
        updatedAt: new Date().toISOString(),
        generation: error.generation,
      };
      if (existing) {
        await env.DB.prepare('UPDATE vedic_reports SET content_json = ?, created_at = ? WHERE order_id = ?')
          .bind(JSON.stringify(state), state.updatedAt, orderId).run();
      } else {
        await env.DB.prepare(
          `INSERT INTO vedic_reports (id, chart_id, order_id, scope, content_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), resolvedChartId, orderId, scope, JSON.stringify(state), state.updatedAt).run();
      }
      return json(req, env, {
        scope,
        cached: false,
        transientFallback: true,
        retryable: true,
        generation: error.generation,
      }, { status: 202 });
    }
    if (error instanceof Error && error.message === 'VEDIC_FORECAST_MISSING_ANTARDASHA') {
      return json(req, env, {
        error: '印度占星時間軸資料暫時不完整，請稍後重新產生星盤',
        code: 'VEDIC_FORECAST_MISSING_ANTARDASHA',
      }, { status: 503 });
    }
    return serverError(req, env, error);
  }
  const cacheableReport = scope !== 'complete' || validateCompleteVedicReport(report);
  if (!cacheableReport) {
    // A deterministic fallback is useful as a temporary response, but it must
    // never replace or create the premium cached report. The next request can
    // therefore retry AI generation instead of being stuck with brief content.
    const audit = scope === 'complete' ? auditCompleteVedicReport(report) : ['report_generation_failed'];
    const generation = REPORT_SECTION_HEADINGS[scope].map((heading, index) => {
      const sectionIssues = audit.filter((issue) => issue.startsWith(`section_${index + 1}_`) || issue === `section_${index + 1}`);
      return {
        section: index + 1,
        heading,
        status: sectionIssues.length ? 'failed' : 'pending',
        ...(sectionIssues.length ? { error: sectionIssues.join(', ') } : {}),
      };
    });
    // Never send the deterministic fallback as paid report content. It is only
    // used internally for evidence and diagnostics; the client must retry AI.
    return json(req, env, {
      scope,
      cached: false,
      transientFallback: true,
      retryable: true,
      generation,
    }, { status: 202 });
  }
  if (existing && existingNeedsRefresh) {
    await env.DB.prepare(
      'UPDATE vedic_reports SET content_json = ?, created_at = ? WHERE order_id = ?'
    ).bind(JSON.stringify(report), new Date().toISOString(), orderId).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO vedic_reports (id, chart_id, order_id, scope, content_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), resolvedChartId, orderId, scope, JSON.stringify(report), new Date().toISOString()).run();
  }
  return json(req, env, { scope, report, cached: false }, { status: 201 });
}
