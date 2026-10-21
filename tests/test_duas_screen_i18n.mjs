import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const calls = [];
const renderedTouchables = [];
let stateIndex = 0;

const primitive = (props = {}) => props.children ?? null;
const React = {
  createElement(type, props, ...children) {
    const node = { type, props: { ...(props ?? {}), children } };
    if (type === TouchableOpacity) renderedTouchables.push(node);
    return node;
  },
  Fragment: Symbol('Fragment'),
  useEffect() {},
  useMemo(factory) { return factory(); },
  useRef(value) { return { current: value }; },
  useState(initial) {
    const index = stateIndex++;
    if (index === 2) return [false, () => {}];
    if (index === 4) return [duas[0], () => {}];
    return [initial, () => {}];
  },
};

const tokens = {
  bgTop: '#fff', bgSurface: '#fff', cardTop: '#fff', cardBorder: '#ddd', borderSubtle: '#ddd',
  ringFill: '#eee', ringBorder: '#ccc', text: '#111', textPrimary: '#111', muted: '#666',
  textMuted: '#666', gold: '#c90', goldBorder: '#a70', accent: '#060',
};

function TouchableOpacity(props = {}) { return props.children ?? null; }

function mockModule(request) {
  if (request === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
  if (request === 'expo-audio') return {};
  if (request === 'react') return { __esModule: true, default: React, ...React };
  if (request === 'react-native') {
    return {
      __esModule: true,
      Image: primitive,
      ScrollView: primitive,
      Share: { share: async () => {} },
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
      TextInput: primitive,
      TouchableOpacity,
      View: primitive,
      Platform: { OS: 'android' },
      useWindowDimensions: () => ({ width: 420, height: 900 }),
    };
  }
  if (request === '@expo/vector-icons') return { Ionicons: primitive };
  if (request === 'expo-linear-gradient') return { LinearGradient: primitive };
  if (request === 'react-native-view-shot') return { captureRef: async () => 'file:///share.png' };
  if (request === 'expo-sharing') return { isAvailableAsync: async () => false, shareAsync: async () => {} };
  if (request.includes('/components/ui/AppText')) return { AppText: primitive };
  if (request.endsWith('/components/ui')) return { PremiumCard: primitive };
  if (request.includes('/components/ArabicText')) return { ArabicText: primitive };
  if (request.includes('/components/Hairline')) return { Hairline: primitive };
  if (request.includes('/components/EmptyState')) return { EmptyState: primitive };
  if (request.includes('/components/layout/SubHeader')) return { SubHeader: primitive };
  if (request.includes('/components/layout/DetailScreen')) {
    const DetailScreen = primitive;
    DetailScreen.FlatList = (props = {}) => Array.isArray(props.data)
      ? props.data.map((item, index) => props.renderItem?.({ item, index }) ?? null)
      : props.ListEmptyComponent ?? null;
    return { DetailScreen };
  }
  if (request.includes('/components/Skeleton')) return { DuaCardSkeleton: primitive };
  if (request.includes('/theme/tokens')) {
    return {
      cardTokens: { borderRadius: 12 },
      fontRoles: { arabicNoto: 'Arabic' },
      getBrandLogoSource: () => null,
      useThemeTokens: () => ({ tokens, mode: 'light' }),
    };
  }
  if (request.includes('/lib/homeThemeTokens')) return { getCardShadow: () => ({}), getPillShadow: () => ({}) };
  if (request.includes('/lib/rtl')) return { hScrollRTLStyle: () => ({}) };
  if (request.endsWith('/lib/i18n') || request.endsWith('/lib/i18n.ts')) {
    return {
      t: (key) => { calls.push(String(key)); return String(key); },
      isRTL: () => false,
    };
  }
  if (request.endsWith('/lib/searchHistory') || request.endsWith('/lib/searchHistory.ts')) {
    return { useSearchHistory: () => ({ history: [], addQuery() {}, removeQuery() {}, clearHistory() {} }) };
  }
  if (request.endsWith('/lib/settings') || request.endsWith('/lib/settings.tsx')) return { useSettings: () => ({ settings: {} }) };
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
    compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
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
  new Function('require', 'module', 'exports', '__dirname', output)(localRequire, module, module.exports, path.dirname(absolute));
  return module.exports;
}

function render(node) {
  if (node == null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return;
  if (Array.isArray(node)) return node.forEach(render);
  if (node.type === React.Fragment) return render(node.props?.children);
  if (typeof node.type === 'function') return render(node.type(node.props ?? {}));
  render(node.props?.children);
}

const duas = loadProduction(path.join(repo, 'src/lib/duas.ts')).DUAS_DATA;
const screen = loadProduction(path.join(repo, 'src/screens/DuasScreen.tsx'));
render(screen.default({ onBack() {} }));

const keyFields = new Set(duas.flatMap((item) => [item.category, item.title, item.translation]));
for (const key of keyFields) assert.ok(calls.includes(key), `dua key did not reach t(): ${key}`);
for (const key of ['Source', 'Duas & Adhkar']) assert.ok(calls.includes(key), `screen key did not reach t(): ${key}`);
const firstCategoryCount = duas.filter((item) => item.category === duas[0].category).length;
assert.ok(calls.filter((key) => key === duas[0].category).length >= firstCategoryCount + 1, 'category must reach t() in card and share card');
assert.ok(calls.filter((key) => key === 'Duas & Adhkar').length >= 2, 'share-card separator label must reach t()');
assert.ok(calls.filter((key) => key === duas[0].translation).length >= 2, 'translation must reach t() in card and share card');
const shareButton = renderedTouchables.find((node) => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('Share '));
assert.ok(shareButton, 'share button was not rendered');
await shareButton.props.onPress();
assert.ok(calls.filter((key) => key === duas[0].title).length >= 3, 'title must reach t() in card, share card, and share text');
assert.ok(calls.filter((key) => key === duas[0].translation).length >= 3, 'translation must reach t() in card, share card, and share text');
assert.ok(calls.filter((key) => key === 'Source').length >= duas.length + 2, 'Source must reach t() in cards, share card, and share text');

for (const locale of ['en', 'ur', 'ar']) {
  const values = JSON.parse(fs.readFileSync(path.join(repo, `src/locales/${locale}.json`), 'utf8'));
  for (const key of [...keyFields, 'Source', 'Duas & Adhkar']) assert.ok(Object.hasOwn(values, key), `${locale} missing key: ${key}`);
}

console.log(`PASS: dua keys=${keyFields.size}, t() calls=${calls.length}`);
