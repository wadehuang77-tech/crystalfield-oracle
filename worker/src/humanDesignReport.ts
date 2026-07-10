import {
  Env,
  json,
} from './utils';

export const REPORT_VERSION = 'professional-v7';
const OPENAI_SECTION_IDS = new Set(['personality', 'prescription', 'career', 'love', 'wealth', 'mission']);
const MIN_AI_BODY_CHARS = 100;

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

function dbErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function fullReportDbError(req: Request, env: Env, err: unknown, fallback: string): Response {
  const message = dbErrorMessage(err);
  console.error(fallback, err);
  if (/no such table:?\s*hd_charts/i.test(message)) {
    return json(req, env, { error: 'D1 migration missing: hd_charts，請先套用 009_human_design_charts.sql' }, { status: 500 });
  }
  if (/no such table:?\s*hd_report_section_defs/i.test(message)) {
    return json(req, env, { error: 'D1 migration missing: hd_report_section_defs，請先套用 010_human_design_full_reports.sql' }, { status: 500 });
  }
  if (/no such table:?\s*hd_full_reports/i.test(message)) {
    return json(req, env, { error: 'D1 migration missing: hd_full_reports，請先套用 010_human_design_full_reports.sql' }, { status: 500 });
  }
  if (/no such table:?\s*hd_full_report_sections/i.test(message)) {
    return json(req, env, { error: 'D1 migration missing: hd_full_report_sections，請先套用 010_human_design_full_reports.sql' }, { status: 500 });
  }
  if (/no such table:?\s*hd_fixed_knowledge/i.test(message)) {
    return json(req, env, { error: 'D1 migration missing: hd_fixed_knowledge，請先套用 011_human_design_fixed_knowledge.sql' }, { status: 500 });
  }
  if (/no such column:?\s*generation_mode/i.test(message)) {
    return json(req, env, { error: 'D1 migration incomplete: hd_report_section_defs.generation_mode，請確認 011_human_design_fixed_knowledge.sql 已套用' }, { status: 500 });
  }
  return json(req, env, { error: fallback }, { status: 500 });
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
      return `你是 ${typeName}，人生角色為 ${profile}${profileName ? ` ${profileName}` : ''}，內在權威是 ${authority}。這代表你不是那種適合一直用頭腦逼自己前進的人。你的內在其實有一套很細緻的節奏，它會透過身體感受、情緒沉澱、直覺或時間，慢慢告訴你什麼是真的適合你。你過去可能常覺得自己想太多、太敏感，或不夠快，但從人類圖來看，那不一定是缺點，而是你正在用自己的方式感知生命。\n\n請溫柔地記住：你不需要成為別人的版本。越是重要的決定，越需要回到 ${strategy}，再讓 ${authority} 完成最後確認。當你走在對的位置，身體會更容易出現 ${signature}；當你長期偏離自己，${notSelf} 會像一個提醒，告訴你該停下來照顧自己。這不是批判，而是你的靈魂在提醒你：真正屬於你的路，不會一直要求你背叛自己的感受。`;
    case 'prescription':
      return `你的能量處方不是要你更努力，而是讓你慢慢回到自己。未來七天，請先做一件很簡單的事：任何需要承諾時間、金錢或情感的選擇，都不要立刻答應。先停下來，呼吸三次，問自己：「這件事有讓我更靠近 ${signature} 嗎？還是只是讓我害怕變成 ${notSelf}？」接著再用 ${authority} 來感受答案。你的身體其實一直在說話，只是過去可能被責任、焦慮或別人的期待蓋住了。\n\n第二個練習，是整理你的能量環境。請觀察哪些人讓你放鬆、清明、有力量；哪些人讓你緊繃、急著證明、無法呼吸。你不一定要馬上切斷什麼，但可以開始把能量收回來。每天留十分鐘給自己，不滑手機、不回訊息，只是感覺身體。這份處方的核心是：你不需要修理自己，你只是需要回到那個還沒被外界拉走的自己。`;
    case 'career':
      return `在職涯裡，你真正的天賦不只是技能，而是你用能量的方式。作為 ${typeName}，你需要一個能尊重 ${strategy} 和 ${authority} 的工作節奏。如果一份工作總是逼你違反自己的感覺、一直趕、一直配合、一直證明，即使外表看起來有前途，也可能慢慢把你推向 ${notSelf}。那種疲憊不代表你不夠堅強，而是你的能量正在提醒你：這個位置可能不是最滋養你的地方。\n\n你的 ${channels} 和 ${gates} 可以當成職涯線索，它們指出你自然容易發光的方式。你適合選擇能讓你穩定出現 ${signature} 的合作，而不是只看頭銜、收入或別人的稱讚。真正對的工作，不會一直要求你把自己壓扁；它會讓你的能力被看見，也讓你在付出後仍然感覺自己是完整的。請相信，溫柔地選擇適合你的節奏，也是一種很深的專業。`;
    case 'love':
      return `在感情裡，你很需要一種被理解的安全感。你不是不願意愛，也不是故意慢熱或敏感，而是你的能量需要按照自己的節奏靠近。${typeName} 的你若長期忽略 ${authority}，很容易把愛變成責任，把陪伴變成壓力，把配合誤以為是成熟。真正適合你的人，不會只要求你立刻回應、立刻承諾、立刻變成他期待的樣子，而是願意理解你需要等待、感受、沉澱或確認。\n\n你的開放中心包含 ${open}，這表示你在關係裡可能很容易感受到對方的情緒、壓力或需求。請記得，界線不是冷漠，而是讓愛不要變成消耗。當一段關係讓你更靠近 ${signature}，你會感覺自己被滋養、被尊重，也更能自然地付出；如果你長期困在 ${notSelf}，那不是你愛得不夠，而是這段互動可能需要新的溝通、新的距離，或更誠實的選擇。`;
    case 'wealth':
      return `你的財富能量不是只靠拼命累積，而是和「你的能量有沒有放在對的位置」很有關。當你用 ${strategy} 選擇合作、工作或收入機會，再用 ${authority} 確認是否承諾，金錢比較容易成為自然回流，而不是焦慮換來的成果。你不是不能賺錢，而是不能長期用背叛自己的方式賺錢；那樣即使帳面增加，內在也會覺得空、累，甚至開始懷疑自己的價值。\n\n請特別留意 ${notSelf} 如何影響你的金錢決定。你可能會為了安全感接下不適合的工作，為了被肯定而低估價格，或為了不讓人失望而接受消耗你的合作。真正的豐盛練習，是慢慢建立價值邊界：你的時間值得被尊重，你的天賦值得被交換，你的身體也值得在賺錢的路上被照顧。當你越靠近 ${signature}，財富也會更像支持，而不是壓迫。`;
    case 'mission':
      return `你的靈魂使命由 ${cross}、${profile}${profileName ? ` ${profileName}` : ''}，以及主要通道 ${channels} 慢慢勾勒出來。這不是一句高高在上的口號，而是你這一生會反覆遇見的內在主題。你可能曾經覺得自己和別人不太一樣，某些事情別人可以硬撐過去，你卻會深深感受到不對勁；某些選擇看似合理，你的心卻一直無法安定。這些感覺並不是麻煩，而是你的靈魂在提醒你：你不是來複製別人的路。\n\n當你更接近使命時，不代表人生永遠輕鬆，但你會更常感到 ${signature}，也比較能承受必要的挑戰。你的提醒是：少一點急著證明自己，多一點信任 ${strategy} 和 ${authority}。你的存在不需要變成所有人的答案；你只需要把自己的能量校準清楚，讓真正需要你的人、地方和機會，自然認出你。`;
    default:
      return '這個段落正在建立中。';
  }
}

