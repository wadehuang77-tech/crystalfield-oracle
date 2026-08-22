import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { validateRegistrationIdentity } from '../src/registration.ts';

assert.deepEqual(validateRegistrationIdentity(' 王小明 ', ' 0912345678 '), {
  ok: true,
  name: '王小明',
  phone: '0912345678',
});
assert.deepEqual(validateRegistrationIdentity('Jane Smith', '+886 912-345-678'), {
  ok: true,
  name: 'Jane Smith',
  phone: '+886 912-345-678',
});
assert.equal(validateRegistrationIdentity('   ', '0912345678').ok, false);
assert.equal(validateRegistrationIdentity('User', '').ok, false);
assert.equal(validateRegistrationIdentity('User', 'not-a-phone').ok, false);

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    created_at TEXT,
    updated_at TEXT
  );
  INSERT INTO profiles (id, email, password_hash) VALUES ('legacy', 'legacy@example.com', 'hash');
`);
db.exec(readFileSync(new URL('../../d1/migrations/019_profile_name_phone.sql', import.meta.url), 'utf8'));

const columns = db.prepare('PRAGMA table_info(profiles)').all() as Array<{ name: string }>;
assert.equal(columns.some((column) => column.name === 'name'), true);
assert.equal(columns.some((column) => column.name === 'phone'), true);

const legacy = db.prepare('SELECT name, phone FROM profiles WHERE id = ?').get('legacy') as {
  name: string | null;
  phone: string | null;
};
assert.equal(legacy.name, null);
assert.equal(legacy.phone, null);

db.prepare('INSERT INTO profiles (id, name, email, phone) VALUES (?, ?, ?, ?)')
  .run('email-user', 'Email Member', 'email@example.com', '+886912345678');
db.prepare('INSERT INTO profiles (id, name, email, phone) VALUES (?, ?, ?, NULL)')
  .run('google-user', 'Google Member', 'google@example.com');

const emailMember = db.prepare('SELECT name, phone FROM profiles WHERE id = ?').get('email-user') as {
  name: string;
  phone: string;
};
assert.equal(emailMember.name, 'Email Member');
assert.equal(emailMember.phone, '+886912345678');

const googleMember = db.prepare('SELECT name, phone FROM profiles WHERE id = ?').get('google-user') as {
  name: string;
  phone: string | null;
};
assert.equal(googleMember.name, 'Google Member');
assert.equal(googleMember.phone, null);

db.close();
console.log('Registration name/phone validation and legacy/Google compatibility checks: passed');
