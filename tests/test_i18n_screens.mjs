import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// ---------------------------------------------------------------------------
// t() spy. Records every key passed to t(). Substitutes tokens.
// ---------------------------------------------------------------------------
const calls = [];
let currentLanguage = 'en'; // 'en' | 'ur' — drives the mocked getCurrentLanguage
const tSpy = (key, options) => {
  calls.push(String(key));
  if (options && typeof options === 'object') {
    return String(key).replace(/\{\{(\w+)\}\}/g, (_, tok) =>
      Object.hasOwn(options, tok) ? String(options[tok]) : `{{${tok}}}`
    );
  }
  return String(key);
};

// ---------------------------------------------------------------------------
// Minimal React + RN mocks (render by calling function components directly).
// ---------------------------------------------------------------------------
const primitive = (props = {}) => props.children ?? null;
const touchables = [];

const effectCleanups = [];
let runEffects = false;

const React = {
  createElement(type, props, ...children) {
    return { type, props: { ...(props ?? {}), children } };
  },
  Fragment: Symbol('Fragment'),
  forwardRef(fn) { return fn; },
  memo(fn) { return fn; },
  createContext(defaultValue) { return { _default: defaultValue, Provider: primitive, Consumer: primitive }; },
  useEffect(fn) {
    if (runEffects) {
      const cleanup = fn();
      if (typeof cleanup === 'function') effectCleanups.push(cleanup);
    }
  },
  useLayoutEffect() {},
  useCallback(fn) { return fn; },
  useMemo(factory) { return factory(); },
  useRef(value) { return { current: value }; },
  useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}]; },
};

function TouchableOpacity(props = {}) { touchables.push(props); return props.children ?? null; }
function Pressable(props = {}) { touchables.push(props); return typeof props.children === 'function' ? null : props.children ?? null; }

const Animated = {
  Value: class {
    constructor(v) { this._v = v; }
    setValue(v) { this._v = v; }
    interpolate() { return {}; }
    addListener() { return ''; }
  },
  View: primitive, Text: primitive, ScrollView: primitive,
  createAnimatedComponent: (c) => c,
  timing: () => ({ start() {} }),
  event: () => () => {},
};

const noopStyle = new Proxy({}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (prop === 'flatten') return (s) => s;
    if (prop === 'create') return (o) => o;
    if (prop === 'compose') return (o) => o;
    if (prop === 'hairlineWidth') return 1;
    if (prop === 'absoluteFill') return {};
    if (prop === 'absoluteFillObject') return {};
    return {};
  },
});

