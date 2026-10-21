import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repo = path.resolve(import.meta.dirname, '..');
const calls = [];
const t = (key, options = {}) => {
  calls.push(String(key));
  return String(key).replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name] ?? `{{${name}}}`));
};

const generic = new Proxy({ __esModule: true, default: () => null }, {
  get(target, property) {
    if (property in target) return target[property];
    return () => null;
  },
});

function mockModule(request) {
  if (request === './i18n' || request.endsWith('/lib/i18n')) {
    return { __esModule: true, t, getCurrentLanguage: () => 'en', isAppLanguage: () => true };
  }
  if (request === './db' || request.endsWith('/lib/db')) {
    return { loadPrayerCache: () => null, savePrayerCache: () => true, loadQuranCache: () => null, saveQuranCache: () => true };
  }
  if (request === './useConnectivity' || request.endsWith('/lib/useConnectivity')) return { isAppOnline: () => true };
  if (request === './settings' || request.endsWith('/lib/settings')) return { loadQuranPreloadRequested: async () => false };
  if (request === './hijri' || request.endsWith('/lib/hijri')) {
    return {
      HIJRI_MONTHS: ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'],
      gregorianToHijri: () => ({ day: 14, month: 9, year: 1448 }),
    };
  }
  if (request === '@react-native-async-storage/async-storage') {
    return { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
  }
  if (request === './quranPreloader' || request.endsWith('/lib/quranPreloader')) {
    return { startQuranPreload() {}, isQuranPreloadRunning: () => false, isQuranPreloadComplete: () => true };
  }
  if (request === './quranAudio' || request.endsWith('/lib/quranAudio')) return { fetchReciters: async () => [] };
  if (request === './hadithApi' || request.endsWith('/lib/hadithApi')) {
    return { fetchHadithCollections: async () => [], fetchHadithBooks: async () => [], fetchHadithsInBook: async () => ({ hadiths: [], total: 0 }), isHadithPageCached: async () => true };
  }
  if (request === './quran' || request.endsWith('/lib/quran')) {
    return { fetchSurahList: async () => [], fetchSurahListForLanguage: async () => [], fetchWithTimeout: async () => ({ ok: true }) };
  }
  if (request === './quranLanguageState' || request.endsWith('/lib/quranLanguageState')) return { getQuranTranslationLanguage: () => 'en' };
  return null;
}

const cache = new Map();
function resolveProduction(request, parent) {
  const base = path.resolve(path.dirname(parent), request);
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}.js`]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve ${request} from ${parent}`);
}

function loadProduction(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
    fileName: absolute,
  }).outputText;
  const module = { exports: {} };
  cache.set(absolute, module);
  const localRequire = (request) => {
    const mocked = mockModule(request);
    if (mocked) return mocked;
    if (request.startsWith('.')) return loadProduction(resolveProduction(request, absolute));
    throw new Error(`Unexpected dependency ${request} from ${absolute}`);
  };
  new Function('require', 'module', 'exports', '__dirname', output)(localRequire, module, module.exports, path.dirname(absolute));
  return module.exports;
}

const zakat = loadProduction(path.join(repo, 'src/lib/zakat.ts'));
const fasting = loadProduction(path.join(repo, 'src/lib/fasting.ts'));
const women = loadProduction(path.join(repo, 'src/lib/womensFiqh.ts'));
const events = loadProduction(path.join(repo, 'src/lib/islamicEvents.ts'));
const errors = loadProduction(path.join(repo, 'src/lib/friendlyErrors.ts'));
const prayer = loadProduction(path.join(repo, 'src/lib/prayerTimes.ts'));
const warmup = loadProduction(path.join(repo, 'src/lib/warmup.ts'));

const currencyCalls = calls.length;
for (const currency of zakat.SUPPORTED_CURRENCIES) void currency.name;
assert.equal(calls.length - currencyCalls, zakat.SUPPORTED_CURRENCIES.length, 'every currency name must reach t()');
assert.equal(calls.filter((key) => key === 'UAE Dirham').length, 1, 'UAE Dirham must reach t()');
const fastingCatalogCalls = calls.length;
for (const item of fasting.VOLUNTARY_FASTS_CATALOG) {
  void item.name; void item.description; void item.virtue;
}
assert.equal(calls.length - fastingCatalogCalls, fasting.VOLUNTARY_FASTS_CATALOG.length * 3, 'every fasting catalog field must reach t()');
const fastingMonthCalls = calls.length;
for (const month of fasting.HIJRI_MONTH_NAMES) void month;
assert.equal(calls.length - fastingMonthCalls, fasting.HIJRI_MONTH_NAMES.length, 'every fasting month name must reach t()');
const eventMonthCalls = calls.length;
for (const month of events.HIJRI_MONTH_NAMES) void month;
assert.equal(calls.length - eventMonthCalls, events.HIJRI_MONTH_NAMES.length, 'every event month name must reach t()');
void events.formatHijriDate(14, 9, 1448);
const womenCalls = calls.length;
for (const item of women.WORSHIP_GUIDELINES) {
  void item.topic; void item.ruling; void item.details; void item.evidence;
}
for (const item of women.BLEEDING_TYPES) {
  void item.name; void item.definition; void item.duration; void item.rulings;
}
for (const item of women.WOMENS_FIQH_RESOURCES) {
  void item.title; void item.author; void item.description; void item.category;
}
assert.equal(calls.length - womenCalls, 60, 'every women guidance field must reach t()');
for (const item of events.ISLAMIC_EVENTS) void item.significance;
for (const method of prayer.CALC_METHODS) { void method.name; void method.region; }
void prayer.DEFAULT_LOCATION.label;
void fasting.getVoluntaryRecommendations(new Date('2026-10-21T00:00:00Z'));
void fasting.getFastingCountdown('04:00', '18:00');
void errors.errorToUserMessage(new Error('network request failed'), { scope: 'prayer_times' });
void errors.errorToUserMessage(new Error('network request failed'), { scope: 'mosque_finder' });
void errors.errorToUserMessage(new Error('network request failed'), { scope: 'audio' });
void errors.errorToUserMessage(new Error('network request failed'), { scope: 'general' });
void errors.errorToUserMessage(new Error('503'), { scope: 'general' });
void errors.errorToUserMessage(new Error('404'), { scope: 'mosque_finder', query: 'Lahore' });
void errors.errorToUserMessage(new Error('404'), { scope: 'general' });
void errors.errorToUserMessage(new Error('permission denied'), { scope: 'location', fallbackCity: 'Makkah' });
void errors.errorToUserMessage(new Error('unexpected'), { scope: 'mosque_finder' });
void errors.errorToUserMessage(new Error('unexpected'), { scope: 'prayer_times' });
void errors.errorToUserMessage(new Error('unexpected'), { scope: 'general' });

