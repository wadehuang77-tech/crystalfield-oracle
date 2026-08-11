import {
  Env,
  json,
} from './utils';
import { ensureHumanDesignSchema } from './humanDesignSchema';

export const REPORT_VERSION = 'professional-v12';
const OPENAI_SECTION_IDS = new Set(['personality', 'prescription', 'career', 'love', 'wealth', 'mission']);
const MIN_AI_BODY_CHARS = 300;

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
  { id: 'centers', sort_order: 1, icon: '◉', title: '九大能量中心｜內在之光與開放之窗', focus: '用白話說明穩定能量、外界感受與回到自己的方式。', generation_mode: 'fixed' },
  { id: 'gates', sort_order: 2, icon: '✦', title: '靈魂閘門｜天賦與生命課題', focus: '看見關鍵閘門帶來的天賦、觸發感受與成長方向。', generation_mode: 'fixed' },
  { id: 'channels', sort_order: 3, icon: '◈', title: '能量通道｜天賦流動路徑', focus: '說明主要通道如何在生活、關係與表達中自然流動。', generation_mode: 'fixed' },
  { id: 'personality', sort_order: 4, icon: '◇', title: '靈魂能量全貌', focus: '整合類型、策略、權威、人生角色與本命十字，照見真實節奏。', generation_mode: 'openai' },
  { id: 'prescription', sort_order: 5, icon: '★', title: '七日能量回歸指引', focus: '提供能實際執行的呼吸、決策、界線與環境練習。', generation_mode: 'openai' },
  { id: 'career', sort_order: 6, icon: '◎', title: '天賦與職涯能量', focus: '從天賦、身體感受與合作節奏，找出較滋養的工作方向。', generation_mode: 'openai' },
  { id: 'love', sort_order: 7, icon: '◈', title: '親密關係與能量界線', focus: '理解愛裡的需要、情緒放大、界線與真實溝通。', generation_mode: 'openai' },
  { id: 'wealth', sort_order: 8, icon: '◇', title: '財富流動與價值能量', focus: '看見金錢選擇、價值界線與豐盛交換的內在節奏。', generation_mode: 'openai' },
  { id: 'mission', sort_order: 9, icon: '✦', title: '靈魂使命與生命方向', focus: '整合反覆出現的生命主題、內在召喚與成熟方向。', generation_mode: 'openai' },
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

