import assert from 'node:assert/strict';
import {
  buildVedAstroGetTimePath,
  buildVedAstroTime,
  buildVedicAiChartInput,
  callVedAstro,
  callVedAstroGet,
  normalizeVedicChart,
  VEDASTRO_DEFAULT_API_BASE,
  timezoneOffsetAtLocal,
} from '../src/vedicAstrology.ts';

const birthDate = '1968-09-06';
const birthTime = '20:00';
const apiBase = process.env.VEDASTRO_API_BASE || VEDASTRO_DEFAULT_API_BASE;
const apiKey = process.env.VEDASTRO_API_KEY;
const requestEnv = {
  VEDASTRO_API_BASE: apiBase,
  ...(apiKey ? { VEDASTRO_API_KEY: apiKey } : {}),
};

function localDateTime(timezone: string, date: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

async function withFreeTierRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error)
        || error.code !== 'VEDASTRO_RATE_LIMITED' || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 61_000));
    }
  }
}

async function resolveTaipei(): Promise<{ name: string; latitude: number; longitude: number }> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q: 'Taipei, Taiwan',
    format: 'jsonv2',
    limit: '1',
    addressdetails: '0',
  }).toString();
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CrystalField101/1.0 (+https://crystalfield101.com)',
    },
    signal: AbortSignal.timeout(12_000),
  });
  assert.equal(response.ok, true, `Nominatim returned HTTP ${response.status}`);
  const results: unknown = await response.json();
  assert.ok(Array.isArray(results) && results.length > 0, 'Taipei must resolve through Nominatim');
  const first = results[0] as { display_name?: unknown; lat?: unknown; lon?: unknown };
  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  assert.ok(Number.isFinite(latitude) && Math.abs(latitude - 25.033) < 0.1, 'Unexpected Taipei latitude');
  assert.ok(Number.isFinite(longitude) && Math.abs(longitude - 121.5654) < 0.1, 'Unexpected Taipei longitude');
  return {
    name: typeof first.display_name === 'string' ? first.display_name : 'Taipei, Taiwan',
    latitude,
    longitude,
  };
}

