export type OracleDeckId = 'tarot' | 'lightworker' | 'unicorns' | 'dragons' | 'egyptian_gods' | 'work_your_light' | 'osho';
export type OracleSpreadId =
  | 'tarot_single' | 'tarot_three' | 'tarot_celtic' | 'tarot_pastlife'
  | 'lightworker_single' | 'celtic_cross'
  | 'unicorns_single' | 'unicorns_three'
  | 'dragons_single' | 'dragons_three'
  | 'egyptian_single' | 'egyptian_pastlife'
  | 'work_your_light_single' | 'cosmic_cross'
  | 'osho_single' | 'osho_three';

export interface OracleSpreadDefinition {
  deck_id: OracleDeckId;
  deck_name: string;
  spread_id: OracleSpreadId;
  spread_name: string;
  card_count: number;
}

export const ORACLE_SPREADS: Record<OracleSpreadId, OracleSpreadDefinition> = {
  tarot_single: { deck_id: 'tarot', deck_name: '偉特塔羅', spread_id: 'tarot_single', spread_name: '單張牌陣', card_count: 1 },
  tarot_three: { deck_id: 'tarot', deck_name: '偉特塔羅', spread_id: 'tarot_three', spread_name: '三張牌陣', card_count: 3 },
  tarot_celtic: { deck_id: 'tarot', deck_name: '偉特塔羅', spread_id: 'tarot_celtic', spread_name: '凱爾特十字陣', card_count: 10 },
  tarot_pastlife: { deck_id: 'tarot', deck_name: '偉特塔羅', spread_id: 'tarot_pastlife', spread_name: '前世因果解鎖陣', card_count: 7 },
  lightworker_single: { deck_id: 'lightworker', deck_name: '光行者神諭', spread_id: 'lightworker_single', spread_name: '單張牌陣', card_count: 1 },
  celtic_cross: { deck_id: 'lightworker', deck_name: '光行者神諭', spread_id: 'celtic_cross', spread_name: '十字交叉使命陣', card_count: 10 },
  unicorns_single: { deck_id: 'unicorns', deck_name: '獨角獸塔羅', spread_id: 'unicorns_single', spread_name: '單張牌陣', card_count: 1 },
  unicorns_three: { deck_id: 'unicorns', deck_name: '獨角獸塔羅', spread_id: 'unicorns_three', spread_name: '三張牌陣', card_count: 3 },
  dragons_single: { deck_id: 'dragons', deck_name: '龍族塔羅', spread_id: 'dragons_single', spread_name: '單張牌陣', card_count: 1 },
  dragons_three: { deck_id: 'dragons', deck_name: '龍族塔羅', spread_id: 'dragons_three', spread_name: '三張牌陣', card_count: 3 },
  egyptian_single: { deck_id: 'egyptian_gods', deck_name: '埃及神諭', spread_id: 'egyptian_single', spread_name: '單張牌陣', card_count: 1 },
  egyptian_pastlife: { deck_id: 'egyptian_gods', deck_name: '埃及神諭', spread_id: 'egyptian_pastlife', spread_name: '前世因果解鎖陣', card_count: 7 },
  work_your_light_single: { deck_id: 'work_your_light', deck_name: 'Lightworker 光之訊息', spread_id: 'work_your_light_single', spread_name: '單張牌陣', card_count: 1 },
  cosmic_cross: { deck_id: 'work_your_light', deck_name: 'Lightworker 光之訊息', spread_id: 'cosmic_cross', spread_name: '宇宙十字牌陣', card_count: 11 },
  osho_single: { deck_id: 'osho', deck_name: '奧修禪卡', spread_id: 'osho_single', spread_name: '單張牌陣', card_count: 1 },
  osho_three: { deck_id: 'osho', deck_name: '奧修禪卡', spread_id: 'osho_three', spread_name: '三張牌陣', card_count: 3 },
};
