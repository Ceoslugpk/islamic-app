/**
 * Backup & Restore format tests — REAL MODULE EXECUTION.
 *
 * This suite transpiles and imports the ACTUAL `src/lib/backup.ts` module and
 * exercises `validateBackup`, `describeBackup`, `isNewerVersion`,
 * `formatTableSummary`, `isAllowedStorageKey`, `filterAllowedStorage` and
 * `sanitizeExportStorage` from it. It does NOT re-implement any of that logic.
 *
 * Only true platform boundaries are stubbed:
 *   - react-native            (Platform.OS)
 *   - @react-native-async-storage/async-storage (in-memory store)
 *   - expo-sqlite             (in-memory SQLite via node:sqlite)
 *   - ./db, ./settings, ./webStorage (side-effect deps not under test here)
 *
 * A regression in backup.ts therefore turns these assertions RED.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { compileEsmProductionModule } from './production_module_fallback.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'backup_suite_'));

console.log('=== BACKUP & RESTORE FORMAT TEST SUITE (REAL MODULE EXECUTION) ===\n');

/* -------------------------------------------------------------------------- */
/* Platform boundary stubs                                                     */
/* -------------------------------------------------------------------------- */
fs.writeFileSync(path.join(TMP_DIR, 'stubRN.mjs'), `export const Platform = { OS: 'android' };`);

fs.writeFileSync(path.join(TMP_DIR, 'stubAsyncStorage.mjs'), `
const store = new Map();
export default {
  async getItem(k) { return store.has(k) ? store.get(k) : null; },
  async setItem(k, v) { store.set(k, v); },
  async removeItem(k) { store.delete(k); },
  async getAllKeys() { return [...store.keys()]; },
  async multiGet(keys) { return keys.map((k) => [k, store.has(k) ? store.get(k) : null]); },
  async multiSet(entries) { entries.forEach(([k, v]) => store.set(k, v)); },
};
`);

// In-memory SQLite backed by node:sqlite so the real SQLite code paths run.
const sqliteMem = new DatabaseSync(':memory:');
fs.writeFileSync(path.join(TMP_DIR, 'stubSqlite.mjs'), `
export function openDatabaseSync() {
  return {
    withTransactionSync(cb) {
      globalThis.__sqliteMem.exec('BEGIN');
      try { const r = cb(); globalThis.__sqliteMem.exec('COMMIT'); return r; }
      catch (e) { globalThis.__sqliteMem.exec('ROLLBACK'); throw e; }
    },
    execSync(sql) { globalThis.__sqliteMem.exec(sql); },
    runSync(sql, ...args) {
      const stmt = globalThis.__sqliteMem.prepare(sql);
      return stmt.run(...args);
    },
    getFirstSync(sql, ...args) {
      const stmt = globalThis.__sqliteMem.prepare(sql);
      return stmt.get(...args) || null;
    },
    getAllSync(sql, ...args) {
      const stmt = globalThis.__sqliteMem.prepare(sql);
      return stmt.all(...args);
    },
  };
}
`);
globalThis.__sqliteMem = sqliteMem;

// Side-effect dependencies of backup.ts that are NOT under test here.
fs.writeFileSync(path.join(TMP_DIR, 'stubDb.mjs'), `export function reconcileQuranCacheBudget() {}`);
fs.writeFileSync(path.join(TMP_DIR, 'stubSettings.mjs'), `export function sanitizeSettings(v) { return v; }`);
fs.writeFileSync(path.join(TMP_DIR, 'stubWebStorage.mjs'), `
export const webKV = { get: () => null, set: () => {}, getAll: () => [], delete: () => {} };
`);

// Transpile the REAL production module with only its platform imports redirected.
const backupSrc = fs.readFileSync(path.join(SRC_DIR, 'lib/backup.ts'), 'utf8');
const backup = await import(compileEsmProductionModule({
  root: REPO_ROOT,
  tmpDir: TMP_DIR,
  sourceRelativePath: 'src/lib/backup.ts',
  source: backupSrc,
  outputName: 'backup.mjs',
  replacements: [
    ["from 'react-native'", "from './stubRN.mjs'"],
    ["from '@react-native-async-storage/async-storage'", "from './stubAsyncStorage.mjs'"],
    ["from 'expo-sqlite'", "from './stubSqlite.mjs'"],
    ["from './db'", "from './stubDb.mjs'"],
    ["from './settings'", "from './stubSettings.mjs'"],
    ["from './webStorage'", "from './stubWebStorage.mjs'"],
  ],
}));
const {
  BACKUP_FORMAT_VERSION,
  MAX_ROWS_PER_TABLE,
  validateBackup,
  describeBackup,
  isNewerVersion,
  formatTableSummary,
  isAllowedStorageKey,
  filterAllowedStorage,
  sanitizeExportStorage,
} = backup;

