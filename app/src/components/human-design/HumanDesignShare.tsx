import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Facebook, Loader2, Share2, X } from 'lucide-react';
import { humanDesignShareApi, publicApi } from '../../lib/api';
import type { HumanDesignShareAccess, HumanDesignShareGroup, HumanDesignShareProof } from '../../lib/api';
import type { HDChart } from '../../lib/human-design/humanDesignCalc';
import { saveHumanDesignShareRevocation } from '../../lib/humanDesignShareAuth';

const SITE_URL = 'https://www.crystalfield101.com/human-design';
const PLATFORM_EVENTS = {
  facebook: 'human_design_share_facebook', threads: 'human_design_share_threads',
  instagram: 'human_design_share_instagram', copy: 'human_design_share_copy',
} as const;

interface ContextValue {
  chart: HDChart; chartId: string; access: HumanDesignShareAccess | null;
  proofs: HumanDesignShareProof[]; capabilities: string[]; onCapabilities: (tokens: string[]) => void;
}
const ShareContext = createContext<ContextValue | null>(null);

export function HumanDesignShareProvider({ value, children }: { value: ContextValue; children: React.ReactNode }) {
  return <ShareContext.Provider value={value}>{children}</ShareContext.Provider>;
}

interface Props {
  group: HumanDesignShareGroup; sectionKey: string; sectionName: string; result: string;
  summary: string; guidance: string; highlights?: string[];
  scope?: 'single_section' | 'report_summary'; reportButton?: boolean;
}

function short(value: string, max: number) {
  const clean = value.replace(/\s+/g, ' ').trim(); return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function track(name: string, params: Record<string, string | boolean>) {
  window.gtag?.('event', name, params); void publicApi.conversionEvent(name, params);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const area = document.createElement('textarea'); area.value = value;
  area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select();
  const ok = document.execCommand('copy'); area.remove(); if (!ok) throw new Error('copy_failed');
}

function wrap(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, height: number, lines: number) {
  let line = ''; let row = 0;
  for (const char of [...value]) {
    if (ctx.measureText(line + char).width > width && line) { ctx.fillText(line, x, y + row * height); line = char; row += 1; if (row >= lines) return; }
    else line += char;
  }
  if (line && row < lines) ctx.fillText(line, x, y + row * height);
}

function createCard(chart: HDChart, title: string, result: string, summary: string, highlights: string[]) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas_unavailable');
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350); bg.addColorStop(0, '#07152c'); bg.addColorStop(.5, '#1c1747'); bg.addColorStop(1, '#080d21');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = 'rgba(116,224,255,.2)'; ctx.lineWidth = 2;
  for (let r = 0; r < 6; r += 1) { ctx.beginPath(); ctx.arc(540, 420, 130 + r * 42, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 96; i += 1) { const x = (i * 197) % 1080; const y = (i * i * 41) % 1350; ctx.fillStyle = i % 4 ? 'rgba(255,255,255,.32)' : 'rgba(242,211,119,.65)'; ctx.fillRect(x, y, i % 5 ? 2 : 3, i % 5 ? 2 : 3); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#efd988'; ctx.font = '600 34px serif'; ctx.fillText('晶域心語', 540, 92);
  ctx.fillStyle = '#eaf8ff'; ctx.font = '500 42px serif'; ctx.fillText('我的人類圖能量藍圖', 540, 165);
  const glow = ctx.createRadialGradient(540, 420, 30, 540, 420, 215); glow.addColorStop(0, 'rgba(170,239,255,.7)'); glow.addColorStop(.42, 'rgba(94,174,255,.25)'); glow.addColorStop(1, 'rgba(100,72,190,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(540, 420, 215, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bcefff'; ctx.font = '700 66px serif'; wrap(ctx, short(result, 22), 540, 410, 750, 76, 2);
  ctx.fillStyle = '#f0e5ff'; ctx.font = '600 38px serif'; ctx.fillText(`${chart.profile}・${chart.authorityName}`, 540, 590);
  ctx.fillStyle = '#efd988'; ctx.font = '600 42px serif'; wrap(ctx, title, 540, 700, 860, 54, 2);
  ctx.fillStyle = 'rgba(234,247,255,.9)'; ctx.font = '31px sans-serif'; wrap(ctx, short(summary, 125), 540, 835, 860, 48, 4);
  if (highlights.length) { ctx.fillStyle = '#c9c4ff'; ctx.font = '26px sans-serif'; wrap(ctx, highlights.slice(0, 3).map((item) => `✦ ${short(item, 38)}`).join('　'), 540, 1050, 850, 42, 3); }
  ctx.fillStyle = '#efd988'; ctx.font = '600 29px sans-serif'; ctx.fillText('探索你獨一無二的能量設計', 540, 1215);
  ctx.fillStyle = 'rgba(225,241,255,.68)'; ctx.font = '23px sans-serif'; ctx.fillText('www.crystalfield101.com/human-design', 540, 1265);
  return canvas.toDataURL('image/jpeg', .9);
}

function fileFrom(dataUrl: string) {
  const binary = atob(dataUrl.split(',')[1]); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], 'crystalfield-human-design.jpg', { type: 'image/jpeg' });
}

