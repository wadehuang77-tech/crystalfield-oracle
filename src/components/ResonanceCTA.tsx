import { Calendar, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import qrImage from '../../public/L_gainfriends_2dbarcodes_GW.png';

function QRCodeModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-blue-500/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/10 hover:bg-slate-800/20 transition-colors"
        >
          <X className="w-4 h-4 text-blue-100" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-blue-100 mb-2">預約深度療癒解析</h3>
          <p className="text-blue-100/60 text-sm">掃描 QR Code，立即加入 LINE 預約</p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-xl">
            <img
              src={qrImage}
              alt="預約 LINE QR Code"
              className="w-56 h-56 object-contain"
            />
          </div>
        </div>

        <a
          href="https://lin.ee/5Qid7Aa"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-400 hover:to-blue-400 text-blue-100 font-semibold text-center rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg"
        >
          直接開啟 LINE 聯繫
        </a>

        <p className="text-blue-100/30 text-xs text-center mt-4">
          一對一深度對談，協助你找到根源問題與轉化方向
        </p>
      </div>
    </div>
  );
}

export function ResonanceCTA() {
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <div className="mt-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-blue-500/20">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500/30 to-blue-500/30 border border-blue-400/30 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-blue-300 animate-pulse" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-blue-100 mb-3">
            如果這次占卜讓你有共鳴
          </h3>
          <p className="text-blue-100/70 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            代表你已經準備好進入下一個階段
          </p>
          <p className="text-blue-100/50 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
            有些問題，塔羅只能提醒<br />
            真正的轉變，需要更深層的引導
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => setShowQR(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-2xl text-left w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-slate-800/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-100 flex-shrink-0" />
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-blue-100 mb-1">
                  預約深度療癒解析
                </h4>
                <p className="text-blue-100 text-xs sm:text-sm">
                  一對一深度對談，協助你找到根源問題與轉化方向
                </p>
              </div>
            </div>
          </button>

          <a
            href="https://forms.gle/DrFhpNTcYBPYq7667"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-slate-800/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-blue-100 flex-shrink-0" />
              <div className="text-left">
                <h4 className="text-lg sm:text-xl font-bold text-blue-100 mb-1">
                  了解 AI 療癒系統
                </h4>
                <p className="text-blue-100 text-xs sm:text-sm">
                  免費說明會｜探索如何透過科技與靈性結合進行自我療癒
                </p>
              </div>
            </div>
          </a>
        </div>

        <div className="text-center mt-6">
          <p className="text-blue-100/30 text-sm italic">
            轉變的開始，就在你願意踏出這一步
          </p>
        </div>
      </div>

      {showQR && <QRCodeModal onClose={() => setShowQR(false)} />}
    </>
  );
}
