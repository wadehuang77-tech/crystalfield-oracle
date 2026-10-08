import assert from 'node:assert/strict';
import { calculateProkeralaChart, diagnoseProkeralaOAuth, parseRetryAfter, ProkeralaError, type ProkeralaTiming } from '../src/prokerala';
import { PROKERALA_FIXED_BIRTH, verifyProkerala } from '../src/prokeralaVerification';
import type { Env } from '../src/utils';
import { normalizeProkeralaVedic } from '../src/prokeralaVedic';
import { buildVedicAiChartInput } from '../src/vedicAstrology';

// Synthetic transport fixtures test validation only, never production chart accuracy.
const ids = [0, 1, 2, 3, 4, 5, 6, 100, 101, 102];
const names = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Ascendant', 'Rahu', 'Ketu'];
const identity = (index: number) => ({ id: ids[index], name: names[index] });
const positions = ids.map((_id, index) => ({
  ...identity(index), longitude: 12, degree: 12, rasi: { id: 0 }, is_retrograde: false,
}));
const division = Array.from({ length: 12 }, (_unused, index) => ({
  house: { number: index + 1 }, rasi: { id: index },
  planet_positions: index === 0 ? ids.map((_id, planetIndex) => ({
    planet: identity(planetIndex), rasi: { id: 0 }, house: { number: 1 },
    longitude: 12, sign_degree: 12, nakshatra: { id: 0, name: 'Ashwini' },
    access_token: 'fixture-must-not-escape',
  })) : [],
}));
const dasha = {
  dasha_periods: [{
    id: 0, name: 'Sun', start: '2000-01-01T00:00:00+08:00', end: '2100-01-01T00:00:00+08:00',
    antardasha: [{ id: 1, name: 'Moon', start: '2000-01-01T00:00:00+08:00', end: '2100-01-01T00:00:00+08:00' }],
  }],
  dasha_balance: { lord: { id: 0, name: 'Sun' }, duration: 'P3Y', description: 'fixture' },
};
const originalFetch = globalThis.fetch;
const requests: URL[] = [];
let tokenCalls = 0;
let failure = '';
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  requests.push(url);
  assert.equal(url.origin, 'https://api.prokerala.com');
  if (url.pathname === '/token') {
    tokenCalls++;
    assert.equal(init?.method, 'POST');
    const params = new URLSearchParams(String(init.body));
    assert.equal(params.get('grant_type'), 'client_credentials');
    if (failure === 'oauth') {
      return new Response('fixture-secret-must-not-escape', { status: 401 });
    }
    return Response.json({ access_token: 'fixture-access-token', token_type: 'Bearer', expires_in: 3600 });
  }
  assert.equal(url.searchParams.get('datetime'), PROKERALA_FIXED_BIRTH.datetime);
  assert.equal(url.searchParams.get('ayanamsa'), '1');
  assert.equal(url.searchParams.get('language'), 'en');
  assert.equal(url.searchParams.get('coordinates'), '25.033,121.5654');
  if (failure === '429') return new Response('fixture-secret-must-not-escape', { status: 429, headers: { 'Retry-After': '90' } });
  if (failure === '503') return new Response('fixture-secret-must-not-escape', { status: 503 });
  if (url.pathname.endsWith('/planet-position')) {
    assert.equal(url.searchParams.get('planets'), ids.join(','));
    return Response.json({ status: 'ok', data: { planet_position: positions } });
  }
  if (url.pathname.endsWith('/birth-details')) {
    return Response.json({ status: 'ok', data: { nakshatra: { id: 0, name: 'Ashwini', pada: 1 } } });
  }
  if (url.pathname.endsWith('/divisional-planet-position')) {
    assert.ok(['lagna', 'navamsa', 'dasamsa'].includes(url.searchParams.get('chart_type') ?? ''));
    return Response.json({ status: 'ok', data: { divisional_positions: division } });
  }
  assert.equal(url.pathname, '/v2/astrology/dasha-periods');
  assert.equal(url.searchParams.get('year_length'), '1');
  return Response.json({ status: 'ok', data: dasha });
};

