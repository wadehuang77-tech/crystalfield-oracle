import { useState } from 'react';
import { Mail, Sparkles, X } from 'lucide-react';
import { publicApi } from '../lib/api';

interface EmailUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSubmitted: (email: string) => void;
  readingType: string;
  cardData: any;
}

export function EmailUnlockModal({
  isOpen,
  onClose,
  onEmailSubmitted,
  readingType,
  cardData: _cardData
}: EmailUnlockModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const emailLower = email.toLowerCase().trim();

    try {
      const data = await publicApi.saveEmail(emailLower, readingType);

      if (!data.success) {
        setError(data.message || '提交失敗，請稍後再試');
        return;
      }

      onEmailSubmitted(emailLower);
      onClose();
    } catch {
      setError('系統錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-blue-500/30 relative max-h-[90vh] overflow-y-auto">
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
              <Sparkles className="w-8 h-8 text-blue-100" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-4 text-blue-100">
            你的真正訊息還沒完全顯示
          </h2>

          <p className="text-gray-300 text-center mb-2 leading-relaxed">
            你現在看到的只是表層訊息
          </p>
          <p className="text-gray-200 text-center mb-2 font-medium">
            真正影響你目前狀態的關鍵與解法
          </p>
          <p className="text-gray-300 text-center mb-6">
            在完整解析裡才會揭露
          </p>

          <p className="text-blue-300 text-center mb-6 font-semibold">
            輸入 Email，立即解鎖完整塔羅指引
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-blue-700 rounded-xl text-blue-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-blue-100 font-semibold rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '提交中...' : '解鎖完整解析'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-blue-700">
            <p className="text-gray-400 text-xs text-center">
              我們尊重您的隱私，不會將您的 Email 用於其他用途
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
