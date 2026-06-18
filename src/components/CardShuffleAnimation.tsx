import { useEffect, useState } from 'react';

const PHRASES = [
  '凝　神　靜　心',
  '能　量　正　在　匯　聚',
  '牌　正　在　為　你　顯　現',
];

export default function CardShuffleAnimation({ message }: { message?: string } = {}) {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (message) return;
    const id = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 1300);
    return () => clearInterval(id);
  }, [message]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      window.scrollTo(0, 0);
    };
  }, []);

  return (
    <section
      className="fixed inset-0 z-50 bg-[#070b1a] flex flex-col items-center justify-center overflow-hidden px-4 py-10"
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] rounded-full bg-blue-500/[0.06] blur-[100px] animate-pulse-glow" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[18rem] h-[18rem] rounded-full bg-blue-300/[0.04] blur-[60px] animate-pulse-slow" />
      </div>

      <DustAndStars />

      <div className="relative w-72 h-72 sm:w-[22rem] sm:h-[22rem]">
        <svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 w-full h-full text-blue-500 animate-shuffle-spin"
          stroke="currentColor"
          fill="none"
          style={{ animationDuration: '18s' }}
        >
          <circle r="98" strokeWidth="0.4" strokeDasharray="0.5 4" opacity="0.55" />
        </svg>

        <svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 w-full h-full text-blue-500"
          stroke="currentColor"
          fill="none"
        >
          <circle r="86" strokeWidth="0.5" opacity="0.4" />
          <circle r="74" strokeWidth="0.4" opacity="0.25" strokeDasharray="0.4 1.8" />
        </svg>

        <svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 w-full h-full text-blue-400 animate-orbit"
          stroke="currentColor"
          fill="none"
          style={{ animationDuration: '24s' }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={Math.sin(a) * 86}
                y1={-Math.cos(a) * 86}
                x2={Math.sin(a) * 78}
                y2={-Math.cos(a) * 78}
                strokeWidth="0.7"
                opacity={i % 3 === 0 ? '0.85' : '0.4'}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 animate-fan-rotate">
          {[-32, -16, 0, 16, 32].map((deg, i) => (
            <div
              key={deg}
              className="absolute top-1/2 left-1/2 origin-bottom-center animate-card-breathe"
              style={{
                transform: `translate(-50%, -100%) rotate(${deg}deg) translateY(-${30 + Math.abs(deg) * 0.5}px)`,
                animationDelay: `${i * 0.12}s`,
              }}
            >
              <FanCard />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <CenterSigil />
        </div>

      </div>

      <DriftingSigils />

      <p className="font-serif text-base sm:text-xl text-blue-100 mt-14 sm:mt-16 tracking-[0.25em] sm:tracking-[0.8em] animate-fade-pulse text-center px-4">
        {message ?? PHRASES[phraseIdx]}
      </p>
      <div className="mt-4 w-16 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
    </section>
  );
}

function FanCard() {
  return (
    <div
      className="w-12 h-[4.5rem] sm:w-14 sm:h-[5rem]"
      style={{
        background: 'linear-gradient(165deg, #0b0f24 0%, #1a2040 50%, #0b0f24 100%)',
        border: '1px solid rgba(201, 163, 92, 0.75)',
        boxShadow:
          '0 0 18px -2px rgba(201, 163, 92, 0.4), ' +
          'inset 0 0 0 3px rgba(201, 163, 92, 0.1), ' +
          'inset 0 0 12px rgba(201, 163, 92, 0.08)',
      }}
    >
      <div className="w-full h-full flex items-center justify-center text-blue-400">
        <svg viewBox="-12 -12 24 24" className="w-5 h-7" stroke="currentColor" fill="none" strokeWidth="0.8">
          <path d="M 0 -8 L 7 4 L -7 4 Z" />
          <path d="M 0 8 L -7 -4 L 7 -4 Z" />
          <circle r="1" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

function CenterSigil() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -m-2 bg-blue-400/15 blur-xl rounded-full animate-pulse-glow" />
      <svg
        viewBox="-30 -30 60 60"
        className="relative w-16 h-16 sm:w-20 sm:h-20 text-blue-400"
        stroke="currentColor"
        fill="none"
      >
        <circle r="26" strokeWidth="0.9" />
        <circle r="22" strokeWidth="0.4" opacity="0.5" strokeDasharray="0.4 1.6" />
        <circle r="13" strokeWidth="0.6" opacity="0.65" />
        <path d="M 0 -16 L 13.85 8 L -13.85 8 Z" strokeWidth="0.8" fill="currentColor" fillOpacity="0.12" />
        <path d="M 0 16 L -13.85 -8 L 13.85 -8 Z" strokeWidth="0.8" fill="currentColor" fillOpacity="0.12" />
        <circle r="2.5" fill="currentColor" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-ping" />
      </div>
    </div>
  );
}

function DriftingSigils() {
  const sigils = [
    { ch: '☽', l: '8%',  delay: '0s',    dur: '14s', size: 22, drift: '-4px' },
    { ch: '☉', l: '92%', delay: '2.5s',  dur: '16s', size: 20, drift: '6px'  },
    { ch: '♃', l: '18%', delay: '5.2s',  dur: '15s', size: 18, drift: '-2px' },
    { ch: '♄', l: '82%', delay: '7.8s',  dur: '17s', size: 19, drift: '4px'  },
    { ch: '☿', l: '50%', delay: '3.6s',  dur: '18s', size: 17, drift: '-3px' },
    { ch: '♀', l: '30%', delay: '9.4s',  dur: '16s', size: 18, drift: '3px'  },
    { ch: '♂', l: '70%', delay: '11s',   dur: '15s', size: 19, drift: '-5px' },
    { ch: '⊛', l: '60%', delay: '13.5s', dur: '17s', size: 16, drift: '2px'  },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {sigils.map((s, i) => (
        <span
          key={i}
          className="absolute bottom-[-2rem] text-blue-400 animate-sigil-rise"
          style={{
            left: s.l,
            fontSize: `${s.size}px`,
            animationDelay: s.delay,
            animationDuration: s.dur,
            textShadow: '0 0 8px rgba(201, 163, 92, 0.55), 0 0 14px rgba(201, 163, 92, 0.25)',
            opacity: 0,
            fontFamily: '"Noto Serif TC", "Apple Symbols", serif',
            ...({ '--drift': s.drift } as React.CSSProperties),
          }}
        >
          {s.ch}
        </span>
      ))}
    </div>
  );
}

function DustAndStars() {
  const dust = Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 7.4 + 4) % 100}%`,
    delay: `${(i * 0.34) % 5}s`,
    size: 1 + (i % 3),
    duration: 4.2 + (i % 5) * 0.7,
  }));

  const stars = [
    { l: '12%', t: '18%', d: '0.0s', s: 2 },
    { l: '88%', t: '24%', d: '1.2s', s: 1 },
    { l: '8%',  t: '62%', d: '2.4s', s: 1 },
    { l: '92%', t: '70%', d: '0.6s', s: 2 },
    { l: '24%', t: '8%',  d: '3.0s', s: 1 },
    { l: '76%', t: '12%', d: '1.8s', s: 1 },
    { l: '20%', t: '88%', d: '2.7s', s: 1 },
    { l: '80%', t: '90%', d: '0.9s', s: 2 },
    { l: '4%',  t: '40%', d: '3.6s', s: 1 },
    { l: '96%', t: '46%', d: '1.5s', s: 1 },
    { l: '50%', t: '6%',  d: '2.1s', s: 1 },
    { l: '50%', t: '94%', d: '0.3s', s: 1 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dust.map((p, i) => (
        <span
          key={`d${i}`}
          className="absolute bottom-0 rounded-full bg-blue-300 animate-rise"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: 0,
            animationDelay: p.delay,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {stars.map((s, i) => (
        <span
          key={`s${i}`}
          className="absolute rounded-full bg-blue-200 animate-twinkle"
          style={{
            left: s.l,
            top: s.t,
            width: `${s.s}px`,
            height: `${s.s}px`,
            animationDelay: s.d,
            boxShadow: '0 0 8px 1px rgba(248, 240, 212, 0.6)',
          }}
        />
      ))}
    </div>
  );
}
