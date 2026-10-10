import { useId, useState } from 'react';
import type { MayaLocale } from '../../lib/maya';
import { ORACLE_POSITIONS, type DreamspellOracle, type OraclePosition } from '../../lib/dreamspellOracle';
import SolarSealIcon from './SolarSealIcon';
import GalacticToneSymbol from './GalacticToneSymbol';

const labels = { destiny: ['中心命運', 'Destiny'], guide: ['引導', 'Guide'], analog: ['支持', 'Analog'], antipode: ['挑戰', 'Antipode'], occult: ['隱藏力量', 'Occult'] };
const coordinates = { destiny: [250, 180], guide: [250, 65], analog: [415, 180], antipode: [85, 180], occult: [250, 295] };
export default function DreamspellOracleCross({ oracle, locale }: { oracle: DreamspellOracle; locale: MayaLocale }) {
  const id = useId();
  const [selected, setSelected] = useState<OraclePosition>('destiny');
  const en = locale === 'en';
  const kin = oracle.positions[selected];
  return <section className="maya-cosmic-panel">
    <h2>{en ? 'Five-force oracle cross' : '五大神諭命運十字'}</h2>
    <p className="maya-caption">{en ? 'Program-verified configuration, not a prediction. Tab to a position, then press Enter / Space to inspect it.' : '程式驗證配置，不是命運預言。Tab 移至位置後，按 Enter／空白鍵查看。'}</p>
    <svg viewBox="0 0 500 380" role="group" aria-labelledby={`${id}-title`} className="maya-oracle-svg">
      <title id={`${id}-title`}>{en ? 'Interactive five-force oracle' : '可操作的五大神諭十字'}</title>
      <path d="M250 65V295M85 180H415" stroke="#d5b66f" strokeWidth="2" fill="none" />
      {ORACLE_POSITIONS.map(position => {
        const [x, y] = coordinates[position];
        const value = oracle.positions[position];
        const label = labels[position][en ? 1 : 0];
        return <g key={position} transform={`translate(${x} ${y})`} role="button" tabIndex={0}
          aria-pressed={position === selected} data-oracle-position={position}
          aria-label={`${label} · KIN ${value.kinNumber} · ${value.sealName} · ${value.toneName}`}
          onClick={() => setSelected(position)} onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(position); }
          }}>
          <circle r="47" fill={position === selected ? '#34295e' : '#0b1834'} stroke={position === selected ? '#fde68a' : '#7568a8'} strokeWidth="2" />
          <g transform="translate(-23 -32)"><SolarSealIcon sealNumber={value.sealNumber} locale={locale} size={46} decorative /></g>
          <text y="29" fill="#f1f5f9" textAnchor="middle" fontSize="18">{value.kinNumber}</text>
          <text y="64" fill="#fde68a" textAnchor="middle" fontSize="17">{label}</text>
        </g>;
      })}
    </svg>
    <div className="maya-matrix-detail" aria-live="polite" data-oracle-selected={selected}>
      <GalacticToneSymbol toneNumber={kin.toneNumber} locale={locale} size={48} />
      <p>{labels[selected][en ? 1 : 0]} · KIN {kin.kinNumber} · {kin.sealName} · {kin.toneNumber} {kin.toneName}</p>
    </div>
    <dl className="maya-pro-oracle-list">{ORACLE_POSITIONS.map(position => <div key={position}>
      <dt>{labels[position][en ? 1 : 0]}</dt><dd>KIN {oracle.positions[position].kinNumber} · {oracle.positions[position].sealName} · {oracle.positions[position].toneName}</dd>
    </div>)}</dl>
  </section>;
}
