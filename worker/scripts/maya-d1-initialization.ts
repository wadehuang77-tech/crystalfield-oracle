import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mayaSignature, mayaSummary, MAYA_CONTENT_VERSION } from '../../app/src/lib/maya';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const configPath = path.join(root, 'worker', 'wrangler.maya-test.json');
const account = '9c7e7a59a9512d771d6e322c6927859b';
const targets = [
  {
    binding: 'DB', name: 'crystalfield-maya-sandbox-customer', uuid: '1ad83812-c5ac-425d-b1bd-fbcd539919fa',
    files: ['maya-sandbox/customer-base.sql', 'migrations/003-rate-limit-events.sql', 'migrations/004-orders.sql',
      'migrations/006-token-generation.sql', 'migrations/018_profile_member_metadata.sql',
      'migrations/025_maya_dreamspell.sql', 'migrations/026_maya_sandbox_checkout.sql',
      'migrations/027_maya_production_payment_ai.sql'],
    tables: ['profiles', 'multi_spread_free_unlocks', 'rate_limit_events', 'orders', 'profile_member_metadata',
      'maya_kin_profiles', 'maya_kin_content', 'maya_daily_energy', 'maya_entitlements', 'maya_reports',
      'maya_rate_limits', 'maya_sandbox_orders', 'maya_payment_orders', 'maya_payment_adjustments',
      'maya_ai_budgets', 'maya_ai_sections'],
  },
  {
    binding: 'DB_CARDS', name: 'crystalfield-maya-sandbox-cards', uuid: '71cd2302-f5a3-483c-a838-187d7b858e4c',
    files: ['maya-sandbox/cards-base.sql', 'cards-migrations/001_card_localizations.sql',
      'maya-sandbox/cards-maya-content.sql', 'maya-kin-content-seed.sql'],
    tables: ['decks', 'cards', 'deck_localizations', 'card_localizations', 'maya_kin_content'],
  },
] as const;
type Target = typeof targets[number];
type Row = Record<string, string | number | null>;
function normalizeSchema(rows: Row[]): Row[] {
  return rows.map(row => {
    if (typeof row.sql !== 'string') return row;
    const withoutComments = row.sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\r\n]*|\/\*[\s\S]*?\*\//g,
      token => token.startsWith("'") || token.startsWith('"') ? token : ' ');
    const sql = withoutComments.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\s+/g,
      token => token.startsWith("'") || token.startsWith('"') ? token : ' ').trim();
    return { ...row, sql };
  });
}
assert.deepEqual(normalizeSchema([{ sql: "CREATE TABLE x (id TEXT -- note\r\n, v TEXT DEFAULT '-- keep  spaces')" }]),
  normalizeSchema([{ sql: "CREATE TABLE x (id TEXT\n, v TEXT DEFAULT '-- keep  spaces')" }]));
