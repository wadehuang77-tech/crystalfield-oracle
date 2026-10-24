import type { MayaLocale } from './maya';

export function mayaSeoContent(locale: MayaLocale) {
  const en = locale === 'en';
  return {
    title: en ? 'Free Dreamspell KIN Calculator & Galactic Signature | CrystalField101'
      : '免費馬雅13月亮曆查詢與個人KIN印記解析 | 晶域心語',
    description: en ? 'Enter your birth date to find your Dreamspell KIN, solar seal and galactic tone for free. Learn about the modern 13 Moon system and how free results differ from advanced readings.'
      : '想知道你的馬雅曆生日印記是什麼？透過晶域心語免費AI身心靈解析，快速查詢你的馬雅13月亮曆、圖騰能量與今日運勢。',
    ogDescription: en ? 'Enter your birth date to discover your galactic signature, 20 solar seals and 13 galactic tones.'
      : '輸入你的西元生日，立刻解鎖你的馬雅星系印記、20個圖騰與13調性專屬AI解析！',
    image: 'https://www.crystalfield101.com/images/maya-calendar-cover.jpg',
    h1: en ? 'Free Dreamspell KIN Calculator: Explore Your Galactic Signature' : '馬雅曆免費解盤，探索你的星系印記與生命密碼',
    intro: en ? [
      'Sign in and enter your birth date to find your KIN, solar seal and galactic tone for free. The calculator runs in your browser; no birth time or birthplace is needed.',
      'Your galactic signature combines a solar seal and a galactic tone within the 260-KIN cycle. This site uses modern Dreamspell / 13 Moon conventions for symbolic self-exploration, not the same system as traditional Maya calendars or a method of predicting events.',
    ] : [
      '登入後輸入出生日期，即可免費查看 KIN、太陽印記與銀河調性；計算在你的瀏覽器完成，不需要出生時間或地點。',
      '馬雅星系印記由太陽印記與銀河調性組合，對應 260 個 KIN。搜尋時也常寫作「瑪雅曆」；本站採用現代 Dreamspell／13月亮曆的規則，將馬雅生命密碼作為象徵性的自我探索入口，不等同於古代馬雅曆法，也不預測事件。',
    ],
    sections: en ? [
      { id: 'about', heading: 'What Is the Dreamspell 13 Moon Calendar?', text: 'Dreamspell is a modern symbolic system developed by José and Lloydine Argüelles in the late twentieth century. Its 13 Moon calendar uses thirteen 28-day months and a Day Out of Time. Inspired by Maya calendar symbolism, it is not the traditional Maya Tzolk’in calendar or a scientific forecasting method.' },
      { id: 'how-to', heading: 'How Do I Find My Dreamspell KIN for Free?', text: 'Enter your birth date, find your KIN, view its solar seal, and explore its galactic tone. After signing in, you can calculate locally without saving your birthday, or choose to save a member profile. February 29 birth signatures are not supported here, and the page will explain rather than guess a result.' },
      { id: 'solar-seals', heading: 'What Do the 20 Solar Seals Represent?', text: 'The twenty solar seals are symbolic archetypes, such as Red Dragon, White Wind, and Blue Night. They invite reflection on themes such as care, expression, imagination, and growth—not fixed personality labels or scientific diagnoses. The names below follow this site’s Dreamspell reference data.' },
      { id: 'galactic-tones', heading: 'What Do the 13 Galactic Tones Represent?', text: 'The thirteen tones describe symbolic qualities within a cycle, from setting a purpose to integrating an experience. Together with a solar seal, a tone identifies one of the 260 KIN. Explore these themes as prompts for reflection rather than predictions about your abilities or future.' },
      { id: 'free-results', heading: 'What Does the Free Calculator Show?', text: 'The free result shows your KIN, solar seal and galactic tone in a galactic identity card. You can also browse the twenty seals and thirteen tones on this page. This is a basic symbolic reference, not a free personalised AI report.' },
      { id: 'free-and-member', heading: 'Free Results and Advanced Member Readings', text: 'Sign in to use the free calculator, save your birth profile or view an unlocked report. Individual reports explore life gifts, potential strengths and growth questions; the full report also covers calendar indices, work and creativity, daily practice and relationships. Prices and separately purchased products are shown below; availability follows the current service status.' },
    ] : [
      { id: 'about', heading: '什麼是馬雅曆 Dreamspell？', text: 'Dreamspell 是 José 與 Lloydine Argüelles 於二十世紀後期發展的現代象徵系統。13 月亮曆以十三個各 28 天的月份及時間之外日安排年度節奏，並借用馬雅曆法的部分象徵。它不是傳統馬雅 Tzolk’in 曆法，也不是考古曆法的替代品；可用於日常反思與自我探索，不是科學預測工具。' },
      { id: 'how-to', heading: '如何免費查詢我的馬雅曆 KIN？', text: '輸入出生日期，取得 KIN，再查看太陽圖騰與了解銀河音調。登入後可在本地免費計算，不儲存生日；登入會員後可儲存個人資料並使用報告服務。目前不提供 2 月 29 日出生印記，遇到此日期會說明限制，不推測結果。' },
      { id: 'solar-seals', heading: '20 個太陽圖騰代表什麼？', text: '太陽圖騰是二十種象徵性原型，例如紅龍、白風與藍夜，可用來思考照顧、表達、想像與成長等主題。它們不是固定人格標籤，也不是科學診斷。以下名稱沿用本站 Dreamspell 參考資料，讓你從不同意象認識自己。' },
      { id: 'galactic-tones', heading: '13 個銀河音調代表什麼？', text: '銀河音調象徵一個週期中的不同品質，從確立方向、探索與調整，到整合經驗。十三種音調與二十種太陽圖騰組合成 260 個 KIN，可作為觀察行動方式與生命成長主題的提示，而不是能力評分或未來預測。' },
      { id: 'free-results', heading: '馬雅曆免費解盤可以看到哪些內容？', text: '免費結果會以星際身份卡呈現 KIN、太陽印記與銀河調性；本頁也可瀏覽二十種印記和十三種調性。這些內容適合先認識自己的象徵組合，不包含個人化 AI 深度報告。' },
      { id: 'free-and-member', heading: '免費內容與進階會員解讀有什麼不同？', text: '登入後即可免費計算，並可儲存會員資料與查看已解鎖報告。個人生命天賦報告包含生命天賦、潛在優勢與成長課題；完整生命藍圖另含波符與城堡編號說明、事業與創造力、每日實踐及關係互動。下方列出現有方案，各商品獨立解鎖，是否能生成以當下開放狀態為準。' },
    ],
    faqHeading: en ? 'Frequently Asked Questions' : '常見問題 FAQ',
    faq: en ? [
      ['What is a Dreamspell KIN?', 'A KIN is one of 260 symbolic signatures formed by a solar seal and a galactic tone in the Dreamspell cycle. It is a reflection tool, not a scientific personality assessment.'],
      ['How can I find my KIN?', 'Enter your birth date in the free calculator on this page. Your result includes a KIN, solar seal, and galactic tone. February 29 birth signatures are not supported by this site.'],
      ['Is Dreamspell the same as the traditional Maya calendar?', 'No. Dreamspell is a modern system inspired by calendar symbolism. Its date rules and purpose differ from traditional Maya calendar practice.'],
      ['What are solar seals and galactic tones?', 'The twenty solar seals represent symbolic archetypes; the thirteen galactic tones represent qualities of a cycle. Their combinations create the 260 KIN.'],
      ['Do I need my birth time, birthplace or an account?', 'An account and sign-in are required to calculate. You only need a birth date, not a birth time or birthplace. The basic browser calculator does not send or save your birthday.'],
      ['How do free calculations and paid reports differ?', 'The free calculator shows your basic KIN signature. Paid products offer deeper written reflection, visuals, and practice plans according to the selected product and current availability. Each product requires its own access.'],
    ] : [
      ['馬雅曆 KIN 是什麼？', 'KIN 是 Dreamspell 260 個象徵印記之一，由太陽圖騰與銀河音調組合。它提供自我反思視角，不是科學人格測驗。'],
      ['如何查詢我的 KIN？', '在本頁免費計算區輸入出生日期，即可查看 KIN、太陽圖騰與銀河音調。本站目前不支援 2 月 29 日出生印記。'],
      ['Dreamspell 與傳統馬雅曆相同嗎？', '不同。Dreamspell 是受曆法象徵啟發的現代系統，日期規則與用途並不等同於傳統馬雅曆法。'],
      ['太陽圖騰與銀河音調是什麼？', '二十種太陽圖騰代表象徵原型，十三種銀河音調代表週期品質；兩者組合形成 260 個 KIN。'],
      ['需要出生時間、地點或會員帳號嗎？', '需要先登入帳號才能計算。基本計算只需出生日期，不需要出生時間或地點，生日不會由基本計算工具傳送或儲存。'],
      ['免費查詢與付費報告有什麼不同？', '免費查詢提供基本 KIN 身份；付費商品依方案與實際開放狀態提供深入文字、圖表與實踐計畫，各商品需獨立權限。'],
    ],
  };
}