const CENTER_CONCISE_GUIDANCE: Record<CenterName, { defined: string; open: string }> = {
  head: {
    defined: '靈感與提問在你身上有較穩定的節奏，你常能持續思考一個主題，也容易啟發他人。留意別把每個疑問都變成必須解決的壓力；先分辨真正重要的問題，讓思緒有停靠與休息的空間。當頭腦安靜，靈感才更容易沉澱成可用的智慧。',
    open: '你很容易接收周遭的問題、靈感與思想壓力，甚至把別人的困惑當成自己的責任。開放並不代表缺乏靈感，而是能看見更多可能。感到腦中擁擠時，先離開資訊來源、放慢呼吸，再判斷哪些問題真的值得投入，讓敏感成為洞察力。',
  },
  ajna: {
    defined: '你的思考、分析與形成觀點的方式較為穩定，能為混亂資訊建立清楚架構。這份確定感是天賦，但不必用來證明自己永遠正確。允許新經驗修正舊觀念，也聆聽不同角度；當思維保持彈性，你的邏輯就能成為理解世界的明燈。',
    open: '你的思維具有高度彈性，能理解不同觀點，也容易隨環境改變想法。真正的智慧不是強迫自己找到唯一答案，而是知道何時仍需觀察。當你因害怕被質疑而急著確定時，先放下證明，讓資料與時間沉澱，再依內在權威作出適合自己的選擇。',
  },
  throat: {
    defined: '你表達與化為行動的能量較穩定，常能自然找到自己的聲音與節奏。影響力不在於說得多，而在於時機與真實度。避免為了掌控局面而急著發言；先感受身體是否準備好，再清楚說出重點，你的話語便更容易被聽見並帶來實際改變。',
    open: '你會敏銳感受別人的說話方式與注意力，可能為了被看見而搶著表達，或在不自在時保持沉默。你的天賦是擁有多變的聲音與傳達能力。當沒有正確時機時不必勉強開口；先安住自己，等待自然邀請，話語會更清晰有力量。',
  },
  g: {
    defined: '你對自我、愛與人生方向通常有較穩定的內在感，即使道路轉彎，仍能慢慢回到自己的中心。這份穩定不是固守單一身份，而是信任生命會引領你。選擇讓身體放鬆的人與環境，不必迎合外界定義；真實活著，本身就是你的方向。',
    open: '你的身份與方向會隨人群、關係和空間產生變化，這不是迷失，而是能體驗多種生命樣貌。困難常出現在急著找固定答案或依附他人方向。與其追問我是誰，不如觀察在哪裡最自在；當環境正確，你自然會遇見適合的愛與道路。',
  },
  heart: {
    defined: '你的意志、承諾與資源運用具有較穩定的推進力，適合在真正想要時設定目標並完成約定。意志力需要休息，不是永遠證明價值的工具。慎選承諾、說到做到，也允許自己停下補充能量；你的價值並不取決於表現，而來自真實與自我尊重。',
    open: '你容易放大他人的企圖心與競爭壓力，可能透過過度承諾、工作或消費證明自己值得。開放的智慧，是看見價值從來不需比較。答應事情前先給自己時間，確認不是怕失望而勉強；當你停止證明，能量會回到真正重要的人事物上。',
  },
  sacral: {
    defined: '你擁有較穩定的生命力與工作能量，身體會以有力或退縮的感受回應眼前事物。投入真正有回應的事情，能量會越用越流動；若只靠頭腦硬撐，則容易挫折耗竭。尊重工作與休息的節奏，讓身體的滿足感成為可靠方向。',
    open: '你會放大身邊人的生命力，忙碌時可能感覺精力充沛，卻不容易知道何時該停。你的身體不適合長期維持同一輸出量。工作告一段落後主動離開能量場、提早休息，不必做到筋疲力盡；懂得適時結束，便能保護敏銳而珍貴的體力。',
  },
  'solar-plexus': {
    defined: '你的情緒以波浪方式運行，感受有高低起伏，清晰通常需要時間，而非當下立即出現。情緒不是錯誤，也不必壓抑或放大。重要決定先睡一晚，等不同心情都經過再確認；當你尊重自己的波動，情感深度會轉化為同理、創造與成熟。',
    open: '你很容易感受並放大他人的情緒，為了避免衝突，可能壓下真話或急著讓大家舒服。先提醒自己：強烈感受不一定屬於你。離開現場、深呼吸，等能量退去再溝通；當你不再替別人的情緒負責，敏感會成為理解關係氣氛的智慧。',
  },
  spleen: {
    defined: '你的直覺、警覺與身體本能較穩定，訊息常在當下以細微聲音、感覺或瞬間知道出現，而且通常只提醒一次。信任這份安靜的智慧，同時別因熟悉而留在不健康的人事物中。照顧睡眠與身體，直覺會更清楚地引導安全與健康。',
    open: '你會放大環境中的恐懼、健康感受與安全需求，可能因害怕失去而抓住已不適合的人、習慣或關係。先問自己：留下是因為健康，還是只因熟悉？透過規律休息、乾淨空間與適度距離，你能分辨外來恐懼，培養珍貴的風險洞察。',
  },
  root: {
    defined: '你具有較固定的壓力與推進節奏，能在時限或挑戰下調動力量，把壓力轉成行動。這股動能不必持續運轉，否則容易焦躁與過勞。依自己的優先順序安排任務，完成後讓身體真正放鬆；穩定的節奏比匆忙完成一切更有力量。',
    open: '你容易吸收並放大外界的急迫感，常想趕快完成所有事情，好讓壓力立刻消失。然而越急著擺脫，越可能答應過多。先確認期限是否真實，再一次處理一件事；透過走動、呼吸與留白釋放壓力，你會學會在忙碌中保持自己的步調。',
  },
};

