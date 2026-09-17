import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import {
  ChevronDown,
  HeartHandshake,
  History,
  MoonStar,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  trackDeckSelect,
  trackOracleNeedSelected,
  trackOracleReadingStarted,
  type OracleDeckId,
  type OracleNeedType,
  type OracleSpreadId,
} from '../lib/ga4';
import { tarotEntitlementApi, type TarotEntitlement } from '../lib/api';
import { TarotLoginGate } from '../components/TarotLoginGate';
import { useAuth } from '../contexts/AuthContext';

interface NeedOption {
  id: 'emotion_career' | 'past_life' | 'soul' | 'clearing';
  shortLabel: string;
  title: string;
  description: string;
  questions: string[];
  needType: OracleNeedType;
  deckType: OracleDeckId;
  spreadType: OracleSpreadId;
  destination: string;
  icon: LucideIcon;
  color: 'rose' | 'amber' | 'violet' | 'emerald';
}

const NEED_OPTIONS: NeedOption[] = [
  {
    id: 'emotion_career',
    shortLabel: '情感與工作財運',
    title: '我想了解情感、工作與財運',
    description: '釐清感情關係、工作方向、合作機會與財運發展，幫助你看見目前的狀況及下一步方向。',
    questions: [
      '對方現在怎麼看我？',
      '這段關係未來會如何發展？',
      '目前適合轉職或創業嗎？',
      '這個合作機會值得把握嗎？',
      '我的財運卡在哪裡？',
    ],
    needType: 'career_finance',
    deckType: 'tarot',
    spreadType: 'tarot_three',
    destination: '/tarot?spread=three',
    icon: HeartHandshake,
    color: 'rose',
  },
  {
    id: 'past_life',
    shortLabel: '前世今生',
    title: '我想探索前世與今生的連結',
    description: '探索前世經驗如何影響今生，看見重複出現的關係模式、課題、承諾與尚未完成的功課。',
    questions: [
      '我和某個人前世有什麼關係？',
      '為什麼我總是遇到相同的感情模式？',
      '今生的困境與前世有什麼連結？',
      '我今生需要完成什麼課題？',
      '有哪些前世能量需要放下？',
    ],
    needType: 'past_life',
    deckType: 'egyptian_gods',
    spreadType: 'egyptian_pastlife',
    destination: '/egyptian-gods?spread=pastlife',
    icon: History,
    color: 'amber',
  },
  {
    id: 'soul',
    shortLabel: '靈魂與內在指引',
    title: '我想尋找靈魂與內在指引',
    description: '看見當下的生命課題、內在阻礙與靈魂訊息，找到更符合自己真實方向的選擇。',
    questions: [
      '我現在最需要面對的課題是什麼？',
      '為什麼我一直無法突破目前的困境？',
      '我的內在真正想要的是什麼？',
      '宇宙現在想提醒我什麼？',
      '我的靈魂希望我走向哪個方向？',
    ],
    needType: 'soul_guidance',
    deckType: 'lightworker',
    spreadType: 'celtic_cross',
    destination: '/lightworker/celtic-cross',
    icon: MoonStar,
    color: 'violet',
  },
  {
    id: 'clearing',
    shortLabel: '關係能量清理',
    title: '我想清理關係中的負面能量',
    description: '看見關係中累積的情緒、依附、衝突與能量牽連，找出需要釋放和療癒的地方，幫助自己重新建立健康的界線。',
    questions: [
      '我和對方之間累積了哪些負面能量？',
      '這段關係中，我需要放下什麼？',
      '為什麼我無法走出這段關係？',
      '我們之間是否存在過度依附或能量牽連？',
      '我要如何清理舊關係帶來的情緒影響？',
    ],
    needType: 'relationship',
    deckType: 'dragons',
    spreadType: 'dragons_three',
    destination: '/dragons?spread=three',
    icon: ShieldCheck,
    color: 'emerald',
  },
];

