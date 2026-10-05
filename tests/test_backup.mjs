/**
 * Backup & Restore format tests — self-contained (no TS imports).
 * Mirrors the validateBackup/describeBackup logic from src/lib/backup.ts.
 */
import assert from 'node:assert/strict';

console.log('=== BACKUP & RESTORE FORMAT TEST SUITE ===\n');

const BACKUP_FORMAT_VERSION = 1;

/** Mirror of src/lib/backup.ts validateBackup. */
function validateBackup(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup file is not a valid backup.');
  }
  if (payload.app !== 'islamic') {
    throw new Error('This file was not created by Islamic.');
  }
  if (typeof payload.formatVersion !== 'number' || payload.formatVersion < 1 || payload.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup version (${payload.formatVersion}). Update the app and try again.`);
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Backup file is missing data.');
  }
  if (!payload.data.tables || typeof payload.data.tables !== 'object') {
    throw new Error('Backup file is missing table data.');
  }
  return true;
}

function describeBackup(payload) {
  const names = Object.keys(payload.data.tables).filter((t) => (payload.data.tables[t] || []).length > 0);
  return {
    tables: names.length ? names.join(', ') : 'No saved data',
    exportedAt: payload.exportedAt ? new Date(payload.exportedAt).toLocaleString() : 'Unknown',
    appVersion: payload.appVersion || 'Unknown',
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
      storage: { settings: '{"methodId":16}' },
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

// 6. Corrupted JSON rejected at parse (the screen catches this before validate)
assert.throws(() => JSON.parse('{not json'));
console.log('  ✓ corrupted file rejected');

// 7. Round-trip preserves data
const payload = makePayload();
const back = JSON.parse(JSON.stringify(payload));
assert.deepEqual(back, payload);
console.log('  ✓ serialize round-trip preserves data');

// 8. describeBackup summarizes contents
const info = describeBackup(payload);
assert.ok(info.exportedAt.includes('2026'));
assert.ok(info.tables.includes('salah_entries') && info.tables.includes('hifz_entries'));
console.log('  ✓ describe shows date + tables');

// 9. Empty tables → graceful "No saved data"
const empty = describeBackup(makePayload({ data: { tables: { salah_entries: [] }, storage: {} } }));
assert.ok(empty.tables.includes('No saved data'));
console.log('  ✓ empty backup described gracefully');

console.log('\n========================================================');
console.log('ALL 9 BACKUP TESTS PASSED SUCCESSFULLY!');
console.log('========================================================');
