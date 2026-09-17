/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import humanDesignArticles from '../data/human-design/articles.json';
import vedicArticles from '../data/vedic-astrology/articles.json';

export type SeoConfig = {
  title: string;
  description: string;
  canonical: string;
  h1: string;
  intro: string;
  articleSection?: string;
};

const BASE_PUBLIC_SEO: Record<string, SeoConfig> = {
  '/oracle': {
    title: '免費塔羅牌占卜｜7套塔羅與神諭卡線上抽牌｜晶域心語',
    description: '免費體驗7套線上塔羅與神諭卡，包含偉特塔羅、光行者神諭、獨角獸塔羅、龍族塔羅、埃及神諭、光之訊息與奧修禪卡，探索感情、事業、前世因果與靈魂指引。',
    canonical: 'https://www.crystalfield101.com/oracle',
    h1: '免費塔羅牌占卜：7套塔羅與神諭卡線上抽牌',
    intro: '晶域心語提供七套塔羅與神諭卡線上抽牌入口，依照你的問題選擇牌卡與牌陣，用於自我覺察、整理當下方向與下一步行動。',
  },
  '/tarot': {
    title: '偉特塔羅線上占卜｜單張、三張與凱爾特十字｜晶域心語',
    description: '線上體驗偉特塔羅牌占卜，可選擇單張、三張、凱爾特十字及前世因果解鎖陣，探索感情、工作、財運與目前行動方向。',
    canonical: 'https://www.crystalfield101.com/tarot',
    h1: '偉特塔羅',
    intro: '偉特塔羅以清楚的圖像象徵整理現實處境，適合思考感情發展、工作與事業、財運方向和目前的行動選擇。本網站提供單張、三張、凱爾特十字與前世因果解鎖陣。',
  },
  '/lightworker': {
    title: '光行者神諭卡占卜｜探索靈魂使命與內在指引｜晶域心語',
    description: '透過光行者神諭卡接收靈魂使命與內在成長指引，使用單張牌及十字交叉使命陣，探索天賦、卡點與下一步方向。',
    canonical: 'https://www.crystalfield101.com/lightworker',
    h1: '光行者神諭',
    intro: '光行者神諭適合在尋找靈魂使命、個人天賦或內在成長方向時使用。你可以選擇單張牌，或使用十字交叉使命陣，從當下的卡點與資源整理下一步方向。',
  },
  '/unicorns': {
    title: '獨角獸塔羅線上占卜｜感情療癒與溫柔指引｜晶域心語',
    description: '線上抽取獨角獸塔羅與神諭卡，透過單張或三張牌探索感情、人際關係、自我價值及過去、現在與未來的能量變化。',
    canonical: 'https://www.crystalfield101.com/unicorns',
    h1: '獨角獸塔羅',
    intro: '獨角獸塔羅以溫柔、鼓勵的語氣陪伴自我探索，適合整理感情、人際關係與自我價值。單張牌可聚焦當下提醒，三張牌則可觀察過去、現在與未來的能量變化。',
  },
  '/dragons': {
    title: '龍族塔羅線上占卜｜關係清理、突破與行動力量｜晶域心語',
    description: '透過龍族塔羅單張及三張牌陣，探索關係消耗、能量清理、行動勇氣與突破方向，找回屬於自己的力量。',
    canonical: 'https://www.crystalfield101.com/dragons',
    h1: '龍族塔羅',
    intro: '龍族塔羅適合面對關係消耗、界線整理與行動上的突破。你可以用單張牌確認當下需要看見的力量，也可以用三張牌整理能量清理、阻礙與行動方向。',
  },
  '/egyptian-gods': {
    title: '埃及神諭卡占卜｜前世因果與人生課題解析｜晶域心語',
    description: '線上體驗埃及神諭卡，透過單張指引及七張前世因果解鎖陣，探索前世今生的連結、人生課題與靈魂成長方向。',
    canonical: 'https://www.crystalfield101.com/egyptian-gods',
    h1: '埃及神諭',
    intro: '埃及神諭卡適合探索前世今生的連結、反覆出現的人生課題與靈魂成長方向。單張指引適合聚焦一個問題，七張前世因果解鎖陣則用來分層整理相關主題。',
  },
  '/work-your-light': {
    title: '光之訊息卡占卜｜宇宙十字與靈魂藍圖指引｜晶域心語',
    description: '線上抽取Lightworker光之訊息卡，透過單張牌及宇宙十字牌陣，探索靈魂任務、內在潛能、能量狀態與行動指引。',
    canonical: 'https://www.crystalfield101.com/work-your-light',
    h1: '光之訊息',
    intro: 'Lightworker 光之訊息卡適合在整理靈魂任務、內在潛能與能量狀態時使用。單張牌提供聚焦的訊息，宇宙十字牌陣則從多個角度整理靈魂藍圖與行動指引。',
  },
  '/osho': {
    title: '奧修禪卡線上占卜｜覺察情緒與內在狀態｜晶域心語',
    description: '透過奧修禪卡單張與三張牌陣，覺察目前情緒、內在卡點及生命狀態，從當下意識中找到更清楚的行動方向。',
    canonical: 'https://www.crystalfield101.com/osho',
    h1: '奧修禪卡',
    intro: '奧修禪卡把注意力帶回當下，適合覺察目前情緒、內在卡點與生命狀態。單張牌用於即時觀察，三張牌可從過去、現在、未來或身心靈角度整理意識。',
  },
  '/numerology': {
    title: '免費生命靈數｜生日數字、缺失數與流年解析｜晶域心語',
    description: '輸入生日，免費查看生命靈數、生日數字與基礎天賦解析，進一步探索缺失數字、感情模式、事業方向、個人流年及適合的水晶能量。',
    canonical: 'https://www.crystalfield101.com/numerology',
    h1: '免費生命靈數計算：從生日探索天賦、缺失數字與人生方向',
    intro: '輸入出生日期進行生命靈數計算，了解生日數字、基礎天賦、缺失數字與個人流年，並將數字自我探索與水晶能量建議整合參考。',
  },
  '/human-design': {
    title: '免費人類圖計算｜能量類型、人生角色與內在權威｜晶域心語',
    description: '輸入出生年月日、出生時間與地點，免費查看人類圖能量類型、人生角色、策略、內在權威與定義，探索適合自己的決策方式、天賦及生命節奏。',
    canonical: 'https://www.crystalfield101.com/human-design',
    h1: '免費人類圖計算：看懂你的能量類型、人生角色與內在權威',
    intro: '輸入出生年月日、出生時間與出生地點，建立你的人類圖能量藍圖，了解自己的能量類型、策略、內在權威、人生角色與定義。結果適合作為自我覺察與生活實驗的參考，不是對人生的絕對定論。',
  },
  '/vedic-astrology': {
    title: '免費印度占星命盤｜前世業力、人生使命與未來運勢｜晶域心語',
    description: '輸入出生年月日、時間與地點，免費查看印度占星出生盤、上升、行星、月宿與大運指引，進一步探索前世業力、人生使命、感情、財富、事業及未來3～5年趨勢。',
    canonical: 'https://www.crystalfield101.com/vedic-astrology',
    h1: '免費印度占星命盤：探索前世業力、人生使命與未來趨勢',
    intro: '輸入出生年月日、準確出生時間與出生地點，建立你的印度占星出生盤，查看上升、行星、月宿與人生週期，從前世業力、今生課題、感情、財富、事業及未來趨勢理解自己的生命方向。',
  },
};

