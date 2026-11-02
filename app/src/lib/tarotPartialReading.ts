import { savePendingDraw, savePendingSingleDraw, type PendingDrawPick } from './pendingDraw';

// Visitors see about half of a tarot interpretation; signing in reopens the same reading in full.

const READING_IDS_KEY = 'tarotReadingIds';
const MAX_READING_IDS = 20;
export const TAROT_READING_ACCESS_EVENT = 'tarot-reading-access';

/**
 * Reuses one reading id per drawn spread, across the sign-in round trip, so reopening the reading after
 * signing in does not count as another free reading.
 */
export function stableReadingId(drawKey: string): string {
  let ids: Array<[string, string]> = [];
  try { ids = JSON.parse(sessionStorage.getItem(READING_IDS_KEY) ?? '[]'); } catch { ids = []; }
  const existing = ids.find(([key]) => key === drawKey);
  if (existing) return existing[1];
  const id = crypto.randomUUID();
  try {
    sessionStorage.setItem(READING_IDS_KEY, JSON.stringify([...ids, [drawKey, id]].slice(-MAX_READING_IDS)));
  } catch {
    // Without storage the reading still works; it may count again after sign-in.
  }
  return id;
}

export function isPartialReading(result: unknown): boolean {
  return (result as { reading_access?: string } | null)?.reading_access === 'partial';
}

/** Tells the tarot banner whether the reading on screen is the visitor half, and keeps the draw for after sign-in. */
export function announceTarotReading(
  partial: boolean,
  draw?: { spreadId: string; picks?: PendingDrawPick[]; single?: { cardKey: string; reversed: boolean } },
): void {
  if (partial && draw?.picks) savePendingDraw(draw.spreadId, draw.picks);
  if (partial && draw?.single) {
    savePendingSingleDraw({ spread_id: draw.spreadId, route_path: window.location.pathname, card_key: draw.single.cardKey, reversed: draw.single.reversed });
  }
  window.dispatchEvent(new CustomEvent(TAROT_READING_ACCESS_EVENT, { detail: { partial } }));
}
