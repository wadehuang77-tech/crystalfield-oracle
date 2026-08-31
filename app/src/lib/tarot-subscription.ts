import { ORACLE_SPREADS } from './oracle-catalog';

export const TAROT_SUBSCRIPTION = {
  id: 'tarot_monthly_600',
  name: '塔羅全館月費會員',
  price: 600,
  billingLabel: 'NT$600 / 月',
  billingType: 'recurring',
} as const;

const tarotSpreadDefinitions = Object.values(ORACLE_SPREADS);

export const TAROT_SUBSCRIPTION_DECK_NAMES = [
  ...new Set(tarotSpreadDefinitions.map(({ deck_name }) => deck_name)),
];

export const TAROT_SUBSCRIPTION_SPREAD_NAMES = [
  ...new Set(tarotSpreadDefinitions.map(({ spread_name }) => spread_name)),
];
