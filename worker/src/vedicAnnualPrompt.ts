import { VEDIC_ANNUAL_CHAPTERS,VEDIC_ANNUAL_PROMPT_VERSION,type VedicAnnualFacts,type VedicAnnualLanguage } from '../../app/src/lib/vedicAnnual';
import { VedicAnnualError } from './vedicAnnualCalculation';
import { completeAnnualTransits } from './vedicAnnualTransits';

// Generation remains gated at the route. Transit facts must be assembled from saved samples.
export const VEDIC_ANNUAL_SECTION_PURPOSES = [
  'Synthesize the annual theme using the supplied Dasha and transit evidence.',
  'Explain every supported Dasha and Antardasha transition; distinguish adjacent phases.',
  'Suggest practical work, learning and collaboration choices.',
  'Discuss budgeting, allocation and risk awareness. Never promise returns or financial luck.',
  'Discuss communication and boundaries without predicting marriage, divorce or a person appearing.',
  'Connect verified chart factors to home responsibilities and everyday arrangements.',
  'Suggest ordinary rest and stress-management habits. No medical diagnosis or death prediction.',
  'Discuss only supplied event intervals. Never invent monthly luck, a transition date or probability.',
  'Offer exactly three distinct, practical actions grounded in the supplied evidence.',
  'Close warmly in a one-to-one consultation voice without promising outcomes.',
] as const;
export const VEDIC_ANNUAL_OUTPUT_SCHEMA = {
  type:'object',additionalProperties:false,required:['sections'],properties:{sections:{type:'array',minItems:10,maxItems:10,items:{
    type:'object',additionalProperties:false,required:['key','body','evidenceIds','actions'],properties:{
      key:{type:'integer',minimum:0,maximum:9},body:{type:'string'},
      evidenceIds:{type:'array',minItems:1,items:{type:'string'}},actions:{type:'array',items:{type:'string'}},
    },
  }}},
} as const;

export interface VedicAnnualSection {
  key:number; body:string; evidenceIds:string[]; actions:string[];
}
export interface VedicAnnualOutput {sections:VedicAnnualSection[]}

// Strict JSON output is a transport contract, not proof that cited calculation facts exist.
// Validate those references again before any report can be saved or shown as completed.
export function validateVedicAnnualOutput(value:unknown,facts:VedicAnnualFacts):VedicAnnualOutput {
  const fail=():never=>{throw new VedicAnnualError('REPORT_INVALID',502);};
  if(!value||typeof value!=='object'||Array.isArray(value))return fail();
  const root=value as Record<string,unknown>;
  if(Object.keys(root).length!==1||!Array.isArray(root.sections)||root.sections.length!==10)return fail();
  const allowed=new Set([...facts.dasha.map(row=>row.id),...(facts.transits?.events.map(row=>row.id)??[])]);
  const bodies=new Set<string>();
  const sections=root.sections.map((value,index)=>{
    if(!value||typeof value!=='object'||Array.isArray(value))return fail();
    const row=value as Record<string,unknown>;
    if(Object.keys(row).sort().join(',')!=='actions,body,evidenceIds,key'||row.key!==index
      ||typeof row.body!=='string'||row.body.trim().length<80||row.body.length>8000
      ||!Array.isArray(row.evidenceIds)||!row.evidenceIds.length||row.evidenceIds.length>allowed.size
      ||row.evidenceIds.some(id=>typeof id!=='string'||!allowed.has(id))
      ||new Set(row.evidenceIds).size!==row.evidenceIds.length
      ||!Array.isArray(row.actions)||row.actions.length!==(index===8?3:0)
      ||row.actions.some(action=>typeof action!=='string'||action.trim().length<8||action.length>600))return fail();
    const body=row.body.trim();
    if(bodies.has(body)||new Set(row.actions.map(action=>(action as string).trim())).size!==row.actions.length)return fail();
    bodies.add(body);
    return {key:index,body,evidenceIds:row.evidenceIds as string[],actions:(row.actions as string[]).map(action=>action.trim())};
  });
  // The timeline chapters must account for every supplied period, not only January's lord.
  for(const index of [1,7])if(facts.dasha.some(row=>!sections[index].evidenceIds.includes(row.id)))return fail();
  if(facts.transits?.events.some(row=>!sections[7].evidenceIds.includes(row.id)))return fail();
  return {sections};
}
export function buildVedicAnnualPrompt(facts:VedicAnnualFacts,language:VedicAnnualLanguage) {
  if(!facts.transits||!facts.dashaCoverage.mahadasha||!facts.dashaCoverage.antardasha)throw new VedicAnnualError('RELEASE_PENDING',503);
  const verified=completeAnnualTransits(facts,facts.transits.samples);
  if(JSON.stringify(verified)!==JSON.stringify(facts.transits))throw new VedicAnnualError('TRANSIT_INVALID');
  return {
    version:VEDIC_ANNUAL_PROMPT_VERSION,
    system:`You interpret verified Vedic calculation facts; never calculate planetary positions, Dasha dates, houses, age or events. Write ${language==='en'?'natural English':'自然繁體中文'}.
Distinguish calculation evidence from symbolic interpretation. Do not invent biography, diagnoses, investment returns, certainty or dates. Use Dasha ids and transit event ids as evidenceIds; dates are rendered by the application. All supplied Dasha periods must be referenced in chapters 1 and 7; chapter 7 must also reference every observed transit event.
Transits are sampled observations, not an exhaustive event calendar. Never convert a bracket to an exact date, claim no events occurred between samples, or treat same-sign samples as proof of continuous residence. signFromMoon and signFromAscendant are sign distances, not computed D1 houses. Node method and D1 house-system names are unverified provider defaults; do not invent their names. No Varshaphala. Each chapter has its own purpose and opening. Do not repeat generic encouragement. The actions chapter has exactly three actions; other chapters have an empty actions array. Return the strict JSON schema.`,
    evidence:facts,
    chapters:VEDIC_ANNUAL_CHAPTERS.map((title,key)=>({key,title:title[language==='en'?1:0],purpose:VEDIC_ANNUAL_SECTION_PURPOSES[key],
      requiredEvidenceIds:key===1?facts.dasha.map(p=>p.id):key===7?[...facts.dasha.map(p=>p.id),...verified.events.map(p=>p.id)]:[],
      actionsCount:key===8?3:0})),
  };
}
