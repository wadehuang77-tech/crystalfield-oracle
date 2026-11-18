import { Calendar, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import qrImage from '../../public/L_gainfriends_2dbarcodes_GW.png';
import { publicApi, PublicButtonLink } from '../lib/api';

const AI_TAROT_BUTTON_KEY = 'resonance-ai-tarot-design';

function QRCodeModal({ onClose, language }: { onClose: () => void; language: 'zh-Hant' | 'en' }) {
  const isEnglish = language === 'en';
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
          <h3 className="text-xl font-bold text-blue-100 mb-2">{isEnglish ? 'Book a Personal Session' : '預約深度療癒解析'}</h3>
          <p className="text-blue-100/60 text-sm">{isEnglish ? 'Scan the QR code to connect on LINE.' : '掃描 QR Code，立即加入 LINE 預約'}</p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-xl">
            <img
              src={qrImage}
              alt={isEnglish ? 'LINE booking QR code' : '預約 LINE QR Code'}
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
          {isEnglish ? 'Open LINE to get in touch' : '直接開啟 LINE 聯繫'}
        </a>

        <p className="text-blue-100/30 text-xs text-center mt-4">
          {isEnglish ? 'A one-on-one conversation to explore your concerns and possible next steps.' : '一對一深度對談，協助你找到根源問題與轉化方向'}
        </p>
      </div>
    </div>
  );
}

export function ResonanceCTA({ language = 'zh-Hant' }: { language?: 'zh-Hant' | 'en' } = {}) {
  const isEnglish = language === 'en';
  const [showQR, setShowQR] = useState(false);
  const [aiTarotLink, setAiTarotLink] = useState<PublicButtonLink | null>(null);
  const contactUrl = aiTarotLink?.available && aiTarotLink.form?.url ? aiTarotLink.form.url : 'https://lin.ee/Z1mvseQ';

  useEffect(() => {
    let active = true;
    void publicApi.buttonLink(AI_TAROT_BUTTON_KEY)
      .then((result) => {
        if (active) setAiTarotLink(result);
      })
      .catch(() => {
        if (active) {
          setAiTarotLink({
            button_key: AI_TAROT_BUTTON_KEY,
            available: false,
            form: null,
            label: '報名尚未開放',
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="mt-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-blue-500/20">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500/30 to-blue-500/30 border border-blue-400/30 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-blue-300 animate-pulse" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-blue-100 mb-3">
            {isEnglish ? 'If this reading resonates with you' : '牌卡給了你方向，若想更深入看清全貌，讓韋德老師陪你一起梳理'}
          </h3>
          <div className="text-blue-100/70 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto space-y-3 text-left">
            {isEnglish ? <p>Each card offers a gentle reflection from your inner wisdom. Wade Huang combines tarot, crystal healing and energy practices to make every reading a steady source of support.</p> : <>
              <p>每一張抽出的神諭卡，都是你內在潛意識與高維智慧的溫柔共振。</p>
              <p>這套線上神諭卡指引系統，由<strong>晶域心語創辦人——韋德老師 (Wade Huang)</strong>親自策劃與設計。韋德老師深耕塔羅、八字、紫微等命理領域超過 10 年，同時具備<strong>高階水晶治療師</strong>資格與 <strong>20 多年內修實踐底蘊</strong>。他致力於將傳統命理智慧與現代能量頻率結合，讓每一次的抽牌，都不只是冰冷的文字，而是一份真正能安定人心的力量。</p>
              <p>單張牌卡能為你點出當下的核心提示；但如果你正站在人生的十字路口，面臨感情、事業或內在能量的卡關，需要針對你的個人狀況進行<strong>多張牌陣深度解析</strong>與<strong>能量場調理</strong>，歡迎讓韋德老師為你進行專屬的一對一諮詢。</p>
            </>}
          </div>
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
                  {isEnglish ? 'Book a one-on-one deep reading' : '預約韋德老師一對一深度解讀'}
                </h4>
                <p className="text-blue-100 text-xs sm:text-sm">
                  {isEnglish ? 'Book a consultation' : '按此預約諮詢'}
                </p>
              </div>
            </div>
          </button>

          {contactUrl ? (
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-slate-800/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="relative flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-blue-100 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="text-lg sm:text-xl font-bold text-blue-100 mb-1">
                    {isEnglish ? 'Connect with Wade Huang on LINE' : '加入官方 LINE，領取專屬能量指引與諮詢優惠'}
                  </h4>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    {isEnglish ? 'Free online session: Learn how to design tarot cards with AI, even as a beginner.' : '免費線上說明會｜教你如何用 AI 設計塔羅牌，零基礎打造高質感的個人牌卡'}
                  </p>
                </div>
              </div>
            </a>
          ) : (
            <div
              aria-disabled="true"
              className="relative overflow-hidden bg-gradient-to-r from-slate-700 to-slate-700 rounded-xl p-6 shadow-lg opacity-75 cursor-not-allowed"
            >
              <div className="relative flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-blue-100 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="text-lg sm:text-xl font-bold text-blue-100 mb-1">
                    {isEnglish ? 'Connect with Wade Huang on LINE' : '加入官方 LINE，領取專屬能量指引與諮詢優惠'}
                  </h4>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    {isEnglish ? 'Registration is not open yet' : '報名尚未開放'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-blue-100/30 text-sm italic">
            {isEnglish ? 'Change can begin with one intentional step.' : '轉變的開始，就在你願意踏出這一步'}
          </p>
        </div>
      </div>

      {showQR && <QRCodeModal onClose={() => setShowQR(false)} language={language} />}
    </>
  );
}
