import { Gem, ShoppingBag, Sparkles } from 'lucide-react';
import type { NumerologyReport } from '../../lib/numerology';
import { missingNumberData, lifePathCrystals } from '../../lib/numerology';
import type { PlanTier } from '../../hooks/usePremium';

interface Props {
  report: NumerologyReport;
  tier: PlanTier;
  onUpgrade: (required: PlanTier) => void;
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

const lifePathCrystalGrids: Record<number, string> = {
  1: '生命靈數 1 適合使用「意志錨定水晶陣」，陣型採十字穩定法。將黑曜石放在中央，象徵自我核心；正前方放黃水晶啟動目標與行動力，後方放茶晶接地，左側放白水晶淨化雜念，右側放紅瑪瑙補強勇氣。擺放時由中心向四方啟動，最後雙手覆於中央石上設定「我以穩定力量開創道路」。此陣功能在於平衡過強的衝勁，減少急躁、孤軍奮戰與自我懷疑，讓 1 號的領導力能更踏實落地。',
  2: '生命靈數 2 適合使用「心輪柔光水晶陣」，陣型採圓形包覆法。以粉晶置於中央作為心輪核心，外圈順時針放月光石、祖母綠、海藍寶與白水晶，形成柔和保護圈。粉晶安撫情緒，月光石穩定敏感波動，祖母綠修復關係傷口，海藍寶協助表達需求，白水晶放大整體頻率。此陣適合睡前或情緒緊繃時使用，功能是療癒依附不安、過度迎合與害怕衝突，幫助 2 號建立溫柔但清楚的能量界線。',
  3: '生命靈數 3 適合使用「創造表達水晶陣」，陣型採三角擴音法。將海藍寶放在中央，對應喉輪與真實表達；三角三端分別放紫水晶、黃水晶與太陽石，紫水晶接收靈感，黃水晶整理思緒，太陽石提升自信與舞台感。外圈可加白水晶作為放大器。啟動時先深呼吸，再說出一個想創作或表達的主題。此陣功能是清理腦中雜訊、穩定情緒起伏，讓 3 號的靈感不再分散，而能成為清楚、有感染力的作品與語言。',
  4: '生命靈數 4 適合使用「大地穩定水晶陣」，陣型採方形守護法。以茶晶或黑碧璽置中，四角放東菱玉、黑曜石、綠幽靈與白水晶，形成穩固的地基結界。茶晶負責接地，黑曜石釋放壓力，東菱玉放鬆心輪緊繃，綠幽靈協助工作與財務穩定，白水晶整合能量。可放在工作桌或床邊，每次使用時觀想能量向下扎根。此陣功能是舒緩過度責任感、完美主義與長期緊繃，讓 4 號把努力轉化為安全感與可持續的成果。',
  5: '生命靈數 5 適合使用「自由流動水晶陣」，陣型採螺旋流動法。將螢石放在中央整理混亂思緒，再由內向外螺旋排列藍紋瑪瑙、黃水晶、白水晶與黑碧璽。螢石幫助聚焦，藍紋瑪瑙穩定溝通，黃水晶提升選擇力，白水晶清理雜訊，黑碧璽防止能量過度外散。啟動時以手指沿螺旋方向慢慢繞行，觀想所有變動回到清楚節奏。此陣功能是降低衝動、分心與不安，讓 5 號在追求自由時仍保有中心與方向。',
  6: '生命靈數 6 適合使用「愛與滋養水晶陣」，陣型採心形回流法。以綠色電氣石或祖母綠置於中央，左右放粉晶與月光石，底部放橄欖石，上方放白水晶，形成心形能量回流。中央石修復心輪，粉晶帶來自愛，月光石安撫照顧者疲憊，橄欖石補充生命力，白水晶協助把愛回到自己身上。使用時把雙手放在心口，默念「我也值得被照顧」。此陣功能是釋放過度付出、關係責任與情感耗損，讓 6 號先被滋養，再穩定地愛人。',
  7: '生命靈數 7 適合使用「靈性接地水晶陣」，陣型採上下軸線法。將青金石放在上方連結高我，黑碧璽放在下方接地，中間放白水晶整合訊息，左右放紫水晶與拉長石提升直覺與洞察。此陣像一條從天到地的能量柱，適合冥想、閱讀或思緒過度活躍時使用。啟動時先感覺頭頂光線，再把光帶到腳底。功能是平衡 7 號容易過度分析、孤立與精神飄浮的狀態，讓直覺不只停在腦中，而能落成可信任的生活指引。',
  8: '生命靈數 8 適合使用「豐盛顯化水晶陣」，陣型採八方財富輪。以鈦晶或黃水晶置中，象徵財富核心；四正方放虎眼石、綠幽靈、黑曜石與白水晶，四斜方可用小顆黃水晶或透明水晶補足八方流動。虎眼石強化判斷，綠幽靈穩定事業與金流，黑曜石清理壓力與控制欲，白水晶放大意圖。啟動時寫下具體目標放在中央石下。此陣功能是把 8 號的企圖心導向穩定顯化，平衡權力、壓力、金錢與責任感。',
  9: '生命靈數 9 適合使用「靈魂整合水晶陣」，陣型採外圈釋放法。以拉長石置於中央，象徵靈魂整合與舊能量清理；外圈順時針放紫水晶、粉晶、白水晶、黑曜石與月光石。紫水晶提升慈悲智慧，粉晶修復心輪，白水晶整合能量，黑曜石釋放沉重情緒，月光石協助溫柔結束舊循環。使用時可寫下想放下的人事物放在陣旁，完成後收起紙張。此陣功能是幫助 9 號釋放過度承擔、舊情緒與救贖慣性，讓療癒力先回到自己。',
};

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

const CRYSTAL_GLOW_COLORS = [
  '#f8d56b', // gold
  '#67e8f9', // aqua
  '#c084fc', // amethyst purple
  '#6ee7b7', // emerald
  '#f9a8d4', // rose
  '#93c5fd', // sky blue
  '#fca5a5', // coral
  '#a3e635', // lime
];

function getCrystalGlowColor(name: string, hex?: string): string {
  if (hex) return hex;
  const idx = name.charCodeAt(0) % CRYSTAL_GLOW_COLORS.length;
  return CRYSTAL_GLOW_COLORS[idx];
}

function CrystalNameBadge({ name, hex }: { name: string; hex?: string }) {
  const color = getCrystalGlowColor(name, hex);
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{
        color,
        background: `${color}15`,
        border: `1px solid ${color}35`,
        textShadow: `0 0 8px ${color}90, 0 0 16px ${color}50`,
        boxShadow: `0 0 6px ${color}25`,
      }}
    >
      {name}
    </span>
  );
}

