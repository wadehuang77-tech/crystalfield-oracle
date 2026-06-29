import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { MouseEvent } from 'react';

// ─── Card definitions ────────────────────────────────────────────────────────
const CARDS = [
  {
    id: 'tarot',
    icon: '🔮',
    title: '塔羅牌占卜',
    tagline: '探索宇宙此刻想告訴你的訊息',
    description: '透過塔羅牌解讀感情、事業、財運與人生方向。',
    button: '開始占卜',
    href: '/home',
    glow: 'rgba(168,85,247,0.55)',
    glowSolid: '#a855f7',
    borderGlow: 'rgba(168,85,247,0.4)',
  },
  {
    id: 'numerology',
    icon: '✨',
    title: '生命靈數',
    tagline: '解讀你的靈魂藍圖與人生課題',
    description: '輸入生日，探索天賦潛能、流年運勢與靈魂使命。',
    button: '開始分析',
    href: '/numerology',
    glow: 'rgba(99,102,241,0.55)',
    glowSolid: '#6366f1',
    borderGlow: 'rgba(99,102,241,0.4)',
  },
  {
    id: 'humandesign',
    icon: '🧬',
    title: '人類圖',
    tagline: '發現你的天賦能量與人生策略',
    description: '了解你的能量類型、決策方式與最佳人生道路。',
    button: '立即查看',
    href: '/human-design',
    glow: 'rgba(20,184,166,0.55)',
    glowSolid: '#14b8a6',
    borderGlow: 'rgba(20,184,166,0.4)',
  },
] as const;

type Card = (typeof CARDS)[number];

// ─── Pre-computed stable particle data ───────────────────────────────────────
function makeParticles(n: number, seed: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: ((i * (seed + 37) + 11) % 97),
    y: ((i * (seed + 53) + 7) % 93),
    size: ((i * 3 + seed) % 3) + 1,
    dur: ((i * 7 + seed) % 40) / 10 + 3,
    delay: ((i * 11 + seed) % 50) / 10,
    opacity: ((i * 13 + seed) % 6) / 10 + 0.15,
  }));
}

const TAROT_PARTICLES = makeParticles(24, 7);
const NUMER_PARTICLES = makeParticles(24, 17);
const HD_PARTICLES = makeParticles(24, 31);

const FLOATING_CARDS = [
  { x: 12, y: 8, rot: -18, w: 32, h: 48, opacity: 0.22, delay: 0 },
  { x: 72, y: 4, rot: 12, w: 28, h: 42, opacity: 0.18, delay: 1.2 },
  { x: 55, y: 22, rot: -6, w: 22, h: 34, opacity: 0.14, delay: 2.4 },
  { x: 30, y: 15, rot: 22, w: 18, h: 28, opacity: 0.12, delay: 0.8 },
  { x: 85, y: 30, rot: -30, w: 16, h: 24, opacity: 0.10, delay: 1.8 },
];

const NUMER_DIGITS = [
  { val: '3', x: 8, y: 10, size: 28, op: 0.18, dur: 5, delay: 0 },
  { val: '7', x: 65, y: 6, size: 36, op: 0.22, dur: 4, delay: 1 },
  { val: '1', x: 80, y: 35, size: 24, op: 0.14, dur: 6, delay: 2 },
  { val: '9', x: 20, y: 28, size: 20, op: 0.12, dur: 5.5, delay: 0.5 },
  { val: '∞', x: 45, y: 5, size: 32, op: 0.16, dur: 7, delay: 1.5 },
  { val: '5', x: 88, y: 12, size: 18, op: 0.10, dur: 4.5, delay: 3 },
];

const HD_NODES = [
  { x: 50, y: 20 }, { x: 50, y: 50 }, { x: 50, y: 80 },
  { x: 25, y: 32 }, { x: 75, y: 32 }, { x: 25, y: 65 }, { x: 75, y: 65 },
  { x: 15, y: 50 }, { x: 85, y: 50 },
];

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  w: (((i * 7) % 20) / 10 + 1).toFixed(1),
  top: (((i * 13) % 1000) / 10).toFixed(1),
  left: (((i * 17) % 1000) / 10).toFixed(1),
  opacity: (((i * 11) % 6) / 10 + 0.1).toFixed(2),
  duration: (((i * 3) % 40) / 10 + 2).toFixed(1),
  delay: (((i * 19) % 50) / 10).toFixed(1),
}));

