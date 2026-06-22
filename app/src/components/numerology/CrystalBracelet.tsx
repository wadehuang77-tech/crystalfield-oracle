import { ShoppingBag, Sparkles } from 'lucide-react';
import type { NumerologyReport } from '../../lib/numerology';
import { missingNumberData, lifePathCrystals } from '../../lib/numerology';

interface Props {
  report: NumerologyReport;
}

interface BraceletTheme {
  id: string;
  name: string;
  description: string;
  tag: string;
  tagColor: string;
  crystalHexes: string[];
  crystalNames: string[];
}

const lifePathBracelets: Record<number, BraceletTheme> = {
  1: {
    id: 'lp1',
    name: '意志錨定開創串',
    description: '結合黑曜石與骨幹水晶，穩固下三輪。強化獨立開創的勇氣，將意志力轉化為實質的物質界顯化，不再將力量外包。',
    tag: '個人力量',
    tagColor: '#f59e0b',
    crystalHexes: [],
    crystalNames: ['黑曜石', '骨幹水晶'],
  },
  2: {
    id: 'lp2',
    name: '心輪能量縫合串',
    description: '運用祖母綠與粉晶的溫柔綠光，縫合能量場裂痕。協助高敏感族群建立健康的情緒界線，在關係中安心接收愛。',
    tag: '關係修復',
    tagColor: '#6ee7b7',
    crystalHexes: [],
    crystalNames: ['祖母綠', '粉晶'],
  },
  3: {
    id: 'lp3',
    name: '靈感垂直貫穿串',
    description: '以高頻紫水晶與海藍寶打通眉心輪與喉輪通道。清理理智體雜訊，將源頭的靈感與創造力順暢落地於三維世界。',
    tag: '創意表達',
    tagColor: '#7dd3fc',
    crystalHexes: [],
    crystalNames: ['紫水晶', '海藍寶'],
  },
  4: {
    id: 'lp4',
    name: '大地紮根與釋放串',
    description: '透過綠色東菱玉與茶晶，釋放過度承擔的完美主義。深層放鬆心輪的緊繃，並將能量穩穩錨定於大地。',
    tag: '落實穩定',
    tagColor: '#a16207',
    crystalHexes: [],
    crystalNames: ['東菱玉', '茶晶'],
  },
  5: {
    id: 'lp5',
    name: '意識擴展與防護串',
    description: '運用螢石與白水晶疏通僵化思維。梳理外圍氣場，幫助你突破自我設限，帶著覺知與彈性迎接生命新階段。',
    tag: '突破限制',
    tagColor: '#818cf8',
    crystalHexes: [],
    crystalNames: ['螢石', '白水晶'],
  },
  6: {
    id: 'lp6',
    name: '無條件之愛滋養串',
    description: '蘊含綠色電氣石的強大修復力，專注滋養耗竭的心輪。消融能量防護罩，允許自己被宇宙的豐盛與愛緊緊包圍。',
    tag: '深度療癒',
    tagColor: '#fb7185',
    crystalHexes: [],
    crystalNames: ['綠色電氣石', '粉晶'],
  },
  7: {
    id: 'lp7',
    name: '靈性管道重啟串',
    description: '青金石搭配骨幹水晶，淨化過度活躍的腦部邏輯雜訊。重啟與高我的連結，將古老智慧與靈感落實於日常。',
    tag: '直覺覺察',
    tagColor: '#60a5fa',
    crystalHexes: [],
    crystalNames: ['青金石', '骨幹水晶'],
  },
  8: {
    id: 'lp8',
    name: '豐盛顯化高頻串',
    description: '以超級七（Super Seven）與鈦晶啟動太陽神經叢。對齊宇宙法則，提供源源不絕的動能，讓靈感在物質界大放異彩。',
    tag: '權力豐盛',
    tagColor: '#fbbf24',
    crystalHexes: [],
    crystalNames: ['超級七', '鈦晶'],
  },
  9: {
    id: 'lp9',
    name: '靈魂藍圖校準串',
    description: '運用拉長石洗滌舊有業力印記。保護能量場免受世俗低頻消耗，擴展意識維度，以更高維度視角引領生命。',
    tag: '靈性視野',
    tagColor: '#d1d5db',
    crystalHexes: [],
    crystalNames: ['拉長石', '白水晶'],
  },
};

