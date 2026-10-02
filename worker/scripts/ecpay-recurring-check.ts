import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import {
  buildEcpayBrowserReturnUrls,
  buildAioCheckOutForm,
  checkoutReturnPath,
  computeEcpayCheckMac,
  normalizeCheckoutLocale,
  normalizeCheckoutReturnTo,
  paymentBillingConfigForProduct,
  SPREAD_CATALOG,
} from '../src/ecpay';
import { checkoutResult } from '../src/checkout';
import { getCheckoutLocaleFromPath } from '../../app/src/lib/i18n';
import {
  addEcpayBillingPeriod,
  buildRecurringIdempotencyKey,
  createPendingMembershipSubscription,
  decideTarotEntitlement,
  getMembershipSummary,
  handleMembershipRecurringCallback,
  hasActiveTarotSubscription,
  markMembershipFirstPaymentPaid,
  recurringBillingCycle,
  validateTarotRecurringParameters,
} from '../src/subscriptions';
import { TAROT_DECK_CATALOG, TAROT_SPREADS, TAROT_SUBSCRIPTION } from '../src/tarotCatalog';
import type { Env } from '../src/utils';

async function main() {
const here = dirname(fileURLToPath(import.meta.url));

const recurring = paymentBillingConfigForProduct(
  TAROT_SUBSCRIPTION.id,
  TAROT_SUBSCRIPTION.amount,
  'https://api.crystalfield101.com/api/payments/ecpay/tarot-period-return',
);
assert.equal(recurring.billingType, 'recurring');
assert.equal(recurring.periodAmount, 600);
assert.equal(recurring.periodType, 'M');
assert.equal(recurring.frequency, 1);
assert.equal(recurring.execTimes, 99);

const recurringForm = await buildAioCheckOutForm({
  merchantId: '3002607', hashKey: 'test-hash-key-not-a-secret', hashIV: 'test-hash-iv',
  merchantTradeNo: '20260831000000ABCDEF', amount: 600,
  itemName: TAROT_SUBSCRIPTION.name, tradeDesc: TAROT_SUBSCRIPTION.name,
  returnURL: 'https://api.crystalfield101.com/api/ecpay-webhook',
  clientBackURL: 'https://crystalfield101.com/checkout/return',
  orderResultURL: 'https://api.crystalfield101.com/api/checkout/result',
  ...recurring,
});
assert.equal(recurringForm.fields.PeriodAmount, '600');
assert.equal(recurringForm.fields.PeriodType, 'M');
assert.equal(recurringForm.fields.Frequency, '1');
assert.equal(recurringForm.fields.ExecTimes, '99');
assert.equal(recurringForm.fields.PeriodReturnURL, 'https://api.crystalfield101.com/api/payments/ecpay/tarot-period-return');
assert.equal(recurringForm.fields.Language, undefined, 'Chinese checkout should use ECPay default Traditional Chinese');
assert.equal(normalizeCheckoutLocale('zh-TW'), 'zh-TW');
assert.equal(normalizeCheckoutLocale('en'), 'en');
assert.equal(getCheckoutLocaleFromPath('/oracle'), 'zh-TW');
assert.equal(getCheckoutLocaleFromPath('/en/oracle'), 'en');
assert.equal(getCheckoutLocaleFromPath('/en/numerology'), 'en');
assert.equal(getCheckoutLocaleFromPath('/en/human-design'), 'en');
assert.equal(getCheckoutLocaleFromPath('/en/vedic-astrology'), 'en');
assert.equal(normalizeCheckoutLocale('ENG'), 'zh-TW', 'raw ECPay language values must not be accepted as locales');
assert.equal(normalizeCheckoutLocale('invalid'), 'zh-TW', 'invalid locales should fall back to Traditional Chinese');
assert.equal(checkoutReturnPath('zh-TW'), '/checkout/return');
assert.equal(checkoutReturnPath('en'), '/en/checkout/return');
assert.equal(normalizeCheckoutReturnTo('/en/oracle?spread=celtic#reading', 'en'), '/en/oracle?spread=celtic#reading');
assert.equal(normalizeCheckoutReturnTo('/numerology?section=forecast', 'zh-TW'), '/numerology?section=forecast');
assert.equal(normalizeCheckoutReturnTo('https://evil.example/steal', 'en'), '/en');
assert.equal(normalizeCheckoutReturnTo('//evil.example/steal', 'en'), '/en');
assert.equal(normalizeCheckoutReturnTo('/oracle', 'en'), '/en');
assert.equal(normalizeCheckoutReturnTo('/en/oracle', 'zh-TW'), '/');
const serviceReturnUrls = buildEcpayBrowserReturnUrls({
  apiOrigin: 'https://api.crystalfield101.com',
  frontendOrigin: 'https://crystalfield101.com',
  locale: 'en',
  orderId: 'order-service-test',
  orderToken: 'signed-order-token',
  returnTo: '/en/human-design?upgrade=2',
});
assert.equal(
  new URL(serviceReturnUrls.clientBackURL).pathname,
  '/en/checkout/return',
  'ClientBackURL must use the customer-facing localized result route',
);
assert.equal(new URL(serviceReturnUrls.clientBackURL).searchParams.get('return_to'), '/en/human-design?upgrade=2');
assert.equal(new URL(serviceReturnUrls.orderResultURL).pathname, '/api/checkout/result');
assert.equal(new URL(serviceReturnUrls.orderResultURL).searchParams.get('locale'), 'en');
assert.equal(new URL(serviceReturnUrls.orderResultURL).searchParams.get('return_to'), '/en/human-design?upgrade=2');

const localeTestHashKey = 'test-locale-hash-key';
const localeTestHashIV = 'test-locale-hash-iv';
const englishForm = await buildAioCheckOutForm({
  merchantId: '3002607', hashKey: localeTestHashKey, hashIV: localeTestHashIV,
  merchantTradeNo: '20260831000000ENGLISH', amount: 199,
  itemName: 'Test reading', tradeDesc: 'Test reading',
  returnURL: 'https://api.example.test/api/ecpay-webhook',
  clientBackURL: 'https://crystalfield101.com/en/checkout/return?order_id=test&return_to=%2Fen%2Foracle%3Fspread%3Dceltic',
  orderResultURL: 'https://api.example.test/api/checkout/result?locale=en&return_to=%2Fen%2Foracle%3Fspread%3Dceltic',
  locale: normalizeCheckoutLocale('en'),
});
assert.equal(englishForm.fields.Language, 'ENG');
assert.equal(englishForm.fields.ClientBackURL, 'https://crystalfield101.com/en/checkout/return?order_id=test&return_to=%2Fen%2Foracle%3Fspread%3Dceltic');
assert.equal(englishForm.fields.OrderResultURL, 'https://api.example.test/api/checkout/result?locale=en&return_to=%2Fen%2Foracle%3Fspread%3Dceltic');
const englishFieldsToSign = { ...englishForm.fields };
delete englishFieldsToSign.CheckMacValue;
assert.equal(
  englishForm.fields.CheckMacValue,
  await computeEcpayCheckMac(englishFieldsToSign, localeTestHashKey, localeTestHashIV),
  'CheckMacValue must be calculated after adding Language',
);
const englishFieldsWithoutLanguage = { ...englishFieldsToSign };
delete englishFieldsWithoutLanguage.Language;
assert.notEqual(
  englishForm.fields.CheckMacValue,
  await computeEcpayCheckMac(englishFieldsWithoutLanguage, localeTestHashKey, localeTestHashIV),
  'Language must be covered by CheckMacValue',
);
assert.equal(englishForm.fields.ReturnURL, 'https://api.example.test/api/ecpay-webhook');

const chineseForm = await buildAioCheckOutForm({
  merchantId: '3002607', hashKey: localeTestHashKey, hashIV: localeTestHashIV,
  merchantTradeNo: '20260831000000CHINESE', amount: 199,
  itemName: 'Test reading', tradeDesc: 'Test reading',
  returnURL: 'https://api.example.test/api/ecpay-webhook',
  clientBackURL: 'https://crystalfield101.com/checkout/return?order_id=test',
  orderResultURL: 'https://api.example.test/api/checkout/result?locale=zh-TW',
  locale: normalizeCheckoutLocale('zh-TW'),
});
assert.equal(chineseForm.fields.Language, undefined);
assert.equal(chineseForm.fields.ClientBackURL, 'https://crystalfield101.com/checkout/return?order_id=test');

const localeResultEnv = {
  ALLOWED_ORIGINS: 'https://crystalfield101.com',
  JWT_SECRET: 'test-checkout-locale-secret',
  DB: {
    prepare: () => ({
      bind: () => ({ first: async () => ({ id: 'order-locale-test', email: 'buyer@example.test' }) }),
    }),
  },
} as unknown as Env;
async function checkoutResultLocation(locale: string, returnTo?: string, merchantTradeNo = '20260831000000ENGLISH'): Promise<string> {
  const resultUrl = new URL('https://api.example.test/api/checkout/result');
  resultUrl.searchParams.set('locale', locale);
  if (returnTo) resultUrl.searchParams.set('return_to', returnTo);
  const request = new Request(resultUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: merchantTradeNo ? new URLSearchParams({ MerchantTradeNo: merchantTradeNo }).toString() : '',
  });
  const response = await checkoutResult(request, localeResultEnv);
  assert.equal(response.status, 302);
  return response.headers.get('Location') ?? '';
}
assert.equal(new URL(await checkoutResultLocation('en')).pathname, '/en/checkout/return');
assert.equal(new URL(await checkoutResultLocation('zh-TW')).pathname, '/checkout/return');
assert.equal(new URL(await checkoutResultLocation('invalid')).pathname, '/checkout/return');
const englishResultUrl = new URL(await checkoutResultLocation('en', '/en/vedic-astrology?section=full&chart_id=chart-123'));
assert.equal(englishResultUrl.searchParams.get('return_to'), '/en/vedic-astrology?section=full&chart_id=chart-123');
const blockedResultUrl = new URL(await checkoutResultLocation('en', 'https://evil.example/steal'));
assert.equal(blockedResultUrl.searchParams.get('return_to'), '/en');
const missingTradeResultUrl = new URL(await checkoutResultLocation('en', '/en/oracle?spread=celtic', ''));
assert.equal(missingTradeResultUrl.pathname, '/en/checkout/return');
assert.equal(missingTradeResultUrl.searchParams.get('return_to'), '/en/oracle?spread=celtic');

