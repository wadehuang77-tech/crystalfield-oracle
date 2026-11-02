import assert from 'node:assert/strict';
import { authorizeTarotReading, authorizeTarotSpread } from '../src/tarotEntitlements';
import { TAROT_SPREADS } from '../src/tarotCatalog';
import type { Env } from '../src/utils';

async function main() {
  let quotaUsed = 0;
  let writes = 0;
  const env = { JWT_SECRET: 'local-test-only', DB: { prepare(sql: string) {
    return { bind() { return this; }, async first() {
      if (sql.includes('FROM subscriptions')) return null;
      if (sql.includes('COUNT(*)')) return { count: quotaUsed };
      if (sql.includes('SELECT spread_id')) return null;
      throw new Error(`Unexpected query: ${sql}`);
    }, async run() { writes++; throw new Error('Free single-card readings must never write quota'); } };
  } } } as unknown as Env;
  const singles = Object.values(TAROT_SPREADS).filter(s => s.card_count === 1);
  assert.equal(singles.length, 7);
  for (const used of [0, 3, 6, 7]) {
    quotaUsed = used;
    for (const spread of singles) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const access = await authorizeTarotSpread(env, 'member', spread.id, crypto.randomUUID());
        assert.equal(access.allowed, true);
        assert.equal(access.source, 'free');
        assert.equal(access.entitlement.free_readings_remaining, 7 - used);
      }
      const guest = await authorizeTarotReading(new Request('https://test/api/cards/free-unlock-single', {
        method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.7' },
      }), env, spread.id, crypto.randomUUID());
      assert.equal(guest.guest, true);
      assert.equal(guest.allowed, true, 'visitors draw single cards without signing in');
    }
  }
  assert.equal(writes, 0);
  for (const spread of Object.values(TAROT_SPREADS).filter(s => s.card_count > 1)) {
    assert.equal((await authorizeTarotSpread(env, 'member', spread.id, 'fourth')).allowed, false);
  }
  assert.equal((await authorizeTarotSpread(env, 'member', 'fake_single', 'fake')).allowed, false);
  console.log('PASS: seven single-card decks unlimited for members and visitors; no quota writes; exhausted multi-card spreads denied.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
