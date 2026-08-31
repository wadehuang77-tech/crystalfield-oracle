import { TAROT_SUBSCRIPTION } from './tarotCatalog';

export type SpreadBundleCategory = 'three_card' | 'ten_card' | 'pastlife';

export interface BundleGrant {
  three_card: number;
  ten_card: number;
  pastlife: number;
  days: number;
}

export interface SpreadCatalogItem {
  id: string;
  name: string;
  amount: number;
  category?: SpreadBundleCategory;
  bundle?: BundleGrant;
}

export const SPREAD_CATALOG: Record<string, SpreadCatalogItem> = {
  // ── 塔羅全館唯一付費方案 ──────────────────────────────────────
  [TAROT_SUBSCRIPTION.id]: {
    id: TAROT_SUBSCRIPTION.id,
    name: TAROT_SUBSCRIPTION.name,
    amount: TAROT_SUBSCRIPTION.amount,
  },
  // ── 生命靈數方案 ────────────────────────────────────────────────
  numerology_basic:    { id: 'numerology_basic',    name: '生命靈數 基礎版',     amount: 199 },
  numerology_advanced: { id: 'numerology_advanced', name: '生命靈數 進階版',     amount: 499 },
  numerology_full:     { id: 'numerology_full',     name: '生命靈數 完整靈魂版', amount: 10 },
  numerology_forecast: { id: 'numerology_forecast', name: '生命靈數 完整流年報告', amount: 499 },
  // ── 人類圖方案 ────────────────────────────────────────────────
  human_design_basic: { id: 'human_design_basic', name: '我的人類圖核心解析', amount: 199 },
  human_design_full: { id: 'human_design_full', name: '人類圖 專屬人生使用說明書', amount: 399 },
  human_design_bundle: { id: 'human_design_bundle', name: '人類圖核心解析 + 專屬人生使用說明書', amount: 489 },
  // ── 印度占星 ──────────────────────────────────────────────────
  vedic_career: { id: 'vedic_career', name: '印度占星｜我的財富與事業', amount: 399 },
  vedic_relationship: { id: 'vedic_relationship', name: '印度占星｜我的感情與婚姻', amount: 399 },
  vedic_karma: { id: 'vedic_karma', name: '印度占星｜我的前世業力', amount: 399 },
  vedic_timeline: { id: 'vedic_timeline', name: '印度占星｜我的未來十年', amount: 399 },
  vedic_full: { id: 'vedic_full', name: '印度占星｜完整靈魂業力人生地圖', amount: 699 },
  vedic_soul_karma: { id: 'vedic_soul_karma', name: '印度占星｜靈魂業力', amount: 499 },
  vedic_life_full: { id: 'vedic_life_full', name: '印度占星｜人生全解', amount: 499 },
  vedic_complete: { id: 'vedic_complete', name: '印度占星｜完整人生地圖', amount: 699 },
};

function phpStyleUrlEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/'/g, '%27')
    .replace(/~/g, '%7E')
    .replace(/%20/g, '+');
}

