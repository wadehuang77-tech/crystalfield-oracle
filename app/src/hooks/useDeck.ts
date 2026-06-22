import { useEffect, useState } from 'react';
import { cardsApi, type CardPreview, type DeckId, type UnlockedCard } from '../lib/api';

export function useDeck(deckId: DeckId) {
  const [cards, setCards] = useState<CardPreview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cardsApi.deckPreview(deckId)
      .then((res) => { if (!cancelled) setCards(res.cards); })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '無法載入牌組');
      });
    return () => { cancelled = true; };
  }, [deckId]);

  return { cards, error };
}

export function pickRandomCards<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return shuffle(arr).slice(0, arr.length);
  const result: T[] = [];
  const used = new Set<number>();
  while (result.length < n) {
    const idx = Math.floor(Math.random() * arr.length);
    if (used.has(idx)) continue;
    used.add(idx);
    result.push(arr[idx]);
  }
  return result;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function unlockSpreadCards(
  spread_id: string,
  picks: Array<{ card_key: string; position: number; reversed?: boolean }>,
  order_id: string,
): Promise<UnlockedCard[]> {
  const res = await cardsApi.unlockSpread(spread_id, picks, order_id);
  return res.cards;
}
