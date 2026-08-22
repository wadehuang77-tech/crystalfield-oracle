import assert from 'node:assert/strict';
import { decideTarotQuota, mergeTarotUsageCounts, TAROT_FREE_READING_LIMIT } from '../src/oracleQuota.ts';

assert.equal(TAROT_FREE_READING_LIMIT, 2);

// A: first reading is free without login.
assert.equal(decideTarotQuota(0, false), 'allow_free');
// B/C/D: second reading requires login, then remains free across deck/spread choices.
assert.equal(decideTarotQuota(1, false), 'login_required');
assert.equal(decideTarotQuota(1, true), 'allow_free');
// E/F: third and later readings require the existing paid flow, even after logout/login.
assert.equal(decideTarotQuota(2, false), 'payment_required');
assert.equal(decideTarotQuota(2, true), 'payment_required');
assert.equal(decideTarotQuota(99, true), 'payment_required');
// G: invalid negative data is treated as no completed reading.
assert.equal(decideTarotQuota(-1, false), 'allow_free');
assert.equal(mergeTarotUsageCounts(0, 1), 1);
assert.equal(mergeTarotUsageCounts(2, 1), 2);
assert.equal(mergeTarotUsageCounts(1, 1), 1);

console.log('oracle quota policy A-G: passed');