// ─── LandingPage ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hdOpen, setHdOpen] = useState(false);

  const scrollToCard = useCallback((index: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const card = carousel.children[index] as HTMLElement;
    if (!card) return;
    carousel.scrollTo({
      left: card.offsetLeft - (carousel.offsetWidth - card.offsetWidth) / 2,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const onScroll = () => {
      const center = carousel.scrollLeft + carousel.offsetWidth / 2;
      let closest = 0, minDist = Infinity;
      Array.from(carousel.children).forEach((child, i) => {
        const el = child as HTMLElement;
        const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      setActiveIndex(closest);
    };
    carousel.addEventListener('scroll', onScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#060310] overflow-x-hidden">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-purple-900/25 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-violet-900/20 blur-[120px]" />
        <div className="absolute top-[40%] left-1/2 w-[500px] h-[500px] -translate-x-1/2 rounded-full bg-indigo-900/15 blur-[120px]" />
      </div>

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        {STARS.map((s) => (
          <span key={s.id} className="absolute rounded-full bg-white" style={{
            width: s.w + 'px', height: s.w + 'px',
            top: s.top + '%', left: s.left + '%',
            opacity: Number(s.opacity),
            animation: `twinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: s.delay + 's',
          }} />
        ))}
      </div>

      <main className="relative z-10">
        {/* ── Cards Section ────────────────────────────────────── */}
        <section className="pt-16 pb-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-purple-400/60 text-sm uppercase tracking-[0.3em] font-medium mb-4">靈魂探索工具</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight">探索你的靈魂藍圖</h2>
              <p className="text-purple-200/55 text-lg max-w-lg mx-auto leading-relaxed">
                透過塔羅牌、生命靈數與人類圖，深入了解你的天賦、課題與人生方向。
              </p>
            </div>
          </div>

          {/* Desktop / Tablet grid */}
          <div className="hidden md:block max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
              {CARDS.map((card, i) => (
                <PortalCard
                  key={card.id}
                  card={card}
                  index={i}
                  onClick={card.id === 'humandesign' ? () => setHdOpen(true) : undefined}
                />
              ))}
            </div>
          </div>

          {/* Mobile carousel */}
          <div className="md:hidden">
            <div ref={carouselRef}
              className="flex overflow-x-auto gap-5 snap-x snap-mandatory pb-4"
              style={{
                paddingLeft: 'calc(50vw - 148px)',
                paddingRight: 'calc(50vw - 148px)',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              } as React.CSSProperties}>
              {CARDS.map((card, i) => (
                <div key={card.id} className="snap-center flex-shrink-0 transition-all duration-500"
                  style={{
                    width: '296px',
                    opacity: activeIndex === i ? 1 : 0.5,
                    transform: activeIndex === i ? 'scale(1)' : 'scale(0.92)',
                  }}>
                  <PortalCard
                    card={card}
                    index={i}
                    onClick={card.id === 'humandesign' ? () => setHdOpen(true) : undefined}
                  />
                </div>
              ))}
            </div>

            {/* Pagination dots */}
            <div className="flex items-center justify-center gap-3 mt-7">
              {CARDS.map((card, i) => (
                <button key={card.id} onClick={() => scrollToCard(i)}
                  aria-label={`Go to ${card.title}`}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: activeIndex === i ? '32px' : '8px',
                    height: '8px',
                    background: activeIndex === i
                      ? `linear-gradient(90deg, #a855f7, ${card.glowSolid})`
                      : 'rgba(168,85,247,0.25)',
                    boxShadow: activeIndex === i ? `0 0 12px ${card.glow}` : 'none',
                  }} />
              ))}
            </div>

            <p className="text-center mt-3 text-sm font-semibold tracking-widest" style={{
              background: 'linear-gradient(90deg, #c084fc, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>{CARDS[activeIndex].title}</p>

            <p className="text-center mt-2 text-purple-500/40 text-xs tracking-wider swipe-hint">左右滑動探索</p>
          </div>
        </section>
      </main>

      {hdOpen && <HumanDesignModal onClose={() => setHdOpen(false)} />}
    </div>
  );
}

// ─── Human Design "coming soon" modal ────────────────────────────────────────
function HumanDesignModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(4,0,18,0.82)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 380, width: '100%',
          background: 'linear-gradient(160deg, rgba(6,80,90,0.92), rgba(4,0,18,0.98))',
          border: '1px solid rgba(20,184,166,0.30)',
          borderRadius: 24,
          padding: '40px 32px 32px',
          textAlign: 'center',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(20,184,166,0.08)',
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>🧬</div>
        <h2 style={{
          fontSize: 22, fontWeight: 700, color: '#fff',
          marginBottom: 6, fontFamily: 'serif', letterSpacing: '0.04em',
        }}>
          人類圖
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(94,234,212,0.85)', fontWeight: 600, marginBottom: 18, letterSpacing: '0.12em' }}>
          即將推出
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.52)', lineHeight: 1.75, marginBottom: 28 }}>
          人類圖功能正在全力開發中。<br />
          即將為你揭開能量類型、決策方式<br />
          與最佳人生道路的奧秘。
        </p>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '13px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, rgba(20,184,166,0.65), rgba(6,148,162,0.45))',
            color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.04em',
          }}
        >
          我知道了
        </button>
      </div>
    </div>
  );
}

// ─── Portal Card ──────────────────────────────────────────────────────────────
function PortalCard({ card, index, onClick }: { card: Card; index: number; onClick?: () => void }) {
  const sharedClass = "group relative block rounded-3xl overflow-hidden cursor-pointer no-underline";
  const sharedStyle: React.CSSProperties = {
    minHeight: '520px',
    border: `1px solid ${card.borderGlow}`,
    boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
    transition: 'transform 0.5s cubic-bezier(.22,.68,0,1.2), box-shadow 0.4s ease',
  };
  const onEnter = (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.transform = 'translateY(-8px) scale(1.015)';
    el.style.boxShadow = `0 32px 80px ${card.glow}, 0 0 0 1px ${card.borderGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
  };
  const onLeave = (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.transform = '';
    el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`;
  };

  const inner = (
    <>
      {index === 0 && <TarotArtwork />}
      {index === 1 && <NumerologyArtwork />}
      {index === 2 && <HumanDesignArtwork />}

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(4,0,18,0.97) 0%, rgba(4,0,18,0.75) 35%, rgba(4,0,18,0.15) 65%, transparent 100%)',
      }} />

      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          animation: 'shimmerSweep 1.2s ease-in-out',
        }} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-7">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${card.borderGlow}`,
            backdropFilter: 'blur(10px)',
            boxShadow: `0 0 16px ${card.glow}`,
          }}>
          <span className="text-base leading-none">{card.icon}</span>
          <span className="text-xs text-white/60 font-medium tracking-widest uppercase">靈魂工具</span>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: card.glowSolid }} />
        </div>

        <h3 className="text-2xl font-bold text-white tracking-tight mb-1.5 drop-shadow-lg">{card.title}</h3>

        <p className="text-sm font-semibold mb-3" style={{
          background: 'linear-gradient(90deg, #e2c4ff, #fcd34d)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>{card.tagline}</p>

        <p className="text-sm text-white/55 leading-relaxed mb-6">{card.description}</p>

        <div className="relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold text-white overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #5b21b6, ${card.glowSolid} 60%, #d97706)`,
            boxShadow: `0 4px 20px ${card.glow}, 0 0 0 1px rgba(255,255,255,0.08)`,
            transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          }}>
          <span className="relative z-10">{card.button}</span>
          <svg className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </>
  );

  return onClick ? (
    <div className={sharedClass} style={sharedStyle} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {inner}
    </div>
  ) : (
    <Link to={card.href} className={sharedClass} style={sharedStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {inner}
    </Link>
  );
}