function BraceletCard({ theme, featured = false }: { theme: BraceletTheme; featured?: boolean }) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-200"
      style={{
        background: featured
          ? 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.03) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: featured ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <span
            className="text-[10px] rounded-full px-2 py-0.5 font-semibold tracking-wide"
            style={{
              background: `${theme.tagColor}20`,
              color: theme.tagColor,
              border: `1px solid ${theme.tagColor}40`,
              textShadow: `0 0 6px ${theme.tagColor}80`,
            }}
          >
            {theme.tag}
          </span>
          {featured && (
            <span
              className="text-[10px] rounded-full px-2 py-0.5 font-semibold"
              style={{
                background: 'rgba(251,191,36,0.15)',
                color: '#fde68a',
                border: '1px solid rgba(251,191,36,0.35)',
                textShadow: '0 0 6px rgba(251,191,36,0.7)',
              }}
            >
              專屬推薦
            </span>
          )}
        </div>
        <ShoppingBag className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: `${theme.tagColor}80` }} />
      </div>

      {/* Bracelet name */}
      <p
        className="text-sm font-semibold mt-2 leading-snug"
        style={{
          color: '#f3e8ff',
          textShadow: '0 0 12px rgba(196,181,253,0.4)',
        }}
      >
        {theme.name}
      </p>

      {/* Crystal name pills */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {theme.crystalNames.map((n, i) => (
          <CrystalNameBadge key={i} name={n} />
        ))}
      </div>

      {/* Description */}
      <p
        className="text-xs mt-2.5 leading-relaxed"
        style={{ color: 'rgba(233,213,255,0.75)' }}
      >
        {theme.description}
      </p>
    </div>
  );
}

export default function CrystalBracelet({ report, tier: _tier, onUpgrade: _onUpgrade }: Props) {
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
  const crystalGridGuidance = lifePathCrystalGrids[lifeNum] ?? lifePathCrystalGrids[1];

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
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{
          background: 'linear-gradient(135deg, rgba(94,234,212,0.08) 0%, rgba(167,139,250,0.035) 100%)',
          border: '1px solid rgba(94,234,212,0.18)',
        }}
      >
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4" style={{ color: '#5eead4' }} />
          <h3 className="text-sm font-medium" style={{ color: '#e9d5ff' }}>神聖水晶陣指引</h3>
        </div>
        <p className="text-sm leading-[1.9]" style={{ color: 'rgba(233,213,255,0.78)' }}>
          {crystalGridGuidance}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" style={{ color: '#fbbf24' }} />
        <h3 className="text-sm font-medium" style={{ color: '#e9d5ff' }}>專屬水晶手串推薦</h3>
      </div>

      {/* Custom bracelet visual */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <p
            className="text-[11px] uppercase tracking-widest font-medium"
            style={{ color: 'rgba(196,181,253,0.6)', textShadow: '0 0 8px rgba(196,181,253,0.3)' }}
          >
            你的專屬能量配方
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {uniqueCrystals.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CrystalBead hex={c.hex} />
                {i < uniqueCrystals.length - 1 && (
                  <div className="w-4 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
                )}
              </div>
            ))}
            {uniqueCrystals.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <CrystalBead hex={uniqueCrystals[0]?.hex || '#fbbf24'} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueCrystals.map((c, i) => (
              <CrystalNameBadge key={c.nameZh} name={c.nameZh} hex={CRYSTAL_GLOW_COLORS[i % CRYSTAL_GLOW_COLORS.length]} />
            ))}
          </div>
        </div>

        {/* Theme bracelets */}
        <div className="space-y-3">
          <p
            className="text-[11px] uppercase tracking-widest font-medium"
            style={{ color: 'rgba(196,181,253,0.6)', textShadow: '0 0 8px rgba(196,181,253,0.3)' }}
          >
            能量主題手串
          </p>
          <BraceletCard theme={featuredBracelet} featured />
          {generalTwo.map(theme => (
            <BraceletCard key={theme.id} theme={theme} />
          ))}
        </div>
    </div>
  );
}
