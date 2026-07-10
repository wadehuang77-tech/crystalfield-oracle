import {
  Env,
  json,
} from './utils';

const REPORT_VERSION = 'professional-v3';
const OPENAI_SECTION_IDS = new Set(['personality', 'prescription', 'career', 'love', 'wealth', 'mission']);

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
  generation_mode?: 'fixed' | 'openai';
}

interface ReportSection {
  id: string;
  title: string;
  icon: string;
  body: string;
}

interface KnowledgeRow {
  category: string;
  key: string;
  title: string;
  body: string;
}

const DEFAULT_SECTIONS: SectionDef[] = [
  { id: 'centers', sort_order: 1, icon: '◉', title: '九大中心完整解析', focus: '逐一分析九大中心的定義狀態、制約入口與能量校準方式。', generation_mode: 'fixed' },
  { id: 'gates', sort_order: 2, icon: '✦', title: '64 閘門分析', focus: '解析關鍵閘門的天賦語彙、陰影模式與成熟表達。', generation_mode: 'fixed' },
  { id: 'channels', sort_order: 3, icon: '◈', title: '通道分析', focus: '說明主要通道如何形成穩定能量迴路。', generation_mode: 'fixed' },
  { id: 'personality', sort_order: 4, icon: '◇', title: 'AI 深度人格分析', focus: '整合類型、策略、權威、人生角色與本命十字。', generation_mode: 'openai' },
  { id: 'prescription', sort_order: 5, icon: '★', title: 'AI 能量處方', focus: '提供能量管理、決策練習與環境調整建議。', generation_mode: 'openai' },
  { id: 'career', sort_order: 6, icon: '◎', title: 'AI 職涯方向建議', focus: '從天賦輸出、適合角色與合作條件給出建議。', generation_mode: 'openai' },
  { id: 'love', sort_order: 7, icon: '◈', title: 'AI 愛情關係分析', focus: '分析親密關係中的需求、界線與溝通節奏。', generation_mode: 'openai' },
  { id: 'wealth', sort_order: 8, icon: '◇', title: 'AI 財富能量模式', focus: '解析金錢決策、價值交換與豐盛阻塞。', generation_mode: 'openai' },
  { id: 'mission', sort_order: 9, icon: '✦', title: 'AI 靈魂使命', focus: '總結靈魂任務、成熟方向與年度提醒。', generation_mode: 'openai' },
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

function definitionKey(chart: HDChart): string {
  const count = chart.definedCenters?.length ?? 0;
  if (count === 0) return 'none';
  if (count <= 3) return 'single';
  if (count <= 6) return 'split';
  return 'multiple';
}

function channelKey(channel: string): string {
  return channel.match(/^\d+-\d+/)?.[0] ?? channel;
}

function parseChart(row: ChartRow): HDChart {
  try {
    const parsed = JSON.parse(row.chart_data || '{}') as HDChart;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function knowledgeLookup(rows: KnowledgeRow[]): Map<string, KnowledgeRow> {
  const map = new Map<string, KnowledgeRow>();
  for (const row of rows) map.set(`${row.category}:${row.key}`, row);
  return map;
}

function getKnowledge(map: Map<string, KnowledgeRow>, category: string, key: string): KnowledgeRow | null {
  return map.get(`${category}:${key}`) ?? null;
}

async function getKnowledgeRows(env: Env): Promise<KnowledgeRow[]> {
  try {
    const rows = await env.DB.prepare(
      `SELECT category, key, title, body
         FROM hd_fixed_knowledge
        WHERE active = 1
        ORDER BY category, sort_order, key`
    ).all<KnowledgeRow>();
    return rows.results;
  } catch {
    return [];
  }
}

function buildFixedSectionBody(sectionId: string, chart: HDChart, row: ChartRow, knowledge: Map<string, KnowledgeRow>): string {
  const typeName = chart.typeName || row.hd_type || '你的能量類型';
  const authority = chart.authorityName || row.hd_authority || '內在權威';
  const defined = chart.definedCenters ?? [];
  const open = chart.undefinedCenters ?? [];
  const gates = chart.keyGates ?? [];
  const channels = chart.keyChannels ?? [];
  const typeInfo = chart.type ? getKnowledge(knowledge, 'type', chart.type) : null;
  const authorityInfo = chart.authority ? getKnowledge(knowledge, 'authority', chart.authority) : null;
  const profileInfo = chart.profile ? getKnowledge(knowledge, 'profile', chart.profile) : null;
  const defInfo = getKnowledge(knowledge, 'definition', definitionKey(chart));

  if (sectionId === 'centers') {
    const definedText = defined.map((center) => {
      const item = getKnowledge(knowledge, 'center', center);
      return item ? `${item.title}：${item.body}` : `${CENTER_LABELS[center] ?? center}：這個中心在你的人類圖裡屬於比較穩定的部分，可以把它想成你身上比較固定的習慣、反應和能量來源。它不代表永遠不會變，而是你比較容易信任這裡的感覺，不必一直向外找答案。`;
    });
    const openText = open.map((center) => {
      const item = getKnowledge(knowledge, 'center', center);
      return item ? `${item.title}：${item.body}` : `${CENTER_LABELS[center] ?? center}：這個中心在你的人類圖裡比較開放，可以把它想成一個容易接收外界訊號的天線。你會很容易感覺到別人的壓力、情緒或期待，但那些不一定都是你的。練習重點是先分辨，再決定要不要回應。`;
    });
    return `固定知識資料庫解析：九大中心可以理解成身體和心理裡的九個能量開關。有些中心在你身上比較穩定，像固定電源；有些中心比較開放，像接收器，容易接到環境和他人的狀態。你的類型是 ${typeName}，${typeInfo?.body ?? '類型描述將依資料庫持續補充。'}\n\n已定義中心：${centerList(defined, '無固定定義中心')}。\n${definedText.join('\n\n') || '你目前沒有固定定義中心，環境品質會直接影響能量狀態。建議你特別重視身處的人、地方和生活節奏，因為它們會明顯改變你的感受。'}\n\n開放中心：${centerList(open, '開放中心較少')}。\n${openText.join('\n\n') || '你的開放中心較少，主要練習是維持已定義中心的穩定使用。'}\n\n定義狀態：${defInfo?.title ?? '定義'}。${defInfo?.body ?? ''}`;
  }

  if (sectionId === 'gates') {
    const gateText = gates.map((gate) => {
      const item = getKnowledge(knowledge, 'gate', String(gate));
      return item ? `${item.title}：${item.body}` : `閘門 ${gate}：閘門可以理解成你身上某一種固定主題，像是一個常常出現的性格按鈕。它不一定每天都很明顯，但遇到特定人事物時，就會被啟動。解讀時不能只看號碼，還要看它接在哪個中心、是否形成通道，以及你當下是否按照自己的決策方式行動。`;
    });
    return `固定知識資料庫解析：64 閘門可以想成 64 種人生主題，每個閘門都像一個內在開關，代表你容易被什麼事情觸動、在哪些地方有天賦、又容易在哪些地方卡住。你的關鍵閘門為 ${list(gates, '尚未偵測到關鍵閘門')}。\n\n${gateText.join('\n\n')}\n\n解讀原則：64 閘門本身是固定知識，不需要呼叫 OpenAI；真正的個人化來自它們與你的中心、通道、${authority}、人生角色交叉後形成的表達方式。簡單說，閘門像材料，中心和通道像電路，你的決策方式則決定這股能量能不能用在對的地方。`;
  }

  if (sectionId === 'channels') {
    const channelText = channels.map((channel) => {
      const item = getKnowledge(knowledge, 'channel', channelKey(channel));
      return item ? `${item.title}：${item.body}` : `${channel}：通道可以理解成兩個能量中心之間已經接好的線路。當一條通道成立，代表這股能量在你身上比較固定，別人也比較容易感受到。它可能表現在工作方式、說話風格、人際互動或做決定的節奏上。重點不是把它用到滿，而是用在正確的人、事、時機上。`;
    });
    return `固定知識資料庫解析：通道是人類圖裡很重要的固定能量線，可以把它想成你身上已經接好的內在電路。中心像發電站，閘門像插座，通道就是讓能量穩定流動的線。你的主要通道為 ${list(channels, '尚未偵測到主要通道')}。\n\n${channelText.join('\n\n')}\n\n補充固定資訊：${profileInfo?.title ?? chart.profile ?? '人生角色'} - ${profileInfo?.body ?? '人生角色資料將依固定知識庫補充。'}\n${authorityInfo?.title ?? authority} - ${authorityInfo?.body ?? '權威資料將依固定知識庫補充。'}\n\n白話提醒：通道不是要你一直表現某種能力，而是提醒你這些特質比較容易自然流露。當你感到順、穩、身體沒有抗拒時，通道通常會用得比較健康；當你急著證明自己時，同一股能量也可能變成壓力。`;
  }

  return '';
}

function buildFallbackAiSectionBody(sectionId: string, chart: HDChart, row: ChartRow): string {
  const typeName = chart.typeName || row.hd_type || '你的能量類型';
  const profile = chart.profile || row.hd_profile || '人生角色';
  const profileName = chart.profileName || '';
  const authority = chart.authorityName || row.hd_authority || '內在權威';
  const strategy = chart.strategy || '你的正確策略';
  const signature = chart.signature || '順流狀態';
  const notSelf = chart.notSelf || '失衡訊號';
  const cross = chart.incarnationCross || '本命十字';
  const open = centerList(chart.undefinedCenters, '開放中心較少');
  const gates = list(chart.keyGates, '你的主要閘門');
  const channels = list(chart.keyChannels, '你的主要通道');

  switch (sectionId) {
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

function extractOpenAiText(data: unknown): string {
  const root = data as Record<string, unknown>;
  if (typeof root.output_text === 'string') return root.output_text;
  const output = Array.isArray(root.output) ? root.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const p = part as Record<string, unknown>;
      if (typeof p.text === 'string') chunks.push(p.text);
      if (typeof p.output_text === 'string') chunks.push(p.output_text);
    }
  }
  return chunks.join('\n').trim();
}

function fixedContext(chart: HDChart, row: ChartRow, knowledge: Map<string, KnowledgeRow>): string {
  const typeInfo = chart.type ? getKnowledge(knowledge, 'type', chart.type) : null;
  const authorityInfo = chart.authority ? getKnowledge(knowledge, 'authority', chart.authority) : null;
  const profileInfo = chart.profile ? getKnowledge(knowledge, 'profile', chart.profile) : null;
  const defInfo = getKnowledge(knowledge, 'definition', definitionKey(chart));
  const channelInfo = (chart.keyChannels ?? [])
    .map((channel) => getKnowledge(knowledge, 'channel', channelKey(channel))?.body)
    .filter(Boolean)
    .join('\n');

  return [
    `出生資料：${row.birth_date} ${row.birth_time ?? ''} ${row.birth_city ?? ''}`.trim(),
    `Type：${chart.typeName ?? row.hd_type}。${typeInfo?.body ?? ''}`,
    `Authority：${chart.authorityName ?? row.hd_authority}。${authorityInfo?.body ?? ''}`,
    `Profile：${chart.profile ?? row.hd_profile} ${chart.profileName ?? ''}。${profileInfo?.body ?? ''}`,
    `Definition：${defInfo?.title ?? definitionKey(chart)}。${defInfo?.body ?? ''}`,
    `已定義中心：${centerList(chart.definedCenters, '無')}`,
    `開放中心：${centerList(chart.undefinedCenters, '無')}`,
    `關鍵閘門：${list(chart.keyGates, '無')}`,
    `主要通道：${list(chart.keyChannels, '無')}`,
    channelInfo ? `通道固定知識：\n${channelInfo}` : '',
  ].filter(Boolean).join('\n');
}

async function generateOpenAiSections(
  env: Env,
  row: ChartRow,
  chart: HDChart,
  defs: SectionDef[],
  knowledge: Map<string, KnowledgeRow>,
): Promise<Record<string, string> | null> {
  if (!env.OPENAI_API_KEY) return null;

  const aiDefs = defs.filter((def) => OPENAI_SECTION_IDS.has(def.id));
  if (aiDefs.length === 0) return {};

  const prompt = {
    fixed_human_design_context: fixedContext(chart, row, knowledge),
    required_sections: aiDefs.map((def) => ({
      id: def.id,
      title: def.title,
      focus: def.focus,
    })),
    writing_rules: [
      '使用繁體中文。',
      '每個 section 產出 2 到 3 段，每段具體、專業、可收費。',
      '不要重寫固定知識百科；固定知識只作為判讀基礎。',
      '必須回傳 JSON object，key 為 section id，value 為該段落文字。',
      '不要加入 Markdown 標題，不要加入價格或付款文字。',
    ],
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5.4',
      input: [
        {
          role: 'system',
          content: '你是專業 Human Design 人類圖報告撰寫顧問。你會根據固定知識資料庫和個案 chart，產生可收費的深度分析，但不杜撰固定資料。',
        },
        {
          role: 'user',
          content: JSON.stringify(prompt),
        },
      ],
      text: {
        format: { type: 'json_object' },
      },
      max_output_tokens: 5000,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI report generation failed: ${res.status}`);
  }

  const data = await res.json();
  const text = extractOpenAiText(data);
  if (!text) return null;

  const parsed = JSON.parse(text) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const def of aiDefs) {
    const value = parsed[def.id];
    if (typeof value === 'string' && value.trim()) out[def.id] = value.trim();
  }
  return out;
}

async function getSectionDefs(env: Env): Promise<SectionDef[]> {
  try {
    const rows = await env.DB.prepare(
      `SELECT id, sort_order, icon, title, focus, generation_mode
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
  const knowledge = knowledgeLookup(await getKnowledgeRows(env));
  let aiBodies: Record<string, string> | null = null;
  try {
    aiBodies = await generateOpenAiSections(env, row, chart, defs, knowledge);
  } catch (err) {
    console.error('human design OpenAI generation failed:', err);
  }
  const sections = defs.map((def) => {
    const isOpenAi = (def.generation_mode === 'openai') || OPENAI_SECTION_IDS.has(def.id);
    return {
      id: def.id,
      title: def.title,
      icon: def.icon,
      body: isOpenAi
        ? (aiBodies?.[def.id] || buildFallbackAiSectionBody(def.id, chart, row))
        : buildFixedSectionBody(def.id, chart, row, knowledge),
    };
  });

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
