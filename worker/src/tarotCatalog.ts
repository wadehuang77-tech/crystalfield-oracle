export const TAROT_SUBSCRIPTION = {
  id: 'tarot_monthly_600',
  name: '塔羅全館月費會員',
  amount: 600,
  entitlementDays: 30,
} as const;

export interface TarotSpreadDef {
  id: string;
  name: string;
  deck_id: string;
  card_count: number;
  free?: boolean;
}

export const TAROT_DECK_CATALOG = [
  {
    id: 'tarot',
    name: '韋特塔羅',
    spreads: [
      { id: 'tarot_single', name: '單張牌陣', card_count: 1, free: true },
      { id: 'tarot_three', name: '三張牌陣', card_count: 3 },
      { id: 'tarot_celtic', name: '凱爾特十字牌陣', card_count: 10 },
      { id: 'tarot_pastlife', name: '前世因果解鎖陣', card_count: 7 },
    ],
  },
  {
    id: 'osho',
    name: '奧修禪卡',
    spreads: [
      { id: 'osho_single', name: '單張牌陣', card_count: 1, free: true },
      { id: 'osho_three', name: '三張牌陣', card_count: 3 },
    ],
  },
  {
    id: 'lightworker',
    name: '光行者神諭卡',
    spreads: [
      { id: 'lightworker_single', name: '單張牌陣', card_count: 1, free: true },
      { id: 'celtic_cross', name: '十字交叉使命陣', card_count: 10 },
    ],
  },
  {
    id: 'unicorns',
    name: '獨角獸神諭卡',
    spreads: [
      { id: 'unicorns_single', name: '單張牌陣', card_count: 1, free: true },
      { id: 'unicorns_three', name: '三張牌陣', card_count: 3 },
    ],
  },
  {
    id: 'egyptian_gods',
    name: '埃及神諭卡',
    spreads: [
      { id: 'egyptian_single', name: '單張牌陣', card_count: 1, free: true },
      { id: 'egyptian_pastlife', name: '前世因果解鎖陣', card_count: 7 },
    ],
  },
  {
    id: 'work_your_light',
    name: 'Work Your Light 神諭卡',
    spreads: [
      { id: 'work_your_light_single', name: '單張牌陣', card_count: 1, free: true },
      { id: 'cosmic_cross', name: '宇宙十字牌陣', card_count: 11 },
    ],
  },
  {
    id: 'dragons',
    name: '龍族神諭卡',
    spreads: [
      { id: 'dragons_single', name: '單張牌陣', card_count: 1, free: true },
      { id: 'dragons_three', name: '三張牌陣', card_count: 3 },
    ],
  },
] as const;

export const TAROT_SPREADS: Record<string, TarotSpreadDef> = Object.fromEntries(
  TAROT_DECK_CATALOG.flatMap((deck) => deck.spreads.map((spread) => [
    spread.id,
    { ...spread, deck_id: deck.id },
  ])),
);
