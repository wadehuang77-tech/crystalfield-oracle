import {
  Env,
  json,
} from './utils';

const REPORT_VERSION = 'professional-v1';

type CenterName =
  | 'head' | 'ajna' | 'throat' | 'g' | 'heart'
  | 'sacral' | 'solar-plexus' | 'spleen' | 'root';

interface HDChart {
  type?: string;
  typeName?: string;
  profile?: string;
  profileName?: string;
  authority?: string;
  authorityName?: string;
  strategy?: string;
  notSelf?: string;
  signature?: string;
  definedCenters?: CenterName[];
  undefinedCenters?: CenterName[];
  keyChannels?: string[];
  keyGates?: number[];
  incarnationCross?: string;
  aiIntro?: string;
}

interface ChartRow {
  id: string;
  session_id: string;
  user_id: string | null;
  user_email: string | null;
  birth_date: string;
  birth_time: string | null;
  birth_city: string | null;
  hd_type: string;
  hd_profile: string;
  hd_authority: string;
  chart_data: string;
}

interface SectionDef {
  id: string;
  sort_order: number;
  icon: string;
  title: string;
  focus: string;
}

interface ReportSection {
  id: string;
  title: string;
  icon: string;
  body: string;
}

const DEFAULT_SECTIONS: SectionDef[] = [
  { id: 'centers', sort_order: 1, icon: '◉', title: '九大中心完整解析', focus: '逐一分析九大中心的定義狀態、制約入口與能量校準方式。' },
  { id: 'gates', sort_order: 2, icon: '✦', title: '64 閘門分析', focus: '解析關鍵閘門的天賦語彙、陰影模式與成熟表達。' },
  { id: 'channels', sort_order: 3, icon: '◈', title: '通道分析', focus: '說明主要通道如何形成穩定能量迴路。' },
  { id: 'personality', sort_order: 4, icon: '◇', title: 'AI 深度人格分析', focus: '整合類型、策略、權威、人生角色與本命十字。' },
  { id: 'prescription', sort_order: 5, icon: '★', title: 'AI 能量處方', focus: '提供能量管理、決策練習與環境調整建議。' },
  { id: 'career', sort_order: 6, icon: '◎', title: 'AI 職涯方向建議', focus: '從天賦輸出、適合角色與合作條件給出建議。' },
  { id: 'love', sort_order: 7, icon: '◈', title: 'AI 愛情關係分析', focus: '分析親密關係中的需求、界線與溝通節奏。' },
  { id: 'wealth', sort_order: 8, icon: '◇', title: 'AI 財富能量模式', focus: '解析金錢決策、價值交換與豐盛阻塞。' },
  { id: 'mission', sort_order: 9, icon: '✦', title: 'AI 靈魂使命', focus: '總結靈魂任務、成熟方向與年度提醒。' },
];

const CENTER_LABELS: Record<CenterName, string> = {
  head: '頭頂中心',
  ajna: '邏輯中心',
  throat: '喉嚨中心',
  g: 'G 中心',
  heart: '心臟中心',
  sacral: '薦骨中心',
  'solar-plexus': '情緒中心',
  spleen: '脾臟中心',
  root: '根部中心',
};

function list(values: Array<string | number> | undefined, fallback: string): string {
  if (!values || values.length === 0) return fallback;
  return values.join('、');
}

function centerList(values: CenterName[] | undefined, fallback: string): string {
  if (!values || values.length === 0) return fallback;
  return values.map((value) => CENTER_LABELS[value] ?? value).join('、');
}

