export const SPREAD_PRICES: Record<string, number> = {
  tarot_three:        250,
  tarot_celtic:       500,
  tarot_pastlife:     800,
  celtic_cross:       500,
  unicorns_three:     250,
  dragons_three:      250,
  egyptian_pastlife:  800,
  cosmic_cross:       500,
  osho_three:         250,
};

export function getSpreadPrice(spreadId: string): number | null {
  return SPREAD_PRICES[spreadId] ?? null;
}

export function formatPrice(amount: number): string {
  return `NT$ ${amount.toLocaleString('en-US')}`;
}
