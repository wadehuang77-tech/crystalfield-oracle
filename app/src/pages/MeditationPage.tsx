import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE, checkoutApi } from "../lib/api";
import { submitToEcpay } from "../lib/ecpayRedirect";
import { useAuth } from "../contexts/AuthContext";
import MeditationStoriesFaq from "../components/MeditationStoriesFaq";
type Track = {
  id: string;
  title: string;
  description: string;
  isFree: boolean;
};
const PENDING = "meditation_pending";
const PREVIEW_LIMIT_SECONDS = 60;
const GOD_GUIDE = [
  [
    "托特",
    "智慧、書寫、邏輯與秩序之神",
    "思緒混亂、過度焦慮、決策癱瘓",
    "腦袋打結、需要冷靜釐清方向的人",
  ],
  [
    "艾希斯",
    "魔法、母性、守護與無條件之愛女神",
    "缺愛、情感匱乏、關係受傷",
    "渴望被理解與修復關係的人",
  ],
  [
    "拉",
    "太陽神、光明、生命力與創造之源",
    "能量低落、提不起勁、自我價值感低",
    "疲憊耗竭、需要點燃自信的人",
  ],
  [
    "阿努比斯",
    "冥界引導者、靈魂守護與轉化之神",
    "恐懼、害怕失去、執著放不下",
    "正處於告別或過渡期的人",
  ],
  [
    "哈索爾",
    "愛、美、音樂、喜悅與豐盛女神",
    "長期壓抑、緊繃不快樂、失去熱情",
    "想找回放鬆與喜悅的人",
  ],
  [
    "荷魯斯",
    "天空之神、王者視野、洞察與守護之眼",
    "迷惘、容易受影響、缺乏主見",
    "需要拉高視角看清全局的人",
  ],
  [
    "塞赫邁特",
    "獅首戰神、太陽烈焰、淨化與果斷行動女神",
    "壓抑憤怒、委屈不甘、軟弱退縮",
    "需要斬斷內耗關係的人",
  ],
  [
    "瑪特",
    "真理、正義、宇宙平衡與和諧女神",
    "內心失衡、愧疚、自責與焦躁",
    "渴望回歸穩定秩序的人",
  ],
  [
    "歐西里斯",
    "冥界之王、循環、死亡與重生之神",
    "重大挫敗、絕望感、卡在低谷",
    "需要從低谷重新長出力量的人",
  ],
  [
    "賽特",
    "風暴、沙漠、混沌與破局之神",
    "突發變故恐慌、害怕失控",
    "需要把混亂轉化為突破動能的人",
  ],
] as const;
const EMOTIONS = [
  ["思緒混亂", "托特", "適合整理思緒、過度焦慮與決策卡關"],
  ["缺愛", "艾希斯", "適合溫柔接住情緒，重新感受愛與支持"],
  ["能量低落", "拉", "適合找回內在光亮與行動意志"],
  ["恐懼", "阿努比斯", "適合面對陰影，安定不安的心"],
  ["壓抑緊繃", "哈索爾", "適合放鬆防備，回到溫柔的自我接納"],
  ["迷惘動搖", "荷魯斯", "適合拉開距離，看清方向與下一步"],
  ["委屈憤怒", "塞赫邁特", "適合釋放壓抑，重新建立界線"],
  ["內耗自責", "瑪特", "適合放下不屬於自己的責任與重量"],
  ["低谷挫敗", "歐西里斯", "適合告別舊階段，整理重生的力量"],
  ["害怕失控", "賽特", "適合在變動中站穩，重拾生命主權"],
] as const;
export default function MeditationPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [owned, setOwned] = useState(false);
  const [buying, setBuying] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [expandedGod, setExpandedGod] = useState<string | null>(null);
  const [previewFinished, setPreviewFinished] = useState<
    Record<string, boolean>
  >({});
  const fadeTimers = useRef<Record<string, number>>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHighPriest = location.pathname.replace(/\/+$/, "") === "/meditation/high-priest";
  const refs = useRef<Record<string, HTMLAudioElement | null>>({});
  const sessions = useRef<
    Record<
      string,
      { id: string; last: number; seconds: number; counted: boolean }
    >
  >({});
  const [message, setMessage] = useState("");
  useEffect(() => {
    setTracks([]);
    fetch(`${API_BASE}/api/meditation/tracks`)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => v?.tracks && setTracks(isHighPriest ? v.tracks.filter((t: Track) => t.id.startsWith('hp')) : v.tracks))
      .catch(() => {});
  }, [isHighPriest]);
  useEffect(() => {
    if (user)
      fetch(`${API_BASE}/api/meditation/entitlement`, {
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => setOwned(Boolean(v?.active)))
        .catch(() => setOwned(false));
  }, [user]);
  useEffect(() => {
    if (!user) return;
    try {
      const p = JSON.parse(localStorage.getItem(PENDING) || "null") as {
        id?: string;
        time?: number;
      } | null;
      if (p?.id && typeof p.time === "number") {
        const a = refs.current[p.id];
        if (a) {
          a.currentTime = p.time;
          void a.play().catch(() => {});
          localStorage.removeItem(PENDING);
        }
      }
    } catch {
      localStorage.removeItem(PENDING);
    }
  }, [user, tracks]);
  const handlePreviewEnded = (t: Track, a: HTMLAudioElement) => {
    if (fadeTimers.current[t.id])
      window.clearInterval(fadeTimers.current[t.id]);
    const start = a.volume;
    const started = performance.now();
    fadeTimers.current[t.id] = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / 1300);
      a.volume = Math.max(0, start * (1 - progress));
      if (progress >= 1) {
        window.clearInterval(fadeTimers.current[t.id]);
        delete fadeTimers.current[t.id];
        a.pause();
        a.currentTime = Math.min(a.currentTime, PREVIEW_LIMIT_SECONDS);
        a.volume = start || 1;
        setPreviewFinished((v) => ({ ...v, [t.id]: true }));
      }
    }, 50);
  };
  const onTime = (t: Track, e: React.SyntheticEvent<HTMLAudioElement>) => {
    const a = e.currentTarget;
    const s = sessions.current[t.id];
    if (s && !s.counted) {
      const delta = a.currentTime - s.last;
      if (delta > 0 && delta <= 1.5) s.seconds += delta;
      s.last = a.currentTime;
      if (s.seconds > 0) {
        s.counted = true;
        void fetch(`${API_BASE}/api/meditation/playback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            trackId: t.id,
            sessionId: s.id,
            seconds: s.seconds,
          }),
        });
      }
    }
    if ((t.isFree && user) || (!t.isFree && owned)) return;
    if (a.currentTime >= PREVIEW_LIMIT_SECONDS) {
      handlePreviewEnded(t, a);
      localStorage.setItem(
        PENDING,
        JSON.stringify({ id: t.id, time: a.currentTime }),
      );
      setMessage(
        t.isFree && !user
          ? "免費試聽已播放 1 分鐘，請登入後繼續完整聆聽。"
          : "免費試聽已播放 1 分鐘，請解鎖完整冥想；登入後可從剛才的位置繼續。",
      );
    }
  };
  const buy = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(isHighPriest ? "/meditation/high-priest" : "/meditation")}`);
      return;
    }
    setBuying(true);
    try {
      const r = await checkoutApi.createOrder("meditation_bundle");
      if (r.ecpay) submitToEcpay(r.ecpay);
      else if (r.admin_unlocked) setOwned(true);
      else setMessage("付款資料缺失，請稍後再試。");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "付款無法開始");
    } finally {
      setBuying(false);
    }
  };
  const card = (t: Track, i: number) => {
    const locked = !t.isFree && !owned;
    return (
      <article
        id={`meditation-track-${t.id}`}
        key={t.id}
        className="group relative overflow-hidden rounded-2xl border border-[#c9a75b]/25 bg-[#0d1b2d] p-5 shadow-[0_10px_35px_rgba(0,0,0,.2)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c9a75b]/60 bg-[#c9a75b]/10 font-serif text-lg text-[#e6c978]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="rounded-full bg-[#264633] px-3 py-1 text-xs text-[#d7edcf]">
            {t.isFree ? "免費體驗" : "會員專屬"}
          </span>
        </div>
        <h3 className="font-serif text-xl text-[#fff8e8]">{t.title}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-[#c4c9cd]">
          {t.description}
        </p>
        <div className="mt-5 rounded-xl border border-[#c9a75b]/15 bg-[#071323]/70 p-2">
          <audio
            ref={(a) => {
              refs.current[t.id] = a;
            }}
            onPlay={(e) => {
              const a = e.currentTarget;
              if (!t.isFree && !owned && previewFinished[t.id]) {
                a.currentTime = 0;
                setPreviewFinished((v) => ({ ...v, [t.id]: false }));
              }
              sessions.current[t.id] ??= {
                id: crypto.randomUUID(),
                last: a.currentTime,
                seconds: 0,
                counted: false,
              };
            }}
            onSeeking={(e) => {
              const s = sessions.current[t.id];
              if (s) s.last = e.currentTarget.currentTime;
            }}
            onTimeUpdate={(e) => onTime(t, e)}
            controls
            preload="none"
            className="w-full"
            src={`${API_BASE}/api/meditation/audio/${encodeURIComponent(t.id)}${locked ? "?preview=1" : ""}`}
          >
            <track kind="captions" />
          </audio>
        </div>
        {!user && locked && (
          <p className="mt-2 text-center text-xs text-[#f0d88c] opacity-0 transition-opacity group-hover:opacity-100">
            登入可試聽一分鐘
          </p>
        )}
        <div className="mt-3 rounded-lg border border-[#c9a75b]/15 bg-[#0d1b2d]/60 p-3 text-xs leading-5 text-[#c4c9cd]">
          {isHighPriest && !t.isFree ? (
            <>
              想更深入了解自己？透過{" "}
              <a className="text-[#f0d88c] underline" href="/numerology">生命靈數</a>、
              <a className="text-[#f0d88c] underline" href="/human-design">人類圖</a>、
              <a className="text-[#f0d88c] underline" href="/vedic-astrology">印度占星</a>與
              <a className="text-[#f0d88c] underline" href="/maya-calendar">馬雅曆</a>，探索你的天賦與人生節奏，也看看今年有哪些流年提醒與注意事項。
            </>
          ) : (
            <>
              聽完這支冥想後，為自己留一個小儀式：前往{" "}
              <a className="text-[#f0d88c] underline" href="/oracle">埃及神諭卡</a>、
              <a className="text-[#f0d88c] underline" href="/lightworker">光行者神癒卡</a>{" "}
              或{" "}
              <a className="text-[#f0d88c] underline" href="/work-your-light">光之訊息卡</a>，抽一張今日指引。
            </>
          )}
        </div>
        {t.isFree && !user && previewFinished[t.id] && (
          <div className="mt-4 rounded-xl border border-[#d8bb78]/35 bg-[#1b2234] p-3 text-sm text-[#f0d88c]">
            <p>已試聽 1 分鐘｜登入後繼續免費聆聽完整冥想</p>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-lg bg-[#d8bb78] px-4 font-semibold text-[#071323]"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent("/meditation")}`)}
            >
              登入後繼續聆聽
            </button>
          </div>
        )}
        {locked && previewFinished[t.id] && (
          <div className="mt-4 rounded-xl border border-[#d8bb78]/35 bg-[#1b2234] p-3 text-sm text-[#f0d88c]">
            <p>{previewFinished[t.id] ? "已試聽 1 分鐘｜解鎖完整 10 分鐘引導冥想" : "片段試聽｜解鎖完整冥想"}</p>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-lg bg-[#d8bb78] px-4 font-semibold text-[#071323]"
              onClick={() => void buy()}
            >
              NT$980 解鎖完整冥想
            </button>
          </div>
        )}
      </article>
    );
  };
  const free = tracks.filter((t) => t.isFree),
    paid = tracks.filter((t) => !t.isFree);
  const freeTracks = isHighPriest ? free.slice(0, 2) : free;
  const paidTracks = isHighPriest ? paid.slice(0, 6) : paid;
  return (
    <main className="min-h-screen bg-[#071323] px-4 pb-16 pt-8 text-[#f7f0dd] sm:px-8 sm:pt-12">
      <div className="mx-auto max-w-6xl">
        <header className="relative mb-8 min-h-[300px] overflow-hidden rounded-[2rem] border border-[#c9a75b]/35 bg-[radial-gradient(circle_at_18%_20%,rgba(201,167,91,.2),transparent_26%),linear-gradient(145deg,#0b1d31,#111323_55%,#160b2b)] px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,.3)] sm:px-12 sm:py-12">
          <p className="text-xs tracking-[.35em] text-[#d8bb78]">
            THE INNER TEMPLE · TENFOLD STILLNESS
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-[#fff8e8] sm:text-6xl">
            埃及金字塔及古埃及神廟冥想
          </h1>
          <p className="mt-4 text-base leading-7 text-[#e9dfc9] sm:text-xl">
            {isHighPriest
              ? "走進古埃及神聖空間，進行一場跨越時空的靈魂深層淨化"
              : "以古埃及神話為靈感，透過呼吸、聲音與神殿意象，留一段時間回到自己。先從哈索爾女神冥想開始，練習把給別人的溫柔，也留給自己."}
          </p>
          {isHighPriest && (
            <ul className="mt-5 space-y-2 text-base leading-7 text-[#d8d1c4] sm:text-lg">
              <li>・穿越千年神聖殿堂，喚醒沉睡的靈魂印記與高維光能</li>
              <li>・步入古老法老密室與神廟聖火，重啟內在神性主權</li>
            </ul>
          )}
        </header>
      {!isHighPriest && <Link to="/meditation/high-priest" className="mb-8 block overflow-hidden rounded-3xl border border-[#c9a75b]/35 bg-[radial-gradient(circle_at_82%_18%,rgba(201,167,91,.2),transparent_30%),linear-gradient(145deg,#101f32,#17112b)] p-6 shadow-[0_16px_50px_rgba(0,0,0,.25)] transition hover:border-[#e6c978]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0d88c] sm:p-10" aria-labelledby="pyramid-priest-meditation-title">
        <p className="text-xs tracking-[.3em] text-[#d8bb78]">ANCIENT TEMPLE · INNER JOURNEY</p>
        <h2 id="pyramid-priest-meditation-title" className="mt-3 font-serif text-2xl text-[#fff8e8] sm:text-3xl">埃及金字塔及大祭司冥想</h2>
        <p className="mt-3 max-w-3xl leading-7 text-[#d8d1c4]">走進古埃金字塔的寧靜殿堂，在大祭司的引導下，讓呼吸慢下來，聆聽內在智慧與古老象徵帶來的沉澱時刻。</p>
        <p className="mt-3 text-sm leading-6 text-[#c4c9cd]">這是一段獨立的想像式冥想主題；請選擇安靜的空間，依自己的節奏停留與覺察。</p>
      </Link>}
        {!isHighPriest && <section
          className="mb-8 rounded-2xl border border-[#c9a75b]/25 bg-[#111323]/80 p-4 backdrop-blur-md"
          aria-label="情緒快選"
        >
          <p className="mb-3 text-sm text-[#d8bb78]">
            此刻的你，需要哪一段 10 分鐘獨立引導？
          </p>
          <div className="flex flex-wrap gap-2 pb-1">
            {EMOTIONS.map(([emotion]) => (
              <button
                key={emotion}
                type="button"
                onClick={() =>
                  setSelectedEmotion(
                    selectedEmotion === emotion ? null : emotion,
                  )
                }
                aria-pressed={selectedEmotion === emotion}
                className={`min-h-[38px] shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${selectedEmotion === emotion ? "border-[#f0d88c] bg-[#d8bb78] text-[#071323]" : "border-[#c9a75b]/40 bg-[#0d1b2d] text-[#e9dfc9] hover:border-[#f0d88c]"}`}
              >
                {emotion}
              </button>
            ))}
          </div>
          {selectedEmotion &&
            (() => {
              const item = EMOTIONS.find(
                ([emotion]) => emotion === selectedEmotion,
              );
              if (!item) return null;
              const target = tracks.find((t) => t.title.includes(item[1]));
              return (
                <div className="mt-4 rounded-xl border border-[#c9a75b]/25 bg-[#0d1b2d] p-4 text-sm text-[#e9dfc9]">
                  <h3 className="font-serif text-xl text-[#fff8e8]">
                    推薦【{item[1]}冥想】
                  </h3>
                  <p className="mt-2 text-[#f0d88c]">
                    10 分鐘獨立引導 — {item[2]}
                  </p>
                  <p className="mt-2 leading-6 text-[#c4c9cd]">
                    {target?.description ||
                      `以${item[1]}的象徵與聲音，陪你進行一段安靜的自我探索。`}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="min-h-10 rounded-lg border border-[#c9a75b]/60 px-4 text-[#f0d88c]"
                      onClick={() => {
                        if (target)
                          document
                            .getElementById(`meditation-track-${target.id}`)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                      }}
                    >
                      "免費試聽 1 分鐘"
                    </button>
                    {!target?.isFree && (
                      <button
                        type="button"
                        className="min-h-10 rounded-lg bg-[#d8bb78] px-4 font-semibold text-[#071323]"
                        onClick={() => void buy()}
                      >
                        NT$980 解鎖十神冥想
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
        </section>}
        {message && (
          <p className="mb-4 rounded-xl border border-[#d8bb78]/40 bg-[#1b2234] p-4 text-[#f0d88c]">
            {message}
          </p>
        )}
        <section>
          <p className="text-xs tracking-[.25em] text-[#c9a75b]">
            FREE LISTENING
          </p>
          <h2 className="mt-2 mb-5 font-serif text-2xl text-[#fff8e8] sm:text-3xl">
            {isHighPriest ? "免費試聽" : "免費試聽音頻"}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {freeTracks.map((t, i) => card(t, i))}
          </div>
        </section>
        <section className="mt-14 rounded-3xl border border-[#c9a75b]/35 bg-[#111323] p-6 sm:p-10">
          <p className="text-xs tracking-[.25em] text-[#d8bb78]">
            TEN SACRED GATES
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[#fff8e8]">
            {isHighPriest ? "付費系列｜片段試聽" : "埃及十神冥想系列"}
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#d8d1c4]">
            {isHighPriest
              ? "這是一套以古埃及金字塔與大祭司意象為靈感的引導式冥想，陪你在安靜時刻整理呼吸、覺察內在。"
              : "這是一套以埃及神祇象徵為靈感的引導式冥想，陪你在安靜時刻整理呼吸、覺察內在，依自己的節奏展開探索。"}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {paidTracks.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-[#c9a75b]/20 bg-[#0d1b2d] p-4"
              >
                <h3 className="font-serif text-lg text-[#fff8e8]">{t.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#c4c9cd]">
                  {t.description || "以象徵與聲音陪伴一段安靜的自我探索。"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="text-lg text-[#9b9b9b] line-through">
              NT$2,980
            </span>
            <strong className="text-4xl text-[#f0d88c]">NT$980</strong>
            <button
              disabled={buying}
              onClick={() => (owned ? navigate("#paid-audio") : void buy())}
              className="rounded-xl bg-[#d8bb78] px-6 py-4 font-semibold text-[#071323]"
            >
              {owned ? "開始收聽" : "立即以 NT$980 解鎖十神冥想"}
            </button>
            <div className="text-sm leading-6 text-[#d8d1c4]">
              <a
                className="mr-3 underline"
                href="https://reurl.cc/eQ1O4j"
                target="_blank"
                rel="noreferrer"
              >
                YT 頻道
              </a>
              <a
                className="mr-3 underline"
                href="https://www.facebook.com/hunagwade777/"
                target="_blank"
                rel="noreferrer"
              >
                FB 粉絲團
              </a>
              <a
                className="underline"
                href="https://lin.ee/Z1mvseQ"
                target="_blank"
                rel="noreferrer"
              >
                加入 LINE 群組
              </a>
            </div>
          </div>
          <p className="mt-3 text-sm text-[#c4c9cd]">
            購買後登入會員，即可收聽完整 10 個冥想音頻。
          </p>
          <div className="mt-8 rounded-2xl border border-[#c9a75b]/20 bg-[#0d1b2d] p-5">
            <h3 className="font-serif text-xl text-[#fff8e8]">
              關於帶領者｜陪伴你安靜向內、找回內在頻率的引路人
            </h3>
            <h4 className="mt-4 text-lg text-[#f0d88c]">
              韋德老師 黃晨維 (Wade Huang)
            </h4>
            <div className="mt-3 space-y-3 leading-7 text-[#d8d1c4]">
              <p>
                在瞬息萬變的高壓生活中，我們常常忘了如何好好呼吸，也忘了自己身上原本就擁有強大的平靜力量。
              </p>
              <p>
                韋德老師在身心靈與能量工作領域深耕多年，擁有高階水晶治療師資格。他擅長將深奧的氣脈能量與現代人日常可實踐的冥想結合，用溫柔、穩定的頻率陪伴學員卸下防備。
              </p>
              <p>
                冥想帶領著重於覺察與陪伴，透過聲音引導協助你在繁雜思緒中，找回內在清明與安定。
              </p>
              <p className="italic text-[#f0d88c]">
                「冥想不是要改變你，而是帶你回到原本就安靜而巨大的內在空間。」——韋德老師
              </p>
              <h4 className="pt-2 text-base text-[#f0d88c]">專業資歷與背景</h4>
              <ul className="list-disc space-y-1 pl-5">
                <li>晶域心語創辦人／身心靈導師</li>
                <li>高階水晶治療師／能量場與脈輪調頻專家</li>
                <li>專注於 AI 時代下的身心靈整合與心靈成長推廣</li>
              </ul>
            </div>
          </div>
          <div
            id="paid-audio"
            className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {paidTracks.map((t, i) => card(t, i + freeTracks.length))}
          </div>
        </section>
        {!isHighPriest && <section
          className="mt-10 rounded-3xl border border-[#c9a75b]/30 bg-[#111323] p-5 sm:p-8"
          aria-label="埃及十神冥想情緒與狀態推薦對照表"
        >
          <h2 className="font-serif text-2xl text-[#fff8e8]">
            埃及十神冥想｜情緒與狀態推薦對照表
          </h2>
          <div className="mt-5 space-y-2">
            {GOD_GUIDE.map(([god, energy, state, userType]) => (
              <div
                key={god}
                className="rounded-xl border border-[#c9a75b]/20 bg-[#0d1b2d]"
              >
                <button
                  type="button"
                  className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-[#fff8e8]"
                  aria-expanded={expandedGod === god}
                  onClick={() =>
                    setExpandedGod(expandedGod === god ? null : god)
                  }
                >
                  <span className="font-semibold">{god}冥想</span>
                  <span aria-hidden="true">
                    {expandedGod === god ? "−" : "＋"}
                  </span>
                </button>
                {expandedGod === god && (
                  <div className="space-y-2 border-t border-[#c9a75b]/15 px-4 py-3 text-sm leading-6 text-[#d8d1c4]">
                    <p>
                      <strong className="text-[#f0d88c]">
                        神話原型與核心能量：
                      </strong>
                      {energy}
                    </p>
                    <p>
                      <strong className="text-[#f0d88c]">
                        適合處理的情緒與狀態：
                      </strong>
                      {state}
                    </p>
                    <p>
                      <strong className="text-[#f0d88c]">推薦給：</strong>
                      {userType}
                    </p>
                    <p className="text-[#c9a75b]">
                      每位神祇都是獨立的 10 分鐘引導冥想，可至上方試聽區挑選。
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>}
        {isHighPriest ? (
          <section className="mt-10 rounded-3xl border border-[#c9a75b]/30 bg-[#111323] p-5 sm:p-8" aria-labelledby="pyramid-energy-title">
            <h2 id="pyramid-energy-title" className="font-serif text-2xl text-[#fff8e8]">金字塔能量特色介紹</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <article className="rounded-2xl border border-[#c9a75b]/25 bg-[#0d1b2d] p-5">
                <h3 className="font-serif text-xl text-[#f0d88c]">大金字塔</h3>
                <p className="mt-3 leading-7 text-[#d8d1c4]">大金字塔象徵穩定、聚焦與向內收斂的力量。寬厚的基座提醒人先安頓身體與呼吸，再把注意力帶回此刻；逐層向上的結構，則像一段整理思緒、沉澱雜訊的練習。適合在需要重新集中精神、梳理目標或尋找內在安定時聆聽，讓聲音引導你在自己的節奏裡建立清楚而穩固的中心。</p>
              </article>
              <article className="rounded-2xl border border-[#c9a75b]/25 bg-[#0d1b2d] p-5">
                <h3 className="font-serif text-xl text-[#f0d88c]">紅色金字塔</h3>
                <p className="mt-3 leading-7 text-[#d8d1c4]">紅色金字塔帶著溫暖、扎根與生命力的象徵。紅色石材讓人聯想到土地、血脈與持續前進的耐力，也提醒我們在變動中保留自己的節奏。這段主題適合想重新連結身體感、恢復行動意志或為生活建立規律的人。透過呼吸與想像，讓緊繃慢慢鬆開，把分散的力量收回，回到踏實而有支撐的狀態。</p>
              </article>
              <article className="rounded-2xl border border-[#c9a75b]/25 bg-[#0d1b2d] p-5">
                <h3 className="font-serif text-xl text-[#f0d88c]">彎曲金字塔</h3>
                <p className="mt-3 leading-7 text-[#d8d1c4]">彎曲金字塔的轉折輪廓，象徵調整、彈性與重新選擇路徑。它不要求一切筆直完成，而是容許人在經驗中修正角度、放慢速度，找到更適合自己的平衡。當你正面對計畫變動、角色轉換或需要放下僵化期待時，可以從這個意象開始。讓每一次呼吸成為轉彎的空間，在不否定過去的前提下，溫柔地走向下一步。</p>
              </article>
            </div>
          </section>
        ) : <MeditationStoriesFaq />}
        {isHighPriest && <section className="mt-10 rounded-3xl border border-[#c9a75b]/30 bg-[#111323] p-5 sm:p-8" aria-labelledby="high-priest-seo-title">
          <h2 id="high-priest-seo-title" className="font-serif text-2xl text-[#fff8e8]">認識埃及金字塔與古埃及神廟冥想</h2>
          <p className="mt-3 leading-7 text-[#d8d1c4]">這系列引導式冥想以古埃及金字塔、神廟殿堂與法老密室為想像場景。跟著韋德老師的聲音放慢呼吸，留意不同場景帶給你的感受。第一次接觸，可以先挑一段免費音頻，感受自己是否喜歡這樣的引導節奏。</p>
          <h2 className="mt-8 font-serif text-2xl text-[#fff8e8]">常見問題</h2>
          <div className="mt-4 space-y-2">
            {[
              ['埃及金字塔冥想是什麼？', '這是一種以古埃及金字塔與神廟為意象的引導式冥想。你可以跟著語音想像場景，留意自己的呼吸與當下感受。'],
              ['冥想初學者可以聽嗎？', '可以。找一個安靜的地方坐下，把音量調到舒服的程度，跟著語音慢慢練習。需要休息時，可以隨時暫停。'],
              ['可以先免費試聽嗎？', '可以先聽本頁的兩段免費音頻。六段付費冥想的內容與解鎖方式請見本頁說明。'],
              ['這系列和埃及十神冥想有什麼差別？', <>這系列以金字塔與神廟等空間為引導場景。<a className="text-[#f0d88c] underline" href="/meditation">埃及十神冥想</a>則從不同神祇的故事與象徵切入。</>],
            ].map(([question, answer]) => <details key={String(question)} className="rounded-xl border border-[#c9a75b]/20 bg-[#0d1b2d]"><summary className="cursor-pointer px-4 py-3 font-semibold text-[#fff8e8]">{question}</summary><p className="border-t border-[#c9a75b]/15 px-4 py-3 leading-7 text-[#d8d1c4]">{answer}</p></details>)}
          </div>
          <nav className="mt-5 flex flex-wrap gap-4 text-sm" aria-label="相關探索"><a className="text-[#f0d88c] underline" href="/numerology">生命靈數</a><a className="text-[#f0d88c] underline" href="/human-design">人類圖</a><a className="text-[#f0d88c] underline" href="/vedic-astrology">印度占星</a><a className="text-[#f0d88c] underline" href="/maya-calendar">馬雅曆</a></nav>
        </section>}
      </div>
    </main>
  );
}
