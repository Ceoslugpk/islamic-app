import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const calls = [];
const React = { createElement() { return null; } };

function mockModule(request) {
  if (request === 'react') return { __esModule: true, default: React, ...React };
  if (request === '@react-native-async-storage/async-storage') {
    return { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
  }
  if (request === './i18n' || request.endsWith('/lib/i18n') || request.endsWith('/lib/i18n.ts')) {
    return {
      t: (key) => { calls.push(String(key)); return String(key); },
      getCurrentLanguage: () => 'en',
    };
  }
  if (request === './surahNamesLocalized' || request.endsWith('/lib/surahNamesLocalized') || request.endsWith('/lib/surahNamesLocalized.ts')) {
    return {
      LANGUAGE_NAMES_UR: {}, LANGUAGE_NAMES_AR: {}, LANGUAGE_NAMES_HI: {},
      LANGUAGE_NAMES_ML: {}, LANGUAGE_NAMES_SI: {},
    };
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

const names = loadProduction(path.join(repo, 'src/lib/names99.ts'));
const quranLanguages = loadProduction(path.join(repo, 'src/lib/quranLanguages.ts'));

assert.equal(names.NAMES_99.length, 99);
const nameTransliterationKeys = new Set(names.NAMES_99.map((item) => String(item.transliteration)));
const nameMeaningKeys = new Set(names.NAMES_99.map((item) => String(item.meaning)));
const languageChipKeys = new Set(
  names.NAMES_LANGUAGES
    .map((item) => String(item.label))
    .filter((value) => /[A-Za-z]/.test(value)),
);
const editionLanguageKeys = new Set(quranLanguages.QURAN_LANGUAGE_EDITIONS.map((item) => String(item.language)));
const editionNameKeys = new Set(
  quranLanguages.QURAN_LANGUAGE_EDITIONS
    .map((item) => String(item.name))
    .filter((value) => /[A-Za-z]/.test(value)),
);
const requiredKeys = new Set([
  ...nameTransliterationKeys,
  ...nameMeaningKeys,
  ...languageChipKeys,
  ...editionLanguageKeys,
  ...editionNameKeys,
]);

for (const key of requiredKeys) {
  assert.ok(calls.includes(key), `family-3 value did not reach t(): ${key}`);
}

const locales = Object.fromEntries(['en', 'ur', 'ar'].map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(path.join(repo, `src/locales/${locale}.json`), 'utf8')),
]));
for (const key of requiredKeys) {
  assert.ok(Object.hasOwn(locales.en, key), `English locale missing family-3 key: ${key}`);
  assert.equal(locales.en[key], key, `English locale changed the source key: ${key}`);
  assert.ok(Object.hasOwn(locales.ur, key), `Urdu locale missing family-3 key: ${key}`);
  assert.ok(Object.hasOwn(locales.ar, key), `Arabic locale missing family-3 key: ${key}`);
}

const baseEnglish = JSON.parse(execFileSync(
  'git', ['show', 'HEAD:src/locales/en.json'], { cwd: repo, encoding: 'utf8' },
));
const newKeys = [...requiredKeys].filter((key) => !Object.hasOwn(baseEnglish, key));
for (const key of newKeys) {
  assert.notEqual(locales.ur[key], key, `Urdu family-3 value is still English: ${key}`);
  assert.notEqual(locales.ar[key], key, `Arabic family-3 value is still English: ${key}`);
  assert.doesNotMatch(locales.ur[key], /[A-Za-z]/, `Urdu family-3 value contains Latin text: ${key}`);
  assert.doesNotMatch(locales.ar[key], /[A-Za-z]/, `Arabic family-3 value contains Latin text: ${key}`);
}
for (const file of fs.readdirSync(path.join(repo, 'src/locales')).filter(
  (name) => name.endsWith('.json') && !['en.json', 'ur.json', 'ar.json'].includes(name),
)) {
  const locale = JSON.parse(fs.readFileSync(path.join(repo, 'src/locales', file), 'utf8'));
  assert.deepEqual(
    newKeys.filter((key) => Object.hasOwn(locale, key)),
    [],
    `${file} unexpectedly contains family-3 keys`,
  );
}

console.log(
  `PASS: names meanings=${nameMeaningKeys.size}, language chips=${languageChipKeys.size}, ` +
  `name transliterations=${nameTransliterationKeys.size}, ` +
  `Quran edition languages=${editionLanguageKeys.size}, edition names=${editionNameKeys.size}, ` +
  `family-3 keys=${requiredKeys.size}, new locale keys=${newKeys.length}, t() calls=${calls.length}`,
);
