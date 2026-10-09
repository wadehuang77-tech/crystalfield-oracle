import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import {
  canonicalUrl,
  createSitemap,
  prerenderRoutes,
  routeOutputPath,
  siteUrl,
} from '../seo/prerender-routes.mjs';

const appDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(appDir, '..', 'dist');
const pageUrl = canonicalUrl;
const routesByPath = new Map(prerenderRoutes.map((route) => [route.path, route]));
const renderYear = new Date().getFullYear();
const vite = await createServer({
  configFile: join(appDir, '..', 'vite.config.ts'),
  root: join(appDir, '..'),
  resolve: {
    alias: [
      {
        find: /^react-router-dom$/,
        replacement: join(appDir, '..', 'node_modules', 'react-router-dom', 'dist', 'index.mjs'),
      },
      {
        find: /^react-router$/,
        replacement: join(appDir, '..', 'node_modules', 'react-router', 'dist', 'development', 'index.mjs'),
      },
    ],
  },
  ssr: {
    noExternal: ['react-router', 'react-router-dom'],
    resolve: { conditions: ['module', 'import'] },
  },
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
});
const [{ StaticRouter }, { appRoutePaths, default: App }] = await Promise.all([
  vite.ssrLoadModule('react-router-dom'),
  vite.ssrLoadModule('/src/App.tsx'),
]);
const normalizeRoutePath = (path) => {
  const normalized = `/${path.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : `${normalized}/`;
};
const renderApp = (path) => renderToString(createElement(
  StrictMode,
  null,
  createElement(StaticRouter, { location: normalizeRoutePath(path) }, createElement(App, { renderYear })),
));
const renderedRoot = (path) => `<div id="root" data-prerendered="true" data-prerender-year="${renderYear}">${renderApp(path)}</div>`;
const articleData = JSON.parse(await readFile(join(appDir, '..', 'src', 'data', 'human-design', 'articles.json'), 'utf8'));
const vedicArticleData = JSON.parse(await readFile(join(appDir, '..', 'src', 'data', 'vedic-astrology', 'articles.json'), 'utf8'));
const vedicLandingContent = JSON.parse(await readFile(join(appDir, '..', 'src', 'data', 'vedic-astrology', 'landing.json'), 'utf8'));
const generatedPaths = [];
const pages = [
  ['', '晶域心語｜塔羅、生命靈數、人類圖與印度占星', '晶域心語結合塔羅牌占卜、生命靈數、人類圖與印度占星，提供自我探索工具，協助你整理當下課題、個人天賦與人生方向。', '晶域心語', '晶域心語是一個結合塔羅牌占卜、生命靈數、人類圖與印度占星的自我探索平台，協助使用者理解當下課題、個人天賦、能量特質與人生方向。'],
  ['oracle', '免費塔羅牌占卜｜7套塔羅與神諭卡線上抽牌｜晶域心語', '免費體驗7套線上塔羅與神諭卡，包含偉特塔羅、光行者神諭、獨角獸塔羅、龍族塔羅、埃及神諭、光之訊息與奧修禪卡，探索感情、事業、前世因果與靈魂指引。', '免費塔羅牌占卜：7套塔羅與神諭卡線上抽牌', '晶域心語提供七套塔羅與神諭卡線上抽牌入口，依照你的問題選擇牌卡與牌陣，用於自我覺察、整理當下方向與下一步行動。'],
  ['tarot', '偉特塔羅線上占卜｜單張、三張與凱爾特十字｜晶域心語', '線上體驗偉特塔羅牌占卜，可選擇單張、三張、凱爾特十字及前世因果解鎖陣，探索感情、工作、財運與目前行動方向。', '偉特塔羅', '偉特塔羅以清楚的圖像象徵整理現實處境，適合思考感情發展、工作與事業、財運方向和目前的行動選擇。本網站提供單張、三張、凱爾特十字與前世因果解鎖陣。'],
  ['lightworker', '光行者神諭卡占卜｜探索靈魂使命與內在指引｜晶域心語', '透過光行者神諭卡接收靈魂使命與內在成長指引，使用單張牌及十字交叉使命陣，探索天賦、卡點與下一步方向。', '光行者神諭', '光行者神諭適合在尋找靈魂使命、個人天賦或內在成長方向時使用。你可以選擇單張牌，或使用十字交叉使命陣，從當下的卡點與資源整理下一步方向。'],
  ['unicorns', '獨角獸塔羅線上占卜｜感情療癒與溫柔指引｜晶域心語', '線上抽取獨角獸塔羅與神諭卡，透過單張或三張牌探索感情、人際關係、自我價值及過去、現在與未來的能量變化。', '獨角獸塔羅', '獨角獸塔羅以溫柔、鼓勵的語氣陪伴自我探索，適合整理感情、人際關係與自我價值。單張牌可聚焦當下提醒，三張牌則可觀察過去、現在與未來的能量變化。'],
  ['dragons', '龍族塔羅線上占卜｜關係清理、突破與行動力量｜晶域心語', '透過龍族塔羅單張及三張牌陣，探索關係消耗、能量清理、行動勇氣與突破方向，找回屬於自己的力量。', '龍族塔羅', '龍族塔羅適合面對關係消耗、界線整理與行動上的突破。你可以用單張牌確認當下需要看見的力量，也可以用三張牌整理能量清理、阻礙與行動方向。'],
  ['egyptian-gods', '埃及神諭卡占卜｜前世因果與人生課題解析｜晶域心語', '線上體驗埃及神諭卡，透過單張指引及七張前世因果解鎖陣，探索前世今生的連結、人生課題與靈魂成長方向。', '埃及神諭', '埃及神諭卡適合探索前世今生的連結、反覆出現的人生課題與靈魂成長方向。單張指引適合聚焦一個問題，七張前世因果解鎖陣則用來分層整理相關主題。'],
  ['work-your-light', '光之訊息卡占卜｜宇宙十字與靈魂藍圖指引｜晶域心語', '線上抽取Lightworker光之訊息卡，透過單張牌及宇宙十字牌陣，探索靈魂任務、內在潛能、能量狀態與行動指引。', '光之訊息', 'Lightworker 光之訊息卡適合在整理靈魂任務、內在潛能與能量狀態時使用。單張牌提供聚焦的訊息，宇宙十字牌陣則從多個角度整理靈魂藍圖與行動指引。'],
  ['osho', '奧修禪卡線上占卜｜覺察情緒與內在狀態｜晶域心語', '透過奧修禪卡單張與三張牌陣，覺察目前情緒、內在卡點及生命狀態，從當下意識中找到更清楚的行動方向。', '奧修禪卡', '奧修禪卡把注意力帶回當下，適合覺察目前情緒、內在卡點與生命狀態。單張牌用於即時觀察，三張牌可從過去、現在、未來或身心靈角度整理意識。'],
  ['numerology', '免費生命靈數｜生日數字、缺失數與流年解析｜晶域心語', '輸入生日，免費查看生命靈數、生日數字與基礎天賦解析，進一步探索缺失數字、感情模式、事業方向、個人流年及適合的水晶能量。', '免費生命靈數計算：從生日探索天賦、缺失數字與人生方向', '輸入出生日期進行生命靈數計算，了解生日數字、基礎天賦、缺失數字與個人流年，並將數字自我探索與水晶能量建議整合參考。'],
  ['human-design', '免費人類圖計算｜能量類型、人生角色與內在權威｜晶域心語', '輸入出生年月日、出生時間與地點，免費查看人類圖能量類型、人生角色、策略、內在權威與定義，探索適合自己的決策方式、天賦及生命節奏。', '免費人類圖計算：看懂你的能量類型、人生角色與內在權威', '輸入出生年月日、出生時間與出生地點，建立你的人類圖能量藍圖，了解自己的能量類型、策略、內在權威、人生角色與定義。'],
  ['vedic-astrology', vedicLandingContent.zhHant.title, vedicLandingContent.zhHant.description, vedicLandingContent.zhHant.h1, vedicLandingContent.zhHant.intro],
];
for (const [slug, article] of Object.entries(articleData)) {
  pages.push([
    `human-design/${slug}`,
    article.title,
    article.description,
    article.h1,
    article.intro,
  ]);
}
for (const [slug, article] of Object.entries(vedicArticleData)) {
  pages.push([`vedic-astrology/${slug}`, article.title, article.description, article.h1, article.summary]);
}

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const escapeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const alternateLinks = (path) => {
  const route = routesByPath.get(path);
  if (route?.alternatePath === undefined) return '';
  const chinesePath = route.language === 'zh-Hant' ? route.path : route.alternatePath;
  const englishPath = route.language === 'en' ? route.path : route.alternatePath;
  return [
    `<link rel="alternate" hreflang="zh-Hant" href="${pageUrl(chinesePath)}" />`,
    `<link rel="alternate" hreflang="en" href="${pageUrl(englishPath)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${pageUrl(chinesePath)}" />`,
  ].join('\n    ');
};
const mainNavigation = (language) => {
  const links = language === 'en'
    ? [
        ['Oracle cards', 'oracle'],
        ['Numerology', 'numerology'],
        ['Human Design', 'human-design'],
        ['Vedic astrology', 'vedic-astrology'],
      ]
    : [
        ['塔羅與神諭卡', 'oracle'],
        ['生命靈數', 'numerology'],
        ['人類圖', 'human-design'],
        ['印度占星', 'vedic-astrology'],
      ];
  return `<nav aria-label="${language === 'en' ? 'Main navigation' : '主要導覽'}"><ul>${links.map(([label, path]) => `<li><a href="${pageUrl(language === 'en' ? `en/${path}` : path)}">${label}</a></li>`).join('')}</ul></nav>`;
};

const template = await readFile(join(distDir, 'index.html'), 'utf8');
const chinesePagesByPath = new Map(pages.map((page) => [page[0], page]));
const chineseRoutes = prerenderRoutes.filter((route) => route.language === 'zh-Hant');
if (chinesePagesByPath.size !== chineseRoutes.length) {
  throw new Error(`Chinese SEO metadata count does not match route manifest.`);
}
for (const route of chineseRoutes) {
  const page = chinesePagesByPath.get(route.path);
  if (!page) throw new Error(`Missing Chinese SEO metadata for route "${route.path}".`);
  const [path, title, description, h1, intro] = page;
  const canonical = pageUrl(path);
  const articleSlug = path.startsWith('human-design/') ? path.slice('human-design/'.length) : '';
  const article = articleData[articleSlug];
  const vedicSlug = path.startsWith('vedic-astrology/') ? path.slice('vedic-astrology/'.length) : '';
  const vedicArticle = vedicArticleData[vedicSlug];
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: 'zh-Hant' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: path === 'vedic-astrology' ? '首頁' : '晶域心語',
        item: pageUrl(path === 'vedic-astrology' ? '' : 'oracle'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: path === 'vedic-astrology' ? '印度占星' : h1,
        item: canonical,
      },
    ] },
  ];
  if (path === 'numerology') {
    const faq = [
      ['生命靈數怎麼算？', '將出生年月日的每個數字相加，再持續加總至個位數；本系統會保留 11、22、33 等大師數字。'],
      ['生命靈數可以看什麼？', '可以作為觀察天賦與性格、工作與事業方向、感情互動模式、個人流年、缺失數字與水晶能量的自我探索參考。'],
      ['缺失數字代表不好嗎？', '不代表好壞或缺陷，而是出生日期中較少出現的數字主題，可作為性格、學習方向與自我覺察的參考。'],
      ['生命靈數和個人流年有什麼不同？', '生命靈數以出生日期為基礎，個人流年則用來觀察某一年度的主題與能量側重。'],
      ['出生時間不確定也能計算嗎？', '可以；生命靈數計算使用出生日期，不需要出生時間。'],
      ['生命靈數結果會隨時間改變嗎？', '生命靈數本身不會因為時間改變；個人流年與人生經驗則會隨著年度和處境變化。'],
      ['生命靈數分析可以代替專業醫療或心理諮詢嗎？', '不可以。生命靈數適合自我覺察與方向整理，醫療或心理問題請尋求合格專業人士協助。'],
    ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    jsonLd.push(
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
    );
  }
  if (path === 'human-design') {
    const faq = [
      ['人類圖是什麼？', '人類圖是一套用於自我觀察的系統，可以從出生資料產生個人能量圖，探索能量類型、策略、內在權威、人生角色、定義與能量中心。'],
      ['人類圖怎麼計算？', '系統會依照出生年月日、時間與出生城市建立人類圖，並產生入口頁可查看的能量藍圖與後續報告內容。'],
      ['計算人類圖需要哪些出生資料？', '需要出生年月日、儘量準確的出生時間，以及出生城市或地點。出生時間可能影響計算結果。'],
      ['人類圖分析可以代替醫療或心理諮詢嗎？', '不可以。人類圖適合自我覺察與生活實驗，醫療或心理問題請尋求合格專業人士協助。'],
    ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    jsonLd.push(
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
    );
  }
  if (path === 'vedic-astrology') {
    const faq = vedicLandingContent.zhHant.faq.map(([name, text]) => ({
      '@type': 'Question',
      name,
      acceptedAnswer: { '@type': 'Answer', text },
    }));
    jsonLd.push(
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
    );
  }
  if (vedicArticle) {
    const faq = vedicArticle.faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    jsonLd.push(
      { '@context': 'https://schema.org', '@type': 'Article', headline: h1, description, url: canonical, inLanguage: 'zh-Hant', articleSection: '印度占星知識專區', mainEntityOfPage: { '@type': 'WebPage', '@id': canonical } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '晶域心語', item: pageUrl('oracle') }, { '@type': 'ListItem', position: 2, name: '印度占星', item: pageUrl('vedic-astrology') }, { '@type': 'ListItem', position: 3, name: h1, item: canonical }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
    );
  }
  if (article) {
    const faq = article.faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    jsonLd.push(
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: h1,
        description,
        url: canonical,
        inLanguage: 'zh-Hant',
        articleSection: article.section,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
    );
  }
  const ogType = article || vedicArticle ? 'article' : 'website';
  const articleTags = article || vedicArticle
    ? `<meta property="article:section" content="${escapeHtml(article?.section || '印度占星知識專區')}" />`
    : '';
  const head = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    ${alternateLinks(path)}
    <meta property="og:type" content="${ogType}" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:site_name" content="晶域心語" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${siteUrl}/20260315_164545.jpg" />
    ${articleTags}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${siteUrl}/20260315_164545.jpg" />
    <script type="application/ld+json" data-seo-jsonld>${escapeJson(jsonLd)}</script>`;
  const numerologyContent = path === 'numerology'
    ? `<section><h2>什麼是生命靈數？</h2><p>生命靈數是以出生日期中的數字進行整理的自我探索工具，可以從數字象徵觀察個人傾向、天賦與需要練習的方向。它不是對人生的固定預測。</p><h2>如何計算生命靈數？</h2><p>例如生日為 1990 年 12 月 31 日，可將 1+9+9+0+1+2+3+1 相加，得到 26，再將 2+6 相加得到 8。本系統會保留 11、22、33 等大師數字。</p><h2>什麼是缺失數字？</h2><p>缺失數字是出生日期中沒有出現的 1 到 9 數字，可作為性格、學習方向與自我覺察的參考。</p><h2>生命靈數常見問題</h2><details><summary>生命靈數怎麼算？</summary><p>將出生年月日的每個數字相加，再持續加總至個位數；本系統會保留 11、22、33 等大師數字。</p></details><details><summary>生命靈數可以看什麼？</summary><p>可以作為觀察天賦、工作、感情、個人流年、缺失數字與水晶能量的自我探索參考。</p></details><details><summary>生命靈數分析可以代替專業醫療或心理諮詢嗎？</summary><p>不可以；醫療或心理問題請尋求合格專業人士協助。</p></details><p><a href="${siteUrl}/oracle">探索塔羅與神諭卡</a> · <a href="${siteUrl}/human-design">深入探索人類圖</a> · <a href="${siteUrl}/vedic-astrology">查看印度占星分析</a></p></section>`
    : path === 'human-design'
      ? `<section><h2>什麼是人類圖？</h2><p>人類圖是一套用於自我觀察的系統，可以從出生資料產生個人能量圖，探索能量類型、策略、內在權威、人生角色、定義與能量中心。它適合作為自我探索與生活實驗工具，不取代專業諮詢。</p><h2>人類圖的5種能量類型</h2><h3>生產者 Generator</h3><p>觀察生命力與回應，等待身體對人事物的真實回應。</p><h3>顯示生產者 Manifesting Generator</h3><p>觀察多元興趣與快速節奏，先回應再行動並允許修正。</p><h3>投射者 Projector</h3><p>探索洞察與引導，重要方向可等待正確邀請。</p><h3>顯示者 Manifestor</h3><p>觀察啟動力，行動前告知相關的人以減少阻力。</p><h3>反映者 Reflector</h3><p>觀察環境與週期，給重要決定足夠時間。</p><h2>人類圖常見問題</h2><details><summary>人類圖是什麼？</summary><p>人類圖適合作為自我覺察與生活實驗的參考。</p></details><details><summary>人類圖分析可以代替醫療或心理諮詢嗎？</summary><p>不可以；醫療或心理問題請尋求合格專業人士協助。</p></details></section>`
      : '';
  const articleContent = article
    ? `<article><nav aria-label="麵包屑"><a href="${siteUrl}/human-design">人類圖</a> / ${escapeHtml(article.section)}</nav><header><p>${escapeHtml(article.section)}・閱讀指南</p><h1>${escapeHtml(article.h1)}</h1><p>${escapeHtml(article.intro)}</p><p>作者：韋德老師｜供自我覺察與生活實驗參考</p><p>更新日期：2026 年 9 月 17 日</p></header><nav aria-label="文章目錄"><h2>文章目錄</h2><ol>${article.sections.map((section, index) => `<li><a href="#section-${index + 1}">${escapeHtml(section.heading)}</a></li>`).join('')}<li><a href="#article-faq">常見問題</a></li></ol></nav>${article.sections.map((section, index) => `<section id="section-${index + 1}"><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('')}<section id="article-faq"><h2>常見問題</h2>${article.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}</section><section><h2>把閱讀變成一次生活實驗</h2><p>了解概念後，輸入自己的出生資料建立人類圖，從類型、內在權威和人生角色開始觀察。請保留判斷空間，讓結果服務於你的生活，而不是限制你的選擇。</p><p><a href="${siteUrl}/human-design">免費計算我的人類圖</a></p></section><aside>人類圖適合作為自我探索與生活實驗的參考，不代表科學、醫療或心理診斷，也不能取代醫療、心理、法律、財務或其他專業意見。請結合自己的真實經驗及現實情況進行判斷。</aside><nav aria-label="延伸閱讀"><h2>延伸閱讀</h2>${article.related.map(([label, href]) => `<a href="${siteUrl}${href}">${escapeHtml(label)}</a> `).join('')}</nav></article>`
    : vedicArticle
      ? `<article><nav aria-label="麵包屑"><a href="${siteUrl}/vedic-astrology">印度占星</a> / ${escapeHtml(vedicArticle.h1)}</nav><header><p>印度占星・閱讀指南</p><h1>${escapeHtml(vedicArticle.h1)}</h1><p>${escapeHtml(vedicArticle.summary)}</p><p>作者：韋德老師｜供自我覺察與生活實驗參考</p><p>發布日期：2026 年 9 月 17 日｜修改日期：2026 年 9 月 17 日</p></header><nav aria-label="文章目錄"><h2>文章目錄</h2><ol>${vedicArticle.sections.map((section, index) => `<li><a href="#section-${index + 1}">${escapeHtml(section.heading)}</a></li>`).join('')}<li><a href="#article-faq">常見問題</a></li></ol></nav>${vedicArticle.sections.map((section, index) => `<section id="section-${index + 1}"><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('')}<section id="article-faq"><h2>常見問題</h2>${vedicArticle.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}</section><section><h2>免費查看我的印度占星命盤</h2><p>輸入出生年月日、準確出生時間與地點，查看上升、行星、月宿與大運，探索前世業力、人生使命、感情、事業及未來趨勢。</p><p><a href="${siteUrl}/vedic-astrology">免費查看我的印度占星命盤</a></p></section><section><h2>關於作者</h2><p>韋德老師擁有十年以上塔羅、水晶療癒及命理實務經驗，是水晶療癒老師與身心靈系統設計者，持續整合印度占星、生命靈數、人類圖、塔羅與水晶能量，協助使用者進行自我探索。</p></section><aside>印度占星適合作為自我探索與生命週期整理的參考，不代表科學、醫療或心理診斷，也不能取代醫療、心理、法律、財務或其他專業意見。占星內容不保證特定事件一定發生，請結合真實情況及專業資訊進行判斷。</aside><nav aria-label="延伸閱讀"><h2>延伸閱讀</h2>${vedicArticle.related.map(([label, href]) => `<a href="${siteUrl}${href}">${escapeHtml(label)}</a> `).join('')}</nav></article>`
      : '';
  const truthfulArticleContent = articleContent
    .replace(/<p>(?:作者：|更新日期：|發布日期：)[\s\S]*?<\/p>/g, '')
    .replace(/<section><h2>關於作者<\/h2>[\s\S]*?<\/section>/g, '');
  const vedicContent = `<section><h2>什麼是印度占星？</h2><p>印度占星也常稱為吠陀占星或 Vedic Astrology，透過出生日期、時間與地點建立星盤，作為生命週期整理與自我探索工具，不是科學證實的預測。</p><h2>印度占星和西洋占星有什麼不同？</h2><p>兩者在黃道系統、星座位置與判讀方式上可能不同；印度占星常重視月宿 Nakshatra、羅喉與計都、大運週期，以及 D9、D10 分盤。</p><h2>計算印度占星需要哪些出生資料？</h2><p>需要出生年月日、儘量準確的出生時間，以及出生城市或地點。出生時間可能影響上升、宮位與分盤；不應自行捏造時間。</p><h2>印度占星命盤可以看什麼？</h2><p>可從上升、太陽、月亮、行星、月宿 Nakshatra、羅喉與計都、大運，以及 D1 本命盤、D9 九分盤、D10 十分盤等方向觀察。</p><h2>9 大印度占星深度解析</h2><h3>前世業力與今生課題</h3><p>以前世業力作為象徵語言，整理反覆模式與今生課題，不將前世視為已證實的歷史事實。</p><h3>羅喉／計都靈魂軸線</h3><p>觀察熟悉慣性與成長方向，仍需放回完整星盤理解。</p><h3>愛情、財富與事業方向</h3><p>整理關係、金錢與職涯主題，不保證特定結果。</p><h3>D9、D10 與未來 3～5 年大運時間軸</h3><p>分盤與週期需要可靠出生時間，並結合 D1 本命盤與當下行運觀察。</p><h2>什麼是羅喉與計都？</h2><p>計都可作為熟悉模式與過去慣性的象徵，羅喉可作為今生成長方向的象徵；兩者不能脫離完整星盤判讀。</p><h2>什麼是印度占星大運？</h2><p>大運與次週期用來整理人生階段主題，不代表事件必然發生。</p><h2>什麼是 D9 九分盤與 D10 十分盤？</h2><p>D9 可觀察婚姻與成熟度，D10 可觀察職涯與專業發展，兩者都應與 D1 一起判讀。</p><h2>為什麼選擇晶域心語印度占星？</h2><p>由韋德老師建立，整合印度占星、生命靈數、人類圖、塔羅與水晶能量，以生活化語言整理星盤資訊。</p><h2>印度占星常見問題</h2>${[['印度占星是什麼？','印度占星是以出生資料建立星盤、整理生命週期的文化性占星系統。'],['印度占星和西洋占星有什麼不同？','兩者在黃道系統、星座位置與判讀方式上可能不同。'],['印度占星需要哪些出生資料？','需要出生年月日、儘量準確的出生時間，以及出生城市或地點。'],['不知道準確出生時間可以計算嗎？','可以先整理可確認資料，但結果應保留不確定性，不要自行捏造出生時間。'],['什麼是羅喉與計都？','兩者是星盤中的象徵，需要放在完整星盤中觀察。'],['什麼是印度占星大運？','大運整理不同人生階段的主題，次週期提供更細時間層次。'],['什麼是月宿 Nakshatra？','月宿是觀察月亮位置與生命節奏的參考系統。'],['D9 九分盤可以看什麼？','D9 可觀察婚姻、承諾、價值與生命成熟度。'],['D10 十分盤可以看什麼？','D10 可觀察職涯、社會角色、責任與專業發展。'],['印度占星可以看前世嗎？','前世業力是占星象徵與自我探索語言，不是已證實的歷史事實。'],['印度占星可以預測未來嗎？','可整理週期與可能主題，但不能保證特定事件發生。'],['晶域心語有哪些印度占星內容可以免費查看？','入口會建立星盤並提供免費指引，完整內容依現有解鎖設定顯示。'],['我的出生資料會被公開嗎？','出生資料不會放入公開 SEO 內容或 Sitemap，保存與分享依登入、授權及隱私政策處理。'],['印度占星可以代替醫療、心理、法律或財務建議嗎？','不可以，相關專業問題請尋求合格專業人士協助。']].map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}<p><a href="${siteUrl}/numerology">查看生命靈數分析</a> · <a href="${siteUrl}/human-design">免費計算人類圖</a> · <a href="${siteUrl}/oracle">體驗塔羅與神諭卡</a></p></section>`;
  const content = path === 'numerology' ? numerologyContent : path === 'human-design' ? `<section><h2>什麼是人類圖？</h2><p>人類圖是一套用於自我觀察的系統，可以從出生資料產生個人能量圖，探索能量類型、策略、內在權威、人生角色、定義與能量中心。它適合作為自我探索與生活實驗工具，不取代專業諮詢。</p><h2>人類圖的5種能量類型</h2><h3>生產者 Generator</h3><p>觀察生命力與回應，等待身體對人事物的真實回應。</p><h3>顯示生產者 Manifesting Generator</h3><p>觀察多元興趣與快速節奏，先回應再行動並允許修正。</p><h3>投射者 Projector</h3><p>探索洞察與引導，重要方向可等待正確邀請。</p><h3>顯示者 Manifestor</h3><p>觀察啟動力，行動前告知相關的人以減少阻力。</p><h3>反映者 Reflector</h3><p>觀察環境與週期，給重要決定足夠時間。</p></section>` : path === 'vedic-astrology' ? vedicContent : truthfulArticleContent;
  const homeContent = path === ''
    ? '<p>首頁與服務介紹皆可免登入瀏覽；使用會員專屬或需要保存個人結果的功能時，才會請你登入帳戶。</p>'
    : '';
  const body = `<main id="seo-prerendered" lang="zh-Hant">${article || vedicArticle ? '' : `<h1>${escapeHtml(h1)}</h1><p>${escapeHtml(intro)}</p>`}${homeContent}${content}${mainNavigation('zh-Hant')}<p><a href="${pageUrl(vedicArticle ? 'vedic-astrology' : 'oracle')}">${vedicArticle ? '回到印度占星首頁' : '回到塔羅與神諭卡首頁'}</a></p></main>`;
  const cleanTemplate = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*\/>/g, '')
    .replace(/<meta property="og:(title|description)"[^>]*>/g, '');
  const output = cleanTemplate
    .replace('</head>', `${head}\n  </head>`)
    .replace('<div id="root"></div>', renderedRoot(`/${path}`))
    .replace(/href="(https:\/\/www\.crystalfield101\.com\/[^"#?]*[^/"#?])"/g, 'href="$1/"');
  const target = join(distDir, routeOutputPath(path));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output);
  generatedPaths.push(path);
}

