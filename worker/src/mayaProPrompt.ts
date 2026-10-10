import { buildLifeBlueprintPrompt } from './mayaLifeBlueprintPrompt';
import { mockLifeBlueprintV2 } from '../../app/src/lib/mayaLifeBlueprintMock';
import { isMayaDate, mayaForDate, type MayaLocale } from '../../app/src/lib/maya';
import { calculateDreamspellOracle } from '../../app/src/lib/dreamspellOracle';
import { calculateDreamspellWavespell } from '../../app/src/lib/dreamspellWavespell';
import { MAYA_PRO_PRODUCT, MAYA_PRO_VERSION, PRO_CHAPTERS, validateMayaProReport, type MayaProReport, type ProEvidence } from '../../app/src/lib/mayaPro';

// Proposed planning limits, not a live provider configuration or billing guarantee.
export const MAYA_PRO_COST = { model: 'gpt-4o-mini', inputTokens: 24000, outputTokens: 14000,
  inputUsdPerMillion: 0.15, outputUsdPerMillion: 0.60, planningTwdPerUsd: 35, reportCapTwd: 1 } as const;
export function estimateProCost(inputTokens: number = MAYA_PRO_COST.inputTokens, outputTokens: number = MAYA_PRO_COST.outputTokens) {
  if (![inputTokens, outputTokens].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid Pro token estimate');
  const estimatedTwd = (inputTokens * MAYA_PRO_COST.inputUsdPerMillion + outputTokens * MAYA_PRO_COST.outputUsdPerMillion)
    / 1_000_000 * MAYA_PRO_COST.planningTwdPerUsd;
  return { inputTokens, outputTokens, estimatedTwd, capTwd: MAYA_PRO_COST.reportCapTwd,
    allowed: estimatedTwd <= MAYA_PRO_COST.reportCapTwd,
    reason: estimatedTwd <= MAYA_PRO_COST.reportCapTwd ? null : 'PRO_COST_LIMIT' };
}

export function buildMayaProPrompt(birthDate: string, locale: MayaLocale) {
  if (!isMayaDate(birthDate)) throw new Error('Invalid Pro birth date');
  const signature = mayaForDate(birthDate, locale);
  if (birthDate.slice(5) === '02-29') throw new Error('Leap-day birth unsupported');
  const oracle = calculateDreamspellOracle(signature.kin_number, locale);
  const wavespell = calculateDreamspellWavespell(signature.kin_number, locale);
  const partA = buildLifeBlueprintPrompt(signature, locale);
  const literalSchema = (value: unknown): Record<string, unknown> => {
    if (Array.isArray(value)) return { type: 'array', minItems: value.length, maxItems: value.length, items: { anyOf: value.map(literalSchema) } };
    if (value && typeof value === 'object') {
      const properties = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, literalSchema(entry)]));
      return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
    }
    return { type: typeof value === 'number' ? 'integer' : 'string', enum: [value] };
  };
  const text = { type: 'string' };
  const list = (max: number) => ({ type: 'array', minItems: 1, maxItems: max, items: text });
  return {
    reportVersion: MAYA_PRO_VERSION,
    partA: { ...partA, system: partA.system.replace('Design ONLY the NT$499 Full Life Blueprint', 'Design the twelve-chapter Part A subdocument of the independent NT$699 Pro product') },
    integration: {
      system: [
        `Design ONLY ${MAYA_PRO_PRODUCT.code}, reportVersion=${MAYA_PRO_VERSION}. Structured JSON only.`,
        locale === 'en' ? 'All prose must be natural English without Chinese.' : '全部敘述使用自然繁體中文。',
        'The program supplies every numeric configuration; do not calculate oracle, wavespell, KIN or tone. Copy evidence exactly.',
        '13 oracle-integration compares support, guidance, challenge and hidden symbolism rather than repeating personality descriptions.',
        '14 wavespell-journey uses the verified 13-unit sequence and birth position as a reflective learning framework, never a personal fortune calendar.',
        '15 soul-mission-synthesis must synthesize actual completed chapters 1–14 and select trade-offs and ninety-day priorities, not duplicate chapter 12.',
        'Generate chapter 15 only after receiving validated prior chapter summaries. Never invent those summaries or an individual biography.',
        'Each chapter needs evidence, interpretation, lifeExamples, 1–3 reflectionQuestions and concrete actionSteps; 250–500 Chinese characters or 120–450 English words.',
        'No medical diagnosis, disease cure, wealth forecast, investment advice, guaranteed financial outcomes, destiny predictions or claims of empirical psychology.',
        'Seal symbols are modern geometry; the wavespell is not an astronomical orbit or age-based prediction.',
        'Dates and private account data are not supplied to the model. Missing facts are unsupported, never guesses.',
      ].join('\n'),
      user: JSON.stringify({ productCode: MAYA_PRO_PRODUCT.code, reportVersion: MAYA_PRO_VERSION, locale,
        evidence: { oracle, wavespell }, chapters: PRO_CHAPTERS, priorChapterSummariesRequired: true }),
      responseSchema: { type: 'object', additionalProperties: false, required: ['sections'], properties: {
        sections: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', additionalProperties: false,
          required: ['id', 'evidence', 'interpretation', 'lifeExamples', 'reflectionQuestions', 'actionSteps'],
          properties: { id: { type: 'string', enum: PRO_CHAPTERS.map(item => item.id) },
            evidence: literalSchema({ oracle, wavespell }),
            interpretation: text, lifeExamples: list(3), reflectionQuestions: list(3), actionSteps: list(6) } } },
      } },
    },
    estimate: estimateProCost(),
  };
}

