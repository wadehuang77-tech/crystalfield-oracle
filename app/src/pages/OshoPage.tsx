import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function OshoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-7 mb-12 text-center sm:text-left">
          <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-xl shadow-teal-500/30">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 sm:w-14 sm:h-14">
              <circle cx="20" cy="20" r="14" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6"/>
              <circle cx="20" cy="20" r="8" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/>
              <path d="M20 8 C20 8 26 14 26 20 C26 26 20 32 20 32 C20 32 14 26 14 20 C14 14 20 8 20 8Z" fill="white" fillOpacity="0.25"/>
              <circle cx="20" cy="20" r="3" fill="white" opacity="0.9"/>
              <path d="M20 12 L20 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              <path d="M20 32 L20 28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              <path d="M8 20 L12 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              <path d="M32 20 L28 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            </svg>
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-serif bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent leading-tight tracking-[0.08em]">
              奧修禪卡
            </h1>
            <p className="text-teal-200/75 text-base sm:text-lg mt-2 tracking-wide">不是預測未來，而是照見此刻的真相</p>
          </div>
        </div>

        <section className="max-w-4xl mx-auto mb-12 rounded-2xl border border-teal-400/30 bg-gradient-to-br from-teal-500/10 via-slate-900/85 to-cyan-500/10 px-5 py-6 sm:px-8 sm:py-8 shadow-[0_0_32px_rgba(45,212,191,0.12)]">
          <div className="space-y-5 text-base sm:text-lg leading-loose text-teal-50/90">
            <p className="font-semibold text-teal-100">
              奧修禪卡（Osho Zen Tarot）的核心價值與一般的預測型塔羅完全不同——祂不強調「預測未來算得準不準」，而是專注於「此時此刻（Here and Now）」的覺察、內在靜心、打破執著與自我超越。
            </p>
            <p>
              會被奧修禪卡吸引的人，往往不是想問「他愛不愛我」或「我會不會發財」，而是處於「內心極度焦慮、陷入思維死角、過度內耗、想看清內在真相」的狀態。
            </p>
            <h2 className="pt-2 text-center font-serif text-2xl sm:text-3xl leading-relaxed text-cyan-100">
              奧修禪卡｜回到當下，看清內在的真相
            </h2>
            <p>
              生命中許多痛苦，不是因為問題太難，而是因為我們的腦袋抓著過去不放、或對未來充滿恐懼。
            </p>
            <p className="font-semibold text-teal-100">
              奧修禪卡不預測遙遠的未來，祂是一面無比清晰的鏡子。
            </p>
            <p>
              祂照出你此刻的內在心境、隱藏的制約，以及你一直忽視的內在力量。當你不再與當下抗衡，答案自然就會浮現。
            </p>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <SpreadCard
            onClick={() => navigate('/osho/single')}
            title="單張牌陣"
            body="一張牌，即是一道光。當下的指引，直入內心。"
            icon={
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-10 h-10 text-teal-300" />
              </div>
            }
          />
          <SpreadCard
            onClick={() => navigate('/osho/three')}
            title="三張牌陣"
            body="過去・現在・未來，或身・心・靈。深度冥想之選。"
            icon={
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="flex gap-1">
                  <Sparkles className="w-6 h-6 text-teal-300" />
                  <Sparkles className="w-6 h-6 text-cyan-300" />
                  <Sparkles className="w-6 h-6 text-teal-300" />
                </div>
              </div>
            }
          />
        </div>

      </div>
    </div>
  );
}

function SpreadCard({
  onClick, title, body, icon,
}: {
  onClick: () => void;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="group cursor-pointer bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-teal-500/40 rounded-2xl p-8 hover:border-teal-400/60 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/20 hover:scale-105 text-left"
    >
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        {icon}
        <h2 className="text-3xl font-serif text-teal-100">{title}</h2>
        <p className="text-teal-200/70 text-center">{body}</p>
      </div>
    </button>
  );
}
