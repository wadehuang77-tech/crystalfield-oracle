import { Sun, Gem, Palette, Bell } from 'lucide-react';
import { getDailyEnergy } from '../../lib/numerology';

interface Props {
  lifePathNumber: number;
}

export default function DailyEnergy({ lifePathNumber }: Props) {
  const today = new Date();
  const daily = getDailyEnergy(today, lifePathNumber);

  const dateStr = today.toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const colorName =
    daily.energy.includes('財') ? '金色' :
    daily.energy.includes('愛') || daily.energy.includes('療') ? '玫瑰' :
    daily.energy.includes('靈') ? '深藍' :
    daily.energy.includes('創') ? '天藍' : '琥珀';

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%)',
    border: '1px solid rgba(255,255,255,0.09)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  };

  return (
    <div className="rounded-3xl p-6 space-y-4" style={cardStyle}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4" style={{ color: '#fbbf24' }} />
          <h3 className="text-sm font-medium" style={{ color: '#e9d5ff' }}>今日能量訊息</h3>
        </div>
        <span className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>{dateStr}</span>
      </div>

      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: `linear-gradient(135deg, ${daily.color}12, ${daily.color}05)`,
          border: `1px solid ${daily.color}22`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse-slow"
            style={{ background: daily.color, boxShadow: `0 0 8px ${daily.color}` }}
          />
          <span className="text-base font-serif font-medium" style={{ color: daily.color }}>{daily.energy}</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(233,213,255,0.75)' }}>{daily.message}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-3 space-y-1"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(196,181,253,0.45)' }}>
            <Gem className="w-3 h-3" />
            今日水晶
          </div>
          <p className="text-sm font-medium" style={{ color: '#e9d5ff' }}>{daily.crystal}</p>
        </div>
        <div
          className="rounded-xl p-3 space-y-1"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(196,181,253,0.45)' }}>
            <Palette className="w-3 h-3" />
            幸運色系
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: daily.color, boxShadow: `0 0 8px ${daily.color}60` }} />
            <span className="text-sm font-medium" style={{ color: daily.color }}>{colorName}</span>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-3 flex items-start gap-2"
        style={{
          background: 'rgba(251,191,36,0.05)',
          border: '1px solid rgba(251,191,36,0.15)',
        }}
      >
        <Bell className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#fbbf24' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(233,213,255,0.65)' }}>
          今日靈數 <span className="font-medium" style={{ color: '#fbbf24' }}>{daily.energy}</span>，把推薦水晶帶在身上，
          強化你的個人能量場。
        </p>
      </div>
    </div>
  );
}
