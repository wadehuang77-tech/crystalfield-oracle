import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { pollVedicReport, terminalReport, persistedReportTimings } from '../src/lib/vedicReportPolling';
import type { VedicChartData, VedicReportProgress } from '../src/lib/api';
import type * as Components from '../src/components/VedicReportProgress';

const progress: VedicReportProgress = {
  reportId: 'test-report', chartId: 'test-chart', language: 'en',
  reportStatus: 'generating', totalSections: 9, completedSections: 3,
  sections: Array.from({ length: 9 }, (_, index) => ({
    key: `section-${index + 1}`, title: `Section ${index + 1}`,
    status: index < 3 ? 'completed' : index === 3 ? 'generating' : 'pending', retryable: false,
    ...(index < 3 ? {
      generatedAt: new Date(1000 + index * 1000).toISOString(),
      content: { heading: `Section ${index + 1}`, consultation: `Saved interpretation ${index + 1}`, evidence: [] },
    } : {}),
  })),
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
let scheduled: (() => void) | undefined;
let delay = 0;
let hidden = false;
let count = 0;
let signal: AbortSignal | undefined;
let resolve: ((value: VedicReportProgress) => void) | undefined;
const stop = pollVedicReport(s => {
  count++; signal = s;
  return new Promise<VedicReportProgress>(done => { resolve = done; });
}, () => {}, () => assert.fail('Unexpected poll error'), {
  hidden: () => hidden,
  schedule: (fn, ms) => { assert.equal(scheduled, undefined, 'No overlapping poll timer'); scheduled = fn; delay = ms; return 1; },
  cancel: () => { scheduled = undefined; },
});
assert.equal(count, 1);
assert.equal(scheduled, undefined, 'An in-flight GET cannot overlap another GET');
resolve!(progress); await flush();
assert.equal(delay, 3000);
hidden = true;
const next = scheduled!; scheduled = undefined; next();
assert.equal(count, 2);
resolve!(progress); await flush();
assert.equal(delay, 12000);
stop();
assert.ok(signal?.aborted);
assert.equal(scheduled, undefined, 'Unmount cancels timer and request');
for (const status of ['completed', 'partial_failed', 'failed'] as const) {
  assert.ok(terminalReport(status));
  const cancel = pollVedicReport(async () => ({ ...progress, reportStatus: status }), () => {}, () => assert.fail(), {
    hidden: () => false, schedule: () => { assert.fail('Terminal state must not schedule another poll'); },
  });
  await flush(); cancel();
}
let updates = 0;
const cancelLate = pollVedicReport(() => new Promise(done => { resolve = done; }), () => { updates++; }, () => assert.fail(), { hidden: () => false });
cancelLate(); resolve!(progress); await flush();
assert.equal(updates, 0, 'Late responses cannot update an unmounted component');
const metrics = persistedReportTimings({
  ...progress, completedSections: 9, sections: Array.from({ length: 9 }, (_, index) => ({
    ...progress.sections[0], generatedAt: new Date(2000 + index * 1000).toISOString(),
  })),
}, 1000);
assert.deepEqual(metrics, [{ metric: 'T2', elapsedMs: 1000 }, { metric: 'T3', elapsedMs: 5000 }, { metric: 'T4', elapsedMs: 9000 }]);
assert.deepEqual(persistedReportTimings({
  ...progress, sections: progress.sections.map(s => ({ ...s, generatedAt: undefined })),
}, 1000), [], 'Legacy sections without timestamps cannot produce guessed timing metrics');

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { VedicChartCore, VedicProgressiveReport } = await vite.ssrLoadModule('/src/components/VedicReportProgress.tsx') as typeof Components;
  const chart: VedicChartData = {
    ayanamsa: 'LAHIRI', lagna: 'Pisces', sunSign: 'Leo', moonSign: 'Aquarius', moonNakshatra: 'Shatabhisha',
    planets: {}, mahaDasha: 'Mercury', antarDasha: 'Saturn', dashaTimeline: [], housePlacements: {}, houseLords: {},
    presentation: {
      ascendantLongitude: 359.76, moonNakshatra: { name: 'Shatabhisha', pada: 3 },
      planets: [{ name: 'Sun', sign: 'Leo', longitude: 140, signDegree: 20, house: 6 }], houses: {},
      d9: { ascendant: 'Pisces', positions: [] }, d10: { ascendant: 'Leo', positions: [] },
      dasha: { mahaDasha: 'Mercury', antarDasha: 'Saturn' },
    },
  };
  for (const language of ['zh-Hant', 'en'] as const) {
    const core = renderToStaticMarkup(React.createElement(VedicChartCore, { chart, language }));
    assert.match(core, /359\.7600/);
    assert.match(core, /Shatabhisha/);
    assert.match(core, /D9/); assert.match(core, /D10/);
    assert.match(core, /Mercury/);
    const html = renderToStaticMarkup(React.createElement(VedicProgressiveReport, {
      progress, language, onRetry: () => {}, retrying: null,
    }));
    assert.match(html, /3 \/ 9/);
    assert.equal((html.match(/data-section-status="completed"/g) || []).length, 3);
    assert.match(html, /Saved interpretation 1/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /min-w-0/); assert.match(html, /break-words/);
    assert.match(html, language === 'en' ? /Completed/ : /已完成/);
    const failed = renderToStaticMarkup(React.createElement(VedicProgressiveReport, {
      progress: { ...progress, reportStatus: 'partial_failed', sections: [...progress.sections.slice(0, 3),
        { ...progress.sections[3], status: 'failed', retryable: true }] },
      language, onRetry: () => {}, retrying: null,
    }));
    assert.match(failed, /Saved interpretation 1/);
    assert.match(failed, language === 'en' ? /Retry this section/ : /重試此段解析/);
  }
  console.log('Vedic frontend chart-first/3-of-9/failed-retention/ZH-EN/SSR/mobile-classes/polling/cancellation/persisted-timing tests PASS.');
} finally { await vite.close(); }
