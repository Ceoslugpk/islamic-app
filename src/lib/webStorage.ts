/**
 * Cross-platform storage: SQLite on native, localStorage-backed on web.
 * Mirrors the spec: "Web: local-storage-backed relational implementation."
 * All db.ts callers go through this; native keeps full SQLite, web keeps working.
 */
import { Platform } from 'react-native';

const IS_NATIVE = Platform.OS !== 'web';
const PREFIX = 'salah-db:';

// localStorage-compatible store (works on web; no-op on native where SQLite is used)
const memStore: Record<string, string> = {};

function storageGet(key: string): string | null {
  try {
    if (IS_NATIVE) return null; // native uses SQLite
    if (typeof localStorage !== 'undefined') return localStorage.getItem(PREFIX + key);
    return memStore[key] ?? null;
  } catch {
    return memStore[key] ?? null;
  }
}

function storageSet(key: string, value: string) {
  try {
    if (IS_NATIVE) return;
    if (typeof localStorage !== 'undefined') localStorage.setItem(PREFIX + key, value);
    else memStore[key] = value;
  } catch {
    memStore[key] = value;
  }
}

export interface KVRow {
  key: string;
  value: string;
}

/** Minimal key-value store abstraction used by db.ts on web. */
export const webKV = {
  get: storageGet,
  set: storageSet,
  getAll(prefix: string): KVRow[] {
    const out: KVRow[] = [];
    if (!IS_NATIVE) {
      try {
        if (typeof localStorage !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(PREFIX + prefix)) {
              out.push({ key: k.slice(PREFIX.length), value: localStorage.getItem(k) || '' });
            }
          }
        }
      } catch {
        // fall through
      }
    }
    return out;
  },
  delete(key: string) {
    if (!IS_NATIVE) {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(PREFIX + key);
        else delete memStore[key];
      } catch {
        delete memStore[key];
      }
    }
  },
};
