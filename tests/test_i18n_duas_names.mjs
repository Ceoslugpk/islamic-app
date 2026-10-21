import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import vm from 'node:vm';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const calls = new Set();
const callCounts = new Map();

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
    return [initial === true ? false : initial, () => {}];
  },
};

const tokens = {
  bgTop: '#fff', bgSurface: '#fff', cardTop: '#fff', cardBorder: '#ddd', borderSubtle: '#ddd',
  ringFill: '#eee', ringBorder: '#ccc', text: '#111', textPrimary: '#111', muted: '#666',
  textMuted: '#666', gold: '#c90', goldBorder: '#a70', accent: '#060',
};

function flatList(props = {}) {
  if (!Array.isArray(props.data)) return props.ListEmptyComponent ?? null;
  return props.data.map((item, index) => props.renderItem?.({ item, index }) ?? null);
}

function mockModule(request) {
  if (request === 'react') return { __esModule: true, default: React, ...React };
  if (request === 'react-native') {
    return {
      __esModule: true,
      ActivityIndicator: primitive,
      Image: primitive,
      ScrollView: primitive,
      Share: { share: async () => {} },
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
      TextInput: primitive,
      TouchableOpacity: primitive,
      View: primitive,
      Platform: { OS: 'web' },
      useWindowDimensions: () => ({ width: 420, height: 900 }),
    };
  }
  if (request === '@expo/vector-icons') return { Ionicons: primitive };
  if (request === 'expo-linear-gradient') return { LinearGradient: primitive };
  if (request === 'react-native-view-shot') return { captureRef: async () => 'file:///share.png' };
  if (request === 'expo-sharing') return { isAvailableAsync: async () => false, shareAsync: async () => {} };
  if (request === 'react-i18next') return { useTranslation: () => ({ t: (key) => String(key) }) };
  if (request.includes('/components/ui/AppText')) return { AppText: primitive };
  if (request.endsWith('/components/ui')) return { PremiumCard: primitive };
  if (request.includes('/components/ArabicText')) return { ArabicText: primitive };
  if (request.includes('/components/EmptyState')) return { EmptyState: primitive };
  if (request.includes('/components/layout/SubHeader')) return { SubHeader: primitive };
  if (request.includes('/components/layout/DetailScreen')) {
    const DetailScreen = primitive;
    DetailScreen.FlatList = flatList;
    return { DetailScreen };
  }
  if (request.includes('/components/Skeleton')) {
    return { DuaCardSkeleton: primitive, NameRowSkeleton: primitive };
  }
  if (request.includes('/theme/tokens')) {
    return {
      cardTokens: { borderRadius: 12 },
      fontRoles: { arabicNoto: 'Arabic', body: {}, label: {}, title: {}, eyebrow: {}, numeral: {} },
      getBrandLogoSource: () => null,
      useThemeTokens: () => ({ tokens, mode: 'light' }),
    };
  }
  if (request.includes('/lib/homeThemeTokens')) return { getCardShadow: () => ({}), getPillShadow: () => ({}) };
  if (request.includes('/lib/rtl')) return { hScrollRTLStyle: () => ({}) };
  if (request.includes('/lib/iconMap')) return { getForwardIcon: () => 'chevron-forward' };
  if (request.includes('/lib/i18n')) {
    return {
      t: (key) => {
        const value = String(key);
        calls.add(value);
        callCounts.set(value, (callCounts.get(value) ?? 0) + 1);
        return value;
      },
      isRTL: () => false,
    };
  }
  if (request.includes('/lib/searchHistory')) {
    return { useSearchHistory: () => ({ history: [], addQuery() {}, removeQuery() {}, clearHistory() {} }) };
  }
  if (request.includes('/lib/settings')) {
    return { useSettings: () => ({ settings: { namesLanguage: 'en' }, setNamesLanguage() {} }) };
  }
  if (request.includes('/lib/names99')) {
    return {
      NAMES_99: [],
      NAMES_LANGUAGES: [{ code: 'en', label: 'English' }],
      fetchNames: async () => ({ names: [], provider: 'Bundled' }),
      loadCachedNames: async () => null,
    };
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

const duas = loadProduction(path.join(repo, 'src/lib/duas.ts')).DUAS_DATA;
const prophets = loadProduction(path.join(repo, 'src/lib/prophetNames.ts')).PROPHET_NAMES_99;
const namesScreen = loadProduction(path.join(repo, 'src/screens/NamesScreen.tsx'));

render(namesScreen.default({ onBack() {}, variant: 'prophet' }));

const requiredDuaKeys = new Set(duas.flatMap((item) => [item.category, item.title, item.translation]));
const requiredProphetKeys = new Set(
  prophets.flatMap((item) => [item.transliteration, item.meaning, item.note].filter((value) => typeof value === 'string')),
);
const requiredScreenKeys = new Set([
  'Asma un-Nabi ﷺ · Names of the Prophet',
  'Asma ul-Husna · The 99 Names of Allah',
]);
const requiredKeys = new Set([...requiredDuaKeys, ...requiredProphetKeys, ...requiredScreenKeys]);

for (const key of requiredProphetKeys) {
  assert.ok(calls.has(key), `prophetNames value did not reach t(): ${key}`);
}
for (const item of prophets) {
  assert.ok((callCounts.get(item.transliteration) ?? 0) >= 2, `Prophet name needs card and accessibility t() calls: ${item.transliteration}`);
  assert.ok((callCounts.get(item.meaning) ?? 0) >= 1, `Prophet meaning did not render through t(): ${item.meaning}`);
  if (item.note) assert.ok((callCounts.get(item.note) ?? 0) >= 1, `Prophet note did not render through t(): ${item.note}`);
}

const locales = Object.fromEntries(['en', 'ur', 'ar'].map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(path.join(repo, `src/locales/${locale}.json`), 'utf8')),
]));
for (const key of requiredKeys) {
  assert.ok(Object.hasOwn(locales.en, key), `English locale missing key: ${key}`);
  assert.ok(Object.hasOwn(locales.ur, key), `Urdu locale missing key: ${key}`);
  assert.ok(Object.hasOwn(locales.ar, key), `Arabic locale missing key: ${key}`);
}

const baseEnglish = JSON.parse(execFileSync(
  'git', ['show', 'HEAD:src/locales/en.json'], { cwd: repo, encoding: 'utf8' },
));
const newKeys = [...requiredKeys].filter((key) => !Object.hasOwn(baseEnglish, key));
for (const file of fs.readdirSync(path.join(repo, 'src/locales')).filter((name) => name.endsWith('.json') && !['en.json', 'ur.json', 'ar.json'].includes(name))) {
  const locale = JSON.parse(fs.readFileSync(path.join(repo, 'src/locales', file), 'utf8'));
  for (const key of newKeys) assert.ok(!Object.hasOwn(locale, key), `${file} unexpectedly contains family-2 key: ${key}`);
}

console.log(`PASS: prophet render keys=${requiredProphetKeys.size}, dua keys=${requiredDuaKeys.size}, keys absent from HEAD=${newKeys.length}`);
