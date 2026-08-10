import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Facebook, Loader2, Share2, X } from 'lucide-react';
import { numerologyShareApi, publicApi } from '../../lib/api';
import type { NumerologyShareAccess, NumerologyShareGroup, NumerologyShareProof } from '../../lib/api';
import { saveNumerologyShareRevocation } from '../../lib/numerologyShareAuth';

const SITE_URL = 'https://www.crystalfield101.com/numerology';
const PLATFORM_EVENTS = {
  facebook: 'numerology_share_facebook',
  threads: 'numerology_share_threads',
  instagram: 'numerology_share_instagram',
  copy: 'numerology_share_copy',
} as const;

interface ShareContextValue {
  number: number;
  access: NumerologyShareAccess | null;
  proofs: NumerologyShareProof[];
  capabilities: string[];
  onCapabilities: (tokens: string[]) => void;
}

const ShareContext = createContext<ShareContextValue | null>(null);

export function NumerologyShareProvider({ value, children }: { value: ShareContextValue; children: React.ReactNode }) {
  return <ShareContext.Provider value={value}>{children}</ShareContext.Provider>;
}

interface Props {
  group: NumerologyShareGroup;
  sectionKey: string;
  sectionName: string;
  number?: number;
  summary: string;
  guidance: string;
  highlights?: string[];
  scope?: 'single_section' | 'report_summary';
  reportButton?: boolean;
}

function shortText(value: string, max: number) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function track(name: string, params: Record<string, string | number | boolean>) {
  window.gtag?.('event', name, params);
  void publicApi.conversionEvent(name, params);
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('copy_failed');
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = [...text];
  let line = '';
  let lineNo = 0;
  for (let index = 0; index < chars.length && lineNo < maxLines; index += 1) {
    const candidate = line + chars[index];
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineNo * lineHeight);
      line = chars[index];
      lineNo += 1;
    } else line = candidate;
  }
  if (lineNo < maxLines && line) ctx.fillText(line, x, y + lineNo * lineHeight);
}

