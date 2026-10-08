export const VEDIC_PAID_OPTION_EN = {
  title: 'Complete Life Map',
  subtitle: 'Nine In-Depth Vedic Astrology Readings',
  description: 'Unlock past-life themes, life lessons, the soul axis, relationships, wealth, career, D9 and D10 charts, and a three-to-five-year dasha timeline in one reading.',
  bullets: ['Unlock all nine chapters together', 'D9 and D10 use calculated divisional chart data', 'Explore the next 3-5 years through major periods and sub-periods', 'Practical language, with no astrology knowledge required'],
};

export const VEDIC_LIFE_QUESTIONS_EN: Record<string, {
  title: string; prompt: string; description: string; points: readonly string[];
}> = {
  '01': {
    title: 'Past-Life Themes', prompt: 'What patterns are you bringing into this life?',
    description: 'Explore Rahu, Ketu, houses, signs, house lords, and relevant aspects as symbolic perspectives on familiar patterns and new directions.',
    points: ['Familiar life patterns', 'Recurring relationship themes', 'Comfort zones to reconsider', 'Ways to transform old patterns'],
  },
  '02': {
    title: 'Life Lessons', prompt: 'What are you learning in this lifetime?',
    description: 'Identify patterns that keep returning, abilities to develop, and directions to explore as you work through challenges.',
    points: ['Core life lessons', 'Patterns to learn from and release', 'Recurring challenges', 'Your central lesson in one sentence'],
  },
  '03': {
    title: 'The Rahu-Ketu Soul Axis', prompt: 'Where are you coming from, and where are you heading?',
    description: 'Use Ketu to reflect on familiar tendencies and Rahu to explore new directions for growth.',
    points: ['Familiar strengths and habits', 'Directions for growth', 'Relationship themes and life areas', 'Integrating both ends of the axis'],
  },
  '04': {
    title: 'Love and Marriage', prompt: 'Why do certain relationship patterns repeat?',
    description: 'Explore attraction, relationship lessons, partner tendencies, and life periods that invite reflection on intimacy and commitment.',
    points: ['Patterns of attraction', 'Recurring relationship dynamics', 'Lessons in partnership and marriage', 'Periods that highlight relationship themes'],
  },
  '05': {
    title: 'Wealth Patterns', prompt: 'How can effort become more sustainable financial progress?',
    description: 'Reflect on earning strengths, money concerns, and working habits to consider a more suitable approach to resources.',
    points: ['Earning strengths and resource habits', 'Patterns that drain resources', 'Money fears and attachments', 'Life stages that emphasize growth'],
  },
  '06': {
    title: 'Career Gifts', prompt: 'How can you build expertise and influence?',
    description: 'Distinguish natural strengths, working preferences, and long-term development to explore roles that suit you.',
    points: ['Hidden strengths and professional advantages', 'Employment and entrepreneurship preferences', 'Responsibility and leadership styles', 'Meaningful career directions'],
  },
  '07': {
    title: 'D9: Marriage and Inner Maturity', prompt: 'How can relationships and time help you mature?',
    description: 'Explore the D9 Navamsa chart for perspectives on commitment, marriage, inner values, and qualities developed over time.',
    points: ['D9 ascendant and maturity themes', 'Commitment and relationship values', 'Venus and Moon relationship needs', 'Growth through different partnership stages'],
  },
  '08': {
    title: 'D10: Career Chart', prompt: 'How can you establish your professional place?',
    description: 'Explore the D10 Dasamsa chart for perspectives on career development, social responsibility, leadership, and influence.',
    points: ['D10 ascendant and professional role', 'Sun and Saturn achievement themes', 'Professional development and organizational roles', 'Influence built over the long term'],
  },
  '09': {
    title: 'Three-to-Five-Year Dasha Timeline', prompt: 'Which chapter of life are you in now?',
    description: 'Use major periods and sub-periods to reflect on transitions, preparation, and growth over the next three to five years.',
    points: ['Your current life chapter', 'Year-by-year themes for the next 3-5 years', 'Career, relationship, and resource themes', 'Preparation for important decisions'],
  },
};
