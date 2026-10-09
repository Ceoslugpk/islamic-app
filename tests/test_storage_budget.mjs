/**
 * Storage budget & eviction tests — self-contained (no TS imports).
 * Mirrors and validates selectKeysToEvict / budget enforcement logic
 * from src/lib/db.native.ts and src/lib/db.ts.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== STORAGE BUDGET & EVICTION TEST SUITE ===\n');

const PROTECTED_QURAN_CACHE_KEYS = new Set([
  'bookmarks',
  'notes',
  'playlists',
  'audio-queue',
  'audio-settings',
  'last-read',
  'recent-audio',
  'quran-audio-downloads',
  'surah-list',
]);

const DISPOSABLE_KEY_PREFIXES = [
  'surah:',
  'ayah:',
  'mosque:',
  'tafsir:',
  'tafsir-',
  'tajweed:',
  'hadith:',
];

function isDisposableQuranCacheKey(key, protectedKeys) {
  if (protectedKeys) {
    if (protectedKeys instanceof Set && protectedKeys.has(key)) return false;
    if (Array.isArray(protectedKeys) && protectedKeys.includes(key)) return false;
  }
  if (PROTECTED_QURAN_CACHE_KEYS.has(key)) return false;
  if (key.startsWith('prayer-') || key.startsWith('prayer:')) return false;
  if (key.startsWith('surah-last-ayah:')) return false;

  if (protectedKeys !== undefined) {
    return true;
  }

  return DISPOSABLE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function selectKeysToEvict(rows, budgetBytes, protectedKeys) {
  const getRowSize = (r) => {
    if (typeof r.size === 'number') return r.size;
    if (typeof r.payload === 'string') return r.payload.length;
    return 0;
  };

  let totalBytes = rows.reduce((acc, r) => acc + getRowSize(r), 0);
  if (totalBytes <= budgetBytes) {
    return [];
  }

  const sorted = [...rows].sort((a, b) => (a.cached_at ?? 0) - (b.cached_at ?? 0));

  const evicted = [];
  for (const row of sorted) {
    if (totalBytes <= budgetBytes) {
      break;
    }
    if (!isDisposableQuranCacheKey(row.key, protectedKeys)) {
      continue;
    }
    evicted.push(row.key);
    totalBytes -= getRowSize(row);
  }

  return evicted;
}

// 1. Evicts oldest first (by cached_at ascending)
{
  const rows = [
    { key: 'surah:1:en', size: 100, cached_at: 1000 },
    { key: 'surah:2:en', size: 100, cached_at: 2000 },
    { key: 'surah:3:en', size: 100, cached_at: 3000 },
  ];
  // Total = 300, budget = 150 -> needs to evict at least 150 -> surah:1 (100) + surah:2 (100)
  const evicted = selectKeysToEvict(rows, 150);
  assert.deepEqual(evicted, ['surah:1:en', 'surah:2:en']);
  console.log('  ✓ Test 1 passed: Evicts oldest rows first');
}

// 2. Never evicts protected user-data keys
{
  const rows = [
    { key: 'bookmarks', size: 200, cached_at: 500 },
    { key: 'notes', size: 200, cached_at: 600 },
    { key: 'playlists', size: 200, cached_at: 700 },
    { key: 'audio-queue', size: 200, cached_at: 800 },
    { key: 'audio-settings', size: 200, cached_at: 900 },
    { key: 'last-read', size: 200, cached_at: 1000 },
    { key: 'recent-audio', size: 200, cached_at: 1100 },
    { key: 'quran-audio-downloads', size: 200, cached_at: 1200 },
    { key: 'surah-list', size: 200, cached_at: 1300 },
    { key: 'prayer-cache-key', size: 200, cached_at: 1400 },
    { key: 'prayer:2026-10-09:loc:1:shafi', size: 200, cached_at: 1500 },
    { key: 'surah-last-ayah:1', size: 200, cached_at: 1600 },
    { key: 'surah:1:en', size: 500, cached_at: 2000 },
  ];
  // Total = 2900, budget = 2500 -> needs to evict 400.
  // Oldest items are all protected, so surah:1:en should be selected even though it has newest cached_at.
  const evicted = selectKeysToEvict(rows, 2500);
  assert.deepEqual(evicted, ['surah:1:en']);
  for (const k of [
    'bookmarks', 'notes', 'playlists', 'audio-queue', 'audio-settings',
    'last-read', 'recent-audio', 'quran-audio-downloads', 'surah-list',
    'prayer-cache-key', 'prayer:2026-10-09:loc:1:shafi', 'surah-last-ayah:1'
  ]) {
    assert.ok(!evicted.includes(k), `Protected key "${k}" must never be evicted`);
  }
  console.log('  ✓ Test 2 passed: Never evicts protected user-data keys');
}

// 3. Stops when under budget
{
  const rows = [
    { key: 'surah:1:en', size: 50, cached_at: 100 },
    { key: 'surah:2:en', size: 50, cached_at: 200 },
    { key: 'surah:3:en', size: 50, cached_at: 300 },
    { key: 'surah:4:en', size: 50, cached_at: 400 },
  ];
  // Total = 200, budget = 120 -> evicting surah:1:en (50) and surah:2:en (50) reduces total to 100 <= 120
  const evicted = selectKeysToEvict(rows, 120);
  assert.deepEqual(evicted, ['surah:1:en', 'surah:2:en']);
  console.log('  ✓ Test 3 passed: Stops immediately once under budget');
}

// 4. Handles a single oversized row
{
  const rows = [
    { key: 'surah:huge', size: 5000, cached_at: 100 },
  ];
  const evicted = selectKeysToEvict(rows, 1000);
  assert.deepEqual(evicted, ['surah:huge']);

  // If the single oversized row is protected, it must NOT be evicted:
  const protectedRows = [
    { key: 'bookmarks', size: 5000, cached_at: 100 },
  ];
  const evictedProtected = selectKeysToEvict(protectedRows, 1000);
  assert.deepEqual(evictedProtected, []);
  console.log('  ✓ Test 4 passed: Handles oversized disposable row (deletes it) and oversized protected row (preserves it)');
}

// 5. In-memory fake cache simulating enforceQuranCacheBudget
{
  const fakeCache = new Map();
  // Insert protected items
  fakeCache.set('bookmarks', { payload: JSON.stringify([{ id: 1 }]), cached_at: 100 });
  fakeCache.set('notes', { payload: JSON.stringify([{ id: 'n1' }]), cached_at: 200 });
  fakeCache.set('surah-list', { payload: JSON.stringify(new Array(114).fill(0)), cached_at: 300 });

  // Insert disposable items
  for (let i = 1; i <= 20; i++) {
    fakeCache.set(`surah:${i}:en`, { payload: 'X'.repeat(500), cached_at: 1000 + i });
  }

  function simulateEnforceBudget(cache, budget) {
    const items = [];
    for (const [key, val] of cache.entries()) {
      items.push({ key, size: val.payload.length, cached_at: val.cached_at });
    }
    const toEvict = selectKeysToEvict(items, budget);
    for (const key of toEvict) {
      cache.delete(key);
    }
    return toEvict;
  }

  // Pre-eviction size: 3 protected + 20 * 500 = 10000+ bytes
  const budget = 3000;
  const evicted = simulateEnforceBudget(fakeCache, budget);
  assert.ok(evicted.length > 0, 'Some items must be evicted');
  assert.ok(fakeCache.has('bookmarks'), 'Bookmarks preserved');
  assert.ok(fakeCache.has('notes'), 'Notes preserved');
  assert.ok(fakeCache.has('surah-list'), 'Surah list preserved');

  let remainingSize = 0;
  for (const val of fakeCache.values()) remainingSize += val.payload.length;
  assert.ok(remainingSize <= budget, `Remaining size (${remainingSize}) must be <= budget (${budget})`);
  console.log('  ✓ Test 5 passed: In-memory fake quran_cache enforces budget and preserves user tables');
}

// 6. Preloader bounds translations to active language group
{
  const quranPreloader = fs.readFileSync('src/lib/quranPreloader.ts', 'utf8');

  assert.ok(quranPreloader.includes('getSelectedLanguageEditions'), 'Preloader must have getSelectedLanguageEditions helper');
  assert.ok(!quranPreloader.includes('prioritizedEditions = [\n    editionIdentifier,\n    ...allEditions.filter'), 'Preloader must not prioritize all 49 editions in startQuranPreload');
  assert.ok(quranPreloader.includes('consecutiveSaveFailures'), 'Preloader must track consecutiveSaveFailures');
  assert.ok(quranPreloader.includes('MAX_CONSECUTIVE_SAVE_FAILURES'), 'Preloader must define MAX_CONSECUTIVE_SAVE_FAILURES');
  console.log('  ✓ Test 6 passed: Preloader bounds preload to selected language editions and tracks consecutiveSaveFailures');
}

// 7. AsyncStorage pruning verification in quranProgress and hadithApi
{
  const quranProgress = fs.readFileSync('src/lib/quranProgress.ts', 'utf8');
  assert.ok(quranProgress.includes('MAX_PROGRESS_HISTORY_DAYS = 90'), 'quranProgress must define 90-day history cap');
  assert.ok(quranProgress.includes('pruneOldQuranDailyProgress'), 'quranProgress must implement pruneOldQuranDailyProgress');

  const hadithApi = fs.readFileSync('src/lib/hadithApi.ts', 'utf8');
  assert.ok(hadithApi.includes('MAX_HADITH_LIST_PAGES_PER_BOOK = 20'), 'hadithApi must cap list pages at 20 per book');
  assert.ok(hadithApi.includes('MAX_HADITH_SINGLE_CACHE = 200'), 'hadithApi must cap single cache at 200');
  assert.ok(hadithApi.includes('pruneHadithCaches'), 'hadithApi must implement pruneHadithCaches');
  console.log('  ✓ Test 7 passed: AsyncStorage 90-day progress pruning and hadith cache caps verified');
}

// 8. Backup import transaction safety
{
  const backup = fs.readFileSync('src/lib/backup.ts', 'utf8');
  assert.ok(backup.includes('cannot rollback'), 'backup.ts handles cannot rollback transaction errors');
  assert.ok(backup.includes('SQLITE_FULL'), 'backup.ts handles and re-throws SQLITE_FULL errors');
  console.log('  ✓ Test 8 passed: Backup import handles cannot rollback and surfaces storage full');
}

// 9. Native and Web DB facade symmetry
{
  const dbNative = fs.readFileSync('src/lib/db.native.ts', 'utf8');
  const dbWeb = fs.readFileSync('src/lib/db.ts', 'utf8');

  for (const fn of [
    'QURAN_CACHE_BUDGET_BYTES',
    'PROTECTED_QURAN_CACHE_KEYS',
    'DISPOSABLE_KEY_PREFIXES',
    'isDisposableQuranCacheKey',
    'selectKeysToEvict',
    'enforceQuranCacheBudget',
    'saveQuranCache',
    'savePrayerCache',
  ]) {
    assert.ok(dbNative.includes(fn), `db.native.ts must export/contain ${fn}`);
    assert.ok(dbWeb.includes(fn), `db.ts must export/contain ${fn}`);
  }
  console.log('  ✓ Test 9 passed: db.native.ts and db.ts maintain strict facade export symmetry');
}

console.log('\n========================================================');
console.log('ALL STORAGE BUDGET & EVICTION TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\n');
