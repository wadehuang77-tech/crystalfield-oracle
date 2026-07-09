import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Gem, Star, Sparkles, ChevronRight, LogIn, Check, Minus } from 'lucide-react';
import BirthDateForm from '../components/numerology/BirthDateForm';
import NumerologyReport from '../components/numerology/NumerologyReport';
import DailyEnergy from '../components/numerology/DailyEnergy';
import AIChatAdvisor from '../components/numerology/AIChatAdvisor';
import UpgradeModal from '../components/numerology/UpgradeModal';
import { useAuth } from '../contexts/AuthContext';
import { calculateNumerology, drawOracleCard } from '../lib/numerology';
import type { NumerologyReport as Report, OracleCard } from '../lib/numerology';
import type { PlanTier } from '../hooks/usePremium';
import { checkoutApi } from '../lib/api';
import { submitToEcpay } from '../lib/ecpayRedirect';

type Tab = 'report' | 'daily' | 'ai';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'report', label: '靈數報告', icon: <Gem className="w-3.5 h-3.5" /> },
  { id: 'daily', label: '今日能量', icon: <Star className="w-3.5 h-3.5" /> },
  { id: 'ai', label: 'AI 顧問', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

const features = [
  { icon: '✦', title: '生命靈數分析', desc: '深度解析你的靈魂密碼與人生使命', color: '#fbbf24' },
  { icon: '◈', title: '缺失能量診斷', desc: '找出能量缺口，提供精準療癒方案', color: '#a78bfa' },
  { icon: '◉', title: '水晶能量配對', desc: 'AI 智能推薦專屬水晶手串組合', color: '#5eead4' },
  { icon: '⬡', title: '每日能量訊息', desc: '個人化每日水晶與幸運能量指引', color: '#60a5fa' },
];

interface UnlockShortcut {
  key: string;
  title: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface UnlockPlan extends UnlockShortcut {
  priceLabel: string;
  features: string[];
  lockedFeatures?: string[];
  buttonLabel: string;
}

const SKU_MAP: Record<number, string> = {
  1: 'numerology_basic',
  2: 'numerology_advanced',
  3: 'numerology_full',
};

const NUMEROLOGY_FORECAST_SKU = 'numerology_forecast';
const FORECAST_UNLOCK_KEY = 'cf_numerology_forecast_unlocked';
const LOCAL_TIER_KEY = 'cf_numerology_local_tier';
const RETURN_STATE_KEY = 'cf_numerology_return_state';
const LAST_REPORT_STATE_KEY = 'cf_numerology_last_report_state';

function getTierFromSku(sku: string): PlanTier {
  if (sku === 'numerology_full') return 3;
  if (sku === 'numerology_advanced') return 2;
  if (sku === 'numerology_basic') return 1;
  return 0;
}

export default function NumerologyPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [oracleCard, setOracleCard] = useState<OracleCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('report');
  const [pendingScrollTarget, setPendingScrollTarget] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeDefaultTier, setUpgradeDefaultTier] = useState<PlanTier>(3);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [expandedUnlockKey, setExpandedUnlockKey] = useState<string | null>(null);

  const [localTier, setLocalTier] = useState<PlanTier>(() => {
    const n = Number(localStorage.getItem(LOCAL_TIER_KEY));
    return n >= 1 && n <= 3 ? n as PlanTier : 0;
  });
  const [forecastCheckoutUnlocked, setForecastCheckoutUnlocked] = useState(() =>
    localStorage.getItem(FORECAST_UNLOCK_KEY) === '1',
  );
  const displayTier: PlanTier = localTier;
  const paidContentTier: PlanTier = localTier >= 2 ? localTier : 0;
  const pendingUpgradeRef = useRef<PlanTier | null>(null);

  // Capture upgrade intent from URL after auth redirect, then clean it
  useEffect(() => {
    const t = parseInt(searchParams.get('upgrade') ?? '') as PlanTier;
    if (t >= 1 && t <= 3) {
      pendingUpgradeRef.current = t;
      const next = new URLSearchParams(searchParams);
      next.delete('upgrade');
      setSearchParams(next, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingUpgradeRef.current !== null) {
      const t = pendingUpgradeRef.current;
      pendingUpgradeRef.current = null;
      const sku = SKU_MAP[t];
      if (sku) {
        setCheckoutLoading(true);
        checkoutApi.createOrder(sku)
          .then(({ ecpay }) => {
            if (ecpay) submitToEcpay(ecpay, () => setCheckoutLoading(false));
            else setCheckoutLoading(false);
          })
          .catch(err => {
            console.error('checkout failed', err);
            setCheckoutLoading(false);
          });
      }
    }
  }, [user]);

  // ── Derive unlock flags from tier ───────────────────────────────
  const crystalUnlocked = localTier >= 1;
  const oracleUnlocked = paidContentTier >= 2;
  const forecastUnlocked = forecastCheckoutUnlocked;

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section || report) return;

    const rawState = localStorage.getItem(RETURN_STATE_KEY) ?? localStorage.getItem(LAST_REPORT_STATE_KEY);
    if (!rawState) return;

    try {
      const state = JSON.parse(rawState) as { report?: Report; oracleCard?: OracleCard | null };
      if (!state.report) return;
      setReport(state.report);
      setOracleCard(state.oracleCard ?? null);
      setActiveTab('report');
      setPendingScrollTarget(getScrollTargetForSection(section));
    } catch {
      localStorage.removeItem(RETURN_STATE_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingScrollTarget || !report || activeTab !== 'report') return;
    const timer = window.setTimeout(() => {
      document.getElementById(pendingScrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingScrollTarget(null);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeTab, pendingScrollTarget, report]);

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (!orderId) return;

    let cancelled = false;
    const orderToken = searchParams.get('order_token');

    checkoutApi.getOrder(orderId, orderToken)
      .then(({ order }) => {
        if (cancelled || order.status !== 'paid') return;

        const rawState = localStorage.getItem(RETURN_STATE_KEY) ?? localStorage.getItem(LAST_REPORT_STATE_KEY);
        let returnSection = searchParams.get('section') ?? '';
        if (rawState) {
          try {
            const state = JSON.parse(rawState) as { report?: Report; oracleCard?: OracleCard | null; section?: string };
            if (state.report) setReport(state.report);
            setOracleCard(state.oracleCard ?? null);
            returnSection = state.section ?? returnSection;
          } catch {
            localStorage.removeItem(RETURN_STATE_KEY);
          }
        }

        const paidTier = getTierFromSku(order.item_id);
        if (paidTier > 0) {
          if (order.item_id === 'numerology_basic') returnSection = 'crystal';
          if (order.item_id === 'numerology_advanced') returnSection = 'advanced';
          if (order.item_id === 'numerology_basic') clearForecastUnlock();
          const nextTier: PlanTier = order.item_id === 'numerology_basic'
            ? 1
            : (Math.max(localTier, paidTier) as PlanTier);
          localStorage.setItem(LOCAL_TIER_KEY, String(nextTier));
          setLocalTier(nextTier);
        } else if (order.item_id === NUMEROLOGY_FORECAST_SKU) {
          returnSection = 'forecast';
          clearLocalTierUnlock();
          localStorage.setItem(FORECAST_UNLOCK_KEY, '1');
          setForecastCheckoutUnlocked(true);
        } else {
          return;
        }

        setActiveTab('report');
        setPendingScrollTarget(getScrollTargetForSection(returnSection));

        const next = new URLSearchParams(searchParams);
        next.delete('order_id');
        next.delete('order_token');
        next.delete('section');
        setSearchParams(next, { replace: true });
      })
      .catch(err => {
        console.error('forecast checkout verification failed', err);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ─────────────────────────────────────────────────────
  const handleSubmit = async (date: string, useOracle: boolean) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    const result = calculateNumerology(date);
    const card = useOracle ? drawOracleCard() : null;
    clearLocalTierUnlock();
    clearForecastUnlock();
    setReport(result);
    setOracleCard(card);
    localStorage.setItem(LAST_REPORT_STATE_KEY, JSON.stringify({ report: result, oracleCard: card }));
    setLoading(false);
  };

  const handleReset = () => {
    setReport(null);
    setOracleCard(null);
    setActiveTab('report');
    clearLocalTierUnlock();
    clearForecastUnlock();
    localStorage.removeItem(RETURN_STATE_KEY);
    localStorage.removeItem(LAST_REPORT_STATE_KEY);
  };

  const handleUpgrade = (required: PlanTier = 3) => {
    setUpgradeDefaultTier(required);
    setShowUpgrade(true);
  };

  const getScrollTargetForSection = (section: string) => {
    if (section === 'crystal') return 'numerology-crystal-healing';
    if (section === 'advanced') return 'numerology-advanced-crystal';
    if (section === 'forecast') return 'numerology-forecast';
    return null;
  };

  const clearLocalTierUnlock = () => {
    localStorage.removeItem(LOCAL_TIER_KEY);
    setLocalTier(0);
  };

  const clearForecastUnlock = () => {
    localStorage.removeItem(FORECAST_UNLOCK_KEY);
    setForecastCheckoutUnlocked(false);
  };

  const saveReturnState = (section: string) => {
    if (report) {
      const state = JSON.stringify({ report, oracleCard, section });
      localStorage.setItem(RETURN_STATE_KEY, state);
      localStorage.setItem(LAST_REPORT_STATE_KEY, state);
      return;
    }

    const rawLastState = localStorage.getItem(LAST_REPORT_STATE_KEY);
    if (!rawLastState) return;

    try {
      const lastState = JSON.parse(rawLastState) as { report?: Report; oracleCard?: OracleCard | null };
      if (!lastState.report) return;
      const state = JSON.stringify({
        report: lastState.report,
        oracleCard: lastState.oracleCard ?? null,
        section,
      });
      localStorage.setItem(RETURN_STATE_KEY, state);
      localStorage.setItem(LAST_REPORT_STATE_KEY, state);
    } catch {
      localStorage.removeItem(LAST_REPORT_STATE_KEY);
    }
  };

  const startNumerologyCheckout = async (sku: string, section: string, paidTier?: PlanTier) => {
    saveReturnState(section);
    setCheckoutLoading(true);
    try {
      const { ecpay } = await checkoutApi.createOrder(sku);
      if (ecpay) {
        submitToEcpay(ecpay, () => setCheckoutLoading(false));
      } else {
        if (paidTier) {
          if (sku === 'numerology_basic') clearForecastUnlock();
          const nextTier: PlanTier = sku === 'numerology_basic'
            ? 1
            : (Math.max(localTier, paidTier) as PlanTier);
          localStorage.setItem(LOCAL_TIER_KEY, String(nextTier));
          setLocalTier(nextTier);
        } else if (sku === NUMEROLOGY_FORECAST_SKU) {
          clearLocalTierUnlock();
          localStorage.setItem(FORECAST_UNLOCK_KEY, '1');
          setForecastCheckoutUnlocked(true);
        }
        setActiveTab('report');
        setPendingScrollTarget(getScrollTargetForSection(section));
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error('numerology checkout failed', err);
      setCheckoutLoading(false);
    }
  };

  const handleTierCheckout = (required: PlanTier, section = 'report') => {
    const sku = SKU_MAP[required];
    if (!sku) return;
    void startNumerologyCheckout(sku, section, required);
  };

  const handleForecastUnlock = async () => {
    await startNumerologyCheckout(NUMEROLOGY_FORECAST_SKU, 'forecast');
  };

  const basicFeatures = [
    '缺失數字完整分析',
    '高頻水晶療癒方案',
    '缺失能量盲點解析',
    '水晶配方與療癒建議',
  ];
  const basicLockedFeatures = [
    '靈魂藍圖 × 當下能量交叉指引',
    '神聖水晶陣指引',
    '完整流年報告',
    '專屬水晶手串推薦',
  ];
  const unlockPlans: UnlockPlan[] = [
    ...(!crystalUnlocked ? [{
      key: 'basic',
      title: '基礎版',
      desc: '缺失數字 × 水晶療癒方案',
      color: '#5eead4',
      icon: <Sparkles className="w-3 h-3" />,
      priceLabel: 'NT$199',
      features: basicFeatures,
      lockedFeatures: basicLockedFeatures,
      buttonLabel: '立即解鎖 基礎版 NT$199',
      onClick: () => handleTierCheckout(1, 'crystal'),
    }] : []),
    ...(!forecastUnlocked ? [{
      key: 'forecast',
      title: '完整流年',
      desc: '年度流年解析與守護水晶',
      color: '#f97316',
      icon: <Star className="w-3 h-3" />,
      priceLabel: 'NT$499',
      features: [
        '完整流年主題與年度能量解析',
        '每月轉折提醒與行動建議',
        '年度守護水晶與配戴方向',
        '流年課題、機會與關係提醒',
      ],
      lockedFeatures: [
        '缺失數字水晶療癒方案',
        '靈魂藍圖 × 當下能量交叉指引',
        '神聖水晶陣與水晶手串推薦',
      ],
      buttonLabel: '立即解鎖 完整流年報告 NT$499',
      onClick: handleForecastUnlock,
    }] : []),
    ...(!oracleUnlocked ? [{
      key: 'advanced',
      title: '進階版',
      desc: '靈魂藍圖與水晶陣手串',
      color: '#a78bfa',
      icon: <Sparkles className="w-3 h-3" />,
      priceLabel: 'NT$10',
      features: [
        '靈魂藍圖 × 當下能量交叉指引',
        '神聖水晶陣指引',
        '當下靈數卡牌點提示',
        '專屬水晶手串推薦',
        '靜心冥想儀式指引',
      ],
      lockedFeatures: [
        '完整流年報告',
      ],
      buttonLabel: '立即解鎖 進階版 NT$10',
      onClick: () => handleTierCheckout(2, 'advanced'),
    }] : []),
  ];
  const showUnlockPanel = unlockPlans.length > 0;
  const expandedUnlockPlan = unlockPlans.find(plan => plan.key === expandedUnlockKey) ?? null;

  const renderUnlockShortcutPanel = (panelId?: string, className = 'mb-6') => (
    <div
      id={panelId}
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 10px 32px rgba(0,0,0,0.28)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        scrollMarginTop: 20,
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(233,213,255,0.72)' }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#5eead4' }} />
          解鎖捷徑
        </p>
        <span className="text-[10px]" style={{ color: 'rgba(196,181,253,0.42)' }}>
          一鍵前往完整內容
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {unlockPlans.map(plan => {
            const active = expandedUnlockPlan?.key === plan.key;
            return (
              <button
                key={plan.key}
                onClick={() => setExpandedUnlockKey(active ? null : plan.key)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-transform duration-200 hover:scale-[1.03]"
                style={{
                  background: active ? `${plan.color}26` : `${plan.color}12`,
                  border: `1px solid ${active ? plan.color : `${plan.color}35`}`,
                  color: plan.color,
                  boxShadow: active ? `0 0 16px ${plan.color}24` : 'none',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                } as React.CSSProperties}
              >
                {plan.icon}
                {plan.title}
              </button>
            );
          })}
        </div>

        {expandedUnlockPlan && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, ${expandedUnlockPlan.color}1f, ${expandedUnlockPlan.color}08)`,
              border: `1px solid ${expandedUnlockPlan.color}45`,
              boxShadow: `0 0 22px ${expandedUnlockPlan.color}12`,
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: expandedUnlockPlan.color, boxShadow: `0 0 10px ${expandedUnlockPlan.color}aa` }} />
                  <p className="text-sm font-extrabold" style={{ color: expandedUnlockPlan.color }}>{expandedUnlockPlan.title}</p>
                </div>
                <p className="mt-1 text-xs" style={{ color: 'rgba(233,213,255,0.58)' }}>{expandedUnlockPlan.desc}</p>
              </div>
              <span className="text-lg font-black" style={{ color: expandedUnlockPlan.color }}>{expandedUnlockPlan.priceLabel}</span>
            </div>

            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: 'rgba(7,4,15,0.28)',
                border: `1px solid ${expandedUnlockPlan.color}28`,
              }}
            >
              <p className="mb-3 text-xs font-bold" style={{ color: expandedUnlockPlan.color }}>
                {expandedUnlockPlan.title} · 功能內容
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {expandedUnlockPlan.features.map(feature => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: expandedUnlockPlan.color }} />
                    <span className="text-xs" style={{ color: 'rgba(233,213,255,0.78)' }}>{feature}</span>
                  </div>
                ))}
              </div>
              {expandedUnlockPlan.lockedFeatures && expandedUnlockPlan.lockedFeatures.length > 0 && (
                <>
                  <div className="my-3 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {expandedUnlockPlan.lockedFeatures.map(feature => (
                      <div key={feature} className="flex items-center gap-2">
                        <Minus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(196,181,253,0.22)' }} />
                        <span className="text-xs" style={{ color: 'rgba(196,181,253,0.30)' }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={expandedUnlockPlan.onClick}
              className="w-full rounded-xl py-3.5 text-sm font-black transition-transform duration-200 hover:scale-[1.01]"
              style={{
                background: `linear-gradient(135deg, ${expandedUnlockPlan.color}, ${expandedUnlockPlan.color}cc)`,
                color: '#071013',
                boxShadow: `0 10px 30px ${expandedUnlockPlan.color}32`,
                touchAction: 'manipulation',
              } as React.CSSProperties}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                {expandedUnlockPlan.buttonLabel}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const handleUpgradeConfirm = async (t: PlanTier) => {
    setShowUpgrade(false);
    const sku = SKU_MAP[t];
    if (!sku) return;
    setCheckoutLoading(true);
    try {
      const { ecpay } = await checkoutApi.createOrder(sku);
      if (ecpay) {
        submitToEcpay(ecpay, () => setCheckoutLoading(false));
      } else {
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error('checkout failed', err);
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen">

      {!report ? (
        <section className="px-4 pt-4 pb-16 max-w-2xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h1
              className="font-serif text-4xl md:text-5xl leading-tight"
              style={{ filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.3)) drop-shadow(0 0 36px rgba(196,181,253,0.18))' }}
            >
              <span className="text-gradient-gold">你的專屬靈魂藍圖</span>
              <br />
              <span style={{ color: '#e9d5ff' }}>與能量對齊指南</span>
            </h1>
            <p
              className="font-serif text-sm leading-relaxed max-w-sm mx-auto"
              style={{ color: 'rgba(196,181,253,0.65)', fontSize: 15, lineHeight: 1.85 }}
            >
              以生命靈數為核心導航，結合單張薩滿牌卡指引、<br />
              客製化水晶排列與冥想儀式，<br />
              為您量身打造全方位的心靈支持。
            </p>
            {!user && (
              <button
                onClick={() => navigate('/auth?redirect=/numerology')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 999,
                  background: 'rgba(167,139,250,0.07)',
                  border: '1px solid rgba(167,139,250,0.18)',
                  color: 'rgba(196,181,253,0.6)',
                  fontSize: 12, cursor: 'pointer',
                  transition: 'all 0.2s',
                } as React.CSSProperties}
              >
                <LogIn style={{ width: 12, height: 12 }} />
                登入以儲存你的靈數記錄
              </button>
            )}
          </div>

          <div
            className="rounded-3xl p-6 md:p-8 mb-10"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(167,139,250,0.04), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            <BirthDateForm onSubmit={handleSubmit} loading={loading} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {features.map(f => (
              <div
                key={f.title}
                className="rounded-2xl p-4 space-y-2 transition-all duration-300 hover:scale-[1.02] cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}
              >
                <span style={{ color: f.color, fontSize: 18 }}>{f.icon}</span>
                <h3 className="text-sm font-medium" style={{ color: '#e9d5ff' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.5)' }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-3xl p-6 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-xs uppercase tracking-widest text-center" style={{ color: 'rgba(167,139,250,0.45)' }}>
              九大數字水晶對應
            </p>
            <div className="flex justify-center gap-2.5 flex-wrap">
              {[
                { n: 1, c: '#fb923c' }, { n: 2, c: '#fda4af' }, { n: 3, c: '#7dd3fc' },
                { n: 4, c: '#6b7280' }, { n: 5, c: '#ef4444' }, { n: 6, c: '#6ee7b7' },
                { n: 7, c: '#a78bfa' }, { n: 8, c: '#fbbf24' }, { n: 9, c: '#e5e7eb' },
              ].map(({ n, c }) => (
                <div
                  key={n}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-transform duration-200 hover:scale-110 cursor-default"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${c}cc, ${c}44)`,
                    boxShadow: `0 0 16px ${c}28, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    color: '#07040f',
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm" style={{ color: 'rgba(167,139,139,0.3)' }}>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>已有 2,847 人完成靈魂能量解析</span>
          </div>
        </section>

      ) : (
        <section className="px-4 pb-16 max-w-2xl mx-auto">
          <div
            className="flex gap-1 rounded-2xl p-1 mb-6 sticky top-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              zIndex: 10,
            }}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={activeTab === tab.id ? {
                  background: 'rgba(167,139,250,0.14)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(167,139,250,0.22)',
                  boxShadow: '0 0 16px rgba(109,40,217,0.12)',
                } : {
                  color: 'rgba(196,181,253,0.4)',
                  border: '1px solid transparent',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'report' && (
            <>
              {showUnlockPanel && renderUnlockShortcutPanel()}
              <NumerologyReport
                report={report}
                oracleCard={oracleCard}
                onReset={handleReset}
                tier={paidContentTier}
                onUpgrade={handleUpgrade}
                crystalUnlocked={crystalUnlocked}
                onCrystalUnlock={() => handleTierCheckout(1, 'crystal')}
                forecastUnlocked={forecastUnlocked}
                onForecastUnlock={handleForecastUnlock}
                oracleUnlocked={oracleUnlocked}
                onOracleUnlock={() => handleTierCheckout(2, 'advanced')}
              />
            </>
          )}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <DailyEnergy lifePathNumber={report.lifePathNumber} />
              <button
                onClick={handleReset}
                className="w-full py-3 rounded-2xl text-sm transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(196,181,253,0.45)',
                }}
              >
                重新輸入生日
              </button>
            </div>
          )}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <AIChatAdvisor report={report} />
              <button
                onClick={handleReset}
                className="w-full py-3 rounded-2xl text-sm transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(196,181,253,0.45)',
                }}
              >
                重新輸入生日
              </button>
            </div>
          )}
        </section>
      )}

      <footer
        className="py-8 px-4 max-w-2xl mx-auto"
        style={{ borderTop: '1px solid rgba(167,139,250,0.07)' }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gem className="w-3.5 h-3.5" style={{ color: 'rgba(167,139,250,0.35)' }} />
            <span className="text-xs" style={{ color: 'rgba(167,139,250,0.28)' }}>Life Crystal Code — 靈數水晶能量系統</span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(167,139,250,0.2)' }}>
            <span>水晶療癒</span><span>·</span><span>靈性成長</span><span>·</span><span>能量平衡</span>
          </div>
        </div>
      </footer>

      {checkoutLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(7,4,15,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>前往付款頁面中...</div>
        </div>
      )}

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onConfirm={handleUpgradeConfirm}
          defaultTier={upgradeDefaultTier}
          currentTier={displayTier}
        />
      )}

    </div>
  );
}
