import {
  Env,
  json,
} from './utils';
import { ensureHumanDesignSchema } from './humanDesignSchema';

export const REPORT_VERSION = 'professional-v11';
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

const CENTER_MEANINGS: Record<CenterName, string> = {
  head: '頭頂中心關於靈感、疑問與思考壓力。日常中，它會出現在「我一定要想出答案嗎」「這個問題真的是我需要處理的嗎」等時刻。它的成熟力量不是知道所有事情，而是允許靈感來去，辨認哪些問題值得投入。工作上，它帶來提問與開創視角；關係裡，則提醒你不要因別人的困惑而替對方扛起答案。靈性層面上，它像接收天空訊息的門，保持開放，但不必抓住每一朵經過的雲。',
  ajna: '邏輯中心關於理解、觀點、記憶與形成概念。它影響你如何整理資訊、建立信念，也關係到你是否需要證明自己是對的。工作中，它幫助分析、規劃與表達看法；在人際裡，則可能因害怕被質疑而變得固執或過度解釋。成熟的邏輯中心明白：觀點是理解世界的一扇窗，不是唯一真相。靈性上，它邀請你讓頭腦成為服務生命的工具，而不是控制人生的主人。',
  throat: '喉嚨中心掌管表達、行動與被世界聽見的方式。它不只關於說話，也包含創作、行動、沉默與選擇何時出現。工作上，它影響提案、領導與把想法化為現實；關係中，它反映你能否說出需要，又不靠音量換取注意。當能量失衡，可能急著發言、害怕沒人看見，或把真話吞回去。靈性上，喉嚨是一道把內在轉化為外在的門，真正有力量的聲音來自時機與真實一致。',
  g: 'G 中心關於自我認同、愛與人生方向。它回答的不是「我應該成為誰」，而是「在什麼人與地方身邊，我更像自己」。工作上，它影響你選擇道路與感受使命；關係中，它提醒愛不等於失去方向，也不需要透過被選擇來證明價值。失衡時，可能執著尋找唯一身分，或為了留住關係而改變自己。靈性層面上，G 中心像內在羅盤；方向不一定靠想出來，常在合適環境中自然顯現。',
  heart: '心臟中心也稱意志力中心，關於承諾、價值、物質交換與證明自己的動力。工作上，它影響談判、目標與是否能守住承諾；關係裡，則反映你會不會用過度付出換取肯定。失衡時，容易把休息視為軟弱，或以金錢、成就和他人的認可衡量價值。成熟的力量懂得量力而為，也敢於說不。靈性上，它提醒你：真正的價值不是完成多少任務，而是即使不證明，你仍值得被愛與尊重。',
  sacral: '薦骨中心位於下腹，關於生命力、工作能量、慾望與身體回應。它會透過想靠近、眼睛發亮、自然有聲音，或突然沒力、想退開來表達意願。工作上，它支持持續練習與投入；關係中，它幫助辨認身體是否真心願意親近。失衡時，可能因「應該」而長期硬撐，把忙碌誤認成價值。靈性上，薦骨像生命之火；它不是無限電池，而是一股只願意流向真正有回應之事的神聖力量。',
  'solar-plexus': '情緒中心關於感受、情緒浪潮、親密與渴望。情緒不是需要被修掉的問題，而是一種讓生命有深度、有色彩的能量。工作中，它影響創意、關係氣氛與承諾時機；親密關係裡，它提醒雙方不要在情緒最高或最低點做永久決定。失衡時，可能害怕衝突而壓抑，或把一時感受當成全部真相。靈性上，情緒像潮汐，成熟不是永遠平靜，而是允許浪潮經過後再看見清明。',
  spleen: '脾臟中心關於直覺、健康、安全感與活在當下的敏銳度。它的訊息通常安靜、短暫，可能是一瞬間的放鬆、收縮、氣味感、身體不適或「就是知道」。工作上，它協助即時判斷風險；關係裡，它會察覺某個人是否讓身體安心。失衡時，可能因害怕失去而抓住已不健康的事物，也可能讓焦慮蓋過直覺。靈性上，脾臟像古老守護者，只在此刻輕聲提醒什麼能滋養生命。',
  root: '根部中心關於壓力、推進力、腎上腺節奏與完成事情的動能。它會讓人想趕快開始、趕快結束，也能在對的時機提供突破停滯的力量。工作中，它影響期限、效率與承壓方式；關係裡，則可能把自己的急迫傳給別人，或接下別人的焦慮。失衡時，容易一直趕路，即使休息也覺得有罪。靈性上，根部連結大地，提醒你真正的穩定不是沒有壓力，而是知道何時行動、何時把重量交還土地。',
};

