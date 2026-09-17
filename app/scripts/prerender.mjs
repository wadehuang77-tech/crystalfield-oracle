import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(appDir, '..', 'dist');
const siteUrl = 'https://www.crystalfield101.com';
const articleData = JSON.parse(await readFile(join(appDir, '..', 'src', 'data', 'human-design', 'articles.json'), 'utf8'));
const pages = [
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

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const escapeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');

const template = await readFile(join(distDir, 'index.html'), 'utf8');
for (const [path, title, description, h1, intro] of pages) {
  const canonical = `${siteUrl}/${path}`;
  const articleSlug = path.startsWith('human-design/') ? path.slice('human-design/'.length) : '';
  const article = articleData[articleSlug];
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: 'zh-Hant' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '晶域心語', item: `${siteUrl}/oracle` },
      { '@type': 'ListItem', position: 2, name: h1, item: canonical },
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
      { '@context': 'https://schema.org', '@type': 'Person', name: '韋德老師', description: '水晶療癒老師與身心靈系統設計者，擁有十年以上塔羅、水晶療癒及命理實務經驗。' },
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
      { '@context': 'https://schema.org', '@type': 'Person', name: '韋德老師', description: '水晶療癒老師與身心靈系統設計者，擁有十年以上塔羅、水晶療癒及命理實務經驗。' },
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
        datePublished: '2026-09-17',
        dateModified: '2026-09-17',
        image: `${siteUrl}/20260315_164545.jpg`,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        author: { '@type': 'Person', '@id': `${siteUrl}/#author`, name: '韋德老師' },
        publisher: { '@type': 'Organization', name: '晶域心語', url: siteUrl },
      },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
      { '@context': 'https://schema.org', '@type': 'Person', '@id': `${siteUrl}/#author`, name: '韋德老師', description: '水晶療癒老師與身心靈系統設計者，整合人類圖、生命靈數、塔羅、印度占星與水晶能量。' },
    );
  }
  const ogType = article ? 'article' : 'website';
  const articleTags = article
    ? `<meta property="article:section" content="${escapeHtml(article.section)}" /><meta property="article:author" content="韋德老師" />`
    : '';
  const head = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
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
    <script type="application/ld+json">${escapeJson(jsonLd)}</script>`;
  const numerologyContent = path === 'numerology'
    ? `<section><h2>什麼是生命靈數？</h2><p>生命靈數是以出生日期中的數字進行整理的自我探索工具，可以從數字象徵觀察個人傾向、天賦與需要練習的方向。它不是對人生的固定預測。</p><h2>如何計算生命靈數？</h2><p>例如生日為 1990 年 12 月 31 日，可將 1+9+9+0+1+2+3+1 相加，得到 26，再將 2+6 相加得到 8。本系統會保留 11、22、33 等大師數字。</p><h2>什麼是缺失數字？</h2><p>缺失數字是出生日期中沒有出現的 1 到 9 數字，可作為性格、學習方向與自我覺察的參考。</p><h2>生命靈數常見問題</h2><details><summary>生命靈數怎麼算？</summary><p>將出生年月日的每個數字相加，再持續加總至個位數；本系統會保留 11、22、33 等大師數字。</p></details><details><summary>生命靈數可以看什麼？</summary><p>可以作為觀察天賦、工作、感情、個人流年、缺失數字與水晶能量的自我探索參考。</p></details><details><summary>生命靈數分析可以代替專業醫療或心理諮詢嗎？</summary><p>不可以；醫療或心理問題請尋求合格專業人士協助。</p></details><p><a href="${siteUrl}/oracle">探索塔羅與神諭卡</a> · <a href="${siteUrl}/human-design">深入探索人類圖</a> · <a href="${siteUrl}/vedic-astrology">查看印度占星分析</a></p></section>`
    : path === 'human-design'
      ? `<section><h2>什麼是人類圖？</h2><p>人類圖是一套用於自我觀察的系統，可以從出生資料產生個人能量圖，探索能量類型、策略、內在權威、人生角色、定義與能量中心。它適合作為自我探索與生活實驗工具，不取代專業諮詢。</p><h2>人類圖的5種能量類型</h2><h3>生產者 Generator</h3><p>觀察生命力與回應，等待身體對人事物的真實回應。</p><h3>顯示生產者 Manifesting Generator</h3><p>觀察多元興趣與快速節奏，先回應再行動並允許修正。</p><h3>投射者 Projector</h3><p>探索洞察與引導，重要方向可等待正確邀請。</p><h3>顯示者 Manifestor</h3><p>觀察啟動力，行動前告知相關的人以減少阻力。</p><h3>反映者 Reflector</h3><p>觀察環境與週期，給重要決定足夠時間。</p><h2>人類圖常見問題</h2><details><summary>人類圖是什麼？</summary><p>人類圖適合作為自我覺察與生活實驗的參考。</p></details><details><summary>人類圖分析可以代替醫療或心理諮詢嗎？</summary><p>不可以；醫療或心理問題請尋求合格專業人士協助。</p></details></section>`
      : '';
  const articleContent = article
    ? `<article><nav aria-label="麵包屑"><a href="${siteUrl}/human-design">人類圖</a> / ${escapeHtml(article.section)}</nav><header><p>${escapeHtml(article.section)}・閱讀指南</p><h1>${escapeHtml(article.h1)}</h1><p>${escapeHtml(article.intro)}</p><p>作者：韋德老師｜供自我覺察與生活實驗參考</p><p>更新日期：2026 年 9 月 17 日</p></header><nav aria-label="文章目錄"><h2>文章目錄</h2><ol>${article.sections.map((section, index) => `<li><a href="#section-${index + 1}">${escapeHtml(section.heading)}</a></li>`).join('')}<li><a href="#article-faq">常見問題</a></li></ol></nav>${article.sections.map((section, index) => `<section id="section-${index + 1}"><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('')}<section id="article-faq"><h2>常見問題</h2>${article.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}</section><section><h2>把閱讀變成一次生活實驗</h2><p>了解概念後，輸入自己的出生資料建立人類圖，從類型、內在權威和人生角色開始觀察。請保留判斷空間，讓結果服務於你的生活，而不是限制你的選擇。</p><p><a href="${siteUrl}/human-design">免費計算我的人類圖</a></p></section><aside>人類圖適合作為自我探索與生活實驗的參考，不代表科學、醫療或心理診斷，也不能取代醫療、心理、法律、財務或其他專業意見。請結合自己的真實經驗及現實情況進行判斷。</aside><nav aria-label="延伸閱讀"><h2>延伸閱讀</h2>${article.related.map(([label, href]) => `<a href="${siteUrl}${href}">${escapeHtml(label)}</a> `).join('')}</nav></article>`
    : '';
  const content = path === 'numerology' ? numerologyContent : path === 'human-design' ? `<section><h2>什麼是人類圖？</h2><p>人類圖是一套用於自我觀察的系統，可以從出生資料產生個人能量圖，探索能量類型、策略、內在權威、人生角色、定義與能量中心。它適合作為自我探索與生活實驗工具，不取代專業諮詢。</p><h2>人類圖的5種能量類型</h2><h3>生產者 Generator</h3><p>觀察生命力與回應，等待身體對人事物的真實回應。</p><h3>顯示生產者 Manifesting Generator</h3><p>觀察多元興趣與快速節奏，先回應再行動並允許修正。</p><h3>投射者 Projector</h3><p>探索洞察與引導，重要方向可等待正確邀請。</p><h3>顯示者 Manifestor</h3><p>觀察啟動力，行動前告知相關的人以減少阻力。</p><h3>反映者 Reflector</h3><p>觀察環境與週期，給重要決定足夠時間。</p></section>` : articleContent;
  const body = `<main id="seo-prerendered" lang="zh-Hant">${article ? '' : `<h1>${escapeHtml(h1)}</h1><p>${escapeHtml(intro)}</p>`}${content}<p><a href="${siteUrl}/oracle">回到塔羅與神諭卡首頁</a></p></main>`;
  const cleanTemplate = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*\/>/g, '')
    .replace(/<meta property="og:(title|description)"[^>]*>/g, '');
  const output = cleanTemplate
    .replace('</head>', `${head}\n  </head>`)
    .replace(/^\s*<div id="root"><\/div>\s*$/gm, `<div id="root">${body}</div>`);
  const target = join(distDir, path, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output);
}
