export interface ProkeralaCredentials {
  PROKERALA_CLIENT_ID?: string;
  PROKERALA_CLIENT_SECRET?: string;
}

export interface ProkeralaBirth {
  datetime: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface ProkeralaTiming {
  endpoint: string;
  status: number | null;
  latencyMs: number;
}

export class ProkeralaError extends Error {
  constructor(
    readonly code: string,
    readonly endpoint: string,
    readonly httpStatus: number | null = null,
    readonly retryAfterSeconds?: number,
    readonly oauthError?: string,
  ) {
    super(code);
    this.name = 'ProkeralaError';
  }
}

const IDS = [0, 1, 2, 3, 4, 5, 6, 100, 101, 102] as const;
const NAMES: Record<number, string> = {
  0: 'Sun', 1: 'Moon', 2: 'Mercury', 3: 'Venus', 4: 'Mars',
  5: 'Jupiter', 6: 'Saturn', 100: 'Ascendant', 101: 'Rahu', 102: 'Ketu',
};
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const BASE = 'https://api.prokerala.com';
const TIMEOUT_MS = 25000;
const tokens = new WeakMap<ProkeralaCredentials, { value: string; expires: number }>();
const pendingTokens = new WeakMap<ProkeralaCredentials, Promise<string>>();

function invalid(endpoint: string): never {
  throw new ProkeralaError('PROKERALA_INVALID_RESPONSE', endpoint);
}

function record(value: unknown, endpoint: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(endpoint);
  return value as Record<string, unknown>;
}

function array(value: unknown, endpoint: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) invalid(endpoint);
  return value;
}

function number(value: unknown, min: number, max: number, endpoint: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid(endpoint);
  return value;
}

function integer(value: unknown, min: number, max: number, endpoint: string): number {
  const result = number(value, min, max, endpoint);
  if (!Number.isInteger(result)) invalid(endpoint);
  return result;
}

function name(value: unknown, endpoint: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z .'-]{0,79}$/.test(value)) invalid(endpoint);
  return value;
}

function planetName(value: unknown, endpoint: string): string {
  const row = record(value, endpoint);
  const id = integer(row.id, 0, 102, endpoint);
  if (!NAMES[id] || row.name !== NAMES[id]) invalid(endpoint);
  return NAMES[id];
}

function sign(value: unknown, endpoint: string): string {
  const id = integer(record(value, endpoint).id, 0, 11, endpoint);
  return SIGNS[id];
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Math.min(Number(value), 86400);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.min(Math.max(0, Math.ceil((date - now) / 1000)), 86400) : undefined;
}

async function request(
  endpoint: string,
  url: URL,
  init: RequestInit,
  timings: ProkeralaTiming[],
  timeoutMs = TIMEOUT_MS,
): Promise<unknown> {
  const start = performance.now();
  let status: number | null = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' });
    status = response.status;
    if (!response.ok) {
      let oauthError: string | undefined;
      if (endpoint === 'oauth' && (response.headers.get('Content-Type') ?? '').includes('application/json')) {
        const payload: unknown = await response.json();
        if (payload && typeof payload === 'object' && 'error' in payload
          && typeof payload.error === 'string'
          && ['invalid_request', 'invalid_client', 'invalid_grant', 'unauthorized_client',
            'unsupported_grant_type', 'invalid_scope'].includes(payload.error)) {
          oauthError = payload.error;
        }
      } else {
        await response.body?.cancel();
      }
      const code = status === 429 ? 'PROKERALA_RATE_LIMITED'
        : status === 401 || status === 403 ? 'PROKERALA_AUTH_FAILED'
          : status >= 500 ? 'PROKERALA_UPSTREAM_FAILED' : 'PROKERALA_HTTP_ERROR';
      throw new ProkeralaError(code, endpoint, status, parseRetryAfter(response.headers.get('Retry-After')), oauthError);
    }
    if (!(response.headers.get('Content-Type') ?? '').includes('application/json')) invalid(endpoint);
    return await response.json();
  } catch (error) {
    if (error instanceof ProkeralaError) throw error;
    throw new ProkeralaError(
      controller.signal.aborted ? 'PROKERALA_TIMEOUT' : 'PROKERALA_TRANSPORT_OR_JSON_ERROR', endpoint, status,
    );
  } finally {
    clearTimeout(timer);
    timings.push({ endpoint, status, latencyMs: Math.round(performance.now() - start) });
  }
}

