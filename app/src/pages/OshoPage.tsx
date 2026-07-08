import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function OshoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center gap-6 mb-12">
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
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
          <div className="text-left">
            <h1 className="text-3xl font-serif bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent leading-tight">
              奧修禪卡
            </h1>
            <p className="text-teal-200/70 text-sm mt-1 tracking-wide">不是預測未來，而是照見此刻的真相</p>
          </div>
        </div>

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
            price={250}
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
  onClick, title, body, icon, price,
}: {
  onClick: () => void;
  title: string;
  body: string;
  icon: React.ReactNode;
  price?: number;
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
        {price !== undefined ? (
          <p className="text-base font-medium text-teal-300 tracking-[0.25em]">NT$ {price}</p>
        ) : (
          <p className="text-base font-medium text-teal-300 tracking-[0.2em]">免費</p>
        )}
      </div>
    </button>
  );
}
