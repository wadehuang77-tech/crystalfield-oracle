import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  History,
  Loader2,
  MapPin,
  MoonStar,
  Orbit,
  Sparkles,
  Stars,
} from 'lucide-react';
import {
  checkoutApi,
  vedicAstrologyApi,
  type VedicChartResponse,
  type VedicReport,
} from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';

const SESSION_KEY = 'cf_vedic_chart_session';

const SIGN_ZH: Record<string, string> = {
  Aries: '牡羊座', Taurus: '金牛座', Gemini: '雙子座', Cancer: '巨蟹座',
  Leo: '獅子座', Virgo: '處女座', Libra: '天秤座', Scorpio: '天蠍座',
  Sagittarius: '射手座', Capricorn: '摩羯座', Aquarius: '水瓶座', Pisces: '雙魚座',
};

const PLANET_ZH: Record<string, string> = {
  Sun: '太陽', Moon: '月亮', Mars: '火星', Mercury: '水星', Jupiter: '木星',
  Venus: '金星', Saturn: '土星', Rahu: '羅喉', Ketu: '計都',
};

const PAID_OPTIONS = [
  {
    id: 'vedic_soul_karma',
    title: '靈魂業力',
    subtitle: '前世因果與今生課題',
    price: 499,
    icon: History,
    featured: true,
    description: '從羅喉、計都、宮位、宮主星與相關相位，看見前世慣性與今生真正需要完成的轉化。',
    bullets: ['你帶著什麼來到今生？', '為什麼某些事情不斷重複？', '今生需要離開的舒適圈', '你的今生核心課題'],
  },
  {
    id: 'vedic_life_full',
    title: '人生全解',
    subtitle: '業力、使命、感情與財富事業',
    price: 499,
    icon: Stars,
    featured: false,
    description: '把前世因果與今生核心課題，放進感情、關係、工作、財富與靈魂使命中完整理解。',
    bullets: ['業力模式與靈魂使命', '感情與關係方向', '財富與事業天賦', '完成課題後的人生方向'],
  },
  {
    id: 'vedic_complete',
    title: '完整人生地圖',
    subtitle: '全部解析、未來時間軸與靈魂總結',
    price: 999,
    icon: Sparkles,
    featured: false,
    description: '解鎖全部人生主題、未來十年時間軸，以及由人工智慧整合的第七項「靈魂業力總結」。',
    bullets: ['前世因果與今生課題', '使命、感情與財富事業', '未來十年行星週期', '給你今生的靈魂訊息'],
  },
] as const;

function saveChart(chart: VedicChartResponse) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(chart));
}

function loadChart(): VedicChartResponse | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VedicChartResponse;
    return parsed.chart_id && parsed.chart_token ? parsed : null;
  } catch {
    return null;
  }
}

