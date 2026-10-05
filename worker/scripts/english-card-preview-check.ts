import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import { getDeckPreview, loadFullCard } from '../src/cards';
import type { Env } from '../src/utils';

function splitSqlStatements(sql: string): string[] {
  const source = sql.replace(/^\s*--[^\r\n]*(?:\r?\n|$)/gm, '');
  const statements: string[] = [];
  let statement = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "'") {
      if (quoted && source[index + 1] === "'") {
        statement += "''";
        index += 1;
        continue;
      }
      quoted = !quoted;
    }
    if (character === ';' && !quoted) {
      if (statement.trim()) statements.push(statement.trim());
      statement = '';
    } else {
      statement += character;
    }
  }
  if (statement.trim()) statements.push(statement.trim());
  return statements;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const miniflare = new Miniflare({
    modules: true,
    script: `export default { fetch() { return new Response('ok') } }`,
    compatibilityDate: '2026-04-24',
    d1Databases: { DB_CARDS: 'english-card-preview-test' },
  });

  try {
    const db = await miniflare.getD1Database('DB_CARDS');
    for (const file of [
      'cards-schema.sql',
      'cards-seed.sql',
      'cards-migrations/001_card_localizations.sql',
      'cards-localizations-seed.sql',
    ]) {
      const sql = await readFile(resolve(here, `../../d1/${file}`), 'utf8');
      for (const statement of splitSqlStatements(sql)) {
        if (statement === 'BEGIN TRANSACTION' || statement === 'COMMIT') continue;
        await db.prepare(statement).run();
      }
    }

    const env = { DB_CARDS: db } as Env;
    const decks = ['tarot', 'osho', 'lightworker', 'unicorns', 'egyptian_gods', 'work_your_light', 'dragons'];
    let totalCards = 0;

    for (const deckId of decks) {
      const response = await getDeckPreview(
        new Request(`https://api.example.test/api/decks/${deckId}/preview?language=en`),
        env,
        deckId,
      );
      assert.equal(response.status, 200, `${deckId} English previews must be public`);
      const body = await response.json() as {
        cards: Array<Record<string, unknown> & {
          translation_available: boolean;
          content_locale: string;
          preview: Record<string, unknown>;
          preview_excerpt?: string;
          upright_excerpt?: string;
          reversed_excerpt?: string;
        }>;
      };
      assert.ok(body.cards.length > 0, `${deckId} must include cards`);
      for (const card of body.cards) {
        assert.equal(card.translation_available, true, `${deckId}:${String(card.card_key)} must have English content`);
        assert.equal(card.content_locale, 'en', `${deckId}:${String(card.card_key)} preview must be English`);
        if (deckId === 'tarot') {
          assert.ok(card.upright_excerpt, `${deckId}:${String(card.card_key)} needs an upright 30% excerpt`);
          assert.ok(card.reversed_excerpt, `${deckId}:${String(card.card_key)} needs a reversed 30% excerpt`);
        } else {
          assert.ok(card.preview_excerpt, `${deckId}:${String(card.card_key)} needs a 30% excerpt`);
        }
        assert.ok(Object.keys(card.preview).length > 0, `${deckId}:${String(card.card_key)} needs preview data`);
        assert.equal('gated' in card, false, 'public preview must not include full gated content');
      }
      totalCards += body.cards.length;

      if (deckId === 'lightworker') {
        const fullCard = await loadFullCard(env, deckId, String(body.cards[0].card_key), 'en');
        assert.ok(fullCard, 'Lightworker full card should be available');
        assert.equal(fullCard.content_locale, 'en');
        assert.equal(fullCard.translation_available, true);
        const gated = fullCard.gated as Record<string, unknown>;
        for (const field of [
          'cosmicMessage', 'currentSituation', 'deeperMeaning',
          'actionGuidance', 'energyHealing', 'soulQuestion',
        ]) {
          const text = gated[field];
          assert.equal(typeof text, 'string', `${field} should be a full interpretation string`);
          assert.doesNotMatch(text as string, /[\u3400-\u9fff]/, `${field} must not fall back to Chinese`);
        }
      }
    }

    assert.equal(totalCards, 278, 'all 278 translated cards must have public English previews');
    console.log(`English no-login 30% previews verified for all ${totalCards} cards across ${decks.length} decks.`);
  } finally {
    await miniflare.dispose();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
