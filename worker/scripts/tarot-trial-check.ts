import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { deriveTarotEntitlement } from '../src/tarotEntitlements';
import {
  TAROT_DECK_CATALOG,
  TAROT_SPREADS,
  tarotTierForSpread,
} from '../src/tarotCatalog';
import { SPREAD_CATALOG } from '../src/ecpay';

let passed = 0;
function check(condition: unknown, label: string): void {
  assert.ok(condition, label);
  passed += 1;
  console.log(`PASS ${passed}: ${label}`);
}

const now = Date.parse('2026-09-07T02:00:00.000Z');
const migration = readFileSync('../d1/migrations/024_tarot_free_readings.sql', 'utf8');
const entitlementSource = readFileSync('src/tarotEntitlements.ts', 'utf8');
const cardsSource = readFileSync('src/cards.ts', 'utf8');

check(TAROT_DECK_CATALOG.length === 7 && Object.keys(TAROT_SPREADS).length === 16, 'quota applies across all 7 decks and 16 spreads');
check(deriveTarotEntitlement(null, 0, now).free_readings_remaining === 3, 'new accounts receive three free readings');
check(deriveTarotEntitlement(null, 2, now).free_readings_remaining === 1, 'free readings are shared account-wide');
check(deriveTarotEntitlement(null, 3, now).status === 'expired', 'fourth reading requires a subscription');
const paidTierOne = deriveTarotEntitlement({
  plan_code: 'tarot_three_monthly_600',
  status: 'active',
  is_active: true,
  current_period_end: '2099-10-05T02:00:00.000Z',
  latest_payment_status: 'paid',
}, 3, now);
check(paidTierOne.has_access && paidTierOne.plan_tier === 1, 'monthly membership stays active after all free readings are used');
check(entitlementSource.includes('if (entitlement.plan_tier >= tarotTierForSpread(spreadId))'), 'matching monthly tier bypasses the free quota without a monthly usage cap');
check(tarotTierForSpread('tarot_single') === 1 && tarotTierForSpread('dragons_three') === 1, 'tier 1 includes single and three-card spreads');
check(tarotTierForSpread('tarot_pastlife') === 2 && tarotTierForSpread('egyptian_pastlife') === 2, 'tier 2 includes past-life spreads');
check(tarotTierForSpread('tarot_celtic') === 3 && tarotTierForSpread('cosmic_cross') === 3, 'tier 3 includes all other spreads');
check(SPREAD_CATALOG.tarot_three_monthly_600?.amount === 600, 'tier 1 costs NT$600/month');
check(SPREAD_CATALOG.tarot_pastlife_monthly_1000?.amount === 1000, 'tier 2 costs NT$1,000/month');
check(SPREAD_CATALOG.tarot_all_monthly_1500?.amount === 1500, 'tier 3 costs NT$1,500/month');
check(entitlementSource.includes('WHERE (SELECT COUNT(*) FROM tarot_free_readings WHERE user_id = ?) < ?'), 'quota limit is enforced atomically by the Worker');
check(entitlementSource.includes('ON CONFLICT(user_id, reading_id) DO NOTHING'), 'duplicate reading IDs cannot consume quota twice');
check((cardsSource.match(/authorizeTarotSpread\(env, session\.id/g) ?? []).length >= 2, 'single and multi-card unlocks both enforce server authorization');
check(!cardsSource.includes('localStorage') && !cardsSource.includes('sessionStorage'), 'browser storage cannot grant reading access');

const migrationDb = new DatabaseSync(':memory:');
migrationDb.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE profiles(id TEXT PRIMARY KEY, email TEXT);
  CREATE TABLE profile_member_metadata(
    user_id TEXT PRIMARY KEY,
    tarot_usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
  );
  INSERT INTO profiles VALUES ('none','none@example.com'),('used-two','two@example.com'),('used-seven','seven@example.com');
  INSERT INTO profile_member_metadata(user_id, tarot_usage_count) VALUES ('none', 0),('used-two', 2),('used-seven', 7);
`);
migrationDb.exec(migration);
const migrated = migrationDb.prepare(
  'SELECT user_id, COUNT(reading_id) AS count FROM tarot_free_readings GROUP BY user_id ORDER BY user_id',
).all() as Array<{ user_id: string; count: number }>;
check(migrated.find((row) => row.user_id === 'used-two')?.count === 2, 'migration preserves two previously used free readings');
check(migrated.find((row) => row.user_id === 'used-seven')?.count === 3, 'migration caps legacy usage at the free limit');
check(!migrated.some((row) => row.user_id === 'none'), 'migration does not charge accounts with no prior usage');
migrationDb.close();

console.log(`All ${passed} tarot quota checks passed.`);
