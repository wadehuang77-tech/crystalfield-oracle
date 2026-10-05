import { Check } from 'lucide-react';
import { TAROT_SUBSCRIPTION_PLANS } from '../lib/tarot-subscription';

interface TarotSubscriptionDetailsProps {
  selectedPlanId: string;
  onSelect: (planId: string) => void;
  disabled?: boolean;
}

const PLAN_SPREADS = [
  '所有單張與三張牌陣',
  '所有單張、三張與前世因果牌陣',
  '所有牌組與全部牌陣',
];

export function TarotSubscriptionDetails({ selectedPlanId, onSelect, disabled = false }: TarotSubscriptionDetailsProps) {
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
            <span className="block text-sm font-semibold text-amber-100">{plan.name}</span>
            <span className="mt-2 block text-2xl font-bold text-white">NT${plan.price}<span className="text-sm font-normal text-white/60">／月</span></span>
            <span className="mt-2 block text-xs leading-5 text-amber-100/70">{plan.description}</span>
            <span className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/65">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              {PLAN_SPREADS[index]}
            </span>
            <span className="mt-1 flex items-start gap-2 text-xs leading-5 text-white/65">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              月費期間內，涵蓋的牌陣可無限次完整占卜
            </span>
            <span className="mt-1 flex items-start gap-2 text-xs leading-5 text-white/65">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              每月自動續訂，可取消後續續訂
            </span>
          </button>
        );
      })}
    </div>
  );
}
