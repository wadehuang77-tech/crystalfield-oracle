import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script, createContext } from 'node:vm';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Provide the retrieved Galactic Ark calculator file');
const source = await readFile(sourcePath, 'utf8');
const marker = '\npopulateDaySelect();';
const stop = source.lastIndexOf(marker);
if (stop < 0) throw new Error('Unexpected external calculator initialization');
const context = createContext({ console });
// Execute original retrieved calculator definitions, not project formulas. No DOM/network initialization.
new Script(source.slice(0, stop)).runInContext(context, { timeout: 10000 });
const data = new Script(`JSON.stringify(Array.from({length:260},(_,i)=>{
 const kin=i+1,o=getOracle(kin),w=getWavespell(kin);
 return [kin,o.guide.kin,o.analog.kin,o.antipode.kin,o.occult.kin,w.n,w.d,w.s,w.kins[12]];
}))`).runInContext(context);
const rows = JSON.parse(data);
if (rows.length !== 260 || rows.some(row => row.some(value => !Number.isInteger(value)))) throw new Error('Invalid external numeric results');
const fixture = {
  source: 'https://galacticark.org/dreamspell-kin-calculator',
  scriptUrl: 'https://galacticark.org/wp-content/plugins/dreamspell_KIN_calculator_v1.3/dreamspell-calculator.js?ver=1.0.0',
  sha256: createHash('sha256').update(source).digest('hex'),
  method: 'Original retrieved calculator definitions executed in an isolated Node VM without initialization, network, or project imports. Numeric facts only; no image or source copied.',
  columns: ['kin', 'guideKin', 'analogKin', 'antipodeKin', 'occultKin', 'wavespell', 'position', 'startKin', 'endKin'],
  rows,
};
await writeFile(new URL('./maya-pro-reference.json', import.meta.url), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Wrote ${rows.length} independent oracle and wavespell numeric rows; SHA256=${fixture.sha256}`);
