import { WorkflowEntrypoint,type WorkflowEvent,type WorkflowStep } from 'cloudflare:workers';
import type { Env } from './utils';
import type { VedicAnnualFacts } from '../../app/src/lib/vedicAnnual';
import { AnnualTransitStore } from './vedicAnnualTransitStore';

/** Operator-only collection: invoked through authenticated Cloudflare Workflows management.
 * No public endpoint, payment grant or session token is created by this workflow. */
export class VedicAnnualCollectionWorkflow extends WorkflowEntrypoint<Env,{caseId:string}> {
  async run(event:WorkflowEvent<{caseId:string}>,step:WorkflowStep) {
    const id=event.payload.caseId;
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw new Error('INVALID_CASE');
    const store=new AnnualTransitStore(this.env.DB);
    for(let i=0;i<65;i++) {
      const state=await step.do(`collect-${i}`,{retries:{limit:0,delay:'1 second'},timeout:'90 seconds'},async()=>{
        if(this.env.VEDIC_ANNUAL_TRANSITS_ENABLED!=='true')throw new Error('TRANSITS_DISABLED');
        const row=await this.env.DB.prepare(`SELECT c.calculation_json FROM vedic_annual_cases c JOIN profiles p ON p.id=c.user_id
          WHERE c.id=? AND lower(p.email)='wadehuang77@gmail.com'`).bind(id).first<{calculation_json:string}>();
        if(!row)throw new Error('ADMIN_CASE_REQUIRED');
        const result=await store.step(this.env,id,JSON.parse(row.calculation_json) as VedicAnnualFacts);
        return {status:result.status,callsUsed:result.callsUsed,samples:result.samplesCollected,error:result.errorCode};
      });
      if(state.status==='completed'||state.status==='failed')return state;
      await step.sleep(`spacing-${i}`,'2 seconds');
    }
    throw new Error('COLLECTION_LIMIT');
  }
}
