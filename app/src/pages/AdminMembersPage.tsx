import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  Shield,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  adminApi,
  type AdminMember,
  type AdminMemberOrder,
  type AdminMemberSort,
  type AdminMemberStats,
} from '../lib/api';
import { parseDbDate } from '../lib/dateFormat';

const PAGE_SIZE = 20;

function formatTaipei(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(parseDbDate(value));
}

function tarotUsageLabel(count: number): string {
  if (count === 0) return '尚未完成 Tarot';
  if (count === 1) return '已完成第一次免費';
  if (count === 2) return '已完成第二次登入免費';
  return '已進入付費使用階段';
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-slate-900/55 p-4">
      <p className="text-xs tracking-wider text-blue-300/65">{label}</p>
      <p className="mt-2 font-serif text-2xl text-blue-100">{value.toLocaleString('zh-TW')}</p>
    </div>
  );
}

function MemberAvatar({ member, size = 'small' }: { member: AdminMember; size?: 'small' | 'large' }) {
  const classes = size === 'large' ? 'h-20 w-20 text-2xl' : 'h-10 w-10 text-sm';
  if (member.pictureUrl) {
    return (
      <img
        src={member.pictureUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${classes} rounded-full border border-blue-400/30 object-cover`}
      />
    );
  }
  return (
    <div className={`${classes} flex items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-200`}>
      {(member.name || member.email).slice(0, 1).toUpperCase()}
    </div>
  );
}

export function AdminMembersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [stats, setStats] = useState<AdminMemberStats | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AdminMemberSort>('last_login_at');
  const [order, setOrder] = useState<AdminMemberOrder>('desc');
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=%2Fadmin%2Fmembers');
      return;
    }
    let cancelled = false;
    adminApi.check()
      .then(({ isAdmin: allowed }) => {
        if (!cancelled) setIsAdmin(allowed);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [navigate, user]);

  const loadMembers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.members({ page, limit: PAGE_SIZE, search, sort, order });
      setMembers(response.members);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
      if (page > response.pagination.totalPages) setPage(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '會員資料載入失敗');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, order, page, search, sort]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadMembers();
  }, [isAdmin, loadMembers]);

  useEffect(() => {
    if (!isAdmin) return;
    adminApi.memberStats().then(setStats).catch(() => setStats(null));
  }, [isAdmin]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const viewMember = async (id: string) => {
    setDetailLoading(true);
    setError('');
    try {
      const { member } = await adminApi.member(id);
      setSelectedMember(member);
    } catch (err) {
      setError(err instanceof Error ? err.message : '會員詳細資料載入失敗');
    } finally {
      setDetailLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-blue-300" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900/75 p-8 text-center">
          <Shield className="mx-auto mb-5 h-12 w-12 text-red-400" />
          <h1 className="text-2xl font-bold text-blue-100">無權限訪問</h1>
          <p className="mt-3 text-blue-300">只有管理員可以查看會員資料。</p>
          <Link to="/" className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white">返回首頁</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-3 py-7 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border-2 border-blue-500/25 bg-slate-900/65 p-4 shadow-xl backdrop-blur-md sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-blue-500/15 pb-6">
            <div>
              <Link to="/admin" className="mb-3 inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-100">
                <ArrowLeft className="h-4 w-4" />返回管理後台
              </Link>
              <h1 className="font-serif text-2xl tracking-[0.18em] text-blue-100 sm:text-3xl">會員資料</h1>
              <p className="mt-2 text-sm text-blue-300/70">Google 登入會員・唯讀管理</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-200/75">
              <Users className="h-4 w-4" />目前共 {total.toLocaleString('zh-TW')} 位
            </div>
          </div>

          <section className="mb-7">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="總會員數" value={stats?.totalMembers ?? 0} />
              <StatCard label="今日新增會員" value={stats?.newToday ?? 0} />
              <StatCard label="最近 7 天新增" value={stats?.newLast7Days ?? 0} />
              <StatCard label="最近 30 天登入" value={stats?.activeLast30Days ?? 0} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="尚未使用 Tarot" value={stats?.tarotUsage.zero ?? 0} />
              <StatCard label="已使用 1 次" value={stats?.tarotUsage.one ?? 0} />
              <StatCard label="已使用 2 次以上" value={stats?.tarotUsage.twoOrMore ?? 0} />
            </div>
          </section>

          <section className="rounded-xl border border-blue-500/15 bg-slate-950/35 p-3 sm:p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <form onSubmit={submitSearch} className="flex w-full max-w-xl gap-2">
                <label className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/60" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="搜尋 Email、姓名或會員 ID"
                    maxLength={200}
                    className="w-full rounded-lg border border-blue-500/25 bg-slate-900/80 py-2.5 pl-10 pr-3 text-sm text-blue-100 outline-none placeholder:text-blue-300/35 focus:border-blue-400"
                  />
                </label>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">搜尋</button>
                {search && (
                  <button type="button" onClick={clearSearch} className="rounded-lg border border-blue-500/25 px-3 text-sm text-blue-200 hover:bg-blue-500/10">清除</button>
                )}
              </form>

              <div className="flex flex-wrap gap-2">
                <select
                  value={sort}
                  onChange={(event) => { setSort(event.target.value as AdminMemberSort); setPage(1); }}
                  className="rounded-lg border border-blue-500/25 bg-slate-900 px-3 py-2.5 text-sm text-blue-100"
                  aria-label="排序欄位"
                >
                  <option value="last_login_at">最近登入</option>
                  <option value="created_at">註冊日期</option>
                  <option value="tarot_usage_count">塔羅使用次數</option>
                </select>
                <select
                  value={order}
                  onChange={(event) => { setOrder(event.target.value as AdminMemberOrder); setPage(1); }}
                  className="rounded-lg border border-blue-500/25 bg-slate-900 px-3 py-2.5 text-sm text-blue-100"
                  aria-label="排序方向"
                >
                  <option value="desc">由新到舊／由高到低</option>
                  <option value="asc">由舊到新／由低到高</option>
                </select>
              </div>
            </div>

            {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-blue-500/20 text-xs uppercase tracking-wider text-blue-300/65">
                  <tr>
                    <th className="hidden px-3 py-3 sm:table-cell">頭像</th>
                    <th className="px-3 py-3">姓名</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Tarot 次數</th>
                    <th className="hidden px-3 py-3 md:table-cell">註冊日期</th>
                    <th className="px-3 py-3">最近登入</th>
                    <th className="px-3 py-3 text-right">查看</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-blue-500/5">
                      <td className="hidden px-3 py-3 sm:table-cell"><MemberAvatar member={member} /></td>
                      <td className="px-3 py-3 text-blue-100">
                        <div>{member.name || '未提供'}</div>
                        <div className="mt-1 max-w-40 truncate font-mono text-[10px] text-blue-300/40" title={member.id}>{member.id}</div>
                      </td>
                      <td className="px-3 py-3 text-blue-200/80">
                        <div>{member.email}</div>
                        <div className="mt-1 flex gap-1.5 text-[10px]">
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-200">Google</span>
                          <span className={`rounded px-1.5 py-0.5 ${member.emailVerified ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
                            {member.emailVerified ? '已驗證' : '未驗證'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 font-mono text-cyan-200">{member.tarotUsageCount}</span>
                      </td>
                      <td className="hidden px-3 py-3 text-blue-200/65 md:table-cell">{formatTaipei(member.createdAt)}</td>
                      <td className="px-3 py-3 text-blue-200/65">{formatTaipei(member.lastLoginAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void viewMember(member.id)}
                          disabled={detailLoading}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-400/25 px-3 py-1.5 text-blue-200 hover:bg-blue-500/10 disabled:opacity-50"
                        >
                          <Eye className="h-4 w-4" />查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && members.length === 0 && (
              <div className="py-12 text-center text-blue-300/60">沒有符合條件的 Google 會員</div>
            )}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-12 text-blue-300"><Loader2 className="h-5 w-5 animate-spin" />載入會員資料</div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-blue-500/15 pt-4 text-sm text-blue-200/70">
              <span>第 {page} / {totalPages} 頁・共 {total.toLocaleString('zh-TW')} 筆</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-500/25 px-3 py-2 disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />上一頁
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-500/25 px-3 py-2 disabled:opacity-35"
                >
                  下一頁<ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="member-detail-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-blue-400/30 bg-slate-950 p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <MemberAvatar member={selectedMember} size="large" />
                <div>
                  <h2 id="member-detail-title" className="font-serif text-2xl text-blue-100">{selectedMember.name || '未提供姓名'}</h2>
                  <p className="mt-1 break-all text-sm text-blue-300/75">{selectedMember.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedMember(null)} className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10" aria-label="關閉">
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="會員 ID" value={selectedMember.id} mono />
              <Detail label="登入方式" value={selectedMember.loginProvider} />
              <Detail label="Email 驗證" value={selectedMember.emailVerified ? '已驗證' : '未驗證'} />
              <Detail label="Google 帳號綁定" value={selectedMember.googleBound ? '已綁定' : '未綁定'} />
              <Detail label="Google 帳號識別碼" value={selectedMember.googleSubMasked || '—'} mono />
              <Detail label="塔羅使用次數" value={`${selectedMember.tarotUsageCount}（${tarotUsageLabel(selectedMember.tarotUsageCount)}）`} />
              <Detail label="建立日期（台灣時間）" value={formatTaipei(selectedMember.createdAt)} />
              <Detail label="最近登入（台灣時間）" value={formatTaipei(selectedMember.lastLoginAt)} />
              <Detail label="最後更新（台灣時間）" value={formatTaipei(selectedMember.updatedAt)} />
            </dl>
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200/75">
              <UserCheck className="h-4 w-4 shrink-0" />此頁僅供查看，不會修改會員資料或塔羅使用次數。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-blue-500/15 bg-slate-900/60 p-3">
      <dt className="text-xs tracking-wider text-blue-300/55">{label}</dt>
      <dd className={`mt-1.5 break-all text-sm text-blue-100 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
