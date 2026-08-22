import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { escapeLike, maskGoogleSub, parseMemberListParams } from '../src/adminMemberQuery.ts';

const defaults = parseMemberListParams(new URL('https://example.test/api/admin/members'));
assert.deepEqual(defaults, {
  page: 1,
  limit: 20,
  search: '',
  sort: 'last_login_at',
  order: 'desc',
});

const requested = parseMemberListParams(new URL(
  'https://example.test/api/admin/members?page=3&limit=500&search=user%40gmail.com&sort=tarot_usage_count&order=asc',
));
assert.equal(requested.page, 3);
assert.equal(requested.limit, 100);
assert.equal(requested.search, 'user@gmail.com');
assert.equal(requested.sort, 'tarot_usage_count');
assert.equal(requested.order, 'asc');

const invalid = parseMemberListParams(new URL(
  'https://example.test/api/admin/members?page=-1&limit=oops&sort=password_hash&order=drop%20table',
));
assert.equal(invalid.page, 1);
assert.equal(invalid.limit, 20);
assert.equal(invalid.sort, 'last_login_at');
assert.equal(invalid.order, 'desc');

assert.equal(maskGoogleSub('1092345678907821'), '109234****7821');
assert.equal(maskGoogleSub('12345678'), '12****78');
assert.equal(maskGoogleSub(null), null);

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE samples (value TEXT NOT NULL); INSERT INTO samples VALUES (\'user%name@gmail.com\'), (\'ordinary@gmail.com\');');
const escapedPattern = `%${escapeLike('user%name')}%`;
const matches = db.prepare("SELECT value FROM samples WHERE value LIKE ? ESCAPE '\\' COLLATE NOCASE").all(escapedPattern);
assert.equal(matches.length, 1);
assert.equal((matches[0] as { value: string }).value, 'user%name@gmail.com');
db.close();

console.log('Admin member query parsing and identifier masking checks: passed');
