import assert from 'node:assert/strict';
import type { Env } from '../src/utils';
import { saveHumanDesignChart, updateHumanDesignAnswers } from '../src/humanDesign';
import { createVedicChart } from '../src/vedicAstrology';

let databaseAccesses = 0;
const env = {
  JWT_SECRET: 'test-only-secret',
  DB: {
    prepare() {
      databaseAccesses += 1;
      throw new Error('Unauthenticated calculation requests must not access D1');
    },
  },
} as unknown as Env;

const chartBody = JSON.stringify({
  birth_date: '1990-01-01',
  birth_time: '12:00',
  birth_city: 'Taipei',
  chart_data: {},
});

async function main() {
  const humanDesignResponse = await saveHumanDesignChart(
    new Request('https://api.example.test/api/human-design/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: chartBody,
    }),
    env,
  );
  assert.equal(humanDesignResponse.status, 401, 'Saving a Human Design chart requires login');

  const answersResponse = await updateHumanDesignAnswers(
    new Request('https://api.example.test/api/human-design/charts/chart-id/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_answers: [1, 2] }),
    }),
    env,
    'chart-id',
  );
  assert.equal(answersResponse.status, 401, 'Updating Human Design chart answers requires login');

  // Visitors may calculate a Vedic chart (it calls the paid Prokerala API), but only within a per-IP allowance.
  let guestChartsToday = 10;
  const rateLimitedEnv = {
    JWT_SECRET: 'test-only-secret',
    DB: {
      prepare(sql: string) {
        return {
          bind(scope: string) {
            return {
              async first() { return { c: scope === 'vedic-chart-guest-day' ? guestChartsToday : 0 }; },
              async run() { return {}; },
            };
          },
          sql,
        };
      },
    },
  } as unknown as Env;
  const vedicRequest = () => new Request('https://api.example.test/api/vedic-astrology/charts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
    body: chartBody,
  });
  const limited = await createVedicChart(vedicRequest(), rateLimitedEnv);
  assert.equal(limited.status, 429, 'Visitors beyond 10 Vedic charts a day are rate limited');
  assert.match(JSON.stringify(await limited.json()), /訪客每小時最多 5 次、每天最多 10 次/);
  guestChartsToday = 0;
  const allowed = await createVedicChart(vedicRequest(), rateLimitedEnv);
  assert.notEqual(allowed.status, 401, 'Visitors are not asked to sign in to calculate a Vedic chart');
  assert.notEqual(allowed.status, 429, 'Visitors within the allowance are not rate limited');
  assert.equal(databaseAccesses, 0, 'Unauthenticated Human Design requests must not access D1');

  console.log('Human Design chart saving still requires login; visitors calculate Vedic charts within the per-IP allowance: passed');
}

void main();
