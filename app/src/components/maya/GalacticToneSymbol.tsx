import { useId } from 'react';
import type { MayaLocale } from '../../lib/maya';
import { galacticToneVisual } from '../../lib/mayaVisualization';

export default function GalacticToneSymbol({ toneNumber, locale, size = 64, decorative = false }: {
  toneNumber: number; locale: MayaLocale; size?: number; decorative?: boolean;
}) {
  const tone = galacticToneVisual(toneNumber, locale);
  const titleId = useId();
  const name = locale === 'en' ? tone.nameEn : tone.nameZh;
  return <svg width={size} height={size} viewBox="0 0 64 64" data-tone-number={toneNumber}
    role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-labelledby={decorative ? undefined : titleId}
    fill="currentColor" style={{ color: '#fde68a' }}>
    {!decorative && <title id={titleId}>{locale === 'en' ? `Tone ${toneNumber}: ${name}, ${tone.keywordLabel}` : `音調 ${toneNumber}：${name}，${tone.keywordLabel}`}</title>}
    {Array.from({ length: tone.dots }, (_, dot) => <circle key={`dot-${dot}`} data-tone-dot cx={32 + (dot - (tone.dots - 1) / 2) * 12} cy={24 - tone.bars * 3} r="4" />)}
    {Array.from({ length: tone.bars }, (_, bar) => <rect key={`bar-${bar}`} data-tone-bar x="10" y={28 + bar * 12} width="44" height="7" rx="3.5" />)}
  </svg>;
}
