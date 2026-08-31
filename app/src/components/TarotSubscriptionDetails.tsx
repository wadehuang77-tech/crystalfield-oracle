import { Check } from 'lucide-react';
import {
  TAROT_SUBSCRIPTION_DECK_NAMES,
  TAROT_SUBSCRIPTION_SPREAD_NAMES,
} from '../lib/tarot-subscription';

const BENEFITS = [
  '7 大塔羅牌組全部解鎖',
  '前世因果解鎖陣、凱爾特十字陣等全部牌陣',
  '30 天內不限占卜次數',
  '完整塔羅解讀不限次數',
];

export function TarotSubscriptionDetails() {
  return (
    <div className="mt-6 space-y-6">
      <section>
        <h6 className="mb-3 text-sm font-semibold tracking-wider text-amber-200">
          包含 7 大塔羅牌組
        </h6>
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {TAROT_SUBSCRIPTION_DECK_NAMES.map((deckName) => (
            <li
              key={deckName}
              className={`flex min-h-10 items-center justify-center rounded-lg border border-amber-300/25 bg-slate-900/70 px-3 py-2 text-center text-sm leading-snug text-amber-50 ${
                deckName === 'Lightworker 光之訊息' ? 'col-span-2 md:col-span-1' : ''
              }`}
            >
              {deckName}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h6 className="mb-3 text-sm font-semibold tracking-wider text-amber-200">
          會員可使用牌陣
        </h6>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TAROT_SUBSCRIPTION_SPREAD_NAMES.map((spreadName) => (
            <li
              key={spreadName}
              className="rounded-lg border border-amber-300/20 bg-slate-900/55 px-3 py-2 text-sm leading-snug text-amber-50/90"
            >
              {spreadName}
            </li>
          ))}
        </ul>
      </section>

      <ul className="space-y-2 border-t border-amber-300/15 pt-5 text-sm text-white/75">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
