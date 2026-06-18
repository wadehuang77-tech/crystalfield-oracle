export function parseDbDate(s: string): Date {
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  return new Date(s.replace(' ', 'T') + 'Z');
}

export function formatDateTimeTW(s: string | null | undefined, fallback = '—'): string {
  if (!s) return fallback;
  return parseDbDate(s).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTW(s: string | null | undefined, fallback = '—'): string {
  if (!s) return fallback;
  return parseDbDate(s).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
