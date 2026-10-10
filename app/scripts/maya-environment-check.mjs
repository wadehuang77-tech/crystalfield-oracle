import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const testApi = 'https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev';
const testFrontend = 'https://crystalfield-maya-sandbox.pages.dev';
const testConfig = JSON.parse(await readFile(join(root, 'worker', 'wrangler.maya-test.json'), 'utf8'));
const workerRequire = createRequire(join(root, 'worker', 'package.json'));
const Ajv = workerRequire('ajv');
const schema = JSON.parse(await readFile(join(root, 'worker', 'node_modules', 'wrangler', 'config-schema.json'), 'utf8'));
const validateSchema = new Ajv({ strict: false, allErrors: true, validateFormats: false }).compile(schema);
assert.ok(validateSchema(testConfig), `Wrangler schema mismatch: ${JSON.stringify(validateSchema.errors)}`);
const productionConfig = await readFile(join(root, 'worker', 'wrangler.toml'), 'utf8');
const productionIds = Array.from(productionConfig.matchAll(/database_id\s*=\s*"([^"]+)"/g), (match) => match[1]);
const allowedKeys = ['$schema', 'name', 'main', 'compatibility_date', 'compatibility_flags', 'account_id', 'workers_dev', 'preview_urls', 'routes', 'vars', 'd1_databases'];
assert.ok(Object.keys(testConfig).every((key) => allowedKeys.includes(key)), 'Unexpected binding/environment/configuration requires manual review.');
assert.equal(testConfig.name, 'crystalfield-maya-sandbox-api');
assert.equal(testConfig.main, 'src/mayaTestEntry.ts');
assert.equal(testConfig.workers_dev, true);
assert.equal(testConfig.preview_urls, false);
assert.deepEqual(testConfig.routes, [], 'Prepared configuration must not publish a route.');
assert.equal(testConfig.vars.ENV, 'dev');
assert.equal(testConfig.vars.MAYA_AI_MODE, 'mock');
assert.equal(testConfig.vars.MAYA_SANDBOX_ENABLED, 'false', 'Sandbox must remain disabled during preparation.');
assert.equal(testConfig.vars.MAYA_PUBLIC_ENABLED, 'true');
assert.equal(testConfig.vars.MAYA_CONTENT_SOURCE, 'cards');
assert.equal(testConfig.vars.MAYA_AI_TEST_CAP_ENABLED, 'true');
for (const flag of ['MAYA_MEMBER_ENABLED', 'MAYA_PAYMENT_ENABLED', 'MAYA_AI_ENABLED']) {
  assert.equal(testConfig.vars[flag], 'false', `${flag} must remain disabled during preparation.`);
}
assert.equal(testConfig.vars.MAYA_SANDBOX_MERCHANT_ID, '3002607');
assert.equal(testConfig.vars.MAYA_SANDBOX_API_ORIGIN, testApi);
assert.equal(testConfig.vars.MAYA_SANDBOX_FRONTEND_ORIGIN, testFrontend);
assert.equal(testConfig.vars.ALLOWED_ORIGINS, testFrontend);
assert.deepEqual(Object.keys(testConfig.vars).sort(), [
  'ENV', 'MAYA_AI_MODE', 'MAYA_SANDBOX_ENABLED', 'MAYA_SANDBOX_MERCHANT_ID',
  'MAYA_PUBLIC_ENABLED', 'MAYA_MEMBER_ENABLED', 'MAYA_PAYMENT_ENABLED', 'MAYA_AI_ENABLED',
  'MAYA_CONTENT_SOURCE', 'MAYA_AI_TEST_CAP_ENABLED',
  'MAYA_SANDBOX_API_ORIGIN', 'MAYA_SANDBOX_FRONTEND_ORIGIN', 'ALLOWED_ORIGINS',
].sort(), 'No secrets or unrelated production services belong in this template.');
assert.equal(testConfig.d1_databases.length, 2);
assert.deepEqual(testConfig.d1_databases.map((db) => db.binding).sort(), ['DB', 'DB_CARDS']);
const expectedNames = { DB: 'crystalfield-maya-sandbox-customer', DB_CARDS: 'crystalfield-maya-sandbox-cards' };
const ids = [];
for (const db of testConfig.d1_databases) {
  assert.ok(Object.keys(db).every((key) => ['binding', 'database_name', 'database_id', 'migrations_dir', 'remote'].includes(key)), 'Unexpected D1 preview/remote configuration.');
  assert.equal(db.database_name, expectedNames[db.binding]);
  assert.ok(!productionIds.includes(db.database_id), 'Production D1 ID detected.');
  assert.equal(db.remote, false, 'Local Wrangler dev must not connect to remote D1.');
  assert.equal(db.migrations_dir, db.binding === 'DB' ? '../d1/migrations' : '../d1/cards-migrations');
  assert.ok(db.database_id.startsWith('REPLACE_WITH_NEW_TEST_') || /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(db.database_id));
  ids.push(db.database_id);
}
assert.equal(new Set(ids).size, 2, 'Customer and cards D1 must be distinct.');
if (process.argv.includes('--require-d1')) {
  assert.ok(ids.every((id) => !id.startsWith('REPLACE_')), 'BLOCKED: create separately authorized new test D1 resources and fill only their IDs.');
}
const frontendConfig = await readFile(join(root, 'app', 'vite.maya-test.config.ts'), 'utf8');
assert.ok(frontendConfig.includes(testApi) && frontendConfig.includes(testFrontend));
assert.ok(frontendConfig.includes('dist-maya-test'));
assert.ok(frontendConfig.includes("mode !== 'maya-test'"));
const packageJson = JSON.parse(await readFile(join(root, 'app', 'package.json'), 'utf8'));
assert.equal(packageJson.scripts['build:maya-test'], 'vite build --config vite.maya-test.config.ts --mode maya-test');
assert.ok(!/prerender|deploy/.test(packageJson.scripts['build:maya-test']), 'Test build must not prerender production SEO or deploy.');

