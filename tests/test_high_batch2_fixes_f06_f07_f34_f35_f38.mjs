/**
 * Comprehensive verification suite for the five High/Medium Audit Findings:
 * - F-06: loadSurah request guard & stale response discard (EXECUTES QuranReaderScreen.tsx)
 * - F-07: Audio playback start/stop race with generation token (EXECUTES quranAudio.ts)
 * - F-34: Quran cache budget O(1) byte counter & drift reconciliation (EXECUTES db.native.ts)
 * - F-35: HomeScreen.load() out-of-order writes & timeout cancellation (EXECUTES HomeScreen.tsx)
 * - F-38: Native-safe getReadingMarkerSync & getReadingPositionSync without localStorage (EXECUTES continuing.ts)
 *
 * ALL FIVE SECTIONS EXECUTE THE REAL PRODUCTION MODULES (transpiled/imported from src/).
 * NO hand-copied logic, NO string-matching as behavioral evidence.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'batch2_suite_'));

console.log('=== RUNNING HIGH/MEDIUM AUDIT BATCH 2 VERIFICATION SUITE ===\n');

/* -------------------------------------------------------------------------- */
/* React Hook Harness for Executing Real Screen Modules (F-06 & F-35)         */
/* -------------------------------------------------------------------------- */
function makeScreenHarness() {
  const GEN = path.join(TMP_DIR, 'gen_' + Math.random().toString(36).slice(2));
  fs.mkdirSync(GEN, { recursive: true });

  const STUB = new Proxy(function () { return STUB; }, {
    get(t, p) {
      const own = Reflect.getOwnPropertyDescriptor(t, p);
      if (own) return Reflect.get(t, p);
      if (p === 'then') return undefined;
      if (p === Symbol.toPrimitive) return () => '';
      if (p === 'toString') return () => '';
      if (p === 'valueOf') return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (typeof p === 'symbol') return undefined;
      return STUB;
    },
    apply() { return STUB; }, construct() { return STUB; }, has() { return true; },
    ownKeys(t) { return Reflect.ownKeys(t); },
    getOwnPropertyDescriptor(t, p) {
      return Reflect.getOwnPropertyDescriptor(t, p) || { configurable: true, enumerable: true, value: STUB };
    },
  });
  globalThis.__qaHarnessStub = STUB;
  globalThis.__qaHarnessOverrides = {};
  const CAP = { callbacks: [], refs: [], states: [], effects: [], setCalls: [] };
  globalThis.__qaHarnessCap = CAP;

  fs.writeFileSync(path.join(GEN, 'react.mjs'), `
const STUB = globalThis.__qaHarnessStub;
const cap = globalThis.__qaHarnessCap;
export const useRef = (init) => { const r = { current: init }; cap.refs.push(r); return r; };
export const useState = (init) => {
  let value = typeof init === 'function' ? init() : init;
  const setter = (v) => {
    value = typeof v === 'function' ? v(value) : v;
    cap.setCalls.push([setter, value]);
  };
  cap.states.push({ get value() { return value; }, setter });
  return [value, setter];
};
export const useCallback = (fn) => { cap.callbacks.push(fn); return fn; };
export const useMemo = (fn) => { try { return fn(); } catch { return STUB; } };
export const useEffect = (fn) => { cap.effects.push(fn); return undefined; };
export const useLayoutEffect = useEffect;
export const useInsertionEffect = useEffect;
export const useReducer = (r, i) => [i, () => {}];
export const useContext = () => STUB;
export const useSyncExternalStore = (s, g) => { try { return g(); } catch { return undefined; } };
export const useDebugValue = () => {}; export const useImperativeHandle = () => {};
export const memo = (c) => c; export const forwardRef = (c) => c; export const createRef = () => ({ current: null });
export const createElement = (t, p, ...k) => ({ __el: true, type: t, props: p || {}, kids: k });
export const cloneElement = (e, p) => ({ ...(e || {}), props: { ...(e && e.props), ...(p || {}) } });
export const isValidElement = (x) => Boolean(x && x.__el);
export const Fragment = Symbol.for('react.fragment');
export const Children = { map: (c, f) => (Array.isArray(c) ? c.map(f) : []), toArray: (c) => (Array.isArray(c) ? c : c ? [c] : []), only: (c) => c, count: (c) => 0 };
export const StrictMode = (p) => p && p.children;
export const Component = class {}; export const PureComponent = class {};
export const startTransition = (f) => f(); export const useTransition = () => [false, (f) => f()];
export const useDeferredValue = (v) => v; export const useId = () => 'id';
export default { useRef, useState, useCallback, useMemo, useEffect, useLayoutEffect, useInsertionEffect,
  useReducer, useContext, useSyncExternalStore, useDebugValue, useImperativeHandle, memo, forwardRef,
  createRef, createElement, cloneElement, isValidElement, Fragment, Children, StrictMode, Component,
  PureComponent, startTransition, useTransition, useDeferredValue, useId };
`);

  function importDecls(sf) {
    return sf.statements.filter(ts.isImportDeclaration);
  }
  function importInfo(decl) {
    const spec = decl.moduleSpecifier.text;
    const clause = decl.importClause;
    const names = []; let def = false;
    if (clause) {
      if (clause.name) def = true;
      const nb = clause.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) names.push(el.propertyName ? el.propertyName.text : el.name.text);
      }
    }
    return { spec, names, def };
  }

  async function loadComponent(relPath, overrides = {}) {
    globalThis.__qaHarnessOverrides = overrides;
    const abs = path.join(REPO_ROOT, relPath);
    const src = fs.readFileSync(abs, 'utf8');
    const js = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
      fileName: path.basename(abs),
    }).outputText;
    const sf = ts.createSourceFile('x.mjs', js, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
    const infos = importDecls(sf).map(importInfo);
    let out = js;
    const seen = new Map();
    for (const info of infos) {
      const { spec } = info;
      if (seen.has(spec)) continue;
      let target;
      if (spec === 'react') {
        target = path.join(GEN, 'react.mjs');
      } else {
        const file = `s_${spec.replace(/[^a-zA-Z0-9]/g, '_')}.mjs`;
        const ov = globalThis.__qaHarnessOverrides[spec] || {};
        const lines = [];
        for (const n of new Set(info.names)) {
          if (Object.prototype.hasOwnProperty.call(ov, n)) {
            lines.push(`export const ${n} = globalThis.__qaHarnessOverrides[${JSON.stringify(spec)}][${JSON.stringify(n)}];`);
          } else {
            lines.push(`export const ${n} = globalThis.__qaHarnessStub;`);
          }
        }
        lines.push(`export default globalThis.__qaHarnessStub;`);
        const targetPath = path.join(GEN, file);
        fs.writeFileSync(targetPath, lines.join('\n'));
        target = targetPath;
      }
      seen.set(spec, target);
      out = out.split(`from '${spec}'`).join(`from '${target}'`).split(`from "${spec}"`).join(`from "${target}"`);
    }
    const outFile = path.join(TMP_DIR, path.basename(relPath).replace(/\.tsx?$/, '') + '_' + Math.random().toString(36).slice(2) + '.mjs');
    fs.writeFileSync(outFile, out);
    globalThis.__qaHarnessCap = CAP;
    const mod = await import(outFile);
    return { mod, cap: CAP };
  }

  function callComponent(fn, props) {
    for (const k of Object.keys(CAP)) CAP[k].length = 0;
    let ret = null, err = null;
    try { ret = fn(props || {}); } catch (e) { err = e; }
    return { ret, err, cap: CAP };
  }
  const findCallback = (cap, needle) => cap.callbacks.find((f) => { try { return String(f).includes(needle); } catch { return false; } });
  const findEffect = (cap, needle) => cap.effects.find((f) => { try { return String(f).includes(needle); } catch { return false; } });
  return { loadComponent, callComponent, findCallback, findEffect, CAP };
}