const HUMAN_DESIGN_ARTICLE_SEO: Record<string, SeoConfig> = Object.fromEntries(
  Object.entries(humanDesignArticles).map(([slug, article]) => [
    `/human-design/${slug}`,
    {
      title: article.title,
      description: article.description,
      canonical: `https://www.crystalfield101.com/human-design/${slug}`,
      h1: article.h1,
      intro: article.intro,
      articleSection: article.section,
    },
  ]),
);

const VEDIC_ARTICLE_SEO: Record<string, SeoConfig> = Object.fromEntries(
  Object.entries(vedicArticles).map(([slug, article]) => [
    `/vedic-astrology/${slug}`,
    {
      title: article.title,
      description: article.description,
      canonical: `https://www.crystalfield101.com/vedic-astrology/${slug}`,
      h1: article.h1,
      intro: article.summary,
      articleSection: '印度占星知識專區',
    },
  ]),
);

export const PUBLIC_SEO: Record<string, SeoConfig> = {
  ...BASE_PUBLIC_SEO,
  ...HUMAN_DESIGN_ARTICLE_SEO,
  ...VEDIC_ARTICLE_SEO,
};

const noindexPaths = new Set([
  '/tarot-single', '/lightworker/celtic-cross', '/work-your-light-single',
  '/cosmic-cross', '/osho/single', '/osho/three', '/auth', '/checkout/return',
  '/membership', '/admin', '/admin/settings', '/admin/kpi', '/admin/google-forms',
  '/admin/members', '/admin/tarot-subscriptions', '/admin/vedic-reviews',
]);

