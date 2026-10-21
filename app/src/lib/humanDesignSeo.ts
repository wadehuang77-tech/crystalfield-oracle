import articles from '../data/human-design/articles.json';

export type HumanDesignArticleContent = {
  title: string; description: string; section: string; h1: string; intro: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  faq: string[][]; related: string[][]; updated?: string; sources?: string[][];
};
export const humanDesignArticles = articles as Record<string, HumanDesignArticleContent>;
export const humanDesignHome = {
  title: '免費人類圖計算｜五大類型、人生角色與內在權威－晶域心語',
  h1: '免費人類圖計算，認識你的類型與決策方式',
  description: '免登入免費查看人類圖類型入口，從公開新手指南認識策略、權威與人生角色。目前圖表為模擬結果；核心與 AI 深度解析依方案付費解鎖。',
  updated: '2026-10-19',
};
export const humanDesignEnglishDescription = 'Get a free type preview without signing in and explore public guides to strategy, authority and profile. Charts are currently simulated; core and AI deep readings require paid access.';
export const humanDesignLimit = '本站目前依出生資料產生可重現的模擬圖表，尚未使用天文星曆與完整時區換算；即使資料正確，也不能視為準確的個人排盤。請將結果用於認識欄位，不據此確認個人類型或權威。';
export const humanDesignReadingLinks = [
  ['人類圖怎麼看：新手閱讀指南', 'how-to-read'], ['五大類型與策略總覽', 'types'],
  ['生產者：回應與滿足', 'generator'], ['顯示生產者：節奏與調整', 'manifesting-generator'],
  ['投射者：邀請與合作', 'projector'], ['顯示者：告知與自主', 'manifestor'],
  ['反映者：環境與月亮週期', 'reflector'], ['內在權威：決策依據與時間', 'authority'],
];
const origin = 'https://www.crystalfield101.com';
export function humanDesignStructuredData(slug?: string) {
  const article = slug ? humanDesignArticles[slug] : undefined;
  const url = `${origin}/human-design/${slug ? `${slug}/` : ''}`;
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: '首頁', item: `${origin}/` },
    { '@type': 'ListItem', position: 2, name: '人類圖', item: `${origin}/human-design/` },
    ...(article ? [{ '@type': 'ListItem', position: 3, name: article.h1, item: url }] : []),
  ];
  return [
    article ? { '@context': 'https://schema.org', '@type': 'Article', headline: article.h1,
      description: article.description, url, inLanguage: 'zh-Hant', mainEntityOfPage: url,
      ...(article.updated ? { dateModified: article.updated } : {}) }
      : { '@context': 'https://schema.org', '@type': 'WebPage', name: humanDesignHome.title,
        description: humanDesignHome.description, url, inLanguage: 'zh-Hant' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs },
  ];
}
