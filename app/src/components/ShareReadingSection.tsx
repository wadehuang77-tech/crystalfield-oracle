import { useCallback, useMemo, useRef, useState } from 'react';
import { Clipboard, Facebook, Instagram, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { shareApi } from '../lib/api';
import {
  buildShareText,
  copyText,
  createShareImage,
  downloadBlob,
  isMobileDevice,
  normalizeShareData,
  PUBLIC_SITE_URL,
  SharePlatform,
  ShareReadingData,
  trackShareEvent,
} from '../lib/shareReading';

interface ShareReadingSectionProps extends ShareReadingData {
  className?: string;
}

type Notice = { tone: 'success' | 'info' | 'error'; text: string } | null;

const platformEvents: Record<SharePlatform, string> = {
  facebook: 'tarot_share_facebook',
  threads: 'tarot_share_threads',
  instagram: 'tarot_share_instagram',
  copy: 'tarot_share_copy',
};

function isShareCancelled(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError');
}

export default function ShareReadingSection(props: ShareReadingSectionProps) {
  const { className = '' } = props;
  const data = useMemo(() => normalizeShareData(props), [props]);
  const [loading, setLoading] = useState<SharePlatform | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const imageRef = useRef<Promise<Blob> | null>(null);
  const shareUrlRef = useRef<Promise<string> | null>(null);

  const getImage = useCallback(() => {
    imageRef.current ??= createShareImage(data);
    return imageRef.current;
  }, [data]);

  const getShareUrl = useCallback(() => {
    if (!shareUrlRef.current) {
      shareUrlRef.current = getImage().then(async (blob) => {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).replace(/^data:image\/jpeg;base64,/, ''));
          reader.onerror = () => reject(reader.error ?? new Error('image read failed'));
          reader.readAsDataURL(blob);
        });
        const result = await shareApi.create({
          deck_id: data.deckId,
          deck_name: data.deckName,
          spread_name: data.spreadName,
          cards: data.cards.map(({ name, position }) => ({ name, position })),
          summary: data.summary,
          image_base64: base64,
        });
        return result.url;
      });
    }
    return shareUrlRef.current;
  }, [data, getImage]);

  const start = (platform: SharePlatform, method: string) => {
    setNotice(null);
    setLoading(platform);
    trackShareEvent('tarot_share_click', data, platform, method);
    trackShareEvent(platformEvents[platform], data, platform, method);
  };

  const complete = (platform: SharePlatform, method: string, message: string) => {
    trackShareEvent('tarot_share_success', data, platform, method);
    setNotice({ tone: 'success', text: message });
  };

  const fail = (platform: SharePlatform, method: string) => {
    trackShareEvent('tarot_share_error', data, platform, method);
    setNotice({ tone: 'error', text: '分享準備失敗，請稍後再試。' });
  };

  const handleFacebook = async () => {
    const method = 'facebook_share_dialog';
    start('facebook', method);
    const popup = window.open('about:blank', 'crystalfield-facebook-share', 'width=680,height=720');
    if (popup) popup.opener = null;
    if (!popup) {
      fail('facebook', method);
      setNotice({ tone: 'error', text: '瀏覽器阻擋了分享視窗，請允許彈出式視窗後再試。' });
      setLoading(null);
      return;
    }
    try {
      const url = await getShareUrl();
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      popup.location.href = shareUrl;
      complete('facebook', method, '已開啟 Facebook 分享視窗；分享文字可另外複製。');
    } catch {
      popup?.close();
      fail('facebook', method);
    } finally {
      setLoading(null);
    }
  };

  const nativeShare = async (): Promise<boolean> => {
    if (!isMobileDevice() || !navigator.share) return false;
    const blob = await getImage();
    let url = PUBLIC_SITE_URL;
    try { url = await getShareUrl(); } catch { /* 分享 API 暫時不可用時仍可使用原生分享。 */ }
    const file = new File([blob], '晶域心語-占卜結果.jpg', { type: 'image/jpeg' });
    const shareData: ShareData = { title: `${data.deckName}・${data.spreadName}`, text: buildShareText(data, url), url };
    if (navigator.canShare?.({ files: [file] })) shareData.files = [file];
    await navigator.share(shareData);
    return true;
  };

  const handleThreads = async () => {
    const method = isMobileDevice() && 'share' in navigator ? 'web_share' : 'clipboard_fallback';
    start('threads', method);
    try {
      if (await nativeShare()) {
        complete('threads', method, '已開啟系統分享，請選擇 Threads。');
      } else {
        let url = PUBLIC_SITE_URL;
        try { url = await getShareUrl(); } catch { /* 仍提供可複製的安全首頁網址。 */ }
        await copyText(buildShareText(data, url));
        complete('threads', method, '分享文字已複製，請開啟 Threads 貼上發布。');
      }
    } catch (error) {
      if (!isShareCancelled(error)) fail('threads', method);
    } finally {
      setLoading(null);
    }
  };

  const handleInstagram = async () => {
    const method = isMobileDevice() && 'share' in navigator ? 'web_share' : 'download_and_copy';
    start('instagram', method);
    try {
      if (await nativeShare()) {
        complete('instagram', method, '已開啟系統分享，請選擇 Instagram。');
      } else {
        const blob = await getImage();
        let url = PUBLIC_SITE_URL;
        try { url = await getShareUrl(); } catch { /* 圖片下載與文字複製不依賴分享頁。 */ }
        downloadBlob(blob, '晶域心語-占卜結果.jpg');
        trackShareEvent('tarot_share_image_download', data, 'instagram', method);
        await copyText(buildShareText(data, url));
        complete('instagram', method, '分享圖片已下載、文字已複製，請開啟 Instagram 發布。');
      }
    } catch (error) {
      if (!isShareCancelled(error)) fail('instagram', method);
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = async () => {
    const method = 'clipboard';
    start('copy', method);
    try {
      let url: string;
      try { url = await getShareUrl(); } catch { url = 'https://www.crystalfield101.com/'; }
      await copyText(buildShareText(data, url));
      complete('copy', method, '分享文字已複製');
    } catch {
      fail('copy', method);
    } finally {
      setLoading(null);
    }
  };

  const buttons = [
    { id: 'facebook' as const, label: '分享到 Facebook', icon: Facebook, action: handleFacebook },
    { id: 'threads' as const, label: '分享到 Threads', icon: MessageCircle, action: handleThreads },
    { id: 'instagram' as const, label: '分享到 Instagram', icon: Instagram, action: handleInstagram },
    { id: 'copy' as const, label: '複製分享文字', icon: Clipboard, action: handleCopy },
  ];

  if (data.cards.length === 0) return null;
  return (
    <section className={`relative overflow-hidden rounded-3xl border border-purple-300/25 bg-gradient-to-br from-purple-950/75 via-slate-950/85 to-indigo-950/80 p-5 shadow-[0_0_50px_rgba(139,92,246,0.16)] sm:p-8 ${className}`} aria-labelledby="share-reading-title">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl" />
      <div className="relative text-center">
        <Sparkles className="mx-auto mb-3 h-7 w-7 text-amber-200" aria-hidden="true" />
        <h2 id="share-reading-title" className="font-serif text-xl tracking-wide text-purple-50 sm:text-2xl">把這份宇宙訊息分享給朋友</h2>
        <p className="mt-2 text-sm leading-relaxed text-purple-200/75">只分享牌名與簡短訊息，不會包含你的個人資料或完整解讀。</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {buttons.map(({ id, label, icon: Icon, action }) => (
            <button
              key={id}
              type="button"
              onClick={action}
              disabled={loading !== null}
              className="group flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-purple-200/20 bg-white/[0.06] px-4 py-3 text-sm font-medium text-purple-50 transition hover:border-amber-200/45 hover:bg-purple-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-wait disabled:opacity-60"
            >
              {loading === id ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Icon className="h-5 w-5 text-amber-200 transition group-hover:scale-110" aria-hidden="true" />}
              {loading === id ? '正在準備分享…' : label}
            </button>
          ))}
        </div>
        {notice && (
          <p role="status" aria-live="polite" className={`mt-4 rounded-xl px-4 py-3 text-sm ${notice.tone === 'error' ? 'bg-red-950/55 text-red-200' : notice.tone === 'success' ? 'bg-emerald-950/45 text-emerald-100' : 'bg-purple-900/45 text-purple-100'}`}>
            {notice.text}
          </p>
        )}
      </div>
    </section>
  );
}
