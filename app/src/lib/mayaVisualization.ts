import { DREAMSPELL_SOLAR_TOTEMS, DREAMSPELL_TONES } from './dreamspell';
import { mayaSignature, type MayaLocale } from './maya';

export const SEAL_COLORS = ['#fb7185', '#e2e8f0', '#60a5fa', '#facc15'] as const;
const toneKeywordsZh = ['啟動', '流動', '火花', '穩定', '平衡', '律動', '對齊', '擴展', '照亮', '結構', '同步', '清晰', '完成'];

export function solarSealVisual(number: number) {
  const seal = DREAMSPELL_SOLAR_TOTEMS.find(item => item.number === number);
  if (!seal) throw new Error('Invalid solar seal number');
  return { ...seal, id: `solar-seal-${number}`, color: SEAL_COLORS[(number - 1) % 4] };
}

export function galacticToneVisual(number: number, locale: MayaLocale) {
  const tone = DREAMSPELL_TONES.find(item => item.number === number);
  if (!tone) throw new Error('Invalid galactic tone number');
  return { ...tone, dots: number % 5, bars: Math.floor(number / 5), keywordLabel: locale === 'en' ? tone.keyword : toneKeywordsZh[number - 1] };
}

// Law of Time's Harmonic Module reads down each 20-cell column, then to the right.
// Columns are not tones: each cell's tone comes from the existing KIN engine.
export const TZOLKIN_ROWS = Array.from({ length: 20 }, (_, row) =>
  Array.from({ length: 13 }, (_, column) => {
    const kin = column * 20 + row + 1;
    return { row, column, kin, signature: mayaSignature(kin, 'en') };
  }));

export function matrixNeighbor(kin: number, key: string): number {
  if (!Number.isInteger(kin) || kin < 1 || kin > 260) throw new Error('Invalid KIN');
  const row = (kin - 1) % 20;
  const column = Math.floor((kin - 1) / 20);
  switch (key) {
    case 'ArrowUp': return column * 20 + Math.max(0, row - 1) + 1;
    case 'ArrowDown': return column * 20 + Math.min(19, row + 1) + 1;
    case 'ArrowLeft': return Math.max(0, column - 1) * 20 + row + 1;
    case 'ArrowRight': return Math.min(12, column + 1) * 20 + row + 1;
    case 'Home': return row + 1;
    case 'End': return 240 + row + 1;
    default: return kin;
  }
}
