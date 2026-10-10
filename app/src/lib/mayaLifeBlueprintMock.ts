import { blueprintEvidence, BLUEPRINT_CHAPTERS, LIFE_BLUEPRINT_UNSUPPORTED, LIFE_BLUEPRINT_VERSION, type LifeBlueprintV2 } from './mayaLifeBlueprint';
import type { MayaLocale, MayaSignature } from './maya';

// Editorial fixtures for local quality checks, not evidence about anyone's actual life.
const themes = [
  {
    zh: '身份不是必須符合的標籤，而是重新選擇自我敘事的起點。你可以把核心人格象徵理解成一面鏡子，分辨哪些描述讓你有共鳴，哪些只是別人的期待。生命主題不等於已經安排好的命運；它比較像一個值得持續探索的問題：當外在角色改變時，你希望保留什麼價值？如果你習慣用成果證明自己，可以練習將價值與表現分開，也容許自己在不同環境展現不同面向。將靈魂身份當作象徵語言，而非來自某個星球的事實，能保留自由與責任。',
    en: 'Identity is a revisable story rather than a label you must satisfy. Treat the symbolism as a mirror: distinguish descriptions that resonate from expectations you have inherited. A life theme is a question to explore, not a destiny already arranged. Ask which values you want to retain when your roles change. If achievement sometimes becomes your measure of worth, experiment with separating personal value from performance. Different settings may invite different aspects of you. Symbolic soul identity is a creative language for reflection, not evidence of an extraterrestrial origin.',
    exampleZh: '例如面對新職務時，先寫下希望被看見的特質，再觀察實際行動是否一致；若不一致，調整敘事而不是否定自己。',
    exampleEn: 'When entering a new role, write down the qualities you hope to embody, then compare them with your actions. Revise your story rather than dismissing yourself.',
    questionZh: '哪些自我描述是我親自選擇的？拿掉職稱之後，我仍珍惜什麼？',
    questionEn: 'Which descriptions have I chosen for myself? What would I still value without my job title?',
    actionZh: '寫下三個重視的價值，為每個價值安排一件十分鐘的小事，一週後依真實感受重新排序。',
    actionEn: 'Choose three values and schedule one ten-minute action for each. Review their order after a week using your observations.',
  },
  {
    zh: '音調提供的是觀察行動方式的象徵，而不是效率排行榜。達成目標可能需要發起、整理、協調與收尾等不同步驟；你不必因為偏好某一種節奏，就認為其他方式不適合自己。可以檢查動機與步驟是否一致：想讓成果被理解，是否也保留了說明的時間？重視合作，是否清楚交代責任與期限？面對卡住的計畫，先調整任務大小，再決定速度，而不是只增加投入時間。合作模式需要真實回饋，人生節奏也可以隨生活條件改變，不必把象徵變成固定限制。',
    en: 'Tone offers a symbolic lens on action, not a ranking of efficiency. Realizing a goal may require initiation, organization, coordination and closure. A preferred rhythm does not make other approaches unavailable. Check whether your motivation matches your process: if understanding matters, have you allowed time to explain? If collaboration matters, have you clarified responsibilities and deadlines? When a plan stalls, change the task size before increasing your hours. Collaboration needs feedback and pacing can change with your circumstances. Treat the symbolism as a hypothesis to test, never a permanent limitation.',
    exampleZh: '例如團隊專案進度緩慢時，把下一步縮成能在一天完成的成果，詢問同伴需要什麼資訊，再安排短暫回顧。',
    exampleEn: 'If a team project slows down, define a deliverable small enough for one day. Ask what information colleagues need before arranging a short review.',
    questionZh: '我通常在哪個步驟投入最多力氣？哪種回饋能幫我調整節奏？',
    questionEn: 'Which step receives most of my effort? What feedback helps me adjust my pace?',
    actionZh: '選一個小目標，列出開始、協作與完成三個節點，為每個節點設定可觀察的成果與回顧時間。',
    actionEn: 'Set one small goal with initiation, collaboration and completion checkpoints. Define an observable result and a review time for each.',
  },
  {
    zh: '生命方向可以從重視的價值開始，而不必先找到唯一使命。核心動機有時藏在你願意持續投入的事情裡，但興趣、能力與責任並不總是同步。把方向拆成可以嘗試的選擇，能避免用宏大的目標壓迫自己。你可以比較不同投入帶來的感受：哪些事情讓你願意學習，哪些事情只讓你追逐認可？個人成長目標應包含生活條件與可承受的代價，也容許暫停與轉彎。適合投入的方向需要透過實際經驗確認，象徵資料不能替你指定職業或保證一條正確道路。',
    en: 'Direction can begin with values without requiring a single ultimate mission. Motivation may appear in activities you return to, yet interest, skill and responsibility do not always align. Turn a broad direction into experiments rather than a demand to find one perfect path. Compare activities that invite learning with activities pursued mainly for approval. Growth goals need to account for resources, responsibilities and acceptable trade-offs. Pausing or changing course can be a deliberate decision. Suitable directions emerge through experience; symbolic evidence cannot assign a profession or guarantee a correct route.',
    exampleZh: '例如想投入教育卻尚未確定時，可以先參與一次分享或陪伴活動，記錄準備過程與互動後的感受，而非立即離職。',
    exampleEn: 'If education interests you, try one short sharing or mentoring activity. Observe preparation and interaction before considering a major career change.',
    questionZh: '什麼事情值得我持續學習？我願意承擔哪些代價，又有哪些界線？',
    questionEn: 'What feels worth learning over time? Which trade-offs am I willing to accept, and where are my boundaries?',
    actionZh: '寫一份價值與責任清單，選出一個低風險方向進行兩週實驗，結束後用經驗決定下一步。',
    actionEn: 'List your values and responsibilities. Run a low-risk two-week experiment in one direction, then decide the next step from evidence.',
  },
  {
    zh: '潛能需要被看見，也需要安全的練習空間。自然優勢可能表現在觀察、表達、連結或整理資訊的方式，但一次成功不足以證明天賦，一次失誤也不代表缺乏能力。你可以回顧不同學習情境，找出能讓自己理解更清楚的條件，例如親手操作、與人討論或獨立書寫。創造力不是永遠提出新點子，也包含修改既有流程，讓事情更合適。尚未發揮的能力可以從小型作品開始探索，先選擇能得到回饋的任務，避免只在想像中判斷自己是否有資格。',
    en: 'Potential needs visibility and a safe place to practice. Strengths may appear in observing, expressing, connecting or organizing information. One success does not establish an innate gift and one mistake does not rule out ability. Compare learning conditions such as hands-on work, conversation or independent writing. Creativity can mean improving an existing process rather than continually inventing new ideas. Explore undeveloped capacities through small pieces of work that invite feedback. A concrete experiment gives you more useful information than wondering whether you are qualified to begin.',
    exampleZh: '例如想練習表達時，先把熟悉的主題整理成三分鐘分享，邀請一位朋友指出最清楚與最難理解的地方。',
    exampleEn: 'To practice expression, prepare a three-minute explanation of a familiar subject. Ask a friend which part was clear and which was difficult to follow.',
    questionZh: '我在哪些條件下學得比較清楚？什麼能力值得一次小型嘗試？',
    questionEn: 'Under which conditions do I learn clearly? Which capacity deserves a small experiment?',
    actionZh: '挑一項未熟悉的技能，完成一件小作品並取得具體回饋，再選一個細節修正，保留前後版本。',
    actionEn: 'Choose one unfamiliar skill, make a small artifact and seek specific feedback. Revise one detail and retain both versions.',
  },
  {
    zh: '陰影可以理解為優勢在壓力下失去彈性的可能性，而不是人格缺陷。重視細節可能變成難以放手，願意照顧別人也可能讓自己的需求長期被忽略；這些只是探索方向，不能據此斷言你的真實反應。遇到重複困擾時，先區分可觀察的事件、當下解讀與採取的行動，再檢查是否存在其他解釋。成長不是消除所有不舒服，而是增加回應的選擇。你可以建立停頓的空間，向可信任的人確認盲點，也記得不把每次衝突都歸因於自己。',
    en: 'A shadow can be understood as a strength losing flexibility under pressure, not a defect in your personality. Attention to detail might become difficulty letting go; caring for others might leave personal needs unattended. These are possibilities to investigate, not claims about your behavior. Separate an observable event from your interpretation and response. Look for alternative explanations. Growth does not require eliminating discomfort: it can mean creating more response options. Build a pause, seek feedback from a trusted person and avoid assuming every conflict is your fault.',
    exampleZh: '例如收到批評時，先記錄對方真正說出的內容，等待情緒稍緩後再詢問具體期待，避免立刻全面否定自己的努力。',
    exampleEn: 'After criticism, record what was actually said. When the intensity settles, ask for a specific expectation rather than rejecting all your effort.',
    questionZh: '我的優勢何時變得僵硬？除了第一個解讀，還有哪些可能性？',
    questionEn: 'When does a strength become rigid? What explanations exist beyond my first interpretation?',
    actionZh: '為一個常見壓力情境寫下事件、解讀與回應三欄，再設計一個可延後反應的小步驟。',
    actionEn: 'For one stressful situation, write three columns: event, interpretation and response. Design a small step that delays an automatic reaction.',
  },
  {
    zh: '親密需要可理解的表達，也需要彼此同意的界線。你可以用象徵主題探索自己如何給予關心，以及希望如何被理解，但不能推定另一人的想法。情感需求有時比表面爭執更難說清楚，練習把指責改成具體需求，能讓對話有新的入口。關係中的成長不等於單方面退讓，也不是用報告說服對方改變。修復需要雙方願意聆聽與調整，必要時可以先暫停討論。這裡的分析是個人反思，不是雙人配對或相容評分，也不保證任何關係結果。',
    en: 'Intimacy needs understandable expression and mutually agreed boundaries. Use the symbolic themes to explore how you offer care and wish to be understood, without assuming a partner’s thoughts. Emotional needs can be harder to explain than the disagreement itself. Translating an accusation into a specific request can create a different conversation. Growth does not require one-sided accommodation or using a report to persuade someone to change. Repair needs willingness on both sides, and a pause may help. This is personal reflection, not a compatibility assessment or a promise about relationship outcomes.',
    exampleZh: '例如希望更多陪伴時，提出一個雙方可討論的時間安排，先聽對方的限制，再一起決定是否嘗試。',
    exampleEn: 'If you want more time together, suggest a concrete arrangement, hear the other person’s constraints and decide jointly whether to try it.',
    questionZh: '我希望被理解的是什麼需求？哪些界線需要清楚且溫和地說明？',
    questionEn: 'Which need do I want understood? Which boundaries need a clear and considerate explanation?',
    actionZh: '安排一次不以責備開始的對話，說明感受、需求與可商量的請求，最後確認雙方理解是否一致。',
    actionEn: 'Arrange a conversation using feelings, needs and a negotiable request. End by checking whether both people understood the same thing.',
  },
  {
    zh: '工作天賦不只關乎職稱，也涉及你如何處理資訊、承擔責任與和他人協作。適合的環境需要從真實任務中觀察，不能僅憑象徵指定產業。你可以辨認哪些工作讓你保持投入，哪些條件經常消耗注意力，例如不清楚的權責、太頻繁的切換或缺少回饋。領導並不總是站在前方，也可以是整合資訊、維持溝通或協助團隊完成決策。職涯選擇要考慮生活需求與現有能力，先改善一個可控制的流程，再評估是否需要更大的調整。',
    en: 'Working strengths concern information, responsibility and collaboration, not merely job titles. Suitable environments must be observed through real tasks rather than assigned from symbolism. Notice conditions that support attention and those that drain it, such as unclear ownership, frequent switching or missing feedback. Leadership can involve integrating information, maintaining communication or helping a team reach a decision. Career choices also need practical consideration of skills and living requirements. Improve one process within your control before deciding whether a larger change is needed.',
    exampleZh: '例如專案責任模糊時，整理決策者、執行者與交付標準，與同事逐項確認，比獨自承擔所有工作更有幫助。',
    exampleEn: 'When project ownership is unclear, identify decision makers, contributors and delivery standards. Confirm them with colleagues instead of taking on everything.',
    questionZh: '哪些工作條件支持我穩定投入？我想練習哪種合作或領導角色？',
    questionEn: 'Which conditions support sustained attention? Which collaborative or leadership role would I like to practice?',
    actionZh: '記錄一週工作中的投入與消耗，選一個流程和同事協商改善，設定交付標準並在兩週後回顧。',
    actionEn: 'Track engagement and strain during one workweek. Negotiate one process improvement, set a delivery standard and review it two weeks later.',
  },
  {
    zh: '豐盛在這裡指的是對時間、金錢與支持資源的覺察，不是收入預測。你可以檢查花費與重視的價值是否一致，也辨認決策是否被比較、焦慮或短暫滿足帶動。資源使用的彈性來自知道自己的限制，而非相信某個象徵能帶來好運。長期規劃可以先建立清楚的記錄與緩衝，再討論願意承擔的選擇。涉及投資、借貸或重大財務決策時，需要獨立的專業資訊，這份報告不能替代。適合的練習是讓決策更有意識，而不是要求自己立刻改變所有習慣。',
    en: 'Abundance here means awareness of money, time and support, not an income prediction. Compare spending with your values and notice decisions influenced by comparison, anxiety or immediate relief. Flexibility comes from understanding limits, not trusting symbolism to bring luck. Planning can begin with clear records and a buffer before considering trade-offs. Investments, loans and major financial decisions require independent professional information; this report cannot substitute for it. The practical aim is more deliberate decision-making, not pressure to transform every habit immediately.',
    exampleZh: '例如想購買一件昂貴物品時，先寫下用途與替代方案，留一天比較需求與預算，再決定是否值得。',
    exampleEn: 'Before buying an expensive item, describe its purpose and alternatives. Compare needs and budget after a day before deciding whether it is worthwhile.',
    questionZh: '我的資源分配反映哪些價值？哪些決策值得多留一段思考時間？',
    questionEn: 'Which values does my resource allocation reflect? Which decisions deserve more thinking time?',
    actionZh: '整理最近七天的時間與支出，分出必要、重要與可延後三類，選一項建立簡單的決策紀錄。',
    actionEn: 'Review seven days of time and spending. Separate necessary, important and deferrable uses, then keep a decision log for one category.',
  },
  {
    zh: '支持系統的品質不由聯絡人數決定，而在於能否交換真實資訊與尊重界線。社交特質可以透過不同場合觀察：你在小群體與大型聚會中可能需要不同的準備與休息。溝通不是一味配合，也包含說明自己能提供什麼、不能承擔什麼。當關係帶來挑戰時，可以區分意見差異與不被尊重的感受，尋找能安全討論的方式。支持需要互惠，但互惠不等於每次都完全對等。你可以建立多元的連結，避免把所有期待放在同一個人身上，也保留獨處的選擇。',
    en: 'A support system is not measured by the number of contacts but by honest information and respected boundaries. Observe differences between small groups and larger gatherings: preparation and recovery needs may vary. Communication includes describing what you can offer and what you cannot take on. Distinguish disagreement from feeling disrespected and look for a safe way to discuss it. Support benefits from reciprocity without requiring every interaction to be perfectly balanced. Build varied connections rather than placing every expectation on one person, and retain the option of solitude.',
    exampleZh: '例如朋友請求協助時，先確認所需的內容與時間，提供自己能負擔的部分；無法協助時，也可以清楚拒絕。',
    exampleEn: 'When a friend asks for help, clarify the task and time involved. Offer what you can sustain and decline clearly when necessary.',
    questionZh: '哪些互動讓我可以真實表達？我需要在哪段關係中練習界線？',
    questionEn: 'Which interactions allow honest expression? Where do I need to practice a boundary?',
    actionZh: '畫出目前的支持網絡，分別標註情緒、資訊與實務支持，挑一段關係安排尊重彼此界線的聯繫。',
    actionEn: 'Map emotional, informational and practical support. Choose one connection and arrange contact that respects both people’s limits.',
  },
  {
    zh: '當下成長可以從自己記錄的生活節奏開始，而非尋找預先安排的運勢。已驗證的出生資料只提供固定印記，不能推出今年好壞或人生事件發生時間。你可以觀察一週中注意力、休息與責任的分布，辨認哪些安排讓生活更可持續。節奏不必每天一樣，重要的是知道何時調整期待與尋求支持。反思主題可以固定，實踐速度則依現實條件選擇。若某個計畫反覆停滯，先檢查資源與任務大小，不要將它解讀成命運阻擋；改變安排本身也是成長。',
    en: 'Present growth can begin with observed routines rather than a predicted fortune cycle. Verified birth data supplies a fixed signature; it cannot establish whether a year is favorable or when events will occur. Track attention, rest and responsibilities across a week to identify sustainable arrangements. A rhythm need not be identical each day. Learn when to revise expectations or seek support. Keep a reflection theme while choosing a pace that fits reality. If a plan repeatedly stalls, examine resources and task size rather than interpreting it as destiny obstructing you.',
    exampleZh: '例如連續幾天難以專注時，記錄工作切換與休息時間，嘗試保留一段不被打斷的時段，再比較差異。',
    exampleEn: 'After several unfocused days, record task switching and rest. Protect one uninterrupted period and compare what changes.',
    questionZh: '我目前的安排支持了什麼？哪些期待需要依生活條件調整？',
    questionEn: 'What does my current routine support? Which expectations need adjustment to present circumstances?',
    actionZh: '連續七天記錄投入、休息與負擔，每天保留一個觀察句，最後只調整一項可控制的安排。',
    actionEn: 'Track effort, rest and demands for seven days. Write one observation daily, then change just one arrangement within your control.',
  },
  {
    zh: '自我照顧重點是辨認需要與建立可承受的日常練習，不是修復一個有缺陷的自己。情緒覺察可以先從命名感受開始，再注意當下最需要的支持。冥想與書寫只是可選擇的工具，若某個練習令人更不舒服，可以停止或改用其他方式。能量平衡在此是生活感受的象徵說法，不是可測量的醫療結論。持續困擾、影響日常功能或涉及安全的情況，應尋求合格專業協助。照顧自己也包含接受他人支持，並且不以完成多少練習衡量自己的價值。',
    en: 'Self-care means recognizing needs and choosing manageable practices, not fixing a defective self. Begin emotional awareness by naming a feeling and considering the support needed now. Meditation and journaling are optional tools. Stop or change a practice if it increases discomfort. Energy balance is a metaphor for lived experience, not a measurable medical conclusion. Persistent distress, impaired daily functioning or safety concerns warrant qualified professional support. Care can include accepting help, and the number of completed exercises is not a measure of personal worth.',
    exampleZh: '例如感到心煩時，可以先離開刺激來源片刻，寫下感受與一個現在能做的小選擇，而不是強迫自己立刻平靜。',
    exampleEn: 'When unsettled, step away from a stimulus briefly. Write down the feeling and one available choice instead of forcing immediate calm.',
    questionZh: '此刻我需要哪種支持？什麼照顧方式讓我感到可承受而非壓力？',
    questionEn: 'What support do I need now? Which practice feels manageable rather than demanding?',
    actionZh: '準備一份簡短照顧清單，包含休息、書寫與求助方式，每天選一項；不適合時允許更換。',
    actionEn: 'Prepare a short menu of rest, writing and support options. Choose one daily and allow yourself to change it.',
  },
  {
    zh: '九十天計畫把前十一篇的價值、學習、界線、合作與照顧主題連成可調整的路線。這不是運勢時間表，也不是必須完成的考核。先觀察，再試行，最後整理可持續的做法；若生活條件改變，就縮小任務並保留回顧。',
    en: 'The ninety-day plan connects values, learning, boundaries, cooperation and care from the preceding chapters. It is neither a fortune timetable nor a mandatory assessment. Observe first, experiment next and integrate sustainable practices last. Reduce task size and retain review time when circumstances change.',
    exampleZh: '例如工作繁忙時，將每天的書寫縮成一句話，保持觀察而不追求完美。',
    exampleEn: 'During a busy work period, reduce daily journaling to one sentence so observation remains possible without perfection.',
    questionZh: '哪個改變值得保留？',
    questionEn: 'Which change is worth retaining?',
    actionZh: '每週回顧一次並調整下一步。',
    actionEn: 'Review weekly and adjust the next step.',
  },
] as const;