const mode = process.argv[2] ?? 'local';
assert.ok(['local', 'initialize-remote', 'verify-remote', 'inspect-remote', 'resume-remote'].includes(mode), 'Unsupported mode');
const artifactArg = process.argv[3];
assert.ok(artifactArg && path.isAbsolute(artifactArg), 'Provide an absolute evidence directory');
const artifacts = path.resolve(artifactArg);
mkdirSync(artifacts, { recursive: true });
const receiptPath = path.join(artifacts, 'local-pass.json');
const evidencePath = path.join(artifacts, `${mode}.json`);
const evidence: {
  mode: string; started_at: string; status: string; operations: object[];
  before?: object; after?: object; error?: string;
} = { mode, started_at: new Date().toISOString(), status: 'in_progress', operations: [] };
function save() { writeFileSync(evidencePath, JSON.stringify(evidence, null, 2)); }
function checkConfig() {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.equal(config.account_id, account);
  assert.equal(config.name, 'crystalfield-maya-sandbox-api');
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.routes, []);
  assert.equal(config.vars.MAYA_SANDBOX_ENABLED, 'false');
  assert.equal(config.vars.MAYA_AI_MODE, 'mock');
  for (const flag of ['MAYA_PUBLIC_ENABLED', 'MAYA_MEMBER_ENABLED', 'MAYA_PAYMENT_ENABLED', 'MAYA_AI_ENABLED']) {
    assert.equal(config.vars[flag], 'false');
  }
  for (const target of targets) {
    const binding = config.d1_databases.find((item: { binding: string }) => item.binding === target.binding);
    assert.equal(binding?.database_name, target.name);
    assert.equal(binding?.database_id, target.uuid);
  }
}
function fingerprint() {
  const hash = createHash('sha256').update(readFileSync(configPath)).update(readFileSync(fileURLToPath(import.meta.url)));
  for (const target of targets) {
    for (const file of target.files) {
      const sql = readFileSync(path.join(root, 'd1', file), 'utf8');
      // Inspect executable tokens, not ON DELETE actions or words inside seed text.
      const code = sql.replace(/'(?:''|[^'])*'|--[^\r\n]*|\/\*[\s\S]*?\*\//g, match => match.startsWith("'") ? "''" : '');
      assert.ok(!/\b(DROP|TRUNCATE|REPLACE)\b/i.test(code), `Destructive SQL: ${file}`);
      assert.ok(!/(?:^|;)\s*(DELETE|UPDATE)\b/i.test(code), `Unexpected DML: ${file}`);
      for (const statement of code.split(';').map(value => value.trim()).filter(Boolean)) {
        assert.ok(/^(CREATE (?:UNIQUE )?(?:TABLE|INDEX)\b|ALTER TABLE profiles ADD COLUMN token_generation\b|INSERT OR IGNORE INTO maya_kin_content\b)/i.test(statement),
          `Unreviewed SQL statement: ${file}`);
      }
      hash.update(file).update(sql);
    }
  }
  return hash.digest('hex');
}
let token: string | undefined;
async function api(endpoint: string): Promise<unknown> {
  if (!token) {
    assert.ok(process.env.APPDATA, 'Wrangler OAuth location unavailable');
    token = readFileSync(path.join(process.env.APPDATA, 'xdg.config', '.wrangler', 'config', 'default.toml'), 'utf8')
      .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
    assert.ok(token, 'Cloudflare authentication unavailable');
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  const body = await response.json() as { success: boolean; result: unknown; errors?: { code: number }[] };
  assert.ok(response.ok && body.success, `Read-only API failed: ${response.status}, codes ${body.errors?.map(item => item.code)}`);
  return body.result;
}
async function cloudTarget(target: Target, empty: boolean) {
  const item = await api(`/accounts/${account}/d1/database/${target.uuid}`) as Row;
  assert.equal(item.uuid, target.uuid);
  assert.equal(item.name, target.name);
  if (empty) assert.equal(item.num_tables, 0, 'BLOCKED: target is no longer blank; do not retry initialization');
  return item;
}
async function baseline() {
  const databases = await api(`/accounts/${account}/d1/database`) as Row[];
  for (const target of targets) {
    assert.ok(databases.some(item => item.uuid === target.uuid && item.name === target.name));
    assert.ok(!databases.some(item => item.uuid === target.uuid && item.name !== target.name));
  }
  const productionDatabases = [];
  for (const item of databases.filter(item => !targets.some(target => item.uuid === target.uuid))) {
    productionDatabases.push(await api(`/accounts/${account}/d1/database/${item.uuid}`));
  }
  const pages = await api(`/accounts/${account}/pages/projects`) as {
    name: string; latest_deployment?: { id: string }; canonical_deployment?: { id: string };
  }[];
  const scripts = await api(`/accounts/${account}/workers/scripts`) as { id: string; modified_on: string }[];
  const deployments = await api(`/accounts/${account}/workers/scripts/bolt-tarot-api/deployments`) as {
    deployments: { id: string; versions: unknown }[];
  };
  const worker = await api(`/accounts/${account}/workers/workers/crystalfield-maya-sandbox-api`) as {
    deployed_on: string | null; subdomain: { enabled: boolean; previews_enabled: boolean };
  };
  assert.equal(worker.deployed_on, null);
  assert.equal(worker.subdomain.enabled, false);
  assert.equal(worker.subdomain.previews_enabled, false);
  const workflows = JSON.parse(execFileSync('gh', ['api', 'repos/wadehuang77-tech/crystalfield-oracle/actions/runs?per_page=5',
    '--jq', '[.workflow_runs[] | {id,name,status,created_at}]'], { encoding: 'utf8' }));
  return {
    productionDatabases,
    pages: pages.map(item => ({ name: item.name, latest: item.latest_deployment?.id ?? null, canonical: item.canonical_deployment?.id ?? null })),
    scripts: scripts.map(item => ({ name: item.id, modified_on: item.modified_on })),
    deployments: deployments.deployments.map(item => ({ id: item.id, versions: item.versions })),
    domains: await api(`/accounts/${account}/workers/domains`),
    routes: await api('/zones/b9ec3dff1c35136c71d8bc27fadac251/workers/routes'),
    workflows,
  };
}
let localDirectory = path.join(artifacts, 'fresh-local-d1');
async function sql(target: Target, remote: boolean, input: { file: string } | { command: string }) {
  checkConfig();
  if (remote) await cloudTarget(target, false);
  const args = [path.join(root, 'worker', 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
    'd1', 'execute', target.name, '--config', configPath, remote ? '--remote' : '--local', '--json'];
  if (!remote) args.push('--persist-to', localDirectory);
  if ('file' in input) args.push('--file', path.join(root, 'd1', input.file), '--yes');
  else {
    assert.ok(/^(SELECT|PRAGMA)\b/.test(input.command), 'Verification must be read-only');
    args.push('--command', input.command);
  }
  evidence.operations.push({ target_uuid: target.uuid, database: target.name, remote, ...input, started_at: new Date().toISOString() });
  save();
  // Never execute a default config, migration directory, or arbitrary target.
  const output = execFileSync(process.execPath, args, {
    cwd: path.join(root, 'worker'), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Remote file imports emit progress lines even with --json.
  const jsonStart = output.search(/^\s*\[\s*$/m);
  assert.ok(jsonStart >= 0, 'Wrangler did not return a JSON result array');
  const result = JSON.parse(output.slice(jsonStart)) as { success: boolean; results: Row[] }[];
  assert.ok(Array.isArray(result) && result.every(item => item.success), 'SQL result failed');
  return result;
}
async function verify(target: Target, remote: boolean) {
  const [schema] = await sql(target, remote, { command: "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type,name" });
  const tables = schema.results.filter(item => item.type === 'table').map(item => item.name).sort();
  assert.deepEqual(tables, [...target.tables].sort());
  const counts = await sql(target, remote, { command: target.tables.map(table => `SELECT COUNT(*) AS n FROM ${table}`).join(';') });
  for (const [index, table] of target.tables.entries()) {
    const count = counts[index];
    assert.equal(count.results[0].n, target.binding === 'DB_CARDS' && table === 'maya_kin_content' ? 520 : 0);
  }
  const [foreignKeys] = await sql(target, remote, { command: 'PRAGMA foreign_key_check' });
  assert.equal(foreignKeys.results.length, 0);
  const details = await sql(target, remote, { command: target.tables.map(table => `PRAGMA table_info(${table}); PRAGMA foreign_key_list(${table}); PRAGMA index_list(${table})`).join(';') });
  const requiredForeignKeys: Record<string, string[]> = target.binding === 'DB'
    ? {
      profile_member_metadata: ['profiles'], maya_kin_profiles: ['profiles'],
      maya_entitlements: ['profiles', 'orders'],
      maya_reports: ['profiles', 'maya_kin_profiles', 'maya_kin_profiles', 'orders', 'maya_entitlements'],
      maya_rate_limits: ['profiles'], maya_sandbox_orders: ['orders', 'profiles'],
      maya_payment_orders: ['orders', 'profiles'], maya_payment_adjustments: ['maya_payment_orders', 'profiles'],
      maya_ai_budgets: ['orders'], maya_ai_sections: ['maya_reports'],
    }
    : { deck_localizations: ['decks'], card_localizations: ['cards', 'cards'] };
  for (const [index, table] of target.tables.entries()) {
    assert.ok(details[index * 3].results.length > 0, `Missing columns: ${table}`);
    assert.deepEqual(details[index * 3 + 1].results.map(row => row.table).sort(), (requiredForeignKeys[table] ?? []).sort());
    assert.ok(details[index * 3 + 2].results.some(row => row.unique === 1), `Missing primary/unique index: ${table}`);
  }
  if (target.binding === 'DB') {
    const profiles = details[target.tables.indexOf('profiles') * 3].results;
    assert.ok(profiles.some(row => row.name === 'token_generation' && row.notnull === 1));
    const sandbox = details[target.tables.indexOf('maya_sandbox_orders') * 3].results;
    for (const name of ['order_id', 'user_id', 'product_code', 'merchant_id', 'locale', 'checkout_key', 'trade_no', 'created_at']) {
      assert.ok(sandbox.some(row => row.name === name), `Missing checkout column: ${name}`);
    }
    for (const name of ['idx_profiles_email', 'idx_profile_member_metadata_google_sub', 'idx_rl_scope_key_created',
      'idx_orders_user', 'idx_maya_entitlements_owner', 'idx_maya_reports_owner', 'idx_maya_payment_owner']) {
      assert.ok(schema.results.some(row => row.type === 'index' && row.name === name), `Missing index: ${name}`);
    }
  }
  if (target.binding === 'DB_CARDS') {
    const [content] = await sql(target, remote, { command: 'SELECT * FROM maya_kin_content ORDER BY kin_number,locale' });
    assert.equal(content.results.length, 520);
    for (const kin of Array.from({ length: 260 }, (_, index) => index + 1)) {
      for (const locale of ['zh-TW', 'en'] as const) {
        const row = content.results.find(item => item.kin_number === kin && item.locale === locale);
        assert.ok(row, `Missing KIN ${kin} ${locale}`);
        const signature = mayaSignature(kin, locale);
        assert.equal(row.solar_seal_name, signature.solar_seal);
        assert.equal(row.tone_name, signature.galactic_tone);
        assert.equal(row.summary, mayaSummary(signature, locale));
        assert.equal(row.content_version, MAYA_CONTENT_VERSION);
        if (locale === 'en') assert.ok(!/[\u3400-\u9fff]/u.test(JSON.stringify(row)));
      }
    }
  }
  return { name: target.name, uuid: target.uuid, schema: normalizeSchema(schema.results),
    details: details.map(item => ({ results: item.results })), expected_rows_verified: true };
}
async function inspect(target: Target, remote = true) {
  const metadata = remote ? await cloudTarget(target, false) : null;
  const [schema] = await sql(target, remote, { command: "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type,name" });
  const tables = schema.results.filter(row => row.type === 'table').map(row => String(row.name));
  assert.ok(tables.every(table => (target.tables as readonly string[]).includes(table)), 'Unexpected table: stop before writes');
  const counts = tables.length ? await sql(target, remote, { command: tables.map(table => `SELECT COUNT(*) AS n FROM ${table}`).join(';') }) : [];
  return { metadata, schema: schema.results, tables, counts: tables.map((table, index) => ({ table, n: counts[index].results[0].n })) };
}
async function resumePlan(target: Target, expected: { schema: Row[]; details: { results: Row[] }[] }, remote = true) {
  const state = await inspect(target, remote);
  for (const count of state.counts) assert.equal(count.n, 0, 'Resume requires no existing private or content data; inspect instead of overwriting');
  for (const item of state.schema) {
    const local = expected.schema.find(row => row.type === item.type && row.name === item.name);
    assert.ok(local, 'Unexpected existing schema object');
    if (item.name !== 'profiles') assert.deepEqual(normalizeSchema([item])[0], local, `Existing schema differs: ${item.name}`);
  }
  const [profileColumns] = state.tables.includes('profiles')
    ? await sql(target, remote, { command: 'PRAGMA table_info(profiles)' }) : [{ results: [] as Row[] }];
  if (profileColumns.results.length) {
    const local = expected.details[0].results;
    assert.deepEqual(profileColumns.results, local.filter(row => row.name !== 'token_generation'), 'Existing partial profiles differ from verified local base');
  }
  const fileTables: Record<string, string[]> = {
    'maya-sandbox/customer-base.sql': ['profiles', 'multi_spread_free_unlocks'],
    'migrations/003-rate-limit-events.sql': ['rate_limit_events'],
    'migrations/004-orders.sql': ['orders'],
    'migrations/018_profile_member_metadata.sql': ['profile_member_metadata'],
    'migrations/025_maya_dreamspell.sql': ['maya_kin_profiles', 'maya_kin_content', 'maya_daily_energy', 'maya_entitlements', 'maya_reports', 'maya_rate_limits'],
    'migrations/026_maya_sandbox_checkout.sql': ['maya_sandbox_orders'],
    'migrations/027_maya_production_payment_ai.sql': ['maya_payment_orders', 'maya_payment_adjustments', 'maya_ai_budgets', 'maya_ai_sections'],
    'maya-sandbox/cards-base.sql': ['decks', 'cards'],
    'cards-migrations/001_card_localizations.sql': ['deck_localizations', 'card_localizations'],
    'maya-sandbox/cards-maya-content.sql': ['maya_kin_content'],
  };
  const files = target.files.filter(file => {
    if (file === 'migrations/006-token-generation.sql') return !profileColumns.results.some(row => row.name === 'token_generation');
    if (file === 'maya-kin-content-seed.sql') return true;
    const group = fileTables[file];
    assert.ok(group, `Missing reviewed dependencies: ${file}`);
    const present = group.filter(table => state.tables.includes(table));
    assert.ok(present.length === 0 || present.length === group.length, 'Partially applied migration requires manual audit');
    return present.length === 0;
  });
  if (target.binding === 'DB') {
    assert.deepEqual(state.tables.sort(), ['multi_spread_free_unlocks', 'profiles'], 'Only the previously audited two-table state may resume');
    assert.ok(!files.includes('maya-sandbox/customer-base.sql'), 'Never replay existing customer base');
  } else assert.equal(state.tables.length, 0, 'Cards must still be empty before this resume');
  return { state, files };
}
async function main() {
  checkConfig();
  const hash = fingerprint();
  if (mode === 'local') {
    assert.ok(!existsSync(localDirectory), 'Local initialization requires a NEW empty persistence directory');
    const results = [];
    for (const target of targets) {
      for (const file of target.files) await sql(target, false, { file });
      results.push(await verify(target, false));
    }
    // Only the additive/repeatable subset is replayed; ALTER migration 006 runs once.
    for (const file of ['migrations/018_profile_member_metadata.sql', 'migrations/025_maya_dreamspell.sql', 'migrations/026_maya_sandbox_checkout.sql', 'migrations/027_maya_production_payment_ai.sql']) {
      await sql(targets[0], false, { file });
    }
    await sql(targets[1], false, { file: 'maya-kin-content-seed.sql' });
    await verify(targets[0], false);
    await verify(targets[1], false);
    localDirectory = path.join(artifacts, 'partial-resume-local-d1');
    assert.ok(!existsSync(localDirectory), 'Resume simulation requires new local persistence');
    await sql(targets[0], false, { file: 'maya-sandbox/customer-base.sql' });
    for (const [index, target] of targets.entries()) {
      const plan = await resumePlan(target, results[index], false);
      for (const file of plan.files) await sql(target, false, { file });
      const resumed = await verify(target, false);
      assert.deepEqual(resumed.schema, results[index].schema, 'Local incremental resume differs from complete local schema');
      assert.deepEqual(resumed.details, results[index].details);
    }
    writeFileSync(receiptPath, JSON.stringify({ status: 'PASS', fingerprint: hash, partial_resume_verified: true, results }, null, 2));
  } else if (mode === 'inspect-remote') {
    evidence.before = await baseline();
    for (const target of targets) {
      const state = await inspect(target);
      writeFileSync(path.join(artifacts, `${target.binding}-inspection.json`), JSON.stringify(state, null, 2));
    }
  } else {
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(receipt.status, 'PASS', 'Remote initialization requires local PASS');
    if (mode === 'resume-remote') assert.equal(receipt.partial_resume_verified, true);
    assert.equal(receipt.fingerprint, hash, 'SQL/config changed after local validation');
    const zones = await api('/zones?name=crystalfield101.com&per_page=5') as { id: string; status: string; account: { id: string } }[];
    assert.equal(zones.length, 1);
    assert.equal(zones[0].account.id, account);
    assert.equal(zones[0].id, 'b9ec3dff1c35136c71d8bc27fadac251');
    assert.equal(zones[0].status, 'active');
    evidence.before = await baseline();
    save();
    for (const target of targets) await cloudTarget(target, mode === 'initialize-remote');
    const plans = [];
    if (mode === 'resume-remote') {
      for (const target of targets) {
        const localResult = receipt.results.find((item: { uuid: string }) => item.uuid === target.uuid);
        plans.push({ target, ...await resumePlan(target, localResult) });
      }
      writeFileSync(path.join(artifacts, 'resume-plan.json'), JSON.stringify(plans, null, 2));
      for (const plan of plans) {
        for (const file of plan.files) await sql(plan.target, true, { file });
      }
    }
    for (const target of targets) {
      if (mode === 'initialize-remote') {
        await cloudTarget(target, true);
        for (const file of target.files) await sql(target, true, { file });
      }
      const result = await verify(target, true);
      const localResult = receipt.results.find((item: { uuid: string }) => item.uuid === target.uuid);
      assert.deepEqual(result.schema, localResult.schema, 'Remote schema differs from the fresh local D1');
      assert.deepEqual(result.details, localResult.details, 'Remote columns, indexes or foreign keys differ from local');
      writeFileSync(path.join(artifacts, `${target.binding}-remote-verification.json`), JSON.stringify(result, null, 2));
    }
    evidence.after = await baseline();
    assert.deepEqual(evidence.after, evidence.before, 'BLOCKED: external baseline changed; stop, never alter production');
  }
  evidence.status = 'PASS';
  save();
  console.log(mode === 'inspect-remote'
    ? 'PASS: read-only inspection saved; no initialization or seed verification is claimed.'
    : `PASS: ${mode}; both exact D1 targets, schema, empty private tables, all 520 bilingual content rows verified.`);
}
main().catch(error => {
  evidence.status = 'BLOCKED';
  evidence.error = error instanceof Error && !('stdout' in error) ? error.message : 'Wrangler SQL execution failed; stop and inspect the D1 state before any retry.';
  if (error instanceof Error && 'stderr' in error && typeof error.stderr === 'string') {
    const diagnostic = error.stderr.match(/(?:ERROR|SQLITE_[A-Z]+)[^\r\n]*/g);
    if (diagnostic) evidence.error += ` ${diagnostic.join('; ')}`;
  }
  save();
  console.error(evidence.error);
  process.exitCode = 1;
});
