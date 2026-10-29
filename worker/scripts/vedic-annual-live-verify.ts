import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { completeAnnualTransits } from '../src/vedicAnnualTransits';
import { annualReportFacts } from '../src/vedicAnnualCalculation';

const id=process.argv[2];if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id??''))throw new Error('CASE_ID_REQUIRED');
const result=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--remote','--command',
  `SELECT t.*,c.calculation_json FROM vedic_annual_transits t JOIN vedic_annual_cases c ON c.id=t.case_id JOIN profiles p ON p.id=c.user_id WHERE t.case_id='${id}' AND lower(p.email)='wadehuang77@gmail.com'`,'--json'],{encoding:'utf8',maxBuffer:4*1024*1024}));
const row=result[0].results[0];assert.ok(row,'ADMIN_CASE_NOT_FOUND');
const samples=JSON.parse(row.samples_json),facts=JSON.parse(row.calculation_json);
if(row.status==='completed'){
  const verified=completeAnnualTransits(facts,samples);assert.deepEqual(JSON.parse(row.data_json),verified);assert.ok(row.calls_used<=64);
  console.log(JSON.stringify({status:row.status,callsUsed:row.calls_used,samples:samples.length,start:verified.start,endExclusive:verified.endExclusive,timezone:verified.timezone,events:verified.events.length,maxGapDays:verified.maxGapDays,dashaCoverage:annualReportFacts(facts).dashaCoverage,sourcePrecisionDisclosed:annualReportFacts(facts).limitations.includes('DASHA_SECOND_PRECISION'),verified:true}));
}else console.log(JSON.stringify({status:row.status,callsUsed:row.calls_used,samples:samples.length,error:row.error_code,retryAt:row.retry_at,verified:false}));
