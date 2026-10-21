import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const FIXED_ISO = '2026-10-20T21:00:00.000Z';
process.env.TZ = 'Asia/Karachi';

const NativeDate = Date;
class FixedDate extends NativeDate {
  constructor(...args) {
    super(...(args.length === 0 ? [FIXED_ISO] : args));
  }

  static now() {
    return NativeDate.parse(FIXED_ISO);
  }
}

function loadRealDateKey() {
  return loadCommonJsModule({
    root: ROOT,
    relativePath: 'src/lib/dateKey.ts',
    globals: { Date: FixedDate },
  });
}

function loadNativeDb() {
  const rows = [
    { date: '2026-10-19', prayer: 'Fajr', completed: 1 },
    { date: '2026-10-20', prayer: 'Fajr', completed: 1 },
  ];
  const queries = [];
  const database = {
    getFirstSync(sql) {
      if (sql.includes('PRAGMA user_version')) return { user_version: 2 };
      return null;
    },
    getAllSync(sql, from) {
      if (sql.includes('FROM salah_entries')) {
        queries.push(from);
        return rows.filter((row) => row.date >= from);
      }
      return [];
    },
    execSync() {},
    runSync() {},
    withTransactionSync(callback) { return callback(); },
  };
  return {
    db: loadCommonJsModule({
      root: ROOT,
      relativePath: 'src/lib/db.native.ts',
      modules: {
        'expo-sqlite': { __esModule: true, openDatabaseSync: () => database },
        './womenReason': loadCommonJsModule({ root: ROOT, relativePath: 'src/lib/womenReason.ts' }),
      },
      globals: { Date: FixedDate },
    }),
    queries,
  };
}

function loadWebDb() {
  const records = new Map([
    ['salah:2026-10-19:Fajr', JSON.stringify({ completed: true })],
    ['salah:2026-10-20:Fajr', JSON.stringify({ completed: true })],
  ]);
  const webKV = {
    get(key) { return records.has(key) ? records.get(key) : null; },
    set(key, value) { records.set(key, value); },
    getAll(prefix) {
      return [...records.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({ key, value }));
    },
    delete(key) { records.delete(key); },
  };
  return loadCommonJsModule({
    root: ROOT,
    relativePath: 'src/lib/db.ts',
    modules: {
      './webStorage': { webKV },
      './womenReason': { isWomenSpecificReason: () => false },
    },
    globals: { Date: FixedDate },
  });
}

const expectedLocalKey = '2026-10-21';
const dateKey = loadRealDateKey();
assert.equal(
  typeof dateKey.getLocalDateKey,
  'function',
  'the shared production local-date helper must exist',
);
assert.equal(
  dateKey.getLocalDateKey(new FixedDate()),
  expectedLocalKey,
  'the shared helper must use the local calendar date when UTC and local dates differ',
);

const native = loadNativeDb();
const nativeHistory = native.db.getSalahHistory(1);
assert.equal(native.queries.at(-1), '2026-10-20', 'native Salah history must use the local cutoff date');
assert.ok(!nativeHistory['2026-10-19'], 'native history must exclude the prior local day');
assert.ok(nativeHistory['2026-10-20'], 'native history must retain the current local cutoff day');

const web = loadWebDb();
const webHistory = web.getSalahHistory(1);
assert.ok(!webHistory['2026-10-19'], 'web history must exclude the prior local day');
assert.ok(webHistory['2026-10-20'], 'web history must retain the current local cutoff day');

console.log('v1.1.96 DB local-date-key regression test passed');
