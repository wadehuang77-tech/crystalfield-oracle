import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import type { NumerologyReport } from '../../lib/numerology';
import { missingNumberData } from '../../lib/numerology';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  report: NumerologyReport;
}

const suggestions = [
  '最近總覺得沒自信',
  '感情方面有些困擾',
  '如何改善我的財運？',
  '我適合什麼工作？',
  '如何提升靈性連結？',
];

function generateResponse(input: string, report: NumerologyReport): string {
  const lower = input.toLowerCase();
  const missing = report.missingNumbers;

  if (lower.includes('自信') || lower.includes('行動') || lower.includes('勇氣')) {
    const hasMissing1 = missing.includes(1);
    const crystals = hasMissing1 ? missingNumberData[1].crystals.map(c => c.nameZh).join('、') : '太陽石、虎眼石';
    return `根據你的生命靈數 ${report.lifePathNumber}${hasMissing1 ? ' 且缺少數字1的能量' : ''}，
你的自信不足可能源於太陽神經叢脈輪能量不平衡。

建議你每天早晨攜帶 **${crystals}**，並在清晨陽光下冥想5分鐘，
對自己重複：「我有足夠的力量，我值得被看見。」

水晶的振頻會逐漸與你的能量場共鳴，通常3-4週後會開始感受到變化。`;
  }

  if (lower.includes('感情') || lower.includes('愛情') || lower.includes('關係')) {
    const hasMissing2 = missing.includes(2);
    const hasMissing6 = missing.includes(6);
    const crystals = hasMissing2 ? '粉晶、月光石' : hasMissing6 ? '綠幽靈、玫瑰石英' : '粉晶、月光石';
    return `你的生命靈數 ${report.lifePathNumber} 在感情方面${hasMissing2 || hasMissing6 ? '有些需要特別關注的能量缺口' : '有美好的潛力'}。

${hasMissing2 ? '缺少數字2的你可能在關係中容易迷失自我，建議' : '建議'}攜帶 **${crystals}** 來開啟心輪能量。

最重要的是：先深深地愛自己，才能以完整的狀態進入一段關係。
可以嘗試「感情療癒能量串」，幫助你吸引對等且健康的愛。`;
  }

  if (lower.includes('財運') || lower.includes('錢') || lower.includes('收入') || lower.includes('工作')) {
    const hasMissing8 = missing.includes(8);
    return `你的生命靈數 ${report.lifePathNumber}，${report.wealthEnergy}。
${hasMissing8 ? '\n缺少數字8的你可能有潛意識的財富限制性信念，建議先做財富意識的清理。' : ''}

推薦你的財運水晶組合：
• **金髮晶** — 強力吸引財富能量
• **虎眼石** — 增強商業直覺與機遇
• **黃水晶** — 維持豐盛意識

搭配每日早晨宣言：「財富輕鬆地流向我。」`;
  }

  if (lower.includes('靈性') || lower.includes('直覺') || lower.includes('冥想')) {
    return `你的靈魂課題：「${report.soulLesson}」。

生命靈數 ${report.lifePathNumber} 的你，對應的是 ${report.chakra}。

靈性提升建議：
• 每天靜心冥想10分鐘，手持 **${report.missingNumbers.includes(7) ? '紫水晶或拉長石' : '紫水晶'}**
• 滿月時進行水晶淨化儀式
• 睡前寫下三件感恩的事

${report.chakra} 的開啟，會讓你的直覺越來越清晰。`;
  }

  // Default intelligent response
  const topMissing = missing[0];
  const missingData = topMissing ? missingNumberData[topMissing] : null;

  return `根據你的靈魂密碼分析，生命靈數 **${report.lifePathNumber}** 的你，
核心特質是：${report.personality}。

${missingData ? `你目前最需要補充的是數字${topMissing}的能量——「${missingData.challenge}」。
推薦水晶：**${missingData.crystals.map(c => c.nameZh).join('、')}**

` : ''}針對你的問題，建議先做一次完整的脈輪掃描冥想，
感受哪個能量中心最需要關注，然後選擇對應的水晶來協助平衡。

你還有其他想了解的能量課題嗎？`;
}

export default function AIChatAdvisor({ report }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `你好！我是你的 AI 能量分析師 ✦

根據你的生命靈數 **${report.lifePathNumber}**，我已掌握你的能量藍圖。
你可以問我關於感情、財運、靈性成長，或任何能量課題。

我將結合你的靈數特質，為你提供個人化的水晶療癒建議。`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    const reply = generateResponse(text, report);
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const boldified = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gold-400">$1</strong>');
      return <p key={i} className={line === '' ? 'mb-2' : 'mb-1'} dangerouslySetInnerHTML={{ __html: boldified }} />;
    });
  };

  return (
    <div className="crystal-card rounded-3xl overflow-hidden flex flex-col" style={{ height: 480 }}>
      <div className="flex items-center gap-2 p-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400/20 to-crystal-teal/10 border border-gold-400/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-gold-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">AI 能量分析師</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-500">線上中</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-400/20 to-gold-400/5 border border-gold-400/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="w-3 h-3 text-gold-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gold-400/10 border border-gold-400/20 text-gray-200 rounded-tr-sm'
                  : 'glass text-gray-300 rounded-tl-sm'
              }`}
            >
              {formatContent(msg.content)}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-obsidian-700 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3 h-3 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-400/20 to-gold-400/5 border border-gold-400/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3 h-3 text-gold-400" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gold-400/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs glass rounded-full px-3 py-1.5 text-gray-400 hover:text-gray-200 whitespace-nowrap hover:border-white/15 transition-all duration-200 flex-shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="輸入你的能量課題..."
            className="flex-1 glass rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gold-400/30 transition-colors"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center hover:bg-gold-400/20 transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4 text-gold-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
