const MIN_LENGTH = 20;

/** First half of a text, cut at the sentence end nearest the midpoint; short texts stay whole. */
export function halfText(value: string): string {
  if (value.length < MIN_LENGTH) return value;
  const middle = Math.ceil(value.length / 2);
  const ends = [...value.matchAll(/[。！？!?.；;\n]/g)].map((match) => (match.index ?? 0) + 1);
  const cut = ends.filter((end) => end >= middle * 0.6 && end <= middle * 1.4)
    .sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0] ?? middle;
  return `${value.slice(0, cut).trimEnd()}…`;
}
