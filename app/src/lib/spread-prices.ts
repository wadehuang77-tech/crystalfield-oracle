export type SpreadCategory = 'three_card' | 'ten_card' | 'pastlife';

export const SPREAD_PRICES: Record<string, number> = {
  tarot_three:        250,
  tarot_celtic:       599,
  tarot_pastlife:     599,
  celtic_cross:       599,
  unicorns_three:     250,
  dragons_three:      250,
  egyptian_pastlife:  599,
  cosmic_cross:       599,
  osho_three:         250,
  human_design_basic: 199,
  human_design_full:  399,
  human_design_bundle: 489,
  membership_monthly: 99,
};

export const SPREAD_CATEGORIES: Record<string, SpreadCategory> = {
  tarot_three:       'three_card',
  unicorns_three:    'three_card',
  dragons_three:     'three_card',
  osho_three:        'three_card',
  tarot_celtic:      'ten_card',
  celtic_cross:      'ten_card',
  cosmic_cross:      'ten_card',
  tarot_pastlife:    'pastlife',
  egyptian_pastlife: 'pastlife',
};

export interface BundleOption {
  id: string;
  label: string;
  price: number;
  originalPrice?: number;
  saving?: number;
  usesLabel: string;
  daysLabel: string;
  highlight?: boolean;
  grants: { three_card: number; ten_card: number; pastlife: number };
}

export const THREE_CARD_BUNDLE: BundleOption = {
  id: 'three_card_5pack_30d',
  label: '所有三張牌陣 5 次方案',
  price: 600,
  originalPrice: 1250,
  saving: 650,
  usesLabel: '所有三張牌陣共用 5 次',
  daysLabel: '30 日內有效',
  highlight: true,
  grants: { three_card: 5, ten_card: 0, pastlife: 0 },
};

export const THREE_PASTLIFE_BUNDLE: BundleOption = {
  id: 'three_pastlife_3plus3_30d',
  label: '三張牌陣 3 次＋前世因果陣 3 次',
  price: 1200,
  originalPrice: 2547,
  saving: 1347,
  usesLabel: '三張牌陣 3 次・前世因果陣 3 次',
  daysLabel: '30 日內有效',
  highlight: true,
  grants: { three_card: 3, ten_card: 0, pastlife: 3 },
};

export const DEEP_SPREAD_BUNDLE: BundleOption = {
  id: 'deep_spread_5pack_30d',
  label: '深度十字牌陣任選 5 次',
  price: 1800,
  originalPrice: 2995,
  saving: 1195,
  usesLabel: '凱爾特十字・十字交叉使命・宇宙十字共用 5 次',
  daysLabel: '30 日內有效',
  highlight: true,
  grants: { three_card: 0, ten_card: 5, pastlife: 0 },
};

export const CATEGORY_BUNDLE: Record<SpreadCategory, BundleOption> = {
  three_card: THREE_CARD_BUNDLE,
  ten_card:   DEEP_SPREAD_BUNDLE,
  pastlife:   THREE_PASTLIFE_BUNDLE,
};

export const ORACLE_BUNDLES: BundleOption[] = [
  THREE_CARD_BUNDLE,
  THREE_PASTLIFE_BUNDLE,
  DEEP_SPREAD_BUNDLE,
];

export function getSpreadPrice(spreadId: string): number | null {
  return SPREAD_PRICES[spreadId] ?? null;
}

export function getSpreadCategory(spreadId: string): SpreadCategory | null {
  return SPREAD_CATEGORIES[spreadId] ?? null;
}

export function formatPrice(amount: number): string {
  return `NT$ ${amount.toLocaleString('en-US')}`;
}
