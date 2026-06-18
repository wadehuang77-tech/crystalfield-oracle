import { useEffect, useState } from 'react';
import { X, Check, ArrowRight } from 'lucide-react';

interface CrystalGridPromoModalProps {
  isOpen?: boolean;
  show?: boolean;
  onClose: () => void;
}

export function CrystalGridPromoModal({ isOpen, show, onClose }: CrystalGridPromoModalProps) {
  const visible = isOpen ?? show ?? false;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      trackEvent('CTA_modal_shown');
    }
  }, [visible]);

  const trackEvent = (eventName: string) => {
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, {
        event_category: 'Crystal_Course',
        event_label: 'Tarot_CTA_Modal',
      });
    }
  };

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 250);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4 transition-opacity duration-300 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto transition-all duration-300 ${
          mounted ? 'translate-y-0' : 'translate-y-4'
        }`}
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
          <p className="text-xs tracking-[0.5em] text-blue-400/80 mb-4">水 晶 陣 療 癒</p>
          <h2 className="font-serif text-xl sm:text-2xl text-blue-100 leading-snug tracking-[0.1em]">
            想讓占卜結果<br/>真正改變你的現實?
          </h2>
        </div>

        <div className="border-t border-b border-blue-500/15 py-5 mb-6">
          <p className="text-sm text-blue-200/85 leading-loose text-center">
            你已經看見訊息。<br/>
            但真正的轉化,來自<span className="text-blue-300 font-semibold">「能量調整」</span>。<br/>
            水晶陣,是讓占卜真正發生作用的關鍵。
          </p>
        </div>

        <div className="space-y-3 mb-7">
          <Bullet>放大占卜指引</Bullet>
          <Bullet>清理阻塞能量</Bullet>
          <Bullet>加速事情發生</Bullet>
        </div>

        <p className="text-center text-xs text-blue-300/70 mb-5 tracking-wide">
          現在報名 · 含完整水晶套組 + 神諭卡
        </p>

        <a
          href="https://crystal.myteachify.com/courses/go1"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('CTA_clicked')}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full !justify-center"
        >
          立 即 學 習 水 晶 陣 療 癒
          <ArrowRight className="w-4 h-4" strokeWidth={1.4} />
        </a>

        <button
          onClick={handleClose}
          className="block mx-auto mt-5 text-blue-300 hover:text-blue-200 text-sm transition-colors text-sm"
        >
          先看結果
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
