import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const HOME_PATH = path.join(ROOT, 'src/screens/QuranHomeScreen.tsx');

function createTokens() {
  return new Proxy({
    bgTop: '#fff',
    bgRaised: '#fff',
    bgBottom: '#fff',
    cardTop: '#fff',
    cardBorder: '#ddd',
    cardShadow: '#000',
    text: '#111',
    textMuted: '#777',
    muted: '#777',
    accent: '#176b58',
    accentDim: '#e2eee9',
    gold: '#b8862f',
    goldBorder: '#b8862f',
    ringFill: '#f4eede',
    ringBorder: '#b8862f',
    arabicName: '#111',
    onGold: '#fff',
    eyebrow: '#b8862f',
    success: '#176b58',
  }, {
    get(target, property) {
      return property in target ? target[property] : '#123456';
    },
  });
}

function createHarness({ language = 'en', bookmarkItems = [], noteItems = [], tPrefix = '' } = {}) {
  let hookIndex = 0;
  let rendering = false;
  const hookValues = [];
  const hookSetters = [];
  const effectRecords = [];
  const pendingEffects = [];
  const renderPhaseWrites = [];
  let bookmarkStore = bookmarkItems;
  let noteStore = noteItems;

  const React = {
    __esModule: true,
    default: null,
    Fragment: 'Fragment',
    createElement(type, props, ...children) {
      return {
        type,
        props: {
          ...(props || {}),
          children: children.length <= 1 ? (children[0] ?? null) : children,
        },
      };
    },
    memo(component) {
      return component;
    },
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hookValues)) hookValues[index] = typeof initial === 'function' ? initial() : initial;
      const setter = (next) => {
        if (rendering) {
          renderPhaseWrites.push({ index, next });
          return;
        }
        hookValues[index] = typeof next === 'function' ? next(hookValues[index]) : next;
      };
      hookSetters[index] = setter;
      return [hookValues[index], setter];
    },
    useEffect(effect, deps) {
      const index = hookIndex++;
      const previous = effectRecords[index];
      const changed = !previous || !deps || !previous.deps || deps.some((value, i) => value !== previous.deps[i]);
      if (changed) pendingEffects.push({ index, effect, deps, previous });
    },
    useMemo(factory) {
      hookIndex += 1;
      return factory();
    },
    useCallback(callback) {
      hookIndex += 1;
      return callback;
    },
    useRef(initial) {
      const index = hookIndex++;
      if (!(index in hookValues)) hookValues[index] = { current: initial };
      return hookValues[index];
    },
    useSyncExternalStore() {
      hookIndex += 1;
      return language;
    },
  };
  React.default = React;

  const component = (name) => name;
  const tokens = createTokens();
  const surah = {
    number: 2,
    name: 'سُورَةُ الْبَقَرَةِ',
    englishName: 'Al-Baqarah',
    englishNameTranslation: 'The Cow',
    numberOfAyahs: 286,
    revelationType: 'Medinan',
  };

  const requireMap = {
    react: React,
    'react-native': {
      ActivityIndicator: component('ActivityIndicator'),
      BackHandler: { addEventListener: () => ({ remove() {} }) },
      FlatList: component('FlatList'),
      ScrollView: component('ScrollView'),
      StyleSheet: { create: (value) => value, absoluteFill: {} },
      TextInput: component('TextInput'),
      TouchableOpacity: component('TouchableOpacity'),
      useWindowDimensions: () => ({ width: 390, height: 844 }),
      View: component('View'),
    },
    '@expo/vector-icons': { Ionicons: component('Ionicons') },
    'expo-linear-gradient': { LinearGradient: component('LinearGradient') },
    'react-native-svg': { default: component('Svg'), Polygon: component('Polygon') },
    '../components/layout/TabScreen': { TabFlatList: component('TabFlatList') },
    '../components/ui/AppText': { AppText: component('AppText') },
    '../lib/theme': { getCardShadow: () => ({}), getHeroCardShadow: () => ({}), getPillShadow: () => ({}) },
    '../theme/tokens': {
      fontRoles: { arabicNoto: 'Arabic' },
      useThemeTokens: () => ({ mode: 'paper', tokens }),
    },
    '../lib/rtl': { hScrollRTLStyle: () => ({}) },
    '../lib/quran': {
      fetchSurahList: () => Promise.resolve([surah]),
      fetchSurahListForLanguage: () => Promise.resolve(null),
      getBundledSurahs114: () => [surah],
    },
    '../lib/surahs114': { SURAHS_114: [surah] },
    '../lib/diagnostic': {
      useDiagnosticTarget: () => ({ parentProps: {}, targetProps: {} }),
      isDiagnosticModeEnabled: () => false,
    },
    '../components/ArabicText': {
      ArabicText: component('ArabicText'),
      QURAN_FONT_FAMILIES: { notonaskh: { bold: 'Arabic' } },
    },
    '../components/GeometricPattern': { GeometricPattern: component('GeometricPattern') },
    '../lib/i18n': {
      getCurrentLanguage: () => language,
      isRTL: () => language === 'ur',
      t: (key) => `${tPrefix}${key}`,
    },
    '../lib/typography': { getTextAlignment: () => ({}) },
    '../lib/db': {
      loadLastReadPosition: () => null,
      loadQuranCache: () => null,
    },
    '../lib/continuing': {
      getContinueReadingPosition: () => Promise.resolve(null),
      addReadingPositionListener: () => () => {},
    },
    '../lib/surahNamesLocalized': {
      getLocalizedSurahName: (_number, name) => name,
      getLocalizedLanguageName: (value) => value,
      normalizeSearchText: (value) => value,
    },
    '../lib/quranLanguages': {
      getLocalizedTranslatorName: (_id, name) => name,
    },
    '../lib/recentSurahs': {
      getRecentSurahs: () => Promise.resolve([]),
    },
    '../lib/quranLanguageState': {
      useQuranLanguage: () => ({
        language,
        edition: { languageCode: language, language: language, editionIdentifier: 'test', name: 'Test' },
        flag: '🏳️',
      }),
    },
    '../lib/study': {
      getBookmarks: () => bookmarkStore,
      getNotes: () => noteStore,
    },
    '../components/QuranLanguageModal': { QuranLanguageModal: component('QuranLanguageModal') },
    '../lib/quranPreloader': {
      useQuranPreload: () => ({
        progress: { isComplete: true, isRunning: false, cached: 0 },
        startPreload: () => {},
        pausePreload: () => {},
      }),
    },
    '../lib/settings': { useSettings: () => ({ setQuranPreloadRequested: () => {} }) },
    '../lib/useScrollRestore': { useFlatListRestore: () => ({ onScroll: () => {} }) },
    '../lib/searchHistory': {
      useSearchHistory: () => ({
        history: [],
        addQuery: () => {},
        removeQuery: () => {},
        clearHistory: () => {},
      }),
    },
    '../components/EmptyState': { EmptyState: component('EmptyState') },
    '../lib/iconMap': { getForwardIcon: () => 'chevron-forward' },
    '../lib/homeThemeTokens': {
      getPillShadow: () => ({}),
      HOME_THEME_TOKENS: {
        hero: { lightGradient: ['#fff', '#fff'], outerBorder: '#ddd', innerBorder: '#ddd' },
        paper: { gold: '#b8862f', onGold: '#fff' },
        goldGradient: ['#b8862f', '#b8862f'],
      },
    },
  };

  const source = fs.readFileSync(HOME_PATH, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: HOME_PATH,
  }).outputText;
  const moduleObject = { exports: {} };
  const localRequire = (request) => {
    assert.ok(request in requireMap, `Unexpected production import: ${request}`);
    return requireMap[request];
  };
  new Function('module', 'exports', 'require', output)(moduleObject, moduleObject.exports, localRequire);
  const Home = moduleObject.exports.default;

  function commitEffects() {
    const effects = pendingEffects.splice(0);
    for (const record of effects) {
      record.previous?.cleanup?.();
      const cleanup = record.effect();
      effectRecords[record.index] = { deps: record.deps ? [...record.deps] : undefined, cleanup };
    }
  }

  function render(props = {}) {
    hookIndex = 0;
    rendering = true;
    const tree = Home({
      onOpenSurah: () => {},
      onOpenAudio: () => {},
      onOpenTafsir: () => {},
      onOpenTopics: () => {},
      onOpenCompare: () => {},
      onOpenBookmarks: () => {},
      onOpenNotes: () => {},
      onOpenPlans: () => {},
      onOpenHifz: () => {},
      ...props,
    });
    rendering = false;
    commitEffects();
    return tree;
  }

  function setTranslatedNamesForTest(value) {
    assert.ok(hookSetters[1], 'real screen must have a translatedNames state setter');
    hookSetters[1](value);
  }

  function getState(index) {
    return hookValues[index];
  }

  return {
    render,
    setTranslatedNamesForTest,
    getState,
    get renderPhaseWrites() { return renderPhaseWrites; },
    set bookmarkStore(value) { bookmarkStore = value; },
    set noteStore(value) { noteStore = value; },
  };
}

