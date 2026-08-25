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
const VEDIC_REPORT_FORMAT_VERSION = 2;
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

interface VedicTimelineStage {
  period: string;
  theme: string;
  career: string;
  wealth: string;
  relationship: string;
  favorableDirection: string;
  mainRisk: string;
  action: string;
}

interface VedicReportSection {
  heading: string;
  conclusion: string;
  strengths: string[];
  risks: string[];
  examples: string[];
  actions: string[];
  direction: string;
  evidence: string[];
  transition?: {
    pastPattern: string;
    currentBlock: string;
    futurePattern: string;
  };
  timeline?: VedicTimelineStage[];
  body?: string;
}

interface VedicPaidReport {
  formatVersion: number;
  title: string;
  introduction: string;
  sections: VedicReportSection[];
  closing: string;
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

const DASHA_PRACTICAL: Record<string, {
  career: string; wealth: string; relationship: string; favorableDirection: string; mainRisk: string; action: string;
}> = {
  Jupiter: {
    career: '較適合擴充專業、教學、顧問或管理範圍，但先確認新責任能帶來資歷或收入。',
    wealth: '收入成長機會可能增加，支出也容易因進修或擴張同步上升，需先訂預算上限。',
    relationship: '較容易討論共同願景與長期計畫，價值觀差異也會變得更明顯。',
    favorableDirection: '累積證照、案例、公開作品或可提高信任度的專業成果。',
    mainRisk: '高估同時承擔多項計畫的能力，最後每一項都缺乏足夠投入。',
    action: '只選一項最有長期回報的擴張計畫，先完成里程碑再增加第二項。',
  },
  Saturn: {
    career: '工作責任與制度要求可能提高，適合建立流程、管理能力與難以取代的專業深度。',
    wealth: '財務成長較依賴紀律與長期累積，應優先處理負債、固定成本及安全準備。',
    relationship: '承諾、時間分配與現實責任會成為重點，不適合繼續迴避長期問題。',
    favorableDirection: '收斂低效項目，建立能連續執行三年以上的工作與財務結構。',
    mainRisk: '因責任增加而長期過勞，或把進度較慢誤判為完全沒有成果。',
    action: '每季刪除一項低效責任，將固定時間留給核心專業與身體恢復。',
  },
  Venus: {
    career: '合作、品牌、設計、服務與客戶關係較容易帶來機會，合約與分潤仍要先寫清楚。',
    wealth: '可透過合作與美感服務增加收入，也需防止享樂支出或人情消費侵蝕成果。',
    relationship: '感情與社交機會可能變多，適合觀察對方能否在日常責任上保持一致。',
    favorableDirection: '改善作品呈現、客戶體驗與合作品質，讓專業更容易被看見。',
    mainRisk: '為維持關係而接受不合理條件，或只看吸引力忽略長期相容性。',
    action: '所有合作先確認價格、分工、交付與退出條件，再投入額外時間。',
  },
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
  return typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : '';
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

export function buildVedicFallbackReport(
  scope: VedicReportScope,
  chart: VedicChartData,
  transits: VedicTransitSnapshot | null = null,
): VedicPaidReport {
  const headings = REPORT_SECTION_HEADINGS[scope];
  const foundation = karmaFoundation(chart);
  const house = (planet: string) => chart.housePlacements[planet] ? `第${chart.housePlacements[planet]}宮` : '宮位資料不足';
  const placement = (planet: string) => `${zhPlanet(planet)}在${zhSign(chart.planets[planet] || '資料不足')}${house(planet)}`;
  const evidenceBase = [placement('Rahu'), placement('Ketu'), `月宿：${zhNakshatra(chart.moonNakshatra)}`];
  const timeline = chart.dashaTimeline.slice(0, 5).map((period): VedicTimelineStage => {
    const practical = DASHA_PRACTICAL[period.lord];
    return {
      period: `${period.start}～${period.end}`,
      theme: `${zhPlanet(period.lord)}大運：以${DASHA_THEMES[period.lord]?.[0] || '階段調整'}為主題`,
      career: practical?.career || `事業重點應配合${zhPlanet(period.lord)}所掌管的主題，以可驗證成果決定是否擴張。`,
      wealth: practical?.wealth || '先守住現金流與安全準備，再依實際收入增加投入。',
      relationship: practical?.relationship || '討論承諾時同時檢查價值觀、時間分配與現實責任。',
      favorableDirection: practical?.favorableDirection || `建立與${zhPlanet(period.lord)}主題一致、可持續至少一年的計畫。`,
      mainRisk: practical?.mainRisk || '只依週期名稱做重大決定，忽略現實條件與準備程度。',
      action: practical?.action || '每季用收入、作品、職責或關係品質檢查一次進度。',
    };
  });
  const section = (heading: string, overrides: Partial<VedicReportSection>): VedicReportSection => ({
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

  const completeSections: VedicReportSection[] = [
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
      evidence: [`第7宮主：${zhPlanet(chart.houseLords['7'])}`, placement('Venus'), placement('Jupiter'), placement('Moon'), `D9上升：${zhSign(chart.divisionalCharts.d9.lagna || '資料不足')}`],
    }),
    section(headings[4], {
      conclusion: '你比較適合靠可累積的專業、長期客戶或能反覆交付的服務賺錢，而不是只追逐短期機會。',
      strengths: ['能把經驗整理成具有交換價值的成果', '有機會透過長期合作放大收入'],
      risks: ['收入增加時可能同步擴張支出', '合作條件不清楚時容易承擔超出報酬的工作'],
      examples: ['接案時可能先把成果做好，最後才談修改次數與追加費用。', '看到新機會時可能同時投入太多項目，造成現金流與注意力分散。'],
      actions: ['每筆收入先固定保留20%作為安全準備，再安排支出。', '報價前寫清楚工作範圍、修改次數、付款節點與退出條件。', '每季依毛利與投入時間淘汰一項低效收入來源。'],
      direction: '優先發展專業服務、固定薪資加績效、內容或方法授權等可持續模式；投資需依風險承受度並諮詢合格專業人士。',
      evidence: [`第2宮主：${zhPlanet(chart.houseLords['2'])}`, `第5宮主：${zhPlanet(chart.houseLords['5'])}`, `第9宮主：${zhPlanet(chart.houseLords['9'])}`, `第11宮主：${zhPlanet(chart.houseLords['11'])}`, placement('Jupiter'), placement('Venus')],
    }),
    section(headings[5], {
      conclusion: `你的事業優勢來自第10宮主${zhPlanet(chart.houseLords['10'])}與 D10 配置的組合，適合建立可被信任的專業定位，而不是頻繁更換角色。`,
      strengths: ['能處理複雜問題並建立做事標準', '適合把個人能力發展成團隊可使用的方法', '面對長期目標時有持續累積的潛力'],
      risks: ['工作責任容易越接越多，形成過勞', '如果權責模糊，可能變成替主管或團隊收拾問題的人'],
      examples: ['你可能是團隊裡真正知道流程的人，但升遷與資源未必同步增加。', '新工作剛開始容易因想證明能力而答應過多任務。'],
      actions: ['每季整理一次可量化成果，主動用於談升遷、報價或資源。', '接新責任時同步確認決策權、期限與評估標準。', '選一項核心專業連續累積作品、案例或證照至少一年。'],
      direction: '適合重視專業自主、成果可衡量、能持續升級技能的環境；避免長期權責不清、只靠人情分工的組織。',
      evidence: [`第10宮主：${zhPlanet(chart.houseLords['10'])}`, `第6宮主：${zhPlanet(chart.houseLords['6'])}`, placement('Mercury'), placement('Jupiter'), placement('Saturn'), placement('Sun'), `D10上升：${zhSign(chart.divisionalCharts.d10.lagna || '資料不足')}`],
    }),
    section(headings[6], {
      conclusion: `D1 與 D9 顯示，年輕時較容易依直覺或熟悉感進入關係；成熟後，你更需要價值觀、責任分配與生活節奏能長期配合。`,
      strengths: ['願意經營長期關係', '能從相處經驗中修正自己的期待'],
      risks: ['可能把忍耐當成承諾', '容易等到問題累積後才說出真正需求'],
      examples: ['剛開始可能被強烈吸引力打動，之後才發現生活方式差異很大。', '穩定交往後可能主動承擔較多日常責任，卻沒有重新協商分工。'],
      actions: ['每月安排一次只討論生活分工、財務與未來計畫的對話。', '出現不滿時在七天內提出具體事件與希望的改變。', '決定長期承諾前，實際討論居住、家庭、金錢與工作安排。'],
      direction: '適合願意共同規劃、能處理衝突且行動穩定的長期伴侶。',
      evidence: [`D1上升：${zhSign(chart.lagna)}`, `D9上升：${zhSign(chart.divisionalCharts.d9.lagna || '資料不足')}`, `D9月亮：${zhSign(chart.divisionalCharts.d9.planets.Moon || '資料不足')}`, `D9金星：${zhSign(chart.divisionalCharts.d9.planets.Venus || '資料不足')}`],
    }),
    section(headings[7], {
      conclusion: `D10 顯示你在社會上適合扮演能建立標準、解決問題並對成果負責的角色；職位名稱不是重點，決策權與專業影響力才是。`,
      strengths: ['能把混亂工作整理成流程', '適合承擔需要判斷與整合的任務'],
      risks: ['可能因標準高而難以授權', '在資源不足的環境中容易靠加班補漏洞'],
      examples: ['升任主管後可能仍親自處理大量細節，團隊因此難以成長。', '組織方向不明時，你可能自行建立規則，卻沒有取得正式授權。'],
      actions: ['把重複工作寫成流程並交由他人執行，自己保留關鍵判斷。', '每半年選一項能提高市場價值的能力進行系統訓練。', '評估創業前先驗證客源、毛利與六個月現金流，不只看熱情。'],
      direction: '適合先在能累積資源與案例的組織發展，再依客源與現金流決定是否創業。',
      evidence: [`D1第10宮主：${zhPlanet(chart.houseLords['10'])}`, `D10上升：${zhSign(chart.divisionalCharts.d10.lagna || '資料不足')}`, `D10太陽：${zhSign(chart.divisionalCharts.d10.planets.Sun || '資料不足')}`, `D10土星：${zhSign(chart.divisionalCharts.d10.planets.Saturn || '資料不足')}`, `目前大運：${zhPlanet(chart.mahaDasha)}`],
    }),
    section(headings[8], {
      conclusion: `未來三至五年的判讀以${zhPlanet(chart.mahaDasha)}大運及實際次週期為主；不同階段的重點不同，應依時間窗口調整投入，而非把所有計畫同時展開。`,
      strengths: ['能提前辨認需要準備與擴張的階段', '可以把長期目標拆成不同年度任務'],
      risks: ['把有利期理解成不用準備也會成功', '在整理期急著擴張，增加財務與工作壓力'],
      examples: ['事業機會增加時，如果作品與資源尚未準備好，可能忙碌卻沒有留下成果。', '關係議題變多時，若同時做重大財務決策，容易互相干擾。'],
      actions: ['依時間軸為每個階段只設定一項主要目標。', '進入新次週期前三個月完成現金、能力與關係承諾盤點。', '每季用實際數據修正計畫，不因單次事件改變全部方向。'],
      direction: '整理期先收斂與補強，轉換期小規模測試，較有利的擴張期再增加資源。',
      evidence: [`目前大運：${zhPlanet(chart.mahaDasha)}`, `目前次週期：${zhPlanet(chart.antarDasha) || '資料不足'}`, transits ? `行運計算時間：${transits.calculatedAt}` : '當下行運資料不足'],
      timeline,
    }),
  ];

  const sections = scope === 'complete'
    ? completeSections
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

function cleanTextList(value: unknown, maxItems: number, maxChars = 600): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => cleanText(item, maxChars)).filter(Boolean);
}

function parseTimeline(value: unknown): VedicTimelineStage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const stage = {
      period: cleanText(row.period, 120), theme: cleanText(row.theme, 600),
      career: cleanText(row.career, 600), wealth: cleanText(row.wealth, 600),
      relationship: cleanText(row.relationship, 600),
      favorableDirection: cleanText(row.favorableDirection, 600),
      mainRisk: cleanText(row.mainRisk, 600), action: cleanText(row.action, 600),
    };
    return Object.values(stage).every(Boolean) ? [stage] : [];
  });
}