const CENTER_PRACTICES: Record<CenterName, string> = {
  head: '練習把腦中問題寫下來，分成「現在需要處理」與「只是經過的靈感」，讓注意力回到真正重要的事。',
  ajna: '練習在表達觀點後加上一句「這是我目前的理解」，為新的資訊與別人的視角保留空間。',
  throat: '開口前先感受呼吸是否順暢；若身體緊繃，可以先寫下來，等待更適合被聽見的時刻。',
  g: '當方向混亂時，先不要逼自己決定；換一個讓身體舒服的空間，觀察你在那裡更想靠近什麼。',
  heart: '承諾前先確認時間、體力與真實意願，也練習在沒有完成任何成就的日子，仍肯定自己的價值。',
  sacral: '請別人用簡單的是非題詢問你，留意下腹、聲音和姿勢的第一反應，再用頭腦安排細節。',
  'solar-plexus': '重要決定至少睡一晚，記錄情緒高低時的看法；反覆都存在的安靜意願，才更接近清明。',
  spleen: '每天回想一次身體曾給過的微小提醒，不急著判斷對錯，慢慢學會辨認直覺與焦慮的差別。',
  root: '感到急迫時，先做三次深長吐氣，問自己「真的有期限，還是我只想快點解除壓力？」再決定下一步。',
};

const CENTER_INTEGRATIONS: Record<CenterName, string> = {
  head: '從心理角度，反覆想事情有時是焦慮想取得控制，不一定代表直覺正在提醒；從現實角度，資訊過量、睡眠不足與長時間使用手機也會增加腦內壓力。先照顧休息與資訊界線，再判斷一個念頭是否值得追隨。你不必回應所有人的問題，也不需要因暫時沒有答案而懷疑自己的智慧。',
  ajna: '從學習角度，你可能需要透過閱讀、對話、圖像或親身操作，才能把資訊變成自己的理解；沒有一種方式比較高級。從關係角度，真正的交流不是說服對方，而是能在保有觀點時仍保持好奇。若思緒長期混亂，也要考慮壓力、作息與資訊量，而不是把所有狀況都解釋成能量問題。',
  throat: '從心理角度，急著說話可能來自害怕被忽略，沉默也可能是保護自己，而不全是中心狀態造成。從工作角度，好的表達需要內容、結構、時機與聽眾，不能只靠氣場。你可以練習先確認「我想被理解、想影響結果，還是只想釋放情緒」，不同目的需要不同的說話方式。',
  g: '從現實角度，方向也受到能力、資源、家庭責任與生活階段影響，不是只要感覺正確就能忽略條件。從心理角度，身分改變可能帶來失落，也可能是成長。請允許自己一邊尊重內在羅盤，一邊蒐集資訊、安排過渡；真正適合的方向通常讓你更完整，而不是要求你切斷所有責任。',
  heart: '從財務角度，價值需要透過定價、合約、時間與成果清楚表達；從心理角度，過度承諾常和害怕失望、害怕不夠好有關。意志力本來就需要休息，不適合用每天的產量衡量。若心口長期緊繃或身體不適，仍應尋求專業醫療協助，人類圖只能提供自我觀察，不能取代健康判斷。',
  sacral: '從身體角度，睡眠、疾病、飲食與長期壓力都會影響生命力，低能量不必立刻解讀為選錯方向。從工作角度，喜歡一件事仍需要合理工時、技能與休息；有回應也不是答應所有細節。成熟的薦骨力量會在投入與停止之間保持誠實，知道什麼值得持續，也知道何時已經完成。',
  'solar-plexus': '從心理角度，情緒浪潮與創傷反應、依附需求或現實壓力可能交織，需要耐心分辨。感受值得被尊重，但不是傷害自己或別人的理由。關係中可以暫停衝突，約定冷靜後再談；若情緒長期影響生活與安全，應尋求心理或醫療專業。靈性理解與專業支持可以並存，並不互相否定。',
  spleen: '從心理角度，直覺通常短而清楚，焦慮則會反覆推演最壞結果；但兩者有時不容易立刻區分。從現實角度，安全判斷仍要結合證據、專業資訊與風險評估。若身體持續疼痛或不適，不要只當成能量訊息，應及時就醫。尊重直覺的同時照顧現實，才是完整的自我保護。',
  root: '從工作角度，期限可以帶來聚焦，也可能掩蓋不合理的工作量；從心理角度，忙碌有時讓人暫時逃避空虛、焦慮或困難情緒。請分辨推進力是清楚的動能，還是只想快點擺脫壓力。建立優先順序、預留緩衝與真正休息，會讓根部的力量從慌張趕路，轉為穩定而有方向的前進。',
};

