import { useEffect, useState } from 'react';
import { mayaApi, mayaProApi, mayaRelationshipApi } from '../lib/api';
import type { MayaLocale } from '../lib/maya';
import { MAYA_PRO_PRODUCT } from '../lib/mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from '../lib/mayaRelationship';
import type { MayaUnlockProduct } from '../lib/mayaUnlock';

export default function useMayaPaymentReturn(userId: string | undefined, locale: MayaLocale, orderId: string | null, product?: MayaUnlockProduct) {
  const identity = JSON.stringify([userId, locale, orderId, product]);
  const [result, setResult] = useState<{ identity: string; status: string; accessId: string | null; product: MayaUnlockProduct | null; error: string } | null>(null);
  useEffect(() => {
    if (!userId || !orderId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const fail = locale === 'en' ? 'Payment confirmation failed. No report was generated.' : '無法確認付款，尚未生成報告。';
    async function poll() {
      try {
        const order = await mayaApi.checkoutStatus(orderId!, locale, controller.signal);
        if (controller.signal.aborted) return;
        if (order.order_id !== orderId || order.locale !== locale || product && order.product_code !== product) {
          throw new Error(locale === 'en' ? 'The returned order does not match this report.' : '返回訂單與此報告不符。');
        }
        let accessId: string | null = null;
        if (order.status === 'paid') {
          const api = order.product_code === MAYA_PRO_PRODUCT.code ? mayaProApi
            : order.product_code === MAYA_RELATIONSHIP_PRODUCT.code ? mayaRelationshipApi : mayaApi;
          const grants = await api.entitlements(locale, controller.signal);
          accessId = grants.entitlements.find(grant => grant.order_id === orderId && grant.product_code === order.product_code)?.id ?? null;
        }
        if (controller.signal.aborted) return;
        const waiting = order.status === 'pending' || order.status === 'paid' && !accessId;
        const exhausted = waiting && ++attempts >= 30;
        setResult({ identity, status: waiting ? 'pending' : order.status, accessId, product: order.product_code,
          error: exhausted ? locale === 'en' ? 'Payment confirmation is still pending. Refresh later; do not pay again.' : '付款仍待後端確認，請稍後重新整理，勿重複付款。' : '' });
        if (waiting && !exhausted) timer = setTimeout(() => void poll(), 2000);
      } catch (cause) {
        if (!controller.signal.aborted) setResult({ identity, status: 'error', accessId: null, product: product ?? null,
          error: cause instanceof Error ? cause.message : fail });
      }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [identity, userId, locale, orderId, product]);
  return result?.identity === identity ? result : null;
}
