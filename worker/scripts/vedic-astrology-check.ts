import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPREAD_CATALOG } from '../src/ecpay.ts';
import type { Env } from '../src/utils.ts';
import { BirthLocationResolutionError, resolveBirthLocation } from '../src/vedicGeocoding.ts';
import {
  buildVedAstroTime,
  buildVedAstroGetTimePath,
  buildVedicAiChartInput,
  callVedAstro,
  callVedAstroGet,
  isVedAstroAuthFailure,
  isVedAstroRateLimitMessage,
  parsePlanetLongitudes,
  parseVedicDashaRange,
  parseVedicHouseLongitudes,
  parseVedicHousePlacements,
  parseVedicNakshatra,
  parseVedicSignMap,
  normalizeVedicChart,
  timezoneOffsetAtLocal,
} from '../src/vedicAstrology.ts';

assert.equal(
  JSON.stringify(buildVedAstroTime('1968-09-06', '20:00', '+08:00', {
    name: 'Taipei',
    latitude: 25.033,
    longitude: 121.5654,
  })),
  JSON.stringify({
    StdTime: '20:00 06/09/1968 +08:00',
    Location: { Name: 'Taipei', Latitude: 25.033, Longitude: 121.5654 },
  }),
);
assert.equal(timezoneOffsetAtLocal('1968-09-06', '20:00', 'Asia/Taipei'), '+08:00');
assert.equal(timezoneOffsetAtLocal('2020-01-15', '12:00', 'America/New_York'), '-05:00');
assert.equal(timezoneOffsetAtLocal('2020-07-15', '12:00', 'America/New_York'), '-04:00');
assert.throws(() => timezoneOffsetAtLocal('2020-03-08', '02:30', 'America/New_York'), /does not exist/);
assert.throws(() => timezoneOffsetAtLocal('2020-11-01', '01:30', 'America/New_York'), /ambiguous/);
assert.equal(isVedAstroRateLimitMessage('Free tier rate limit exceeded (5 calls/minute).'), true);
assert.equal(isVedAstroRateLimitMessage('Too many requests; try again later.'), true);
assert.equal(isVedAstroRateLimitMessage('Invalid birth time.'), false);
assert.equal(isVedAstroAuthFailure('Invalid API key.'), true);
assert.equal(isVedAstroAuthFailure('The current period is in progress.'), false);
assert.deepEqual(parseVedicNakshatra('Swathi - 1'), { name: 'Swathi', pada: 1 });
assert.deepEqual(parseVedicNakshatra('Ashwini Pada 4'), { name: 'Ashwini', pada: 4 });
assert.deepEqual(parseVedicNakshatra(null), { name: null, pada: null });
assert.deepEqual(buildVedAstroGetTimePath(
  'AllPlanetLongitude',
  '1968-09-06',
  '20:00',
  '+08:00',
  { latitude: 25.033, longitude: 121.5654 },
), [
  'Calculate', 'AllPlanetLongitude',
  'Location', '25.0330,121.5654',
  'Time', '20:00', '06-09-1968', '+08:00',
  'Ayanamsa', 'LAHIRI',
]);
assert.deepEqual(parseVedicSignMap({ Sun: 'Aries', Moon: 'Taurus' }, 'planet'), {
  Sun: 'Aries', Moon: 'Taurus',
});
assert.deepEqual(parseVedicSignMap([
  { House: 'House1', AllHouseNavamshaSign: 'Libra' },
], 'house'), { House1: 'Libra' });
assert.equal(parseVedicDashaRange({
  Jupiter: {
    Lord: 'Jupiter',
    Start: '2025-01-01',
    End: '2027-12-31',
    SubDasas: { Saturn: { Lord: 'Saturn', Start: '2025-01-01', End: '2027-06-30' } },
  },
}).maha, 'Jupiter');

