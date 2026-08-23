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
const REPORT_SCOPES = ['career', 'relationship', 'karma', 'timeline', 'full'] as const;

export type VedicReportScope = typeof REPORT_SCOPES[number];

export interface VedicChartData {
  ayanamsa: 'LAHIRI';
  lagna: string;
  sunSign: string;
  moonSign: string;
  moonNakshatra: string;
  planets: Record<string, string>;
  mahaDasha: string;
  antarDasha: string | null;
  dashaTimeline: Array<{
    lord: string;
    start: string;
    end: string;
    subPeriods: Array<{ lord: string; start: string; end: string }>;
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

const TALENTS_BY_PLANET_SIGN: Record<string, string[]> = {
  Aries: ['開創行動', '快速決策'], Taurus: ['資源累積', '穩定實踐'], Gemini: ['溝通傳播', '跨域學習'],
  Cancer: ['情緒洞察', '照顧支持'], Leo: ['創意表達', '帶領群體'], Virgo: ['分析整理', '細節改善'],
  Libra: ['協調合作', '美感判斷'], Scorpio: ['深度洞察', '危機轉化'], Sagittarius: ['教學啟發', '願景拓展'],
  Capricorn: ['長期規劃', '組織管理'], Aquarius: ['創新思考', '社群連結'], Pisces: ['直覺想像', '療癒共感'],
};

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

  return {
    archetype: {
      title: archetypeTitle,
      body: `${archetypeBody} 你的上升落在 ${chart.lagna}，月亮位於 ${chart.moonSign} 的 ${chart.moonNakshatra} 月宿，顯示外在行動與內在感受需要用不同節奏被理解。`,
    },
    talents: {
      title: '今生最重要的天賦',
      items: talents.length ? talents : ['直覺洞察', '穩定成長', '生命整合'],
      body: `水星、木星與太陽的落點顯示，你的能力需要透過真實經驗被鍛鍊。當你不再用別人的成功方式衡量自己，這些天賦會逐漸形成可被世界看見的價值。`,
    },
    currentCycle: {
      title: cycleTitle,
      body: `${cycleBody}${chart.antarDasha ? ` 目前同時受到 ${chart.antarDasha} 次週期影響，近期事件會更集中在這顆行星代表的選擇與學習。` : ''}`,
    },
    challenge: {
      title: '目前最需要突破的課題',
      body: `羅喉位於 ${rahu}、計都位於 ${ketu}，顯示靈魂正在離開熟悉卻容易反覆的安全模式，學習走向新的生命能力。土星位於 ${saturn}，提醒你：眼前的卡點未必是沒有機會，而是舊結構需要被重新整理。`,
    },
    nextYear: {
      title: `${currentYear}–${currentYear + 1} 的重要轉折窗口`,
      body: `未來一年仍以 ${chart.mahaDasha} 大運為主軸。當你願意把注意力放回長期方向，而不是只處理眼前焦慮，事業、關係與資源會出現更清楚的轉折訊號。`,
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

    const [planetRaw, nakshatraRaw, lagnaRaw, dashaRaw] = await Promise.all([
      vedAstroCall(env, 'AllPlanetRasiSigns', { time: birth, Ayanamsa: 'LAHIRI' }),
      vedAstroCall(env, 'MoonConstellation', { time: birth, Ayanamsa: 'LAHIRI' }),
      vedAstroCall(env, 'LagnaSignName', { time: birth, Ayanamsa: 'LAHIRI' }),
      vedAstroCall(env, 'DasaAtRange', {
        birthTime: birth,
        startTime: check,
        endTime: rangeEnd,
        levels: 2,
        precisionHours: 168,
        Ayanamsa: 'LAHIRI',
      }),
    ]);

    const planets = parsePlanetSigns(planetRaw);
    const lagna = cleanText(lagnaRaw, 30);
    const moonNakshatra = cleanText(nakshatraRaw, 80);
    const dasha = parseDashaRange(dashaRaw);
    if (!lagna || !planets.Moon || !planets.Sun || dasha.maha === 'Unknown') throw new Error('VedAstro response incomplete');

    const chart: VedicChartData = {
      ayanamsa: 'LAHIRI', lagna, sunSign: planets.Sun, moonSign: planets.Moon,
      moonNakshatra, planets, mahaDasha: dasha.maha, antarDasha: dasha.antar,
      dashaTimeline: dasha.timeline,
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
      chart,
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
};

function fallbackReport(scope: VedicReportScope, chart: VedicChartData) {
  const areas = scope === 'full' ? REPORT_SCOPES.filter((item) => item !== 'full') : [scope];
  const timelineSummary = chart.dashaTimeline.length
    ? chart.dashaTimeline.map((period) => `${period.start} 至 ${period.end}：${period.lord} 大運`).join('；')
    : `${chart.mahaDasha} 大運`;
  return {
    title: SCOPE_NAMES[scope],
    introduction: `你的上升為 ${chart.lagna}、月亮位於 ${chart.moonSign}，目前行經 ${chart.mahaDasha} 大運。這份指引以星盤象徵協助你整理生命方向，不把任何結果視為不可改變的命定。`,
    sections: areas.map((area) => ({
      heading: SCOPE_NAMES[area],
      body: `${area === 'timeline' ? `VedAstro 計算出的週期為：${timelineSummary}。` : ''}${DASHA_THEMES[chart.mahaDasha]?.[1] ?? '你正處於重新理解人生方向的週期。'} 羅喉位於 ${chart.planets.Rahu}、計都位於 ${chart.planets.Ketu}，提醒你把熟悉模式與新的成長方向放在一起觀察。請將這段內容當成自我覺察的地圖，並以現實經驗、專業意見與自己的選擇作為最後依據。`,
    })),
    closing: '星盤描述的是能量傾向與時間節奏，而不是替你決定人生。你仍然擁有選擇、調整與創造新道路的力量。',
  };
}

async function generatePaidReport(env: Env, scope: VedicReportScope, chart: VedicChartData) {
  if (!env.OPENAI_API_KEY) return fallbackReport(scope, chart);
  const prompt = {
    task: '依據真實印度占星結構資料，撰寫晶域心語付費深度指引。',
    scope,
    scope_name: SCOPE_NAMES[scope],
    chart,
    rules: [
      '只使用提供的星盤資料，不杜撰行星位置、日期、月份或事件。',
      '使用繁體中文，語氣溫柔、具體、容易理解，兼顧生活、心理、能量與靈性角度。',
      '不得宣稱命定、保證發財、保證婚姻或預測疾病死亡。',
      '財務、醫療、法律議題必須提醒讀者搭配合格專業意見。',
      '單項報告產出 4 至 6 段；完整報告依 career、relationship、karma、timeline 各產出一個 section。',
      'timeline 只能使用 chart.dashaTimeline 已提供的起訖日期，不得虛構其他精確月份或事件。',
      '回傳 JSON：title、introduction、sections（heading/body）、closing。',
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
          { role: 'system', content: '你是熟悉 Jyotish 印度占星語彙的靈性陪伴型解讀者。你忠於輸入資料、拒絕命定論，也不以恐懼促銷。' },
          { role: 'user', content: JSON.stringify(prompt) },
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: scope === 'full' ? 7000 : 3500,
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
      ? parsed.sections.slice(0, scope === 'full' ? 8 : 6).map((entry) => {
        const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
        return { heading: cleanText(row.heading, 120), body: cleanText(row.body, 6000) };
      }).filter((entry) => entry.heading && entry.body)
      : [];
    if (!title || !introduction || !sections.length) throw new Error('OpenAI report invalid');
    return { title, introduction, sections, closing };
  } catch {
    return fallbackReport(scope, chart);
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
  if (existing) return json(req, env, { scope, report: JSON.parse(existing.content_json), cached: true });

  const chartRow = await env.DB.prepare('SELECT * FROM vedic_charts WHERE id = ?')
    .bind(chartId).first<StoredChart>();
  if (!chartRow) return badRequest(req, env, '找不到星盤資料');
  const chart = JSON.parse(chartRow.chart_json) as VedicChartData;
  const report = await generatePaidReport(env, scope, chart);
  await env.DB.prepare(
    `INSERT INTO vedic_reports (id, chart_id, order_id, scope, content_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), chartId, orderId, scope, JSON.stringify(report), new Date().toISOString()).run();
  return json(req, env, { scope, report, cached: false }, { status: 201 });
}