function buildDetailedCenters(chart: HDChart): string {
  const defined = new Set(chart.definedCenters ?? []);
  const centerParagraphs = (Object.keys(CENTER_LABELS) as CenterName[]).map((center) => {
    const isDefined = defined.has(center);
    const statusKey = isDefined ? 'defined' : 'open';
    return `【${CENTER_LABELS[center]}｜${isDefined ? '已定義' : '開放'}】\n${CENTER_CONCISE_GUIDANCE[center][statusKey]}`;
  });

  return `九大中心呈現哪些能量在你身上較穩定，以及哪些位置會敏銳接收環境。已定義中心像持續發光的燈，開放中心則像能感受外界的窗；兩者都不是好壞，而是不同的生命學習方式。\n\n${centerParagraphs.join('\n\n')}`;
}

function list(values: Array<string | number> | undefined, fallback: string): string {
  if (!values || values.length === 0) return fallback;
  return values.join('、');
}

function centerList(values: CenterName[] | undefined, fallback: string): string {
  if (!values || values.length === 0) return fallback;
  return values.map((value) => CENTER_LABELS[value] ?? value).join('、');
}

function compactCenterList(values: CenterName[] | undefined, fallback: string): string {
  if (!values || values.length === 0) return fallback;
  const labels = values.map((value) => CENTER_LABELS[value] ?? value);
  if (labels.length <= 3) return labels.join('、');
  return `${labels.slice(0, 3).join('、')}等 ${labels.length} 個中心`;
}