function createCard(number: number, title: string, summary: string, highlights: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#170c35'); bg.addColorStop(0.48, '#26124d'); bg.addColorStop(1, '#07182c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = 'rgba(237,212,134,.24)'; ctx.lineWidth = 2;
  for (let ring = 0; ring < 5; ring += 1) { ctx.beginPath(); ctx.arc(540, 430, 190 + ring * 34, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 90; i += 1) {
    const x = (i * 193) % 1080; const y = (i * i * 37) % 1350;
    ctx.fillStyle = i % 4 ? 'rgba(255,255,255,.35)' : 'rgba(244,211,122,.65)';
    ctx.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1d98d'; ctx.font = '600 34px serif'; ctx.fillText('晶域心語', 540, 100);
  ctx.fillStyle = '#eadfff'; ctx.font = '500 40px serif'; ctx.fillText('我的生命靈數指引', 540, 170);
  const glow = ctx.createRadialGradient(540, 430, 20, 540, 430, 190);
  glow.addColorStop(0, '#fff3ba'); glow.addColorStop(.35, '#d8ad55'); glow.addColorStop(1, 'rgba(126,78,196,.08)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(540, 430, 180, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#25103d'; ctx.font = '700 190px serif'; ctx.fillText(String(number), 540, 495);
  ctx.fillStyle = '#f4e8ff'; ctx.font = '600 44px serif'; wrap(ctx, title, 540, 690, 880, 58, 2);
  ctx.fillStyle = 'rgba(239,231,250,.9)'; ctx.font = '32px sans-serif'; wrap(ctx, shortText(summary, 120), 540, 805, 860, 50, 4);
  if (highlights.length) {
    ctx.fillStyle = '#d9c2ff'; ctx.font = '27px sans-serif';
    wrap(ctx, highlights.slice(0, 3).map((item) => `✦ ${shortText(item, 42)}`).join('　'), 540, 1040, 850, 43, 3);
  }
  ctx.fillStyle = '#f1d98d'; ctx.font = '600 30px sans-serif'; ctx.fillText('探索你的靈魂數字', 540, 1215);
  ctx.fillStyle = 'rgba(234,223,255,.7)'; ctx.font = '24px sans-serif'; ctx.fillText('www.crystalfield101.com/numerology', 540, 1265);
  return canvas.toDataURL('image/jpeg', .9);
}

function dataUrlFile(dataUrl: string) {
  const bytes = atob(dataUrl.split(',')[1]);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
  return new File([array], 'crystalfield-numerology.jpg', { type: 'image/jpeg' });
}

export default function NumerologyShareButton(props: Props) {
  const context = useContext(ShareContext);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [image, setImage] = useState('');
  const publicRef = useRef<Promise<string> | null>(null);
  const canShare = Boolean(context?.access?.groups.includes(props.group));
  const number = props.number ?? context?.number ?? 0;
  const planName = context?.access?.plan_for[props.group] ?? '';
  const scope = props.scope ?? 'single_section';
  const summary = shortText(props.summary, 220);
  const guidance = shortText(props.guidance, 160);
  const highlights = useMemo(() => (props.highlights ?? []).map((item) => shortText(item, 100)).slice(0, 3), [props.highlights]);
  const shareText = useMemo(() => `我的生命靈數是【${props.sectionName}・${number}】✨\n\n這次得到的生命指引是：\n${summary}\n\n${guidance}\n\n每一個數字，都藏著靈魂為你準備的生命訊息。\n\n你也來看看自己的生命靈數：\n${SITE_URL}\n\n#晶域心語 #生命靈數 #靈魂藍圖 #水晶療癒 #韋德老師`, [guidance, number, props.sectionName, summary]);

  const params = (platform: string, method: string) => ({
    numerology_number: number, report_section: props.sectionKey, plan_name: planName,
    platform, is_mobile: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),
    share_method: method, share_scope: scope,
  });
  const ensurePublic = () => {
    if (!context) throw new Error('access_unavailable');
    publicRef.current ??= numerologyShareApi.create({
      section_key: props.sectionKey, numerology_number: number, section_name: props.sectionName,
      share_scope: scope, summary, guidance, highlights, image_base64: image,
      proofs: context.proofs, capabilities: context.capabilities,
    }).then((result) => {
      if (result.issued_capabilities.length) context.onCapabilities(result.issued_capabilities);
      saveNumerologyShareRevocation(result.id, result.revoke_token);
      return result.url;
    });
    return publicRef.current;
  };
  useEffect(() => {
    if (open && image && canShare) void ensurePublic().catch(() => {});
  // The immutable preview payload intentionally starts one background request per opened preview.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, image, canShare]);
  if (!canShare) return null;
  const run = async (platform: 'facebook' | 'threads' | 'instagram' | 'copy') => {
    setBusy(true); setNotice('');
    const event = PLATFORM_EVENTS[platform];
    try {
      if (platform === 'copy') {
        track(event, params(platform, 'clipboard')); await copyText(shareText);
        setNotice('分享文字已複製'); track('numerology_share_success', params(platform, 'clipboard'));
      } else if (platform === 'facebook') {
        track(event, params(platform, 'official_sharer'));
        const popup = window.open('about:blank', 'facebook-share', 'width=720,height=650');
        if (!popup) throw new Error('popup_blocked');
        popup.opener = null;
        const url = await ensurePublic();
        popup.location.replace(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        setNotice('Facebook 分享視窗已開啟；可再複製分享文字。');
        track('numerology_share_success', params(platform, 'official_sharer'));
      } else {
        const file = dataUrlFile(image);
        const files = [file];
        const publicUrl = await ensurePublic();
        if (navigator.share && (!navigator.canShare || navigator.canShare({ files }))) {
          track(event, params(platform, 'web_share'));
          await navigator.share({ title: props.sectionName, text: shareText, url: publicUrl, files });
          setNotice('分享已完成'); track('numerology_share_success', params(platform, 'web_share'));
        } else {
          track(event, params(platform, 'download_and_copy'));
          await copyText(`${shareText}\n${publicUrl}`);
          const link = document.createElement('a'); link.href = image; link.download = '晶域心語-生命靈數指引.jpg'; link.click();
          track('numerology_share_image_download', params(platform, 'download_and_copy'));
          setNotice(platform === 'instagram' ? '分享圖片已下載、文字已複製，請開啟 Instagram 發布。' : '分享圖片已下載、文字已複製，請貼到 Threads。');
          track('numerology_share_success', params(platform, 'download_and_copy'));
        }
      }
    } catch (error) {
      if (error instanceof DOMException && ['AbortError', 'NotAllowedError'].includes(error.name)) setNotice('已取消分享');
      else { setNotice('分享未完成，請改用複製文字或下載圖片。'); track('numerology_share_error', params(platform, 'fallback')); }
    } finally { setBusy(false); }
  };
  const downloadImage = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image; link.download = '晶域心語-生命靈數指引.jpg'; link.click();
    track('numerology_share_image_download', params('download', 'direct_download'));
    setNotice('分享圖片已下載');
  };
  const openPreview = () => {
    publicRef.current = null; setImage(''); setOpen(true); setNotice('');
    window.setTimeout(() => {
      try { setImage(createCard(number, props.sectionName, summary, highlights)); }
      catch { setNotice('分享圖片產生失敗，仍可複製分享文字。'); }
    }, 0);
    track('numerology_share_click', params('preview', 'button'));
    track('numerology_share_preview', params('preview', 'modal'));
  };
  return <>
    <button type="button" onClick={openPreview} className={props.reportButton ? 'w-full rounded-2xl px-5 py-4 font-semibold' : 'mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold'} style={{ background: 'linear-gradient(135deg,rgba(167,139,250,.2),rgba(251,191,36,.12))', border: '1px solid rgba(216,190,255,.28)', color: '#f3e8ff', boxShadow: '0 0 22px rgba(139,92,246,.12)' }}>
      <Share2 className="w-4 h-4" />{props.reportButton ? '分享我的生命靈數指引' : '分享這段指引'}
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(4,2,12,.86)', backdropFilter: 'blur(10px)' }} role="dialog" aria-modal="true" aria-label="分享預覽">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-5 space-y-4" style={{ background: 'linear-gradient(145deg,#1d103c,#08172b)', border: '1px solid rgba(216,190,255,.25)' }}>
        <div className="flex items-center justify-between"><div><p className="text-lg font-serif" style={{ color: '#f1d98d' }}>分享預覽</p><p className="text-xs" style={{ color: 'rgba(233,213,255,.58)' }}>確認圖片與文字後再分享</p></div><button aria-label="關閉" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button></div>
        {image ? <img src={image} alt="生命靈數分享卡片預覽" className="w-full rounded-2xl" /> : <div className="h-64 grid place-items-center"><Loader2 className="animate-spin" /></div>}
        <div className="rounded-xl p-3 whitespace-pre-wrap text-xs max-h-36 overflow-y-auto" style={{ background: 'rgba(255,255,255,.05)', color: '#e9d5ff' }}>{shareText}</div>
        <div className="grid grid-cols-2 gap-2">
          <button disabled={busy || !image} onClick={() => void run('facebook')} className="share-action"><Facebook className="w-4 h-4" />Facebook</button>
          <button disabled={busy || !image} onClick={() => void run('threads')} className="share-action"><Share2 className="w-4 h-4" />Threads</button>
          <button disabled={busy || !image} onClick={() => void run('instagram')} className="share-action"><Download className="w-4 h-4" />Instagram</button>
          <button disabled={busy} onClick={() => void run('copy')} className="share-action"><Copy className="w-4 h-4" />複製分享文字</button>
        </div>
        {busy && <p className="text-center text-xs" style={{ color: '#c4b5fd' }}><Loader2 className="inline w-4 h-4 mr-1 animate-spin" />正在準備分享…</p>}
        {notice && <p role="status" className="text-center text-sm" style={{ color: '#5eead4' }}>{notice}</p>}
        {notice.startsWith('分享未完成') && <button type="button" onClick={downloadImage} className="share-action w-full"><Download className="w-4 h-4" />下載分享圖片</button>}
      </div>
    </div>}
  </>;
}