for (const productId of ['tarot_monthly_600', 'numerology_basic', 'human_design_basic', 'vedic_complete']) {
  const product = SPREAD_CATALOG[productId];
  const form = await buildAioCheckOutForm({
    merchantId: '3002607', hashKey: localeTestHashKey, hashIV: localeTestHashIV,
    merchantTradeNo: `20260831${productId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`.slice(0, 20),
    amount: product.amount, itemName: product.name, tradeDesc: product.name,
    returnURL: 'https://api.example.test/api/ecpay-webhook',
    clientBackURL: 'https://crystalfield101.com/en/checkout/return?return_to=%2Fen%2Foracle',
    orderResultURL: 'https://api.example.test/api/checkout/result?locale=en&return_to=%2Fen%2Foracle',
    locale: 'en',
  });
  assert.equal(form.fields.Language, 'ENG', `${productId} must use English ECPay UI`);
  const fields = { ...form.fields };
  delete fields.CheckMacValue;
  assert.equal(form.fields.CheckMacValue, await computeEcpayCheckMac(fields, localeTestHashKey, localeTestHashIV));
}

for (const productId of Object.keys(SPREAD_CATALOG).filter((id) => id !== TAROT_SUBSCRIPTION.id)) {
  const product = SPREAD_CATALOG[productId];
  const billing = paymentBillingConfigForProduct(productId, product.amount, 'https://example.test/period');
  assert.equal(billing.billingType, 'one_time', `${productId} must stay one-time`);
  const form = await buildAioCheckOutForm({
    merchantId: '3002607', hashKey: 'test-hash-key-not-a-secret', hashIV: 'test-hash-iv',
    merchantTradeNo: `20260831${productId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`.slice(0, 20),
    amount: product.amount, itemName: product.name, tradeDesc: product.name,
    returnURL: 'https://example.test/return', clientBackURL: 'https://example.test/back',
    ...billing,
  });
  for (const field of ['PeriodAmount', 'PeriodType', 'Frequency', 'ExecTimes', 'PeriodReturnURL']) {
    assert.equal(form.fields[field], undefined, `${productId} unexpectedly includes ${field}`);
  }
}
assert.equal(SPREAD_CATALOG.numerology_basic.amount, 199);
assert.equal(SPREAD_CATALOG.human_design_basic.amount, 199);

