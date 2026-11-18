import { Calendar, Sparkles } from 'lucide-react';

export default function TarotResonanceCTA({ language = 'zh-Hant' }: { language?: 'zh-Hant' | 'en' }) {
  const isEnglish = language === 'en';
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-2 border-blue-500/40 rounded-3xl p-8 md:p-12 shadow-2xl animate-fade-in">
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-serif text-blue-100 mb-4 tracking-wide">
          {isEnglish ? 'If this reading resonates with you' : '牌卡給了你方向，若想更深入看清全貌，讓韋德老師陪你一起梳理'}
        </h3>
        <div className="max-w-2xl mx-auto space-y-3">
          <p className="text-blue-200/90 text-lg leading-relaxed">
            {isEnglish ? 'Each card offers a gentle reflection from your inner wisdom.' : '每一張抽出的神諭卡，都是你內在潛意識與高維智慧的溫柔共振。'}
          </p>
          <p className="text-blue-200/80 leading-relaxed">
            {isEnglish ? 'Wade Huang combines tarot, crystal healing and energy practices to offer steady support.' : '這套線上神諭卡指引系統，由晶域心語創辦人——韋德老師 (Wade Huang) 親自策劃與設計。韋德老師深耕塔羅、八字、紫微等命理領域超過 10 年，同時具備高階水晶治療師資格與 20 多年內修實踐底蘊。'}
          </p>
          <p className="text-blue-100 text-lg font-medium leading-relaxed">
            {isEnglish ? 'For a personal situation, book a one-on-one deep reading.' : '若你面臨感情、事業或內在能量的卡關，歡迎讓韋德老師為你進行多張牌陣深度解析與能量場調理。'}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
        <a
          href="https://lin.ee/Z1mvseQ"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-3 px-6 py-6 bg-gradient-to-br from-blue-600/30 to-blue-600/30 hover:from-blue-600/40 hover:to-blue-600/40 border-2 border-blue-500/40 hover:border-blue-400/60 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-slate-800/30 rounded-full group-hover:bg-slate-800/40 transition-all duration-300">
            <Calendar className="w-6 h-6 text-blue-200" />
          </div>
          <div className="text-center">
            <p className="text-blue-100 font-semibold text-lg mb-1">
              {isEnglish ? 'Book a one-on-one deep reading' : '預約韋德老師一對一深度解讀'}
            </p>
            <p className="text-blue-200/70 text-sm">
              {isEnglish ? 'One-on-one consultation' : '一對一專業諮詢'}
            </p>
          </div>
        </a>

        <a
          href="https://lin.ee/Z1mvseQ"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-3 px-6 py-6 bg-gradient-to-br from-blue-600/30 to-blue-600/30 hover:from-blue-600/40 hover:to-blue-600/40 border-2 border-blue-500/40 hover:border-blue-400/60 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-slate-800/30 rounded-full group-hover:bg-slate-800/40 transition-all duration-300">
            <Sparkles className="w-6 h-6 text-blue-200" />
          </div>
          <div className="text-center">
            <p className="text-blue-100 font-semibold text-lg mb-1">
              {isEnglish ? 'Connect with Wade Huang on LINE' : '加入官方 LINE，領取專屬能量指引與諮詢優惠'}
            </p>
            <p className="text-blue-200/70 text-sm">
              {isEnglish ? 'Free information session' : '免費說明會'}
            </p>
          </div>
        </a>
      </div>

      <div className="mt-6 text-center">
        <p className="text-blue-200/60 text-sm">
          {isEnglish ? 'Personal crystal-healing and energy-work services' : '韋德老師提供專業的水晶療癒與能量調整服務'}
        </p>
      </div>
    </div>
  );
}