async function obtainToken(
  env: ProkeralaCredentials,
  timings: ProkeralaTiming[],
  method: 'body' | 'basic',
): Promise<string> {
  if (!env.PROKERALA_CLIENT_ID || !env.PROKERALA_CLIENT_SECRET) {
    throw new ProkeralaError('PROKERALA_NOT_CONFIGURED', 'oauth');
  }
  const params = new URLSearchParams({ grant_type: 'client_credentials' });
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json',
  };
  if (method === 'body') {
    params.set('client_id', env.PROKERALA_CLIENT_ID);
    params.set('client_secret', env.PROKERALA_CLIENT_SECRET);
  } else {
    const bytes = new TextEncoder().encode(`${env.PROKERALA_CLIENT_ID}:${env.PROKERALA_CLIENT_SECRET}`);
    headers.Authorization = `Basic ${btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))}`;
  }
    const payload = record(await request('oauth', new URL('/token', BASE), {
      method: 'POST',
      headers,
      body: params.toString(),
    }, timings), 'oauth');
    if (typeof payload.access_token !== 'string' || !payload.access_token
      || payload.token_type !== 'Bearer') invalid('oauth');
    const expiresIn = number(payload.expires_in, 1, 86400, 'oauth');
    tokens.set(env, {
      value: payload.access_token, expires: Date.now() + Math.max(0, expiresIn - 60) * 1000,
    });
    return payload.access_token;
}

async function accessToken(env: ProkeralaCredentials, timings: ProkeralaTiming[]): Promise<string> {
  const cached = tokens.get(env);
  if (cached && cached.expires > Date.now()) return cached.value;
  const pending = pendingTokens.get(env);
  if (pending) return pending;
  const operation = obtainToken(env, timings, 'body');
  pendingTokens.set(env, operation);
  try {
    return await operation;
  } finally {
    pendingTokens.delete(env);
  }
}

export interface ProkeralaOAuthTest {
  method: 'body' | 'basic';
  status: number | null;
  latencyMs: number;
  pass: boolean;
  tokenObtained: boolean;
  expiresInObtained: boolean;
  code?: string;
  oauthError?: string;
}

export async function diagnoseProkeralaOAuth(
  env: ProkeralaCredentials,
  timings: ProkeralaTiming[],
): Promise<{ testA: ProkeralaOAuthTest; testB?: ProkeralaOAuthTest }> {
  async function test(method: 'body' | 'basic'): Promise<ProkeralaOAuthTest> {
    const start = performance.now();
    let error: ProkeralaError | undefined;
    try {
      // Deliberately bypass cached tokens so each transport is tested exactly once.
      await obtainToken(env, timings, method);
    } catch (caught) {
      if (!(caught instanceof ProkeralaError)) throw caught;
      error = caught;
    }
    const timing = timings.at(-1);
    return {
      method, status: timing?.status ?? null,
      latencyMs: timing?.latencyMs ?? Math.round(performance.now() - start),
      pass: !error, tokenObtained: !error, expiresInObtained: !error,
      ...(error ? { code: error.code, oauthError: error.oauthError } : {}),
    };
  }
  const testA = await test('body');
  if (testA.status !== 401) return { testA };
  return { testA, testB: await test('basic') };
}

export interface ProkeralaPlanet {
  name: string;
  sign: string;
  longitude: number;
  sign_degree: number;
  house?: number;
  nakshatra?: { name: string; pada?: number };
  retrograde?: boolean;
}

export interface ProkeralaDivision {
  houses: Array<{ number: number; sign: string }>;
  planets: ProkeralaPlanet[];
}

export interface ProkeralaPeriod {
  lord: string;
  start: string;
  end: string;
  subPeriods: Array<{ lord: string; start: string; end: string }>;
}

export interface ProkeralaChart {
  provider: 'prokerala';
  ayanamsa: 'lahiri';
  birth: ProkeralaBirth;
  ascendant: ProkeralaPlanet;
  planets: ProkeralaPlanet[];
  moonNakshatra: { name: string; pada: number };
  d9: ProkeralaDivision;
  d10: ProkeralaDivision;
  d1?: ProkeralaDivision;
  dasha: {
    balance: { lord: string; duration: string };
    periods: ProkeralaPeriod[];
    mahadasha: string;
    antardasha: string | null;
    calculationTime: string;
    yearLength: 365.25;
  };
}