function parseChart(row: ChartRow): HDChart {
  try {
    const parsed = JSON.parse(row.chart_data || '{}') as HDChart;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildSectionBody(sectionId: string, chart: HDChart, row: ChartRow): string {
  const typeName = chart.typeName || row.hd_type || '你的能量類型';
  const profile = chart.profile || row.hd_profile || '人生角色';
  const profileName = chart.profileName || '';
  const authority = chart.authorityName || row.hd_authority || '內在權威';
  const strategy = chart.strategy || '你的正確策略';
  const signature = chart.signature || '順流狀態';
  const notSelf = chart.notSelf || '失衡訊號';
  const cross = chart.incarnationCross || '本命十字';
  const defined = centerList(chart.definedCenters, '目前未偵測到固定定義中心');
  const open = centerList(chart.undefinedCenters, '開放中心較少');
  const gates = list(chart.keyGates, '你的主要閘門');
  const channels = list(chart.keyChannels, '你的主要通道');
  const birth = `${row.birth_date}${row.birth_time ? ` ${row.birth_time}` : ''}${row.birth_city ? ` · ${row.birth_city}` : ''}`;

  switch (sectionId) {
    case 'centers':
      return `這份九大中心解析以你的出生資料（${birth}）為基礎，先看哪些能量是穩定可依靠的，哪些能量是容易受環境放大的制約入口。你已定義的中心包含：${defined}。這些中心代表你較一致、較不需要向外尋找確認的生命功能，適合作為日常決策、工作節奏與人際互動的穩定支點。\n\n你的開放或未定義中心包含：${open}。開放中心不是缺陷，而是高度敏感的學習雷達；它們會讓你讀到別人的壓力、情緒、期待與思考模式。真正的練習不是把這些感受關掉，而是辨識「這是否屬於我」。當你用 ${strategy} 回到自己的節奏，並以 ${authority} 做最後確認，開放中心會從制約入口轉為智慧入口。`;
    case 'gates':
      return `你的關鍵閘門訊號集中在 ${gates}。閘門像是靈魂的語彙，描述你如何接收世界、如何產生衝動，以及哪些主題會反覆推動你成熟。成熟狀態下，這些閘門會成為可辨識的才華；失衡時，它們也可能變成過度證明、急著完成、害怕錯過，或一直想替他人承擔的模式。\n\n建議你把這些閘門當成觀察日誌：當你感到 ${signature} 時，記錄當下正在做什麼、和誰在一起、身體是否放鬆；當你落入 ${notSelf} 時，回看是否正在用頭腦強迫自己越過 ${authority}。這會讓閘門分析從抽象知識變成可執行的自我校準工具。`;
    case 'channels':
      return `你的主要通道為 ${channels}。通道代表兩個中心之間穩定連接的能量流，它比單一靈感更持久，也更容易在他人眼中形成「你一直都是這樣」的特質。當通道被正確使用時，你不需要過度說明自己，能量自然會形成影響力。\n\n通道分析的重點是辨識你的穩定輸出方式。若通道連到喉嚨中心，表達、行動或被看見會成為重要主題；若連到薦骨、情緒、根部等動力中心，則需要更細緻地管理承諾與壓力。你的練習是：不要把所有通道都當成隨時必須啟動的能力，而是在符合 ${strategy} 並通過 ${authority} 後，讓通道自然服務於對的人與對的場域。`;
    case 'personality':
      return `你是 ${typeName}，人生角色為 ${profile}${profileName ? ` ${profileName}` : ''}，內在權威是 ${authority}。這三個元素構成你的核心人格運作：類型說明你的能量場如何與世界互動，人生角色描述你學習與影響他人的方式，權威則是你做出正確選擇的內在機制。\n\n你的設計不適合用單純意志力推進人生。越是重要的決定，越需要回到 ${strategy}，再讓 ${authority} 完成最後篩選。當你走在對的位置，身體會更容易出現 ${signature}；當你長期偏離自己的設計，${notSelf} 會變成提醒。這不是批判，而是一套精準的導航系統，幫助你分辨哪些路是頭腦焦慮，哪些路才是真正屬於你的生命方向。`;
    case 'prescription':
      return `你的能量處方分成三層。第一層是決策衛生：未來七天，任何需要承諾時間、金錢或情感的事，都先暫停三個呼吸，問自己是否符合 ${strategy}，再交給 ${authority} 判斷。第二層是環境整理：觀察哪些人事物讓你更接近 ${signature}，哪些讓你反覆陷入 ${notSelf}，並降低後者的暴露時間。\n\n第三層是身體校準。每天固定安排一段不被打擾的空白時間，不用產出，只檢查自己的中心狀態：壓力是否是自己的？情緒是否被放大？是否正在為了證明價值而勉強承諾？這份處方的目的不是讓你變成另一個人，而是讓你的原廠設計恢復清晰，讓能量用在真正值得的方向。`;
    case 'career':
      return `職涯上，你的優勢不只來自技能，而來自能量使用方式。作為 ${typeName}，你適合的工作條件必須能支持 ${strategy}，並尊重你的 ${authority}。當工作要求你長期違反自己的節奏，即使收入或頭銜看起來合理，也容易累積 ${notSelf}，最後轉化成倦怠或自我懷疑。\n\n你適合把 ${channels} 與 ${gates} 視為職涯定位線索：它們指出你自然重複展現的洞察、創造、協調或推進能力。選擇合作時，請優先看對方是否理解你的決策節奏，而不是只看機會大小。真正適合你的職涯會讓你更穩定地感到 ${signature}，並讓你的專業被看見，而不是靠過度消耗換取短期成果。`;
    case 'love':
      return `親密關係中，你最需要被理解的是決策節奏與能量界線。${typeName} 的你在關係裡不能只靠配合維持和諧；長期忽略 ${authority}，會讓你把愛誤認成責任，把承諾誤認成壓力。你的伴侶需要知道：當你需要等待、回應、告知或沉澱時，這不是疏離，而是你保持真實的方式。\n\n開放中心 ${open} 也會影響關係互動。你可能容易吸收對方的情緒、壓力、期待或不安全感，因此界線不是冷漠，而是保持愛能流動的必要結構。成熟的關係會讓你更接近 ${signature}；若一段關係長期讓你困在 ${notSelf}，就需要重新檢視互動模式、溝通節奏與彼此對自由的尊重。`;
    case 'wealth':
      return `你的財富能量模式與「是否正確交換能量」高度相關。金錢不是單純追逐結果，而是你把天賦、時間、注意力與承諾放到正確位置後的回流。當你用 ${strategy} 選擇合作與收入機會，再用 ${authority} 決定是否承諾，財富會比較像穩定流動，而不是靠焦慮硬撐。\n\n需要留意的是，${notSelf} 可能讓你做出失衡的金錢決策：為了安全感接下不適合的工作、為了證明價值低估價格，或因為他人的期待而投入錯誤方向。你的豐盛練習是建立清楚的價值邊界：哪些服務值得收費、哪些合作會消耗核心能量、哪些機會雖然漂亮卻不符合身體的真實回應。`;
    case 'mission':
      return `你的靈魂使命由 ${cross}、${profile}${profileName ? ` ${profileName}` : ''}、以及主要通道 ${channels} 共同勾勒。這不是一句口號，而是一條會在生命不同階段反覆出現的主題線。你會被推向某些情境，學習如何以自己的設計回應世界，而不是複製別人的成功模板。\n\n當你活在使命裡，不一定代表生活永遠輕鬆，但你會更常感到 ${signature}，也更能承受必要的挑戰。你的年度提醒是：少一點用頭腦證明自己，多一點信任 ${strategy} 與 ${authority}。你的任務不是成為所有人的答案，而是把自己的能量校準到足夠清楚，讓真正需要你的人自然辨識出你的存在。`;
    default:
      return '這個段落正在建立中。';
  }
}

async function getSectionDefs(env: Env): Promise<SectionDef[]> {
  try {
    const rows = await env.DB.prepare(
      `SELECT id, sort_order, icon, title, focus
         FROM hd_report_section_defs
        WHERE active = 1
        ORDER BY sort_order ASC`
    ).all<SectionDef>();
    return rows.results.length ? rows.results : DEFAULT_SECTIONS;
  } catch {
    return DEFAULT_SECTIONS;
  }
}

async function readSavedReport(env: Env, chartId: string): Promise<ReportSection[] | null> {
  const report = await env.DB.prepare(
    `SELECT id FROM hd_full_reports WHERE chart_id = ? AND report_version = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(chartId, REPORT_VERSION).first<{ id: string }>();
  if (!report) return null;

  const sections = await env.DB.prepare(
    `SELECT section_id AS id, title, icon, body
       FROM hd_full_report_sections
      WHERE report_id = ?
      ORDER BY sort_order ASC`
  ).bind(report.id).all<ReportSection>();

  return sections.results.length ? sections.results : null;
}

async function saveReport(env: Env, row: ChartRow, chart: HDChart, defs: SectionDef[]): Promise<ReportSection[]> {
  const now = new Date().toISOString();
  const reportId = crypto.randomUUID();
  const sections = defs.map((def) => ({
    id: def.id,
    title: def.title,
    icon: def.icon,
    body: buildSectionBody(def.id, chart, row),
  }));

  await env.DB.prepare(
    `INSERT INTO hd_full_reports
      (id, chart_id, session_id, user_id, user_email, birth_date, birth_time, birth_city,
       hd_type, hd_profile, report_version, chart_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(chart_id, report_version) DO UPDATE SET
       session_id = excluded.session_id,
       user_id = excluded.user_id,
       user_email = excluded.user_email,
       birth_date = excluded.birth_date,
       birth_time = excluded.birth_time,
       birth_city = excluded.birth_city,
       hd_type = excluded.hd_type,
       hd_profile = excluded.hd_profile,
       chart_data = excluded.chart_data,
       updated_at = excluded.updated_at`
  ).bind(
    reportId,
    row.id,
    row.session_id,
    row.user_id,
    row.user_email ?? '',
    row.birth_date,
    row.birth_time ?? '',
    row.birth_city ?? '',
    row.hd_type,
    row.hd_profile,
    REPORT_VERSION,
    row.chart_data || '{}',
    now,
    now,
  ).run();

  const saved = await env.DB.prepare(
    `SELECT id FROM hd_full_reports WHERE chart_id = ? AND report_version = ? ORDER BY updated_at DESC LIMIT 1`
  ).bind(row.id, REPORT_VERSION).first<{ id: string }>();
  const finalReportId = saved?.id ?? reportId;

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    const def = defs[i];
    await env.DB.prepare(
      `INSERT INTO hd_full_report_sections
        (id, report_id, section_id, sort_order, icon, title, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(report_id, section_id) DO UPDATE SET
         sort_order = excluded.sort_order,
         icon = excluded.icon,
         title = excluded.title,
         body = excluded.body,
         updated_at = excluded.updated_at`
    ).bind(
      crypto.randomUUID(),
      finalReportId,
      def.id,
      def.sort_order,
      section.icon,
      section.title,
      section.body,
      now,
      now,
    ).run();
  }

  return sections;
}

export async function getHumanDesignFullReport(req: Request, env: Env, chartId: string): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT id, session_id, user_id, user_email, birth_date, birth_time, birth_city,
            hd_type, hd_profile, hd_authority, chart_data
       FROM hd_charts
      WHERE id = ?
      LIMIT 1`
  ).bind(chartId).first<ChartRow>();

  if (!row) {
    return json(req, env, { error: '找不到人類圖紀錄' }, { status: 404 });
  }

  const saved = await readSavedReport(env, chartId);
  if (saved) {
    return json(req, env, { report_version: REPORT_VERSION, sections: saved, cached: true });
  }

  const defs = await getSectionDefs(env);
  const sections = await saveReport(env, row, parseChart(row), defs);
  return json(req, env, { report_version: REPORT_VERSION, sections, cached: false });
}
