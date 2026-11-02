import assert from 'node:assert/strict';

const baseUrl = process.env.VEDASTRO_SELFHOST_URL || 'http://127.0.0.1:8080';
const fixture = {
  date: '1968-09-06',
  time: '20:00',
  timezone: '+08:00',
  latitude: 25.033,
  longitude: 121.5654,
  locationName: 'Taipei, Taiwan',
  ayanamsa: 'Lahiri',
};
const expectedPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const failures = [];
let passed = 0;

async function test(name, run) {
  try {
    await run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error: error instanceof Error ? error.message : String(error) });
    console.error(`FAIL ${name}: ${failures.at(-1).error}`);
  }
}

async function post(path) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fixture),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json();
  assert.equal(response.status, 200, `${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function assertUnsupported(path) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fixture),
    signal: AbortSignal.timeout(5_000),
  });
  const body = await response.json();
  assert.equal(response.status, 501, `${path} returned ${response.status}: ${JSON.stringify(body)}`);
  assert.equal(body.code, 'UNSUPPORTED_CALCULATION');
}

function assertPlanets(planets, description) {
  assert.ok(Array.isArray(planets), `${description} must be an array`);
  assert.deepEqual(planets.map((planet) => planet.name).sort(), [...expectedPlanets].sort());
  for (const planet of planets) {
    assert.equal(typeof planet.sign, 'string', `${description}.${planet.name} is missing sign`);
    assert.ok(planet.sign.length > 0, `${description}.${planet.name} has an empty sign`);
  }
}

await test('health endpoint does not need birth data', async () => {
  const response = await fetch(new URL('/health', baseUrl), { signal: AbortSignal.timeout(5_000) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', engine: 'VedAstro', mode: 'self-hosted' });
});

await test('invalid coordinates are rejected before calculation', async () => {
  const response = await fetch(new URL('/api/d1', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...fixture, latitude: 91 }),
    signal: AbortSignal.timeout(5_000),
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, 'INVALID_BIRTH_DATA');
});

await test('D1 contains nine planets, longitude, sign, house and Moon nakshatra/pada', async () => {
  const d1 = await post('/api/d1');
  assertPlanets(d1.planets, 'D1 planets');
  assert.ok(d1.ascendant?.longitude >= 0 && d1.ascendant.longitude < 360);
  for (const planet of d1.planets) {
    assert.ok(Number.isFinite(planet.longitude), `${planet.name} needs a longitude`);
    assert.ok(Number.isFinite(planet.degree), `${planet.name} needs a degree in sign`);
    assert.ok(Number.isInteger(planet.house), `${planet.name} needs a house`);
  }
  const moon = d1.planets.find((planet) => planet.name === 'Moon');
  assert.equal(typeof moon.nakshatra, 'string');
  assert.ok(Number.isInteger(moon.pada) && moon.pada >= 1 && moon.pada <= 4);
});

await test('D9 and D10 fail explicitly until native calculators are available', async () => {
  await assertUnsupported('/api/d9');
  await assertUnsupported('/api/d10');
});

await test('Vimshottari Dasha includes current Maha/Antardasha and dated periods', async () => {
  const dasha = await post('/api/dasha');
  assert.equal(typeof dasha.mahadasha, 'string');
  assert.equal(typeof dasha.antardasha, 'string');
  assert.ok(Date.parse(dasha.mahadashaStart) < Date.parse(dasha.mahadashaEnd));
  assert.ok(Date.parse(dasha.antardashaStart) < Date.parse(dasha.antardashaEnd));
  assert.ok(dasha.periods.length > 0);
});

await test('full chart fails explicitly while D9 and D10 are unsupported', async () => {
  await assertUnsupported('/api/chart');
});

console.log(`\n${passed} passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
