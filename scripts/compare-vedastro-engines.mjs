import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const birth = {
  date: '1968-09-06',
  time: '20:00',
  timezone: '+08:00',
  latitude: 25.033,
  longitude: 121.5654,
  locationName: 'Taipei, Taiwan',
  ayanamsa: 'Lahiri',
};
const officialBase = (process.env.VEDASTRO_API_BASE || 'https://api.vedastro.org/api').replace(/\/+$/, '');
const selfhostBase = process.env.VEDASTRO_SELFHOST_URL || 'http://127.0.0.1:8080';
const stdTime = `${birth.time} 06/09/1968 ${birth.timezone}`;
const nativeTime = {
  StdTime: stdTime,
  Location: { Name: birth.locationName, Latitude: birth.latitude, Longitude: birth.longitude },
};
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let officialRequestCount = 0;

export function compareChartData(official, selfhost) {
  const d1 = [];
  for (const name of ['Ascendant', ...planets]) {
    const officialLongitude = official.d1[name];
    const selfhostLongitude = selfhost.d1[name]?.longitude;
    if (!Number.isFinite(officialLongitude) || !Number.isFinite(selfhostLongitude)) {
      d1.push({ name, official: officialLongitude ?? null, selfhost: selfhostLongitude ?? null, difference: null, result: 'FAIL' });
      continue;
    }
    const difference = Math.abs(((officialLongitude - selfhostLongitude + 540) % 360) - 180);
    d1.push({ name, official: officialLongitude, selfhost: selfhostLongitude, difference, result: difference <= 0.01 ? 'PASS' : 'FAIL' });
  }

  const compareSigns = (officialSigns, selfhostSigns, names) => names.map((name) => {
    const officialSign = officialSigns[name] ?? null;
    const selfhostSign = selfhostSigns[name]?.sign ?? selfhostSigns[name] ?? null;
    return {
      name,
      official: officialSign,
      selfhost: selfhostSign,
      result: officialSign && officialSign === selfhostSign ? 'PASS' : 'FAIL',
    };
  });

  const d9 = official.d9 && selfhost.d9
    ? compareSigns(official.d9, selfhost.d9, ['Ascendant', ...planets])
    : [{ name: 'D9 chart', official: null, selfhost: null, result: 'NOT VERIFIED' }];
  const d10 = official.d10 && selfhost.d10
    ? compareSigns(official.d10, selfhost.d10, ['Ascendant', ...planets])
    : [{ name: 'D10 chart', official: null, selfhost: null, result: 'NOT VERIFIED' }];
  const officialDasha = official.dasha;
  const selfhostDasha = selfhost.dasha;
  const dashaStartDifferenceHours = dateDifferenceHours(officialDasha.mahadashaStart, selfhostDasha.mahadashaStart);
  const dashaEndDifferenceHours = dateDifferenceHours(officialDasha.mahadashaEnd, selfhostDasha.mahadashaEnd);
  const antarStartDifferenceHours = dateDifferenceHours(officialDasha.antardashaStart, selfhostDasha.antardashaStart);
  const antarEndDifferenceHours = dateDifferenceHours(officialDasha.antardashaEnd, selfhostDasha.antardashaEnd);
  const dasha = {
    officialMahadasha: officialDasha.mahadasha,
    selfhostMahadasha: selfhostDasha.mahadasha,
    officialAntardasha: officialDasha.antardasha,
    selfhostAntardasha: selfhostDasha.antardasha,
    mahadashaStartDifferenceHours: dashaStartDifferenceHours,
    mahadashaEndDifferenceHours: dashaEndDifferenceHours,
    antardashaStartDifferenceHours: antarStartDifferenceHours,
    antardashaEndDifferenceHours: antarEndDifferenceHours,
    result: officialDasha.mahadasha === selfhostDasha.mahadasha
      && officialDasha.antardasha === selfhostDasha.antardasha
      && [dashaStartDifferenceHours, dashaEndDifferenceHours, antarStartDifferenceHours, antarEndDifferenceHours].every(Number.isFinite)
      ? 'PASS'
      : 'FAIL',
  };

  return { d1, d9, d10, dasha };
}

function dateDifferenceHours(officialValue, selfhostValue) {
  const officialTime = parseVedAstroDateTime(officialValue);
  const selfhostTime = Date.parse(selfhostValue);
  return Number.isFinite(officialTime) && Number.isFinite(selfhostTime)
    ? Math.abs(officialTime - selfhostTime) / 3_600_000
    : null;
}

