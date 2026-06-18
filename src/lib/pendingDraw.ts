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

const STORAGE_KEY = 'pendingDraw';
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
