/**
 * Storage-budget regression tests.
 *
 * This suite transpiles and executes the production db.native.ts and db.ts
 * modules. It intentionally contains no copied eviction/accounting helpers and
 * no source-text assertions as behavioural evidence.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { compileEsmProductionModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-storage-budget-'));
const sqlite = new DatabaseSync(':memory:');
const sqlLog = [];
let failCounterWrites = false;

const sqliteAdapter = {
  openDatabaseSync() {
    return {
      withTransactionSync(callback) {
        sqlite.exec('BEGIN');
        try {
          const value = callback();
          sqlite.exec('COMMIT');
          return value;
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      },
      execSync(sql) {
        sqlLog.push(['execSync', sql]);
        sqlite.exec(sql);
      },
      runSync(sql, ...args) {
        sqlLog.push(['runSync', sql, args]);
        if (failCounterWrites && sql.includes('quran_cache') && (args[0] === 'quran_cache_bytes' || sql.includes("'quran_cache_bytes'"))) {
          throw new Error('simulated counter failure');
        }
        return sqlite.prepare(sql).run(...args);
      },
      getFirstSync(sql, ...args) {
        sqlLog.push(['getFirstSync', sql, args]);
        return sqlite.prepare(sql).get(...args) || null;
      },
      getAllSync(sql, ...args) {
        sqlLog.push(['getAllSync', sql, args]);
        return sqlite.prepare(sql).all(...args);
      },
    };
  },
};

fs.writeFileSync(path.join(TMP, 'sqliteAdapter.mjs'), 'export default globalThis.__sqliteAdapter;');
globalThis.__sqliteAdapter = sqliteAdapter;
const db = await import(compileEsmProductionModule({
  root: ROOT,
  tmpDir: TMP,
  sourceRelativePath: 'src/lib/db.native.ts',
  source: fs.readFileSync(path.join(ROOT, 'src/lib/db.native.ts'), 'utf8'),
  outputName: 'db.native.mjs',
  replacements: [["import * as SQLite from 'expo-sqlite';", "import SQLite from './sqliteAdapter.mjs';"]],
}));

const trueBytes = () => sqlite.prepare(
  "SELECT COALESCE(SUM(length(payload)), 0) AS total FROM quran_cache WHERE key != 'quran_cache_bytes'"
).get().total;
const counter = () => {
  const row = sqlite.prepare("SELECT payload FROM quran_cache WHERE key = 'quran_cache_bytes'").get();
  return row ? JSON.parse(row.payload) : null;
};
const fullScan = /SELECT\s+COALESCE\s*\(\s*SUM\s*\(\s*length\s*\(\s*payload\s*\)\s*\)/i;
const reset = () => {
  try {
    sqlite.exec('DELETE FROM quran_cache');
  } catch {
    db.saveQuranCache('surah:storage:init', {});
    sqlite.exec('DELETE FROM quran_cache');
  }
  db.reconcileQuranCacheBudget();
  sqlLog.length = 0;
};

console.log('=== STORAGE BUDGET: REAL PRODUCTION MODULES ===');

// The eviction selector is the real exported production selector.
assert.deepEqual(
  db.selectKeysToEvict([
    { key: 'surah:1:en', size: 100, cached_at: 1 },
    { key: 'surah:2:en', size: 100, cached_at: 2 },
    { key: 'bookmarks', size: 100, cached_at: 3 },
  ], 150),
  ['surah:1:en', 'surah:2:en'],
  'Production selector evicts oldest disposable rows and preserves protected rows'
);
assert.ok(db.PROTECTED_QURAN_CACHE_KEYS.has('quran_cache_bytes'));
assert.ok(db.PROTECTED_QURAN_CACHE_KEYS.has('quran-reading-marker'));
assert.ok(db.PROTECTED_QURAN_CACHE_KEYS.has('quran-last-reading'));
console.log('  ✓ Production eviction selector preserves protected data');

// Normal save path: exact counter plus no SUM scan.
reset();
for (let i = 0; i < 10; i++) db.saveQuranCache(`surah:storage:${i}`, { text: `row-${i}` });
assert.equal(counter().totalBytes, trueBytes());
assert.equal(counter().rowCount, 10);
sqlLog.length = 0;
db.saveQuranCache('surah:storage:normal', { text: 'normal save' });
assert.equal(sqlLog.filter(([, sql]) => typeof sql === 'string' && fullScan.test(sql)).length, 0, 'Normal save must not run a full SUM scan');
console.log(`  ✓ Normal inserts: measured=${trueBytes()} bytes, counter=${counter().totalBytes}, scans=0`);

// Missing counter is rebuilt before the new payload is accounted.
sqlite.prepare("DELETE FROM quran_cache WHERE key = 'quran_cache_bytes'").run();
db.saveQuranCache('surah:storage:missing-counter', { text: 'new row' });
assert.equal(counter().totalBytes, trueBytes(), 'Missing counter must not double count');
console.log(`  ✓ Missing counter recovery: measured=${trueBytes()} bytes, counter=${counter().totalBytes}`);

// Count-preserving UPDATE is invisible to COUNT(*) but explicit enforcement must SUM and repair it.
const beforeUpdate = trueBytes();
sqlite.prepare("UPDATE quran_cache SET payload = ? WHERE key = ?").run('x'.repeat(2000), 'surah:storage:0');
const afterUpdate = trueBytes();
assert.notEqual(db.getQuranCacheTotalBytes(), afterUpdate, 'Cheap counter path must expose the pre-reconcile stale value');
sqlLog.length = 0;
db.enforceQuranCacheBudget(50 * 1024 * 1024);
assert.ok(sqlLog.some(([, sql]) => typeof sql === 'string' && fullScan.test(sql)), 'Explicit enforcement must observe count-preserving drift');
assert.equal(db.getQuranCacheTotalBytes(), afterUpdate);
console.log(`  ✓ Count-preserving UPDATE: before=${beforeUpdate}, real=${afterUpdate}, healed=${db.getQuranCacheTotalBytes()}`);

// Count-changing writes are detected by the independent COUNT(*) query.
sqlite.prepare("INSERT INTO quran_cache (key, payload, cached_at) VALUES (?, ?, ?)").run('surah:storage:oob', 'out-of-band', Date.now());
assert.equal(db.getQuranCacheTotalBytes(), trueBytes(), 'Count-changing insert must trigger reconciliation');
sqlite.prepare("DELETE FROM quran_cache WHERE key = ?").run('surah:storage:oob');
assert.equal(db.getQuranCacheTotalBytes(), trueBytes(), 'Count-changing delete must trigger reconciliation');
console.log(`  ✓ Count-changing out-of-band writes: measured=${trueBytes()}, counter=${db.getQuranCacheTotalBytes()}`);

// Production transaction rollback: a counter failure cannot leave an orphan payload row.
const beforeAbort = trueBytes();
const counterBeforeAbort = counter();
failCounterWrites = true;
assert.equal(db.saveQuranCache('surah:storage:aborted', { text: 'must roll back' }), false);
failCounterWrites = false;
assert.equal(trueBytes(), beforeAbort);
assert.deepEqual(counter(), counterBeforeAbort);
console.log(`  ✓ Interrupted production save rolled back: measured=${trueBytes()}, counter=${counter().totalBytes}`);

// Bounded periodic reconciliation is observed after the production write interval.
reset();
for (let i = 0; i < 32; i++) db.saveQuranCache(`surah:storage:periodic:${i}`, { text: String(i) });
assert.ok(sqlLog.some(([, sql]) => typeof sql === 'string' && fullScan.test(sql)), 'Periodic write bound must eventually reconcile');
assert.equal(counter().totalBytes, trueBytes());
console.log('  ✓ Periodic reconciliation observed after bounded production writes');

// Execute the web facade too; its accounting path is real, not a source parity assertion.
const webMap = new Map();
globalThis.__webMap = webMap;
fs.writeFileSync(path.join(TMP, 'webStorage.mjs'), `
  const map = globalThis.__webMap;
  export const webKV = {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => map.set(key, value),
    delete: (key) => map.delete(key),
    getAll: (prefix) => [...map.entries()].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, value })),
  };
`);
const dbWebSource = fs.readFileSync(path.join(ROOT, 'src/lib/db.ts'), 'utf8');
const web = await import(compileEsmProductionModule({
  root: ROOT,
  tmpDir: TMP,
  sourceRelativePath: 'src/lib/db.ts',
  source: dbWebSource,
  outputName: 'db.web.mjs',
  replacements: [["import { webKV } from './webStorage';", "import { webKV } from './webStorage.mjs';"]],
}));
web.saveQuranCache('surah:web:1', { text: 'web' });
assert.equal(web.getQuranCacheTotalBytes(), JSON.stringify({ text: 'web' }).length);
web.deleteQuranCache('surah:web:1');
assert.equal(web.getQuranCacheTotalBytes(), 0);
console.log('  ✓ Web facade accounting and deletion execute successfully');

console.log('=== STORAGE BUDGET: ALL REAL-MODULE TESTS PASSED ===');
