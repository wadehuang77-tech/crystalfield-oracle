import { mayaAiMode, MAYA_AI_MODEL } from './mayaAi';
import { json, readBody, type Env } from './utils';
import { premiumAdminAccess } from './mayaPremiumAdmin';
import { isMayaDate, mayaForDate, MAYA_CALCULATION_VERSION, type MayaLocale } from '../../app/src/lib/maya';
import { BLUEPRINT_CHAPTERS, blueprintEvidence, blueprintQualityIssues, LIFE_BLUEPRINT_UNSUPPORTED, LIFE_BLUEPRINT_VERSION,
  type BlueprintSection, type LifeBlueprintV2, type NinetyDayStage } from '../../app/src/lib/mayaLifeBlueprint';
import { MAYA_PRO_PRODUCT, MAYA_PRO_VERSION, PRO_CHAPTERS, validateMayaProReport, type MayaProReport, type ProSection } from '../../app/src/lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT, RELATIONSHIP_CHAPTERS, RELATIONSHIP_TYPES, RELATIONSHIP_VERSION,
  relationshipPerson, validPracticePlan, validateRelationshipReport, type RelationshipReport, type RelationshipType,
  type RelationshipSection } from '../../app/src/lib/mayaRelationship';

export const PREMIUM_LIMITS = { inputBytes: 10000, inputTokens: 11000, outputTokens: 2200, reservationTwd: 0.11,
  reportCapTwd: 2, orderCapTwd: 4, timeoutMs: 60000 } as const;