const englishPages = [
  ['', 'Crystal Field | Tarot, Numerology, Human Design and Vedic Astrology', 'Explore tarot readings, numerology, Human Design, and Vedic astrology as tools for reflection and self-discovery.', 'Crystal Field', 'Crystal Field is a self-discovery platform that blends tarot readings, numerology, Human Design, and Vedic astrology to help you understand your current life lessons, gifts, energy patterns, and life direction.'],
  ['oracle', 'Free Tarot and Oracle Card Readings | Crystal Field', 'Explore seven tarot and oracle decks, choose a spread, and reflect on your question and possible next steps.', 'Free Tarot and Oracle Card Readings', 'Choose a topic, write down your question, and explore a deck and spread selected for reflection.'],
  ['tarot', 'Online Rider-Waite Tarot Reading | Crystal Field', 'Choose a single card, three-card spread, Celtic Cross, or past-life pattern spread for reflection on relationships, work, and life direction.', 'Rider-Waite Tarot', 'Use Rider-Waite imagery and symbolism to reflect on your circumstances and choices.'],
  ['lightworker', 'Lightworker Oracle Reading | Crystal Field', 'Explore a single-card reading or Celtic Cross spread to reflect on your gifts, purpose, and direction.', 'Lightworker Oracle', 'Choose a spread and use its prompts to reflect on your purpose and next steps.'],
  ['unicorns', 'Unicorn Oracle Reading | Crystal Field', 'Explore a gentle single-card or three-card oracle reading for reflection on relationships, self-worth, and personal growth.', 'Unicorn Oracle', 'Use these cards as gentle prompts for reflecting on relationships, self-worth, and care.'],
  ['dragons', 'Dragon Oracle Reading | Crystal Field', 'Use single-card and three-card spreads to reflect on boundaries, difficult patterns, courage, and possible next steps.', 'Dragon Oracle', 'Reflect on boundaries, recurring patterns, and the next step you can choose.'],
  ['egyptian-gods', 'Egyptian Oracle Reading | Crystal Field', 'Explore an Egyptian oracle card or seven-card spread inspired by ancient symbols and stories.', 'Egyptian Oracle', 'Use stories and symbols as prompts for reflecting on choices and life themes.'],
  ['work-your-light', 'Work Your Light Oracle Reading | Crystal Field', 'Explore a single card or Cosmic Cross spread with prompts for intuition, reflection, and personal growth.', 'Work Your Light', 'Use these cards to reconnect with your experience and consider what may help you move forward.'],
  ['osho', 'Osho Zen Tarot Reading | Crystal Field', 'Choose a single-card or three-card Osho Zen Tarot spread to reflect on your present state of mind.', 'Osho Zen Tarot', 'Reflect on the present moment, your inner state, and the choices available to you.'],
  ['numerology', 'Free Numerology Reading | Crystal Field', 'Enter your birth date to explore your life path number, strengths, missing numbers, personal-year themes, and crystal associations.', 'Free Numerology Reading', 'Explore your numbers as prompts for reflecting on strengths, life themes, and direction.'],
  ['human-design', 'Free Human Design Chart | Crystal Field', 'Create a Human Design chart from your birth date, time, and place. Explore your Type, Profile, Strategy, and Inner Authority.', 'Free Human Design Chart', 'Use your Human Design chart as a framework for self-reflection, not a fixed prediction.'],
  ['vedic-astrology', vedicLandingContent.en.title, vedicLandingContent.en.description, vedicLandingContent.en.h1, vedicLandingContent.en.intro],
];

