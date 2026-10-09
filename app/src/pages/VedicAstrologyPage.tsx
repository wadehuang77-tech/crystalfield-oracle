import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
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
  type VedicReportProgress,
  type VedicReview,
} from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';
import VedicAstrologySeoContent from './VedicAstrologySeoContent';
import { getLanguageFromPath, t } from '../lib/i18n';
import { useAuth } from '../contexts/AuthContext';
import { calculationLoginRedirect } from '../lib/authLocale';
import { AuthRequiredBirthDate } from '../components/AuthRequiredBirthDate';
import { pollVedicReport, terminalReport, persistedReportTimings } from '../lib/vedicReportPolling';
import { VedicChartCore, VedicProgressiveReport } from '../components/VedicReportProgress';
import { englishVedicFreeResults } from '../lib/vedicFreeReading';
import { VEDIC_LIFE_QUESTIONS_EN, VEDIC_PAID_OPTION_EN } from '../lib/vedicEnglishCopy';

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

const PLANET_EN: Record<string, string> = {
  Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter',
  Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu',
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
    price: 699,
    originalPrice: 999,
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

function saveChart(chart: VedicChartResponse, userId: string, visibleAt?: number) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ chart, userId, visibleAt }));
}

function loadChart(userId: string): { chart: VedicChartResponse; visibleAt?: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { chart?: VedicChartResponse; userId?: string; visibleAt?: number };
    if (parsed.userId !== userId || !parsed.chart?.chart_id || !parsed.chart.chart_token) return null;
    return { chart: parsed.chart, visibleAt: parsed.visibleAt };
  } catch {
    return null;
  }
}