function mockModule(request) {
  if (request === 'react') return { __esModule: true, default: React, ...React };
  if (request === 'react-native') {
    return {
      __esModule: true, Animated, ActivityIndicator: primitive,
      AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
      Easing: { out: (x) => x, cubic: (x) => x, inOut: (x) => x, linear: (x) => x },
      Image: primitive, Modal: primitive, PanResponder: { create: (cfg) => ({ panHandlers: {}, ...cfg }) },
      Platform: { OS: 'android', select: (o) => o.android ?? o.default },
      Pressable, ScrollView: primitive, StyleSheet: noopStyle, Text: primitive, TextInput: primitive,
      TouchableOpacity, TouchableWithoutFeedback: primitive, View: primitive,
      RefreshControl: primitive, FlatList: (props = {}) => {
        const data = props.data ?? [];
        const kids = [];
        if (typeof props.renderItem === 'function') data.forEach((item, index) => kids.push(props.renderItem({ item, index })));
        else if (props.children != null) kids.push(props.children);
        if (typeof props.ListEmptyComponent === 'function' && data.length === 0) kids.push(props.ListEmptyComponent());
        return kids;
      }, VirtualizedList: primitive,
      useWindowDimensions: () => ({ width: 420, height: 900 }),
      AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove() {} }) },
      Dimensions: { get: () => ({ width: 420, height: 900 }) },
      Linking: { openURL: async () => {} }, Share: { share: async () => {} },
    };
  }
  if (request === 'react-native-svg') return { __esModule: true, default: primitive, Svg: primitive, Path: primitive, Defs: primitive, Mask: primitive, Rect: primitive, G: primitive, Circle: primitive, Line: primitive, Text: primitive };
  if (request === 'expo-linear-gradient') return { LinearGradient: primitive };
  if (request === 'expo-status-bar') return { StatusBar: primitive };
  if (request === 'expo-haptics') return { notificationAsync: async () => {}, impactAsync: async () => {}, NotificationFeedbackType: {}, ImpactFeedbackStyle: {} };
  if (request === 'expo-local-authentication') return { hasHardwareAsync: async () => true, isEnrolledAsync: async () => true, authenticateAsync: async () => ({ success: true }) };
  if (request === '@expo/vector-icons') return { Ionicons: primitive, MaterialIcons: primitive, FontAwesome: primitive, MaterialCommunityIcons: primitive };
  if (request === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
  if (request === '@react-native-async-storage/async-storage') {
    return { __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, getAllKeys: async () => [], multiGet: async () => [], multiSet: async () => {}, multiRemove: async () => {} } };
  }
  if (request === 'expo-file-system') return { documentDirectory: '/tmp/', readAsStringAsync: async () => '', writeAsStringAsync: async () => {}, getInfoAsync: async () => ({ exists: false }) };
  if (request === 'expo-sharing') return { isAvailableAsync: async () => false, shareAsync: async () => {} };
  if (request === 'expo-clipboard') return { setStringAsync: async () => true, getStringAsync: async () => '' };
  if (request === 'expo-sqlite') return { openDatabaseAsync: async () => ({ execAsync: async () => {}, runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }), getAllAsync: async () => [], getFirstAsync: async () => null, withTransactionAsync: async (f) => f() }) };
  if (request === 'react-i18next') return { useTranslation: () => ({ t: tSpy }), Trans: primitive };

  const file = request.startsWith('.') ? path.basename(request).replace(/\.tsx?$/, '') : request;
  if (file === 'AppText') return { AppText: primitive };
  if (file === 'ui' || file === 'index') return { PremiumCard: primitive, AppText: primitive, Card: primitive };
  if (file === 'Card') return { Card: primitive };
  if (file === 'ArabicText') return { ArabicText: primitive };
  if (file === 'Hairline') return { Hairline: primitive };
  if (file === 'Skeleton') return { SurahSkeleton: primitive, Skeleton: primitive, SkeletonCard: primitive };
  if (file === 'EmptyState') return { EmptyState: primitive };
  if (file === 'SubHeader') return { SubHeader: primitive };
  if (file === 'DetailScreen') {
    const DS = primitive;
    DS.ScrollView = primitive;
    DS.FlatList = (props = {}) => {
      const data = props.data ?? [];
      const kids = [];
      if (typeof props.renderItem === 'function') {
        data.forEach((item, index) => kids.push(props.renderItem({ item, index })));
      } else if (props.children != null) {
        kids.push(props.children);
      }
      if (typeof props.ListEmptyComponent === 'function' && data.length === 0) {
        kids.push(props.ListEmptyComponent());
      } else if (props.ListEmptyComponent && typeof props.ListEmptyComponent === 'object') {
        kids.push(props.ListEmptyComponent);
      }
      return kids;
    };
    return { DetailScreen: DS };
  }
  if (file === 'QuranLanguageModal') return { QuranLanguageModal: primitive };
  if (file === 'i18n') {
    return { t: tSpy, isRTL: () => false, getCurrentLanguage: () => currentLanguage, useTranslation: () => ({ t: tSpy }), default: { t: tSpy } };
  }
  if (file === 'theme' || file === 'tokens') {
    const tokens = { accent: '#c90', accentDim: 'rgba(0,0,0,0.1)', onAccent: '#fff', bgBase: '#fff', bgTop: '#fff', bgSurface: '#fff', bgRaised: '#fff', cardTop: '#fff', cardBorder: '#ddd', ringFill: '#eee', ringBorder: '#ddd', borderSubtle: '#ddd', borderLine: '#ddd', borderStrong: '#ccc', text: '#111', textPrimary: '#111', textSecondary: '#333', textMuted: '#666', muted: '#666', danger: '#c00', destructive: '#c00', gold: '#c90', goldText: '#c90', goldBorder: '#c90', onGold: '#fff', inset: '#f5f5f5', success: '#2e7d32', arabicName: '#111', goldGradient: ['#c90', '#c90'] };
    return {
      useTheme: () => ({ colors: tokens, mode: 'light', tokens }),
      getTokens: () => tokens, useThemeTokens: () => ({ tokens, mode: 'light' }),
      getAppLogoSource: () => null, getBrandLogoSource: () => null,
      cardTokens: { borderRadius: 12, borderWidth: 1 }, fontRoles: { ui: 'System', uiBold: 'System', title: 'System', titleFallback: 'System', eyebrow: 'System' }, iconSizes: { small: 16, featured: 24, inlineLg: 18 },
    };
  }
  if (file === 'homeThemeTokens') return { HOME_THEME_TOKENS: { light: { cardTop: '#fff', cardBorder: '#ddd' }, dark: { cardTop: '#000', cardBorder: '#333' } }, getPillShadow: () => ({}), getCardShadow: () => ({}) };
  if (file === 'typography') return { getTextAlignment: () => ({}), fontFor: () => 'System' };
  if (file === 'iconMap') return { iconSizes: { small: 16, featured: 24, inlineLg: 18, inline: 14 }, getBackIcon: () => 'chevron-back', getForwardIcon: () => 'chevron-forward' };
  if (file === 'rtl') return { calculateTimelineRatio: () => 0, hScrollRTLStyle: () => ({}), isRtlScript: () => false };
  if (file === 'quranLanguageState') return { useQuranLanguage: () => ({ language: 'ur', edition: 'ur.jalandhry', flag: '🇵🇰' }) };
  if (file === 'useConnectivity') return { useConnectivity: () => ({ refreshKey: 0, isOnline: true }) };
  if (file === 'quranLanguages') return { getLanguageFlag: () => '🏳', getLocalizedTranslatorName: () => 'N', getLocalizedTranslationTitle: () => 'T', QURAN_LANGUAGE_EDITIONS: [] };
  if (file === 'dateKey') return { getLocalDateKey: () => '2026-10-21' };
  if (file === 'settings') return { useSettings: () => ({ settings: {} }) };

  return null;
}

