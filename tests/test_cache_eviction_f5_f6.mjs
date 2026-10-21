import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { compileEsmProductionModule } from './production_module_fallback.mjs';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-f5-f6-'));

const sqlite = new DatabaseSync(':memory:');
const sqliteAdapter = {
  openDatabaseSync() {
    return {
      execSync: (sql) => sqlite.exec(sql),
      runSync: (sql, ...args) => sqlite.prepare(sql).run(...args),
      getFirstSync: (sql, ...args) => sqlite.prepare(sql).get(...args) || null,
      getAllSync: (sql, ...args) => sqlite.prepare(sql).all(...args),
      withTransactionSync: (callback) => {
        sqlite.exec('BEGIN');
        try { const result = callback(); sqlite.exec('COMMIT'); return result; }
        catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      },
    };
  },
};
fs.writeFileSync(path.join(TMP, 'sqliteAdapter.mjs'), 'export default globalThis.__sqliteAdapter;');
globalThis.__sqliteAdapter = sqliteAdapter;

const dbNative = await import(compileEsmProductionModule({
  root: ROOT,
  tmpDir: TMP,
  sourceRelativePath: 'src/lib/db.native.ts',
  source: fs.readFileSync(path.join(ROOT, 'src/lib/db.native.ts'), 'utf8'),
  outputName: 'db.native.mjs',
  replacements: [["import * as SQLite from 'expo-sqlite';", "import SQLite from './sqliteAdapter.mjs';"]],
}));

dbNative.saveQuranCache('surah:init', {});
sqlite.exec('DELETE FROM quran_cache');
sqlite.prepare('INSERT INTO quran_cache (key, payload, cached_at) VALUES (?, ?, ?)').run(
  'islamic-tajweed:surah:1', 'x'.repeat(100), 1,
);
sqlite.prepare('INSERT INTO quran_cache (key, payload, cached_at) VALUES (?, ?, ?)').run(
  'tajweed:surah:2', 'y'.repeat(100), 2,
);
dbNative.reconcileQuranCacheBudget();
dbNative.enforceQuranCacheBudget(1);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM quran_cache WHERE key LIKE ?').get('islamic-tajweed:%').count, 0);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM quran_cache WHERE key LIKE ?').get('tajweed:%').count, 0);
console.log('F5 native eviction reclaimed both legacy and current tajweed families');

const webMap = new Map();
fs.writeFileSync(path.join(TMP, 'webStorage.mjs'), `
  const map = globalThis.__webMap;
  export const webKV = {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => map.set(key, value),
    delete: (key) => map.delete(key),
    getAll: (prefix) => [...map.entries()].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, value })),
  };
`);
globalThis.__webMap = webMap;
const dbWeb = await import(compileEsmProductionModule({
  root: ROOT,
  tmpDir: TMP,
  sourceRelativePath: 'src/lib/db.ts',
  source: fs.readFileSync(path.join(ROOT, 'src/lib/db.ts'), 'utf8'),
  outputName: 'db.web.mjs',
  replacements: [["import { webKV } from './webStorage';", "import { webKV } from './webStorage.mjs';"]],
}));
dbWeb.saveQuranCache('islamic-tajweed:surah:1', { text: 'legacy' });
dbWeb.saveQuranCache('tajweed:surah:2', { text: 'current' });
dbWeb.enforceQuranCacheBudget(1);
assert.equal(webMap.has('quran:islamic-tajweed:surah:1'), false);
assert.equal(webMap.has('quran:tajweed:surah:2'), false);
console.log('F5 web eviction reclaimed both legacy and current tajweed families');

const storage = new Map();
let selectedLanguage = 'en';
const requests = [];
const React = {
  useState: (initial) => [initial, () => {}],
  useCallback: (callback) => callback,
  useEffect: () => {},
};
const AsyncStorage = {
  getItem: async (key) => storage.get(key) ?? null,
  setItem: async (key, value) => storage.set(key, value),
};
const fetchMock = async (url) => {
  requests.push(url);
  const edition = url.split(',')[1];
  return {
    ok: true,
    json: async () => ({
      code: 200,
      data: [
        { text: 'عربي', surah: { englishName: 'Test', number: 1 }, numberInSurah: 1 },
        { text: edition, surah: { englishName: 'Test', number: 1 }, numberInSurah: 1 },
      ],
    }),
  };
};
const ayahModule = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/useAyahOfDay.ts',
  modules: {
    react: React,
    '@react-native-async-storage/async-storage': AsyncStorage,
    './dateKey': { getLocalDateKey: () => '2099-01-02' },
    './useConnectivity': { isAppOnline: () => true },
    './quranLanguageState': { getQuranTranslationLanguage: () => selectedLanguage },
    './quranLanguages': {
      getEditionForLanguage: (language) => ({ languageCode: language, editionIdentifier: language === 'ur' ? 'ur.jalandhry' : 'en.sahih' }),
    },
  },
  globals: { fetch: fetchMock, AbortController, setTimeout, clearTimeout, URL },
});
const hook = ayahModule.useAyahOfDay();
await hook.refresh();
selectedLanguage = 'ur';
await hook.refresh();
assert.equal(requests.length, 2, 'Urdu must not be served from the English cache entry');
assert.match(requests[0], /quran-uthmani,en\.sahih/);
assert.match(requests[1], /quran-uthmani,ur\.jalandhry/);
assert.equal(storage.size, 2, 'Each language/edition must have its own cache entry');
console.log('F6 selected language controls edition and cache isolation');
