import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { mayaApi, mayaRelationshipApi } from '../lib/api';
import { getLanguageFromPath, getLocalizedPath } from '../lib/i18n';
import { MAYA_RELATIONSHIP_PRODUCT } from '../lib/mayaRelationship';
import { calculationLoginRedirect, localizeAuthError } from '../lib/authLocale';
import { useAuth } from '../contexts/AuthContext';
import { submitMayaCheckout } from '../lib/mayaCheckout';
import MayaPremiumReportManager from '../components/maya/MayaPremiumReportManager';
import MayaPremiumProductIntro from '../components/maya/MayaPremiumProductIntro';
import { mayaPremiumCopy } from '../lib/mayaPremiumCopy';

export default function MayaRelationshipPage() {
  const location = useLocation();
  const language = getLanguageFromPath(location.pathname);
  const en = language === 'en';
  const locale = en ? 'en' : 'zh-TW';
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [payment, setPayment] = useState(false);
  const [reportAvailable, setReportAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [member, setMember] = useState<{ identity: string; access: string | null; complimentary: boolean; orderStatus: string } | null>(null);
  const identity = `${user?.id ?? ''}:${locale}:${location.search}`;
  const current = useRef(identity); current.current = identity;
  const key = useRef<string | null>(null);
  const visible = member?.identity === identity ? member : null;
  const returnedOrder = new URLSearchParams(location.search).get('maya_order');
  useEffect(() => {
    const controller = new AbortController();
    setReady(false); setPayment(false); setReportAvailable(false); setError('');
    mayaRelationshipApi.config(en ? 'en' : 'zh-TW', controller.signal).then(config => {
      if (config.product?.code !== MAYA_RELATIONSHIP_PRODUCT.code || config.product.price !== MAYA_RELATIONSHIP_PRODUCT.price
        || typeof config.payment !== 'boolean' || typeof config.reportAvailable !== 'boolean') {
        throw new Error(en ? 'Invalid relationship product configuration.' : '雙人商品設定不符。');
      }
      if (!controller.signal.aborted) { setReady(true); setPayment(config.payment); setReportAvailable(config.reportAvailable); }
    }).catch(cause => {
      if (!controller.signal.aborted) setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, en ? 'Unable to verify product settings.' : '無法確認商品設定。'));
    });
    return () => controller.abort();
  }, [en, language]);
  useEffect(() => {
    setMember(null); setAccepted(false); key.current = null; setBusy(false);
    if (!user || !ready || !payment) return;
    const controller = new AbortController();
    setBusy(true);
    Promise.all([mayaRelationshipApi.entitlements(locale, controller.signal),
      returnedOrder ? mayaApi.checkoutStatus(returnedOrder, locale, controller.signal) : Promise.resolve(null)])
      .then(([access, order]) => {
        if (controller.signal.aborted) return;
        if (order && order.product_code !== MAYA_RELATIONSHIP_PRODUCT.code) throw new Error(en ? 'This is not a relationship order.' : '這不是新版雙人訂單。');
        const grant = access.entitlements.find(e => e.product_code === MAYA_RELATIONSHIP_PRODUCT.code);
        setMember({ identity, access: grant?.id ?? null, complimentary: grant?.source === 'admin_complimentary', orderStatus: order?.status ?? '' });
      }).catch(cause => {
        if (!controller.signal.aborted) setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, en ? 'Unable to verify member access.' : '無法確認會員權限。'));
      }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [user, ready, payment, identity, locale, en, language, returnedOrder]);
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-slate-100">
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-5 md:p-7" data-relationship-product={MAYA_RELATIONSHIP_PRODUCT.code}>
      <MayaPremiumProductIntro kind="relationship" locale={locale} available={ready ? reportAvailable : null}>
      {reportAvailable && user && <a href="#maya-premium-relationship" className="rounded-xl bg-cyan-300 px-4 py-3 text-center font-semibold text-slate-950">{mayaPremiumCopy('relationship', locale).cta}</a>}
      {!reportAvailable && payment && user && !visible?.access && <label className="my-4 flex items-start gap-3">
        <input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
        {en ? `I understand this is a NT$${MAYA_RELATIONSHIP_PRODUCT.price} purchase for access only, with no relationship report available now.`
          : `我了解這是 NT$${MAYA_RELATIONSHIP_PRODUCT.price} 購買，目前僅取得商品權限，尚無雙人報告可交付。`}
      </label>}
      {(!reportAvailable || !user) && <button disabled={!ready || !payment || loading || busy || (!!user && (!visible || !accepted || !!visible.access))}
        onClick={async () => {
          if (!user) {
            const redirect = calculationLoginRedirect(false, location.pathname, location.search);
            if (redirect) navigate(redirect);
            return;
          }
          if (!visible || visible.access || !accepted || busy || !payment) return;
          if (!window.confirm(reportAvailable ? en ? `Pay NT$${MAYA_RELATIONSHIP_PRODUCT.price} to unlock your relationship report?` : `確認支付 NT$${MAYA_RELATIONSHIP_PRODUCT.price} 解鎖雙人報告？`
            : en ? `Pay NT$${MAYA_RELATIONSHIP_PRODUCT.price} for access only? The full relationship report is not available yet.` : `確認支付 NT$${MAYA_RELATIONSHIP_PRODUCT.price}，僅購買商品權限？完整雙人報告尚未開放。`)) return;
          const requested = identity;
          key.current ??= crypto.randomUUID();
          setBusy(true); setError('');
          try {
            const form = await mayaApi.checkout(MAYA_RELATIONSHIP_PRODUCT.code, locale, key.current);
            if (current.current === requested) submitMayaCheckout(form, 'production');
          } catch (cause) {
            if (current.current === requested) setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, en ? 'Checkout failed. Please retry.' : '付款請求失敗，請重試。'));
          } finally { if (current.current === requested) setBusy(false); }
        }} className="rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
        {visible?.complimentary ? `${en ? 'Complimentary admin access' : '管理者免費使用'} · NT$${MAYA_RELATIONSHIP_PRODUCT.price}` : visible?.access ? `${en ? 'Product access granted' : '已取得商品權限'} · NT$${MAYA_RELATIONSHIP_PRODUCT.price}` : mayaPremiumCopy('relationship', locale).cta}
      </button>}
      </MayaPremiumProductIntro>
      {visible?.complimentary && <p>{en ? 'This report is complimentary for administrators.' : '管理者可免費使用此報告。'}</p>}
      {ready && !payment && <p>{en ? 'Checkout is not enabled.' : '付款尚未啟用。'}</p>}
      {!reportAvailable && visible?.orderStatus && <p role="status">{en ? 'Server payment status' : '後端付款狀態'}: {visible.orderStatus}
        {visible.orderStatus === 'pending' && <button className="ml-3 underline" onClick={() => window.location.reload()}>{en ? 'Refresh status (no new charge)' : '重新確認狀態（不重新扣款）'}</button>}
      </p>}
      {!ready && !error && <p role="status">{en ? 'Checking product settings...' : '正在確認商品設定…'}</p>}
      {error && <p role="alert">{error}</p>}
      <nav className="mt-5 flex flex-wrap gap-4">
        <Link to={getLocalizedPath('/maya-calendar/member', language)}>{en ? 'My Dreamspell profile' : '我的馬雅曆資料'}</Link>
        <Link to={getLocalizedPath('/maya-calendar', language)}>{en ? 'Maya Calendar home' : '馬雅曆首頁'}</Link>
        <Link to={getLocalizedPath('/maya-calendar/relationship', en ? 'zh-Hant' : 'en')}>{en ? '繁體中文' : 'English'}</Link>
      </nav>
    </section>
    {reportAvailable && user && visible && <MayaPremiumReportManager key={identity} kind="relationship"
      locale={locale} userId={user.id} accessId={visible.access} returnedOrder={returnedOrder}
      complimentary={visible.complimentary} payment={payment} />}
  </main>;
}
