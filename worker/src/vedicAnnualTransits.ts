import { ANNUAL_TRANSIT_PLANETS,type AnnualTransitData,type AnnualTransitSample,type VedicAnnualFacts } from '../../app/src/lib/vedicAnnual';
import type { ProkeralaPlanet } from './prokerala';
import { VedicAnnualError } from './vedicAnnualCalculation';

export const TRANSIT_CALL_LIMIT=64;
const DAY=86400000;
export const TRANSIT_SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
export function annualSampleDates(facts:VedicAnnualFacts):string[] {
  const start=Date.parse(facts.start),end=Date.parse(facts.endExclusive);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end-start<364*DAY||end-start>367*DAY)throw new VedicAnnualError('TRANSIT_INVALID');
  const dates:number[]=[];
  for(let at=start;at<end-1000;at+=8*DAY)dates.push(at);
  dates.push(end-1000);
  return dates.map(at=>new Date(at).toISOString());
}
export function annualTransitSample(facts:VedicAnnualFacts,at:string,planets:ProkeralaPlanet[]):AnnualTransitSample {
  const moon=TRANSIT_SIGNS.indexOf(facts.natal.moonSign),asc=TRANSIT_SIGNS.indexOf(facts.natal.ascendantSign);
  if(moon<0||asc<0||Date.parse(at)<Date.parse(facts.start)||Date.parse(at)>=Date.parse(facts.endExclusive)||!Number.isFinite(Date.parse(at)))throw new VedicAnnualError('TRANSIT_INVALID');
  const positions=ANNUAL_TRANSIT_PLANETS.map(planet=>{
    const matches=planets.filter(p=>p.name===planet),p=matches[0];
    if(matches.length!==1||!p||typeof p.retrograde!=='boolean'||typeof p.longitude!=='number'||!Number.isFinite(p.longitude)||p.longitude<0||p.longitude>=360)throw new VedicAnnualError('TRANSIT_INVALID');
    const sign=TRANSIT_SIGNS.indexOf(p.sign);
    if(sign<0||Math.floor(p.longitude/30)!==sign)throw new VedicAnnualError('TRANSIT_INVALID');
    return {planet,sign:p.sign,longitude:p.longitude,retrograde:p.retrograde,signFromMoon:(sign-moon+12)%12+1,signFromAscendant:(sign-asc+12)%12+1};
  });
  const rahu=positions[2].longitude,ketu=positions[3].longitude;
  if(Math.abs(((ketu-rahu+360)%360)-180)>0.01)throw new VedicAnnualError('TRANSIT_INVALID');
  return {at:new Date(at).toISOString(),positions};
}
export function validateTransitSamples(facts:VedicAnnualFacts,samples:AnnualTransitSample[]):AnnualTransitSample[] {
  if(samples.length>TRANSIT_CALL_LIMIT)throw new VedicAnnualError('TRANSIT_INVALID');
  const result=samples.map(sample=>annualTransitSample(facts,sample.at,sample.positions.map(p=>({name:p.planet,sign:p.sign,longitude:p.longitude,retrograde:p.retrograde,sign_degree:p.longitude%30}))));
  if(new Set(result.map(s=>s.at)).size!==result.length)throw new VedicAnnualError('TRANSIT_INVALID');
  return result.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
}
function changed(a:AnnualTransitSample,b:AnnualTransitSample) {
  return a.positions.some((p,i)=>p.sign!==b.positions[i].sign||p.retrograde!==b.positions[i].retrograde);
}
export function nextAnnualSample(facts:VedicAnnualFacts,samples:AnnualTransitSample[],callsUsed:number):string|null {
  const sorted=validateTransitSamples(facts,samples),present=new Set(sorted.map(s=>s.at));
  const missing=annualSampleDates(facts).find(at=>!present.has(at));
  if(missing){if(callsUsed>=TRANSIT_CALL_LIMIT)throw new VedicAnnualError('TRANSIT_BUDGET',409);return missing;}
  if(callsUsed>=TRANSIT_CALL_LIMIT)return null;
  // Refine widest observed transition bracket first, preserving both endpoints.
  const brackets=sorted.slice(1).map((b,i)=>({a:sorted[i],b,gap:Date.parse(b.at)-Date.parse(sorted[i].at)}))
    .filter(v=>v.gap>DAY&&changed(v.a,v.b)).sort((a,b)=>b.gap-a.gap);
  return brackets.length?new Date(Math.floor((Date.parse(brackets[0].a.at)+Date.parse(brackets[0].b.at))/2000)*1000).toISOString():null;
}
export function completeAnnualTransits(facts:VedicAnnualFacts,samples:AnnualTransitSample[]):AnnualTransitData {
  const sorted=validateTransitSamples(facts,samples),present=new Set(sorted.map(s=>s.at));
  if(annualSampleDates(facts).some(at=>!present.has(at)))throw new VedicAnnualError('TRANSIT_INCOMPLETE',409);
  const events:AnnualTransitData['events']=[];let maxGap=0;
  for(let i=1;i<sorted.length;i++){
    const a=sorted[i-1],b=sorted[i];maxGap=Math.max(maxGap,Date.parse(b.at)-Date.parse(a.at));
    a.positions.forEach((p,j)=>{
      const q=b.positions[j];
      if(p.sign!==q.sign)events.push({id:`transit-${i}-${p.planet}-sign`,planet:p.planet,kind:'sign',from:p.sign,to:q.sign,after:a.at,by:b.at});
      if(p.retrograde!==q.retrograde)events.push({id:`transit-${i}-${p.planet}-motion`,planet:p.planet,kind:'motion',from:p.retrograde?'retrograde':'direct',to:q.retrograde?'retrograde':'direct',after:a.at,by:b.at});
    });
  }
  return {version:'prokerala-sampled-v1',provider:'prokerala',ayanamsa:'lahiri',nodes:'provider-default-unverified',start:facts.start,endExclusive:facts.endExclusive,timezone:facts.timezone,samples:sorted,events,maxGapDays:maxGap/DAY,precision:'sampled-intervals'};
}