export default function HumanDesignShareButton(props: Props) {
  const context = useContext(ShareContext); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(''); const [image, setImage] = useState(''); const publicRef = useRef<Promise<string> | null>(null);
  const canShare = Boolean(context?.chartId && context.access?.groups.includes(props.group));
  const planName = context?.access?.plan_for[props.group] ?? ''; const scope = props.scope ?? 'single_section';
  const summary = short(props.summary, 220); const guidance = short(props.guidance, 160);
  const highlights = useMemo(() => (props.highlights ?? []).map((item) => short(item, 90)).slice(0, 3), [props.highlights]);
  const shareText = useMemo(() => context ? `我的人類圖${props.sectionName}是【${props.result}】✨\n\n給我的指引是：\n${summary}\n\n${guidance}\n\n你也來探索自己的人類圖能量藍圖：\n${SITE_URL}\n\n#晶域心語 #人類圖 #能量藍圖 #自我探索 #韋德老師` : '', [context, guidance, props.result, props.sectionName, summary]);
  const params = (platform: string, method: string) => ({ hd_type: context?.chart.type ?? '', hd_profile: context?.chart.profile ?? '', hd_authority: context?.chart.authority ?? '', report_section: props.sectionKey, plan_name: planName, platform, is_mobile: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent), share_method: method, share_scope: scope });
  const ensurePublic = () => {
    if (!context) throw new Error('access_unavailable');
    publicRef.current ??= humanDesignShareApi.create({ chart_id: context.chartId, section_key: props.sectionKey, image_base64: image, proofs: context.proofs, capabilities: context.capabilities }).then((result) => {
      if (result.issued_capabilities.length) context.onCapabilities(result.issued_capabilities);
      saveHumanDesignShareRevocation(result.id, result.revoke_token); return result.url;
    }); return publicRef.current;
  };
  // ensurePublic intentionally stays out of the dependency list: it captures the current preview and is reset on each open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open && image && canShare) void ensurePublic().catch(() => {}); }, [open, image, canShare]);
  if (!canShare || !context) return null;
  const download = (method = 'direct_download') => { if (!image) return; const link = document.createElement('a'); link.href = image; link.download = '晶域心語-人類圖能量藍圖.jpg'; link.click(); track('human_design_share_image_download', params('download', method)); setNotice('分享圖片已下載'); };
  const run = async (platform: keyof typeof PLATFORM_EVENTS) => {
    setBusy(true); setNotice(''); const event = PLATFORM_EVENTS[platform];
    try {
      if (platform === 'copy') { track(event, params(platform, 'clipboard')); await copyText(shareText); setNotice('分享文字已複製'); track('human_design_share_success', params(platform, 'clipboard')); }
      else if (platform === 'facebook') { track(event, params(platform, 'official_sharer')); const popup = window.open('about:blank', 'facebook-share', 'width=720,height=650'); if (!popup) throw new Error('popup_blocked'); popup.opener = null; const url = await ensurePublic(); popup.location.replace(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`); setNotice('Facebook 分享視窗已開啟；可再複製分享文字。'); track('human_design_share_success', params(platform, 'official_sharer')); }
      else { const files = [fileFrom(image)]; const publicUrl = await ensurePublic(); if (navigator.share && (!navigator.canShare || navigator.canShare({ files }))) { track(event, params(platform, 'web_share')); await navigator.share({ title: props.sectionName, text: shareText, url: publicUrl, files }); setNotice('分享已完成'); track('human_design_share_success', params(platform, 'web_share')); } else { track(event, params(platform, 'download_and_copy')); await copyText(`${shareText}\n${publicUrl}`); download('download_and_copy'); setNotice(platform === 'instagram' ? '分享圖片已下載、文字已複製，請開啟 Instagram 發布。' : '分享圖片已下載、文字已複製，請貼到 Threads。'); track('human_design_share_success', params(platform, 'download_and_copy')); } }
    } catch (error) {
      if (error instanceof DOMException && ['AbortError', 'NotAllowedError'].includes(error.name)) {
        setNotice('已取消分享');
      } else {
        track('human_design_share_error', params(platform, 'fallback'));
        try {
          await copyText(shareText);
          if (platform === 'instagram' || platform === 'threads') {
            download('share_error_fallback');
            setNotice(platform === 'instagram'
              ? '分享圖片已下載、文字已複製，請開啟 Instagram 發布。'
              : '分享圖片已下載、文字已複製，請貼到 Threads。');
          } else {
            setNotice('分享視窗無法開啟，分享文字已複製。');
          }
        } catch {
          setNotice('分享未完成，請改用下載分享圖片。');
        }
      }
    } finally { setBusy(false); }
  };
  const preview = () => { publicRef.current = null; setImage(''); setNotice(''); setOpen(true); track('human_design_share_click', params('preview', 'button')); track('human_design_share_preview', params('preview', 'modal')); window.setTimeout(() => { try { setImage(createCard(context.chart, props.sectionName, props.result, summary, highlights)); } catch { setNotice('分享圖片產生失敗，仍可複製分享文字。'); track('human_design_share_error', params('preview', 'canvas')); } }, 0); };
  return <><button type="button" onClick={preview} className={props.reportButton ? 'w-full rounded-2xl px-5 py-4 font-semibold' : 'mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold'} style={{ background: 'linear-gradient(135deg,rgba(56,189,248,.16),rgba(251,191,36,.12))', border: '1px solid rgba(125,211,252,.3)', color: '#e0f2fe', boxShadow: '0 0 22px rgba(56,189,248,.1)' }}><Share2 className="w-4 h-4" />{props.reportButton ? '分享我的人類圖能量藍圖' : '分享這段人類圖指引'}</button>{open && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(3,7,18,.88)', backdropFilter: 'blur(10px)' }} role="dialog" aria-modal="true" aria-label="人類圖分享預覽"><div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-5 space-y-4" style={{ background: 'linear-gradient(145deg,#101b3b,#151039)', border: '1px solid rgba(125,211,252,.28)' }}><div className="flex justify-between"><div><p className="text-lg font-serif text-cyan-100">分享預覽</p><p className="text-xs text-white/45">確認圖片與文字後再分享</p></div><button aria-label="關閉" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button></div>{image ? <img src={image} alt="人類圖分享卡片預覽" className="w-full rounded-2xl" /> : <div className="h-64 grid place-items-center"><Loader2 className="animate-spin text-cyan-300" /></div>}<div className="rounded-xl p-3 whitespace-pre-wrap text-xs max-h-36 overflow-y-auto bg-white/5 text-white/70">{shareText}</div><div className="grid grid-cols-2 gap-2"><button disabled={busy || !image} onClick={() => void run('facebook')} className="share-action"><Facebook className="w-4 h-4" />Facebook</button><button disabled={busy || !image} onClick={() => void run('threads')} className="share-action"><Share2 className="w-4 h-4" />Threads</button><button disabled={busy || !image} onClick={() => void run('instagram')} className="share-action"><Download className="w-4 h-4" />Instagram</button><button disabled={busy} onClick={() => void run('copy')} className="share-action"><Copy className="w-4 h-4" />複製分享文字</button></div><button disabled={!image} onClick={() => download()} className="share-action w-full"><Download className="w-4 h-4" />下載分享圖片</button>{busy && <p className="text-center text-xs text-cyan-200"><Loader2 className="inline w-4 h-4 mr-1 animate-spin" />正在準備分享…</p>}{notice && <p role="status" className="text-center text-sm text-teal-200">{notice}</p>}</div></div>}</>;
}
