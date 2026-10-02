import assert from 'node:assert/strict';
import {
  clearPendingDraw,
  consumePendingDraw,
  readPendingDraw,
  savePendingDraw,
} from '../src/lib/pendingDraw';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: new MemoryStorage(),
});

const picks = [
  { card_key: 'the-fool', position: 1, reversed: false },
  { card_key: 'the-star', position: 2, reversed: true },
  { card_key: 'the-world', position: 3, reversed: false },
];
savePendingDraw('tarot_three', picks);
const pending = readPendingDraw();
assert.ok(pending);
assert.equal(pending.spread_id, 'tarot_three');
assert.deepEqual(pending.picks, picks);
assert.equal(typeof pending.draw_at, 'number');
assert.deepEqual(readPendingDraw('tarot_three')?.picks, picks, 'reading the pending draw must not consume it');
assert.deepEqual(consumePendingDraw('tarot_three')?.picks, picks);
assert.equal(readPendingDraw(), null, 'the draw is removed after its owner restores it');

savePendingDraw('tarot_celtic', picks);
clearPendingDraw();
assert.equal(readPendingDraw(), null, 'starting a different draw clears stale pending cards');

console.log('Pending Tarot draws survive return navigation and are consumed only after restoration: passed');
