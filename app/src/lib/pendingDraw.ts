export interface PendingDrawPick {
  card_key: string;
  position: number;
  reversed?: boolean;
}

export interface PendingDraw {
  spread_id: string;
  picks: PendingDrawPick[];
  draw_at: number;
}

export interface PendingSingleDraw {
  spread_id: string;
  route_path: string;
  card_key: string;
  reversed?: boolean;
  draw_at: number;
}

const STORAGE_KEY = 'pendingDraw';
const SINGLE_STORAGE_KEY = 'pendingSingleDraw';
const MEMBERSHIP_REDIRECT_KEY = 'membershipCheckoutRedirect';
const MAX_AGE_MS = 30 * 60 * 1000;

export function savePendingDraw(spread_id: string, picks: PendingDrawPick[]): void {
  if (!spread_id || !Array.isArray(picks) || picks.length === 0) return;
  try {
    const data: PendingDraw = { spread_id, picks, draw_at: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function consumePendingDraw(spread_id: string): PendingDraw | null {
  let raw: string | null = null;
  try { raw = sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PendingDraw;
    if (data.spread_id !== spread_id) return null;
    if (Date.now() - data.draw_at > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return data;
  } catch {
    return null;
  }
}

export function clearPendingDraw(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

export function savePendingSingleDraw(data: Omit<PendingSingleDraw, 'draw_at'>): void {
  try {
    sessionStorage.setItem(SINGLE_STORAGE_KEY, JSON.stringify({ ...data, draw_at: Date.now() }));
  } catch {}
}

export function consumePendingSingleDraw(spread_id: string): PendingSingleDraw | null {
  let raw: string | null = null;
  try { raw = sessionStorage.getItem(SINGLE_STORAGE_KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PendingSingleDraw;
    if (data.spread_id !== spread_id) return null;
    if (Date.now() - data.draw_at > MAX_AGE_MS) {
      sessionStorage.removeItem(SINGLE_STORAGE_KEY);
      return null;
    }
    sessionStorage.removeItem(SINGLE_STORAGE_KEY);
    return data;
  } catch {
    return null;
  }
}

export function saveMembershipCheckoutRedirect(path: string): void {
  try { sessionStorage.setItem(MEMBERSHIP_REDIRECT_KEY, path); } catch {}
}

export function consumeMembershipCheckoutRedirect(): string | null {
  try {
    const value = sessionStorage.getItem(MEMBERSHIP_REDIRECT_KEY);
    if (value) sessionStorage.removeItem(MEMBERSHIP_REDIRECT_KEY);
    return value;
  } catch {
    return null;
  }
}