async function main() {
try {
  const env = { PROKERALA_CLIENT_ID: 'fixture-id', PROKERALA_CLIENT_SECRET: 'fixture-secret' };
  const timings: ProkeralaTiming[] = [];
  const chart = await calculateProkeralaChart(env, PROKERALA_FIXED_BIRTH, timings);
  assert.equal(chart.provider, 'prokerala');
  assert.equal(chart.planets.length, 9);
  assert.equal(chart.d9.planets.length, 10);
  assert.equal(chart.d10.planets.length, 10);
  assert.equal(chart.dasha.mahadasha, 'Sun');
  assert.equal(chart.dasha.antardasha, 'Moon');
  assert.equal(chart.d9.planets[0].retrograde, undefined);
  assert.equal(chart.d9.planets[0].nakshatra?.pada, undefined);
  assert.doesNotMatch(JSON.stringify(chart), /fixture-|access_token|client_secret/);
  assert.equal(timings.length, 6);
  const secondTimings: ProkeralaTiming[] = [];
  await calculateProkeralaChart(env, PROKERALA_FIXED_BIRTH, secondTimings);
  assert.equal(tokenCalls, 1, 'Reuse token for all requests and subsequent charts');
  assert.equal(secondTimings.length, 5);
  const productionTimings: ProkeralaTiming[] = [];
  const production = await calculateProkeralaChart(env, PROKERALA_FIXED_BIRTH, productionTimings, new Date(), true);
  assert.equal(productionTimings.length, 6);
  assert.equal(production.planets[0].house, 1);
  const normalized = normalizeProkeralaVedic(production, 'Taipei');
  assert.equal(normalized.provider, 'prokerala');
  assert.equal(normalized.ayanamsa, 'lahiri');
  assert.equal(normalized.houses.House1.begin, undefined, 'Do not invent house cusp angles');
  assert.equal(normalized.housePlacements.Sun, 1);
  assert.equal(normalized.divisionalCharts.d9.lagna, 'Aries');
  const facts = buildVedicAiChartInput(normalized);
  assert.equal(facts.d9.structuredPositions?.length, 10);
  assert.equal(facts.d10.structuredPositions?.length, 10);
  assert.equal(facts.dasha.balance?.lord, 'Sun');
  assert.equal(facts.d1.structuredPositions?.length, 9);
  assert.doesNotMatch(JSON.stringify(facts), /fixture-|access_token|client_secret/);
  assert.deepEqual(
    buildVedicAiChartInput(normalizeProkeralaVedic(production, 'Taipei')),
    facts, 'Language is not a normalization/calculation input',
  );
  assert.equal(parseRetryAfter('90'), 90);
  assert.equal(parseRetryAfter('invalid'), undefined);
  assert.equal(parseRetryAfter('Thu, 08 Oct 2026 00:01:00 GMT', Date.parse('2026-10-08T00:00:00Z')), 60);
  for (const mode of ['oauth', '429', '503']) {
    failure = mode;
    const failedTimings: ProkeralaTiming[] = [];
    await assert.rejects(
      calculateProkeralaChart({ ...env }, PROKERALA_FIXED_BIRTH, failedTimings),
      (error: unknown) => {
        assert.ok(error instanceof ProkeralaError);
        assert.doesNotMatch(JSON.stringify(error) + error.message, /fixture-|access_token|client_secret/);
        if (mode === '429') assert.equal(error.retryAfterSeconds, 90);
        return true;
      },
    );
    assert.equal(failedTimings.length, mode === 'oauth' ? 1 : 2, 'Stop without retries or further credits');
  }
  const chartTransport = globalThis.fetch;
  failure = '';
  for (const scenario of ['once', 'persistent', 'long-cooldown', 'missing-cooldown', 'second-endpoint']) {
    const retryTimings: ProkeralaTiming[] = [];
    let limitedCalls = 0;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      const shouldLimit = url.pathname.endsWith('/planet-position')
        || (scenario === 'second-endpoint' && url.pathname.endsWith('/birth-details'));
      if (shouldLimit) {
        limitedCalls++;
        if (scenario !== 'once' || limitedCalls === 1) {
          // A separate endpoint must not get another retry after the chart's one retry.
          if (scenario !== 'second-endpoint' || limitedCalls !== 2) {
            return new Response('', { status: 429, headers: scenario === 'missing-cooldown'
              ? {} : { 'Retry-After': scenario === 'long-cooldown' ? '90' : '0' } });
          }
        }
      }
      return chartTransport(input, init);
    };
    if (scenario === 'once') {
      await calculateProkeralaChart(env, PROKERALA_FIXED_BIRTH, retryTimings, new Date(), true);
      assert.equal(retryTimings.length, 7, 'One extra HTTP request, not a second full chart');
      assert.equal(limitedCalls, 2);
    } else {
      await assert.rejects(calculateProkeralaChart(env, PROKERALA_FIXED_BIRTH, retryTimings, new Date(), true),
        (error: unknown) => error instanceof ProkeralaError && error.code === 'PROKERALA_RATE_LIMITED');
      assert.equal(limitedCalls, scenario === 'persistent' ? 2 : scenario === 'second-endpoint' ? 3 : 1);
    }
  }
  globalThis.fetch = chartTransport;
  for (const statuses of [[200], [401, 200], [401, 401], [403], [429], [503]]) {
    let calls = 0;
    globalThis.fetch = async (input, init) => {
      assert.equal(new URL(String(input)).href, 'https://api.prokerala.com/token');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.redirect, 'manual');
      const headers = new Headers(init.headers);
      assert.equal(headers.get('Content-Type'), 'application/x-www-form-urlencoded');
      const params = new URLSearchParams(String(init.body));
      assert.equal(params.get('grant_type'), 'client_credentials');
      if (calls === 0) {
        assert.equal(headers.has('Authorization'), false);
        assert.equal(params.get('client_id'), env.PROKERALA_CLIENT_ID);
        assert.equal(params.get('client_secret'), env.PROKERALA_CLIENT_SECRET);
      } else {
        assert.equal(headers.get('Authorization'), `Basic ${btoa(`${env.PROKERALA_CLIENT_ID}:${env.PROKERALA_CLIENT_SECRET}`)}`);
        assert.deepEqual([...params.keys()], ['grant_type']);
      }
      const status = statuses[calls++];
      assert.ok(status, 'No retries or extra token calls');
      return status === 200
        ? Response.json({ access_token: 'fixture-access-token', token_type: 'Bearer', expires_in: 3600 })
        : Response.json({ error: 'invalid_client', error_description: 'fixture-secret-must-not-escape' }, { status });
    };
    const diagnosticEnv = { ...env };
    const diagnosticTimings: ProkeralaTiming[] = [];
    const result = await diagnoseProkeralaOAuth(diagnosticEnv, diagnosticTimings);
    assert.equal(calls, statuses.length);
    assert.equal(result.testA.status, statuses[0]);
    assert.equal(result.testA.pass, statuses[0] === 200);
    assert.equal(result.testB?.status, statuses[1]);
    assert.doesNotMatch(JSON.stringify(result), /fixture-|access_token|client_secret|Authorization|error_description/);
    if (statuses[0] === 200) {
      failure = '';
      globalThis.fetch = chartTransport;
      const before = tokenCalls;
      await calculateProkeralaChart(diagnosticEnv, PROKERALA_FIXED_BIRTH, diagnosticTimings);
      assert.equal(tokenCalls, before, 'A success uses the same token for one chart, with no extra OAuth');
      assert.equal(diagnosticTimings.length, 6);
    }
  }
  globalThis.fetch = chartTransport;
  const guardsEnv = new Proxy({} as Env, {
    get(_target, property) {
      if (property === 'ALLOWED_ORIGINS') return 'https://www.crystalfield101.com';
      if (property === 'JWT_SECRET') return 'fixture-session-key';
      if (property === 'DB' || property === 'DB_CARDS') throw new Error('Guard must not touch database');
      return undefined;
    },
  });
  assert.equal((await verifyProkerala(new Request('https://api.example.test/api/admin/prokerala/verify'), guardsEnv)).status, 405);
  assert.equal((await verifyProkerala(new Request('https://api.example.test/api/admin/prokerala/verify', { method: 'POST' }), guardsEnv)).status, 403);
  const unauthenticated = await verifyProkerala(new Request('https://api.example.test/api/admin/prokerala/verify', {
    method: 'POST', headers: { Origin: 'https://www.crystalfield101.com' },
  }), guardsEnv);
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers.get('Cache-Control'), 'no-store');
  console.log('Prokerala synthetic contract/credential-redaction/token reuse/429/5xx/route guard tests PASS; no real API verification claimed.');
} finally {
  globalThis.fetch = originalFetch;
}
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