const CENTER_LIFE_EXAMPLES: Record<CenterName, string> = {
  head: '例如在會議裡，別人丟出一個尚未釐清的問題，你可能立刻開始搜尋答案，回家後仍停不下來；在家庭中，也可能因親友的擔憂而反覆思考並替大家規劃。較平衡的做法，是先確認問題屬於誰、現在是否需要處理，再決定投入多少注意力。冥想時若念頭很多，也不代表做錯，只需讓它們經過，將意識帶回呼吸與身體。',
  ajna: '例如工作上收到新資訊時，你可能很快形成看法，也可能需要多次討論才整理清楚；與伴侶爭執時，雙方常不是誰比較有道理，而是使用了不同理解框架。可以先重述對方觀點，確認自己真的聽懂，再表達目前想法。學習時則觀察自己適合文字、圖像、聲音還是實作，找到符合大腦節奏的方法，比勉強模仿別人更有效。',
  throat: '例如簡報時，你可能內容準備充分卻因場合不安全而說不出來，也可能還沒想清楚便為了填補沉默而不停說。親密關係中，真正的需要若被包裝成指責，對方通常只會防衛。可以練習用「我現在感到……我需要……」開頭，並先確認對方是否有空間聆聽。創作、歌唱、書寫和行動同樣是表達，不必把所有真實都限制在口語。',
  g: '例如轉職時，你可能被理想職稱吸引，實際進入環境後卻逐漸失去自己；感情裡也可能因對方喜好而改變生活圈，最後分不清真正想要什麼。可以先問：在這個地方，我的身體是否願意長久停留？我是否能保持重要價值與關係？方向不是一次決定終生，而是每個階段都能重新校準。愛自己也包含允許身份成長、改變與更新。',
  heart: '例如同事請求幫忙時，你可能明知行程已滿仍承諾，只因不想被認為能力不足；在金錢上，也可能用低價、過度贈送或昂貴消費換取認可。可以先說「讓我確認時間再回覆」，並把承諾拆成明確範圍。真正可靠不是永遠答應，而是答應後做得到。休息並不會降低價值，清楚定價與拒絕也不是自私，而是讓交換可以長久。',
  sacral: '例如面對新工作、約會或課程時，頭腦可能列出許多優點，身體卻完全提不起勁；也可能一開始很有回應，做到某個階段後能量自然結束。這不一定是懶惰或三分鐘熱度，而可能是需要重新確認。把大問題拆成可回應的小問題，並觀察完成後是滿足還是挫折。親密接觸也需要身體真實同意，不應因責任、關係或期待而忽略感受。',
  'solar-plexus': '例如收到合作邀請時，情緒高點可能覺得一切完美，低點又想全部取消；感情爭執時，也可能在浪峰說出超過真心的話。可以先告知對方需要時間，等不同情緒都走過再回覆。若對方的情緒在你身上被放大，短暫分開空間、散步或睡一晚通常有幫助。情緒不是證據，也不是敵人；它是需要被感受、命名與消化的生命訊息。',
  spleen: '例如第一次走進某個空間時，身體可能立刻放鬆或莫名想離開；與某人互動時，也可能表面條件都好，胃部卻持續緊縮。先記住訊號，再查證現實，而不是立即把直覺神化或否定。另一方面，若只是想到未來便反覆害怕、需要不斷確認，較可能是焦慮。建立規律睡眠、健康檢查與可靠支持，能讓直覺不必在疲憊和恐懼中工作。',
  root: '例如工作清單一多，你可能不分重要性全部搶著完成，只為了快點鬆一口氣；休假時又因沒有產出而坐立不安。關係中，急迫感也可能變成催促對方立即回答。可以先區分真正期限、自己設定的期限與別人的焦慮，接著一次只完成最重要的一步。運動、走路、規律呼吸與足夠睡眠能幫助壓力有出口，但不應用過度忙碌掩蓋需要面對的問題。',
};