// ─── Tarot Artwork ────────────────────────────────────────────────────────────
function TarotArtwork() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 40% 35%, rgba(120,40,200,0.7) 0%, rgba(70,10,130,0.5) 30%, rgba(4,0,18,1) 75%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 75% 25%, rgba(245,158,11,0.18) 0%, transparent 55%)',
      }} />
      <div className="absolute" style={{
        top: '6%', right: '12%', width: '80px', height: '80px', borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 38%, #fff8e1, #fcd34d 40%, #f59e0b 70%, #d97706)',
        boxShadow: '0 0 40px rgba(253,211,77,0.55), 0 0 90px rgba(253,211,77,0.2)',
        animation: 'floatUp 7s ease-in-out infinite',
      }} />
      <div className="absolute" style={{
        top: 'calc(6% - 16px)', right: 'calc(12% - 16px)',
        width: '112px', height: '112px', borderRadius: '50%',
        border: '1px solid rgba(253,211,77,0.2)',
        boxShadow: '0 0 20px rgba(253,211,77,0.1)',
        animation: 'floatUp 7s ease-in-out infinite',
      }} />
      <svg className="absolute" style={{ top: '4%', left: '-8%', width: '280px', height: '280px', opacity: 0.12, animation: 'rotateSlow 40s linear infinite', transformOrigin: '140px 140px' }} viewBox="0 0 280 280">
        <circle cx="140" cy="140" r="130" fill="none" stroke="#c084fc" strokeWidth="0.8" />
        <circle cx="140" cy="140" r="100" fill="none" stroke="#c084fc" strokeWidth="0.8" />
        <circle cx="140" cy="140" r="70" fill="none" stroke="#f59e0b" strokeWidth="0.8" />
        <circle cx="140" cy="140" r="40" fill="none" stroke="#f59e0b" strokeWidth="0.8" />
        {[0,45,90,135,180,225,270,315].map((a, i) => {
          const r = Math.PI * a / 180;
          return <line key={i} x1={140 + Math.cos(r) * 40} y1={140 + Math.sin(r) * 40} x2={140 + Math.cos(r) * 130} y2={140 + Math.sin(r) * 130} stroke="#c084fc" strokeWidth="0.6" />;
        })}
      </svg>
      {FLOATING_CARDS.map((c, i) => (
        <div key={i} className="absolute rounded-md" style={{
          left: c.x + '%', top: c.y + '%',
          width: c.w + 'px', height: c.h + 'px',
          border: '1px solid rgba(253,211,77,0.45)',
          background: 'linear-gradient(135deg, rgba(120,40,200,0.3), rgba(245,158,11,0.1))',
          transform: `rotate(${c.rot}deg)`,
          opacity: c.opacity,
          boxShadow: '0 0 8px rgba(253,211,77,0.2)',
          animation: `floatUp ${5 + i * 0.8}s ease-in-out ${c.delay}s infinite`,
        }} />
      ))}
      {TAROT_PARTICLES.map((p) => (
        <div key={p.id} className="absolute rounded-full" style={{
          left: p.x + '%', top: p.y + '%',
          width: p.size + 'px', height: p.size + 'px',
          background: p.id % 3 === 0 ? '#fcd34d' : '#c084fc',
          opacity: p.opacity,
          boxShadow: p.id % 3 === 0 ? '0 0 4px rgba(253,211,77,0.6)' : '0 0 4px rgba(192,132,252,0.6)',
          animation: `twinkle ${p.dur}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Numerology Artwork ───────────────────────────────────────────────────────
function NumerologyArtwork() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 55% 30%, rgba(79,70,229,0.75) 0%, rgba(49,10,130,0.5) 35%, rgba(4,0,18,1) 75%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 20% 70%, rgba(139,92,246,0.25) 0%, transparent 55%)',
      }} />
      <div className="absolute" style={{
        top: '8%', left: '50%', transform: 'translateX(-50%)',
        width: '90px', height: '90px', borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, rgba(224,220,255,0.9), rgba(99,102,241,0.7) 50%, rgba(49,10,130,0.9))',
        boxShadow: '0 0 50px rgba(99,102,241,0.6), 0 0 100px rgba(99,102,241,0.2)',
        animation: 'pulseGlow 4s ease-in-out infinite',
      }} />
      <svg className="absolute" style={{ top: '3%', left: '5%', width: '260px', height: '260px', opacity: 0.1, animation: 'rotateSlowRev 55s linear infinite', transformOrigin: '130px 130px' }} viewBox="0 0 260 260">
        {[0,60,120,180,240,300].map((a, i) => {
          const r = Math.PI * a / 180;
          return <circle key={i} cx={130 + Math.cos(r) * 45} cy={130 + Math.sin(r) * 45} r={45} fill="none" stroke="#818cf8" strokeWidth="0.8" />;
        })}
        <circle cx="130" cy="130" r="45" fill="none" stroke="#818cf8" strokeWidth="0.8" />
        <circle cx="130" cy="130" r="90" fill="none" stroke="#6366f1" strokeWidth="0.6" />
      </svg>
      {NUMER_DIGITS.map((d, i) => (
        <div key={i} className="absolute font-bold select-none pointer-events-none" style={{
          left: d.x + '%', top: d.y + '%',
          fontSize: d.size + 'px',
          color: i % 2 === 0 ? '#a5b4fc' : '#c084fc',
          opacity: d.op,
          fontFamily: 'serif',
          textShadow: `0 0 12px ${i % 2 === 0 ? 'rgba(165,180,252,0.5)' : 'rgba(192,132,252,0.5)'}`,
          animation: `floatUp ${d.dur}s ease-in-out ${d.delay}s infinite`,
        }}>{d.val}</div>
      ))}
      {NUMER_PARTICLES.map((p) => (
        <div key={p.id} className="absolute rounded-full" style={{
          left: p.x + '%', top: p.y + '%',
          width: p.size + 'px', height: p.size + 'px',
          background: p.id % 2 === 0 ? '#a5b4fc' : '#818cf8',
          opacity: p.opacity,
          boxShadow: '0 0 4px rgba(165,180,252,0.5)',
          animation: `twinkle ${p.dur}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Human Design Artwork ─────────────────────────────────────────────────────
function HumanDesignArtwork() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 45% 30%, rgba(6,148,162,0.65) 0%, rgba(5,80,90,0.45) 35%, rgba(4,0,18,1) 75%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 80% 70%, rgba(20,184,166,0.2) 0%, transparent 50%)',
      }} />
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.28 }} viewBox="0 0 300 520" preserveAspectRatio="xMidYMid slice">
        {HD_NODES.map((n, i) => (
          <circle key={i}
            cx={n.x * 3} cy={n.y * 5.2}
            r={i < 3 ? 14 : 10}
            fill="none" stroke="#2dd4bf" strokeWidth="1.2"
            style={{ filter: 'drop-shadow(0 0 4px rgba(45,212,191,0.6))' }} />
        ))}
        {[
          [HD_NODES[0], HD_NODES[1]], [HD_NODES[1], HD_NODES[2]],
          [HD_NODES[3], HD_NODES[1]], [HD_NODES[4], HD_NODES[1]],
          [HD_NODES[5], HD_NODES[2]], [HD_NODES[6], HD_NODES[2]],
          [HD_NODES[7], HD_NODES[1]], [HD_NODES[8], HD_NODES[1]],
          [HD_NODES[3], HD_NODES[0]], [HD_NODES[4], HD_NODES[0]],
        ].map(([a, b], i) => (
          <line key={i}
            x1={a.x * 3} y1={a.y * 5.2}
            x2={b.x * 3} y2={b.y * 5.2}
            stroke={i % 2 === 0 ? '#2dd4bf' : '#34d399'}
            strokeWidth="1.5"
            strokeDasharray="200"
            style={{
              animation: `energyFlow ${3 + (i % 3)}s linear ${(i * 0.4)}s infinite`,
            }} />
        ))}
        <polygon points="150,30 270,260 150,490 30,260"
          fill="none" stroke="#14b8a6" strokeWidth="0.8" opacity="0.5" />
      </svg>
      <div className="absolute" style={{
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '140px', height: '140px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(45,212,191,0.18) 0%, transparent 70%)',
        boxShadow: '0 0 60px rgba(20,184,166,0.3)',
        animation: 'pulseGlow 5s ease-in-out infinite',
      }} />
      {HD_PARTICLES.map((p) => (
        <div key={p.id} className="absolute rounded-full" style={{
          left: p.x + '%', top: p.y + '%',
          width: p.size + 'px', height: p.size + 'px',
          background: p.id % 3 === 0 ? '#2dd4bf' : p.id % 3 === 1 ? '#34d399' : '#a78bfa',
          opacity: p.opacity,
          boxShadow: '0 0 4px rgba(45,212,191,0.5)',
          animation: `twinkle ${p.dur}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}
