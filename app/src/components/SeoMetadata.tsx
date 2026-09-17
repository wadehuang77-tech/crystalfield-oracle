/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type SeoConfig = {
  title: string;
  description: string;
  canonical: string;
  h1: string;
  intro: string;
};

export const PUBLIC_SEO: Record<string, SeoConfig> = {
  '/oracle': {
    title: '免费塔罗牌占卜｜7套塔罗与神谕卡线上抽牌｜晶域心语',
    description: '免费体验7套线上塔罗与神谕卡，包含伟特塔罗、光行者神谕、独角兽塔罗、龙族塔罗、埃及神谕、光之讯息与奥修禅卡，探索感情、事业、前世因果与灵魂指引。',
    canonical: 'https://www.crystalfield101.com/oracle',
    h1: '免费塔罗牌占卜：7套塔罗与神谕卡线上抽牌',
    intro: '晶域心语提供七套塔罗与神谕卡线上抽牌入口，依照你的问题选择牌卡与牌阵，用于自我觉察、整理当下方向与下一步行动。',
  },
  '/tarot': {
    title: '伟特塔罗线上占卜｜单张、三张与凯尔特十字｜晶域心语',
    description: '线上体验伟特塔罗牌占卜，可选择单张、三张、凯尔特十字及前世因果解锁阵，探索感情、工作、财运与目前行动方向。',
    canonical: 'https://www.crystalfield101.com/tarot',
    h1: '伟特塔罗',
    intro: '伟特塔罗以清楚的图像象征整理现实处境，适合思考感情发展、工作与事业、财运方向和目前的行动选择。本站提供单张、三张、凯尔特十字与前世因果解锁阵。',
  },
  '/lightworker': {
    title: '光行者神谕卡占卜｜探索灵魂使命与内在指引｜晶域心语',
    description: '透过光行者神谕卡接收灵魂使命与内在成长指引，使用单张牌及十字交叉使命阵，探索天赋、卡点与下一步方向。',
    canonical: 'https://www.crystalfield101.com/lightworker',
    h1: '光行者神谕',
    intro: '光行者神谕适合在寻找灵魂使命、个人天赋或内在成长方向时使用。你可以选择单张牌，或使用十字交叉使命阵，从当下的卡点与资源整理下一步方向。',
  },
  '/unicorns': {
    title: '独角兽塔罗线上占卜｜感情疗愈与温柔指引｜晶域心语',
    description: '线上抽取独角兽塔罗与神谕卡，透过单张或三张牌探索感情、人际关系、自我价值及过去、现在与未来的能量变化。',
    canonical: 'https://www.crystalfield101.com/unicorns',
    h1: '独角兽塔罗',
    intro: '独角兽塔罗以温柔、鼓励的语气陪伴自我探索，适合整理感情、人际关系与自我价值。单张牌可聚焦当下提醒，三张牌则可观察过去、现在与未来的能量变化。',
  },
  '/dragons': {
    title: '龙族塔罗线上占卜｜关系清理、突破与行动力量｜晶域心语',
    description: '透过龙族塔罗单张及三张牌阵，探索关系消耗、能量清理、行动勇气与突破方向，找回属于自己的力量。',
    canonical: 'https://www.crystalfield101.com/dragons',
    h1: '龙族塔罗',
    intro: '龙族塔罗适合面对关系消耗、界线整理与行动上的突破。你可以用单张牌确认当下需要看见的力量，也可以用三张牌整理能量清理、阻碍与行动方向。',
  },
  '/egyptian-gods': {
    title: '埃及神谕卡占卜｜前世因果与人生课题解析｜晶域心语',
    description: '线上体验埃及神谕卡，透过单张指引及七张前世因果解锁阵，探索前世今生的连结、人生课题与灵魂成长方向。',
    canonical: 'https://www.crystalfield101.com/egyptian-gods',
    h1: '埃及神谕',
    intro: '埃及神谕卡适合探索前世今生的连结、反复出现的人生课题与灵魂成长方向。单张指引适合聚焦一个问题，七张前世因果解锁阵则用来分层整理相关主题。',
  },
  '/work-your-light': {
    title: '光之讯息卡占卜｜宇宙十字与灵魂蓝图指引｜晶域心语',
    description: '线上抽取Lightworker光之讯息卡，透过单张牌及宇宙十字牌阵，探索灵魂任务、内在潜能、能量状态与行动指引。',
    canonical: 'https://www.crystalfield101.com/work-your-light',
    h1: '光之讯息',
    intro: 'Lightworker 光之讯息卡适合在整理灵魂任务、内在潜能与能量状态时使用。单张牌提供聚焦的讯息，宇宙十字牌阵则从多个角度整理灵魂蓝图与行动指引。',
  },
  '/osho': {
    title: '奥修禅卡线上占卜｜觉察情绪与内在状态｜晶域心语',
    description: '透过奥修禅卡单张与三张牌阵，觉察目前情绪、内在卡点及生命状态，从当下意识中找到更清楚的行动方向。',
    canonical: 'https://www.crystalfield101.com/osho',
    h1: '奥修禅卡',
    intro: '奥修禅卡把注意力带回当下，适合觉察目前情绪、内在卡点与生命状态。单张牌用于即时观察，三张牌可从过去、现在、未来或身心灵角度整理意识。',
  },
  '/numerology': {
    title: '免费生命灵数｜生日数字、缺失数与流年解析｜晶域心语',
    description: '输入生日，免费查看生命灵数、生日数字与基础天赋解析，进一步探索缺失数字、感情模式、事业方向、个人流年及适合的水晶能量。',
    canonical: 'https://www.crystalfield101.com/numerology',
    h1: '免费生命灵数计算：从生日探索天赋、缺失数字与人生方向',
    intro: '输入出生日期进行生命灵数计算，了解生日数字、基础天赋、缺失数字与个人流年，并将数字自我探索与水晶能量建议整合参考。',
  },
};