export async function computeEcpayCheckMac(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string,
): Promise<string> {
  const entries = Object.entries(params)
    .filter(([k]) => k !== 'CheckMacValue')
    .sort(([a], [b]) => {
      const al = a.toLowerCase();
      const bl = b.toLowerCase();
      return al < bl ? -1 : al > bl ? 1 : 0;
    });

  const query = entries.map(([k, v]) => `${k}=${v}`).join('&');
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;

  let encoded = phpStyleUrlEncode(raw).toLowerCase();

  const ecpayReplacements: Record<string, string> = {
    '%2d': '-',
    '%5f': '_',
    '%2e': '.',
    '%21': '!',
    '%2a': '*',
    '%28': '(',
    '%29': ')',
  };
  for (const [from, to] of Object.entries(ecpayReplacements)) {
    encoded = encoded.split(from).join(to);
  }

  const buf = new TextEncoder().encode(encoded);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export interface AioCheckOutInput {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  merchantTradeNo: string;
  amount: number;
  itemName: string;
  tradeDesc: string;
  returnURL: string;
  clientBackURL: string;
  orderResultURL?: string;
  paymentType?: string;
  choosePayment?: string;
  periodAmount?: number;
  periodType?: 'D' | 'M' | 'Y';
  frequency?: number;
  execTimes?: number;
  periodReturnURL?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
}

export interface AioCheckOutForm {
  endpoint: string;
  fields: Record<string, string>;
}

const STAGE_ENDPOINT = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
const PROD_ENDPOINT  = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';

export function ecpayEndpoint(envName: string | undefined): string {
  return envName === 'stage' ? STAGE_ENDPOINT : PROD_ENDPOINT;
}

export function ecpayDateNow(): string {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
  ].join('/') + ' ' + [
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join(':');
}

export async function buildAioCheckOutForm(
  input: AioCheckOutInput,
  envName?: string,
): Promise<AioCheckOutForm> {
  const fields: Record<string, string> = {
    MerchantID:        input.merchantId,
    MerchantTradeNo:   input.merchantTradeNo,
    MerchantTradeDate: ecpayDateNow(),
    PaymentType:       input.paymentType ?? 'aio',
    TotalAmount:       String(input.amount),
    TradeDesc:         input.tradeDesc.slice(0, 200),
    ItemName:          input.itemName.slice(0, 400),
    ReturnURL:         input.returnURL,
    ChoosePayment:     input.choosePayment ?? 'ALL',
    ClientBackURL:     input.clientBackURL,
    EncryptType:       '1',
  };
  if (input.orderResultURL) fields.OrderResultURL = input.orderResultURL;
  if (input.periodAmount !== undefined) fields.PeriodAmount = String(input.periodAmount);
  if (input.periodType) fields.PeriodType = input.periodType;
  if (input.frequency !== undefined) fields.Frequency = String(input.frequency);
  if (input.execTimes !== undefined) fields.ExecTimes = String(input.execTimes);
  if (input.periodReturnURL) fields.PeriodReturnURL = input.periodReturnURL;
  if (input.customField1) fields.CustomField1 = input.customField1;
  if (input.customField2) fields.CustomField2 = input.customField2;
  if (input.customField3) fields.CustomField3 = input.customField3;
  if (input.customField4) fields.CustomField4 = input.customField4;

  fields.CheckMacValue = await computeEcpayCheckMac(fields, input.hashKey, input.hashIV);

  return {
    endpoint: ecpayEndpoint(envName),
    fields,
  };
}

export function makeMerchantTradeNo(): string {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  const ymd = pad(now.getUTCFullYear(), 4) +
              pad(now.getUTCMonth() + 1) +
              pad(now.getUTCDate());
  const hms = pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds());
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  const rand = Array.from(buf, (b) => ALPHA[b % 32]).join('');
  return ymd + hms + rand;
}

export function ecpayServerApiBase(envName: string | undefined): string {
  return envName === 'stage'
    ? 'https://payment-stage.ecpay.com.tw'
    : 'https://payment.ecpay.com.tw';
}

export interface CreditPeriodQueryResult {
  MerchantID: string;
  MerchantTradeNo: string;
  TradeNo?: string;
  RtnCode: number | string;
  PeriodType?: 'D' | 'M' | 'Y';
  Frequency?: number | string;
  ExecTimes?: number | string;
  PeriodAmount?: number | string;
  amount?: number | string;
  gwsr?: number | string;
  process_date?: string;
  auth_code?: string;
  card4no?: string;
  card6no?: string;
  TotalSuccessTimes?: number | string;
  TotalSuccessAmount?: number | string;
  ExecStatus?: string;
  ExecLog?: Array<{
    RtnCode?: number | string;
    amount?: number | string;
    gwsr?: number | string;
    process_date?: string;
    auth_code?: string;
    TradeNo?: string;
  }>;
}

export interface CreditPeriodActionResult {
  RtnCode: number | string;
  RtnMsg?: string;
  MerchantID?: string;
  MerchantTradeNo?: string;
  CheckMacValue?: string;
}

function encodeFormBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function parseEcpayApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const parsed = Object.fromEntries(new URLSearchParams(text).entries());
    return parsed as T;
  }
}

export async function queryCreditPeriodInfo(input: {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  merchantTradeNo: string;
  envName?: string;
}): Promise<CreditPeriodQueryResult> {
  const endpoint = `${ecpayServerApiBase(input.envName)}/Cashier/QueryCreditCardPeriodInfo`;
  const params: Record<string, string> = {
    MerchantID: input.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
  };
  params.CheckMacValue = await computeEcpayCheckMac(params, input.hashKey, input.hashIV);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeFormBody(params),
  });
  if (!res.ok) {
    throw new Error(`ECPay query failed: HTTP ${res.status}`);
  }
  return parseEcpayApiResponse<CreditPeriodQueryResult>(res);
}

export async function creditPeriodAction(input: {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  merchantTradeNo: string;
  action: 'Cancel' | 'ReAuth';
  envName?: string;
}): Promise<CreditPeriodActionResult> {
  const endpoint = `${ecpayServerApiBase(input.envName)}/Cashier/CreditCardPeriodAction`;
  const params: Record<string, string> = {
    MerchantID: input.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    Action: input.action,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
  };
  params.CheckMacValue = await computeEcpayCheckMac(params, input.hashKey, input.hashIV);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeFormBody(params),
  });
  if (!res.ok) {
    throw new Error(`ECPay action failed: HTTP ${res.status}`);
  }
  return parseEcpayApiResponse<CreditPeriodActionResult>(res);
}
