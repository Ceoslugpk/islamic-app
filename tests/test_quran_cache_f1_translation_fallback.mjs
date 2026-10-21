import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const cache = new Map();
const saves = [];
const editions = [
  { languageCode: 'en', editionIdentifier: 'en.sahih' },
  { languageCode: 'ur', editionIdentifier: 'ur.jalandhry' },
];

const preloader = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/quranPreloader.ts',
  modules: {
    react: { useEffect() {}, useState: (initial) => [initial, () => {}] },
    './quran': {
      fetchSurah: async () => { throw new Error('primary unavailable'); },
      fetchSurahList: async () => [],
      fetchSurahMultiEditions: async () => { throw new Error('multi-edition unavailable'); },
      fetchWithTimeout: async (url) => {
        if (url.includes('/chapters/')) {
          return { ok: true, json: async () => ({ chapter: {
            name_arabic: 'الفاتحة', name_simple: 'Al-Faatiha', verses_count: 1,
          } }) };
        }
        return { ok: true, json: async () => ({ verses: [{
          id: 1, verse_key: '1:1', text_uthmani: 'بِسْمِ اللَّهِ',
        }] }) };
      },
    },
    './tajweed': { fetchTajweedSurah: async () => null },
    './quranScripts': { fetchSurahWithScript: async () => null },
    './quranMultiLang': { fetchSurahTranslations: async () => { throw new Error('translations unavailable'); } },
    './db': {
      loadQuranCache: (key) => cache.get(key) ?? null,
      saveQuranCache: (key, value) => { saves.push(key); cache.set(key, value); return true; },
      loadLastReadPosition: () => null,
      isQuranCacheKeyPresent: (key) => cache.has(key),
      getCachedQuranKeys: () => new Set(cache.keys()),
    },
    './quranLanguageState': {
      DEFAULT_QURAN_LANGUAGE: 'en',
      getQuranTranslationLanguage: () => 'en',
      subscribeQuranLanguage: () => () => {},
    },
    './quranLanguages': {
      QURAN_LANGUAGE_EDITIONS: editions,
      getEditionForLanguage: (languageCode) => editions.find((item) => item.languageCode === languageCode),
    },
    './settings': { getQuranPreloadRequested: () => false },
    './surahs114': {
      SURAHS_114: Array.from({ length: 114 }, (_, index) => ({ number: index + 1, numberOfAyahs: index === 0 ? 1 : 1 })),
    },
    './useConnectivity': { isAppOnline: () => true },
    './i18n': { t: (value) => value },
  },
});

const result = await preloader.preloadSingleSurah(1, 'en.sahih', true);

assert.equal(result, false, 'Arabic-only fallback must not report a translation preload as complete');
assert.equal(cache.has('surah:1:en.sahih'), false, 'Arabic-only fallback must not populate the translation key');
assert.equal(cache.has('surah:1:ar'), true, 'Arabic-only fallback should still preserve the Arabic cache');
assert.deepEqual(saves, ['surah:1:ar'], 'Only the Arabic cache key may be saved by this fallback');
console.log('F1 PASS: Arabic-only second-provider fallback preserves Arabic without poisoning translation cache');
