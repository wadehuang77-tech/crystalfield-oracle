import { X, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function LoginPromptModal({ isOpen, onClose, redirectTo }: LoginPromptModalProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate(redirectTo ? `/auth?redirect=${encodeURIComponent(redirectTo)}` : '/auth');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-blue-300/60 hover:text-blue-400 transition-colors z-10"
          aria-label="關閉"
        >
          <X className="w-5 h-5" strokeWidth={1.4} />
        </button>

        <div className="flex justify-center text-blue-500 mb-6">
          <Lock className="w-12 h-12" strokeWidth={1.2} />
        </div>

        <h2 className="font-serif text-2xl text-blue-100 mb-3 tracking-[0.3em]">需要登入</h2>
        <p className="text-sm text-blue-300/85 mb-8 leading-relaxed">
          此牌陣需先登入或註冊方可使用
        </p>

        <div className="space-y-3">
          <button onClick={handleLogin} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full">
            前　往　登　入
          </button>
          <button onClick={onClose} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 w-full">
            取　消
          </button>
        </div>
      </div>
    </div>
  );
}
