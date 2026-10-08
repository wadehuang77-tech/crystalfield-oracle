interface ReadingChart {
  lagna: string;
  moonSign: string;
  sunSign: string;
  moonNakshatra: string | null;
  planets: Record<string, string>;
  mahaDasha: string;
  antarDasha: string | null;
}

const ARCHETYPES: Record<string, readonly [string, string]> = {
  Aries: ['Pioneering Guide', 'You tend to bring life into motion through action. Your strength is not always being first, but recognizing what is worth taking the first step toward.'],
  Taurus: ['Builder of Abundance', 'You can turn an abstract vision into steady, trustworthy results. Respecting your own pace helps you build resources and a sense of security.'],
  Gemini: ['Connector of Ideas', 'Your gifts include understanding, organizing, and sharing information. Curiosity offers a way to explore the world and connect different perspectives.'],
  Cancer: ['Protective Healer', 'You notice subtle changes in people and your surroundings. When caring does not require self-sacrifice, sensitivity becomes a gentle but firm source of support.'],
  Leo: ['Radiant Creator', 'Your growth involves expressing yourself sincerely. Creativity can help you recognize your own dignity and encourage others without needing to please everyone.'],
  Virgo: ['Insightful Integrator', 'You notice details, order, and opportunities for improvement. When high standards do not become self-criticism, precision becomes a practical way to serve others.'],
  Libra: ['Harmonious Mediator', 'You understand balance and different perspectives in relationships. An important practice is hearing your own choice as clearly as you hear other people.'],
  Scorpio: ['Transformative Observer', 'You look beneath appearances to understand emotions, power, and truth. Releasing control can help you turn intense feelings into constructive change.'],
  Sagittarius: ['Visionary Explorer', 'You seek meaning and a wider perspective. Freedom becomes more sustainable when your beliefs and everyday actions support each other.'],
  Capricorn: ['Purposeful Builder', 'You bring endurance and a willingness to take responsibility for long-term goals. Making room for feelings alongside duty helps you build a grounded, meaningful life.'],
  Aquarius: ['Innovative Pathfinder', 'You may notice possibilities for change before others do. Finding people who share your interests helps you bring fresh perspectives into practical life.'],
  Pisces: ['Intuitive Empath', 'Imagination and empathy are important resources for you. Clear boundaries help sensitivity support creativity and compassion rather than become a burden.'],
};

const TALENTS: Record<string, readonly string[]> = {
  Aries: ['Pioneering action', 'Quick decisions'],
  Taurus: ['Resource building', 'Steady practice'],
  Gemini: ['Communication', 'Cross-disciplinary learning'],
  Cancer: ['Emotional insight', 'Care and support'],
  Leo: ['Creative expression', 'Group leadership'],
  Virgo: ['Analysis and organization', 'Attention to improvement'],
  Libra: ['Cooperation', 'Aesthetic judgment'],
  Scorpio: ['Deep insight', 'Transforming crises'],
  Sagittarius: ['Teaching and inspiration', 'Expanding a vision'],
  Capricorn: ['Long-term planning', 'Organizational management'],
  Aquarius: ['Innovative thinking', 'Community connections'],
  Pisces: ['Intuitive imagination', 'Healing empathy'],
};

const CYCLES: Record<string, readonly [string, string]> = {
  Sun: ['Self-Definition and Expression', 'The Sun period invites you to reconsider identity, responsibility, and what matters most. Develop a direction that reflects your values while noticing the urge to prove yourself.'],
  Moon: ['Emotional Nourishment and Belonging', 'The Moon period draws attention to feelings, family, and security. Listen to emotional and physical needs, and establish stability before rushing into decisions.'],
  Mars: ['Action, Courage, and Practice', 'The Mars period brings competition, boundaries, and courage into focus. Channel impatience into purposeful action rather than unnecessary conflict.'],
  Mercury: ['Learning, Communication, and New Directions', 'The Mercury period emphasizes knowledge, exchange, business, and choices. Stay flexible while keeping your priorities clear.'],
  Jupiter: ['Growth, Perspective, and Belief', 'The Jupiter period emphasizes learning, teaching, and opportunities for expansion. Review your long-term beliefs and assess opportunities realistically.'],
  Venus: ['Relationships, Values, and Abundance', 'The Venus period highlights affection, beauty, cooperation, and resources. Clarify what you genuinely value rather than adopting external standards.'],
  Saturn: ['Structure, Responsibility, and Maturity', 'The Saturn period asks you to examine responsibility, time, and lasting commitments. Steady progress can create structures that support you over the long term.'],
  Rahu: ['New Territory and Expanding Boundaries', 'The Rahu period highlights strong desires, unfamiliar territory, and rapid change. Test new opportunities against practical evidence before committing.'],
  Ketu: ['Letting Go and Inner Reflection', 'The Ketu period invites you to release familiar but draining patterns. Make space to reconsider what achievement and purpose mean to you.'],
};

