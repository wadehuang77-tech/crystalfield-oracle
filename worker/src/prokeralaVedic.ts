import { ProkeralaError, type ProkeralaChart, type ProkeralaDivision } from './prokerala';
import { deriveHouseContext, SIGN_LORDS, type VedicChartData } from './vedicAstrology';

function division(data: ProkeralaDivision): VedicChartData['divisionalCharts']['d9'] {
  const ascendant = data.planets.find(p => p.name === 'Ascendant');
  if (!ascendant) throw new ProkeralaError('PROKERALA_INVALID_RESPONSE', 'normalization');
  return {
    lagna: ascendant.sign,
    planets: Object.fromEntries(data.planets.filter(p => p.name !== 'Ascendant').map(p => [p.name, p.sign])),
    houses: Object.fromEntries(data.houses.map(h => [`House${h.number}`, h.sign])),
  };
}

export function normalizeProkeralaVedic(
  source: ProkeralaChart,
  locationName: string,
): VedicChartData {
  if (!source.d1) throw new ProkeralaError('PROKERALA_D1_HOUSES_REQUIRED', 'normalization');
  const housePlacements: Record<string, number> = {};
  for (const p of source.planets) {
    if (!p.house) throw new ProkeralaError('PROKERALA_D1_HOUSES_REQUIRED', 'normalization');
    housePlacements[p.name] = p.house;
  }
  const houseLords = Object.fromEntries(source.d1.houses.map(h => [String(h.number), SIGN_LORDS[h.sign]]));
  const datetime = source.birth.datetime;
  const offset = datetime.slice(-6);
  const planets = Object.fromEntries(source.planets.map(p => [p.name, p.sign]));
  const { karmaAspects } = deriveHouseContext(source.ascendant.sign, planets, housePlacements);
  return {
    provider: 'prokerala', ayanamsa: 'lahiri',
    birth: {
      date: datetime.slice(0, 10), time: datetime.slice(11, 16), datetime,
      location: locationName, latitude: source.birth.latitude, longitude: source.birth.longitude,
      timezone: source.birth.timezone, utcOffset: offset,
    },
    lagna: source.ascendant.sign, lagnaLongitude: source.ascendant.longitude,
    sunSign: planets.Sun, moonSign: planets.Moon,
    moonNakshatra: source.moonNakshatra.name,
    nakshatra: { ...source.moonNakshatra },
    planets, planetLongitudes: Object.fromEntries(source.planets.map(p => [p.name, p.longitude])),
    // The provider supplies signs/placements, not cusp angles; do not invent angles.
    houses: Object.fromEntries(source.d1.houses.map(h => [`House${h.number}`, {
      sign: h.sign, lord: SIGN_LORDS[h.sign],
    }])),
    divisionalCharts: { d9: division(source.d9), d10: division(source.d10) },
    mahaDasha: source.dasha.mahadasha, antarDasha: source.dasha.antardasha,
    dashaTimeline: source.dasha.periods,
    housePlacements, houseLords, karmaAspects,
    timezone: source.birth.timezone, timezoneOffset: offset,
    calculationData: source,
  };
}