function nakshatra(value: unknown, endpoint: string): { name: string; pada?: number } {
  const row = record(value, endpoint);
  integer(row.id, 0, 26, endpoint);
  const result: { name: string; pada?: number } = { name: name(row.name, endpoint) };
  if (row.pada !== undefined) result.pada = integer(row.pada, 1, 4, endpoint);
  return result;
}

function validatePlanetSet(planets: ProkeralaPlanet[], endpoint: string): void {
  if (planets.length !== IDS.length || new Set(planets.map(p => p.name)).size !== IDS.length
    || IDS.some(id => !planets.some(p => p.name === NAMES[id]))) invalid(endpoint);
}

function parsePlanets(data: Record<string, unknown>): ProkeralaPlanet[] {
  const endpoint = 'planet-position';
  const planets = array(data.planet_position, endpoint).map(raw => {
    const row = record(raw, endpoint);
    if (typeof row.is_retrograde !== 'boolean') invalid(endpoint);
    return {
      name: planetName(row, endpoint),
      sign: sign(row.rasi, endpoint),
      longitude: number(row.longitude, 0, 359.999999999, endpoint),
      sign_degree: number(row.degree, 0, 29.999999999, endpoint),
      retrograde: row.is_retrograde,
    };
  });
  validatePlanetSet(planets, endpoint);
  return planets;
}

function parseDivision(data: Record<string, unknown>, endpoint: string): ProkeralaDivision {
  const planets: ProkeralaPlanet[] = [];
  const houses = array(data.divisional_positions, endpoint).map(raw => {
    const row = record(raw, endpoint);
    const houseNumber = integer(record(row.house, endpoint).number, 1, 12, endpoint);
    const houseSign = sign(row.rasi, endpoint);
    if (!Array.isArray(row.planet_positions)) invalid(endpoint);
    for (const rawPlanet of row.planet_positions) {
      const p = record(rawPlanet, endpoint);
      const position: ProkeralaPlanet = {
        name: planetName(p.planet, endpoint),
        sign: sign(p.rasi, endpoint),
        longitude: number(p.longitude, 0, 359.999999999, endpoint),
        sign_degree: number(p.sign_degree, 0, 29.999999999, endpoint),
        house: integer(record(p.house, endpoint).number, 1, 12, endpoint),
        nakshatra: nakshatra(p.nakshatra, endpoint),
      };
      if (position.house !== houseNumber || position.sign !== houseSign) invalid(endpoint);
      planets.push(position);
    }
    return { number: houseNumber, sign: houseSign };
  });
  if (houses.length !== 12 || new Set(houses.map(h => h.number)).size !== 12) invalid(endpoint);
  validatePlanetSet(planets, endpoint);
  if (planets.find(p => p.name === 'Ascendant')?.house !== 1) invalid(endpoint);
  return { houses, planets };
}

function period(value: unknown): { lord: string; start: string; end: string } {
  const endpoint = 'dasha-periods';
  const row = record(value, endpoint);
  const lord = planetName(row, endpoint);
  const start = row.start;
  const end = row.end;
  if (typeof start !== 'string' || typeof end !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T/.test(start) || !/^\d{4}-\d{2}-\d{2}T/.test(end)
    || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))
    || Date.parse(start) >= Date.parse(end)) invalid(endpoint);
  return { lord, start, end };
}

function parseDasha(data: Record<string, unknown>, now: Date): ProkeralaChart['dasha'] {
  const endpoint = 'dasha-periods';
  const periods = array(data.dasha_periods, endpoint).map(raw => {
    const row = record(raw, endpoint);
    const main = period(row);
    const subPeriods = array(row.antardasha, endpoint).map(period);
    if (subPeriods.some(sub => Date.parse(sub.start) < Date.parse(main.start) - 60000
      || Date.parse(sub.end) > Date.parse(main.end) + 60000)) invalid(endpoint);
    return { ...main, subPeriods };
  });
  const balance = record(data.dasha_balance, endpoint);
  if (typeof balance.duration !== 'string' || !/^P[\d.YMDTHS]+$/.test(balance.duration)) invalid(endpoint);
  const active = periods.find(p => Date.parse(p.start) <= now.getTime() && now.getTime() < Date.parse(p.end));
  if (!active) invalid(endpoint);
  const sub = active.subPeriods.find(p => Date.parse(p.start) <= now.getTime() && now.getTime() < Date.parse(p.end));
  return {
    balance: { lord: planetName(balance.lord, endpoint), duration: balance.duration },
    periods,
    mahadasha: active.lord,
    antardasha: sub?.lord ?? null,
    calculationTime: now.toISOString(),
    yearLength: 365.25,
  };
}

