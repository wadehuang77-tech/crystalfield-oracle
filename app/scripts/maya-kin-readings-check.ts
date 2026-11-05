import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAYA_KIN_READINGS, getMayaKinReading, countMayaReadingCharacters } from '../src/lib/mayaKinReadings';
import { getSolarTotemByKin, getToneByKin } from '../src/lib/dreamspell';

assert.equal(MAYA_KIN_READINGS.length, 260);
assert.equal(new Set(MAYA_KIN_READINGS.map(r => r.summary)).size, 260);
assert.equal(new Set(MAYA_KIN_READINGS.map(r => `${r.coreTotem}:${r.toneNumber}`)).size, 260);
for (const [index, reading] of MAYA_KIN_READINGS.entries()) {
  assert.equal(reading.kin, index + 1);
  assert.equal(reading.coreTotem, getSolarTotemByKin(reading.kin).nameZh);
  assert.equal(reading.galacticTone, getToneByKin(reading.kin).nameZh);
  assert.equal(reading.characterCount, countMayaReadingCharacters(reading.summary));
  assert.ok(reading.characterCount >= 120 && reading.characterCount <= 150, `KIN ${reading.kin}: ${reading.characterCount}`);
  assert.equal(getMayaKinReading(reading.kin), reading);
}
for (const invalid of [0, 261, -1, 1.5, NaN]) assert.throws(() => getMayaKinReading(invalid), RangeError);
assert.equal(getMayaKinReading(1).galacticTone, '磁性');
assert.equal(getMayaKinReading(260).galacticTone, '宇宙');
console.log(`PASS: 260 unique KIN readings, correct seal/tone mapping, all summaries 120–150 characters (${Math.min(...MAYA_KIN_READINGS.map(r => r.characterCount))}–${Math.max(...MAYA_KIN_READINGS.map(r => r.characterCount))}).`);

if (process.argv.includes('--export')) {
  const directory = new URL('../../docs/', import.meta.url);
  mkdirSync(directory, { recursive: true });
  const destination = new URL('maya-kin-basic-readings.md', directory);
  writeFileSync(destination, '# Dreamspell KIN 1～260 基本解盤\n\n本清單沿用本站圖騰與音調命名。總結為圖騰與音調的編輯式組合解讀，供自我探索，不是命運預測。字數僅計總結正文，不含標點與空白。\n\n' + MAYA_KIN_READINGS.map(r => `## KIN ${r.kin}\n\n- **核心圖騰：** ${r.coreTotem}\n- **銀河音調：** 第 ${r.toneNumber} 調・${r.galacticTone}\n- **基本特質總結：** ${r.summary}\n- **字數統計：** ${r.characterCount} 字\n`).join('\n'), 'utf8');
  console.log(`Exported ${fileURLToPath(destination)}`);
}
