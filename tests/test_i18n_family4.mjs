import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const calls = [];
const primitive = (props = {}) => props.children ?? null;

const React = {
  useSyncExternalStore(subscribe, getSnapshot) {
    return getSnapshot();
  },
};

const storage = {
  async getItem() { return null; },
  async setItem() {},
  async removeItem() {},
};

function mockModule(request) {
  if (request === 'react') return { __esModule: true, default: React, ...React };
  if (request === '@react-native-async-storage/async-storage') return storage;
  if (request === 'expo-audio') {
    return {
      AudioPlayer: class {},
      AudioStatus: class {},
      createAudioPlayer: () => ({
        addListener: () => ({ remove() {} }),
        play() {},
        pause() {},
        remove() {},
      }),
      setAudioModeAsync: async () => {},
    };
  }
  if (request === './i18n' || request.endsWith('/lib/i18n') || request.endsWith('/lib/i18n.ts')) {
    return {
      t(key) {
        calls.push(String(key));
        return String(key);
      },
      getCurrentLanguage: () => 'en',
    };
  }
  if (request === './db' || request.endsWith('/lib/db') || request.endsWith('/lib/db.ts')) {
    return {
      loadAudioQueue: () => [],
      loadAudioSettings: () => ({ autoplayNext: false, repeatMode: 'none', reciter: 'ar.alafasy' }),
      saveAudioQueue: () => {},
      saveAudioSettings: () => {},
      saveRecentlyPlayed: () => {},
    };
  }
  if (request === './audioPreloader' || request.endsWith('/lib/audioPreloader')) {
    return {
      clearAudioPreloadCache() {},
      enqueuePreloadUrls() {},
      getAudioPreloadStats: () => ({}),
      hasPreloadedSound: () => false,
      pauseAudioPreloading() {},
      resumeAudioPreloading() {},
      stopAudioPreloading: async () => {},
      takePreloadedSound: () => null,
    };
  }
  if (request === './surahDownloads' || request.endsWith('/lib/surahDownloads')) {
    return { isSurahDownloaded: () => false, resolveAudioUri: (id) => id };
  }
  if (request === './quran' || request.endsWith('/lib/quran')) {
    return { fetchWithTimeout: async () => ({ ok: false, status: 503 }) };
  }
  if (request === './useConnectivity' || request.endsWith('/lib/useConnectivity')) {
    return { isAppOnline: () => true };
  }
  if (request === './notifications' || request.endsWith('/lib/notifications')) {
    return { ensureNotificationPermissionForPlayback: async () => {} };
  }
  if (request === './surahAyahCounts' || request.endsWith('/lib/surahAyahCounts')) {
    return { SURAH_AYAH_COUNTS: Array.from({ length: 114 }, () => 7) };
  }
  return null;
}

const moduleCache = new Map();
function resolveProduction(request, parent) {
  const base = path.resolve(path.dirname(parent), request);
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}.js`]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve production import ${request} from ${parent}`);
}

