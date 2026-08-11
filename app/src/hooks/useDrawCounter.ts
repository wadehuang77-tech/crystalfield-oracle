const SINGLE_KEY = 'cf_single_unlocks_v3';
const SINGLE_EMAIL_GATE_KEY = 'cf_single_email_gate_seen_v3';
// Keep this key unchanged so existing visitors retain their historical usage.
const MULTI_KEY = 'cf_multi_unlocks';
const MULTI_BY_SPREAD_KEY = 'cf_multi_unlocks_by_spread_v1';
const LEGACY_BLOCK_KEY = '__legacy_shared_quota_used__';

export const MULTI_SPREAD_FREE_LIMIT = 1;
export type MultiSpreadGateDecision = 'email_gate' | 'paywall';

export function getMultiSpreadGateDecision(count: number): MultiSpreadGateDecision {
  return count >= MULTI_SPREAD_FREE_LIMIT ? 'paywall' : 'email_gate';
}

function safeGet(key: string): number {
  try { return Math.max(0, parseInt(localStorage.getItem(key) ?? '0', 10) || 0); }
  catch { return 0; }
}
function safeSet(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}
function safeGetBool(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; }
  catch { return false; }
}
function safeSetBool(key: string) {
  try { localStorage.setItem(key, '1'); } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}

function readMultiSpreadUsage(): Record<string, true> {
  try {
    const raw = localStorage.getItem(MULTI_BY_SPREAD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed).filter(([, used]) => used === true),
      ) as Record<string, true>;
    }

    // The legacy counter did not record which spread was used. Block legacy
    // visitors from receiving reset credits, matching the previous policy.
    if (safeGet(MULTI_KEY) > 0) {
      const migrated = { [LEGACY_BLOCK_KEY]: true } as Record<string, true>;
      localStorage.setItem(MULTI_BY_SPREAD_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // Keep the reading flow available if storage is restricted.
  }
  return {};
}

function writeMultiSpreadUsage(usage: Record<string, true>): void {
  try { localStorage.setItem(MULTI_BY_SPREAD_KEY, JSON.stringify(usage)); } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}

export function getSingleUnlockCount(): number { return safeGet(SINGLE_KEY); }
export function getMultiUnlockCount(spreadId: string): number {
  const usage = readMultiSpreadUsage();
  return usage[LEGACY_BLOCK_KEY] || usage[spreadId] ? 1 : 0;
}
export function getRemainingMultiUnlocks(spreadId: string): number {
  return Math.max(0, MULTI_SPREAD_FREE_LIMIT - getMultiUnlockCount(spreadId));
}
export function hasSeenSingleEmailGate(): boolean { return safeGetBool(SINGLE_EMAIL_GATE_KEY); }
export function markSingleEmailGateSeen(): void { safeSetBool(SINGLE_EMAIL_GATE_KEY); }

export function incrementSingleUnlock(): number {
  const n = safeGet(SINGLE_KEY) + 1;
  safeSet(SINGLE_KEY, n);
  return n;
}
export function incrementMultiUnlock(spreadId: string): number {
  const usage = readMultiSpreadUsage();
  usage[spreadId] = true;
  writeMultiSpreadUsage(usage);
  return 1;
}
