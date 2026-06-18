import { Sparkles, Check, ArrowRight } from 'lucide-react';

export default function TarotCourseCTA() {
  return (
    <section className="mt-14 sm:mt-20 mb-10 sm:mb-14 max-w-2xl mx-auto px-4">
      <div className="ornamental-divider mb-8">
        <svg viewBox="-8 -8 16 16" className="w-3 h-3" fill="currentColor">
          <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" />
          <circle r="1.2" fill="#07091a" />
        </svg>
      </div>

      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-blue-500/40 mb-5 text-blue-400">
            <Sparkles className="w-6 h-6" strokeWidth={1.4} />
          </div>
          <h3 className="font-serif text-xl sm:text-2xl text-blue-100 leading-snug tracking-[0.1em]">
            想讓占卜結果<br/>真正發生改變?
          </h3>
        </div>

        <div className="border-t border-b border-blue-500/15 py-5 mb-6">
          <p className="text-sm text-blue-200/85 leading-loose text-center">
            你已經看見訊息。<br/>
            但真正的轉化,來自<span className="text-blue-300 font-semibold">「能量調整」</span>。
          </p>
        </div>

        <div className="space-y-3 mb-7 max-w-xs mx-auto">
          <Bullet>放大占卜效果</Bullet>
          <Bullet>清理阻塞能量</Bullet>
          <Bullet>加速事情改變</Bullet>
        </div>

        <a
          href="https://crystal.myteachify.com/courses/go1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full !justify-center"
        >
          立 即 學 習 水 晶 陣 療 癒
          <ArrowRight className="w-4 h-4" strokeWidth={1.4} />
        </a>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-1" strokeWidth={1.6} />
      <p className="text-sm text-blue-200/85 leading-relaxed">{children}</p>
    </div>
  );
}