const sealPractices = [
  ['照顧需要', 'care for needs'], ['清楚表達', 'clear expression'], ['容許未知', 'tolerating uncertainty'], ['啟動探索', 'starting exploration'],
  ['留意身體感受', 'noticing bodily experience'], ['接受轉變', 'accepting change'], ['掌握練習步驟', 'practicing deliberately'], ['欣賞細節', 'appreciating details'],
  ['觀察情緒流動', 'observing emotions'], ['理解關係需求', 'understanding relational needs'], ['嘗試不同視角', 'trying another perspective'], ['慎重選擇', 'choosing deliberately'],
  ['拓展經驗', 'expanding experience'], ['保持覺察', 'maintaining awareness'], ['看見整體', 'seeing the broader picture'], ['詢問理由', 'asking why'],
  ['調整方向', 'adjusting direction'], ['澄清界線', 'clarifying boundaries'], ['重新整理', 'reorganizing'], ['珍惜當下', 'appreciating the present'],
] as const;
const tonePractices = [
  ['確認目標', 'clarifying purpose'], ['辨認取捨', 'noticing trade-offs'], ['建立連結', 'building connections'], ['整理方法', 'organizing methods'],
  ['集中資源', 'focusing resources'], ['平衡安排', 'balancing commitments'], ['保持觀察', 'remaining observant'], ['對齊價值', 'aligning values'],
  ['持續回顧', 'reviewing consistently'], ['完成小步驟', 'completing a small step'], ['放下多餘負擔', 'releasing unnecessary burdens'], ['交換理解', 'exchanging understanding'], ['整合經驗', 'integrating experience'],
] as const;

