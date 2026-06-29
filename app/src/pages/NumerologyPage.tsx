import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, Star, Sparkles, ChevronRight, ArrowLeft, Crown, LogIn, LogOut, User, X, Mail, Check, AlertCircle } from 'lucide-react';
import BirthDateForm from '../components/numerology/BirthDateForm';
import NumerologyReport from '../components/numerology/NumerologyReport';
import DailyEnergy from '../components/numerology/DailyEnergy';
import AIChatAdvisor from '../components/numerology/AIChatAdvisor';
import UpgradeModal from '../components/numerology/UpgradeModal';
import AuthModal from '../components/numerology/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { calculateNumerology, drawOracleCard } from '../lib/numerology';
import type { NumerologyReport as Report, OracleCard } from '../lib/numerology';
import type { PlanTier } from '../hooks/usePremium';
import { profileApi, checkoutApi, type EcpayForm } from '../lib/api';

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

const SKU_MAP: Record<number, string> = {
  1: 'numerology_basic',
  2: 'numerology_advanced',
  3: 'numerology_full',
};

function getTierFromSpreads(purchased: string[]): PlanTier {
  if (purchased.includes('numerology_full')) return 3;
  if (purchased.includes('numerology_advanced')) return 2;
  if (purchased.includes('numerology_basic')) return 1;
  return 0;
}

function submitEcpayForm({ endpoint, fields }: EcpayForm) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = endpoint;
  form.style.display = 'none';
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

