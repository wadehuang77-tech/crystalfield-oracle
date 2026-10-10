import { useRef, useState } from 'react';
import { mayaSignature, type MayaLocale } from '../../lib/maya';
import { matrixNeighbor, solarSealVisual, TZOLKIN_ROWS } from '../../lib/mayaVisualization';
import SolarSealIcon from './SolarSealIcon';
import GalacticToneSymbol from './GalacticToneSymbol';

export default function TzolkinMatrix({ locale, birthKin, partnerKin, showGrid = true }: { locale: MayaLocale; birthKin?: number; partnerKin?: number; showGrid?: boolean }) {
  const en = locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const [selected, setSelected] = useState(birthKin ?? 1);
  const cells = useRef(new Map<number, HTMLButtonElement>());
  const signature = mayaSignature(selected, locale);
  return <section className="maya-cosmic-panel">
    <h2>{t('260 KIN 星際矩陣', '260 KIN galactic matrix')}</h2>
    {showGrid && <>
    <p className="maya-caption">{t('Dreamspell 現代循環矩陣：每欄由上至下，再向右。欄位不是音調。圖示為原創幾何設計，非傳統馬雅符號。', 'Modern Dreamspell cycle: read down each column, then right. Columns are not tones. Icons are original geometry, not traditional Maya glyphs.')}</p>
    <p className="maya-caption">{t('左右滑動查看全部欄位；方向鍵移動，Enter／空白鍵選取，Home／End 到列首／列尾。', 'Scroll horizontally for all columns. Arrow keys move; Enter / Space selects; Home / End moves to the first / last column.')}</p>
    <div className="maya-matrix-scroll">
      <div role="grid" aria-label={t('260 KIN 循環', '260 KIN cycle')} aria-rowcount={20} aria-colcount={13}>
        {TZOLKIN_ROWS.map((row, rowIndex) => <div role="row" aria-rowindex={rowIndex + 1} className="maya-matrix-row" key={rowIndex}>
          {row.map(({ kin, signature: value, column }) => {
            const seal = solarSealVisual(value.solar_seal_number);
            const name = en ? seal.nameEn : seal.nameZh;
            const tone = mayaSignature(kin, locale).galactic_tone;
            return <div role="gridcell" aria-selected={selected === kin} aria-colindex={column + 1} key={kin}>
              <button type="button" ref={node => { if (node) cells.current.set(kin, node); else cells.current.delete(kin); }}
                className={`maya-matrix-cell${kin === birthKin || kin === partnerKin ? ' maya-birth-cell' : ''}`}
                tabIndex={selected === kin ? 0 : -1} data-kin={kin} aria-current={kin === birthKin ? 'true' : undefined}
                aria-label={`KIN ${kin} · ${name} · ${t('音調', 'Tone')} ${value.tone_number} ${tone}${kin === birthKin ? ` · ${t('出生 KIN', 'Birth KIN')}` : ''}${kin === partnerKin ? ' · B' : ''}`}
                onClick={() => setSelected(kin)} onKeyDown={event => {
                  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const next = matrixNeighbor(kin, event.key);
                  setSelected(next); cells.current.get(next)?.focus();
                }}>
                <SolarSealIcon sealNumber={value.solar_seal_number} locale={locale} size={24} decorative />
                <span>{kin}{partnerKin !== undefined && kin === birthKin ? ' A' : ''}{kin === partnerKin ? ' B' : ''}</span>
              </button>
            </div>;
          })}
        </div>)}
      </div>
    </div>
    </>}
    <div className="maya-matrix-detail" aria-live="polite" aria-atomic="true" data-selected-kin={selected}>
      <SolarSealIcon sealNumber={signature.solar_seal_number} locale={locale} size={48} />
      <GalacticToneSymbol toneNumber={signature.tone_number} locale={locale} size={48} />
      <p><strong>KIN {selected}</strong> · {signature.solar_seal} · {t('音調', 'Tone')} {signature.tone_number} {signature.galactic_tone}
        {selected === birthKin && <span> · {t('你的出生 KIN', 'Your birth KIN')}</span>}</p>
    </div>
  </section>;
}