export async function calculateProkeralaChart(
  env: ProkeralaCredentials,
  birth: ProkeralaBirth,
  timings: ProkeralaTiming[],
  now = new Date(),
  includeD1Houses = false,
): Promise<ProkeralaChart> {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(birth.datetime)
    || !Number.isFinite(Date.parse(birth.datetime))) throw new ProkeralaError('PROKERALA_INVALID_INPUT', 'input');
  number(birth.latitude, -90, 90, 'input');
  number(birth.longitude, -180, 180, 'input');
  const deadline = performance.now() + 60000;
  const token = await accessToken(env, timings);
  // Serial scheduling bounds concurrency to one. A chart gets only one 429 retry.
  let retryUsed = false;
  async function get(endpoint: string, extra: Record<string, string> = {}) {
    const url = new URL(`/v2/astrology/${endpoint.split(':')[0]}`, BASE);
    url.search = new URLSearchParams({
      ayanamsa: '1', coordinates: `${birth.latitude},${birth.longitude}`,
      datetime: birth.datetime, language: 'en', ...extra,
    }).toString();
    async function attempt() {
      const remainingMs = Math.floor(deadline - performance.now());
      if (remainingMs <= 0) throw new ProkeralaError('PROKERALA_TIMEOUT', endpoint);
      return request(endpoint, url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      }, timings, Math.min(TIMEOUT_MS, remainingMs));
    }
    let raw: unknown;
    try {
      raw = await attempt();
    } catch (error) {
      if (!(error instanceof ProkeralaError) || error.code !== 'PROKERALA_RATE_LIMITED'
        || !includeD1Houses || retryUsed || error.retryAfterSeconds === undefined) throw error;
      const waitMs = error.retryAfterSeconds * 1000;
      // Leave a full upstream request budget; long/unknown cooldowns return safely.
      if (waitMs > 10000 || deadline - performance.now() < waitMs + TIMEOUT_MS) throw error;
      retryUsed = true;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      raw = await attempt();
    }
    const payload = record(raw, endpoint);
    if (payload.status !== 'ok') invalid(endpoint);
    return record(payload.data, endpoint);
  }
  // Serial requests bound credit use and stop immediately at the first failure.
  const allPlanets = parsePlanets(await get('planet-position', { planets: IDS.join(',') }));
  const birthData = await get('birth-details');
  const moonNakshatra = nakshatra(birthData.nakshatra, 'birth-details');
  if (moonNakshatra.pada === undefined) invalid('birth-details');
  const d1 = includeD1Houses
    ? parseDivision(await get('divisional-planet-position:lagna', { chart_type: 'lagna' }), 'lagna')
    : undefined;
  if (d1) {
    for (const p of allPlanets) {
      const supplied = d1.planets.find(candidate => candidate.name === p.name);
      if (!supplied || supplied.sign !== p.sign
        || Math.abs(supplied.longitude - p.longitude) > 0.001) invalid('lagna');
      p.house = supplied.house;
      p.nakshatra = supplied.nakshatra;
    }
  }
  const d9 = parseDivision(await get('divisional-planet-position:navamsa', { chart_type: 'navamsa' }), 'navamsa');
  const d10 = parseDivision(await get('divisional-planet-position:dasamsa', { chart_type: 'dasamsa' }), 'dasamsa');
  const dasha = parseDasha(await get('dasha-periods', { year_length: '1' }), now);
  const ascendant = allPlanets.find(p => p.name === 'Ascendant');
  if (!ascendant) invalid('planet-position');
  return {
    provider: 'prokerala', ayanamsa: 'lahiri', birth: { ...birth },
    ascendant, planets: allPlanets.filter(p => p.name !== 'Ascendant'),
    moonNakshatra: { name: moonNakshatra.name, pada: moonNakshatra.pada },
    d9, d10, dasha, ...(d1 ? { d1 } : {}),
  };
}
