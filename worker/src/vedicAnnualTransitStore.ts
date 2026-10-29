import type { Env } from './utils';
import { fetchProkeralaAnnualPositions,ProkeralaError } from './prokerala';
import type { AnnualTransitSample,AnnualTransitState,VedicAnnualFacts } from '../../app/src/lib/vedicAnnual';
import { annualSampleDates,annualTransitSample,completeAnnualTransits,nextAnnualSample,TRANSIT_CALL_LIMIT } from './vedicAnnualTransits';
import { VedicAnnualError } from './vedicAnnualCalculation';

interface Row {case_id:string;status:AnnualTransitState['status'];calls_used:number;samples_json:string;data_json:string|null;lock_token:string|null;lease_until:string|null;retry_at:string|null;error_code:string|null}
export class AnnualTransitStore {
  constructor(private db:D1Database){}
  async read(id:string):Promise<Row|null>{return this.db.prepare('SELECT * FROM vedic_annual_transits WHERE case_id=?').bind(id).first<Row>();}
  async facts(id:string,original:VedicAnnualFacts):Promise<VedicAnnualFacts>{
    const row=await this.read(id);
    if(row?.status!=='completed'||!row.data_json)throw new VedicAnnualError('TRANSIT_INCOMPLETE',409);
    const transits=completeAnnualTransits(original,JSON.parse(row.samples_json));
    return {...original,transits,limitations:[...original.limitations.filter(code=>code!=='TRANSITS_UNAVAILABLE'),'TRANSITS_SAMPLED']};
  }
  async state(id:string,facts:VedicAnnualFacts):Promise<AnnualTransitState>{
    const row=await this.read(id),samples=JSON.parse(row?.samples_json??'[]') as AnnualTransitSample[],baseline=annualSampleDates(facts),dates=new Set(samples.map(s=>s.at));
    return {status:row?.status??'pending',callsUsed:row?.calls_used??0,callLimit:TRANSIT_CALL_LIMIT,samplesCollected:samples.length,baselineTotal:baseline.length,baselineCollected:baseline.filter(at=>dates.has(at)).length,retryAt:row?.retry_at??null,errorCode:row?.error_code??null,data:row?.data_json?JSON.parse(row.data_json):null};
  }
  async step(env:Env,id:string,facts:VedicAnnualFacts,provider=fetchProkeralaAnnualPositions):Promise<AnnualTransitState>{
    await this.db.prepare('INSERT OR IGNORE INTO vedic_annual_transits(case_id) VALUES(?)').bind(id).run();
    const now=new Date().toISOString(),token=crypto.randomUUID();
    // One active request per case, shared by both languages and all tabs. The lease exceeds
    // OAuth + planet request timeouts; a crashed request can resume without resetting its cap.
    const row=await this.db.prepare(`UPDATE vedic_annual_transits SET lock_token=?,lease_until=?,status='collecting',error_code=NULL,updated_at=?
      WHERE case_id=? AND status!='completed' AND (lease_until IS NULL OR lease_until<?) AND (retry_at IS NULL OR retry_at<=?)
      RETURNING *`).bind(token,new Date(Date.now()+90000).toISOString(),now,id,now,now).first<Row>();
    if(!row)return this.state(id,facts);
    try {
      const samples=JSON.parse(row.samples_json) as AnnualTransitSample[];
      const at=nextAnnualSample(facts,samples,row.calls_used);
      if(at){
        const reserved=await this.db.prepare('UPDATE vedic_annual_transits SET calls_used=calls_used+1 WHERE case_id=? AND lock_token=? AND calls_used<? RETURNING calls_used').bind(id,token,TRANSIT_CALL_LIMIT).first<{calls_used:number}>();
        if(!reserved)throw new VedicAnnualError('TRANSIT_BUDGET',409);
        const planets=await provider(env,at,facts.birth.latitude,facts.birth.longitude);
        samples.push(annualTransitSample(facts,at,planets));
        // Persist successful samples before computing completion; a DB retry must not refetch.
        await this.db.prepare('UPDATE vedic_annual_transits SET samples_json=? WHERE case_id=? AND lock_token=?').bind(JSON.stringify(samples),id,token).run();
        row.calls_used=reserved.calls_used;
      }
      const next=nextAnnualSample(facts,samples,row.calls_used);
      const data=next?null:completeAnnualTransits(facts,samples);
      await this.db.prepare(`UPDATE vedic_annual_transits SET status=?,data_json=?,lock_token=NULL,lease_until=NULL,retry_at=NULL,error_code=NULL,updated_at=? WHERE case_id=? AND lock_token=?`)
        .bind(data?'completed':'pending',data?JSON.stringify(data):null,new Date().toISOString(),id,token).run();
    }catch(error){
      const code=error instanceof ProkeralaError?error.code:error instanceof VedicAnnualError?error.code:'TRANSIT_FAILED';
      const wait=error instanceof ProkeralaError&&error.code==='PROKERALA_RATE_LIMITED'?Math.max(error.retryAfterSeconds??60,1):0;
      await this.db.prepare(`UPDATE vedic_annual_transits SET status='failed',lock_token=NULL,lease_until=NULL,error_code=?,retry_at=?,updated_at=? WHERE case_id=? AND lock_token=?`)
        .bind(code,wait?new Date(Date.now()+wait*1000).toISOString():null,new Date().toISOString(),id,token).run();
    }
    return this.state(id,facts);
  }
}
