import articles from '../data/numerology/articles.json';

export const numerologyArticles = articles;
export type NumerologySlug = keyof typeof articles;
export const numerologyHome = {
  title: '生命靈數免費計算｜主命數、缺失數與流年解析－晶域心語',
  h1: '生命靈數免費計算，探索你的天賦與人生方向',
  description: '登入後免費計算生命靈數，查看主命數、生日數與基礎結果。公開教學介紹缺失數及本站 2026 流年算法；AI 深度解讀、進階與流年報告依方案付費解鎖。',
};
export const numerologyFaq = [
  ['計算需要出生時間嗎？', '不需要，本站生命靈數使用西元出生年月日，不使用出生時、分或出生地。'],
  ['所有內容都免費嗎？', '公開介紹與教學文章免登入；個人計算需登入，可查看免費基礎結果。AI 深度解讀、進階與完整流年報告依現有方案付費解鎖。'],
  ['本站會保留大師數嗎？', '會。完整生日逐位加總後，縮減過程遇到 11、22、33 就停止；生日數也依同樣規則縮減。'],
  ['缺失數代表缺點嗎？', '不代表。它是生日原始數字中未出現的 1 到 9，可作為反思題目，不是能力缺陷或命運判定。'],
  ['目前可以查哪一年的流年？', '目前計算程式固定使用 2026 年，以出生月份加出生日期加 2026 後縮減，並保留 11、22、33；不是任意年份選擇器。'],
];
const origin = 'https://www.crystalfield101.com';
export function numerologyStructuredData(slug?: NumerologySlug) {
  const article = slug ? articles[slug] : null;
  const url = `${origin}/numerology/${slug ? `${slug}/` : ''}`;
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: '首頁', item: `${origin}/` },
    { '@type': 'ListItem', position: 2, name: '生命靈數', item: `${origin}/numerology/` },
    ...(article ? [{ '@type': 'ListItem', position: 3, name: article.h1, item: url }] : []),
  ];
  return [
    article ? { '@context': 'https://schema.org', '@type': 'Article', headline: article.h1, description: article.description,
      url, mainEntityOfPage: url, inLanguage: 'zh-Hant', dateModified: article.updated }
      : { '@context': 'https://schema.org', '@type': 'WebPage', name: numerologyHome.title, description: numerologyHome.description, url, inLanguage: 'zh-Hant' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs },
  ];
}
