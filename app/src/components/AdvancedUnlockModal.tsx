import { X, Lock, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getLanguageFromPath } from '../lib/i18n';
import { authUrlFor } from '../lib/authLocale';

interface AdvancedUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedUnlockModal({
  isOpen,
  onClose
}: AdvancedUnlockModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isEnglish = getLanguageFromPath(location.pathname) === 'en';

  if (!isOpen) return null;

  const handleLoginClick = () => {
    onClose();
    navigate(authUrlFor(location.pathname, 'login', `${location.pathname}${location.search}${location.hash}`), { state: { returnState: location.state } });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-lg w-full border-2 border-blue-500/30 relative max-h-[90vh] overflow-y-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-600/10"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-500 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-100" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-400">
            {isEnglish ? 'Advanced Reading' : '這是進階牌陣解析'}
          </h2>

          <div className="bg-slate-800/60 border-2 border-blue-400/30 rounded-xl p-6 mb-6 space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-blue-200 font-semibold mb-1">{isEnglish ? 'Deeper Interpretation' : '更深層的解讀'}</h3>
                <p className="text-gray-300 text-sm">
                  {isEnglish ? 'Explore the themes and possible directions in your question through a multi-card spread.' : '多張牌陣能更精準看出你的問題根源與未來走向'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-blue-200 font-semibold mb-1">{isEnglish ? 'Complete Guidance' : '完整的靈性指引'}</h3>
                <p className="text-gray-300 text-sm">
                  {isEnglish ? 'Explore the full guidance and practical next steps.' : '提供完整的療癒建議與實踐步驟'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-blue-200 font-semibold mb-1">{isEnglish ? 'Personalized Reading' : '個人化的解析'}</h3>
                <p className="text-gray-300 text-sm">
                  {isEnglish ? 'Receive guidance shaped around the situation you are exploring.' : '針對你當下的狀態提供專屬的建議'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLoginClick}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-blue-100 font-semibold rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
            >
              {isEnglish ? 'Sign In to Unlock the Full Reading' : '登入後解鎖完整內容'}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-600 text-blue-100 font-medium rounded-xl transition-all duration-300"
            >
              {isEnglish ? 'Maybe Later' : '稍後再說'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-blue-700">
            <p className="text-gray-400 text-xs text-center leading-relaxed">
              {isEnglish ? 'This advanced reading requires an account to view the full content.' : '此牌陣為進階解析，需要登入後才能查看完整內容'}
              <br />
              {isEnglish ? 'Paid advanced readings may be available in the future.' : '未來將提供付費進階解析服務'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
