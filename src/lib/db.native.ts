/**
 * Database facade - NATIVE implementation (expo-sqlite).
 * Metro resolves this for Android/iOS; db.ts (web impl) for web.
 * Both files export the SAME names - callers import from './db' and Metro picks per-platform.
 */
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('salah.db');
    migrate(db);
  }
  return db;
}

function migrate(database: SQLite.SQLiteDatabase) {
  let hasCacheKey = false;
  try {
    const cols = database.getAllSync<{ name: string }>('PRAGMA table_info(prayer_cache)');
    hasCacheKey = cols.some((c) => c.name === 'cache_key');
  } catch {}

  if (!hasCacheKey) {
    database.execSync('DROP TABLE IF EXISTS prayer_cache');
    database.execSync(`
      CREATE TABLE prayer_cache (
        cache_key TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        location TEXT NOT NULL,
        method INTEGER NOT NULL,
        madhab TEXT NOT NULL,
        payload TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      );
    `);
  }

  database.execSync(`
    CREATE TABLE IF NOT EXISTS salah_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      prayer TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      UNIQUE(date, prayer)
    );
    CREATE TABLE IF NOT EXISTS quran_cache (
      key TEXT PRIMARY KEY,
      payload TEXT,
      cached_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS tasbih_entries (
      id TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS tasbih_daily (
      date TEXT PRIMARY KEY,
      total INTEGER DEFAULT 0,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS plan_entries (
      plan_id TEXT NOT NULL,
      day INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      PRIMARY KEY (plan_id, day)
    );
    CREATE TABLE IF NOT EXISTS hifz_entries (
      surah INTEGER PRIMARY KEY,
      status TEXT NOT NULL,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hadith_saved (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      collection_name TEXT,
      book_number TEXT NOT NULL,
      book_name TEXT,
      hadith_number TEXT NOT NULL,
      arabic_text TEXT,
      english_text TEXT,
      grade TEXT,
      saved_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hadith_recent (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      collection_name TEXT,
      book_number TEXT NOT NULL,
      book_name TEXT,
      hadith_number TEXT NOT NULL,
      arabic_text TEXT,
      english_text TEXT,
      grade TEXT,
      read_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hadith_read_markers (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      read_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS fasting_entries (
      date TEXT PRIMARY KEY,
      fasting INTEGER DEFAULT 0,
      type TEXT NOT NULL,
      notes TEXT,
      completed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS missed_fasts (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      reason TEXT NOT NULL,
      made_up INTEGER DEFAULT 0,
      made_up_date TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS zakat_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      currency TEXT NOT NULL,
      total_wealth REAL NOT NULL,
      zakat_due REAL NOT NULL,
      nisab_standard TEXT NOT NULL,
      breakdown TEXT NOT NULL,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS period_entries (
      id TEXT PRIMARY KEY,
      start_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      purity_days TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS nifas_entries (
      id TEXT PRIMARY KEY,
      start_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS study_tags (
      id TEXT PRIMARY KEY,
      surah INTEGER NOT NULL,
      ayah INTEGER NOT NULL,
      tag TEXT NOT NULL,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS verse_highlights (
      id TEXT PRIMARY KEY,
      surah INTEGER NOT NULL,
      ayah INTEGER NOT NULL,
      color TEXT NOT NULL,
      created_at INTEGER
    );
  `);

  try {
    enforceQuranCacheBudget(QURAN_CACHE_BUDGET_BYTES, database);
  } catch {
    // non-fatal
  }
}


interface PrayerCacheRow { payload: string }
interface SalahRow { date: string; prayer: string; completed: number }
interface QuranCacheRow { payload: string }

export interface PrayerCacheMeta {
  date?: string;
  location?: string;
  method?: number;
  madhab?: string;
}

