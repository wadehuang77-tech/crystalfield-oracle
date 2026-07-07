const SINGLE_KEY = 'cf_single_unlocks';
const MULTI_KEY  = 'cf_multi_unlocks';

function safeGet(key: string): number {
  try { return Math.max(0, parseInt(localStorage.getItem(key) ?? '0', 10) || 0); }
  catch { return 0; }
}
function safeSet(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch {}
}

export function getSingleUnlockCount(): number { return safeGet(SINGLE_KEY); }
export function getMultiUnlockCount():  number { return safeGet(MULTI_KEY); }

export function incrementSingleUnlock(): number {
  const n = safeGet(SINGLE_KEY) + 1;
  safeSet(SINGLE_KEY, n);
  return n;
}
export function incrementMultiUnlock(): number {
  const n = safeGet(MULTI_KEY) + 1;
  safeSet(MULTI_KEY, n);
  return n;
}
