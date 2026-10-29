import tzLookup from 'tz-lookup';
import { timezoneOffsetAtLocal, type VedicChartData } from './vedicAstrology';
import { VEDIC_ANNUAL_VERSION, type AnnualDashaFact, type VedicAnnualFacts } from '../../app/src/lib/vedicAnnual';

export class VedicAnnualError extends Error {
  constructor(readonly code:string,readonly status=422){super(code);}
}
const lords=new Set(['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']);
const signs=new Set(['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']);
function instant(value:string):number {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))throw new VedicAnnualError('DASHA_INVALID');
  const date=value.slice(0,10);
  const result=Date.parse(value);
  if(!Number.isFinite(result)||new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date)throw new VedicAnnualError('DASHA_INVALID');return result;
}
export function calendarYear(year:number,timezone:string) {
  if(!Number.isInteger(year)||year<1900||year>2100)throw new VedicAnnualError('INVALID_INPUT',400);
  try {
    const startDate=`${year}-01-01`, endDate=`${year}-12-31`, next=`${year+1}-01-01`;
    return {year,startDate,endDate,timezone,
      start:`${startDate}T00:00:00${timezoneOffsetAtLocal(startDate,'00:00',timezone)}`,
      endExclusive:`${next}T00:00:00${timezoneOffsetAtLocal(next,'00:00',timezone)}`};
  }catch{throw new VedicAnnualError('BIRTH_INCOMPLETE');}
}
function coverage(rows:AnnualDashaFact[],start:number,end:number) {
  let cursor=start;
  for(const row of rows){const a=instant(row.start),b=instant(row.endExclusive);if(a!==cursor)return false;cursor=b;}
  return cursor===end;
}
/** Provider timestamps have second precision. Preserve every timestamp and disclose
 * adjacent gaps <= 1 second; this is a readiness tolerance, not a new ephemeris. */
