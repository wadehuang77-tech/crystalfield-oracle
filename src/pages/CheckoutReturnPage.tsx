import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { checkoutApi, type Order } from '../lib/api';
import { formatPrice } from '../lib/spread-prices';

const SPREAD_HOME: Record<string, string> = {
  tarot_three:        '/tarot?spread=three',
  tarot_celtic:       '/tarot?spread=celtic',
  tarot_pastlife:     '/tarot?spread=pastlife',
  celtic_cross:       '/lightworker/celtic-cross',
  unicorns_three:     '/unicorns?spread=three',
  dragons_three:      '/dragons?spread=three',
  egyptian_pastlife:  '/egyptian-gods?spread=pastlife',
  cosmic_cross:       '/cosmic-cross',
  osho_three:         '/osho/three',
};

function appendOrderId(url: string, orderId: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}order_id=${encodeURIComponent(orderId)}`;
}

const POLL_INTERVAL_MS  = 2000;
const POLL_TIMEOUT_MS   = 90_000;

export default function CheckoutReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get('order_id') ?? '';

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [authExpired, setAuthExpired] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!orderId) {
      setError('缺少訂單編號');
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (stopped) return;
      try {
        const { order: o } = await checkoutApi.getOrder(orderId);
        if (stopped) return;
        setOrder(o);
        if (o.status === 'paid' || o.status === 'failed' || o.status === 'cancelled') {
          return;
        }
      } catch (e) {
        if (stopped) return;
        const status = (e as { status?: number })?.status;
        if (status === 401) {
          if (Date.now() - startRef.current > 10_000) {
            setAuthExpired(true);
            return;
          }
        } else if (status === 404) {
          setError('找不到此訂單,請確認連結正確');
          return;
        } else if (Date.now() - startRef.current > 10_000) {
          setError(e instanceof Error ? e.message : '無法取得訂單狀態');
          return;
        }
      }
      if (stopped) return;
      if (Date.now() - startRef.current > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  const goHome = () => navigate('/');
  const goSpread = () => {
    if (!order) return;
    const base = SPREAD_HOME[order.item_id] ?? '/';
    navigate(appendOrderId(base, order.id));
  };

  useEffect(() => {
    if (order?.status !== 'paid') return;
    const t = setTimeout(() => {
      const base = SPREAD_HOME[order.item_id] ?? '/';
      navigate(appendOrderId(base, order.id), { replace: true });
    }, 3500);
    return () => clearTimeout(t);
  }, [order, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-6 shadow-xl">
          {!orderId || error ? (
            <Center>
              <Icon Icon={XCircle} tone="wine" />
              <Title>無法確認訂單</Title>
              <Body>{error || '缺少訂單資訊'}</Body>
              <Actions>
                <Link to="/" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full !justify-center">回首頁</Link>
              </Actions>
            </Center>
          ) : authExpired ? (
            <Center>
              <Icon Icon={XCircle} tone="wine" />
              <Title>請重新登入</Title>
              <Body>
                你的登入狀態已過期。付款本身已記錄在綠界,
                <br />
                重新登入後即可看到完整解析。
              </Body>
              <Actions>
                <Link
                  to={`/auth?redirect=${encodeURIComponent('/checkout/return?order_id=' + orderId)}`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 w-full !justify-center"
                >
                  重新登入
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 w-full !justify-center"
                >
                  回首頁
                </Link>
              </Actions>
            </Center>
          ) : !order ? (
            <Center>
              <Icon Icon={Clock} tone="gold" pulse />
              <Title>確認付款中</Title>
              <Body>請稍候,正在向綠界確認付款結果⋯</Body>
            </Center>
          ) : order.status === 'paid' ? (
            <PaidSuccess order={order} onSpread={goSpread} />
          ) : order.status === 'failed' || order.status === 'cancelled' ? (
            <Center>
              <Icon Icon={XCircle} tone="wine" />
              <Title>付款未完成</Title>
              <Body>付款失敗或已取消,沒有從你的帳戶扣款。如有疑問請聯繫客服。</Body>
              <Actions>
                <button onClick={goHome} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full !justify-center">回首頁</button>
              </Actions>
            </Center>
          ) : timedOut ? (
            <Center>
              <Icon Icon={Clock} tone="gold" />
              <Title>確認中</Title>
              <Body>
                付款仍在處理(ATM / 超商代碼可能需要一段時間入帳),
                完成後系統會自動解鎖。你可以先回首頁,稍後再回來查看。
              </Body>
              <Actions>
                <button onClick={goHome} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full !justify-center">回首頁</button>
              </Actions>
            </Center>
          ) : (
            <Center>
              <Icon Icon={Clock} tone="gold" pulse />
              <Title>確認付款中</Title>
              <Body>請稍候⋯</Body>
            </Center>
          )}
        </div>
      </div>
    </div>
  );
}

function PaidSuccess({ order, onSpread }: { order: Order; onSpread: () => void }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 -m-6 overflow-hidden pointer-events-none">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full bg-blue-300 animate-rise"
            style={{
              left: `${(i * 5.7 + 3) % 100}%`,
              width:  `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              opacity: 0,
              animationDelay: `${(i * 0.21) % 4}s`,
              animationDuration: `${3.2 + (i % 5) * 0.55}s`,
              boxShadow: '0 0 6px 1px rgba(226, 201, 148, 0.7)',
            }}
          />
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />

        <div className="relative text-center pt-2 pb-4">
          <div className="inline-block mb-6 animate-stamp-in">
            <SealStamp />
          </div>

          <p className="font-serif text-2xl sm:text-3xl text-blue-100 tracking-[0.2em] sm:tracking-[0.4em] mb-3">付款成功</p>
          <div className="ornamental-divider mb-6">
            <svg viewBox="-8 -8 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" />
              <circle r="1.2" fill="#07091a" />
            </svg>
          </div>

          <p className="font-serif text-lg text-blue-100 mt-2 tracking-[0.2em]">{order.item_name}</p>
          <p className="font-serif text-3xl text-blue-300 mt-4 tracking-[0.12em]">
            {formatPrice(order.amount)}
          </p>

          <div className="mt-8 mb-6 inline-block px-4 py-2 border border-blue-500/25">
            <p className="text-[11px] text-blue-400/70 tracking-[0.3em] mb-1">訂　單　號</p>
            <p className="font-mono text-xs text-blue-200/85">{order.merchant_trade_no}</p>
          </div>

          <p className="text-sm text-blue-200/85 leading-loose tracking-wide">
            你的牌陣已解鎖,<br className="sm:hidden"/>可以回去查看完整解析。
          </p>
          <p className="text-xs text-blue-300/70 mt-3 tracking-wide">即將自動帶你回去⋯</p>

          <div className="space-y-3 mt-8">
            <button onClick={onSpread} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full !justify-center">
              立 刻 查 看 完 整 解 析
              <ArrowRight className="w-4 h-4" strokeWidth={1.4} />
            </button>
            <Link to="/" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 w-full !justify-center">回 首 頁</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SealStamp() {
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="-50 -50 100 100" className="absolute inset-0 w-full h-full text-blue-500" stroke="currentColor" fill="none">
        <circle r="46" strokeWidth="0.7" strokeDasharray="0.8 2.5" opacity="0.7"/>
        <circle r="40" strokeWidth="1"/>
        <rect x="-26" y="-26" width="52" height="52" strokeWidth="0.6" opacity="0.8"/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-serif text-3xl"
          style={{
            color: '#a23b3b',
            fontWeight: 700,
            textShadow: '0 0 10px rgba(162, 59, 59, 0.45)',
          }}
        >成</span>
      </div>
      <svg viewBox="-50 -50 100 100" className="absolute inset-0 w-full h-full text-blue-400" fill="currentColor">
        <circle cx="-32" cy="-32" r="1.5" />
        <circle cx="32"  cy="-32" r="1.5" />
        <circle cx="-32" cy="32"  r="1.5" />
        <circle cx="32"  cy="32"  r="1.5" />
      </svg>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="text-center">{children}</div>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="font-serif text-2xl text-blue-100 tracking-[0.3em] mb-3 mt-5">{children}</h1>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-blue-200/85 leading-relaxed">{children}</p>;
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 mt-8">{children}</div>;
}

function Icon({
  Icon: I, tone, pulse,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: 'gold' | 'wine';
  pulse?: boolean;
}) {
  const color = tone === 'gold' ? 'text-blue-400' : 'text-red-500';
  return (
    <div className={`inline-flex items-center justify-center w-16 h-16 border border-blue-500/30 ${color} ${pulse ? 'animate-pulse' : ''}`}>
      <I className="w-8 h-8" strokeWidth={1.3} />
    </div>
  );
}
