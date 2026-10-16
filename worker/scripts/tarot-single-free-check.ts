import assert from 'node:assert/strict';
import { authorizeTarotSpread } from '../src/tarotEntitlements';
import { TAROT_SPREADS } from '../src/tarotCatalog';
import { freeUnlockSingle } from '../src/cards';
import type { Env } from '../src/utils';

async function main() {
  let quotaUsed = 0;
  let writes = 0;
  const env = { DB: { prepare(sql: string) {
    return { bind() { return this; }, async first() {
      if (sql.includes('FROM subscriptions')) return null;
      if (sql.includes('COUNT(*)')) return { count: quotaUsed };
      if (sql.includes('SELECT spread_id')) return null;
      throw new Error(`Unexpected query: ${sql}`);
    }, async run() { writes++; throw new Error('Free single-card readings must never write quota'); } };
  } } } as unknown as Env;
  const singles = Object.values(TAROT_SPREADS).filter(s => s.card_count === 1);
  assert.equal(singles.length, 7);
  for (const used of [0, 1, 2, 3]) {
    quotaUsed = used;
    for (const spread of singles) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const access = await authorizeTarotSpread(env, 'member', spread.id, crypto.randomUUID());
        assert.equal(access.allowed, true);
        assert.equal(access.source, 'free');
        assert.equal(access.entitlement.free_readings_remaining, 3 - used);
      }
      const guest = await freeUnlockSingle(new Request('https://test/api/cards/free-unlock-single', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spread_id: spread.id, card_key: 'test', reading_id: 'test' }),
      }), env);
      assert.equal(guest.status, 401);
    }
  }
  assert.equal(writes, 0);
  for (const spread of Object.values(TAROT_SPREADS).filter(s => s.card_count > 1)) {
    assert.equal((await authorizeTarotSpread(env, 'member', spread.id, 'fourth')).allowed, false);
  }
  assert.equal((await authorizeTarotSpread(env, 'member', 'fake_single', 'fake')).allowed, false);
  console.log('PASS: seven single-card decks unlimited after login; no quota writes; guests denied; exhausted multi-card spreads denied.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
