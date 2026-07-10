import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import ParticleBackground from '../components/human-design/ParticleBackground';
import LandingPage from './human-design/LandingPage';
import HeroCardPage from './human-design/HeroCardPage';
import ReportPage from './human-design/ReportPage';
import { calculateHDChart, type HDChart } from '../lib/human-design/humanDesignCalc';
import { humanDesignApi } from '../lib/api';

type Page = 'landing' | 'hero' | 'loading' | 'report';

const STATE_KEY = 'cf_human_design_state_v1';

interface StoredState {
  chart: HDChart;
  chartId: string;
  birthData: { date: string; time: string; city: string };
}

function readStoredState(): StoredState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) as StoredState : null;
  } catch {
    localStorage.removeItem(STATE_KEY);
    return null;
  }
}

function AnalysingScreen() {
  const [step, setStep] = useState(0);
  const steps = useMemo(() => [
    '正在解析你的人類圖設計...',
    '整合你的能量中心狀態...',
    '生成個人化洞察...',
    '準備你的免費報告...',
  ], []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStep((s) => (s + 1 < steps.length ? s + 1 : s));
    }, 900);
    return () => window.clearInterval(interval);
  }, [steps]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 animate-ping" style={{ animationDuration: '1.2s' }} />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 animate-ping" style={{ animationDuration: '1.6s', animationDelay: '0.3s' }} />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">正在分析你的人類圖能量</h2>
        <p className="text-cyan-400/70 text-sm animate-pulse min-h-[20px]">{steps[step]}</p>
        <div className="mt-6 w-48 mx-auto h-0.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-700"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function HumanDesignPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState<Page>('landing');
  const [pageKey, setPageKey] = useState(0);
  const [chart, setChart] = useState<HDChart | null>(() => readStoredState()?.chart ?? null);
  const [birthData, setBirthData] = useState(() => readStoredState()?.birthData ?? { date: '', time: '', city: '' });
  const [chartId, setChartId] = useState(() => readStoredState()?.chartId ?? '');

  const goTo = (next: Page) => {
    setPage(next);
    setPageKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const persistState = (next: StoredState) => {
    localStorage.setItem(STATE_KEY, JSON.stringify(next));
  };

  const handleCalculate = (birthDate: string, birthTime: string, birthCity: string) => {
    let calculated: HDChart;
    try {
      calculated = calculateHDChart(birthDate, birthTime, birthCity);
    } catch (err) {
      console.error('HD chart calculation error:', err);
      return;
    }

    const nextBirthData = { date: birthDate, time: birthTime, city: birthCity };
    setBirthData(nextBirthData);
    setChart(calculated);
    setChartId('');
    goTo('hero');

    humanDesignApi
      .saveChart({
        birth_date: birthDate,
        birth_time: birthTime,
        birth_city: birthCity,
        hd_type: calculated.type,
        hd_profile: calculated.profile,
        hd_authority: calculated.authority,
        chart_data: calculated,
      })
      .then(({ chart_id }) => {
        setChartId(chart_id);
        persistState({ chart: calculated, chartId: chart_id, birthData: nextBirthData });
      })
      .catch((err) => {
        console.error('HD chart save error:', err);
        persistState({ chart: calculated, chartId: '', birthData: nextBirthData });
      });
  };

  const ensureChartSaved = useCallback(async () => {
    if (!chart) return;
    if (chartId) {
      persistState({ chart, chartId, birthData });
      return;
    }
    try {
      const { chart_id } = await humanDesignApi.saveChart({
        birth_date: birthData.date,
        birth_time: birthData.time,
        birth_city: birthData.city,
        hd_type: chart.type,
        hd_profile: chart.profile,
        hd_authority: chart.authority,
        chart_data: chart,
      });
      setChartId(chart_id);
      persistState({ chart, chartId: chart_id, birthData });
    } catch (err) {
      console.error('HD chart save before free full report failed:', err);
      persistState({ chart, chartId: '', birthData });
    }
  }, [birthData, chart, chartId]);

  useEffect(() => {
    if (page !== 'loading') return;
    const normal = window.setTimeout(() => goTo('report'), 2800);
    return () => window.clearTimeout(normal);
  }, [page]);

  useEffect(() => {
    const orderId = params.get('order_id');
    const orderToken = params.get('order_token');
    if (!orderId && !orderToken) return;
    const stored = readStoredState();
    if (stored) {
      setChart(stored.chart);
      setBirthData(stored.birthData);
      setChartId(stored.chartId);
      setPage('report');
    }
    const next = new URLSearchParams(params);
    next.delete('order_id');
    next.delete('order_token');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="relative min-h-screen bg-[#0A0E17] text-white overflow-x-hidden">
      <ParticleBackground />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue-600/6 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-56 h-56 bg-teal-600/4 rounded-full blur-3xl" />
      </div>

      <main key={pageKey} className="relative page-enter" style={{ zIndex: 2 }}>
        {page === 'landing' && <LandingPage onCalculate={handleCalculate} />}
        {page === 'hero' && chart && (
          <HeroCardPage
            chart={chart}
            birthDate={birthData.date}
            birthTime={birthData.time}
            birthCity={birthData.city}
            onViewReport={() => goTo('report')}
          />
        )}
        {page === 'loading' && <AnalysingScreen />}
        {page === 'report' && chart && (
          <ReportPage
            chart={chart}
            chartId={chartId}
            isFullUnlocked
            onEnsureChartSaved={ensureChartSaved}
            onNavigate={(target) => goTo(target === 'landing' ? 'landing' : 'report')}
          />
        )}
        {page === 'report' && !chart && <LandingPage onCalculate={handleCalculate} />}
      </main>
    </div>
  );
}
