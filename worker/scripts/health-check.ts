import assert from 'node:assert/strict';
import worker from '../src/index.ts';
import type { Env } from '../src/utils.ts';

let databaseAccessed = false;
const env = new Proxy({} as Env, {
  get(_target, property) {
    if (property === 'DB' || property === 'DB_CARDS') {
      databaseAccessed = true;
      throw new Error('Health endpoint must not access a database');
    }
    return undefined;
  },
});
const ctx = {} as ExecutionContext;

async function checkHealthEndpoint(): Promise<void> {
  const response = await worker.fetch(new Request('https://api.example.test/api/health'), env, ctx);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(databaseAccessed, false);

  const postResponse = await worker.fetch(
    new Request('https://api.example.test/api/health', { method: 'POST' }),
    env,
    ctx,
  );
  assert.equal(postResponse.status, 405);
  assert.equal(postResponse.headers.get('Allow'), 'GET');
  assert.equal(databaseAccessed, false);
}

void checkHealthEndpoint().then(() => {
  console.log('GET /api/health returns a minimal response without database access; other methods are rejected.');
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