export function mayaMemberSeo(locale: MayaLocale) {
  return {
    h1: locale === 'en' ? 'My Dreamspell KIN Profile & Reports' : '我的馬雅曆 KIN 與會員報告',
    title: locale === 'en' ? 'My Dreamspell KIN Profile & Reports | CrystalField101' : '我的馬雅曆 KIN 與會員報告｜晶域心語',
    description: locale === 'en' ? 'Sign in to save your Dreamspell birth profile, calculate your KIN, and access your own unlocked reports.'
      : '登入會員儲存出生資料、免費計算馬雅曆 KIN，查看本人已解鎖的生命藍圖報告。會員資料不公開索引。',
  };
}

export function mayaSeoStructuredData(locale: MayaLocale) {
  const content = mayaSeoContent(locale);
  const en = locale === 'en';
  const site = 'https://www.crystalfield101.com';
  const url = `${site}${en ? '/en' : ''}/maya-calendar/`;
  const home = `${site}${en ? '/en' : ''}/`;
  return [
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${site}/#website`, name: 'CrystalField101', url: `${site}/` },
    { '@context': 'https://schema.org', '@type': 'WebPage', '@id': url, url, name: content.title, description: content.description, inLanguage: en ? 'en' : 'zh-Hant', isPartOf: { '@id': `${site}/#website` } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: en ? 'Home' : '首頁', item: home },
      { '@type': 'ListItem', position: 2, name: en ? 'Dreamspell' : '馬雅曆', item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: content.faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) },
  ];
}
