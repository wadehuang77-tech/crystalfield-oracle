import { ORACLE_SPREADS } from './oracle-catalog';

export const TAROT_SUBSCRIPTION = {
  id: 'tarot_all_monthly_1500',
  name: '塔羅全牌陣月費會員',
  price: 1500,
  billingLabel: 'NT$1,500 / 月',
  billingType: 'recurring',
} as const;

export const TAROT_SUBSCRIPTION_PLANS = [
  {
    id: 'tarot_three_monthly_600',
    name: '三張牌陣方案',
    price: 600,
    description: '所有單張與三張牌陣，月費期間無限次占卜',
    tier: 1,
  },
  {
    id: 'tarot_pastlife_monthly_1000',
    name: '前世因果方案',
    price: 1000,
    description: '所有單張、三張與前世因果牌陣，月費期間無限次占卜',
    tier: 2,
  },
  {
    id: 'tarot_all_monthly_1500',
    name: '全牌陣方案',
    price: 1500,
    description: '所有牌組與所有牌陣，月費期間無限次占卜',
    tier: 3,
  },
] as const;

const PENDING_TAROT_PLAN_KEY = 'tarot_pending_subscription_plan';
export function savePendingTarotPlan(planId: string): void { try { window.sessionStorage.setItem(PENDING_TAROT_PLAN_KEY, planId); } catch { /* unavailable */ } }
export function readPendingTarotPlan(): string | null {
  try { const value = window.sessionStorage.getItem(PENDING_TAROT_PLAN_KEY); return TAROT_SUBSCRIPTION_PLANS.some((plan) => plan.id === value) ? value : null; } catch { return null; }
}
export function clearPendingTarotPlan(): void { try { window.sessionStorage.removeItem(PENDING_TAROT_PLAN_KEY); } catch { /* unavailable */ } }

export function isTarotSubscriptionPlan(id: string): boolean {
  return id === 'tarot_monthly_600' || TAROT_SUBSCRIPTION_PLANS.some((plan) => plan.id === id);
}

const tarotSpreadDefinitions = Object.values(ORACLE_SPREADS);

export const TAROT_SUBSCRIPTION_DECK_NAMES = [
  ...new Set(tarotSpreadDefinitions.map(({ deck_name }) => deck_name)),
];

export const TAROT_SUBSCRIPTION_SPREAD_NAMES = [
  ...new Set(tarotSpreadDefinitions.map(({ spread_name }) => spread_name)),
];
