import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Sparkles, Star, Lock } from 'lucide-react';

interface FreeReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered?: () => void; // called after successful registration + return
}

export function FreeReadingModal({ isOpen, onClose, onRegistered: _onRegistered }: FreeReadingModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [closing, setClosing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  };

  const handleRegister = () => {
    const redirect = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?redirect=${redirect}&mode=signup`);
    onClose();
  };

  const handleLogin = () => {
    const redirect = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?redirect=${redirect}`);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 px-4 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl w-full max-w-md p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-blue-300/60 hover:text-blue-400 transition-colors"
          aria-label="關閉"
        >
          <X className="w-5 h-5" strokeWidth={1.4} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Star className="w-7 h-7 text-blue-400" strokeWidth={1.3} />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-400/50 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-yellow-400" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h2 className="font-serif text-center text-xl text-blue-100 tracking-[0.2em] mb-2">
          您已體驗過專屬占卜！
        </h2>
        <p className="text-center text-sm text-blue-200/70 leading-relaxed mb-1">
          立即免費註冊會員
        </p>
        <p className="text-center text-base text-blue-300 font-medium tracking-wide mb-6">
          即可解鎖剩餘{' '}
          <span className="text-yellow-400 font-bold text-lg">2</span>
          {' '}次免費額度
        </p>

        {/* Benefits */}
        <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl px-5 py-4 mb-6 space-y-2.5">
          {[
            '解鎖剩餘 2 次免費完整占卜',
            '儲存您的占卜紀錄',
            '專屬會員優惠價格',
          ].map(b => (
            <div key={b} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center flex-shrink-0">
                <Lock className="w-2.5 h-2.5 text-blue-300" strokeWidth={2} />
              </div>
              <span className="text-sm text-blue-200/85">{b}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={handleRegister}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg transition-all duration-300"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            免費註冊・立即解鎖
          </button>
          <button
            onClick={handleLogin}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/60 border border-blue-500/30 rounded-xl hover:bg-slate-700/60 transition-all text-blue-200 text-sm"
          >
            已有帳號？登入
          </button>
          <button
            onClick={handleClose}
            className="w-full text-center text-xs text-blue-400/40 hover:text-blue-400/60 transition-colors py-1"
          >
            稍後再說
          </button>
        </div>
      </div>
    </div>
  );
}