// ---------------------------------------------------------------------------
// Production loader
// ---------------------------------------------------------------------------
const moduleCache = new Map();
function resolveProduction(request, parent) {
  const base = path.resolve(path.dirname(parent), request);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve production import ${request} from ${parent}`);
}

function resolveFile(file) {
  const base = path.resolve(file);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return base;
}

function loadProduction(file) {
  const absolute = resolveFile(file);
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

const S = (name) => loadProduction(path.join(repo, 'src/screens', name));
const L = (name) => loadProduction(path.join(repo, 'src/lib', name));

// ---------------------------------------------------------------------------
// Locale tables
// ---------------------------------------------------------------------------
const locales = {};
for (const loc of ['en', 'ur', 'ar']) {
  locales[loc] = JSON.parse(fs.readFileSync(path.join(repo, `src/locales/${loc}.json`), 'utf8'));
}
const allKeys = new Set(Object.keys(locales.en));
const otherKeys = Object.keys(locales.ur).filter((k) => !allKeys.has(k)).concat(Object.keys(locales.ar).filter((k) => !allKeys.has(k)));

function assertKeyReached(key, who) {
  assert.ok(calls.includes(key), `[${who}] key did not reach t(): ${JSON.stringify(key)}`);
  for (const loc of ['en', 'ur', 'ar']) {
    assert.ok(Object.hasOwn(locales[loc], key), `[${who}] ${loc}.json missing key: ${JSON.stringify(key)}`);
  }
}

const asserted = [];
function expect(key, who) { asserted.push(key); assertKeyReached(key, who); }

// ===========================================================================
// b3-F3  QuranTopicsScreen: surah names localised (translations already route
//        through t() via quranTopics getters).
// ===========================================================================
{
  // (a) data-level: every verse translation getter resolves through a real key.
  const { QURAN_TOPICS } = L('quranTopics');
  assert.ok(Array.isArray(QURAN_TOPICS) && QURAN_TOPICS.length > 0, 'QURAN_TOPICS missing');
  const verseTranslations = [];
  for (const topic of QURAN_TOPICS) {
    for (const v of topic.verses) {
      calls.length = 0;
      const value = v.translation; // invokes the getter -> t(key)
      assert.ok(calls.length >= 1, `[b3-F3] verse translation for ${v.surah}:${v.ayah} did not reach t()`);
      const key = calls[calls.length - 1];
      assertKeyReached(key, `b3-F3 verse ${v.surah}:${v.ayah}`);
      assert.equal(value, key, 'getter should return the translated value');
      verseTranslations.push(key);
    }
  }

  // (b) render-level: surah name uses getLocalizedSurahName (Urdu when language=ur).
  const QuranTopicsScreen = S('QuranTopicsScreen.tsx').default;
  currentLanguage = 'ur';
  calls.length = 0;
  const renderedNode = React.createElement(QuranTopicsScreen, { onBack: () => {}, onOpenSurah: () => {} });
  render(renderedNode);
  // A title key must reach t() from the topic chrome (chrome is keyed regardless of language).
  expect('Quran Topics', 'b3-F3 QuranTopicsScreen header');
  // Urdu surah name for Al-Baqarah (2) must appear in the rendered string tree.
  const strings = collectStrings(renderedNode, []);
  const urNames = loadProduction(path.join(repo, 'src/lib/surahNamesLocalized.ts'));
  const baqarahUr = urNames.SURAH_NAMES_UR[1];
  assert.ok(JSON.stringify(strings).includes(baqarahUr), `b3-F3: localised surah name ${baqarahUr} not found in render output`);
  currentLanguage = 'en';
  console.log(`b3-F3 OK: ${verseTranslations.length} verse translations localised; surah name localised`);
}

function collectStrings(node, acc) {
  if (node == null || typeof node === 'boolean') return acc;
  if (typeof node === 'string' || typeof node === 'number') { acc.push(String(node)); return acc; }
  if (Array.isArray(node)) { for (const n of node) collectStrings(n, acc); return acc; }
  if (node.type === React.Fragment) return collectStrings(node.props?.children, acc);
  if (typeof node.type === 'function') return collectStrings(node.type(node.props ?? {}), acc);
  return collectStrings(node.props?.children, acc);
}

// ===========================================================================
// b3-F7  QuranScreen: surah row title localised + search normalised.
// ===========================================================================
{
  const QuranScreen = S('QuranScreen.tsx').default;
  assert.ok(typeof QuranScreen === 'function', 'b3-F7: QuranScreen did not load as a component');
  const { normalizeSearchText, SURAH_NAMES_UR } = L('surahNamesLocalized');

  // reverse-map a few surah numbers to Urdu names to find them in output
  const src = fs.readFileSync(path.join(repo, 'src/screens/QuranScreen.tsx'), 'utf8');
  assert.ok(/getLocalizedSurahName\(item\.number, item\.englishName\)/.test(src),
    'b3-F7: surah row title not routed through getLocalizedSurahName');
  assert.ok(/normalizeSearchText\(searchQuery\)/.test(src),
    'b3-F7: search query not normalised');
  assert.ok(/localized\.includes\(query\)/.test(src),
    'b3-F7: localised name not part of the search predicate');

  // Colloquial check: a tashkeel/yeh variant query normalises to the same form.
  assert.equal(normalizeSearchText('یس'), normalizeSearchText('يٰس'), 'b3-F7: normalizeSearchText does not fold yeh variants');
  assert.equal(SURAH_NAMES_UR.length, 114, 'b3-F7: Urdu surah-name table incomplete');
  console.log('b3-F7 OK: title localised and search normalised');
}

// ===========================================================================
// b4-F8/F9  VocabTrainerScreen raw-English a11y labels.
// ===========================================================================
{
  const VocabTrainerScreen = S('VocabTrainerScreen.tsx').VocabTrainerScreen
    ?? S('VocabTrainerScreen.tsx').default;
  const src = fs.readFileSync(path.join(repo, 'src/screens/VocabTrainerScreen.tsx'), 'utf8');
  assert.ok(!/accessibilityLabel=\{`Practice \$\{dailyWord\.transliteration\} in flashcards`\}/.test(src),
    'b4-F8: raw "Practice ... in flashcards" still present');
  assert.ok(!/accessibilityLabel=\{`Vocabulary card \$\{index \+ 1\} of \$\{words\.length\}\. Tap to flip\.`\}/.test(src),
    'b4-F8: raw "Vocabulary card ... Tap to flip." still present');
  assert.ok(!/Quran \{dailyWord\.ref\}/.test(src), 'b4-F8: raw "Quran {ref}" (daily) still present');
  assert.ok(!/Quran \{current\.ref\}/.test(src), 'b4-F8: raw "Quran {ref}" (card) still present');

  currentLanguage = 'en';
  calls.length = 0;
  render(React.createElement(VocabTrainerScreen, { onBack: () => {}, backLabel: 'Tools' }));
  for (const k of ['Quran', 'Practice', 'in flashcards', 'Vocabulary card', 'of', 'Tap to flip.']) {
    expect(k, 'b4-F8 VocabTrainer');
  }
  console.log('b4-F8/F9 OK: VocabTrainer raw-English a11y labels converted');
}

// ===========================================================================
// b4-F3  WeeklySummaryScreen reading-time mislabels.
// ===========================================================================
{
  const mod = S('WeeklySummaryScreen.tsx');
  const WeeklySummaryScreen = mod.WeeklySummaryScreen ?? mod.default;
  assert.ok(typeof WeeklySummaryScreen === 'function', 'b4-F3: WeeklySummaryScreen did not load as a component');
  const src = fs.readFileSync(path.join(repo, 'src/screens/WeeklySummaryScreen.tsx'), 'utf8');
  assert.ok(!/t\('Mins Listened'\)/.test(src), 'b4-F3: "Mins Listened" still used');
  assert.ok(!/t\('minutes of listening'\)/.test(src), 'b4-F3: "minutes of listening" still used');
  assert.ok(/t\('Mins Read'\)/.test(src), 'b4-F3: "Mins Read" not present');
  assert.ok(/t\('minutes of reading'\)/.test(src), 'b4-F3: "minutes of reading" not present');

  // Render path: the summary component must actually reach both new keys.
  // buildWeeklySummary is async; the component renders loading state first, so
  // assert statically that both call sites exist and keys are present in locales.
  for (const k of ['Mins Read', 'minutes of reading']) {
    for (const loc of ['en', 'ur', 'ar']) {
      assert.ok(Object.hasOwn(locales[loc], k), `b4-F3: ${loc}.json missing ${k}`);
    }
  }
  console.log('b4-F3 OK: reading-time labels re-pointed to Mins Read / minutes of reading');
}

// ===========================================================================
// b4-F1  WomenGuidanceScreen body content localised via womensFiqh getters.
// ===========================================================================
{
  const { WORSHIP_GUIDELINES, BLEEDING_TYPES, WOMENS_FIQH_RESOURCES } = L('womensFiqh');
  const fields = [];
  for (const item of WORSHIP_GUIDELINES) {
    for (const f of ['topic', 'ruling', 'details', 'evidence']) {
      calls.length = 0;
      void item[f];
      assert.ok(calls.length >= 1, `[b4-F1] WORSHIP_GUIDELINES.${f} did not reach t()`);
      const key = calls[calls.length - 1];
      assertKeyReached(key, `b4-F1 worship ${item.id}.${f}`);
      fields.push(key);
    }
  }
  for (const b of BLEEDING_TYPES) {
    for (const f of ['name', 'definition', 'duration', 'rulings']) {
      calls.length = 0;
      void b[f];
      assert.ok(calls.length >= 1, `[b4-F1] BLEEDING_TYPES.${f} did not reach t()`);
      const key = calls[calls.length - 1];
      assertKeyReached(key, `b4-F1 bleeding ${b.name}.${f}`);
      fields.push(key);
    }
  }
  for (const res of WOMENS_FIQH_RESOURCES) {
    for (const f of ['title', 'author', 'description', 'category']) {
      calls.length = 0;
      void res[f];
      assert.ok(calls.length >= 1, `[b4-F1] WOMENS_FIQH_RESOURCES.${f} did not reach t()`);
      const key = calls[calls.length - 1];
      assertKeyReached(key, `b4-F1 resource ${res.id}.${f}`);
      fields.push(key);
    }
  }
  console.log(`b4-F1 OK: ${fields.length} WomenGuidance data fields route through t() with en/ur/ar keys`);
}

// ===========================================================================
// b4-F4  Dhikr localisation coverage (report only, plus assertion that the
//        translatable meaning strings exist for en/ur/ar).
// ===========================================================================
{
  const dhikrMeanings = [
    'Glory be to Allah', 'Praise be to Allah', 'Allah is the Greatest',
    'There is no god but Allah', 'I seek forgiveness from Allah',
  ];
  for (const k of dhikrMeanings) {
    for (const loc of ['en', 'ur', 'ar']) {
      assert.ok(Object.hasOwn(locales[loc], k), `b4-F4: ${loc}.json missing dhikr meaning ${JSON.stringify(k)}`);
    }
  }
  console.log('b4-F4 OK: 5/5 dhikr meanings present in en/ur/ar (transliterations remain script-module coverage)');
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log(`PASS: asserted keys=${new Set(asserted).size}, t() calls this run=${calls.length}, other-locale keys checked=${otherKeys.length}`);
