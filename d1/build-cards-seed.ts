/**
 * 把 src/data/*.ts 裡的 6 個牌組 + 1 個 dragons + workYourLight 的 deep
 * 轉成 d1/cards-seed.sql,可以灌進 bolt-tarot-cards 這個 D1。
 *
 * 執行:
 *   cd tarot-cards
 *   npx tsx d1/build-cards-seed.ts
 *
 * 輸出:
 *   d1/cards-seed.sql
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tarotCards } from '../src/data/tarotCards.js';
import { oshoCards } from '../src/data/oshoCards.js';
import { lightworkerCards } from '../src/data/lightworkerCards.js';
import { unicornsCards } from '../src/data/unicornsCards.js';
import { egyptianGodsCards } from '../src/data/egyptianGodsCards.js';
import { workYourLightCards } from '../src/data/workYourLightCards.js';
import { workYourLightDeepCards } from '../src/data/workYourLightDeepInterpretations.js';
import { dragonCards } from '../src/data/dragonsCards.js';

interface CardRow {
  id: string;
  deck_id: string;
  card_key: string;
  position: number;
  name: string;
  name_secondary: string | null;
  image: string | null;
  preview_payload: Record<string, unknown>;
  gated_payload: Record<string, unknown>;
}

const sqlEscape = (s: string) => s.replace(/'/g, "''");
const j = (v: unknown) => sqlEscape(JSON.stringify(v));

function build(): CardRow[] {
  const rows: CardRow[] = [];

  // ---- tarot ----
  tarotCards.forEach((c, i) => {
    const { id, name, nameChinese, arcana, suit, number, keywords, image,
            uprightMeaning, reversedMeaning, detailedInterpretation } = c;
    rows.push({
      id: `tarot:${id}`,
      deck_id: 'tarot',
      card_key: id,
      position: i,
      name: nameChinese ?? name,
      name_secondary: name,
      image,
      preview_payload: { keywords, arcana, suit, number },
      gated_payload: { uprightMeaning, reversedMeaning, detailedInterpretation },
    });
  });

  // ---- osho ----
  oshoCards.forEach((c, i) => {
    rows.push({
      id: `osho:${c.id}`,
      deck_id: 'osho',
      card_key: String(c.id),
      position: i,
      name: c.name,
      name_secondary: c.subtitle,
      image: c.image,
      preview_payload: { subtitle: c.subtitle },
      gated_payload: { meanings: c.meanings },
    });
  });

  // ---- lightworker ----
  lightworkerCards.forEach((c, i) => {
    rows.push({
      id: `lightworker:${c.id}`,
      deck_id: 'lightworker',
      card_key: String(c.id),
      position: i,
      name: c.name,
      name_secondary: c.nameEn,
      image: null,
      preview_payload: { keywords: c.keywords, nameEn: c.nameEn },
      gated_payload: {
        cosmicMessage: c.cosmicMessage,
        currentSituation: c.currentSituation,
        deeperMeaning: c.deeperMeaning,
        actionGuidance: c.actionGuidance,
        energyHealing: c.energyHealing,
        soulQuestion: c.soulQuestion,
      },
    });
  });

  // ---- unicorns ----
  unicornsCards.forEach((c, i) => {
    rows.push({
      id: `unicorns:${c.id}`,
      deck_id: 'unicorns',
      card_key: String(c.id),
      position: i,
      name: c.chineseName,
      name_secondary: c.name,
      image: null,
      preview_payload: { keywords: c.keywords, nameEn: c.name },
      gated_payload: {
        point1: c.point1, point2: c.point2, point3: c.point3,
        point4: c.point4, point5: c.point5, point6: c.point6, point7: c.point7,
      },
    });
  });

  // ---- egyptian gods ----
  egyptianGodsCards.forEach((c, i) => {
    rows.push({
      id: `egyptian_gods:${c.id}`,
      deck_id: 'egyptian_gods',
      card_key: String(c.id),
      position: i,
      name: c.titleChinese,
      name_secondary: c.title,
      image: null,
      preview_payload: { titleEn: c.title, symbol: c.symbol },
      gated_payload: {
        godStory: c.godStory,
        coreMeaning: c.coreMeaning,
        coreEnergy: c.coreEnergy,
        guidance: c.guidance,
        soulReminder: c.soulReminder,
        questions: c.questions,
        energyFocus: c.energyFocus,
      },
    });
  });

  // ---- work your light (combine surface + deep) ----
  workYourLightCards.forEach((c, i) => {
    const deep = workYourLightDeepCards[c.id];
    rows.push({
      id: `work_your_light:${c.id}`,
      deck_id: 'work_your_light',
      card_key: String(c.id),
      position: i,
      name: c.titleChinese,
      name_secondary: c.title,
      image: null,
      preview_payload: { titleEn: c.title, suit: c.suit },
      gated_payload: {
        coreMeaning: c.coreMeaning,
        actionGuidance: c.actionGuidance ?? null,
        inquiryPrompt: c.inquiryPrompt ?? null,
        activationPrayer: c.activationPrayer ?? null,
        transmissionPrayer: c.transmissionPrayer ?? null,
        deepInterpretation: deep ?? null,
      },
    });
  });

  // ---- dragons ----
  dragonCards.forEach((c, i) => {
    rows.push({
      id: `dragons:${i + 1}`,
      deck_id: 'dragons',
      card_key: String(i + 1),
      position: i,
      name: c.name,
      name_secondary: c.nameEn,
      image: null,
      preview_payload: { keywords: c.keywords, nameEn: c.nameEn },
      gated_payload: {
        message: c.message,
        guidance: c.guidance,
        energy: c.energy,
      },
    });
  });

  return rows;
}

function emit(rows: CardRow[]): string {
  const decks: Record<string, string> = {
    tarot: '韋特塔羅',
    osho: '奧修禪卡',
    lightworker: '光行者神諭卡',
    unicorns: '獨角獸神諭卡',
    egyptian_gods: '埃及神諭卡',
    work_your_light: 'Work Your Light 神諭卡',
    dragons: '龍族神諭卡',
  };
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.deck_id] = (counts[r.deck_id] ?? 0) + 1;

  const out: string[] = [];
  out.push('-- Auto-generated by d1/build-cards-seed.ts -- DO NOT EDIT BY HAND');
  out.push('-- Re-run: npx tsx d1/build-cards-seed.ts');
  out.push('');
  out.push('DELETE FROM cards;');
  out.push('DELETE FROM decks;');
  out.push('');
  for (const [id, name] of Object.entries(decks)) {
    out.push(
      `INSERT INTO decks (id, name, card_count) VALUES ('${id}', '${sqlEscape(name)}', ${counts[id] ?? 0});`,
    );
  }
  out.push('');
  for (const r of rows) {
    out.push(
      `INSERT INTO cards (id, deck_id, card_key, position, name, name_secondary, image, preview_payload, gated_payload) VALUES (` +
        `'${sqlEscape(r.id)}', ` +
        `'${sqlEscape(r.deck_id)}', ` +
        `'${sqlEscape(r.card_key)}', ` +
        `${r.position}, ` +
        `'${sqlEscape(r.name)}', ` +
        `${r.name_secondary == null ? 'NULL' : `'${sqlEscape(r.name_secondary)}'`}, ` +
        `${r.image == null ? 'NULL' : `'${sqlEscape(r.image)}'`}, ` +
        `'${j(r.preview_payload)}', ` +
        `'${j(r.gated_payload)}'` +
        `);`,
    );
  }
  return out.join('\n') + '\n';
}

const rows = build();
const sql = emit(rows);
const target = fileURLToPath(new URL('./cards-seed.sql', import.meta.url));
writeFileSync(target, sql);
console.log(`wrote ${rows.length} cards across ${new Set(rows.map(r => r.deck_id)).size} decks → ${target}`);