function visibleCharCount(value: string): number {
  return value.replace(/\s/g, '').length;
}

function normalizeAiBody(sectionId: string, raw: string | undefined, chart: HDChart, row: ChartRow): string {
  const trimmed = (raw ?? '').trim();
  const fallback = buildFallbackAiSectionBody(sectionId, chart, row);
  if (!trimmed) return fallback;
  if (visibleCharCount(trimmed) >= MIN_AI_BODY_CHARS) return trimmed;

  const merged = `${trimmed}\n\n${fallback}`;
  if (visibleCharCount(merged) >= MIN_AI_BODY_CHARS) return merged;
  return `${merged}\n\n請溫柔地記得，這份分析不是要替你貼上標籤，而是幫你聽見自己更深處的節奏。當你開始尊重自己的身體感受、情緒速度與能量邊界，你會慢慢發現，真正適合你的路不需要一直用力證明；它會讓你更安定，也讓你更像自己。`;
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
      '每個 section 的 value 必須至少 100 個中文字，少於 100 個中文字視為錯誤。',
      '建議每個 section 120 到 180 個中文字。',
      '每個 section 產出 1 到 2 段，內容要具體、專業、可收費，但語氣要溫柔、療癒、有同理心。',
      '不要像 AI 機器人回答，不要使用制式條列或冷冰冰的診斷語氣。',
      '寫作感覺要像一位真正懂使用者的人類圖療癒顧問，讓使用者覺得自己被理解、被接住、被溫柔提醒。',
      '可以使用「你可能曾經...」「請溫柔地記得...」「這不是你的錯...」「你的身體其實一直在提醒你...」這類有陪伴感的句子，但不要過度煽情。',
      '每段都要連回個案的人類圖資訊，例如 Type、Authority、Profile、Definition、開放中心、通道、閘門、signature 或 not-self。',
      '不要重寫固定知識百科；固定知識只作為判讀基礎。',
      '必須回傳 JSON object，key 為 section id，value 為該段落文字。',
      '不要加入 Markdown 標題，不要加入價格或付款文字。',
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  let res: Response | undefined;
  try {
    res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-5.4',
        input: [
          {
            role: 'system',
            content: '你是專業 Human Design 人類圖療癒報告撰寫顧問。你的文字有靈性、溫柔、同理心，像真正理解使用者的陪伴者；你會根據固定知識資料庫和個案 chart，產生可收費的深度分析，但不杜撰固定資料，也不使用冷冰冰的 AI 制式語氣。',
          },
          {
            role: 'user',
            content: JSON.stringify(prompt),
          },
        ],
        text: {
          format: { type: 'json_object' },
        },
        max_output_tokens: 8000,
      }),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res) {
    throw new Error('OpenAI report generation failed: no response');
  }

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
        ? normalizeAiBody(def.id, aiBodies?.[def.id], chart, row)
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
  let row: ChartRow | null;
  try {
    row = await env.DB.prepare(
      `SELECT id, session_id, user_id, user_email, birth_date, birth_time, birth_city,
              hd_type, hd_profile, hd_authority, chart_data
         FROM hd_charts
        WHERE id = ?
        LIMIT 1`
    ).bind(chartId).first<ChartRow>();
  } catch (err) {
    return fullReportDbError(req, env, err, '人類圖資料讀取失敗');
  }

  if (!row) {
    return json(req, env, { error: '找不到人類圖紀錄' }, { status: 404 });
  }

  try {
    const saved = await readSavedReport(env, chartId);
    if (saved) {
      return json(req, env, { report_version: REPORT_VERSION, sections: saved, cached: true });
    }

    const defs = await getSectionDefs(env);
    const sections = await saveReport(env, row, parseChart(row), defs);
    return json(req, env, { report_version: REPORT_VERSION, sections, cached: false });
  } catch (err) {
    return fullReportDbError(req, env, err, '人類圖完整版報告產生失敗');
  }
}
