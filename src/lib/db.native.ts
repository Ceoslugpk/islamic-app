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
  database.execSync(`
    CREATE TABLE IF NOT EXISTS prayer_cache (
      date TEXT PRIMARY KEY,
      location TEXT,
      method INTEGER,
      payload TEXT,
      cached_at INTEGER
    );
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
  `);
}


interface PrayerCacheRow { payload: string }
interface SalahRow { date: string; prayer: string; completed: number }
interface QuranCacheRow { payload: string }

export function savePrayerCache(date: string, location: string, method: number, payload: object) {
  try {
    getDb().runSync(
      'INSERT OR REPLACE INTO prayer_cache (date, location, method, payload, cached_at) VALUES (?, ?, ?, ?, ?)',
      date, location, method, JSON.stringify(payload), Date.now()
    );
  } catch { /* non-fatal */ }
}

export function loadPrayerCache(date: string, location: string, method: number): { payload: string } | null {
  try {
    const row = getDb().getFirstSync<PrayerCacheRow>(
      'SELECT payload FROM prayer_cache WHERE date = ? AND location = ? AND method = ?',
      date, location, method
    );
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

export function saveQuranCache(key: string, payload: object) {
  try {
    getDb().runSync(
      'INSERT OR REPLACE INTO quran_cache (key, payload, cached_at) VALUES (?, ?, ?)',
      key, JSON.stringify(payload), Date.now()
    );
  } catch { /* non-fatal */ }
}

export function loadQuranCache<T>(key: string): T | null {
  try {
    const row = getDb().getFirstSync<QuranCacheRow>('SELECT payload FROM quran_cache WHERE key = ?', key);
    return row ? (JSON.parse(row.payload) as T) : null;
  } catch {
    return null;
  }
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

export function saveLastReadPosition(surah: number, ayah: number, surahName?: string): void {
  const data: LastReadPosition = { surah, ayah, surahName, updatedAt: Date.now() };
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
  return loadQuranCache<RecentlyPlayedItem[]>('recent-audio') ?? [];
}

export function savePlaylist(playlist: Playlist): void {
  const list = loadPlaylists();
  const filtered = list.filter((p) => p.id !== playlist.id);
  const updated = [...filtered, playlist];
  saveQuranCache('playlists', updated);
}

export function loadPlaylists(): Playlist[] {
  return loadQuranCache<Playlist[]>('playlists') ?? [];
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
  return loadQuranCache<PlaylistItem[]>('audio-queue') ?? [];
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
  const loaded = loadQuranCache<AudioSettings>('audio-settings');
  return loaded ? { ...DEFAULT_AUDIO_SETTINGS, ...loaded } : DEFAULT_AUDIO_SETTINGS;
}

interface TasbihRow { id: string; count: number }
interface PlanRow { day: number; completed: number }
interface HifzRow { surah: number; status: string }

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

export function loadTasbihCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  try {
    const rows = getDb().getAllSync<TasbihRow>('SELECT id, count FROM tasbih_entries');
    for (const r of rows) out[r.id] = r.count;
  } catch { /* ignore */ }
  return out;
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
  try {
    getDb().runSync('DELETE FROM missed_fasts WHERE id = ?', id);
  } catch { /* non-fatal */ }
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