function loadProduction(file) {
  const absolute = path.resolve(file);
  if (moduleCache.has(absolute)) return moduleCache.get(absolute).exports;
  const source = fs.readFileSync(absolute, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absolute,
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(absolute, module);
  const localRequire = (request) => {
    const mocked = mockModule(request);
    if (mocked) return mocked;
    if (request.startsWith('.')) return loadProduction(resolveProduction(request, absolute));
    throw new Error(`Unexpected production dependency ${request} from ${absolute}`);
  };
  new Function('require', 'module', 'exports', '__dirname', output)(
    localRequire,
    module,
    module.exports,
    path.dirname(absolute),
  );
  return module.exports;
}

const playlists = loadProduction(path.join(repo, 'src/lib/audioPlaylists.ts'));
const tafsir = loadProduction(path.join(repo, 'src/lib/tafsirSources.ts'));
const adhan = loadProduction(path.join(repo, 'src/lib/audio.ts'));
const quranAudio = loadProduction(path.join(repo, 'src/lib/quranAudio.ts'));

const required = new Set();
const add = (value) => {
  if (typeof value === 'string' && /[A-Za-z]/.test(value)) required.add(value);
};

let playlistTitleCount = 0;
let playlistSubtitleCount = 0;
let playlistLabelCount = 0;
for (const playlist of playlists.PRESET_PLAYLISTS) {
  add(playlist.title); playlistTitleCount += 1;
  add(playlist.subtitle); playlistSubtitleCount += 1;
  for (const item of playlist.items) {
    add(item.label); playlistLabelCount += 1;
  }
}

let tafsirNameCount = 0;
let tafsirLanguageCount = 0;
let tafsirAuthorCount = 0;
for (const source of tafsir.TAFSIR_SOURCES) {
  add(source.name); tafsirNameCount += 1;
  add(source.language); tafsirLanguageCount += 1;
  add(source.author); tafsirAuthorCount += 1;
}

let adhanNameCount = 0;
let adhanLocationCount = 0;
let adhanDescriptionCount = 0;
for (const reciter of adhan.ADHAN_RECITERS) {
  add(reciter.name); adhanNameCount += 1;
  add(reciter.location); adhanLocationCount += 1;
  add(reciter.description); adhanDescriptionCount += 1;
}

for (const edition of Object.values(quranAudio.LANGUAGE_AUDIO_EDITIONS)) {
  add(edition.name);
  add(edition.langName);
}
for (const edition of quranAudio.VERIFIED_NON_ARABIC_EDITIONS) {
  add(edition.englishName);
  if (/[A-Za-z]/.test(edition.name)) add(edition.name);
}
for (const reciter of quranAudio.DEFAULT_RECITERS) {
  add(reciter.englishName);
  add(reciter.country);
}
for (const reciter of [...quranAudio.DEFAULT_RECITERS, ...quranAudio.VERIFIED_NON_ARABIC_EDITIONS]) {
  const before = calls.length;
  const resolved = quranAudio.resolveReciterName(reciter.identifier);
  assert.equal(typeof resolved, 'string');
  assert.ok(calls.slice(before).includes(resolved), `resolveReciterName did not reach t(): ${reciter.identifier}`);
}
for (const language of Object.keys(quranAudio.LANGUAGE_AUDIO_EDITIONS)) {
  add(quranAudio.getAudioTranslationLangName(language));
}
for (const identifier of quranAudio.DEFAULT_RECITERS.map((reciter) => reciter.identifier)) {
  const before = calls.length;
  const country = quranAudio.getReciterCountry(identifier);
  add(country);
  assert.ok(calls.slice(before).includes(country), `getReciterCountry did not reach t(): ${identifier}`);
}
add(quranAudio.formatTranslationPlaybackTitle('English', 2, 255));

assert.equal(playlistTitleCount, 6);
assert.equal(playlistSubtitleCount, 6);
assert.equal(playlistLabelCount, 27);
assert.equal(tafsirNameCount, 16);
assert.equal(tafsirLanguageCount, 16);
assert.equal(tafsirAuthorCount, 16);
assert.equal(adhanNameCount, 11);
assert.equal(adhanLocationCount, 11);
assert.equal(adhanDescriptionCount, 11);
for (const key of required) {
  assert.ok(calls.includes(key), `family-4 value did not reach t(): ${key}`);
}

const locales = Object.fromEntries(['en', 'ur', 'ar'].map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(path.join(repo, `src/locales/${locale}.json`), 'utf8')),
]));
for (const key of required) {
  assert.ok(Object.hasOwn(locales.en, key), `English locale missing family-4 key: ${key}`);
  assert.equal(locales.en[key], key, `English locale changed family-4 source key: ${key}`);
  assert.ok(Object.hasOwn(locales.ur, key), `Urdu locale missing family-4 key: ${key}`);
  assert.ok(Object.hasOwn(locales.ar, key), `Arabic locale missing family-4 key: ${key}`);
}

const baseEnglish = JSON.parse(execFileSync(
  'git', ['show', 'HEAD:src/locales/en.json'], { cwd: repo, encoding: 'utf8' },
));
const newKeys = [...required].filter((key) => !Object.hasOwn(baseEnglish, key));
for (const key of newKeys) {
  assert.notEqual(locales.ur[key], key, `Urdu family-4 value is still English: ${key}`);
  assert.notEqual(locales.ar[key], key, `Arabic family-4 value is still English: ${key}`);
  assert.match(locales.ur[key], /[\u0600-\u06ff\u0750-\u077f]/, `Urdu value is not Arabic-script text: ${key}`);
  assert.match(locales.ar[key], /[\u0600-\u06ff]/, `Arabic value is not Arabic-script text: ${key}`);
}
for (const file of fs.readdirSync(path.join(repo, 'src/locales')).filter(
  (name) => name.endsWith('.json') && !['en.json', 'ur.json', 'ar.json'].includes(name),
)) {
  const locale = JSON.parse(fs.readFileSync(path.join(repo, 'src/locales', file), 'utf8'));
  assert.deepEqual(
    newKeys.filter((key) => Object.hasOwn(locale, key)),
    [],
    `${file} unexpectedly contains family-4 keys`,
  );
}

console.log(
  `PASS: playlist=${playlistTitleCount + playlistSubtitleCount + playlistLabelCount}, ` +
  `tafsir=${tafsirNameCount + tafsirLanguageCount + tafsirAuthorCount}, ` +
  `adhan=${adhanNameCount + adhanLocationCount + adhanDescriptionCount}, ` +
  `family-4 keys=${required.size}, new locale keys=${newKeys.length}, t() calls=${calls.length}`,
);
