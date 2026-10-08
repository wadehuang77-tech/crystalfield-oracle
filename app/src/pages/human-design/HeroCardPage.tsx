import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { HDChart } from '../../lib/human-design/humanDesignCalc';
import { useRouteLanguage } from '../../hooks/useRouteLanguage';
import { t } from '../../lib/i18n';

interface HeroCardPageProps {
  chart: HDChart;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  onContinue: () => void;
}

const TYPE_COLORS: Record<string, { badge: string; glow: string; text: string; border: string }> = {
  'generator':            { badge: 'from-emerald-500 to-teal-500',    glow: 'bg-emerald-500/15', text: 'text-emerald-300',  border: 'border-emerald-400/25' },
  'manifesting-generator':{ badge: 'from-blue-500 to-cyan-500',       glow: 'bg-blue-500/15',    text: 'text-blue-300',     border: 'border-blue-400/25'    },
  'projector':            { badge: 'from-violet-500 to-purple-500',   glow: 'bg-violet-500/15',  text: 'text-violet-300',   border: 'border-violet-400/25'  },
  'manifestor':           { badge: 'from-orange-500 to-amber-500',    glow: 'bg-orange-500/15',  text: 'text-orange-300',   border: 'border-orange-400/25'  },
  'reflector':            { badge: 'from-sky-400 to-indigo-400',      glow: 'bg-sky-500/15',     text: 'text-sky-300',      border: 'border-sky-400/25'     },
};

const ENGLISH_TYPE_NAMES: Record<string, string> = {
  generator: 'Generator',
  'manifesting-generator': 'Manifesting Generator',
  projector: 'Projector',
  manifestor: 'Manifestor',
  reflector: 'Reflector',
};

const ENGLISH_PROFILE_NAMES: Record<string, string> = {
  '1/3': 'Investigator / Martyr',
  '1/4': 'Investigator / Opportunist',
  '2/4': 'Hermit / Opportunist',
  '2/5': 'Hermit / Heretic',
  '3/5': 'Martyr / Heretic',
  '3/6': 'Martyr / Role Model',
  '4/1': 'Opportunist / Investigator',
  '4/6': 'Opportunist / Role Model',
  '5/1': 'Heretic / Investigator',
  '5/2': 'Heretic / Hermit',
  '6/2': 'Role Model / Hermit',
  '6/3': 'Role Model / Martyr',
};

const ENGLISH_AUTHORITY_NAMES: Record<string, string> = {
  sacral: 'Sacral Authority',
  emotional: 'Emotional Authority',
  splenic: 'Splenic Authority',
  ego: 'Ego Authority',
  'self-projected': 'Self-Projected Authority',
  lunar: 'Lunar Authority',
};

const ENGLISH_STRATEGIES: Record<string, string> = {
  generator: 'Wait to Respond',
  'manifesting-generator': 'Wait to Respond, then Inform',
  projector: 'Wait for the Invitation',
  manifestor: 'Inform before Initiating',
  reflector: 'Wait through a Lunar Cycle (28 days)',
};

const ENGLISH_SIGNATURES: Record<string, string> = {
  generator: 'Satisfaction',
  'manifesting-generator': 'Satisfaction and Peace',
  projector: 'Success',
  manifestor: 'Peace',
  reflector: 'Surprise and Delight',
};

const ENGLISH_NOT_SELF_THEMES: Record<string, string> = {
  generator: 'Frustration',
  'manifesting-generator': 'Anger and Frustration',
  projector: 'Bitterness',
  manifestor: 'Anger',
  reflector: 'Disappointment',
};

