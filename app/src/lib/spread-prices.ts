import { TAROT_SUBSCRIPTION } from './tarot-subscription';

export type SpreadCategory = 'three_card' | 'ten_card' | 'pastlife';

// 非塔羅價格保持原狀；塔羅只保留唯一全館月費商品。
export const SPREAD_PRICES: Record<string, number> = {
  human_design_basic: 199,
  human_design_full: 399,
  human_design_bundle: 489,
  [TAROT_SUBSCRIPTION.id]: TAROT_SUBSCRIPTION.price,
};

export const SPREAD_CATEGORIES: Record<string, SpreadCategory> = {};

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

// 舊塔羅次數包已停止販售。
export const CATEGORY_BUNDLE: Partial<Record<SpreadCategory, BundleOption>> = {};
export const ORACLE_BUNDLES: BundleOption[] = [];

export function getSpreadPrice(spreadId: string): number | null {
  return SPREAD_PRICES[spreadId] ?? null;
}

export function getSpreadCategory(spreadId: string): SpreadCategory | null {
  return SPREAD_CATEGORIES[spreadId] ?? null;
}

export function formatPrice(amount: number): string {
  return `NT$ ${amount.toLocaleString('en-US')}`;
}
