import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(appDir, '..', 'dist');
const siteUrl = 'https://www.crystalfield101.com';
const pages = [
  ['oracle', '免费塔罗牌占卜｜7套塔罗与神谕卡线上抽牌｜晶域心语', '免费体验7套线上塔罗与神谕卡，包含伟特塔罗、光行者神谕、独角兽塔罗、龙族塔罗、埃及神谕、光之讯息与奥修禅卡，探索感情、事业、前世因果与灵魂指引。', '免费塔罗牌占卜：7套塔罗与神谕卡线上抽牌', '晶域心语提供七套塔罗与神谕卡线上抽牌入口，依照你的问题选择牌卡与牌阵，用于自我觉察、整理当下方向与下一步行动。'],
  ['tarot', '伟特塔罗线上占卜｜单张、三张与凯尔特十字｜晶域心语', '线上体验伟特塔罗牌占卜，可选择单张、三张、凯尔特十字及前世因果解锁阵，探索感情、工作、财运与目前行动方向。', '伟特塔罗', '伟特塔罗以清楚的图像象征整理现实处境，适合思考感情发展、工作与事业、财运方向和目前的行动选择。本站提供单张、三张、凯尔特十字与前世因果解锁阵。'],
  ['lightworker', '光行者神谕卡占卜｜探索灵魂使命与内在指引｜晶域心语', '透过光行者神谕卡接收灵魂使命与内在成长指引，使用单张牌及十字交叉使命阵，探索天赋、卡点与下一步方向。', '光行者神谕', '光行者神谕适合在寻找灵魂使命、个人天赋或内在成长方向时使用。你可以选择单张牌，或使用十字交叉使命阵，从当下的卡点与资源整理下一步方向。'],
  ['unicorns', '独角兽塔罗线上占卜｜感情疗愈与温柔指引｜晶域心语', '线上抽取独角兽塔罗与神谕卡，透过单张或三张牌探索感情、人际关系、自我价值及过去、现在与未来的能量变化。', '独角兽塔罗', '独角兽塔罗以温柔、鼓励的语气陪伴自我探索，适合整理感情、人际关系与自我价值。单张牌可聚焦当下提醒，三张牌则可观察过去、现在与未来的能量变化。'],
  ['dragons', '龙族塔罗线上占卜｜关系清理、突破与行动力量｜晶域心语', '透过龙族塔罗单张及三张牌阵，探索关系消耗、能量清理、行动勇气与突破方向，找回属于自己的力量。', '龙族塔罗', '龙族塔罗适合面对关系消耗、界线整理与行动上的突破。你可以用单张牌确认当下需要看见的力量，也可以用三张牌整理能量清理、阻碍与行动方向。'],
  ['egyptian-gods', '埃及神谕卡占卜｜前世因果与人生课题解析｜晶域心语', '线上体验埃及神谕卡，透过单张指引及七张前世因果解锁阵，探索前世今生的连结、人生课题与灵魂成长方向。', '埃及神谕', '埃及神谕卡适合探索前世今生的连结、反复出现的人生课题与灵魂成长方向。单张指引适合聚焦一个问题，七张前世因果解锁阵则用来分层整理相关主题。'],
  ['work-your-light', '光之讯息卡占卜｜宇宙十字与灵魂蓝图指引｜晶域心语', '线上抽取Lightworker光之讯息卡，透过单张牌及宇宙十字牌阵，探索灵魂任务、内在潜能、能量状态与行动指引。', '光之讯息', 'Lightworker 光之讯息卡适合在整理灵魂任务、内在潜能与能量状态时使用。单张牌提供聚焦的讯息，宇宙十字牌阵则从多个角度整理灵魂蓝图与行动指引。'],
  ['osho', '奥修禅卡线上占卜｜觉察情绪与内在状态｜晶域心语', '透过奥修禅卡单张与三张牌阵，觉察目前情绪、内在卡点及生命状态，从当下意识中找到更清楚的行动方向。', '奥修禅卡', '奥修禅卡把注意力带回当下，适合觉察目前情绪、内在卡点与生命状态。单张牌用于即时观察，三张牌可从过去、现在、未来或身心灵角度整理意识。'],
  ['numerology', '免费生命灵数｜生日数字、缺失数与流年解析｜晶域心语', '输入生日，免费查看生命灵数、生日数字与基础天赋解析，进一步探索缺失数字、感情模式、事业方向、个人流年及适合的水晶能量。', '免费生命灵数计算：从生日探索天赋、缺失数字与人生方向', '输入出生日期进行生命灵数计算，了解生日数字、基础天赋、缺失数字与个人流年，并将数字自我探索与水晶能量建议整合参考。'],
];

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const escapeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');

