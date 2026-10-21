import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadNativeDb() {
  const failDelete = (sql) => sql.includes('DELETE FROM period_entries') || sql.includes('DELETE FROM nifas_entries');
  const database = {
    withTransactionSync(callback) { return callback(); },
    execSync() {},
    getFirstSync(sql) {
      if (sql.includes('PRAGMA user_version')) return { user_version: 2 };
      if (sql.includes('SELECT payload, cached_at FROM quran_cache')) return null;
      if (sql.includes('SELECT COUNT(*) AS count FROM quran_cache')) return { count: 0 };
      if (sql.includes('COALESCE(SUM(length(payload))')) return { total: 0, count: 0 };
      return null;
    },
    getAllSync() { return []; },
    runSync(sql) {
      if (failDelete(sql)) throw new Error('simulated SQLite write failure');
    },
  };
  return loadCommonJsModule({
    root: ROOT,
    relativePath: 'src/lib/db.native.ts',
    modules: {
      'expo-sqlite': { __esModule: true, openDatabaseSync: () => database },
      './womenReason': loadClassifier(),
    },
  });
}

function loadClassifier() {
  return loadCommonJsModule({ root: ROOT, relativePath: 'src/lib/womenReason.ts' });
}

function loadWebDb() {
  const records = new Map([
    ['women:period:period-1', JSON.stringify({ id: 'period-1' })],
    ['women:nifas:nifas-1', JSON.stringify({ id: 'nifas-1' })],
  ]);
  const webKV = {
    get(key) {
      return records.has(key) ? records.get(key) : null;
    },
    set(key, value) {
      records.set(key, value);
    },
    getAll(prefix) {
      return [...records.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({ key, value }));
    },
    delete() {
      // Simulate a storage delete that silently fails at the adapter boundary.
    },
  };
  return loadCommonJsModule({
    root: ROOT,
    relativePath: 'src/lib/db.ts',
    modules: {
      './webStorage': { webKV },
      './womenReason': loadClassifier(),
    },
  });
}

const db = loadNativeDb();
assert.throws(
  () => db.deletePeriodEntry('period-1'),
  /simulated SQLite write failure/,
  'period deletion must not convert a failed SQLite write into success',
);
assert.throws(
  () => db.deleteNifasEntry('nifas-1'),
  /simulated SQLite write failure/,
  'nifas deletion must not convert a failed SQLite write into success',
);

const web = loadWebDb();
assert.throws(
  () => web.deletePeriodEntry('period-1'),
  /Failed to delete period entry/,
  'web period deletion must verify a failed storage delete',
);
assert.throws(
  () => web.deleteNifasEntry('nifas-1'),
  /Failed to delete nifas entry/,
  'web nifas deletion must verify a failed storage delete',
);

console.log('DB sensitive-delete regression: RED-capable production-path checks passed');
