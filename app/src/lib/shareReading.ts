import { publicApi, shareApi } from './api';

export const PUBLIC_SITE_URL = 'https://www.crystalfield101.com/';

export interface ShareReadingCard {
  cardKey: string;
  name: string;
  position?: string;
}

export interface ShareReadingData {
  deckId: string;
  deckName: string;
  spreadName: string;
  cards: ShareReadingCard[];
  summary: string;
}

export type SharePlatform = 'facebook' | 'threads' | 'instagram' | 'copy';

function compactText(value: string, max = 180): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export function normalizeShareData(data: ShareReadingData): ShareReadingData {
  return {
    deckId: compactText(data.deckId, 60),
    deckName: compactText(data.deckName, 80),
    spreadName: compactText(data.spreadName, 80),
    summary: compactText(data.summary, 180) || '宇宙正在提醒我，答案一直都在自己的內心。',
    cards: data.cards.slice(0, 12).map((card) => ({
      cardKey: compactText(card.cardKey, 100),
      name: compactText(card.name, 80),
      position: card.position ? compactText(card.position, 40) : undefined,
    })).filter((card) => card.cardKey && card.name),
  };
}

export function buildShareText(input: ShareReadingData, resultUrl = PUBLIC_SITE_URL): string {
  const data = normalizeShareData(input);
  const cardLines = data.cards.map((card) => card.position ? `${card.position}：${card.name}` : card.name).join('\n');
  return `我剛完成了【${data.deckName}・${data.spreadName}】✨\n\n這次抽到：\n${cardLines}\n\n宇宙給我的訊息是：\n${data.summary}\n\n你也來看看塔羅牌想告訴你什麼：\n${resultUrl}\n\n#晶域心語 #塔羅占卜 #免費占卜 #韋德老師`;
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia('(max-width: 767px)').matches;
}