const template = await readFile(join(distDir, 'index.html'), 'utf8');
for (const [path, title, description, h1, intro] of pages) {
  const canonical = `${siteUrl}/${path}`;
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: 'zh-Hant' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '晶域心语', item: `${siteUrl}/oracle` },
      { '@type': 'ListItem', position: 2, name: h1, item: canonical },
    ] },
  ];
  if (path === 'numerology') {
    const faq = [
      ['生命灵数怎么算？', '将出生年月日的每个数字相加，再持续加总至个位数；本系统会保留 11、22、33 等大师数字。'],
      ['生命灵数可以看什么？', '可以作为观察天赋与性格、工作与事业方向、感情互动模式、个人流年、缺失数字与水晶能量的自我探索参考。'],
      ['缺失数字代表不好吗？', '不代表好坏或缺陷，而是出生日期中较少出现的数字主题，可作为性格、学习方向与自我觉察的参考。'],
      ['生命灵数和个人流年有什么不同？', '生命灵数以出生日期为基础，个人流年则用来观察某一年度的主题与能量侧重。'],
      ['出生时间不确定也能计算吗？', '可以；生命灵数计算使用出生日期，不需要出生时间。'],
      ['生命灵数结果会随时间改变吗？', '生命灵数本身不会因为时间改变；个人流年与人生经验则会随着年度和处境变化。'],
      ['生命灵数分析可以代替专业医疗或心理咨询吗？', '不可以。生命灵数适合自我觉察与方向整理，医疗或心理问题请寻求合格专业人士协助。'],
    ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    jsonLd.push(
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
      { '@context': 'https://schema.org', '@type': 'Person', name: '韦德老师', description: '水晶疗愈老师与身心灵系统设计者，拥有十年以上塔罗、水晶疗愈及命理实务经验。' },
    );
  }
  const head = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:site_name" content="晶域心语" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${siteUrl}/20260315_164545.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${siteUrl}/20260315_164545.jpg" />
    <script type="application/ld+json">${escapeJson(jsonLd)}</script>`;
  const numerologyContent = path === 'numerology'
    ? `<section><h2>什么是生命灵数？</h2><p>生命灵数是以出生日期中的数字进行整理的自我探索工具，可以从数字象征观察个人倾向、天赋与需要练习的方向。它不是对人生的固定预测。</p><h2>如何计算生命灵数？</h2><p>例如生日为 1990 年 12 月 31 日，可将 1+9+9+0+1+2+3+1 相加，得到 26，再将 2+6 相加得到 8。本系统会保留 11、22、33 等大师数字。</p><h2>什么是缺失数字？</h2><p>缺失数字是出生日期中没有出现的 1 到 9 数字，可作为性格、学习方向与自我觉察的参考。</p><h2>生命灵数常见问题</h2><details><summary>生命灵数怎么算？</summary><p>将出生年月日的每个数字相加，再持续加总至个位数；本系统会保留 11、22、33 等大师数字。</p></details><details><summary>生命灵数可以看什么？</summary><p>可以作为观察天赋、工作、感情、个人流年、缺失数字与水晶能量的自我探索参考。</p></details><details><summary>生命灵数分析可以代替专业医疗或心理咨询吗？</summary><p>不可以；医疗或心理问题请寻求合格专业人士协助。</p></details><p><a href="${siteUrl}/oracle">探索塔罗与神谕卡</a> · <a href="${siteUrl}/human-design">深入探索人类图</a> · <a href="${siteUrl}/vedic-astrology">查看印度占星分析</a></p></section>`
    : '';
  const body = `<main id="seo-prerendered" lang="zh-Hant"><h1>${escapeHtml(h1)}</h1><p>${escapeHtml(intro)}</p>${numerologyContent}<p><a href="${siteUrl}/oracle">返回塔罗与神谕卡首页</a></p></main>`;
  const cleanTemplate = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*\/>/g, '')
    .replace(/<meta property="og-(title|description)"[^>]*\/>/g, '');
  const output = cleanTemplate
    .replace('</head>', `${head}\n  </head>`)
    .replace(/^\s*<div id="root"><\/div>\s*$/gm, `<div id="root">${body}</div>`);
  const target = join(distDir, path, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output);
}
