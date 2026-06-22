import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CrystalCoursePromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'relationship' | 'wealth' | 'karma' | 'default';
}

const variantContent = {
  relationship: {
    title: '你已經知道關係的問題',
    subtitle: '但能量沒有改變,事情還會重演',
  },
  wealth: {
    title: '財運不是努力問題',
    subtitle: '而是能量流動',
  },
  karma: {
    title: '你看到的是因果',
    subtitle: '但不清理,會一直重複',
  },
  default: {
    title: '你已經知道答案了',
    subtitle: '但為什麼現實沒改變?',
  },
};

const COMMON_DESC = '占卜讓你看見方向,但真正的改變,來自「能量調整」。';

export function CrystalCoursePromoModal({ isOpen, onClose, variant = 'default' }: CrystalCoursePromoModalProps) {
  const [mounted, setMounted] = useState(false);
  const content = variantContent[variant];

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      if (window.gtag) {
        window.gtag('event', 'CTA_modal_shown', {
          event_category: 'conversion',
          event_label: variant,
        });
      }
    } else {
      setMounted(false);
    }
  }, [isOpen, variant]);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 250);
  };

  const handleCTAClick = () => {
    if (window.gtag) {
      window.gtag('event', 'CTA_clicked', {
        event_category: 'conversion',
        event_label: variant,
        value: 1,
      });
    }
    window.open('https://crystal.myteachify.com/courses/go1', '_blank');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto transition-all duration-300 ${mounted ? 'translate-y-0' : 'translate-y-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 text-blue-400/60 hover:text-blue-300 transition-colors z-10"
          aria-label="關閉"
        >
          <X className="w-5 h-5" strokeWidth={1.4} />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-blue-500/40 mb-5 text-blue-400">
            <Sparkles className="w-6 h-6" strokeWidth={1.4} />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-blue-100 leading-snug tracking-[0.1em] mb-3">
            {content.title}
          </h2>
          <p className="text-base text-blue-200/85 tracking-wide">{content.subtitle}</p>
        </div>

        <div className="border-t border-b border-blue-500/15 py-5 mb-6">
          <p className="text-sm text-blue-200/85 leading-loose text-center">{COMMON_DESC}</p>
        </div>

        <div className="space-y-3 mb-7">
          <Bullet>放大占卜效果</Bullet>
          <Bullet>清理阻塞能量</Bullet>
          <Bullet>加速事情發生</Bullet>
        </div>

        <p className="text-center text-xs text-blue-300/70 mb-5 tracking-wide">含完整教學 + 材料</p>

        <button onClick={handleCTAClick} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full !justify-center">
          立 即 學 習 水 晶 陣
          <ArrowRight className="w-4 h-4" strokeWidth={1.4} />
        </button>

        <button onClick={handleClose} className="block mx-auto mt-5 text-blue-300 hover:text-blue-200 text-sm transition-colors text-sm">
          暫時不需要
        </button>
      </div>
    </div>
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