const ENGLISH_CROSSES: Record<string, string> = {
  '右角十字架：人面獅身': 'Right Angle Cross of the Sphinx',
  '右角十字架：穿透': 'Right Angle Cross of Penetration',
  '右角十字架：計劃': 'Right Angle Cross of Planning',
  '右角十字架：保護': 'Right Angle Cross of Protection',
  '並列十字架：想像力': 'Juxtaposition Cross of Imagination',
  '並列十字架：服務': 'Juxtaposition Cross of Service',
  '並列十字架：訓誡': 'Juxtaposition Cross of Admonition',
  '並列十字架：獨處': 'Juxtaposition Cross of Aloneness',
  '左角十字架：融合': 'Left Angle Cross of Fusion',
  '左角十字架：業力': 'Left Angle Cross of Karma',
  '左角十字架：革命': 'Left Angle Cross of Revolution',
  '左角十字架：靜默': 'Left Angle Cross of Silence',
};

const ENGLISH_CHANNEL_NAMES: Record<string, string> = {
  '34-57': 'Power',
  '20-34': 'Charisma',
  '1-8': 'Inspiration',
  '13-33': 'The Prodigal',
  '2-14': 'The Beat',
  '5-15': 'Rhythm',
  '11-56': 'Curiosity',
  '7-31': 'The Alpha',
  '36-35': 'Transitoriness',
  '19-49': 'Synthesis',
  '37-40': 'Community',
  '6-59': 'Mating',
  '10-20': 'Awakening',
  '25-51': 'Initiation',
  '28-38': 'Struggle',
  '39-55': 'Emoting',
  '26-44': 'Surrender',
  '21-45': 'Money',
};

const ENGLISH_AI_INTROS: Record<string, string> = {
  '你的生命力像一座溫暖的泉源，遇見真正有回應的事，能量會自然湧出；不必對所有期待都說好。': 'Your life force is like a warm spring. When something genuinely resonates, your energy can flow naturally; you do not have to say yes to every expectation.',
  '你的靈魂透過身體說話。當下腹對一個人或方向亮起來，持續投入會為你帶來深深的滿足。': 'Your body has its own way of speaking. When you feel a clear inner response to a person or direction, sustained engagement can bring deep satisfaction.',
  '你來到這裡，不是為了勉強撐住每件事，而是把珍貴的生命力交給真正讓你有感覺的選擇。': 'You are not here to force yourself through everything. Your energy is precious; offer it to the choices that genuinely resonate with you.',
  '你的靈魂不是直線前進，而是透過好奇、嘗試與轉彎開出新路；先聽身體，再放心展開速度。': 'Your path does not have to be linear. Curiosity, experimentation, and changing direction can open new possibilities; listen to your body before picking up speed.',
  '你可以同時熱愛很多事。真正重要的不是逼自己專一，而是分辨哪些方向此刻仍讓生命能量發亮。': 'You can love many things at once. Rather than forcing yourself to choose just one, notice which directions still make your energy feel alive.',
  '你帶著快速創造的火花；啟動前的一次身體確認與清楚告知，會讓自由和關係一起順流。': 'You carry a spark for swift creation. Checking in with your body and informing those affected before you begin can support both freedom and connection.',
  '你帶著一雙能看見深處的眼睛。當智慧被真正認可與邀請，它能溫柔照亮別人忽略的方向。': 'You have an eye for what lies beneath the surface. When your insight is recognized and welcomed, it can gently illuminate directions others may have missed.',
  '你不必靠不停付出證明價值。合適的人會看見你的洞察，而休息會讓這份光保持清澈。': 'You do not have to prove your worth through constant effort. The right people can recognize your insight, and rest helps keep it clear.',
  '你的靈魂擅長引導而不是硬撐；把能量留給真心邀請你的人，成功感會從被看見中自然生長。': 'Your strength is in guidance, not in pushing through at any cost. Save your energy for genuine invitations, and let success grow from being seen.',
  '你帶著開路的火種，能感受到新的開始何時到來。行動前清楚告知，會讓自由與周圍的關係更和諧。': 'You carry a spark for opening new paths and sensing when a fresh start is near. Informing others before you act can help your independence and relationships coexist more harmoniously.',
  '你的靈魂需要自主，也有能力點燃改變。你不用等待所有人同意，只需誠實說明方向並尊重自己的休息。': 'Your spirit needs autonomy and can set change in motion. You do not need everyone’s approval; communicate your direction honestly and respect your need for rest.',
  '當內在的啟動感清楚升起，你能替尚未成形的可能打開入口；告知會讓這股力量更平和地被接住。': 'When a clear impulse to begin arises, you can open a door to possibilities not yet formed. Informing others can help your initiative be received more smoothly.',
  '你像月光下的清澈鏡面，細膩感受人與空間的真實狀態。好的環境會讓你的靈魂展現驚喜與喜悅。': 'Like a clear mirror in moonlight, you can be sensitive to the qualities of people and places. A supportive environment can make room for surprise and delight.',
  '你的開放不是空白，而是能感受生命多種面貌的禮物；重大決定請讓時間與月亮替感受慢慢澄清。': 'Your openness is not emptiness; it can be a gift for experiencing life from many angles. Give important decisions time for your feelings to become clearer.',
  '你會映照周圍能量，也需要記得哪些感受只是經過。選擇滋養的場域，是你最重要的靈性照顧。': 'You may reflect the energy around you, while remembering that some feelings are only passing through. Choosing nourishing environments is an important way to care for yourself.',
};