const progress = [];
await warmup.runFirstLaunchWarmup({ onProgress: (value) => progress.push(value) });
assert.deepEqual(progress.slice(0, 6).map((value) => value.step), [
  'Prayer Times',
  'Quran (Arabic + Translations)',
  'Reciters List',
  'Hadith Collections',
  'Hadith of the Day',
  'Hadith Books & Texts',
]);

const settingsSource = fs.readFileSync(path.join(repo, 'src/screens/SettingsScreen.tsx'), 'utf8');
const settingsOutput = ts.transpileModule(settingsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  fileName: 'SettingsScreen.tsx',
}).outputText;
let hookIndex = 0;
const react = {
  __esModule: true,
  default: null,
  createElement(type, props, ...children) {
    const value = { type, props: { ...(props ?? {}), children: children.length <= 1 ? children[0] ?? null : children } };
    return typeof type === 'function' ? type(value.props) : value;
  },
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: (initial) => ({ current: initial }),
  useMemo: (factory) => factory(),
  useCallback: (callback) => callback,
};
react.default = react;
const settingsModule = { exports: {} };
const settingsRequire = (request) => {
  if (request === 'react') return react;
  if (request === '../../app.json') return { expo: { version: 'test' } };
  if (request === '../lib/i18n' || request.endsWith('/lib/i18n')) return { __esModule: true, t, isRtlLanguage: () => false, prepareNativeLayoutDirection: () => {} };
  if (request === 'react-native') return new Proxy({ __esModule: true, Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 400, height: 800 }), StyleSheet: { create: (value) => value, absoluteFill: {} } }, { get: (target, key) => key in target ? target[key] : typeof key === 'string' && /^[A-Z]/.test(key) ? key : () => null });
  if (request.includes('diagnostic') || request.includes('theme') || request.includes('tokens') || request.includes('buttonTokens')) return new Proxy({ __esModule: true, default: () => null, useTheme: () => ({ colors: { borderSubtle: '#000', borderStrong: '#000' }, mode: 'paper' }), useThemeTokens: () => ({ tokens: {} }), getTokens: () => ({ gold: '#000' }), cardTokens: { shadow: { paper: {} } }, touchTargetTokens: {}, usePressProbe: () => ({ onPress: () => {} }) }, { get: (target, key) => key in target ? target[key] : () => null });
  if (request.startsWith('../') || request.startsWith('./')) return generic;
  if (request.endsWith('.json')) return { __esModule: true, default: {} };
  return generic;
};
new Function('module', 'exports', 'require', settingsOutput)(settingsModule, settingsModule.exports, settingsRequire);
hookIndex = 0;
const tree = settingsModule.exports.AdjustRow({ label: 'Prayer reminders', valueLabel: '10', min: 0, max: 60, step: 5, value: 10, onChange: () => {} });
const labels = [];
const walk = (node) => {
  if (Array.isArray(node)) {
    for (const child of node) walk(child);
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (node.props?.accessibilityLabel) labels.push(node.props.accessibilityLabel);
  walk(node.props?.children);
};
walk(tree);
assert.ok(labels.includes('Decrease Prayer reminders'));
assert.ok(labels.includes('Increase Prayer reminders'));
assert.ok(labels.includes('Prayer reminders, 10'));

const locales = Object.fromEntries(['en', 'ur', 'ar'].map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(path.join(repo, `src/locales/${locale}.json`), 'utf8')),
]));
const required = new Set(calls);
for (const key of required) {
  assert.ok(Object.hasOwn(locales.en, key), `English locale missing family-5 key: ${key}`);
  assert.equal(locales.en[key], key, `English locale changed source key: ${key}`);
  assert.ok(Object.hasOwn(locales.ur, key), `Urdu locale missing family-5 key: ${key}`);
  assert.ok(Object.hasOwn(locales.ar, key), `Arabic locale missing family-5 key: ${key}`);
}

const baseEnglish = JSON.parse(execFileSync('git', ['show', 'HEAD:src/locales/en.json'], { cwd: repo, encoding: 'utf8' }));
const newKeys = [...required].filter((key) => !Object.hasOwn(baseEnglish, key));
for (const key of newKeys) {
  assert.notEqual(locales.ur[key], key, `Urdu family-5 value is still English: ${key}`);
  assert.notEqual(locales.ar[key], key, `Arabic family-5 value is still English: ${key}`);
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
    `${file} unexpectedly contains family-5 keys`,
  );
}

console.log(`PASS: t() keys=${required.size}, calls=${calls.length}, warmup steps=${progress.slice(0, 6).length}, settings labels=${labels.length}`);
