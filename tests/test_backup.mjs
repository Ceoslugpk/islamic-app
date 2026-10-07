/**
 * Backup & Restore format tests — self-contained (no TS imports).
 * Mirrors the validateBackup/describeBackup/isNewerVersion logic from src/lib/backup.ts.
 */
import assert from 'node:assert/strict';

console.log('=== BACKUP & RESTORE FORMAT TEST SUITE ===\n');

const BACKUP_FORMAT_VERSION = 1;

const TABLE_DISPLAY_NAMES = {
  salah_entries: { singular: 'salah entry', plural: 'salah entries' },
  tasbih_entries: { singular: 'tasbih counter', plural: 'tasbih counters' },
  tasbih_daily: { singular: 'daily tasbih entry', plural: 'daily tasbih entries' },
  plan_entries: { singular: 'reading plan day', plural: 'reading plan days' },
  hifz_entries: { singular: 'hifz entry', plural: 'hifz entries' },
  hadith_saved: { singular: 'saved hadith', plural: 'saved hadiths' },
  hadith_recent: { singular: 'recent hadith', plural: 'recent hadiths' },
  hadith_read_markers: { singular: 'hadith read marker', plural: 'hadith read markers' },
  fasting_entries: { singular: 'fasting entry', plural: 'fasting entries' },
  missed_fasts: { singular: 'missed fast record', plural: 'missed fast records' },
  zakat_history: { singular: 'zakat record', plural: 'zakat records' },
  period_entries: { singular: 'cycle entry', plural: 'cycle entries' },
  nifas_entries: { singular: 'postnatal entry', plural: 'postnatal entries' },
  study_tags: { singular: 'study tag', plural: 'study tags' },
  verse_highlights: { singular: 'verse highlight', plural: 'verse highlights' },
  bookmarks: { singular: 'bookmark', plural: 'bookmarks' },
  notes: { singular: 'note', plural: 'notes' },
  playlists: { singular: 'playlist', plural: 'playlists' },
  audio_queue: { singular: 'queued track', plural: 'queued tracks' },
  audio_settings: { singular: 'audio setting profile', plural: 'audio settings' },
};

function formatTableSummary(tableCounts) {
  const parts = [];
  for (const [table, count] of Object.entries(tableCounts)) {
    if (count <= 0) continue;
    const names = TABLE_DISPLAY_NAMES[table];
    if (names) {
      parts.push(`${count} ${count === 1 ? names.singular : names.plural}`);
    } else {
      const clean = table.replace(/_/g, ' ');
      parts.push(`${count} ${clean}`);
    }
  }
  return parts.length ? parts.join(', ') : 'No saved data';
}

/** Mirror of src/lib/backup.ts isNewerVersion. */
function isNewerVersion(candidate, current) {
  if (!candidate || !current || candidate === 'unknown' || current === 'unknown') {
    return false;
  }
  const parseParts = (v) => {
    const clean = v.replace(/^v/i, '').split('-')[0].trim();
    return clean.split('.').map((p) => {
      const n = parseInt(p, 10);
      return isNaN(n) ? 0 : n;
    });
  };
  const candParts = parseParts(candidate);
  const currParts = parseParts(current);
  const maxLen = Math.max(candParts.length, currParts.length);
  for (let i = 0; i < maxLen; i++) {
    const c = candParts[i] ?? 0;
    const cur = currParts[i] ?? 0;
    if (c > cur) return true;
    if (c < cur) return false;
  }
  return false;
}

/** Mirror of src/lib/backup.ts validateBackup. */
function validateBackup(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Backup file is not a valid backup.');
  }
  if (payload.app !== 'islamic') {
    throw new Error('This file was not created by Islamic.');
  }
  if (typeof payload.formatVersion !== 'number' || payload.formatVersion < 1 || payload.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup version (${payload.formatVersion}). Update the app and try again.`);
  }
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    throw new Error('Backup file is missing data.');
  }
  if (!payload.data.tables || typeof payload.data.tables !== 'object' || Array.isArray(payload.data.tables)) {
    throw new Error('Backup file is missing table data.');
  }

  const MAX_ROWS_PER_TABLE = 50000;
  for (const [table, rows] of Object.entries(payload.data.tables)) {
    if (!Array.isArray(rows)) {
      throw new Error(`Invalid table data for "${table}": expected array of rows.`);
    }
    if (rows.length > MAX_ROWS_PER_TABLE) {
      throw new Error(`Table "${table}" exceeds row limit (${rows.length} rows).`);
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Invalid row in table "${table}" at index ${i}: expected object.`);
      }
    }
  }

const STORAGE_PREFIXES = [
  'islamic-settings',
  'settings',
  'quran-',
  'audio-',
  'hifz-',
  'playlist-',
  'tafsir-',
  'vocab-',
  '@search_history_',
];

const EXCLUDED_STORAGE_KEYS = [
  'quran-audio-downloads',
  'quran_audio_arabic_reciters_cache',
];