export default function VedicAstrologyPage() {
  const { user, loading: authLoading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const language = getLanguageFromPath(location.pathname);
  const copy = (key: string, fallback: string) => language === 'en' ? t(`vedic.${key}`, language) : fallback;
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ birthDate: '', birthTime: '', birthPlace: '' });
  const [chart, setChart] = useState<VedicChartResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [report, setReport] = useState<VedicReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportProgress, setReportProgress] = useState<VedicReportProgress | null>(null);
  const [progressReconnecting, setProgressReconnecting] = useState(false);
  const [progressRefresh, setProgressRefresh] = useState(0);
  const [retryingSection, setRetryingSection] = useState<string | null>(null);
  const [error, setError] = useState('');
  const chartVisibleAt = useRef<{ chartId: string; epochMs: number } | null>(null);
  const progressContext = useRef('');
  const timingMarks = useRef(new Set<string>());
  const returnOrderId = searchParams.get('order_id');
  const returnOrderToken = searchParams.get('order_token');
  const currentChartId = chart?.chart_id;
  const currentChartToken = chart?.chart_token;
  const currentUserId = user?.id;
  const visibleReportContext = `${currentUserId}:${returnOrderId}:${language}:${currentChartId ?? ''}`;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      sessionStorage.removeItem(SESSION_KEY);
      setChart(null);
      setReport(null);
      setReportProgress(null);
      setReportLoading(false);
      setReportError('');
      setProgressReconnecting(false);
      setRetryingSection(null);
      progressContext.current = '';
      chartVisibleAt.current = null;
      return;
    }
    const saved = loadChart(user.id);
    setChart(saved?.chart ?? null);
    chartVisibleAt.current = saved?.visibleAt ? { chartId: saved.chart.chart_id, epochMs: saved.visibleAt } : null;
  }, [authLoading, user]);
  const [birthHour = '', birthMinute = ''] = form.birthTime.split(':');

  useEffect(() => {
    if (chart) {
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow');
    }
  }, [chart]);

  const updateBirthTime = (hour: string, minute: string) => {
    setForm({ ...form, birthTime: `${hour}:${minute}` });
  };

  useEffect(() => {
    const orderId = returnOrderId;
    const orderToken = returnOrderToken;
    if (authLoading || !currentUserId || !orderId || !orderToken) return;
    let cancelled = false;
    const controller = new AbortController();
    let stopPolling: (() => void) | undefined;
    const receive = (value: VedicReportProgress) => {
      if (cancelled) return;
      setReportProgress(value);
      setProgressReconnecting(false);
      setReportLoading(!terminalReport(value.reportStatus));
      setReportError('');
      const visible = chartVisibleAt.current;
      if (visible && visible.chartId === value.chartId) {
        for (const metric of persistedReportTimings(value, visible.epochMs)) {
          const key = `${language}:${metric.metric}`;
          if (!timingMarks.current.has(key)) {
            timingMarks.current.add(key);
            console.info('[vedic-ux-timing]', metric);
          }
        }
      }
    };
    const begin = async () => {
      try {
        setReportLoading(true);
        let value = await vedicAstrologyApi.findReportProgress(orderId, language, controller.signal);
        if (cancelled) return;
        if (currentChartId && value.chartId && currentChartId !== value.chartId) {
          throw new Error('REPORT_CHART_MISMATCH');
        }
        if (value.needsStart || value.legacy) {
          const result = await vedicAstrologyApi.getPaidReport({
            chart_id: currentChartId, chart_token: currentChartToken, order_id: orderId, order_token: orderToken,
          }, controller.signal);
          if (cancelled) return;
          if (value.legacy) {
            if (!result.report) throw new Error('Report unavailable');
            setReport(result.report);
            setReportLoading(false);
            return;
          }
          if (!result.progressive) throw new Error('Report status unavailable');
          value = result.progressive;
        }
        receive(value);
        if (value.reportId && !terminalReport(value.reportStatus)) {
          const id = value.reportId;
          stopPolling = pollVedicReport(signal => vedicAstrologyApi.getReportProgress(id, language, signal), receive,
            () => setProgressReconnecting(true), { hidden: () => document.hidden });
        }
      } catch {
        if (!cancelled) setReportError(language === 'en' ? 'The authorized report could not be retrieved. Please try again.' : '暫時無法取得已解鎖報告，請稍後再試。');
      } finally {
        if (!cancelled && !stopPolling) setReportLoading(false);
      }
    };
    const startTimer = window.setTimeout(() => {
      if (cancelled) return;
      const context = `${currentUserId}:${orderId}:${language}:${currentChartId ?? ''}`;
      if (progressContext.current !== context) {
        setReport(null);
        setReportProgress(null);
        setProgressReconnecting(false);
        setRetryingSection(null);
        progressContext.current = context;
      }
      setReportError('');
      void begin();
    }, 0);
    return () => {
      cancelled = true;
      controller.abort();
      stopPolling?.();
      window.clearTimeout(startTimer);
    };
  }, [authLoading, currentUserId, currentChartId, currentChartToken, language, returnOrderId, returnOrderToken, progressRefresh]);

  const retrySection = async (section: number, key: string) => {
    if (!reportProgress?.reportId || retryingSection) return;
    const context = progressContext.current;
    setRetryingSection(key);
    try {
      const value = await vedicAstrologyApi.retrySection(reportProgress.reportId, section, language);
      if (progressContext.current !== context) return;
      setReportProgress(value);
      setProgressRefresh(value => value + 1);
    } catch {
      if (progressContext.current === context) setReportError(language === 'en' ? 'This section could not be retried.' : '此段解析暫時無法重試。');
    } finally {
      if (progressContext.current === context) setRetryingSection(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (authLoading) return;
    if (authError) {
      setError(language === 'en' ? 'We could not verify your sign-in status. Please try again.' : '目前無法確認登入狀態，請重試。');
      return;
    }
    if (!form.birthPlace.trim()) {
      setError(language === 'en' ? 'Enter your birthplace.' : '未填出生地點');
      return;
    }
    if (!form.birthDate || !/^\d{2}:\d{2}$/.test(form.birthTime) || !form.birthPlace.trim()) {
      setError(language === 'en' ? 'Complete your date of birth, birth time, and birthplace.' : '請完整填寫出生年月日、出生時間與出生地點');
      return;
    }
    const loginUrl = calculationLoginRedirect(!!user, location.pathname, location.search, location.hash);
    if (loginUrl) {
      navigate(loginUrl);
      return;
    }
    if (!user) return;
    setError('');
    setIsCalculating(true);
    setReport(null);
    setReportProgress(null);
    const submittedAt = performance.now();
    try {
      const result = await vedicAstrologyApi.createChart({
        birth_date: form.birthDate,
        birth_time: form.birthTime,
        birth_place: form.birthPlace.trim(),
        consent: true,
      });
      setChart(result);
      saveChart(result, user.id);
      requestAnimationFrame(() => {
        const visibleAt = Date.now();
        chartVisibleAt.current = { chartId: result.chart_id, epochMs: visibleAt };
        saveChart(result, user.id, visibleAt);
        timingMarks.current.clear();
        console.info('[vedic-ux-timing]', { metric: 'T1', elapsedMs: Math.round(performance.now() - submittedAt) });
      });
      window.setTimeout(() => document.getElementById('vedic-free-results')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : language === 'en' ? 'Chart calculation failed. Please try again later.' : '星盤計算失敗，請稍後再試');
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
      if (!result.ecpay) throw new Error(language === 'en' ? 'Checkout details are missing. Please try again.' : '結帳資料缺失，請重試');
      submitToEcpay(result.ecpay, () => {
        setError(language === 'en' ? 'Could not open the payment page. Please try again later.' : '跳轉至付款頁失敗，請稍後再試');
        setCheckoutLoading('');
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : language === 'en' ? 'Could not create the order.' : '無法建立訂單');
      setCheckoutLoading('');
    }
  };

  const visibleProgress = progressContext.current === visibleReportContext ? reportProgress : null;
  const visibleReport = progressContext.current === visibleReportContext ? report : null;
  const chartUnlocked = !!visibleReport || (!!visibleProgress && visibleProgress.chartId === currentChartId);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070312] text-white">
      <CosmicBackground />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6">
        <section className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-medium tracking-[0.28em] text-amber-200/75">{copy('eyebrow', '印度占星｜靈魂業力人生地圖')}</p>
          <h1 className="font-serif text-4xl leading-tight text-amber-50 sm:text-6xl">{copy('title', '印度占星出生盤｜探索前世業力與人生藍圖')}</h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-9 text-violet-100/80">
            {copy('description', '探索印度占星與吠陀占星，了解上升星座、九曜行星、月宿、前世業力、婚姻、事業、財富及未來大運。輸入出生資料，建立個人印度占星出生盤，並可解鎖 AI 深度解析。')}
          </p>
        </section>

        {reportLoading && !reportProgress && <p role="status" className="mt-6 text-center text-violet-100">{language === 'en' ? 'Retrieving your authorized reading…' : '正在取得已解鎖解析…'}</p>}
        {reportError && <div role="alert" className="mx-auto mt-6 max-w-5xl rounded-xl border border-rose-300/30 p-5 text-rose-100"><p>{reportError}</p><button type="button" onClick={() => setProgressRefresh(value => value + 1)} className="mt-3 rounded-lg border border-white/20 px-4 py-2">{language === 'en' ? 'Retrieve saved progress' : '重新取得已保存進度'}</button></div>}
        {visibleProgress && <VedicProgressiveReport progress={visibleProgress} language={language} onRetry={(section, key) => void retrySection(section, key)} retrying={retryingSection} reconnecting={progressReconnecting} />}

        <section className="mx-auto mt-12 max-w-3xl rounded-[2rem] border border-amber-300/25 bg-slate-950/55 p-6 shadow-[0_0_70px_rgba(168,85,247,0.16)] backdrop-blur-xl sm:p-10">
          <div className="mb-7 flex items-center gap-3">
            <span className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-200"><Orbit /></span>
            <div><h2 className="font-serif text-2xl text-amber-50">{copy('formTitle', '輸入你的出生座標')}</h2><p className="mt-1 text-sm text-violet-200/55">{copy('accuracy', '出生時間越準確，上升與宮位判讀越可靠。')}</p></div>
          </div>
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <Field label={copy('birthDate', '出生年月日')}>
              <AuthRequiredBirthDate>
                <input type="date" required value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="vedic-input" />
              </AuthRequiredBirthDate>
            </Field>
            <Field label={copy('birthTime', '出生時間')}>
              <div className="grid grid-cols-2 gap-3">
                <select required aria-label={copy('birthHour', '出生小時（24 小時制）')} value={birthHour} onChange={(e) => updateBirthTime(e.target.value, birthMinute)} className="vedic-input">
                  <option value="">{copy('birthHour', '小時')}</option>
                  {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')).map((hour) => <option key={hour} value={hour}>{language === 'en' ? `${hour} hr` : `${hour} 時`}</option>)}
                </select>
                <select required aria-label={copy('birthMinute', '出生分鐘')} value={birthMinute} onChange={(e) => updateBirthTime(birthHour, e.target.value)} className="vedic-input">
                  <option value="">{copy('birthMinute', '分鐘')}</option>
                  {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map((minute) => <option key={minute} value={minute}>{language === 'en' ? `${minute} min` : `${minute} 分`}</option>)}
                </select>
              </div>
              <p className="mt-2 text-xs text-violet-200/45">{copy('timeHint', '24 小時制，例如晚上 8:30 請選擇 20 時 30 分。')}</p>
            </Field>
            <Field label={copy('birthPlace', '出生地點')} wide>
              <div className="relative"><MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-200/55" /><input type="text" required aria-required="true" aria-invalid={error === '未填出生地點'} maxLength={160} placeholder={copy('placePlaceholder', '例如：台北市, 台灣')} value={form.birthPlace} onInvalid={(event) => { event.currentTarget.setCustomValidity(copy('cityError', '未填出生地點')); setError(copy('cityError', '未填出生地點')); }} onInput={(event) => event.currentTarget.setCustomValidity('')} onChange={(e) => { setForm({ ...form, birthPlace: e.target.value }); if (error === '未填出生地點') setError(''); }} className="vedic-input pl-12" /></div>
              <p className={`mt-2 text-xs ${error === '未填出生地點' ? 'text-rose-200' : 'text-violet-200/45'}`}>{copy('placeRequired', '必填，請輸入城市與國家／地區。')}</p>
            </Field>
            {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 sm:col-span-2">{error}</p>}
            <button type="submit" disabled={isCalculating || authLoading} aria-disabled={isCalculating || authLoading || !form.birthPlace.trim()} className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-fuchsia-500 to-violet-600 px-6 py-4 font-semibold shadow-[0_0_32px_rgba(217,70,239,0.28)] transition disabled:opacity-60 sm:col-span-2 ${!form.birthPlace.trim() ? 'cursor-not-allowed opacity-55' : 'hover:brightness-110'}`}>
              {isCalculating ? <><Loader2 className="animate-spin" />{copy('calculating', '正在連結出生星盤…')}</> : <><Stars />{copy('calculate', '開啟我的靈魂業力地圖')}</>}
            </button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-white/35">{copy('disclaimer', '本服務用於自我探索與娛樂參考，不代替醫療、法律、財務或心理專業意見。')}</p>
        </section>

        <VedicAstrologySeoContent />

        {chart && <>
          <div role="status" className="mx-auto mt-10 max-w-5xl rounded-xl border border-amber-300/20 p-4 text-amber-100">
            {language === 'en' ? 'Birth chart calculation complete ✓' : '出生盤計算完成 ✓'} · {chartUnlocked
              ? visibleProgress && !terminalReport(visibleProgress.reportStatus)
                ? language === 'en' ? 'Your in-depth AI reading is being generated' : 'AI 深度解析產生中'
                : language === 'en' ? 'Your unlocked reading is available below' : '已解鎖解析顯示於下方'
              : language === 'en' ? 'In-depth interpretation awaits unlock' : '深度解析待解鎖'}
          </div>
          <FreeResults chart={chart} language={language} />
          <VedicChartCore chart={chart.chart} language={language} />
        </>}

        {chart && (
          <section className="mt-20" aria-labelledby="vedic-deep-heading">
            <div className="text-center"><p className="text-sm tracking-[0.3em] text-fuchsia-300/60">{copy('deepEyebrow', '完整深度解析')}</p><h2 id="vedic-deep-heading" className="mt-3 font-serif text-3xl text-white sm:text-5xl">{copy('deepTitle', '9 大印度占星深度解析')}</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-violet-100/60">{copy('deepDescription', '從本命盤、羅喉計都、大運一路深入 D9 婚姻成熟分盤與 D10 事業分盤，建立有別於一般西方占星的完整人生地圖。')}</p></div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {LIFE_QUESTIONS.map((question) => <LifeQuestionCard key={question.number} {...question} language={language} />)}
            </div>
            <div className="mx-auto mt-10 max-w-3xl">
              {PAID_OPTIONS.map((option) => <PaidOption key={option.id} {...option} loading={checkoutLoading === option.id} disabled={!!checkoutLoading} onClick={() => void checkout(option.id)} language={language} />)}
            </div>
          </section>
        )}

        {visibleProgress?.reportStatus === 'completed' && returnOrderId && returnOrderToken &&
          <VedicReviewForm orderId={returnOrderId} orderToken={returnOrderToken} language={language} />}
        {visibleReport && returnOrderId && returnOrderToken && <PaidReport report={visibleReport} orderId={returnOrderId} orderToken={returnOrderToken} language={language} />}
        <PublicVedicReviews language={language} />
      </main>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-2 block text-sm font-medium text-amber-100/80">{label}</span>{children}</label>;
}

export function FreeResults({ chart, language }: { chart: VedicChartResponse; language: 'zh-Hant' | 'en' }) {
  const result = language === 'en' ? englishVedicFreeResults(chart.chart) : chart.free_results;
  const isEnglish = language === 'en';
  const translatePlanet = (value: string | undefined) => value ? (isEnglish ? PLANET_EN[value] || value : PLANET_ZH[value] || value) : '';
  return (
    <section id="vedic-free-results" className="mt-20 scroll-mt-24">
      <div className="text-center"><p className="text-sm tracking-[0.3em] text-amber-300/60">{isEnglish ? 'Free Soul Map' : '免費靈魂地圖'}</p><h2 className="mt-3 font-serif text-3xl text-amber-50 sm:text-5xl">{isEnglish ? 'Your Free Vedic Astrology Guidance' : '你的免費印度占星指引'}</h2><p className="mt-4 text-sm text-violet-100/55">{isEnglish ? 'Professional ephemeris calculation · Lahiri sidereal zodiac' : '專業星曆計算 · 拉希里恆星黃道'}</p></div>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ChartBadge label={isEnglish ? 'Ascendant' : '上升'} value={isEnglish ? chart.chart.lagna : SIGN_ZH[chart.chart.lagna] || chart.chart.lagna} />
        <ChartBadge label={isEnglish ? 'Moon' : '月亮'} value={isEnglish ? chart.chart.moonSign : SIGN_ZH[chart.chart.moonSign] || chart.chart.moonSign} />
        <ChartBadge label={isEnglish ? 'Nakshatra' : '月宿 Nakshatra'} value={formatNakshatra(chart.chart.moonNakshatra, language)} />
        <ChartBadge label={isEnglish ? 'Sun' : '太陽'} value={isEnglish ? chart.chart.sunSign : SIGN_ZH[chart.chart.sunSign] || chart.chart.sunSign} />
        <ChartBadge label={isEnglish ? 'Current Dasha' : '目前大運'} value={translatePlanet(chart.chart.mahaDasha)} />
        <ChartBadge label={isEnglish ? 'Sub-period' : '次週期'} value={chart.chart.antarDasha ? translatePlanet(chart.chart.antarDasha) : isEnglish ? 'Calculating' : '計算中'} />
      </div>
      <BirthChart chart={chart.chart} language={language} />
      <div className="mt-9 grid gap-5 lg:grid-cols-3">
        <ResultCard number="01" eyebrow={isEnglish ? 'Archetype' : '人格原型'} title={result.archetype.title} body={result.archetype.body} />
        <ResultCard number="02" eyebrow={isEnglish ? 'Gifts in This Life' : '今生天賦'} title={result.talents.title} body={result.talents.body}><div className="mb-4 flex flex-wrap gap-2">{result.talents.items.slice(0, 1).map((item) => <span key={item} className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-sm text-amber-100">{item}</span>)}</div></ResultCard>
        <ResultCard number="03" eyebrow={isEnglish ? 'Planetary Cycle' : '行星週期'} title={result.currentCycle.title} body={result.currentCycle.body} />
      </div>
    </section>
  );
}

function formatNakshatra(value: string, language: 'zh-Hant' | 'en') {
  const name = value.split(/\s+-\s+|\s+Pada\s+/i)[0].trim();
  return language === 'en' ? `${name} Nakshatra` : `${NAKSHATRA_ZH[name] || name}月宿`;
}

function BirthChart({ chart, language }: { chart: VedicChartResponse['chart']; language: 'zh-Hant' | 'en' }) {
  const isEnglish = language === 'en';
  const lagnaIndex = SIGN_ORDER.indexOf(chart.lagna as typeof SIGN_ORDER[number]);
  return (
    <article className="mx-auto mt-8 max-w-5xl rounded-[1.75rem] border border-amber-300/25 bg-slate-950/55 p-5 shadow-[0_0_45px_rgba(251,191,36,0.08)] sm:p-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.25em] text-amber-300/55">{isEnglish ? 'Birth Chart · D1 Natal Chart' : '出生盤 · D1 本命盤'}</p>
        <h3 className="mt-2 font-serif text-2xl text-amber-50">{isEnglish ? 'Your Vedic Birth Chart' : '你的印度占星出生盤'}</h3>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, index) => {
          const house = index + 1;
          const sign = lagnaIndex >= 0 ? SIGN_ORDER[(lagnaIndex + index) % 12] : '';
          const planets = Object.entries(chart.housePlacements)
            .filter(([, planetHouse]) => planetHouse === house)
            .map(([planet]) => isEnglish ? PLANET_EN[planet] || planet : PLANET_ZH[planet] || planet);
          return (
            <div key={house} className="min-h-28 rounded-2xl border border-violet-300/15 bg-violet-950/30 p-4">
              <div className="flex items-center justify-between text-xs text-violet-200/45"><span>{isEnglish ? `House ${house}` : `第 ${house} 宮`}</span>{house === 1 && <span className="text-amber-200">{isEnglish ? 'Ascendant' : '上升'}</span>}</div>
              <p className="mt-2 font-serif text-lg text-amber-50">{isEnglish ? sign : SIGN_ZH[sign] || sign}</p>
              <p className="mt-3 text-sm leading-6 text-fuchsia-100/70">{planets.length ? planets.join(isEnglish ? ' · ' : '・') : '—'}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-white/35">{isEnglish ? 'Calculated with the Lahiri sidereal zodiac; house and planetary positions are provided for self-reflection.' : '依拉希里恆星黃道計算；宮位與行星位置供自我探索參考。'}</p>
    </article>
  );
}

function ChartBadge({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-violet-300/20 bg-violet-950/35 px-4 py-4 text-center"><div className="text-xs uppercase tracking-[0.18em] text-violet-200/45">{label}</div><div className="mt-2 font-serif text-lg text-amber-50">{value}</div></div>;
}

function ResultCard({ number, eyebrow, title, body, children }: { number: string; eyebrow: string; title: string; body: string; children?: React.ReactNode }) {
  return <article className="h-full rounded-[1.75rem] border border-violet-300/20 bg-gradient-to-br from-slate-950/70 to-violet-950/45 p-6 backdrop-blur-md sm:p-8"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-[0.25em] text-fuchsia-300/60">{eyebrow}</span><span className="font-serif text-2xl text-amber-200/35">{number}</span></div><h3 className="mt-4 font-serif text-2xl text-amber-50">{title}</h3><div className="mt-4">{children}</div><p className="leading-8 text-violet-50/72">{body}</p></article>;
}

export function LifeQuestionCard(props: LifeQuestion & { language: 'zh-Hant' | 'en' }) {
  const { number, title, badge, icon: Icon, prompt, description, points, language } = props.language === 'en'
    ? { ...props, ...VEDIC_LIFE_QUESTIONS_EN[props.number] } : props;
  return <article className="rounded-[1.75rem] border border-violet-300/20 bg-gradient-to-br from-slate-950/75 to-violet-950/45 p-6 shadow-[0_0_30px_rgba(139,92,246,0.07)] sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-3 text-fuchsia-200"><Icon className="h-5 w-5" /></span><span className="font-serif text-2xl text-amber-200/45">{number}</span></div>{badge && <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">{language === 'en' ? ({ '主打': 'Featured', '印度占星核心': 'Vedic Core', '高價核心': 'Premium Core' } as Record<string, string>)[badge] || badge : badge}</span>}</div><h3 className="mt-5 font-serif text-2xl text-amber-50">{title}</h3><p className="mt-3 font-medium text-fuchsia-100/85">{prompt}</p><p className="mt-3 leading-7 text-violet-50/65">{description}</p><ul className="mt-5 grid gap-2 sm:grid-cols-2">{points.map((point) => <li key={point} className="flex gap-2 text-sm leading-6 text-white/55"><Check className="mt-1 h-4 w-4 shrink-0 text-amber-300" />{point}</li>)}</ul><p className="mt-5 border-t border-violet-200/10 pt-4 text-sm text-fuchsia-200/70">{language === 'en' ? '🔒 Full interpretation included in the life map' : '🔒 完整解讀收錄於人生地圖'}</p></article>;
}

export function PaidOption(input: {
  id: string; title: string; subtitle: string; price: number; originalPrice: number;
  icon: typeof Sparkles; featured: boolean; description: string; bullets: readonly string[];
  loading: boolean; disabled: boolean; onClick: () => void; language: 'zh-Hant' | 'en';
}) {
  const props = input.language === 'en' ? { ...input, ...VEDIC_PAID_OPTION_EN } : input;
  const Icon = props.icon;
  return <article className={`relative rounded-[1.75rem] border bg-slate-950/55 p-6 transition hover:-translate-y-1 ${props.featured ? 'border-amber-300/45 shadow-[0_0_40px_rgba(251,191,36,0.12)]' : 'border-violet-300/20 hover:border-fuchsia-300/35'}`}>{props.featured && <span className="absolute right-5 top-5 rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">{props.language === 'en' ? 'Featured' : '主打方案'}</span>}<div className="flex items-start justify-between gap-4"><span className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-3 text-fuchsia-200"><Icon /></span><div className={`text-right ${props.featured ? 'mt-10 sm:mt-0' : ''}`}><span className="block text-xs text-amber-200/70">{props.language === 'en' ? 'Introductory price' : '體驗價'}</span><strong className="text-xl text-white">NT${props.price}</strong><span className="ml-2 text-sm text-white/35 line-through">{props.language === 'en' ? 'Regular' : '原價'} NT${props.originalPrice}</span></div></div><h3 className="mt-5 font-serif text-2xl text-amber-50">{props.title}</h3><p className="mt-1 text-sm text-fuchsia-200/70">{props.subtitle}</p><p className="mt-4 min-h-24 leading-7 text-violet-100/60">{props.description}</p><ul className="mt-4 space-y-2">{props.bullets.map((item) => <li key={item} className="flex gap-2 text-sm text-white/60"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{item}</li>)}</ul><button type="button" disabled={props.disabled} onClick={props.onClick} className="mt-6 w-full rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/15 px-4 py-3 font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/25 disabled:opacity-50">{props.loading ? (props.language === 'en' ? 'Opening checkout…' : '前往付款中…') : (props.language === 'en' ? 'Unlock this guidance' : '解鎖這份指引')}</button></article>;
}

function PaidReport({ report, orderId, orderToken, language }: { report: VedicReport; orderId: string; orderToken: string; language: 'zh-Hant' | 'en' }) {
  const isEnglish = language === 'en';
  return <section id="vedic-paid-report" className="mt-20 scroll-mt-24 rounded-[2rem] border border-amber-300/30 bg-slate-950/65 p-6 shadow-[0_0_60px_rgba(251,191,36,0.1)] sm:p-10">
    <div className="text-center"><MoonStar className="mx-auto h-10 w-10 text-amber-300" /><p className="mt-4 text-sm tracking-[0.3em] text-amber-300/60">{isEnglish ? 'Unlocked In-Depth Guidance' : '已解鎖的深度指引'}</p><h2 className="mt-3 font-serif text-3xl text-amber-50 sm:text-5xl">{report.title}</h2></div>
    <p className="mx-auto mt-8 max-w-4xl whitespace-pre-line text-lg leading-9 text-violet-50/75">{report.introduction}</p>
    <div className="mx-auto mt-10 max-w-5xl space-y-7">{report.sections.map((section, index) => <article key={`${section.heading}-${index}`} className="rounded-2xl border border-violet-300/15 bg-violet-950/25 p-6 sm:p-8">
      <h3 className="font-serif text-2xl text-amber-100">{section.heading}</h3>
      <p className="mt-5 whitespace-pre-line text-base leading-8 text-violet-50/78 sm:text-lg sm:leading-9">{section.consultation}</p>
      {section.timeline?.length ? <div className="mt-8 space-y-5"><h4 className="font-serif text-xl text-fuchsia-100">{isEnglish ? 'Three-to-Five-Year Dasha Timeline' : '未來 3～5 年大運時間軸'}</h4><ForecastOverview periods={section.timeline} language={language} />{section.timeline.map((period) => <ForecastCard key={period.id} period={period} language={language} />)}</div> : null}
      {section.evidence.length ? <EvidenceDetails evidence={section.evidence} language={language} /> : null}
    </article>)}</div>
    {report.closing && <p className="mx-auto mt-10 max-w-3xl border-t border-amber-200/15 pt-7 text-center leading-8 text-amber-50/65">{report.closing}</p>}
    <VedicReviewForm orderId={orderId} orderToken={orderToken} language={language} />
  </section>;
}

const ACCURACY_OPTIONS = [
  ['very_inaccurate', '很不符合'], ['partly_accurate', '部分符合'], ['mostly_accurate', '大致準確'],
  ['very_accurate', '非常準確'], ['exactly_me', '像在說我本人'],
] as const;
const RESONANCE_OPTIONS = [
  ['past_karma', '前世業力'], ['life_lesson', '今生人生課題'], ['soul_mission', '靈魂使命'],
  ['talents', '天賦與能力'], ['relationship', '感情與關係'], ['career', '工作與事業'],
  ['wealth', '財富與金錢'], ['spiritual_growth', '靈性成長'], ['future_timeline', '未來 3～5 年'],
] as const;

function VedicReviewForm({ orderId, orderToken, language }: { orderId: string; orderToken: string; language: 'zh-Hant' | 'en' }) {
  const isEnglish = language === 'en';
  const [rating, setRating] = useState(0); const [accuracy, setAccuracy] = useState('');
  const [sections, setSections] = useState<string[]>([]); const [content, setContent] = useState('');
  const [allowPublic, setAllowPublic] = useState(false); const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState('');
  useEffect(() => { let active = true; vedicAstrologyApi.getReview({ order_id: orderId, order_token: orderToken }).then(({ review }) => {
    if (!active || !review) return; setRating(review.rating); setAccuracy(review.accuracyRating); setSections(review.mostResonantSections); setContent(review.reviewContent); setAllowPublic(review.allowPublic); setSaved(true);
  }).catch(() => {}).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [orderId, orderToken]);
  const submitReview = async (event: FormEvent) => { event.preventDefault(); setMessage('');
    if (!rating || !accuracy || content.trim().length < 10) { setMessage(isEnglish ? 'Please complete the rating, accuracy selection, and a review of at least 10 characters.' : '請完成星級、精準度與至少 10 字心得。'); return; }
    setLoading(true); try { await vedicAstrologyApi.saveReview({ order_id: orderId, order_token: orderToken, rating, accuracy_rating: accuracy, most_resonant_sections: sections, review_content: content.trim(), allow_public: allowPublic }); setSaved(true); setMessage(isEnglish ? 'Thank you for your feedback ❤️' : '感謝你的回饋 ❤️'); } catch (e) { setMessage(e instanceof Error ? e.message : isEnglish ? 'Could not submit your review.' : '送出失敗'); } finally { setLoading(false); }
  };
  return <form onSubmit={submitReview} className="mx-auto mt-12 max-w-4xl rounded-2xl border border-fuchsia-300/20 bg-violet-950/30 p-6 sm:p-8">
    <h3 className="text-center font-serif text-2xl text-amber-50">{isEnglish ? 'Was this Vedic astrology report helpful?' : '這份印度占星報告對你有幫助嗎？'}</h3>
    <p className="mt-2 text-center text-sm text-violet-100/55">{saved ? (isEnglish ? 'Thank you for your feedback ❤️ You can update it at any time.' : '感謝你的回饋 ❤️，你可以隨時修改。') : (isEnglish ? 'We welcome your honest reflection.' : '歡迎留下真實感受。')}</p>
    <div className="mt-6 flex justify-center gap-2" role="radiogroup" aria-label={isEnglish ? 'Rating' : '評分'}>{[1,2,3,4,5].map((star) => <button key={star} type="button" role="radio" aria-checked={rating === star} onClick={() => setRating(star)} className={`text-4xl transition ${star <= rating ? 'text-amber-300' : 'text-white/20'}`}>★</button>)}</div>
    <label className="mt-7 block text-sm text-amber-100">{isEnglish ? 'How accurately did this reading reflect your life?' : '你覺得這份分析與你的實際人生符合程度如何？'}<select required value={accuracy} onChange={(e) => setAccuracy(e.target.value)} className="vedic-input mt-2"><option value="">{isEnglish ? 'Choose one' : '請選擇'}</option>{ACCURACY_OPTIONS.map(([v,l]) => <option key={v} value={v}>{isEnglish ? ({ very_inaccurate: 'Not at all accurate', partly_accurate: 'Partly accurate', mostly_accurate: 'Mostly accurate', very_accurate: 'Very accurate', exactly_me: 'It felt exactly like me' } as Record<string, string>)[v] : l}</option>)}</select></label>
    <fieldset className="mt-7"><legend className="text-sm text-amber-100">{isEnglish ? 'Which sections resonated most? (Select all that apply)' : '哪一個部分最有共鳴？（可複選）'}</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{RESONANCE_OPTIONS.map(([v,l]) => <label key={v} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-violet-100/70"><input type="checkbox" checked={sections.includes(v)} onChange={() => setSections((old) => old.includes(v) ? old.filter((x) => x !== v) : [...old, v])} />{isEnglish ? ({ past_karma: 'Past-life themes', life_lesson: 'Life lessons', soul_mission: 'Soul mission', talents: 'Gifts and abilities', relationship: 'Love and relationships', career: 'Work and career', wealth: 'Wealth and money', spiritual_growth: 'Spiritual growth', future_timeline: 'Three-to-five-year timeline' } as Record<string, string>)[v] : l}</label>)}</div></fieldset>
    <label className="mt-7 block text-sm text-amber-100">{isEnglish ? 'Would you like to share your experience?' : '想分享你的心得嗎？'}<textarea required minLength={10} maxLength={1000} value={content} onChange={(e) => setContent(e.target.value)} placeholder={isEnglish ? 'Which part resonated most? Did it change how you understand your patterns, life lessons, or direction?' : '哪一段最有共鳴？有沒有讓你重新理解自己的業力、人生課題或未來方向？'} className="vedic-input mt-2 min-h-36 resize-y" /><span className="mt-1 block text-right text-xs text-white/35">{content.length}/1000</span></label>
    <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-violet-100/65"><input type="checkbox" checked={allowPublic} onChange={(e) => setAllowPublic(e.target.checked)} className="mt-1" />{isEnglish ? 'I agree to display this review anonymously in the Vedic astrology reviews section.' : '我同意將此心得匿名顯示於網站印度占星使用者評價區。'}</label>
    {message && <p className="mt-4 text-center text-sm text-fuchsia-100">{message}</p>}<button disabled={loading} className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-500 via-fuchsia-500 to-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? (isEnglish ? 'Saving…' : '處理中…') : saved ? (isEnglish ? 'Update review' : '更新評價') : (isEnglish ? 'Submit review' : '送出評價')}</button>
  </form>;
}

function PublicVedicReviews({ language }: { language: 'zh-Hant' | 'en' }) {
  const [reviews, setReviews] = useState<VedicReview[]>([]);
  useEffect(() => { vedicAstrologyApi.publicReviews().then((r) => setReviews(r.reviews)).catch(() => {}); }, []);
  if (!reviews.length) return null;
  return <section className="mx-auto mt-20 max-w-5xl"><div className="text-center"><p className="text-sm tracking-[0.25em] text-fuchsia-300/60">{language === 'en' ? 'Reader feedback' : '使用者真實回饋'}</p><h2 className="mt-3 font-serif text-3xl text-amber-50">{language === 'en' ? 'What readers recognized in their reports' : '他們在報告中看見了自己'}</h2></div><div className="mt-8 grid gap-5 md:grid-cols-2">{reviews.map((review) => <article key={review.id} className="rounded-2xl border border-violet-300/20 bg-slate-950/55 p-6"><p className="text-amber-300">{'★'.repeat(review.rating)}<span className="text-white/15">{'★'.repeat(5-review.rating)}</span></p><p className="mt-4 whitespace-pre-line leading-7 text-violet-50/75">「{review.reviewContent}」</p><p className="mt-4 text-sm text-fuchsia-200/60">{review.displayName}{language === 'en' ? ' · Reader feedback' : '｜使用者真實回饋'}</p></article>)}</div></section>;
}

function EvidenceDetails({ evidence, language }: { evidence: Array<{ factor: string; value: string; relevance: string }>; language: 'zh-Hant' | 'en' }) {
  const visibleEvidence = evidence.filter((item) => item.factor.trim() && item.value.trim() && item.relevance.trim());
  if (!visibleEvidence.length) return null;
  return <details className="mt-6 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/50"><summary className="cursor-pointer text-violet-100/65">{language === 'en' ? 'Chart factors referenced in this section' : '本段主要參考星盤配置'}</summary><ul className="mt-3 space-y-3">{visibleEvidence.map((item, index) => <li key={`${item.factor}-${index}`}><strong className="text-violet-100/75">{item.factor}：{item.value}</strong><p className="mt-1 leading-6">{item.relevance}</p></li>)}</ul></details>;
}

function ForecastCard({ period, language }: { period: NonNullable<VedicReport['sections'][number]['timeline']>[number]; language: 'zh-Hant' | 'en' }) {
  const { interpretation } = period;
  return <article className="rounded-2xl border border-fuchsia-300/20 bg-slate-950/50 p-5 sm:p-6">
    <p className="text-sm text-amber-200/65">{period.analysisStartDate || period.startDate} ～ {period.analysisEndDate || period.endDate}</p>
    <h5 className="mt-2 font-serif text-2xl text-amber-100">{period.displayLabel}</h5>
    <p className="mt-5 whitespace-pre-line text-base leading-8 text-violet-50/75 sm:text-lg sm:leading-9">{interpretation.consultation}</p>
    {interpretation.evidence.length ? <EvidenceDetails evidence={interpretation.evidence} language={language} /> : null}
  </article>;
}

function ForecastOverview({ periods, language }: { periods: NonNullable<VedicReport['sections'][number]['timeline']>; language: 'zh-Hant' | 'en' }) {
  return <div className="overflow-x-auto rounded-2xl border border-violet-300/15"><table className="min-w-[520px] w-full text-left text-sm"><thead className="bg-violet-400/10 text-violet-100/70"><tr><th className="p-3">{language === 'en' ? 'Period' : '時間'}</th><th className="p-3">{language === 'en' ? 'Dasha / Sub-period' : '大運／次運'}</th></tr></thead><tbody>{periods.map((period) => <tr key={`overview-${period.id}`} className="border-t border-white/5 text-white/60"><td className="p-3">{period.analysisStartDate || period.startDate} ～ {period.analysisEndDate || period.endDate}</td><td className="p-3 text-amber-100/80">{period.displayLabel}</td></tr>)}</tbody></table></div>;
}

function CosmicBackground() {
  return <div className="pointer-events-none fixed inset-0"><div className="absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-fuchsia-900/20 blur-[130px]" /><div className="absolute -right-32 top-1/3 h-[520px] w-[520px] rounded-full bg-amber-700/10 blur-[130px]" />{Array.from({ length: 45 }, (_, index) => <span key={index} className="absolute h-1 w-1 rounded-full bg-white" style={{ left: `${(index * 37) % 100}%`, top: `${(index * 61) % 100}%`, opacity: 0.12 + (index % 5) * 0.08 }} />)}</div>;
}
