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
 * Cache/disposable data is deliberately EXCLUDED: prayer_cache, quran_cache,
 * quran_audio_downloads (downloaded audio), hadith API caches, etc.
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

/** User tables to back up. Do NOT include disposable caches here. */
const USER_TABLES = [
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
  'audio_queue',
  'audio_settings',
] as const;

/** Storage keys included (settings + user prefs). */
const STORAGE_PREFIXES = ['settings', 'quran-', 'audio-', 'hifz-', 'playlist-'];

async function getAppVersion(): Promise<string> {
  try {
    const appJson = require('../../app.json');
    return appJson?.expo?.version || appJson?.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/* ---------------------------- Native (SQLite) ---------------------------- */

async function exportNativeTables(): Promise<Record<string, unknown[]>> {
  const SQLite = require('expo-sqlite');
  const db = SQLite.openDatabaseSync('salah.db');
  const out: Record<string, unknown[]> = {};
  for (const table of USER_TABLES) {
    try {
      out[table] = db.getAllSync(`SELECT * FROM ${table}`);
    } catch {
      // Table may not exist on older installs — skip gracefully.
      out[table] = [];
    }
  }
  return out;
}

async function importNativeTables(tables: Record<string, unknown[]>): Promise<void> {
  const SQLite = require('expo-sqlite');
  const db = SQLite.openDatabaseSync('salah.db');
  // Wipe user tables, then re-insert inside a transaction for integrity.
  db.withTransactionSync(() => {
    for (const table of USER_TABLES) {
      try {
        db.execSync(`DELETE FROM ${table}`);
      } catch {
        // ignore missing table
      }
    }
    for (const table of USER_TABLES) {
      const rows = tables[table] || [];
      for (const row of rows) {
        try {
          const cols = Object.keys(row as Record<string, unknown>);
          const placeholders = cols.map(() => '?').join(', ');
          const values = cols.map((c) => (row as Record<string, unknown>)[c]);
          db.runSync(
            `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
            ...values
          );
        } catch {
          // Skip a row that violates constraints; keep the rest intact.
        }
      }
    }
  });
  return Promise.resolve();
}

/* ------------------------------- Web (localStorage) ------------------------------ */

async function exportWebStorage(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (STORAGE_PREFIXES.some((p) => key.startsWith(p))) {
      const val = localStorage.getItem(key);
      if (val !== null) out[key] = val;
    }
  }
  return out;
}

async function importWebStorage(storage: Record<string, string>): Promise<void> {
  for (const [key, val] of Object.entries(storage)) {
    try {
      localStorage.setItem(key, val);
    } catch {
      // quota etc. — skip
    }
  }
}

async function exportNativeStorage(): Promise<Record<string, string>> {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const keys = await AsyncStorage.getAllKeys();
  const wanted = keys.filter((k: string) => STORAGE_PREFIXES.some((p) => k.startsWith(p)));
  const entries = await AsyncStorage.multiGet(wanted);
  const out: Record<string, string> = {};
  for (const [k, v] of entries) if (v !== null) out[k] = v;
  return out;
}

async function importNativeStorage(storage: Record<string, string>): Promise<void> {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.multiSet(Object.entries(storage));
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

/** Web tables come from localStorage keys too (db.ts uses localStorage). */
async function exportWebTables(): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  const db = require('./db');
  // db.ts keeps user data under known localStorage keys per feature;
  // the cleanest web export is the storage dump itself (tables mirror it).
  // Reuse storage export for tables on web to avoid double-maintaining keys.
  const storage = await exportWebStorage();
  for (const [k, v] of Object.entries(storage)) {
    try {
      out[k] = [JSON.parse(v)];
    } catch {
      out[k] = [v];
    }
  }
  return out;
}

/** Validate a backup payload before restoring. Throws on incompatibility. */
export function validateBackup(payload: unknown): payload is BackupPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup file is not a valid backup.');
  }
  const p = payload as Partial<BackupPayload>;
  if (p.app !== 'islamic') {
    throw new Error('This file was not created by Islamic.');
  }
  if (typeof p.formatVersion !== 'number' || p.formatVersion < 1 || p.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup version (${p.formatVersion}). Update the app and try again.`);
  }
  if (!p.data || typeof p.data !== 'object') {
    throw new Error('Backup file is missing data.');
  }
  if (!p.data.tables || typeof p.data.tables !== 'object') {
    throw new Error('Backup file is missing table data.');
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

async function importWebTables(tables: Record<string, unknown[]>): Promise<void> {
  for (const [k, rows] of Object.entries(tables)) {
    const row = rows[0];
    if (row !== undefined) {
      try {
        localStorage.setItem(k, typeof row === 'string' ? row : JSON.stringify(row));
      } catch {
        // skip
      }
    }
  }
}

/** Human-readable summary of what a backup contains (for the confirm dialog). */
export function describeBackup(payload: BackupPayload): { tables: string; exportedAt: string; appVersion: string } {
  const names = Object.keys(payload.data?.tables || {}).filter((t) => (payload.data.tables[t] || []).length > 0);
  return {
    tables: names.length ? names.join(', ') : 'No saved data',
    exportedAt: payload.exportedAt ? new Date(payload.exportedAt).toLocaleString() : 'Unknown',
    appVersion: payload.appVersion || 'Unknown',
  };
}
