import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { signJwt } from '../src/auth';
import { authorizeTarotReading } from '../src/tarotEntitlements';
import { halfReading } from '../src/cards';
import type { Env } from '../src/utils';

// Visitors share seven free multi-card readings per IP; a member signing in from that IP inherits them.
async function main() {
  const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-06-25', d1Databases: ['DB'] });
  try {
    const db = await mf.getD1Database('DB');
    for (const sql of [
      'CREATE TABLE profiles(id TEXT PRIMARY KEY, email TEXT, token_generation INTEGER DEFAULT 0)',
      'CREATE TABLE multi_spread_free_unlocks(id TEXT PRIMARY KEY, email_hash TEXT NOT NULL, spread_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime(\'now\')), UNIQUE(email_hash, spread_id))',
      'CREATE TABLE tarot_free_readings(user_id TEXT NOT NULL, reading_id TEXT NOT NULL, spread_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime(\'now\')), PRIMARY KEY(user_id, reading_id), FOREIGN KEY(user_id) REFERENCES profiles(id) ON DELETE CASCADE)',
      'CREATE TABLE profile_member_metadata(user_id TEXT PRIMARY KEY, tarot_usage_count INTEGER, created_at TEXT, updated_at TEXT)',
    ]) await db.prepare(sql).run();
    // Membership lookups read the real subscription schema.
    for (const name of ['008_subscriptions.sql', '021_tarot_recurring_billing.sql']) {
      const sql = await readFile(new URL(`../../d1/migrations/${name}`, import.meta.url), 'utf8');
      await db.batch(sql.replace(/--[^\n]*/g, '').split(';').map((s) => s.trim()).filter(Boolean).map((s) => db.prepare(s)));
    }
    for (const id of ['member', 'second']) await db.prepare('INSERT INTO profiles(id, email) VALUES (?, ?)').bind(id, `${id}@example.test`).run();
    const env = { DB: db, JWT_SECRET: 'local-test-only' } as unknown as Env;
    const request = (ip: string, user?: string, token?: string) => new Request('https://test/api/cards/free-unlock-spread', {
      method: 'POST', headers: { 'CF-Connecting-IP': ip, ...(user && token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const ip = '198.51.100.20';

    for (let reading = 1; reading <= 7; reading += 1) {
      const access = await authorizeTarotReading(request(ip), env, 'tarot_three', `guest-${reading}`);
      assert.equal(access.allowed, true, `guest reading ${reading} allowed`);
      assert.equal(access.entitlement.free_readings_remaining, 7 - reading);
    }
    const repeat = await authorizeTarotReading(request(ip), env, 'tarot_three', 'guest-3');
    assert.equal(repeat.allowed, true, 'reopening the same reading does not consume quota');
    const eighth = await authorizeTarotReading(request(ip), env, 'tarot_three', 'guest-8');
    assert.equal(eighth.allowed, false, 'eighth guest reading is denied');
    assert.equal(eighth.guest, true);
    assert.equal((await authorizeTarotReading(request(ip), env, 'tarot_single', 'guest-single')).allowed, true, 'single cards stay unlimited');
    assert.equal((await authorizeTarotReading(request('198.51.100.21'), env, 'tarot_three', 'other-ip')).allowed, true, 'another IP has its own quota');

    const token = await signJwt({ sub: 'member', email: 'member@example.test' }, env.JWT_SECRET);
    const member = await authorizeTarotReading(request(ip, 'member', token), env, 'tarot_three', 'member-1');
    assert.equal(member.guest, false);
    assert.equal(member.allowed, false, 'guest usage merges into the member quota');
    assert.equal(member.entitlement.free_readings_remaining, 0);
    const moved = await db.prepare('SELECT COUNT(*) AS n FROM tarot_free_readings WHERE user_id = ?').bind('member').first<{ n: number }>();
    assert.equal(moved?.n, 7, 'seven guest readings moved to the member');
    const reopened = await authorizeTarotReading(request(ip, 'member', token), env, 'tarot_three', 'guest-3');
    assert.equal(reopened.allowed, true, 'after sign-in the same reading reopens in full without using another free reading');

    const sample = { meaning: '第一句話說明牌義。第二句話描述現況。第三句話給出建議。第四句話提醒風險。', keywords: ['勇氣', '行動', '開始', '信任'], label: '短標籤' };
    const half = halfReading(sample) as typeof sample;
    assert.ok(half.meaning.length < sample.meaning.length * 0.7 && half.meaning.endsWith('…'), 'long text is cut to about half');
    assert.ok(sample.meaning.startsWith(half.meaning.slice(0, -1)), 'the visitor sees the opening half');
    assert.deepEqual(half.keywords, ['勇氣', '行動'], 'lists keep their first half');
    assert.equal(half.label, '短標籤', 'short labels stay whole');

    const secondToken = await signJwt({ sub: 'second', email: 'second@example.test' }, env.JWT_SECRET);
    const second = await authorizeTarotReading(request(ip, 'second', secondToken), env, 'tarot_three', 'second-1');
    assert.equal(second.allowed, true, 'already-claimed guest readings are not merged again');
    assert.equal((await authorizeTarotReading(request(ip), env, 'tarot_three', 'guest-9')).allowed, false, 'claiming does not refill the IP guest quota');
    console.log('PASS: 7 free multi-card readings per IP for visitors, half interpretations for visitors, unlimited single cards, merge into the first member who signs in, no double merge, quota not refilled. Local D1 only.');
  } finally {
    await mf.dispose();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
