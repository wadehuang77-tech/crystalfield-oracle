import { useId, useState } from 'react';
import { ORACLE_POSITIONS } from '../../lib/dreamspellOracle';
import { RELATIONSHIP_CHAPTERS, type RelationshipReport } from '../../lib/mayaRelationship';
import GalacticIdentityCard from './GalacticIdentityCard';
import TzolkinMatrix from './TzolkinMatrix';
import DreamspellOracleCross from './DreamspellOracleCross';
import DreamspellWavespellChart from './DreamspellWavespellChart';
import SolarSealIcon from './SolarSealIcon';
import './mayaVisualization.css';

export default function MayaRelationshipReportView({ report }: { report: RelationshipReport }) {
  const en = report.locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const [perspective, setPerspective] = useState<'a' | 'b' | 'shared'>('shared');
  const id = useId();
  const { a, b } = report.people;
  const oracleComparison = <section className="maya-cosmic-panel">
    <h2>{t('雙人五大神諭交互圖', 'Two-person oracle comparison')}</h2>
    <p>{t('連線僅對照同一位置，沒有新增合盤公式、相容分數或共同 KIN。', 'Lines compare matching positions only; there is no invented pair formula, compatibility score or shared KIN.')}</p>
    <svg viewBox="0 0 640 340" role="img" aria-labelledby={`${id}-oracle`} className="w-full">
      <title id={`${id}-oracle`}>{t('A 與 B 五個神諭位置對照', 'A and B: five matching oracle positions')}</title>
      {ORACLE_POSITIONS.map((position, i) => {
        const left = a.oracle.positions[position], right = b.oracle.positions[position];
        return <g key={position} transform={`translate(0 ${i * 60 + 25})`}>
          <path d="M190 18H450" stroke="#d5b66f" strokeWidth="2" />
          <text x="320" y="8" fill="#fde68a" textAnchor="middle" fontSize="14">{en ? position :
            ({ destiny: '中心', guide: '引導', analog: '支持', antipode: '挑戰', occult: '隱藏' })[position]}</text>
          <g transform="translate(35 0)"><SolarSealIcon sealNumber={left.sealNumber} locale={report.locale} size={36} decorative /></g>
          <text x="85" y="24" fill="#f1f5f9">A · KIN {left.kinNumber}</text>
          <g transform="translate(460 0)"><SolarSealIcon sealNumber={right.sealNumber} locale={report.locale} size={36} decorative /></g>
          <text x="510" y="24" fill="#f1f5f9">B · KIN {right.kinNumber}</text>
        </g>;
      })}
    </svg>
    <div className="grid gap-4 md:grid-cols-2"><DreamspellOracleCross oracle={a.oracle} locale={report.locale} />
      <DreamspellOracleCross oracle={b.oracle} locale={report.locale} /></div>
  </section>;
  const waveComparison = <section className="maya-cosmic-panel">
    <h2>{t('雙人 13 階段波符比較', 'Two-person thirteen-stage wavespell comparison')}</h2>
    <p>{t('曆法分組位置，不是個人年齡、未來運勢或關係發展時間表。', 'Calendar group positions, not ages, future fortune or a relationship timeline.')}</p>
    <div className="maya-matrix-scroll"><table className="w-full min-w-[600px]">
      <thead><tr><th>{t('階段', 'Stage')}</th><th>A</th><th>B</th></tr></thead>
      <tbody>{a.wavespell.stages.map((s, i) => <tr key={s.toneNumber}>
        <th>{s.toneNumber}</th><td>KIN {s.kinNumber} · {s.sealName}{i + 1 === a.wavespell.position ? ' · A' : ''}</td>
        <td>KIN {b.wavespell.stages[i].kinNumber} · {b.wavespell.stages[i].sealName}{i + 1 === b.wavespell.position ? ' · B' : ''}</td>
      </tr>)}</tbody>
    </table></div>
    <DreamspellWavespellChart wavespell={a.wavespell} locale={report.locale} />
    <DreamspellWavespellChart wavespell={b.wavespell} locale={report.locale} />
  </section>;
  return <div className="maya-visualization" data-relationship-report-version={report.reportVersion}>
    <p role="note">{t('AI 象徵反思，不是科學診斷或命運預言；數值由驗證引擎提供。重新閱讀不重新生成。', 'AI symbolic reflection, not scientific diagnosis or prediction. Values use the verified engine. Reading again does not regenerate.')}</p>
    <div className="grid gap-4 md:grid-cols-2">{[a, b].map((p, i) => <section key={i} aria-label={i === 0 ? 'A' : 'B'}>
      <h2>{i === 0 ? 'A' : 'B'}</h2><GalacticIdentityCard kin={p.kinNumber} birthDate={p.birthDate} locale={report.locale} />
    </section>)}</div>
    <TzolkinMatrix locale={report.locale} birthKin={a.kinNumber} partnerKin={b.kinNumber} />
    <nav className="maya-cosmic-panel flex flex-wrap gap-3" aria-label={t('章節快速導覽', 'Chapter navigation')}>
      {RELATIONSHIP_CHAPTERS.map((c, i) => <a key={c.id} href={`#${id}-${c.id}`}>{i + 1} · {en ? c.en : c.zh}</a>)}
    </nav>
    <div className="flex flex-wrap gap-3" role="group" aria-label={t('閱讀視角', 'Reading perspective')}>
      {(['a', 'b', 'shared'] as const).map(key => <button key={key} aria-pressed={perspective === key}
        className="rounded border border-cyan-300 px-4 py-2" onClick={() => setPerspective(key)}>
        {key === 'shared' ? t('共同關係視角', 'Shared perspective') : `${key.toUpperCase()} ${t('視角', 'perspective')}`}
      </button>)}
    </div>
    {report.sections.map((s, i) => <details key={s.id} id={`${id}-${s.id}`} className="maya-chapter">
      <summary>{i + 1} · {en ? RELATIONSHIP_CHAPTERS[i].en : RELATIONSHIP_CHAPTERS[i].zh}</summary>
      <div className="maya-chapter-content">
        <h3>{t('A · 星際依據', 'A · Verified evidence')}</h3>
        <p>A · KIN {a.kinNumber} · {a.oracle.positions.destiny.sealName} · {a.oracle.positions.destiny.toneName}</p>
        <p>B · KIN {b.kinNumber} · {b.oracle.positions.destiny.sealName} · {b.oracle.positions.destiny.toneName}</p>
        {i === 8 && oracleComparison}{i === 9 && waveComparison}
        <h3>{t('B · 深層解析', 'B · Interpretation')}</h3><p className="maya-prose">{s.interpretation}</p>
        <p className="maya-prose" aria-live="polite">{s.perspectives[perspective]}</p>
        <h3>{t('C · 人生情境', 'C · Life examples')}</h3><ul>{s.lifeExamples.map((v, j) => <li key={j}>{v}</li>)}</ul>
        <h3>{t('D · 靈魂提問', 'D · Reflection questions')}</h3><ul>{s.reflectionQuestions.map((v, j) => <li key={j}>{v}</li>)}</ul>
        <h3>{t('E · 行動建議', 'E · Action steps')}</h3><ol>{s.actionSteps.map((v, j) => <li key={j}>{v}</li>)}</ol>
      </div>
    </details>)}
    <section className="maya-cosmic-panel"><h2>{t('90 天雙人共振計畫', 'Ninety-day shared practice')}</h2>
      {report.ninetyDayPlan.map(s => <section key={s.id}><h3>{s.startDay}–{s.endDay} {t('天', 'days')}</h3>
        <ol>{s.actionSteps.map((v, i) => <li key={i}>{v}</li>)}</ol><ul>{s.reflectionQuestions.map((v, i) => <li key={i}>{v}</li>)}</ul>
      </section>)}
    </section>
  </div>;
}
