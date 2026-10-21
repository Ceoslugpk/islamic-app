import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadModule(relativePath, modules) {
  return loadCommonJsModule({ root: ROOT, relativePath, modules });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createWebStorage() {
  const records = new Map([
    ['study:highlight:old', JSON.stringify({ id: 'old', surah: 1, ayah: 1, color: '#old', createdAt: 1 })],
  ]);
  let failNextHighlightWrite = true;
  const webKV = {
    get(key) {
      return records.has(key) ? records.get(key) : null;
    },
    set(key, value) {
      if (failNextHighlightWrite && key.startsWith('study:highlight:') && key !== 'study:highlight:old') {
        failNextHighlightWrite = false;
        throw new Error('simulated quota failure');
      }
      records.set(key, value);
    },
    getAll(prefix) {
      return [...records.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({ key, value }));
    },
    delete(key) {
      records.delete(key);
    },
  };
  return { webKV, records };
}

function loadWebDb() {
  const storage = createWebStorage();
  return {
    db: loadModule('src/lib/db.ts', { './webStorage': { webKV: storage.webKV }, './womenReason': loadClassifier() }),
    storage,
  };
}

function loadClassifier() {
  return loadModule('src/lib/womenReason.ts', {});
}

function createNativeDatabase() {
  let tables = {
    quran_cache: [],
    verse_highlights: [{ id: 'old', surah: 1, ayah: 1, color: '#old', created_at: 1 }],
  };
  const database = {
    withTransactionSync(callback) {
      const snapshot = clone(tables);
      try {
        return callback();
      } catch (error) {
        tables = snapshot;
        throw error;
      }
    },
    execSync() {},
    getFirstSync(sql, key) {
      if (sql.includes('PRAGMA user_version')) return { user_version: 2 };
      if (sql.includes('SELECT payload, cached_at FROM quran_cache')) {
        const row = tables.quran_cache.find((item) => item.key === key);
        return row ? { payload: row.payload, cached_at: row.cached_at } : null;
      }
      if (sql.includes('SELECT COUNT(*) AS count FROM quran_cache')) return { count: 0 };
      if (sql.includes('COALESCE(SUM(length(payload))')) return { total: 0, count: 0 };
      return null;
    },
    getAllSync(sql) {
      if (sql.includes('FROM verse_highlights')) return clone(tables.verse_highlights);
      if (sql.includes('FROM quran_cache')) return clone(tables.quran_cache);
      return [];
    },
    runSync(sql, ...args) {
      if (sql.includes('INSERT OR REPLACE INTO quran_cache')) {
        const [key, payload, cached_at] = args;
        tables.quran_cache = tables.quran_cache.filter((item) => item.key !== key);
        tables.quran_cache.push({ key, payload, cached_at });
        return;
      }
      if (sql.includes('DELETE FROM verse_highlights')) {
        tables.verse_highlights = tables.verse_highlights.filter(
          (item) => item.surah !== args[0] || item.ayah !== args[1],
        );
        return;
      }
      if (sql.includes('INSERT INTO verse_highlights')) {
        throw new Error('simulated insert failure');
      }
    },
  };
  return {
    database,
    highlights: () => clone(tables.verse_highlights),
  };
}

function loadNativeDb() {
  const native = createNativeDatabase();
  const SQLite = { __esModule: true, openDatabaseSync: () => native.database };
  return {
    db: loadModule('src/lib/db.native.ts', { 'expo-sqlite': SQLite, './womenReason': loadClassifier() }),
    native,
  };
}

const web = loadWebDb();
assert.equal(web.db.addVerseHighlight(1, 1, '#new'), false);
assert.deepEqual(
  JSON.parse(web.storage.records.get('study:highlight:old')),
  { id: 'old', surah: 1, ayah: 1, color: '#old', createdAt: 1 },
  'web insert failure must preserve the previous highlight',
);

const native = loadNativeDb();
assert.equal(native.db.addVerseHighlight(1, 1, '#new'), false);
assert.deepEqual(
  native.native.highlights(),
  [{ id: 'old', surah: 1, ayah: 1, color: '#old', created_at: 1 }],
  'native insert failure must roll back deletion of the previous highlight',
);

console.log('DB highlight atomicity regression: RED-capable native/web production-path checks passed');
