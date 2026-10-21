/**
 * F-19/F-40 data-safety regressions.
 *
 * The suites below transpile and execute the production db.native.ts and
 * backup.ts modules. The SQLite/React Native/storage dependencies are small
 * adapters only; migration, export, validation, and restore remain the real
 * production code.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { compileEsmProductionModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-data-safety-'));
const dbSource = fs.readFileSync(path.join(ROOT, 'src/lib/db.native.ts'), 'utf8');
const backupSource = fs.readFileSync(path.join(ROOT, 'src/lib/backup.ts'), 'utf8');

const sqliteState = {
  database: new DatabaseSync(':memory:'),
  failLegacyCopy: false,
  corruptVirtualPayloads: new Map(),
  destructiveStatements: [],
};

const sqliteAdapter = {
  openDatabaseSync() {
    const sqlite = sqliteState.database;
    const recordStatement = (sql) => {
      if (/\b(DELETE|DROP|TRUNCATE)\b/i.test(String(sql))) {
        sqliteState.destructiveStatements.push(String(sql));
      }
    };
    return {
      withTransactionSync(callback) {
        sqlite.exec('BEGIN');
        try {
          const result = callback();
          sqlite.exec('COMMIT');
          return result;
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      },
      execSync(sql) {
        recordStatement(sql);
        sqlite.exec(sql);
      },
      runSync(sql, ...args) {
        recordStatement(sql);
        if (
          sqliteState.failLegacyCopy &&
          /INSERT\s+OR\s+REPLACE\s+INTO\s+prayer_cache/i.test(sql) &&
          String(args[0]).startsWith('legacy:')
        ) {
          throw new Error('simulated legacy-copy failure');
        }
        return sqlite.prepare(sql).run(...args);
      },
      getFirstSync(sql, ...args) {
        if (
          /SELECT\s+payload\s+FROM\s+quran_cache/i.test(sql) &&
          sqliteState.corruptVirtualPayloads.has(args[0])
        ) {
          return { payload: sqliteState.corruptVirtualPayloads.get(args[0]) };
        }
        return sqlite.prepare(sql).get(...args) || null;
      },
      getAllSync(sql, ...args) {
        return sqlite.prepare(sql).all(...args);
      },
    };
  },
};

globalThis.__sqliteAdapter = sqliteAdapter;
globalThis.__platform = { OS: 'android' };

fs.writeFileSync(path.join(TMP, 'sqliteAdapter.mjs'), 'export default globalThis.__sqliteAdapter;');
fs.writeFileSync(path.join(TMP, 'rn.mjs'), 'export const Platform = globalThis.__platform;');
fs.writeFileSync(path.join(TMP, 'settings.mjs'), 'export const sanitizeSettings = (value) => value;');
fs.writeFileSync(path.join(TMP, 'webStorage.mjs'), `
  export const webKV = { get: () => null, set: () => {}, delete: () => {}, getAll: () => [] };
`);
fs.writeFileSync(path.join(TMP, 'asyncStorage.mjs'), `
  const store = new Map();
  export default {
    async getItem(key) { return store.get(key) ?? null; },
    async setItem(key, value) { store.set(key, value); },
    async removeItem(key) { store.delete(key); },
    async getAllKeys() { return [...store.keys()]; },
    async multiGet(keys) { return keys.map((key) => [key, store.get(key) ?? null]); },
    async multiSet(entries) { for (const [key, value] of entries) store.set(key, value); },
  };
`);

function compile(source, replacements, fileName, sourceRelativePath) {
  return compileEsmProductionModule({
    root: ROOT,
    tmpDir: TMP,
    sourceRelativePath,
    source,
    outputName: fileName,
    replacements,
  });
}

async function importDb(copyName) {
  const outputPath = compile(
    dbSource,
    [
      ["import * as SQLite from 'expo-sqlite';", "import SQLite from './sqliteAdapter.mjs';"],
    ],
    copyName,
    'src/lib/db.native.ts',
  );
  return import(outputPath);
}

const db = await importDb('db-native-primary.mjs');

function seedLegacyDatabase() {
  const sqlite = sqliteState.database;
  sqlite.exec(`
    CREATE TABLE prayer_cache (
      date TEXT PRIMARY KEY,
      location TEXT,
      method INTEGER,
      payload TEXT,
      cached_at INTEGER
    );
    CREATE TABLE salah_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      prayer TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      UNIQUE(date, prayer)
    );
    INSERT INTO prayer_cache (date, location, method, payload, cached_at)
      VALUES ('2026-10-20', 'Legacy City', 2, '{"fajr":"05:10"}', 123);
    INSERT INTO salah_entries (date, prayer, completed, completed_at)
      VALUES ('2026-10-20', 'Fajr', 1, 456);
  `);
}

function resetDatabase() {
  sqliteState.database.close();
  sqliteState.database = new DatabaseSync(':memory:');
  sqliteState.failLegacyCopy = false;
  sqliteState.corruptVirtualPayloads.clear();
  sqliteState.destructiveStatements.length = 0;
}

console.log('=== F-19: VERSIONED, NON-DESTRUCTIVE MIGRATIONS ===');

// RED-capable fixture: an old v0 database contains both cache data and user data.
resetDatabase();
seedLegacyDatabase();
const preservedCache = db.loadPrayerCache('2026-10-20', 'Legacy City', 2);
assert.ok(preservedCache, 'legacy prayer cache must survive migration');
assert.deepEqual(JSON.parse(preservedCache.payload), { fajr: '05:10' });
assert.deepEqual(
  sqliteState.database.prepare('SELECT date, prayer, completed FROM salah_entries').all().map((row) => ({ ...row })),
  [{ date: '2026-10-20', prayer: 'Fajr', completed: 1 }],
  'pre-existing user rows must survive migration',
);
assert.equal(sqliteState.database.prepare('PRAGMA user_version').get().user_version, 2);
console.log('  ✓ legacy prayer cache, user row, and schema version survive migration');

// Re-importing the real module runs migration again against the same database.
const dbSecondOpen = await importDb('db-native-second-open.mjs');
assert.ok(dbSecondOpen.loadPrayerCache('2026-10-20', 'Legacy City', 2));
assert.equal(sqliteState.database.prepare('PRAGMA user_version').get().user_version, 2);
assert.equal(
  sqliteState.database.prepare('SELECT COUNT(*) AS count FROM salah_entries').get().count,
  1,
  'repeated migration must not duplicate or delete user rows',
);
console.log('  ✓ repeated migration is idempotent');

// A failed copy must roll back the migration transaction and leave the old
// schema/data available for a retry. The production module must also clear its
// cached handle after the failed migration so the retry actually re-enters it.
resetDatabase();
seedLegacyDatabase();
const dbFailureProbe = await importDb('db-native-failure-probe.mjs');
sqliteState.failLegacyCopy = true;
const originalWarn = console.warn;
console.warn = () => {};
try {
  assert.equal(
    dbFailureProbe.savePrayerCache('2026-10-21', 'Legacy City', 2, { fajr: '05:11' }),
    false,
    'a migration failure must be surfaced as a failed database operation',
  );
} finally {
  console.warn = originalWarn;
}
assert.equal(
  sqliteState.database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'prayer_cache'").get().name,
  'prayer_cache',
  'failed migration must retain the original table name',
);
assert.equal(
  sqliteState.database.prepare('SELECT payload FROM prayer_cache').get().payload,
  '{"fajr":"05:10"}',
  'failed migration must retain the original cache row',
);
assert.equal(
  sqliteState.database.prepare('SELECT COUNT(*) AS count FROM salah_entries').get().count,
  1,
  'failed migration must retain the user row',
);
sqliteState.failLegacyCopy = false;
assert.ok(dbFailureProbe.loadPrayerCache('2026-10-20', 'Legacy City', 2));
assert.equal(sqliteState.database.prepare('PRAGMA user_version').get().user_version, 2);
console.log('  ✓ failed migration rolls back and can be retried without data loss');

console.log('=== F-40: SENSITIVE EXPORT OPT-IN AND PRE-DESTRUCTIVE LIMITS ===');

const backupPath = compile(
  backupSource,
  [
    ["import { Platform } from 'react-native';", "import { Platform } from './rn.mjs';"],
    ["import AsyncStorage from '@react-native-async-storage/async-storage';", "import AsyncStorage from './asyncStorage.mjs';"],
    ["import * as SQLite from 'expo-sqlite';", "import SQLite from './sqliteAdapter.mjs';"],
    ["import * as db from './db';", "import * as db from './db-native-failure-probe.mjs';"],
    ["import { sanitizeSettings } from './settings';", "import { sanitizeSettings } from './settings.mjs';"],
    ["import { webKV } from './webStorage';", "import { webKV } from './webStorage.mjs';"],
  ],
  'backup.mjs',
  'src/lib/backup.ts',
);
const backup = await import(backupPath);

// The migration above created the user schema. Add sensitive rows directly to
// the fixture so the export path is exercised with real SQLite data.
sqliteState.database.exec(`
  INSERT INTO period_entries (id, start_date, end_date, notes, purity_days, created_at)
    VALUES ('period-sensitive', '2026-10-01', '2026-10-06', 'private cycle note', '[2,3]', 99);
  INSERT INTO nifas_entries (id, start_date, end_date, notes, created_at)
    VALUES ('nifas-sensitive', '2026-10-07', NULL, 'private postnatal note', 100);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('missed-sensitive', '2026-10-08', 'Menstruation', 0, NULL, 101);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('missed-period', '2026-10-11', 'Period', 0, NULL, 103);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('missed-haidh', '2026-10-12', 'Haidh', 0, NULL, 104);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('missed-menses', '2026-10-13', 'Menses', 0, NULL, 105);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('missed-arabic', '2026-10-14', 'الحيض', 0, NULL, 106);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('missed-ordinary', '2026-10-09', 'Travel', 0, NULL, 102);
`);

const defaultExport = await backup.buildBackupPayload();
const optedInExport = await backup.buildBackupPayload({ includeSensitiveWomenData: true });

const countSensitiveRows = () => ({
  period: sqliteState.database.prepare('SELECT COUNT(*) AS count FROM period_entries').get().count,
  nifas: sqliteState.database.prepare('SELECT COUNT(*) AS count FROM nifas_entries').get().count,
  missed: sqliteState.database.prepare('SELECT COUNT(*) AS count FROM missed_fasts').get().count,
});
const beforeRoundTrip = countSensitiveRows();
sqliteState.destructiveStatements.length = 0;
await backup.applyRestore(defaultExport);
const afterRoundTrip = countSensitiveRows();
console.log(`  round-trip counts before=${JSON.stringify(beforeRoundTrip)} after=${JSON.stringify(afterRoundTrip)}`);
assert.deepEqual(
  afterRoundTrip,
  beforeRoundTrip,
  'default export -> restore on the same device must preserve sensitive rows',
);
assert.ok(
  sqliteState.destructiveStatements.some((sql) => /\bDELETE\b/i.test(sql)),
  'a valid restore must still record destructive statements issued through the production path',
);
assert.equal(
  sqliteState.destructiveStatements.some((sql) => /DELETE\s+FROM\s+period_entries/i.test(sql)),
  false,
  'omitted period_entries must not be wiped during restore',
);
assert.equal(
  sqliteState.destructiveStatements.some((sql) => /DELETE\s+FROM\s+nifas_entries/i.test(sql)),
  false,
  'omitted nifas_entries must not be wiped during restore',
);
assert.equal(
  sqliteState.destructiveStatements.some((sql) => /DELETE\s+FROM\s+missed_fasts/i.test(sql)),
  false,
  'omitted missed_fasts must not be wiped during restore',
);
assert.equal(defaultExport.data.tables.period_entries, undefined);
assert.equal(defaultExport.data.tables.nifas_entries, undefined);
assert.equal(defaultExport.data.tables.missed_fasts, undefined);

assert.equal(optedInExport.data.tables.period_entries.length, 1);
assert.equal(optedInExport.data.tables.nifas_entries.length, 1);
assert.equal(optedInExport.data.tables.missed_fasts.length, 6);
assert.deepEqual(
  optedInExport.data.tables.missed_fasts.map((row) => row.id),
  ['missed-sensitive', 'missed-period', 'missed-haidh', 'missed-menses', 'missed-arabic', 'missed-ordinary'],
);
assert.equal(backup.backupIncludesSensitiveWomenData(optedInExport), true);
assert.equal(backup.backupIncludesSensitiveWomenData(defaultExport), false);
console.log('  ✓ cycle/nifas rows are excluded by default and included only by explicit opt-in');

function replaceMissedFastRows(rows) {
  sqliteState.database.exec('DELETE FROM missed_fasts');
  const insert = sqliteState.database.prepare(
    'INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at) VALUES (?, ?, ?, 0, NULL, ?)'
  );
  for (const [index, row] of rows.entries()) {
    insert.run(row.id, `2026-11-${String(index + 1).padStart(2, '0')}`, row.reason, 200 + index);
  }
}

for (const [id, reason] of [
  ['reason-period', 'Period'],
  ['reason-haidh', 'Haidh'],
  ['reason-menses', 'Menses'],
  ['reason-arabic', 'الحيض'],
]) {
  replaceMissedFastRows([
    { id, reason },
    { id: `${id}-ordinary`, reason: 'Travel' },
  ]);
  const payload = await backup.buildBackupPayload();
  assert.equal(
    payload.data.tables.missed_fasts,
    undefined,
    `default export must omit missed_fasts when the reason ${reason} is sensitive`,
  );
}
replaceMissedFastRows([
  { id: 'missed-sensitive', reason: 'Menstruation' },
  { id: 'missed-period', reason: 'Period' },
  { id: 'missed-haidh', reason: 'Haidh' },
  { id: 'missed-menses', reason: 'Menses' },
  { id: 'missed-arabic', reason: 'الحيض' },
  { id: 'missed-ordinary', reason: 'Travel' },
]);
console.log('  ✓ Period, Haidh, Menses, and Arabic الحيض reasons are excluded from default export');

// Execute the web facade too. The sensitive-data policy must match the native
// export even though db.ts stores rows in webKV instead of SQLite.
globalThis.__webMap = new Map([
  ['women:period:web-sensitive', JSON.stringify({ id: 'web-sensitive', startDate: '2026-10-01', endDate: null, notes: 'private' })],
  ['women:nifas:web-sensitive', JSON.stringify({ id: 'web-nifas', startDate: '2026-10-07', endDate: null, notes: 'private' })],
  ['fasting:missed:web-sensitive', JSON.stringify({ id: 'web-missed-sensitive', date: '2026-10-08', reason: 'post-natal', madeUp: false })],
  ['fasting:missed:web-ordinary', JSON.stringify({ id: 'web-missed-ordinary', date: '2026-10-09', reason: 'Travel', madeUp: false })],
]);
globalThis.__webVirtualOverrides = new Map();
globalThis.__webDeleted = [];
fs.writeFileSync(path.join(TMP, 'webStorageWeb.mjs'), `
  const map = globalThis.__webMap;
  export const webKV = {
    get: (key) => globalThis.__webVirtualOverrides?.has(key)
      ? globalThis.__webVirtualOverrides.get(key)
      : (map.get(key) ?? null),
    set: (key, value) => map.set(key, value),
    delete: (key) => { globalThis.__webDeleted.push(key); return map.delete(key); },
    getAll: (prefix) => [...map.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, value })),
  };
`);
const webDbPath = compile(
  fs.readFileSync(path.join(ROOT, 'src/lib/db.ts'), 'utf8'),
  [
    ["import { webKV } from './webStorage';", "import { webKV } from './webStorageWeb.mjs';"],
  ],
  'db-web.mjs',
  'src/lib/db.ts',
);
await import(webDbPath);
globalThis.__platform.OS = 'web';
const webBackupPath = compile(
  backupSource,
  [
    ["import { Platform } from 'react-native';", "import { Platform } from './rn.mjs';"],
    ["import AsyncStorage from '@react-native-async-storage/async-storage';", "import AsyncStorage from './asyncStorage.mjs';"],
    ["import * as SQLite from 'expo-sqlite';", "import SQLite from './sqliteAdapter.mjs';"],
    ["import * as db from './db';", "import * as db from './db-web.mjs';"],
    ["import { sanitizeSettings } from './settings';", "import { sanitizeSettings } from './settings.mjs';"],
    ["import { webKV } from './webStorage';", "import { webKV } from './webStorageWeb.mjs';"],
  ],
  'backup-web.mjs',
  'src/lib/backup.ts',
);
const webBackup = await import(webBackupPath);
const webDefaultExport = await webBackup.buildBackupPayload();
const webOptedInExport = await webBackup.buildBackupPayload({ includeSensitiveWomenData: true });
assert.equal(webDefaultExport.data.tables.period_entries, undefined);
assert.equal(webDefaultExport.data.tables.nifas_entries, undefined);
assert.equal(webDefaultExport.data.tables.missed_fasts, undefined);
assert.equal(webOptedInExport.data.tables.period_entries.length, 1);
assert.equal(webOptedInExport.data.tables.nifas_entries.length, 1);
assert.equal(webOptedInExport.data.tables.missed_fasts.length, 2);
assert.deepEqual(webOptedInExport.data.tables.missed_fasts.map((row) => row.id), ['web-missed-sensitive', 'web-missed-ordinary']);
globalThis.__webDeleted.length = 0;
await webBackup.applyRestore(webDefaultExport);
assert.equal(globalThis.__webMap.has('women:period:web-sensitive'), true);
assert.equal(globalThis.__webMap.has('women:nifas:web-sensitive'), true);
assert.equal(globalThis.__webMap.has('fasting:missed:web-sensitive'), true);
assert.equal(
  globalThis.__webDeleted.some((key) => key.startsWith('women:period:') || key.startsWith('women:nifas:') || key.startsWith('fasting:missed:')),
  false,
  'web restore must not delete omitted sensitive tables',
);
console.log('  ✓ web cycle/nifas rows follow the same default-exclude/explicit-opt-in policy');

const webBookmarks = [{ surah: 2, ayah: 255, label: 'Ayat al-Kursi' }];
globalThis.__webMap.set('quran:bookmarks', JSON.stringify(webBookmarks));
globalThis.__webVirtualOverrides.set('quran:bookmarks', '{"broken": not json');
const webUnreadableVirtualExport = await webBackup.buildBackupPayload();
assert.equal(webUnreadableVirtualExport.data.tables.bookmarks, undefined);
globalThis.__webVirtualOverrides.clear();
await webBackup.applyRestore(webUnreadableVirtualExport);
assert.equal(globalThis.__webMap.get('quran:bookmarks'), JSON.stringify(webBookmarks));
console.log('  ✓ web unreadable virtual blob is omitted and bookmarks survive restore');
globalThis.__platform.OS = 'android';

const validBase = {
  app: 'islamic',
  formatVersion: 1,
  exportedAt: '2026-10-20T00:00:00.000Z',
  appVersion: '1.1.93',
  data: {
    tables: {
      salah_entries: [{ date: '2026-10-20', prayer: 'Fajr', completed: 1 }],
    },
    storage: {},
  },
};

// Restore compatibility: [] was the old exporter's marker for withheld
// sensitive tables. It must not wipe the existing cycle, postnatal, or
// sensitive missed-fast rows.
sqliteState.database.exec(`
  DELETE FROM period_entries;
  DELETE FROM nifas_entries;
  DELETE FROM missed_fasts;
  INSERT INTO period_entries (id, start_date, end_date, notes, purity_days, created_at)
    VALUES ('withheld-period', '2026-10-01', NULL, 'private', '[2]', 1);
  INSERT INTO nifas_entries (id, start_date, end_date, notes, created_at)
    VALUES ('withheld-nifas', '2026-10-02', NULL, 'private', 2);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('withheld-missed', '2026-10-03', 'Menstruation', 0, NULL, 3);
`);
sqliteState.destructiveStatements.length = 0;
await backup.applyRestore({
  ...validBase,
  data: { tables: { period_entries: [], nifas_entries: [], missed_fasts: [] }, storage: {} },
});
assert.deepEqual(
  countSensitiveRows(),
  { period: 1, nifas: 1, missed: 1 },
  'empty withheld sensitive tables must preserve existing rows',
);
assert.equal(
  sqliteState.destructiveStatements.some((sql) => /DELETE\s+FROM\s+(period_entries|nifas_entries|missed_fasts)/i.test(sql)),
  false,
  'empty withheld sensitive tables must not issue destructive deletes',
);
console.log('  ✓ old empty-array markers preserve withheld sensitive tables during restore');

// The previous exporter could also carry only the non-sensitive subset of
// missed_fasts. That subset must not delete sensitive rows on restore.
sqliteState.database.exec(`
  DELETE FROM period_entries;
  DELETE FROM nifas_entries;
  DELETE FROM missed_fasts;
  INSERT INTO period_entries (id, start_date, end_date, notes, purity_days, created_at)
    VALUES ('filtered-period', '2026-10-04', NULL, 'private', '[4]', 4);
  INSERT INTO nifas_entries (id, start_date, end_date, notes, created_at)
    VALUES ('filtered-nifas', '2026-10-05', NULL, 'private', 5);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('filtered-sensitive', '2026-10-06', 'Period', 0, NULL, 6);
  INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
    VALUES ('filtered-ordinary-old', '2026-10-07', 'Travel', 0, NULL, 7);
`);
await backup.applyRestore({
  ...validBase,
  data: {
    tables: {
      period_entries: [],
      nifas_entries: [],
      missed_fasts: [{ id: 'filtered-ordinary', date: '2026-10-08', reason: 'Travel', made_up: 0, made_up_date: null, created_at: 8 }],
    },
    storage: {},
  },
});
assert.deepEqual(
  countSensitiveRows(),
  { period: 1, nifas: 1, missed: 2 },
  'filtered legacy missed-fasts data must preserve sensitive rows while replacing ordinary rows',
);
assert.deepEqual(
  sqliteState.database.prepare('SELECT id FROM missed_fasts ORDER BY id').all().map((row) => row.id),
  ['filtered-ordinary', 'filtered-sensitive'],
);
console.log('  ✓ filtered legacy missed-fasts data preserves sensitive rows');

// Export compatibility: a failed virtual-table read must be omitted rather
// than converted into an empty replacement. The adapter injects the unreadable
// value only at the exporter read boundary; the underlying seeded bookmark
// remains the real device data that restore must preserve.
const originalBookmarks = [{ surah: 2, ayah: 255, label: 'Ayat al-Kursi' }];
sqliteState.database.prepare(
  `INSERT OR REPLACE INTO quran_cache (key, payload, cached_at) VALUES ('bookmarks', ?, 10)`,
).run(JSON.stringify(originalBookmarks));
sqliteState.corruptVirtualPayloads.set('bookmarks', '{"broken": not json');
const unreadableVirtualExport = await backup.buildBackupPayload();
assert.equal(
  unreadableVirtualExport.data.tables.bookmarks,
  undefined,
  'an unreadable virtual blob must be omitted from the backup',
);
sqliteState.corruptVirtualPayloads.clear();
await backup.applyRestore(unreadableVirtualExport);
assert.deepEqual(
  JSON.parse(sqliteState.database.prepare("SELECT payload FROM quran_cache WHERE key = 'bookmarks'").get().payload),
  originalBookmarks,
  'restoring an export with an unreadable virtual blob must preserve existing bookmarks',
);
console.log('  ✓ unreadable virtual blob is omitted and existing bookmarks survive restore');

// An intentionally stored empty list remains meaningful and must still
// round-trip as empty.
sqliteState.database.prepare(
  `UPDATE quran_cache SET payload = '[]' WHERE key = 'bookmarks'`,
).run();
const emptyBookmarksExport = await backup.buildBackupPayload();
assert.deepEqual(emptyBookmarksExport.data.tables.bookmarks, []);
await backup.applyRestore(emptyBookmarksExport);
assert.equal(
  sqliteState.database.prepare("SELECT payload FROM quran_cache WHERE key = 'bookmarks'").get().payload,
  '[]',
  'a genuinely empty bookmark list must remain an intentional clear operation',
);
console.log('  ✓ genuine empty virtual lists still round-trip as empty');

assert.throws(
  () => backup.assertBackupSize(backup.MAX_BACKUP_BYTES + 1),
  /exceeds the maximum allowed size/,
  'the file-size guard must reject before content is read',
);

const oversized = {
  ...validBase,
  data: {
    ...validBase.data,
    storage: { 'quran-large-fixture': 'x'.repeat(backup.MAX_BACKUP_BYTES + 1) },
  },
};
sqliteState.destructiveStatements.length = 0;
await assert.rejects(() => backup.applyRestore(oversized), /exceeds the maximum allowed size/);
assert.equal(
  sqliteState.destructiveStatements.length,
  0,
  'oversized restore must be rejected before DELETE starts',
);

const malformed = {
  ...validBase,
  data: {
    ...validBase.data,
    tables: { salah_entries: [null] },
  },
};
sqliteState.destructiveStatements.length = 0;
await assert.rejects(() => backup.applyRestore(malformed), /expected object/);
assert.equal(
  sqliteState.destructiveStatements.length,
  0,
  'malformed restore must be rejected before DELETE starts',
);
console.log('  ✓ oversized and malformed restores stop before destructive statements');

// Execute the real BackupRestoreScreen handler as well: native file metadata
// must be checked before readAsStringAsync, so a too-large file never reaches
// JSON.parse/applyRestore or any destructive SQLite statement.
globalThis.__screenState = {
  readCalled: false,
  alerts: [],
};
fs.writeFileSync(path.join(TMP, 'react.mjs'), `
  export const useState = (initial) => [typeof initial === 'function' ? initial() : initial, () => {}];
  export const createElement = (type, props, ...children) => ({ type, props: { ...(props || {}), children } });
  export default { useState, createElement };
`);
fs.writeFileSync(path.join(TMP, 'rn-ui.mjs'), `
  export const View = 'View';
  export const Pressable = 'Pressable';
  export const StyleSheet = { create: (styles) => styles, absoluteFill: {}, hairlineWidth: 1 };
  export const Alert = { alert: (...args) => globalThis.__screenState.alerts.push(args) };
  export const Platform = { OS: 'android' };
`);
fs.writeFileSync(path.join(TMP, 'icon.mjs'), 'export const Ionicons = \'Ionicons\';');
fs.writeFileSync(path.join(TMP, 'linear.mjs'), 'export const LinearGradient = \'LinearGradient\';');
fs.writeFileSync(path.join(TMP, 'sharing.mjs'), 'export const isAvailableAsync = async () => false; export const shareAsync = async () => {};');
fs.writeFileSync(path.join(TMP, 'documentPicker.mjs'), `
  export const getDocumentAsync = async () => ({ canceled: false, assets: [{ uri: 'oversized.json' }] });
`);
fs.writeFileSync(path.join(TMP, 'fileSystem.mjs'), `
  export const cacheDirectory = '/cache/';
  export const documentDirectory = '/documents/';
  export const getInfoAsync = async () => ({ exists: true, size: globalThis.__screenFileSize ?? globalThis.__oversizedBytes });
  export const readAsStringAsync = async () => {
    globalThis.__screenState.readCalled = true;
    if (globalThis.__screenFileText === undefined) {
      throw new Error('readAsStringAsync must not run for an oversized file');
    }
    return globalThis.__screenFileText;
  };
  export const makeDirectoryAsync = async () => {};
  export const writeAsStringAsync = async () => {};
`);
fs.writeFileSync(path.join(TMP, 'translation.mjs'), 'export const useTranslation = () => ({ t: (key) => key });');
fs.writeFileSync(path.join(TMP, 'tokens.mjs'), `export const useThemeTokens = () => ({ tokens: { bgGradient: [], ringFill: '', accent: '', muted: '', danger: '', success: '' } });`);
fs.writeFileSync(path.join(TMP, 'layout.mjs'), `
  export const SubHeader = 'SubHeader';
  export const DetailScreen = Object.assign('DetailScreen', { ScrollView: 'ScrollView' });
`);
fs.writeFileSync(path.join(TMP, 'ui.mjs'), `
  export const AppText = 'AppText';
  export const PremiumCard = 'PremiumCard';
  export const PrimaryButton = 'PrimaryButton';
  export const Chip = 'Chip';
`);

globalThis.__oversizedBytes = backup.MAX_BACKUP_BYTES + 1;
const screenPath = compile(
  fs.readFileSync(path.join(ROOT, 'src/screens/BackupRestoreScreen.tsx'), 'utf8'),
  [
    ["from 'react'", "from './react.mjs'"],
    ["from 'react-native'", "from './rn-ui.mjs'"],
    ["from '../components/ui/AppText'", "from './ui.mjs'"],
    ["from '@expo/vector-icons'", "from './icon.mjs'"],
    ["from 'expo-linear-gradient'", "from './linear.mjs'"],
    ["from 'expo-sharing'", "from './sharing.mjs'"],
    ["from 'expo-document-picker'", "from './documentPicker.mjs'"],
    ["from 'expo-file-system/legacy'", "from './fileSystem.mjs'"],
    ["from 'react-i18next'", "from './translation.mjs'"],
    ["from '../theme/tokens'", "from './tokens.mjs'"],
    ["from '../components/layout/SubHeader'", "from './layout.mjs'"],
    ["from '../components/layout/DetailScreen'", "from './layout.mjs'"],
    ["from '../components/ui'", "from './ui.mjs'"],
    ["from '../lib/backup'", "from './backup.mjs'"],
  ],
  'backup-restore-screen.mjs',
  'src/screens/BackupRestoreScreen.tsx',
);
const screenModule = await import(screenPath);
const screenTree = screenModule.BackupRestoreScreen({ onBack: () => {} });
const pending = [screenTree];
let restoreButton = null;
while (pending.length > 0) {
  const node = pending.pop();
  if (!node || typeof node !== 'object') continue;
  if (node.type === 'PrimaryButton' && node.props?.title === 'Choose backup file') {
    restoreButton = node;
    break;
  }
  const children = node.props?.children;
  if (Array.isArray(children)) pending.push(...children);
  else if (children) pending.push(children);
}
assert.ok(restoreButton, 'real screen must render the restore action');
await restoreButton.props.onPress();
assert.equal(globalThis.__screenState.readCalled, false, 'screen must stat before reading an oversized file');
assert.equal(globalThis.__screenState.alerts.length, 1, 'screen must surface the size rejection');
assert.match(String(globalThis.__screenState.alerts[0][1]), /exceeds the maximum allowed size/);
assert.equal(sqliteState.destructiveStatements.length, 0, 'screen size rejection must precede destructive restore work');
console.log('  ✓ real restore screen rejects oversized files before reading or destroying data');

globalThis.__screenState = { readCalled: false, alerts: [] };
globalThis.__screenFileText = JSON.stringify({ ...validBase, appVersion: '1.0.0' });
globalThis.__screenFileSize = Buffer.byteLength(globalThis.__screenFileText, 'utf8');
const warningTree = screenModule.BackupRestoreScreen({ onBack: () => {} });
const warningPending = [warningTree];
let warningRestoreButton = null;
while (warningPending.length > 0) {
  const node = warningPending.pop();
  if (!node || typeof node !== 'object') continue;
  if (node.type === 'PrimaryButton' && node.props?.title === 'Choose backup file') {
    warningRestoreButton = node;
    break;
  }
  const children = node.props?.children;
  if (Array.isArray(children)) warningPending.push(...children);
  else if (children) warningPending.push(children);
}
assert.ok(warningRestoreButton, 'real screen must render the restore action for a valid file');
await warningRestoreButton.props.onPress();
assert.equal(globalThis.__screenState.alerts.length, 1, 'valid omitted-data backup must reach confirmation');
assert.match(
  String(globalThis.__screenState.alerts[0][1]),
  /omits Women's Worship data|leave existing .*unchanged/i,
  'restore confirmation must explain omitted sensitive data and preservation behavior',
);
console.log('  ✓ restore confirmation warns when sensitive tables are omitted');

console.log('=== F-19/F-40 RED/GREEN REGRESSION SUITE COMPLETE ===');