assert.equal(
  addEcpayBillingPeriod('2026-01-31T02:00:00.000Z', 'M', 1, 31),
  '2026-02-28T02:00:00.000Z',
);
assert.equal(
  addEcpayBillingPeriod('2026-02-28T02:00:00.000Z', 'M', 1, 31),
  '2026-03-31T02:00:00.000Z',
);
assert.equal(recurringBillingCycle({ RtnCode: '1', TotalSuccessTimes: '2' }), 2);
assert.equal(recurringBillingCycle({ RtnCode: '10100058', TotalSuccessTimes: '2' }), 3);
const replay = { MerchantTradeNo: '20260831000000ABCDEF', RtnCode: '1', Gwsr: '123', TotalSuccessTimes: '2' };
assert.equal(buildRecurringIdempotencyKey(replay, 2), buildRecurringIdempotencyKey(replay, 2));
assert.notEqual(buildRecurringIdempotencyKey(replay, 2), buildRecurringIdempotencyKey({ ...replay, Gwsr: '124' }, 2));
assert.equal(validateTarotRecurringParameters({ TradeAmt: '600', PeriodType: 'M', Frequency: '1', ExecTimes: '99' }, 'first'), null);
assert.equal(validateTarotRecurringParameters({ Amount: '599', PeriodType: 'M', Frequency: '1' }, 'recurring'), 'Amount mismatch');