function CenterDot({ defined }: { defined: boolean }) {
  return (
    <div
      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
        defined
          ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
          : 'bg-transparent border-white/20'
      }`}
    />
  );
}

export default function HeroCardPage({ chart, birthDate, birthTime, birthCity, onContinue }: HeroCardPageProps) {
  const language = useRouteLanguage();
  const copy = (key: string, fallback: string) => language === 'en' ? t(`humanDesign.${key}`, language) : fallback;
  const [visible, setVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const colors = TYPE_COLORS[chart.type] ?? TYPE_COLORS['generator'];

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setCardVisible(true), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const centerGroups = [
    { label: language === 'en' ? 'Head' : '頭頂', key: 'head' as const },
    { label: language === 'en' ? 'Ajna' : '邏輯', key: 'ajna' as const },
    { label: language === 'en' ? 'Throat' : '喉嚨', key: 'throat' as const },
    { label: 'G', key: 'g' as const },
    { label: language === 'en' ? 'Heart' : '心臟', key: 'heart' as const },
    { label: language === 'en' ? 'Sacral' : '薦骨', key: 'sacral' as const },
    { label: language === 'en' ? 'Solar Plexus' : '情緒', key: 'solar-plexus' as const },
    { label: language === 'en' ? 'Spleen' : '脾臟', key: 'spleen' as const },
    { label: language === 'en' ? 'Root' : '根部', key: 'root' as const },
  ];
  const displayedTypeName = language === 'en' ? ENGLISH_TYPE_NAMES[chart.type] ?? chart.type : chart.typeName;
  const displayedProfileName = language === 'en' ? ENGLISH_PROFILE_NAMES[chart.profile] ?? chart.profile : chart.profileName;
  const displayedAuthorityName = language === 'en' ? ENGLISH_AUTHORITY_NAMES[chart.authority] ?? chart.authority : chart.authorityName;
  const displayedStrategy = language === 'en' ? ENGLISH_STRATEGIES[chart.type] : chart.strategy;
  const displayedCross = language === 'en' ? ENGLISH_CROSSES[chart.incarnationCross] ?? 'Incarnation Cross' : chart.incarnationCross;
  const displayedSignature = language === 'en' ? ENGLISH_SIGNATURES[chart.type] : chart.signature;
  const displayedNotSelf = language === 'en' ? ENGLISH_NOT_SELF_THEMES[chart.type] : chart.notSelf;
  const displayedIntro = language === 'en'
    ? ENGLISH_AI_INTROS[chart.aiIntro] ?? 'Use your chart as a prompt for self-reflection, and keep what resonates with your lived experience.'
    : chart.aiIntro;

  const metaRows = [
    { label: copy('profile', '人生角色'), value: `${chart.profile}  ${displayedProfileName}` },
    { label: copy('authority', '內在權威'), value: displayedAuthorityName },
    { label: copy('strategy', '策略'), value: displayedStrategy },
    { label: copy('incarnationCross', '本命十字'), value: displayedCross },
    { label: copy('signature', '最高狀態'), value: displayedSignature },
    { label: copy('notSelf', '非自我主題'), value: displayedNotSelf },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-20">
      <div className="w-full max-w-lg">

        {/* Header announcement */}
        <div
          className={`text-center mb-7 transition-all duration-600 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/5 mb-4">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-cyan-400 tracking-widest font-medium uppercase">
              {copy('heroComplete', '你的人類圖能量藍圖已完成')}
            </span>
          </div>
          <div className="text-white/30 text-xs">
            {birthDate} · {birthTime} · {birthCity}
          </div>
        </div>

        {/* Main Hero Card */}
        <div
          className={`relative rounded-3xl overflow-hidden transition-all duration-700 ease-out mb-5 ${
            cardVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'
          }`}
        >
          {/* Card background */}
          <div className="absolute inset-0 bg-white/3 backdrop-blur-sm" />
          <div className={`absolute inset-0 ${colors.glow} opacity-60`} />
          <div className={`absolute inset-0 border ${colors.border} rounded-3xl`} />

          <div className="relative p-7">
            {/* Type Badge */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-white/35 text-xs mb-1.5 font-medium tracking-widest uppercase">
                  {copy('typeLabel', '你的類型')}
                </p>
                <div className="flex items-center gap-3">
                  <div className={`inline-flex px-4 py-1.5 rounded-full bg-gradient-to-r ${colors.badge} shadow-lg`}>
                    <span className="text-white font-bold text-sm tracking-wide">
                      {displayedTypeName}
                    </span>
                  </div>
                </div>
              </div>
              {/* Center diagram */}
              <div className="flex flex-col items-center gap-1.5">
                {centerGroups.map(cg => (
                  <div key={cg.key} className="flex items-center gap-1.5">
                    <span className="text-white/20 text-[9px] w-9 text-right">{cg.label}</span>
                    <CenterDot defined={chart.definedCenters.includes(cg.key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Key info rows */}
            <div className="space-y-3 mb-6">
              {metaRows.map(row => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <span className="text-white/30 text-xs flex-shrink-0 pt-0.5 w-20">{row.label}</span>
                  <span className={`text-sm font-medium text-right ${colors.text}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/8 mb-5" />

            {/* AI Intro */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-white/30 text-xs font-medium">{copy('soulMessage', '靈魂使命訊息')}</span>
              </div>
              <p className="text-white/75 text-sm leading-[1.8] pl-7 italic">
                "{displayedIntro}"
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div
          className={`transition-all duration-700 delay-300 ease-out ${cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="space-y-3">
            <button
              type="button"
              onClick={onContinue}
              className="group relative w-full py-4 rounded-2xl text-sm font-semibold overflow-hidden disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative flex items-center justify-center gap-2 text-white">
                <Sparkles className="w-4 h-4" />
                {copy('viewFreeReport', '查看免費報告')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Channels tag cloud */}
        <div
          className={`mt-6 transition-all duration-700 delay-500 ease-out ${cardVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <p className="text-white/20 text-xs text-center mb-3">{copy('channels', '偵測到的主要通道')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {chart.keyChannels.map(ch => (
              <span key={ch} className="px-2.5 py-1 rounded-full text-xs text-white/30 border border-white/8 bg-white/3">
                {language === 'en'
                  ? `${ch.split(' ')[0]} ${ENGLISH_CHANNEL_NAMES[ch.split(' ')[0]] ?? ''}`.trim()
                  : ch}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