const chartSigns = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const chartPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const normalizedChart = normalizeVedicChart({
  date: '1968-09-06',
  time: '20:00',
  location: { name: 'Taipei, Taiwan', latitude: 25.033, longitude: 121.5654 },
  timezone: 'Asia/Taipei',
  utcOffset: '+08:00',
}, {
  planetLongitudes: chartPlanets.map((planet, index) => `${planet} - ${index * 30 + 10}`).join('\n'),
  nakshatra: 'Swathi - 1',
  houseLongitudes: Array.from({ length: 12 }, (_, index) => ({
    House: `House${index + 1}`,
    Begin: index * 30,
    Mid: index * 30 + 15,
    End: (index + 1) * 30,
  })),
  dasha: {
    Jupiter: {
      Lord: 'Jupiter',
      Start: '2025-01-01',
      End: '2027-12-31',
      SubDasas: { Saturn: { Lord: 'Saturn', Start: '2025-01-01', End: '2027-06-30' } },
    },
  },
  d9Planets: Object.fromEntries(chartPlanets.map((planet, index) => [planet, chartSigns[index]])),
  d9Houses: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`House${index + 1}`, chartSigns[index]])),
  d10Planets: Object.fromEntries(chartPlanets.map((planet, index) => [planet, chartSigns[(index + 3) % 12]])),
  d10Houses: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`House${index + 1}`, chartSigns[(index + 3) % 12]])),
});
assert.deepEqual(normalizedChart.birth, {
  date: '1968-09-06',
  time: '20:00',
  location: 'Taipei, Taiwan',
  latitude: 25.033,
  longitude: 121.5654,
  timezone: 'Asia/Taipei',
  utcOffset: '+08:00',
});
assert.equal(Object.keys(normalizedChart.planets).length, 9);
assert.equal(Object.keys(normalizedChart.houses).length, 12);
assert.equal(Object.keys(normalizedChart.divisionalCharts.d9.planets).length, 9);
assert.equal(Object.keys(normalizedChart.divisionalCharts.d9.houses).length, 12);
assert.equal(Object.keys(normalizedChart.divisionalCharts.d10.planets).length, 9);
assert.equal(Object.keys(normalizedChart.divisionalCharts.d10.houses).length, 12);
assert.deepEqual(normalizedChart.nakshatra, { name: 'Swathi', pada: 1 });
const aiFacts = buildVedicAiChartInput(normalizedChart);
assert.deepEqual(aiFacts.birth, normalizedChart.birth);
assert.deepEqual(aiFacts.d1.houses, normalizedChart.houses);
assert.deepEqual(aiFacts.d9, normalizedChart.divisionalCharts.d9);
assert.deepEqual(aiFacts.d10, normalizedChart.divisionalCharts.d10);
assert.deepEqual(aiFacts.dasha.timeline, normalizedChart.dashaTimeline);