const noindexPaths = new Set([
  '/tarot-single', '/lightworker/celtic-cross', '/work-your-light-single',
  '/cosmic-cross', '/osho/single', '/osho/three', '/auth', '/checkout/return',
  '/membership', '/admin', '/admin/settings', '/admin/kpi', '/admin/google-forms',
  '/admin/members', '/admin/tarot-subscriptions', '/admin/vedic-reviews',
]);

const SITE_NAME = '晶域心语';
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
      ['生命灵数怎么算？', '将出生年月日的每个数字相加，再持续加总至个位数；本系统会保留 11、22、33 等大师数字。'],
      ['生命灵数可以看什么？', '可以作为观察天赋与性格、工作与事业方向、感情互动模式、个人流年、缺失数字与水晶能量的自我探索参考。'],
      ['缺失数字代表不好吗？', '不代表好坏或缺陷，而是出生日期中较少出现的数字主题，可作为性格、学习方向与自我觉察的参考。'],
      ['生命灵数和个人流年有什么不同？', '生命灵数以出生日期为基础，个人流年则用来观察某一年度的主题与能量侧重。'],
      ['出生时间不确定也能计算吗？', '可以；生命灵数计算使用出生日期，不需要出生时间。'],
      ['生命灵数结果会随时间改变吗？', '生命灵数本身不会因为时间改变；个人流年与人生经验则会随着年度和处境变化。'],
      ['生命灵数分析可以代替专业医疗或心理咨询吗？', '不可以。生命灵数适合自我觉察与方向整理，医疗或心理问题请寻求合格专业人士协助。'],
    ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
    return [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: seo.title, description: seo.description, url: seo.canonical, inLanguage: 'zh-Hant' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
      { '@context': 'https://schema.org', '@type': 'Person', name: '韦德老师', description: '水晶疗愈老师与身心灵系统设计者，拥有十年以上塔罗、水晶疗愈及命理实务经验。' },
    ];
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
    ['线上塔罗牌占卜准确吗？', '塔罗与神谕卡适合用来整理当下感受与可能方向，不保证固定结果，也不取代专业判断。'],
    ['塔罗牌可以问哪些问题？', '可以围绕感情发展、工作与事业、财运方向、人际关系、目前卡点、前世因果、灵魂使命、内在成长与下一步行动提问。'],
    ['同一个问题可以重复占卜吗？', '建议先让自己沉淀并观察现实变化，再在问题或情境有新发展时重新整理。'],
    ['单张牌和三张牌有什么不同？', '单张牌聚焦一个当下提醒；三张牌可用来观察时间变化、不同面向或行动脉络。'],
    ['凯尔特十字牌阵适合什么问题？', '适合希望从多个角度深入整理复杂处境、影响因素与行动方向的问题。'],
    ['前世因果解锁阵是什么？', '这是七张牌的探索牌阵，用来分层观察前世今生连结与人生课题，作为自我觉察参考。'],
    ['不知道该选哪一组牌怎么办？', '可以先从首页依照问题主题选择，也可以浏览七组牌卡介绍后凭直觉决定。'],
    ['塔罗占卜结果可以代替专业意见吗？', '不可以；医疗、心理、法律或投资问题请咨询合格专业人士。'],
    ['7组牌卡是否都包含在塔罗全馆月费会员中？', '依目前方案设定，塔罗全馆月费会员为 NT$600／月，会员有效期间可使用全部 7 套牌卡与所有牌阵。'],
  ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));
  return [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: seo.title, description: seo.description, url: seo.canonical, inLanguage: 'zh-Hant' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumb },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: '七套塔罗与神谕卡', itemListElement: items },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq },
    { '@context': 'https://schema.org', '@type': 'Person', name: '韦德老师', description: '水晶疗愈老师、身心灵系统设计者，拥有十年以上塔罗、水晶疗愈及命理实务经验。' },
  ];
}

export default function SeoMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = PUBLIC_SEO[pathname];
    const title = seo?.title ?? SITE_NAME;
    const description = seo?.description ?? '晶域心语提供塔罗、神谕卡与自我探索服务。';
    const canonical = seo?.canonical ?? `${SITE_URL}${pathname}`;
    const robots = noindexPaths.has(pathname) ? 'noindex, follow' : seo ? 'index, follow' : 'noindex, follow';
    document.title = title;
    setMeta('description', description);
    setMeta('robots', robots);
    setProperty('og:type', 'website');
    setProperty('og:locale', 'zh_TW');
    setProperty('og:site_name', SITE_NAME);
    setProperty('og:title', title);
    setProperty('og:description', description);
    setProperty('og:url', canonical);
    setProperty('og:image', `${SITE_URL}/20260315_164545.jpg`);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', `${SITE_URL}/20260315_164545.jpg`);
    setCanonical(canonical);
    if (seo) setJsonLd(buildStructuredData(pathname, seo));
  }, [pathname]);

  return null;
}
