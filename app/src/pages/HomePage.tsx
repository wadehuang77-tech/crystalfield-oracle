import { Sparkles, LogIn, LogOut, User, Shield, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { adminApi } from '../lib/api';

function HomePage() {
  const { user, signOut, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    adminApi.check()
      .then(({ isAdmin }) => setIsAdmin(isAdmin))
      .catch(() => setIsAdmin(false));
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0ic3RhcnMiIHg9IjAiIHk9IjAiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI4MCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMikiLz48Y2lyY2xlIGN4PSIxMzAiIGN5PSI0MCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNCkiLz48Y2lyY2xlIGN4PSIxODAiIGN5PSIxNjAiIHI9IjAuOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3N0YXJzKSIvPjwvc3ZnPg==')] opacity-40"></div>

      <header className="relative z-10 px-4 sm:px-6 pt-4 sm:pt-6 flex items-center justify-end gap-2 sm:gap-4 min-h-[3.5rem]">
        {!loading && (
          user ? (
            <>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-900/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-lg">
                <User className="w-4 h-4 text-blue-300" />
                <span className="text-blue-200 text-sm">{user.email}</span>
              </div>
              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 backdrop-blur-sm border-2 border-blue-400/40 rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg text-sm"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden xs:inline">管理後台</span>
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 backdrop-blur-sm border-2 border-cyan-400/40 rounded-lg hover:from-cyan-500 hover:to-cyan-600 transition-all shadow-lg text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    管理員設定
                  </Link>
                </>
              )}
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-900/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-lg hover:bg-blue-800/40 transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                登出
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-lg text-white font-medium shadow-lg hover:shadow-blue-500/50 transition-all duration-300 text-sm sm:text-base"
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              登入 / 註冊
            </Link>
          )
        )}
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-12 sm:pb-16 flex flex-col items-center">
        <header className="text-center mb-10 sm:mb-16">
          <div className="flex justify-center mb-4 sm:mb-6">
            <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-blue-300 opacity-80 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif mb-3 sm:mb-4 tracking-wide text-blue-100 drop-shadow-lg">
            塔羅靈性指引入口
          </h1>
          <p className="text-blue-200/80 text-base sm:text-lg md:text-xl font-light tracking-wider">
            選擇你的牌卡系統，開啟內在智慧之旅
          </p>
        </header>

        <div className="space-y-3 w-full max-w-4xl">
          <Link to="/tarot" className="group relative block">
            <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-orange-500/40 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-orange-500/30 group-hover:border-orange-400/60">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-950/40 via-red-950/30 to-slate-900">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30">
                    <svg className="w-10 h-10 text-orange-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="15" y="15" width="25" height="40" rx="3" strokeWidth="2" />
                      <rect x="37" y="25" width="25" height="40" rx="3" strokeWidth="2" />
                      <rect x="60" y="15" width="25" height="40" rx="3" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <h2 className="text-xl font-serif text-orange-100 tracking-wide mb-1">偉特塔羅 - 多種牌陣</h2>
                  <p className="text-orange-200/70 text-xs tracking-wide">單張・三張牌陣・凱爾特十字・前世因果</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/lightworker" className="group relative block">
            <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-cyan-500/40 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-cyan-500/30 group-hover:border-cyan-400/60">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                    <Sparkles className="w-10 h-10 text-cyan-300" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <h2 className="text-xl font-serif text-cyan-100 tracking-wide mb-1">光行者神諭</h2>
                  <p className="text-cyan-200/70 text-xs tracking-wide">單張・十字交叉使命陣</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/unicorns" className="group relative block">
            <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-pink-500/40 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-pink-500/30 group-hover:border-pink-400/60">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-950/40 via-rose-950/30 to-slate-900">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/30">
                    <svg className="w-10 h-10 text-pink-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M 50 20 L 45 35 L 30 35 L 42 45 L 37 60 L 50 50 L 63 60 L 58 45 L 70 35 L 55 35 Z" fill="currentColor" opacity="0.3" />
                      <path d="M 50 15 Q 45 10 40 15 Q 35 20 40 25 Q 45 30 50 25 Q 55 30 60 25 Q 65 20 60 15 Q 55 10 50 15" strokeWidth="2.5" />
                      <path d="M 50 70 L 50 85 M 48 75 L 52 75 M 47 80 L 53 80" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <h2 className="text-xl font-serif text-pink-100 tracking-wide mb-1">獨角獸塔羅</h2>
                  <p className="text-pink-200/70 text-xs tracking-wide">單張・三張牌陣</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/dragons" className="group relative block">
            <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-emerald-500/40 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-emerald-500/30 group-hover:border-emerald-400/60">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <svg className="w-10 h-10 text-emerald-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M 50 20 Q 30 25 25 40 Q 20 55 30 65 L 40 55 Q 35 45 40 35 L 50 30 L 60 35 Q 65 45 60 55 L 70 65 Q 80 55 75 40 Q 70 25 50 20" fill="currentColor" opacity="0.3" strokeWidth="2.5" />
                      <path d="M 50 30 L 50 70 M 40 45 L 45 50 M 60 45 L 55 50" strokeWidth="2.5" />
                      <circle cx="42" cy="38" r="3" fill="currentColor" />
                      <circle cx="58" cy="38" r="3" fill="currentColor" />
                    </svg>
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <h2 className="text-xl font-serif text-emerald-100 tracking-wide mb-1">龍族塔羅</h2>
                  <p className="text-emerald-200/70 text-xs tracking-wide">單張・三張牌陣</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/egyptian-gods" className="group relative block">
            <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-yellow-500/40 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-yellow-500/30 group-hover:border-yellow-400/60">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-950/40 via-amber-950/30 to-slate-900">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <svg className="w-10 h-10 text-yellow-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M 50 25 L 35 50 L 50 50 L 45 75 L 70 45 L 55 45 L 65 25 Z" fill="currentColor" opacity="0.3" strokeWidth="2.5" />
                      <circle cx="30" cy="30" r="8" strokeWidth="2.5" />
                      <path d="M 25 30 L 35 30 M 30 25 L 30 35" strokeWidth="2" />
                      <path d="M 20 70 Q 30 60 40 70 M 60 70 Q 70 60 80 70" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <h2 className="text-xl font-serif text-yellow-100 tracking-wide mb-1">埃及神諭</h2>
                  <p className="text-yellow-200/70 text-xs tracking-wide">單張・前世因果解鎖陣</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/work-your-light" className="group relative block">
            <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-violet-500/40 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-violet-500/30 group-hover:border-violet-400/60">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-violet-950/40 via-purple-950/30 to-slate-900">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/30">
                    <Sparkles className="w-10 h-10 text-violet-300" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <h2 className="text-xl font-serif text-violet-100 tracking-wide mb-1">光之訊息</h2>
                  <p className="text-violet-200/70 text-xs tracking-wide">單張・宇宙十字牌陣</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="w-full max-w-4xl mt-8">
          <Link to="/osho">
            <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-2 border-teal-500/40 rounded-2xl overflow-hidden shadow-xl hover:border-teal-400/60 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/20 hover:scale-105 cursor-pointer">
              <div className="flex items-center gap-5 px-6 py-5 bg-gradient-to-r from-teal-950/40 via-cyan-950/30 to-slate-900">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
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
                  <h2 className="text-2xl font-serif bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent leading-tight">
                    奧修禪卡 Osho Zen Tarot
                  </h2>
                  <p className="text-teal-200/60 text-sm mt-0.5 tracking-wide">不是預測未來，而是照見此刻的真相</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <footer className="mt-12 sm:mt-20 text-center">
          <p className="text-blue-200/50 text-sm font-light italic">
            願你的內在智慧，照亮前行的道路
          </p>
        </footer>
      </div>
    </div>
  );
}

export default HomePage;
