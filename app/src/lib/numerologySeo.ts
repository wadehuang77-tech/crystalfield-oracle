import articles from '../data/numerology/articles.json';

export const numerologyArticles = articles;
export type NumerologySlug = keyof typeof articles;
export const numerologyHome = {
  title: '生命靈數免費計算｜1-9號人天賦特質與水晶指南－晶域心語',
  h1: '生命靈數免費計算，探索你的天賦與人生方向',
  description: '登入後免費計算生命靈數主命數、生日數與基礎結果。公開閱讀 1-9 號人的天賦、工作與關係解析及水晶象徵指南；AI 深度解讀、進階與流年報告依方案付費解鎖。',
};
export const numerologyFaq = [
  ['生命靈數要怎麼計算？', '將西元出生年月日的每一位數字相加，再反覆加總結果的各位數；得到 1 到 9，或遇到 11、22、33 時停止。例如虛構生日 1990-12-31：1＋9＋9＋0＋1＋2＋3＋1＝26，2＋6＝8，主命數為 8。'],
  ['生命靈數如何搭配水晶？', '可依數字的反思主題及個人喜好選擇水晶，例如用紫水晶提醒自己安靜書寫、用粉晶提醒自己關照感受。這是象徵性搭配，不代表能補足缺失數、改變運勢或產生治療效果；不用水晶也能進行自我探索練習。'],
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
    ...(!article ? [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', '@id': `${url}#calculator`,
        name: '生命靈數計算器（免費基礎版）', url: `${url}#calculator`, applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web browser', inLanguage: 'zh-Hant', description: numerologyHome.description,
        offers: { '@type': 'Offer', name: '登入後免費基礎計算', price: 0, priceCurrency: 'TWD', url: `${url}#calculator` } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', '@id': `${url}#faq`,
        mainEntity: numerologyFaq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) },
    ] : []),
  ];
}
