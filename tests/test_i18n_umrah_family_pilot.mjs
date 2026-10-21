import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const calls = new Set();
let activeTabOverride = null;

const primitive = (props = {}) => props.children ?? null;
const React = {
  createElement(type, props, ...children) {
    return { type, props: { ...(props ?? {}), children } };
  },
  Fragment: Symbol('Fragment'),
  useEffect() {},
  useMemo(factory) { return factory(); },
  useRef(value) { return { current: value }; },
  useState(initial) {
    if (activeTabOverride && typeof initial === 'string') return [activeTabOverride, () => {}];
    return [initial, () => {}];
  },
};

const translationModule = {
  __esModule: true,
  useTranslation() {
    return { t: (key) => { calls.add(String(key)); return String(key); } };
  },
};

const tokens = {
  bgTop: '#fff', cardTop: '#fff', cardBorder: '#ddd', inset: '#eee', text: '#111',
  textPrimary: '#111', textSecondary: '#333', gold: '#c90', goldText: '#960',
  onGold: '#fff', success: '#080', danger: '#800',
};

function mockModule(request) {
  if (request === 'react') return { __esModule: true, default: React, ...React };
  if (request === 'react-i18next') return translationModule;
  if (request === 'react-native') {
    return {
      ScrollView: primitive,
      StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
      TouchableOpacity: primitive,
      View: primitive,
      useWindowDimensions: () => ({ width: 420, height: 900 }),
    };
  }
  if (request === '@expo/vector-icons') return { Ionicons: primitive };
  if (request.includes('/components/ui/AppText')) return { AppText: primitive };
  if (request.endsWith('/components/ui')) {
    return { PremiumCard: primitive, PrimaryButton: primitive, Chip: primitive };
  }
  if (request.includes('/components/ArabicText')) return { ArabicText: primitive };
  if (request.includes('/components/Hairline')) return { Hairline: primitive };
  if (request.includes('/components/layout/SubHeader')) return { SubHeader: primitive };
  if (request.includes('/components/layout/DetailScreen')) {
    const DetailScreen = primitive;
    DetailScreen.ScrollView = primitive;
    return { DetailScreen };
  }
  if (request.includes('/theme/tokens')) {
    return {
      cardTokens: { borderRadius: 12 },
      fontRoles: { body: {}, label: {}, title: {}, eyebrow: {}, numeral: {} },
      useThemeTokens: () => ({ tokens }),
    };
  }
  if (request.includes('/lib/rtl')) return { hScrollRTLStyle: () => ({}) };
  if (request.includes('/lib/i18n')) return { isRTL: () => false };
  if (request.includes('/lib/prayerGuide')) return { refreshGuideItems: async () => ({}) };
  if (request.includes('/lib/hijri')) {
    return { HIJRI_MONTHS: [], fetchHijriMonth: async () => ({ days: [] }) };
  }
  if (request.includes('/lib/islamicEvents')) {
    return { ISLAMIC_EVENTS: [], getNextEvent: () => null };
  }
  return null;
}

