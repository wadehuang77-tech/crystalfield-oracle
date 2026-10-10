import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mayaApi, mayaProApi, mayaRelationshipApi } from '../lib/api';
import { calculationLoginRedirect, localizeAuthError } from '../lib/authLocale';
import { getLanguageFromPath, getLocalizedPath } from '../lib/i18n';
import { submitMayaCheckout, validateMayaCheckoutForm } from '../lib/mayaCheckout';
import { readMayaUnlockIntent, saveMayaUnlockIntent } from '../lib/mayaUnlock';
import useMayaPaymentReturn from '../hooks/useMayaPaymentReturn';
import MayaVisualization from '../components/maya/MayaVisualization';
import LifeBlueprintNavigator from '../components/maya/LifeBlueprintNavigator';
import type { VersionedLifeBlueprintReport } from '../lib/mayaLifeBlueprintStorage';
import { MAYA_PRO_PRODUCT } from '../lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../lib/mayaRelationship';
import { MAYA_PRODUCTS, MAYA_DISABLED_FEATURES, taipeiDate, type MayaLocale, type MayaFeatures, type MayaDaily, type MayaProductCode, type MayaProfile, type MayaReportEntry, type MayaSignature } from '../lib/maya';

const panel = 'rounded-2xl border border-cyan-500/20 bg-slate-900 p-5 md:p-7';
const button = 'rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50';