function compactList(values: Array<string | number> | undefined, fallback: string): string {
  if (!values || values.length === 0) return fallback;
  if (values.length <= 4) return values.join('、');
  return `${values.slice(0, 4).join('、')}等 ${values.length} 個`;
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
  const defInfo = getKnowledge(knowledge, 'definition', definitionKey(chart));

  if (sectionId === 'centers') {
    return `${buildDetailedCenters(chart)}\n\n【整體能量整合】\n你的已定義中心為 ${compactCenterList(defined, '沒有固定定義中心')}，開放中心為 ${compactCenterList(open, '開放中心較少')}，整體呈現 ${defInfo?.title ?? '目前的定義狀態'}。請特別觀察穩定力量與外界放大感受如何互相影響：有時不是某一個中心單獨作用，而是工作壓力、關係氣氛與身體疲勞同時交織。當你無法分辨時，先離開現場、補充睡眠，再回到 ${authority}，通常比立刻分析更清楚。`;
  }

  if (sectionId === 'gates') {
    return `閘門像靈魂隨身帶來的生命主題。它可能是一種自然天賦，也可能是一堂反覆出現的功課；遇見特定的人、關係或環境時，那扇門會被敲響，讓你更強烈地感受到某種渴望、恐懼、創造力或智慧。它沒有好壞，只是在邀請你更深地認識自己。\n\n你的關鍵閘門是 ${compactList(gates, '目前沒有標示關鍵閘門')}。先把號碼當成線索，不必急著貼標籤。當你依照 ${authority} 做決定，這些主題會比較像能使用的光；若為了證明、討好或害怕失去而行動，同一股力量也可能變成焦慮。真正的修行，是在每次被觸動時，仍願意回到自己的節奏。`;
  }

  if (sectionId === 'channels') {
    return `通道像兩個能量中心之間自然流動的光路。它所連起的感受、表達與行動，在你身上比較穩定，也常在不經意間被別人看見。它不是你必須完成的工作清單，而是靈魂已經熟悉的一種語言。\n\n你的主要通道是 ${compactList(channels, '目前沒有標示主要通道')}。通道多寡不代表能力高低；較少時，反而可能更容易因人與環境展現不同面向。請觀察這些力量何時讓你感到自然、完整，何時又因過度使用而疲憊。讓 ${typeName} 的策略與 ${authority} 為它們掌舵，天賦就能成為照亮生活的光，而不是必須證明自己的壓力。`;
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
      return `你是 ${typeName}，帶著 ${profile}${profileName ? ` ${profileName}` : ''} 的人生角色，並透過 ${authority} 找到內在清明。這些名稱不是要把你定型，而是提醒你：靈魂有自己的步伐。你可能曾把敏感當成想太多，把需要時間誤會成不夠果斷；其實身體、情緒、直覺與聲音，都在用不同方式保護你走向適合的位置。\n\n重要選擇來臨時，先依照「${strategy}」留出空間，再讓 ${authority} 做最後確認。當能量對齊，你比較容易感到 ${signature}；若長期出現 ${notSelf}，請把它看成回家的鐘聲，而不是失敗證明。真正的你不需要用力扮演，當外界期待慢慢退去，原本的光會自己顯現。`;
    case 'prescription':
      return `這份能量處方不是叫你再做得更好，而是邀請你把散在外面的自己收回來。未來七天，凡是牽涉時間、金錢或情感的承諾，都先呼吸三次，不急著回答。問自己：「這個選擇讓我靠近 ${signature}，還是因為害怕 ${notSelf} 才勉強答應？」然後讓 ${authority} 用它自己的速度回應。\n\n每天再留十分鐘，關掉訊息，感受身體哪裡緊、哪裡鬆。想像呼吸像光，流經胸口與腹部，把不屬於你的期待慢慢送走。也請留意哪些人讓你安定，哪些互動總讓你急著證明。你不是需要被修好；你需要的是一個安全空間，重新聽見靈魂原本就有的方向。`;
    case 'career':
      return `工作不只是交換時間與收入，也是每天把生命能量放進哪裡。身為 ${typeName}，你需要能容納「${strategy}」並尊重 ${authority} 的節奏。若一個位置總讓你趕、忍、討好或證明，疲憊不一定表示能力不足，也可能是靈魂在說：這裡無法好好承接你的光。\n\n${channels} 與 ${gates} 是你的天賦線索，提醒你哪些能力較容易自然流露。選擇合作時，除了條件，也觀察身體是否更靠近 ${signature}。對的工作未必毫無挑戰，卻不會長期要求你縮小自己；它會讓付出與補充形成循環，讓專業成為能量的延伸，而不是消耗。`;
    case 'love':
      return `感情裡，你需要的不只是有人陪，而是可以用真實節奏靠近。${typeName} 的你若忽略 ${authority}，容易把愛變成責任，把勉強配合當成成熟。真正滋養的關係，會允許你等待、感受與確認，不催促你用犧牲證明愛。\n\n你的開放中心包含 ${open}，因此對方的情緒、壓力或需要，可能在你身上被放大。請練習分辨「我感受到了」不等於「我必須負責」。界線不是把愛推開，而是保護兩個人的光都能呼吸。若關係讓你更靠近 ${signature}，愛會帶來安定；若長期困在 ${notSelf}，靈魂可能正在邀請一場誠實對話、適當距離或新的選擇。`;
    case 'wealth':
      return `財富也是能量交換。當你依照「${strategy}」選擇機會，再用 ${authority} 確認承諾，金錢比較能成為支持生命的回流，而不是焦慮與透支換來的補償。你值得豐盛，也值得在創造收入的路上保有呼吸、尊嚴與完整。\n\n請留意 ${notSelf} 是否正在替你做金錢決定：因害怕不夠而接下不適合的工作，因渴望肯定而壓低價值，或因不想令人失望而過度付出。真正的豐盛從界線開始——清楚自己的時間、天賦與身體可以給多少。越靠近 ${signature}，交換會更平衡，金錢也更像滋養你的河流。`;
    case 'mission':
      return `你的靈魂使命從 ${cross}、${profile}${profileName ? ` ${profileName}` : ''} 與主要通道 ${channels} 逐漸浮現。使命不是一個華麗職稱，而是生命反覆帶你回去的主題：有些事即使合理，你仍感到不對；有些方向雖然需要勇氣，內在卻比以前更安靜。這些細微感受，是靈魂在校準你自己的路。\n\n靠近使命不代表從此沒有困難，而是挑戰之中仍能感到 ${signature}。少一點證明，多一點信任「${strategy}」與 ${authority}。你不需要成為所有人的答案，也不用急著找到唯一終點；每一次不再背叛自己的選擇，都在讓你的能量更清澈，讓真正需要這份光的人自然認出你。`;
    default:
      return '這個段落正在建立中。';
  }
}

