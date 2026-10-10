import type { ReactNode } from 'react';
import type { MayaLocale } from '../../lib/maya';
import { mayaPremiumCopy } from '../../lib/mayaPremiumCopy';

export default function MayaPremiumProductIntro({ kind, locale, available, headingLevel = 1, children }: {
  kind: 'pro' | 'relationship'; locale: MayaLocale; available: boolean | null; headingLevel?: 1 | 2; children: ReactNode;
}) {
  const copy = mayaPremiumCopy(kind, locale);
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return <div className="space-y-4" data-premium-product-intro={kind}>
    <Heading className="break-words text-2xl font-bold leading-tight sm:text-3xl">{copy.title}</Heading>
    <p className="max-w-2xl text-base leading-relaxed text-slate-200" data-product-subtitle>{copy.subtitle}</p>
    <p className="text-2xl font-semibold text-cyan-200" data-product-price>{copy.price}</p>
    <div className="[&>a]:block [&>a]:w-full [&>button]:w-full sm:[&>a]:w-fit sm:[&>button]:w-auto" data-product-cta>{children}</div>
    {available === true ? <ul className="grid gap-3 text-sm leading-relaxed sm:grid-cols-2" data-product-features>
      {copy.features.map(feature => <li key={feature} className="rounded-xl border border-cyan-500/20 bg-slate-950/40 px-4 py-3">{feature}</li>)}
    </ul> : <p className="rounded-xl border border-amber-400/50 p-3 text-sm text-amber-200" role="note">{available === null ? copy.checking : copy.unavailable}</p>}
    <p className="max-w-3xl text-sm leading-relaxed text-slate-400">{copy.disclaimer}</p>
  </div>;
}
