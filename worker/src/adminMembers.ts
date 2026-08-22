import {
  Env,
  forbidden,
  json,
  readSession,
  requireAdmin,
  unauthorized,
} from './utils';
import { escapeLike, maskGoogleSub, parseMemberListParams } from './adminMemberQuery';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } } as const;

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  picture_url: string | null;
  email_verified: number;
  tarot_usage_count: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  google_sub: string | null;
}

async function guardAdmin(req: Request, env: Env): Promise<Response | null> {
  const user = await readSession(req, env);
  if (!user) return unauthorized(req, env);
  if (!(await requireAdmin(req, env, user))) return forbidden(req, env);
  return null;
}

function publicMember(row: MemberRow) {
  const pictureUrl = row.picture_url?.startsWith('https://') ? row.picture_url : null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    pictureUrl,
    emailVerified: row.email_verified === 1,
    googleBound: !!row.google_sub,
    googleSubMasked: maskGoogleSub(row.google_sub),
    tarotUsageCount: Math.max(0, Number(row.tarot_usage_count) || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    loginProvider: 'Google' as const,
  };
}

export async function adminListMembers(req: Request, env: Env, url: URL): Promise<Response> {
  const denied = await guardAdmin(req, env);
  if (denied) return denied;

  const params = parseMemberListParams(url);
  const offset = (params.page - 1) * params.limit;
  const conditions = ['m.google_sub IS NOT NULL'];
  const filterBinds: unknown[] = [];

  if (params.search) {
    const pattern = `%${escapeLike(params.search)}%`;
    conditions.push(`(
      p.email LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      COALESCE(NULLIF(p.name, ''), m.display_name, '') LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      p.id LIKE ? ESCAPE '\\' COLLATE NOCASE
    )`);
    filterBinds.push(pattern, pattern, pattern);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const sortColumn = params.sort === 'created_at'
    ? 'm.created_at'
    : params.sort === 'tarot_usage_count'
      ? 'm.tarot_usage_count'
      : 'm.last_login_at';
  const order = params.order.toUpperCase();
  const orderBy = params.sort === 'last_login_at'
    ? `m.last_login_at IS NULL ASC, ${sortColumn} ${order}`
    : `${sortColumn} ${order}`;

  const [rowsResult, countRow] = await Promise.all([
    env.DB.prepare(
      `SELECT p.id, p.email, p.phone,
              COALESCE(NULLIF(p.name, ''), m.display_name) AS name,
              m.picture_url, m.email_verified,
              m.tarot_usage_count, m.created_at, m.updated_at,
              m.last_login_at, m.google_sub
         FROM profile_member_metadata m
         JOIN profiles p ON p.id = m.user_id
         ${where}
         ORDER BY ${orderBy}, p.id ASC
         LIMIT ? OFFSET ?`
    ).bind(...filterBinds, params.limit, offset).all<MemberRow>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS total
         FROM profile_member_metadata m
         JOIN profiles p ON p.id = m.user_id
         ${where}`
    ).bind(...filterBinds).first<{ total: number }>(),
  ]);

  const total = Math.max(0, Number(countRow?.total ?? 0));
  return json(req, env, {
    members: (rowsResult.results ?? []).map(publicMember),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  }, NO_STORE);
}

export async function adminGetMember(req: Request, env: Env, memberId: string): Promise<Response> {
  const denied = await guardAdmin(req, env);
  if (denied) return denied;

  const row = await env.DB.prepare(
    `SELECT p.id, p.email, p.phone,
            COALESCE(NULLIF(p.name, ''), m.display_name) AS name,
            m.picture_url, m.email_verified,
            m.tarot_usage_count, m.created_at, m.updated_at,
            m.last_login_at, m.google_sub
       FROM profile_member_metadata m
       JOIN profiles p ON p.id = m.user_id
      WHERE m.google_sub IS NOT NULL AND p.id = ?
      LIMIT 1`
  ).bind(memberId).first<MemberRow>();

  if (!row) return json(req, env, { error: '找不到會員資料' }, {
    status: 404,
    headers: NO_STORE.headers,
  });
  return json(req, env, { member: publicMember(row) }, NO_STORE);
}

function taipeiStartOfToday(now: Date): string {
  const taipei = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return new Date(Date.UTC(
    taipei.getUTCFullYear(),
    taipei.getUTCMonth(),
    taipei.getUTCDate(),
  ) - 8 * 60 * 60 * 1000).toISOString();
}

export async function adminMemberStats(req: Request, env: Env): Promise<Response> {
  const denied = await guardAdmin(req, env);
  if (denied) return denied;

  const now = new Date();
  const todayStart = taipeiStartOfToday(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const stats = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total_members,
       SUM(CASE WHEN datetime(created_at) >= datetime(?) THEN 1 ELSE 0 END) AS new_today,
       SUM(CASE WHEN datetime(created_at) >= datetime(?) THEN 1 ELSE 0 END) AS new_last_7_days,
       SUM(CASE WHEN last_login_at IS NOT NULL AND datetime(last_login_at) >= datetime(?) THEN 1 ELSE 0 END) AS active_last_30_days,
       SUM(CASE WHEN tarot_usage_count = 0 THEN 1 ELSE 0 END) AS usage_zero,
       SUM(CASE WHEN tarot_usage_count = 1 THEN 1 ELSE 0 END) AS usage_one,
       SUM(CASE WHEN tarot_usage_count >= 2 THEN 1 ELSE 0 END) AS usage_two_or_more
     FROM profile_member_metadata
     WHERE google_sub IS NOT NULL`
  ).bind(todayStart, sevenDaysAgo, thirtyDaysAgo).first<Record<string, number | null>>();

  const value = (key: string) => Math.max(0, Number(stats?.[key] ?? 0));
  return json(req, env, {
    totalMembers: value('total_members'),
    newToday: value('new_today'),
    newLast7Days: value('new_last_7_days'),
    activeLast30Days: value('active_last_30_days'),
    tarotUsage: {
      zero: value('usage_zero'),
      one: value('usage_one'),
      twoOrMore: value('usage_two_or_more'),
    },
  }, NO_STORE);
}
