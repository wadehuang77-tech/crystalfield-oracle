import { useState, useEffect, useRef } from 'react';
import { Mail, Lock } from 'lucide-react';
import { cardsApi, publicApi, type UnlockedCard } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface InlineEmailUnlockProps {
  onUnlocked: (email: string, card?: UnlockedCard) => void;
  readingType: string;
  cardData?: Record<string, unknown>;
  theme?: 'light' | 'dark';
  cardUnlock?: { spread_id: string; card_key: string; reversed?: boolean };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function InlineEmailUnlock({ onUnlocked, readingType, theme = 'light', cardUnlock }: InlineEmailUnlockProps) {
  const { user, loading: authLoading } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [autoUnlockFailed, setAutoUnlockFailed] = useState(false);
  const [autoUnlockError, setAutoUnlockError] = useState<string | null>(null);

  const autoFiredRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (lastUserIdRef.current !== currentUserId) {
      lastUserIdRef.current = currentUserId;
      autoFiredRef.current = false;
      setAutoUnlockFailed(false);
      setAutoUnlockError(null);
    }
    if (!user || autoFiredRef.current) return;
    autoFiredRef.current = true;
    setAutoUnlockFailed(false);
    setAutoUnlockError(null);
    (async () => {
      try {
        if (cardUnlock) {
          const { card } = await cardsApi.unlockSingle(
            cardUnlock.spread_id,
            cardUnlock.card_key,
            user.email,
            cardUnlock.reversed,
          );
          onUnlocked(user.email, card);
        } else {
          await publicApi.saveEmail(user.email, readingType).catch(() => {});
          onUnlocked(user.email);
        }
      } catch (err) {
        setAutoUnlockFailed(true);
        setAutoUnlockError(err instanceof Error ? err.message : '自動解鎖失敗');
      }
    })();
  }, [user?.id]);

  if (authLoading) return null;
  if (user && !autoUnlockFailed) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();

    if (!isValidEmail(trimmed)) {
      setError('請輸入有效的 Email 地址');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (cardUnlock) {
        const { card } = await cardsApi.unlockSingle(
          cardUnlock.spread_id,
          cardUnlock.card_key,
          trimmed,
          cardUnlock.reversed,
        );
        onUnlocked(trimmed, card);
        return;
      }

      const data = await publicApi.saveEmail(trimmed, readingType);
      if (!data.success) {
        setError(data.message || '提交失敗，請稍後再試');
        return;
      }
      onUnlocked(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '系統錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (theme === 'dark') {
    return (
      <div className="relative">
        <div className="absolute -top-16 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-slate-900/95 pointer-events-none z-10"></div>
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-2xl p-8 shadow-2xl relative z-20">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/30 to-blue-500/30 border border-blue-400/40 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-300" />
            </div>
          </div>
          <div className="text-center mb-6">
            <p className="text-blue-100/60 text-sm uppercase tracking-widest mb-3">這張牌還有更關鍵的訊息</p>
            <h3 className="text-xl font-medium text-blue-100 mb-3 leading-snug">
              你現在看到的只是表層訊息<br />
              <span className="text-blue-300">真正的轉化，在後面</span>
            </h3>
            <p className="inline-flex items-center justify-center rounded-full border border-blue-200/35 bg-blue-100/15 px-4 py-2 text-sm font-bold leading-relaxed text-blue-50 shadow-[0_0_22px_rgba(96,165,250,0.28)]">
              輸入 Email，解鎖完整指引與能量提醒
            </p>
          </div>

          {autoUnlockFailed && (
            <div className="border border-red-500/45 bg-red-500/10 px-3 py-2 mb-4 text-xs text-blue-200 tracking-wide text-center">
              自動解鎖失敗{autoUnlockError ? `:${autoUnlockError}` : ''}，請重新輸入 Email 試試
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-100/40" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-800/10 border border-blue-500/30 rounded-xl text-blue-100 placeholder-white/30 focus:outline-none focus:border-blue-400/60 transition-all text-sm"
                required
                disabled={isSubmitting}
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-400 hover:to-blue-400 text-blue-100 font-semibold rounded-xl shadow-lg hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>處理中...</span>
                </>
              ) : (
                <span>解鎖完整解讀</span>
              )}
            </button>
          </form>
          <p className="text-xs text-blue-100/25 text-center mt-3">我們尊重您的隱私，絕不發送垃圾郵件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute -top-16 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-white/95 pointer-events-none z-10"></div>
      <div className="bg-white border-2 border-blue-200 rounded-2xl p-8 shadow-xl relative z-20">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 border border-blue-300 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-slate-500" />
          </div>
        </div>
        <div className="text-center mb-6">
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">這張牌還有更關鍵的訊息</p>
          <h3 className="text-xl font-semibold text-slate-900 mb-3 leading-snug">
            你現在看到的只是表層訊息<br />
            <span className="text-slate-700">真正的轉化，在後面</span>
          </h3>
          <p className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-bold leading-relaxed text-white shadow-md">
            輸入 Email，解鎖完整指引與能量提醒
          </p>
        </div>

        {autoUnlockFailed && (
          <div className="border border-red-500/45 bg-red-500/10 px-3 py-2 mb-4 text-xs text-slate-900 tracking-wide text-center">
            自動解鎖失敗{autoUnlockError ? `:${autoUnlockError}` : ''}，請重新輸入 Email 試試
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="your@email.com"
              className="w-full pl-11 pr-4 py-3.5 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-sm text-slate-900 bg-white"
              required
              disabled={isSubmitting}
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-blue-100 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>處理中...</span>
              </>
            ) : (
              <span>解鎖完整解讀</span>
            )}
          </button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-3">我們尊重您的隱私，絕不發送垃圾郵件</p>
      </div>
    </div>
  );
}
