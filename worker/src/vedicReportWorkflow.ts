import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import type { Env } from './utils';
import { runVedicReportWorkflow, type VedicReportJobInput } from './vedicReportWorkflowRunner';
import { VedicReportStore } from './vedicReportStore';
import { validateCompleteVedicReport } from './vedicAstrology';

export class VedicReportWorkflow extends WorkflowEntrypoint<Env, VedicReportJobInput> {
  async run(event: WorkflowEvent<VedicReportJobInput>, step: WorkflowStep) {
    try {
      await runVedicReportWorkflow(this.env, event.payload, step);
    } catch {
      console.error('[vedic-workflow]', { code: 'REPORT_WORKFLOW_FAILED' });
      await step.do('safe-terminal-failure', { retries: { limit: 2, delay: '1 second' } }, async () => {
        const store = new VedicReportStore(this.env.DB);
        await store.failJob(event.payload.reportId, event.payload.language, event.payload.jobId, 'REPORT_WORKFLOW_FAILED');
        await store.finish(event.payload.reportId, event.payload.language,
          report => validateCompleteVedicReport(report, event.payload.language));
      });
    }
  }
}