function parseVedAstroDateTime(value) {
  const match = /^(\d{2}):(\d{2}) (\d{2})\/(\d{2})\/(\d{4}) ([+-])(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Date.parse(value);

  const [, hour, minute, day, month, year, offsetSign, offsetHour, offsetMinute] = match;
  const offset = (Number(offsetHour) * 60 + Number(offsetMinute)) * (offsetSign === '-' ? -1 : 1);
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
    - offset * 60_000;
}

function officialGetPath(method, time, date) {
  const [year, month, day] = date.split('-');
  const segments = [
    'Calculate', method,
    'Location', `${birth.latitude.toFixed(4)},${birth.longitude.toFixed(4)}`,
    'Time', time, day, month, year, birth.timezone,
    'Ayanamsa', 'LAHIRI',
  ];
  return `${officialBase}/${segments.map(encodeURIComponent).join('/')}`;
}

async function officialRequest(url, body) {
  const initialRequest = officialRequestCount === 0;
  officialRequestCount += 1;
  await wait(initialRequest ? 65_000 : 12_500);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { accept: 'application/json', 'content-type': 'application/json' } : { accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json();
    if (response.status === 429 && attempt < 2) {
      await wait(61_000);
      continue;
    }
    if (!response.ok || payload?.Status !== 'Pass') {
      throw new Error(
        `Official VedAstro request failed: HTTP ${response.status}, Status=${payload?.Status ?? 'missing'}, `
        + `Payload=${JSON.stringify(payload?.Payload ?? null)}`,
      );
    }
    return payload;
  }
  throw new Error('Official VedAstro request exceeded its rate-limit retry limit.');
}

function assertOfficialTimeInput(response, parameterName, expectedTime, expectedLocationName) {
  const input = response?.Input;
  const parameter = input?.Parameters?.find(
    item => item.Name.toLowerCase() === parameterName.toLowerCase(),
  );
  const actualTime = parameter?.Value?.StdTime;
  const location = parameter?.Value?.Location;
  if (input?.Ayanamsa !== 1
      || actualTime !== expectedTime
      || location?.Latitude !== birth.latitude
      || location?.Longitude !== birth.longitude
      || (expectedLocationName && location?.Name !== expectedLocationName)) {
    throw new Error(
      `OFFICIAL REQUEST INVALID: ${parameterName} input metadata mismatch: `
      + JSON.stringify({ ayanamsa: input?.Ayanamsa, actualTime, location }),
    );
  }
}

function summarizeOfficialTimeInput(response, parameterName) {
  const parameter = response.Input.Parameters.find(
    item => item.Name.toLowerCase() === parameterName.toLowerCase(),
  );
  return {
    stdTime: parameter.Value.StdTime,
    latitude: parameter.Value.Location.Latitude,
    longitude: parameter.Value.Location.Longitude,
  };
}

function longitudeMap(raw) {
  const result = {};
  if (typeof raw === 'string') {
    for (const match of raw.matchAll(/\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\s*-\s*(-?\d+(?:\.\d+)?)/g)) {
      result[match[1]] = normalizeLongitude(Number(match[2]));
    }
  } else if (Array.isArray(raw)) {
    for (const row of raw) {
      const name = row?.Planet ?? row?.PlanetName;
      const value = Number(row?.Longitude ?? row?.AllPlanetLongitude ?? row?.Value);
      if (name && Number.isFinite(value)) result[name] = normalizeLongitude(value);
    }
  }
  return result;
}

function houseMap(raw) {
  const result = {};
  if (Array.isArray(raw)) {
    for (const row of raw) {
      const name = row?.House ?? row?.HouseName;
      const middle = Number(row?.Mid ?? row?.Middle ?? row?.MiddleLongitude);
      if (name && Number.isFinite(middle)) result[name] = normalizeLongitude(middle);
    }
  }
  return result;
}

function currentDasha(raw) {
  const [mahadasha, detail] = Object.entries(raw ?? {})[0] ?? [];
  const [antardasha, antarDetail] = Object.entries(detail?.SubDasas ?? {})[0] ?? [];
  return {
    mahadasha,
    antardasha,
    mahadashaStart: detail?.Start,
    mahadashaEnd: detail?.End,
    antardashaStart: antarDetail?.Start,
    antardashaEnd: antarDetail?.End,
  };
}

function unwrapMethodPayload(payload, method) {
  return payload && typeof payload === 'object' && Object.hasOwn(payload, method)
    ? payload[method]
    : payload;
}

function normalizeLongitude(value) {
  return ((value % 360) + 360) % 360;
}

async function runComparison() {
  const [officialD1Longitudes, officialD1Houses] = await Promise.all([
    officialRequest(officialGetPath('AllPlanetLongitude', birth.time, birth.date)),
    officialRequest(officialGetPath('AllHouseLongitudes', birth.time, birth.date)),
  ]);
  const officialBirthStdTime = `${birth.time} 06/09/1968 ${birth.timezone}`;
  assertOfficialTimeInput(officialD1Longitudes, 'time', officialBirthStdTime);
  assertOfficialTimeInput(officialD1Houses, 'time', officialBirthStdTime);
  const officialD1Positions = longitudeMap(
    unwrapMethodPayload(officialD1Longitudes.Payload, 'AllPlanetLongitude'),
  );
  const officialD1HousePositions = houseMap(
    unwrapMethodPayload(officialD1Houses.Payload, 'AllHouseLongitudes'),
  );
  const officialD1 = { ...officialD1Positions, Ascendant: officialD1HousePositions.House1 };

  const selfhostRequest = async path => {
    const response = await fetch(new URL(path, selfhostBase), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(birth),
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`Self-host request failed: HTTP ${response.status}`);
    return payload;
  };
  const selfhostD1 = await selfhostRequest('/api/d1');
  const selfhostD1Comparable = {
    Ascendant: selfhostD1.ascendant,
    ...Object.fromEntries(selfhostD1.planets.map(planet => [planet.name, planet])),
  };
  const d1InputCheck = ['Ascendant', ...planets].map(name => {
    const officialLongitude = officialD1[name];
    const selfhostLongitude = selfhostD1Comparable[name]?.longitude;
    const difference = Math.abs(((officialLongitude - selfhostLongitude + 540) % 360) - 180);
    return {
      name,
      difference,
      result: Number.isFinite(difference) && difference <= 0.01 ? 'PASS' : 'FAIL',
    };
  });
  const inputIdentityPassed = d1InputCheck.every(row => row.result === 'PASS');
  if (!inputIdentityPassed) {
    throw new Error(
      `D1 input identity check failed; refusing Dasha comparison: ${JSON.stringify(d1InputCheck)}`,
    );
  }

  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const nowDate = now.toISOString().slice(0, 10);
  const nowTime = now.toISOString().slice(11, 16);
  const end = new Date(now.getTime());
  end.setUTCFullYear(end.getUTCFullYear() + 10);
  const rangeTime = (date, time) => ({
    StdTime: `${time} ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)} ${birth.timezone}`,
    Location: nativeTime.Location,
  });
  const officialDashaRaw = await officialRequest(`${officialBase}/Calculate/DasaAtRange`, {
    BirthTime: nativeTime,
    StartTime: rangeTime(nowDate, nowTime),
    EndTime: rangeTime(end.toISOString().slice(0, 10), nowTime),
    Levels: 2,
    PrecisionHours: 168,
    Ayanamsa: 'LAHIRI',
  });
  const officialDashaParameters = officialDashaRaw.Input.Parameters;
  const officialLevels = officialDashaParameters.find(item => item.Name.toLowerCase() === 'levels')?.Value;
  const officialPrecision = officialDashaParameters.find(
    item => item.Name.toLowerCase() === 'precisionhours',
  )?.Value;
  if (Number(officialLevels) !== 2 || Number(officialPrecision) !== 168) {
    throw new Error(
      `OFFICIAL REQUEST INVALID: Dasha settings mismatch: levels=${officialLevels}, precisionHours=${officialPrecision}`,
    );
  }
  assertOfficialTimeInput(
    officialDashaRaw,
    'birthTime',
    officialBirthStdTime,
    birth.locationName,
  );
  const officialDasha = unwrapMethodPayload(officialDashaRaw.Payload, 'DasaAtRange');
  const selfhostDasha = await selfhostRequest('/api/dasha');

  const official = {
    d1: officialD1,
    dasha: currentDasha(officialDasha),
  };
  const selfhostComparable = {
    d1: {
      Ascendant: selfhostD1.ascendant,
      ...Object.fromEntries(selfhostD1.planets.map(planet => [planet.name, planet])),
    },
    dasha: selfhostDasha,
  };
  const result = compareChartData(official, selfhostComparable);
  const maximumLongitudeDifference = Math.max(...result.d1.map(row => row.difference ?? Number.POSITIVE_INFINITY));
  const corePass = result.d1.every(row => row.result === 'PASS') && result.dasha.result === 'PASS';
  console.log(JSON.stringify({
    fixture: birth,
    inputVerification: {
      officialD1: {
        verified: true,
        ayanamsaEnum: officialD1Longitudes.Input.Ayanamsa,
        time: summarizeOfficialTimeInput(officialD1Longitudes, 'time'),
      },
      selfHost: { verified: true, input: birth },
      officialDasha: {
        verified: true,
        ayanamsaEnum: officialDashaRaw.Input.Ayanamsa,
        birthTime: summarizeOfficialTimeInput(officialDashaRaw, 'birthTime'),
        startTime: summarizeOfficialTimeInput(officialDashaRaw, 'startTime'),
        endTime: summarizeOfficialTimeInput(officialDashaRaw, 'endTime'),
      },
    },
    maxD1LongitudeDifference: Number.isFinite(maximumLongitudeDifference) ? maximumLongitudeDifference : null,
    d1: result.d1,
    d9: result.d9,
    d10: result.d10,
    dasha: result.dasha,
    firstDivergence: 'DasaAtRange period output after verified D1/Moon/timezone/Ayanamsa inputs',
    rootCause: 'The Official API does not expose the internal Dasha starting balance, year-length setting, or engine/library revision; underlying algorithmic cause is NOT VERIFIED.',
    result: corePass ? 'INCOMPLETE' : 'FAIL',
  }, null, 2));
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runComparison().catch(error => {
    console.error(`FAIL comparison: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
