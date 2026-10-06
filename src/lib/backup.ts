/**
 * Backup & Restore — fully local, versioned, no backend.
 *
 * Format (v1):
 * {
 *   app: 'islamic',
 *   formatVersion: 1,
 *   exportedAt: ISO string,
 *   appVersion: string,        // human-readable app version at export
 *   data: {
 *     tables: Record<tableName, rows[]>,   // user tables only (no caches)
 *     storage: Record<key, value>,          // AsyncStorage / localStorage
 *   }
 * }
 *
 * Cache/disposable data is deliberately EXCLUDED: prayer_cache, quran_cache
 * text & audio download entries, hadith API caches, preload state, etc.
 */
import { Platform } from 'react-native';

export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_MIME = 'application/json';

export interface BackupPayload {
  app: 'islamic';
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  data: {
    tables: Record<string, unknown[]>;
    storage: Record<string, string>;
  };
}

/** Real SQLite tables to back up in salah.db. */
export const SQLITE_USER_TABLES = [
  'salah_entries',
  'tasbih_entries',
  'tasbih_daily',
  'plan_entries',
  'hifz_entries',
  'hadith_saved',
  'hadith_recent',
  'hadith_read_markers',
  'fasting_entries',
  'missed_fasts',
  'zakat_history',
  'period_entries',
  'nifas_entries',
  'study_tags',
  'verse_highlights',
] as const;

/**
 * Virtual user tables: user-generated data stored inside quran_cache
 * (native) or webKV (web) under specific keys. Backed up as first-class tables.
 */
export const VIRTUAL_USER_TABLES = [
  { table: 'bookmarks', cacheKey: 'bookmarks', isSingleObject: false },
  { table: 'notes', cacheKey: 'notes', isSingleObject: false },
  { table: 'playlists', cacheKey: 'playlists', isSingleObject: false },
  { table: 'audio_queue', cacheKey: 'audio-queue', isSingleObject: false },
  { table: 'audio_settings', cacheKey: 'audio-settings', isSingleObject: true },
] as const;

/** Complete set of user tables included in backups. */
export const USER_TABLES = [
  ...SQLITE_USER_TABLES,
  ...VIRTUAL_USER_TABLES.map((v) => v.table),
] as const;

/**
 * Storage keys included (settings, reading progress, vocab, search history, etc.).
 * Disposable caches (ayah-of-the-day-, hadith_of_day_, etc.) are excluded.
 */
export const STORAGE_PREFIXES = [
  'islamic-settings',
  'settings',
  'quran-',
  'audio-',
  'hifz-',
  'playlist-',
  'tafsir-',
  'vocab-',
  '@search_history_',
] as const;

/** Specific keys to exclude even if their prefix matches STORAGE_PREFIXES. */
export const EXCLUDED_STORAGE_KEYS = [
  'quran-audio-downloads',
  'quran_audio_arabic_reciters_cache',
] as const;

/** Test whether a storage key is on the allowed list for export and import. */
export function isAllowedStorageKey(key: string): boolean {
  if (typeof key !== 'string' || !key) return false;
  if (EXCLUDED_STORAGE_KEYS.some((ex) => key === ex || key.includes(ex))) return false;
  return STORAGE_PREFIXES.some((p) => key.startsWith(p));
}

/**
 * Sanitize export storage: strip womenPinHash and womenLockEnabled from islamic-settings.
 * The PIN must never leave the device.
 */
export function sanitizeExportStorage(storage: Record<string, string>): Record<string, string> {
  const out = { ...storage };
  if (typeof out['islamic-settings'] === 'string') {
    try {
      const parsed = JSON.parse(out['islamic-settings']);
      if (parsed && typeof parsed === 'object') {
        delete parsed.womenPinHash;
        delete parsed.womenLockEnabled;
        out['islamic-settings'] = JSON.stringify(parsed);
      }
    } catch {
      // non-fatal
    }
  }
  return out;
}

