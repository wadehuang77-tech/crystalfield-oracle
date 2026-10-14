import { useCallback, useEffect, useRef, useState } from 'react';
import { mayaApi, mayaPremiumApi, type PremiumReportResult } from '../../lib/api';
import { isMayaDate, taipeiDate, type MayaLocale, type MayaProfile } from '../../lib/maya';
import { MAYA_PRO_PRODUCT, validateMayaProReport } from '../../lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT, RELATIONSHIP_TYPES, validateRelationshipReport, type RelationshipType } from '../../lib/mayaRelationship';
import MayaProReportView from './MayaProReportView';
import MayaRelationshipReportView from './MayaRelationshipReportView';
import { submitMayaCheckout, validateMayaCheckoutForm } from '../../lib/mayaCheckout';
import { readMayaUnlockIntent, saveMayaUnlockIntent } from '../../lib/mayaUnlock';
import useMayaPaymentReturn from '../../hooks/useMayaPaymentReturn';
import { mayaPremiumCopy } from '../../lib/mayaPremiumCopy';

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
  const personalDateInput = useRef<HTMLInputElement>(null);
  const partnerDateInput = useRef<HTMLInputElement>(null);
  const missingInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!busy && missingInput.current) {
      missingInput.current.focus();
      missingInput.current.scrollIntoView({ block: 'center' });
      missingInput.current = null;
    }
  }, [busy, error]);
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    setProfiles([]); setResult(null); setReports([]); setError(''); setBusy(false); setA(''); setB(''); setDateA(''); setDateB(''); setLoadedFor('');
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
        setDateA(intent?.profileBirthDate ?? p.profiles.find(v => v.role === 'personal')?.birth_date ?? '');
        setDateB(intent?.partnerBirthDate ?? p.profiles.find(v => v.role === 'relationship')?.birth_date ?? '');
        if (intent) setRelation(intent.relationshipType ?? 'partners');
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
  const recoverable = kind === 'relationship' && result?.status === 'blocked'
    && result.completedSections >= 11 && ['AI_RETRY_LIMIT', 'AI_SCHEMA_INVALID'].includes(result.reason ?? '');
  const generate = useCallback(async (signal: AbortSignal, profileA = a, profileB = b) => {
    if (!grant) throw new Error(en ? 'Verified product access is required.' : '需要已驗證的商品權限。');
    let current = result && (result.status === 'processing' || recoverable) ? result : await mayaPremiumApi.create(kind, {
      profile_id: profileA, entitlement_id: grant, locale, product_code: product.code,
      ...(kind === 'relationship' ? { relationship_profile_id: profileB, relationship_type: relation } : {}),
    }, signal);
    if (signal.aborted) return;
    setResult(current);
    if (returnedOrder) {
      const intent = readMayaUnlockIntent(userId, locale, returnedOrder, product.code);
      if (intent) saveMayaUnlockIntent({ ...intent, phase: 'started', reportId: current.id });
    }
    // A verified payment return resumes only the explicit, saved unlock request.
    for (let i = 0; i < (kind === 'pro' ? 45 : 36) && (current.status === 'processing' || i === 0 && recoverable) && !signal.aborted; i++) {
      try {
        current = await mayaPremiumApi.advance(kind, current.id, locale, signal);
      } catch (cause) {
        if (signal.aborted) return;
        // The server may have completed or blocked the report before the response
        // failed. Refresh with GET only; never repeat a paid AI call blindly.
        let refreshed: PremiumReportResult;
        try { refreshed = await mayaPremiumApi.report(kind, current.id, locale, signal); }
        catch { throw cause; }
        if (signal.aborted) return;
        current = refreshed;
        setResult(current);
        if (current.status === 'completed') break;
        throw new Error(en
          ? `Report paused at ${current.completedSections}/${current.totalSections}. Your saved chapters are retained; do not pay again. ${current.reason ?? (cause instanceof Error ? cause.message : '')}`
          : `報告暫停於 ${current.completedSections}/${current.totalSections}，已完成章節已保留，請勿重複付款。${current.reason ?? (cause instanceof Error ? cause.message : '')}`);
      }
      if (!signal.aborted) setResult(current);
    }
    if (!signal.aborted) setReports((await mayaPremiumApi.reports(kind, locale, signal)).reports);
    if (!signal.aborted && returnedOrder && current.status === 'completed') {
      const intent = readMayaUnlockIntent(userId, locale, returnedOrder, product.code);
      if (intent) saveMayaUnlockIntent({ ...intent, phase: 'completed' });
    }
  }, [grant, en, result, kind, a, b, locale, product.code, relation, returnedOrder, userId, recoverable]);
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
    if (grant && (result?.status === 'processing' || recoverable)) return generate(signal);
    if (grant && !returnedOrder && !result && profiles.some(p => p.id === a && p.birth_date === dateA)) {
      const existing = await mayaPremiumApi.reports(kind, locale, signal);
      if (signal.aborted) return;
      setReports(existing.reports);
      const completed = existing.reports.find(entry => entry.status === 'completed');
      if (completed) {
        const saved = await mayaPremiumApi.report(kind, completed.id, locale, signal);
        if (!signal.aborted) setResult(saved);
        return;
      }
    }
    let personal = profiles.find(v => v.id === a && v.role === 'personal');
    let partner = profiles.find(v => v.id === b && v.role === 'relationship');
    if (!result) {
      for (const [date, input] of ([[dateA, personalDateInput.current], ...(kind === 'relationship' ? [[dateB, partnerDateInput.current] as const] : [])] as const)) {
        if (!isMayaDate(date) || date.slice(5) === '02-29') {
          missingInput.current = input;
          throw new Error(kind === 'relationship'
            ? t('請輸入 A、B 雙方有效的出生日期（不支援 2 月 29 日）。', 'Enter valid birth dates for both A and B (February 29 is not supported).')
            : t('請輸入有效的出生日期（不支援 2 月 29 日），再按解鎖。', 'Enter a valid birth date (February 29 is not supported), then unlock.'));
        }
      }
    } else if (!a || kind === 'relationship' && !b) {
      missingInput.current = !a ? personalDateInput.current : partnerDateInput.current;
      throw new Error(t('請先儲存報告所需的出生資料。', 'Save the required birth data first.'));
    }
    if (!grant) {
      if (!payment) throw new Error(t('付款尚未啟用。', 'Checkout is not enabled.'));
      if (!window.confirm(t(`確認支付 NT$${product.price} 解鎖報告？不自動續扣。`,
        `Pay NT$${product.price} to unlock your report? No recurring billing.`))) return;
    }
    if (!result) {
      // Carry the returned IDs through this request; React state updates are asynchronous.
      if (personal?.birth_date !== dateA) {
        personal = (await mayaApi.calculate(dateA, locale, 'personal')).profile;
        if (signal.aborted) return;
        setA(personal.id);
        const saved = personal;
        setProfiles(previous => [saved, ...previous.filter(v => v.id !== saved.id)]);
      }
      if (kind === 'relationship' && partner?.birth_date !== dateB) {
        partner = (await mayaApi.calculate(dateB, locale, 'relationship')).profile;
        if (signal.aborted) return;
        setB(partner.id);
        const saved = partner;
        setProfiles(previous => [saved, ...previous.filter(v => v.id !== saved.id)]);
      }
    }
    if (!personal || kind === 'relationship' && !partner) throw new Error(t('請先確認出生資料。', 'Confirm your birth data first.'));
    if (grant) return generate(signal, personal.id, partner?.id);
    checkoutKey.current ??= crypto.randomUUID();
    const form = await mayaApi.checkout(product.code, locale, checkoutKey.current);
    if (signal.aborted) return;
    validateMayaCheckoutForm(form, 'production');
    saveMayaUnlockIntent({ userId, locale, product: product.code, orderId: form.order_id, profileId: personal.id, profileBirthDate: personal.birth_date,
      ...(kind === 'relationship' && partner ? { partnerId: partner.id, partnerBirthDate: partner.birth_date, relationshipType: relation } : {}),
      idempotencyKey: checkoutKey.current, phase: 'waiting' });
    submitMayaCheckout(form, 'production');
  }
  const report = result?.report;
  const validPro = report?.productCode === MAYA_PRO_PRODUCT.code && validateMayaProReport(report, report.kinNumber, locale) && report.provider === 'openai';
  const validPair = report?.productCode === MAYA_RELATIONSHIP_PRODUCT.code && validateRelationshipReport(report) && report.locale === locale;
  return <section id={`maya-premium-${kind}`} className="scroll-mt-6 space-y-5" data-premium-report-manager={kind}>
    {!grant && <p>{t('解鎖後即可探索完整藍圖。', 'Unlock your report to explore the full blueprint.')}</p>}
    {paidReturn && <p role="status">{t('後端付款狀態', 'Server payment status')}: {paidReturn.status}</p>}
    {paidReturn?.error && <p role="alert">{paidReturn.error}</p>}
    <>
      {!report && <section className="maya-cosmic-panel space-y-4">
        <h2>{t('報告出生資料', 'Birth data for this report')}</h2>
        <p>{kind === 'relationship' ? t('輸入雙方生日，按解鎖即可自動儲存並開始處理；付款成功後自動生成報告。', 'Enter both birth dates and unlock. We’ll save them automatically and generate your report after payment is verified.') : t('輸入出生年月日，直接按解鎖；系統會自動儲存資料，付款驗證成功後自動生成報告。', 'Enter your birth date and unlock directly. Your profile is saved automatically and your report starts after verified payment.')}</p>
        {(['personal', ...(kind === 'relationship' ? ['relationship'] : [])] as const).map(role => <div key={role} className="space-y-2">
          <label>{kind === 'relationship' ? `${role === 'personal' ? 'A' : 'B'} · ${t('出生日期', 'Birth date')}` : t('新增生日', 'Add birth date')} <input ref={role === 'personal' ? personalDateInput : partnerDateInput} className="block min-h-12 w-full min-w-0 rounded-lg bg-slate-900 p-3 sm:w-auto" type="date" min="1900-01-01" max={taipeiDate()} disabled={busy || !!result}
            value={role === 'personal' ? dateA : dateB} onChange={e => role === 'personal' ? setDateA(e.target.value) : setDateB(e.target.value)} /></label>
        </div>)}
        {kind === 'relationship' && <>
          <label className="block">{t('關係類型', 'Relationship type')} <select className="bg-slate-900 p-2" disabled={busy || !!result}
            value={relation} onChange={e => setRelation(e.target.value as RelationshipType)}>
            {RELATIONSHIP_TYPES.map((v, i) => <option key={v} value={v}>{en ? ['Partners', 'Friends', 'Family', 'Colleagues'][i] : ['伴侶', '朋友', '家人', '同事'][i]}</option>)}
          </select></label>

        </>}
        <button className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50 sm:w-auto"
          disabled={!loaded || busy || result?.status === 'blocked' && !recoverable
            || !!returnedOrder && !grant || !grant && !payment}
          onClick={() => run(unlock)}>{!busy && result?.status !== 'processing' && !complimentary && !grant ? mayaPremiumCopy(kind, locale).cta
            : `${busy ? t('生成中…', 'Generating...') : result?.status === 'processing' || recoverable ? t('繼續生成（不重新付款）', 'Continue report (no new payment)')
              : complimentary ? t('管理者免費解鎖', 'Unlock free admin report') : t('解鎖／查看報告', 'Unlock / view report')} · NT$${product.price}`}</button>
        {kind === 'pro' && !a && <p className="text-amber-200">{t('填寫生日後直接解鎖，不必先按儲存。', 'Enter your birth date and unlock; no separate save step is needed.')}</p>}
        <p className="text-sm text-slate-400">{t('報告準備期間請保持頁面開啟；若中斷，可回來繼續，無需再次購買。', 'Keep this page open while your report is being prepared. If interrupted, return to continue without another purchase.')}</p>
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