const SITE_NAME = '晶域心語';
const SITE_URL = 'https://www.crystalfield101.com';

function setMeta(name: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function setProperty(property: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function removeProperty(property: string) {
  document.head.querySelector(`meta[property="${property}"]`)?.remove();
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

function setJsonLd(data: unknown) {
  let script = document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld]');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoJsonld = 'true';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function buildStructuredData(pathname: string, seo: SeoConfig) {
  const breadcrumb = [
    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/oracle` },
    { '@type': 'ListItem', position: 2, name: seo.h1, item: seo.canonical },
  ];
  if (pathname === '/numerology') {
    const faq = [
      ['生命靈數怎麼算？', '將出生年月日的每個數字相加，再持續加總至個位數；本系統會保留 11、22、33 等大師數字。'],
      ['生命靈數可以看什麼？', '可以作為觀察天賦與性格、工作與事業方向、感情互動模式、個人流年、缺失數字與水晶能量的自我探索參考。'],
      ['缺失數字代表不好嗎？', '不代表好壞或缺陷，而是出生日期中較少出現的數字主題，可作為性格、學習方向與自我覺察的參考。'],
      ['生命靈數和個人流年有什麼不同？', '生命靈數以出生日期為基礎，個人流年則用來觀察某一年度的主題與能量側重。'],
      ['出生時間不確定也能計算嗎？', '可以；生命靈數計算使用出生日期，不需要出生時間。'],
      ['生命靈數結果會隨時間改變嗎？', '生命靈數本身不會因為時間改變；個人流年與人生經驗則會隨著年度和處境變化。'],
      ['生命靈數分析可以代替專業醫療或心理諮詢嗎？', '不可以。生命靈數適合自我覺察與方向整理，醫療或心理問題請尋求合格專業人士協助。'],
    ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    return [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: seo.title, description: seo.description, url: seo.canonical, inLanguage: 'zh-Hant' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
      { '@context': 'https://schema.org', '@type': 'Person', name: '韋德老師', description: '水晶療癒老師與身心靈系統設計者，擁有十年以上塔羅、水晶療癒及命理實務經驗。' },
    ];
  }
  if (pathname === '/human-design') {
    const faq = [
      ['人類圖是什麼？', '人類圖是一套用於自我觀察的系統，可以從出生資料產生個人能量圖，探索能量類型、策略、內在權威、人生角色、定義與能量中心。'],
      ['人類圖怎麼計算？', '系統會依照出生年月日、時間與出生城市建立人類圖，並產生入口頁可查看的能量藍圖與後續報告內容。'],
      ['計算人類圖需要哪些出生資料？', '需要出生年月日、儘量準確的出生時間，以及出生城市或地點。出生時間可能影響計算結果。'],
      ['不知道準確出生時間怎麼辦？', '可以查閱出生證明或戶籍資料；不應自行捏造時間，也不應把估計時間產生的結果當成完全準確。'],
      ['人類圖有哪5種能量類型？', '包括生產者、顯示生產者、投射者、顯示者與反映者。'],
      ['人類圖的策略是什麼？', '策略是減少阻力的觀察方向，不是強迫自己遵守的規定；不同能量類型會有不同的策略重點。'],
      ['什麼是內在權威？', '本系統實際支援情緒、薦骨、脾臟、意志力、自我投射與月亮週期等類型。'],
      ['什麼是人生角色？', '人生角色由兩條線組合，例如 1/3、2/4、4/6，反映學習方式、關係互動與人生經驗。'],
      ['人類圖結果會隨著時間改變嗎？', '出生資料產生的基本圖表不會因時間改變；你對圖表的理解會隨經驗累積而深化。'],
      ['人類圖分析可以代替醫療或心理諮詢嗎？', '不可以。人類圖適合自我覺察與生活實驗，醫療或心理問題請尋求合格專業人士協助。'],
      ['晶域心語的人類圖有哪些內容可以免費查看？', '入口會先建立人類圖並提供免費報告入口；完整內容依網站現有解鎖與會員設定顯示。'],
      ['我的出生資料會公開嗎？', '出生資料不會放入公開 SEO 內容或 Sitemap；實際保存與分享依網站登入、授權及隱私政策機制處理。'],
    ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    return [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: seo.title, description: seo.description, url: seo.canonical, inLanguage: 'zh-Hant' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
      { '@context': 'https://schema.org', '@type': 'Person', name: '韋德老師', description: '水晶療癒老師與身心靈系統設計者，擁有十年以上塔羅、水晶療癒及命理實務經驗。' },
    ];
  }
  if (pathname === '/vedic-astrology') {
    const faq = [
      ['印度占星是什麼？', '印度占星也常稱為吠陀占星或 Vedic Astrology，是以出生日期、時間與地點建立星盤，整理生命週期與自我探索方向的文化性占星系統。'],
      ['印度占星和西洋占星有什麼不同？', '兩者使用的黃道系統、星座位置與判讀方法可能不同；印度占星通常也重視月宿、羅喉與計都、大運週期，以及 D9、D10 分盤。'],
      ['印度占星需要哪些出生資料？', '需要出生年月日、儘量準確的出生時間，以及出生城市或地點。出生時間可能影響上升、宮位與分盤。'],
      ['不知道準確出生時間可以計算嗎？', '可以先整理可確認的資料，但結果應保留不確定性；請查閱出生證明或戶籍資料，不要自行捏造出生時間。'],
      ['什麼是羅喉與計都？', '計都可作為熟悉模式與過去慣性的象徵，羅喉可作為今生成長方向的象徵；兩者需要放在完整星盤中一起觀察。'],
      ['什麼是印度占星大運？', '大運用來整理不同人生階段的主題，次週期提供更細的時間層次，仍需結合本命盤與當下行運，不代表事件必然發生。'],
      ['什麼是月宿 Nakshatra？', '月宿 Nakshatra 是將黃道細分後觀察月亮位置的系統，可作為理解情緒反應、傾向與生命節奏的參考。'],
      ['D9 九分盤可以看什麼？', 'D9 九分盤可用來觀察婚姻、承諾、價值與生命成熟度，但需要可靠出生時間，並與 D1 本命盤一起判讀。'],
      ['D10 十分盤可以看什麼？', 'D10 十分盤可用來觀察職涯、社會角色、責任與專業發展，不應脫離 D1 本命盤單獨下結論。'],
      ['印度占星可以看前世嗎？', '前世業力是占星象徵與自我探索的語言，不能當成已被證實的歷史事實。'],
      ['印度占星可以預測未來嗎？', '印度占星可用來整理週期與可能的主題，不能保證特定事件一定發生，也不取代現實判斷。'],
      ['晶域心語有哪些印度占星內容可以免費查看？', '入口會先建立星盤並提供免費指引；完整深度解析的內容範圍依網站現有解鎖設定顯示。'],
      ['我的出生資料會被公開嗎？', '出生資料不會放入公開 SEO 內容或 Sitemap；實際保存與分享依網站登入、授權及隱私政策機制處理。'],
      ['印度占星可以代替醫療、心理、法律或財務建議嗎？', '不可以。印度占星適合自我覺察與生命週期整理，相關專業問題請尋求合格專業人士協助。'],
    ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    return [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: seo.title, description: seo.description, url: seo.canonical, inLanguage: 'zh-Hant' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
      { '@context': 'https://schema.org', '@type': 'Person', name: '韋德老師', description: '水晶療癒老師與身心靈系統設計者，擁有十年以上塔羅、水晶療癒及命理實務經驗。' },
    ];
  }
  if (seo.articleSection) {
    const vedicSlug = pathname.replace('/vedic-astrology/', '');
    const vedicArticle = vedicArticles[vedicSlug as keyof typeof vedicArticles];
    if (vedicArticle) {
      const faq = vedicArticle.faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
      return [
        { '@context': 'https://schema.org', '@type': 'Article', headline: seo.h1, description: seo.description, url: seo.canonical, inLanguage: 'zh-Hant', articleSection: seo.articleSection, datePublished: '2026-09-17', dateModified: '2026-09-17', image: `${SITE_URL}/20260315_164545.jpg`, mainEntityOfPage: { '@type': 'WebPage', '@id': seo.canonical }, author: { '@type': 'Person', '@id': `${SITE_URL}/#author`, name: '韋德老師' }, publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL } },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/oracle` }, { '@type': 'ListItem', position: 2, name: '印度占星', item: `${SITE_URL}/vedic-astrology` }, { '@type': 'ListItem', position: 3, name: seo.h1, item: seo.canonical }] },
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
        { '@context': 'https://schema.org', '@type': 'Person', '@id': `${SITE_URL}/#author`, name: '韋德老師', description: '水晶療癒老師與身心靈系統設計者，持續整合印度占星、生命靈數、人類圖、塔羅與水晶能量，協助使用者進行自我探索。' },
      ];
    }
    const slug = pathname.replace('/human-design/', '');
    const article = humanDesignArticles[slug as keyof typeof humanDesignArticles];
    if (article) {
      const faq = article.faq.map(([name, text]) => ({
        '@type': 'Question',
        name,
        acceptedAnswer: { '@type': 'Answer', text },
      }));
      const author = {
        '@type': 'Person',
        '@id': `${SITE_URL}/#author`,
        name: '韋德老師',
        description: '水晶療癒老師與身心靈系統設計者，整合人類圖、生命靈數、塔羅、印度占星與水晶能量。',
      };
      return [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: seo.h1,
          description: seo.description,
          url: seo.canonical,
          inLanguage: 'zh-Hant',
          articleSection: seo.articleSection,
          datePublished: '2026-09-17',
          dateModified: '2026-09-17',
          image: `${SITE_URL}/20260315_164545.jpg`,
          mainEntityOfPage: { '@type': 'WebPage', '@id': seo.canonical },
          author: { '@id': `${SITE_URL}/#author`, '@type': 'Person', name: '韋德老師' },
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb },
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
        { '@context': 'https://schema.org', ...author },
      ];
    }
  }
  if (pathname !== '/oracle') {
    return [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: seo.title, description: seo.description, url: seo.canonical, inLanguage: 'zh-Hant' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb },
    ];
  }
  const items = Object.entries(PUBLIC_SEO).filter(([path]) => path !== '/oracle').map(([, item], index) => ({
    '@type': 'ListItem', position: index + 1, name: item.h1, url: item.canonical, item: { '@type': 'Thing', name: item.h1, url: item.canonical },
  }));
  const faq = [
    ['線上塔羅牌占卜準確嗎？', '塔羅與神諭卡適合用來整理當下感受與可能方向，不保證固定結果，也不取代專業判斷。'],
    ['塔羅牌可以問哪些問題？', '可以圍繞感情發展、工作與事業、財運方向、人際關係、目前卡點、前世因果、靈魂使命、內在成長與下一步行動提問。'],
    ['同一個問題可以重複占卜嗎？', '建議先讓自己沉澱並觀察現實變化，再在問題或情境有新發展時重新整理。'],
    ['單張牌和三張牌有什麼不同？', '單張牌聚焦一個當下提醒；三張牌可用來觀察時間變化、不同面向或行動脈絡。'],
    ['凱爾特十字牌陣適合什麼問題？', '適合希望從多個角度深入整理複雜處境、影響因素與行動方向的問題。'],
    ['前世因果解鎖陣是什麼？', '這是七張牌的探索牌陣，用來分層觀察前世今生連結與人生課題，作為自我覺察參考。'],
    ['不知道該選哪一組牌怎麼辦？', '可以先從首頁依照問題主題選擇，也可以瀏覽七組牌卡介紹後憑直覺決定。'],
    ['塔羅占卜結果可以代替專業意見嗎？', '不可以；醫療、心理、法律或投資問題請諮詢合格專業人士。'],
    ['7組牌卡是否都包含在塔羅全館月費會員中？', '依目前方案設定，塔羅全館月費會員為 NT$600／月，會員有效期間可使用全部 7 套牌卡與所有牌陣。'],
  ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
  return [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: seo.title, description: seo.description, url: seo.canonical, inLanguage: 'zh-Hant' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: '七套塔羅與神諭卡', itemListElement: items },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
    { '@context': 'https://schema.org', '@type': 'Person', name: '韋德老師', description: '水晶療癒老師、身心靈系統設計者，擁有十年以上塔羅、水晶療癒及命理實務經驗。' },
  ];
}

