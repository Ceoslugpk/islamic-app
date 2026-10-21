import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const storage = new Map();
const webKV = {
  get: (key) => storage.get(key) ?? null,
  set: (key, value) => storage.set(key, value),
  delete: (key) => storage.delete(key),
  getAll: (prefix) => [...storage.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => ({ key, value })),
};

const scripts = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/quranScripts.ts',
  modules: {
    './quran': {
      fetchWithTimeout: async (url) => {
        if (url.includes('/by_chapter/')) throw new Error('islamic.app unavailable');
        return { ok: true, json: async () => ({ data: [{ text: 'ayah' }] }) };
      },
    },
    './tajweed': {
      fetchTajweedSurah: async () => { throw new Error('tajweed unavailable'); },
    },
    './i18n': { t: (value) => value },
    './webStorage': { webKV },
  },
});

const result = await scripts.fetchSurahWithScript(2, 'uthmani', true);
const cacheKey = scripts.getScriptCacheKey(2, 'uthmani');

assert.equal(Object.keys(result).length, 30, 'The test fallback should reproduce QuranHub’s bounded partial result');
assert.equal(storage.has(`quran:${cacheKey}`), false, 'A partial script map must not be persisted as complete');

const nativeDb = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/db.native.ts',
  modules: {
    'expo-sqlite': { openDatabaseSync: () => { throw new Error('native database must not open for rejected payload'); } },
  },
});
assert.equal(
  nativeDb.saveQuranCache(cacheKey, { 1: 'ayah' }),
  false,
  'The native cache boundary must reject the same partial script map',
);
console.log('F3 PASS: a 30-ayah QuranHub fallback for a 286-ayah surah remains uncached');