export function trackShareEvent(eventName: string, data: ShareReadingData, platform: SharePlatform, shareMethod: string): void {
  const params = {
    deck_name: data.deckName,
    spread_name: data.spreadName,
    platform,
    is_mobile: isMobileDevice(),
    share_method: shareMethod,
  };
  window.gtag?.('event', eventName, params);
  void publicApi.conversionEvent(eventName, params);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('copy unavailable');
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const characters = [...text];
  const lines: string[] = [];
  let line = '';
  for (const character of characters) {
    const next = line + character;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = character;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  const wasClipped = lines.join('').length < text.length;
  if (wasClipped && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[，。；、\s]+$/, '')}…`;
  lines.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function gridFor(count: number): { columns: number; rows: number } {
  if (count === 1) return { columns: 1, rows: 1 };
  if (count <= 3) return { columns: count, rows: 1 };
  if (count <= 8) return { columns: 4, rows: 2 };
  return { columns: 4, rows: 3 };
}

export async function createShareImage(input: ShareReadingData): Promise<Blob> {
  const data = normalizeShareData(input);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, '#12082f');
  background.addColorStop(0.52, '#261044');
  background.addColorStop(1, '#09162d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);

  for (let index = 0; index < 82; index += 1) {
    const x = (index * 137 + 47) % 1080;
    const y = (index * 251 + 83) % 1350;
    const radius = index % 9 === 0 ? 2.4 : 1.1;
    ctx.globalAlpha = 0.22 + (index % 5) * 0.1;
    ctx.fillStyle = index % 3 === 0 ? '#f7d98d' : '#dfd7ff';
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const panel = ctx.createLinearGradient(70, 80, 1010, 1260);
  panel.addColorStop(0, 'rgba(72,45,121,.86)');
  panel.addColorStop(1, 'rgba(15,22,53,.9)');
  roundedRect(ctx, 58, 58, 964, 1234, 42);
  ctx.fillStyle = panel; ctx.fill();
  ctx.strokeStyle = 'rgba(232,202,119,.65)'; ctx.lineWidth = 2; ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2d58d';
  ctx.font = '600 34px "Noto Serif TC", serif';
  ctx.fillText('✦ 晶域心語 ✦', 540, 130);
  ctx.fillStyle = '#fff7e2';
  ctx.font = '700 48px "Noto Serif TC", serif';
  ctx.fillText(data.deckName, 540, 200);
  ctx.fillStyle = '#d8c6fa';
  ctx.font = '500 30px "Noto Sans TC", sans-serif';
  ctx.fillText(data.spreadName, 540, 247);

  const grid = gridFor(data.cards.length);
  const areaX = 90;
  const areaY = 292;
  const areaWidth = 900;
  const areaHeight = data.cards.length <= 3 ? 520 : 610;
  const gap = data.cards.length <= 3 ? 30 : 18;
  const cardWidth = Math.min(230, (areaWidth - gap * (grid.columns - 1)) / grid.columns);
  const cardHeight = Math.min(350, (areaHeight - gap * (grid.rows - 1)) / grid.rows);
  const images = await Promise.all(data.cards.map((card) => loadImage(shareApi.cardImageUrl(data.deckId, card.cardKey))));

  data.cards.forEach((card, index) => {
    const row = Math.floor(index / grid.columns);
    const itemsInRow = Math.min(grid.columns, data.cards.length - row * grid.columns);
    const currentRowWidth = itemsInRow * cardWidth + (itemsInRow - 1) * gap;
    const rowStartX = areaX + (areaWidth - currentRowWidth) / 2;
    const column = index % grid.columns;
    const x = rowStartX + column * (cardWidth + gap);
    const y = areaY + row * (cardHeight + gap);
    roundedRect(ctx, x, y, cardWidth, cardHeight, 17);
    ctx.save(); ctx.clip();
    const image = images[index];
    if (image) {
      const scale = Math.max(cardWidth / image.width, cardHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, x + (cardWidth - width) / 2, y + (cardHeight - height) / 2, width, height);
      ctx.fillStyle = 'rgba(8,7,26,.38)'; ctx.fillRect(x, y + cardHeight - 70, cardWidth, 70);
    } else {
      const back = ctx.createLinearGradient(x, y, x + cardWidth, y + cardHeight);
      back.addColorStop(0, '#27144f'); back.addColorStop(1, '#0e2643');
      ctx.fillStyle = back; ctx.fillRect(x, y, cardWidth, cardHeight);
      ctx.fillStyle = '#e8ce86'; ctx.font = '40px serif'; ctx.textAlign = 'center';
      ctx.fillText('✧', x + cardWidth / 2, y + cardHeight / 2);
    }
    ctx.restore();
    roundedRect(ctx, x, y, cardWidth, cardHeight, 17);
    ctx.strokeStyle = 'rgba(242,211,128,.72)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff7e4';
    ctx.textAlign = 'center';
    ctx.font = `${data.cards.length > 8 ? 18 : 22}px "Noto Sans TC", sans-serif`;
    const label = card.position ? `${card.position}・${card.name}` : card.name;
    ctx.fillText(compactText(label, data.cards.length > 8 ? 13 : 18), x + cardWidth / 2, y + cardHeight - 24, cardWidth - 18);
  });

  const messageY = areaY + areaHeight + 52;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f2d58d';
  ctx.font = '600 25px "Noto Sans TC", sans-serif';
  ctx.fillText('宇宙給你的訊息', 105, messageY);
  ctx.fillStyle = '#f8f2ff';
  ctx.font = '28px "Noto Serif TC", serif';
  const usedHeight = drawWrappedText(ctx, data.summary, 105, messageY + 48, 870, 44, 4);
  ctx.fillStyle = '#bba9db';
  ctx.font = '22px "Noto Sans TC", sans-serif';
  ctx.fillText('免費占卜・www.crystalfield101.com', 105, Math.min(1250, messageY + 78 + usedHeight));

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('image encode failed')), 'image/jpeg', 0.9);
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
