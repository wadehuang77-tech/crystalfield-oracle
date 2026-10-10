import { useId, useRef } from 'react';
import { Orbit, Radio, Compass, Gem, Eclipse, Heart, Briefcase, Coins, Users, Timer, Leaf, CalendarDays } from 'lucide-react';
import type { MayaLocale } from '../../lib/maya';
import { adaptLifeBlueprint } from '../../lib/mayaBlueprintAdapter';
import { BLUEPRINT_CHAPTERS } from '../../lib/mayaLifeBlueprint';
import type { VersionedLifeBlueprintReport } from '../../lib/mayaLifeBlueprintStorage';

const icons = [Orbit, Radio, Compass, Gem, Eclipse, Heart, Briefcase, Coins, Users, Timer, Leaf, CalendarDays];
const shortZh = ['星際靈魂身份', '銀河音調', '生命使命', '隱藏天賦', '內在陰影', '愛情關係', '事業天賦', '金錢模式', '人際支持', '生命節奏', '自我療癒', '90 天實踐計畫'];

export default function LifeBlueprintNavigator({ report, locale }: { report: VersionedLifeBlueprintReport | null; locale: MayaLocale }) {
  const en = locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const prefix = useId();
  const details = useRef(new Map<string, HTMLDetailsElement>());
  const display = adaptLifeBlueprint(report, locale);
  return <section className="maya-cosmic-panel maya-blueprint" aria-label={t('完整生命藍圖十二篇導覽', 'Twelve-chapter life blueprint navigator')}>
    <h2>{t('星際生命藍圖 · 十二篇', 'Galactic life blueprint · twelve chapters')}</h2>
    <p className="maya-caption">{t('僅閱讀後端已授權的既有內容；展開、導覽與下載身份卡不會生成 AI 報告。', 'Read existing server-authorized content only. Navigation and identity-card downloads do not generate AI reports.')}</p>
    {display.kind === 'invalid' && <p role="alert">{t('報告版本或語言不相容，無法顯示。請返回歷史報告選擇對應語言。', 'The report version or language is incompatible. Choose the matching language in report history.')}</p>}
    {display.kind === 'empty' && <p className="maya-empty">{t('尚無可閱讀的完整生命藍圖。請登入並從歷史報告開啟已授權的 NT$499 報告；此處不會自動生成內容。', 'No Full Life Blueprint is available to read. Sign in and open an authorized NT$499 report from history. Nothing is generated automatically here.')}</p>}
    {display.kind === 'legacy' && <div className="maya-legacy">
      <h3>{t('既有報告 · 舊版七篇', 'Existing report · legacy seven chapters')}</h3>
      <p className="maya-caption">{t('舊內容原樣保留，不推測映射到十二篇。新版後端生成與儲存尚未整合。', 'Existing content is preserved without guessing a twelve-chapter mapping. V2 backend generation and storage are not integrated yet.')}</p>
      <p>KIN {display.report.signature.kin_number} · {display.report.signature.solar_seal} · {display.report.signature.galactic_tone}</p>
      {display.report.model_name === 'mock-dreamspell-ai' && <p>{t('Mock 測試內容，不是付費 AI 驗收結果。', 'Mock test content, not a paid AI acceptance result.')}</p>}
      {display.report.sections.map((section, index) => <details key={index} className="maya-chapter">
        <summary>{section.heading}</summary><p className="maya-prose">{section.body}</p>
      </details>)}
      <p className="maya-caption">{display.report.model_name} · {display.report.prompt_version} · {t('費用', 'Cost')}: NT${display.report.usage.cost_twd}</p>
    </div>}
    <nav aria-label={t('章節快速導覽', 'Quick chapter navigation')} className="maya-chapter-nav">
      {BLUEPRINT_CHAPTERS.map((chapter, index) => {
        const Icon = icons[index];
        return <button type="button" key={chapter.id} onClick={() => {
          const element = details.current.get(chapter.id);
          if (!element) return;
          element.open = true;
          element.querySelector('summary')?.focus();
          element.scrollIntoView({ block: 'start' });
        }}><Icon size={18} aria-hidden="true" /><span>{String(index + 1).padStart(2, '0')} {en ? chapter.en : shortZh[index]}</span></button>;
      })}
    </nav>
    {BLUEPRINT_CHAPTERS.map((chapter, index) => {
      const Icon = icons[index];
      const section = display.kind === 'v2' ? display.report.sections[index] : null;
      const plan = chapter.id === 'ninety-day-practice' && display.kind === 'v2' ? display.report.ninetyDayPlan : null;
      return <details key={chapter.id} id={`${prefix}-${chapter.id}`} data-chapter-id={chapter.id} className="maya-chapter"
        ref={node => { if (node) details.current.set(chapter.id, node); else details.current.delete(chapter.id); }}>
        <summary><Icon size={22} aria-hidden="true" /><span>{String(index + 1).padStart(2, '0')} · {en ? chapter.en : chapter.zh}</span></summary>
        {section ? <div className="maya-chapter-content">
          <h3>{t('A · 星際依據（程式計算）', 'A · Evidence (program-calculated)')}</h3>
          <p>KIN {section.evidence.kinNumber} · {section.evidence.solarSeal.name} · {section.evidence.galacticTone.name} · {section.evidence.calculationVersion}</p>
          <h3>{t('B · 深層解析（象徵反思）', 'B · Interpretation (symbolic reflection)')}</h3><p className="maya-prose">{section.interpretation}</p>
          <h3>{t('C · 人生情境', 'C · Life examples')}</h3><ul>{section.lifeExamples.map((text, i) => <li key={i}>{text}</li>)}</ul>
          <h3>{t('D · 靈魂提問', 'D · Reflection questions')}</h3><ol>{section.reflectionQuestions.map((text, i) => <li key={i}>{text}</li>)}</ol>
          <h3>{t('E · 實踐建議', 'E · Action steps')}</h3><ol>{section.actionSteps.map((text, i) => <li key={i}>{text}</li>)}</ol>
          {plan && <div className="maya-plan">{plan.map((stage, stageIndex) => <article key={stage.id}>
            <h3>{t(`第 ${stage.startDay}～${stage.endDay} 天`, `Days ${stage.startDay}–${stage.endDay}`)} · {en ? ['Awareness', 'Action and adjustment', 'Integration'][stageIndex] : ['自我覺察', '行動與調整', '整合與實踐'][stageIndex]}</h3>
            <h4>{t('行動', 'Actions')}</h4><ol>{stage.actionSteps.map((text, i) => <li key={i}>{text}</li>)}</ol>
            <h4>{t('反思', 'Reflection')}</h4><ol>{stage.reflectionQuestions.map((text, i) => <li key={i}>{text}</li>)}</ol>
          </article>)}</div>}
        </div> : <p className="maya-empty">{t('此篇尚無已授權的新版內容。不會以展示文字取代付費解讀。', 'No authorized v2 content is available for this chapter. Display text never substitutes for a paid interpretation.')}</p>}
      </details>;
    })}
    <p className="maya-caption">{t('未支援：五大神諭、波符／城堡解讀、個人運勢週期及閏日出生解讀。', 'Unsupported: oracle, wavespell / castle interpretation, personal fortune cycles and leap-day birth interpretation.')}</p>
  </section>;
}
