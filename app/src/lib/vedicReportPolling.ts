import type { VedicReportProgress } from './api';

export function terminalReport(status: VedicReportProgress['reportStatus']): boolean {
  return status === 'completed' || status === 'partial_failed' || status === 'failed';
}

export function vedicReportPercentage(completedSections: number): number {
  return Math.round(Math.min(9, Math.max(0, completedSections)) / 9 * 100);
}

export function persistedReportTimings(value: VedicReportProgress, visibleAt: number) {
  const completed = value.sections.filter(s => s.status === 'completed');
  const times = completed.map(s => s.generatedAt ? Date.parse(s.generatedAt) : NaN);
  // Legacy completed sections may not have a verifiable persistence timestamp.
  if (times.some(time => !Number.isFinite(time)) || completed.length !== value.completedSections) return [];
  times.sort((a, b) => a - b);
  return ([['T2', 1], ['T3', 5], ['T4', 9]] as const).flatMap(([metric, count]) =>
    times.length >= count && times[count - 1] >= visibleAt
      ? [{ metric, elapsedMs: times[count - 1] - visibleAt }] : []);
}

export function pollVedicReport(
  load: (signal: AbortSignal) => Promise<VedicReportProgress>,
  update: (value: VedicReportProgress) => void,
  fail: () => void,
  options: {
    hidden: () => boolean;
    schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
    cancel?: (timer: ReturnType<typeof setTimeout>) => void;
  },
): () => void {
  const controller = new AbortController();
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function tick() {
    try {
      const value = await load(controller.signal);
      if (controller.signal.aborted) return;
      update(value);
      if (!terminalReport(value.reportStatus)) {
        timer = schedule(() => { void tick(); }, options.hidden() ? 12000 : 3000);
      }
    } catch {
      if (controller.signal.aborted) return;
      fail();
      timer = schedule(() => { void tick(); }, options.hidden() ? 12000 : 3000);
    }
  }
  void tick();
  return () => {
    controller.abort();
    if (timer !== undefined) cancel(timer);
  };
}