function visibleCharCount(value: string): number {
  return value.replace(/\s/g, '').length;
}

const SECTION_DETAIL_APPENDICES: Record<string, string> = {
  gates: '理解閘門時，還可以從三個角度交叉觀察：在工作中，它是自然能力還是反覆壓力；在關係中，它是吸引、衝突還是彼此學習的入口；在身體上，被觸發時是擴張、緊繃還是想立刻行動。單一閘門不會決定命運，真正重要的是它與中心、通道、環境及當下選擇如何共同作用。把生活事件記下來，會比背誦號碼更容易理解自己的能量。',
  channels: '觀察通道時，不妨回想別人最常如何形容你，以及哪些能力即使沒有刻意準備也會自然出現。再進一步看它在壓力下是否被過度使用，例如把洞察變成控制、把行動力變成急迫，或把照顧變成犧牲。成熟的通道不是永遠強烈，而是能在合適時機流動、在不需要時安靜。這會讓天賦既能服務世界，也不必消耗自己。',
  personality: '你也可以把這份全貌放回三種情境驗證：獨處時、親密關係中，以及工作壓力下。若某個特質只在特定人身邊出現，它可能來自開放中心的放大；若不論環境都反覆存在，則更可能是穩定能量。這樣交叉理解，能避免把一時反應當成全部的自己，也讓人類圖真正成為認識生命的工具。',
  prescription: '執行練習時，請不要只記錄有沒有做到，也記錄身體與情緒的變化：睡眠是否更穩、肩頸是否放鬆、拒絕後是否先內疚再恢復平靜、接近某些人時是否更有力量。這些微小變化才是能量重新校準的證據。若某個練習造成更多壓力，可以縮小步驟；療癒不是考試，而是找到身體願意長久配合的方式。',
  career: '評估職涯時，可以同時檢查四件事：工作內容是否使用你的自然天賦、節奏是否符合身體、合作關係是否尊重界線，以及付出後是否有足夠恢復。高收入或好頭銜不一定等於適合，短暫疲累也不代表走錯路；關鍵是長期趨勢。若你逐漸更像自己、更能清楚決定並保有生命力，這份工作便較可能與能量方向一致。',
  love: '理解感情時，除了問「他愛不愛我」，也可以問：我在這段關係裡能否呼吸、能否誠實說不、衝突後能否回到自己？健康的親密不會完全沒有摩擦，而是雙方願意分辨彼此的情緒與責任。當你不再替對方承擔所有感受，也不要求對方填滿自己的開放處，愛才會從拉扯轉為交流，從依附轉為同行。',
  wealth: '從現實角度，請同時檢視收入結構、定價、時間成本、風險與身體負荷；從心理角度，觀察你是否因害怕匱乏而過度工作，或因不敢被看見而低估價值；從能量角度，則感受交換是否平衡。靈性豐盛不是只靠相信，也需要清楚界線與可執行安排。當內在價值和外在行動一致，金錢才更容易成為支持生命的資源。',
  mission: '使命也可以從三條線索理解：哪些主題一再回到生命中、哪些經驗讓你即使辛苦仍感到值得，以及別人經常因什麼而被你幫助。它可能透過職業呈現，也可能存在於關係、創作、照顧或選擇活法之中。不要因尚未找到明確名稱就否定自己；使命往往不是突然揭曉，而是在一次次忠於內在的選擇中，逐漸長出清楚形狀。',
};

