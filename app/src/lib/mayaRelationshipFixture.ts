import { mayaForDate, type MayaLocale } from './maya';
import { RELATIONSHIP_CHAPTERS, RELATIONSHIP_VERSION, MAYA_RELATIONSHIP_PRODUCT,
  relationshipPerson, validateRelationshipReport, type RelationshipReport } from './mayaRelationship';

// Synthetic text for offline tests only; never imported by report pages or Worker generators.
export function relationshipTestFixture(aDate: string, bDate: string, locale: MayaLocale): RelationshipReport {
  const a = mayaForDate(aDate, locale), b = mayaForDate(bDate, locale);
  const plan = ['awareness', 'action-adjustment', 'integration'].map((id, i) => ({
    id: id as 'awareness' | 'action-adjustment' | 'integration', startDay: i * 30 + 1, endDay: (i + 1) * 30,
    actionSteps: locale === 'en' ? ['Write a need.', 'Ask for consent.', 'Review an agreement.'] : ['寫下需要', '確認同意', '檢視約定'],
    reflectionQuestions: locale === 'en' ? ['What helped?', 'What changed?', 'What needs adjustment?'] : ['何者有助？', '有何改變？', '如何調整？'],
  }));
  const report: RelationshipReport = {
    reportVersion: RELATIONSHIP_VERSION, productCode: MAYA_RELATIONSHIP_PRODUCT.code, provider: 'openai',
    locale, relationshipType: 'friends', people: { a: relationshipPerson(aDate, locale), b: relationshipPerson(bDate, locale) },
    ninetyDayPlan: plan,
    sections: RELATIONSHIP_CHAPTERS.map((chapter, i) => {
      const en = locale === 'en';
      const label = en ? chapter.en : chapter.zh;
      let interpretation = en
        ? `${label} considers ${a.solar_seal} and ${a.galactic_tone} alongside ${b.solar_seal} and ${b.galactic_tone}. These symbols invite a freely chosen conversation rather than a fixed verdict. Consider whether this specific theme helps you articulate a need without assigning responsibility to the other person. Try a small agreement, notice the response and revise it together. Both people can pause the discussion, seek independent support or decline a proposed exercise. This is an invitation to compare observed choices with symbolic ideas, not a claim about your actual history.`
        : `${label}以${a.solar_seal}及${a.galactic_tone}，並對照${b.solar_seal}及${b.galactic_tone}，作為雙方自願探索的象徵。這不是已發生事件的描述，也不決定彼此必須扮演的角色。可以先辨識自己的需要，詢問對方是否願意交流，再選擇能夠調整的小練習。當意見不同時，容許暫停與保留個人界線。回饋應來自真實互動，而不是把象徵解讀當作對方必須接受的評價。`;
      const perspectives = en ? {
        a: `A can name a personal priority in ${label} and invite feedback without demanding agreement.`,
        b: `B can identify an independent concern in ${label}, ask for clarification and retain personal boundaries.`,
        shared: `Together, choose a reversible practice for ${label} and review whether it respects both people's agency.`,
      } : {
        a: `在${label}中，甲方可以說明一個具體需要，也保留拒絕不合適提議的自由。`,
        b: `乙方對${label}可提出不同觀察，先確認是否理解彼此，再決定能接受的行動。`,
        shared: `雙方在${label}選擇一個可撤回的約定，不以維持表面一致取代真正同意。`,
      };
      const lifeExamples = [en ? `For ${label}, a hypothetical disagreement can become a clear request instead of a label.`
        : `例如討論${label}時，可以將抽象不滿改寫成一個可回答的請求，不為彼此貼標籤。`];
      const reflectionQuestions = [en ? `Which choice in ${label} is genuinely voluntary for both people?` : `${label}的哪些選擇真正出於雙方自願？`];
      const actionSteps = [en ? `Agree on an observable step for ${label} and check feedback after a week.` : `就${label}約定一個可觀察的步驟，一週後共同檢視。`];
      if (!en) {
        const text = () => [interpretation, ...Object.values(perspectives), ...lifeExamples, ...reflectionQuestions, ...actionSteps,
          ...(i === 11 ? plan.flatMap(s => [...s.actionSteps, ...s.reflectionQuestions]) : [])].join('');
        while ((text().match(/[\u3400-\u9fff]/gu)?.length ?? 0) < 350) interpretation += '練習之後記錄各自的感受，將需要調整的條件說清楚，允許保留差異並尋求獨立支持。';
      }
      return { id: chapter.id, interpretation, perspectives, lifeExamples, reflectionQuestions, actionSteps };
    }),
  };
  if (!validateRelationshipReport(report)) throw new Error('Invalid offline relationship fixture');
  return report;
}
