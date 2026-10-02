import type { Env } from './utils';

export interface BirthLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export type BirthLocationErrorCode =
  | 'GEOCODING_HTTP_ERROR'
  | 'GEOCODING_INVALID_RESPONSE'
  | 'GEOCODING_NO_RESULTS'
  | 'GEOCODING_RATE_LIMITED';

export class BirthLocationResolutionError extends Error {
  constructor(
    readonly code: BirthLocationErrorCode,
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'BirthLocationResolutionError';
  }
}

interface GeocodingCacheRow {
  result_json: string | null;
  not_found: number;
  cached_at: number;
}

interface NominatimResult {
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT = 'CrystalField101/1.0 (+https://crystalfield101.com; contact: wadehuang77@gmail.com)';
const POSITIVE_CACHE_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1_000;
const RATE_LIMIT_WAIT_MS = 15_000;

async function ensureGeocodingCache(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS vedic_geocoding_cache (
      query_hash TEXT PRIMARY KEY,
      result_json TEXT,
      not_found INTEGER NOT NULL DEFAULT 0,
      cached_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS vedic_geocoding_throttle (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_request_ms INTEGER NOT NULL
    )`),
    env.DB.prepare('INSERT OR IGNORE INTO vedic_geocoding_throttle (id, last_request_ms) VALUES (1, 0)'),
  ]);
}

async function hashQuery(query: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(query));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function waitForNominatimSlot(env: Env): Promise<void> {
  const deadline = Date.now() + RATE_LIMIT_WAIT_MS;
  while (Date.now() < deadline) {
    const now = Date.now();
    const result = await env.DB.prepare(
      'UPDATE vedic_geocoding_throttle SET last_request_ms = ? WHERE id = 1 AND last_request_ms <= ?'
    ).bind(now, now - MIN_REQUEST_INTERVAL_MS).run();
    if ((result.meta?.changes ?? 0) > 0) return;

    const row = await env.DB.prepare(
      'SELECT last_request_ms FROM vedic_geocoding_throttle WHERE id = 1'
    ).first<{ last_request_ms: number }>();
    const elapsed = row ? now - row.last_request_ms : MIN_REQUEST_INTERVAL_MS;
    await new Promise((resolve) => setTimeout(resolve, Math.max(25, MIN_REQUEST_INTERVAL_MS - elapsed)));
  }
  throw new BirthLocationResolutionError('GEOCODING_RATE_LIMITED', 'geocoding provider rate limit wait exceeded');
}

function parseNominatimResult(value: unknown, fallbackName: string): BirthLocation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = value as NominatimResult;
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const name = typeof result.display_name === 'string' ? result.display_name.trim() : '';
  if (!name || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { name: name.slice(0, 160) || fallbackName, latitude, longitude };
}

export async function resolveBirthLocation(env: Env, locationText: string): Promise<BirthLocation> {
  const query = locationText.trim().replace(/\s+/g, ' ');
  if (query.length < 2 || query.length > 160) {
    throw new BirthLocationResolutionError('GEOCODING_INVALID_RESPONSE', 'invalid birthplace query');
  }

  await ensureGeocodingCache(env);
  const queryHash = await hashQuery(query.toLocaleLowerCase('en-US'));
  const cached = await env.DB.prepare(
    'SELECT result_json, not_found, cached_at FROM vedic_geocoding_cache WHERE query_hash = ?'
  ).bind(queryHash).first<GeocodingCacheRow>();
  if (cached) {
    const ttl = cached.not_found ? NEGATIVE_CACHE_TTL_MS : POSITIVE_CACHE_TTL_MS;
    if (Date.now() - cached.cached_at < ttl) {
      if (cached.not_found || !cached.result_json) {
        throw new BirthLocationResolutionError('GEOCODING_NO_RESULTS', 'no matching birthplace');
      }
      try {
        const result = JSON.parse(cached.result_json) as BirthLocation;
        if (parseNominatimResult({ display_name: result.name, lat: result.latitude, lon: result.longitude }, query)) {
          return result;
        }
      } catch {}
    }
  }

  await waitForNominatimSlot(env);
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', addressdetails: '0' }).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  let responseText: string;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_USER_AGENT,
      },
      signal: controller.signal,
    });
    responseText = await response.text();
  } catch (error) {
    const kind = error instanceof Error ? error.name : 'NetworkError';
    throw new BirthLocationResolutionError('GEOCODING_HTTP_ERROR', `Nominatim request failed: ${kind}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new BirthLocationResolutionError('GEOCODING_HTTP_ERROR', `Nominatim HTTP ${response.status}`, response.status);
  }

  let results: unknown;
  try {
    results = JSON.parse(responseText);
  } catch {
    throw new BirthLocationResolutionError('GEOCODING_INVALID_RESPONSE', 'Nominatim returned invalid JSON', response.status);
  }
  if (!Array.isArray(results)) {
    throw new BirthLocationResolutionError('GEOCODING_INVALID_RESPONSE', 'Nominatim response was not a result list', response.status);
  }

  const location = results.length ? parseNominatimResult(results[0], query) : null;
  if (!location) {
    await env.DB.prepare(
      `INSERT INTO vedic_geocoding_cache (query_hash, result_json, not_found, cached_at)
       VALUES (?, NULL, 1, ?) ON CONFLICT(query_hash) DO UPDATE SET
       result_json = NULL, not_found = 1, cached_at = excluded.cached_at`
    ).bind(queryHash, Date.now()).run();
    throw new BirthLocationResolutionError('GEOCODING_NO_RESULTS', 'no matching birthplace', response.status);
  }

  await env.DB.prepare(
    `INSERT INTO vedic_geocoding_cache (query_hash, result_json, not_found, cached_at)
     VALUES (?, ?, 0, ?) ON CONFLICT(query_hash) DO UPDATE SET
     result_json = excluded.result_json, not_found = 0, cached_at = excluded.cached_at`
  ).bind(queryHash, JSON.stringify(location), Date.now()).run();
  return location;
}
