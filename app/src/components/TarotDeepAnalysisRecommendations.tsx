import { useEffect } from 'react';
import { ArrowRight, Compass, Fingerprint, Orbit } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DEEP_ANALYSIS_ROUTES,
  shouldShowDeepAnalysisRecommendations,
  type DeepAnalysisDestination,
  type TrustedTarotResultState,
} from '../lib/tarot-deep-analysis';
import { trackTarotCrossSellClick, trackTarotDeepAnalysisRecommendationsView } from '../lib/ga4';

interface TarotDeepAnalysisRecommendationsProps extends TrustedTarotResultState {
  resultKey: string;
}

const viewedResultKeys = new Set<string>();

const recommendations: Array<{
  destination: DeepAnalysisDestination;
  title: string;
  description: string;
  button: string;
  icon: typeof Fingerprint;
}> = [
  {
    destination: 'numerology',
    title: '生命靈數',
    description: '從出生日期解析你的核心性格、天賦能力、人生課題、感情模式與年度運勢。',
    button: '查看生命靈數',
    icon: Fingerprint,
  },
  {
    destination: 'human_design',
    title: '人類圖',
    description: '了解你的能量類型、人生角色、內在權威，以及最適合自己的決策方式。',
    button: '查看人類圖',
    icon: Compass,
  },
  {
    destination: 'vedic_astrology',
    title: '印度占星',
    description: '從出生星盤深入探索前世業力、人生使命、事業方向、感情課題與未來趨勢。',
    button: '查看印度占星',
    icon: Orbit,
  },
];

export function TarotDeepAnalysisRecommendations({
  deckId,
  spreadId,
  hasFullAccess,
  resultComplete,
  resultKey,
}: TarotDeepAnalysisRecommendationsProps) {
  const shouldShow = shouldShowDeepAnalysisRecommendations({ hasFullAccess, resultComplete });
  const exposureKey = `${deckId}:${spreadId}:${resultKey}`;

  useEffect(() => {
    if (!shouldShow || viewedResultKeys.has(exposureKey)) return;
    viewedResultKeys.add(exposureKey);
    trackTarotDeepAnalysisRecommendationsView(deckId, spreadId);
  }, [deckId, exposureKey, shouldShow, spreadId]);

  if (!shouldShow) return null;

  return (
    <section
      className="mt-8 overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-slate-950/95 via-indigo-950/85 to-purple-950/80 p-5 shadow-[0_0_50px_rgba(245,158,11,0.12)] sm:p-8"
      aria-labelledby="tarot-deep-analysis-title"
      data-testid="tarot-deep-analysis-recommendations"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold tracking-[0.28em] text-amber-300/80">更深入的分析，請點：</p>
        <h2 id="tarot-deep-analysis-title" className="mt-3 font-serif text-2xl text-amber-50 sm:text-3xl">
          想看更深入的人生分析？
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-200/80 sm:text-base">
          塔羅可以看見你當下的能量與問題方向。若想進一步了解自己的天賦、人生課題、感情模式與未來趨勢，歡迎繼續探索以下深度分析。
        </p>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map(({ destination, title, description, button, icon: Icon }) => (
          <article key={destination} className="flex min-w-0 flex-col rounded-2xl border border-amber-200/20 bg-white/[0.055] p-5 text-left shadow-lg">
            <Icon className="h-7 w-7 text-amber-300" aria-hidden="true" />
            <h3 className="mt-4 font-serif text-xl text-amber-50">{title}</h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-200/75">{description}</p>
            <Link
              to={DEEP_ANALYSIS_ROUTES[destination]}
              onClick={() => trackTarotCrossSellClick(destination, deckId, spreadId)}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-300/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {button}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
