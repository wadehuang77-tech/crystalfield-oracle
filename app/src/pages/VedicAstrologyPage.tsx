import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  AlertTriangle,
  CircleDollarSign,
  Clock3,
  Briefcase,
  Gem,
  HeartHandshake,
  History,
  Loader2,
  MapPin,
  MoonStar,
  Orbit,
  Route,
  Scale,
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

const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

const NAKSHATRA_ZH: Record<string, string> = {
  Ashwini: '阿濕毗尼', Bharani: '婆羅尼', Krittika: '基栗底柯', Rohini: '婁西尼',
  Mrigashira: '鹿首', Ardra: '阿陀羅', Punarvasu: '復增', Pushya: '普沙', Ashlesha: '阿濕萊沙',
  Magha: '摩伽', Hasta: '哈斯塔', Chitra: '質多羅', Swati: '斯瓦提', Vishakha: '毗舍佉',
  Anuradha: '阿奴羅陀', Jyeshtha: '哲逝陀', Mula: '根本', Shravana: '室羅伐拏',
  Dhanishta: '陀尼須陀', Shatabhisha: '百醫', Satabhisha: '百醫', Revati: '雷瓦蒂',
};

const PAID_OPTIONS = [
  {
    id: 'vedic_complete',
    title: '完整人生地圖',
    subtitle: '9 大印度占星深度解析',
    price: 999,
    icon: Sparkles,
    featured: true,
    description: '一次解鎖前世業力、今生課題、靈魂軸線、愛情婚姻、財富、事業，以及 D9、D10 分盤與未來 3～5 年大運時間軸。',
    bullets: ['九個章節一次完整解鎖', 'D9 與 D10 使用真實分盤資料', '未來 3～5 年結合大運、次週期與當下行運', '用生活語言解讀，不需要先懂占星名詞'],
  },
] as const;

const LIFE_QUESTIONS = [
  {
    number: '01', title: '前世業力', badge: '主打', icon: History,
    prompt: '你帶著什麼來到今生？',
    description: '從羅喉、計都、宮位、星座、宮主星與相關相位，看見熟悉的生命慣性，以及今生真正需要前往的方向。',
    points: ['前世可能累積的生命模式', '反覆出現的關係與課題', '需要離開的舒適圈', '今生需要完成的業力轉化'],
  },
  {
    number: '02', title: '今生的人生課題', badge: '主打', icon: Route,
    prompt: '這一生，我到底來學什麼？',
    description: '整理最容易卡住、越逃避越反覆的模式，找出必須學會的能力，以及完成課題後的人生方向。',
    points: ['靈魂核心課題', '必須學會與放下的模式', '反覆出現的生命考驗', '你的今生核心課題一句話'],
  },
  {
    number: '03', title: '羅喉／計都靈魂軸線', badge: '印度占星核心', icon: Orbit,
    prompt: '我從哪裡來，又要往哪裡去？',
    description: '從計都看熟悉慣性，從羅喉看今生需要勇敢發展的新方向。',
    points: ['靈魂熟悉的能力與慣性', '今生的成長方向', '業力關係的發生領域', '兩端能量的整合方法'],
  },
  {
    number: '04', title: '愛情與婚姻', icon: HeartHandshake,
    prompt: '為什麼總是遇到某一類型的人？',
    description: '看見吸引模式、關係中的業力功課、伴侶傾向，以及較可能出現感情轉折的生命窗口。',
    points: ['容易被什麼類型吸引', '感情中的業力模式', '關係與婚姻的核心功課', '感情能量較強的時間窗口'],
  },
  {
    number: '05', title: '財富模式', icon: CircleDollarSign,
    prompt: '為什麼很努力，財富卻一直留不住？',
    description: '從賺錢能力、金錢恐懼與事業慣性，找出更適合你的財富道路與擴張節奏。',
    points: ['財富模式與賺錢天賦', '容易失財的慣性', '金錢恐懼與執著', '財富較容易擴張的生命階段'],
  },
  {
    number: '06', title: '事業天賦', icon: Briefcase,
    prompt: '我適合如何建立專業與影響力？',
    description: '區分天生能力、工作方式與長期成就路徑，找到更適合自己的事業角色。',
    points: ['隱藏能力與專業優勢', '上班或創業傾向', '適合的負責與領導方式', '最有成就感的事業道路'],
  },
  {
    number: '07', title: 'D9 婚姻／靈魂成熟度', icon: Gem,
    prompt: '關係與歲月，會如何讓我越來越成熟？',
    description: '透過 D9 九分盤觀察承諾、婚姻、內在價值與靈魂經過歲月後展現的成熟品質。',
    points: ['D9 上升與核心成熟方向', '關係中的承諾與價值觀', '金星與月亮的感情需求', '婚姻不同階段的成長課題'],
  },
  {
    number: '08', title: 'D10 事業分盤', icon: Scale,
    prompt: '我如何在現實世界建立事業位置？',
    description: '透過 D10 十分盤觀察職涯成熟、社會責任、領導方式與專業影響力的建立路徑。',
    points: ['D10 上升與職涯角色', '太陽與土星的成就方式', '專業發展與組織位置', '長期可累積的影響力'],
  },
  {
    number: '09', title: '未來 3～5 年大運時間軸', badge: '高價核心', icon: Clock3,
    prompt: '你現在走到人生哪一章？',
    description: '結合大運、次週期與當下行運，整理未來三至五年的轉換、準備與擴張節奏。',
    points: ['目前人生章節', '未來 3～5 年年度節奏', '事業、感情與財富窗口', '適合重大決定的準備期'],
  },
] as const;

