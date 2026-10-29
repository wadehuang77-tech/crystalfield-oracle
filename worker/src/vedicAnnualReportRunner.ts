import type { WorkflowStep } from 'cloudflare:workers';
import type { Env } from './utils';
import { AnnualTransitStore } from './vedicAnnualTransitStore';
import { annualGenerationEnabled,authorizedAnnualFacts,annualAiOnce,failAnnualJob,type AnnualJobInput } from './vedicAnnualReport';
import { VedicAnnualError } from './vedicAnnualCalculation';

export async function runAnnualJob(env:Env,input:AnnualJobInput,step:Pick<WorkflowStep,'do'|'sleep'>){
  const db={retries:{limit:2,delay:'1 second' as const},timeout:'30 seconds' as const};
  try{
    if(!['en','zh-Hant'].includes(input.language))throw new VedicAnnualError('INVALID_INPUT');
    const match=await step.do('validate-job',db,()=>env.DB.prepare(`SELECT j.id FROM vedic_annual_jobs j JOIN vedic_annual_reports r ON r.id=j.report_id JOIN vedic_annual_cases c ON c.id=r.case_id
      WHERE j.id=? AND r.id=? AND c.id=? AND j.user_id=? AND c.user_id=j.user_id AND r.language=? AND r.job_id=j.id AND j.state='active'`).bind(input.jobId,input.reportId,input.caseId,input.userId,input.language).first<{id:string}>());
    if(!match)throw new VedicAnnualError('NOT_FOUND');
    const store=new AnnualTransitStore(env.DB);
    for(let i=0;i<66;i++){
      const state=await step.do(`transit-${i}`,{retries:{limit:0,delay:'1 second'},timeout:'100 seconds'},async()=>{
        if(!annualGenerationEnabled(env)||env.VEDIC_ANNUAL_TRANSITS_ENABLED!=='true')throw new VedicAnnualError('RELEASE_PENDING');
        const facts=await authorizedAnnualFacts(env,input);return store.step(env,input.caseId,facts);
      });
      if(state.status==='completed')break;
      if(state.status==='failed')throw new VedicAnnualError(state.errorCode??'TRANSIT_FAILED');
      if(i===65)throw new VedicAnnualError('TRANSIT_BUDGET');
      await step.sleep(`spacing-${i}`,'2 seconds');
    }
    const facts=await step.do('verified-facts',db,async()=>{
      const facts=await store.facts(input.caseId,await authorizedAnnualFacts(env,input));
      await env.DB.prepare("UPDATE vedic_annual_reports SET status='generating',facts_json=?,updated_at=datetime('now') WHERE id=? AND job_id=?").bind(JSON.stringify(facts),input.reportId,input.jobId).run();return facts;
    });
    // Workflow checkpoints the response. DB save retries never call AI again.
    const result=await step.do('interpretation',{retries:{limit:0,delay:'1 second'},timeout:'130 seconds'},async()=>{
      await authorizedAnnualFacts(env,input);return annualAiOnce(env,input,facts);
    });
    await step.do('saving',db,async()=>{await env.DB.prepare("UPDATE vedic_annual_reports SET status='saving' WHERE id=? AND job_id=?").bind(input.reportId,input.jobId).run();});
    await step.do('save-report',db,async()=>{
      await authorizedAnnualFacts(env,input);
      await env.DB.batch([
        env.DB.prepare("UPDATE vedic_annual_reports SET status='completed',content_json=?,error_code=NULL,updated_at=datetime('now') WHERE id=? AND job_id=?").bind(JSON.stringify(result.report),input.reportId,input.jobId),
        env.DB.prepare("UPDATE vedic_annual_jobs SET state='completed',ai_state='completed',input_tokens=?,output_tokens=?,updated_at=datetime('now') WHERE id=?").bind(result.inputTokens,result.outputTokens,input.jobId),
      ]);
    });
  }catch(error){
    // Workflow step exceptions are rehydrated as Error, not the original subclass.
    const allowed=new Set(['AI_FAILED','AI_INCOMPLETE','AI_OUTCOME_UNKNOWN','AI_BUDGET','REPORT_INVALID','PAYMENT_REQUIRED','DASHA_COVERAGE','RELEASE_PENDING','TRANSIT_BUDGET','TRANSIT_FAILED','PROKERALA_TRANSPORT_OR_JSON_ERROR','PROKERALA_RATE_LIMITED','PROKERALA_TIMEOUT']);
    const message=error instanceof Error?error.message:'';
    const code=error instanceof VedicAnnualError?error.code:allowed.has(message)?message:'GENERATION_FAILED';
    await step.do('record-failure',db,()=>failAnnualJob(env,input,code));
  }
}
