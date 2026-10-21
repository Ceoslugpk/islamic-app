import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const cachedKeys = new Set(['surah:1:ar', 'surah:1:en.sahih']);
const editions = [
  { languageCode: 'en', editionIdentifier: 'en.sahih' },
  { languageCode: 'ur', editionIdentifier: 'ur.jalandhry' },
];

const preloader = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/quranPreloader.ts',
  modules: {
    react: { useEffect() {}, useState: (initial) => [initial, () => {}] },
    './quran': {},
    './tajweed': {},
    './quranScripts': {},
    './quranMultiLang': {},
    './db': {
      getCachedQuranKeys: () => new Set(cachedKeys),
      isQuranCacheKeyPresent: (key) => cachedKeys.has(key),
      loadQuranCache: () => null,
      saveQuranCache: () => true,
      loadLastReadPosition: () => null,
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
    './surahs114': { SURAHS_114: Array.from({ length: 114 }, (_, index) => ({ number: index + 1, numberOfAyahs: 1 })) },
    './useConnectivity': { isAppOnline: () => true },
    './i18n': { t: (value) => value },
  },
});

assert.equal(
  preloader.getCachedSurahsCount('ur.jalandhry'),
  0,
  'An English translation cache entry must not count toward Urdu progress',
);
assert.equal(
  preloader.getCachedSurahsCount('en.sahih'),
  1,
  'The requested edition still counts its own cached surah',
);
console.log('F2 PASS: cached-surah progress is scoped to the requested edition');