async function checkVedAstroPostContract(): Promise<void> {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async (input, init) => {
    requestCount += 1;
    assert.equal(String(input), 'https://vedastro.zaishi.net/api/Calculate/AllPlanetNavamshaSign');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/json');
    assert.equal(new Headers(init?.headers).get('x-api-key'), 'test-only-secret');
    assert.deepEqual(JSON.parse(String(init?.body)), {
      Time: {
        StdTime: '20:00 06/09/1968 +08:00',
        Location: { Name: 'Taipei', Latitude: 25.033, Longitude: 121.5654 },
      },
      Ayanamsa: 'LAHIRI',
    });
    return new Response(JSON.stringify({
      Status: 'Pass',
      Payload: { AllPlanetNavamshaSign: { Sun: 'Aries' } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await callVedAstro({
      VEDASTRO_API_KEY: 'test-only-secret',
      VEDASTRO_API_BASE: 'https://vedastro.zaishi.net/api',
    }, 'AllPlanetNavamshaSign', {
      Time: {
        StdTime: '20:00 06/09/1968 +08:00',
        Location: { Name: 'Taipei', Latitude: 25.033, Longitude: 121.5654 },
      },
      Ayanamsa: 'LAHIRI',
    });
    assert.deepEqual(result, { Sun: 'Aries' });
    assert.equal(requestCount, 1);

    globalThis.fetch = async (_input, init) => {
      assert.equal(new Headers(init?.headers).has('x-api-key'), false);
      return new Response(JSON.stringify({
        Status: 'Pass',
        Payload: { AllPlanetNavamshaSign: { Sun: 'Aries' } },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    await callVedAstro({ VEDASTRO_API_BASE: 'https://vedastro.zaishi.net/api' }, 'AllPlanetNavamshaSign', {
      Time: {
        StdTime: '20:00 06/09/1968 +08:00',
        Location: { Name: 'Taipei', Latitude: 25.033, Longitude: 121.5654 },
      },
      Ayanamsa: 'LAHIRI',
    });

    let authAttempts = 0;
    globalThis.fetch = async (_input, init) => {
      authAttempts += 1;
      if (new Headers(init?.headers).has('x-api-key')) return new Response('Forbidden', { status: 403 });
      return new Response(JSON.stringify({
        Status: 'Pass',
        Payload: { AllPlanetNavamshaSign: { Sun: 'Aries' } },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const authFallbackResult = await callVedAstro({
      VEDASTRO_API_KEY: 'test-only-secret',
      VEDASTRO_API_BASE: 'https://vedastro.zaishi.net/api',
    }, 'AllPlanetNavamshaSign', {
      Time: {
        StdTime: '20:00 06/09/1968 +08:00',
        Location: { Name: 'Taipei', Latitude: 25.033, Longitude: 121.5654 },
      },
      Ayanamsa: 'LAHIRI',
    });
    assert.deepEqual(authFallbackResult, { Sun: 'Aries' });
    assert.equal(authAttempts, 2, 'An rejected optional key must retry once without credentials');

    globalThis.fetch = async () => new Response(JSON.stringify({
      Status: 'Fail',
      Payload: 'Free tier rate limit exceeded.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Call-Status': 'Fail' },
    });
    await assert.rejects(
      callVedAstro({ VEDASTRO_API_KEY: 'test-only-secret' }, 'AllPlanetNavamshaSign', {
        Time: {
          StdTime: '20:00 06/09/1968 +08:00',
          Location: { Name: 'Taipei', Latitude: 25.033, Longitude: 121.5654 },
        },
        Ayanamsa: 'LAHIRI',
      }),
      (error: unknown) => !!error && typeof error === 'object'
        && 'code' in error && error.code === 'VEDASTRO_RATE_LIMITED',
    );

    let retryCount = 0;
    globalThis.fetch = async () => {
      retryCount += 1;
      if (retryCount < 3) return new Response('temporary upstream failure', { status: 503 });
      return new Response(JSON.stringify({
        Status: 'Pass',
        Payload: { AllPlanetNavamshaSign: { Sun: 'Aries' } },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    await callVedAstro({ VEDASTRO_API_KEY: 'test-only-secret' }, 'AllPlanetNavamshaSign', {
      Time: {
        StdTime: '20:00 06/09/1968 +08:00',
        Location: { Name: 'Taipei', Latitude: 25.033, Longitude: 121.5654 },
      },
      Ayanamsa: 'LAHIRI',
    });
    assert.equal(retryCount, 3, 'Only 5xx responses should receive at most two retries');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function checkVedAstroGetContract(): Promise<void> {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    assert.equal(init?.method, 'GET');
    assert.equal(new Headers(init?.headers).get('x-api-key'), 'test-only-secret');
    assert.equal(init?.body, undefined);
    return new Response(JSON.stringify({
      Status: 'Pass',
      Payload: { PlanetName: 'Sun' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await callVedAstroGet({
      VEDASTRO_API_KEY: 'test-only-secret',
      VEDASTRO_API_BASE: 'https://vedastro.zaishi.net/api',
    }, [
      'Calculate', 'PlanetName', 'Planet', 'Sun',
      'Time', '20:00', '06', '09', '1968', '+08:00',
      'Location', 'Taipei', 'Taiwan',
    ]);
    assert.deepEqual(result, {
      httpStatus: 200,
      callStatus: undefined,
      status: 'Pass',
      payload: 'Sun',
    });
    assert.equal(requestedUrl,
      'https://vedastro.zaishi.net/api/Calculate/PlanetName/Planet/Sun/Time/20%3A00/06/09/1968/%2B08%3A00/Location/Taipei/Taiwan');

    let getAuthAttempts = 0;
    globalThis.fetch = async (_input, init) => {
      getAuthAttempts += 1;
      if (new Headers(init?.headers).has('x-api-key')) {
        return new Response(JSON.stringify({
          Status: 'Fail',
          Payload: 'Invalid API key.',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        Status: 'Pass',
        Payload: { PlanetName: 'Sun' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const getAuthFallbackResult = await callVedAstroGet({
      VEDASTRO_API_KEY: 'test-only-secret',
      VEDASTRO_API_BASE: 'https://vedastro.zaishi.net/api',
    }, [
      'Calculate', 'PlanetName', 'Planet', 'Sun',
      'Time', '00:00', '01', '01', '2000', '+00:00',
      'Location', 'London', 'UK',
    ]);
    assert.equal(getAuthFallbackResult.payload, 'Sun');
    assert.equal(getAuthAttempts, 2, 'A rejected optional GET key must retry without credentials');

    globalThis.fetch = async () => new Response(JSON.stringify({
      Status: 'Fail',
      'Call-Status': 'Fail',
      Payload: 'Calculator method not found!',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Call-Status': 'Fail' },
    });
    await assert.rejects(
      callVedAstroGet({ VEDASTRO_API_KEY: 'test-only-secret' }, [
        'Calculate', 'PlanetName', 'Planet', 'Sun',
      ]),
      (error: unknown) => !!error && typeof error === 'object'
        && 'code' in error && error.code === 'VEDASTRO_METHOD_NOT_FOUND'
        && 'httpStatus' in error && error.httpStatus === 200
        && 'vedAstroStatus' in error && error.vedAstroStatus === 'Fail'
        && 'callStatus' in error && error.callStatus === 'Fail'
        && !String(error).includes('test-only-secret'),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function checkGeocodingBehavior(): Promise<void> {
  const geocodingCache = new Map<string, { result_json: string | null; not_found: number; cached_at: number }>();
  let geocodingThrottleUpdated = false;
  let geocodingRequestCount = 0;
  let geocodingRequestUrl = '';
  const originalFetch = globalThis.fetch;
  const geocodingDb = {
    async batch() {
      return [];
    },
    prepare(query: string) {
      let values: unknown[] = [];
      return {
        bind(...boundValues: unknown[]) {
          values = boundValues;
          return this;
        },
        async run() {
          if (query.includes('UPDATE vedic_geocoding_throttle')) {
            geocodingThrottleUpdated = true;
            return { meta: { changes: 1 } };
          }
          if (query.includes('INSERT INTO vedic_geocoding_cache')) {
            geocodingCache.set(String(values[0]), {
              result_json: values[1] === null ? null : String(values[1]),
              not_found: values[1] === null ? 1 : 0,
              cached_at: Number(values[2]),
            });
          }
          return { meta: { changes: 1 } };
        },
        async first<T>() {
          if (query.includes('FROM vedic_geocoding_cache')) {
            return (geocodingCache.get(String(values[0])) ?? null) as T | null;
          }
          if (query.includes('FROM vedic_geocoding_throttle')) {
            return { last_request_ms: 0 } as T;
          }
          return null;
        },
      };
    },
  } as unknown as D1Database;
  const geocodingEnv = { DB: geocodingDb } as Env;
  globalThis.fetch = async (input, init) => {
    geocodingRequestCount += 1;
    geocodingRequestUrl = String(input);
    assert.equal(init?.method, undefined);
    assert.equal(new Headers(init?.headers).get('User-Agent'), 'CrystalField101/1.0 (+https://crystalfield101.com; contact: wadehuang77@gmail.com)');
    return new Response(JSON.stringify([{
      display_name: 'Taipei City, Taiwan',
      lat: '25.0330',
      lon: '121.5654',
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const resolvedLocation = await resolveBirthLocation(geocodingEnv, '  Taipei   City, Taiwan  ');
    assert.deepEqual(resolvedLocation, {
      name: 'Taipei City, Taiwan',
      latitude: 25.033,
      longitude: 121.5654,
    });
    assert.equal(geocodingThrottleUpdated, true);
    const geocodingUrl = new URL(geocodingRequestUrl);
    assert.equal(geocodingUrl.origin + geocodingUrl.pathname, 'https://nominatim.openstreetmap.org/search');
    assert.equal(geocodingUrl.searchParams.get('q'), 'Taipei City, Taiwan');
    assert.equal(geocodingUrl.searchParams.get('format'), 'jsonv2');
    assert.equal(geocodingUrl.searchParams.get('limit'), '1');
    assert.equal(geocodingRequestCount, 1);

    const cachedLocation = await resolveBirthLocation(geocodingEnv, 'taipei city, taiwan');
    assert.deepEqual(cachedLocation, resolvedLocation);
    assert.equal(geocodingRequestCount, 1, 'A normalized birthplace query should be served from cache');

    await assert.rejects(
      resolveBirthLocation(geocodingEnv, 'x'),
      (error: unknown) => error instanceof BirthLocationResolutionError
        && error.code === 'GEOCODING_INVALID_RESPONSE',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

assert.throws(() => buildVedAstroTime('1968-09-06', '20:00', '+08:00', {
  name: 'Invalid',
  latitude: 91,
  longitude: 121.5654,
}), RangeError);
const parsedPlanets = parsePlanetLongitudes(
  'Sun - 140.52194444444444, Moon - 315.31111111111113, Mars - 116.93916666666667, Mercury - 163.52777777777777, Jupiter - 142.42111111111112, Venus - 161.77416666666667, Saturn - 1.355, Ketu - 167.36305555555555, Rahu - 347.36305555555555',
);
assert.deepEqual(Object.keys(parsedPlanets).sort(), [
  'Jupiter', 'Ketu', 'Mars', 'Mercury', 'Moon', 'Rahu', 'Saturn', 'Sun', 'Venus',
]);
const parsedPlanetRows = parsePlanetLongitudes([
  { Planet: 'Sun', Longitude: 140.5 },
  { PlanetName: 'Moon', AllPlanetLongitude: 315.3 },
]);
assert.equal(parsedPlanetRows.Sun, 140.5);
assert.ok(Math.abs(parsedPlanetRows.Moon - 315.3) < 1e-9);
const houseRows = Array.from({ length: 12 }, (_, index) => ({
  House: `House${index + 1}`,
  Begin: String(index * 30),
  Mid: String(index * 30 + 15),
  End: String((index + 1) * 30),
}));
const parsedHouseRows = parseVedicHouseLongitudes(houseRows);
assert.equal(parsedHouseRows.length, 12);
assert.deepEqual(parseVedicHousePlacements({ Sun: 10, Moon: 45 }, parsedHouseRows), {
  Sun: 1,
  Moon: 2,
});

const expectedPrices: Record<string, number> = {
  vedic_career: 399,
  vedic_relationship: 399,
  vedic_karma: 399,
  vedic_timeline: 399,
  vedic_full: 699,
  vedic_soul_karma: 499,
  vedic_life_full: 499,
  vedic_complete: 699,
};

for (const [productId, price] of Object.entries(expectedPrices)) {
  assert.equal(SPREAD_CATALOG[productId]?.amount, price, `${productId} price`);
}

const source = readFileSync(new URL('../src/vedicAstrology.ts', import.meta.url), 'utf8');
const geocodingSource = readFileSync(new URL('../src/vedicGeocoding.ts', import.meta.url), 'utf8');
const workerIndexSource = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
assert.match(geocodingSource, /nominatim\.openstreetmap\.org\/search/);
assert.doesNotMatch(geocodingSource, /api\.vedastro\.org|AddressToGeoLocation/);
assert.doesNotMatch(workerIndexSource, /\/api\/admin\/diagnostics|adminDiagnostics/);
const calculationSource = source.slice(source.indexOf('export async function createVedicChart'), source.indexOf('export async function validateVedicCheckoutContext'));
assert.match(calculationSource, /calculateProkeralaChart/);
assert.match(calculationSource, /normalizeProkeralaVedic/);
assert.doesNotMatch(calculationSource, /callVedAstro/);
assert.match(calculationSource, /astrologyRequests: timings\.filter/);
assert.doesNotMatch(source, /function deriveDivisionalCharts/);
assert.match(source, /housePlacements/);
assert.match(source, /houseLords/);
assert.match(source, /karmaAspects/);
for (const heading of [
  '① 前世業力',
  '② 今生的人生課題',
  '③ 羅喉／計都靈魂軸線',
  '④ 愛情與婚姻',
  '⑤ 財富模式',
  '⑥ 事業天賦',
  '⑦ D9 婚姻／靈魂成熟度',
  '⑧ D10 事業分盤',
  '⑨ 未來 3～5 年大運時間軸',
]) {
  assert.match(source, new RegExp(heading), `missing complete report heading: ${heading}`);
}
assert.match(source, /loadVedAstroReferenceTransits/);
assert.doesNotMatch(source.slice(source.indexOf('export async function getVedicPaidReport')), /loadVedAstroReferenceTransits|callVedAstro/);
assert.match(source, /current_transits/);
assert.match(source, /VEDIC_REPORT_FORMAT_VERSION = 10/);
assert.match(source, /①至⑧每篇以350至500個繁體中文字為目標/);
assert.match(source, /length <= 900/);
assert.match(source, /section_\$\{sectionNumber\}_too_long_\$\{length\}/);
assert.match(source, /scope === 'complete'\) return startVedicReport/);
assert.match(source, /reasoning: \{ effort: 'low' \}/);
assert.match(source, /verbosity: 'low'/);
assert.match(source, /OpenAI report incomplete/);
assert.match(source, /一個被說中的深層問題、一個當事人原本沒想到的成因、一個隱藏的心理回報或安全感來源/);
assert.match(source, /traditionalChineseLength/);
assert.match(source, /duplicate_or_high_similarity/);
assert.match(source, /const resolvedChartId = linkedChartId/);
assert.match(source, /if \(chartId \|\| chartToken\)/);
assert.match(source, /rateLimit\(env, 'vedic-report-order', orderId, 40, 3600\)/);
for (const field of ['consultation', 'evidence', 'timeline']) {
  assert.match(source, new RegExp(field), `missing structured report field: ${field}`);
}
assert.match(source, /reportHasDuplicateSentences/);
assert.match(source, /validStructuredSection/);
assert.match(source, /最高原則：不要問這個星體代表什麼/);
assert.match(source, /自然比較 D1 的早期關係反應與 D9/);
assert.match(source, /自然比較 D1 的職涯動機與 D10/);
assert.match(source, /forecast_periods 是程式固定骨架/);
assert.match(source, /現象→深層機制→吸引或重複模式→代價→真正核心→具體做法→成熟版本/);
assert.match(source, /VEDIC_REPORT_REGENERATE/);
assert.match(source, /buildVedicForecastPeriods/);
assert.match(source, /mergeVedicForecastInterpretations/);
assert.match(source, /VEDIC_FORECAST_MISSING_ANTARDASHA/);
assert.match(source, /不得增加、刪除、合併、改序或改日期/);
assert.match(source, /\[vedic-chart\] chart creation failed/);
assert.match(source, /GEOCODING_FAILED/);
assert.match(source, /TIMEZONE_FAILED/);
assert.match(source, /VEDASTRO_HTTP_ERROR/);
assert.match(source, /VEDASTRO_AUTH_FAILED/);
assert.match(source, /VEDASTRO_RATE_LIMITED/);
assert.match(source, /VEDASTRO_UPSTREAM_FAILED/);
assert.match(source, /VEDASTRO_RATE_LIMIT/);
assert.match(source, /TIMEZONE_FAILED/);
assert.match(source, /CHART_NORMALIZATION_FAILED/);
assert.match(source, /VEDASTRO_STATUS_FAIL/);
assert.match(source, /VEDASTRO_INVALID_RESPONSE/);
assert.match(source, /VEDASTRO_PLANET_DATA_MISSING/);
assert.match(source, /typeof payload === 'string' \? payload : undefined/);
assert.match(source, /payload_type=\$\{payloadType\}/);
assert.match(source, /\[redacted\]/);
assert.match(source, /chart,/);
assert.match(source, /current_transits: transits/);
assert.match(source, /existingNeedsRefresh/);
assert.match(source, /validateCompleteVedicReport/);
assert.match(source, /const maximumLength = kind === 'period' \? 600 : 1100/);
assert.match(source, /transientFallback: true/);
assert.match(source, /FREE_READING_MIN_CHARS = 250/);
assert.match(source, /Ayanamsa:\s*'LAHIRI'/);
assert.match(source, /VEDASTRO_DEFAULT_API_BASE = 'https:\/\/vedastro\.zaishi\.net\/api'/);
assert.match(source, /VEDASTRO_API_BASE/);
assert.doesNotMatch(source, /callVedAstro(?:Get)?\(env,\s*['"]PlanetName['"]/);
assert.match(source, /encodeURIComponent\(segment\)/);
assert.match(source, /callVedAstroGet/);
assert.match(source, /VEDASTRO_METHOD_NOT_FOUND/);
assert.match(source, /VEDASTRO_INVALID_PAYLOAD/);
assert.match(source, /method: 'POST'/);
assert.match(source, /buildVedAstroGetTimePath/);
assert.match(source, /normalizeVedicChart/);
assert.match(source, /buildVedicAiChartInput/);
assert.match(source, /buildVedAstroTime/);
assert.match(source, /requestId/);
assert.doesNotMatch(source, /vedastroapi\.azurewebsites\.net/);
assert.match(source, /x-api-key/);
assert.match(source, /order\.status !== 'paid'/);
assert.match(source, /order\.item_id\.startsWith\('vedic_'\)/);
assert.match(source, /order_id TEXT NOT NULL UNIQUE/);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_date/i);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_place/i);

void checkGeocodingBehavior().then(checkVedAstroPostContract).then(checkVedAstroGetContract).then(() => {
  console.log('Vedic astrology geocoding, timezone, POST/GET contracts, payment guard, timeline and privacy checks: passed');
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