function ensureDetailedBody(sectionId: string, body: string): string {
  if (sectionId === 'centers' || visibleCharCount(body) >= 300) return body;
  const appendix = SECTION_DETAIL_APPENDICES[sectionId] ?? '請把這份內容放回真實生活驗證，從身體感受、情緒變化、關係互動、工作節奏與環境影響等角度交叉觀察。人類圖不是替你下結論，而是提供一套更細緻的自我理解方式；當文字和實際經驗不同時，先尊重身體與長期觀察，再慢慢找到真正適合自己的解讀。';
  return `${body}\n\n${appendix}`;
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
      '每個 section 的 value 必須至少 300 個中文字，少於 300 個中文字視為錯誤。',
      '建議每個 section 產出 300 到 400 個中文字，分成 3 到 5 段。',
      '先從使用者可能熟悉的生活感受切入，再解釋人類圖含義。',
      '語言比例約為六成日常易懂、四成靈性與能量視角；讓讀者感到被理解，也知道可以怎麼做。',
      '專有名詞一次只解釋一個，出現 Type、Authority、Profile、中心、通道或閘門時，立刻用白話或身體感受說明。',
      '著重靈魂成長、能量流動、身體智慧、關係界線、環境影響與回到內在，不把內容寫成操作手冊或人格診斷。',
      '避免「系統、最佳化、運作機制、高效、固定電路、數據、演算法、執行方案」等機械語彙，也不要提到 AI 或模型。',
      '不要套用重複句型或制式條列；各 section 要有自己的情境、意象與實際指引。',
      '可以使用光、呼吸、河流、月亮、內在神殿等意象，但不可宣稱超自然保證、注定結果或絕對正確。',
      '語氣溫柔、有同理心但不過度煽情，不把敏感、疲憊或遲疑描述成缺陷。',
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
            content: '你是一位懂得把 Human Design 人類圖說成日常語言的靈性陪伴者。你尊重身體智慧、能量界線與靈魂成長，也嚴守個案 chart 與固定知識，不杜撰資料、不做命定預言。文字像一場溫柔而清楚的對話，不像機器產生的說明書。',
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
    if (!rows.results.length) return DEFAULT_SECTIONS;
    const copyById = new Map(DEFAULT_SECTIONS.map((def) => [def.id, def]));
    return rows.results.map((def) => {
      const copy = copyById.get(def.id);
      return copy ? { ...def, title: copy.title, focus: copy.focus } : def;
    });
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

async function saveReport(
  env: Env,
  row: ChartRow,
  chart: HDChart,
  defs: SectionDef[],
  aiBodies: Record<string, string> | null = null,
): Promise<ReportSection[]> {
  const now = new Date().toISOString();
  const reportId = crypto.randomUUID();
  const knowledge = knowledgeLookup(await getKnowledgeRows(env));
  const sections = defs.map((def) => {
    const isOpenAi = (def.generation_mode === 'openai') || OPENAI_SECTION_IDS.has(def.id);
    const body = isOpenAi
      ? normalizeAiBody(def.id, aiBodies?.[def.id], chart, row)
      : buildFixedSectionBody(def.id, chart, row, knowledge);
    return {
      id: def.id,
      title: def.title,
      icon: def.icon,
      body: ensureDetailedBody(def.id, body),
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

async function enhanceSavedReport(
  env: Env,
  row: ChartRow,
  chart: HDChart,
  defs: SectionDef[],
): Promise<void> {
  try {
    const knowledge = knowledgeLookup(await getKnowledgeRows(env));
    const aiBodies = await generateOpenAiSections(env, row, chart, defs, knowledge);
    if (aiBodies && Object.keys(aiBodies).length > 0) {
      await saveReport(env, row, chart, defs, aiBodies);
    }
  } catch (err) {
    // The complete deterministic report is already stored. AI enhancement failure
    // must never remove paid content or turn the entire report into an error state.
    console.error('human design background enhancement failed:', err);
  }
}

export async function getHumanDesignFullReport(
  req: Request,
  env: Env,
  chartId: string,
  ctx?: ExecutionContext,
): Promise<Response> {
  try {
    await ensureHumanDesignSchema(env);
  } catch (err) {
    return fullReportDbError(req, env, err, '人類圖資料庫初始化失敗');
  }

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
    const chart = parseChart(row);
    // Save and return a complete nine-section report first. AI enhancement happens
    // after the response so a slow or unavailable model cannot block paid content.
    const sections = await saveReport(env, row, chart, defs);
    if (ctx) ctx.waitUntil(enhanceSavedReport(env, row, chart, defs));
    return json(req, env, { report_version: REPORT_VERSION, sections, cached: false });
  } catch (err) {
    return fullReportDbError(req, env, err, '人類圖完整版報告產生失敗');
  }
}