const generalBracelets: BraceletTheme[] = [
  {
    id: 'wealth',
    name: '2026 財運強化陣',
    description: '激活豐盛意識，吸引財富流入',
    tag: '財運',
    tagColor: '#fbbf24',
    crystalHexes: [],
    crystalNames: ['金髮晶', '虎眼石'],
  },
  {
    id: 'love',
    name: '感情修復能量串',
    description: '開啟心輪，深化愛的連結與吸引力',
    tag: '感情',
    tagColor: '#fda4af',
    crystalHexes: [],
    crystalNames: ['粉晶', '綠東陵'],
  },
  {
    id: 'soul',
    name: '靈魂使命覺醒串',
    description: '強化直覺，連結更高自我與人生目的',
    tag: '靈性',
    tagColor: '#a78bfa',
    crystalHexes: [],
    crystalNames: ['紫水晶', '白水晶'],
  },
];

function CrystalBead({ hex, size = 'md' }: { hex: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';
  return (
    <div
      className={`${s} rounded-full flex-shrink-0 relative`}
      style={{
        background: `radial-gradient(circle at 30% 25%, ${hex}ee, ${hex}88, ${hex}44)`,
        boxShadow: `0 0 8px ${hex}60, inset 0 1px 2px rgba(255,255,255,0.3)`,
      }}
    >
      <div className="absolute top-[15%] left-[20%] w-[25%] h-[25%] rounded-full bg-white/40" />
    </div>
  );
}

function BraceletCard({ theme, featured = false }: { theme: BraceletTheme; featured?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200 cursor-pointer"
      style={{
        background: featured ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.03)',
        border: featured ? '1px solid rgba(251,191,36,0.15)' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] rounded-full px-2 py-0.5 font-medium"
            style={{ background: `${theme.tagColor}18`, color: theme.tagColor }}
          >
            {theme.tag}
          </span>
          {featured && (
            <span className="text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
              專屬推薦
            </span>
          )}
          <span className="text-sm font-medium" style={{ color: '#e9d5ff' }}>{theme.name}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[11px] rounded px-2 py-0.5 tracking-wide" style={{ color: 'rgba(196,181,253,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {theme.crystalNames.join(' ‧ ')}
          </span>
        </div>
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(196,181,253,0.45)' }}>{theme.description}</p>
      </div>
      <ShoppingBag className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: 'rgba(167,139,250,0.35)' }} />
    </div>
  );
}

export default function CrystalBracelet({ report }: Props) {
  const missingCrystals = report.missingNumbers
    .flatMap(n => missingNumberData[n]?.crystals || [])
    .slice(0, 4);

  const lifeCrystals = lifePathCrystals[report.lifePathNumber] || [];
  const allCrystals = [...lifeCrystals, ...missingCrystals].slice(0, 8);
  const uniqueCrystals = allCrystals.filter(
    (c, i, arr) => arr.findIndex(x => x.nameZh === c.nameZh) === i
  );

  const lifeNum = report.lifePathNumber > 9 ? 9 : report.lifePathNumber;
  const featuredBracelet = lifePathBracelets[lifeNum] ?? lifePathBracelets[1];

  const generalTwo = generalBracelets
    .filter(b => b.id !== featuredBracelet.id)
    .slice(0, 2);

  return (
    <div
      className="rounded-3xl p-6 space-y-5"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" style={{ color: '#fbbf24' }} />
        <h3 className="text-sm font-medium" style={{ color: '#e9d5ff' }}>專屬水晶手串推薦</h3>
      </div>

      {/* Custom bracelet visual */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(196,181,253,0.4)' }}>你的專屬能量配方</p>
        <div className="flex items-center gap-2 flex-wrap">
          {uniqueCrystals.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <CrystalBead hex={c.hex} />
              {i < uniqueCrystals.length - 1 && (
                <div className="w-4 h-px bg-gold-400/20" />
              )}
            </div>
          ))}
          {uniqueCrystals.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-px bg-gold-400/20" />
              <CrystalBead hex={uniqueCrystals[0]?.hex || '#fbbf24'} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {uniqueCrystals.map(c => (
            <span key={c.nameZh} className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>{c.nameZh}</span>
          ))}
        </div>
      </div>

      {/* Theme bracelets */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(196,181,253,0.35)' }}>能量主題手串</p>
        <BraceletCard theme={featuredBracelet} featured />
        {generalTwo.map(theme => (
          <BraceletCard key={theme.id} theme={theme} />
        ))}
      </div>
    </div>
  );
}