const miniflare = new Miniflare({
  modules: true,
  script: `export default { fetch() { return new Response('ok') } }`,
  compatibilityDate: '2026-04-24',
  d1Databases: { DB: 'tarot-recurring-test' },
});
const db = await miniflare.getD1Database('DB');
try {
await db.exec(`CREATE TABLE profiles (id TEXT PRIMARY KEY, email TEXT);`);
await db.exec(`CREATE TABLE events (id TEXT PRIMARY KEY, user_id TEXT, event_type TEXT NOT NULL, created_at TEXT NOT NULL, meta TEXT NOT NULL);`);
for (const file of ['008_subscriptions.sql', '021_tarot_recurring_billing.sql']) {
  const sql = (await readFile(resolve(here, `../../d1/migrations/${file}`), 'utf8')).replace(/--.*$/gm, '');
  for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
    await db.prepare(statement).run();
  }
}
const env = { DB: db } as unknown as Env;
const userId = 'user-recurring-test';
const merchantTradeNo = '20260831000000ABCDEF';

assert.equal(
  await hasActiveTarotSubscription(env, 'success-url-only-user'),
  false,
  'a success URL without a verified D1 subscription must not unlock tarot',
);
await createPendingMembershipSubscription(env, {
  userId,
  email: 'member@example.test',
  orderId: 'order-recurring-test',
  merchantTradeNo,
  amount: 600,
});
assert.equal(
  await hasActiveTarotSubscription(env, userId),
  false,
  'client/localStorage state cannot turn a pending D1 subscription into an entitlement',
);

const firstParams = {
  MerchantTradeNo: merchantTradeNo, RtnCode: '1', RtnMsg: 'Succeeded', TradeAmt: '600',
  PeriodAmount: '600', PeriodType: 'M', Frequency: '1', ExecTimes: '99',
  TradeNo: '260831000000001', PaymentDate: '2099/01/31 10:00:00',
};
await markMembershipFirstPaymentPaid(env, {
  id: 'order-recurring-test', user_id: userId, merchant_trade_no: merchantTradeNo, amount: 600,
}, firstParams);
await markMembershipFirstPaymentPaid(env, {
  id: 'order-recurring-test', user_id: userId, merchant_trade_no: merchantTradeNo, amount: 600,
}, firstParams);
let chargeCount = await db.prepare('SELECT COUNT(*) AS count FROM subscription_charges').first<{ count: number }>();
assert.equal(chargeCount?.count, 1, 'first callback replay must not duplicate payment history');

