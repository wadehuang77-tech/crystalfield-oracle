import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

interface CrystalReminderBarProps {
  isVisible: boolean;
  onClose: () => void;
}

export function CrystalReminderBar({ isVisible, onClose }: CrystalReminderBarProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleClick = () => {
    if (window.gtag) {
      window.gtag('event', 'reminder_bar_clicked', {
        event_category: 'conversion',
        event_label: 'bottom_bar',
      });
    }
    window.open('https://crystal.myteachify.com/courses/go1', '_blank');
  };

  const handleDismiss = () => {
    setDismissed(true);
    onClose();
  };

  if (!isVisible || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up pb-[env(safe-area-inset-bottom)]">
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900 border-t-2 border-blue-400/30 shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Sparkles className="w-6 h-6 text-blue-300 flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-blue-100 font-semibold text-sm sm:text-base truncate">
                想讓占卜真正發生？試試水晶陣
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleClick}
              className="bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-400 hover:to-blue-400 text-blue-100 px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 whitespace-nowrap"
            >
              了解更多
            </button>
            <button
              onClick={handleDismiss}
              className="text-blue-200 hover:text-white transition-colors p-3 -m-1"
              aria-label="關閉"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
