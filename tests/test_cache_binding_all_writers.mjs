import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

const hadithStorage = new Map();
let hadithNetworkCalls = 0;
let hadithNetworkPayload = null;

const hadith = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/hadithApi.ts',
  modules: {
    '@react-native-async-storage/async-storage': {
      getItem: async (key) => hadithStorage.get(key) ?? null,
      setItem: async (key, value) => {
        hadithStorage.set(key, value);
      },
      getAllKeys: async () => [...hadithStorage.keys()],
      multiRemove: async (keys) => {
        for (const key of keys) hadithStorage.delete(key);
      },
    },
    './quran': {
      fetchWithTimeout: async () => {
        hadithNetworkCalls += 1;
        return { ok: true, json: async () => ({ code: 200, data: hadithNetworkPayload }) };
      },
    },
    './useConnectivity': { isAppOnline: () => true },
  },
  globals: { URLSearchParams },
});

const book = (collection, bookNumber = '1') => ({
  collection,
  bookNumber,
  name: { en: `Book ${bookNumber}`, ar: `كتاب ${bookNumber}` },
  intro: { en: null, ar: null },
  hadithStartNumber: 1,
  hadithEndNumber: 1,
  hadithCount: 1,
});

const item = (collection, bookNumber, hadithNumber) => ({
  collection,
  bookNumber,
  hadithNumber,
  en: { text: 'A valid hadith' },
  ar: { text: 'حديث صحيح' },
});

hadithStorage.set('hadith:cache:books:bukhari', JSON.stringify([book('muslim')]));
hadithNetworkPayload = [book('bukhari')];
const books = await hadith.fetchHadithBooks('bukhari');
assert.equal(books[0].collection, 'bukhari', 'a cached book for another collection must not be served');
assert.equal(hadithNetworkCalls, 1, 'the mismatched book cache entry must be bypassed');

hadithStorage.set(
  'hadith:cache:list:bukhari:1:0',
  JSON.stringify({ total: 1, limit: 20, offset: 0, hadiths: [item('muslim', '1', '1')] }),
);
hadithNetworkPayload = { total: 1, limit: 20, offset: 0, hadiths: [item('bukhari', '1', '1')] };
const page = await hadith.fetchHadithsInBook('bukhari', '1', 20, 0);
assert.equal(page.hadiths[0].collection, 'bukhari', 'a cached page for another collection must not be served');
assert.equal(hadithNetworkCalls, 2, 'the mismatched hadith page cache entry must be bypassed');

hadithStorage.set(
  'hadith:cache:single:bukhari:1:1',
  JSON.stringify(item('bukhari', '1', '2')),
);
hadithNetworkPayload = item('bukhari', '1', '1');
const single = await hadith.fetchSingleHadith('bukhari', '1', '1');
assert.equal(single.hadithNumber, '1', 'a cached hadith for another number must not be served');
assert.equal(hadithNetworkCalls, 3, 'the mismatched single-hadith cache entry must be bypassed');

const audioStorage = new Map();
const audioKey = 'quran-audio:reciter-a:1:128';
audioStorage.set(
  'quran-audio-downloads',
  {
    [audioKey]: {
      edition: 'reciter-b',
      surah: 2,
      bitrate: '128',
      size: 10,
      date: 1,
      localUri: 'file:///poisoned.mp3',
    },
  },
);

const downloads = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/surahDownloads.ts',
  modules: {
    react: { useEffect() {}, useState: (initial) => [initial, () => {}] },
    'react-native': { Platform: { OS: 'android' } },
    'expo-file-system/legacy': { documentDirectory: null },
    './db': {
      loadQuranCache: (key) => audioStorage.get(key) ?? null,
      saveQuranCache: (key, value) => {
        audioStorage.set(key, value);
        return true;
      },
    },
    './quranAudio': {
      getSurahAudioUrl: (edition, surah) => `https://audio.example/${edition}/${surah}.mp3`,
      getSurahBitrate: () => '128',
    },
  },
});

assert.equal(
  downloads.resolveAudioUri('reciter-a', 1, '128', 'https://fallback.example/1.mp3'),
  'https://fallback.example/1.mp3',
  'metadata whose identity disagrees with its cache key must not be served',
);

console.log('Cache binding PASS: Hadith books/pages/singles and downloaded audio metadata reject mismatched cache payloads');