export default function VedicAstrologyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ birthDate: '', birthTime: '', birthPlace: '' });
  const [consent, setConsent] = useState(false);
  const [chart, setChart] = useState<VedicChartResponse | null>(() => loadChart());
  const [isCalculating, setIsCalculating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [report, setReport] = useState<VedicReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const restoreRef = useRef(false);

  useEffect(() => {
    if (restoreRef.current || !chart) return;
    const orderId = searchParams.get('order_id');
    const orderToken = searchParams.get('order_token');
    if (!orderId || !orderToken) return;
    restoreRef.current = true;
    setReportLoading(true);
    setError('');
    void vedicAstrologyApi.getPaidReport({
      chart_id: chart.chart_id,
      chart_token: chart.chart_token,
      order_id: orderId,
      order_token: orderToken,
    }).then((result) => {
      setReport(result.report);
      window.setTimeout(() => document.getElementById('vedic-paid-report')?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).catch((reason) => {
      setError(reason instanceof Error ? reason.message : '無法取得已解鎖報告');
    }).finally(() => setReportLoading(false));
  }, [chart, searchParams]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.birthDate || !form.birthTime || !form.birthPlace.trim()) {
      setError('請完整填寫出生年月日、出生時間與出生地點');
      return;
    }
    if (!consent) {
      setError('請先同意為產生星盤而處理出生資料');
      return;
    }
    setError('');
    setIsCalculating(true);
    setReport(null);
    try {
      const result = await vedicAstrologyApi.createChart({
        birth_date: form.birthDate,
        birth_time: form.birthTime,
        birth_place: form.birthPlace.trim(),
        consent: true,
      });
      setChart(result);
      saveChart(result);
      window.setTimeout(() => document.getElementById('vedic-free-results')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '星盤計算失敗，請稍後再試');
    } finally {
      setIsCalculating(false);
    }
  };

  const checkout = async (productId: string) => {
    if (!chart || checkoutLoading) return;
    setCheckoutLoading(productId);
    setError('');
    try {
      const result = await checkoutApi.createOrder(productId, undefined, {
        context_id: chart.chart_id,
        context_token: chart.chart_token,
      });
      if (result.admin_unlocked) {
        navigate(`/checkout/return?order_id=${encodeURIComponent(result.order_id)}&order_token=${encodeURIComponent(result.order_token || '')}`);
        return;
      }
      if (!result.ecpay) throw new Error('結帳資料缺失，請重試');
      submitToEcpay(result.ecpay, () => {
        setError('跳轉至付款頁失敗，請稍後再試');
        setCheckoutLoading('');
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '無法建立訂單');
      setCheckoutLoading('');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070312] text-white">
      <CosmicBackground />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6">
        <section className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-medium tracking-[0.28em] text-amber-200/75">印度占星 · 靈魂業力人生地圖</p>
          <h1 className="font-serif text-4xl leading-tight text-amber-50 sm:text-6xl">印度占星｜靈魂業力人生地圖</h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-9 text-violet-100/80">
            為什麼有些事情，你明明很努力，卻一直重複發生？印度占星從出生星盤，看見今生天賦、感情模式、財富道路，以及正在經歷的人生週期。
          </p>
        </section>

        <section className="mx-auto mt-12 max-w-3xl rounded-[2rem] border border-amber-300/25 bg-slate-950/55 p-6 shadow-[0_0_70px_rgba(168,85,247,0.16)] backdrop-blur-xl sm:p-10">
          <div className="mb-7 flex items-center gap-3">
            <span className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-200"><Orbit /></span>
            <div><h2 className="font-serif text-2xl text-amber-50">輸入你的出生座標</h2><p className="mt-1 text-sm text-violet-200/55">出生時間越準確，上升與宮位判讀越可靠。</p></div>
          </div>
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <Field label="出生年月日">
              <input type="date" required value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="vedic-input" />
            </Field>
            <Field label="出生時間">
              <input type="time" required value={form.birthTime} onChange={(e) => setForm({ ...form, birthTime: e.target.value })} className="vedic-input" />
            </Field>
            <Field label="出生地點" wide>
              <div className="relative"><MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-200/55" /><input type="text" required maxLength={160} placeholder="例如：台北市, 台灣" value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} className="vedic-input pl-12" /></div>
            </Field>
            <label className="flex items-start gap-3 text-sm leading-6 text-violet-100/65 sm:col-span-2">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-amber-400" />
              <span>我同意系統為產生星盤，將出生日期、時間與地點暫時傳送至 VedAstro 計算。晶域心語只保存衍生星盤，不保存這三項原始出生資料。</span>
            </label>
            {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 sm:col-span-2">{error}</p>}
            <button type="submit" disabled={isCalculating} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-fuchsia-500 to-violet-600 px-6 py-4 font-semibold shadow-[0_0_32px_rgba(217,70,239,0.28)] transition hover:brightness-110 disabled:opacity-60 sm:col-span-2">
              {isCalculating ? <><Loader2 className="animate-spin" />正在連結出生星盤…</> : <><Stars />開啟我的靈魂業力地圖</>}
            </button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-white/35">本服務用於自我探索與娛樂參考，不代替醫療、法律、財務或心理專業意見。</p>
        </section>

        {chart && <FreeResults chart={chart} />}

        {chart && (
          <section className="mt-20" aria-labelledby="vedic-deep-heading">
            <div className="text-center"><p className="text-sm tracking-[0.3em] text-fuchsia-300/60">三種深度解析方案</p><h2 id="vedic-deep-heading" className="mt-3 font-serif text-3xl text-white sm:text-5xl">選擇你現在最想理解的人生問題</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-violet-100/60">不用先理解艱深名詞。從你最關心的問題進入，星盤會成為整理人生方向的地圖。</p></div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {PAID_OPTIONS.map((option) => <PaidOption key={option.id} {...option} loading={checkoutLoading === option.id} disabled={!!checkoutLoading} onClick={() => void checkout(option.id)} />)}
            </div>
          </section>
        )}

        {reportLoading && <div className="mt-16 flex items-center justify-center gap-3 text-violet-100/70"><Loader2 className="animate-spin" />正在展開已解鎖的人生地圖…</div>}
        {report && <PaidReport report={report} />}
      </main>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-2 block text-sm font-medium text-amber-100/80">{label}</span>{children}</label>;
}

function FreeResults({ chart }: { chart: VedicChartResponse }) {
  const result = chart.free_results;
  return (
    <section id="vedic-free-results" className="mt-20 scroll-mt-24">
      <div className="text-center"><p className="text-sm tracking-[0.3em] text-amber-300/60">免費靈魂地圖</p><h2 className="mt-3 font-serif text-3xl text-amber-50 sm:text-5xl">你的免費印度占星指引</h2><p className="mt-4 text-sm text-violet-100/55">專業星曆計算 · 拉希里恆星黃道</p></div>
      <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
        <ChartBadge label="上升" value={SIGN_ZH[chart.chart.lagna] || chart.chart.lagna} />
        <ChartBadge label="月亮" value={SIGN_ZH[chart.chart.moonSign] || chart.chart.moonSign} />
        <ChartBadge label="太陽" value={SIGN_ZH[chart.chart.sunSign] || chart.chart.sunSign} />
        <ChartBadge label="目前大運" value={PLANET_ZH[chart.chart.mahaDasha] || chart.chart.mahaDasha} />
      </div>
      <div className="mt-9 grid gap-5 lg:grid-cols-3">
        <ResultCard number="01" eyebrow="人格原型" title={result.archetype.title} body={result.archetype.body} />
        <ResultCard number="02" eyebrow="今生天賦" title={result.talents.title} body={result.talents.body}><div className="mb-4 flex flex-wrap gap-2">{result.talents.items.slice(0, 1).map((item) => <span key={item} className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-sm text-amber-100">{item}</span>)}</div></ResultCard>
        <ResultCard number="03" eyebrow="行星週期" title={result.currentCycle.title} body={result.currentCycle.body} />
      </div>
    </section>
  );
}

function ChartBadge({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-violet-300/20 bg-violet-950/35 px-4 py-4 text-center"><div className="text-xs uppercase tracking-[0.18em] text-violet-200/45">{label}</div><div className="mt-2 font-serif text-lg text-amber-50">{value}</div></div>;
}

function ResultCard({ number, eyebrow, title, body, children }: { number: string; eyebrow: string; title: string; body: string; children?: React.ReactNode }) {
  return <article className="h-full rounded-[1.75rem] border border-violet-300/20 bg-gradient-to-br from-slate-950/70 to-violet-950/45 p-6 backdrop-blur-md sm:p-8"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-[0.25em] text-fuchsia-300/60">{eyebrow}</span><span className="font-serif text-2xl text-amber-200/35">{number}</span></div><h3 className="mt-4 font-serif text-2xl text-amber-50">{title}</h3><div className="mt-4">{children}</div><p className="leading-8 text-violet-50/72">{body}</p></article>;
}

function PaidOption(props: typeof PAID_OPTIONS[number] & { loading: boolean; disabled: boolean; onClick: () => void }) {
  const Icon = props.icon;
  return <article className={`relative rounded-[1.75rem] border bg-slate-950/55 p-6 transition hover:-translate-y-1 ${props.featured ? 'border-amber-300/45 shadow-[0_0_40px_rgba(251,191,36,0.12)]' : 'border-violet-300/20 hover:border-fuchsia-300/35'}`}>{props.featured && <span className="absolute right-5 top-5 rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">主打方案</span>}<div className="flex items-start justify-between gap-4"><span className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-3 text-fuchsia-200"><Icon /></span><strong className={`text-xl text-white ${props.featured ? 'mt-10 sm:mt-0' : ''}`}>NT${props.price}</strong></div><h3 className="mt-5 font-serif text-2xl text-amber-50">{props.title}</h3><p className="mt-1 text-sm text-fuchsia-200/70">{props.subtitle}</p><p className="mt-4 min-h-24 leading-7 text-violet-100/60">{props.description}</p><ul className="mt-4 space-y-2">{props.bullets.map((item) => <li key={item} className="flex gap-2 text-sm text-white/60"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{item}</li>)}</ul><button type="button" disabled={props.disabled} onClick={props.onClick} className="mt-6 w-full rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/15 px-4 py-3 font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/25 disabled:opacity-50">{props.loading ? '前往付款中…' : '解鎖這份指引'}</button></article>;
}

function PaidReport({ report }: { report: VedicReport }) {
  return <section id="vedic-paid-report" className="mt-20 scroll-mt-24 rounded-[2rem] border border-amber-300/30 bg-slate-950/65 p-6 shadow-[0_0_60px_rgba(251,191,36,0.1)] sm:p-10"><div className="text-center"><MoonStar className="mx-auto h-10 w-10 text-amber-300" /><p className="mt-4 text-sm tracking-[0.3em] text-amber-300/60">已解鎖的靈魂指引</p><h2 className="mt-3 font-serif text-3xl text-amber-50 sm:text-5xl">{report.title}</h2></div><p className="mx-auto mt-8 max-w-4xl whitespace-pre-line text-lg leading-9 text-violet-50/75">{report.introduction}</p><div className="mx-auto mt-10 max-w-4xl space-y-6">{report.sections.map((section, index) => <article key={`${section.heading}-${index}`} className="rounded-2xl border border-violet-300/15 bg-violet-950/25 p-6 sm:p-8"><h3 className="font-serif text-2xl text-amber-100">{section.heading}</h3><p className="mt-4 whitespace-pre-line leading-8 text-violet-50/72">{section.body}</p></article>)}</div>{report.closing && <p className="mx-auto mt-10 max-w-3xl border-t border-amber-200/15 pt-7 text-center leading-8 text-amber-50/65">{report.closing}</p>}</section>;
}

function CosmicBackground() {
  return <div className="pointer-events-none fixed inset-0"><div className="absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-fuchsia-900/20 blur-[130px]" /><div className="absolute -right-32 top-1/3 h-[520px] w-[520px] rounded-full bg-amber-700/10 blur-[130px]" />{Array.from({ length: 45 }, (_, index) => <span key={index} className="absolute h-1 w-1 rounded-full bg-white" style={{ left: `${(index * 37) % 100}%`, top: `${(index * 61) % 100}%`, opacity: 0.12 + (index % 5) * 0.08 }} />)}</div>;
}