const COLOR_STYLES = {
  rose: {
    idle: 'border-pink-400/25 bg-gradient-to-br from-pink-950/45 via-purple-950/35 to-slate-950/80',
    selected: 'border-pink-300 shadow-[0_0_35px_rgba(244,114,182,0.35)] ring-1 ring-pink-300/60',
    icon: 'border-pink-300/40 bg-pink-400/10 text-pink-200',
    accent: 'text-pink-200',
    button: 'from-pink-500 to-violet-500 shadow-pink-500/25',
  },
  amber: {
    idle: 'border-amber-400/25 bg-gradient-to-br from-amber-950/45 via-yellow-950/30 to-slate-950/80',
    selected: 'border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.3)] ring-1 ring-amber-300/60',
    icon: 'border-amber-300/40 bg-amber-400/10 text-amber-200',
    accent: 'text-amber-200',
    button: 'from-amber-500 to-orange-500 shadow-amber-500/25',
  },
  violet: {
    idle: 'border-violet-400/25 bg-gradient-to-br from-indigo-950/50 via-violet-950/35 to-slate-950/80',
    selected: 'border-violet-300 shadow-[0_0_35px_rgba(167,139,250,0.35)] ring-1 ring-violet-300/60',
    icon: 'border-violet-300/40 bg-violet-400/10 text-violet-200',
    accent: 'text-violet-200',
    button: 'from-violet-500 to-indigo-500 shadow-violet-500/25',
  },
  emerald: {
    idle: 'border-emerald-400/25 bg-gradient-to-br from-emerald-950/45 via-cyan-950/30 to-slate-950/80',
    selected: 'border-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.3)] ring-1 ring-emerald-300/60',
    icon: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200',
    accent: 'text-emerald-200',
    button: 'from-emerald-500 to-cyan-500 shadow-emerald-500/25',
  },
} as const;

