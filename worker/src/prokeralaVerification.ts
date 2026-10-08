import {
  calculateProkeralaChart, diagnoseProkeralaOAuth, ProkeralaError,
  type ProkeralaTiming, type ProkeralaOAuthTest,
} from './prokerala';
import { type Env, json, readBody, readSession, requireAdmin } from './utils';
import { auditCompleteVedicReport, runProkeralaReportSmoke, validateCompleteVedicReport } from './vedicAstrology';

export const PROKERALA_FIXED_BIRTH = {
  datetime: '1968-09-06T20:00:00+08:00',
  latitude: 25.0330,
  longitude: 121.5654,
  timezone: 'Asia/Taipei',
} as const;

let inFlight = false;
let completed: Record<string, unknown> | null = null;
let diagnosisCompleted: Record<string, unknown> | null = null;
let reportAttempted = false;
let reportResult: Record<string, unknown> | null = null;

export async function verifyProkerala(req: Request, env: Env): Promise<Response> {
  const reply = (data: unknown, status = 200) => json(req, env, data, {
    status, headers: { 'Cache-Control': 'no-store' },
  });
  if (req.method !== 'POST') {
    return json(req, env, { code: 'METHOD_NOT_ALLOWED' }, {
      status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
    });
  }
  const origin = req.headers.get('Origin');
  if (!origin || !(env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).includes(origin)) {
    return reply({ code: 'FORBIDDEN_ORIGIN' }, 403);
  }
  const user = await readSession(req, env);
  if (!user) return reply({ code: 'AUTH_REQUIRED' }, 401);
  if (!await requireAdmin(req, env, user)) return reply({ code: 'ADMIN_REQUIRED' }, 403);
  if (env.PROKERALA_VERIFICATION_ENABLED !== 'true' || !env.PROKERALA_VERIFY_LIMITER) {
    return reply({ code: 'VERIFICATION_DISABLED' }, 503);
  }
  if (new URL(req.url).pathname === '/api/admin/prokerala/report-smoke') {
    if (reportResult) return reply({ ...reportResult, cached: true });
    if (reportAttempted) return reply({ code: 'REPORT_SMOKE_ALREADY_ATTEMPTED' }, 409);
    const body = await readBody<{ chart_id?: unknown }>(req);
    if (typeof body.chart_id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.chart_id)) {
      return reply({ code: 'INVALID_CHART_ID' }, 400);
    }
    const limited = await env.PROKERALA_VERIFY_LIMITER.limit({ key: 'prokerala-report-smoke' });
    if (!limited.success) return reply({ code: 'VERIFICATION_RATE_LIMITED' }, 429);
    reportAttempted = true;
    const start = performance.now();
    try {
      const { report, chartFacts } = await runProkeralaReportSmoke(env, body.chart_id);
      reportResult = {
        ok: validateCompleteVedicReport(report), language: 'zh-Hant', sectionCount: report.sections.length,
        audit: auditCompleteVedicReport(report), report, chartFacts,
        totalLatencyMs: Math.round(performance.now() - start), astrologyRequests: 0,
      };
      return reply(reportResult);
    } catch {
      console.error('[prokerala-report-smoke]', { code: 'AI_REPORT_SMOKE_FAILED' });
      return reply({ ok: false, code: 'AI_REPORT_SMOKE_FAILED', astrologyRequests: 0 }, 502);
    }
  }
  const diagnosis = new URL(req.url).pathname === '/api/admin/prokerala/oauth-diagnose';
  const cached = diagnosis ? diagnosisCompleted : completed;
  // Reuse this isolate's completed test; never spend requests for a UI retry.
  if (cached) return reply({ ...cached, cachedVerification: true });
  if (inFlight) return reply({ code: 'VERIFICATION_IN_PROGRESS' }, 409);
  const limited = await env.PROKERALA_VERIFY_LIMITER.limit({ key: 'prokerala-fixed-verification' });
  if (!limited.success) return reply({ code: 'VERIFICATION_RATE_LIMITED' }, 429);
  inFlight = true;
  const timings: ProkeralaTiming[] = [];
  const start = performance.now();
  let oauthTests: { testA: ProkeralaOAuthTest; testB?: ProkeralaOAuthTest } | undefined;
  try {
    if (diagnosis) {
      oauthTests = await diagnoseProkeralaOAuth(env, timings);
      if (!oauthTests.testA.pass) {
        diagnosisCompleted = {
          ok: false, oauthTests, timings,
          totalLatencyMs: Math.round(performance.now() - start),
          astrologyRequests: 0, oauthRequests: timings.length,
        };
        return reply(diagnosisCompleted);
      }
    }
    const chart = await calculateProkeralaChart(env, PROKERALA_FIXED_BIRTH, timings);
    completed = {
      ok: true, chart, timings,
      totalLatencyMs: Math.round(performance.now() - start),
      astrologyRequests: timings.filter(t => t.endpoint !== 'oauth').length,
      oauthRequests: timings.filter(t => t.endpoint === 'oauth').length,
      estimatedCredits: 380, http429: false, http5xx: false,
      ...(oauthTests ? { oauthTests } : {}),
    };
    if (diagnosis) diagnosisCompleted = completed;
    console.log('[prokerala-verification]', { ok: true, timings, totalLatencyMs: completed.totalLatencyMs });
    return reply(completed);
  } catch (error) {
    const safe = error instanceof ProkeralaError ? error : null;
    const result = {
      ok: false, code: safe?.code ?? 'VERIFICATION_INTERNAL_ERROR',
      endpoint: safe?.endpoint ?? 'verification', upstreamStatus: safe?.httpStatus ?? null,
      retryAfterSeconds: safe?.retryAfterSeconds,
      timings, totalLatencyMs: Math.round(performance.now() - start),
      astrologyRequests: timings.filter(t => t.endpoint !== 'oauth').length,
      oauthRequests: timings.filter(t => t.endpoint === 'oauth').length,
      http429: timings.some(t => t.status === 429),
      http5xx: timings.some(t => t.status !== null && t.status >= 500),
      ...(oauthTests ? { oauthTests } : {}),
    };
    if (diagnosis) diagnosisCompleted = result;
    console.error('[prokerala-verification]', result);
    return reply(result, safe?.httpStatus === 429 ? 429 : 502);
  } finally {
    inFlight = false;
  }
}
