import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ORACLE_SPREADS } from '../src/lib/oracle-catalog';
import {
  DEEP_ANALYSIS_ROUTES,
  shouldShowDeepAnalysisRecommendations,
} from '../src/lib/tarot-deep-analysis';

const root = resolve(import.meta.dirname, '..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');
const resultPages = [
  'src/pages/TarotPage.tsx',
  'src/pages/TarotSinglePage.tsx',
  'src/pages/LightworkerPage.tsx',
  'src/pages/LightworkerCelticCrossPage.tsx',
  'src/pages/UnicornsPage.tsx',
  'src/pages/DragonsPage.tsx',
  'src/pages/EgyptianGodsPage.tsx',
  'src/pages/WorkYourLightSinglePage.tsx',
  'src/pages/CosmicCrossPage.tsx',
  'src/pages/OshoSinglePage.tsx',
  'src/pages/OshoThreePage.tsx',
];
const pageSources = resultPages.map(source);
const allPageSource = pageSources.join('\n');
const componentSource = source('src/components/TarotDeepAnalysisRecommendations.tsx');
const shareSource = source('src/components/ShareReadingSection.tsx');
const appSource = source('src/App.tsx');
const ga4Source = source('src/lib/ga4.ts');

assert.equal(shouldShowDeepAnalysisRecommendations({ hasFullAccess: false, resultComplete: false }), false);
assert.equal(shouldShowDeepAnalysisRecommendations({ hasFullAccess: false, resultComplete: true }), false);
assert.equal(shouldShowDeepAnalysisRecommendations({ hasFullAccess: true, resultComplete: false }), false);
assert.equal(shouldShowDeepAnalysisRecommendations({ hasFullAccess: true, resultComplete: true }), true);

assert.deepEqual(DEEP_ANALYSIS_ROUTES, {
  numerology: '/numerology',
  human_design: '/human-design',
  vedic_astrology: '/vedic-astrology',
});
for (const route of Object.values(DEEP_ANALYSIS_ROUTES)) {
  assert.ok(appSource.includes(`<Route path="${route}"`), `Missing real main route ${route}`);
}

for (const text of [
  '想看更深入的人生分析？',
  '更深入的分析，請點：',
  '查看生命靈數',
  '查看人類圖',
  '查看印度占星',
]) assert.ok(componentSource.includes(text), `Missing recommendation copy: ${text}`);

assert.equal((allPageSource.match(/<ShareReadingSection/g) ?? []).length, 13, 'Expected all 13 result render locations');
assert.equal((allPageSource.match(/deepAnalysis=\{\{/g) ?? []).length, 13, 'Every result render location must provide trusted state');
assert.ok(shareSource.indexOf('<ShareReadingSection') === -1);
assert.ok(shareSource.indexOf('<TarotDeepAnalysisRecommendations') > shareSource.indexOf('</section>'), 'Recommendations must follow sharing');

assert.equal(new Set(Object.values(ORACLE_SPREADS).map(({ deck_id }) => deck_id)).size, 7);
assert.equal(Object.keys(ORACLE_SPREADS).length, 16);
for (const spreadId of Object.keys(ORACLE_SPREADS)) {
  assert.ok(allPageSource.includes(spreadId), `Missing result coverage for ${spreadId}`);
}

assert.ok(componentSource.includes('if (!shouldShow) return null'));
assert.ok(!componentSource.includes('localStorage') && !componentSource.includes('sessionStorage'));
assert.ok(componentSource.includes('viewedResultKeys.has(exposureKey)'), 'Exposure must be deduplicated by result');
assert.ok(componentSource.includes('grid-cols-1') && componentSource.includes('sm:grid-cols-2') && componentSource.includes('lg:grid-cols-3'), 'Responsive 1/2/3-column layout is required');
assert.ok(ga4Source.includes('tarot_deep_analysis_recommendations_view'));
assert.ok(ga4Source.includes('tarot_cross_sell_click'));
for (const safeParam of ['destination', 'source', 'deck_id', 'spread_id']) {
  assert.ok(ga4Source.includes(safeParam), `Missing GA4 parameter ${safeParam}`);
}
for (const privateValue of ['full_question', 'birth_date', 'payment_data']) {
  assert.ok(!componentSource.includes(privateValue), `Recommendation component includes private value ${privateValue}`);
}

console.log('Tarot deep-analysis recommendations: conditions, 7 decks, 16 spreads, routes, layout and GA4 checks passed.');
