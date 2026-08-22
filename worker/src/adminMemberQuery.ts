const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type MemberSort = 'last_login_at' | 'created_at' | 'tarot_usage_count';
export type SortOrder = 'asc' | 'desc';

export interface MemberListParams {
  page: number;
  limit: number;
  search: string;
  sort: MemberSort;
  order: SortOrder;
}

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseMemberListParams(url: URL): MemberListParams {
  const page = Math.min(positiveInteger(url.searchParams.get('page'), 1), 1_000_000);
  const limit = Math.min(positiveInteger(url.searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT);
  const search = (url.searchParams.get('search') ?? '').trim().slice(0, 200);
  const requestedSort = url.searchParams.get('sort');
  const sort: MemberSort = requestedSort === 'created_at' || requestedSort === 'tarot_usage_count'
    ? requestedSort
    : 'last_login_at';
  const order: SortOrder = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  return { page, limit, search, sort, order };
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function maskGoogleSub(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return `${value.slice(0, 2)}****${value.slice(-2)}`;
  return `${value.slice(0, 6)}****${value.slice(-4)}`;
}
