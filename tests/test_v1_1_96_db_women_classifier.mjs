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

const WOMEN_REASONS = [
  'Menstruation',
  'period',
  'menses',
  'Haidh',
  'Hayd',
  'Haydh',
  'Haiz',
  'Hayz',
  'Nifas',
  'Nifaas',
  'Post-natal',
  'Post–natal',
  'Postnatal',
  'Postpartum',
  'حيض',
  'نِفَاس',
];

function createWebStorage(records = new Map()) {
  return {
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
    delete(key) {
      records.delete(key);
    },
  };
}

function loadWebDb(records) {
  const webKV = createWebStorage(records);
  return {
    db: loadModule('src/lib/db.ts', { './webStorage': { webKV }, './womenReason': loadClassifier() }),
    webKV,
  };
}

function createNativeDatabase(initialRows) {
  let tables = clone({
    quran_cache: [],
    missed_fasts: initialRows,
    period_entries: [],
    nifas_entries: [],
    verse_highlights: [],
  });
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
      if (sql.includes('SELECT COUNT(*) AS count FROM quran_cache')) {
        return { count: tables.quran_cache.filter((item) => item.key !== 'quran_cache_bytes').length };
      }
      if (sql.includes('COALESCE(SUM(length(payload))')) {
        return {
          total: tables.quran_cache
            .filter((item) => item.key !== 'quran_cache_bytes')
            .reduce((sum, item) => sum + String(item.payload || '').length, 0),
          count: tables.quran_cache.filter((item) => item.key !== 'quran_cache_bytes').length,
        };
      }
      return null;
    },
    getAllSync(sql) {
      if (sql.includes('FROM missed_fasts')) return clone(tables.missed_fasts);
      if (sql.includes('FROM period_entries')) return clone(tables.period_entries);
      if (sql.includes('FROM nifas_entries')) return clone(tables.nifas_entries);
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
      if (sql.includes('DELETE FROM missed_fasts WHERE id = ?')) {
        tables.missed_fasts = tables.missed_fasts.filter((item) => item.id !== args[0]);
        return;
      }
      if (sql.includes('DELETE FROM period_entries')) {
        tables.period_entries = [];
        return;
      }
      if (sql.includes('DELETE FROM nifas_entries')) {
        tables.nifas_entries = [];
        return;
      }
    },
  };
  return {
    database,
    dump(table) {
      return clone(tables[table] || []);
    },
  };
}

function loadNativeDb(initialRows) {
  const native = createNativeDatabase(initialRows);
  const SQLite = { __esModule: true, openDatabaseSync: () => native.database };
  return {
    db: loadModule('src/lib/db.native.ts', { 'expo-sqlite': SQLite, './womenReason': loadClassifier() }),
    native,
  };
}

function loadClassifier() {
  return loadModule('src/lib/womenReason.ts', {});
}

function row(id, reason) {
  return {
    id,
    date: '2026-01-01',
    reason,
    made_up: 0,
    made_up_date: null,
    created_at: 1,
  };
}

// The database facades must use the complete privacy classifier for deletion,
// not the old three-substring approximation.
{
  const initialRows = WOMEN_REASONS.map((reason, index) => row(`women-${index}`, reason));
  initialRows.push(row('ordinary', 'Illness / Medical'));

  const native = loadNativeDb(initialRows);
  native.db.clearWomenData();
  assert.deepEqual(
    native.native.dump('missed_fasts').map((item) => item.id),
    ['ordinary'],
    'native clearWomenData must delete every authoritative women-specific reason',
  );

  const webRecords = new Map(
    initialRows.map((item) => [`fasting:missed:${item.id}`, JSON.stringify({
      id: item.id,
      date: item.date,
      reason: item.reason,
      madeUp: false,
      createdAt: item.created_at,
    })]),
  );
  const web = loadWebDb(webRecords);
  web.db.clearWomenData();
  assert.deepEqual(
    web.webKV.getAll('fasting:missed:').map((item) => JSON.parse(item.value).id),
    ['ordinary'],
    'web clearWomenData must delete every authoritative women-specific reason',
  );

  // A malformed raw row must not be hidden by loadMissedFasts()'s lossy parser.
  web.webKV.set('fasting:missed:malformed', '{not-json');
  assert.throws(
    () => web.db.clearWomenData(),
    /Failed to clear women data/,
    'web clearWomenData must fail closed when raw verification cannot parse a missed-fast row',
  );
}

console.log('DB women classifier regression: RED-capable native/web production-path checks passed');
