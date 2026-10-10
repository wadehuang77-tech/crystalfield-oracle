import { useState } from 'react';
import { DREAMSPELL_SOLAR_TOTEMS, DREAMSPELL_TONES } from '../../lib/dreamspell';
import { isMayaDate, mayaForDate, taipeiDate, type MayaLocale, type MayaProfile } from '../../lib/maya';
import { galacticToneVisual } from '../../lib/mayaVisualization';
import GalacticIdentityCard from './GalacticIdentityCard';
import GalacticToneSymbol from './GalacticToneSymbol';
import SolarSealIcon from './SolarSealIcon';
import TzolkinMatrix from './TzolkinMatrix';
import './mayaVisualization.css';

export default function MayaVisualization({ locale, profile, publicPage, showMatrixGrid = true }: { locale: MayaLocale; profile?: MayaProfile; publicPage: boolean; showMatrixGrid?: boolean }) {
  const en = locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const [birthDate, setBirthDate] = useState('');
  const [calculated, setCalculated] = useState<{ kin: number; date: string } | null>(null);
  const [error, setError] = useState('');
  const identity = publicPage ? calculated : profile ? { kin: profile.kin_number, date: profile.birth_date } : null;
  return <div className="maya-visualization">
    {publicPage && <section className="maya-cosmic-panel">
      <p className="maya-eyebrow">KIN · 260</p>
      <h2>{t('探索你的星際身份', 'Explore your galactic identity')}</h2>
      <p>{t('使用已驗證的 Dreamspell 引擎在瀏覽器計算；生日不傳送、不儲存。這不是付費解讀。', 'Calculate with the verified Dreamspell engine in your browser. Your date is not sent or saved. This is not a paid interpretation.')}</p>
      <form className="maya-free-form" onSubmit={event => {
        event.preventDefault(); setError('');
        if (!isMayaDate(birthDate)) {
          setCalculated(null); setError(t('請輸入 1900 年起至今天的有效日期。', 'Enter a valid date from 1900 through today.')); return;
        }
        if (birthDate.slice(5) === '02-29') {
          setCalculated(null); setError(t('2 月 29 日出生印記尚未支援；不會猜測結果。', 'February 29 birth signatures are unsupported. No result will be guessed.')); return;
        }
        setCalculated({ kin: mayaForDate(birthDate, locale).kin_number, date: birthDate });
      }}>
        <label>{t('出生日期（僅本地計算）', 'Birth date (local calculation only)')}<input type="date" min="1900-01-01" max={taipeiDate()} required value={birthDate} onChange={event => setBirthDate(event.target.value)} /></label>
        <button type="submit">{t('免費查詢我的 KIN', 'Find My KIN for Free')}</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>}
    {identity && <GalacticIdentityCard kin={identity.kin} birthDate={identity.date} locale={locale} />}
    {publicPage && <details className="maya-cosmic-panel maya-symbol-library">
      <summary>{t('探索 20 太陽圖騰與 13 銀河音調', 'Explore 20 solar seals and 13 galactic tones')}</summary>
      <h2>{t('20 太陽圖騰', '20 solar seals')}</h2>
      <p className="maya-caption">{t('全部圖示為原創現代幾何設計，不是傳統馬雅符號。', 'All icons are original modern geometric designs, not traditional Maya glyphs.')}</p>
      <ol className="maya-symbol-grid">{DREAMSPELL_SOLAR_TOTEMS.map(seal => <li key={seal.number}>
        <SolarSealIcon sealNumber={seal.number} locale={locale} />
        <p>{seal.number} · {en ? seal.nameEn : seal.nameZh}</p>{!en && <small>{seal.nameEn}</small>}
      </li>)}</ol>
      <h2>{t('13 銀河音調', '13 galactic tones')}</h2>
      <p className="maya-caption">{t('點代表 1、橫線代表 5。關鍵字沿用現有資料，僅作反思標籤，不是心理診斷。', 'A dot represents 1; a bar represents 5. Keywords retain existing editorial data as reflection labels, not psychological diagnoses.')}</p>
      <ol className="maya-symbol-grid">{DREAMSPELL_TONES.map(tone => <li key={tone.number}>
        <GalacticToneSymbol toneNumber={tone.number} locale={locale} />
        <p>{tone.number} · {en ? tone.nameEn : tone.nameZh}</p>{!en && <small>{tone.nameEn}</small>}
        <p>{galacticToneVisual(tone.number, locale).keywordLabel}</p>
      </li>)}</ol>
    </details>}
    <TzolkinMatrix key={`${locale}:${identity?.kin ?? 'public'}`} locale={locale} birthKin={identity?.kin} showGrid={showMatrixGrid} />
  </div>;
}