type LifeQuestion = {
  number: string;
  title: string;
  badge?: string;
  icon: typeof Sparkles;
  prompt: string;
  description: string;
  points: readonly string[];
};

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
  const [chart, setChart] = useState<VedicChartResponse | null>(() => loadChart());
  const [isCalculating, setIsCalculating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [report, setReport] = useState<VedicReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const restoreRef = useRef(false);
  const [birthHour = '', birthMinute = ''] = form.birthTime.split(':');

  const updateBirthTime = (hour: string, minute: string) => {
    setForm({ ...form, birthTime: `${hour}:${minute}` });
  };

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
    if (!form.birthDate || !/^\d{2}:\d{2}$/.test(form.birthTime) || !form.birthPlace.trim()) {
      setError('請完整填寫出生年月日、出生時間與出生地點');
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
              <div className="grid grid-cols-2 gap-3">
                <select required aria-label="出生小時（24 小時制）" value={birthHour} onChange={(e) => updateBirthTime(e.target.value, birthMinute)} className="vedic-input">
                  <option value="">小時</option>
                  {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')).map((hour) => <option key={hour} value={hour}>{hour} 時</option>)}
                </select>
                <select required aria-label="出生分鐘" value={birthMinute} onChange={(e) => updateBirthTime(birthHour, e.target.value)} className="vedic-input">
                  <option value="">分鐘</option>
                  {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map((minute) => <option key={minute} value={minute}>{minute} 分</option>)}
                </select>
              </div>
              <p className="mt-2 text-xs text-violet-200/45">24 小時制，例如晚上 8:30 請選擇 20 時 30 分。</p>
            </Field>
            <Field label="出生地點" wide>
              <div className="relative"><MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-200/55" /><input type="text" required maxLength={160} placeholder="例如：台北市, 台灣" value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} className="vedic-input pl-12" /></div>
            </Field>
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
            <div className="text-center"><p className="text-sm tracking-[0.3em] text-fuchsia-300/60">完整深度解析</p><h2 id="vedic-deep-heading" className="mt-3 font-serif text-3xl text-white sm:text-5xl">9 大印度占星深度解析</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-violet-100/60">從本命盤、羅喉計都、大運一路深入 D9 婚姻成熟分盤與 D10 事業分盤，建立有別於一般西方占星的完整人生地圖。</p></div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {LIFE_QUESTIONS.map((question) => <LifeQuestionCard key={question.number} {...question} />)}
            </div>
            <div className="mx-auto mt-10 max-w-3xl">
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
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ChartBadge label="上升" value={SIGN_ZH[chart.chart.lagna] || chart.chart.lagna} />
        <ChartBadge label="月亮" value={SIGN_ZH[chart.chart.moonSign] || chart.chart.moonSign} />
        <ChartBadge label="月宿 Nakshatra" value={formatNakshatra(chart.chart.moonNakshatra)} />
        <ChartBadge label="太陽" value={SIGN_ZH[chart.chart.sunSign] || chart.chart.sunSign} />
        <ChartBadge label="目前大運" value={PLANET_ZH[chart.chart.mahaDasha] || chart.chart.mahaDasha} />
        <ChartBadge label="次週期" value={chart.chart.antarDasha ? (PLANET_ZH[chart.chart.antarDasha] || chart.chart.antarDasha) : '計算中'} />
      </div>
      <BirthChart chart={chart.chart} />
      <div className="mt-9 grid gap-5 lg:grid-cols-3">
        <ResultCard number="01" eyebrow="人格原型" title={result.archetype.title} body={result.archetype.body} />
        <ResultCard number="02" eyebrow="今生天賦" title={result.talents.title} body={result.talents.body}><div className="mb-4 flex flex-wrap gap-2">{result.talents.items.slice(0, 1).map((item) => <span key={item} className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-sm text-amber-100">{item}</span>)}</div></ResultCard>
        <ResultCard number="03" eyebrow="行星週期" title={result.currentCycle.title} body={result.currentCycle.body} />
      </div>
    </section>
  );
}

function formatNakshatra(value: string) {
  const name = value.split(/\s+-\s+|\s+Pada\s+/i)[0].trim();
  return `${NAKSHATRA_ZH[name] || name}月宿`;
}

function BirthChart({ chart }: { chart: VedicChartResponse['chart'] }) {
  const lagnaIndex = SIGN_ORDER.indexOf(chart.lagna as typeof SIGN_ORDER[number]);
  return (
    <article className="mx-auto mt-8 max-w-5xl rounded-[1.75rem] border border-amber-300/25 bg-slate-950/55 p-5 shadow-[0_0_45px_rgba(251,191,36,0.08)] sm:p-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.25em] text-amber-300/55">出生盤 · D1 本命盤</p>
        <h3 className="mt-2 font-serif text-2xl text-amber-50">你的印度占星出生盤</h3>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, index) => {
          const house = index + 1;
          const sign = lagnaIndex >= 0 ? SIGN_ORDER[(lagnaIndex + index) % 12] : '';
          const planets = Object.entries(chart.housePlacements)
            .filter(([, planetHouse]) => planetHouse === house)
            .map(([planet]) => PLANET_ZH[planet] || planet);
          return (
            <div key={house} className="min-h-28 rounded-2xl border border-violet-300/15 bg-violet-950/30 p-4">
              <div className="flex items-center justify-between text-xs text-violet-200/45"><span>第 {house} 宮</span>{house === 1 && <span className="text-amber-200">上升</span>}</div>
              <p className="mt-2 font-serif text-lg text-amber-50">{SIGN_ZH[sign] || sign}</p>
              <p className="mt-3 text-sm leading-6 text-fuchsia-100/70">{planets.length ? planets.join('・') : '—'}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-white/35">依拉希里恆星黃道計算；宮位與行星位置供自我探索參考。</p>
    </article>
  );
}

function ChartBadge({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-violet-300/20 bg-violet-950/35 px-4 py-4 text-center"><div className="text-xs uppercase tracking-[0.18em] text-violet-200/45">{label}</div><div className="mt-2 font-serif text-lg text-amber-50">{value}</div></div>;
}

function ResultCard({ number, eyebrow, title, body, children }: { number: string; eyebrow: string; title: string; body: string; children?: React.ReactNode }) {
  return <article className="h-full rounded-[1.75rem] border border-violet-300/20 bg-gradient-to-br from-slate-950/70 to-violet-950/45 p-6 backdrop-blur-md sm:p-8"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-[0.25em] text-fuchsia-300/60">{eyebrow}</span><span className="font-serif text-2xl text-amber-200/35">{number}</span></div><h3 className="mt-4 font-serif text-2xl text-amber-50">{title}</h3><div className="mt-4">{children}</div><p className="leading-8 text-violet-50/72">{body}</p></article>;
}

function LifeQuestionCard({ number, title, badge, icon: Icon, prompt, description, points }: LifeQuestion) {
  return <article className="rounded-[1.75rem] border border-violet-300/20 bg-gradient-to-br from-slate-950/75 to-violet-950/45 p-6 shadow-[0_0_30px_rgba(139,92,246,0.07)] sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-3 text-fuchsia-200"><Icon className="h-5 w-5" /></span><span className="font-serif text-2xl text-amber-200/45">{number}</span></div>{badge && <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">{badge}</span>}</div><h3 className="mt-5 font-serif text-2xl text-amber-50">{title}</h3><p className="mt-3 font-medium text-fuchsia-100/85">{prompt}</p><p className="mt-3 leading-7 text-violet-50/65">{description}</p><ul className="mt-5 grid gap-2 sm:grid-cols-2">{points.map((point) => <li key={point} className="flex gap-2 text-sm leading-6 text-white/55"><Check className="mt-1 h-4 w-4 shrink-0 text-amber-300" />{point}</li>)}</ul><p className="mt-5 border-t border-violet-200/10 pt-4 text-sm text-fuchsia-200/70">🔒 完整解讀收錄於人生地圖</p></article>;
}

function PaidOption(props: typeof PAID_OPTIONS[number] & { loading: boolean; disabled: boolean; onClick: () => void }) {
  const Icon = props.icon;
  return <article className={`relative rounded-[1.75rem] border bg-slate-950/55 p-6 transition hover:-translate-y-1 ${props.featured ? 'border-amber-300/45 shadow-[0_0_40px_rgba(251,191,36,0.12)]' : 'border-violet-300/20 hover:border-fuchsia-300/35'}`}>{props.featured && <span className="absolute right-5 top-5 rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">主打方案</span>}<div className="flex items-start justify-between gap-4"><span className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-3 text-fuchsia-200"><Icon /></span><strong className={`text-xl text-white ${props.featured ? 'mt-10 sm:mt-0' : ''}`}>NT${props.price}</strong></div><h3 className="mt-5 font-serif text-2xl text-amber-50">{props.title}</h3><p className="mt-1 text-sm text-fuchsia-200/70">{props.subtitle}</p><p className="mt-4 min-h-24 leading-7 text-violet-100/60">{props.description}</p><ul className="mt-4 space-y-2">{props.bullets.map((item) => <li key={item} className="flex gap-2 text-sm text-white/60"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{item}</li>)}</ul><button type="button" disabled={props.disabled} onClick={props.onClick} className="mt-6 w-full rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/15 px-4 py-3 font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/25 disabled:opacity-50">{props.loading ? '前往付款中…' : '解鎖這份指引'}</button></article>;
}

function PaidReport({ report }: { report: VedicReport }) {
  return <section id="vedic-paid-report" className="mt-20 scroll-mt-24 rounded-[2rem] border border-amber-300/30 bg-slate-950/65 p-6 shadow-[0_0_60px_rgba(251,191,36,0.1)] sm:p-10">
    <div className="text-center"><MoonStar className="mx-auto h-10 w-10 text-amber-300" /><p className="mt-4 text-sm tracking-[0.3em] text-amber-300/60">已解鎖的深度指引</p><h2 className="mt-3 font-serif text-3xl text-amber-50 sm:text-5xl">{report.title}</h2></div>
    <p className="mx-auto mt-8 max-w-4xl whitespace-pre-line text-lg leading-9 text-violet-50/75">{report.introduction}</p>
    <div className="mx-auto mt-10 max-w-5xl space-y-7">{report.sections.map((section, index) => <article key={`${section.heading}-${index}`} className="rounded-2xl border border-violet-300/15 bg-violet-950/25 p-6 sm:p-8">
      <h3 className="font-serif text-2xl text-amber-100">{section.heading}</h3>
      {section.conclusion ? <>
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/8 p-5"><p className="text-xs font-semibold tracking-[0.18em] text-amber-300/65">一句話結論</p><p className="mt-2 text-lg font-medium leading-8 text-amber-50">{section.conclusion}</p></div>
        {section.analysisBlocks?.length ? <DeepSectionContent section={section} /> : <div className="mt-6 grid gap-5 lg:grid-cols-2"><ReportList title="你的優勢" items={section.strengths} tone="positive" /><ReportList title="弱點／容易踩的坑" items={section.risks} tone="warning" /><ReportList title="現實中可能怎麼發生" items={section.examples} tone="neutral" /><ReportList title="具體改善方法" items={section.actions} tone="action" /></div>}
        {section.transition && <div className="mt-6 grid gap-3 md:grid-cols-3"><TransitionCard label="你過去習慣" text={section.transition.pastPattern} /><TransitionCard label="現在容易卡住" text={section.transition.currentBlock} /><TransitionCard label="未來應發展" text={section.transition.futurePattern} /></div>}
        {section.timeline?.length ? <div className="mt-7 space-y-5"><h4 className="font-serif text-xl text-fuchsia-100">未來 3～5 年大運時間軸</h4><ForecastOverview periods={section.timeline} />{section.timeline.map((period) => <ForecastCard key={period.id} period={period} />)}</div> : null}
        <div className="mt-6 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/8 p-5"><p className="text-xs font-semibold tracking-[0.18em] text-fuchsia-200/65">最適合你的方向</p><p className="mt-2 leading-7 text-violet-50/80">{section.direction}</p></div>
        {!section.reasoningBasis?.length && section.evidence?.length ? <details className="mt-5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/50"><summary className="cursor-pointer text-violet-100/65">查看本段星盤依據</summary><ul className="mt-3 space-y-3">{section.evidence.map((item, evidenceIndex) => <li key={`${item.factor}-${evidenceIndex}`}><strong className="text-violet-100/75">{item.factor}：{item.value}</strong><p className="mt-1 leading-6">{item.relevance}</p></li>)}</ul></details> : null}
      </> : <p className="mt-4 whitespace-pre-line leading-8 text-violet-50/72">{section.body}</p>}
    </article>)}</div>
    {report.closing && <p className="mx-auto mt-10 max-w-3xl border-t border-amber-200/15 pt-7 text-center leading-8 text-amber-50/65">{report.closing}</p>}
  </section>;
}

function ReportList({ title, items = [], tone }: { title: string; items?: string[]; tone: 'positive' | 'warning' | 'neutral' | 'action' }) {
  const colors = tone === 'positive' ? 'border-emerald-300/15 bg-emerald-400/5 text-emerald-100'
    : tone === 'warning' ? 'border-rose-300/15 bg-rose-400/5 text-rose-100'
      : tone === 'action' ? 'border-cyan-300/15 bg-cyan-400/5 text-cyan-100'
        : 'border-violet-300/15 bg-violet-400/5 text-violet-100';
  return <section className={`rounded-2xl border p-5 ${colors}`}><h4 className="font-serif text-lg">{title}</h4><ul className="mt-3 space-y-3">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-white/70">{tone === 'warning' ? <AlertTriangle className="mt-1 h-4 w-4 shrink-0" /> : <Check className="mt-1 h-4 w-4 shrink-0" />}<span>{item}</span></li>)}</ul></section>;
}

function DeepSectionContent({ section }: { section: VedicReport['sections'][number] }) {
  const confidence = section.confidence === 'high' ? '較強' : section.confidence === 'medium' ? '中等' : '有限';
  return <div className="mt-6 space-y-5"><div className="grid gap-4 md:grid-cols-2">{section.analysisBlocks?.map((block, index) => <section key={`${block.label}-${index}`} className={`${index % 3 === 0 ? 'md:col-span-2' : ''} rounded-2xl border border-violet-300/15 bg-white/[0.025] p-5`}><h4 className="font-serif text-lg text-fuchsia-100">{block.label}</h4><p className="mt-2 leading-7 text-white/68">{block.content}</p></section>)}</div>{section.depth && <section className="grid gap-3 md:grid-cols-3"><TransitionCard label="你看到的表面" text={section.depth.surface} /><TransitionCard label="盤裡更深的原因" text={section.depth.deeperCause} /><TransitionCard label="如果持續不改" text={section.depth.unchangedCost} /></section>}{section.d9Evolution && <section className="grid gap-3 md:grid-cols-2"><TransitionCard label="年輕時的關係模式" text={section.d9Evolution.earlyPattern} /><TransitionCard label="成熟後真正重視的事" text={section.d9Evolution.maturePattern} /><TransitionCard label="D1 到 D9 的轉變" text={section.d9Evolution.transition} /><TransitionCard label="長期關係功課" text={section.d9Evolution.relationshipLesson} /></section>}{section.d10Comparison && <section className="grid gap-3 md:grid-cols-2"><TransitionCard label="D1：職涯核心動機" text={section.d10Comparison.natalCareerTheme} /><TransitionCard label="D10：社會角色表現" text={section.d10Comparison.professionalExpression} /><div className="md:col-span-2"><TransitionCard label={`兩者關係：${section.d10Comparison.alignment === 'aligned' ? '方向一致' : section.d10Comparison.alignment === 'conflicted' ? '存在落差' : '部分一致'}`} text={section.d10Comparison.interpretation} /></div></section>}{section.coreTension && <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><h4 className="font-serif text-xl text-amber-100">這一區真正存在的內在拉扯</h4><p className="mt-3 text-white/70">一方面：{section.coreTension.sideA}</p><p className="mt-2 text-white/70">另一方面：{section.coreTension.sideB}</p><p className="mt-3 leading-7 text-white/60">現實影響：{section.coreTension.lifeEffect}</p><p className="mt-2 leading-7 text-amber-50/75">整合方式：{section.coreTension.integration}</p></section>}{section.adjustments?.length ? <section className="space-y-3"><h4 className="font-serif text-xl text-cyan-100">對應命盤模式的調整方法</h4>{section.adjustments.map((item, index) => <div key={`${item.problem}-${index}`} className="rounded-xl border border-cyan-300/15 bg-cyan-400/5 p-4"><p className="font-medium text-white/75">{item.problem}</p><p className="mt-2 text-sm text-white/55">星盤原因：{item.astrologicalCause}</p><p className="mt-1 text-sm text-white/55">生活影響：{item.realLifeEffect}</p><p className="mt-2 text-sm text-cyan-100/80">建議：{item.action}</p></div>)}</section> : null}{section.reasoningBasis?.length ? <details className="rounded-xl border border-white/10 px-4 py-3"><summary className="cursor-pointer text-violet-100/70">為什麼會這樣？・判讀依據：{confidence}</summary><div className="mt-2 text-xs text-white/45">{section.confidenceReason}</div><div className="mt-3 space-y-4">{section.reasoningBasis.map((item, index) => <div key={`${item.factor}-${index}`} className="text-sm leading-6 text-white/55"><strong className="text-violet-100/75">{item.factor}：{item.technicalMeaning}</strong><p className="mt-1">白話意義：{item.lifeMeaning}</p><p>如何形成結論：{item.contribution}</p></div>)}</div></details> : null}</div>;
}

function TransitionCard({ label, text }: { label: string; text: string }) {
  return <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/5 p-4"><p className="text-xs tracking-[0.15em] text-cyan-200/60">{label}</p><p className="mt-2 text-sm leading-6 text-white/70">{text}</p></div>;
}

function ForecastCard({ period }: { period: NonNullable<VedicReport['sections'][number]['timeline']>[number] }) {
  const { interpretation } = period;
  return <article className="rounded-2xl border border-fuchsia-300/20 bg-slate-950/50 p-5 sm:p-6">
    <p className="text-sm text-amber-200/65">{period.analysisStartDate || period.startDate} ～ {period.analysisEndDate || period.endDate}</p>
    <h5 className="mt-2 font-serif text-2xl text-amber-100">{period.displayLabel}</h5>
    <div className="mt-4 rounded-xl border border-violet-300/15 bg-violet-400/5 p-4"><p className="text-xs tracking-[0.15em] text-fuchsia-200/65">這段時間的主題</p><p className="mt-2 text-lg text-violet-50">{interpretation.theme}</p><p className="mt-2 leading-7 text-white/65">{interpretation.overall}</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ScoreStars label="事業" score={interpretation.opportunityScores.career} /><ScoreStars label="財運" score={interpretation.opportunityScores.wealth} /><ScoreStars label="感情" score={interpretation.opportunityScores.relationship} /><ScoreStars label="成長" score={interpretation.opportunityScores.growth} /></div>
    {interpretation.turningPoint.isImportant && <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4"><p className="font-serif text-lg text-amber-100">重要轉折期</p><p className="mt-2 text-sm leading-6 text-white/65">{interpretation.turningPoint.reason}</p></div>}
    {interpretation.annualFocus.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{interpretation.annualFocus.map((item) => <div key={`${period.id}-${item.year}`} className="rounded-xl border border-violet-300/10 bg-violet-400/5 p-4"><p className="font-medium text-fuchsia-100">{item.year} 最重要的是：{item.priority}</p><p className="mt-2 text-xs leading-5 text-white/55">{item.why}</p></div>)}</div> : null}
    <div className="mt-5 grid gap-4 lg:grid-cols-3"><ForecastDomain label="事業" value={interpretation.career} /><ForecastDomain label="財運" value={interpretation.wealth} /><ForecastDomain label="感情" value={interpretation.relationship} /></div>
    <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-400/5 p-4"><p className="font-medium text-cyan-100">個人成長</p><p className="mt-2 text-sm leading-6 text-white/65">{interpretation.growth.trend}</p></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-white/[0.035] p-4"><p className="font-medium text-fuchsia-100">為什麼？・判讀依據：{interpretation.confidence === 'high' ? '較強' : interpretation.confidence === 'medium' ? '中等' : '有限'}</p><p className="mt-1 text-xs text-white/40">{interpretation.confidenceReason}</p><p className="mt-2 text-sm leading-6 text-white/60">{interpretation.why}</p></div><div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-4"><p className="font-medium text-amber-100">一句話提醒</p><p className="mt-2 text-sm leading-6 text-white/70">{interpretation.keyMessage}</p></div></div>
  </article>;
}

function ForecastOverview({ periods }: { periods: NonNullable<VedicReport['sections'][number]['timeline']> }) {
  return <div className="overflow-x-auto rounded-2xl border border-violet-300/15"><table className="min-w-[760px] w-full text-left text-xs"><thead className="bg-violet-400/10 text-violet-100/70"><tr><th className="p-3">時間</th><th className="p-3">大運／次運</th><th className="p-3">主題</th><th className="p-3">事業</th><th className="p-3">財運</th><th className="p-3">感情</th><th className="p-3">策略</th></tr></thead><tbody>{periods.map((period) => <tr key={`overview-${period.id}`} className="border-t border-white/5 text-white/60"><td className="p-3">{period.analysisStartDate || period.startDate}<br />～ {period.analysisEndDate || period.endDate}</td><td className="p-3 text-amber-100/80">{period.displayLabel}</td><td className="max-w-48 p-3">{period.interpretation.theme}</td><td className="p-3">{period.interpretation.opportunityScores.career}／5</td><td className="p-3">{period.interpretation.opportunityScores.wealth}／5</td><td className="p-3">{period.interpretation.opportunityScores.relationship}／5</td><td className="max-w-52 p-3">{period.interpretation.keyMessage}</td></tr>)}</tbody></table></div>;
}

function ForecastDomain({ label, value }: { label: string; value: { trend: string; advice: string[]; avoid: string[] } }) {
  return <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><h6 className="font-serif text-lg text-fuchsia-100">{label}</h6><p className="mt-2 text-sm leading-6 text-white/65">{value.trend}</p><p className="mt-4 text-xs font-medium text-emerald-200/80">最適合做</p><ul className="mt-2 space-y-2">{value.advice.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-white/60"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />{item}</li>)}</ul><p className="mt-4 text-xs font-medium text-rose-200/80">最需要避免</p><ul className="mt-2 space-y-2">{value.avoid.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-white/60"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />{item}</li>)}</ul></section>;
}

function ScoreStars({ label, score }: { label: string; score: number }) {
  return <div className="rounded-xl border border-amber-300/10 bg-amber-300/5 p-3 text-center"><p className="text-xs text-white/50">{label}</p><p className="mt-1 tracking-wider text-amber-300" aria-label={`${label} ${score} 星`}>{'★'.repeat(score)}<span className="text-white/15">{'★'.repeat(5 - score)}</span></p></div>;
}

function CosmicBackground() {
  return <div className="pointer-events-none fixed inset-0"><div className="absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-fuchsia-900/20 blur-[130px]" /><div className="absolute -right-32 top-1/3 h-[520px] w-[520px] rounded-full bg-amber-700/10 blur-[130px]" />{Array.from({ length: 45 }, (_, index) => <span key={index} className="absolute h-1 w-1 rounded-full bg-white" style={{ left: `${(index * 37) % 100}%`, top: `${(index * 61) % 100}%`, opacity: 0.12 + (index % 5) * 0.08 }} />)}</div>;
}