/**
 * Filter and validate storage keys on import.
 * Only allows keys that match STORAGE_PREFIXES and are not in EXCLUDED_STORAGE_KEYS.
 * Also validates that islamic-settings (if present) is parseable JSON object,
 * and strips any womenPinHash / womenLockEnabled as defense-in-depth.
 */
export function filterAllowedStorage(storage: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [key, val] of Object.entries(storage)) {
    if (!isAllowedStorageKey(key) || typeof val !== 'string') {
      continue;
    }
    if (key === 'islamic-settings') {
      try {
        const parsed = JSON.parse(val);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          continue; // reject malformed settings blob
        }
        delete parsed.womenPinHash;
        delete parsed.womenLockEnabled;
        filtered[key] = JSON.stringify(parsed);
      } catch {
        // reject malformed JSON
        continue;
      }
    } else {
      filtered[key] = val;
    }
  }
  return filtered;
}

/** User-friendly singular/plural labels for table summary output. */
export const TABLE_DISPLAY_NAMES: Record<string, { singular: string; plural: string }> = {
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

export interface BackupDescription {
  tables: string;
  exportedAt: string;
  appVersion: string;
  tableCounts: Record<string, number>;
  totalRecords: number;
}

export async function getAppVersion(): Promise<string> {
  try {
    const appJson = require('../../app.json');
    return appJson?.expo?.version || appJson?.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/**
 * Compare two semver-like version strings. Returns true if candidate > current.
 */
export function isNewerVersion(candidate: string | undefined, current: string | undefined): boolean {
  if (!candidate || !current || candidate === 'unknown' || current === 'unknown') {
    return false;
  }
  const parseParts = (v: string): number[] => {
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

/** Format table counts into a human-readable list: "12 salah entries, 5 bookmarks, 3 notes...". */
export function formatTableSummary(tableCounts: Record<string, number>): string {
  const parts: string[] = [];
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

/* ---------------------------- Native (SQLite) ---------------------------- */

async function exportNativeTables(): Promise<Record<string, unknown[]>> {
  const SQLite = require('expo-sqlite');
  const db = SQLite.openDatabaseSync('salah.db');
  const out: Record<string, unknown[]> = {};

  // 1. Export real SQLite tables
  for (const table of SQLITE_USER_TABLES) {
    try {
      out[table] = db.getAllSync(`SELECT * FROM ${table}`);
    } catch {
      // Table may not exist on older installs — skip gracefully.
      out[table] = [];
    }
  }

  // 2. Export virtual user data from quran_cache (bookmarks, notes, etc.)
  for (const { table, cacheKey, isSingleObject } of VIRTUAL_USER_TABLES) {
    try {
      const row = db.getFirstSync(
        'SELECT payload FROM quran_cache WHERE key = ?',
        cacheKey
      ) as { payload: string } | null;
      if (row && row.payload) {
        const parsed = JSON.parse(row.payload);
        if (isSingleObject) {
          out[table] = parsed && typeof parsed === 'object' ? [parsed] : [];
        } else {
          out[table] = Array.isArray(parsed) ? parsed : [];
        }
      } else {
        out[table] = [];
      }
    } catch {
      out[table] = [];
    }
  }

  return out;
}

async function importNativeTables(tables: Record<string, unknown[]>): Promise<void> {
  const SQLite = require('expo-sqlite');
  const db = SQLite.openDatabaseSync('salah.db');

  // Wipe user tables, then re-insert inside a single transaction for atomicity & integrity.
  db.withTransactionSync(() => {
    // 1. Wipe real SQLite tables
    for (const table of SQLITE_USER_TABLES) {
      try {
        db.execSync(`DELETE FROM ${table}`);
      } catch {
        // ignore missing table
      }
    }

    // 2. Insert rows into real SQLite tables
    for (const table of SQLITE_USER_TABLES) {
      const rows = tables[table] || [];
      for (const row of rows) {
        try {
          const rowObj = row as Record<string, unknown>;
          const cols = Object.keys(rowObj);
          if (cols.length === 0) continue;
          const placeholders = cols.map(() => '?').join(', ');
          const values = cols.map((c) => rowObj[c]);
          db.runSync(
            `INSERT OR REPLACE INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
            ...values
          );
        } catch {
          // Skip a row that violates constraints; keep the rest intact.
        }
      }
    }

    // 3. Virtual user tables stored in quran_cache
    for (const { table, cacheKey, isSingleObject } of VIRTUAL_USER_TABLES) {
      if (tables[table] !== undefined) {
        const rows = tables[table];
        if (Array.isArray(rows)) {
          try {
            if (isSingleObject) {
              const val = rows[0] ? JSON.stringify(rows[0]) : '{}';
              db.runSync(
                'INSERT OR REPLACE INTO quran_cache (key, payload, cached_at) VALUES (?, ?, ?)',
                cacheKey, val, Date.now()
              );
            } else {
              db.runSync(
                'INSERT OR REPLACE INTO quran_cache (key, payload, cached_at) VALUES (?, ?, ?)',
                cacheKey, JSON.stringify(rows), Date.now()
              );
            }
          } catch {
            // non-fatal per-item error
          }
        }
      }
    }
  });

  return Promise.resolve();
}

/* ------------------------------- Web (localStorage) ------------------------------ */

async function exportWebStorage(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (typeof localStorage === 'undefined') return out;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (isAllowedStorageKey(key)) {
      const val = localStorage.getItem(key);
      if (val !== null) out[key] = val;
    }
  }
  return sanitizeExportStorage(out);
}

async function importWebStorage(storage: Record<string, string>): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const filtered = filterAllowedStorage(storage);
  for (const [key, val] of Object.entries(filtered)) {
    try {
      localStorage.setItem(key, val);
    } catch {
      // quota etc. — skip
    }
  }
}

async function exportNativeStorage(): Promise<Record<string, string>> {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const keys: string[] = await AsyncStorage.getAllKeys();
  const wanted = keys.filter((k: string) => isAllowedStorageKey(k));
  const entries: [string, string | null][] = await AsyncStorage.multiGet(wanted);
  const out: Record<string, string> = {};
  for (const [k, v] of entries) if (v !== null) out[k] = v;
  return sanitizeExportStorage(out);
}

async function importNativeStorage(storage: Record<string, string>): Promise<void> {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const filtered = filterAllowedStorage(storage);
  const entries = Object.entries(filtered);
  if (entries.length > 0) {
    await AsyncStorage.multiSet(entries);
  }
}

async function exportWebTables(): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  const db = require('./db');

  // salah_entries
  try {
    const history = db.getSalahHistory(3650);
    const salahRows: unknown[] = [];
    for (const [date, prayers] of Object.entries(history as Record<string, Record<string, boolean>>)) {
      for (const [prayer, completed] of Object.entries(prayers)) {
        salahRows.push({ date, prayer, completed: completed ? 1 : 0 });
      }
    }
    out['salah_entries'] = salahRows;
  } catch {
    out['salah_entries'] = [];
  }

  // tasbih_entries
  try {
    const counts = db.loadTasbihCounts();
    out['tasbih_entries'] = Object.entries(counts).map(([id, count]) => ({ id, count }));
  } catch {
    out['tasbih_entries'] = [];
  }

  // tasbih_daily
  try {
    const { webKV } = require('./webStorage');
    const rows = webKV.getAll('tasbih:daily:');
    out['tasbih_daily'] = rows.map((r: { key: string; value: string }) => {
      const parts = r.key.split(':');
      const date = parts[2] || '';
      try {
        const p = JSON.parse(r.value);
        return { date, total: p.total || 0, updated_at: p.updated_at || Date.now() };
      } catch {
        return { date, total: 0, updated_at: Date.now() };
      }
    });
  } catch {
    out['tasbih_daily'] = [];
  }

  // plan_entries
  try {
    const { webKV } = require('./webStorage');
    const rows = webKV.getAll('plan:');
    out['plan_entries'] = rows.map((r: { key: string; value: string }) => {
      const parts = r.key.split(':');
      const plan_id = parts[1] || '';
      const day = parseInt(parts[2], 10) || 0;
      let completed = 0;
      let completed_at = null;
      try {
        const p = JSON.parse(r.value);
        completed = p.completed ? 1 : 0;
        completed_at = p.completed_at;
      } catch {}
      return { plan_id, day, completed, completed_at };
    });
  } catch {
    out['plan_entries'] = [];
  }

  // hifz_entries
  try {
    const hifz = db.loadHifzStatuses();
    out['hifz_entries'] = Object.entries(hifz).map(([surah, status]) => ({
      surah: Number(surah),
      status,
    }));
  } catch {
    out['hifz_entries'] = [];
  }

  // hadith_saved
  try {
    out['hadith_saved'] = db.loadSavedHadiths().map((h: any) => ({
      id: h.id,
      collection: h.collection,
      collection_name: h.collectionName,
      book_number: h.bookNumber,
      book_name: h.bookName,
      hadith_number: h.hadithNumber,
      arabic_text: h.arabicText,
      english_text: h.englishText,
      grade: h.grade,
      saved_at: h.savedAt,
    }));
  } catch {
    out['hadith_saved'] = [];
  }

  // hadith_recent
  try {
    out['hadith_recent'] = db.loadRecentHadiths().map((h: any) => ({
      id: h.id,
      collection: h.collection,
      collection_name: h.collectionName,
      book_number: h.bookNumber,
      book_name: h.bookName,
      hadith_number: h.hadithNumber,
      arabic_text: h.arabicText,
      english_text: h.englishText,
      grade: h.grade,
      read_at: h.readAt,
    }));
  } catch {
    out['hadith_recent'] = [];
  }

  // hadith_read_markers
  try {
    out['hadith_read_markers'] = db.loadHadithReadMarkers().map((id: string) => ({
      id,
      collection: id.split(':')[0] || '',
      read_at: Date.now(),
    }));
  } catch {
    out['hadith_read_markers'] = [];
  }

  // fasting_entries
  try {
    out['fasting_entries'] = db.loadFastingHistory().map((f: any) => ({
      date: f.date,
      fasting: f.fasting ? 1 : 0,
      type: f.type,
      notes: f.notes,
      completed_at: f.completedAt,
    }));
  } catch {
    out['fasting_entries'] = [];
  }

  // missed_fasts
  try {
    out['missed_fasts'] = db.loadMissedFasts().map((m: any) => ({
      id: m.id,
      date: m.date,
      reason: m.reason,
      made_up: m.madeUp ? 1 : 0,
      made_up_date: m.madeUpDate,
      created_at: m.createdAt,
    }));
  } catch {
    out['missed_fasts'] = [];
  }

  // zakat_history
  try {
    out['zakat_history'] = db.loadZakatCalculations().map((z: any) => ({
      id: z.id,
      date: z.date,
      currency: z.currency,
      total_wealth: z.totalWealth,
      zakat_due: z.zakatDue,
      nisab_standard: z.nisabStandard,
      breakdown: JSON.stringify(z.breakdown),
      created_at: z.createdAt,
    }));
  } catch {
    out['zakat_history'] = [];
  }

  // period_entries
  try {
    out['period_entries'] = db.loadPeriodEntries().map((p: any) => ({
      id: p.id,
      start_date: p.startDate,
      end_date: p.endDate || null,
      notes: p.notes || null,
      purity_days: p.purityDays ? JSON.stringify(p.purityDays) : null,
      created_at: p.createdAt,
    }));
  } catch {
    out['period_entries'] = [];
  }

  // nifas_entries
  try {
    out['nifas_entries'] = db.loadNifasEntries().map((n: any) => ({
      id: n.id,
      start_date: n.startDate,
      end_date: n.endDate || null,
      notes: n.notes || null,
      created_at: n.createdAt,
    }));
  } catch {
    out['nifas_entries'] = [];
  }

  // study_tags
  try {
    out['study_tags'] = db.getAllStudyTags().map((t: any) => ({
      id: t.id,
      surah: t.surah,
      ayah: t.ayah,
      tag: t.tag,
      created_at: t.createdAt,
    }));
  } catch {
    out['study_tags'] = [];
  }

  // verse_highlights
  try {
    out['verse_highlights'] = db.getAllVerseHighlights().map((h: any) => ({
      id: h.id,
      surah: h.surah,
      ayah: h.ayah,
      color: h.color,
      created_at: h.createdAt,
    }));
  } catch {
    out['verse_highlights'] = [];
  }

  // bookmarks
  try {
    const raw = db.loadQuranCache('bookmarks');
    out['bookmarks'] = Array.isArray(raw) ? raw : [];
  } catch {
    out['bookmarks'] = [];
  }

  // notes
  try {
    const raw = db.loadQuranCache('notes');
    out['notes'] = Array.isArray(raw) ? raw : [];
  } catch {
    out['notes'] = [];
  }

  // playlists
  try {
    const raw = db.loadPlaylists();
    out['playlists'] = Array.isArray(raw) ? raw : [];
  } catch {
    out['playlists'] = [];
  }

  // audio_queue
  try {
    const raw = db.loadAudioQueue();
    out['audio_queue'] = Array.isArray(raw) ? raw : [];
  } catch {
    out['audio_queue'] = [];
  }

  // audio_settings
  try {
    const raw = db.loadAudioSettings();
    out['audio_settings'] = raw ? [raw] : [];
  } catch {
    out['audio_settings'] = [];
  }

  return out;
}

async function importWebTables(tables: Record<string, unknown[]>): Promise<void> {
  const db = require('./db');
  const { webKV } = require('./webStorage');

  // Wipe existing user keys in webKV
  const userPrefixes = [
    'salah:', 'tasbih:', 'plan:', 'hifz:', 'hadith:saved:', 'hadith:recent:',
    'hadith:read:', 'fasting:entry:', 'fasting:missed:', 'zakat:history:',
    'women:period:', 'women:nifas:', 'study:tag:', 'study:highlight:',
  ];
  for (const prefix of userPrefixes) {
    const existing = webKV.getAll(prefix);
    for (const { key } of existing) {
      webKV.delete(key);
    }
  }

  // Restore salah_entries
  for (const row of tables['salah_entries'] || []) {
    const r = row as any;
    if (r && r.date && r.prayer) {
      db.markSalahCompleted(r.date, r.prayer, Boolean(r.completed));
    }
  }

  // Restore tasbih_entries
  for (const row of tables['tasbih_entries'] || []) {
    const r = row as any;
    if (r && r.id !== undefined && typeof r.count === 'number') {
      db.saveTasbihCount(r.id, r.count);
    }
  }

  // Restore tasbih_daily
  for (const row of tables['tasbih_daily'] || []) {
    const r = row as any;
    if (r && r.date) {
      webKV.set(
        `tasbih:daily:${r.date}`,
        JSON.stringify({ total: r.total || 0, updated_at: r.updated_at || Date.now() })
      );
    }
  }

  // Restore plan_entries
  for (const row of tables['plan_entries'] || []) {
    const r = row as any;
    if (r && r.plan_id && r.day !== undefined) {
      db.savePlanDay(r.plan_id, Number(r.day), Boolean(r.completed));
    }
  }

  // Restore hifz_entries
  for (const row of tables['hifz_entries'] || []) {
    const r = row as any;
    if (r && r.surah && r.status) {
      db.saveHifzStatus(Number(r.surah), r.status);
    }
  }

  // Restore hadith_saved
  for (const row of tables['hadith_saved'] || []) {
    const r = row as any;
    if (r && r.id) {
      db.saveSavedHadith({
        id: r.id,
        collection: r.collection,
        collectionName: r.collection_name,
        bookNumber: r.book_number,
        bookName: r.book_name,
        hadithNumber: r.hadith_number,
        arabicText: r.arabic_text,
        englishText: r.english_text,
        grade: r.grade,
        savedAt: r.saved_at,
      });
    }
  }

  // Restore hadith_recent
  for (const row of tables['hadith_recent'] || []) {
    const r = row as any;
    if (r && r.id) {
      db.saveRecentHadith({
        id: r.id,
        collection: r.collection,
        collectionName: r.collection_name,
        bookNumber: r.book_number,
        bookName: r.book_name,
        hadithNumber: r.hadith_number,
        arabicText: r.arabic_text,
        englishText: r.english_text,
        grade: r.grade,
      });
    }
  }

  // Restore hadith_read_markers
  for (const row of tables['hadith_read_markers'] || []) {
    const r = row as any;
    if (r && r.id) {
      const parts = r.id.split(':');
      if (parts.length >= 3) {
        db.recordHadithRead(parts[0], parts[1], parts[2]);
      }
    }
  }

  // Restore fasting_entries
  for (const row of tables['fasting_entries'] || []) {
    const r = row as any;
    if (r && r.date) {
      db.saveFastingEntry({
        date: r.date,
        fasting: Boolean(r.fasting),
        type: r.type || 'voluntary',
        notes: r.notes,
        completedAt: r.completed_at,
      });
    }
  }

  // Restore missed_fasts
  for (const row of tables['missed_fasts'] || []) {
    const r = row as any;
    if (r && r.id) {
      db.saveMissedFast({
        id: r.id,
        date: r.date,
        reason: r.reason,
        madeUp: Boolean(r.made_up),
        madeUpDate: r.made_up_date,
        createdAt: r.created_at || Date.now(),
      });
    }
  }

  // Restore zakat_history
  for (const row of tables['zakat_history'] || []) {
    const r = row as any;
    if (r && r.id) {
      let breakdown = { cash: 0, gold: 0, silver: 0, investments: 0, other: 0, liabilities: 0 };
      if (typeof r.breakdown === 'string') {
        try { breakdown = JSON.parse(r.breakdown); } catch {}
      } else if (r.breakdown && typeof r.breakdown === 'object') {
        breakdown = r.breakdown;
      }
      db.saveZakatCalculation({
        id: r.id,
        date: r.date,
        currency: r.currency,
        totalWealth: r.total_wealth,
        zakatDue: r.zakat_due,
        nisabStandard: r.nisab_standard || 'silver',
        breakdown,
        createdAt: r.created_at || Date.now(),
      });
    }
  }

  // Restore period_entries
  for (const row of tables['period_entries'] || []) {
    const r = row as any;
    if (r && r.id) {
      let purityDays: any = undefined;
      if (typeof r.purity_days === 'string') {
        try { purityDays = JSON.parse(r.purity_days); } catch {}
      } else if (r.purity_days && typeof r.purity_days === 'object') {
        purityDays = r.purity_days;
      }
      db.savePeriodEntry({
        id: r.id,
        startDate: r.start_date,
        endDate: r.end_date,
        notes: r.notes,
        purityDays,
        createdAt: r.created_at || Date.now(),
      });
    }
  }

  // Restore nifas_entries
  for (const row of tables['nifas_entries'] || []) {
    const r = row as any;
    if (r && r.id) {
      db.saveNifasEntry({
        id: r.id,
        startDate: r.start_date,
        endDate: r.end_date,
        notes: r.notes,
        createdAt: r.created_at || Date.now(),
      });
    }
  }

  // Restore study_tags
  for (const row of tables['study_tags'] || []) {
    const r = row as any;
    if (r && r.tag && r.surah && r.ayah) {
      db.addStudyTag(Number(r.surah), Number(r.ayah), r.tag);
    }
  }

  // Restore verse_highlights
  for (const row of tables['verse_highlights'] || []) {
    const r = row as any;
    if (r && r.color && r.surah && r.ayah) {
      db.addVerseHighlight(Number(r.surah), Number(r.ayah), r.color);
    }
  }

  // Restore bookmarks
  if (tables['bookmarks'] !== undefined && Array.isArray(tables['bookmarks'])) {
    db.saveQuranCache('bookmarks', tables['bookmarks']);
  }

  // Restore notes
  if (tables['notes'] !== undefined && Array.isArray(tables['notes'])) {
    db.saveQuranCache('notes', tables['notes']);
  }

  // Restore playlists
  if (tables['playlists'] !== undefined && Array.isArray(tables['playlists'])) {
    for (const pl of tables['playlists'] as any[]) {
      if (pl && pl.id) db.savePlaylist(pl);
    }
  }

  // Restore audio_queue
  if (tables['audio_queue'] !== undefined && Array.isArray(tables['audio_queue'])) {
    db.saveAudioQueue(tables['audio_queue']);
  }

  // Restore audio_settings
  if (tables['audio_settings'] !== undefined && Array.isArray(tables['audio_settings']) && tables['audio_settings'][0]) {
    db.saveAudioSettings(tables['audio_settings'][0]);
  }
}

/* --------------------------------- Public API --------------------------------- */

/** Build the full backup payload (tables + storage). */
export async function buildBackupPayload(): Promise<BackupPayload> {
  const [appVersion, tables, storage] = await Promise.all([
    getAppVersion(),
    Platform.OS === 'web' ? exportWebTables() : exportNativeTables(),
    Platform.OS === 'web' ? exportWebStorage() : exportNativeStorage(),
  ]);
  return {
    app: 'islamic',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    data: { tables, storage },
  };
}

/** Validate a backup payload before restoring. Throws on incompatibility or corruption. */
export function validateBackup(payload: unknown): payload is BackupPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Backup file is not a valid backup.');
  }
  const p = payload as Partial<BackupPayload>;
  if (p.app !== 'islamic') {
    throw new Error('This file was not created by Islamic.');
  }
  if (typeof p.formatVersion !== 'number' || p.formatVersion < 1 || p.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup version (${p.formatVersion}). Update the app and try again.`);
  }
  if (!p.data || typeof p.data !== 'object' || Array.isArray(p.data)) {
    throw new Error('Backup file is missing data.');
  }
  if (!p.data.tables || typeof p.data.tables !== 'object' || Array.isArray(p.data.tables)) {
    throw new Error('Backup file is missing table data.');
  }

  // Row shape & sanity hardening:
  const MAX_ROWS_PER_TABLE = 50000;
  for (const [table, rows] of Object.entries(p.data.tables)) {
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

  if (p.data.storage !== undefined) {
    if (!p.data.storage || typeof p.data.storage !== 'object' || Array.isArray(p.data.storage)) {
      throw new Error('Backup storage data is corrupted: expected key-value object.');
    }
    for (const [k, v] of Object.entries(p.data.storage)) {
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

/** Restore validated backup into the local DB + storage. */
export async function applyRestore(payload: BackupPayload): Promise<void> {
  if (Platform.OS === 'web') {
    await importWebStorage(payload.data.storage || {});
    await importWebTables(payload.data.tables || {});
  } else {
    await importNativeTables(payload.data.tables || {});
    await importNativeStorage(payload.data.storage || {});
  }
}

/** Human-readable summary of what a backup contains (for the confirm dialog and post-export UI). */
export function describeBackup(payload: BackupPayload): BackupDescription {
  const tableCounts: Record<string, number> = {};
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
