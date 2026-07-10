export type SpreadCategory = 'three_card' | 'ten_card' | 'pastlife';

export const SPREAD_PRICES: Record<string, number> = {
  tarot_three:        250,
  tarot_celtic:       599,
  tarot_pastlife:     499,
  celtic_cross:       599,
  unicorns_three:     250,
  dragons_three:      250,
  egyptian_pastlife:  499,
  cosmic_cross:       599,
  osho_three:         250,
  human_design_basic: 199,
  human_design_full:  10,
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
  id: 'three_card_3pack_7d',
  label: '三張牌陣 3次套票',
  price: 10,
  usesLabel: '可算 3 次',
  daysLabel: '7 日內有效',
  highlight: true,
  grants: { three_card: 3, ten_card: 0, pastlife: 0 },
};

export const PASTLIFE_BUNDLE: BundleOption = {
  id: 'pastlife_3pack_7d',
  label: '前世因果陣 3次套票',
  price: 10,
  usesLabel: '可算 3 次',
  daysLabel: '7 日內有效',
  highlight: true,
  grants: { three_card: 0, ten_card: 0, pastlife: 3 },
};

export const TEN_CARD_BUNDLE: BundleOption = {
  id: 'ten_card_3pack_7d',
  label: '十張牌陣 3次套票',
  price: 10,
  usesLabel: '可算 3 次',
  daysLabel: '7 日內有效',
  highlight: true,
  grants: { three_card: 0, ten_card: 3, pastlife: 0 },
};

export const COMBO_1499: BundleOption = {
  id: 'bundle_1499_30d',
  label: '靈魂探索套餐',
  price: 10,
  originalPrice: 10,
  saving: 0,
  usesLabel: '三張×5・前世×2・十張×1',
  daysLabel: '30 日內有效',
  grants: { three_card: 5, ten_card: 1, pastlife: 2 },
};

export const COMBO_1999: BundleOption = {
  id: 'bundle_1999_30d',
  label: '深度靈魂套餐',
  price: 10,
  originalPrice: 10,
  saving: 0,
  usesLabel: '三張×6・前世×3・十張×3',
  daysLabel: '30 日內有效',
  grants: { three_card: 6, ten_card: 3, pastlife: 3 },
};

export const CATEGORY_BUNDLE: Record<SpreadCategory, BundleOption> = {
  three_card: THREE_CARD_BUNDLE,
  ten_card:   TEN_CARD_BUNDLE,
  pastlife:   PASTLIFE_BUNDLE,
};

export function getSpreadPrice(spreadId: string): number | null {
  return SPREAD_PRICES[spreadId] ?? null;
}

export function getSpreadCategory(spreadId: string): SpreadCategory | null {
  return SPREAD_CATEGORIES[spreadId] ?? null;
}

export function formatPrice(amount: number): string {
  return `NT$ ${amount.toLocaleString('en-US')}`;
}
