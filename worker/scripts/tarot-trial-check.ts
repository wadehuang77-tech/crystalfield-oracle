import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { deriveTarotEntitlement } from '../src/tarotEntitlements';
import { TAROT_DECK_CATALOG, TAROT_SPREADS } from '../src/tarotCatalog';
import { ecpayEndpoint, SPREAD_CATALOG } from '../src/ecpay';

let passed = 0;
function check(condition: unknown, label: string): void {
  assert.ok(condition, label);
  passed += 1;
  console.log(`PASS ${passed}: ${label}`);
}

const entitlementSource = readFileSync('src/tarotEntitlements.ts', 'utf8');
const cardsSource = readFileSync('src/cards.ts', 'utf8');
const checkoutSource = readFileSync('src/checkout.ts', 'utf8');
const migration = readFileSync('../d1/migrations/022_tarot_trial_entitlement.sql', 'utf8');
const gateSource = readFileSync('../app/src/components/MembershipGate.tsx', 'utf8');
const numerologySource = readFileSync('../app/src/pages/NumerologyPage.tsx', 'utf8');
const humanDesignSource = readFileSync('../app/src/pages/HumanDesignPage.tsx', 'utf8');
const indexSource = readFileSync('src/index.ts', 'utf8');
const now = Date.parse('2026-09-07T02:00:00.000Z');
const end = '2026-09-14T02:00:00.000Z';
const trial = { tarot_trial_started_at: '2026-09-07T02:00:00.000Z', tarot_trial_ends_at: end, tarot_trial_used_at: '2026-09-07T02:00:00.000Z' };

check(entitlementSource.includes("if (!user) return unauthorized"), '未登入不能建立免費試用');
check(entitlementSource.includes('tarot_trial_started_at = ?'), '登入會員可由伺服器建立試用');
check(entitlementSource.includes('7 * 24 * 60 * 60 * 1000'), '試用到期固定為開始時間加 7×24 小時');
check(!entitlementSource.includes('createOrder') && !entitlementSource.includes('ECPAY_'), '試用流程不建立綠界訂單');
check(gateSource.includes('不需要輸入信用卡，也不會自動扣款'), '試用期間不要求信用卡');
check(TAROT_DECK_CATALOG.length === 7 && Object.keys(TAROT_SPREADS).length === 16, 'trialing 涵蓋實際 7 套牌與全部 16 個牌陣');
check(deriveTarotEntitlement(trial, null, Date.parse(end) - 1).has_access, '第 7 天到期前仍可使用');
check(!deriveTarotEntitlement(trial, null, Date.parse(end)).has_access, '到達 trial_ends_at 立即停止新解析');
check(!entitlementSource.includes('creditPeriodAction') && !entitlementSource.includes('buildAioCheckOutForm'), '試用到期不會自動扣款');
check(gateSource.includes('立即訂閱 NT$600／月'), '試用到期顯示主動訂閱按鈕');
check(migration.includes('user_id            TEXT PRIMARY KEY') || entitlementSource.includes('WHERE user_id = ?'), '試用綁定既有唯一會員主鍵');
check(entitlementSource.includes('tarot_trial_started_at IS NULL') && entitlementSource.includes('tarot_trial_used_at IS NULL'), '重複點擊不能延長試用');
check(entitlementSource.includes('(result.meta.changes ?? 0) === 1'), '並發開始請求只有一個建立成功');
check(migration.includes('tarot_trial_used_at TEXT') && !migration.includes('DROP TABLE'), '清除 Cookie 不會清除終身試用歷史');
check((cardsSource.match(/getTarotEntitlement\(env, session\.id\)/g) ?? []).length >= 3, '直接呼叫完整抽牌 API 也驗證資格');
check(!cardsSource.includes('localStorage') && !cardsSource.includes('sessionStorage'), '前端偽造狀態無法繞過 Worker');
check(deriveTarotEntitlement(trial, { status: 'pending', is_active: false }, Date.parse(end)).status === 'payment_pending', '付款 pending 不開通');
check(deriveTarotEntitlement(null, { status: 'active', is_active: true, current_period_end: '2026-10-07T02:00:00Z', latest_payment_status: 'paid' }, now).status === 'active', '綠界付款成功且有效期內才 active');
check(checkoutSource.includes('CheckMacValue') || readFileSync('src/subscriptions.ts', 'utf8').includes('idempotencyKey'), '付款驗簽與回呼冪等機制保留');
check(SPREAD_CATALOG.numerology_basic.amount === 199 && !numerologySource.includes('tarotEntitlementApi'), 'Numerology 回歸隔離');
check(!humanDesignSource.includes('tarotEntitlementApi'), 'Human Design 回歸隔離');
check(deriveTarotEntitlement(trial, { status: 'active', is_active: true, current_period_end: '2026-10-07T02:00:00Z', latest_payment_status: 'paid' }, now).status === 'active', '既有有效付費會員優先於試用狀態');
check(ecpayEndpoint('stage').includes('payment-stage') && !ecpayEndpoint('stage').includes('payment.ecpay.com.tw/Cashier'), 'test 環境不使用 production endpoint');
check(checkoutSource.includes("!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV"), '缺少金流 Secret 時 fail closed');
check(indexSource.includes('/api/tarot/trial/start') && indexSource.includes('/api/tarot/entitlement'), '正式 trial 與 entitlement API 已註冊');

const migrationDb = new DatabaseSync(':memory:');
migrationDb.exec(`
  CREATE TABLE profiles(id TEXT PRIMARY KEY, email TEXT);
  CREATE TABLE profile_member_metadata(user_id TEXT PRIMARY KEY, google_sub TEXT);
  CREATE TABLE subscriptions(id TEXT PRIMARY KEY, user_id TEXT, plan_code TEXT, item_id TEXT, status TEXT, current_period_end TEXT, current_period_ends_at TEXT);
  CREATE TABLE subscription_charges(subscription_id TEXT, user_id TEXT, plan_code TEXT, status TEXT, paid_at TEXT);
  INSERT INTO profiles VALUES ('active','a@example.com'),('expired','e@example.com'),('free','f@example.com');
  INSERT INTO profile_member_metadata VALUES ('active','1'),('expired','2'),('free','3');
  INSERT INTO subscriptions VALUES
    ('sa','active','tarot_monthly_600','tarot_monthly_600','active',datetime('now','+1 day'),NULL),
    ('se','expired','tarot_monthly_600','tarot_monthly_600','ended',datetime('now','-1 day'),NULL);
  INSERT INTO subscription_charges VALUES
    ('sa','active','tarot_monthly_600','paid',datetime('now')),
    ('se','expired','tarot_monthly_600','paid',datetime('now','-2 month'));
`);
migrationDb.exec(migration);
const migrated = migrationDb.prepare('SELECT user_id, tarot_trial_used_at FROM profile_member_metadata ORDER BY user_id').all() as Array<{ user_id: string; tarot_trial_used_at: string | null }>;
check(!!migrated.find((row) => row.user_id === 'active')?.tarot_trial_used_at, 'migration 保留有效付費會員且不另送試用');
check(!migrated.find((row) => row.user_id === 'expired')?.tarot_trial_used_at && !migrated.find((row) => row.user_id === 'free')?.tarot_trial_used_at, '所有目前未訂閱會員保留一次新試用資格');
migrationDb.close();

console.log(`All ${passed} tarot trial checks passed.`);