export function mockLifeBlueprintV2(signature: MayaSignature, locale: MayaLocale): LifeBlueprintV2 {
  const evidence = blueprintEvidence(signature, locale);
  const en = locale === 'en';
  const seal = sealPractices[evidence.solarSeal.number - 1][en ? 1 : 0];
  const tone = tonePractices[evidence.galacticTone.number - 1][en ? 1 : 0];
  const plans = en ? [
    { actionSteps: ['Record one value and one choice daily.', 'Observe a learning condition each week.', 'Name a boundary, pressure response and care need.'], reflectionQuestions: ['Which value showed up in my choices?', 'What helped me understand a task?', 'Where did I need support?'] },
    { actionSteps: ['Try one small work-process change.', 'Make one clear relational request.', 'Review time and spending once a week.'], reflectionQuestions: ['Which change reduced friction?', 'Was my request mutually understood?', 'Did resource use match my values?'] },
    { actionSteps: ['Retain two sustainable routines.', 'Discuss support, rest and daily rhythms with a trusted person.', 'Write a review and choose the next step.'], reflectionQuestions: ['Which practices can I sustain?', 'What did I learn from feedback?', 'What will I adjust next month?'] },
  ] : [
    { actionSteps: ['每天記錄一項價值與一個選擇。', '每週觀察一種學習條件。', '寫下一項界線、壓力反應與照顧需要。'], reflectionQuestions: ['哪個價值出現在選擇中？', '什麼條件幫助我理解任務？', '我在哪裡需要支持？'] },
    { actionSteps: ['試行一項小型工作流程調整。', '練習提出一個清楚的關係請求。', '每週回顧時間與支出。'], reflectionQuestions: ['哪個調整減少了阻力？', '雙方是否理解相同的請求？', '資源使用符合價值嗎？'] },
    { actionSteps: ['保留兩項可持續的日常習慣。', '與可信任的人討論支持、休息與生活節奏。', '寫下總結並選擇下一步。'], reflectionQuestions: ['哪些練習可以繼續？', '我從回饋學到了什麼？', '下個月希望調整什麼？'] },
  ];
  return {
    reportVersion: LIFE_BLUEPRINT_VERSION, productCode: 'MAYA_FULL_499', locale,
    kinNumber: evidence.kinNumber, solarSeal: evidence.solarSeal, galacticTone: evidence.galacticTone, evidence,
    unsupportedFields: LIFE_BLUEPRINT_UNSUPPORTED,
    sections: BLUEPRINT_CHAPTERS.map((chapter, index) => ({
      id: chapter.id, evidence: { ...evidence, solarSeal: { ...evidence.solarSeal }, galacticTone: { ...evidence.galacticTone } },
      interpretation: en
        ? `${evidence.solarSeal.name} and ${evidence.galacticTone.name} tone frame "${chapter.en}" as an optional experiment in ${seal} through ${tone}. The connection is editorial symbolism, not a verified trait; compare it with your own observations.\n${themes[index].en}`
        : `${evidence.solarSeal.name}與${evidence.galacticTone.name}音調，讓「${chapter.zh}」可以從「${seal}」及「${tone}」展開探索。這是編輯設計的象徵聯想，不是已驗證的人格特質；請以自己的觀察決定哪些內容適用，保留與描述不同的經驗。\n${themes[index].zh}`,
      lifeExamples: [themes[index][en ? 'exampleEn' : 'exampleZh']],
      reflectionQuestions: themes[index][en ? 'questionEn' : 'questionZh'].split(en ? /(?<=\?) /u : /(?<=？)/u).filter(Boolean),
      actionSteps: [themes[index][en ? 'actionEn' : 'actionZh']],
    })),
    ninetyDayPlan: plans.map((plan, index) => ({
      id: (['awareness', 'action-adjustment', 'integration'] as const)[index], startDay: index * 30 + 1, endDay: (index + 1) * 30, ...plan,
    })),
  };
}
