const apiBase = (process.env.SMOKE_API_BASE || 'https://api.crystalfield101.com').replace(/\/$/, '');
const frontendUrl = (process.env.SMOKE_FRONTEND_URL || 'https://www.crystalfield101.com').replace(/\/$/, '');

const checks = [];

async function checkJson(name, url, expectedStatus, validate) {
  const res = await fetch(url);
  const body = await res.text();
  if (res.status !== expectedStatus) {
    throw new Error(`${name} expected HTTP ${expectedStatus}, got ${res.status}: ${body.slice(0, 240)}`);
  }
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`${name} did not return JSON: ${body.slice(0, 240)}`);
  }
  validate(json);
  checks.push(`${name}: ok`);
}

async function checkFrontendRoute(path) {
  const res = await fetch(new URL(path, `${frontendUrl}/`));
  if (!res.ok) {
    throw new Error(`Frontend route ${path} expected 2xx, got ${res.status}`);
  }
  const html = await res.text();
  if (!html.includes('<div id="root"')) {
    throw new Error(`Frontend route ${path} did not look like the app shell`);
  }
  checks.push(`Frontend ${path}: HTTP ${res.status}`);
}

async function getJson(name, url) {
  const res = await fetch(url);
  const body = await res.text();
  if (res.status !== 200) {
    throw new Error(`${name} expected HTTP 200, got ${res.status}: ${body.slice(0, 240)}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${name} did not return JSON: ${body.slice(0, 240)}`);
  }
}

const frontendRoutes = [
  '/',
  '/oracle',
  '/numerology',
  '/human-design',
  '/vedic-astrology',
  '/en/',
  '/en/oracle',
  '/en/numerology',
  '/en/human-design',
  '/en/vedic-astrology',
];
for (const route of frontendRoutes) {
  await checkFrontendRoute(route);
}

await checkJson('Worker health', `${apiBase}/api/health`, 200, (json) => {
  if (json.ok !== true) throw new Error('Health payload did not contain ok=true');
});

const decksResponse = await getJson('Deck list', `${apiBase}/api/decks?language=en`);
if (!Array.isArray(decksResponse.decks) || decksResponse.decks.length !== 7) {
  throw new Error(`Expected 7 decks, got ${decksResponse.decks?.length ?? 'invalid response'}`);
}
checks.push('Deck list: 7 decks');

function hasText(value) {
  if (typeof value === 'string') return Boolean(value.trim());
  if (value && typeof value === 'object') return Object.values(value).some(hasText);
  return false;
}

async function checkEnglishCard(deckId, cardKey) {
  const result = await getJson(
    `English ${deckId} preview`,
    `${apiBase}/api/decks/${encodeURIComponent(deckId)}/preview?language=en`,
  );
  const cards = Array.isArray(result.cards) ? result.cards : [];
  const card = cardKey ? cards.find((entry) => entry.card_key === cardKey) : cards[0];
  if (!card || card.content_locale !== 'en' || card.translation_available !== true
    || !card.name || !hasText(card.preview)) {
    throw new Error(`English ${deckId} card is missing a localized name or preview`);
  }
  if (deckId === 'tarot' && !hasText(card.upright_excerpt)) {
    throw new Error('English High Priestess is missing an interpretation excerpt');
  }
  checks.push(`English ${deckId}: ${card.name}, preview and interpretation excerpt`);
  return card;
}

const highPriestessEnglish = await checkEnglishCard('tarot', '2-high-priestess');
if (highPriestessEnglish.name !== 'The High Priestess') {
  throw new Error(`Unexpected English High Priestess name: ${highPriestessEnglish.name}`);
}
const highPriestessChineseResponse = await getJson(
  'Chinese High Priestess preview',
  `${apiBase}/api/decks/tarot/preview?language=zh-Hant`,
);
const highPriestessChinese = highPriestessChineseResponse.cards?.find(
  (card) => card.card_key === '2-high-priestess',
);
if (!highPriestessChinese || highPriestessChinese.name !== '女祭司'
  || highPriestessChinese.content_locale !== 'zh-Hant' || !hasText(highPriestessChinese.preview)) {
  throw new Error('Chinese High Priestess is missing its Traditional Chinese name or preview');
}
checks.push('Chinese High Priestess: 女祭司, preview');

const englishDeckIds = ['tarot', 'osho', 'lightworker', 'unicorns', 'egyptian_gods', 'work_your_light', 'dragons'];
for (const deckId of englishDeckIds) {
  if (deckId !== 'tarot') await checkEnglishCard(deckId);
}

console.log(checks.join('\n'));