const englishPagesBySlug = new Map(englishPages.map((page) => [page[0], page]));
const englishRoutes = prerenderRoutes.filter((route) => route.language === 'en');
if (englishPagesBySlug.size !== englishRoutes.length) {
  throw new Error(`English SEO metadata count does not match route manifest.`);
}
for (const route of englishRoutes) {
  const path = route.path;
  const slug = path === 'en' ? '' : path.slice('en/'.length);
  const page = englishPagesBySlug.get(slug);
  if (!page) throw new Error(`Missing English SEO metadata for route "${path}".`);
  const [, title, description, h1, intro] = page;
  const canonical = pageUrl(path);
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: 'en' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: path === 'en/vedic-astrology' ? 'Home' : 'Crystal Field',
        item: pageUrl(path === 'en/vedic-astrology' ? 'en' : 'en/oracle'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: path === 'en/vedic-astrology' ? 'Vedic Astrology' : h1,
        item: canonical,
      },
    ] },
  ];
  if (path === 'en/vedic-astrology') {
    const faq = vedicLandingContent.en.faq.map(([name, text]) => ({
      '@type': 'Question',
      name,
      acceptedAnswer: { '@type': 'Answer', text },
    }));
    jsonLd.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq });
  }
  const head = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    ${alternateLinks(path)}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:site_name" content="Crystal Field" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${siteUrl}/20260315_164545.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${siteUrl}/20260315_164545.jpg" />
    <script type="application/ld+json" data-seo-jsonld>${escapeJson(jsonLd)}</script>`;
  const homeContent = slug === ''
    ? '<p>The homepage and service introductions are open to browse without login. Sign-in is only needed for member features and saving personal results.</p>'
    : '';
  const body = `<main id="seo-prerendered" lang="en"><h1>${escapeHtml(h1)}</h1><p>${escapeHtml(intro)}</p>${homeContent}${mainNavigation('en')}</main>`;
  const cleanTemplate = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*\/>/g, '')
    .replace(/<meta property="og:(title|description)"[^>]*>/g, '')
    .replace(/<html lang="[^"]*"/, '<html lang="en"');
  const output = cleanTemplate
    .replace('</head>', `${head}\n  </head>`)
    .replace('<div id="root"></div>', renderedRoot(`/${path}`));
  const target = join(distDir, routeOutputPath(path));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output);
  generatedPaths.push(path);
}

const expectedPaths = prerenderRoutes.map((route) => route.path).sort();
const actualPaths = generatedPaths.sort();
if (new Set(actualPaths).size !== actualPaths.length
    || JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
  throw new Error(
    `Prerender route manifest mismatch: expected=${JSON.stringify(expectedPaths)}, actual=${JSON.stringify(actualPaths)}`,
  );
}
await writeFile(join(distDir, 'sitemap.xml'), createSitemap(), 'utf8');
const appShell = template.replace(
  '</head>',
  '<meta name="robots" content="noindex, nofollow" />\n  </head>',
);
await writeFile(join(distDir, 'app-shell.html'), appShell, 'utf8');
const clientOnlyRoutes = [...new Set(appRoutePaths)]
  .filter((path) => path !== '/' && !prerenderRoutes.some((route) => `/${route.path}` === path))
  .sort();
await writeFile(
  join(distDir, '_redirects'),
  `${clientOnlyRoutes.flatMap((path) => [
    `${path} /app-shell 200`,
    `${path}/ /app-shell 200`,
  ]).join('\n')}\n`,
  'utf8',
);
const notFoundHead = [
  '<title>找不到這個頁面 | Crystal Field 101</title>',
  '<meta name="robots" content="noindex, nofollow" />',
].join('\n    ');
const notFoundTemplate = template
  .replace(/<title>[\s\S]*?<\/title>/, '')
  .replace(/<meta name="description"[^>]*\/>/g, '')
  .replace(/<meta property="og:(title|description)"[^>]*>/g, '')
  .replace('</head>', `${notFoundHead}\n  </head>`)
  .replace(
    '<div id="root"></div>',
    '<main class="mx-auto w-full max-w-3xl px-6 py-20 text-center text-white"><p class="mb-3 text-sm uppercase tracking-[0.3em] text-white/60">404</p><h1 class="mb-5 text-3xl font-semibold">找不到這個頁面</h1><p class="mb-8 text-white/75">The page you requested could not be found.</p><nav class="flex justify-center gap-6"><a class="underline underline-offset-4" href="/">返回首頁</a><a class="underline underline-offset-4" href="/en/">English home</a></nav></main>',
  )
  .replace(/\s*<script type="module" crossorigin src="[^"]+"><\/script>/, '');
await writeFile(join(distDir, '404.html'), notFoundTemplate, 'utf8');
await vite.close();
