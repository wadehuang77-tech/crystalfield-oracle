import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE profiles (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE);`);
db.exec(readFileSync(new URL('../../d1/migrations/018_profile_member_metadata.sql', import.meta.url), 'utf8'));

db.prepare('INSERT INTO profiles (id, email) VALUES (?, ?)').run('user-a', 'person@example.com');
const upsertIdentity = db.prepare(`
  INSERT INTO profile_member_metadata
    (user_id, google_sub, email_verified, display_name, picture_url,
     tarot_usage_count, created_at, updated_at, last_login_at)
  VALUES (?, ?, 1, ?, ?, 0, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    google_sub = excluded.google_sub,
    email_verified = 1,
    display_name = excluded.display_name,
    picture_url = excluded.picture_url,
    updated_at = excluded.updated_at,
    last_login_at = excluded.last_login_at
`);

upsertIdentity.run('user-a', 'google-sub-a', 'Original Name', 'https://example.com/a.png', 't1', 't1', 't1');
let row = db.prepare('SELECT * FROM profile_member_metadata WHERE user_id = ?').get('user-a');
assert.equal(row.tarot_usage_count, 0);
assert.equal(row.email_verified, 1);

db.prepare(`UPDATE profile_member_metadata SET tarot_usage_count = MAX(tarot_usage_count, ?) WHERE user_id = ?`)
  .run(1, 'user-a');
upsertIdentity.run('user-a', 'google-sub-a', 'Updated Name', 'https://example.com/b.png', 'ignored', 't2', 't2');
row = db.prepare('SELECT * FROM profile_member_metadata WHERE user_id = ?').get('user-a');
assert.equal(row.tarot_usage_count, 1);
assert.equal(row.created_at, 't1');
assert.equal(row.last_login_at, 't2');
assert.equal(row.display_name, 'Updated Name');
assert.equal(row.picture_url, 'https://example.com/b.png');

db.prepare(`UPDATE profile_member_metadata SET tarot_usage_count = MAX(tarot_usage_count, ?) WHERE user_id = ?`)
  .run(2, 'user-a');
db.prepare(`UPDATE profile_member_metadata SET tarot_usage_count = MAX(tarot_usage_count, ?) WHERE user_id = ?`)
  .run(1, 'user-a');
row = db.prepare('SELECT tarot_usage_count FROM profile_member_metadata WHERE user_id = ?').get('user-a');
assert.equal(row.tarot_usage_count, 2);

db.exec(readFileSync(new URL('../../d1/migrations/018_profile_member_metadata.sql', import.meta.url), 'utf8'));
assert.throws(() => {
  db.prepare(`INSERT INTO profile_member_metadata (user_id, google_sub) VALUES (?, ?)`).run('user-b', 'google-sub-a');
});

console.log('Google member metadata migration and A-G persistence checks: passed');
