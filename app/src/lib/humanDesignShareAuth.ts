import type { HumanDesignShareProof } from './api';

const PROOFS_KEY = 'cf_hd_share_proofs';
const CAPABILITIES_KEY = 'cf_hd_share_capabilities';
const REVOCATIONS_KEY = 'cf_hd_share_revocations';

function readArray<T>(key: string): T[] {
  try { const parsed = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

export function getHumanDesignShareProofs(): HumanDesignShareProof[] {
  return readArray<HumanDesignShareProof>(PROOFS_KEY).filter((row) =>
    typeof row?.order_id === 'string' && typeof row?.order_token === 'string',
  ).slice(-6);
}

export function saveHumanDesignShareProof(orderId: string, orderToken?: string | null) {
  if (!orderId || !orderToken) return;
  const rows = getHumanDesignShareProofs().filter((row) => row.order_id !== orderId);
  rows.push({ order_id: orderId, order_token: orderToken });
  localStorage.setItem(PROOFS_KEY, JSON.stringify(rows.slice(-6)));
}

export function getHumanDesignShareCapabilities(): string[] {
  return readArray<unknown>(CAPABILITIES_KEY).filter((token): token is string => typeof token === 'string' && token.length > 20).slice(-6);
}

export function mergeHumanDesignShareCapabilities(tokens: string[]) {
  const merged = [...new Set([...getHumanDesignShareCapabilities(), ...tokens.filter(Boolean)])].slice(-6);
  localStorage.setItem(CAPABILITIES_KEY, JSON.stringify(merged));
  return merged;
}

export function saveHumanDesignShareRevocation(id: string, token: string) {
  const rows = readArray<{ id: string; token: string }>(REVOCATIONS_KEY).filter((row) => row.id !== id);
  rows.push({ id, token });
  localStorage.setItem(REVOCATIONS_KEY, JSON.stringify(rows.slice(-20)));
}
