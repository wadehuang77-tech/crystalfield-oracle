import assert from 'node:assert/strict';
import type { Env } from '../src/utils';
import {
  getHumanDesignFullReport,
  buildEnglishFixedSectionBody,
  generateOpenAiSections,
  getHumanDesignReportVersion,
  OPENAI_TIMEOUT_MS,
  parseOpenAiSections,
  ReportGenerationError,
  reportGenerationErrorResponse,
  type ChartRow,
  type HDChart,
  type SectionDef,
} from '../src/humanDesignReport';
import { PLAN_GROUPS } from '../src/humanDesignShareResults';
import { normalizeCheckoutLocale, SPREAD_CATALOG } from '../src/ecpay';

const SECTION_IDS = ['centers', 'gates', 'channels', 'personality', 'prescription', 'career', 'love', 'wealth', 'mission'];
const definitions: SectionDef[] = SECTION_IDS.map((id, index) => ({
  id,
  sort_order: index + 1,
  icon: '*',
  title: `English title ${id}`,
  focus: `English focus for ${id}`,
  generation_mode: index < 3 ? 'fixed' : 'openai',
}));
const chart: HDChart = {
  type: 'projector',
  typeName: 'Projector',
  profile: '2/4',
  profileName: 'Hermit / Opportunist',
  authority: 'splenic',
  authorityName: 'Splenic Authority',
  strategy: 'Wait for the Invitation',
  definedCenters: ['spleen'],
  undefinedCenters: ['head', 'ajna', 'throat', 'g', 'heart', 'sacral', 'solar-plexus', 'root'],
  keyChannels: ['57-20'],
  keyGates: [57, 20],
  incarnationCross: 'Right Angle Cross',
};
const row: ChartRow = {
  id: 'local-test-chart',
  session_id: 'local-test-session',
  user_id: 'local-test-user',
  user_email: 'test@example.invalid',
  birth_date: '1990-01-02',
  birth_time: '12:30',
  birth_city: 'Taipei',
  hd_type: 'projector',
  hd_profile: '2/4',
  hd_authority: 'splenic',
  chart_data: JSON.stringify(chart),
};
const words = (count: number) => Array.from({ length: count }, (_, index) => `insight${index}`).join(' ');
const chineseText = '這是一段用於本機回歸測試的繁體中文人類圖解析內容，確認既有中文解析仍可通過相同的 JSON 欄位解析流程。';
const englishReportBodies = Object.fromEntries(SECTION_IDS.map((id) => [id, words(300)]));

