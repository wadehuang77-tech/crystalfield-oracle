import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPREAD_CATALOG } from '../src/ecpay.ts';
import type { Env } from '../src/utils.ts';
import { BirthLocationResolutionError, resolveBirthLocation } from '../src/vedicGeocoding.ts';
import {
  buildVedAstroAllPlanetLongitudeUrl,
  isVedAstroRateLimitMessage,
  parsePlanetLongitudes,
  timezoneOffsetAtLocal,
} from '../src/vedicAstrology.ts';

const directCalculationUrl = buildVedAstroAllPlanetLongitudeUrl({
  latitude: 25.0330,
  longitude: 121.5654,
  birthHour: 20,
  birthMinute: 0,
  day: 6,
  month: 9,
  year: 1968,
  timezoneOffset: '+08:00',
  ayanamsa: 'LAHIRI',
});
assert.equal(
  directCalculationUrl,
  'https://api.vedastro.org/api/Calculate/AllPlanetLongitude/Location/25.0330,121.5654/Time/20:00/06/09/1968/+08:00/Ayanamsa/LAHIRI',
);
assert.equal(timezoneOffsetAtLocal('1968-09-06', '20:00', 'Asia/Taipei'), '+08:00');
assert.equal(timezoneOffsetAtLocal('2020-01-15', '12:00', 'America/New_York'), '-05:00');
assert.equal(timezoneOffsetAtLocal('2020-07-15', '12:00', 'America/New_York'), '-04:00');
assert.equal(isVedAstroRateLimitMessage('Free tier rate limit exceeded (5 calls/minute).'), true);
assert.equal(isVedAstroRateLimitMessage('Too many requests; try again later.'), true);
assert.equal(isVedAstroRateLimitMessage('Invalid birth time.'), false);

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

assert.throws(() => buildVedAstroAllPlanetLongitudeUrl({
  latitude: 91,
  longitude: 121.5654,
  birthHour: 20,
  birthMinute: 0,
  day: 6,
  month: 9,
  year: 1968,
  timezoneOffset: '+08:00',
  ayanamsa: 'LAHIRI',
}), RangeError);
const parsedPlanets = parsePlanetLongitudes(
  'Sun - 140.52194444444444, Moon - 315.31111111111113, Mars - 116.93916666666667, Mercury - 163.52777777777777, Jupiter - 142.42111111111112, Venus - 161.77416666666667, Saturn - 1.355, Ketu - 167.36305555555555, Rahu - 347.36305555555555',
);
assert.deepEqual(Object.keys(parsedPlanets).sort(), [
  'Jupiter', 'Ketu', 'Mars', 'Mercury', 'Moon', 'Rahu', 'Saturn', 'Sun', 'Venus',
]);

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
assert.match(source, /DasaAtRange/);
assert.match(source, /AllPlanetLongitude/);
assert.match(source, /AllHouseLongitudes/);
assert.match(source, /deriveDivisionalCharts/);
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
assert.match(source, /loadCurrentTransits/);
assert.match(source, /current_transits/);
assert.match(source, /VEDIC_REPORT_FORMAT_VERSION = 10/);
assert.match(source, /①至⑧每篇以350至500個繁體中文字為目標/);
assert.match(source, /length <= 900/);
assert.match(source, /section_\$\{sectionNumber\}_too_long_\$\{length\}/);
assert.match(source, /slice\(0, 3\)/);
assert.match(source, /Promise\.allSettled\(nextIndexes/);
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
assert.match(source, /VEDIC_GEOLOCATION_UNAVAILABLE/);
assert.match(source, /VEDIC_CALCULATION_UNAVAILABLE/);
assert.match(source, /VEDASTRO_HTTP_ERROR/);
assert.match(source, /VEDASTRO_RATE_LIMITED/);
assert.match(source, /VEDIC_PROVIDER_RATE_LIMITED/);
assert.match(source, /VEDASTRO_STATUS_FAIL/);
assert.match(source, /VEDASTRO_INVALID_RESPONSE/);
assert.match(source, /VEDASTRO_PLANET_DATA_MISSING/);
assert.match(source, /typeof payload === 'string' \? payload : undefined/);
assert.match(source, /payload_type=\$\{payloadType\}/);
assert.match(source, /\[redacted\]/);
assert.match(source, /chart,/);
assert.match(source, /current_transits: transits/);
assert.match(source, /existingNeedsRefresh/);
assert.match(source, /validateCompleteVedicReport\(existingReport as VedicPaidReport, language\)/);
assert.match(source, /const maximumLength = kind === 'period' \? 600 : 1100/);
assert.match(source, /transientFallback: true/);
assert.match(source, /FREE_READING_MIN_CHARS = 250/);
assert.match(source, /Ayanamsa:\s*'LAHIRI'/);
assert.match(source, /VEDASTRO_BASE = 'https:\/\/api\.vedastro\.org\/api'/);
assert.match(source, /method: 'GET'/);
assert.match(source, /buildVedAstroAllPlanetLongitudeUrl/);
assert.doesNotMatch(source, /vedastroapi\.azurewebsites\.net/);
assert.match(source, /x-api-key/);
assert.match(source, /order\.status !== 'paid'/);
assert.match(source, /order\.item_id\.startsWith\('vedic_'\)/);
assert.match(source, /order_id TEXT NOT NULL UNIQUE/);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_date/i);
assert.doesNotMatch(source, /INSERT INTO vedic_charts[^]*birth_place/i);

void checkGeocodingBehavior().then(() => {
  console.log('Vedic astrology catalog, geocoding behavior, payment guard, timeline and privacy checks: passed');
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
