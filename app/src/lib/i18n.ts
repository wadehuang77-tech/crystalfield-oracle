export const SUPPORTED_LANGUAGES = ['zh-Hant', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'zh-Hant';

export function getLanguageFromPath(pathname: string): Language {
  const normalized = pathname.replace(/\/+$|\/+$/g, '') || '/';
  if (normalized === '/en' || normalized.startsWith('/en/')) {
    return 'en';
  }
  return 'zh-Hant';
}

export function getCheckoutLocaleFromPath(pathname: string): 'en' | 'zh-TW' {
  return getLanguageFromPath(pathname) === 'en' ? 'en' : 'zh-TW';
}

export function getLocalizedPath(pathname: string, language: Language): string {
  const normalizedPath = pathname.replace(/\/+$|\/+$/g, '') || '/';
  const basePath = normalizedPath.startsWith('/en') ? normalizedPath.slice(3) || '/' : normalizedPath;
  const targetBase = basePath === '' ? '/' : basePath;
  return language === 'en' ? `/en${targetBase === '/' ? '' : targetBase}` : targetBase;
}

export const localeLabels: Record<Language, string> = {
  'zh-Hant': '繁體中文',
  en: 'English',
};

export function t(path: string, language: Language = DEFAULT_LANGUAGE): string {
  const segments = path.split('.');
  let value: unknown = translations[language];

  for (const segment of segments) {
    if (!value || typeof value !== 'object' || !(segment in value)) {
      value = translations[DEFAULT_LANGUAGE];
      for (const fallbackSegment of segments) {
        if (!value || typeof value !== 'object' || !(fallbackSegment in value)) {
          return path;
        }
        value = (value as Record<string, unknown>)[fallbackSegment];
      }
      return typeof value === 'string' ? value : path;
    }
    value = (value as Record<string, unknown>)[segment];
  }

  return typeof value === 'string' ? value : path;
}

const CARD_LABELS_EN: Record<string, string> = {
  '正位': 'Upright', '逆位': 'Reversed', '正位含義': 'Upright Meaning', '逆位含義': 'Reversed Meaning',
  '核心關鍵字詳解': 'Core Keywords', '核心關鍵字': 'Core Keywords', '能量流動': 'Energy Flow',
  '牌面核心關鍵字': 'Card Keywords', '時間感（很多人忽略）': 'Timing',
  '建議行動（最重要！）': 'Action Guidance', '脈輪 / 能量解讀': 'Chakra and Energy',
  '脈輪與療癒': 'Chakra and Healing', '高我訊息 / 靈魂提醒': 'Inner Wisdom',
  '完整含義': 'Full Meaning',
  '前 30% 預覽，登入後享有 3 次免費占卜': 'Previewing the first 30%. Sign in to get 3 free tarot readings.',
  '解鎖完整三張牌陣解讀': 'Unlock the Full Three-Card Reading',
  '解鎖完整前世因果解讀': 'Unlock the Full Past-Life Pattern Reading',
  '解鎖凱爾特十字完整解讀': 'Unlock the Full Celtic Cross Reading',
  '完整深度解析': 'Full In-Depth Reading', '前世今生': 'Past and Present',
  '大阿爾克那': 'Major Arcana', '小阿爾克那': 'Minor Arcana',
  '單張牌陣': 'Single-Card Spread', '三張牌陣解讀': 'Three-Card Reading',
  '完整解讀': 'Full Reading', '時間軸能量流動': 'Energy Across the Timeline',
  '對應脈輪': 'Associated Chakra', '能量問題': 'Energy Concern',
  '方向': 'Direction', '類型': 'Type', '時機': 'Timing', '速度': 'Pace', '建議': 'Guidance',
  '脈輪': 'Chakra', '靈魂訊息': 'Soul Message', '完整解析已解鎖': 'Full Interpretation Unlocked',
  '核心含意': 'Core Meaning', '核心能量': 'Core Energy', '指引': 'Guidance', '靈魂提醒': 'Soul Reminder',
  '可以問的問題': 'Questions to Explore', '能量重點': 'Energy Focus', '宇宙訊息': 'Cosmic Message',
  '現況解析': 'Current Situation', '深層含義': 'Deeper Meaning', '行動建議': 'Action Guidance',
  '能量療癒建議': 'Energy Care', '靈魂提問': 'Soul Question', '龍族訊息': 'Dragon Message',
  '牌面訊息': 'Card Message',
  '能量頻率': 'Energy', '過去': 'Past', '現在': 'Present', '未來': 'Future',
  '整體解讀': 'Overall Reading', '整體解讀總結': 'Overall Summary', '前世因果解鎖陣': 'Past-Life Pattern Spread',
  '抽牌': 'Draw Cards', '抽 牌': 'Draw Cards', '重 新 抽 牌': 'Draw Again', '重選牌陣': 'Choose Another Spread',
  '準 備 抽 牌': 'Prepare to Draw', '解鎖中…': 'Unlocking…', '載 入 中': 'Loading',
};

export function localizeCardLabel(label: string, language: Language): string {
  return language === 'en' ? CARD_LABELS_EN[label] ?? label : label;
}

export const translations = {
  'zh-Hant': {
    siteName: '晶域心語',
    home: '首頁',
    tarotHome: '塔羅主頁',
    login: '登入',
    logout: '登出',
    member: '會員',
    admin: '管理後台',
    languageLabel: '繁體中文｜English',
    landingBrand: 'Crystal Field 101',
    landingHeading: '晶域心語',
    landingIntro: '晶域心語是一個結合塔羅牌占卜、生命靈數、人類圖與印度占星的自我探索平台，協助使用者理解當下課題、個人天賦、能量特質與人生方向。',
    landingSupport: '首頁與服務介紹皆可免登入瀏覽；只有在使用會員專屬或需要保存個人結果的功能時，才會請你登入帳戶。',
    exploreTitle: '探索你的靈魂藍圖',
    exploreDescription: '透過塔羅牌、生命靈數、人類圖與印度占星，深入了解你的天賦、課題與人生方向。',
    cards: {
      tarot: {
        title: '塔羅牌占卜',
        tagline: '探索宇宙此刻想告訴你的訊息',
        description: '透過塔羅牌解讀感情、事業、財運與人生方向。',
        button: '開始占卜',
      },
      numerology: {
        title: '生命靈數',
        tagline: '解讀你的靈魂藍圖與人生課題',
        description: '輸入生日，探索天賦潛能、流年運勢與靈魂使命。',
        button: '開始分析',
      },
      humanDesign: {
        title: '人類圖',
        tagline: '發現你的天賦能量與人生策略',
        description: '了解你的能量類型、決策方式與最佳人生道路。',
        button: '立即查看',
      },
    },
    footerTagline: '「透過占卜看見方向,在療癒中回到內在平衡。」',
    footerPrivacy: '隱私權政策',
    routeTitles: {
      '/': '晶域心語', '/oracle': '塔羅神諭', '/privacy': '隱私權政策',
      '/tarot': '偉特塔羅', '/tarot-single': '偉特塔羅 · 單張',
      '/lightworker': '光行者神諭', '/lightworker/celtic-cross': '十字交叉使命陣',
      '/unicorns': '獨角獸塔羅', '/dragons': '龍族塔羅', '/egyptian-gods': '埃及神諭',
      '/work-your-light': '光之訊息', '/work-your-light-single': '光之訊息 · 深度解說',
      '/cosmic-cross': '宇宙十字陣', '/osho': '奧修禪卡', '/osho/single': '奧修禪卡 · 單張',
      '/osho/three': '奧修禪卡 · 三張', '/numerology': '生命靈數',
      '/human-design': '人類圖', '/vedic-astrology': '印度占星',
      '/checkout/return': '付款結果', '/membership': '月費會員',
      '/admin': '管理後台', '/admin/settings': '設定', '/admin/kpi': 'KPI',
      '/admin/members': '會員資料', '/admin/vedic-reviews': '印度占星評價',
      '/human-design/article': '人類圖知識', '/vedic-astrology/article': '印度占星知識',
    },
    tarot: {
      title: '偉特塔羅',
      tagline: '經典符碼的深度解讀。\n正逆位皆有其聲，牌陣決定深度。',
      chooseSpread: '選 擇 牌 陣',
      spreads: {
        single: { title: '單張牌', description: '快速指引' },
        three: { title: '三張牌陣', description: '過去 · 現在 · 未來' },
        celtic: { title: '凱爾特十字', description: '深度全面解讀' },
        pastlife: { title: '前世因果解鎖陣', description: '揭開前世今生的因果' },
      },
      aboutTitle: '關於偉特塔羅',
      aboutDescription: '偉特塔羅牌是世界上最廣為人知的塔羅牌系統，由亞瑟·愛德華·偉特設計，帕梅拉·科爾曼·史密斯繪製。這套牌包含 22 張大阿爾克那牌，代表生命的重要階段和靈性旅程。',
      howToUse: '如何使用',
      steps: ['深呼吸，讓心靈平靜', '在心中清楚地想著你的問題', '點擊按鈕，接收塔羅的指引', '用心感受卡片的訊息與智慧'],
      prepareTitle: '準備抽牌',
      prepareDescription: '靜心感受，當你準備好時點擊下方按鈕',
      draw: '抽牌',
      drawCards: '抽牌',
      chooseAgain: '重新選擇牌陣',
    },
    privacy: {
      title: '晶域心語隱私權政策',
      updated: '最後更新日期：2026 年 8 月 23 日',
      intro: '晶域心語重視你的隱私。本政策說明我們在你使用網站、Google 帳戶登入、塔羅占卜、生命靈數、人類圖、印度占星、會員與付款服務時，如何蒐集、使用、保存及保護資料。',
      contactLabel: '隱私權與資料相關聯絡信箱',
      home: '返回晶域心語首頁',
      sections: [
        { title: '一、我們蒐集的資料', paragraphs: [
          '當你使用晶域心語時，我們可能依你使用的功能蒐集帳戶資料（例如 Email）、你主動提供的占卜問題與選項、生命靈數、人類圖或印度占星計算所需的出生資料，以及訂單編號、商品、金額與付款狀態等交易紀錄。',
          '當你選擇使用 Google 帳戶登入時，我們會接收 Google 提供的唯一帳戶識別碼及已驗證的 Email，以建立或辨識你的晶域心語帳戶。我們不會取得或儲存你的 Google 密碼。',
          '網站也可能自動記錄瀏覽器類型、裝置資訊、頁面瀏覽、功能互動、Cookie、匿名訪客識別碼與概略連線資訊，以維持登入狀態、防止濫用並改善服務。',
        ] },
        { title: '二、資料使用目的', paragraphs: [
          '我們使用上述資料來提供帳戶登入、占卜與個人化解析、免費次數與會員權益管理、付款與訂單處理、客服回覆、安全防護、錯誤排查、服務品質分析及法令遵循。',
          '你提供的問題或出生資料，僅會在提供相應占卜、生命靈數、人類圖或印度占星服務所需的範圍內使用，不會作為公開內容；若你主動使用社群分享功能，公開頁面只會顯示經整理的摘要，不會公開完整付費報告或個人敏感資料。',
        ] },
        { title: '三、Google 使用者資料', paragraphs: [
          'Google 登入資料僅用於驗證身分、建立帳戶及維持登入狀態。我們不會將 Google 使用者資料出售，也不會用於與登入及帳戶服務無關的廣告用途。',
          '晶域心語對 Google API 所取得資訊的使用及傳輸，將遵守 Google API Services User Data Policy（包括 Limited Use 要求）。',
        ] },
        { title: '四、第三方服務', paragraphs: [
          '為提供網站功能，我們可能使用 Cloudflare 提供網站託管、資料庫與安全服務；Google Identity Services 提供 Google 登入；Google Analytics 4 與 Meta Pixel 協助分析網站使用情形；綠界科技處理付款；Resend 傳送必要郵件；VedAstro 依使用者明確同意處理出生日期、時間與地點以計算印度占星星盤；以及 AI 服務供應商根據去識別化的衍生星盤產生使用者要求的個人化解析。',
          '印度占星計算完成後，晶域心語只保存上升、行星星座、月宿與行星週期等衍生星盤，以及付款授權所需的關聯資料；不在印度占星資料表保存使用者輸入的原始出生日期、出生時間或出生地點文字。',
          '第三方服務會依其隱私權政策處理必要資料。付款卡號等敏感金流資料由金流服務商處理，晶域心語不會直接儲存完整信用卡資料。',
        ] },
        { title: '五、Cookie 與分析工具', paragraphs: [
          '我們使用必要 Cookie 維持登入、安全驗證與服務狀態，也使用分析及廣告衡量工具了解頁面瀏覽與功能使用情況。分析事件不應包含姓名、Email、完整生日、完整問題、完整解讀或付款資料。你可透過瀏覽器設定限制 Cookie，但部分登入或會員功能可能因此無法正常運作。',
        ] },
        { title: '六、資料保存與安全', paragraphs: [
          '我們只在提供服務、履行交易與法定義務、處理爭議及維護安全所需期間保存資料，並採取合理的技術與管理措施降低未授權存取、竄改、遺失或洩漏風險。網路傳輸與儲存無法保證絕對安全，但我們會持續改善保護措施。',
        ] },
        { title: '七、你的權利', paragraphs: [
          '你可聯絡我們要求查詢、更正或刪除帳戶與相關個人資料，或撤回先前同意。部分訂單、付款或安全紀錄可能因法律與營運需要保留至必要期限。若你不再希望使用 Google 登入，也可在 Google 帳戶的第三方連結設定中撤銷存取權。',
        ] },
        { title: '八、未成年人', paragraphs: [
          '本服務不是專為未滿法定年齡的兒童設計。未成年人應在法定代理人同意與陪同下使用本服務及進行付款。',
        ] },
        { title: '九、政策更新與聯絡方式', paragraphs: [
          '我們可能因服務、法令或第三方工具調整而更新本政策，更新後會在本頁公布並標示更新日期。若你對隱私權政策、Google 登入資料或資料刪除有任何疑問，請透過下方 Email 與我們聯絡。',
        ] },
      ],
    },
  },
  en: {
    siteName: 'Crystal Field',
    home: 'Home',
    tarotHome: 'Tarot Home',
    login: 'Log in',
    logout: 'Log out',
    member: 'Member',
    admin: 'Admin',
    languageLabel: '繁體中文｜English',
    landingBrand: 'Crystal Field 101',
    landingHeading: 'Crystal Field',
    landingIntro: 'Crystal Field is a self-discovery platform that blends tarot readings, numerology, Human Design, and Vedic astrology to help you understand your current life lessons, gifts, energy patterns, and life direction.',
    landingSupport: 'The homepage and service introductions are open to browse without login. You will only be asked to sign in when using member-only features or saving personal results.',
    exploreTitle: 'Explore Your Soul Blueprint',
    exploreDescription: 'Use tarot, numerology, Human Design, and Vedic astrology to gain a deeper understanding of your gifts, challenges, and life direction.',
    cards: {
      tarot: {
        title: 'Tarot Reading',
        tagline: 'Explore the message the universe is sharing right now',
        description: 'Use tarot to reflect on love, career, finances, and life direction.',
        button: 'Start Reading',
      },
      numerology: {
        title: 'Numerology',
        tagline: 'Decode your soul blueprint and life lessons',
        description: 'Enter your birth date to explore your talents, yearly cycles, and life purpose.',
        button: 'Start Analysis',
      },
      humanDesign: {
        title: 'Human Design',
        tagline: 'Discover your gifts and life strategy',
        description: 'Understand your energy type, decision-making style, and best path forward.',
        button: 'View Now',
      },
    },
    servicePages: {
      lightworker: {
        title: 'Lightworker Oracle',
        tagline: 'Let your soul’s purpose take shape in the present.\nChoose a spread and listen for your inner guidance.',
        heroTitle: 'Lightworker Oracle | Answer the Call of Your Soul',
        intro1: 'Have you ever felt a little out of place in the world?',
        intro2: 'You are not lost. You may simply be waiting to awaken.',
        intro3: 'Use the Lightworker Oracle as a prompt to reflect on your gifts, purpose, and next steps with compassion and clarity.',
        stepsTitle: 'Three Steps to Reflect',
        step1: 'Pause: Breathe slowly and bring your attention back to yourself.',
        step2: 'Ask: What would be helpful for me to understand about my purpose right now?',
        step3: 'Draw: Choose a card intuitively and reflect on what resonates.',
        singleTitle: 'Single Card', singleDescription: 'Receive a message for this moment',
        spreadTitle: 'Celtic Cross of Purpose', spreadDescription: 'Explore purpose and direction in greater depth',
        prompt: 'Take a quiet breath and focus on your question.',
        usageTitle: 'How to Begin',
        usageBody: 'Close your eyes and take three slow breaths. Hold your question in mind, choose a spread, and begin your reflection.',
        prepareTitle: 'Prepare to Draw',
        prepareBody: 'Close your eyes, focus on your question, and draw when you feel ready.',
        draw: 'Draw a Card', loading: 'Loading Cards', reset: 'Choose Another Spread',
      },
      unicorns: {
        title: 'Unicorn Oracle',
        tagline: 'A gentle reminder of love, hope, and possibility.\nOne card can open a moment for reflection.',
        about: 'The unicorn is a symbol of purity, unconditional love, healing, and wonder. This deck offers a gentler companion for reflecting on relationships, self-worth, and the care you need.',
        meditationTitle: 'Pause and Draw',
        meditationBody: 'Take a quiet moment with your question and let the cards offer a perspective to consider.',
        singleTitle: 'Single-Card Guidance', singleDescription: 'A message for today',
        threeTitle: 'Three-Card Spread', threeDescription: 'Past · Present · Future',
        library: 'Browse the Card Library',
        prepareTitle: 'Prepare for Your Reading',
        prepareBody: 'Settle your thoughts and draw when you are ready.',
        draw: 'Draw Cards', reset: 'Start Again',
      },
      dragons: {
        title: 'Dragon Oracle',
        heroTitle: 'Clear the Stagnation and Reclaim Your Strength',
        intro1: 'Are you carrying the strain of a difficult relationship or a situation that feels stuck?',
        intro2: 'The dragon is a symbol of courage, transformation, and protection. Use this reading to reflect on boundaries, patterns, and the next step you can choose.',
        intro3: 'You can stop abandoning your own needs. Make room for a clearer path forward.',
        stepsTitle: 'Three Steps to Reflect',
        step1: 'Ground: Sit comfortably and take a steady breath.',
        step2: 'Ask: Where do I need courage, clarity, or a stronger boundary?',
        step3: 'Draw: Choose cards intuitively and notice what feels relevant.',
        tagline: 'Ancient dragon lore and fire.\nFind the courage to transform and move forward.',
        guidanceTitle: 'Invite Dragon Guidance',
        guidanceBody: 'Close your eyes and take three breaths. Imagine finding steadiness and courage. When ready, choose a spread.',
        singleTitle: 'Single-Card Guidance', singleDescription: 'Receive a dragon message',
        threeTitle: 'Three-Card Spread', threeDescription: 'Past · Present · Future',
        prepareTitle: 'Prepare to Draw', prepareBody: 'Close your eyes and focus on the energy you want to understand.',
        draw: 'Draw Cards', reset: 'Choose Again',
      },
      egyptian: {
        title: 'Egyptian Oracle',
        heroTitle: 'Enter the Egyptian Oracle | Ancient Wisdom for Reflection',
        intro1: 'Welcome to a space inspired by the ancient temples of Egypt.',
        intro2: 'When you feel uncertain or ready for change, use these stories and symbols to reflect on your choices and the direction you want to take.',
        intro3: 'Take a quiet moment and begin your own inquiry with a card spread.',
        stepsTitle: 'Three Steps to Reflect',
        step1: 'Pause: Sit comfortably and take three slow breaths.',
        step2: 'Ask: What direction would help me with love, work, or life right now?',
        step3: 'Draw: Enter the temple and reflect on the symbols that appear.',
        tagline: 'Echoes of an ancient civilization.\nExplore symbols inspired by the Nile and its myths.',
        singleTitle: 'Single-Card Oracle', singleDescription: 'One card, one focused reflection.', singleAction: 'Draw a Card',
        pastlifeTitle: 'Past-Life Pattern Spread', pastlifeDescription: 'Seven cards to explore recurring themes and connections.', pastlifeAction: 'Open the Spread',
        prepareTitle: 'Prepare to Draw',
        prepareSingle: 'Close your eyes and focus on your question.',
        preparePastlife: 'Seven cards will help you explore themes and connections across time.',
        draw: 'Draw Cards', reset: 'Choose Another Spread',
      },
      osho: {
        title: 'Osho Zen Tarot', tagline: 'Not a prediction of the future, but a way to see the truth of this moment.',
        heroTitle: 'Osho Zen Tarot | Return to the Present',
        intro1: 'Much of life’s strain comes not only from difficult situations, but from holding on to the past or fearing what may come.',
        intro2: 'Think of these cards as a mirror for your present state of mind, unconscious patterns, and strengths you may have overlooked.',
        intro3: 'When you stop resisting the present, new answers can become easier to see.',
        stepsTitle: 'Three Steps to Presence',
        step1: 'Pause: Bring your attention back to your breath.',
        step2: 'Ask: What am I not seeing clearly in this moment?',
        step3: 'Draw: Choose a card and notice what it reflects for you.',
        singleTitle: 'Single-Card Spread', singleDescription: 'A direct reflection for this moment.',
        threeTitle: 'Three-Card Spread', threeDescription: 'Past · Present · Future, or Body · Mind · Spirit.',
      },
      workYourLight: {
        title: 'Work Your Light', tagline: 'Begin with the wisdom already within you.\nChoose a spread and let your own light guide the next step.',
        heroTitle: 'Work Your Light Oracle | Your Inner Wisdom Is a Resource',
        intro1: 'It is easy to look outside ourselves for answers and forget that we know our own experience best.',
        intro2: 'Rather than predicting fate, these cards offer prompts for reconnecting with intuition and considering what may help you move forward.',
        intro3: 'Take a slow breath, rest a hand over your heart, and listen to what feels true for you.',
        stepsTitle: 'Three Steps to Tune In',
        step1: 'Pause: Close your eyes and settle into your breath.',
        step2: 'Ask: What is my inner voice asking me to notice right now?',
        step3: 'Draw: Choose a card intuitively and consider its message.',
        singleTitle: 'Single Card', singleDescription: 'A message for this moment',
        cosmicTitle: 'Cosmic Cross Spread', cosmicDescription: 'Explore several dimensions of your life',
        aboutTitle: 'About This Deck', aboutBody: 'This oracle deck offers prompts for exploring inner wisdom and personal growth. Each card can help you consider a new perspective on your path.',
        usageTitle: 'How to Begin', usageSteps: ['Relax and take three slow breaths.', 'Hold your question in mind.', 'Draw a card and reflect on its message.', 'Take your time with the insight that emerges.'],
        draw: 'Draw a Card', loading: 'Preparing Cards', prepareTitle: 'Prepare to Draw',
        prepareBody: 'Focus on your question and draw when you feel ready.', reset: 'Start Again',
      },
    },
    numerology: {
      title: 'Free Numerology Reading: Explore Your Gifts, Missing Numbers, and Life Direction',
      intro: 'Enter your birth date to explore your life path number, birthday number, and foundational strengths. You can then explore missing numbers, personal-year themes, and crystal associations.',
      formTitle: 'Decode Your Soul Numbers',
      formDescription: 'Enter your birth date to explore your numerology profile.',
      birthDate: 'Date of Birth',
      year: 'Year (e.g. 1990)', yearPlaceholder: 'Year (e.g. 1990)',
      month: 'Month (1–12)', monthPlaceholder: 'Month (1–12)',
      day: 'Day (1–31)', dayPlaceholder: 'Day (1–31)',
      yearError: `Enter a year from 1900 to ${new Date().getFullYear()}`,
      monthError: 'Enter a month from 1 to 12', dayError: 'Enter a day from 1 to 31',
      loading: 'Preparing your numerology reading…', submit: 'Explore My Numerology Profile',
      featuresTitle: 'What You Can Explore',
      features: [
        { title: 'Numerology Profile', description: 'Explore the symbolism of your core numbers and personal themes.' },
        { title: 'Missing Numbers', description: 'Notice skills and life areas you may want to develop.' },
        { title: 'Crystal Associations', description: 'Explore crystal suggestions as optional reflection prompts.' },
        { title: 'Daily Energy', description: 'Receive a personalized daily reflection and energy prompt.' },
      ],
      tabs: { report: 'Numerology Report', daily: 'Daily Energy', ai: 'AI Guide' },
    },
    humanDesign: {
      title: 'Free Human Design Chart: Understand Your Type, Profile, and Inner Authority',
      description: 'Enter your birth date, time, and place to create a Human Design chart. Explore your Type, Strategy, Inner Authority, Profile, and definition as prompts for self-reflection, not fixed predictions.',
      birthDate: 'Date of Birth', birthTime: 'Time of Birth', birthCity: 'Birth City',
      hour: 'Hour', minute: 'Minute', timeHint: 'Use the 24-hour clock. For example, 8:00 PM is 20:00.',
      cityPlaceholder: 'e.g. Taipei, Tokyo, or New York', calculate: 'Calculate My Human Design Chart',
      trustSignals: ['Instant chart calculation', '5 energy types', 'Personal energy insights'],
      dateError: 'Enter a valid date in MM/DD/YYYY format that is not in the future.', timeError: 'Enter your birth time', cityError: 'Enter your birth city',
      analyzing: 'Reading your Human Design chart',
      steps: ['Analyzing your chart…', 'Bringing your energy centers together…', 'Preparing personalized insights…', 'Getting your free report ready…'],
      heroComplete: 'Your Human Design blueprint is ready',
      typeLabel: 'Your Type',
      soulMessage: 'Soul purpose message',
      profile: 'Profile', authority: 'Inner Authority', strategy: 'Strategy', incarnationCross: 'Incarnation Cross',
      signature: 'Signature', notSelf: 'Not-Self Theme', emailPlaceholder: 'Enter your email',
      emailInvalid: 'Please enter a valid email address', emailSaving: 'Saving…', emailSaveFailed: 'Could not save your email. Please try again.',
      unlockFree: 'Enter your email to unlock the free report', viewFreeReport: 'View Free Report', channels: 'Key channels detected',
    },
    vedic: {
      eyebrow: 'Vedic Astrology · Kundli, Nakshatra & Dasha',
      title: 'Vedic Astrology Birth Chart & Personalized Insights',
      description: 'Explore a Vedic astrology birth chart, ascendant, nine planets, Nakshatra, Pada, Dasha, relationships, career, and wealth themes. Enter your birth details to create a chart, with optional AI-powered in-depth readings.',
      formTitle: 'Enter Your Birth Details', accuracy: 'A more accurate birth time supports more reliable ascendant and house calculations.',
      birthDate: 'Date of Birth', birthTime: 'Time of Birth', birthHour: 'Hour', birthMinute: 'Minute',
      timeHint: 'Use the 24-hour clock. For example, select 20:30 for 8:30 PM.',
      birthPlace: 'Birthplace', placePlaceholder: 'e.g. Taipei, Taiwan', placeRequired: 'Enter a city and country or region.',
      cityError: 'Enter a birthplace', calculate: 'Open My Vedic Chart', calculating: 'Connecting to your birth chart…',
      disclaimer: 'For self-reflection and entertainment only. This service does not replace medical, legal, financial, or mental health advice.',
      deepTitle: 'Nine In-Depth Vedic Astrology Readings', deepEyebrow: 'Full Report',
      deepDescription: 'Explore your birth chart, Rahu and Ketu, planetary periods, the D9 relationship chart, and the D10 career chart in one connected life overview.',
      reportGenerating: 'Your in-depth report is being generated', reportWait: 'This may take about 1–2 minutes.',
      lagna: 'Ascendant', moon: 'Moon', nakshatra: 'Nakshatra', sun: 'Sun', mahaDasha: 'Current Dasha', antarDasha: 'Sub-period',
    },
    oraclePage: {
      title: 'Free Tarot and Oracle Card Readings',
      intro: 'Choose a topic, write down your question, and explore a deck and spread selected for reflection.',
      needs: {
        emotion_career: { shortLabel: 'Relationships and Work', title: 'I want insight into relationships, work, or finances', description: 'Reflect on relationships, work direction, collaboration, and financial themes to consider your current situation and next step.', questions: ['How might this relationship develop?', 'What should I understand about this connection?', 'Is this a good time to change roles or start a project?', 'What should I consider about this opportunity?', 'What may be affecting my financial choices?'] },
        past_life: { shortLabel: 'Past-Life Themes', title: 'I want to explore past-life themes', description: 'Reflect on recurring relationship patterns, life themes, commitments, and unfinished questions through symbolic storytelling.', questions: ['What might connect me and this person?', 'Why do I keep encountering a similar relationship pattern?', 'What themes may be connected to my current challenge?', 'What lesson am I working through?', 'What old pattern may I be ready to release?'] },
        soul: { shortLabel: 'Inner Guidance', title: 'I am looking for inner guidance', description: 'Reflect on current life themes, inner obstacles, and personal values to consider choices that feel more aligned with you.', questions: ['What do I most need to face right now?', 'What may be keeping me from moving forward?', 'What do I truly want?', 'What would be helpful to notice now?', 'Which direction feels most authentic to me?'] },
        clearing: { shortLabel: 'Relationship Patterns', title: 'I want to understand difficult relationship patterns', description: 'Reflect on accumulated emotions, attachment, conflict, and boundaries to identify what you may want to release or change.', questions: ['What patterns are affecting this relationship?', 'What might I need to let go of?', 'What makes it difficult to move on?', 'Are attachment or boundary patterns affecting us?', 'How can I care for myself after this relationship?'] },
      },
      needLabel: 'OPTION', questionExamples: 'Questions to Explore', questionLabel: 'What would you like to ask?',
      questionPlaceholder: 'Write one question you would like guidance on…',
      checking: 'Checking access…', loginTrial: 'Sign in to Start Your Free Trial', startTrial: 'Start 7-Day Free Trial', enterSpread: 'Continue to Spread',
      askQuestion: 'Enter your question first.', accessError: 'Could not verify tarot access. Please try again.',
      guestInfo: 'Sign in with Google to start a 7-day all-deck tarot trial. No credit card is required, and it will not auto-renew.',
      availableTrial: 'You can start one 7-day all-deck tarot trial.',
      browseOnly: 'You can browse all deck and spread introductions. Full readings require an all-deck membership.',
      memberInfo: 'Your all-deck membership includes all seven decks and spreads while active.',
      advanced: 'Browse by Deck',
      deckNames: ['Rider-Waite Tarot', 'Lightworker Oracle', 'Unicorn Oracle', 'Dragon Oracle', 'Egyptian Oracle', 'Work Your Light', 'Osho Zen Tarot'],
      deckDescriptions: [
        ['Rider-Waite Tarot', 'Classic imagery for reflecting on relationships, work, finances, and choices. Includes single-card, three-card, Celtic Cross, and past-life pattern spreads.', '/tarot'],
        ['Lightworker Oracle', 'Explore gifts, purpose, and personal growth with a single card or Celtic Cross spread.', '/lightworker'],
        ['Unicorn Oracle', 'Gentle prompts for relationships, self-worth, and personal reflection with single-card and three-card spreads.', '/unicorns'],
        ['Dragon Oracle', 'Reflect on boundaries, draining patterns, and courage through single-card and three-card spreads.', '/dragons'],
        ['Egyptian Oracle', 'Explore myths and symbols, with single-card and seven-card past-life pattern spreads.', '/egyptian-gods'],
        ['Work Your Light', 'Reflect on intuition, inner potential, and direction with a single card or Cosmic Cross spread.', '/work-your-light'],
        ['Osho Zen Tarot', 'Return attention to the present with single-card and three-card spreads.', '/osho'],
      ],
      articleTitle: 'Explore Seven Tarot and Oracle Decks',
      articleDescriptions: [
        'Classic imagery for reflecting on relationships, work, finances, and choices. Includes single-card, three-card, Celtic Cross, and past-life pattern spreads.',
        'Explore gifts, purpose, and personal growth with a single card or Celtic Cross spread.',
        'Gentle prompts for relationships, self-worth, and personal reflection with single-card and three-card spreads.',
        'Reflect on boundaries, draining patterns, and courage through single-card and three-card spreads.',
        'Explore myths and symbols, with single-card and seven-card past-life pattern spreads.',
        'Reflect on intuition, inner potential, and direction with a single card or Cosmic Cross spread.',
        'Return attention to the present with single-card and three-card spreads.',
      ],
      deckLink: 'Explore deck and spreads',
      howToChoose: 'How to Choose a Deck',
      chooseIntro: 'These are thematic suggestions, not predictions. Browse the deck descriptions or choose the one that resonates with you now.',
      themes: ['Relationships, work, and finances', 'Purpose and personal gifts', 'Gentle reflection and self-worth', 'Relationship patterns and change', 'Past-life symbolism and life themes', 'Intuition and inner direction', 'Emotional awareness and presence'],
      spreadsTitle: 'Available Tarot Spreads',
      spreadsBody: 'Each deck offers different spreads: a single card focuses on one prompt; three cards explore time or multiple perspectives; Rider-Waite includes the Celtic Cross and a past-life pattern spread; Lightworker offers a Celtic Cross of Purpose; Egyptian Oracle offers a seven-card past-life pattern spread; and Work Your Light offers the Cosmic Cross. Check each deck page for the available options.',
      questionsTitle: 'What Can I Ask a Tarot Reading?',
      questionsBody: 'Reflect on relationships, work, finances, friendships, current challenges, life themes, personal growth, and possible next steps. Tarot and oracle cards are for self-reflection and do not replace medical, mental health, legal, or investment advice.',
      aboutTitle: 'About the Creator',
      aboutBody: 'Crystal Field brings together tarot, numerology, Human Design, Vedic astrology, and crystal-related reflection. Explore our other services:',
      services: ['Numerology', 'Human Design', 'Vedic Astrology'],
      faqTitle: 'Frequently Asked Questions',
      faqs: [
        ['Are online tarot readings accurate?', 'Tarot and oracle cards can help organize feelings and possible directions, but they do not guarantee outcomes.'],
        ['What can I ask about?', 'You can reflect on relationships, work, finances, friendships, current challenges, personal growth, and next steps.'],
        ['Can I ask the same question more than once?', 'Consider allowing time for real-world changes before revisiting a question.'],
        ['What is the difference between one card and three cards?', 'One card focuses on a single prompt; three cards can explore time, different perspectives, or a course of action.'],
        ['What is the Celtic Cross for?', 'It offers several perspectives on a complex situation, its influences, and possible actions.'],
        ['What is a past-life pattern spread?', 'A seven-card spread for reflecting on symbolic connections and recurring life themes.'],
        ['Which deck should I choose?', 'Start with the topic that matters to you, browse the deck introductions, or choose the one that resonates.'],
        ['Can tarot replace professional advice?', 'No. Consult a qualified professional for medical, mental health, legal, or investment concerns.'],
        ['Does the all-deck membership include all seven decks?', 'The active all-deck plan includes all seven decks and their available spreads.'],
      ],
      closing: 'May your inner wisdom light the way forward.',
    },
    footerTagline: '“Read the signs, return to your inner balance.”',
    footerPrivacy: 'Privacy Policy',
    routeTitles: {
      '/': 'Crystal Field', '/oracle': 'Oracle Cards', '/privacy': 'Privacy Policy',
      '/tarot': 'Rider-Waite Tarot', '/tarot-single': 'Rider-Waite Tarot · Single Card',
      '/lightworker': 'Lightworker Oracle', '/lightworker/celtic-cross': 'Celtic Cross of Purpose',
      '/unicorns': 'Unicorn Tarot', '/dragons': 'Dragon Tarot', '/egyptian-gods': 'Egyptian Oracle',
      '/work-your-light': 'Work Your Light', '/work-your-light-single': 'Work Your Light · Deep Reading',
      '/cosmic-cross': 'Cosmic Cross', '/osho': 'Osho Zen Tarot', '/osho/single': 'Osho Zen Tarot · Single Card',
      '/osho/three': 'Osho Zen Tarot · Three Cards', '/numerology': 'Numerology',
      '/human-design': 'Human Design', '/vedic-astrology': 'Vedic Astrology',
      '/checkout/return': 'Payment Status', '/membership': 'Membership',
      '/admin': 'Admin', '/admin/settings': 'Settings', '/admin/kpi': 'KPI',
      '/admin/members': 'Members', '/admin/vedic-reviews': 'Vedic Astrology Reviews',
      '/human-design/article': 'Human Design Guide', '/vedic-astrology/article': 'Vedic Astrology Guide',
    },
    tarot: {
      title: 'Rider-Waite Tarot',
      tagline: 'Explore the depth of a timeless symbolic tradition.\nUpright and reversed cards each speak; the spread shapes the reading.',
      chooseSpread: 'CHOOSE A SPREAD',
      spreads: {
        single: { title: 'Single Card', description: 'A quick reflection' },
        three: { title: 'Three-Card Spread', description: 'Past · Present · Future' },
        celtic: { title: 'Celtic Cross', description: 'A deeper, broader reading' },
        pastlife: { title: 'Past-Life Pattern Spread', description: 'Explore recurring patterns across lifetimes' },
      },
      aboutTitle: 'About Rider-Waite Tarot',
      aboutDescription: 'The Rider-Waite Tarot is one of the world’s best-known tarot systems. Designed by Arthur Edward Waite and illustrated by Pamela Colman Smith, its 22 Major Arcana cards represent significant stages of life and the inner journey.',
      howToUse: 'How to Begin',
      steps: ['Take a slow breath and settle your mind.', 'Hold your question clearly in mind.', 'Select a spread to receive a tarot reading.', 'Take your time with the card’s imagery and message.'],
      prepareTitle: 'Prepare for Your Reading',
      prepareDescription: 'Take a quiet moment, then draw when you feel ready.',
      draw: 'Draw a Card',
      drawCards: 'Draw Cards',
      chooseAgain: 'Choose Another Spread',
    },
    privacy: {
      title: 'Crystal Field Privacy Policy',
      updated: 'Last updated: August 23, 2026',
      intro: 'Crystal Field values your privacy. This policy explains how we collect, use, retain, and protect information when you use our website, Google sign-in, tarot readings, numerology, Human Design, Vedic astrology, membership, and payment services.',
      contactLabel: 'Privacy and data inquiries',
      home: 'Back to Crystal Field home',
      sections: [
        { title: '1. Information We Collect', paragraphs: [
          'Depending on the features you use, we may collect account details such as your email address; questions and choices you submit for readings; birth information needed for numerology, Human Design, or Vedic astrology; and transaction records such as order IDs, products, amounts, and payment status.',
          'If you sign in with Google, we receive the unique account identifier and verified email provided by Google to create or recognize your Crystal Field account. We do not receive or store your Google password.',
          'The website may also record browser and device details, page views, feature interactions, cookies, anonymous visitor identifiers, and general connection information to maintain sessions, prevent abuse, and improve the service.',
        ] },
        { title: '2. How We Use Information', paragraphs: [
          'We use this information to provide sign-in, readings and personalized interpretations, manage free allowances and membership benefits, process payments and orders, respond to support requests, protect security, troubleshoot errors, assess service quality, and comply with applicable laws.',
          'Questions and birth information are used only as needed to provide the related tarot, numerology, Human Design, or Vedic astrology service and are not published as public content. If you choose to share a result, the public page displays only a prepared summary, not the complete paid report or sensitive personal information.',
        ] },
        { title: '3. Google User Data', paragraphs: [
          'Google sign-in data is used only to verify your identity, create your account, and maintain your signed-in session. We do not sell Google user data or use it for advertising unrelated to sign-in and account services.',
          'Our use and transfer of information obtained through Google APIs complies with the Google API Services User Data Policy, including its Limited Use requirements.',
        ] },
        { title: '4. Third-Party Services', paragraphs: [
          'We may use Cloudflare for hosting, databases, and security; Google Identity Services for Google sign-in; Google Analytics 4 and Meta Pixel to understand site usage; ECPay to process payments; Resend to send necessary emails; VedAstro to calculate Vedic charts from birth date, time, and location with your explicit consent; and AI service providers to create requested personalized interpretations from derived chart data that has been de-identified.',
          'After a Vedic chart is calculated, Crystal Field stores derived chart details such as ascendant, planetary signs, lunar mansion, and planetary periods, along with data needed to authorize paid reports. The Vedic astrology tables do not store the raw birth date, time, or location text entered by the user.',
          'Third parties handle necessary information under their own privacy policies. Sensitive payment details, such as card numbers, are handled by the payment provider; Crystal Field does not directly store complete credit card details.',
        ] },
        { title: '5. Cookies and Analytics', paragraphs: [
          'We use essential cookies for sign-in, security checks, and service state. We also use analytics and advertising measurement tools to understand page views and feature usage. Analytics events should not include names, email addresses, full birth dates, complete questions or interpretations, or payment details. You can restrict cookies in your browser settings, although some sign-in or membership features may not work properly.',
        ] },
        { title: '6. Data Retention and Security', paragraphs: [
          'We retain information only for as long as needed to provide the service, complete transactions, meet legal obligations, resolve disputes, and maintain security. We use reasonable technical and administrative safeguards to reduce the risk of unauthorized access, alteration, loss, or disclosure. No internet transmission or storage can be guaranteed completely secure, and we continue to improve our safeguards.',
        ] },
        { title: '7. Your Rights', paragraphs: [
          'You may contact us to request access to, correction of, or deletion of your account and related personal information, or to withdraw consent you previously gave. Some order, payment, or security records may need to be retained for the period required by law or business operations. You can also revoke Google sign-in access through the third-party connections settings in your Google Account.',
        ] },
        { title: '8. Children', paragraphs: [
          'This service is not designed specifically for children below the age of legal capacity. Minors should use the service and make payments only with the consent and supervision of a legal guardian.',
        ] },
        { title: '9. Policy Updates and Contact', paragraphs: [
          'We may update this policy to reflect changes to our services, applicable laws, or third-party tools. Updates will be posted on this page with a revised date. If you have questions about this policy, Google sign-in data, or deletion of your information, contact us using the email address below.',
        ] },
      ],
    },
  },
} as const;

export type TranslationDictionary = (typeof translations)[Language];
