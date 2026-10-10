import { useId, useRef, useState } from 'react';
import { getSolarTotemByKin, getToneByKin } from '../../lib/dreamspell';
import type { MayaLocale } from '../../lib/maya';
import { solarSealVisual } from '../../lib/mayaVisualization';
import SolarSealIcon from './SolarSealIcon';
import GalacticToneSymbol from './GalacticToneSymbol';

export default function GalacticIdentityCard({ kin, birthDate, locale }: { kin: number; birthDate: string; locale: MayaLocale }) {
  const seal = getSolarTotemByKin(kin);
  const tone = getToneByKin(kin);
  const color = solarSealVisual(seal.number).color;
  const id = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState('');
  const en = locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;

  async function download(format: 'svg' | 'png') {
    setError('');
    try {
      if (!svgRef.current) throw new Error('Card unavailable');
      const xml = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      let blob = svgBlob;
      if (format === 'png') {
        const url = URL.createObjectURL(svgBlob);
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 1200; canvas.height = 960;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas unavailable');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('PNG export failed')), 'image/png'));
        } finally { URL.revokeObjectURL(url); }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `dreamspell-kin-${kin}.${format}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      console.error('Dreamspell identity card export failed', cause);
      setError(t('下載失敗，請重試或改用 SVG。', 'Download failed. Please retry or use SVG.'));
    }
  }

  return <section className="maya-identity" aria-label={t('個人 KIN 星際身份卡', 'Personal galactic identity card')}>
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 480" role="img"
      aria-labelledby={`${id}-title ${id}-description`} className="maya-identity-svg">
      <title id={`${id}-title`}>{t('KIN 星際身份卡', 'Galactic identity card')} · KIN {kin}</title>
      <desc id={`${id}-description`}>{birthDate} · {en ? seal.nameEn : seal.nameZh} · {tone.number} {en ? tone.nameEn : tone.nameZh}. {t('原創幾何圖示；軌道僅為裝飾。', 'Original geometric icon; decorative orbits only.')}</desc>
      <defs>
        <linearGradient id={`${id}-bg`} x2="1" y2="1"><stop stopColor="#0b1834" /><stop offset=".6" stopColor="#25144e" /><stop offset="1" stopColor="#111c36" /></linearGradient>
        <radialGradient id={`${id}-glow`}><stop stopColor={color} stopOpacity=".2" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="600" height="480" rx="24" fill={`url(#${id}-bg)`} />
      <rect x="12" y="12" width="576" height="456" rx="18" fill="none" stroke="#d5b66f" strokeOpacity=".45" />
      <circle cx="300" cy="188" r="132" fill={`url(#${id}-glow)`} />
      <g fill="none" stroke="#d5b66f" strokeOpacity=".4">
        <circle cx="300" cy="188" r="98" /><ellipse cx="300" cy="188" rx="150" ry="54" transform="rotate(-25 300 188)" />
        <ellipse cx="300" cy="188" rx="150" ry="54" transform="rotate(25 300 188)" />
      </g>
      <g fill="#d5b66f"><circle cx="168" cy="120" r="3" /><circle cx="430" cy="254" r="3" /><circle cx="480" cy="100" r="2" /></g>
      <g transform="translate(252 140)"><SolarSealIcon sealNumber={seal.number} locale={locale} size={96} decorative /></g>
      <g transform="translate(272 250)"><GalacticToneSymbol toneNumber={tone.number} locale={locale} size={56} decorative /></g>
      <g fill="#f1f5f9" textAnchor="middle" fontFamily="system-ui, sans-serif">
        <text x="300" y="52" fontSize="16" letterSpacing="3">DREAMSPELL</text>
        <text x="300" y="106" fontSize="36" fontWeight="700">KIN {kin}</text>
        <text x="300" y="336" fontSize="25" fill={color}>{en ? seal.nameEn : `${seal.nameZh} · ${seal.nameEn}`}</text>
        <text x="300" y="373" fontSize="21">{t('銀河音調', 'Galactic tone')} {tone.number} · {en ? tone.nameEn : `${tone.nameZh} ${tone.nameEn}`}</text>
        <text x="300" y="409" fontSize="18">{t('出生日期', 'Birth date')} · {birthDate}</text>
        <text x="300" y="447" fontSize="13" fill="#cbd5e1">{t('現代幾何圖示 · 裝飾軌道非天文運行', 'Modern geometric icon · decorative orbits, not astronomy')}</text>
      </g>
    </svg>
    <div className="maya-downloads">
      <button type="button" onClick={() => void download('svg')}>{t('下載身份卡 SVG', 'Download card SVG')}</button>
      <button type="button" onClick={() => void download('png')}>{t('下載身份卡 PNG', 'Download card PNG')}</button>
    </div>
    <p className="maya-caption">{t('圖片包含出生日期。請自行確認分享範圍；不包含任何付費解讀。', 'The image includes your birth date. Share with care; no paid interpretation is included.')}</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
