import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mayaApi, mayaProApi, mayaRelationshipApi } from '../lib/api';
import { calculationLoginRedirect, localizeAuthError } from '../lib/authLocale';
import { getLanguageFromPath, getLocalizedPath } from '../lib/i18n';
import { submitMayaCheckout } from '../lib/mayaCheckout';
import MayaVisualization from '../components/maya/MayaVisualization';
import LifeBlueprintNavigator from '../components/maya/LifeBlueprintNavigator';
import type { VersionedLifeBlueprintReport } from '../lib/mayaLifeBlueprintStorage';
import { MAYA_PRO_PRODUCT } from '../lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../lib/mayaRelationship';
import { MAYA_PRODUCTS, MAYA_DISABLED_FEATURES, taipeiDate, type MayaFeatures, type MayaDaily, type MayaProductCode, type MayaProfile, type MayaReportEntry, type MayaSignature } from '../lib/maya';

const panel = 'rounded-2xl border border-cyan-500/20 bg-slate-900 p-5 md:p-7';
const button = 'rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50';

export default function MayaCalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const language = getLanguageFromPath(location.pathname);
  const en = language === 'en';
  const locale = en ? 'en' : 'zh-TW';
  const t = (zh: string, english: string) => en ? english : zh;
  const localized = (path: string) => getLocalizedPath(path, language);
  const privatePage = location.pathname.replace(/^\/en/, '').replace(/\/+$/, '') !== '/maya-calendar';
  const [profiles, setProfiles] = useState<MayaProfile[]>([]);
  const [daily, setDaily] = useState<MayaDaily | null>(null);
  const [reports, setReports] = useState<MayaReportEntry[]>([]);
  const [report, setReport] = useState<VersionedLifeBlueprintReport | null>(null);
  const [dataIdentity, setDataIdentity] = useState('');
  const [entitlements, setEntitlements] = useState<Array<{ id: string; product_code: MayaProductCode }>>([]);
  const [birthDate, setBirthDate] = useState('');
  const [partnerDate, setPartnerDate] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [sandboxEnabled, setSandboxEnabled] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [features, setFeatures] = useState<MayaFeatures>(MAYA_DISABLED_FEATURES);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [premiumAvailability, setPremiumAvailability] = useState<{ pro: boolean; relationship: boolean } | null>(null);
  const [premiumConfigError, setPremiumConfigError] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const returnedOrder = new URLSearchParams(location.search).get('maya_order');
  const keys = useRef(new Map<string, string>());
  const identity = `${user?.id ?? ''}:${locale}:${id ?? ''}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const personal = dataIdentity === identity ? profiles.find((profile) => profile.role === 'personal') : undefined;
  const partner = dataIdentity === identity ? profiles.find((profile) => profile.role === 'relationship') : undefined;
  const visibleReport = dataIdentity === identity ? report : null;

  useEffect(() => {
    const controller = new AbortController();
    setPremiumAvailability(null); setPremiumConfigError('');
    Promise.all([mayaProApi.config(controller.signal), mayaRelationshipApi.config(locale, controller.signal)])
      .then(([pro, relationship]) => {
        if (typeof pro.liveAi !== 'boolean' || typeof relationship.reportAvailable !== 'boolean') throw new Error('Invalid premium availability');
        if (!controller.signal.aborted) setPremiumAvailability({ pro: pro.liveAi, relationship: relationship.reportAvailable });
      }).catch(() => {
        if (!controller.signal.aborted) setPremiumConfigError(en ? 'Premium report availability could not be verified. Please check the product page before purchasing.' : '無法確認進階報告狀態，購買前請查看商品頁。');
      });
    return () => controller.abort();
  }, [locale, en, user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    setFeatures(MAYA_DISABLED_FEATURES);
    setConfigLoading(true);
    setConfigError('');
    mayaApi.config(controller.signal).then(value => {
      if (!value || ['public', 'member', 'payment', 'sandbox', 'ai'].some(key => typeof value[key as keyof MayaFeatures] !== 'boolean')) {
        throw new Error('Invalid feature configuration');
      }
      if (!controller.signal.aborted) setFeatures({
        public: value.public === true, member: value.public === true && value.member === true,
        payment: value.public === true && value.member === true && value.payment === true && value.sandbox !== true,
        sandbox: value.public === true && value.member === true && value.sandbox === true && value.payment !== true,
        ai: value.public === true && value.member === true && value.ai === true,
        admin_preview: value.public === true && value.member === true && value.admin_preview === true,
        admin_live: value.public === true && value.member === true && value.ai === true && value.admin_live === true,
      });
    }).catch(() => {
      if (!controller.signal.aborted) {
        setFeatures(MAYA_DISABLED_FEATURES);
        setConfigError(en ? 'Feature settings could not be verified. Please retry.' : '無法確認功能設定，請重試。');
      }
    }).finally(() => { if (!controller.signal.aborted) setConfigLoading(false); });
    return () => controller.abort();
  }, [en, user?.id]);

  useEffect(() => {
    setProfiles([]); setReports([]); setReport(null); setDaily(null); setEntitlements([]); setDataIdentity('');
    setBirthDate(''); setPartnerDate(''); setError(''); setNotice(''); setDeleteConfirm(false);
    setSandboxEnabled(false); setPaymentEnabled(false); setOrderStatus('');
    keys.current.clear();
    if (!features.member || !user || !privatePage) {
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    const requestIdentity = identityRef.current;
    setBusy(true);
    Promise.all([
      mayaApi.profiles(locale, controller.signal),
      mayaApi.daily(locale, controller.signal),
      features.ai ? mayaApi.reports(locale, controller.signal) : Promise.resolve({ reports: [] }),
      features.admin_preview && !features.payment && !features.sandbox ? Promise.resolve({ entitlements: [] }) : mayaApi.entitlements(locale, controller.signal),
      id && features.ai ? mayaApi.report(id, locale, controller.signal) : Promise.resolve(null),
      features.admin_preview && !features.payment && !features.sandbox ? Promise.resolve({ enabled: false, mode: 'production' as const }) : mayaApi.checkoutConfig(locale, controller.signal),
      returnedOrder ? mayaApi.checkoutStatus(returnedOrder, locale, controller.signal) : Promise.resolve(null),
    ]).then(([profileData, dailyData, reportData, accessData, selected, sandbox, order]) => {
      if (controller.signal.aborted || identityRef.current !== requestIdentity) return;
      setDataIdentity(requestIdentity);
      setProfiles(profileData.profiles); setDaily(dailyData.daily); setReports(reportData.reports);
      setEntitlements(accessData.entitlements); setReport(selected?.report ?? null);
      setSandboxEnabled(features.sandbox && sandbox.enabled === true && sandbox.mode === 'sandbox');
      setPaymentEnabled(features.payment && sandbox.enabled === true && sandbox.mode === 'production');
      setOrderStatus(order?.status ?? '');
      if (selected && !selected.report) setNotice(en ? `Report status: ${selected.status}. Retry from the product panel.` : `報告狀態：${selected.status}。請從方案區重試。`);
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(localizeAuthError(err instanceof Error ? err.message : '', language, en ? 'Unable to load member data. Please retry.' : '會員資料讀取失敗，請重試。'));
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [user, locale, language, en, privatePage, id, returnedOrder, features]);

  useEffect(() => {
    if (features.member && !authLoading && !user && privatePage) {
      const target = calculationLoginRedirect(false, location.pathname, location.search, location.hash);
      if (target) navigate(target, { replace: true });
    }
  }, [features.member, authLoading, user, privatePage, location.pathname, location.search, location.hash, navigate]);

  function enter() {
    if (!features.member) return;
    const path = localized('/maya-calendar/member');
    navigate(calculationLoginRedirect(!!user, path) ?? path);
  }
  async function action(task: (isCurrent: () => boolean) => Promise<void>) {
    const identityAtStart = identityRef.current;
    const isCurrent = () => identityAtStart === identityRef.current;
    setBusy(true); setError(''); setNotice('');
    try { await task(isCurrent); }
    catch (err: unknown) {
      if (isCurrent()) setError(localizeAuthError(err instanceof Error ? err.message : '', language, t('操作失敗，請重試。', 'Unable to complete the request. Please retry.')));
    } finally { if (isCurrent()) setBusy(false); }
  }
  function signature(value: MayaSignature) {
    return <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {[
        ['KIN', value.kin_number],
        [t('太陽圖騰', 'Solar seal'), value.solar_seal],
        [t('銀河音調', 'Galactic tone'), value.galactic_tone],
        [t('波符', 'Wavespell'), value.wavespell],
        [t('城堡', 'Castle'), value.castle],
        [t('計算版本', 'Calculation version'), value.calculation_version],
      ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-slate-400">{label}</dt><dd className="break-words text-lg text-cyan-200">{value}</dd></div>)}
    </dl>;
  }

  if (configLoading) return <main className="p-8 text-white"><h1>{t('正在確認功能狀態…', 'Checking feature availability...')}</h1></main>;
  if (!features.public || (privatePage && !features.member)) {
    return <main className="p-8 text-white"><h1>{t('Dreamspell 尚未開放', 'Dreamspell is not available yet')}</h1>{(configError || error) && <p role="alert">{configError || error}</p>}</main>;
  }
  if (privatePage && (authLoading || !user)) {
    return <main className="p-8 text-white">{t('正在驗證登入狀態…', 'Checking your sign-in status...')}</main>;
  }
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-slate-100">
    <section className={panel}>
      <div className="mb-5 flex flex-wrap justify-between gap-4">
        <p className="text-cyan-300">Dreamspell · 13 Moon Calendar</p>
        <Link className="underline" to={getLocalizedPath(location.pathname.replace(/^\/en/, ''), en ? 'zh-Hant' : 'en')}>{en ? '繁體中文' : 'English'}</Link>
      </div>
      <h1 className="mb-4 text-3xl font-bold">{t('Dreamspell 瑪雅 13 月亮曆', 'Dreamspell Maya 13 Moon Calendar')}</h1>
      <p>{t('Dreamspell 是現代 13 月亮曆系統，不等同於傳統瑪雅 Tzolk’in 曆法。結果僅供自我覺察，不是科學、醫療、財富或未來事件預測。', 'Dreamspell is a modern 13 Moon calendar system, not the traditional Maya Tzolk’in calendar. Results support self-reflection, not scientific, medical, financial or future-event prediction.')}</p>
      <p className="mt-3 text-amber-200">{features.admin_preview
        ? t('管理者免費 Mock 測試：不扣款、不呼叫 AI。預覽報告不儲存，重新整理後消失；生日資料會儲存於你的帳號。', 'Free admin Mock testing: no payment or AI calls. Preview reports are not saved and disappear on refresh; birth profiles are saved to your account.')
        : sandboxEnabled
        ? t('綠界 Sandbox 僅供官方測試付款；AI 受獨立功能開關控制，禁止真實扣款與自動續扣。', 'ECPay Sandbox is for official test payments only. AI has an independent feature gate; no real charges or recurring billing.')
        : paymentEnabled ? t('付款僅在後端驗證後開通報告；不提供自動續扣。', 'Reports unlock only after server-verified payment; no recurring billing.')
          : t('付款尚未啟用；AI 報告依功能設定開放。', 'Payments are disabled; AI reports depend on feature availability.')}</p>
      <nav className="mt-5 flex flex-wrap gap-4">
        <Link to={localized('/maya-calendar')}>{t('介紹首頁', 'Introduction')}</Link>
        <button className={button} disabled={!features.member} onClick={enter}>{user ? t('會員與免費計算', 'Member center and free calculation') : t('Google 登入後免費計算', 'Sign in with Google to calculate')}</button>
        <Link to={localized('/maya-calendar/daily')}>{t('每日能量', 'Daily energy')}</Link>
        <Link to={localized('/maya-calendar/reports')}>{t('歷史報告', 'Report history')}</Link>
      </nav>
    </section>
    <div aria-live="polite">
      {busy && <p role="status">{t('載入中…', 'Loading...')}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-950 p-4 text-rose-200">{error}</p>}
      {notice && <p className="rounded-xl bg-slate-800 p-4">{notice}</p>}
      {returnedOrder && orderStatus && <div className="rounded-xl bg-slate-800 p-4">
        <p>{t('Sandbox 後端付款狀態', 'Sandbox server payment status')}: {t(
          ({ pending: '等待後端回呼驗證', paid: '測試付款已驗證', failed: '測試付款失敗', cancelled: '已取消' })[orderStatus] ?? '未確認', orderStatus,
        )}</p>
        {orderStatus === 'pending' && <button className="mt-3 underline" onClick={() => window.location.reload()}>{t('重新整理付款狀態（不會重複扣款）', 'Refresh payment status (does not charge again)')}</button>}
      </div>}
    </div>
    <MayaVisualization key={`${identity}:${privatePage}`} locale={locale} publicPage={!privatePage} profile={privatePage && user && dataIdentity === identity ? personal : undefined} />
    {!privatePage && <LifeBlueprintNavigator report={null} locale={locale} />}
    {privatePage && user && <>
      <section className={panel}>
        <h2 className="mb-4 text-2xl">{t('個人出生資料與 KIN', 'Personal birth data and KIN')}</h2>
        <form className="mb-5 flex flex-wrap items-end gap-4" onSubmit={(event) => {
          event.preventDefault();
          void action(async (isCurrent) => {
            const data = await mayaApi.calculate(birthDate, locale);
            if (!isCurrent()) return;
            setDataIdentity(identityRef.current);
            setProfiles((previous) => [...previous.filter((item) => item.role !== 'personal'), data.profile]);
            setReport(null);
          });
        }}>
          <label>{t('出生日期', 'Birth date')}<input className="mt-2 block rounded-xl bg-slate-800 p-3" aria-label={t('出生日期', 'Birth date')} type="date" min="1900-01-01" max={taipeiDate()} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required /></label>
          <button className={button} disabled={busy} type="submit">{t('儲存並免費計算', 'Save and calculate for free')}</button>
        </form>
        {personal && <>{signature(personal)}<p className="mt-5">{personal.free_summary}</p>
          <button className="mt-4 underline" onClick={() => void action(async () => {
            const url = `https://www.crystalfield101.com${localized('/maya-calendar')}`;
            const text = `KIN ${personal.kin_number}: ${personal.solar_seal}, ${personal.galactic_tone}`;
            if (navigator.share) await navigator.share({ title: 'Dreamspell', text, url });
            else { await navigator.clipboard.writeText(`${text} ${url}`); setNotice(t('已複製不含生日的分享內容。', 'Copied share text without birth data.')); }
          })}>{t('分享公開印記（不包含生日）', 'Share signature without birth data')}</button>
        </>}
        <details className="mt-5">
          <summary>{t('雙人關係資料（請先取得另一人同意）', 'Partner data (obtain their consent first)')}</summary>
          <form className="mt-4 flex flex-wrap items-end gap-4" onSubmit={(event) => {
            event.preventDefault();
            void action(async (isCurrent) => {
              const data = await mayaApi.calculate(partnerDate, locale, 'relationship');
              if (!isCurrent()) return;
              setProfiles((previous) => [...previous.filter((item) => item.role !== 'relationship'), data.profile]);
            });
          }}>
            <label>{t('另一人出生日期', 'Partner birth date')}<input className="mt-2 block rounded-xl bg-slate-800 p-3" type="date" min="1900-01-01" max={taipeiDate()} value={partnerDate} onChange={(event) => setPartnerDate(event.target.value)} required /></label>
            <button className={button} disabled={busy} type="submit">{t('儲存另一人資料', 'Save partner profile')}</button>
          </form>
          {partner && <div className="mt-4">{signature(partner)}</div>}
        </details>
      </section>
      {daily && <section className={panel}>
        <h2 className="mb-4 text-2xl">{t('每日免費能量', 'Free daily energy')} · {daily.date}</h2>
        <p className="mb-4">Asia/Taipei (UTC+08:00)</p>
        {signature(daily)}
        <p className="mt-5">{daily.free_summary}</p><p className="mt-3">{daily.awareness_prompt}</p>
        {daily.special_day && <p className="mt-3 text-cyan-200">{daily.special_day === 'new_year' ? t('7 月 26 日：新年', 'July 26: New Year') : t('7 月 25 日：時間之外日', 'July 25: Day Out of Time')}</p>}
        <button className={`${button} mt-4`} disabled={busy} onClick={() => void action(async () => { await mayaApi.premium(locale); })}>{t('深度每日指引（未來商品）', 'Premium daily guidance (future product)')}</button>
      </section>}
    </>}
    <section className={panel}>
      <h2 className="mb-4 text-2xl">{t('生命藍圖方案', 'Life blueprint plans')}</h2>
      {features.payment && features.ai && <p className="mb-4 rounded-xl border border-cyan-400 p-4 text-cyan-200">{t('正式綠界付款，非測試交易。付款成功後可產生對應的 AI 自我覺察報告；產生失敗會顯示狀態，不保證預測結果。', 'Live ECPay payments, not test transactions. After verified payment you can generate the matching AI reflection report. Generation failures display a status; no predictions are guaranteed.')}</p>}
      {features.payment && !features.ai && <p className="mb-4 rounded-xl border border-amber-400 p-4 text-amber-200" role="note">{t('正式付款已開放，但 AI 報告尚未開放。付款成功僅取得對應商品權限，目前無法產生或交付付費 AI 報告。請確認接受此限制再付款；管理者 Mock 預覽不是付費報告。', 'Live payments are available, but AI reports are not yet available. Successful payment grants the matching product entitlement only; paid AI reports cannot currently be generated or delivered. Pay only if you accept this limitation. Admin Mock previews are not paid reports.')}</p>}
      <div className="grid gap-4 md:grid-cols-3">{MAYA_PRODUCTS.map((product) => {
        const access = entitlements.find((entry) => entry.product_code === product.code);
        if (product.code === 'MAYA_RELATIONSHIP_699' && (!privatePage || !user || (!access && !features.admin_preview && !features.admin_live))) return null;
        return <article key={product.code} className="rounded-xl border border-slate-700 p-4">
          <h3 className="text-xl">{en ? product.en : product.zh}</h3>
          <p className="my-3">NT${product.price}</p>
          <p className="mb-4 text-sm">{t('AI 自我覺察報告，未確認的神諭解析不包含在內。', 'AI reflection report. Unverified oracle interpretations are excluded.')}</p>
          {privatePage && user ? <button className={button} disabled={!features.ai || busy || !access || !personal || (product.code === 'MAYA_RELATIONSHIP_699' && !partner)} onClick={() => void action(async (isCurrent) => {
            if (!personal || !access) return;
            const inputKey = JSON.stringify([personal, partner, product.code, locale, access.id]);
            const key = keys.current.get(inputKey) ?? crypto.randomUUID();
            keys.current.set(inputKey, key);
            const result = await mayaApi.createReport({
              locale, product_code: product.code, profile_id: personal.id, entitlement_id: access.id, idempotency_key: key,
              ...(product.code === 'MAYA_RELATIONSHIP_699' && partner ? { relationship_profile_id: partner.id } : {}),
            });
            if (!isCurrent()) return;
            navigate(localized(`/maya-calendar/reports/${result.id}`));
          })}>{access ? features.ai ? t('產生／重試報告', 'Generate / retry report') : t('已取得權限；AI 報告尚未開放', 'Entitlement granted; AI reports unavailable') : t('尚無報告權限', 'No report entitlement')}</button>
            : <button className={button} disabled={!features.member} onClick={enter}>{t('登入查看報告權限', 'Sign in to check report access')}</button>}
          {privatePage && user && features.admin_preview && <button className="mt-4 block text-sm text-cyan-200 underline disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !personal || (product.code === 'MAYA_RELATIONSHIP_699' && !partner)} onClick={() => void action(async (isCurrent) => {
            if (!personal) return;
            const result = await mayaApi.adminPreview({
              locale, product_code: product.code, profile_id: personal.id,
              ...(product.code === 'MAYA_RELATIONSHIP_699' && partner ? { relationship_profile_id: partner.id } : {}),
            });
            if (!isCurrent()) return;
            if (result.mode !== 'admin_mock_preview' || result.persisted !== false || result.report.model_name !== 'mock-dreamspell-ai') throw new Error('Invalid admin preview response');
            setDataIdentity(identityRef.current);
            setReport(result.report);
            setNotice(t('管理者 Mock 預覽已產生；未付款、未呼叫 AI、未儲存報告。請往下閱讀。', 'Admin Mock preview ready below: no payment, no AI calls, no saved report.'));
          })}>{t('管理者免費測試（Mock，非付款）', 'Free admin preview (Mock, not payment)')}</button>}
          {privatePage && user && features.admin_live && <button className={`${button} mt-3`} disabled={busy || !personal || (product.code === 'MAYA_RELATIONSHIP_699' && !partner)} onClick={() => void action(async (isCurrent) => {
            if (!personal) return;
            const inputKey = `admin-live:${JSON.stringify([personal, partner, product.code, locale])}`;
            const key = keys.current.get(inputKey) ?? crypto.randomUUID();
            keys.current.set(inputKey, key);
            const result = await mayaApi.adminReport({
              locale, product_code: product.code, profile_id: personal.id, idempotency_key: key,
              ...(product.code === 'MAYA_RELATIONSHIP_699' && partner ? { relationship_profile_id: partner.id } : {}),
            });
            if (!isCurrent()) return;
            navigate(localized(`/maya-calendar/reports/${result.id}`));
          })}>{t('管理者免費 AI 報告', 'Complimentary admin AI report')} · {t('原價', 'List price')} NT${product.price} · {t('免付款', 'No payment')}</button>}
          {(sandboxEnabled || paymentEnabled) && product.code !== 'MAYA_RELATIONSHIP_699' && privatePage && user && !access && !features.admin_live && <button className={`${button} mt-3`} disabled={busy || !personal} onClick={() => void action(async (isCurrent) => {
            if (paymentEnabled && features.ai && !window.confirm(t(`將前往綠界正式付款 NT$${product.price}，這不是測試交易。確認繼續？`, `Continue to live ECPay payment of NT$${product.price}? This is not a test transaction.`))) return;
            if (paymentEnabled && !features.ai && !window.confirm(t('本次將實際收款，但 AI 報告尚未開放，付款僅取得商品權限。目前無法交付付費 AI 報告。確認繼續付款？', 'This is a real charge. AI reports are unavailable; payment grants a product entitlement only, with no paid AI report currently delivered. Continue?'))) return;
            const checkoutKey = `checkout:${product.code}:${locale}`;
            const key = keys.current.get(checkoutKey) ?? crypto.randomUUID();
            keys.current.set(checkoutKey, key);
            const form = await mayaApi.checkout(product.code, locale, key);
            if (isCurrent()) submitMayaCheckout(form, paymentEnabled ? 'production' : 'sandbox');
          })}>{paymentEnabled ? t('綠界付款', 'ECPay checkout') : t('綠界 Sandbox 測試付款', 'ECPay Sandbox test checkout')} · NT${product.price}</button>}
          {features.payment && !privatePage && <button className={`${button} mt-3`} disabled={!features.member} type="button" onClick={enter}>{t('綠界付款', 'ECPay checkout')} · NT${product.price}</button>}
          {!features.payment && !features.sandbox && <button className={`${button} mt-3`} disabled type="button">{t('綠界付款：即將開放', 'ECPay checkout: coming soon')} · NT${product.price}</button>}
        </article>;
      })}</div>
    </section>
    <section className={panel} data-relationship-product={MAYA_RELATIONSHIP_PRODUCT.code}>
      <h2 className="text-2xl">{en ? MAYA_RELATIONSHIP_PRODUCT.en : MAYA_RELATIONSHIP_PRODUCT.zh}</h2>
      <p className="my-3">NT${MAYA_RELATIONSHIP_PRODUCT.price} · {MAYA_RELATIONSHIP_PRODUCT.code}</p>
      <p>{premiumAvailability?.relationship
        ? t('獨立雙人商品。NT$899 提供十二篇雙人象徵解讀、三種關係視角、程式視覺化與90天實踐計畫。會員取得權限後自行啟動生成，成功後儲存；既有699雙人權益保留。', 'Separate relationship product. NT$899 provides twelve symbolic reflection chapters, three relationship perspectives, programmatic visuals and a 90-day practice plan. Members explicitly start generation after obtaining access; completed reports are saved. Existing 699 relationship access is preserved.')
        : premiumAvailability ? t('獨立雙人商品。NT$899目前僅購買商品權限，十二篇報告與雙人視覺化尚無法交付；既有699雙人權益保留。', 'Separate relationship product. NT$899 currently buys access only; twelve chapters and paired visualizations are not available for delivery. Existing 699 relationship access is preserved.')
          : t('正在確認雙人報告生成狀態；購買前請查看商品頁。', 'Checking relationship report availability; check the product page before purchasing.')}</p>
      {premiumConfigError && <p role="alert">{premiumConfigError}</p>}
      <Link className="mt-3 block underline" to={localized('/maya-calendar/relationship')}>{t('查看雙人藍圖開發狀態', 'View relationship blueprint availability')}</Link>
      <Link className={`${button} mt-3 inline-block`} to={localized('/maya-calendar/relationship')}>{t('綠界付款', 'ECPay checkout')} · NT$899</Link>
    </section>
    <section className={panel}>
      <h2 className="text-2xl">{en ? MAYA_PRO_PRODUCT.en : MAYA_PRO_PRODUCT.zh}</h2>
      <p className="my-3">NT${MAYA_PRO_PRODUCT.price} · {MAYA_PRO_PRODUCT.code}</p>
      <p>{premiumAvailability?.pro
        ? t('獨立個人商品。NT$699 提供十五篇星際靈魂使命象徵解讀、五大神諭與波符視覺化。會員取得權限後自行啟動生成，成功後儲存，再次閱讀不重複生成或扣款。', 'Independent personal product. NT$699 provides fifteen symbolic soul-mission chapters with oracle and wavespell visuals. Members explicitly start generation after obtaining access; completed reports are saved and reading again does not regenerate or charge.')
        : premiumAvailability ? t('全新獨立個人商品；雙人關係合盤新訂單為 NT$899。Pro 付款依獨立功能開關開放，Live AI 報告尚未開放。', 'Independent personal product; new relationship orders cost NT$899. Pro checkout has a separate availability gate; Live AI reports are not available yet.')
          : t('正在確認 Pro 報告生成狀態；購買前請查看商品頁。', 'Checking Pro report availability; check the product page before purchasing.')}</p>
      <Link className={`${button} mt-3 inline-block`} to={localized('/maya-calendar/pro')}>{t('綠界付款', 'ECPay checkout')} · NT${MAYA_PRO_PRODUCT.price}</Link>
      <Link className="mt-3 block underline" to={localized('/maya-calendar/pro')}>{t('查看 Pro 功能與狀態', 'View Pro features and availability')}</Link>
    </section>
    {privatePage && user && <>
      <section className={panel}>
        <h2 className="mb-4 text-2xl">{t('會員歷史報告', 'Member report history')}</h2>
        {reports.length === 0 && <p>{t('尚無報告。報告需要後端驗證的商品權限，前端不能開通。', 'No reports yet. Reports require server-verified product access, never a browser grant.')}</p>}
        <ul className="space-y-4">{(dataIdentity === identity ? reports : []).map((entry) => <li key={entry.id} className="break-words">
          <Link className="underline" to={getLocalizedPath(`/maya-calendar/reports/${entry.id}`, entry.locale === 'en' ? 'en' : 'zh-Hant')}>{entry.product_code} · {entry.locale} · {entry.created_at}</Link>
          <p>{t('報告狀態', 'Report status')}: {t(
            ({ pending: '等待中', processing: '處理中', completed: '完成', failed: '失敗' })[entry.report_status], entry.report_status,
          )} · {t('付款狀態', 'Payment status')}: {t(
            ({ paid: '已付款', pending: '等待付款', failed: '失敗', cancelled: '已取消', refunded: '已退款', revoked: '已撤銷' })[entry.payment_status] ?? '未確認', entry.payment_status,
          )}</p>
        </li>)}</ul>
      </section>
      {visibleReport && ('reportVersion' in visibleReport || visibleReport.product_code === 'MAYA_FULL_499') ? <LifeBlueprintNavigator key={identity} report={visibleReport} locale={locale} /> : visibleReport && !('reportVersion' in visibleReport) && <section className={panel}>
        <h2 className="mb-4 text-2xl">{features.admin_preview ? t('管理者 Mock 測試報告（非付費 AI）', 'Admin Mock preview (not paid AI)') : t('AI 生命藍圖報告', 'AI Life Blueprint Report')}</h2>
        {signature(visibleReport.signature)}
        {visibleReport.relationship_signature && <div className="mt-5">{signature(visibleReport.relationship_signature)}</div>}
        {visibleReport.sections.map((section) => <article key={section.heading} className="mt-6"><h3 className="text-xl text-cyan-200">{section.heading}</h3><p className="mt-3 whitespace-pre-wrap">{section.body}</p></article>)}
        <p className="mt-5">{visibleReport.model_name} · {visibleReport.prompt_version} · {t('費用', 'Cost')}: NT${visibleReport.usage.cost_twd}</p>
      </section>}
      {!visibleReport && <LifeBlueprintNavigator report={null} locale={locale} />}
      <section className={panel}>
        <h2 className="mb-4 text-xl">{t('資料管理', 'Data management')}</h2>
        <p>{t('生日僅提供你本人存取。可刪除本系統的出生資料與報告，不影響其他命理系統或訂單紀錄。', 'Only your account can access your birth data. You may delete your Dreamspell profiles and reports without changing other systems or order records.')}</p>
        <label className="my-4 flex gap-3"><input type="checkbox" checked={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.checked)} />{t('我確認申請刪除我的 Dreamspell 資料。', 'I confirm deletion of my Dreamspell data.')}</label>
        <button className={button} disabled={busy || !deleteConfirm} onClick={() => void action(async (isCurrent) => {
          await mayaApi.deleteData(locale);
          if (!isCurrent()) return;
          setProfiles([]); setReports([]); setReport(null); setBirthDate(''); setPartnerDate(''); setDeleteConfirm(false);
          setNotice(t('你的 Dreamspell 個人資料與報告已刪除。', 'Your Dreamspell profiles and reports were deleted.'));
        })}>{t('確認刪除', 'Confirm deletion')}</button>
      </section>
    </>}
    <section className={panel}>
      <h2 className="mb-4 text-2xl">{t('常見問題與規則狀態', 'FAQ and rule status')}</h2>
      <details><summary>{t('Dreamspell 等同於傳統曆法嗎？', 'Is Dreamspell the traditional calendar?')}</summary><p>{t('不是。本系統使用現代 Dreamspell 固定基準：1987-07-26 = KIN 34。', 'No. This system uses the modern Dreamspell anchor: 1987-07-26 = KIN 34.')}</p></details>
      <details className="mt-4"><summary>{t('為何某些功能未啟用？', 'Why are some features disabled?')}</summary><p>{t('五大神諭、城堡象徵、舊月亮日期輸出及 2 月 29 日個人印記尚需完整來源驗證。7 月 25 日與 26 日標記可用，但不提供推測解讀。每日深度商品尚未啟用。', 'Fifth-force oracle, castle symbolism, legacy moon-date output and February 29 birth signatures require further verification. July 25 and 26 markers are available without speculative interpretation. Daily premium is not activated.')}</p></details>
      <details className="mt-4"><summary>{t('現在能付款嗎？', 'Can I pay now?')}</summary><p>{sandboxEnabled
        ? t('僅在隔離測試環境提供綠界 Sandbox。必須後端驗證付款回呼才開通報告，沒有正式扣款入口。', 'Only isolated ECPay Sandbox checkout is enabled. Reports require a server-verified callback; there is no live payment entry.')
        : paymentEnabled ? t('正式付款入口已由功能設定啟用；只有驗證回呼才開通權限。', 'Live checkout is enabled by feature settings; only a verified callback grants access.')
          : t('目前付款未啟用。', 'Payments are currently disabled.')}</p></details>
    </section>
  </main>;
}