const themes = [
  {
    zh: '這一篇把五個位置視為互動角色，而不是五個互不相干的人格標籤。中心可以代表你選擇回到的價值，引導提示方法，支持提示可以借用的資源，挑戰提示需要協商的界線，隱藏力量則提醒你觀察尚未留意的選項。同一個象徵有時會出現在不同位置，不代表計算錯誤，也不需要強行製造衝突。重要的是提出可驗證的問題：當你偏好的方法失去效果時，是否願意使用另一種溝通方式？支持與挑戰不是好壞評分，既不能判定誰適合你，也不能預言某人會傷害你。試著比較一個選擇如何同時照顧核心價值與合作需要，再記錄實際回饋，保留修正象徵假設的自由。',
    en: 'Treat the five positions as interacting roles rather than unrelated personality labels. Destiny can name a value you choose to return to; guidance suggests a method, support a resource, challenge a boundary to negotiate, and hidden power an option worth noticing. A symbol appearing in multiple positions is not a calculation error and does not require an invented conflict. Ask a testable question: when a preferred approach stops helping, can you try another communication strategy? Support and challenge are not good-versus-bad ratings, partner judgments or predictions of harm. Compare how a decision respects both your values and a shared responsibility. Record feedback and revise the symbolic hypothesis rather than treating the configuration as a verdict.',
    exampleZh: '例如協作意見不同時，分別寫下要保留的價值、能借用的資源與要協商的界線，不替同伴貼標籤。',
    exampleEn: 'When collaborators disagree, separate the value to retain, the resource to borrow and the boundary to negotiate without labeling a colleague.',
    questionZh: '支持與挑戰能否服務同一個選擇？我忽略了哪個可協商的條件？',
    questionEn: 'Can support and challenge serve the same choice? Which negotiable condition have I overlooked?',
    actionZh: '選一項合作決策，畫出五個角色與各自可做的一件事，一週後依回饋調整。',
    actionEn: 'Map five roles around one collaborative decision and assign one observable action to each. Review feedback after a week.',
  },
  {
    zh: '這一篇使用連續十三個單位作為學習旅程的視覺架構，而不是指定人生必須經歷的時間表。起點與終點是已驗證的曆法分組，出生位置只表示你在這組中的索引，不能換算成歲數、職涯階段或未來運勢。你可以把不同音調當作檢查任務的問題，例如啟動之前需要什麼、協作期間如何看見回饋、完成之後保留哪些經驗。每個位置都有練習價值，不代表越後面越成熟。與前面的工作或情緒篇章不同，這裡重點是觀察步驟之間的交接：何時要收集資訊，何時先做小型嘗試，何時整理成果。允許自己的流程往返，也尊重生活條件帶來的調整，不以圖表限制選擇。',
    en: 'Use the thirteen-unit sequence as a visual learning framework, not a timetable that life must follow. The endpoints are verified calendar groupings; your birth position is an index, not an age, career stage or future forecast. Treat the tones as questions about a task: what is needed before starting, how feedback becomes visible during collaboration, and what experience to retain after completion. Every position offers practice; later positions are not signs of greater maturity. Unlike the earlier work and self-care chapters, this chapter examines handoffs between steps: gathering information, trying something small and reviewing an outcome. Permit loops and adjustments for real circumstances. A diagram should help you choose a process, not restrict your choices.',
    exampleZh: '例如準備一項新作品時，先排出探索、試作與回顧三個節點，確認每個節點需要的資訊，而非指定命定日期。',
    exampleEn: 'For a new piece of work, define exploration, trial and review checkpoints with their information needs instead of assigning destined dates.',
    questionZh: '哪個交接步驟需要更多回饋？我的實際節奏與圖表假設有何不同？',
    questionEn: 'Which handoff needs more feedback? How does my observed rhythm differ from the diagram?',
    actionZh: '用十三格記錄一次任務的問題與觀察，不填未來預言，完成後圈選一個值得改進的交接。',
    actionEn: 'Use thirteen cells to record questions and observations for one task, not predictions. Choose one handoff to improve afterward.',
  },
  {
    zh: '這一篇把前面的反思轉成需要選擇與取捨的使命摘要，不再增加一串理想特質。十二篇指出價值、學習、關係、工作與照顧等不同面向，五個位置讓你比較資源與界線，波符則提供檢查步驟交接的方法。整合不是要求每個面向都做到最好，而是選出目前有條件實踐的一個主題，說明願意投入與暫時不投入的事。九十天計畫可以保留原來的覺察、調整與整合三階段，但此處應補上優先順序、可觀察成果與停止條件。使命是可以修改的方向，不是天命認證。若練習增加壓力或忽略現實責任，應縮小範圍並尋求合適支持，以真實經驗而非象徵標籤判斷下一步。',
    en: 'Turn the preceding reflections into a mission summary with choices and trade-offs rather than another list of ideal traits. The twelve chapters examine values, learning, relationships, work and care; the oracle compares resources with boundaries; the wavespell helps examine handoffs. Integration does not demand excellence in every area. Choose one theme you can realistically practice and name both the effort you accept and the effort you defer. Retain awareness, adjustment and integration in the ninety-day plan, but add a priority, an observable outcome and a stopping condition. A mission is a revisable direction, not certification of destiny. If practice increases pressure or neglects responsibilities, reduce its scope and seek suitable support. Let observations guide the next decision instead of symbolic labels.',
    exampleZh: '例如同時想改善工作與關係時，選擇一個雙方都能觀察的小行動，說明哪些任務先延後，避免再加一份完美清單。',
    exampleEn: 'When work and relationships both need attention, choose one action both people can observe and name tasks to defer instead of adding a perfection checklist.',
    questionZh: '目前最值得實踐的主題是什麼？出現哪些訊號時我會停止或調整？',
    questionEn: 'Which theme is worth practicing now? What signals will lead me to stop or adjust?',
    actionZh: '寫下一個九十天優先主題、一項每週觀察與一個停止條件，與可信任的人回顧，而非宣告固定命運。',
    actionEn: 'Write one ninety-day priority, one weekly observation and a stopping condition. Review with someone you trust rather than declaring a fixed destiny.',
  },
];