function isAllowedStorageKey(key) {
  if (typeof key !== 'string' || !key) return false;
  if (EXCLUDED_STORAGE_KEYS.some((ex) => key === ex || key.includes(ex))) return false;
  return STORAGE_PREFIXES.some((p) => key.startsWith(p));
}

  if (payload.data.storage !== undefined) {
    if (!payload.data.storage || typeof payload.data.storage !== 'object' || Array.isArray(payload.data.storage)) {
      throw new Error('Backup storage data is corrupted: expected key-value object.');
    }
    for (const [k, v] of Object.entries(payload.data.storage)) {
      if (typeof v !== 'string') {
        throw new Error(`Invalid storage entry for key "${k}": value must be a string.`);
      }
      if (!isAllowedStorageKey(k)) {
        throw new Error(`Unauthorized storage key "${k}" in backup.`);
      }
      if (k === 'islamic-settings') {
        try {
          const parsed = JSON.parse(v);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Malformed islamic-settings');
          }
        } catch {
          throw new Error('Backup contains invalid or unparseable islamic-settings JSON.');
        }
      }
    }
  }

  return true;
}

/** Mirror of src/lib/backup.ts describeBackup. */
function describeBackup(payload) {
  const tableCounts = {};
  let totalRecords = 0;
  const rawTables = payload?.data?.tables || {};

  for (const [table, rows] of Object.entries(rawTables)) {
    if (Array.isArray(rows) && rows.length > 0) {
      tableCounts[table] = rows.length;
      totalRecords += rows.length;
    }
  }

  const summary = formatTableSummary(tableCounts);

  return {
    tables: summary,
    exportedAt: payload?.exportedAt ? new Date(payload.exportedAt).toLocaleString() : 'Unknown',
    appVersion: payload?.appVersion || 'Unknown',
    tableCounts,
    totalRecords,
  };
}

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
  validateBackup(makePayload({
    data: {
      tables: { salah_entries: [42] },
      storage: {},
    },
  }));
}, /expected object/);

assert.throws(() => {
  validateBackup(makePayload({
    data: {
      tables: { salah_entries: ['invalid string row'] },
      storage: {},
    },
  }));
}, /expected object/);

assert.throws(() => {
  validateBackup(makePayload({
    data: {
      tables: { salah_entries: [null] },
      storage: {},
    },
  }));
}, /expected object/);
console.log('  ✓ non-object table rows rejected');

// 11. Reject non-array table definitions
assert.throws(() => {
  validateBackup(makePayload({
    data: {
      tables: { salah_entries: 'not an array' },
      storage: {},
    },
  }));
}, /expected array of rows/);
console.log('  ✓ non-array table value rejected');

// 12. Reject absurd table size (> 50,000 rows)
assert.throws(() => {
  const huge = new Array(50001).fill({ date: '2026-10-06' });
  validateBackup(makePayload({
    data: {
      tables: { salah_entries: huge },
      storage: {},
    },
  }));
}, /exceeds row limit/);
console.log('  ✓ absurd table row counts rejected');

// 13. Storage entry sanity: reject non-string storage values
assert.throws(() => {
  validateBackup(makePayload({
    data: {
      tables: {},
      storage: { 'bad-key': 12345 },
    },
  }));
}, /value must be a string/);
console.log('  ✓ corrupted storage entries rejected');

// 14. Version comparison guard logic
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
      custom_unrecognized_table: [
        { foo: 'bar' },
      ],
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
assert.equal(
  multiDesc.tables,
  '12 salah entries, 5 bookmarks, 3 notes, 1 study tag'
);
assert.equal(multiDesc.totalRecords, 21);
console.log('  ✓ detailed singular/plural counts summary verified ("12 salah entries, 5 bookmarks, 3 notes…")');

// 17. Storage key allowlist: unauthorized storage keys rejected
const unauthorizedKeyPayload = makePayload({
  data: {
    tables: {},
    storage: {
      'arbitrary_injected_key': 'malicious_value',
    },
  },
});
assert.throws(() => validateBackup(unauthorizedKeyPayload), /Unauthorized storage key/);
console.log('  ✓ arbitrary/unauthorized storage keys rejected');

// 18. Excluded storage keys rejected even if matching prefix
const excludedKeyPayload = makePayload({
  data: {
    tables: {},
    storage: {
      'quran-audio-downloads': 'disposable_data',
    },
  },
});
assert.throws(() => validateBackup(excludedKeyPayload), /Unauthorized storage key/);
console.log('  ✓ excluded storage keys rejected');

// 19. Malformed islamic-settings rejected
const malformedSettingsPayload = makePayload({
  data: {
    tables: {},
    storage: {
      'islamic-settings': 'not valid json {{{',
    },
  },
});
assert.throws(() => validateBackup(malformedSettingsPayload), /unparseable islamic-settings/);
console.log('  ✓ malformed islamic-settings JSON rejected');

// 20. Non-object islamic-settings rejected
const primitiveSettingsPayload = makePayload({
  data: {
    tables: {},
    storage: {
      'islamic-settings': '"just a string"',
    },
  },
});
assert.throws(() => validateBackup(primitiveSettingsPayload), /unparseable islamic-settings/);
console.log('  ✓ non-object islamic-settings rejected');

// 21. SDK 57 FileSystem legacy import regression check
import fs from 'node:fs';
const backupScreenSource = fs.readFileSync('src/screens/BackupRestoreScreen.tsx', 'utf8');
assert.ok(
  !backupScreenSource.includes("require('expo-file-system')"),
  'BackupRestoreScreen must not use bare require("expo-file-system") due to SDK 57 split'
);
assert.ok(
  backupScreenSource.includes("require('expo-file-system/legacy')"),
  'BackupRestoreScreen must use require("expo-file-system/legacy") for document/cacheDirectory support'
);
console.log('  ✓ SDK 57 FileSystem legacy import verified in BackupRestoreScreen');

console.log('\n========================================================');
console.log('ALL 21 BACKUP TESTS PASSED SUCCESSFULLY!');
console.log('========================================================');
