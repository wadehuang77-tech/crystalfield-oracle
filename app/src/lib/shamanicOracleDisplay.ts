import type { OracleCard } from './numerology';

export interface OracleCardEnglish {
  archetype: string;
  element: string;
  message: string;
  shadow: string;
}

const ENGLISH_ORACLE_CARDS: Record<string, OracleCardEnglish> = {
  wolf: {
    archetype: 'Independent leader · solitary wisdom',
    element: 'Moon',
    message: 'You are being called to follow a path that is truly your own, even if no one walks beside you. The wolf reminds you that leadership begins with listening to your inner knowing, not with seeking approval. Let intuition guide you away from patterns you have outgrown and into the unknown. Your instincts can be a compass when no map is available; the solitary road may be the clearest way back to yourself.',
    shadow: 'Fear of being alone may keep you in places that no longer fit, silencing your instincts.',
  },
  eagle: {
    archetype: 'Visionary · guardian of the wider view',
    element: 'Wind · Sun',
    message: 'The eagle invites you to rise above the details and see the wider pattern. What feels like an overwhelming obstacle may be a turning point in a much larger journey. Create enough distance to notice options, support, and openings that are hard to see up close. You do not have to solve everything at once; widen your perspective and let the next practical step come into view.',
    shadow: 'Fixating on details can hide the larger picture; give yourself permission to look up.',
  },
  serpent: {
    archetype: 'Healer · cycle of release',
    element: 'Earth · Fire',
    message: 'The serpent marks a season of change. You may be ready to shed a belief, role, or relationship that no longer reflects who you are becoming. Change can leave you feeling exposed while the new is still taking shape; that tenderness is part of transition, not proof that you are failing. Release what has run its course at a pace that feels safe, and make room for a more honest beginning.',
    shadow: 'Resistance to change can keep old hurts alive; stagnation may cost more than the discomfort of growth.',
  },
  bear: {
    archetype: 'Healer · strength through reflection',
    element: 'Earth · Moon',
    message: 'The bear invites you into a quieter inner refuge. In a world that rewards constant output, rest and self-nourishment are necessary forms of strength. Step away from other people’s expectations and make space to hear what you genuinely need. Offer yourself the care you so freely give to others. You do not have to earn a pause; returning to yourself can be the beginning of meaningful repair.',
    shadow: 'Constant busyness can become a way to avoid meeting your real feelings.',
  },
  hummingbird: {
    archetype: 'Healer · presence in the moment',
    element: 'Wind · Blossoms',
    message: 'The hummingbird reminds you that your journey is not only about duty, lessons, or future achievements; it is also meant to include joy. Notice what brings a genuine spark of delight, even if it seems small. You do not need to postpone happiness until everything is complete. Let present-moment pleasure help you reconnect with what feels alive, while making choices that remain grounded in your real circumstances.',
    shadow: 'Anxiety about the future can make you miss the beauty and possibility of this moment.',
  },
  jaguar: {
    archetype: 'Shadow integrator · keeper of the night',
    element: 'Starlight · Darkness',
    message: 'The jaguar guides you toward the parts of yourself you may prefer not to see. Difficult feelings and disowned needs are not proof that you are broken; they can reveal where understanding and care are needed. Meet your shadow with honesty rather than judgment, and choose a safe, steady way to integrate what you learn. Wholeness grows when you stop abandoning parts of yourself in order to appear fearless.',
    shadow: 'What you suppress or deny may return more forcefully until it is acknowledged.',
  },
  'white-buffalo': {
    archetype: 'Abundance bearer · sacred feminine',
    element: 'Earth · Sacred',
    message: 'The white buffalo symbolizes abundance and an openness to receive. Consider where support, opportunity, or care is already available, and where a belief that you are undeserving may be closing you off. Gratitude can help you notice what is present, but receiving also means asking clearly and taking practical steps. Let abundance include emotional and spiritual nourishment as well as material resources.',
    shadow: 'A scarcity mindset may make it difficult to recognize or accept the support available to you.',
  },
  raven: {
    archetype: 'Magician · keeper of symbolic insight',
    element: 'Wind · Cosmos',
    message: 'The raven moves between the known and the unknown, inviting you to pay attention to ideas, dreams, and intuitions that feel meaningful. Record them and look for patterns without treating every coincidence as a command or a fact. Your insight becomes most useful when curiosity is balanced with discernment. Stay open to inspiration, then test possible interpretations against your values and the evidence in front of you.',
    shadow: 'Relying only on analysis may cause you to dismiss useful intuition before considering it.',
  },
  salmon: {
    archetype: 'Ancestor connector · cycle completer',
    element: 'Water · Fire',
    message: 'The salmon’s return upstream is a symbol of tracing your story to its sources. You may be ready to examine family patterns, early experiences, or recurring emotional themes that still shape the present. Looking back is not an invitation to remain stuck there; it can help you understand what you want to carry forward and what you are ready to release. Approach painful memories with compassion and seek support when needed.',
    shadow: 'Avoiding the past may leave unresolved patterns continuing to influence the present.',
  },
  coyote: {
    archetype: 'Wise trickster · playful alchemist',
    element: 'Wind · Fire',
    message: 'Coyote uses surprise and humor to loosen rigid thinking. A mistake, detour, or awkward moment may offer information about an assumption that is no longer serving you. Try stepping back from the problem and viewing it from a lighter angle—not to dismiss its impact, but to make room for another possibility. A little flexibility may reveal a simpler way forward than the one you have been forcing.',
    shadow: 'Taking yourself and every difficulty too seriously can make it harder to see what you can learn.',
  },
  turtle: {
    archetype: 'Protector · patient wisdom',
    element: 'Earth · Water',
    message: 'The turtle carries its shelter with it, symbolizing steadiness and resources found within. You may not need to rush outward for answers; slowing down can help you reconnect with what you already know and what is immediately available. Take one grounded step at a time and let consistency matter more than speed. Resting or moving slowly is not giving up when it helps you keep a sustainable rhythm.',
    shadow: 'Worry about not being fast or good enough can disrupt a steady, sustainable pace.',
  },
  dragonfly: {
    archetype: 'Clear dreamer · revealer of illusion',
    element: 'Water · Light',
    message: 'The dragonfly asks you to look beyond the story you have been telling yourself. A belief may feel familiar without being the whole truth. Pause and separate what you know from what you fear or assume; another perspective may open up when you question old limits. Let new information refine your understanding, and choose a next step based on what is real now rather than on an outdated narrative.',
    shadow: 'You may have accepted a limiting story as fact even though it does not tell the whole truth.',
  },
  owl: {
    archetype: 'Seer · keeper of night wisdom',
    element: 'Wind · Moon',
    message: 'The owl represents quiet discernment and the willingness to notice what is usually overlooked. Something uncomfortable may deserve your honest attention, even if you do not yet know what to do about it. Give yourself time to observe without rushing to a conclusion. Clear seeing is not the same as having every answer; it is the first step toward responding with care and integrity.',
    shadow: 'You may believe you see everything while avoiding a truth that feels uncomfortable.',
  },
  butterfly: {
    archetype: 'Transformer · lightness of spirit',
    element: 'Wind · Blossoms',
    message: 'The butterfly marks a transition into a new way of being. Growth can ask you to loosen your attachment to an identity that once offered safety but now feels too small. You do not have to reject your past self; you can honor what it helped you survive while choosing what fits today. Let change happen in stages, and allow your actions to reflect the person you are becoming.',
    shadow: 'Wanting change while clinging to an old identity can keep you caught between two stages.',
  },
  horse: {
    archetype: 'Traveler · untamed strength',
    element: 'Earth · Fire',
    message: 'The horse carries the energy of movement, autonomy, and open horizons. Notice where obligation has crowded out a desire that matters to you. Freedom does not have to mean abandoning commitments; it may begin with setting a boundary, making room for exploration, or choosing a more honest direction. Take a practical step toward greater agency while staying attentive to the responsibilities you genuinely value.',
    shadow: 'You may be suppressing a real need for freedom by calling every obligation unavoidable.',
  },
  deer: {
    archetype: 'Compassionate presence · quiet guardian',
    element: 'Earth · Moon',
    message: 'The deer offers a gentle kind of courage. You can meet a difficult moment with sensitivity without surrendering your boundaries or voice. Soften where softness is safe, and let care guide how you respond to yourself and others. Strength does not always look forceful; sometimes it is the willingness to remain open-hearted while still protecting what matters.',
    shadow: 'Mistaking gentleness for weakness may lead you to armor yourself when tenderness would serve better.',
  },
  condor: {
    archetype: 'Sacred messenger · higher perspective',
    element: 'Wind · Sun',
    message: 'The condor bridges earth and sky, inviting you to listen to insights that arrive through dreams, intuition, or unexpected inspiration. Rather than dismissing them immediately, write them down and consider what they might mean to you. Stay discerning: a compelling feeling is worth exploring, not automatically treating as instruction. Let reflection, trusted perspectives, and real-world evidence help you decide what to follow.',
    shadow: 'Self-doubt and constant self-editing can stop you from exploring an idea before it has a chance to develop.',
  },
  dolphin: {
    archetype: 'Healer · wisdom of the waters',
    element: 'Water · Light',
    message: 'The dolphin reminds you that healing does not always have to feel solemn or difficult. Play, music, laughter, and connection can create space for relief and renewed energy. You are allowed to enjoy yourself without first proving that you have solved everything. Choose a genuinely nourishing activity, and let joy be one supportive part of your wellbeing rather than a substitute for care you may need.',
    shadow: 'Treating healing as nothing but hard work can make you forget the value of joy and rest.',
  },
  otter: {
    archetype: 'Creator · open-handed receiver',
    element: 'Earth · Water',
    message: 'The otter invites you to loosen your grip and make room for play. Constantly striving to secure the future can leave little space to enjoy what is already here. Notice where effort is useful and where tension is making it harder to receive help or recognize opportunity. Relaxation is not a guarantee of abundance, but a more balanced pace can help you make clearer, more creative choices.',
    shadow: 'Anxiety and a sense of scarcity can make it harder to notice or accept support.',
  },
  lion: {
    archetype: 'Leader · solar presence',
    element: 'Earth · Fire',
    message: 'The lion embodies confidence that does not need to dominate. Your capacity to lead may already be present, waiting for you to take it seriously and use it responsibly. You do not have to diminish your strengths to make others comfortable. Let your warmth and competence be visible, and use influence with care, listening as well as acting. Your light can encourage others without requiring you to control them.',
    shadow: 'Excessive modesty or self-doubt may be hiding strengths you are ready to share.',
  },
  hawk: {
    archetype: 'Observer · alert awareness',
    element: 'Wind · Sun',
    message: 'The hawk combines a broad view with sharp attention. Look at the overall situation, then focus on the detail that most needs your response. A signal, opportunity, or difficult truth may already be within view. Take time to confirm what you are noticing and consider the consequences before acting. Awareness is most powerful when it leads to a thoughtful, proportionate next step.',
    shadow: 'You may notice what is happening but avoid responding because action feels difficult.',
  },
  fox: {
    archetype: 'Strategist · adaptable observer',
    element: 'Wind · Fire',
    message: 'The fox brings resourcefulness and the ability to adapt without losing yourself. If the obvious route is blocked, look for another angle or a smaller experiment that could teach you more. You do not need to solve everything through elaborate strategy; sometimes a direct conversation or simple action is enough. Stay curious, notice the options around you, and choose the path that is both inventive and honest.',
    shadow: 'Overthinking and overplanning may turn useful cleverness into needless complication.',
  },
  swan: {
    archetype: 'Embodiment of beauty · graceful spirit',
    element: 'Water · Light',
    message: 'The swan invites you to question an old story that says you are not enough. Harsh self-judgment can obscure qualities that others may already see in you. You do not need to become perfect before treating yourself with respect. Practice recognizing your worth as it is now, including both strengths and imperfections, and allow yourself to be seen without shrinking to match someone else’s expectations.',
    shadow: 'Severe self-criticism may keep you from recognizing your own beauty and wholeness.',
  },
  spider: {
    archetype: 'Creator · weaver of patterns',
    element: 'Starlight · Darkness',
    message: 'The spider represents the patterns woven by repeated thoughts, choices, and relationships. Take a step back and examine the story you are telling about yourself and your circumstances. Which parts are supported by evidence, and which are shaped by fear or habit? You cannot control every strand of life, but you can make conscious choices about what you reinforce and where you begin weaving differently.',
    shadow: 'Fear-based patterns may feel like fate when they have actually been reinforced over time.',
  },
  crow: {
    archetype: 'Keeper of karma · guardian of natural law',
    element: 'Wind · Cosmos',
    message: 'The crow asks you to look honestly at cause and effect, including the choices that remain within your control. Resentment can be understandable, but carrying it indefinitely may consume energy you want for your own life. Acknowledge what happened without excusing harm, then consider a boundary, repair, or release that protects your wellbeing. Accountability can include compassion for yourself as well as others.',
    shadow: 'Resentment and a fixed sense of powerlessness may drain energy that could support change.',
  },
  frog: {
    archetype: 'Purifier · catalyst for renewal',
    element: 'Water · Fire',
    message: 'The frog is associated with cleansing and fresh starts. An emotion you have been holding back may need a safe way to be acknowledged and expressed. Name what you feel without judging it, then choose a healthy outlet: rest, conversation, writing, or support from someone you trust. Letting feelings move does not mean acting on every impulse; it gives you a clearer place from which to decide.',
    shadow: 'Suppressed feelings can accumulate and become harder to understand or care for.',
  },
  bat: {
    archetype: 'Shaman of endings and renewal',
    element: 'Starlight · Darkness',
    message: 'The bat navigates the dark and symbolizes renewal after an ending. A chapter may be changing, even if you are not yet ready to see what comes next. You can grieve what is ending while loosening your hold on what can no longer continue. Move carefully, seek support, and allow uncertainty to exist without forcing an immediate replacement. An ending can make room for a different beginning.',
    shadow: 'Fear of endings may keep you holding on to something that has already run its course.',
  },
  crane: {
    archetype: 'Elder · graceful keeper of time',
    element: 'Wind · Moon',
    message: 'The crane embodies patience, perspective, and respect for timing. You may benefit from watching carefully before making your next move. A pause is not necessarily a missed opportunity; it can help you gather information and recognize conditions that are not yet ready. Stay engaged without forcing an outcome, and revisit your decision when you have more clarity or the circumstances have changed.',
    shadow: 'Restlessness can cause you to overlook an opportunity that requires time and observation.',
  },
  antelope: {
    archetype: 'Agent of movement · instinctive wisdom',
    element: 'Earth · Fire',
    message: 'The antelope encourages swift but thoughtful movement. Preparation matters, yet endless planning can become a way to avoid uncertainty. Identify what you truly need to know, then choose one manageable action that will give you real information. You do not have to feel completely ready before beginning. Let your instincts inform you, and keep the next step proportionate to what you can responsibly take on.',
    shadow: 'Planning can become a reason to delay action rather than a meaningful form of preparation.',
  },
  'mountain-lion': {
    archetype: 'Leader · soul-purpose in action',
    element: 'Earth · Fire',
    message: 'The mountain lion represents leadership grounded in purpose rather than force. You may be ready to accept a responsibility that matters to you, even if you are still learning. Waiting for perfect confidence can keep you from discovering what you are capable of. Begin with a clear, manageable commitment, ask for support where appropriate, and let experience build your confidence over time.',
    shadow: 'Fear of not being ready may lead you to avoid a responsibility you could grow into.',
  },
  peacock: {
    archetype: 'Visible presence · expression of beauty',
    element: 'Wind · Blossoms',
    message: 'The peacock invites you to let your genuine gifts be seen. Sharing your work or expressing your style is not automatically vanity; it can be a way to contribute honestly. You do not need to perform or compete to deserve visibility. Choose a setting that feels right, show what you have made, and remain open to feedback without letting comparison define your worth.',
    shadow: 'Fear of envy or judgment may disguise itself as modesty and keep you hidden.',
  },
  whale: {
    archetype: 'Keeper of ancient memory · cosmic awareness',
    element: 'Earth · Moon',
    message: 'The whale calls you toward the quieter depths beneath daily noise. You may have more experience, memory, and inner knowledge to draw on than you realize. Make time for stillness and notice what returns to mind without forcing a mystical explanation. Reflection can help you connect present choices with lessons from your past and the values you want to carry into the future.',
    shadow: 'Surface distractions may make you feel disconnected from your deeper experience and knowledge.',
  },
  scarab: {
    archetype: 'Renewal · guardian of sacred cycles',
    element: 'Earth · Sacred',
    message: 'The scarab marks the threshold between completion and renewal. Before rushing into the next chapter, take stock of what the last one taught you and what is genuinely finished. You can honor a relationship, role, or ambition without keeping it alive past its time. Close the loop with gratitude where possible, learn from what happened, and make room for a beginning shaped by that understanding.',
    shadow: 'Moving on too quickly may cause an unfinished lesson to repeat in a new form.',
  },
  panther: {
    archetype: 'Night walker · alchemist of strength',
    element: 'Starlight · Darkness',
    message: 'The panther represents strength developed through difficult seasons. Hardship is not proof that you deserve pain, but what you learn while moving through it may become a source of insight. Acknowledge vulnerability without shame and seek help rather than carrying everything alone. Let the experience deepen your understanding while remembering that healing and safety matter more than forcing yourself to endure.',
    shadow: 'Treating vulnerability or difficult feelings as shameful can hide sources of resilience and support.',
  },
  elk: {
    archetype: 'Endurance · guardian of the long road',
    element: 'Earth · Water',
    message: 'The elk reminds you that meaningful journeys are built through steady effort, not one burst of speed. Your goal may take longer than you hoped, and that does not mean you are failing. Break the path into sustainable stages, recognize the progress already made, and make room for recovery. Trust a pace you can maintain rather than exhausting yourself in pursuit of an instant result.',
    shadow: 'Expecting results faster than you are willing to sustain the process can drain your energy.',
  },
  heron: {
    archetype: 'Meditator · keeper of precise timing',
    element: 'Water · Light',
    message: 'The heron waits with focused attention and moves when the moment is right. You may be in a period for observing, preparing, or integrating rather than forcing an outcome. Patience does not mean passivity: keep tending what is within your control while allowing uncertain parts to develop. When conditions become clearer, you will be better placed to act with precision.',
    shadow: 'Impatience with apparent stillness may lead you to give up before the timing is right.',
  },
  crab: {
    archetype: 'Protector · wisdom within the shell',
    element: 'Water · Fire',
    message: 'The crab reminds you that boundaries can protect tenderness, but they should not become a prison. Notice where you need more space and where a trusted connection might be safe to let in. You can move carefully, communicate your limits, and change direction when needed. Protection and intimacy are not opposites when your boundaries are clear and responsive.',
    shadow: 'A protective shell may become isolating when it prevents every genuine connection from reaching you.',
  },
  'hawk-moth': {
    archetype: 'Dream navigator · messenger of the unconscious',
    element: 'Wind · Moon',
    message: 'The hawk moth is drawn to the night and invites you to notice what emerges in dreams, imagination, and quiet reflection. Keep a journal of recurring images or feelings, then consider how they relate to your waking concerns without assuming they predict events. Sometimes an unexpected perspective appears when you stop demanding an immediate logical answer and give your mind room to make connections.',
    shadow: 'Searching only through conscious logic may cause you to overlook useful feelings and reflections from dreams.',
  },
  'black-bear': {
    archetype: 'Healer · channel of earth energy',
    element: 'Earth · Moon',
    message: 'The black bear calls you back to the body and to practical grounding. Reflection and spiritual curiosity are most helpful when they remain connected to sleep, nourishment, movement, and the support of everyday life. Spend time outdoors or attend to a simple physical task, and notice what helps you feel present. Grounding does not diminish insight; it can make it safer and more sustainable.',
    shadow: 'Reaching for abstract answers while neglecting your body and practical needs can leave you feeling ungrounded.',
  },
  firefly: {
    archetype: 'Bearer of hope · light in the dark',
    element: 'Water · Light',
    message: 'The firefly offers a small light rather than a promise that every difficulty will disappear. Look for one source of hope, care, or possibility that is available right now, including the strengths you bring to the situation. Small steps count, especially when the way ahead is unclear. Let your own light be acknowledged without comparing it to anyone else’s, and seek companionship when you need more than you can provide alone.',
    shadow: 'Focusing on other people’s light may make you forget the strengths and hope you already carry.',
  },
};

export function getOracleCardEnglish(card: OracleCard): OracleCardEnglish {
  const translation = ENGLISH_ORACLE_CARDS[card.id];
  if (!translation) {
    throw new Error(`Missing English translation for shamanic oracle card "${card.id}".`);
  }
  const shadowTheme = translation.shadow.replace(/[.!?]$/, '');
  return {
    ...translation,
    message: `${translation.message}\n\nNotice how the ${translation.archetype.toLowerCase()} theme may show up in your everyday choices, particularly in situations connected with ${translation.element.toLowerCase()}. If the pattern described here sounds familiar—${shadowTheme}—pause with curiosity rather than judgment. Ask what need or boundary may be underneath, then choose one practical response that fits your circumstances. Treat this card as a reflective lens, not a prediction; keep what helps and set aside the rest.`,
  };
}