export function mockMayaProReport(birthDate: string, locale: MayaLocale): MayaProReport {
  if (!isMayaDate(birthDate) || birthDate.slice(5) === '02-29') throw new Error('Unsupported Pro birth date');
  const signature = mayaForDate(birthDate, locale);
  const evidence: ProEvidence = { oracle: calculateDreamspellOracle(signature.kin_number, locale), wavespell: calculateDreamspellWavespell(signature.kin_number, locale) };
  const blueprint = mockLifeBlueprintV2(signature, locale);
  const report: MayaProReport = {
    reportVersion: MAYA_PRO_VERSION, productCode: MAYA_PRO_PRODUCT.code, locale, kinNumber: signature.kin_number,
    parts: {
      a: { id: 'deep-life-explanations', blueprint },
      b: { id: 'galactic-visualization', birthDate, kinNumber: signature.kin_number, iconStyle: 'original-modern-geometry' },
      c: { id: 'oracle-and-wavespell', ...evidence },
      d: { id: 'soul-mission-integration', sections: PRO_CHAPTERS.map((chapter, index) => {
        const theme = themes[index];
        const context = locale === 'en'
          ? `Reflect on ${signature.solar_seal} with ${signature.galactic_tone}, wavespell ${evidence.wavespell.number}, position ${evidence.wavespell.position}. `
          : `以${signature.solar_seal}與${signature.galactic_tone}音調、波符 ${evidence.wavespell.number} 的第 ${evidence.wavespell.position} 個位置作為反思線索。`;
        const oracleContext = index === 0 ? (locale === 'en'
          ? `Guidance: ${evidence.oracle.positions.guide.sealName}; support: ${evidence.oracle.positions.analog.sealName}; challenge: ${evidence.oracle.positions.antipode.sealName}; hidden: ${evidence.oracle.positions.occult.sealName}. `
          : `引導為${evidence.oracle.positions.guide.sealName}、支持為${evidence.oracle.positions.analog.sealName}、挑戰為${evidence.oracle.positions.antipode.sealName}、隱藏為${evidence.oracle.positions.occult.sealName}。`) : '';
        return { id: chapter.id, evidence, interpretation: context + oracleContext + (locale === 'en' ? theme.en : theme.zh),
          lifeExamples: [locale === 'en' ? theme.exampleEn : theme.exampleZh], reflectionQuestions: [locale === 'en' ? theme.questionEn : theme.questionZh],
          actionSteps: [locale === 'en' ? theme.actionEn : theme.actionZh] };
      }) },
    }, provider: 'mock-local',
  };
  if (!validateMayaProReport(report, signature.kin_number, locale)) throw new Error('Invalid local Pro fixture');
  return report;
}
