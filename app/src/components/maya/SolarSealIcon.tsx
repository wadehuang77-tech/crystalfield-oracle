import { useId } from 'react';
import type { MayaLocale } from '../../lib/maya';
import { solarSealVisual } from '../../lib/mayaVisualization';

// Original geometric placeholders, not reproductions of traditional Maya glyphs.
const paths = [
  'M20 44 32 20 52 18 44 34 28 34 36 48 52 44',
  'M16 24H44Q58 24 48 16M16 34H50M16 44H40Q54 44 44 52',
  'M44 14A22 22 0 1 0 50 48A24 24 0 0 1 44 14',
  'M32 50Q12 36 24 18Q44 12 48 30Q48 44 32 50M32 50V26',
  'M18 18Q50 12 42 28Q16 28 22 40Q50 40 44 50',
  'M16 46V30Q32 10 48 30V46M16 36H48M32 22V46',
  'M20 42V28M26 42V18M32 42V14M38 42V20M44 38V28M20 42Q32 56 44 38',
  'M32 12 38 26 52 32 38 38 32 52 26 38 12 32 26 26Z',
  'M32 12Q52 36 44 46Q32 56 20 46Q12 36 32 12Z',
  'M16 20 24 14 32 24 40 14 48 20V42L32 52 16 42ZM24 32H26M38 32H40',
  'M20 24Q10 12 16 12Q26 12 26 22M44 24Q54 12 48 12Q38 12 38 22M20 24Q32 16 44 24V40Q32 54 20 40Z',
  'M26 16H38V26L48 40H38V52H26V40H16L26 26Z',
  'M32 12V50M18 20 32 12 46 20M18 36 32 44 46 36',
  'M16 44 32 14 48 44ZM22 50H42M28 34H36',
  'M12 22 32 32 52 22 42 42 32 50 22 42ZM32 32V50',
  'M18 18H46V36L32 52 18 36ZM24 26H40M32 26V40',
  'M12 32H52M32 12V52M18 18 46 46M46 18 18 46',
  'M32 12 50 32 32 52 14 32ZM24 24 40 40M24 40 40 24',
  'M38 12 18 34H32L26 52 48 28H34Z',
  'M32 8V16M32 48V56M8 32H16M48 32H56M16 16 22 22M42 42 48 48M16 48 22 42M42 22 48 16',
];

export default function SolarSealIcon({ sealNumber, locale, size = 64, decorative = false }: {
  sealNumber: number; locale: MayaLocale; size?: number; decorative?: boolean;
}) {
  const seal = solarSealVisual(sealNumber);
  const titleId = useId();
  const label = locale === 'en' ? `${seal.nameEn} — modern geometric icon` : `${seal.nameZh}—現代幾何設計圖示`;
  return <svg width={size} height={size} viewBox="0 0 64 64" data-seal-id={seal.id}
    role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-labelledby={decorative ? undefined : titleId}
    fill="none" stroke={seal.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {!decorative && <title id={titleId}>{label}</title>}
    <circle cx="32" cy="32" r="29" strokeOpacity=".35" />
    <path d={paths[sealNumber - 1]} />
    {sealNumber === 20 && <circle cx="32" cy="32" r="12" />}
  </svg>;
}