export function englishVedicFreeResults(chart: ReadingChart, year = new Date().getUTCFullYear()) {
  const [archetypeTitle, archetypeTheme] = ARCHETYPES[chart.lagna] ?? ARCHETYPES.Pisces;
  const items = [...new Set([chart.planets.Mercury, chart.planets.Jupiter, chart.sunSign]
    .flatMap(sign => TALENTS[sign] ?? []))].slice(0, 3);
  const talentLabels = items.length ? items : ['Intuitive insight', 'Steady growth', 'Integration'];
  const [cycleTitle, cycleTheme] = CYCLES[chart.mahaDasha]
    ?? ['Reconsidering Your Direction', 'Take time to identify the choices and values that matter most to you.'];
  const nakshatra = chart.moonNakshatra?.split(/\s+-\s+|\s+Pada\s+/i)[0].trim();
  return {
    archetype: {
      title: archetypeTitle,
      body: `${archetypeTheme} Your ascendant is in ${chart.lagna}, while your Moon is in ${chart.moonSign}${nakshatra ? `, in ${nakshatra} Nakshatra` : ''}. These placements offer different perspectives on outward action and inner feelings. In social or work settings, the ascendant describes qualities people may notice first; when resting or making important choices, your emotional needs may ask for a different pace. This archetype is a reflection prompt, not a fixed definition of your personality. Notice which responses feel natural and which developed to protect you or adapt to expectations. At the end of the day, record one moment when your energy flowed easily and one when you felt tired but kept performing a role. Use those observations to adjust your boundaries, commitments, and daily rhythm rather than forcing yourself to fit a label.`,
    },
    talents: {
      title: 'Your Most Important Gifts in This Life',
      items: talentLabels,
      body: `Mercury, Jupiter, and the Sun suggest themes of ${talentLabels.join(', ')}. Mercury in ${chart.planets.Mercury || 'an unspecified sign'} describes how you receive, organize, and communicate information. Jupiter in ${chart.planets.Jupiter || 'an unspecified sign'} offers a perspective on learning, developing beliefs, and passing experience to others. The Sun in ${chart.sunSign} points toward choices and creative work that reflect your own values. A gift is not necessarily something you master immediately: it may be an ability you repeatedly feel drawn to practice. You can underestimate it because it feels ordinary, or delay using it because you fear imperfect results. Start with ${talentLabels[0].toLowerCase()} and choose one small action you can complete within seven days. Afterward, notice whether you felt engaged, could concentrate, or received useful feedback. Real experience is a better guide to long-term development than a label alone.`,
    },
    currentCycle: {
      title: cycleTitle,
      body: `${cycleTheme}${chart.antarDasha ? ` The current ${chart.antarDasha} sub-period adds a shorter-term focus within this larger cycle.` : ''} Your ${chart.mahaDasha} mahadasha describes a broad background theme; a sub-period can highlight more immediate questions about relationships, work, inner needs, or responsibilities. These cycles do not guarantee that a particular event will happen. If you feel stuck, avoid treating a pause as proof of failure. Review commitments that drain your energy before choosing a step aligned with your longer-term direction. A steady adjustment may be more useful than changing everything at once. Ask yourself: What needs more attention now? Which recurring pattern no longer responds to my old approach? What practical step respects both my circumstances and my pace? Revisit your answers each month and compare them with real events, so the reading remains a tool for reflection rather than a substitute for judgment.`,
    },
    challenge: {
      title: 'The Challenge to Work Through Now',
      body: `Rahu in ${chart.planets.Rahu || 'an unspecified sign'} and Ketu in ${chart.planets.Ketu || 'an unspecified sign'} offer a symbolic contrast between new growth and familiar habits. Saturn in ${chart.planets.Saturn || 'an unspecified sign'} invites you to review the structures supporting your choices. Notice one familiar pattern that no longer serves you and choose a manageable alternative.`,
    },
    nextYear: {
      title: `Turning Points to Reflect On in ${year}-${year + 1}`,
      body: `The ${chart.mahaDasha} mahadasha remains a background theme for your present life chapter. Review your longer-term direction alongside current concerns, and use your actual circumstances to assess opportunities in work, relationships, and resources.`,
      lockedPrompts: ['Which periods support focused action?', 'When is it useful to expand or consolidate?', 'Where might relationship and resource themes become more relevant?'],
    },
  };
}
