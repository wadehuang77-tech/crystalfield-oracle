import { Heart, Sparkles } from 'lucide-react';

export function HealingCTA() {
  return (
    <div className="my-8 bg-gradient-to-br from-slate-900/40 via-slate-900/40 to-slate-900/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
            <Heart className="w-8 h-8 text-blue-100" />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-300 mb-3">
          如果這次占卜讓你有共鳴
        </h3>

        <p className="text-gray-300 leading-relaxed mb-2">
          代表你已經準備好進入下一個階段
        </p>
        <p className="text-gray-200 mb-2 font-medium">
          有些問題，塔羅只能提醒
        </p>
        <p className="text-gray-300 mb-6">
          真正的轉變，需要更深層的引導
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <a
          href="https://calendly.com/your-link"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 rounded-xl text-center transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/50"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-400 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center justify-center gap-2 text-blue-100 font-semibold mb-1">
              <Heart className="w-5 h-5" />
              <span>預約深度療癒解析</span>
            </div>
            <p className="text-blue-100 text-sm">一對一個人化指引</p>
          </div>
        </a>

        <a
          href="/ai-healing-system"
          className="group relative px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 rounded-xl text-center transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/50"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-400 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center justify-center gap-2 text-blue-100 font-semibold mb-1">
              <Sparkles className="w-5 h-5" />
              <span>了解 AI 療癒系統</span>
            </div>
            <p className="text-blue-100 text-sm">免費說明會</p>
          </div>
        </a>
      </div>

      <div className="mt-6 pt-6 border-t border-blue-500/30">
        <p className="text-gray-400 text-xs text-center">
          選擇最適合你的療癒途徑，開啟你的轉變之旅
        </p>
      </div>
    </div>
  );
}