export default function SeoMetadata() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const seo = PUBLIC_SEO[pathname];
    const title = seo?.title ?? SITE_NAME;
    const description = seo?.description ?? '晶域心語提供塔羅、神諭卡與自我探索服務。';
    const canonical = seo?.canonical ?? `${SITE_URL}${pathname}`;
    const hasVedicResult = pathname === '/vedic-astrology' && Boolean(sessionStorage.getItem('cf_vedic_chart_session'));
    const robots = noindexPaths.has(pathname) || Boolean(search) || hasVedicResult ? 'noindex, follow' : seo ? 'index, follow' : 'noindex, follow';
    document.title = title;
    setMeta('description', description);
    setMeta('robots', robots);
    setProperty('og:type', seo?.articleSection ? 'article' : 'website');
    setProperty('og:locale', 'zh_TW');
    setProperty('og:site_name', SITE_NAME);
    setProperty('og:title', title);
    setProperty('og:description', description);
    setProperty('og:url', canonical);
    setProperty('og:image', `${SITE_URL}/20260315_164545.jpg`);
    if (seo?.articleSection) {
      setProperty('article:section', seo.articleSection);
      setProperty('article:author', '韋德老師');
      setProperty('article:published_time', '2026-09-17');
      setProperty('article:modified_time', '2026-09-17');
    } else {
      removeProperty('article:section');
      removeProperty('article:author');
      removeProperty('article:published_time');
      removeProperty('article:modified_time');
    }
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', `${SITE_URL}/20260315_164545.jpg`);
    setCanonical(canonical);
    if (seo) setJsonLd(buildStructuredData(pathname, seo));
  }, [pathname, search]);

  return null;
}
