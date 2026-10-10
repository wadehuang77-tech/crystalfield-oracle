import { useCallback, useEffect, useRef, useState } from 'react';
import { mayaApi, mayaPremiumApi, type PremiumReportResult } from '../../lib/api';
import type { MayaLocale, MayaProfile } from '../../lib/maya';
import { MAYA_PRO_PRODUCT, validateMayaProReport } from '../../lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT, RELATIONSHIP_TYPES, validateRelationshipReport, type RelationshipType } from '../../lib/mayaRelationship';
import MayaProReportView from './MayaProReportView';
import MayaRelationshipReportView from './MayaRelationshipReportView';
import { submitMayaCheckout, validateMayaCheckoutForm } from '../../lib/mayaCheckout';
import { readMayaUnlockIntent, saveMayaUnlockIntent } from '../../lib/mayaUnlock';
import useMayaPaymentReturn from '../../hooks/useMayaPaymentReturn';

export default function MayaPremiumReportManager({ kind, locale, userId, accessId, selectedId, returnedOrder = null, complimentary = false, payment = true }: {
  kind: 'pro' | 'relationship'; locale: MayaLocale; userId: string; accessId: string | null; selectedId?: string;
  returnedOrder?: string | null; complimentary?: boolean; payment?: boolean;
}) {
  const en = locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const product = kind === 'pro' ? MAYA_PRO_PRODUCT : MAYA_RELATIONSHIP_PRODUCT;
  const paidReturn = useMayaPaymentReturn(userId, locale, returnedOrder, product.code);
  const grant = returnedOrder ? paidReturn?.accessId ?? null : accessId;
  const [profiles, setProfiles] = useState<MayaProfile[]>([]);
  const [a, setA] = useState(''), [b, setB] = useState('');
  const [dateA, setDateA] = useState(''), [dateB, setDateB] = useState('');
  const [relation, setRelation] = useState<RelationshipType>('partners');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<PremiumReportResult | null>(null);
  const [reports, setReports] = useState<Array<{ id: string; status: string }>>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const loadIdentity = JSON.stringify([grant, userId, locale, kind, selectedId, returnedOrder]);
  const [loadedFor, setLoadedFor] = useState('');
  const loaded = loadedFor === loadIdentity;
  const active = useRef<AbortController | null>(null);
  const running = useRef(false);
  const checkoutKey = useRef<string | null>(null);
  const autoAttempt = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    setProfiles([]); setResult(null); setReports([]); setError(''); setBusy(false); setA(''); setB(''); setConsent(false); setLoadedFor('');
    running.current = false;
    Promise.all([mayaApi.profiles(locale, controller.signal), grant ? mayaPremiumApi.reports(kind, locale, controller.signal) : Promise.resolve({ reports: [] }),
        grant && selectedId ? mayaPremiumApi.report(kind, selectedId, locale, controller.signal) : Promise.resolve(null)]).then(async ([p, list, report]) => {
        if (controller.signal.aborted) return;
        const intent = returnedOrder ? readMayaUnlockIntent(userId, locale, returnedOrder, product.code) : null;
        if (grant && intent?.phase === 'waiting' && (!p.profiles.some(v => v.id === intent.profileId && v.role === 'personal' && v.birth_date === intent.profileBirthDate)
          || kind === 'relationship' && !p.profiles.some(v => v.id === intent.partnerId && v.role === 'relationship' && v.birth_date === intent.partnerBirthDate))) {
          saveMayaUnlockIntent({ ...intent, phase: 'started' });
          setError(en ? 'The birth data changed after checkout. Review your data before generating; do not pay again.' : '付款前後的出生資料已變更，請先確認資料再生成，勿重複付款。');
        }
        const saved = grant && intent?.reportId && !selectedId ? await mayaPremiumApi.report(kind, intent.reportId, locale, controller.signal) : report;
        if (controller.signal.aborted) return;
        setProfiles(p.profiles); setReports(list.reports); setResult(saved);
        setA(intent?.profileId ?? p.profiles.find(v => v.role === 'personal')?.id ?? '');
        setB(intent?.partnerId ?? p.profiles.find(v => v.role === 'relationship')?.id ?? '');
        if (intent) { setRelation(intent.relationshipType ?? 'partners'); setConsent(intent.consent === true); }
        setLoadedFor(loadIdentity);
      }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : en ? 'Unable to read reports.' : '無法讀取報告。'); });
    return () => { controller.abort(); if (active.current === controller) active.current = null; };
  }, [grant, userId, locale, kind, selectedId, en, returnedOrder, product.code, loadIdentity]);
  const run = useCallback(async (operation: (signal: AbortSignal) => Promise<void>) => {
    const controller = active.current;
    if (!controller || controller.signal.aborted || running.current) return;
    running.current = true;
    setBusy(true); setError('');
    try { await operation(controller.signal); }
    catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : en ? 'Report request failed.' : '報告請求失敗。'); }
    finally { if (!controller.signal.aborted) { running.current = false; setBusy(false); } }
  }, [en]);
  const generate = useCallback(async (signal: AbortSignal) => {
    if (!grant) throw new Error(en ? 'Verified product access is required.' : '需要已驗證的商品權限。');
    let current = result?.status === 'processing' ? result : await mayaPremiumApi.create(kind, {
      profile_id: a, entitlement_id: grant, locale, product_code: product.code,
      ...(kind === 'relationship' ? { relationship_profile_id: b, relationship_type: relation, consent } : {}),
    }, signal);
    if (signal.aborted) return;
    setResult(current);
    if (returnedOrder) {
      const intent = readMayaUnlockIntent(userId, locale, returnedOrder, product.code);
      if (intent) saveMayaUnlockIntent({ ...intent, phase: 'started', reportId: current.id });
    }
    // A verified payment return resumes only the explicit, saved unlock request.
    for (let i = 0; i < (kind === 'pro' ? 45 : 36) && current.status === 'processing' && !signal.aborted; i++) {
      current = await mayaPremiumApi.advance(kind, current.id, locale, signal);
      if (!signal.aborted) setResult(current);
    }
    if (!signal.aborted) setReports((await mayaPremiumApi.reports(kind, locale, signal)).reports);
    if (!signal.aborted && returnedOrder && current.status === 'completed') {
      const intent = readMayaUnlockIntent(userId, locale, returnedOrder, product.code);
      if (intent) saveMayaUnlockIntent({ ...intent, phase: 'completed' });
    }
  }, [grant, en, result, kind, a, b, locale, product.code, relation, consent, returnedOrder, userId]);
  useEffect(() => {
    if (!loaded || !grant || !returnedOrder || selectedId || autoAttempt.current === returnedOrder) return;
    try {
      const intent = readMayaUnlockIntent(userId, locale, returnedOrder, product.code);
      if (!intent || intent.phase !== 'waiting') return;
      autoAttempt.current = returnedOrder;
      saveMayaUnlockIntent({ ...intent, phase: 'started' });
      void run(generate);
    } catch (cause) { setError(cause instanceof Error ? cause.message : en ? 'Unable to resume the report request.' : '無法恢復報告請求。'); }
  }, [loaded, grant, returnedOrder, selectedId, userId, locale, product.code, run, generate, en]);
  async function unlock(signal: AbortSignal) {
    if (grant) return generate(signal);
    if (!payment) throw new Error(t('付款尚未啟用。', 'Checkout is not enabled.'));
    if (!window.confirm(t(`確認付費解鎖 NT$${product.price}？付款經後端確認後自動生成報告，不自動續扣。`,
      `Pay NT$${product.price} to unlock? Your report will start automatically after server-verified payment. No recurring billing.`))) return;
    checkoutKey.current ??= crypto.randomUUID();
    const form = await mayaApi.checkout(product.code, locale, checkoutKey.current);
    if (signal.aborted) return;
    validateMayaCheckoutForm(form, 'production');
    const personal = profiles.find(v => v.id === a && v.role === 'personal');
    const partner = profiles.find(v => v.id === b && v.role === 'relationship');
    if (!personal || kind === 'relationship' && !partner) throw new Error(t('請先確認出生資料。', 'Confirm your birth data first.'));
    saveMayaUnlockIntent({ userId, locale, product: product.code, orderId: form.order_id, profileId: a, profileBirthDate: personal.birth_date,
      ...(kind === 'relationship' && partner ? { partnerId: b, partnerBirthDate: partner.birth_date, relationshipType: relation, consent } : {}),
      idempotencyKey: checkoutKey.current, phase: 'waiting' });
    submitMayaCheckout(form, 'production');
  }
  const report = result?.report;
  const validPro = report?.productCode === MAYA_PRO_PRODUCT.code && validateMayaProReport(report, report.kinNumber, locale) && report.provider === 'openai';
  const validPair = report?.productCode === MAYA_RELATIONSHIP_PRODUCT.code && validateRelationshipReport(report) && report.locale === locale;
  return <section className="space-y-5" data-premium-report-manager={kind}>
    {!grant && <p>{t('需本人有效商品權限才能生成或讀取完整報告。', 'Active, owned product access is required to generate or read a full report.')}</p>}
    {paidReturn && <p role="status">{t('後端付款狀態', 'Server payment status')}: {paidReturn.status}</p>}
    {paidReturn?.error && <p role="alert">{paidReturn.error}</p>}
    <>
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
          <label className="flex gap-3"><input type="checkbox" checked={consent} disabled={busy || !!result} onChange={e => setConsent(e.target.checked)} />
            {t('已取得另一人的同意，允許儲存生日與生成雙人反思報告。', 'I have the other person’s consent to store their birth date and generate this shared reflection report.')}</label>
        </>}
        <button className="rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
          disabled={!loaded || busy || !a || kind === 'relationship' && (!b || !consent) || result?.status === 'blocked'
            || !!returnedOrder && !grant || !grant && !payment}
          onClick={() => run(unlock)}>{busy ? t('生成中…', 'Generating...') : result?.status === 'processing' ? t('繼續生成（不重新付款）', 'Continue report (no new payment)')
            : complimentary ? t('管理者免費解鎖', 'Unlock free admin report') : grant ? t('解鎖／查看報告', 'Unlock / view report') : t('付費解鎖', 'Pay to unlock')} · NT${product.price}</button>
        <p>{t('先確認出生資料。付款成功返回後會自動生成，請保持頁面開啟；若中斷或失敗，可在此繼續，不必重新付款。', 'Confirm your birth data first. Generation starts automatically after a verified payment return; keep this page open. If interrupted or failed, continue here without paying again.')}</p>
      </section>}
      {result && <p role="status">{result.completedSections}/{result.totalSections} · {result.status}
        {result.reason && ` · ${result.reason}`}</p>}
      <nav className="flex flex-wrap gap-3" aria-label={t('報告歷史', 'Report history')}>{reports.map(r => <button key={r.id} disabled={busy}
        className="underline" onClick={() => run(async signal => { const saved = await mayaPremiumApi.report(kind, r.id, locale, signal); if (!signal.aborted) setResult(saved); })}>
        {t('已儲存報告', 'Saved report')} · {r.status}
      </button>)}</nav>
    </>
    {error && <p role="alert">{error}</p>}
    {report && !validPro && !validPair && <p role="alert">{t('報告格式或依據不符，不顯示內容。', 'Invalid report format or evidence; content is not displayed.')}</p>}
    {validPro && report?.productCode === MAYA_PRO_PRODUCT.code && <MayaProReportView report={report} />}
    {validPair && report?.productCode === MAYA_RELATIONSHIP_PRODUCT.code && <MayaRelationshipReportView report={report} />}
  </section>;
}
