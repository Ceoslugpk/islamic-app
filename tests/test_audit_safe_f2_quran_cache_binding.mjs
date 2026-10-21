import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const cache = new Map();
let networkCalls = 0;

function surahResponse() {
  const ayahs = Array.from({ length: 7 }, (_, index) => ({
    number: index + 1,
    numberInSurah: index + 1,
    text: `arabic-${index + 1}`,
  }));
  return {
    code: 200,
    data: [
      {
        number: 1,
        name: 'الفاتحة',
        englishName: 'Al-Faatiha',
        englishNameTranslation: 'The Opening',
        numberOfAyahs: 7,
        edition: { identifier: 'quran-uthmani', type: 'quran' },
        ayahs,
      },
      {
        number: 1,
        name: 'الفاتحة',
        englishName: 'Al-Faatiha',
        englishNameTranslation: 'The Opening',
        numberOfAyahs: 7,
        edition: { identifier: 'en.sahih', type: 'translation' },
        ayahs: ayahs.map((ayah) => ({ ...ayah, text: `translation-${ayah.numberInSurah}` })),
      },
    ],
  };
}

const quran = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/quran.ts',
  modules: {
    './db': {
      loadQuranCache: (key) => cache.get(key) ?? null,
      saveQuranCache: (key, value) => {
        cache.set(key, value);
        return true;
      },
    },
    './useConnectivity': { isAppOnline: () => true },
    './surahs114': { SURAHS_114: [] },
    './surahTranslationsData': { SURAH_NAME_TRANSLATIONS: {} },
    './surahAyahCounts': { SURAH_AYAH_COUNTS: [7] },
    './tafsirApi': {
      fetchTafsirApi: async () => { throw new Error('not used'); },
      getCanonicalTafsirSlug: (slug) => slug,
      TAFSIR_API_BASE: '',
    },
    './surahPageData': {
      SURAH_START_PAGES: [],
      TOTAL_MUSHAF_PAGES: 604,
      getSurahStartPage: () => 1,
      getPrimarySurahForPage: () => 1,
    },
    './quranScripts': {},
  },
  globals: {
    AbortController,
    clearTimeout,
    setTimeout,
    fetch: async () => {
      networkCalls += 1;
      return { ok: true, json: async () => surahResponse() };
    },
  },
});

cache.set('surah:1:en.sahih', {
  number: 2,
  editionIdentifier: 'en.sahih',
  ayahs: Array.from({ length: 7 }, (_, index) => ({
    text: `poison-arabic-${index}`,
    translation: `poison-${index}`,
  })),
});
const mismatched = await quran.fetchSurah(1, true, 'en.sahih');
assert.equal(mismatched.number, 1, 'a cached payload for another surah must not satisfy this request');
assert.equal(networkCalls, 1, 'the mismatched cache entry must be bypassed');

cache.set('surah:1:en.sahih', {
  number: 1,
  editionIdentifier: 'en.sahih',
  ayahs: Array.from({ length: 8 }, (_, index) => ({
    text: `oversized-arabic-${index}`,
    translation: `oversized-${index}`,
  })),
});
const oversized = await quran.fetchSurah(1, true, 'en.sahih');
assert.equal(oversized.ayahs.length, 7, 'an oversized cached payload must not satisfy the bounded surah request');
assert.equal(networkCalls, 2, 'the oversized cache entry must be bypassed');

console.log('Audit F2 PASS: mismatched and oversized Quran surah cache payloads are not served');