function walk(node, visit) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  if (typeof node !== 'object') return;
  visit(node);
  walk(node.props?.children, visit);
  for (const [key, value] of Object.entries(node.props || {})) {
    if (key !== 'children' && value && typeof value === 'object') walk(value, visit);
  }
}

function findNode(root, predicate) {
  let found;
  walk(root, (node) => {
    if (!found && predicate(node)) found = node;
  });
  return found;
}

function findBadgeValue(root, label) {
  const button = findNode(root, (node) => (
    node.props?.accessibilityLabel === label
  ));
  assert.ok(button, `real QuranHomeScreen must render the ${label} chip`);
  const values = [];
  walk(button, (node) => {
    if (node.type === 'AppText' && typeof node.props?.children === 'number') values.push(node.props.children);
  });
  return values.at(-1);
}

function testRenderPhaseTranslationResetUsesNoSetter() {
  const harness = createHarness({ language: 'en' });
  harness.render({ isActive: true });
  harness.setTranslatedNamesForTest({ 2: 'The Cow' });
  harness.render({ isActive: true });
  assert.deepEqual(harness.renderPhaseWrites, [], 'English translated-name reset must not call setState during render');
}

function testStudyBadgesRefreshWhenQuranBecomesActive() {
  const harness = createHarness({
    language: 'en',
    bookmarkItems: [{ surah: 1, ayah: 1 }],
    noteItems: [{ id: '1:1:1', surah: 1, ayah: 1, body: 'note', createdAt: 1 }],
  });
  harness.render({ isActive: true });
  harness.bookmarkStore = [{ surah: 1, ayah: 1 }, { surah: 2, ayah: 255 }];
  harness.noteStore = [
    { id: '1:1:1', surah: 1, ayah: 1, body: 'note', createdAt: 1 },
    { id: '2:255:2', surah: 2, ayah: 255, body: 'note 2', createdAt: 2 },
  ];
  harness.render({ isActive: false });
  harness.render({ isActive: true });
  const refreshed = harness.render({ isActive: true });
  assert.equal(findBadgeValue(refreshed, 'Bookmarks'), 2, 'bookmark badge must refresh after returning to Quran');
  assert.equal(findBadgeValue(refreshed, 'Notes'), 2, 'note badge must refresh after returning to Quran');
}

function testSurahRowAccessibilityLabelUsesTranslation() {
  const harness = createHarness({ language: 'ur', tPrefix: 'ترجمہ:' });
  const home = harness.render({ isActive: true });
  const list = findNode(home, (node) => node.type === 'TabFlatList');
  assert.ok(list, 'real QuranHomeScreen must render its surah list');
  const rowElement = list.props.renderItem({ item: {
    number: 2,
    name: 'سُورَةُ الْبَقَرَةِ',
    englishName: 'Al-Baqarah',
    englishNameTranslation: 'The Cow',
    numberOfAyahs: 286,
    revelationType: 'Medinan',
  } });
  const row = rowElement.type(rowElement.props);
  assert.equal(
    row.props.accessibilityLabel,
    'ترجمہ:Open Surah 2 Al-Baqarah',
    'surah-row accessibility label must use the localized Open Surah key',
  );
}

testRenderPhaseTranslationResetUsesNoSetter();
console.log('PASS F2: render-phase translated-name reset test');
testStudyBadgesRefreshWhenQuranBecomesActive();
console.log('PASS F9: bookmark/note focus refresh test');
testSurahRowAccessibilityLabelUsesTranslation();
console.log('PASS F7: localized surah-row accessibility label test');