if (process.argv.includes('--check-build')) {
  const output = join(root, 'app', 'dist-maya-test');
  const manifest = JSON.parse(await readFile(join(output, 'maya-test-build.json'), 'utf8'));
  assert.equal(manifest.api_origin, testApi);
  assert.equal(manifest.frontend_origin, testFrontend);
  assert.equal(manifest.pages_project, 'crystalfield-maya-sandbox');
  const html = await readFile(join(output, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /googletagmanager\.com|connect\.facebook\.net|facebook\.com\/tr|gtag\(|fbq\(/);
  assert.match(html, /noindex, nofollow, noarchive/);
  const headers = await readFile(join(output, '_headers'), 'utf8');
  assert.match(headers, /X-Robots-Tag: noindex, nofollow, noarchive/);
  const connect = headers.match(/connect-src ([^;]+)/)?.[1];
  assert.ok(connect?.includes(testApi));
  assert.ok(!connect.includes('https://api.crystalfield101.com'));
  assert.match(headers, /form-action 'self' https:\/\/payment-stage\.ecpay\.com\.tw/);
  assert.equal(await readFile(join(output, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
  const assets = await readdir(join(output, 'assets'));
  const scripts = await Promise.all(assets.filter((name) => name.endsWith('.js')).map((name) => readFile(join(output, 'assets', name), 'utf8')));
  assert.ok(scripts.some((script) => script.includes(testApi)), 'Compiled app must contain the test API origin.');
  for (const script of scripts) assert.ok(!script.includes('https://api.crystalfield101.com'), 'Compiled app contains a production API origin.');
  console.log('PASS: isolated frontend artifact uses only the test business API; production analytics bootstrap removed, CSP/robots/noindex applied.');
}
console.log('PASS: local preparation isolation checks; no deployment, Cloudflare write, SQL execution or secret access performed.');
console.log(ids.some((id) => id.startsWith('REPLACE_'))
  ? 'BLOCKED: new test D1 IDs, cloud bindings/DNS/TLS and external OAuth/payment prerequisites are still unprovisioned.'
  : 'NOT VERIFIED: real cloud D1 ownership/bindings, DNS/TLS, secrets and deployment authorization still require manual checks.');