const ADVANCED_DECKS: Array<{ id: OracleDeckId; name: string; path: string }> = [
  { id: 'tarot', name: '偉特塔羅', path: '/tarot' },
  { id: 'lightworker', name: '光行者神諭', path: '/lightworker' },
  { id: 'unicorns', name: '獨角獸塔羅', path: '/unicorns' },
  { id: 'dragons', name: '龍族塔羅', path: '/dragons' },
  { id: 'egyptian_gods', name: '埃及神諭', path: '/egyptian-gods' },
  { id: 'work_your_light', name: 'Lightworker 光之訊息', path: '/work-your-light' },
  { id: 'osho', name: '奧修禪卡', path: '/osho' },
];

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<NeedOption['id'] | null>(null);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [entitlement, setEntitlement] = useState<TarotEntitlement | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const pendingRef = useRef<{ option: NeedOption; question: string } | null>(null);
  const startingRef = useRef(false);

  useEffect(() => {
    if (!user) { setEntitlement(null); return; }
    void tarotEntitlementApi.me().then(({ entitlement: value }) => setEntitlement(value)).catch(() => setEntitlement(null));
  }, [user]);

  const selectNeed = (option: NeedOption) => {
    if (selectedId === option.id) return;
    setSelectedId(option.id);
    setQuestion('');
    setError('');
    trackOracleNeedSelected(option.needType);
  };

  const beginReading = useCallback(async (option: NeedOption, trimmedQuestion: string) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setIsStarting(true);
    try {
      if (!user) {
        pendingRef.current = { option, question: trimmedQuestion };
        setLoginRequired(true);
        return;
      }
      let access = (await tarotEntitlementApi.me()).entitlement;
      if (access.status === 'trial_available') access = (await tarotEntitlementApi.startTrial()).entitlement;
      setEntitlement(access);
      setLoginRequired(false);
      pendingRef.current = null;
      trackOracleReadingStarted(option.needType, option.spreadType, option.deckType);
      navigate(option.destination);
    } catch (err) {
      const apiError = err as Error & { status?: number };
      if (apiError.status === 401) {
        pendingRef.current = { option, question: trimmedQuestion };
        setLoginRequired(true);
        setError('');
      } else {
        setError(apiError.message || '塔羅權限確認失敗，請稍後再試');
      }
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, [navigate, user]);

  const startReading = async (event: FormEvent, option: NeedOption) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) { setError('請先輸入你想詢問的問題'); return; }
    await beginReading(option, trimmedQuestion);
  };

  useEffect(() => {
    if (!user || !loginRequired || !pendingRef.current) return;
    const pending = pendingRef.current;
    void beginReading(pending.option, pending.question);
  }, [user, loginRequired, beginReading]);

  const handleAdvancedDeckSelect = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLElement>('[data-deck-id][data-deck-name]');
    if (!link) return;
    const deckId = link.dataset.deckId as OracleDeckId | undefined;
    const deckName = link.dataset.deckName;
    if (deckId && deckName) trackDeckSelect(deckId, deckName, link.getAttribute('href') ?? '');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3Mub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0ic3RhcnMiIHg9IjAiIHk9IjAiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI4MCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMikiLz48Y2lyY2xlIGN4PSIxMzAiIGN5PSI0MCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNCkiLz48Y2lyY2xlIGN4PSIxODAiIGN5PSIxNjAiIHI9IjAuOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3N0YXJzKSIvPjwvc3ZnPg==')] opacity-40" />

      <main className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-14 pt-7 sm:px-6 sm:pt-12">
        <header className="mb-7 max-w-3xl text-center sm:mb-10">
          <Sparkles className="mx-auto mb-3 h-11 w-11 animate-pulse text-blue-300/80 sm:h-14 sm:w-14" />
          <h1 className="mb-3 font-serif text-3xl tracking-wide text-blue-100 drop-shadow-lg sm:text-5xl">
            免費塔羅牌占卜：7套塔羅與神諭卡線上抽牌
          </h1>
          <p className="text-sm leading-relaxed text-blue-200/80 sm:text-lg">
            選擇需求、寫下問題，系統會自動為你連結合適的牌卡與牌陣
          </p>
        </header>

        <section className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2" aria-label="占卜需求選擇">
          {NEED_OPTIONS.map((option, index) => {
            const selected = selectedId === option.id;
            const styles = COLOR_STYLES[option.color];
            const Icon = option.icon;

            return (
              <article
                key={option.id}
                className={`overflow-hidden rounded-3xl border backdrop-blur-sm transition duration-300 ${styles.idle} ${selected ? `${styles.selected} scale-[1.01]` : 'hover:-translate-y-0.5 hover:border-blue-300/40'}`}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-4 p-5 text-left sm:p-6"
                  aria-expanded={selected}
                  aria-controls={`need-content-${option.id}`}
                  onClick={() => selectNeed(option)}
                >
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${styles.icon}`}>
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`mb-1 block text-xs font-bold tracking-[0.22em] ${styles.accent}`}>
                      選項 {index + 1}
                    </span>
                    <span className="block font-serif text-xl tracking-wide text-white sm:text-2xl">
                      {option.shortLabel}
                    </span>
                  </span>
                  <ChevronDown className={`h-6 w-6 shrink-0 text-blue-200/70 transition-transform duration-300 ${selected ? 'rotate-180' : ''}`} />
                </button>

                {selected && (
                  <div id={`need-content-${option.id}`} className="border-t border-white/10 px-5 pb-6 pt-5 sm:px-6">
                    <h2 className="mb-3 font-serif text-xl text-blue-50 sm:text-2xl">{option.title}</h2>
                    <p className="mb-5 leading-7 text-blue-100/80">{option.description}</p>

                    <div className="mb-5 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                      <h3 className={`mb-3 text-sm font-bold tracking-wider ${styles.accent}`}>適用問題</h3>
                      <ul className="space-y-2 text-sm leading-6 text-blue-100/75 sm:text-base">
                        {option.questions.map((item) => <li key={item}>・{item}</li>)}
                      </ul>
                    </div>

                    <form onSubmit={(event) => startReading(event, option)}>
                      <label htmlFor={`question-${option.id}`} className="mb-2 block text-sm font-bold text-blue-100">
                        你想詢問的問題
                      </label>
                      <textarea
                        id={`question-${option.id}`}
                        value={question}
                        onChange={(event) => {
                          setQuestion(event.target.value);
                          if (error) setError('');
                        }}
                        maxLength={300}
                        rows={3}
                        placeholder="請寫下一個你此刻最想得到指引的問題……"
                        className="w-full resize-none rounded-2xl border border-blue-300/20 bg-slate-950/65 px-4 py-3 text-base leading-6 text-white outline-none transition placeholder:text-blue-200/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/20"
                      />
                      {error && <p className="mt-2 text-sm text-rose-300" role="alert">{error}</p>}
                      <button
                        type="submit"
                        disabled={isStarting}
                        className={`mt-4 w-full rounded-2xl bg-gradient-to-r px-5 py-3.5 text-base font-bold tracking-widest text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.99] ${styles.button}`}
                      >
                        {isStarting ? '確認資格中…' : !user ? '登入並開始免費試用' : entitlement?.status === 'trial_available' ? '開始免費試用 7 天' : '進入牌陣'}
                      </button>
                    </form>
                    {loginRequired && selectedId === option.id && <div className="mt-5"><TarotLoginGate theme="dark" /></div>}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <p className="mt-7 text-center text-sm leading-6 text-blue-100/70">
          {!user && '登入 Google 帳號即可免費試用塔羅全館 7 天，不需要信用卡，也不會自動扣款。'}
          {user && entitlement?.status === 'trial_available' && '你可以開始一次 7 天塔羅全館免費試用。'}
          {user && entitlement?.status === 'trialing' && '塔羅全館免費試用中：7 套牌卡與所有牌陣皆可不限次數使用。'}
          {user && entitlement && ['expired', 'payment_pending', 'payment_failed'].includes(entitlement.status) && '你仍可瀏覽所有牌卡與牌陣介紹；完整解析需訂閱塔羅全館月費會員。'}
          {user && entitlement && ['active', 'canceled_active'].includes(entitlement.status) && '塔羅全館會員有效期間，可使用全部 7 套牌卡與所有牌陣。'}
        </p>

        <details open className="mt-8 w-full max-w-3xl rounded-2xl border border-blue-300/15 bg-slate-950/35 px-4 py-3 text-blue-100/65">
          <summary className="cursor-pointer select-none py-1 text-center text-sm tracking-wide hover:text-blue-100">
            進階選擇：我想自己選擇牌卡
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-blue-300/10 pt-4 sm:grid-cols-3" onClick={handleAdvancedDeckSelect}>
            {ADVANCED_DECKS.map((deck) => (
              <Link
                key={deck.id}
                to={deck.path}
                data-deck-id={deck.id}
                data-deck-name={deck.name}
                className="rounded-xl border border-blue-300/15 bg-blue-950/30 px-3 py-3 text-center text-sm text-blue-100/75 transition hover:border-blue-300/40 hover:text-blue-50"
              >
                {deck.name}
              </Link>
            ))}
          </div>
        </details>

        <section className="mt-12 w-full max-w-5xl space-y-10 text-blue-100/85">
          <div>
            <h2 className="mb-4 font-serif text-2xl text-blue-50 sm:text-3xl">晶域心語提供哪7種塔羅與神諭卡？</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['偉特塔羅', '經典圖像適合整理感情、工作、財運與行動選擇，提供單張、三張、凱爾特十字及前世因果解鎖陣。', '/tarot'],
                ['光行者神諭', '以靈魂使命與內在成長為主題，適合探索天賦、卡點與下一步方向，可選擇單張牌及十字交叉使命陣。', '/lightworker'],
                ['獨角獸塔羅', '以溫柔而鼓勵的訊息陪伴感情療癒、自我價值與人際關係探索，提供單張與三張牌陣。', '/unicorns'],
                ['龍族塔羅', '適合觀察關係清理、能量消耗、突破與行動勇氣，使用單張或三張牌陣整理自己的力量。', '/dragons'],
                ['埃及神諭', '從象徵與神話主題探索前世今生連結、人生課題與靈魂成長，可選擇單張及七張前世因果解鎖陣。', '/egyptian-gods'],
                ['Lightworker光之訊息', '適合整理靈魂任務、內在潛能與能量狀態，提供單張牌及宇宙十字牌陣作為藍圖與行動參考。', '/work-your-light'],
                ['奧修禪卡', '把注意力帶回當下，適合覺察情緒、內在卡點與生命狀態，可使用單張或三張牌陣。', '/osho'],
              ].map(([name, text, path]) => (
                <article key={path} className="rounded-2xl border border-blue-300/15 bg-slate-950/35 p-5">
                  <h3 className="mb-2 text-lg font-semibold text-blue-50">{name}</h3>
                  <p className="mb-3 text-sm leading-7">{text}</p>
                  <Link className="text-sm font-semibold text-blue-300 underline-offset-4 hover:underline" to={path}>查看{name}介紹與牌陣</Link>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl text-blue-50 sm:text-3xl">如何選擇適合自己的牌卡？</h2>
            <p className="mb-4 leading-7">以下是依照主題整理的選擇建議，不代表絕對結果；你也可以瀏覽牌卡介紹後，選擇當下最有共鳴的一組：</p>
            <ul className="grid gap-2 sm:grid-cols-2 leading-7">
              <li>感情、工作、財運：<Link className="text-blue-300 underline" to="/tarot">偉特塔羅</Link></li>
              <li>靈魂使命與天賦：<Link className="text-blue-300 underline" to="/lightworker">光行者神諭</Link></li>
              <li>溫柔療癒與自我價值：<Link className="text-blue-300 underline" to="/unicorns">獨角獸塔羅</Link></li>
              <li>關係清理與突破：<Link className="text-blue-300 underline" to="/dragons">龍族塔羅</Link></li>
              <li>前世因果與人生課題：<Link className="text-blue-300 underline" to="/egyptian-gods">埃及神諭</Link></li>
              <li>高維指引與靈魂藍圖：<Link className="text-blue-300 underline" to="/work-your-light">光之訊息</Link></li>
              <li>情緒覺察與活在當下：<Link className="text-blue-300 underline" to="/osho">奧修禪卡</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl text-blue-50 sm:text-3xl">晶域心語有哪些塔羅牌陣？</h2>
            <p className="leading-7">不同牌卡提供不同牌陣：單張牌陣適合聚焦一個提醒；三張牌陣適合觀察時間或多個面向；偉特塔羅提供凱爾特十字陣與前世因果解鎖陣；光行者神諭提供十字交叉使命陣；埃及神諭提供前世因果解鎖陣；Lightworker光之訊息提供宇宙十字牌陣。實際可用牌陣以各牌卡頁面顯示為準。</p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl text-blue-50 sm:text-3xl">線上塔羅占卜可以問什麼？</h2>
            <p className="leading-7">你可以圍繞感情發展、工作與事業、財運方向、人際關係、目前卡點、前世因果、靈魂使命、內在成長與下一步行動來整理問題。塔羅與神諭卡用於自我覺察與方向整理，不代替醫療、心理、法律或投資專業意見。</p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl text-blue-50 sm:text-3xl">關於韋德老師與晶域心語</h2>
            <p className="leading-7">韋德老師擁有十年以上塔羅、水晶療癒及命理實務經驗，是水晶療癒老師與身心靈系統設計者，整合塔羅、生命靈數、人類圖、印度占星與水晶能量，設計晶域心語的自我探索系統。你也可以繼續了解<Link className="mx-1 text-blue-300 underline" to="/numerology">生命靈數</Link>、<Link className="mx-1 text-blue-300 underline" to="/human-design">人類圖</Link>與<Link className="mx-1 text-blue-300 underline" to="/vedic-astrology">印度占星</Link>。</p>
          </div>

          <div>
            <h2 className="mb-4 font-serif text-2xl text-blue-50 sm:text-3xl">常见问题</h2>
            <div className="space-y-3">
              {[
                ['線上塔羅牌占卜準確嗎？', '塔羅與神諭卡適合用來整理當下感受與可能方向，不保證固定結果。'],
                ['塔羅牌可以問哪些問題？', '可以詢問感情、工作、財運、人際關係、目前卡點、前世因果、靈魂使命、內在成長與下一步行動。'],
                ['同一个问题可以重复占卜吗？', '建议先沉淀并观察现实变化，在问题或情境有新发展时再重新整理。'],
                ['单张牌和三张牌有什么不同？', '单张牌聚焦一个当下提醒；三张牌可观察时间变化、不同面向或行动脉络。'],
                ['凯尔特十字牌阵适合什么问题？', '适合希望从多个角度深入整理复杂处境、影响因素与行动方向的问题。'],
                ['前世因果解锁阵是什么？', '这是七张牌的探索牌阵，用来分层观察前世今生连结与人生课题。'],
                ['不知道该选哪一组牌怎么办？', '可依首页主题建议选择，也可以浏览七组牌卡介绍后凭直觉决定。'],
                ['塔羅占卜結果可以代替專業意見嗎？', '不可以；醫療、心理、法律或投資問題請諮詢合格專業人士。'],
                ['7組牌卡是否都包含在塔羅全館月費會員中？', '依目前方案設定，塔羅全館月費會員為 NT$600／月，會員有效期間可使用全部7套牌卡與所有牌陣。'],
              ].map(([questionText, answer]) => (
                <details key={questionText} className="rounded-xl border border-blue-300/15 bg-slate-950/30 px-4 py-3">
                  <summary className="cursor-pointer font-semibold text-blue-50">{questionText}</summary>
                  <p className="mt-2 leading-7">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-12 text-center text-sm italic text-blue-200/45">
          願你的內在智慧，照亮前行的道路
        </footer>
      </main>
    </div>
  );
}

export default HomePage;
