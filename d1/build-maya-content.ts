import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MAYA_CONTENT_VERSION, mayaSignature, mayaSummary } from '../app/src/lib/maya';

async function main() {
  const quote = (value: string | number) => typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "''")}'`;
  const rows: string[] = ['-- Generated bilingual reflection seed. No paid AI or personal data.'];
  for (let kin = 1; kin <= 260; kin++) {
    for (const locale of ['zh-TW', 'en'] as const) {
      const signature = mayaSignature(kin, locale);
      const values = [kin, locale, `KIN ${kin}`, signature.solar_seal, signature.galactic_tone, mayaSummary(signature, locale),
        locale === 'en' ? 'Notice a strength in your real experience.' : '觀察真實經驗中的優勢。',
        locale === 'en' ? 'Review assumptions before acting.' : '行動前回顧自己的假設。',
        locale === 'en' ? 'Practice one small, realistic action.' : '實踐一個可行的小行動。', MAYA_CONTENT_VERSION];
      rows.push(`INSERT OR IGNORE INTO maya_kin_content(kin_number,locale,title,solar_seal_name,tone_name,summary,strengths,challenges,growth_guidance,content_version) VALUES (${values.map(quote).join(',')});`);
    }
  }
  await writeFile(join(process.cwd(), 'd1', 'maya-kin-content-seed.sql'), `${rows.join('\n')}\n`, 'utf8');
  console.log('Generated 520 bilingual KIN reflection rows. No database was modified.');
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
