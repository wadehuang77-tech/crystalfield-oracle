import { execFileSync } from 'node:child_process';
import { writeFileSync,unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { annualReportFacts } from '../src/vedicAnnualCalculation';
import { validateVedicAnnualOutput } from '../src/vedicAnnualPrompt';
import { VEDIC_ANNUAL_PROMPT_VERSION } from '../../app/src/lib/vedicAnnual';
// Explicit management-only release verification. No session impersonation, payment or grants.
const [caseId,language,mode]=process.argv.slice(2);
if(!/^[a-zA-Z0-9_-]{1,80}$/.test(caseId??'')||!['zh-Hant','en'].includes(language)||!['verify','generate-admin'].includes(mode))throw Error('CASE_LANGUAGE_MODE_REQUIRED');
const quote=(v:string)=>`'${v.replaceAll("'","''")}'`;
function wrangler(args:string[]){return execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{encoding:'utf8',maxBuffer:4*1024*1024});}
function read(sql:string){return JSON.parse(wrangler(['d1','execute','DB','--remote','--command',sql,'--json']))[0].results;}
function write(sql:string){const file=join(tmpdir(),`annual-admin-${crypto.randomUUID()}.sql`);try{writeFileSync(file,sql);wrangler(['d1','execute','DB','--remote','--file',file,'--json']);}finally{unlinkSync(file);}}
async function main(){
 const owner=read(`SELECT c.id,c.user_id,c.calculation_json FROM vedic_annual_cases c JOIN profiles p ON p.id=c.user_id WHERE c.id=${quote(caseId)} AND lower(p.email)='wadehuang77@gmail.com'`)[0];
 if(!owner)throw Error('ADMIN_CASE_REQUIRED');
 const report=read(`SELECT * FROM vedic_annual_reports WHERE case_id=${quote(caseId)} AND language=${quote(language)}`)[0];
 if(report?.status==='completed'){
  const facts=JSON.parse(report.facts_json),body=validateVedicAnnualOutput(JSON.parse(report.content_json),facts);
  console.log(JSON.stringify({status:'completed',reportId:report.id,language,chapters:body.sections.length,characters:body.sections.map(s=>s.body.length),saved:true,verified:true}));return;
 }
 if(mode==='verify'){console.log(JSON.stringify({status:report?.status??'not-started',error:report?.error_code??null,jobId:report?.job_id??null}));return;}
 const config=await(await fetch('https://api.crystalfield101.com/api/vedic-astrology/annual/config')).json() as {generationEnabled:boolean};if(!config.generationEnabled)throw Error('GENERATION_DISABLED');
 const facts=annualReportFacts(JSON.parse(owner.calculation_json));if(!facts.dashaCoverage.mahadasha||!facts.dashaCoverage.antardasha)throw Error('DASHA_COVERAGE');
 const reportId=report?.id??crypto.randomUUID();let job=read(`SELECT id FROM vedic_annual_jobs WHERE report_id=${quote(reportId)} AND state='active'`)[0];
 if(!job){const count=read(`SELECT COUNT(*) n FROM vedic_annual_jobs WHERE report_id=${quote(reportId)} AND reserved_twd>0`)[0].n;if(count>=3)throw Error('AI_BUDGET');
  const id=crypto.randomUUID();write(`INSERT OR IGNORE INTO vedic_annual_reports(id,case_id,language,status,prompt_version) VALUES(${quote(reportId)},${quote(caseId)},${quote(language)},'pending',${quote(VEDIC_ANNUAL_PROMPT_VERSION)});
   INSERT INTO vedic_annual_jobs(id,report_id,user_id,state) VALUES(${quote(id)},${quote(reportId)},${quote(owner.user_id)},'active');
   UPDATE vedic_annual_reports SET status='calculating',job_id=${quote(id)},error_code=NULL,updated_at=datetime('now') WHERE id=${quote(reportId)} AND status!='completed';`);job={id};
 }
 console.log(wrangler(['workflows','trigger','vedic-annual-report',JSON.stringify({caseId,reportId,userId:owner.user_id,language,jobId:job.id}),'--id',job.id]));
 console.log(JSON.stringify({reportId,jobId:job.id,language}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'RELEASE_FAILED');process.exitCode=1;});
