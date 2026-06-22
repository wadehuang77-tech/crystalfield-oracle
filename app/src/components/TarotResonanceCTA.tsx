import { Calendar, Sparkles } from 'lucide-react';

export default function TarotResonanceCTA() {
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-2 border-blue-500/40 rounded-3xl p-8 md:p-12 shadow-2xl animate-fade-in">
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-serif text-blue-100 mb-4 tracking-wide">
          如果這次占卜讓你有共鳴
        </h3>
        <div className="max-w-2xl mx-auto space-y-3">
          <p className="text-blue-200/90 text-lg leading-relaxed">
            代表你已經準備好進入下一個階段
          </p>
          <p className="text-blue-200/80 leading-relaxed">
            有些問題，塔羅只能提醒
          </p>
          <p className="text-blue-100 text-lg font-medium leading-relaxed">
            真正的轉變，需要更深層的引導
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
        <a
          href="https://www.crystalhealer.com.tw/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-3 px-6 py-6 bg-gradient-to-br from-blue-600/30 to-blue-600/30 hover:from-blue-600/40 hover:to-blue-600/40 border-2 border-blue-500/40 hover:border-blue-400/60 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-slate-800/30 rounded-full group-hover:bg-slate-800/40 transition-all duration-300">
            <Calendar className="w-6 h-6 text-blue-200" />
          </div>
          <div className="text-center">
            <p className="text-blue-100 font-semibold text-lg mb-1">
              預約深度療癒解析
            </p>
            <p className="text-blue-200/70 text-sm">
              一對一專業諮詢
            </p>
          </div>
        </a>

        <a
          href="https://www.crystalhealer.com.tw/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-3 px-6 py-6 bg-gradient-to-br from-blue-600/30 to-blue-600/30 hover:from-blue-600/40 hover:to-blue-600/40 border-2 border-blue-500/40 hover:border-blue-400/60 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-slate-800/30 rounded-full group-hover:bg-slate-800/40 transition-all duration-300">
            <Sparkles className="w-6 h-6 text-blue-200" />
          </div>
          <div className="text-center">
            <p className="text-blue-100 font-semibold text-lg mb-1">
              了解 AI 療癒系統
            </p>
            <p className="text-blue-200/70 text-sm">
              免費說明會
            </p>
          </div>
        </a>
      </div>

      <div className="mt-6 text-center">
        <p className="text-blue-200/60 text-sm">
          韋德老師提供專業的水晶療癒與能量調整服務
        </p>
      </div>
    </div>
  );
}