const moduleCache = new Map();
function resolveProduction(request, parent) {
  const base = path.resolve(path.dirname(parent), request);
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}.js`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
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
      jsx: ts.JsxEmit.React,
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

function render(node) {
  if (node == null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    node.forEach(render);
    return;
  }
  if (node.type === React.Fragment) {
    render(node.props?.children);
    return;
  }
  if (typeof node.type === 'function') {
    render(node.type(node.props ?? {}));
    return;
  }
  render(node.props?.children);
}

function renderScreen(screen, props = {}) {
  render(screen.default(props));
}

function add(set, value) {
  if (typeof value === 'string') set.add(value);
}

const hajj = loadProduction(path.join(repo, 'src/screens/HajjJourneyScreen.tsx'));
const umrah = loadProduction(path.join(repo, 'src/screens/UmrahGuideScreen.tsx'));
const resources = loadProduction(path.join(repo, 'src/screens/UmrahResourcesScreen.tsx'));
const ramadanScreen = loadProduction(path.join(repo, 'src/screens/RamadanGuideScreen.tsx'));
const ramadanGuide = loadProduction(path.join(repo, 'src/lib/ramadanGuide.ts'));

const hajjKeys = new Set();
for (const day of hajj.HAJJ_DAYS) {
  for (const value of [day.dayNumber, day.hijriDate, day.title, day.location, day.summary]) add(hajjKeys, value);
  for (const ritual of day.rituals) for (const value of [ritual.name, ritual.description, ritual.obligation]) add(hajjKeys, value);
  for (const dua of day.duas ?? []) for (const value of [dua.title, dua.translation]) add(hajjKeys, value);
  day.practicalNotes.forEach((value) => add(hajjKeys, value));
}

const umrahKeys = new Set();
for (const step of umrah.UMRAH_STEPS) {
  for (const value of [step.title, step.stageName, step.description, step.location]) add(umrahKeys, value);
  step.keyActions.forEach((value) => add(umrahKeys, value));
  for (const dua of step.duas ?? []) for (const value of [dua.title, dua.translation]) add(umrahKeys, value);
  (step.criticalNotes ?? []).forEach((value) => add(umrahKeys, value));
}

const resourceKeys = new Set();
for (const item of resources.PACKING_ITEMS) for (const value of [item.category, item.item, item.note]) add(resourceKeys, value);
for (const book of resources.RECOMMENDED_BOOKS) for (const value of [book.title, book.author, book.focus, book.description]) add(resourceKeys, value);
for (const item of resources.COMMON_MISTAKES) for (const value of [item.topic, item.mistake, item.correctAction]) add(resourceKeys, value);
for (const tip of resources.FIRST_TIMER_TIPS) for (const value of [tip.title, tip.detail]) add(resourceKeys, value);

const ramadanKeys = new Set();
for (const section of ramadanGuide.RAMADAN_GUIDE_SECTIONS) {
  add(ramadanKeys, section.title);
  for (const item of section.items) for (const value of [item.title, item.translation]) add(ramadanKeys, value);
}

renderScreen(hajj, { onBack() {}, onOpenDuas() {} });
renderScreen(umrah, { onBack() {}, onOpenDuas() {} });
for (const tab of ['checklist', 'tips', 'etiquette', 'mistakes', 'books']) {
  activeTabOverride = tab;
  renderScreen(resources, { onBack() {}, onOpenDuas() {} });
}
activeTabOverride = null;
renderScreen(ramadanScreen, { onBack() {} });

const allKeys = new Set([...hajjKeys, ...umrahKeys, ...resourceKeys, ...ramadanKeys]);
const hajjConvertedCount = hajj.HAJJ_DAYS.reduce(
  (total, day) => total + 1 + day.rituals.length * 2 + (day.duas ?? []).length * 2 + day.practicalNotes.length,
  0,
);
const umrahConvertedCount = umrah.UMRAH_STEPS.reduce(
  (total, step) => total + 1 + step.keyActions.length + (step.duas ?? []).length * 2 + (step.criticalNotes ?? []).length,
  0,
);
const resourceConvertedCount = resources.RECOMMENDED_BOOKS.length * 2 + resources.COMMON_MISTAKES.length * 2;
assert.equal(hajjConvertedCount, 69);
assert.equal(umrahConvertedCount, 47);
assert.equal(resourceConvertedCount, 20);
for (const [name, keys] of [['HajjJourneyScreen', hajjKeys], ['UmrahGuideScreen', umrahKeys], ['UmrahResourcesScreen', resourceKeys], ['ramadanGuide', ramadanKeys]]) {
  for (const key of keys) assert.ok(calls.has(key), `${name}: raw data string did not reach t(): ${key}`);
}

const locales = Object.fromEntries(['en', 'ur', 'ar'].map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(path.join(repo, `src/locales/${locale}.json`), 'utf8')),
]));
const baseEnglish = JSON.parse(execFileSync('git', ['show', 'HEAD:src/locales/en.json'], { cwd: repo, encoding: 'utf8' }));
const pilotKeys = [...allKeys].filter((key) => !Object.hasOwn(baseEnglish, key));
for (const key of allKeys) {
  assert.equal(locales.en[key], key, `English locale missing or changed key: ${key}`);
  assert.ok(Object.hasOwn(locales.ur, key), `Urdu locale missing key: ${key}`);
  assert.ok(Object.hasOwn(locales.ar, key), `Arabic locale missing key: ${key}`);
  assert.match(locales.ur[key], /[\u0600-\u06ff\u0750-\u077f]/, `Urdu translation is not Arabic-script text: ${key}`);
  assert.match(locales.ar[key], /[\u0600-\u06ff]/, `Arabic translation is not Arabic-script text: ${key}`);
}
for (const file of fs.readdirSync(path.join(repo, 'src/locales')).filter((name) => name.endsWith('.json') && !['en.json', 'ur.json', 'ar.json'].includes(name))) {
  const locale = JSON.parse(fs.readFileSync(path.join(repo, 'src/locales', file), 'utf8'));
  const unexpected = pilotKeys.filter((key) => Object.hasOwn(locale, key));
  assert.deepEqual(unexpected, [], `${file} unexpectedly contains pilot keys`);
}

const sourceKeys = new Set([...allKeys]);
let addedKeyCount = 0;
for (const key of sourceKeys) {
  if (!Object.hasOwn(baseEnglish, key)) {
    addedKeyCount += 1;
    assert.notEqual(locales.ur[key], key, `Urdu key was left in English: ${key}`);
    assert.notEqual(locales.ar[key], key, `Arabic key was left in English: ${key}`);
    assert.doesNotMatch(locales.ur[key], /[A-Za-z]{2,}/, `Urdu pilot value contains an untranslated Latin word: ${key}`);
    assert.doesNotMatch(locales.ar[key], /[A-Za-z]{2,}/, `Arabic pilot value contains an untranslated Latin word: ${key}`);
  }
}

assert.equal(hajj.HAJJ_DAYS.length, 5);
assert.equal(umrah.UMRAH_STEPS.length, 5);
assert.equal(ramadanGuide.RAMADAN_GUIDE_SECTIONS.length, 8);
assert.equal(addedKeyCount, 157, 'Unexpected pilot key count; inspect the source arrays and locale additions');
const ramadanAddedKeyCount = [...ramadanKeys].filter((key) => !Object.hasOwn(baseEnglish, key)).length;
assert.equal(ramadanAddedKeyCount, 26);
const countNew = (keys) => [...keys].filter((key) => !Object.hasOwn(baseEnglish, key)).length;
console.log(`PASS: ${allKeys.size} rendered data keys reached t(); conversions Hajj=${hajjConvertedCount}, Umrah=${umrahConvertedCount}, resources=${resourceConvertedCount}, ramadan=0; ${addedKeyCount} pilot keys exist in en/ur/ar (new Hajj=${countNew(hajjKeys)}, Umrah=${countNew(umrahKeys)}, resources=${countNew(resourceKeys)}, Ramadan=${ramadanAddedKeyCount}).`);
