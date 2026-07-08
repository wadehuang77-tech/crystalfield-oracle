import { useEffect, useState } from 'react';
import { Crown, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { membershipApi, type MembershipSubscription } from '../lib/api';

function formatDate(value: string | null): string {
  if (!value) return '未提供';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusLabel(membership: MembershipSubscription | null): string {
  if (!membership) return '尚未加入';
  switch (membership.status) {
    case 'active': return '會員有效中';
    case 'cancelling': return '已取消續扣，權益仍有效';
    case 'pending': return '付款確認中';
    case 'cancelled': return '已取消';
    case 'completed': return '方案已完成';
    case 'past_due': return '扣款失敗';
    case 'expired': return '已到期';
    default: return membership.status;
  }
}

export default function MembershipPage() {
  const [membership, setMembership] = useState<MembershipSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    membershipApi.me()
      .then(({ membership }) => {
        if (!cancelled) setMembership(membership);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '無法載入會員資料');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const { membership } = await membershipApi.refresh();
      setMembership(membership);
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步會員狀態失敗');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = async () => {
    if (cancelling) return;
    if (!confirm('確認取消月費會員的後續自動扣款？本期已付款權益仍可使用到到期日。')) return;
    setCancelling(true);
    setError('');
    try {
      const { membership } = await membershipApi.cancel();
      setMembership(membership);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消訂閱失敗');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-amber-500/40 text-amber-300 mb-5">
            <Crown className="w-8 h-8" strokeWidth={1.4} />
          </div>
          <h1 className="text-3xl font-serif text-amber-100 tracking-[0.2em] mb-3">月費會員管理</h1>
          <p className="text-amber-200/75">查看目前會員狀態、扣款進度與取消後續續扣。</p>
        </div>

        <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/80 border border-amber-500/20 rounded-3xl p-8 shadow-2xl">
          {loading ? (
            <p className="text-center text-amber-200/70">載入中…</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
                <p className="text-lg text-amber-100">{statusLabel(membership)}</p>
              </div>

              {error && (
                <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <Info label="方案價格" value={membership ? `NT$ ${membership.amount} / 月` : 'NT$ 99 / 月'} />
                <Info label="已成功扣款次數" value={membership ? `${membership.total_success_times} 次` : '0 次'} />
                <Info label="本期開始" value={formatDate(membership?.current_period_started_at ?? null)} />
                <Info label="本期到期" value={formatDate(membership?.current_period_ends_at ?? null)} />
                <Info label="首次付款" value={formatDate(membership?.first_paid_at ?? null)} />
                <Info label="最近一次扣款" value={formatDate(membership?.last_paid_at ?? null)} />
                <Info label="卡號末四碼" value={membership?.card_last4 ? `**** ${membership.card_last4}` : '未提供'} />
                <Info label="最後同步" value={formatDate(membership?.last_synced_at ?? null)} />
              </div>

              {membership?.last_error_message && (
                <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                  最近一次扣款異常：{membership.last_error_message}
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800/60 border border-amber-500/30 text-amber-100 hover:bg-slate-700/60 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.6} />
                  {refreshing ? '同步中…' : '同步綠界狀態'}
                </button>

                {membership && membership.is_active && !membership.cancel_at_period_end && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600/80 text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" strokeWidth={1.6} />
                    {cancelling ? '取消中…' : '取消後續自動扣款'}
                  </button>
                )}
              </div>

              <p className="mt-6 text-xs text-amber-300/60 leading-relaxed">
                綠界定期定額的取消是終止後續扣款，不會回收本期已成功付款的權益。
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/15 bg-slate-900/40 px-4 py-4">
      <p className="text-xs tracking-[0.2em] text-amber-300/60 mb-2">{label}</p>
      <p className="text-amber-100">{value}</p>
    </div>
  );
}
