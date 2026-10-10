import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { mayaForDate, mayaSignature } from '../src/lib/maya';
import { galacticToneVisual, matrixNeighbor, solarSealVisual, TZOLKIN_ROWS } from '../src/lib/mayaVisualization';
import { adaptLifeBlueprint } from '../src/lib/mayaBlueprintAdapter';
import { mockLifeBlueprintV2 } from '../src/lib/mayaLifeBlueprintMock';

test('All 260 matrix cells reuse canonical KIN data, read down columns and cover every seal/tone pair', () => {
  const cells = TZOLKIN_ROWS.flat();
  assert.equal(cells.length, 260);
  assert.equal(new Set(cells.map(cell => cell.kin)).size, 260);
  assert.equal(new Set(cells.map(cell => `${cell.signature.solar_seal_number}:${cell.signature.tone_number}`)).size, 260);
  for (const cell of cells) {
    assert.equal(cell.kin, cell.column * 20 + cell.row + 1);
    assert.deepEqual(cell.signature, mayaSignature(cell.kin, 'en'));
    const seal = solarSealVisual(cell.signature.solar_seal_number);
    assert.ok(seal.nameEn.startsWith(['Red', 'White', 'Blue', 'Yellow'][(seal.number - 1) % 4]));
  }
  assert.deepEqual(TZOLKIN_ROWS[0].map(cell => cell.kin), [1, 21, 41, 61, 81, 101, 121, 141, 161, 181, 201, 221, 241]);
  assert.deepEqual(TZOLKIN_ROWS[19].map(cell => cell.kin), [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260]);
  assert.equal(matrixNeighbor(1, 'ArrowRight'), 21);
  assert.equal(matrixNeighbor(21, 'ArrowDown'), 22);
  assert.equal(matrixNeighbor(20, 'ArrowDown'), 20);
  assert.equal(matrixNeighbor(1, 'ArrowUp'), 1);
  assert.equal(matrixNeighbor(260, 'ArrowRight'), 260);
  assert.equal(matrixNeighbor(260, 'Home'), 20);
  assert.equal(matrixNeighbor(20, 'End'), 260);
  assert.equal(mayaForDate('1987-07-26', 'en').kin_number, 34);
  assert.throws(() => solarSealVisual(0));
  assert.throws(() => galacticToneVisual(14, 'en'));
});

test('Twenty original SVG seals, thirteen numeric symbols and bilingual accessible names render at both sizes', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Seal } = await vite.ssrLoadModule('/src/components/maya/SolarSealIcon.tsx');
    const { default: Tone } = await vite.ssrLoadModule('/src/components/maya/GalacticToneSymbol.tsx');
    const paths = new Set<string>();
    for (const locale of ['zh-TW', 'en'] as const) {
      for (let number = 1; number <= 20; number++) for (const size of [24, 96]) {
        const html = renderToStaticMarkup(createElement(Seal, { sealNumber: number, locale, size }));
        assert.match(html, /role="img"/);
        assert.match(html, new RegExp(`width="${size}"`));
        assert.ok(html.includes(`solar-seal-${number}`));
        assert.ok(html.includes(locale === 'en' ? solarSealVisual(number).nameEn : solarSealVisual(number).nameZh));
        assert.ok(html.includes(locale === 'en' ? 'modern geometric icon' : '現代幾何設計圖示'));
        if (locale === 'en') assert.doesNotMatch(html, /[\u3400-\u9fff]/u);
        paths.add(html.match(/<path d="([^"]+)"/)?.[1] ?? '');
      }
      for (let number = 1; number <= 13; number++) for (const size of [24, 96]) {
        const tone = galacticToneVisual(number, locale);
        const html = renderToStaticMarkup(createElement(Tone, { toneNumber: number, locale, size }));
        assert.equal((html.match(/data-tone-dot/g) ?? []).length, tone.dots);
        assert.equal((html.match(/data-tone-bar/g) ?? []).length, tone.bars);
        assert.equal(tone.dots + tone.bars * 5, number);
        assert.ok(html.includes(locale === 'en' ? tone.nameEn : tone.nameZh));
        assert.ok(html.includes(tone.keywordLabel));
        if (locale === 'en') assert.doesNotMatch(html, /[\u3400-\u9fff]/u);
      }
    }
    assert.equal(paths.size, 20);
  } finally { await vite.close(); }
});

test('Version adapter accepts existing v2 without regeneration and rejects incompatible versions and locales', () => {
  assert.equal(adaptLifeBlueprint(null, 'en').kind, 'empty');
  const report = mockLifeBlueprintV2(mayaSignature(34, 'en'), 'en');
  const json = JSON.stringify(report);
  assert.equal(adaptLifeBlueprint(report, 'en').kind, 'v2');
  assert.equal(JSON.stringify(report), json);
  assert.equal(adaptLifeBlueprint(report, 'zh-TW').kind, 'invalid');
  const bad = structuredClone(report);
  bad.sections[0].evidence.kinNumber = 1;
  assert.equal(adaptLifeBlueprint(bad, 'en').kind, 'invalid');
});