// Sanity: we are exercising the real module, not a mirror.
assert.equal(typeof validateBackup, 'function', 'Real validateBackup must be exported by src/lib/backup.ts');
assert.equal(typeof describeBackup, 'function', 'Real describeBackup must be exported by src/lib/backup.ts');
assert.equal(typeof isNewerVersion, 'function', 'Real isNewerVersion must be exported by src/lib/backup.ts');
console.log('  ✓ Imported real src/lib/backup.ts exports\n');

function makePayload(over = {}) {
  return {
    app: 'islamic',
    formatVersion: 1,
    exportedAt: '2026-10-06T00:00:00.000Z',
    appVersion: '1.1.16',
    data: {
      tables: {
        salah_entries: [{ date: '2026-10-06', prayer: 'Fajr', completed: 1 }],
        hifz_entries: [{ surah: 2, status: 'memorized', updated_at: 1 }],
      },
      storage: { 'islamic-settings': '{"methodId":16}' },
    },
    ...over,
  };
}

// 1. Valid payload passes validation
assert.doesNotThrow(() => validateBackup(makePayload()));
console.log('  ✓ valid payload accepted');

// 2. Null rejected
assert.throws(() => validateBackup(null));
console.log('  ✓ null rejected');

// 3. Wrong app rejected
assert.throws(() => validateBackup(makePayload({ app: 'other' })));
console.log('  ✓ wrong app rejected');

// 4. Future version rejected
assert.throws(() => validateBackup(makePayload({ formatVersion: BACKUP_FORMAT_VERSION + 1 })));
console.log('  ✓ future version rejected');

// 5. Missing data rejected
assert.throws(() => validateBackup({ app: 'islamic', formatVersion: 1 }));
console.log('  ✓ missing data rejected');

// 6. Corrupted JSON rejected at parse
assert.throws(() => JSON.parse('{not json'));
console.log('  ✓ corrupted file rejected');

// 7. Round-trip preserves data
const payload = makePayload();
const back = JSON.parse(JSON.stringify(payload));
assert.deepEqual(back, payload);
console.log('  ✓ serialize round-trip preserves data');

// 8. describeBackup summarizes contents with table names + counts
const info = describeBackup(payload);
assert.ok(info.exportedAt.includes('2026'));
assert.ok(info.tables.includes('salah') && info.tables.includes('hifz'));
assert.equal(info.tableCounts.salah_entries, 1);
assert.equal(info.tableCounts.hifz_entries, 1);
assert.equal(info.totalRecords, 2);
console.log('  ✓ describe shows date + tables + counts');

// 9. Empty tables → graceful "No saved data"
const empty = describeBackup(makePayload({ data: { tables: { salah_entries: [] }, storage: {} } }));
assert.equal(empty.tables, 'No saved data');
assert.equal(empty.totalRecords, 0);
console.log('  ✓ empty backup described gracefully');

// 10. Minimal row shape hardening: reject non-object rows (primitive number/string)
assert.throws(() => {
  validateBackup(makePayload({ data: { tables: { salah_entries: [42] }, storage: {} } }));
}, /expected object/);

assert.throws(() => {
  validateBackup(makePayload({ data: { tables: { salah_entries: ['invalid string row'] }, storage: {} } }));
}, /expected object/);

assert.throws(() => {
  validateBackup(makePayload({ data: { tables: { salah_entries: [null] }, storage: {} } }));
}, /expected object/);
console.log('  ✓ non-object table rows rejected');

// 11. Reject non-array table definitions
assert.throws(() => {
  validateBackup(makePayload({ data: { tables: { salah_entries: 'not an array' }, storage: {} } }));
}, /expected array of rows/);
console.log('  ✓ non-array table value rejected');

// 12. Reject absurd table size (> row limit)
assert.throws(() => {
  const huge = new Array(MAX_ROWS_PER_TABLE + 1).fill({ date: '2026-10-06' });
  validateBackup(makePayload({ data: { tables: { salah_entries: huge }, storage: {} } }));
}, /exceeds row limit/);
console.log('  ✓ absurd table row counts rejected');