export function savePrayerCache(
  cacheKeyOrDate: string,
  payloadOrLocation: any,
  metaOrMethod?: any,
  maybePayload?: any,
  maybeMadhab?: string
): boolean {
  try {
    let cacheKey: string;
    let payload: object;
    let date = '';
    let location = '';
    let method = 0;
    let madhab = 'shafi';

    if (typeof payloadOrLocation === 'object' && payloadOrLocation !== null && !Array.isArray(payloadOrLocation)) {
      cacheKey = cacheKeyOrDate;
      payload = payloadOrLocation;
      if (metaOrMethod && typeof metaOrMethod === 'object') {
        date = metaOrMethod.date || '';
        location = metaOrMethod.location || '';
        method = metaOrMethod.method ?? 0;
        madhab = metaOrMethod.madhab || 'shafi';
      }
    } else {
      date = cacheKeyOrDate;
      location = String(payloadOrLocation || '');
      method = Number(metaOrMethod || 0);
      payload = maybePayload || {};
      madhab = maybeMadhab || 'shafi';
      cacheKey = `prayer:${date}:${location}:${method}:${madhab}`;
    }

    const doInsert = () => {
      getDb().runSync(
        `INSERT OR REPLACE INTO prayer_cache (cache_key, date, location, method, madhab, payload, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        cacheKey, date, location, method, madhab, JSON.stringify(payload), Date.now()
      );
    };

    try {
      doInsert();
      return true;
    } catch (writeErr) {
      console.warn('[db.native] savePrayerCache initial write failed, attempting eviction:', writeErr);
      try {
        enforceQuranCacheBudget(QURAN_CACHE_BUDGET_BYTES);
        doInsert();
        return true;
      } catch (retryErr) {
        console.warn('[db.native] savePrayerCache retry failed:', retryErr);
        return false;
      }
    }
  } catch (outerErr) {
    console.warn('[db.native] savePrayerCache failed:', outerErr);
    return false;
  }
}

export function loadPrayerCache(
  cacheKeyOrDate: string,
  location?: string,
  method?: number,
  madhab?: string
): { payload: string } | null {
  try {
    if (location === undefined && method === undefined) {
      const row = getDb().getFirstSync<PrayerCacheRow>(
        'SELECT payload FROM prayer_cache WHERE cache_key = ?',
        cacheKeyOrDate
      );
      return row ? { payload: row.payload } : null;
    }

    const loc = location ?? '';
    const meth = method ?? 0;
    const row = getDb().getFirstSync<PrayerCacheRow>(
      'SELECT payload FROM prayer_cache WHERE date = ? AND (location = ? OR location LIKE ?) AND method = ?' +
        (madhab ? ' AND madhab = ?' : '') +
        ' ORDER BY cached_at DESC LIMIT 1',
      ...(madhab
        ? [cacheKeyOrDate, loc, `%${loc}%`, meth, madhab]
        : [cacheKeyOrDate, loc, `%${loc}%`, meth])
    );
    return row ? { payload: row.payload } : null;
  } catch {
    return null;
  }
}

export function loadLatestPrayerCache(location?: string, method?: number, madhab?: string): { payload: string } | null {
  try {
    let query = 'SELECT payload FROM prayer_cache';
    const params: any[] = [];
    const conditions: string[] = [];
    if (location) {
      conditions.push('(location = ? OR location LIKE ?)');
      params.push(location, `%${location}%`);
    }
    if (method !== undefined) {
      conditions.push('method = ?');
      params.push(method);
    }
    if (madhab) {
      conditions.push('madhab = ?');
      params.push(madhab);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY cached_at DESC LIMIT 1';

    const row = getDb().getFirstSync<PrayerCacheRow>(query, ...params);
    return row ? { payload: row.payload } : null;
  } catch {
    return null;
  }
}

export function markSalahCompleted(date: string, prayer: string, completed: boolean) {
  try {
    getDb().runSync(
      `INSERT INTO salah_entries (date, prayer, completed, completed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date, prayer) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at`,
      date, prayer, completed ? 1 : 0, completed ? Date.now() : null
    );
  } catch { /* non-fatal */ }
}

export function getSalahEntries(date: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  try {
    const rows = getDb().getAllSync<SalahRow>('SELECT * FROM salah_entries WHERE date = ?', date);
    for (const r of rows) out[r.prayer] = r.completed === 1;
  } catch { /* ignore */ }
  return out;
}

export function getSalahHistory(days: number): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  try {
    const rows = getDb().getAllSync<SalahRow>('SELECT * FROM salah_entries WHERE date >= ? ORDER BY date ASC', from);
    for (const r of rows) {
      if (!out[r.date]) out[r.date] = {};
      out[r.date][r.prayer] = r.completed === 1;
    }
  } catch { /* ignore */ }
  return out;
}

export const QURAN_CACHE_BUDGET_BYTES = 400 * 1024 * 1024; // 400 MB

export const PROTECTED_QURAN_CACHE_KEYS = new Set<string>([
  'bookmarks',
  'notes',
  'playlists',
  'audio-queue',
  'audio-settings',
  'last-read',
  'recent-audio',
  'quran-audio-downloads',
  'surah-list',
  'quran-reading-marker',
  'quran-last-reading',
  'quran_cache_bytes',
]);

export const DISPOSABLE_KEY_PREFIXES = [
  'surah:',
  'ayah:',
  'mosque:',
  'tafsir:',
  'tafsir-',
  'tajweed:',
  'hadith:',
];

export function isDisposableQuranCacheKey(
  key: string,
  protectedKeys?: Set<string> | string[]
): boolean {
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

export function selectKeysToEvict(
  rows: { key: string; size?: number; payload?: string; cached_at?: number }[],
  budgetBytes: number,
  protectedKeys?: Set<string> | string[]
): string[] {
  const getRowSize = (r: { size?: number; payload?: string }): number => {
    if (typeof r.size === 'number') return r.size;
    if (typeof r.payload === 'string') return r.payload.length;
    return 0;
  };

  let totalBytes = rows.reduce((acc, r) => acc + getRowSize(r), 0);
  if (totalBytes <= budgetBytes) {
    return [];
  }

  const sorted = [...rows].sort((a, b) => (a.cached_at ?? 0) - (b.cached_at ?? 0));

  const evicted: string[] = [];
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

export function computeCacheStamp(total: number, count: number): number {
  return ((count & 0x7fffffff) * 31 + (total & 0x7fffffff)) >>> 0;
}

export function reconcileQuranCacheBudget(customDb?: SQLite.SQLiteDatabase): number {
  try {
    const database = customDb || getDb();
    const row = database.getFirstSync<{ total: number | null; count: number }>(
      "SELECT COALESCE(SUM(length(payload)), 0) AS total, COUNT(*) AS count FROM quran_cache WHERE key != 'quran_cache_bytes'"
    );
    const total = row?.total ?? 0;
    const count = row?.count ?? 0;
    const stamp = computeCacheStamp(total, count);
    database.runSync(
      "INSERT OR REPLACE INTO quran_cache (key, payload, cached_at) VALUES ('quran_cache_bytes', ?, ?)",
      String(total),
      stamp
    );
    return total;
  } catch (err) {
    console.warn('[db.native] reconcileQuranCacheBudget failed:', err);
    return 0;
  }
}

export function getQuranCacheTotalBytes(customDb?: SQLite.SQLiteDatabase): number {
  try {
    const database = customDb || getDb();
    const row = database.getFirstSync<{ payload: string; cached_at: number }>(
      "SELECT payload, cached_at FROM quran_cache WHERE key = 'quran_cache_bytes'"
    );
    if (!row || typeof row.payload !== 'string') {
      return reconcileQuranCacheBudget(database);
    }
    const total = Number(row.payload);
    if (Number.isNaN(total) || total < 0) {
      return reconcileQuranCacheBudget(database);
    }
    const countRow = database.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM quran_cache WHERE key != 'quran_cache_bytes'"
    );
    const count = countRow?.count ?? 0;
    if (row.cached_at !== computeCacheStamp(total, count)) {
      return reconcileQuranCacheBudget(database);
    }
    return total;
  } catch {
    return 0;
  }
}

function applyQuranCacheWrite(
  database: SQLite.SQLiteDatabase,
  key: string,
  payloadStr: string,
  now: number
): void {
  database.withTransactionSync(() => {
    const oldRow = database.getFirstSync<{ len: number }>(
      'SELECT length(payload) AS len FROM quran_cache WHERE key = ?',
      key
    );
    const oldLen = oldRow ? oldRow.len : null;

    // Fetch current validated total BEFORE inserting the new payload row to prevent double-counting if reconcile runs
    const currentTotal = getQuranCacheTotalBytes(database);
    const countRow = database.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM quran_cache WHERE key != 'quran_cache_bytes'"
    );
    const currentCount = countRow?.count ?? 0;

    database.runSync(
      'INSERT OR REPLACE INTO quran_cache (key, payload, cached_at) VALUES (?, ?, ?)',
      key,
      payloadStr,
      now
    );

    const newLen = payloadStr.length;
    const delta = oldLen !== null ? newLen - oldLen : newLen;
    const countDelta = oldLen !== null ? 0 : 1;
    const newTotal = Math.max(0, currentTotal + delta);
    const newCount = Math.max(0, currentCount + countDelta);
    const stamp = computeCacheStamp(newTotal, newCount);

    database.runSync(
      "INSERT OR REPLACE INTO quran_cache (key, payload, cached_at) VALUES ('quran_cache_bytes', ?, ?)",
      String(newTotal),
      stamp
    );
  });
}

export function enforceQuranCacheBudget(
  budgetBytes: number = QURAN_CACHE_BUDGET_BYTES,
  customDb?: SQLite.SQLiteDatabase
): void {
  try {
    const database = customDb || getDb();
    let total = getQuranCacheTotalBytes(database);
    if (budgetBytes < QURAN_CACHE_BUDGET_BYTES) {
      total = reconcileQuranCacheBudget(database);
    }
    if (total <= budgetBytes) {
      return;
    }

    const BATCH_SIZE = 50;
    while (total > budgetBytes) {
      const res = database.runSync(
        `DELETE FROM quran_cache
         WHERE key IN (
           SELECT key FROM quran_cache
           WHERE (
             key LIKE 'surah:%' OR
             key LIKE 'ayah:%' OR
             key LIKE 'mosque:%' OR
             key LIKE 'tafsir:%' OR
             key LIKE 'tafsir-%' OR
             key LIKE 'tajweed:%' OR
             key LIKE 'hadith:%'
           )
           AND key NOT IN ('bookmarks', 'notes', 'playlists', 'audio-queue', 'audio-settings', 'last-read', 'recent-audio', 'quran-audio-downloads', 'surah-list', 'quran-reading-marker', 'quran-last-reading', 'quran_cache_bytes')
           AND key NOT LIKE 'prayer-%'
           AND key NOT LIKE 'prayer:%'
           AND key NOT LIKE 'surah-last-ayah:%'
           AND key != 'quran_cache_bytes'
           ORDER BY cached_at ASC
           LIMIT ${BATCH_SIZE}
         )`
      );

      if (!res || res.changes === 0) {
        break;
      }

      total = reconcileQuranCacheBudget(database);
    }
  } catch (err) {
    console.warn('[db.native] enforceQuranCacheBudget failed:', err);
  }
}

export function saveQuranCache(key: string, payload: object): boolean {
  try {
    const database = getDb();
    applyQuranCacheWrite(database, key, JSON.stringify(payload), Date.now());
    enforceQuranCacheBudget(QURAN_CACHE_BUDGET_BYTES, database);
    return true;
  } catch (err) {
    console.warn('[db.native] saveQuranCache initial write failed, running eviction:', err);
    try {
      const database = getDb();
      enforceQuranCacheBudget(QURAN_CACHE_BUDGET_BYTES, database);
      applyQuranCacheWrite(database, key, JSON.stringify(payload), Date.now());
      enforceQuranCacheBudget(QURAN_CACHE_BUDGET_BYTES, database);
      return true;
    } catch (retryErr) {
      console.warn('[db.native] saveQuranCache retry failed (storage full?):', retryErr);
      return false;
    }
  }
}

export function loadQuranCache<T>(key: string, validator?: (val: unknown) => val is T): T | null {
  try {
    const row = getDb().getFirstSync<QuranCacheRow>('SELECT payload FROM quran_cache WHERE key = ?', key);
    if (!row) return null;
    const parsed = JSON.parse(row.payload) as unknown;
    if (validator && !validator(parsed)) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export function loadQuranCacheArray<T>(key: string, itemValidator?: (item: unknown) => boolean): T[] {
  try {
    const loaded = loadQuranCache<unknown[]>(key, (val): val is unknown[] => Array.isArray(val));
    if (!loaded) return [];
    if (itemValidator) {
      return loaded.filter(itemValidator) as T[];
    }
    return loaded as T[];
  } catch {
    return [];
  }
}

export function isQuranCacheKeyPresent(key: string): boolean {
  try {
    const row = getDb().getFirstSync<{ found: number }>(
      'SELECT 1 AS found FROM quran_cache WHERE key = ? LIMIT 1',
      key
    );
    return Boolean(row && row.found === 1);
  } catch {
    return false;
  }
}

export function getCachedQuranKeys(): Set<string> {
  const set = new Set<string>();
  try {
    const rows = getDb().getAllSync<{ key: string }>('SELECT key FROM quran_cache');
    for (const r of rows) set.add(r.key);
  } catch {
    // non-fatal
  }
  return set;
}

interface MosqueCacheItem {
  mosques: import('./mosqueFinderApi').MosqueItem[];
  centerLat: number;
  centerLon: number;
  radiusKm: number;
  cachedAt: number;
}

/** Native (expo-sqlite) mirror of the web mosque cache — stored in quran_cache table. */
export function saveMosqueCache(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  mosques: import('./mosqueFinderApi').MosqueItem[]
): void {
  const key = `mosque:${centerLat.toFixed(2)}:${centerLon.toFixed(2)}:${radiusKm}`;
  saveQuranCache(key, { mosques, centerLat, centerLon, radiusKm, cachedAt: Date.now() });
}

export function loadMosqueCache(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  maxAgeMs = 24 * 60 * 60 * 1000
): import('./mosqueFinderApi').MosqueItem[] | null {
  const key = `mosque:${centerLat.toFixed(2)}:${centerLon.toFixed(2)}:${radiusKm}`;
  const parsed = loadQuranCache<MosqueCacheItem>(key);
  if (!parsed || !Array.isArray(parsed.mosques)) return null;
  if (Date.now() - parsed.cachedAt > maxAgeMs) return null;
  return parsed.mosques;
}

export function saveQuranAudioDownloads(payload: object) {
  saveQuranCache('quran-audio-downloads', payload);
}

export function loadQuranAudioDownloads<T = Record<string, any>>(): T | null {
  return loadQuranCache<T>('quran-audio-downloads');
}


/** Compute current streak (consecutive days with all 5 prayers completed). */
export function computeStreak(history: Record<string, Record<string, boolean>>): number {
  const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const dates = Object.keys(history).sort().reverse();
  let streak = 0;
  for (const date of dates) {
    const day = history[date];
    const complete = PRAYERS.every((p) => day[p]);
    if (complete) streak += 1;
    else break;
  }
  return streak;
}

export type HifzStatus = 'not-started' | 'revising' | 'memorized';

export interface LastReadPosition {
  surah: number;
  ayah: number;
  page?: number;
  surahName?: string;
  updatedAt: number;
}

export interface RecentlyPlayedItem {
  id: string;
  type: 'surah' | 'ayah';
  identifier: string;
  reciterName: string;
  surah: number;
  ayah?: number;
  title: string;
  timestamp: number;
}

export interface PlaylistItem {
  surah: number;
  ayah?: number;
  title: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: number;
}

export interface AudioSettings {
  reciter: string;
  autoplayNext: boolean;
  repeatMode: 'none' | 'one' | 'all';
}

export function saveLastReadPosition(surah: number, ayah: number, surahName?: string, page?: number): void {
  const data: LastReadPosition = { surah, ayah, page, surahName, updatedAt: Date.now() };
  saveQuranCache('last-read', data);
}

export function loadLastReadPosition(): LastReadPosition | null {
  return loadQuranCache<LastReadPosition>('last-read');
}

export function saveRecentlyPlayed(item: Omit<RecentlyPlayedItem, 'id' | 'timestamp'>): void {
  const list = loadRecentlyPlayed();
  const id = `${item.identifier}:${item.type}:${item.surah}:${item.ayah ?? 0}`;
  const newItem: RecentlyPlayedItem = { ...item, id, timestamp: Date.now() };
  const filtered = list.filter((i) => i.id !== id);
  const updated = [newItem, ...filtered].slice(0, 30);
  saveQuranCache('recent-audio', updated);
}

export function loadRecentlyPlayed(): RecentlyPlayedItem[] {
  return loadQuranCacheArray<RecentlyPlayedItem>('recent-audio', (item) => {
    return Boolean(
      item &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      typeof (item as Record<string, unknown>).identifier === 'string' &&
      typeof (item as Record<string, unknown>).surah === 'number'
    );
  });
}

export function savePlaylist(playlist: Playlist): void {
  const list = loadPlaylists();
  const filtered = list.filter((p) => p.id !== playlist.id);
  const updated = [...filtered, playlist];
  saveQuranCache('playlists', updated);
}

export function loadPlaylists(): Playlist[] {
  return loadQuranCacheArray<Playlist>('playlists', (p) => {
    return Boolean(
      p &&
      typeof p === 'object' &&
      typeof (p as Record<string, unknown>).id === 'string' &&
      typeof (p as Record<string, unknown>).name === 'string' &&
      Array.isArray((p as Record<string, unknown>).items)
    );
  });
}

export function deletePlaylist(id: string): void {
  const list = loadPlaylists();
  const updated = list.filter((p) => p.id !== id);
  saveQuranCache('playlists', updated);
}

export function saveAudioQueue(queue: PlaylistItem[]): void {
  saveQuranCache('audio-queue', queue);
}

export function loadAudioQueue(): PlaylistItem[] {
  return loadQuranCacheArray<PlaylistItem>('audio-queue', (item) => {
    return Boolean(
      item &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      typeof (item as Record<string, unknown>).surah === 'number'
    );
  });
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  reciter: 'ar.alafasy',
  autoplayNext: true,
  repeatMode: 'none',
};

export function saveAudioSettings(settings: AudioSettings): void {
  saveQuranCache('audio-settings', settings);
}

export function loadAudioSettings(): AudioSettings {
  const loaded = loadQuranCache<Record<string, unknown>>('audio-settings', (val): val is Record<string, unknown> => {
    return Boolean(val && typeof val === 'object' && !Array.isArray(val));
  });
  if (!loaded) return DEFAULT_AUDIO_SETTINGS;

  const reciter =
    typeof loaded.reciter === 'string' && loaded.reciter.length > 0
      ? loaded.reciter
      : DEFAULT_AUDIO_SETTINGS.reciter;
  const autoplayNext =
    typeof loaded.autoplayNext === 'boolean'
      ? loaded.autoplayNext
      : DEFAULT_AUDIO_SETTINGS.autoplayNext;
  const repeatMode =
    loaded.repeatMode === 'none' || loaded.repeatMode === 'one' || loaded.repeatMode === 'all'
      ? loaded.repeatMode
      : DEFAULT_AUDIO_SETTINGS.repeatMode;

  return { reciter, autoplayNext, repeatMode };
}

interface TasbihRow { id: string; count: number }
interface PlanRow { day: number; completed: number }
interface HifzRow { surah: number; status: string }
interface TasbihDailyRow { date: string; total: number }

export function saveTasbihCount(dhikrId: string, count: number): void {
  try {
    getDb().runSync(
      `INSERT INTO tasbih_entries (id, count, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at`,
      dhikrId, count, Date.now()
    );
  } catch { /* non-fatal */ }
}

export async function saveTasbihCountAsync(dhikrId: string, count: number): Promise<void> {
  try {
    await getDb().runAsync(
      `INSERT INTO tasbih_entries (id, count, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at`,
      dhikrId, count, Date.now()
    );
  } catch { /* non-fatal */ }
}

export function loadTasbihCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  try {
    const rows = getDb().getAllSync<TasbihRow>('SELECT id, count FROM tasbih_entries');
    for (const r of rows) out[r.id] = r.count;
  } catch { /* ignore */ }
  return out;
}

export function saveTasbihDayTotal(date: string, delta: number): void {
  try {
    getDb().runSync(
      `INSERT INTO tasbih_daily (date, total, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET total = total + excluded.total, updated_at = excluded.updated_at`,
      date, delta, Date.now()
    );
  } catch { /* non-fatal */ }
}

export async function saveTasbihDayTotalAsync(date: string, delta: number): Promise<void> {
  try {
    await getDb().runAsync(
      `INSERT INTO tasbih_daily (date, total, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET total = total + excluded.total, updated_at = excluded.updated_at`,
      date, delta, Date.now()
    );
  } catch { /* non-fatal */ }
}

export function loadTasbihDayTotal(date: string): number {
  try {
    const row = getDb().getFirstSync<TasbihDailyRow>('SELECT total FROM tasbih_daily WHERE date = ?', date);
    return row?.total || 0;
  } catch { /* ignore */ }
  return 0;
}

export function savePlanDay(planId: string, day: number, completed: boolean): void {
  try {
    getDb().runSync(
      `INSERT INTO plan_entries (plan_id, day, completed, completed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(plan_id, day) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at`,
      planId, day, completed ? 1 : 0, completed ? Date.now() : null
    );
  } catch { /* non-fatal */ }
}

export function loadPlanProgress(planId: string): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  try {
    const rows = getDb().getAllSync<PlanRow>('SELECT day, completed FROM plan_entries WHERE plan_id = ?', planId);
    for (const r of rows) out[r.day] = r.completed === 1;
  } catch { /* ignore */ }
  return out;
}

export function saveHifzStatus(surah: number, status: HifzStatus): void {
  try {
    getDb().runSync(
      `INSERT INTO hifz_entries (surah, status, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(surah) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
      surah, status, Date.now()
    );
  } catch { /* non-fatal */ }
}

export function loadHifzStatuses(): Record<number, HifzStatus> {
  const out: Record<number, HifzStatus> = {};
  try {
    const rows = getDb().getAllSync<HifzRow>('SELECT surah, status FROM hifz_entries');
    for (const r of rows) {
      if (r.status === 'memorized' || r.status === 'revising' || r.status === 'not-started') {
        out[r.surah] = r.status;
      }
    }
  } catch { /* ignore */ }
  return out;
}

export interface SavedHadithItem {
  id: string; // `${collection}:${bookNumber}:${hadithNumber}`
  collection: string;
  collectionName?: string;
  bookNumber: string;
  bookName?: string;
  hadithNumber: string;
  arabicText: string;
  englishText: string;
  grade?: string;
  savedAt: number;
}

export interface RecentHadithItem {
  id: string;
  collection: string;
  collectionName?: string;
  bookNumber: string;
  bookName?: string;
  hadithNumber: string;
  arabicText: string;
  englishText: string;
  grade?: string;
  readAt: number;
}

interface HadithSavedRow {
  id: string;
  collection: string;
  collection_name: string | null;
  book_number: string;
  book_name: string | null;
  hadith_number: string;
  arabic_text: string | null;
  english_text: string | null;
  grade: string | null;
  saved_at: number;
}

interface HadithRecentRow {
  id: string;
  collection: string;
  collection_name: string | null;
  book_number: string;
  book_name: string | null;
  hadith_number: string;
  arabic_text: string | null;
  english_text: string | null;
  grade: string | null;
  read_at: number;
}

export function saveSavedHadith(item: SavedHadithItem): void {
  try {
    getDb().runSync(
      `INSERT INTO hadith_saved (id, collection, collection_name, book_number, book_name, hadith_number, arabic_text, english_text, grade, saved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         collection = excluded.collection,
         collection_name = excluded.collection_name,
         book_number = excluded.book_number,
         book_name = excluded.book_name,
         hadith_number = excluded.hadith_number,
         arabic_text = excluded.arabic_text,
         english_text = excluded.english_text,
         grade = excluded.grade,
         saved_at = excluded.saved_at`,
      item.id,
      item.collection,
      item.collectionName || '',
      item.bookNumber,
      item.bookName || '',
      item.hadithNumber,
      item.arabicText,
      item.englishText,
      item.grade || '',
      item.savedAt || Date.now()
    );
  } catch { /* non-fatal */ }
}

export function removeSavedHadith(id: string): void {
  try {
    getDb().runSync('DELETE FROM hadith_saved WHERE id = ?', id);
  } catch { /* non-fatal */ }
}

export function loadSavedHadiths(): SavedHadithItem[] {
  try {
    const rows = getDb().getAllSync<HadithSavedRow>('SELECT * FROM hadith_saved ORDER BY saved_at DESC');
    return rows.map((r) => ({
      id: r.id,
      collection: r.collection,
      collectionName: r.collection_name || undefined,
      bookNumber: r.book_number,
      bookName: r.book_name || undefined,
      hadithNumber: r.hadith_number,
      arabicText: r.arabic_text || '',
      englishText: r.english_text || '',
      grade: r.grade || undefined,
      savedAt: r.saved_at,
    }));
  } catch {
    return [];
  }
}

export function isHadithSaved(id: string): boolean {
  try {
    const row = getDb().getFirstSync<{ id: string }>('SELECT id FROM hadith_saved WHERE id = ?', id);
    return !!row;
  } catch {
    return false;
  }
}

export function saveRecentHadith(item: Omit<RecentHadithItem, 'readAt'>): void {
  const id = item.id || `${item.collection}:${item.bookNumber}:${item.hadithNumber}`;
  const now = Date.now();
  try {
    getDb().runSync(
      `INSERT INTO hadith_recent (id, collection, collection_name, book_number, book_name, hadith_number, arabic_text, english_text, grade, read_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         collection = excluded.collection,
         collection_name = excluded.collection_name,
         book_number = excluded.book_number,
         book_name = excluded.book_name,
         hadith_number = excluded.hadith_number,
         arabic_text = excluded.arabic_text,
         english_text = excluded.english_text,
         grade = excluded.grade,
         read_at = excluded.read_at`,
      id,
      item.collection,
      item.collectionName || '',
      item.bookNumber,
      item.bookName || '',
      item.hadithNumber,
      item.arabicText,
      item.englishText,
      item.grade || '',
      now
    );
  } catch { /* non-fatal */ }
}

export function loadRecentHadiths(): RecentHadithItem[] {
  try {
    const rows = getDb().getAllSync<HadithRecentRow>('SELECT * FROM hadith_recent ORDER BY read_at DESC LIMIT 50');
    return rows.map((r) => ({
      id: r.id,
      collection: r.collection,
      collectionName: r.collection_name || undefined,
      bookNumber: r.book_number,
      bookName: r.book_name || undefined,
      hadithNumber: r.hadith_number,
      arabicText: r.arabic_text || '',
      englishText: r.english_text || '',
      grade: r.grade || undefined,
      readAt: r.read_at,
    }));
  } catch {
    return [];
  }
}

export function recordHadithRead(collection: string, bookNumber: string, hadithNumber: string): void {
  const id = `${collection}:${bookNumber}:${hadithNumber}`;
  try {
    getDb().runSync(
      `INSERT INTO hadith_read_markers (id, collection, read_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET read_at = excluded.read_at`,
      id,
      collection,
      Date.now()
    );
  } catch { /* non-fatal */ }
}

export function loadHadithReadCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  try {
    const rows = getDb().getAllSync<{ collection: string; count: number }>(
      'SELECT collection, COUNT(*) as count FROM hadith_read_markers GROUP BY collection'
    );
    for (const r of rows) out[r.collection] = r.count;
  } catch { /* ignore */ }
  return out;
}

export function loadHadithReadMarkers(): string[] {
  try {
    const rows = getDb().getAllSync<{ id: string }>('SELECT id FROM hadith_read_markers');
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

export function saveHadithProgress(collection: string, bookNumber: string, hadithNumber: string): void {
  recordHadithRead(collection, bookNumber, hadithNumber);
}

export function loadHadithProgress(): Record<string, number> {
  return loadHadithReadCounts();
}

/* ─── Fasting Storage (Native SQLite) ─────────────────────────── */

export interface FastingEntry {
  date: string; // YYYY-MM-DD
  fasting: boolean;
  type: 'ramadan' | 'voluntary' | 'qada';
  notes?: string;
  completedAt?: number;
}

export interface MissedFastItem {
  id: string;
  date: string;
  reason: string;
  madeUp: boolean;
  madeUpDate?: string;
  createdAt: number;
}

interface FastingEntryRow {
  date: string;
  fasting: number;
  type: string;
  notes: string | null;
  completed_at: number | null;
}

interface MissedFastRow {
  id: string;
  date: string;
  reason: string;
  made_up: number;
  made_up_date: string | null;
  created_at: number;
}

export function saveFastingEntry(entry: FastingEntry): void {
  try {
    getDb().runSync(
      `INSERT INTO fasting_entries (date, fasting, type, notes, completed_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         fasting = excluded.fasting,
         type = excluded.type,
         notes = excluded.notes,
         completed_at = excluded.completed_at`,
      entry.date,
      entry.fasting ? 1 : 0,
      entry.type,
      entry.notes || null,
      entry.completedAt || (entry.fasting ? Date.now() : null)
    );
  } catch { /* non-fatal */ }
}

export function getFastingEntry(date: string): FastingEntry | null {
  try {
    const row = getDb().getFirstSync<FastingEntryRow>('SELECT * FROM fasting_entries WHERE date = ?', date);
    if (!row) return null;
    return {
      date: row.date,
      fasting: row.fasting === 1,
      type: (row.type as 'ramadan' | 'voluntary' | 'qada') || 'voluntary',
      notes: row.notes || undefined,
      completedAt: row.completed_at || undefined,
    };
  } catch {
    return null;
  }
}

export function loadFastingHistory(): FastingEntry[] {
  try {
    const rows = getDb().getAllSync<FastingEntryRow>('SELECT * FROM fasting_entries ORDER BY date DESC');
    return rows.map((r) => ({
      date: r.date,
      fasting: r.fasting === 1,
      type: (r.type as 'ramadan' | 'voluntary' | 'qada') || 'voluntary',
      notes: r.notes || undefined,
      completedAt: r.completed_at || undefined,
    }));
  } catch {
    return [];
  }
}

export function saveMissedFast(item: MissedFastItem): void {
  try {
    getDb().runSync(
      `INSERT INTO missed_fasts (id, date, reason, made_up, made_up_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         date = excluded.date,
         reason = excluded.reason,
         made_up = excluded.made_up,
         made_up_date = excluded.made_up_date`,
      item.id,
      item.date,
      item.reason,
      item.madeUp ? 1 : 0,
      item.madeUpDate || null,
      item.createdAt || Date.now()
    );
  } catch { /* non-fatal */ }
}

export function deleteMissedFast(id: string): void {
  getDb().runSync('DELETE FROM missed_fasts WHERE id = ?', id);
}

export function loadMissedFasts(): MissedFastItem[] {
  try {
    const rows = getDb().getAllSync<MissedFastRow>('SELECT * FROM missed_fasts ORDER BY created_at DESC');
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      reason: r.reason,
      madeUp: r.made_up === 1,
      madeUpDate: r.made_up_date || undefined,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export function toggleMissedFastMadeUp(id: string, madeUp: boolean): void {
  try {
    const madeUpDate = madeUp ? new Date().toISOString().slice(0, 10) : null;
    getDb().runSync('UPDATE missed_fasts SET made_up = ?, made_up_date = ? WHERE id = ?', madeUp ? 1 : 0, madeUpDate, id);
  } catch { /* non-fatal */ }
}

/* ─── Zakat Storage (Native SQLite) ───────────────────────────── */

export interface ZakatCalculation {
  id: string;
  date: string;
  currency: string;
  totalWealth: number;
  zakatDue: number;
  nisabStandard: 'gold' | 'silver';
  breakdown: {
    cash: number;
    gold: number;
    silver: number;
    investments: number;
    other: number;
    liabilities: number;
  };
  createdAt: number;
}

interface ZakatHistoryRow {
  id: string;
  date: string;
  currency: string;
  total_wealth: number;
  zakat_due: number;
  nisab_standard: string;
  breakdown: string;
  created_at: number;
}

export function saveZakatCalculation(calc: ZakatCalculation): void {
  try {
    getDb().runSync(
      `INSERT INTO zakat_history (id, date, currency, total_wealth, zakat_due, nisab_standard, breakdown, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         date = excluded.date,
         currency = excluded.currency,
         total_wealth = excluded.total_wealth,
         zakat_due = excluded.zakat_due,
         nisab_standard = excluded.nisab_standard,
         breakdown = excluded.breakdown`,
      calc.id,
      calc.date,
      calc.currency,
      calc.totalWealth,
      calc.zakatDue,
      calc.nisabStandard,
      JSON.stringify(calc.breakdown),
      calc.createdAt || Date.now()
    );
  } catch { /* non-fatal */ }
}

export function loadZakatCalculations(): ZakatCalculation[] {
  try {
    const rows = getDb().getAllSync<ZakatHistoryRow>('SELECT * FROM zakat_history ORDER BY created_at DESC');
    return rows.map((r) => {
      let breakdown = { cash: 0, gold: 0, silver: 0, investments: 0, other: 0, liabilities: 0 };
      try {
        breakdown = JSON.parse(r.breakdown);
      } catch { /* ignore */ }
      return {
        id: r.id,
        date: r.date,
        currency: r.currency,
        totalWealth: r.total_wealth,
        zakatDue: r.zakat_due,
        nisabStandard: (r.nisab_standard as 'gold' | 'silver') || 'gold',
        breakdown,
        createdAt: r.created_at,
      };
    });
  } catch {
    return [];
  }
}

export function deleteZakatCalculation(id: string): void {
  try {
    getDb().runSync('DELETE FROM zakat_history WHERE id = ?', id);
  } catch { /* non-fatal */ }
}

/* ─── Women's Worship Storage (Native SQLite) ────────────────── */

export type PurityStatus = 'menstruating' | 'spotting' | 'pure';

export interface PeriodEntry {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  notes?: string;
  purityDays?: Record<string, PurityStatus>;
  createdAt: number;
}

export interface NifasEntry {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  notes?: string;
  createdAt: number;
}

interface PeriodEntryRow {
  id: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  purity_days: string | null;
  created_at: number;
}

interface NifasEntryRow {
  id: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: number;
}

export function savePeriodEntry(entry: PeriodEntry): void {
  try {
    getDb().runSync(
      `INSERT INTO period_entries (id, start_date, end_date, notes, purity_days, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         start_date = excluded.start_date,
         end_date = excluded.end_date,
         notes = excluded.notes,
         purity_days = excluded.purity_days`,
      entry.id,
      entry.startDate,
      entry.endDate || null,
      entry.notes || null,
      entry.purityDays ? JSON.stringify(entry.purityDays) : null,
      entry.createdAt || Date.now()
    );
  } catch { /* non-fatal */ }
}

export function deletePeriodEntry(id: string): void {
  try {
    getDb().runSync('DELETE FROM period_entries WHERE id = ?', id);
  } catch { /* non-fatal */ }
}

export function loadPeriodEntries(): PeriodEntry[] {
  try {
    const rows = getDb().getAllSync<PeriodEntryRow>('SELECT * FROM period_entries ORDER BY start_date DESC');
    return rows.map((r) => {
      let purityDays: Record<string, PurityStatus> | undefined;
      if (r.purity_days) {
        try {
          purityDays = JSON.parse(r.purity_days);
        } catch { /* ignore */ }
      }
      return {
        id: r.id,
        startDate: r.start_date,
        endDate: r.end_date || undefined,
        notes: r.notes || undefined,
        purityDays,
        createdAt: r.created_at,
      };
    });
  } catch {
    return [];
  }
}

export function saveNifasEntry(entry: NifasEntry): void {
  try {
    getDb().runSync(
      `INSERT INTO nifas_entries (id, start_date, end_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         start_date = excluded.start_date,
         end_date = excluded.end_date,
         notes = excluded.notes`,
      entry.id,
      entry.startDate,
      entry.endDate || null,
      entry.notes || null,
      entry.createdAt || Date.now()
    );
  } catch { /* non-fatal */ }
}

export function deleteNifasEntry(id: string): void {
  try {
    getDb().runSync('DELETE FROM nifas_entries WHERE id = ?', id);
  } catch { /* non-fatal */ }
}

export function loadNifasEntries(): NifasEntry[] {
  try {
    const rows = getDb().getAllSync<NifasEntryRow>('SELECT * FROM nifas_entries ORDER BY start_date DESC');
    return rows.map((r) => ({
      id: r.id,
      startDate: r.start_date,
      endDate: r.end_date || undefined,
      notes: r.notes || undefined,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

/* ─── Study Tools (tags & highlights) ──────────────────────────── */

export interface StudyTag {
  id: string;
  surah: number;
  ayah: number;
  tag: string;
  createdAt: number;
}

export interface VerseHighlight {
  id: string;
  surah: number;
  ayah: number;
  color: string;
  createdAt: number;
}

interface StudyTagRow {
  id: string;
  surah: number;
  ayah: number;
  tag: string;
  created_at: number;
}

interface VerseHighlightRow {
  id: string;
  surah: number;
  ayah: number;
  color: string;
  created_at: number;
}

export function addStudyTag(surah: number, ayah: number, tag: string): StudyTag | false {
  try {
    const id = `${surah}:${ayah}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();
    getDb().runSync(
      `INSERT INTO study_tags (id, surah, ayah, tag, created_at) VALUES (?, ?, ?, ?, ?)`,
      id, surah, ayah, tag, createdAt
    );
    return { id, surah, ayah, tag, createdAt };
  } catch {
    return false;
  }
}

export function removeStudyTag(id: string): boolean {
  try {
    getDb().runSync('DELETE FROM study_tags WHERE id = ?', id);
    return true;
  } catch {
    return false;
  }
}

export function getStudyTagsForAyah(surah: number, ayah: number): StudyTag[] {
  try {
    const rows = getDb().getAllSync<StudyTagRow>(
      'SELECT * FROM study_tags WHERE surah = ? AND ayah = ? ORDER BY created_at DESC',
      surah, ayah
    );
    return rows.map((r) => ({
      id: r.id,
      surah: r.surah,
      ayah: r.ayah,
      tag: r.tag,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export function getAllStudyTags(): StudyTag[] {
  try {
    const rows = getDb().getAllSync<StudyTagRow>('SELECT * FROM study_tags ORDER BY created_at DESC');
    return rows.map((r) => ({
      id: r.id,
      surah: r.surah,
      ayah: r.ayah,
      tag: r.tag,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export function addVerseHighlight(surah: number, ayah: number, color: string): VerseHighlight | false {
  try {
    const id = `${surah}:${ayah}:${Date.now()}`;
    const createdAt = Date.now();
    // Remove existing highlight for this ayah first
    getDb().runSync('DELETE FROM verse_highlights WHERE surah = ? AND ayah = ?', surah, ayah);
    getDb().runSync(
      `INSERT INTO verse_highlights (id, surah, ayah, color, created_at) VALUES (?, ?, ?, ?, ?)`,
      id, surah, ayah, color, createdAt
    );
    return { id, surah, ayah, color, createdAt };
  } catch {
    return false;
  }
}

export function removeVerseHighlight(surah: number, ayah: number): boolean {
  try {
    getDb().runSync('DELETE FROM verse_highlights WHERE surah = ? AND ayah = ?', surah, ayah);
    return true;
  } catch {
    return false;
  }
}

export function getVerseHighlight(surah: number, ayah: number): VerseHighlight | null {
  try {
    const row = getDb().getFirstSync<VerseHighlightRow>(
      'SELECT * FROM verse_highlights WHERE surah = ? AND ayah = ?',
      surah, ayah
    );
    if (!row) return null;
    return {
      id: row.id,
      surah: row.surah,
      ayah: row.ayah,
      color: row.color,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}

export function getAllVerseHighlights(): VerseHighlight[] {
  try {
    const rows = getDb().getAllSync<VerseHighlightRow>('SELECT * FROM verse_highlights ORDER BY created_at DESC');
    return rows.map((r) => ({
      id: r.id,
      surah: r.surah,
      ayah: r.ayah,
      color: r.color,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

/* ─── Women's Data Privacy (clear/delete) ────────────────────── */

/** Delete ALL women-scoped data: cycle/period, purity, nifas, and qada
 *  missed-fasts recorded as "Menstruation / Post-natal". On-device only. */
export function clearWomenData(): void {
  getDb().withTransactionSync(() => {
    getDb().runSync('DELETE FROM period_entries');
    getDb().runSync('DELETE FROM nifas_entries');
    const missed = loadMissedFasts();
    for (const item of missed) {
      const reason = (item.reason || '').toLowerCase();
      if (reason.includes('menstru') || reason.includes('post-natal') || reason.includes('postnatal')) {
        deleteMissedFast(item.id);
      }
    }
    const remainingPeriods = getDb().getAllSync('SELECT id FROM period_entries').length;
    if (remainingPeriods > 0) {
      throw new Error(`Failed to clear women data: ${remainingPeriods} period entries remain`);
    }
    const remainingNifas = getDb().getAllSync('SELECT id FROM nifas_entries').length;
    if (remainingNifas > 0) {
      throw new Error(`Failed to clear women data: ${remainingNifas} nifas entries remain`);
    }
    // Verify with a direct query. loadMissedFasts() swallows SELECT errors and returns [],
    // which would let a failed clear report success and the caller wipe the PIN.
    const remainingWomenFasts = getDb().getAllSync<{ id: string }>(
      "SELECT id FROM missed_fasts WHERE lower(reason) LIKE '%menstru%' OR lower(reason) LIKE '%post-natal%' OR lower(reason) LIKE '%postnatal%'"
    ).length;
    if (remainingWomenFasts > 0) {
      throw new Error(`Failed to clear women data: ${remainingWomenFasts} missed fast entries remain`);
    }
  });
}

/** Delete ONLY cycle/period history (keeps purity/ghusl/nifas/qada). */
export function clearCycleHistory(): void {
  getDb().withTransactionSync(() => {
    getDb().runSync('DELETE FROM period_entries');
    const remainingPeriods = getDb().getAllSync('SELECT id FROM period_entries').length;
    if (remainingPeriods > 0) {
      throw new Error(`Failed to clear cycle history: ${remainingPeriods} period entries remain`);
    }
  });
}