const deferred = () => {
  let res, rej;
  const p = new Promise((a, b) => { res = a; rej = b; });
  return { p, res, rej };
};


/* ========================================================================== */
/* SECTION 1: F-34 - QURAN CACHE BUDGET O(1) COUNTER & RECONCILIATION         */
/* ========================================================================== */
console.log('--- F-34: Quran Cache Budget O(1) Counter and Reconciliation ---');

// Setup in-memory SQLite database simulating expo-sqlite DatabaseSync
const sqliteMem = new DatabaseSync(':memory:');
const executedSql = [];

const stubSqlite = {
  openDatabaseSync() {
    return {
      withTransactionSync(cb) {
        sqliteMem.exec('BEGIN');
        try {
          const res = cb();
          sqliteMem.exec('COMMIT');
          return res;
        } catch (e) {
          sqliteMem.exec('ROLLBACK');
          throw e;
        }
      },
      execSync(sql) {
        executedSql.push(['execSync', sql]);
        sqliteMem.exec(sql);
      },
      runSync(sql, ...args) {
        executedSql.push(['runSync', sql, args]);
        if (
          globalThis.__failQuranCounterWrites &&
          sql.includes('quran_cache') &&
          (args[0] === 'quran_cache_bytes' || sql.includes("'quran_cache_bytes'"))
        ) {
          throw new Error('Simulated counter write failure');
        }
        const stmt = sqliteMem.prepare(sql);
        return stmt.run(...args);
      },
      getFirstSync(sql, ...args) {
        executedSql.push(['getFirstSync', sql, args]);
        const stmt = sqliteMem.prepare(sql);
        return stmt.get(...args) || null;
      },
      getAllSync(sql, ...args) {
        executedSql.push(['getAllSync', sql, args]);
        const stmt = sqliteMem.prepare(sql);
        return stmt.all(...args);
      },
    };
  },
};

// Transpile src/lib/db.native.ts
const dbNativeSrc = fs.readFileSync(path.join(SRC_DIR, 'lib/db.native.ts'), 'utf8');
const dbNativeTranspiled = ts.transpileModule(
  dbNativeSrc.replace("import * as SQLite from 'expo-sqlite';", "import SQLite from './stubSqliteAdapter.mjs';"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }
).outputText;

fs.writeFileSync(path.join(TMP_DIR, 'stubSqliteAdapter.mjs'), `export default globalThis.__stubSqlite;`);
globalThis.__stubSqlite = stubSqlite;
fs.writeFileSync(path.join(TMP_DIR, 'db_native.mjs'), dbNativeTranspiled);

const dbNative = await import(path.join(TMP_DIR, 'db_native.mjs'));
const {
  saveQuranCache,
  deleteQuranCache,
  loadQuranCache,
  getQuranCacheTotalBytes,
  enforceQuranCacheBudget,
  reconcileQuranCacheBudget,
  PROTECTED_QURAN_CACHE_KEYS,
} = dbNative;

fs.writeFileSync(path.join(TMP_DIR, 'stubRNBackup.mjs'), `export const Platform = { OS: 'android' };`);
fs.writeFileSync(path.join(TMP_DIR, 'stubAsyncStorageBackup.mjs'), `
  const store = new Map();
  export default {
    async getItem(k) { return store.get(k) ?? null; },
    async setItem(k, v) { store.set(k, v); },
    async removeItem(k) { store.delete(k); },
    async getAllKeys() { return [...store.keys()]; },
    async multiGet(keys) { return keys.map(k => [k, store.get(k) ?? null]); },
    async multiSet(entries) { entries.forEach(([k, v]) => store.set(k, v)); },
  };
`);
fs.writeFileSync(path.join(TMP_DIR, 'stubSettingsBackup.mjs'), `export const sanitizeSettings = (value) => value;`);
fs.writeFileSync(path.join(TMP_DIR, 'stubWebStorageBackup.mjs'), `export const webKV = { get: () => null, set: () => {}, getAll: () => [], delete: () => {} };`);
const backupSrcForTest = fs.readFileSync(path.join(SRC_DIR, 'lib/backup.ts'), 'utf8')
  .replace("import { Platform } from 'react-native';", "import { Platform } from './stubRNBackup.mjs';")
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", "import AsyncStorage from './stubAsyncStorageBackup.mjs';")
  .replace("import * as SQLite from 'expo-sqlite';", "import SQLite from './stubSqliteAdapter.mjs';")
  .replace("import * as db from './db';", "import * as db from './db_native.mjs';")
  .replace("import { sanitizeSettings } from './settings';", "import { sanitizeSettings } from './stubSettingsBackup.mjs';")
  .replace("import { webKV } from './webStorage';", "import { webKV } from './stubWebStorageBackup.mjs';");