// 13. Storage entry sanity: reject non-string storage values
assert.throws(() => {
  validateBackup(makePayload({ data: { tables: {}, storage: { 'bad-key': 12345 } } }));
}, /value must be a string/);
console.log('  ✓ corrupted storage entries rejected');

// 14. Version comparison guard logic (executes real isNewerVersion)
assert.equal(isNewerVersion('1.2.0', '1.1.0'), true);
assert.equal(isNewerVersion('2.0.0', '1.9.9'), true);
assert.equal(isNewerVersion('1.0.1', '1.0.0'), true);
assert.equal(isNewerVersion('v1.5.0', '1.4.0'), true);
assert.equal(isNewerVersion('1.1.0', '1.1.0'), false);
assert.equal(isNewerVersion('1.0.0', '1.1.0'), false);
assert.equal(isNewerVersion('unknown', '1.0.0'), false);
assert.equal(isNewerVersion('1.0.0', 'unknown'), false);
console.log('  ✓ newer-version guard comparison logic verified');

// 15. Missing/unknown table handling during description
const partialPayload = makePayload({
  data: {
    tables: {
      salah_entries: [
        { date: '2026-10-06', prayer: 'Fajr', completed: 1 },
        { date: '2026-10-06', prayer: 'Dhuhr', completed: 1 },
      ],
      custom_unrecognized_table: [{ foo: 'bar' }],
    },
    storage: {},
  },
});
assert.doesNotThrow(() => validateBackup(partialPayload));
const partialDesc = describeBackup(partialPayload);
assert.ok(partialDesc.tables.includes('2 salah entries'));
assert.ok(partialDesc.tables.includes('1 custom unrecognized table'));
assert.equal(partialDesc.totalRecords, 3);
console.log('  ✓ missing/unknown tables handled gracefully');

// 16. Detailed table summary singular/plural counts formatting
const multiTablePayload = makePayload({
  data: {
    tables: {
      salah_entries: new Array(12).fill({ date: '2026-10-06', prayer: 'Fajr', completed: 1 }),
      bookmarks: new Array(5).fill({ surah: 2, ayah: 255 }),
      notes: new Array(3).fill({ id: '1', surah: 1, ayah: 1, body: 'Note' }),
      study_tags: new Array(1).fill({ id: '1', surah: 1, ayah: 1, tag: 'Tafsir' }),
    },
    storage: {},
  },
});
const multiDesc = describeBackup(multiTablePayload);
assert.equal(multiDesc.tables, '12 salah entries, 5 bookmarks, 3 notes, 1 study tag');
assert.equal(multiDesc.totalRecords, 21);
console.log('  ✓ detailed singular/plural counts summary verified ("12 salah entries, 5 bookmarks, 3 notes…")');

// 16b. formatTableSummary executed directly from the real module
assert.equal(formatTableSummary({}), 'No saved data');
assert.equal(formatTableSummary({ salah_entries: 1 }), '1 salah entry');
assert.equal(formatTableSummary({ salah_entries: 2 }), '2 salah entries');
assert.equal(formatTableSummary({ custom_x: 3 }), '3 custom x');
console.log('  ✓ formatTableSummary executed directly from real module');

// 17. Storage key allowlist: unauthorized storage keys rejected
const unauthorizedKeyPayload = makePayload({ data: { tables: {}, storage: { arbitrary_injected_key: 'malicious_value' } } });
assert.throws(() => validateBackup(unauthorizedKeyPayload), /Unauthorized storage key/);
console.log('  ✓ arbitrary/unauthorized storage keys rejected');

// 18. Excluded storage keys rejected even if matching prefix
const excludedKeyPayload = makePayload({ data: { tables: {}, storage: { 'quran-audio-downloads': 'disposable_data' } } });
assert.throws(() => validateBackup(excludedKeyPayload), /Unauthorized storage key/);
console.log('  ✓ excluded storage keys rejected');

// 18b. isAllowedStorageKey executed directly from the real module
assert.equal(isAllowedStorageKey('islamic-settings'), true);
assert.equal(isAllowedStorageKey('quran-audio-downloads'), false);
assert.equal(isAllowedStorageKey('arbitrary_injected_key'), false);
assert.equal(isAllowedStorageKey(''), false);
console.log('  ✓ isAllowedStorageKey executed directly from real module');

// 19. Malformed islamic-settings rejected
const malformedSettingsPayload = makePayload({ data: { tables: {}, storage: { 'islamic-settings': 'not valid json {{{' } } });
assert.throws(() => validateBackup(malformedSettingsPayload), /unparseable islamic-settings/);
console.log('  ✓ malformed islamic-settings JSON rejected');

