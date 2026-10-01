import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface CardLocalization {
  deck_id: string;
  card_key: string;
  locale: 'en';
  name: string;
  name_secondary: string;
  preview_payload: Record<string, unknown>;
  gated_payload: Record<string, unknown>;
}

const sourcePath = fileURLToPath(new URL('./card-localizations-en.json', import.meta.url));
const outputPath = fileURLToPath(new URL('./cards-localizations-seed.sql', import.meta.url));
const entries = JSON.parse(readFileSync(sourcePath, 'utf8')) as CardLocalization[];
const allowedDecks = new Set(['tarot', 'osho', 'lightworker', 'unicorns', 'egyptian_gods', 'work_your_light', 'dragons']);
const requiredGatedFields: Record<string, string[]> = {
  tarot: [
    'uprightMeaning', 'reversedMeaning', 'detailedInterpretation.coreKeywords.upright',
    'detailedInterpretation.coreKeywords.reversed', 'detailedInterpretation.coreKeywords.uprightExplanation',
    'detailedInterpretation.coreKeywords.reversedExplanation', 'detailedInterpretation.energyFlow.direction',
    'detailedInterpretation.energyFlow.type', 'detailedInterpretation.energyFlow.description',
    'detailedInterpretation.timing.speed', 'detailedInterpretation.timing.description',
    'detailedInterpretation.advice.upright', 'detailedInterpretation.advice.reversed',
    'detailedInterpretation.chakra.primary', 'detailedInterpretation.chakra.issue',
    'detailedInterpretation.chakra.healingNote', 'detailedInterpretation.soulMessage.upright',
    'detailedInterpretation.soulMessage.reversed',
  ],
  osho: ['meanings'],
  lightworker: ['cosmicMessage', 'currentSituation', 'deeperMeaning', 'actionGuidance', 'energyHealing', 'soulQuestion'],
  unicorns: ['point1', 'point2', 'point3', 'point4', 'point5', 'point6', 'point7'],
  egyptian_gods: ['godStory', 'coreMeaning', 'coreEnergy', 'guidance', 'soulReminder', 'questions', 'energyFocus'],
  work_your_light: ['coreMeaning', 'deepInterpretation'],
  dragons: ['message', 'guidance', 'energy'],
};
const seen = new Set<string>();

function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: Record<string, unknown>): string {
  return sqlText(JSON.stringify(value));
}

function assertComplete(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (!value.trim()) throw new Error(`Empty translated string at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertComplete(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) assertComplete(item, `${path}.${key}`);
  }
}

function hasPath(value: Record<string, unknown>, path: string): boolean {
  let current: unknown = value;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object' || !(segment in current)) return false;
    current = (current as Record<string, unknown>)[segment];
  }
  return current !== null && current !== undefined;
}

if (!Array.isArray(entries)) throw new Error('Localization source must be a JSON array');
for (const [index, entry] of entries.entries()) {
  if (!allowedDecks.has(entry.deck_id)) throw new Error(`Unknown deck at entry ${index}: ${entry.deck_id}`);
  if (entry.locale !== 'en') throw new Error(`Unsupported locale at entry ${index}: ${entry.locale}`);
  if (!entry.card_key.trim() || !entry.name.trim() || !entry.name_secondary.trim()) {
    throw new Error(`Missing stable ID or translated name at entry ${index}`);
  }
  const stableKey = `${entry.deck_id}:${entry.card_key}:${entry.locale}`;
  if (seen.has(stableKey)) throw new Error(`Duplicate localization key: ${stableKey}`);
  seen.add(stableKey);
  assertComplete(entry.preview_payload, `${stableKey}.preview_payload`);
  assertComplete(entry.gated_payload, `${stableKey}.gated_payload`);
  for (const field of requiredGatedFields[entry.deck_id]) {
    if (!hasPath(entry.gated_payload, field)) throw new Error(`Missing ${field} in ${stableKey}`);
  }
}

const deckNames: Record<string, string> = {
  tarot: 'Rider-Waite Tarot',
  osho: 'Osho Zen Tarot',
  lightworker: 'Lightworker Oracle',
  unicorns: 'Unicorn Oracle',
  egyptian_gods: 'Egyptian Oracle',
  work_your_light: 'Work Your Light Oracle',
  dragons: 'Dragon Oracle',
};

const statements = [
  '-- Generated from d1/card-localizations-en.json by d1/build-card-localizations-seed.ts.',
  '-- Apply only to the separate bolt-tarot-cards D1 after review.',
  'BEGIN TRANSACTION;',
  ...Object.entries(deckNames).map(([deckId, name]) =>
    `INSERT INTO deck_localizations (deck_id, locale, name) VALUES (${sqlText(deckId)}, 'en', ${sqlText(name)}) ` +
    'ON CONFLICT(deck_id, locale) DO UPDATE SET name = excluded.name;'),
  ...entries.map((entry) =>
    `INSERT INTO card_localizations (deck_id, card_key, locale, name, name_secondary, preview_payload, gated_payload) VALUES (` +
    `${sqlText(entry.deck_id)}, ${sqlText(entry.card_key)}, 'en', ${sqlText(entry.name)}, ${sqlText(entry.name_secondary)}, ` +
    `${sqlJson(entry.preview_payload)}, ${sqlJson(entry.gated_payload)}) ` +
    'ON CONFLICT(deck_id, card_key, locale) DO UPDATE SET ' +
    'name = excluded.name, name_secondary = excluded.name_secondary, ' +
    'preview_payload = excluded.preview_payload, gated_payload = excluded.gated_payload, updated_at = CURRENT_TIMESTAMP;'),
  'COMMIT;',
  '',
];

writeFileSync(outputPath, statements.join('\n'), 'utf8');
console.log(`Wrote ${entries.length} card translations across ${new Set(entries.map((entry) => entry.deck_id)).size} decks.`);