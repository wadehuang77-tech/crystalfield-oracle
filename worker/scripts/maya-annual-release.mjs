import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const file = '032_maya_annual.sql';
const sql = readFileSync(`../d1/migrations/${file}`, 'utf8');
assert.ok(!/\b(?:DROP|DELETE|ALTER|TRUNCATE|INSERT|REPLACE)\b/i.test(sql.replace(/ON DELETE CASCADE/g, '')));
assert.equal((sql.match(/CREATE TABLE /g) || []).length, 5);
const query = command => JSON.parse(execFileSync('npx', ['wrangler','d1','execute','DB','--remote','--command',command,'--json'], {encoding:'utf8'}));
const history = query("SELECT name,applied_at FROM d1_migrations ORDER BY id DESC LIMIT 40");
const objects = query("SELECT name,type FROM sqlite_master WHERE name LIKE '%maya_annual%' ORDER BY name");
console.log('Migration history:', JSON.stringify(history));
console.log('Annual schema objects:', JSON.stringify(objects));
const counts = () => query("SELECT 'base' AS product_group,status,COUNT(*) AS n FROM maya_entitlements GROUP BY status UNION ALL SELECT 'pro',status,COUNT(*) FROM maya_pro_entitlements GROUP BY status UNION ALL SELECT 'relationship',status,COUNT(*) FROM maya_relationship_entitlements GROUP BY status");
console.log('Existing entitlement counts before:', JSON.stringify(counts()));
if (process.env.RELEASE_MODE === 'apply') {
  assert.ok(!history.flatMap(r=>r.results).some(r=>r.name===file), '032 already recorded; do not replay');
  assert.equal(objects.flatMap(r=>r.results).length,0,'Annual objects already exist; investigate before migration');
  // The temporary runner directory contains only 032, so unrelated pending migrations cannot run.
  mkdirSync('migrations', {recursive:true});
  writeFileSync(`migrations/${file}`,sql);
  console.log(execFileSync('npx',['wrangler','d1','migrations','apply','DB','--remote'],{encoding:'utf8',input:'y\n'}));
  const after=query("SELECT name,applied_at FROM d1_migrations WHERE name='032_maya_annual.sql'; SELECT name,type FROM sqlite_master WHERE name LIKE '%maya_annual%' ORDER BY name");
  console.log('Migration result:',JSON.stringify(after));
  assert.equal(after[0].results.length,1);
  assert.equal(after[1].results.filter(r=>r.type==='table').length,5);
  console.log('Existing entitlement counts after:',JSON.stringify(counts()));
} else assert.equal(process.env.RELEASE_MODE,'inspect');
