import type { NumerologyShareProof } from './api';

const PROOFS_KEY = 'cf_numerology_share_proofs';
const CAPABILITIES_KEY = 'cf_numerology_share_capabilities';
const REVOCATIONS_KEY = 'cf_numerology_share_revocations';

function readArray<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function getNumerologyShareProofs(): NumerologyShareProof[] {
  return readArray<NumerologyShareProof>(PROOFS_KEY).filter((item) =>
    typeof item?.order_id === 'string' && typeof item?.order_token === 'string',
  ).slice(-8);
}

export function saveNumerologyShareProof(orderId: string, orderToken?: string | null) {
  if (!orderId || !orderToken) return;
  const next = getNumerologyShareProofs().filter((item) => item.order_id !== orderId);
  next.push({ order_id: orderId, order_token: orderToken });
  localStorage.setItem(PROOFS_KEY, JSON.stringify(next.slice(-8)));
}

export function getNumerologyShareCapabilities(): string[] {
  return readArray<unknown>(CAPABILITIES_KEY).filter((item): item is string => typeof item === 'string' && item.length > 20).slice(-8);
}

export function mergeNumerologyShareCapabilities(tokens: string[]): string[] {
  const merged = [...new Set([...getNumerologyShareCapabilities(), ...tokens.filter(Boolean)])].slice(-8);
  localStorage.setItem(CAPABILITIES_KEY, JSON.stringify(merged));
  return merged;
}

export function saveNumerologyShareRevocation(id: string, token: string) {
  const rows = readArray<{ id: string; token: string }>(REVOCATIONS_KEY).filter((row) => row.id !== id);
  rows.push({ id, token });
  localStorage.setItem(REVOCATIONS_KEY, JSON.stringify(rows.slice(-20)));
}
