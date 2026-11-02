import assert from 'node:assert/strict';

const baseUrl = process.env.VEDASTRO_SELFHOST_URL || 'http://127.0.0.1:8080';
const input = {
  date: '1968-09-06',
  time: '20:00',
  timezone: '+08:00',
  latitude: 25.033,
  longitude: 121.5654,
  locationName: 'Taipei, Taiwan',
  ayanamsa: 'Lahiri',
};

async function measure(endpoint) {
  const start = performance.now();
  const response = await fetch(new URL(endpoint, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json();
  const elapsed = performance.now() - start;
  assert.equal(response.status, 200, `${endpoint} returned ${response.status}: ${JSON.stringify(body)}`);
  return elapsed;
}

function summarize(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const percentile = p => ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
  return {
    runs: values.length,
    minMs: ordered[0],
    maxMs: ordered.at(-1),
    averageMs: values.reduce((sum, value) => sum + value, 0) / values.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
  };
}

const results = {};
for (const endpoint of ['/api/d1', '/api/dasha']) {
  const samples = [];
  for (let index = 0; index < 10; index += 1) {
    samples.push(await measure(endpoint));
    console.log(`PASS ${endpoint} request ${index + 1}/10: ${samples[index].toFixed(2)} ms`);
  }
  results[endpoint] = {
    firstRequest: { elapsedMs: samples[0], note: 'first request to an already-running process; excludes container/process startup' },
    warmRequests: summarize(samples.slice(1)),
    allTenRequests: summarize(samples),
  };
}

console.log(JSON.stringify({
  endpoints: results,
  result: 'PASS',
}, null, 2));
