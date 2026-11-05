type Tool = 'numerology' | 'human-design' | 'vedic';
const key = (tool: Tool) => `cf_reading_login_${tool}`;
// Same-tab handoff only. Never grants paid access; APIs remain authoritative.
export function saveReadingForLogin<T>(tool: Tool, data: T): void {
  try { sessionStorage.setItem(key(tool), JSON.stringify({ data, at: Date.now(), owner: null })); } catch { /* Existing tool storage remains the fallback. */ }
}
export function restoreReadingAfterLogin<T>(tool: Tool, userId: string): T | null {
  try {
    const item = JSON.parse(sessionStorage.getItem(key(tool)) || 'null');
    if (!item || !Number.isFinite(item.at) || Date.now() - item.at > 30 * 60 * 1000 || item.at > Date.now() || (item.owner && item.owner !== userId)) return null;
    // Retain through React effect replays, while binding it to the first signed-in user.
    sessionStorage.setItem(key(tool), JSON.stringify({ ...item, owner: userId }));
    return item.data as T;
  } catch { return null; }
}
export function clearReadingLoginState(tool: Tool): void {
  try { sessionStorage.removeItem(key(tool)); } catch { /* Storage may be disabled. */ }
}