function normalizeForDuplicateCheck(value: string): string {
  return value.replace(/[\s，。！？、；：：「」『』（）()]/g, '').toLowerCase();
}

function reportHasDuplicateSentences(sections: VedicReportSection[]): boolean {
  const seen = new Set<string>();
  for (const section of sections) {
    const values = [
      section.conclusion, ...section.strengths, ...section.risks, ...section.examples,
      ...section.actions, section.direction,
      ...(section.timeline?.flatMap((stage) => [
        stage.theme, stage.career, stage.wealth, stage.relationship,
        stage.favorableDirection, stage.mainRisk, stage.action,
      ]) || []),
    ];
    for (const value of values) {
      const normalized = normalizeForDuplicateCheck(value);
      if (normalized.length < 12) continue;
      if (seen.has(normalized)) return true;
      seen.add(normalized);
    }
  }
  return false;
}

function validStructuredSection(section: VedicReportSection, index: number): boolean {
  const baseValid = !!section.heading && !!section.conclusion && !!section.direction
    && section.strengths.length >= 2 && section.strengths.length <= 4
    && section.risks.length >= 2 && section.risks.length <= 4
    && section.examples.length >= 2 && section.examples.length <= 3
    && section.actions.length === 3 && section.evidence.length >= 2;
  if (!baseValid) return false;
  if (index === 2) return !!section.transition?.pastPattern
    && !!section.transition.currentBlock && !!section.transition.futurePattern;
  if (index === 8) return !!section.timeline?.length;
  return true;
}

