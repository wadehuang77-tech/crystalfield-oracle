import type { MayaLocale } from '../../lib/maya';
import type { DreamspellWavespell } from '../../lib/dreamspellWavespell';
import SolarSealIcon from './SolarSealIcon';
import GalacticToneSymbol from './GalacticToneSymbol';

export default function DreamspellWavespellChart({ wavespell, locale }: { wavespell: DreamspellWavespell; locale: MayaLocale }) {
  const en = locale === 'en';
  return <section className="maya-cosmic-panel">
    <h2>{en ? 'Thirteen-stage wavespell journey' : '13 階段生命波符旅程'}</h2>
    <p>{en ? 'Wavespell' : '波符'} {wavespell.number} · KIN {wavespell.startKin}–{wavespell.endKin} · {en ? 'Birth position' : '出生位置'} {wavespell.position}/13</p>
    <p className="maya-caption">{en ? 'Calendar sequence, not a timeline of age or fortune. Keywords are existing editorial reflection labels. Scroll horizontally for every stage.' : '曆法分組，不是歲數或運勢時間表。關鍵字為既有編輯反思標籤；左右捲動查看所有階段。'}</p>
    <div className="maya-matrix-scroll">
      <ol className="maya-wavespell-stages">{wavespell.stages.map(stage => <li key={stage.kinNumber}
        data-wave-kin={stage.kinNumber} aria-current={stage.toneNumber === wavespell.position ? 'step' : undefined}>
        <span>{stage.toneNumber}/13</span>
        <SolarSealIcon sealNumber={stage.sealNumber} locale={locale} size={48} />
        <GalacticToneSymbol toneNumber={stage.toneNumber} locale={locale} size={40} />
        <strong>KIN {stage.kinNumber}</strong><p>{stage.sealName}</p><p>{stage.toneName}</p><p>{stage.growthKeyword}</p>
        {stage.toneNumber === wavespell.position && <small>{en ? 'Your birth KIN' : '你的出生 KIN'}</small>}
      </li>)}</ol>
    </div>
  </section>;
}
