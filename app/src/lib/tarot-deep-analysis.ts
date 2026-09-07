import type { OracleDeckId, OracleSpreadId } from './oracle-catalog';

export type DeepAnalysisDestination = 'numerology' | 'human_design' | 'vedic_astrology';

export interface TrustedTarotResultState {
  deckId: OracleDeckId;
  spreadId: OracleSpreadId;
  hasFullAccess: boolean;
  resultComplete: boolean;
}

export const DEEP_ANALYSIS_ROUTES = {
  numerology: '/numerology',
  human_design: '/human-design',
  vedic_astrology: '/vedic-astrology',
} as const satisfies Record<DeepAnalysisDestination, string>;

export function shouldShowDeepAnalysisRecommendations(
  state: Pick<TrustedTarotResultState, 'hasFullAccess' | 'resultComplete'>,
): boolean {
  return state.hasFullAccess && state.resultComplete;
}