export default function NumerologyPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp, signOut } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [oracleCard, setOracleCard] = useState<OracleCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('report');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [upgradeDefaultTier, setUpgradeDefaultTier] = useState<PlanTier>(3);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ── Tier from profile ────────────────────────────────────────────
  const [tier, setTier] = useState<PlanTier>(0);
  const isPremium = tier > 0;

  useEffect(() => {
    if (!user) { setTier(0); return; }
    profileApi.me().then(({ profile }) => {
      if (profile) setTier(getTierFromSpreads(profile.purchased_spreads));
    }).catch(() => {});
  }, [user]);

  // ── Derive unlock flags from tier ───────────────────────────────
  const crystalUnlocked = tier >= 1;
  const oracleUnlocked = tier >= 2;
  const forecastUnlocked = tier >= 3;

  // ── Actions ─────────────────────────────────────────────────────
  const handleSubmit = async (date: string, useOracle: boolean) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    const result = calculateNumerology(date);
    const card = useOracle ? drawOracleCard() : null;
    setReport(result);
    setOracleCard(card);
    setLoading(false);
  };

  const handleReset = () => {
    setReport(null);
    setOracleCard(null);
    setActiveTab('report');
  };

  const handleUpgrade = (required: PlanTier = 3) => {
    setUpgradeDefaultTier(required);
    setShowUpgrade(true);
  };

  const handleUpgradeConfirm = async (t: PlanTier) => {
    setShowUpgrade(false);
    if (!user) { setShowAuth(true); return; }
    const sku = SKU_MAP[t];
    if (!sku) return;
    setCheckoutLoading(true);
    try {
      const { ecpay } = await checkoutApi.createOrder(sku);
      if (ecpay) submitEcpayForm(ecpay);
    } catch (err) {
      console.error('checkout failed', err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── AuthModal adapters ───────────────────────────────────────────
  const authSignIn = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    if (error) throw error;
  };
  const authSignUp = async (email: string, password: string) => {
    const { error } = await signUp(email, password);
    if (error) throw error;
  };

  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="py-5 px-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 group"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(196,181,253,0.6)',
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span className="text-xs hidden sm:inline">回主頁</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 35% 30%, rgba(167,139,250,0.25), rgba(96,165,250,0.08))',
                  border: '1px solid rgba(167,139,250,0.25)',
                  boxShadow: '0 0 20px rgba(167,139,250,0.15)',
                }}
              >
                <Gem className="w-4 h-4" style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <span className="font-serif text-sm font-semibold text-gradient-cosmic">Life Crystal</span>
                <span className="text-xs ml-1 hidden sm:inline" style={{ color: 'rgba(167,139,250,0.3)' }}>Code</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPremium ? (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 999,
                  background: 'rgba(251,191,36,0.10)',
                  border: '1px solid rgba(251,191,36,0.28)',
                  color: '#fbbf24',
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                  boxShadow: '0 0 12px rgba(251,191,36,0.12)',
                } as React.CSSProperties}
              >
                <Crown style={{ width: 11, height: 11 }} />
                {tier === 1 ? '基礎版' : tier === 2 ? '進階版' : '完整靈魂版'}
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade(3)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 999,
                  background: 'rgba(167,139,250,0.08)',
                  border: '1px solid rgba(167,139,250,0.22)',
                  color: '#a78bfa',
                  fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', touchAction: 'manipulation',
                  transition: 'all 0.2s',
                } as React.CSSProperties}
              >
                升級解鎖
              </button>
            )}

            {user ? (
              <button
                onClick={signOut}
                title={`登出 ${user.email}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(196,181,253,0.55)',
                  fontSize: 11, cursor: 'pointer',
                  touchAction: 'manipulation',
                } as React.CSSProperties}
              >
                <User style={{ width: 11, height: 11 }} />
                <span className="hidden sm:inline" style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email?.split('@')[0]}
                </span>
                <LogOut style={{ width: 11, height: 11 }} />
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(196,181,253,0.55)',
                  fontSize: 11, cursor: 'pointer',
                  touchAction: 'manipulation',
                } as React.CSSProperties}
              >
                <LogIn style={{ width: 11, height: 11 }} />
                <span className="hidden sm:inline">登入</span>
              </button>
            )}
          </div>
        </div>
      </header>

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
                onClick={() => setShowAuth(true)}
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
            <NumerologyReport
              report={report}
              oracleCard={oracleCard}
              onReset={handleReset}
              tier={tier}
              onUpgrade={handleUpgrade}
              crystalUnlocked={crystalUnlocked}
              onCrystalUnlock={() => handleUpgrade(1)}
              forecastUnlocked={forecastUnlocked}
              onForecastUnlock={() => handleUpgrade(3)}
              oracleUnlocked={oracleUnlocked}
              onOracleUnlock={() => handleUpgrade(2)}
            />
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
          currentTier={tier}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSignIn={authSignIn}
          onSignUp={authSignUp}
        />
      )}
    </div>
  );
}

// ── Email unlock modal (kept for backwards compatibility, unused in new flow) ──
function _EmailUnlockModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoadingState(true);
    setError('');
    try {
      await onConfirm(email.trim());
      setDone(true);
      setTimeout(onClose, 1400);
    } catch {
      setError('請輸入有效的電子郵件地址');
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(7,4,15,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      } as React.CSSProperties}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'linear-gradient(160deg, rgba(18,9,38,0.99), rgba(8,4,20,0.99))',
          border: '1px solid rgba(45,212,191,0.28)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #2dd4bf, #5eead4, #2dd4bf, transparent)' }} />
        <div style={{ padding: '22px 22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail style={{ width: 16, height: 16, color: '#2dd4bf' }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e9d5ff' }}>免費解鎖內容</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(196,181,253,0.5)' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          {done ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderRadius: 12, background: 'rgba(45,212,191,0.10)', border: '1px solid rgba(45,212,191,0.28)', color: '#2dd4bf', fontSize: 14, fontWeight: 600 }}>
              <Check style={{ width: 16, height: 16, flexShrink: 0 }} />
              已解鎖！
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="你的 email" required autoComplete="email"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', fontSize: 14, color: '#e9d5ff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(45,212,191,0.28)', borderRadius: 11, outline: 'none' }}
              />
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#fca5a5' }}>
                  <AlertCircle style={{ width: 11, height: 11 }} />{error}
                </div>
              )}
              <button type="submit" disabled={loadingState} style={{ padding: '12px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg, rgba(45,212,191,0.85), rgba(45,212,191,0.55))', color: '#07040f', fontSize: 14, fontWeight: 700, cursor: loadingState ? 'not-allowed' : 'pointer' }}>
                {loadingState ? '解鎖中...' : '免費解鎖'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
