import { execFileSync } from 'node:child_process';
import { writeFileSync,unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareVedicAnnual,annualFingerprint } from '../src/vedicAnnualCalculation';
import { VEDIC_ANNUAL_PRODUCT,VEDIC_ANNUAL_PROMPT_VERSION,VEDIC_ANNUAL_VERSION } from '../../app/src/lib/vedicAnnual';
import type { VedicChartData } from '../src/vedicAstrology';

// Explicitly authorized production release only. Never print birth snapshots or secrets.
const [date,yearText,mode]=process.argv.slice(2),year=Number(yearText);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date??'')||!Number.isInteger(year)||year<1900||year>2100||mode!=='prepare-and-collect')throw new Error('Explicit birth date, year and prepare-and-collect are required');
const quote=(value:unknown)=>`'${String(value).replaceAll("'","''")}'`;
function wrangler(args:string[]){return execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{encoding:'utf8',maxBuffer:8*1024*1024});}
function query(sql:string){
  if(sql.trimStart().startsWith('SELECT'))return JSON.parse(wrangler(['d1','execute','DB','--remote','--command',sql,'--json']));
  const file=join(tmpdir(),`vedic-annual-release-${crypto.randomUUID()}.sql`);
  try{writeFileSync(file,sql);wrangler(['d1','execute','DB','--remote','--file',file,'--json']);return [];}
  finally{unlinkSync(file);}
}
async function main(){
const rows=query(`SELECT c.id,c.user_id,c.chart_json FROM vedic_charts c JOIN profiles p ON p.id=c.user_id
 WHERE lower(p.email)='wadehuang77@gmail.com' AND json_extract(c.chart_json,'$.birth.date')=${quote(date)}
 AND json_extract(c.chart_json,'$.provider')='prokerala' ORDER BY c.created_at DESC LIMIT 1;`)[0].results;
if(rows.length!==1)throw new Error('ADMIN_CHART_NOT_FOUND');
const row=rows[0],chart=JSON.parse(row.chart_json) as VedicChartData,facts=prepareVedicAnnual(chart,year);
const fingerprint=await annualFingerprint(row.user_id,chart,facts),id=crypto.randomUUID();
query(`INSERT OR IGNORE INTO vedic_annual_cases(id,user_id,chart_id,product_code,fingerprint,year,timezone,period_start,period_end_exclusive,birth_snapshot_json,calculation_json,settings_json,calculation_version,prompt_version)
VALUES (${[id,row.user_id,row.id,VEDIC_ANNUAL_PRODUCT,fingerprint,year,facts.timezone,facts.start,facts.endExclusive,row.chart_json,JSON.stringify(facts),JSON.stringify(facts.settings),VEDIC_ANNUAL_VERSION,VEDIC_ANNUAL_PROMPT_VERSION].map(quote).join(',')});`);
const saved=query(`SELECT id FROM vedic_annual_cases WHERE user_id=${quote(row.user_id)} AND fingerprint=${quote(fingerprint)};`)[0].results[0];
console.log(JSON.stringify({caseId:saved.id,year,dashaCoverage:facts.dashaCoverage}));
console.log(wrangler(['workflows','trigger','vedic-annual-collection',JSON.stringify({caseId:saved.id})]));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'RELEASE_FAILED');process.exitCode=1;});
