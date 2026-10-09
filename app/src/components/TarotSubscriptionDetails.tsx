import { Check } from 'lucide-react';
import { TAROT_SUBSCRIPTION_PLANS } from '../lib/tarot-subscription';

interface TarotSubscriptionDetailsProps {
  selectedPlanId: string;
  onSelect: (planId: string) => void;
  disabled?: boolean;
  language?: 'zh-Hant' | 'en';
}

const PLAN_SPREADS = [
  '所有單張與三張牌陣',
  '所有單張、三張與前世因果牌陣',
  '所有牌組與全部牌陣',
];

export function TarotSubscriptionDetails({ selectedPlanId, onSelect, disabled = false, language = 'zh-Hant' }: TarotSubscriptionDetailsProps) {
  const isEnglish = language === 'en';
  const plans = isEnglish ? [
    {
      name: 'Three-Card Plan',
      description: 'Unlimited single- and three-card readings during membership',
      spreads: 'All single- and three-card spreads',
    },
    {
      name: 'Past-Life Plan',
      description: 'Unlimited single-, three-card, and past-life readings during membership',
      spreads: 'Single-, three-card, and past-life spreads',
    },
    {
      name: 'All-Spreads Plan',
      description: 'Unlimited readings across all decks and spreads during membership',
      spreads: 'All decks and spreads',
    },
  ] : null;
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {TAROT_SUBSCRIPTION_PLANS.map((plan, index) => {
        const selected = selectedPlanId === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onSelect(plan.id)}
            className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selected ? 'border-amber-300 bg-amber-300/10' : 'border-amber-300/20 bg-slate-900/60 hover:border-amber-300/50'
            }`}
          >
            <span className="block text-sm font-semibold text-amber-100">{plans?.[index].name ?? plan.name}</span>
            <span className="mt-2 block text-2xl font-bold text-white">NT${plan.price}<span className="text-sm font-normal text-white/60">{isEnglish ? '/ month' : '／月'}</span></span>
            <span className="mt-2 block text-xs leading-5 text-amber-100/70">{plans?.[index].description ?? plan.description}</span>
            <span className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/65">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              {plans?.[index].spreads ?? PLAN_SPREADS[index]}
            </span>
            <span className="mt-1 flex items-start gap-2 text-xs leading-5 text-white/65">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              {isEnglish ? 'Unlimited full readings for included spreads during membership' : '月費期間內，涵蓋的牌陣可無限次完整占卜'}
            </span>
            <span className="mt-1 flex items-start gap-2 text-xs leading-5 text-white/65">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              {isEnglish ? 'Renews monthly; you may cancel future renewals' : '每月自動續訂，可取消後續續訂'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