type Product = typeof MAYA_PRO_PRODUCT.code | typeof MAYA_RELATIONSHIP_PRODUCT.code;
type Report = MayaProReport | RelationshipReport;
interface Inputs { a: string; b: string | null; relationshipType: RelationshipType | null }
interface Row {
  id: string; user_id: string; order_id: string; entitlement_id: string; product_code: Product; locale: MayaLocale;
  request_fingerprint: string; inputs: string; status: 'processing' | 'completed' | 'blocked';
  report_content: string | null; last_error_code: string | null;
}
interface TextSection {
  interpretation: string; lifeExamples: string[]; reflectionQuestions: string[]; actionSteps: string[];
  perspectives?: RelationshipSection['perspectives']; ninetyDayPlan?: NinetyDayStage[];
}
export class PremiumError extends Error {
  constructor(readonly code: string, readonly status = 409) { super(code); }
}
export function premiumLiveEnabled(env: Env): boolean {
  return env.MAYA_PREMIUM_LIVE_ENABLED === 'true' && env.MAYA_AI_ENABLED === 'true'
    && env.MAYA_AI_MODE === 'live' && !!env.OPENAI_API_KEY;
}
export function premiumRevisionFeedback(value: unknown, locale: MayaLocale, pair = false): string {
  const fields = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : [];
  const perspectives = fields.perspectives && typeof fields.perspectives === 'object' && !Array.isArray(fields.perspectives)
    ? Object.values(fields.perspectives).filter((s): s is string => typeof s === 'string') : [];
  const plan = Array.isArray(fields.ninetyDayPlan) ? fields.ninetyDayPlan.flatMap((stage: unknown) => {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) return [];
    const row = stage as Record<string, unknown>;
    return [...strings(row.actionSteps), ...strings(row.reflectionQuestions)];
  }) : [];
  const text = [typeof fields.interpretation === 'string' ? fields.interpretation : '', ...perspectives,
    ...strings(fields.lifeExamples), ...strings(fields.reflectionQuestions), ...strings(fields.actionSteps), ...plan].join('\n');
  const chars = text.match(/[\u3400-\u9fff]/gu)?.length ?? 0;
  const words = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu)?.length ?? 0;
  if (locale === 'en') return `Measured reader text: ${words} English words and ${chars} Chinese characters. Revise to 180–350 English words total, including viewpoints and all plan items; no Chinese. Repair missing evidence identifiers or structure. Retain distinct substantive viewpoints and specific actions.`;
  if (pair) return `目前${chars}個漢字。雙人中文章節沒有總字數下限，349字可接受；350至500字僅為寫作目標，500字仍是上限。不要因字數不足補字或擴寫；修正缺漏依據、格式、重複內容或空白視角。若超過500字，刪減重複描述但保留三視角、具體建議與全部計畫項目。只計讀者可見漢字，不含欄位名；不得用套話或字數宣告填充內容。`;
  const adjustment = chars < 350
    ? `目前只有${chars}個漢字，距350字硬性下限仍差${350 - chars}字。保留原稿的有效內容，另外增加${440 - chars}至${470 - chars}個漢字：擴充具體生活情境、可調整選擇與不同視角；不要把原稿改短。`
    : chars > 500
      ? `目前${chars}個漢字，超過500字上限。刪減${chars - 470}至${chars - 420}個漢字的重複描述，保留依據、不同視角與所有計畫項目。`
      : `目前${chars}個漢字，字數已在規格內。保留字數，修正缺漏依據、格式或重複內容。`;
  return `${adjustment}完整JSON內可閱讀文字總計目標440至470個漢字，硬性範圍350至500；只數漢字，不含標點、數字、英文、欄位名。包含三視角與全部計畫項目。不得用套話、重複段落或字數宣告補字；必須有新增的具體反思價值。`;
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new PremiumError('INVALID_INPUT', 400);
  return value;
}
function version(product: Product) { return product === MAYA_PRO_PRODUCT.code ? MAYA_PRO_VERSION : RELATIONSHIP_VERSION; }
function canonical(inputs: Inputs, locale: MayaLocale) {
  return { a: relationshipPerson(inputs.a, locale), b: inputs.b ? relationshipPerson(inputs.b, locale) : null };
}
function evidenceForPrompt(inputs: Inputs, locale: MayaLocale, index: number, pair: boolean) {
  const people = canonical(inputs, locale);
  const compact = (p: typeof people.a) => {
    const signature = mayaForDate(p.birthDate, locale);
    return { seal: signature.solar_seal, tone: signature.galactic_tone,
      ...(index >= (pair ? 8 : 12) ? {
        oracle: Object.fromEntries(Object.entries(p.oracle.positions).map(([key, v]) => [key, { seal: v.sealName, tone: v.toneName }])),
        wavespell: { number: p.wavespell.number, position: p.wavespell.position,
          startKin: p.wavespell.startKin, endKin: p.wavespell.endKin },
      } : {}) };
  };
  return { a: compact(people.a), ...(people.b ? { b: compact(people.b) } : {}) };
}
function schema(pair: boolean, plan: boolean) {
  const text = { type: 'string' };
  const list = (min: number, max: number) => ({ type: 'array', minItems: min, maxItems: max, items: text });
  const object = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
  return object({
    interpretation: text, lifeExamples: list(1, 1), reflectionQuestions: list(1, 1), actionSteps: list(1, 1),
    ...(pair ? { perspectives: object({ a: text, b: text, shared: text }) } : {}),
    ...(plan ? { ninetyDayPlan: { type: 'array', minItems: 3, maxItems: 3, items: object({
      id: { type: 'string', enum: ['awareness', 'action-adjustment', 'integration'] },
      startDay: { type: 'integer', enum: [1, 31, 61] }, endDay: { type: 'integer', enum: [30, 60, 90] },
      actionSteps: list(3, 3), reflectionQuestions: list(3, 3),
    }) } } : {}),
  });
}
export function premiumPrompt(product: Product, inputs: Inputs, locale: MayaLocale, index: number, previous: TextSection[]) {
  const pair = product === MAYA_RELATIONSHIP_PRODUCT.code;
  const chapter = pair ? RELATIONSHIP_CHAPTERS[index] : index < 12 ? BLUEPRINT_CHAPTERS[index] : PRO_CHAPTERS[index - 12];
  if (!chapter) throw new PremiumError('INVALID_SECTION');
  const basis = evidenceForPrompt(inputs, locale, index, pair);
  const references = [basis.a.seal, basis.a.tone, ...(basis.b ? [basis.b.seal, basis.b.tone] : [])];
  const plan = index === 11;
  const system = [
    'Write one structured JSON chapter of an optional Dreamspell symbolic self-reflection report. No Markdown, HTML or extra fields.',
    locale === 'en' ? 'Natural English only, no Chinese. Total 120–450 words across ALL fields, including perspectives and plan.'
      : pair ? '只用自然繁體中文。全部文字目標350至500個中文字，但沒有總字數下限；349字可接受，內容完整即可，不要補字。500字是硬性上限，包含三視角與九十天計畫。只計漢字，不計標點、數字、英文或JSON欄位名稱。'
        : '只用自然繁體中文。全部文字合計350至500個中文字，目標440字；只計算漢字，不計標點、數字、英文或JSON欄位名稱。包含三視角與九十天計畫；第十二章解析要簡短，保留字數給計畫。',
    locale === 'zh-TW' ? plan
      ? pair ? '第十二章建議字數分配：interpretation約100中文字；每個三視角約25字；情境約40字、提問約20字、行動約30字；計畫18項每項約8至10字。沒有總字數下限，保留完整計畫及三視角，總計不得超過500字。'
        : '第十二章字數分配：interpretation約100中文字；情境約40字、提問約20字、行動約30字；計畫18項每項約8至10字。總字數必須至少350字且不超過500字。'
      : pair ? '建議字數分配：interpretation約180至200中文字；a、b、shared三視角各約40字；lifeExamples一項約45字；reflectionQuestions一項約20字；actionSteps一項約35字。以完整且不重複的內容為優先，不以總字數下限限制。'
        : '字數分配：interpretation必須寫約290至310個中文字的完整深度解析，不能縮成兩三句；lifeExamples一項約55中文字，reflectionQuestions一項約25中文字，actionSteps一項約45中文字。合計約420至440個中文字，切勿縮成300字。'
      : '',
    locale === 'en' ? plan
      ? 'PLAN CHAPTER LENGTH: interpretation 50–70 words; each viewpoint 15–20 words if a pair; exactly ONE example, ONE question and ONE action, each 8–12 words. Each of the 18 plan items is ONLY 4–7 words. Total including plan must stay below 400 words.'
      : pair ? 'Use 90–120 interpretation words, 20–30 words per viewpoint, and exactly ONE example, ONE question and ONE action, each 10–20 words. Total 180–300 words.'
        : 'Use 130–170 interpretation words and exactly ONE example, ONE question and ONE action, each 10–20 words.'
      : '',
    'Only use supplied verified symbols. Never calculate or invent KIN, pair KIN, oracle, wavespell, age periods or fortune cycles.',
    'Do not write KIN numbers in prose. Do not invent other seal/tone names. No scientific psychology claims, literal alien origins, actual biography, fate, wealth predictions, medical diagnosis/cures, compatibility scores or investment advice.',
    'Conditional examples, consent, autonomy, actionable experiments. Each chapter must have a distinct focus and non-repeated paragraphs.',
    'interpretation must explicitly mention the supplied seal and tone names. For a pair, respect both people, never assume a romantic relationship.',
    `MANDATORY: interpretation must literally include EACH of these exact identifiers: ${JSON.stringify(references)}. Mention seal AND tone for BOTH people, even in synthesis chapters. Do not substitute generic phrases such as "their tones".`,
    pair ? 'perspectives.a, perspectives.b and perspectives.shared must be distinct substantive viewpoints, not name swaps. Neither person is inherently right; do not pressure anyone to stay in unsafe relationships.' : '',
    !pair && index < 12 ? 'Do not mention oracle, wavespell or castle in these twelve chapters, even to deny them.' : '',
    index === 12 && !pair ? 'Integrate the five oracle positions and tensions rather than repeating identity.' : '',
    index === 13 && !pair ? 'Compare wavespell stages and birth position as symbolic learning, not an astronomical or age calendar.' : '',
    (index === 14 || pair && index >= 10) ? 'Synthesize the actual preceding summaries, select trade-offs and practical priorities, do not fabricate prior findings.' : '',
    plan ? 'ninetyDayPlan: awareness days1–30, action-adjustment days31–60, integration days61–90. Each stage has THREE short concrete actions and THREE short reflection questions. It is a practice schedule, not a prediction.' : '',
  ].filter(Boolean).join('\n');
  return { system, user: JSON.stringify({ chapter, evidence: basis, relationshipType: inputs.relationshipType,
    previous: previous.map((s, i) => ({ chapter: i + 1, summary: s.interpretation.slice(0, 70) })) }),
  responseSchema: schema(pair, plan) };
}
function assemble(product: Product, inputs: Inputs, locale: MayaLocale, texts: TextSection[]): Report {
  const people = canonical(inputs, locale);
  if (product === MAYA_RELATIONSHIP_PRODUCT.code) {
    if (!people.b || !inputs.relationshipType) throw new PremiumError('INVALID_INPUT', 400);
    const report: RelationshipReport = {
      reportVersion: RELATIONSHIP_VERSION, productCode: product, locale, relationshipType: inputs.relationshipType,
      people: { a: people.a, b: people.b }, provider: 'openai',
      sections: texts.map((s, i) => {
        if (!s.perspectives) throw new PremiumError('AI_SCHEMA_INVALID');
        return { id: RELATIONSHIP_CHAPTERS[i].id, interpretation: s.interpretation, perspectives: s.perspectives,
          lifeExamples: s.lifeExamples, reflectionQuestions: s.reflectionQuestions, actionSteps: s.actionSteps };
      }),
      ninetyDayPlan: texts[11]?.ninetyDayPlan ?? [],
    };
    if (!validateRelationshipReport(report)) throw new PremiumError('AI_SCHEMA_INVALID');
    return report;
  }
  const basis = blueprintEvidence(mayaForDate(inputs.a, locale), locale);
  const blueprint: LifeBlueprintV2 = {
    reportVersion: LIFE_BLUEPRINT_VERSION, productCode: 'MAYA_FULL_499', kinNumber: people.a.kinNumber,
    solarSeal: basis.solarSeal, galacticTone: basis.galacticTone, locale, evidence: basis,
    unsupportedFields: LIFE_BLUEPRINT_UNSUPPORTED,
    sections: texts.slice(0, 12).map((s, i): BlueprintSection => ({ id: BLUEPRINT_CHAPTERS[i].id, evidence: basis,
      interpretation: s.interpretation, lifeExamples: s.lifeExamples, reflectionQuestions: s.reflectionQuestions, actionSteps: s.actionSteps })),
    ninetyDayPlan: texts[11]?.ninetyDayPlan ?? [],
  };
  const evidence = { oracle: people.a.oracle, wavespell: people.a.wavespell };
  const report: MayaProReport = {
    reportVersion: MAYA_PRO_VERSION, productCode: product, locale, kinNumber: people.a.kinNumber, provider: 'openai',
    parts: { a: { id: 'deep-life-explanations', blueprint }, b: { id: 'galactic-visualization',
      birthDate: inputs.a, kinNumber: people.a.kinNumber, iconStyle: 'original-modern-geometry' },
    c: { id: 'oracle-and-wavespell', ...evidence }, d: { id: 'soul-mission-integration',
      sections: texts.slice(12).map((s, i): ProSection => ({ id: PRO_CHAPTERS[i].id, evidence,
        interpretation: s.interpretation, lifeExamples: s.lifeExamples, reflectionQuestions: s.reflectionQuestions, actionSteps: s.actionSteps })) } },
  };
  if (!validateMayaProReport(report, people.a.kinNumber, locale)) throw new PremiumError('AI_SCHEMA_INVALID');
  return report;
}
function validateSection(value: unknown, product: Product, inputs: Inputs, locale: MayaLocale, index: number, previous: TextSection[]): TextSection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PremiumError('AI_SCHEMA_INVALID');
  const s = value as TextSection;
  const pair = product === MAYA_RELATIONSHIP_PRODUCT.code;
  const expected = ['interpretation', 'lifeExamples', 'reflectionQuestions', 'actionSteps',
    ...(pair ? ['perspectives'] : []), ...(index === 11 ? ['ninetyDayPlan'] : [])].sort().join(',');
  if (Object.keys(s).sort().join(',') !== expected || typeof s.interpretation !== 'string'
    || s.interpretation.trim().length < 60 || ![s.lifeExamples, s.reflectionQuestions, s.actionSteps].every(v =>
      Array.isArray(v) && v.length >= 1 && v.length <= 3 && v.every(t => typeof t === 'string' && t.trim().length > 0 && t.length < 4000))
    || index === 11 && !validPracticePlan(s.ninetyDayPlan)
    || pair && (!s.perspectives || Object.keys(s.perspectives).sort().join(',') !== 'a,b,shared'
      || Object.values(s.perspectives).some(t => typeof t !== 'string' || t.trim().length < 20))) throw new PremiumError('AI_SCHEMA_INVALID');
  const basis = blueprintEvidence(mayaForDate(inputs.a, locale), locale);
  const section: BlueprintSection = { id: BLUEPRINT_CHAPTERS[Math.min(index, 11)].id, evidence: basis,
    interpretation: s.interpretation, lifeExamples: s.lifeExamples, reflectionQuestions: s.reflectionQuestions, actionSteps: s.actionSteps };
  if (!pair && index < 12) {
    const issues = blueprintQualityIssues({ reportVersion: LIFE_BLUEPRINT_VERSION, productCode: 'MAYA_FULL_499',
      kinNumber: basis.kinNumber, solarSeal: basis.solarSeal, galacticTone: basis.galacticTone, locale, evidence: basis,
      unsupportedFields: LIFE_BLUEPRINT_UNSUPPORTED, sections: [section], ninetyDayPlan: s.ninetyDayPlan ?? [] });
    if (issues.length) {
      console.warn(JSON.stringify({ event: 'maya_premium_quality_rejected', chapter: index + 1, locale, issues }));
      throw new PremiumError('AI_SCHEMA_INVALID');
    }
  }
  const allText = [s.interpretation, ...(s.perspectives ? Object.values(s.perspectives) : []),
    ...s.lifeExamples, ...s.reflectionQuestions, ...s.actionSteps,
    ...(s.ninetyDayPlan?.flatMap(stage => [...stage.actionSteps, ...stage.reflectionQuestions]) ?? [])].join('\n');
  const chars = allText.match(/[\u3400-\u9fff]/gu)?.length ?? 0;
  const words = allText.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/gu)?.length ?? 0;
  if (locale === 'en' && (chars !== 0 || words < 120 || words > 450)
    || locale === 'zh-TW' && (!pair && chars < (index >= 12 ? 250 : 350) || chars > 500 || /[这为与疗财爱际问长发]/u.test(allText))
    || /保證.*(?:財富|收益)|治癒疾病|必定.*發財|guaranteed (?:wealth|returns)|cure disease|you will become rich|\bKIN\s*[=:：]?\s*\d/iu.test(allText)
    || !s.interpretation.includes(basis.solarSeal.name) || !s.interpretation.includes(basis.galacticTone.name)
    || previous.some(p => p.interpretation.trim() === s.interpretation.trim())) throw new PremiumError('AI_SCHEMA_INVALID');
  if (pair && inputs.b) {
    const b = mayaForDate(inputs.b, locale);
    if (!s.interpretation.includes(b.solar_seal) || !s.interpretation.includes(b.galactic_tone)) throw new PremiumError('AI_SCHEMA_INVALID');
  }
  return s;
}
async function boundedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new PremiumError('AI_EMPTY_RESPONSE');
  let bytes = 0;
  let text = '';
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 65536) throw new PremiumError('AI_RESPONSE_LIMIT');
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { await reader.cancel(); }
}
async function advance(env: Env, row: Row, authorize: () => Promise<unknown>) {
  if (row.status !== 'processing') return;
  const inputs: Inputs = JSON.parse(row.inputs);
  const prior = await env.DB.prepare('SELECT section_index,state,content,attempts FROM maya_premium_ai_sections WHERE report_id=? ORDER BY section_index')
    .bind(row.id).all<{ section_index: number; state: string; content: string | null; attempts: number }>();
  if (prior.results.some(s => s.state === 'reserved' || s.state === 'unknown')) throw new PremiumError('AI_OUTCOME_UNKNOWN');
  const previous = prior.results.filter(s => s.state === 'completed').map(s => JSON.parse(s.content ?? 'null') as TextSection);
  const count = row.product_code === MAYA_PRO_PRODUCT.code ? 15 : 12;
  if (previous.length === count) {
    const report = assemble(row.product_code, inputs, row.locale, previous);
    await authorize();
    await env.DB.prepare("UPDATE maya_premium_reports SET status='completed',report_content=?,updated_at=datetime('now') WHERE id=? AND status='processing'")
      .bind(JSON.stringify(report), row.id).run();
    return;
  }
  const index = previous.length;
  const prompt = premiumPrompt(row.product_code, inputs, row.locale, index, previous);
  const rejected = prior.results.find(s => s.section_index === index && s.state === 'rejected');
  if (rejected) {
    if (rejected.attempts >= 3) throw new PremiumError('AI_RETRY_LIMIT');
    const bad: TextSection = JSON.parse(rejected.content ?? 'null');
    prompt.user = JSON.stringify({ ...JSON.parse(prompt.user), previousRejectedDraft: bad,
      revisionTask: premiumRevisionFeedback(bad, row.locale, row.product_code === MAYA_RELATIONSHIP_PRODUCT.code) });
    prompt.system += '\nRevise the previous draft using the measured reader-text length in revisionTask. Preserve useful substantive content and ALL literal seal AND tone identifiers. Return the complete revised JSON, not an appendix or a length tally.';
  }
  const request = { model: MAYA_AI_MODEL, max_completion_tokens: PREMIUM_LIMITS.outputTokens,
    messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
    response_format: { type: 'json_schema', json_schema: { name: 'dreamspell_premium_chapter', strict: true, schema: prompt.responseSchema } } };
  if (new TextEncoder().encode(JSON.stringify(request)).byteLength > PREMIUM_LIMITS.inputBytes) throw new PremiumError('AI_INPUT_LIMIT');
  await authorize();
  await env.DB.prepare('INSERT OR IGNORE INTO maya_premium_ai_budgets(order_id) VALUES (?)').bind(row.order_id).run();
  const claimed = await env.DB.batch([
    env.DB.prepare(`UPDATE maya_premium_ai_budgets SET reserved_twd=reserved_twd+?
      WHERE order_id=? AND reserved_twd+?<=?
      AND (SELECT COALESCE(SUM(reserved_twd),0) FROM maya_premium_ai_sections WHERE report_id=?)+?<=?
      AND NOT EXISTS(SELECT 1 FROM maya_premium_ai_sections WHERE report_id=? AND section_index=? AND (state!='rejected' OR attempts>=3))
      AND EXISTS(SELECT 1 FROM maya_premium_reports WHERE id=? AND status='processing')`)
      .bind(PREMIUM_LIMITS.reservationTwd, row.order_id, PREMIUM_LIMITS.reservationTwd, PREMIUM_LIMITS.orderCapTwd,
        row.id, PREMIUM_LIMITS.reservationTwd, PREMIUM_LIMITS.reportCapTwd, row.id, index, row.id),
    env.DB.prepare(`INSERT INTO maya_premium_ai_sections(report_id,section_index,state,reserved_twd) SELECT ?,?,'reserved',? WHERE changes()=1
      ON CONFLICT(report_id,section_index) DO UPDATE SET state='reserved',attempts=attempts+1,reserved_twd=reserved_twd+excluded.reserved_twd
      WHERE state='rejected' AND attempts<3`)
      .bind(row.id, index, PREMIUM_LIMITS.reservationTwd),
  ]);
  if (claimed[1].meta.changes !== 1) throw new PremiumError('AI_BUSY_OR_COST_LIMIT');
  try {
    if (!premiumLiveEnabled(env) || mayaAiMode(env) !== 'live') throw new PremiumError('AI_DISABLED', 503);
    await authorize();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(PREMIUM_LIMITS.timeoutMs),
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new PremiumError('AI_PROVIDER_FAILED', 502);
    const payload = await boundedJson(response) as { choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const input = payload.usage?.prompt_tokens;
    const output = payload.usage?.completion_tokens;
    if (typeof input !== 'number' || typeof output !== 'number' || !Number.isSafeInteger(input) || !Number.isSafeInteger(output)
      || input < 0 || output < 0 || input > PREMIUM_LIMITS.inputTokens || output > PREMIUM_LIMITS.outputTokens
      || payload.choices?.[0]?.finish_reason !== 'stop' || typeof payload.choices[0].message?.content !== 'string') throw new PremiumError('AI_USAGE_INVALID');
    const cost = (input * 0.15 + output * 0.60) / 1_000_000 * 35;
    if (cost > PREMIUM_LIMITS.reservationTwd) throw new PremiumError('AI_COST_LIMIT');
    const raw: unknown = JSON.parse(payload.choices[0].message.content);
    let text: TextSection;
    try { text = validateSection(raw, row.product_code, inputs, row.locale, index, previous); }
    catch (error) {
      if (!(error instanceof PremiumError) || error.code !== 'AI_SCHEMA_INVALID') throw error;
      await env.DB.batch([
        env.DB.prepare("UPDATE maya_premium_ai_sections SET state='rejected',content=?,input_tokens=input_tokens+?,output_tokens=output_tokens+?,actual_cost_twd=actual_cost_twd+?,reserved_twd=reserved_twd-? WHERE report_id=? AND section_index=? AND state='reserved'")
          .bind(JSON.stringify(raw), input, output, cost, PREMIUM_LIMITS.reservationTwd - cost, row.id, index),
        env.DB.prepare('UPDATE maya_premium_ai_budgets SET reserved_twd=reserved_twd-? WHERE order_id=?')
          .bind(PREMIUM_LIMITS.reservationTwd - cost, row.order_id),
      ]);
      if ((rejected?.attempts ?? 0) + 1 >= 3) {
        await env.DB.prepare("UPDATE maya_premium_reports SET status='blocked',last_error_code='AI_RETRY_LIMIT' WHERE id=?").bind(row.id).run();
        throw new PremiumError('AI_RETRY_LIMIT');
      }
      console.warn(JSON.stringify({ event: 'maya_premium_quality_retry_available', reportId: row.id, chapter: index + 1 }));
      return;
    }
    await authorize();
    await env.DB.batch([
      env.DB.prepare("UPDATE maya_premium_ai_sections SET state='completed',content=?,input_tokens=input_tokens+?,output_tokens=output_tokens+?,actual_cost_twd=actual_cost_twd+?,reserved_twd=reserved_twd-? WHERE report_id=? AND section_index=? AND state='reserved'")
        .bind(JSON.stringify(text), input, output, cost, PREMIUM_LIMITS.reservationTwd - cost, row.id, index),
      env.DB.prepare('UPDATE maya_premium_ai_budgets SET reserved_twd=reserved_twd-? WHERE order_id=?')
        .bind(PREMIUM_LIMITS.reservationTwd - cost, row.order_id),
    ]);
    if (index + 1 === count) {
      const report = assemble(row.product_code, inputs, row.locale, [...previous, text]);
      await authorize();
      await env.DB.prepare("UPDATE maya_premium_reports SET status='completed',report_content=?,updated_at=datetime('now') WHERE id=? AND status='processing'")
        .bind(JSON.stringify(report), row.id).run();
    }
  } catch (cause) {
    const code = cause instanceof PremiumError ? cause.code
      : cause instanceof Error && cause.name === 'TimeoutError' ? 'AI_TIMEOUT_UNKNOWN' : 'AI_OUTCOME_UNKNOWN';
    await env.DB.batch([
      env.DB.prepare("UPDATE maya_premium_ai_sections SET state='unknown' WHERE report_id=? AND section_index=? AND state='reserved'").bind(row.id, index),
      env.DB.prepare("UPDATE maya_premium_reports SET status='blocked',last_error_code=?,updated_at=datetime('now') WHERE id=? AND status='processing'").bind(code, row.id),
    ]);
    console.error(JSON.stringify({ event: 'maya_premium_generation_blocked', reportId: row.id, code }));
    throw cause instanceof PremiumError ? cause : new PremiumError(code, 502);
  }
}
export async function routePremiumReports(req: Request, env: Env, userId: string, product: Product, locale: MayaLocale,
  access: (id: string) => Promise<{ id: string; order_id: string; source?: string }>): Promise<Response> {
  const url = new URL(req.url);
  const base = product === MAYA_PRO_PRODUCT.code ? '/api/maya/pro/reports' : '/api/maya/relationship/reports';
  const respond = (value: unknown, status = 200) => json(req, env, value, {
    status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
  if (url.pathname === base && req.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id,status,created_at FROM maya_premium_reports WHERE user_id=? AND product_code=? AND locale=? ORDER BY created_at DESC LIMIT 100')
      .bind(userId, product, locale).all();
    return respond({ reports: rows.results });
  }
  const match = url.pathname.slice(base.length).match(/^\/([a-zA-Z0-9_-]{1,80})(\/advance)?$/);
  let row: Row | null = null;
  if (match) {
    row = await env.DB.prepare('SELECT * FROM maya_premium_reports WHERE id=? AND user_id=? AND product_code=? AND locale=?')
      .bind(match[1], userId, product, locale).first<Row>();
    if (!row) throw new PremiumError('NOT_FOUND', 404);
    await access(row.entitlement_id);
    if (req.method !== (match[2] ? 'POST' : 'GET')) throw new PremiumError('NOT_FOUND', 404);
    if (match[2]) {
      if (!premiumLiveEnabled(env)) throw new PremiumError('AI_DISABLED', 503);
      await advance(env, row, () => access(row!.entitlement_id));
    }
  } else if (url.pathname === base && req.method === 'POST') {
    if (!premiumLiveEnabled(env)) throw new PremiumError('AI_DISABLED', 503);
    const body = await readBody(req, 4096);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PremiumError('INVALID_INPUT', 400);
    const fields = body as Record<string, unknown>;
    const pair = product === MAYA_RELATIONSHIP_PRODUCT.code;
    if (Object.keys(fields).sort().join(',') !== (pair
      ? 'consent,entitlement_id,locale,product_code,profile_id,relationship_profile_id,relationship_type'
      : 'entitlement_id,locale,product_code,profile_id')
      || fields.product_code !== product || fields.locale !== locale) throw new PremiumError('INVALID_INPUT', 400);
    if (pair && fields.consent !== true) throw new PremiumError('CONSENT_REQUIRED', 400);
    const grant = await access(identifier(fields.entitlement_id));
    if (grant.source === 'local_mock') throw new PremiumError('PAYMENT_REQUIRED', 403);
    const profile = async (value: unknown, role: string) => {
      const id = identifier(value);
      const p = await env.DB.prepare('SELECT birth_date,kin_number,calculation_version FROM maya_kin_profiles WHERE id=? AND user_id=? AND role=?')
        .bind(id, userId, role).first<{ birth_date: string; kin_number: number; calculation_version: string }>();
      if (!p) throw new PremiumError('NOT_FOUND', 404);
      if (!isMayaDate(p.birth_date) || p.birth_date.slice(5) === '02-29' || p.calculation_version !== MAYA_CALCULATION_VERSION
        || mayaForDate(p.birth_date, locale).kin_number !== p.kin_number) throw new PremiumError('PROFILE_CONFLICT');
      return { id, date: p.birth_date };
    };
    const a = await profile(fields.profile_id, 'personal');
    const b = pair ? await profile(fields.relationship_profile_id, 'relationship') : null;
    if (pair && !RELATIONSHIP_TYPES.includes(fields.relationship_type as RelationshipType)) throw new PremiumError('INVALID_INPUT', 400);
    const inputs: Inputs = { a: a.date, b: b?.date ?? null, relationshipType: pair ? fields.relationship_type as RelationshipType : null };
    const fingerprint = JSON.stringify([userId, a.id, b?.id ?? null, inputs, locale, version(product)]);
    if (grant.source === 'admin_complimentary') {
      const admin = await premiumAdminAccess(req, env, userId, product, grant.id);
      if (!admin) throw new PremiumError('PAYMENT_REQUIRED', 403);
      await env.DB.prepare(`INSERT OR IGNORE INTO orders(id,merchant_trade_no,user_id,email,item_type,item_id,item_name,amount,status)
        VALUES(?,?,?,?,'maya_admin',?,?,0,'complimentary')`)
        .bind(admin.order_id, `A${admin.id.slice(6, 25)}`, userId, admin.email, product, `Admin complimentary ${product}`).run();
      const order = await env.DB.prepare("SELECT id FROM orders WHERE id=? AND user_id=? AND item_id=? AND item_type='maya_admin' AND amount=0 AND status='complimentary'")
        .bind(admin.order_id, userId, product).first();
      if (!order) throw new PremiumError('PAYMENT_REQUIRED', 403);
    }
    await env.DB.prepare(`INSERT OR IGNORE INTO maya_premium_reports
      (id,user_id,order_id,entitlement_id,product_code,locale,report_version,profile_id,relationship_profile_id,request_fingerprint,inputs)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), userId, grant.order_id, grant.id, product, locale, version(product), a.id, b?.id ?? null,
        fingerprint, JSON.stringify(inputs)).run();
    row = await env.DB.prepare('SELECT * FROM maya_premium_reports WHERE user_id=? AND order_id=? AND locale=? AND report_version=?')
      .bind(userId, grant.order_id, locale, version(product)).first<Row>();
    if (!row || row.request_fingerprint !== fingerprint) throw new PremiumError('PROFILE_CONFLICT');
    await access(row.entitlement_id);
  } else throw new PremiumError('NOT_FOUND', 404);
  const current = await env.DB.prepare('SELECT * FROM maya_premium_reports WHERE id=? AND user_id=?').bind(row.id, userId).first<Row>();
  if (!current) throw new PremiumError('NOT_FOUND', 404);
  await access(current.entitlement_id);
  let report: Report | null = null;
  if (current.status === 'completed') {
    const value: unknown = JSON.parse(current.report_content ?? 'null');
    const inputs: Inputs = JSON.parse(current.inputs);
    if (product === MAYA_PRO_PRODUCT.code) {
      if (!validateMayaProReport(value, mayaForDate(inputs.a, locale).kin_number, locale) || value.provider !== 'openai'
        || value.parts.b.birthDate !== inputs.a) throw new PremiumError('STORED_REPORT_INVALID', 500);
      report = value;
    } else {
      if (!validateRelationshipReport(value) || value.locale !== locale || value.relationshipType !== inputs.relationshipType
        || value.people.a.birthDate !== inputs.a || value.people.b.birthDate !== inputs.b) throw new PremiumError('STORED_REPORT_INVALID', 500);
      report = value;
    }
  }
  const progress = await env.DB.prepare("SELECT COUNT(*) AS count FROM maya_premium_ai_sections WHERE report_id=? AND state='completed'")
    .bind(current.id).first<{ count: number }>();
  return respond({ id: current.id, status: current.status, report, completedSections: progress?.count ?? 0,
    totalSections: product === MAYA_PRO_PRODUCT.code ? 15 : 12, reason: current.last_error_code });
}
