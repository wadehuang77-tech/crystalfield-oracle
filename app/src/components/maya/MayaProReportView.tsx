import { PRO_CHAPTERS, type MayaProReport } from '../../lib/mayaPro';
import GalacticIdentityCard from './GalacticIdentityCard';
import TzolkinMatrix from './TzolkinMatrix';
import LifeBlueprintNavigator from './LifeBlueprintNavigator';
import DreamspellOracleCross from './DreamspellOracleCross';
import DreamspellWavespellChart from './DreamspellWavespellChart';
import './mayaVisualization.css';

export default function MayaProReportView({ report }: { report: MayaProReport }) {
  const en = report.locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  return <div className="maya-visualization" data-pro-report-version={report.reportVersion}>
    <p role="status">{report.provider === 'mock-local'
      ? t('本地 Mock 展示報告，非正式付費 AI 驗收。命盤數值由已驗證引擎計算。', 'Local Mock report, not a paid AI acceptance result. Configuration values use the verified engine.')
      : t('AI 象徵反思報告，不是科學診斷或命運預言。命盤數值由已驗證引擎計算；重新閱讀不呼叫 AI。', 'AI symbolic reflection, not scientific diagnosis or prediction. Configuration values use the verified engine; reading again does not call AI.')}</p>
    <section data-pro-part="b" aria-label={t('PART B 星際視覺化', 'PART B Galactic visualization')}>
      <GalacticIdentityCard kin={report.kinNumber} birthDate={report.parts.b.birthDate} locale={report.locale} />
      <TzolkinMatrix locale={report.locale} birthKin={report.kinNumber} />
    </section>
    <section data-pro-part="c" className="maya-pro-part">
      <DreamspellOracleCross oracle={report.parts.c.oracle} locale={report.locale} />
      <DreamspellWavespellChart wavespell={report.parts.c.wavespell} locale={report.locale} />
    </section>
    <section data-pro-part="a">
      <p className="maya-caption">{t('PART A 保留十二篇 KIN／圖騰／音調依據；神諭與波符另於 PART C／D 使用驗證資料。子文件不授予 NT$499 商品權限。', 'PART A retains KIN / seal / tone evidence. Verified oracle and wavespell evidence is used separately in PART C / D. This subdocument grants no NT$499 entitlement.')}</p>
      <LifeBlueprintNavigator report={report.parts.a.blueprint} locale={report.locale} />
    </section>
    <section className="maya-cosmic-panel" data-pro-part="d">
      <h2>{t('PART D · 星際靈魂使命整合', 'PART D · Soul mission integration')}</h2>
      {report.parts.d.sections.map((section, index) => <details key={section.id} className="maya-chapter" data-pro-chapter={section.id}>
        <summary>{index + 13} · {en ? PRO_CHAPTERS[index].en : PRO_CHAPTERS[index].zh}</summary>
        <div className="maya-chapter-content">
          <h3>{t('A · 已驗證依據', 'A · Verified evidence')}</h3>
          <p>KIN {report.kinNumber} · {section.evidence.oracle.ruleVersion} · {section.evidence.wavespell.ruleVersion}</p>
          <ul>{Object.entries(section.evidence.oracle.positions).map(([position, value]) => <li key={position}>{en ? position : ({ destiny: '中心命運', guide: '引導', analog: '支持', antipode: '挑戰', occult: '隱藏力量' })[position as keyof typeof section.evidence.oracle.positions]} · KIN {value.kinNumber} · {value.sealName} · {value.toneName}</li>)}</ul>
          <p>{t('波符', 'Wavespell')} {section.evidence.wavespell.number} · {t('位置', 'Position')} {section.evidence.wavespell.position}/13</p>
          <h3>{t('B · 深層解析', 'B · Interpretation')}</h3><p className="maya-prose">{section.interpretation}</p>
          <h3>{t('C · 人生情境', 'C · Life examples')}</h3><ul>{section.lifeExamples.map((text, i) => <li key={i}>{text}</li>)}</ul>
          <h3>{t('D · 靈魂提問', 'D · Reflection questions')}</h3><ul>{section.reflectionQuestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
          <h3>{t('E · 行動建議', 'E · Action steps')}</h3><ol>{section.actionSteps.map((text, i) => <li key={i}>{text}</li>)}</ol>
        </div>
      </details>)}
    </section>
  </div>;
}
