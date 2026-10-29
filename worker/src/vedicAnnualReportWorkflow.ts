import { WorkflowEntrypoint,type WorkflowEvent,type WorkflowStep } from 'cloudflare:workers';
import type { Env } from './utils';
import type { AnnualJobInput } from './vedicAnnualReport';
import { runAnnualJob } from './vedicAnnualReportRunner';
export class VedicAnnualReportWorkflow extends WorkflowEntrypoint<Env,AnnualJobInput>{
  async run(event:WorkflowEvent<AnnualJobInput>,step:WorkflowStep){await runAnnualJob(this.env,event.payload,step);}
}