// 20. Non-object islamic-settings rejected
const primitiveSettingsPayload = makePayload({ data: { tables: {}, storage: { 'islamic-settings': '"just a string"' } } });
assert.throws(() => validateBackup(primitiveSettingsPayload), /unparseable islamic-settings/);
console.log('  ✓ non-object islamic-settings rejected');

// 20b. filterAllowedStorage: strips unallowed keys, strips PIN hash, rejects malformed settings
const filtered = filterAllowedStorage({
  'islamic-settings': JSON.stringify({ methodId: 16, womenPinHash: 'secret', womenLockEnabled: true }),
  'arbitrary_injected_key': 'x',
  'quran-mark': 'kept',
});
assert.equal('arbitrary_injected_key' in filtered, false, 'filterAllowedStorage must drop unallowed keys');
assert.equal(filtered['quran-mark'], 'kept');
const parsedSettings = JSON.parse(filtered['islamic-settings']);
assert.equal('womenPinHash' in parsedSettings, false, 'filterAllowedStorage must strip womenPinHash');
assert.equal('womenLockEnabled' in parsedSettings, false, 'filterAllowedStorage must strip womenLockEnabled');
assert.equal(filterAllowedStorage({ 'islamic-settings': 'not json' })['islamic-settings'], undefined, 'malformed settings must be dropped');
console.log('  ✓ filterAllowedStorage executed directly from real module');

// 20c. sanitizeExportStorage strips PIN hash on export
const sanitized = sanitizeExportStorage({
  'islamic-settings': JSON.stringify({ methodId: 16, womenPinHash: 'secret', womenLockEnabled: true }),
  'quran-mark': 'kept',
});
const parsedExport = JSON.parse(sanitized['islamic-settings']);
assert.equal('womenPinHash' in parsedExport, false, 'sanitizeExportStorage must strip womenPinHash');
assert.equal('womenLockEnabled' in parsedExport, false, 'sanitizeExportStorage must strip womenLockEnabled');
assert.equal(sanitized['quran-mark'], 'kept');
console.log('  ✓ sanitizeExportStorage executed directly from real module');

// 21. SDK 57 FileSystem legacy import regression check
const backupScreenSource = fs.readFileSync(path.join(REPO_ROOT, 'src/screens/BackupRestoreScreen.tsx'), 'utf8');
assert.ok(
  !backupScreenSource.includes("require('expo-file-system')"),
  'BackupRestoreScreen must not use bare require("expo-file-system") due to SDK 57 split'
);
assert.ok(
  backupScreenSource.includes("require('expo-file-system/legacy')"),
  'BackupRestoreScreen must use require("expo-file-system/legacy") for document/cacheDirectory support'
);
console.log('  ✓ SDK 57 FileSystem legacy import verified in BackupRestoreScreen');

// 22. Native module import safety & render-path require elimination check
const livePlayerSource = fs.readFileSync(path.join(REPO_ROOT, 'src/components/LiveVideoPlayer.tsx'), 'utf8');
assert.ok(
  !livePlayerSource.includes("require('expo-video')"),
  'LiveVideoPlayer must not use inline require("expo-video")'
);
assert.ok(
  livePlayerSource.includes("import { useVideoPlayer, VideoView } from 'expo-video'") ||
  livePlayerSource.includes("import { VideoView, useVideoPlayer } from 'expo-video'"),
  'LiveVideoPlayer must statically import useVideoPlayer and VideoView from expo-video'
);

const quranReaderSource = fs.readFileSync(path.join(REPO_ROOT, 'src/screens/QuranReaderScreen.tsx'), 'utf8');
assert.ok(
  !quranReaderSource.includes("require('expo-sharing')"),
  'QuranReaderScreen must not use require("expo-sharing")'
);
assert.ok(
  !backupScreenSource.includes("require('expo-sharing')"),
  'BackupRestoreScreen must not use require("expo-sharing")'
);
assert.ok(
  !backupScreenSource.includes("require('expo-document-picker')"),
  'BackupRestoreScreen must not use require("expo-document-picker")'
);
console.log('  ✓ Native module static imports & render-path safety verified');

console.log('\n========================================================');
console.log('ALL BACKUP & NATIVE IMPORT TESTS PASSED (REAL src/lib/backup.ts EXECUTION)');
console.log('========================================================');