const secondParams = {
  MerchantTradeNo: merchantTradeNo, RtnCode: '1', RtnMsg: 'Success', Amount: '600',
  PeriodAmount: '600', PeriodType: 'M', Frequency: '1', ExecTimes: '99', TotalSuccessTimes: '2',
  TotalSuccessAmount: '1200', Gwsr: '2002', ProcessDate: '2099/02/28 10:00:00',
};
await handleMembershipRecurringCallback(env, secondParams);
await handleMembershipRecurringCallback(env, secondParams);
chargeCount = await db.prepare('SELECT COUNT(*) AS count FROM subscription_charges').first<{ count: number }>();
assert.equal(chargeCount?.count, 2, 'renewal callback replay must not duplicate payment history');

let membership = await getMembershipSummary(env, userId);
assert.equal(membership?.status, 'active');
assert.equal(membership?.current_period_end, '2099-03-31T02:00:00.000Z');
assert.equal(membership?.total_success_amount, 1200);

const failedParams = {
  MerchantTradeNo: merchantTradeNo, RtnCode: '10100058', RtnMsg: 'Declined', Amount: '600',
  PeriodAmount: '600', PeriodType: 'M', Frequency: '1', ExecTimes: '99', TotalSuccessTimes: '2',
  Gwsr: '3003', ProcessDate: '2099/03/31 10:00:00',
};
await handleMembershipRecurringCallback(env, failedParams);
await handleMembershipRecurringCallback(env, failedParams);
membership = await getMembershipSummary(env, userId);
assert.equal(membership?.status, 'payment_failed');
chargeCount = await db.prepare('SELECT COUNT(*) AS count FROM subscription_charges').first<{ count: number }>();
assert.equal(chargeCount?.count, 3, 'failed callback replay must remain idempotent');

const recoveredParams = {
  ...failedParams, RtnCode: '1', RtnMsg: 'Success', TotalSuccessTimes: '3', TotalSuccessAmount: '1800', Gwsr: '3004',
};
await handleMembershipRecurringCallback(env, recoveredParams);
membership = await getMembershipSummary(env, userId);
assert.equal(membership?.status, 'active');
assert.equal(membership?.total_success_times, 3);
assert.equal(membership?.total_success_amount, 1800);
chargeCount = await db.prepare('SELECT COUNT(*) AS count FROM subscription_charges').first<{ count: number }>();
assert.equal(chargeCount?.count, 4, 'failed attempt and later successful payment must both remain in history');

await db.prepare(`UPDATE subscriptions SET status = 'cancelled', cancel_requested = 1 WHERE user_id = ?`).bind(userId).run();
assert.equal(await hasActiveTarotSubscription(env, userId), true, 'cancel must preserve the already-paid current period');
const chargeCountAfterCancel = await db.prepare('SELECT COUNT(*) AS count FROM subscription_charges').first<{ count: number }>();
assert.equal(chargeCountAfterCancel?.count, 4, 'cancel must not delete payment history');

assert.equal(TAROT_DECK_CATALOG.length, 7);
assert.equal(Object.keys(TAROT_SPREADS).length, 16);
assert(TAROT_DECK_CATALOG.every((deck) => deck.spreads.every((spread) => TAROT_SPREADS[spread.id])));
assert.equal(decideTarotEntitlement({
  planCode: TAROT_SUBSCRIPTION.id,
  status: 'active',
  currentPeriodEnd: '2099-01-01T00:00:00.000Z',
  latestPaymentStatus: 'paid',
}), true);
assert.equal(decideTarotEntitlement({
  planCode: TAROT_SUBSCRIPTION.id,
  status: 'active',
  currentPeriodEnd: '2099-01-01T00:00:00.000Z',
  latestPaymentStatus: 'failed',
}), false);

} finally {
  await miniflare.dispose();
}
console.log('ECPay tarot recurring billing, idempotency, entitlement and one-time regressions: passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
