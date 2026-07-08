import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, DollarSign, Mail, TrendingUp, Users } from 'lucide-react';
import { adminApi, type MetricsResponse, type DailyRow, type PaymentDetail } from '../lib/api';

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function formatCurrency(v: number): string {
  return `NT$ ${v.toLocaleString('en-US')}`;
}

function Card({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  accent: string;
}) {
  return (
    <div className="bg-slate-900/70 border border-blue-500/20 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-blue-100/60">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5 text-blue-100" />
        </div>
      </div>
      <div className="text-3xl font-bold text-blue-100 tracking-tight">{value}</div>
    </div>
  );
}

function BarChart({ data }: { data: DailyRow[] }) {
  const max = useMemo(
    () => Math.max(1, ...data.map((d) => Math.max(d.page_view, d.email_submit, d.pay_success))),
    [data],
  );

  return (
    <div className="bg-slate-900/70 border border-blue-500/20 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-blue-100">近期每日事件</h3>
        <div className="flex items-center gap-4 text-xs text-blue-100/70">
          <LegendDot color="bg-sky-400" label="瀏覽" />
          <LegendDot color="bg-slate-800/30" label="Email" />
          <LegendDot color="bg-slate-800/30" label="付費" />
        </div>
      </div>

      <div className="flex items-end gap-3 h-56">
        {data.length === 0 && (
          <div className="text-blue-100/40 text-sm">尚無資料</div>
        )}
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <div className="w-full flex items-end justify-center gap-1 h-44">
              <Bar value={d.page_view} max={max} className="bg-sky-400" />
              <Bar value={d.email_submit} max={max} className="bg-slate-800/30" />
              <Bar value={d.pay_success} max={max} className="bg-slate-800/30" />
            </div>
            <span className="text-[10px] text-blue-100/50 truncate w-full text-center">
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div className="relative flex-1 flex items-end group">
      <div
        className={`w-full rounded-t ${className} transition-all`}
        style={{ height: `${pct}%` }}
      />
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-100 bg-black/80 px-1.5 py-0.5 rounded pointer-events-none">
        {value}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(11, 16) || '--:--';
  }
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function PaymentDetails({ payments }: { payments: PaymentDetail[] }) {
  if (payments.length === 0) {
    return <span className="text-blue-100/35">無</span>;
  }

  return (
    <div className="space-y-2 min-w-[20rem]">
      {payments.map((payment, index) => (
        <div
          key={`${payment.item_id}-${payment.paid_at}-${index}`}
          className="rounded-lg border border-blue-500/15 bg-slate-950/35 px-3 py-2 text-left"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-blue-100/90 font-medium">{payment.email}</span>
            <span className="text-blue-200 tabular-nums">{formatCurrency(payment.amount)}</span>
          </div>
          <div className="mt-1 text-xs text-blue-100/55">
            {formatTime(payment.paid_at)}・{payment.deck_name}・{payment.spread_name}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminKpiPage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [days, setDays] = useState(7);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const json = await adminApi.metricsDaily(days);
        if (!cancelled) setData(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          if (message.includes('Unauthorized') || message.includes('401')) {
            setError('請先登入');
          } else if (message.includes('Forbidden') || message.includes('403')) {
            setError('您沒有管理員權限');
          } else {
            setError(message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm text-blue-100/60 hover:text-white mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回管理後台
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">KPI 數據儀表板</h1>
            <p className="text-blue-100/50 text-xs sm:text-sm mt-1">流量、Email、收入與轉換率分析</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/70 border border-blue-500/20 rounded-xl p-1 self-start sm:self-auto">
            {[7, 14, 30].map((n) => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  days === n
                    ? 'bg-slate-800 text-slate-950 font-semibold'
                    : 'text-blue-100/70 hover:text-white'
                }`}
              >
                {n} 天
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-blue-100/50">載入中...</div>}
        {error && !loading && (
          <div className="bg-slate-900/40 border border-blue-500/30 rounded-xl p-4 text-blue-200">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-blue-100/80 mb-3">今日</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card
                  label="流量"
                  value={data.today.page_view.toLocaleString('en-US')}
                  icon={Users}
                  accent="bg-sky-500/80"
                />
                <Card
                  label="Email 數"
                  value={data.today.email_submit.toLocaleString('en-US')}
                  icon={Mail}
                  accent="bg-slate-800/80"
                />
                <Card
                  label="付費數"
                  value={data.today.pay_success.toLocaleString('en-US')}
                  icon={Activity}
                  accent="bg-slate-800/80"
                />
                <Card
                  label="收入"
                  value={formatCurrency(data.today.revenue)}
                  icon={DollarSign}
                  accent="bg-slate-800/80"
                />
                <Card
                  label="Email 轉換率"
                  value={formatPct(data.today.email_conversion_rate)}
                  icon={TrendingUp}
                  accent="bg-slate-800/80"
                />
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-blue-100/80 mb-3">近 {days} 天合計</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card
                  label="總流量"
                  value={data.totals.page_view.toLocaleString('en-US')}
                  icon={Users}
                  accent="bg-sky-500/80"
                />
                <Card
                  label="總 Email"
                  value={data.totals.email_submit.toLocaleString('en-US')}
                  icon={Mail}
                  accent="bg-slate-800/80"
                />
                <Card
                  label="總收入"
                  value={formatCurrency(data.totals.revenue)}
                  icon={DollarSign}
                  accent="bg-slate-800/80"
                />
                <Card
                  label="Email 轉換率"
                  value={formatPct(data.totals.email_conversion_rate)}
                  icon={TrendingUp}
                  accent="bg-slate-800/80"
                />
                <Card
                  label="付費轉換率"
                  value={formatPct(data.totals.pay_conversion_rate)}
                  icon={TrendingUp}
                  accent="bg-slate-800/80"
                />
              </div>
            </section>

            <section className="mb-8">
              <BarChart data={data.daily} />
            </section>

            <section>
              <div className="bg-slate-900/70 border border-blue-500/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-blue-500/20">
                  <h3 className="font-semibold">每日明細</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/5 text-blue-100/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">日期</th>
                        <th className="text-right px-4 py-3 font-medium">流量</th>
                        <th className="text-right px-4 py-3 font-medium">Email</th>
                        <th className="text-right px-4 py-3 font-medium">付費</th>
                        <th className="text-right px-4 py-3 font-medium">收入</th>
                        <th className="text-right px-4 py-3 font-medium">Email 轉換</th>
                        <th className="text-right px-4 py-3 font-medium">付費轉換</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center text-blue-100/40 py-6">
                            尚無資料
                          </td>
                        </tr>
                      )}
                      {data.daily.map((d) => (
                        <tr key={d.date} className="border-t border-blue-500/15 hover:bg-slate-800/5">
                          <td className="px-4 py-3 text-blue-100/80">{d.date}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{d.page_view}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{d.email_submit}</td>
                          <td className="px-4 py-3 align-top">
                            <PaymentDetails payments={d.payments ?? []} />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(d.revenue)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatPct(d.email_conversion_rate)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatPct(d.pay_conversion_rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