fs.writeFileSync(path.join(TMP_DIR, 'backup.mjs'), ts.transpileModule(backupSrcForTest, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);
const backup = await import(path.join(TMP_DIR, 'backup.mjs'));

const TRUE_TOTAL = () =>
  sqliteMem.prepare("SELECT COALESCE(SUM(length(payload)), 0) AS t FROM quran_cache WHERE key != 'quran_cache_bytes'").get().t;
const RAW_COUNTER = () => {
  const r = sqliteMem.prepare("SELECT payload FROM quran_cache WHERE key = 'quran_cache_bytes'").get();
  if (!r) return null;
  try { return JSON.parse(r.payload); } catch { return null; }
};
const HAS_CACHE_ROW = (key) => Boolean(sqliteMem.prepare('SELECT 1 AS found FROM quran_cache WHERE key = ?').get(key));
const FULL_SCAN = /SELECT\s+COALESCE\s*\(\s*SUM\s*\(\s*length\s*\(\s*payload\s*\)\s*\)/i;
const resetCache = () => {
  sqliteMem.exec('DELETE FROM quran_cache');
  reconcileQuranCacheBudget();
  executedSql.length = 0;
};

// 1. Verify protected keys include required metadata and reading markers
assert.ok(PROTECTED_QURAN_CACHE_KEYS.has('quran_cache_bytes'), 'quran_cache_bytes must be protected from eviction');
assert.ok(PROTECTED_QURAN_CACHE_KEYS.has('quran-reading-marker'), 'quran-reading-marker must be protected from eviction');
assert.ok(PROTECTED_QURAN_CACHE_KEYS.has('quran-last-reading'), 'quran-last-reading must be protected from eviction');

// 2. Normal inserts: verify the independent count, generation, and O(1) save path.
console.log('  Case 1: Normal inserts and observable O(1) statement check');
for (let i = 1; i <= 8; i++) {
  const payload = { text: 'Ayah ' + i + ' '.repeat(50), n: i };
  saveQuranCache(`surah:10:${i}`, payload);
}
const normalTrue = TRUE_TOTAL();
const normalAccounting = RAW_COUNTER();
assert.equal(normalAccounting.totalBytes, normalTrue, 'Normal inserts must update the byte total');
assert.equal(normalAccounting.rowCount, 8, 'Normal inserts must update the independent row count');
assert.ok(normalAccounting.generation >= 8, 'Normal inserts must advance writer generation');
console.log(`    Measured: trueSum=${normalTrue} bytes, counter=${normalAccounting.totalBytes} bytes, rows=${normalAccounting.rowCount}, generation=${normalAccounting.generation}`);

// Verify O(1) execution by observing the exact production SQL. The pattern matches
// the real COALESCE(SUM(length(payload))) reconciliation query.
executedSql.length = 0;
saveQuranCache('surah:10:999', { text: 'point insert' });
const sumScans = executedSql.filter(([, sql]) => typeof sql === 'string' && FULL_SCAN.test(sql));
assert.equal(sumScans.length, 0, 'saveQuranCache with counter present must execute 0 full-table SUM scans');
console.log(`    Measured: normal save issued ${sumScans.length} full-table SUM scans`);

// Explicit enforcement is a reconciliation checkpoint.
executedSql.length = 0;
enforceQuranCacheBudget(20000);
assert.ok(executedSql.some(([, sql]) => typeof sql === 'string' && FULL_SCAN.test(sql)), 'Explicit enforcement must reconcile with SUM');
const totalAfterEvict = TRUE_TOTAL();
assert.ok(totalAfterEvict <= 20000, `True total (${totalAfterEvict}) must be within budget (20000)`);
assert.equal(getQuranCacheTotalBytes(), totalAfterEvict, 'Counter must match true sum after budget enforcement');
console.log(`    Budget 20000 enforced: trueSum=${totalAfterEvict} <= 20000 (counter=${getQuranCacheTotalBytes()})`);

// 3. Corruption Case A: Missing counter row at write time (must NOT double count)
console.log('  Case 2: Missing counter row at write time (no double-counting)');
sqliteMem.prepare("DELETE FROM quran_cache WHERE key = 'quran_cache_bytes'").run();
const sumBeforeMissingSave = TRUE_TOTAL();
assert.equal(RAW_COUNTER(), null, 'Precondition: counter row deleted');

const payloadNew = { text: 'New item after counter loss' };
const newLen = JSON.stringify(payloadNew).length;
saveQuranCache('surah:20:1', payloadNew);

const sumAfterMissingSave = TRUE_TOTAL();
const counterAfterMissingSave = RAW_COUNTER();
assert.equal(sumAfterMissingSave, sumBeforeMissingSave + newLen, 'True sum reflects exact added length');
assert.equal(counterAfterMissingSave.totalBytes, sumAfterMissingSave, `Counter (${counterAfterMissingSave.totalBytes}) must match true sum (${sumAfterMissingSave}) with 0 drift`);
console.log(`    Measured: trueSum=${sumAfterMissingSave}, counter=${counterAfterMissingSave.totalBytes} (drift=0, no double count)`);

// 4. Out-of-band writes: COUNT(*) catches row-count changes, while explicit
// enforcement catches count-preserving payload drift with an independent SUM.
console.log('  Case 3: Out-of-band writes (count-changing and count-preserving)');
sqliteMem.prepare("INSERT OR REPLACE INTO quran_cache (key, payload, cached_at) VALUES (?, ?, ?)")
  .run('surah:out-of-band:insert', JSON.stringify({ text: 'count changed' }), Date.now());
const countChangedTrue = TRUE_TOTAL();
const countChangedCounter = getQuranCacheTotalBytes();
assert.equal(countChangedCounter, countChangedTrue, 'Count-changing out-of-band insert must trigger reconciliation');
sqliteMem.prepare("DELETE FROM quran_cache WHERE key = ?").run('surah:out-of-band:insert');
assert.equal(getQuranCacheTotalBytes(), TRUE_TOTAL(), 'Count-changing delete must trigger reconciliation');

const beforePreservingUpdate = getQuranCacheTotalBytes();
sqliteMem.prepare("UPDATE quran_cache SET payload = ? WHERE key = ?")
  .run(JSON.stringify({ text: 'count preserving payload with a materially different length' }), 'surah:10:1');
const preservingTrueBeforeEnforce = TRUE_TOTAL();
const preservingBelievedBeforeEnforce = getQuranCacheTotalBytes();
assert.notEqual(preservingBelievedBeforeEnforce, preservingTrueBeforeEnforce, 'Count-preserving UPDATE must not be mistaken for an accounted write');
executedSql.length = 0;
enforceQuranCacheBudget(20000);
assert.ok(executedSql.some(([, sql]) => typeof sql === 'string' && FULL_SCAN.test(sql)), 'Enforcement must observe count-preserving payload drift');
assert.equal(getQuranCacheTotalBytes(), TRUE_TOTAL(), 'Count-preserving drift must be healed before enforcement returns');
console.log(`    Measured: before=${beforePreservingUpdate}, stale=${preservingBelievedBeforeEnforce}, real=${preservingTrueBeforeEnforce}, healed=${getQuranCacheTotalBytes()}`);

// Exact QA counterexample: one existing key grows beyond the production budget while row count stays fixed.
resetCache();
for (let i = 1; i <= 50; i++) saveQuranCache(`surah:breach:${i}`, { text: 'seed-' + i });
const breachBefore = TRUE_TOTAL();
const breachRowsBefore = sqliteMem.prepare("SELECT COUNT(*) AS count FROM quran_cache WHERE key != 'quran_cache_bytes'").get().count;
const largePayload = 'x'.repeat(401 * 1024 * 1024);
sqliteMem.prepare("UPDATE quran_cache SET payload = ? WHERE key = ?").run(largePayload, 'surah:breach:1');
const breachRealBefore = TRUE_TOTAL();
const breachStale = getQuranCacheTotalBytes();
const breachRowsAfter = sqliteMem.prepare("SELECT COUNT(*) AS count FROM quran_cache WHERE key != 'quran_cache_bytes'").get().count;
assert.equal(breachRowsBefore, breachRowsAfter, 'Breach UPDATE must preserve row count');
assert.equal(breachStale, breachBefore, 'The pre-enforcement counter is the cheap stamped value');
assert.ok(breachRealBefore > dbNative.QURAN_CACHE_BUDGET_BYTES, 'Counterexample must exceed the production 400 MiB budget');
enforceQuranCacheBudget(dbNative.QURAN_CACHE_BUDGET_BYTES);
const breachRealAfter = TRUE_TOTAL();
assert.ok(breachRealAfter <= dbNative.QURAN_CACHE_BUDGET_BYTES, 'Budget enforcement must evict the oversized count-preserving row');
assert.equal(getQuranCacheTotalBytes(), breachRealAfter, 'Post-enforcement counter must equal measured bytes');
console.log(`    Exact breach: before=${breachBefore}, realBefore=${breachRealBefore}, staleBefore=${breachStale}, realAfter=${breachRealAfter}, budget=${dbNative.QURAN_CACHE_BUDGET_BYTES}`);

// 5. Real backup restore: execute backup.ts applyRestore, not a hand-written transaction.
console.log('  Case 4: Real backup restore updates accounting in the production transaction');
resetCache();
saveQuranCache('bookmarks', [{ surah: 1, ayah: 1, note: 'old' }]);
const backupPayload = {
  app: 'islamic', formatVersion: 1, exportedAt: new Date().toISOString(), appVersion: '1.1.88',
  data: { tables: { bookmarks: [{ surah: 2, ayah: 255, note: 'restored payload is longer than old' }] }, storage: {} },
};
await backup.applyRestore(backupPayload);
const trueSumBackup = TRUE_TOTAL();
const backupAccounting = RAW_COUNTER();
assert.equal(backupAccounting.totalBytes, trueSumBackup, 'Real backup restore must reconcile exact bytes');
assert.equal(getQuranCacheTotalBytes(), trueSumBackup, 'Real backup restore must leave readable accounting');
console.log(`    Measured: trueSum=${trueSumBackup}, counter=${backupAccounting.totalBytes}, generation=${backupAccounting.generation}`);

// 6. Real interrupted production save: a counter failure must roll back its payload write.
console.log('  Case 5: Production saveQuranCache transaction rollback');
const sumBeforeAbort = TRUE_TOTAL();
const counterBeforeAbort = RAW_COUNTER();
globalThis.__failQuranCounterWrites = true;
const abortedSave = saveQuranCache('surah:aborted', { text: 'will fail' });
globalThis.__failQuranCounterWrites = false;
assert.equal(abortedSave, false, 'A failed production accounting write must report failure');
assert.equal(TRUE_TOTAL(), sumBeforeAbort, 'True total unchanged after rolled-back write');
assert.deepEqual(RAW_COUNTER(), counterBeforeAbort, 'Counter unchanged after rolled-back write');
console.log(`    Measured: trueSum=${TRUE_TOTAL()}, counter=${RAW_COUNTER().totalBytes} (consistent, production path returned false)`);

console.log('  ✓ F-34 complete: real production writes, restore, drift repair and SQL observations passed');


/* ========================================================================== */
/* SECTION 2: F-38 - NATIVE-SAFE READING MARKER & POSITION SYNC ACCESSORS     */
/* ========================================================================== */
console.log('\n--- F-38: Native-safe Reading Marker and Position Sync Accessors ---');

// Transpile src/lib/continuing.ts
const continuingSrc = fs.readFileSync(path.join(SRC_DIR, 'lib/continuing.ts'), 'utf8');
const continuingTranspiled = ts.transpileModule(continuingSrc, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

// Ensure globalThis.localStorage is undefined (Native environment)
delete globalThis.localStorage;
delete globalThis.window;

// Create virtual module stubs for continuing.ts
const virtualDb = {
  loadLastReadPosition: () => null,
  loadQuranCache: (k) => loadQuranCache(k),
  saveQuranCache: (k, v) => saveQuranCache(k, v),
  deleteQuranCache: (k) => deleteQuranCache(k),
};
fs.writeFileSync(path.join(TMP_DIR, 'stubDbContinuing.mjs'), `
  export const loadLastReadPosition = globalThis.__stubDbCont.loadLastReadPosition;
  export const loadQuranCache = globalThis.__stubDbCont.loadQuranCache;
  export const saveQuranCache = globalThis.__stubDbCont.saveQuranCache;
  export const deleteQuranCache = globalThis.__stubDbCont.deleteQuranCache;
`);
globalThis.__stubDbCont = virtualDb;

fs.writeFileSync(path.join(TMP_DIR, 'stubAsyncStorageCont.mjs'), `
  const store = new Map();
  export default {
    async getItem(k) { return store.get(k) || null; },
    async setItem(k, v) { store.set(k, v); },
    async removeItem(k) { store.delete(k); },
  };
`);

const ayahCountsSrc = fs.readFileSync(path.join(SRC_DIR, 'lib/surahAyahCounts.ts'), 'utf8');
fs.writeFileSync(path.join(TMP_DIR, 'surahAyahCounts.mjs'), ts.transpileModule(ayahCountsSrc, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);

fs.writeFileSync(path.join(TMP_DIR, 'stubQuranContinuing.mjs'), `
  export const getMushafPageForAyah = (surah, ayah) => (surah === 18 ? 294 : surah === 36 ? 441 : 1);
`);

const continuingPatched = continuingTranspiled
  .replace("from './db'", "from './stubDbContinuing.mjs'")
  .replace("from './surahAyahCounts'", "from './surahAyahCounts.mjs'")
  .replace("from './quran'", "from './stubQuranContinuing.mjs'")
  .replace("from '@react-native-async-storage/async-storage'", "from './stubAsyncStorageCont.mjs'");

fs.writeFileSync(path.join(TMP_DIR, 'continuing.mjs'), continuingPatched);
const continuing = await import(path.join(TMP_DIR, 'continuing.mjs'));

const {
  getReadingMarkerSync,
  getReadingPositionSync,
  saveReadingMarker,
  saveReadingPosition,
  clearReadingMarker,
  clearReadingPosition,
  _resetReadingMemoryStateForTest,
} = continuing;

// 1. Cold start without localStorage: returns null safely, never throws
assert.equal(typeof globalThis.localStorage, 'undefined', 'Environment must have undefined localStorage (Native)');
_resetReadingMemoryStateForTest();
assert.equal(getReadingMarkerSync(), null, 'Cold start with empty DB returns null safely');
assert.equal(getReadingPositionSync(), null, 'Cold start with empty DB returns null safely');
console.log('  ✓ Native cold-start calls return null safely without throwing');

// 2. Save reading marker and verify synchronous recovery on cold start
await saveReadingMarker(18, 10, 294);
_resetReadingMemoryStateForTest(); // Reset in-memory cache to force sync persistent cache read

// Verify sync read retrieves it from sync cache even after cold boot
const retrievedMarker = getReadingMarkerSync();
assert.ok(retrievedMarker !== null, 'Saved marker must be retrievable synchronously on native cold start');
assert.equal(retrievedMarker.surah, 18);
assert.equal(retrievedMarker.ayah, 10);
assert.equal(retrievedMarker.manual, true);
console.log('  ✓ getReadingMarkerSync successfully retrieved marker on native cold start');

// 3. Save reading position and verify synchronous recovery on cold start
await saveReadingPosition(36, 12, 441);
_resetReadingMemoryStateForTest();
const retrievedPosition = getReadingPositionSync();
assert.ok(retrievedPosition !== null, 'Saved position must be retrievable synchronously on native cold start');
assert.equal(retrievedPosition.surah, 36);
assert.equal(retrievedPosition.ayah, 12);
console.log('  ✓ getReadingPositionSync successfully retrieved position on native cold start');

// 4. Clear operations
await clearReadingMarker();
assert.equal(getReadingMarkerSync(), null, 'clearReadingMarker clears cache');
assert.equal(HAS_CACHE_ROW('quran-reading-marker'), false, 'clearReadingMarker must remove the cache row, not write JSON null');
await clearReadingPosition();
assert.equal(getReadingPositionSync(), null, 'clearReadingPosition clears cache');
assert.equal(HAS_CACHE_ROW('quran-last-reading'), false, 'clearReadingPosition must remove the cache row, not write JSON null');
console.log('  ✓ F-38 clear path removes the production cache rows; the real cold-start assertions above remain mutation-sensitive');


/* ========================================================================== */
/* SECTION 3: F-07 - AUDIO PLAYBACK START/STOP GENERATION TOKEN RACES         */
/* ========================================================================== */
console.log('\n--- F-07: Audio Playback Start/Stop Generation Token Races ---');

const audioPlayerRegistry = [];
class MockAudioPlayer {
  constructor(uri) {
    this.uri = uri;
    this.playing = false;
    this.removed = false;
    this.volume = 1.0;
    this.listeners = new Map();
    audioPlayerRegistry.push(this);
  }
  play() {
    if (this.removed) throw new Error('Cannot play removed player');
    this.playing = true;
  }
  pause() { this.playing = false; }
  remove() { this.removed = true; this.playing = false; }
  setPlaybackRate() {}
  addListener(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(cb);
    return {
      remove: () => {
        const arr = this.listeners.get(event) || [];
        const idx = arr.indexOf(cb);
        if (idx !== -1) arr.splice(idx, 1);
      },
    };
  }
}

const stubExpoAudio = {
  createAudioPlayer({ uri }) { return new MockAudioPlayer(uri); },
  async setAudioModeAsync() { return true; },
};

fs.writeFileSync(path.join(TMP_DIR, 'stubReactAudio.mjs'), `export const useSyncExternalStore = () => {};`);
fs.writeFileSync(path.join(TMP_DIR, 'stubExpoAudio.mjs'), `
  export const createAudioPlayer = (c, o) => globalThis.__stubExpoAudio.createAudioPlayer(c, o);
  export const setAudioModeAsync = (m) => globalThis.__stubExpoAudio.setAudioModeAsync(m);
`);
globalThis.__stubExpoAudio = stubExpoAudio;

fs.writeFileSync(path.join(TMP_DIR, 'stubAsyncStorageAudio.mjs'), `
  export default { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
`);
fs.writeFileSync(path.join(TMP_DIR, 'stubNotifAudio.mjs'), `
  export const ensureNotificationPermissionForPlayback = async () => {};
`);
fs.writeFileSync(path.join(TMP_DIR, 'stubDbAudio.mjs'), `
  export const loadAudioQueue = async () => [];
  export const saveAudioQueue = async () => {};
  export const loadAudioSettings = async () => ({});
  export const saveAudioSettings = async () => {};
  export const saveRecentlyPlayed = async () => {};
`);
fs.writeFileSync(path.join(TMP_DIR, 'stubPreloaderAudio.mjs'), `
  export const takePreloadedSound = async (u) => {
    if (globalThis.__delayPreload) {
      await new Promise(r => { globalThis.__resumePreload = r; });
    }
    return globalThis.__preloadedSoundReturn ?? null;
  };
  export const clearAudioPreloadCache = () => {};
  export const enqueuePreloadUrls = () => {};
  export const getAudioPreloadStats = () => ({});
  export const hasPreloadedSound = () => false;
  export const pauseAudioPreloading = () => {};
  export const resumeAudioPreloading = () => {};
  export const stopAudioPreloading = () => {};
`);
fs.writeFileSync(path.join(TMP_DIR, 'stubDownloadsAudio.mjs'), `
  export const isSurahDownloaded = async () => false;
  export const resolveAudioUri = async (e, s, a, b, u) => u;
`);
fs.writeFileSync(path.join(TMP_DIR, 'stubConnAudio.mjs'), `export const isAppOnline = () => true;`);
fs.writeFileSync(path.join(TMP_DIR, 'stubQuranAudio.mjs'), `export const fetchWithTimeout = async () => ({ ok: true });`);

const quranAudioSrc = fs.readFileSync(path.join(SRC_DIR, 'lib/quranAudio.ts'), 'utf8');
const quranAudioTranspiled = ts.transpileModule(
  quranAudioSrc
    .replaceAll("from 'react'", "from './stubReactAudio.mjs'")
    .replaceAll("from 'expo-audio'", "from './stubExpoAudio.mjs'")
    .replaceAll("from '@react-native-async-storage/async-storage'", "from './stubAsyncStorageAudio.mjs'")
    .replaceAll("from './notifications'", "from './stubNotifAudio.mjs'")
    .replaceAll("from './db'", "from './stubDbAudio.mjs'")
    .replaceAll("from './surahAyahCounts'", "from './surahAyahCounts.mjs'")
    .replaceAll("from './audioPreloader'", "from './stubPreloaderAudio.mjs'")
    .replaceAll("from './surahDownloads'", "from './stubDownloadsAudio.mjs'")
    .replaceAll("from './useConnectivity'", "from './stubConnAudio.mjs'")
    .replaceAll("from './quran'", "from './stubQuranAudio.mjs'"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }
).outputText;

fs.writeFileSync(path.join(TMP_DIR, 'quranAudio.mjs'), quranAudioTranspiled);
const quranAudio = await import(path.join(TMP_DIR, 'quranAudio.mjs'));

const {
  playAudioUrl,
  stop: stopAudio,
  unload: unloadAudio,
  clearPlayback,
  getCurrentPlaybackUrl,
  getPlaybackGeneration,
  bumpPlaybackGeneration,
} = quranAudio;

// 1. Generation token increments
const gen0 = getPlaybackGeneration();
bumpPlaybackGeneration();
assert.equal(getPlaybackGeneration(), gen0 + 1);
stopAudio();
assert.equal(getPlaybackGeneration(), gen0 + 2);
unloadAudio();
assert.equal(getPlaybackGeneration(), gen0 + 3);
clearPlayback();
assert.equal(getPlaybackGeneration(), gen0 + 4);
console.log('  ✓ Generation token increments on stop, unload, clearPlayback, and bump');

// 2. Load-bearing guard test: Preloaded sound acquisition after stop()
// takePreloadedSound returns a preloaded player. User calls stopAudio() before it resolves.
// The guard at :1795 MUST abort playback and safe-remove the player.
const preloadedPlayer = new MockAudioPlayer('https://example.com/preloaded1.mp3');
globalThis.__delayPreload = true;
globalThis.__preloadedSoundReturn = preloadedPlayer;

const playPromisePre = playAudioUrl('https://example.com/preloaded1.mp3');
await new Promise((r) => setTimeout(r, 15)); // Park in takePreloadedSound
stopAudio(); // User stops before sound acquired

globalThis.__delayPreload = false;
globalThis.__resumePreload();
await playPromisePre;

assert.equal(preloadedPlayer.playing, false, 'Preloaded player must NOT be played after stop()');
assert.equal(preloadedPlayer.removed, true, 'Preloaded player must be disposed via safeRemovePlayer');
assert.equal(getCurrentPlaybackUrl(), null, 'currentPlaybackUrl must remain null after stop()');
console.log('  ✓ Single load-bearing guard (:1795) catches stopped preloaded sound');

// 3. Out-of-order start resolution: Newer wins
globalThis.__delayPreload = true;
globalThis.__preloadedSoundReturn = null;
const track1Promise = playAudioUrl('https://example.com/track1.mp3');
await new Promise((r) => setTimeout(r, 15));
const resumeT1 = globalThis.__resumePreload;
globalThis.__delayPreload = false;

const track2Promise = playAudioUrl('https://example.com/track2.mp3');
await track2Promise;
assert.equal(getCurrentPlaybackUrl(), 'https://example.com/track2.mp3');

// Resolve older track 1
resumeT1();
await track1Promise;
assert.equal(getCurrentPlaybackUrl(), 'https://example.com/track2.mp3', 'Track 1 must NOT overwrite newer Track 2');
console.log('  ✓ Start-then-start race: older start resolved later was discarded, newer track won');


/* ========================================================================== */
/* SECTION 4: F-06 - loadSurah REQUEST GENERATION GUARD (REAL COMPONENT)      */
/* ========================================================================== */
console.log('\n--- F-06: loadSurah Request Generation Guard (Real QuranReaderScreen) ---');

let surahFetches = [];
let readingPositionFetches = [];
let savePositionCalls = [];
let gateReadingPosition = false;

const f06Harness = makeScreenHarness();
const { mod: readerMod } = await f06Harness.loadComponent('src/screens/QuranReaderScreen.tsx', {
  '../lib/quran': {
    fetchSurah: (...args) => {
      const d = deferred();
      surahFetches.push({ args, d });
      return d.p;
    },
    getBundledSurahs114: () => [],
    resolveMushafRestorationTarget: () => null,
    getMushafPageForAyah: () => 1,
    getPrimarySurahForPage: () => 1,
    TOTAL_MUSHAF_PAGES: 604,
    fetchMushafPage: () => new Promise(() => {}),
    fetchAyahTafsir: async () => ({}),
    fetchSurahList: async () => [],
  },
  '../lib/db': {
    loadQuranCache: (k) => (k === 'quran-reading-mode' ? 'cards' : null),
    saveQuranCache: () => true,
    saveLastReadPosition: () => {},
    saveRecentlyPlayed: () => {},
    loadAudioSettings: async () => ({}),
    saveAudioSettings: async () => {},
  },
  '../lib/continuing': {
    getReadingMarkerSync: () => null,
    getReadingPositionSync: () => null,
    getReadingMarker: async () => null,
    getReadingPosition: () => {
      const d = deferred();
      readingPositionFetches.push(d);
      if (!gateReadingPosition) d.res(null);
      return d.p;
    },
    saveReadingPosition: (...args) => { savePositionCalls.push(args); },
    saveReadingMarker: async () => true,
    clearReadingMarker: async () => true,
    addReadingPositionListener: () => () => {},
  },
  '../lib/recentSurahs': { recordSurahVisit: () => {} },
  '../lib/mushafRestoration': { resolveMushafRestorationTarget: () => null, calculateMushafScrollTarget: () => null },
  '../lib/quranPreloader': { preloadRemainingSurahsForEdition: () => {} },
});

const readerComp = readerMod.default;
const { cap: readerCap } = f06Harness.callComponent(readerComp, { surahNumber: 1 });
const realLoadSurah = f06Harness.findCallback(readerCap, 'surahRequestIdRef');
const readerUnmountEffect = f06Harness.findEffect(readerCap, 'isReaderMountedRef.current = false');

assert.equal(typeof realLoadSurah, 'function', 'Real loadSurah closure must be captured from production component');
assert.equal(typeof readerUnmountEffect, 'function', 'Real unmount effect must be captured from production component');

const setSurahCallsWith = (val) => readerCap.setCalls.filter(([, v]) => v === val);

// 1. Out-of-order resolution: Older response resolves LAST
{
  readerCap.setCalls.length = 0;
  surahFetches.length = 0;
  const pOld = realLoadSurah(false, 18); // Old load for Surah 18
  const pNew = realLoadSurah(false, 36); // Newer load for Surah 36

  const S36 = { number: 36, englishName: 'Yaseen', ayahs: [{ number: 1, text: 'Ya-Sin' }] };
  const S18 = { number: 18, englishName: 'Al-Kahf', ayahs: [{ number: 1, text: 'Al-Hamdulillah' }] };

  // Newer resolves first
  surahFetches[1].d.res(S36);
  await pNew;
  assert.equal(setSurahCallsWith(S36).length, 1, 'Newer Surah 36 rendered');

  // Stale resolves afterwards
  const mark = readerCap.setCalls.length;
  surahFetches[0].d.res(S18);
  await pOld;

  const afterOld = readerCap.setCalls.slice(mark);
  assert.equal(setSurahCallsWith(S18).length, 0, 'Older Surah 18 must NOT be applied to state');
  console.log('  ✓ Out-of-order surah resolution: Real loadSurah discarded stale response, newer surah preserved');
}

// 2. Stale request failure must not mutate state
{
  readerCap.setCalls.length = 0;
  surahFetches.length = 0;
  const pOld = realLoadSurah(false, 1);
  const pNew = realLoadSurah(false, 2);

  const S2 = { number: 2, englishName: 'Al-Baqarah', ayahs: [{ number: 1, text: 'Alif' }] };
  surahFetches[1].d.res(S2);
  await pNew;

  const mark = readerCap.setCalls.length;
  surahFetches[0].d.rej(new Error('Network error'));
  await pOld;

  const afterErr = readerCap.setCalls.slice(mark);
  assert.equal(afterErr.length, 0, 'Stale failure must write no state');
  console.log('  ✓ Stale failure path: Real loadSurah catch block discarded stale error');
}

// 3. Stale continuation after inner await (getReadingPosition) cannot save reading position
{
  readerCap.setCalls.length = 0;
  surahFetches.length = 0;
  readingPositionFetches.length = 0;
  savePositionCalls.length = 0;
  gateReadingPosition = true;

  const pOld = realLoadSurah(false, 18);
  surahFetches[0].d.res({ number: 18, englishName: 'Al-Kahf', ayahs: [{ number: 1, text: 'x' }] });
  await new Promise((r) => setTimeout(r, 20)); // allow reaching getReadingPosition

  const pNew = realLoadSurah(false, 36);
  surahFetches[1].d.res({ number: 36, englishName: 'Yaseen', ayahs: [{ number: 1, text: 'y' }] });
  await new Promise((r) => setTimeout(r, 20));

  if (readingPositionFetches[1]) readingPositionFetches[1].res({ surah: 30, ayah: 5, page: 1, savedAt: 1 });
  await pNew;

  const savesAfterNew = savePositionCalls.length;
  // Release stale inner await last
  if (readingPositionFetches[0]) readingPositionFetches[0].res(null);
  await pOld;
  gateReadingPosition = false;

  assert.equal(savePositionCalls.length, savesAfterNew, 'Stale continuation must NOT save reading position for wrong surah');
  console.log('  ✓ Stale continuation after getReadingPosition guarded from saving position');
}

// 4. Unmount safety
{
  const cleanup = readerUnmountEffect();
  if (typeof cleanup === 'function') cleanup();
  readerCap.setCalls.length = 0;
  surahFetches.length = 0;
  const p = realLoadSurah(false, 114);
  surahFetches[0].d.res({ number: 114, englishName: 'An-Nas', ayahs: [{ number: 1, text: 'Qul' }] });
  await p;
  assert.equal(readerCap.setCalls.length, 0, 'No state write after reader unmount');
  console.log('  ✓ Unmounted reader safety: Real loadSurah wrote no state after unmount');
}


/* ========================================================================== */
/* SECTION 5: F-35 - HomeScreen.load() GUARD & TIMEOUT (REAL COMPONENT)       */
/* ========================================================================== */
console.log('\n--- F-35: HomeScreen.load() Guard & Timeout (Real HomeScreen) ---');

let prayerFetches = [];
const f35Harness = makeScreenHarness();
const { mod: homeMod } = await f35Harness.loadComponent('src/screens/HomeScreen.tsx', {
  '../lib/prayerTimes': {
    fetchPrayerTimes: (...args) => {
      const d = deferred();
      prayerFetches.push({ args, d });
      return d.p;
    },
    getCachedPrayerTimes: () => null,
  },
  '../lib/useConnectivity': { isAppOnline: () => true, useConnectivity: () => true },
});

const homeComp = homeMod.default;
const { cap: homeCap } = f35Harness.callComponent(homeComp, {});
const realHomeLoad = f35Harness.findCallback(homeCap, 'loadRequestIdRef');
const homeUnmountEffect = f35Harness.findEffect(homeCap, 'isHomeScreenMountedRef.current = false');

assert.equal(typeof realHomeLoad, 'function', 'Real HomeScreen load closure must be captured');
assert.equal(typeof homeUnmountEffect, 'function', 'Real HomeScreen unmount cleanup must be captured');

const setHomeCallsWith = (val) => homeCap.setCalls.filter(([, v]) => v === val);

// 1. Out-of-order resolution: Older response resolves LAST
{
  homeCap.setCalls.length = 0;
  prayerFetches.length = 0;
  const pOld = realHomeLoad(true, false);
  const pNew = realHomeLoad(true, false);

  const NEWER = { city: 'Medina', tag: 'NEW' };
  const OLDER = { city: 'Mecca', tag: 'OLD' };

  prayerFetches[1].d.res(NEWER);
  await pNew;
  assert.equal(setHomeCallsWith(NEWER).length, 1, 'Newer prayer times rendered');

  const mark = homeCap.setCalls.length;
  prayerFetches[0].d.res(OLDER);
  await pOld;

  const afterOld = homeCap.setCalls.slice(mark);
  assert.equal(setHomeCallsWith(OLDER).length, 0, 'Stale Mecca prayer times must NOT overwrite Medina');
  console.log('  ✓ Out-of-order HomeScreen load: Real load discarded stale response, newer data preserved');
}

// 2. Stale failure path
{
  homeCap.setCalls.length = 0;
  prayerFetches.length = 0;
  const pOld = realHomeLoad(true, false);
  const pNew = realHomeLoad(true, false);

  const NEWER = { city: 'Cairo' };
  prayerFetches[1].d.res(NEWER);
  await pNew;

  const mark = homeCap.setCalls.length;
  prayerFetches[0].d.rej(new Error('Network failure'));
  await pOld;

  const afterErr = homeCap.setCalls.slice(mark);
  assert.equal(afterErr.length, 0, 'Stale error wrote no state');
  console.log('  ✓ Stale error failure path: Real load catch block discarded stale error');
}

// 3. Timeout scheduled & cleared on new load
{
  let scheduled = [], cleared = [];
  const nativeSetTimeout = globalThis.setTimeout, nativeClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => { const h = nativeSetTimeout(fn, ms); scheduled.push({ h, ms }); return h; };
  globalThis.clearTimeout = (h) => { cleared.push(h); return nativeClearTimeout(h); };

  homeCap.setCalls.length = 0;
  prayerFetches.length = 0;
  const p1 = realHomeLoad(true, false);
  const t1 = scheduled.map((s) => s.h);
  const p2 = realHomeLoad(true, false);
  const t2 = scheduled.map((s) => s.h).filter((h) => !t1.includes(h));

  assert.equal(t1.length, 1, 'First load scheduled timeout');
  assert.equal(t2.length, 1, 'Second load scheduled timeout');
  assert.ok(cleared.includes(t1[0]), 'Previous timeout was cleared when new load began');

  globalThis.setTimeout = nativeSetTimeout;
  globalThis.clearTimeout = nativeClearTimeout;
  prayerFetches[0].d.res({ city: 'A' });
  prayerFetches[1].d.res({ city: 'B' });
  await Promise.all([p1, p2]);
  console.log('  ✓ Timeout cancellation on new load: Real load cleared previous timeout');
}

// 4. Timeout cleared on unmount
{
  let scheduled = [], cleared = [];
  const nativeSetTimeout = globalThis.setTimeout, nativeClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => { const h = nativeSetTimeout(fn, ms); scheduled.push({ h, ms }); return h; };
  globalThis.clearTimeout = (h) => { cleared.push(h); return nativeClearTimeout(h); };

  homeCap.setCalls.length = 0;
  prayerFetches.length = 0;
  const p = realHomeLoad(true, false);
  const t = scheduled[0].h;

  const cleanup = homeUnmountEffect();
  if (typeof cleanup === 'function') cleanup();
  assert.ok(cleared.includes(t), 'Pending timeout was cleared on unmount');

  globalThis.setTimeout = nativeSetTimeout;
  globalThis.clearTimeout = nativeClearTimeout;
  prayerFetches[0].d.res({ city: 'Ghost' });
  await p;
  console.log('  ✓ Timeout cancellation on unmount: Real unmount cleanup cleared timeout');
}

// 5. C1 REGRESSION TEST: Stale settle must NOT clear current load's timeout
// Interleaving: Load A starts (TA), Load B starts (TB), Load A settles first.
// Load A must NOT clear TB! Load B's fetch hangs. TB fires, clearing the spinner!
{
  // Re-mount first
  const mountEffect = homeCap.effects.find((f) => String(f).includes('isHomeScreenMountedRef.current = true'));
  if (mountEffect) mountEffect();

  let scheduled = [], cleared = [], timerCallbacks = new Map();
  const nativeSetTimeout = globalThis.setTimeout, nativeClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => {
    const h = nativeSetTimeout(fn, ms);
    scheduled.push({ h, ms });
    timerCallbacks.set(h, fn);
    return h;
  };
  globalThis.clearTimeout = (h) => {
    cleared.push(h);
    timerCallbacks.delete(h);
    return nativeClearTimeout(h);
  };

  homeCap.setCalls.length = 0;
  prayerFetches.length = 0;

  const pA = realHomeLoad(true, false); // Load A (TA)
  const TA = scheduled[0].h;
  const pB = realHomeLoad(true, false); // Load B (clears TA, schedules TB)
  const TB = scheduled[1].h;

  cleared.length = 0; // Observe what happens after Load A settles
  prayerFetches[0].d.res({ city: 'A-stale' }); // Older request settles (superseded)
  await pA;

  // The critical C1 assertion: Load A must NOT have cleared TB!
  assert.ok(!cleared.includes(TB), 'C1 FIX: Superseded load A must NOT clear current load B timeout');
  assert.ok(timerCallbacks.has(TB), 'Current timeout TB must remain active');

  // Now Load B's fetch hangs (never resolves). Advance/trigger timer TB!
  const tbCb = timerCallbacks.get(TB);
  tbCb(); // Fire timeout TB -> rejects Promise.race with Error('Prayer times load timed out')
  await pB;

  // Verify that finally block ran for current load B and cleared the loading spinner (loading = false)
  const falseLoadingCalls = homeCap.setCalls.filter(([, val]) => val === false);
  assert.ok(falseLoadingCalls.length >= 1, 'Spinner must be cleared after timeout fires on hung fetch');

  globalThis.setTimeout = nativeSetTimeout;
  globalThis.clearTimeout = nativeClearTimeout;
  console.log('  ✓ C1 Regression test passed: Superseded load did NOT clear current timeout; hung fetch timed out and cleared spinner');
}

console.log('\n=== ALL HIGH BATCH 2 VERIFICATION TESTS PASSED (REAL MODULE EXECUTION) ===');
