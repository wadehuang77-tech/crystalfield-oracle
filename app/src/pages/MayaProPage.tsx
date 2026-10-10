import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mayaApi, mayaProApi } from '../lib/api';
import { calculationLoginRedirect, localizeAuthError } from '../lib/authLocale';
import { getLanguageFromPath, getLocalizedPath } from '../lib/i18n';
import { MAYA_PRO_PRODUCT, validateMayaProReport, type MayaProReport } from '../lib/mayaPro';
import type { MayaProfile } from '../lib/maya';
import MayaProReportView from '../components/maya/MayaProReportView';
import '../components/maya/mayaVisualization.css';
import { submitMayaCheckout } from '../lib/mayaCheckout';
import MayaPremiumReportManager from '../components/maya/MayaPremiumReportManager';
import MayaPremiumProductIntro from '../components/maya/MayaPremiumProductIntro';
import { mayaPremiumCopy } from '../lib/mayaPremiumCopy';

export default function MayaProPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const language = getLanguageFromPath(location.pathname);
  const locale = language === 'en' ? 'en' : 'zh-TW';
  const en = locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const [enabled, setEnabled] = useState(false);
  const [configReady, setConfigReady] = useState(false);
  const [payment, setPayment] = useState(false);
  const [localMock, setLocalMock] = useState(false);
  const [liveAi, setLiveAi] = useState(false);
  const [orderStatus, setOrderStatus] = useState('');
  const checkoutKey = useRef<string | null>(null);
  const returnedOrder = new URLSearchParams(location.search).get('maya_order');
  const [data, setData] = useState<{ identity: string; report: MayaProReport | null; profile: MayaProfile | null; access: string | null; complimentary: boolean; reports: Array<{ id: string; status: string }> } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const identity = `${user?.id ?? ''}:${locale}:${id ?? ''}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const visible = data?.identity === identity ? data : null;
  useEffect(() => {
    const controller = new AbortController();
    setConfigReady(false); setEnabled(false); setPayment(false); setLiveAi(false); setError('');
    mayaProApi.config(controller.signal).then(config => {
      if (typeof config.enabled !== 'boolean' || typeof config.payment !== 'boolean' || !['local_mock_only', 'production_entitlement'].includes(config.mode)
        || typeof config.liveAi !== 'boolean' || (config.mode === 'local_mock_only' && (config.payment || config.liveAi))) throw new Error(en ? 'Invalid Pro configuration.' : 'Pro 設定不符。');
      if (!controller.signal.aborted) {
        setEnabled(config.enabled); setPayment(config.enabled && config.payment); setLiveAi(config.liveAi); setLocalMock(config.mode === 'local_mock_only'); setConfigReady(true);
      }
    }).catch(cause => { if (!controller.signal.aborted) setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, en ? 'Pro configuration could not be verified.' : '無法確認 Pro 設定。')); });
    return () => controller.abort();
  }, [language, en, user?.id]);
  useEffect(() => {
    if (configReady && !loading && !user) {
      const redirect = calculationLoginRedirect(false, location.pathname, location.search);
      if (redirect) navigate(redirect, { replace: true });
    }
  }, [configReady, loading, user, navigate, location.pathname, location.search]);
  useEffect(() => {
    setData(null); setOrderStatus(''); checkoutKey.current = null; setBusy(false);
    if (!user || !enabled) return;
    const controller = new AbortController();
    setBusy(true);
    Promise.all([mayaApi.profiles(locale, controller.signal), mayaProApi.entitlements(locale, controller.signal),
      mayaProApi.reports(locale, controller.signal), id ? mayaProApi.report(id, locale, controller.signal) : Promise.resolve(null),
      returnedOrder ? mayaApi.checkoutStatus(returnedOrder, locale, controller.signal) : Promise.resolve(null)])
      .then(([profiles, access, reports, selected, order]) => {
        if (controller.signal.aborted) return;
        if (order && order.product_code !== MAYA_PRO_PRODUCT.code) throw new Error(en ? 'This is not a Pro order.' : '這不是 Pro 訂單。');
        setOrderStatus(order?.status ?? '');
        if (selected?.report && !validateMayaProReport(selected.report, selected.report.kinNumber, locale)) throw new Error(en ? 'Invalid Pro report version or evidence.' : 'Pro 報告版本或依據不符。');
        setData({ identity, report: selected?.report ?? null, profile: profiles.profiles.find(item => item.role === 'personal') ?? null,
          access: access.entitlements[0]?.id ?? null, complimentary: access.entitlements[0]?.source === 'admin_complimentary', reports: reports.reports });
      }).catch(cause => { if (!controller.signal.aborted) setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, en ? 'Unable to load Pro data.' : '無法讀取 Pro 資料。')); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [identity, user, enabled, id, locale, language, en, returnedOrder]);

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-slate-100">
    <section className="maya-cosmic-panel">
      <MayaPremiumProductIntro kind="pro" locale={locale} available={configReady ? enabled && liveAi : null}>
      {liveAi && user && <a href="#maya-premium-pro" className="rounded-xl bg-cyan-300 px-4 py-3 text-center font-semibold text-slate-950">{mayaPremiumCopy('pro', locale).cta}</a>}
      {(!liveAi || !user) && <button type="button" className="mt-4 rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!configReady || !payment || busy || !user || !visible || !!visible.access}
        onClick={async () => {
          if (!payment || !visible || visible.access || busy) return;
          if (!window.confirm(liveAi ? t(`確認支付 NT$${MAYA_PRO_PRODUCT.price} 解鎖個人 Pro 報告？不自動續扣。`, `Pay NT$${MAYA_PRO_PRODUCT.price} to unlock your Pro report? No recurring billing.`)
            : t(`確認支付 NT$${MAYA_PRO_PRODUCT.price}？完整報告尚未開放，目前僅購買商品權限，無法立即取得解讀。`, `Pay NT$${MAYA_PRO_PRODUCT.price}? The full report is not available yet. This purchase grants access only, with no report available now.`))) return;
          const requestedIdentity = identity;
          checkoutKey.current ??= crypto.randomUUID();
          setBusy(true); setError('');
          try {
            const form = await mayaApi.checkout(MAYA_PRO_PRODUCT.code, locale, checkoutKey.current);
            if (identityRef.current === requestedIdentity) submitMayaCheckout(form, 'production');
          } catch (cause) {
            if (identityRef.current === requestedIdentity) setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, en ? 'Pro checkout failed.' : 'Pro 付款請求失敗。'));
          } finally { if (identityRef.current === requestedIdentity) setBusy(false); }
        }}>{visible?.complimentary ? `${t('管理者免費使用', 'Complimentary admin access')} · NT$${MAYA_PRO_PRODUCT.price}` : visible?.access ? `${t('已取得商品權限', 'Product access granted')} · NT$${MAYA_PRO_PRODUCT.price}` : mayaPremiumCopy('pro', locale).cta}</button>}
      </MayaPremiumProductIntro>
      {visible?.complimentary && <p>{t('管理者可免費使用此報告。', 'This report is complimentary for administrators.')}</p>}
      {configReady && !payment && <p>{t('Pro 付款尚未啟用。', 'Pro checkout is not enabled.')}</p>}
      <nav className="flex flex-wrap gap-4">
        <Link to={getLocalizedPath('/maya-calendar', language)}>{t('馬雅曆首頁', 'Maya Calendar home')}</Link>
        <Link to={getLocalizedPath(location.pathname.replace(/^\/en/, '').replace(/\/+$/, ''), en ? 'zh-Hant' : 'en')}>{en ? '繁體中文' : 'English'}</Link>
      </nav>
    </section>
    {error && <p role="alert">{error}</p>}
    {!configReady || loading ? <p role="status">{t('正在驗證 Pro 狀態…', 'Checking Pro availability...')}</p> : !user ? <p>{t('請使用既有會員登入。', 'Sign in with your existing account.')}</p> : !enabled ? <p>{t('Pro 目前僅供本地開發測試，正式功能尚未開放。', 'Pro is limited to local development tests and is not available in production.')}</p> : <>
      <p role="status">{busy ? t('讀取中…', 'Loading...') : localMock ? t('測試預覽，並非正式付費報告。', 'Test preview, not a paid report.') : liveAi ? t('你的報告可隨時回來閱讀。', 'Return anytime to read your saved report.') : t('完整報告尚未開放。', 'The full report is not available yet.')}</p>
      {!liveAi && orderStatus && <p role="status">{t('後端付款狀態', 'Server payment status')}: {orderStatus}
        {orderStatus === 'pending' && <button className="ml-3 underline" onClick={() => window.location.reload()}>{t('重新整理狀態（不重新付款）', 'Refresh status (does not charge again)')}</button>}
      </p>}
      {liveAi && visible && <MayaPremiumReportManager key={identity} kind="pro" locale={locale} userId={user.id} accessId={visible.access} selectedId={id}
        returnedOrder={returnedOrder} complimentary={visible.complimentary} payment={payment} />}
      {!liveAi && !visible?.report && <section className="maya-cosmic-panel">
        <p>{t('沒有可閱讀的已授權 Pro 報告。不會自動生成內容。', 'No authorized Pro report is available. Content is not generated automatically.')}</p>
        {localMock && <button className="rounded-xl bg-cyan-300 px-4 py-3 text-slate-950 disabled:opacity-50" type="button" disabled={busy || !visible?.profile || !visible.access}
          onClick={async () => {
            if (!visible?.profile || !visible.access) return;
            const requestedIdentity = identity;
            setBusy(true); setError('');
            try {
              const result = await mayaProApi.createReport(visible.profile.id, visible.access, locale);
              if (identityRef.current !== requestedIdentity) return;
              navigate(getLocalizedPath(`/maya-calendar/pro/reports/${result.id}`, language));
            } catch (cause) { if (identityRef.current === requestedIdentity) setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, en ? 'Pro Mock request failed.' : 'Pro Mock 請求失敗。')); }
            finally { if (identityRef.current === requestedIdentity) setBusy(false); }
          }}>{t('產生本地 Pro Mock（需獨立權限）', 'Generate local Pro Mock (separate entitlement required)')}</button>}
        {!visible?.access && <p>{t('此報告需另行解鎖。', 'This report requires a separate purchase.')}</p>}
      </section>}
      {!liveAi && <ul>{visible?.reports.map(entry => <li key={entry.id}><Link to={getLocalizedPath(`/maya-calendar/pro/reports/${entry.id}`, language)}>{t('Pro 歷史報告', 'Pro report history')} · {entry.status}</Link></li>)}</ul>}
      {!liveAi && visible?.report && <MayaProReportView key={identity} report={visible.report} />}
    </>}
  </main>;
}