export function annualReportFacts(facts:VedicAnnualFacts):VedicAnnualFacts {
  let tolerance=false;
  const covered=(kind:AnnualDashaFact['kind'])=>{
    let cursor=instant(facts.start);
    for(const row of facts.dasha.filter(r=>r.kind===kind).sort((a,b)=>instant(a.start)-instant(b.start))){
      const gap=instant(row.start)-cursor;if(gap<0||gap>1000)return false;
      if(gap)tolerance=true;cursor=instant(row.endExclusive);
    }
    return cursor===instant(facts.endExclusive);
  };
  const dashaCoverage={mahadasha:covered('mahadasha'),antardasha:covered('antardasha')};
  return {...facts,dashaCoverage,limitations:[...facts.limitations.filter(c=>c!=='DASHA_COVERAGE'&&c!=='DASHA_SECOND_PRECISION'),
    ...(!dashaCoverage.mahadasha||!dashaCoverage.antardasha?['DASHA_COVERAGE']:[]),...(tolerance?['DASHA_SECOND_PRECISION']:[])]};
}
export function prepareVedicAnnual(chart:VedicChartData,year:number):VedicAnnualFacts {
  const source=chart?.calculationData;
  if(chart?.provider!=='prokerala'||source?.provider!=='prokerala'||source.ayanamsa!=='lahiri'||typeof chart.ayanamsa!=='string'||chart.ayanamsa.toLowerCase()!=='lahiri')throw new VedicAnnualError('PROVIDER_UNSUPPORTED');
  const b=chart.birth;
  try {
    if(!b||!b.date||!b.time||!b.location||!b.timezone||!b.utcOffset||!Number.isFinite(b.latitude)||!Number.isFinite(b.longitude)
      ||Math.abs(b.latitude)>90||Math.abs(b.longitude)>180||tzLookup(b.latitude,b.longitude)!==b.timezone
      ||timezoneOffsetAtLocal(b.date,b.time,b.timezone)!==b.utcOffset
      ||source.birth.datetime!==`${b.date}T${b.time}:00${b.utcOffset}`
      ||source.birth.latitude!==b.latitude||source.birth.longitude!==b.longitude||source.birth.timezone!==b.timezone
      ||!signs.has(chart.moonSign)||!signs.has(chart.lagna)||!source.d1||source.d1.houses.length!==12
      ||Object.keys(chart.housePlacements).length<9||Object.values(chart.housePlacements).some(h=>!Number.isInteger(h)||h<1||h>12))throw Error();
  }catch{throw new VedicAnnualError('BIRTH_INCOMPLETE');}
  if(year<Number(b.date.slice(0,4)))throw new VedicAnnualError('INVALID_INPUT',400);
  const range=calendarYear(year,b.timezone), start=instant(range.start),end=instant(range.endExclusive);
  const rows:AnnualDashaFact[]=[];
  const periods=source.dasha?.periods;
  if(source.dasha?.yearLength!==365.25||!Array.isArray(periods)||!periods.length||periods.length>100)throw new VedicAnnualError('DASHA_INVALID');
  // Use all provider periods; never extrapolate the current Dasha across an entire year.
  let lastEnd=-Infinity;
  for(const [i,p] of [...periods].sort((a,b)=>instant(a.start)-instant(b.start)).entries()) {
    const a=instant(p.start),z=instant(p.end);
    if(!lords.has(p.lord)||a>=z||a<lastEnd||!Array.isArray(p.subPeriods)||p.subPeriods.length>100)throw new VedicAnnualError('DASHA_INVALID');
    lastEnd=z;
    const push=(kind:AnnualDashaFact['kind'],lord:string,from:string,to:string,parent:string|null,id:string)=>{
      const lo=instant(from),hi=instant(to);
      if(hi<=start||lo>=end)return;
      rows.push({id,kind,lord,parent,sourceStart:from,sourceEndExclusive:to,
        start:new Date(Math.max(lo,start)).toISOString(),endExclusive:new Date(Math.min(hi,end)).toISOString(),
        startsWithinYear:lo>=start&&lo<end,endsWithinYear:hi>start&&hi<end});
    };
    push('mahadasha',p.lord,p.start,p.end,null,`maha-${i}`);
    let subEnd=-Infinity;
    for(const [j,sub] of [...p.subPeriods].sort((x,y)=>instant(x.start)-instant(y.start)).entries()) {
      const lo=instant(sub.start),hi=instant(sub.end);
      if(!lords.has(sub.lord)||lo>=hi||lo<a||hi>z||lo<subEnd)throw new VedicAnnualError('DASHA_INVALID');
      subEnd=hi;push('antardasha',sub.lord,sub.start,sub.end,p.lord,`antar-${i}-${j}`);
    }
  }
  rows.sort((a,b)=>instant(a.start)-instant(b.start)||a.kind.localeCompare(b.kind));
  const covered={mahadasha:coverage(rows.filter(p=>p.kind==='mahadasha'),start,end),antardasha:coverage(rows.filter(p=>p.kind==='antardasha'),start,end)};
  return {version:VEDIC_ANNUAL_VERSION,...range,birth:{date:b.date,time:b.time,location:b.location,latitude:b.latitude,longitude:b.longitude,timezone:b.timezone,utcOffset:b.utcOffset},
    settings:{provider:'prokerala',zodiac:'sidereal',ayanamsa:'lahiri',houses:'provider-d1-unverified',nodes:'provider-default-unverified',dashaYearDays:365.25},
    natal:{moonSign:chart.moonSign,ascendantSign:chart.lagna,housePlacements:{...chart.housePlacements}},
    dasha:rows,dashaCoverage:covered,transits:null,
    limitations:[...(!covered.mahadasha||!covered.antardasha?['DASHA_COVERAGE']:[]),'TRANSITS_UNAVAILABLE','SETTINGS_UNVERIFIED']};
}
export function stableJson(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(stableJson).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().filter(k=>(value as Record<string,unknown>)[k]!==undefined).map(k=>`${JSON.stringify(k)}:${stableJson((value as Record<string,unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export async function annualFingerprint(owner:string,chart:VedicChartData,facts:VedicAnnualFacts) {
  const encoded=new TextEncoder().encode(stableJson({owner,chart,facts}));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoded))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