export default function MayaCalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const language = getLanguageFromPath(location.pathname);
  const en = language === 'en';
  const locale: MayaLocale = en ? 'en' : 'zh-TW';
  const t = (zh: string, english: string) => en ? english : zh;
  const localized = (path: string) => getLocalizedPath(path, language);
  const privatePage = location.pathname.replace(/^\/en/, '').replace(/\/+$/, '') !== '/maya-calendar';
  const compactPage = ['/maya-calendar', '/maya-calendar/member'].includes(location.pathname.replace(/^\/en/, '').replace(/\/+$/, ''));
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
  const paidReturn = useMayaPaymentReturn(privatePage ? user?.id : undefined, locale, returnedOrder);
  const autoAttempt = useRef<string | null>(null);
  const actionRunning = useRef(false);
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
      features.ai && !compactPage ? mayaApi.reports(locale, controller.signal) : Promise.resolve({ reports: [] }),
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
  }, [user, locale, language, en, privatePage, compactPage, id, returnedOrder, features]);

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
  const action = useCallback(async (task: (isCurrent: () => boolean) => Promise<void>) => {
    if (actionRunning.current) return;
    actionRunning.current = true;
    const identityAtStart = identityRef.current;
    const isCurrent = () => identityAtStart === identityRef.current;
    setBusy(true); setError(''); setNotice('');
    try { await task(isCurrent); }
    catch (err: unknown) {
      if (isCurrent()) setError(localizeAuthError(err instanceof Error ? err.message : '', language, en ? 'Unable to complete the request. Please retry.' : '操作失敗，請重試。'));
    } finally { actionRunning.current = false; if (isCurrent()) setBusy(false); }
  }, [language, en]);
  const generateBasic = useCallback(async (product: MayaProductCode, profileId: string, partnerId: string | undefined,
    accessId: string | null, admin: boolean, key: string, isCurrent: () => boolean) => {
    const body = { locale, product_code: product, profile_id: profileId, idempotency_key: key,
      ...(partnerId ? { relationship_profile_id: partnerId } : {}) };
    if (!admin && !accessId) throw new Error(locale === 'en' ? 'Verified product access is required.' : '需要已驗證的商品權限。');
    const result = admin ? await mayaApi.adminReport(body) : await mayaApi.createReport({ ...body, entitlement_id: accessId ?? '' });
    if (isCurrent()) navigate(getLocalizedPath(`/maya-calendar/reports/${result.id}`, language));
  }, [locale, language, navigate]);
  useEffect(() => {
    if (!features.ai || !user || !returnedOrder || !paidReturn?.accessId || dataIdentity !== identity
      || autoAttempt.current === returnedOrder || id) return;
    const product = paidReturn.product;
    if (product !== 'MAYA_BASIC_199' && product !== 'MAYA_FULL_499') return;
    try {
      const intent = readMayaUnlockIntent(user.id, locale, returnedOrder, product);
      if (!intent || intent.phase !== 'waiting') return;
      if (!profiles.some(p => p.id === intent.profileId && p.role === 'personal' && p.birth_date === intent.profileBirthDate)) {
        throw new Error(en ? 'The birth data changed after checkout. Review your data before generating; do not pay again.' : '付款前後的出生資料已變更，請先確認資料再生成，勿重複付款。');
      }
      autoAttempt.current = returnedOrder;
      saveMayaUnlockIntent({ ...intent, phase: 'started' });
      void action(async isCurrent => {
        await generateBasic(product, intent.profileId, undefined, paidReturn.accessId, false, intent.idempotencyKey, isCurrent);
        if (isCurrent()) saveMayaUnlockIntent({ ...intent, phase: 'completed' });
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : en ? 'Unable to resume the report request.' : '無法恢復報告請求。'); }
  }, [features.ai, user, returnedOrder, paidReturn, dataIdentity, identity, id, locale, profiles, en, action, generateBasic]);
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
    <section className={panel} data-maya-hero>
      <div className="mb-4 flex flex-wrap justify-between gap-3 text-sm">
        <p className="text-cyan-300">Dreamspell · 13 Moon Calendar</p>
        <Link className="underline" to={getLocalizedPath(location.pathname.replace(/^\/en/, ''), en ? 'zh-Hant' : 'en')}>{en ? '繁體中文' : 'English'}</Link>
      </div>
      <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">{privatePage
        ? t('Dreamspell 瑪雅 13 月亮曆', 'Dreamspell Maya 13 Moon Calendar')
        : t('探索你的馬雅星際生命密碼', 'Discover Your Galactic Life Signature')}</h1>
      {!privatePage && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-cyan-100" data-maya-subtitle>{t(
        '透過出生日期，認識你的天賦、性格特質與人生方向。',
        'Explore your strengths, personality, and sense of direction—starting with your birth date.')}</p>}
      <nav className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3" aria-label={t('馬雅曆導覽', 'Dreamspell navigation')}>
        <button className={`${button} w-full sm:w-auto`} disabled={!features.member} onClick={enter}>{t('免費查詢我的 KIN', 'Find My KIN for Free')}</button>
        <Link to={localized('/maya-calendar')}>{t('認識馬雅曆', 'About Dreamspell')}</Link>
        <Link to={localized('/maya-calendar/daily')}>{t('今日星際能量', "Today's Galactic Energy")}</Link>
        <Link to={localized('/maya-calendar/reports')}>{t('我的生命藍圖', 'My Life Blueprint')}</Link>
      </nav>
      {!privatePage && <p className="mt-6 max-w-3xl leading-relaxed text-slate-200">{t(
        '每個人都有專屬的馬雅星際印記（KIN）。透過 Dreamspell 13 月亮曆，你可以探索自己的太陽圖騰、銀河音調、內在潛能與生命成長課題。從認識自己開始，發現屬於你的生命藍圖。',
        'Your birth date connects you with a personal galactic signature, called a KIN. Through the Dreamspell 13 Moon calendar, explore your solar seal, galactic tone, untapped potential, and themes for personal growth. Get to know yourself in a new way—and discover your own life blueprint.')}</p>}
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">{t(
        'Dreamspell 是現代 13 月亮曆系統，並非傳統馬雅 Tzolk’in 曆法。內容僅供自我探索，不是科學、醫療或未來事件預測。',
        'Dreamspell is a modern 13 Moon calendar system, not the traditional Maya Tzolk’in calendar. Its symbolic insights are for self-reflection, not scientific claims, medical advice, or predictions.')}</p>
      {(user && features.admin_preview || privatePage) && <p className="mt-3 text-amber-200">{user && features.admin_preview
        ? t('管理者免費 Mock 測試：不扣款、不呼叫 AI。預覽報告不儲存，重新整理後消失；生日資料會儲存於你的帳號。', 'Free admin Mock testing: no payment or AI calls. Preview reports are not saved and disappear on refresh; birth profiles are saved to your account.')
        : sandboxEnabled
        ? t('綠界 Sandbox 僅供官方測試付款；AI 受獨立功能開關控制，禁止真實扣款與自動續扣。', 'ECPay Sandbox is for official test payments only. AI has an independent feature gate; no real charges or recurring billing.')
        : paymentEnabled ? t('付款僅在後端驗證後開通報告；不提供自動續扣。', 'Reports unlock only after server-verified payment; no recurring billing.')
          : t('付款尚未啟用；AI 報告依功能設定開放。', 'Payments are disabled; AI reports depend on feature availability.')}</p>}
    </section>
    {!privatePage && <section className="grid gap-4 md:grid-cols-3" aria-label={t('馬雅曆探索特色', 'Explore Dreamspell')} data-maya-features>
      {[
        [t('探索你的星際身份', 'Meet Your Galactic Signature'), t('從出生 KIN、太陽圖騰與銀河音調，找到認識自己的新視角。', 'Get a fresh perspective on yourself through your birth KIN, solar seal, and galactic tone.')],
        [t('解讀你的生命藍圖', 'Explore Your Life Blueprint'), t('透過象徵解讀，反思你的天賦、關係與人生方向，將覺察化為日常行動。', 'Reflect on your strengths, relationships, and direction through symbolic insights—and turn reflection into everyday action.')],
        [t('了解你與重要的人', 'Connect with the People Who Matter'), t('探索兩人的星際印記，從不同視角理解彼此，練習溝通與共同成長。', 'Explore two galactic signatures, consider each other’s perspective, and make space for communication and shared growth.')],
      ].map(([heading, description]) => <article className={panel} key={heading}>
        <h2 className="text-xl font-semibold text-cyan-100">{heading}</h2>
        <p className="mt-3 leading-relaxed text-slate-300">{description}</p>
      </article>)}
    </section>}
    <div aria-live="polite">
      {busy && <p role="status">{t('載入中…', 'Loading...')}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-950 p-4 text-rose-200">{error}</p>}
      {notice && <p className="rounded-xl bg-slate-800 p-4">{notice}</p>}
      {paidReturn?.error && <p role="alert">{paidReturn.error}</p>}
      {paidReturn?.status === 'pending' && <p role="status">{t('等待後端確認付款，確認後自動生成；請勿重複付款。', 'Waiting for server payment confirmation. Generation will start automatically; do not pay again.')}</p>}
      {returnedOrder && orderStatus && <div className="rounded-xl bg-slate-800 p-4">
        <p>{t('Sandbox 後端付款狀態', 'Sandbox server payment status')}: {t(
          ({ pending: '等待後端回呼驗證', paid: '測試付款已驗證', failed: '測試付款失敗', cancelled: '已取消' })[orderStatus] ?? '未確認', orderStatus,
        )}</p>
        {orderStatus === 'pending' && <button className="mt-3 underline" onClick={() => window.location.reload()}>{t('重新整理付款狀態（不會重複扣款）', 'Refresh payment status (does not charge again)')}</button>}
      </div>}
    </div>
    <MayaVisualization key={`${identity}:${privatePage}`} locale={locale} publicPage={!privatePage} profile={privatePage && user && dataIdentity === identity ? personal : undefined}
      showMatrixGrid={!compactPage} />
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
      {features.payment && features.ai && <p className="mb-4 rounded-xl border border-cyan-400 p-4 text-cyan-200">{t('先儲存出生資料，再按付費解鎖。付款成功返回並經後端確認後自動生成報告，不需再按生成；請保持頁面開啟。失敗會顯示狀態，不保證預測結果。', 'Save your birth data, then pay to unlock. After returning from server-verified payment, your report starts automatically without another generation click. Keep the page open. Failures display a status; no predictions are guaranteed.')}</p>}
      {features.payment && !features.ai && <p className="mb-4 rounded-xl border border-amber-400 p-4 text-amber-200" role="note">{t('正式付款已開放，但 AI 報告尚未開放。付款成功僅取得對應商品權限，目前無法產生或交付付費 AI 報告。請確認接受此限制再付款。', 'Live payments are available, but AI reports are not yet available. Successful payment grants the matching product entitlement only; paid AI reports cannot currently be generated or delivered. Pay only if you accept this limitation.')}</p>}
      <div className="grid gap-4 md:grid-cols-3">{MAYA_PRODUCTS.filter((product) => product.code !== 'MAYA_RELATIONSHIP_699').map((product) => {
        const access = paidReturn?.product === product.code && paidReturn.accessId
          ? { id: paidReturn.accessId, product_code: product.code } : entitlements.find((entry) => entry.product_code === product.code);
        return <article key={product.code} className="rounded-xl border border-slate-700 p-4">
          <h3 className="text-xl">{en ? product.en : product.zh}</h3>
          <p className="my-3">NT${product.price}</p>
          <p className="mb-4 text-sm">{t('AI 自我覺察報告，未確認的神諭解析不包含在內。', 'AI reflection report. Unverified oracle interpretations are excluded.')}</p>
          {privatePage && user ? <button className={button} disabled={busy || !personal
            || !!access && !features.ai
            || (!access && !features.admin_live && !(sandboxEnabled || paymentEnabled))
            || !!returnedOrder && paidReturn?.product === product.code && !paidReturn.accessId} onClick={() => void action(async (isCurrent) => {
            if (!personal) return;
            const inputKey = JSON.stringify([personal, null, product.code, locale, access?.id ?? (features.admin_live ? 'admin' : 'checkout')]);
            const key = keys.current.get(inputKey) ?? crypto.randomUUID();
            keys.current.set(inputKey, key);
            if (features.admin_live || access) {
              if (!features.ai) throw new Error(t('AI 報告尚未開放。', 'AI reports are not available.'));
              await generateBasic(product.code, personal.id, undefined,
                access?.id ?? null, features.admin_live === true, key, isCurrent);
              return;
            }
            if (paymentEnabled && !window.confirm(features.ai
              ? t(`確認付費解鎖 NT$${product.price}？後端確認付款後自動生成，不自動續扣。`, `Pay NT$${product.price} to unlock? Generation starts after verified payment. No recurring billing.`)
              : t('AI 報告尚未開放，付款僅購買權限。確認付款？', 'AI reports are unavailable; payment buys access only. Continue?'))) return;
            const form = await mayaApi.checkout(product.code, locale, key);
            if (!isCurrent()) return;
            validateMayaCheckoutForm(form, paymentEnabled ? 'production' : 'sandbox');
            if (features.ai) saveMayaUnlockIntent({ userId: user.id, locale, product: product.code, orderId: form.order_id,
              profileId: personal.id, profileBirthDate: personal.birth_date, idempotencyKey: key, phase: 'waiting' });
            submitMayaCheckout(form, paymentEnabled ? 'production' : 'sandbox');
          })}>{features.admin_live ? t('管理者免費解鎖', 'Unlock free admin report') : access ? features.ai ? t('解鎖／查看報告', 'Unlock / view report') : t('已取得權限；AI 報告尚未開放', 'Entitlement granted; AI reports unavailable')
            : t('付費解鎖', 'Pay to unlock')} · NT${product.price}</button>
            : <button className={button} disabled={!features.member} onClick={enter}>{t('登入查看報告權限', 'Sign in to check report access')}</button>}
          {privatePage && user && features.admin_preview && <button className="mt-4 block text-sm text-cyan-200 underline disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !personal} onClick={() => void action(async (isCurrent) => {
            if (!personal) return;
            const result = await mayaApi.adminPreview({
              locale, product_code: product.code, profile_id: personal.id,
            });
            if (!isCurrent()) return;
            if (result.mode !== 'admin_mock_preview' || result.persisted !== false || result.report.model_name !== 'mock-dreamspell-ai') throw new Error('Invalid admin preview response');
            setDataIdentity(identityRef.current);
            setReport(result.report);
            setNotice(t('管理者 Mock 預覽已產生；未付款、未呼叫 AI、未儲存報告。請往下閱讀。', 'Admin Mock preview ready below: no payment, no AI calls, no saved report.'));
          })}>{t('管理者免費測試（Mock，非付款）', 'Free admin preview (Mock, not payment)')}</button>}
          {features.payment && !privatePage && <button className={`${button} mt-3`} disabled={!features.member} type="button" onClick={enter}>{t('付費解鎖', 'Pay to unlock')} · NT${product.price}</button>}
          {!features.payment && !features.sandbox && <button className={`${button} mt-3`} disabled type="button">{t('付費解鎖：即將開放', 'Pay to unlock: coming soon')} · NT${product.price}</button>}
        </article>;
      })}</div>
    </section>
    <section className={panel} data-relationship-product={MAYA_RELATIONSHIP_PRODUCT.code}>
      <h2 className="text-2xl">{en ? MAYA_RELATIONSHIP_PRODUCT.en : MAYA_RELATIONSHIP_PRODUCT.zh}</h2>
      <p className="my-3">NT${MAYA_RELATIONSHIP_PRODUCT.price} · {MAYA_RELATIONSHIP_PRODUCT.code}</p>
      <p>{premiumAvailability?.relationship
        ? t('獨立雙人商品。NT$899 提供十二篇雙人象徵解讀、三種關係視角、程式視覺化與90天實踐計畫。先確認資料，付費解鎖返回後自動生成並儲存；既有699雙人權益保留。', 'Separate relationship product. NT$899 provides twelve symbolic reflection chapters, three relationship perspectives, programmatic visuals and a 90-day practice plan. Confirm your data, then pay to unlock; generation starts after the verified return and reports are saved. Existing 699 relationship access is preserved.')
        : premiumAvailability ? t('獨立雙人商品。NT$899目前僅購買商品權限，十二篇報告與雙人視覺化尚無法交付；既有699雙人權益保留。', 'Separate relationship product. NT$899 currently buys access only; twelve chapters and paired visualizations are not available for delivery. Existing 699 relationship access is preserved.')
          : t('正在確認雙人報告生成狀態；購買前請查看商品頁。', 'Checking relationship report availability; check the product page before purchasing.')}</p>
      {premiumConfigError && <p role="alert">{premiumConfigError}</p>}
      <Link className="mt-3 block underline" to={localized('/maya-calendar/relationship')}>{t('查看雙人藍圖開發狀態', 'View relationship blueprint availability')}</Link>
      <Link className={`${button} mt-3 inline-block`} to={localized('/maya-calendar/relationship')}>{t('付費解鎖', 'Pay to unlock')} · NT$899</Link>
    </section>
    <section className={panel}>
      <h2 className="text-2xl">{en ? MAYA_PRO_PRODUCT.en : MAYA_PRO_PRODUCT.zh}</h2>
      <p className="my-3">NT${MAYA_PRO_PRODUCT.price} · {MAYA_PRO_PRODUCT.code}</p>
      <p>{premiumAvailability?.pro
        ? t('獨立個人商品。NT$699 提供十五篇星際靈魂使命象徵解讀、五大神諭與波符視覺化。先確認資料，付費解鎖返回後自動生成並儲存，再次閱讀不重複生成或扣款。', 'Independent personal product. NT$699 provides fifteen symbolic soul-mission chapters with oracle and wavespell visuals. Confirm your data, then pay to unlock; generation starts after the verified return. Saved reports do not regenerate or charge when read again.')
        : premiumAvailability ? t('全新獨立個人商品；雙人關係合盤新訂單為 NT$899。Pro 付款依獨立功能開關開放，Live AI 報告尚未開放。', 'Independent personal product; new relationship orders cost NT$899. Pro checkout has a separate availability gate; Live AI reports are not available yet.')
          : t('正在確認 Pro 報告生成狀態；購買前請查看商品頁。', 'Checking Pro report availability; check the product page before purchasing.')}</p>
      <Link className={`${button} mt-3 inline-block`} to={localized('/maya-calendar/pro')}>{t('付費解鎖', 'Pay to unlock')} · NT${MAYA_PRO_PRODUCT.price}</Link>
      <Link className="mt-3 block underline" to={localized('/maya-calendar/pro')}>{t('查看 Pro 功能與狀態', 'View Pro features and availability')}</Link>
    </section>
    {privatePage && user && <>
      {!compactPage && <section className={panel}>
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
      </section>}
      {visibleReport && ('reportVersion' in visibleReport || visibleReport.product_code === 'MAYA_FULL_499') ? <LifeBlueprintNavigator key={identity} report={visibleReport} locale={locale} /> : visibleReport && !('reportVersion' in visibleReport) && <section className={panel}>
        <h2 className="mb-4 text-2xl">{features.admin_preview ? t('管理者 Mock 測試報告（非付費 AI）', 'Admin Mock preview (not paid AI)') : t('AI 生命藍圖報告', 'AI Life Blueprint Report')}</h2>
        {signature(visibleReport.signature)}
        {visibleReport.relationship_signature && <div className="mt-5">{signature(visibleReport.relationship_signature)}</div>}
        {visibleReport.sections.map((section) => <article key={section.heading} className="mt-6"><h3 className="text-xl text-cyan-200">{section.heading}</h3><p className="mt-3 whitespace-pre-wrap">{section.body}</p></article>)}
        <p className="mt-5">{visibleReport.model_name} · {visibleReport.prompt_version} · {t('費用', 'Cost')}: NT${visibleReport.usage.cost_twd}</p>
      </section>}
      {!visibleReport && <LifeBlueprintNavigator report={null} locale={locale} />}
      {!compactPage && <section className={panel}>
        <h2 className="mb-4 text-xl">{t('資料管理', 'Data management')}</h2>
        <p>{t('生日僅提供你本人存取。可刪除本系統的出生資料與報告，不影響其他命理系統或訂單紀錄。', 'Only your account can access your birth data. You may delete your Dreamspell profiles and reports without changing other systems or order records.')}</p>
        <label className="my-4 flex gap-3"><input type="checkbox" checked={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.checked)} />{t('我確認申請刪除我的 Dreamspell 資料。', 'I confirm deletion of my Dreamspell data.')}</label>
        <button className={button} disabled={busy || !deleteConfirm} onClick={() => void action(async (isCurrent) => {
          await mayaApi.deleteData(locale);
          if (!isCurrent()) return;
          setProfiles([]); setReports([]); setReport(null); setBirthDate(''); setPartnerDate(''); setDeleteConfirm(false);
          setNotice(t('你的 Dreamspell 個人資料與報告已刪除。', 'Your Dreamspell profiles and reports were deleted.'));
        })}>{t('確認刪除', 'Confirm deletion')}</button>
      </section>}
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