const CENTER_GROWTH_CONTEXT = '中心的表現也會隨年齡、成長環境、職業角色與生命階段改變。童年為了安全形成的反應，成年後未必仍適用；已定義的力量可能因壓抑而不敢使用，開放的敏感也可能經過練習成為成熟智慧。因此不要只問「我是什麼」，也要問「我在什麼條件下會如此反應」。把人類圖和真實經驗、可信任的回饋及必要的專業支持放在一起，才能得到更全面而不僵化的理解。';

function buildDetailedCenters(chart: HDChart, authority: string): string {
  const defined = new Set(chart.definedCenters ?? []);
  const centerParagraphs = (Object.keys(CENTER_LABELS) as CenterName[]).map((center) => {
    const isDefined = defined.has(center);
    const status = isDefined
      ? `你的${CENTER_LABELS[center]}屬於已定義狀態，表示這個主題在你身上較穩定，也容易自然影響周圍的人。穩定不代表永遠正向或不會疲倦；當你過度使用這股力量，仍可能變成固執、壓迫或耗損。請把它視為可靠資源，而不是必須時時輸出的責任。觀察別人在你身邊是否會放大相似特質，也留意自己能否在不證明的情況下，依然信任這份力量。`
      : `你的${CENTER_LABELS[center]}屬於開放狀態，表示你在這個主題上很能感受、放大並學習別人的能量。開放不是缺少能力，而是體驗範圍更流動；挑戰在於容易把外界狀態誤認成自己，為了擺脫不舒服而做出不屬於你的選擇。離開某個人或空間後若感受明顯減弱，就提醒自己不必承擔。透過界線與獨處，敏感最終會沉澱成理解人的智慧。`;
    return `【${CENTER_LABELS[center]}｜${isDefined ? '已定義' : '開放'}】\n${CENTER_MEANINGS[center]}${status}${CENTER_PRACTICES[center]}${CENTER_INTEGRATIONS[center]}${CENTER_LIFE_EXAMPLES[center]}${CENTER_GROWTH_CONTEXT}最後仍請以 ${authority} 判斷重要選擇，不讓單一中心的壓力替整個人做決定，並觀察它在工作、關係與獨處時的不同表現。建議每月回顧一次相關事件，記下觸發人物、身體反應、情緒變化與最後結果；經過時間比對後，你會更清楚哪些是穩定本質、哪些是環境影響，也更容易把覺察轉化成真正適合自己的生活選擇。`;
  });

  return `九大中心不是九種好壞評分，而是九個觀察生命的角度。已定義中心提供較穩定的力量，開放中心讓你感受世界並累積智慧；兩者都同時有天賦與失衡可能。閱讀以下內容時，請連結真實生活，觀察身體、工作、人際與壓力狀態，而不是只記住名詞。\n\n${centerParagraphs.join('\n\n')}`;
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
    return `${buildDetailedCenters(chart, authority)}\n\n【整體能量整合】\n你的已定義中心為 ${compactCenterList(defined, '沒有固定定義中心')}，開放中心為 ${compactCenterList(open, '開放中心較少')}，整體呈現 ${defInfo?.title ?? '目前的定義狀態'}。請特別觀察穩定力量與外界放大感受如何互相影響：有時不是某一個中心單獨作用，而是工作壓力、關係氣氛與身體疲勞同時交織。當你無法分辨時，先離開現場、補充睡眠，再回到 ${authority}，通常比立刻分析更清楚。`;
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
