import { Sparkles, Heart } from 'lucide-react';

export function DeepHealingCTA() {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-center shadow-2xl border-2 border-blue-400/30">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-400 rounded-full flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-blue-100" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-blue-100 mb-3">
        如果這次占卜讓你有共鳴
      </h3>

      <p className="text-blue-100 mb-2 text-lg">
        代表你已經準備好進入下一個階段
      </p>
      <p className="text-blue-100 mb-2 text-lg">
        有些問題，塔羅只能提醒
      </p>
      <p className="text-blue-100 mb-8 text-lg font-medium">
        真正的轉變，需要更深層的引導
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="https://cal.com/yourlink"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-400 hover:to-blue-400 text-blue-100 font-bold text-lg rounded-xl shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
        >
          <Heart className="w-5 h-5" />
          預約深度療癒解析
        </a>

        <a
          href="/healing-system"
          className="px-6 py-4 bg-slate-800/10 hover:bg-slate-800/20 text-blue-100 font-bold text-lg rounded-xl border-2 border-white/30 hover:border-blue-500/150 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 backdrop-blur-sm"
        >
          <Sparkles className="w-5 h-5" />
          了解 AI 療癒系統（免費說明會）
        </a>
      </div>
    </div>
  );
}
