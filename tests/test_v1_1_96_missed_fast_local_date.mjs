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

function loadDateKey() {
  return loadCommonJsModule({
    root: ROOT,
    relativePath: 'src/lib/dateKey.ts',
    globals: { Date: FixedDate },
  });
}

function loadNative() {
  const updates = [];
  const database = {
    getFirstSync(sql) {
      if (sql.includes('PRAGMA user_version')) return { user_version: 2 };
      return null;
    },
    getAllSync() { return []; },
    execSync() {},
    runSync(sql, ...args) { updates.push({ sql, args }); },
    withTransactionSync(callback) { return callback(); },
  };
  return {
    db: loadCommonJsModule({
      root: ROOT,
      relativePath: 'src/lib/db.native.ts',
      modules: {
        'expo-sqlite': { __esModule: true, openDatabaseSync: () => database },
        './womenReason': { isWomenSpecificReason: () => false },
      },
      globals: { Date: FixedDate },
    }),
    updates,
  };
}

function loadWeb() {
  const records = new Map([
    ['fasting:missed:fast-1', JSON.stringify({
      id: 'fast-1', date: '2026-10-01', reason: 'travel', madeUp: false,
    })],
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
  return {
    db: loadCommonJsModule({
      root: ROOT,
      relativePath: 'src/lib/db.ts',
      modules: {
        './webStorage': { webKV },
        './womenReason': { isWomenSpecificReason: () => false },
      },
      globals: { Date: FixedDate },
    }),
    records,
  };
}

const expectedLocalDate = '2026-10-21';
const native = loadNative();
native.db.toggleMissedFastMadeUp('fast-1', true);
assert.equal(
  native.updates.at(-1).args[1],
  expectedLocalDate,
  'native missed-fast completion must persist the local calendar date',
);

const web = loadWeb();
web.db.toggleMissedFastMadeUp('fast-1', true);
const saved = JSON.parse(web.records.get('fasting:missed:fast-1'));
assert.equal(
  saved.madeUpDate,
  expectedLocalDate,
  'web missed-fast completion must persist the local calendar date',
);

console.log('v1.1.96 missed-fast local-date regression test passed');
