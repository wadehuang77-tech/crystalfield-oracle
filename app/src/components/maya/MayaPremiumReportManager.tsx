import { useEffect, useRef, useState } from 'react';
import { mayaApi, mayaPremiumApi, type PremiumReportResult } from '../../lib/api';
import type { MayaLocale, MayaProfile } from '../../lib/maya';
import { MAYA_PRO_PRODUCT, validateMayaProReport } from '../../lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT, RELATIONSHIP_TYPES, validateRelationshipReport, type RelationshipType } from '../../lib/mayaRelationship';
import MayaProReportView from './MayaProReportView';
import MayaRelationshipReportView from './MayaRelationshipReportView';

export default function MayaPremiumReportManager({ kind, locale, userId, accessId, selectedId }: {
  kind: 'pro' | 'relationship'; locale: MayaLocale; userId: string; accessId: string | null; selectedId?: string;
}) {
  const en = locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const [profiles, setProfiles] = useState<MayaProfile[]>([]);
  const [a, setA] = useState(''), [b, setB] = useState('');
  const [dateA, setDateA] = useState(''), [dateB, setDateB] = useState('');
  const [relation, setRelation] = useState<RelationshipType>('partners');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<PremiumReportResult | null>(null);
  const [reports, setReports] = useState<Array<{ id: string; status: string }>>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    setProfiles([]); setResult(null); setReports([]); setError(''); setBusy(false); setA(''); setB(''); setConsent(false);
    if (accessId) {
      Promise.all([mayaApi.profiles(locale, controller.signal), mayaPremiumApi.reports(kind, locale, controller.signal),
        selectedId ? mayaPremiumApi.report(kind, selectedId, locale, controller.signal) : Promise.resolve(null)]).then(([p, list, report]) => {
        if (controller.signal.aborted) return;
        setProfiles(p.profiles); setReports(list.reports); setResult(report);
        setA(p.profiles.find(v => v.role === 'personal')?.id ?? '');
        setB(p.profiles.find(v => v.role === 'relationship')?.id ?? '');
      }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : en ? 'Unable to read reports.' : '無法讀取報告。'); });
    }
    return () => { controller.abort(); if (active.current === controller) active.current = null; };
  }, [accessId, userId, locale, kind, selectedId, en]);
  async function run(operation: (signal: AbortSignal) => Promise<void>) {
    const controller = active.current;
    if (!controller || controller.signal.aborted || busy) return;
    setBusy(true); setError('');
    try { await operation(controller.signal); }
    catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : t('報告請求失敗。', 'Report request failed.')); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function generate(signal: AbortSignal) {
    if (!accessId) return;
    let current = result?.status === 'processing' ? result : await mayaPremiumApi.create(kind, {
      profile_id: a, entitlement_id: accessId, locale,
      product_code: kind === 'pro' ? MAYA_PRO_PRODUCT.code : MAYA_RELATIONSHIP_PRODUCT.code,
      ...(kind === 'relationship' ? { relationship_profile_id: b, relationship_type: relation, consent } : {}),
    }, signal);
    if (signal.aborted) return;
    setResult(current);
    // Explicit generation only; reading and page loading never advance an AI job.
    for (let i = 0; i < (kind === 'pro' ? 45 : 36) && current.status === 'processing' && !signal.aborted; i++) {
      current = await mayaPremiumApi.advance(kind, current.id, locale, signal);
      if (!signal.aborted) setResult(current);
    }
    if (!signal.aborted) setReports((await mayaPremiumApi.reports(kind, locale, signal)).reports);
  }
  const report = result?.report;
  const validPro = report?.productCode === MAYA_PRO_PRODUCT.code && validateMayaProReport(report, report.kinNumber, locale) && report.provider === 'openai';
  const validPair = report?.productCode === MAYA_RELATIONSHIP_PRODUCT.code && validateRelationshipReport(report) && report.locale === locale;
  return <section className="space-y-5" data-premium-report-manager={kind}>
    {!accessId ? <p>{t('需本人有效商品權限才能生成或讀取完整報告。', 'Active, owned product access is required to generate or read a full report.')}</p> : <>
      {!report && <section className="maya-cosmic-panel space-y-4">
        <h2>{t('報告出生資料', 'Birth data for this report')}</h2>
        <p>{t('同一訂單與語言固定綁定出生資料及關係類型。成功後儲存，再次閱讀不生成或扣款。', 'Each order and language is bound to its birth data and relationship type. Successful reports are saved; reading again does not generate or charge.')}</p>
        {(['personal', ...(kind === 'relationship' ? ['relationship'] : [])] as const).map(role => <div key={role} className="space-y-2">
          <label className="block">{role === 'personal' ? 'A' : 'B'} · {t('既有出生資料', 'Saved birth data')}
            <select className="ml-2 bg-slate-900 p-2" value={role === 'personal' ? a : b} disabled={busy || !!result}
              onChange={e => role === 'personal' ? setA(e.target.value) : setB(e.target.value)}>
              <option value="">{t('選擇資料', 'Select a profile')}</option>
              {profiles.filter(p => p.role === role).map(p => <option key={p.id} value={p.id}>{p.birth_date} · KIN {p.kin_number}</option>)}
            </select>
          </label>
          <label>{t('新增生日', 'Add birth date')} <input className="bg-slate-900 p-2" type="date" disabled={busy || !!result}
            value={role === 'personal' ? dateA : dateB} onChange={e => role === 'personal' ? setDateA(e.target.value) : setDateB(e.target.value)} /></label>
          <button className="ml-3 underline" disabled={busy || !!result || !(role === 'personal' ? dateA : dateB) || kind === 'relationship' && !consent}
            onClick={() => run(async signal => {
              const saved = await mayaApi.calculate(role === 'personal' ? dateA : dateB, locale, role === 'personal' ? 'personal' : 'relationship');
              if (signal.aborted) return;
              setProfiles(p => [saved.profile, ...p.filter(v => v.id !== saved.profile.id)]);
              if (role === 'personal') setA(saved.profile.id); else setB(saved.profile.id);
            })}>{t('儲存出生資料', 'Save birth data')}</button>
        </div>)}
        {kind === 'relationship' && <>
          <label className="block">{t('關係類型', 'Relationship type')} <select className="bg-slate-900 p-2" disabled={busy || !!result}
            value={relation} onChange={e => setRelation(e.target.value as RelationshipType)}>
            {RELATIONSHIP_TYPES.map((v, i) => <option key={v} value={v}>{en ? ['Partners', 'Friends', 'Family', 'Colleagues'][i] : ['伴侶', '朋友', '家人', '同事'][i]}</option>)}
          </select></label>
          <label className="flex gap-3"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            {t('已取得另一人的同意，允許儲存生日與生成雙人反思報告。', 'I have the other person’s consent to store their birth date and generate this shared reflection report.')}</label>
        </>}
        <button className="rounded bg-cyan-300 px-4 py-3 text-slate-950 disabled:opacity-50"
          disabled={busy || !a || kind === 'relationship' && (!b || !consent) || result?.status === 'blocked'}
          onClick={() => run(generate)}>{busy ? t('生成中…', 'Generating...') : result?.status === 'processing' ? t('繼續生成', 'Continue generation') : t('生成正式報告（不重新付款）', 'Generate live report (no additional payment)')}</button>
      </section>}
      {result && <p role="status">{result.completedSections}/{result.totalSections} · {result.status}
        {result.reason && ` · ${result.reason}`}</p>}
      <nav className="flex flex-wrap gap-3" aria-label={t('報告歷史', 'Report history')}>{reports.map(r => <button key={r.id} disabled={busy}
        className="underline" onClick={() => run(async signal => { const saved = await mayaPremiumApi.report(kind, r.id, locale, signal); if (!signal.aborted) setResult(saved); })}>
        {t('已儲存報告', 'Saved report')} · {r.status}
      </button>)}</nav>
    </>}
    {error && <p role="alert">{error}</p>}
    {report && !validPro && !validPair && <p role="alert">{t('報告格式或依據不符，不顯示內容。', 'Invalid report format or evidence; content is not displayed.')}</p>}
    {validPro && report?.productCode === MAYA_PRO_PRODUCT.code && <MayaProReportView report={report} />}
    {validPair && report?.productCode === MAYA_RELATIONSHIP_PRODUCT.code && <MayaRelationshipReportView report={report} />}
  </section>;
}