function makeReportEnv(cachedVersions: string[] = []) {
  const queriedVersions: string[] = [];
  const DB = {
    prepare(query: string) {
      let values: unknown[] = [];
      const statement = {
        bind(...bindings: unknown[]) {
          values = bindings;
          return statement;
        },
        async run() {
          return { success: true };
        },
        async first<T>() {
          if (query.includes('FROM hd_charts')) return row as T;
          if (query.includes('FROM hd_full_reports')) {
            const version = String(values[1] ?? '');
            queriedVersions.push(version);
            return (cachedVersions.includes(version) ? { id: 'cached-report' } : null) as T | null;
          }
          return null;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
      };
      return statement;
    },
  };
  return {
    env: { DB, OPENAI_API_KEY: 'test-only-placeholder', OPENAI_MODEL: 'test-model', ALLOWED_ORIGINS: '*' } as unknown as Env,
    queriedVersions,
  };
}

async function checkGeneratorLocale(language: 'zh-Hant' | 'en') {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | null = null;
  const expectedDefs = definitions.filter(({ generation_mode }) => generation_mode === 'openai');
  const responseSections = Object.fromEntries(expectedDefs.map(({ id }) => [id, language === 'en' ? words(260) : chineseText]));

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.openai.com/v1/responses');
    assert.equal(init?.method, 'POST');
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      output_text: JSON.stringify(responseSections),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const result = await generateOpenAiSections(
      { OPENAI_API_KEY: 'test-only-placeholder', OPENAI_MODEL: 'test-model' } as Env,
      row,
      chart,
      definitions,
      new Map(),
      language,
    );
    assert.deepEqual(Object.keys(result ?? {}).sort(), expectedDefs.map(({ id }) => id).sort());
    assert.ok(Object.values(result ?? {}).every((body) => typeof body === 'string' && body.length > 0));

    const request = requestBody as {
      model: string;
      input: Array<{ role: string; content: string }>;
      text: { format: { type: string } };
    };
    assert.equal(request.model, 'test-model');
    assert.equal(request.text.format.type, 'json_object');
    const systemPrompt = request.input.find(({ role }) => role === 'system')?.content ?? '';
    const userPrompt = JSON.parse(request.input.find(({ role }) => role === 'user')?.content ?? '{}') as {
      output_language?: string;
      fixed_human_design_context?: string;
      required_sections?: Array<{ id: string; title: string }>;
      writing_rules?: string[];
    };
    assert.ok(userPrompt.fixed_human_design_context?.includes('1990-01-02'));
    assert.ok(userPrompt.fixed_human_design_context?.includes('Projector'));
    assert.deepEqual(userPrompt.required_sections?.map(({ id }) => id), expectedDefs.map(({ id }) => id));
    assert.equal(userPrompt.output_language, language === 'en' ? 'English' : '繁體中文');
    if (language === 'en') {
      assert.match(systemPrompt, /natural English only/u);
      assert.ok(userPrompt.writing_rules?.every((rule) => !/[\u3400-\u9fff]/u.test(rule)));
      assert.ok(userPrompt.writing_rules?.some((rule) => rule.includes('English words')));
    } else {
      assert.match(systemPrompt, /靈性陪伴者/u);
      assert.ok(userPrompt.writing_rules?.some((rule) => rule.includes('中文字')));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  for (const id of ['centers', 'gates', 'channels']) {
    const content = buildEnglishFixedSectionBody(id, chart, row);
    assert.ok(
      content.trim().split(/\s+/u).length >= 250,
      `English fixed section ${id} must satisfy the full-report minimum length`,
    );
  }

  const products = [
    { itemId: 'human_design_full', amount: 399, locale: 'zh-TW' as const, language: 'zh-Hant' as const, reportType: 'full' },
    { itemId: 'human_design_bundle', amount: 489, locale: 'zh-TW' as const, language: 'zh-Hant' as const, reportType: 'full' },
    { itemId: 'human_design_full', amount: 399, locale: 'en' as const, language: 'en' as const, reportType: 'full' },
    { itemId: 'human_design_bundle', amount: 489, locale: 'en' as const, language: 'en' as const, reportType: 'full' },
  ];
  for (const product of products) {
    assert.ok(PLAN_GROUPS[product.itemId]?.includes('full'));
    assert.equal(SPREAD_CATALOG[product.itemId]?.amount, product.amount);
    assert.equal(normalizeCheckoutLocale(product.locale), product.locale);
    assert.equal(product.reportType, 'full');
    assert.equal(
      getHumanDesignReportVersion(product.language).endsWith('-en'),
      product.locale === 'en',
    );
  }
  assert.equal(getHumanDesignReportVersion('zh-Hant'), 'professional-v12', 'The Chinese report cache version remains unchanged');
  assert.equal(getHumanDesignReportVersion('en'), 'professional-v14-en', 'English reports must not reuse older cached output');
  assert.notEqual(getHumanDesignReportVersion('zh-Hant'), getHumanDesignReportVersion('en'), 'Each locale must use a distinct report cache key');
  assert.equal(OPENAI_TIMEOUT_MS, 60000, 'The OpenAI request is bounded by the 60-second abort timeout');
  assert.ok(!PLAN_GROUPS.human_design_full.includes('core'));
  assert.ok(PLAN_GROUPS.human_design_bundle.includes('core'));

  await checkGeneratorLocale('zh-Hant');
  await checkGeneratorLocale('en');

  const originalFetch = globalThis.fetch;
  try {
    for (const product of products) {
      const previousLocaleVersion = getHumanDesignReportVersion(product.language === 'en' ? 'zh-Hant' : 'en');
      const { env, queriedVersions } = makeReportEnv([previousLocaleVersion]);
      globalThis.fetch = async (_input, init) => {
        const request = JSON.parse(String(init?.body)) as {
          input: Array<{ role: string; content: string }>;
        };
        const requestPrompt = JSON.parse(request.input.find(({ role }) => role === 'user')?.content ?? '{}') as {
          output_language?: string;
          required_sections?: Array<{ id: string }>;
        };
        assert.equal(requestPrompt.output_language, product.language === 'en' ? 'English' : '繁體中文');
        assert.equal(requestPrompt.required_sections?.length, 6);
        return new Response(JSON.stringify({ output_text: JSON.stringify(englishReportBodies) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };
      const backgroundTasks: Promise<unknown>[] = [];
      const context = {
        waitUntil(promise: Promise<unknown>) {
          backgroundTasks.push(promise);
        },
      } as unknown as ExecutionContext;
      const response = await getHumanDesignFullReport(
        new Request('https://api.example.test/api/human-design/charts/local-test-chart/full-report', { method: 'POST' }),
        env,
        row.id,
        product.language === 'en' ? context : undefined,
        product.language,
      );
      assert.equal(response.status, 200);
      const body = await response.json() as {
        report_version: string;
        sections: Array<{ id: string; title: string; body: string }>;
        cached: boolean;
      };
      assert.equal(body.report_version, getHumanDesignReportVersion(product.language));
      assert.equal(body.cached, false, 'A cache from the other locale must not satisfy this request');
      assert.equal(body.sections.length, 9);
      assert.equal(queriedVersions[0], getHumanDesignReportVersion(product.language));
      assert.ok(body.sections.every(({ id, title, body: content }) => id && title && content));
      assert.equal(
        body.sections.every(({ body: content }) => !/[\u3400-\u9fff]/u.test(content)),
        product.language === 'en',
        'English report content must be English; Chinese report fallback remains Chinese',
      );
      if (product.language === 'en') {
        assert.ok(body.sections.every(({ body: content }) => content.trim().split(/\s+/u).length >= 250));
        assert.ok(body.sections.some(({ id }) => id === 'centers'));
        assert.ok(body.sections.some(({ id }) => id === 'gates'));
        assert.ok(body.sections.some(({ id }) => id === 'channels'));
        assert.equal(backgroundTasks.length, 1, 'English AI enrichment runs after the fallback report is returned');
        await Promise.all(backgroundTasks);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  const noApiKeyEnv = { ...makeReportEnv().env, OPENAI_API_KEY: undefined } as Env;
  const fallbackResponse = await getHumanDesignFullReport(
    new Request('https://api.example.test/api/human-design/charts/local-test-chart/full-report', { method: 'POST' }),
    noApiKeyEnv,
    row.id,
    undefined,
    'en',
  );
  assert.equal(fallbackResponse.status, 200, 'The English report remains available without an OpenAI key');
  const fallbackBody = await fallbackResponse.json() as { sections: Array<{ body: string }> };
  assert.equal(fallbackBody.sections.length, 9);
  assert.ok(fallbackBody.sections.every(({ body }) => body.trim().split(/\s+/u).length >= 250));
  assert.ok(fallbackBody.sections.every(({ body }) => !/[\u3400-\u9fff]/u.test(body)));

  const failureEnv = makeReportEnv().env;
  const failureLogs: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => { failureLogs.push(args.map(String).join(' ')); };
  try {
    globalThis.fetch = async () => new Response('provider internal detail must not be returned or logged', { status: 500 });
    const backgroundTasks: Promise<unknown>[] = [];
    const failure = await getHumanDesignFullReport(
      new Request('https://api.example.test/api/human-design/charts/local-test-chart/full-report', { method: 'POST' }),
      failureEnv,
      row.id,
      {
        waitUntil(promise: Promise<unknown>) {
          backgroundTasks.push(promise);
        },
      } as unknown as ExecutionContext,
      'en',
    );
    assert.equal(failure.status, 200, 'AI provider failure must not block the paid English report');
    const failureBody = await failure.json() as { sections: Array<{ body: string }>; cached: boolean };
    assert.equal(failureBody.sections.length, 9);
    assert.equal(failureBody.cached, false);
    assert.ok(failureBody.sections.every(({ body }) => body.trim().split(/\s+/u).length >= 250));
    assert.equal(backgroundTasks.length, 1);
    await Promise.all(backgroundTasks);
    assert.equal(failureLogs.length, 1);
    const log = JSON.parse(failureLogs[0]) as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(log).sort(),
      ['cacheVersion', 'durationMs', 'event', 'failedStage', 'httpStatus', 'locale', 'reportType'].sort(),
    );
    assert.equal(log.locale, 'en');
    assert.equal(log.reportType, 'full');
    assert.equal(log.cacheVersion, 'professional-v14-en');
    assert.equal(log.httpStatus, 500);
    assert.equal(log.failedStage, 'OPENAI_API_ERROR');
    assert.equal(typeof log.durationMs, 'number');
    assert.doesNotMatch(failureLogs.join('\n'), /provider internal detail|test-only-placeholder|1990-01-02|test@example\.invalid/u);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }

  const parsed = parseOpenAiSections(
    JSON.stringify({ personality: words(250) }),
    [definitions.find(({ id }) => id === 'personality')!],
    'en',
  );
  assert.equal(Object.keys(parsed)[0], 'personality', 'The response schema keeps stable section IDs');
  assert.throws(
    () => parseOpenAiSections(JSON.stringify({ 'Your Personality': words(250) }), [definitions[3]], 'en'),
    /HD_ENGLISH_REPORT_INCOMPLETE/u,
    'Translated section keys must not be accepted in place of stable IDs',
  );
  assert.throws(
    () => parseOpenAiSections('{invalid json', [definitions[3]], 'en'),
    (error: unknown) => error instanceof ReportGenerationError
      && error.code === 'HD_REPORT_INVALID_RESPONSE'
      && error.failedStage === 'JSON_PARSE_ERROR',
  );
  assert.throws(
    () => parseOpenAiSections(JSON.stringify({ personality: 'too short' }), [definitions[3]], 'en'),
    (error: unknown) => error instanceof ReportGenerationError
      && error.code === 'HD_ENGLISH_REPORT_INCOMPLETE'
      && error.failedStage === 'REPORT_SECTION_ERROR'
      && error.failedSection === 'personality',
  );

  const timeout = reportGenerationErrorResponse(
    new Request('https://api.example.test/report'),
    { ALLOWED_ORIGINS: '*' } as Env,
    new ReportGenerationError('HD_REPORT_GENERATION_TIMEOUT', 504),
    'en',
  );
  assert.equal(timeout?.status, 504);
  const timeoutBody = await timeout?.json() as { code: string; error: string };
  assert.equal(timeoutBody.code, 'HD_REPORT_GENERATION_TIMEOUT');
  assert.match(timeoutBody.error, /purchase is safe/u);

  const providerError = reportGenerationErrorResponse(
    new Request('https://api.example.test/report'),
    { ALLOWED_ORIGINS: '*' } as Env,
    new ReportGenerationError('HD_REPORT_PROVIDER_ERROR', 502),
    'zh-Hant',
  );
  assert.equal(providerError?.status, 502);
  const providerBody = await providerError?.json() as { code: string; error: string };
  assert.equal(providerBody.code, 'HD_REPORT_PROVIDER_ERROR');
  assert.match(providerBody.error, /購買狀態不受影響/u);

  console.log('Human Design zh/en locale, product entitlement groups, OpenAI request, stable JSON parsing, and errors: passed');
}

void main();
