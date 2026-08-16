import type { OracleDeckId, OracleNeedType, OracleSpreadId } from './ga4';

const KEY = 'cf_oracle_intent';

export interface OracleFreeIntent {
  access_mode: 'free' | 'paywall_preview';
  need_id: string;
  need_type: OracleNeedType;
  question: string;
  deck_type: OracleDeckId;
  spread_type: OracleSpreadId;
  reading_id?: string;
  created_at: number;
}

export function saveOracleFreeIntent(intent: OracleFreeIntent): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(intent)); } catch {
    // Private browsing may disable session storage.
  }
}

export function getOracleFreeIntent(spreadId: string): OracleFreeIntent | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as OracleFreeIntent;
    if (value.spread_type !== spreadId) return null;
    if (value.access_mode === 'free' && !value.reading_id) return null;
    if (value.access_mode !== 'free' && value.access_mode !== 'paywall_preview') return null;
    if (Date.now() - value.created_at > 30 * 60 * 1000) return null;
    return value;
  } catch { return null; }
}
