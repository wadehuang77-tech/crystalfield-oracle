import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { LoginPromptModal } from '../components/LoginPromptModal';
import { useDeck } from '../hooks/useDeck';

function WorkYourLightPage() {
  const navigate = useNavigate();
  const { cards: deck } = useDeck('work_your_light');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const drawCard = () => navigate('/work-your-light-single');

  const deckReady = !!deck && deck.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white">
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        redirectTo="/cosmic-cross"
      />


      <section className="max-w-[1100px] mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-10 text-center">
        <div className="flex justify-center text-violet-500 mb-8">
          <DeckSigil />
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-violet-100 tracking-[0.25em] sm:tracking-[0.4em] mb-5">光之訊息</h1>
        <p className="text-base sm:text-lg text-violet-300/80 leading-loose tracking-wide max-w-md mx-auto">
          靈魂任務的啟動。<br />
          選一個牌陣,讓光交還給你的手。
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-10 pb-12">
        <div className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-slate-900/85 to-fuchsia-500/10 px-5 py-6 sm:px-8 sm:py-8 shadow-[0_0_34px_rgba(167,139,250,0.14)]">
          <h2 className="mb-6 text-center font-serif text-2xl sm:text-3xl leading-relaxed text-violet-100">
            Work Your Light 啟動光芒神諭卡｜你就是自己的解答
          </h2>
          <div className="space-y-4 text-base sm:text-lg leading-loose text-violet-50/90">
            <p>在這個嘈雜的世界裡，我們總習慣向外尋求認同與答案，卻忘了最了解你的人，永遠是你自己。</p>
            <p className="font-semibold text-violet-100">
              《Work Your Light》不預測命運，祂是一把開啟你內在智慧的鑰匙。
            </p>
            <p>溫柔地剝開外在的焦慮與討好，連結你最強大的內在直覺。</p>
            <p>
              祂要提醒你：
              <strong className="font-semibold text-fuchsia-200">你不需要變得完美才值得被愛，你現在的樣子，就充滿了光芒。</strong>
            </p>
            <p className="font-semibold text-fuchsia-100">
              深呼吸，將雙手放在心口，聆聽你內心深處最真實的聲音。
            </p>
          </div>

          <div className="mt-7 border-t border-violet-400/20 pt-6">
            <h3 className="mb-5 text-center text-lg sm:text-xl font-semibold tracking-wide text-violet-100">
              【啟動直覺靜心三步驟】
            </h3>
            <ol className="space-y-4 text-sm sm:text-base leading-loose text-violet-50/90">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-300/50 bg-violet-500/15 font-semibold text-violet-200">1</span>
                <p><strong className="text-violet-100">放鬆身體，閉上眼</strong>：感受到心口有一道溫柔的粉紫色光芒在擴散。</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-300/50 bg-violet-500/15 font-semibold text-violet-200">2</span>
                <p><strong className="text-violet-100">在心中默想</strong>：「此刻，我的內心想提醒我什麼？我該如何啟動我的光芒？」</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-300/50 bg-violet-500/15 font-semibold text-violet-200">3</span>
                <p><strong className="text-violet-100">憑直覺選一張牌</strong>：領取宇宙與你內在智慧獻給你的浪漫指引。</p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-4 sm:px-10 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto items-stretch">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={drawCard}
              disabled={!deckReady}
              className="group relative w-full flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-purple-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative h-full min-h-[8rem] sm:min-h-[9rem] px-6 py-5 sm:py-6 bg-gradient-to-r from-violet-600 to-purple-600 group-hover:from-violet-500 group-hover:to-purple-500 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                <h3 className="text-xl sm:text-2xl font-serif text-white text-center tracking-wide flex flex-col items-center leading-relaxed">
                  <span>{deckReady ? '單張牌' : '卡片資料準備中'}</span>
                  <span className="text-sm sm:text-base opacity-90">接收宇宙訊息</span>
                </h3>
              </div>
            </button>
            <p className="text-violet-200/60 text-xs tracking-wider text-center">靜下心來,專注於你的問題</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Link
              to="/cosmic-cross"
              className="group relative w-full flex-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-purple-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative h-full min-h-[8rem] sm:min-h-[9rem] px-6 py-5 sm:py-6 bg-gradient-to-r from-violet-600 to-purple-600 group-hover:from-violet-500 group-hover:to-purple-500 rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                <h3 className="text-lg sm:text-xl font-serif text-white text-center tracking-wide flex flex-col items-center leading-relaxed">
                  <span>宇宙十字牌陣</span>
                  <span className="text-sm sm:text-base opacity-90">(Cosmic Cross)</span>
                </h3>
              </div>
            </Link>
            <p className="text-violet-200/60 text-xs tracking-wider text-center">探索生命的多重面向</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-16 max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-violet-500/30 rounded-2xl p-6 shadow-xl">
            <h3 className="text-violet-200 text-sm tracking-[0.4em] uppercase mb-4">關 於 此 牌</h3>
            <p className="text-sm text-violet-200/85 leading-loose">
              這副神諭卡承載靈魂的訊息,連結內在的光與宇宙智慧。每張卡都是引導,讓你走向覺醒與自我實現。
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-violet-500/30 rounded-2xl p-6 shadow-xl">
            <h3 className="text-violet-200 text-sm tracking-[0.4em] uppercase mb-4">使 用 之 法</h3>
            <ul className="space-y-2 text-sm text-violet-200/85 leading-loose">
              <li>放鬆身心,深呼吸三次</li>
              <li>在心中默想你的問題</li>
              <li>抽牌,接收來自光的訊息</li>
              <li>靜心感受卡片的智慧與啟發</li>
            </ul>
          </div>
        </div>

      </section>
    </div>
  );
}

function DeckSigil() {
  return (
    <svg viewBox="-30 -30 60 60" className="w-20 h-20 sm:w-24 sm:h-24" stroke="currentColor" fill="none">
      <circle r="27" strokeWidth="0.7" />
      <circle r="22" strokeWidth="0.4" opacity="0.5" strokeDasharray="0.4 1.5" />
      <circle r="17" strokeWidth="0.8" />
      <circle r="11" strokeWidth="0.7" opacity="0.7" />
      <circle r="5" strokeWidth="0.7" />
      <circle r="2" fill="currentColor" />
    </svg>
  );
}

export default WorkYourLightPage;