async function main(): Promise<void> {
  if (!apiKey) await new Promise((resolve) => setTimeout(resolve, 65_000));
  const location = await resolveTaipei();
  const timezone = 'Asia/Taipei';
  const utcOffset = timezoneOffsetAtLocal(birthDate, birthTime, timezone);
  assert.equal(utcOffset, '+08:00');
  const birth = buildVedAstroTime(birthDate, birthTime, utcOffset, location);
  const now = localDateTime(timezone, new Date());
  const endDate = new Date();
  endDate.setUTCFullYear(endDate.getUTCFullYear() + 10);
  const rangeEnd = localDateTime(timezone, endDate);
  const startTime = buildVedAstroTime(
    now.date,
    now.time,
    timezoneOffsetAtLocal(now.date, now.time, timezone),
    location,
  );
  const endTime = buildVedAstroTime(
    rangeEnd.date,
    rangeEnd.time,
    timezoneOffsetAtLocal(rangeEnd.date, rangeEnd.time, timezone),
    location,
  );

  const getCalls = [
    ['AllPlanetLongitude', 'planetLongitudes'],
    ['MoonConstellation', 'nakshatra'],
    ['AllHouseLongitudes', 'houseLongitudes'],
  ] as const;
  const getResults: Record<string, unknown> = {};
  const methodResults: Array<{ method: string; transport: 'GET' | 'POST'; status: string }> = [];
  const callDelay = apiKey ? 500 : 12_500;
  for (const [index, [method, key]] of getCalls.entries()) {
    const result = await withFreeTierRateLimitRetry(() => callVedAstroGet(requestEnv, buildVedAstroGetTimePath(
      method,
      birthDate,
      birthTime,
      utcOffset,
      location,
    ), `vedic-full-smoke-${method}`));
    assert.equal(result.httpStatus, 200, `${method} must return HTTP 200`);
    assert.equal(result.status, 'Pass', `${method} VedAstro Status must be Pass`);
    if (result.callStatus) assert.equal(result.callStatus, 'Pass', `${method} Call-Status must be Pass`);
    getResults[key] = result.payload;
    methodResults.push({ method, transport: 'GET', status: result.status });
    if (index < getCalls.length - 1) await new Promise((resolve) => setTimeout(resolve, callDelay));
  }

  const postCalls = [
    ['DasaAtRange', {
      BirthTime: birth,
      StartTime: startTime,
      EndTime: endTime,
      Levels: 2,
      PrecisionHours: 168,
      Ayanamsa: 'LAHIRI',
    }],
    ['AllPlanetNavamshaSign', { Time: birth, Ayanamsa: 'LAHIRI' }],
    ['AllHouseNavamshaSign', { Time: birth, Ayanamsa: 'LAHIRI' }],
    ['AllPlanetDashamamshaSign', { Time: birth, Ayanamsa: 'LAHIRI' }],
    ['AllHouseDashamamshaSign', { Time: birth, Ayanamsa: 'LAHIRI' }],
  ] as const;
  const postResults: unknown[] = [];
  for (const [index, [method, payload]] of postCalls.entries()) {
    const result = await withFreeTierRateLimitRetry(
      () => callVedAstro(requestEnv, method, payload, `vedic-full-smoke-${method}`),
    );
    postResults.push(result);
    methodResults.push({ method, transport: 'POST', status: 'Pass' });
    if (index < postCalls.length - 1) await new Promise((resolve) => setTimeout(resolve, callDelay));
  }

  const [dasha, d9Planets, d9Houses, d10Planets, d10Houses] = postResults;
  const chart = normalizeVedicChart({
    date: birthDate,
    time: birthTime,
    location,
    timezone,
    utcOffset,
  }, {
    planetLongitudes: getResults.planetLongitudes,
    nakshatra: getResults.nakshatra,
    houseLongitudes: getResults.houseLongitudes,
    dasha,
    d9Planets,
    d9Houses,
    d10Planets,
    d10Houses,
  });
  const reportInput = buildVedicAiChartInput(chart);

  assert.equal(chart.ayanamsa, 'LAHIRI');
  assert.equal(Object.keys(chart.planets).length, 9);
  assert.equal(Object.keys(chart.houses).length, 12);
  assert.equal(Object.keys(chart.divisionalCharts.d9.planets).length, 9);
  assert.equal(Object.keys(chart.divisionalCharts.d9.houses).length, 12);
  assert.equal(Object.keys(chart.divisionalCharts.d10.planets).length, 9);
  assert.equal(Object.keys(chart.divisionalCharts.d10.houses).length, 12);
  assert.ok(chart.nakshatra.name && chart.nakshatra.pada);
  assert.ok(chart.dashaTimeline.length > 0);
  assert.deepEqual(reportInput.birth, chart.birth);
  assert.deepEqual(reportInput.d1.houses, chart.houses);
  assert.deepEqual(reportInput.d9, chart.divisionalCharts.d9);
  assert.deepEqual(reportInput.d10, chart.divisionalCharts.d10);
  assert.deepEqual(reportInput.dasha.timeline, chart.dashaTimeline);

  console.log(JSON.stringify({
    host: new URL(apiBase).origin,
    geocoding: 'PASS',
    birthTimezone: timezone,
    utcOffset,
    realVedAstroData: 'PASS',
    methods: methodResults,
    ayanamsa: chart.ayanamsa,
    d1Planets: Object.keys(chart.planets).length,
    d1Houses: Object.keys(chart.houses).length,
    d9Planets: Object.keys(chart.divisionalCharts.d9.planets).length,
    d9Houses: Object.keys(chart.divisionalCharts.d9.houses).length,
    d10Planets: Object.keys(chart.divisionalCharts.d10.planets).length,
    d10Houses: Object.keys(chart.divisionalCharts.d10.houses).length,
    nakshatra: chart.nakshatra,
    dashaPeriods: chart.dashaTimeline.length,
    aiInputPreparation: 'PASS (no OpenAI request made)',
    apiKeyConfigured: !!apiKey,
    mockFallback: 'NO',
  }, null, 2));
}

void main().catch((error: unknown) => {
  if (error && typeof error === 'object') {
    const failure = error as Record<string, unknown>;
    console.error(JSON.stringify({
      code: typeof failure.code === 'string' ? failure.code : 'INTEGRATION_TEST_FAILED',
      method: typeof failure.method === 'string' ? failure.method : undefined,
      httpStatus: typeof failure.httpStatus === 'number' ? failure.httpStatus : undefined,
      callStatus: typeof failure.callStatus === 'string' ? failure.callStatus : undefined,
      vedAstroStatus: typeof failure.vedAstroStatus === 'string' ? failure.vedAstroStatus : undefined,
      sanitizedMessage: typeof failure.message === 'string' ? failure.message : 'Unexpected integration failure',
    }, null, 2));
  } else {
    console.error(error instanceof Error ? error.message : 'Unexpected VedAstro integration failure');
  }
  process.exitCode = 1;
});