async function generatePaidReport(
  env: Env,
  scope: VedicReportScope,
  chart: VedicChartData,
  transits: VedicTransitSnapshot | null = null,
) {
  if (!env.OPENAI_API_KEY) return buildVedicFallbackReport(scope, chart, transits);
  const prompt = {
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
    karma_foundation_chinese: karmaFoundation(chart),
    required_section_headings: REPORT_SECTION_HEADINGS[scope],
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
        evidence: ['至少2項實際星盤依據及其白話意義'],
        transition: { pastPattern: '僅第3項需要', currentBlock: '僅第3項需要', futurePattern: '僅第3項需要' },
        timeline: [{
          period: '僅第9項需要，必須來自大運資料中的日期',
          theme: '主要主題', career: '事業趨勢', wealth: '財運趨勢', relationship: '感情趨勢',
          favorableDirection: '有利方向', mainRisk: '最大風險', action: '建議行動',
        }],
      }],
      closing: 'string',
    },
    rules: [
      '只使用提供的星盤資料，不杜撰行星位置、日期、月份或事件。',
      '使用一般人看得懂的繁體中文，像資深老師當面說明；占星配置是證據，白話人生解讀才是答案。',
      '每個配置都必須回答「這對這個人的現實人生代表什麼」，不可只解釋術語。',
      '每一區先給結論，再依序給優勢、弱點、生活例子、三個具體行動、最適合方向與星盤依據。',
      '優勢、弱點與建議必須由此人的配置推導，不得使用固定人格模板。',
      '少用「能量流動、覺察、宇宙、靈魂邀請、生命路口、重新選擇、療癒自己、回到內在」；不得用抽象詞補篇幅。',
      '禁止使用「請回想近幾年反覆出現的人、事件與情緒」及「記錄觸發點、分辨恐懼與直覺、確認自己的界線」。',
      '不同區塊不得出現相同句子；同一建議不可換句話後在多區重複。',
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
      '第8項將D10、D1第10宮與目前大運交叉，回答社會角色、領導方式、創業或組織發展、職場問題、專業定位與升級方向。',
      '第9項必須輸出 timeline；依實際大運、次週期與行運切成未來3至5年的重要階段，每段包含時間、主題、事業、財運、感情、有利方向、風險與行動。不可虛構日期。',
      '其他方案每個 section 也應提供足夠完整的說明，至少包含星盤依據、生活表現、可能盲點與可實行的轉化方向。',
      'soul_karma 必須回答前世慣性、重複原因、執著、舒適圈、業力關係領域與今生方向。',
      'life_full 必須回答前世業力、今生核心課題、感情關係、財富事業與靈魂使命。',
      '凡包含「你的今生核心課題」段落，最後必須用一句「你的今生核心課題：＿＿＿＿」做出可分享的精簡總結。',
      'timeline 只能使用 analysis_inputs.vimshottari_dasha.timeline 已提供的起訖日期，不得虛構其他精確月份或事件。',
      '只能回傳符合 output_schema 的 JSON，不要加 Markdown code fence。',
    ],
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-5.4',
        input: [
          { role: 'system', content: '你是有多年實務解盤經驗的印度占星老師。你說話直接、具體、重視現實例子與可執行方法；忠於輸入資料，不套模板、不講空泛心靈文、不用恐懼促銷。' },
          { role: 'user', content: JSON.stringify(prompt) },
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: scope === 'full' || scope === 'complete' ? 14000 : 6000,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI report failed: ${response.status}`);
    const text = extractOpenAiText(await response.json());
    if (!text) throw new Error('OpenAI report empty');
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const title = cleanText(parsed.title, 120);
    const introduction = cleanText(parsed.introduction, 3000);
    const closing = cleanText(parsed.closing, 2000);
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections.slice(0, REPORT_SECTION_HEADINGS[scope].length).map((entry, index) => {
        const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
        const rawTransition = row.transition && typeof row.transition === 'object'
          ? row.transition as Record<string, unknown> : null;
        return {
          heading: REPORT_SECTION_HEADINGS[scope][index],
          conclusion: cleanText(row.conclusion, 1800),
          strengths: cleanTextList(row.strengths, 4),
          risks: cleanTextList(row.risks, 4),
          examples: cleanTextList(row.examples, 3, 1000),
          actions: cleanTextList(row.actions, 3, 1000),
          direction: cleanText(row.direction, 1800),
          evidence: cleanTextList(row.evidence, 12, 800),
          ...(rawTransition ? { transition: {
            pastPattern: cleanText(rawTransition.pastPattern, 1000),
            currentBlock: cleanText(rawTransition.currentBlock, 1000),
            futurePattern: cleanText(rawTransition.futurePattern, 1000),
          } } : {}),
          ...(Array.isArray(row.timeline) ? { timeline: parseTimeline(row.timeline) } : {}),
        } satisfies VedicReportSection;
      })
      : [];
    const invalidCompleteSections = scope === 'complete' && (
      sections.some((section, index) => !validStructuredSection(section, index))
      || reportHasDuplicateSentences(sections)
    );
    if (!title || !introduction || sections.length !== REPORT_SECTION_HEADINGS[scope].length || invalidCompleteSections) {
      throw new Error('OpenAI report invalid');
    }
    return { formatVersion: VEDIC_REPORT_FORMAT_VERSION, title, introduction, sections, closing };
  } catch {
    return buildVedicFallbackReport(scope, chart, transits);
  } finally {
    clearTimeout(timer);
  }
}

export async function getVedicPaidReport(req: Request, env: Env): Promise<Response> {
  const limit = await rateLimit(env, 'vedic-report', clientIp(req), 12, 3600);
  if (!limit.allowed) return tooManyRequests(req, env, '報告產生過於頻繁，請稍後再試');
  const body = await readBody<{
    chart_id?: string; chart_token?: string; order_id?: string; order_token?: string;
  }>(req);
  const chartId = cleanText(body.chart_id, 80);
  const chartToken = cleanText(body.chart_token, 2400);
  const orderId = cleanText(body.order_id, 80);
  const orderToken = cleanText(body.order_token, 2400);
  if (!chartId || !chartToken || !orderId || !orderToken) return badRequest(req, env, '缺少報告授權資料');

  await ensureVedicSchema(env);
  const chartPayload = await verifyJwt(chartToken, env.JWT_SECRET);
  if (chartPayload?.sub !== chartId) return unauthorized(req, env, '星盤授權已失效');
  const orderPayload = await verifyJwt(orderToken, env.JWT_SECRET);
  if (orderPayload?.sub !== orderId) return unauthorized(req, env, '訂單授權已失效');

  const order = await env.DB.prepare(
    `SELECT id, user_id, item_id, item_name, status, picks_payload FROM orders WHERE id = ?`
  ).bind(orderId).first<PaidOrder>();
  if (!order || order.status !== 'paid' || !order.item_id.startsWith('vedic_')) {
    return unauthorized(req, env, '此報告尚未完成付款解鎖');
  }
  let linkedChartId = '';
  try {
    const context = JSON.parse(order.picks_payload || '{}') as { vedic_chart_id?: string };
    linkedChartId = context.vedic_chart_id || '';
  } catch {}
  if (linkedChartId !== chartId) return unauthorized(req, env, '訂單與星盤不相符');

  const scope = order.item_id.replace(/^vedic_/, '') as VedicReportScope;
  if (!REPORT_SCOPES.includes(scope)) return badRequest(req, env, '印度占星商品設定錯誤');
  const existing = await env.DB.prepare(
    'SELECT content_json FROM vedic_reports WHERE order_id = ?'
  ).bind(orderId).first<{ content_json: string }>();
  let existingNeedsRefresh = false;
  if (existing) {
    try {
      const existingReport = JSON.parse(existing.content_json) as Partial<VedicPaidReport>;
      existingNeedsRefresh = scope === 'complete' && (
        existingReport.formatVersion !== VEDIC_REPORT_FORMAT_VERSION
        ||
        !Array.isArray(existingReport.sections)
        || existingReport.sections.length !== REPORT_SECTION_HEADINGS.complete.length
        || existingReport.sections.some((section, index) => (
          section.heading !== REPORT_SECTION_HEADINGS.complete[index]
          || !validStructuredSection(section, index)
        ))
        || reportHasDuplicateSentences(existingReport.sections)
      );
      if (!existingNeedsRefresh) return json(req, env, { scope, report: existingReport, cached: true });
    } catch {
      existingNeedsRefresh = true;
    }
  }

  const chartRow = await env.DB.prepare('SELECT * FROM vedic_charts WHERE id = ?')
    .bind(chartId).first<StoredChart>();
  if (!chartRow) return badRequest(req, env, '找不到星盤資料');
  const chart = hydrateChartData(JSON.parse(chartRow.chart_json) as VedicChartData);
  const transits = scope === 'complete' ? await loadCurrentTransits(env) : null;
  const report = await generatePaidReport(env, scope, chart, transits);
  if (existing && existingNeedsRefresh) {
    await env.DB.prepare(
      'UPDATE vedic_reports SET content_json = ?, created_at = ? WHERE order_id = ?'
    ).bind(JSON.stringify(report), new Date().toISOString(), orderId).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO vedic_reports (id, chart_id, order_id, scope, content_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), chartId, orderId, scope, JSON.stringify(report), new Date().toISOString()).run();
  }
  return json(req, env, { scope, report, cached: false }, { status: 201 });
}
