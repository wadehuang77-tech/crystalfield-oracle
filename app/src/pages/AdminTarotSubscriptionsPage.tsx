import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { adminApi, type AdminTarotSubscription } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function date(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export default function AdminTarotSubscriptionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<AdminTarotSubscription[]>([]);
  const [summary, setSummary] = useState({ subscriptions: 0, active: 0, paid_transactions: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=%2Fadmin%2Ftarot-subscriptions');
      return;
    }
    Promise.all([adminApi.check(), adminApi.tarotSubscriptions()])
      .then(([admin, data]) => {
        if (!admin.isAdmin) throw new Error('沒有管理員權限');
        setSubscriptions(data.subscriptions);
        setSummary(data.summary);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '讀取訂閱資料失敗'))
      .finally(() => setLoading(false));
  }, [navigate, user]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-amber-300"><ArrowLeft className="h-4 w-4" />返回後台</Link>
        <h1 className="font-serif text-3xl text-amber-100">Tarot Subscriptions</h1>
        <p className="mt-2 text-sm text-slate-400">塔羅全館月費會員與每一期實際付款紀錄</p>

        <div className="my-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="訂閱數" value={summary.subscriptions} />
          <Stat label="使用中" value={summary.active} />
          <Stat label="成功扣款" value={summary.paid_transactions} />
          <Stat label="實際營收" value={`NT$${summary.revenue.toLocaleString('zh-TW')}`} />
        </div>

        {loading && <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-300" />}
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</p>}

        <div className="space-y-5">
          {subscriptions.map((subscription) => (
            <article key={subscription.id} className="rounded-2xl border border-amber-500/20 bg-slate-900/70 p-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Info label="姓名 / Email" value={`${subscription.name || '—'}\n${subscription.email || '—'}`} />
                <Info label="user_id" value={subscription.user_id} />
                <Info label="方案 / 狀態" value={`${subscription.plan_code}\n${subscription.status}`} />
                <Info label="價格" value={`NT$${subscription.amount} / 月`} />
                <Info label="開始 / 最近付款" value={`${date(subscription.started_at)}\n${date(subscription.last_payment_at)}`} />
                <Info label="下次續訂 / 本期結束" value={`${date(subscription.next_billing_at)}\n${date(subscription.current_period_end)}`} />
                <Info label="MerchantTradeNo" value={subscription.merchant_trade_no} />
                <Info label="TradeNo" value={subscription.ecpay_trade_no || '—'} />
              </div>
              <h2 className="mt-6 flex items-center gap-2 text-sm font-semibold text-amber-200"><CreditCard className="h-4 w-4" />Payment History</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs text-slate-400"><tr><th className="p-2">期數</th><th className="p-2">金額</th><th className="p-2">狀態</th><th className="p-2">付款日期</th><th className="p-2">MerchantTradeNo</th><th className="p-2">TradeNo</th></tr></thead>
                  <tbody>
                    {subscription.payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-slate-700/60">
                        <td className="p-2">第 {payment.billing_cycle} 期</td><td className="p-2">NT${payment.amount}</td><td className="p-2">{payment.status === 'paid' ? '成功' : '失敗'}</td><td className="p-2">{date(payment.paid_at)}</td><td className="p-2 font-mono text-xs">{payment.merchant_trade_no || '—'}</td><td className="p-2 font-mono text-xs">{payment.ecpay_trade_no || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-amber-500/20 bg-slate-900/70 p-4"><p className="text-xs text-amber-300/65">{label}</p><p className="mt-2 text-xl text-amber-100">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 whitespace-pre-line break-all text-sm text-slate-200">{value}</p></div>;
}
