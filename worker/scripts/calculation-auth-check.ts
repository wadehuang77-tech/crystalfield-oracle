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

  const vedicResponse = await createVedicChart(
    new Request('https://api.example.test/api/vedic-astrology/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: chartBody,
    }),
    env,
  );
  assert.equal(vedicResponse.status, 401, 'Creating a Vedic chart requires login');
  assert.equal(databaseAccesses, 0, 'Unauthenticated chart requests must not access D1');

  console.log('Unauthenticated Human Design and Vedic chart APIs reject requests before D1 access: passed');
}

void main();
