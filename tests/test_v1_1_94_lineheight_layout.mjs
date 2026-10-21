import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

function transpile(relativePath) {
  const filename = path.join(ROOT, relativePath);
  return ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
}

function runModule(relativePath, resolveRequest) {
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: resolveRequest,
    console,
    Array,
    Boolean,
    Date,
    Error,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(transpile(relativePath), sandbox, { filename: relativePath });
  return moduleObject.exports;
}

function reactMock() {
  const context = {
    createContext: () => ({ Provider: () => null }),
    createElement: () => null,
    memo: (component) => component,
    useCallback: (fn) => fn,
    useContext: () => null,
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useRef: (value) => ({ current: value }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  };
  context.default = context;
  return context;
}

function loadSettings() {
  const react = reactMock();
  const storage = {
    async getItem() { return null; },
    async setItem() {},
  };
  const queue = {
    createSerializedSettingsWriter: () => async (next) => next,
  };
  const accents = {
    ACCENT_KEYS: ['amber', 'cobalt'],
    DEFAULT_ACCENT: 'amber',
  };
  return runModule('src/lib/settings.tsx', (request) => {
    if (request === 'react') return react;
    if (request === '@react-native-async-storage/async-storage') return storage;
    if (request === './settingsWriteQueue') return queue;
    if (request === './accents') return accents;
    if (request === './names99') return {};
    if (request === './tafsirSources') return { TAFSIR_SOURCES: [] };
    if (request === './quranAudio') return { setAudioTranslationEnabled: () => {} };
    if (request === './quranLanguageState') return {
      getQuranTranslationLanguage: () => 'en',
      setQuranTranslationLanguage: () => {},
    };
    if (request === './i18n') return {
      getBootLanguage: () => 'en',
      isAppLanguage: (value) => typeof value === 'string',
      setAppLanguage: () => {},
    };
    if (request === './audio') return { setActiveAdhanReciterId: () => {} };
    if (request === './useLocation') return { setCachedLocation: () => {} };
    return {};
  });
}

const settings = loadSettings();

// Real settings.tsx execution: the global floor and read-time sanitizer must
// correct a value written by an older app, rather than only correcting a tap.
assert.equal(settings.QURAN_LINE_HEIGHT_MIN, 1.8);
assert.equal(settings.clampQuranLineHeight(1.4), 1.8);
assert.equal(settings.sanitizeSettings({ quranLineHeight: 1.4 }).quranLineHeight, 1.8);
assert.equal(settings.sanitizeSettings({ quranLineHeight: 1.7 }).quranLineHeight, 1.8);
assert.equal(settings.sanitizeSettings({ quranLineHeight: 1.8 }).quranLineHeight, 1.8);

const rn = {
  ActivityIndicator: () => null,
  Alert: {},
  Animated: {},
  BackHandler: {},
  Clipboard: {},
  FlatList: () => null,
  Image: () => null,
  InteractionManager: {},
  Keyboard: {},
  KeyboardAvoidingView: () => null,
  Modal: () => null,
  Platform: { OS: 'android', select: (styles) => styles.android ?? styles.default },
  ScrollView: () => null,
  Share: {},
  StyleSheet: {
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    create: (styles) => styles,
    flatten: (style) => style,
    hairlineWidth: 0.5,
  },
  Text: () => null,
  TextInput: () => null,
  TouchableOpacity: () => null,
  TouchableWithoutFeedback: () => null,
  View: () => null,
  useWindowDimensions: () => ({ width: 390, height: 844 }),
};

function loadReader() {
  const react = reactMock();
  const generic = {};
  return runModule('src/screens/QuranReaderScreen.tsx', (request) => {
    if (request === 'react') return react;
    if (request === 'react-native') return rn;
    if (request === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (request === '../lib/settings') return settings;
    if (request === '../lib/typography') {
      return runModule('src/lib/typography.ts', () => ({}));
    }
    if (request === '../lib/quranLayoutCache') {
      return { configureQuranLayoutStorage: () => {} };
    }
    if (request === '../lib/quran') return {
      TOTAL_MUSHAF_PAGES: 604,
      getBundledSurahs114: () => [],
    };
    if (request === '../components/ArabicText') return { QURAN_FONT_FAMILIES: { amiri: { regular: 'Amiri_400Regular', bold: 'Amiri_700Bold' } } };
    if (request === '../lib/tafsirSources') return { TAFSIR_SOURCES: [] };
    if (request === '../lib/quranScripts') return { QURAN_SCRIPTS: [], getScriptCacheKey: () => '' };
    if (request === '../lib/surahAyahCounts') return { SURAH_AYAH_COUNTS: [] };
    return generic;
  });
}

const reader = loadReader();
assert.equal(typeof reader.getMushafLineHeight, 'function');
assert.equal(typeof reader.getMushafHeaderLayout, 'function');

// Real QuranReaderScreen execution: the raw Mushaf line box cannot honor a
// persisted 1.8 setting when Urdu content requires the 2.2 contract floor.
assert.equal(reader.getMushafLineHeight(18, 1.8, 'النص العربي', 'ar'), 36);
assert.equal(reader.getMushafLineHeight(18, 1.4, 'النص العربي', 'ar'), 36);
assert.equal(reader.getMushafLineHeight(18, 1.8, 'قرآن کا متن', 'ur'), 44);
assert.equal(reader.getMushafLineHeight(18, 1.8, 'العربية', 'en'), 36);
assert.ok(reader.getMushafLineHeight(40, 1.8, 'قرآن کا متن', 'ur') >= Math.round(42 * 2.2));

// Real production resolver: RTL keeps the Juz group in the right slot and
// moves the trailing Page label to the left edge of its slot; LTR reverses it.
assert.deepEqual(JSON.parse(JSON.stringify(reader.getMushafHeaderLayout(true))), {
  visualOrder: ['page', 'surah', 'juz'],
  leadingTextAlign: 'right',
  trailingTextAlign: 'left',
});
assert.deepEqual(JSON.parse(JSON.stringify(reader.getMushafHeaderLayout(false))), {
  visualOrder: ['juz', 'surah', 'page'],
  leadingTextAlign: 'left',
  trailingTextAlign: 'right',
});

function styleSheetMock() {
  const styleSheet = {
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    create: (styles) => styles,
    flatten: (style) => style,
    hairlineWidth: 0.5,
  };
  return styleSheet;
}

const tokenProxy = new Proxy({}, { get: () => tokenProxy });

function loadScreenStyles(relativePath, extra) {
  const react = reactMock();
  const screenRn = {
    ...rn,
    StyleSheet: styleSheetMock(),
    ...extra,
  };
  return runModule(relativePath, (request) => {
    if (request === 'react') return react;
    if (request === 'react-native') return screenRn;
    if (request === 'react-native-svg') return { default: () => null, Path: () => null, Rect: () => null };
    if (request === '../theme/tokens') return { themeTokens: { paper: tokenProxy, ink: tokenProxy }, GOLD_GRADIENT: [] };
    if (request === '../lib/homeThemeTokens') return { HOME_THEME_TOKENS: { hero: tokenProxy, paper: tokenProxy, ink: tokenProxy }, getCardShadow: () => ({}), getHeroCardShadow: () => ({}) };
    if (request === '../lib/constants') return { HOME_THEME_TOKENS: { hero: tokenProxy, paper: tokenProxy, ink: tokenProxy } };
    return {};
  });
}

const library = loadScreenStyles('src/screens/LibraryScreen.tsx');
const tools = loadScreenStyles('src/screens/ToolsScreen.tsx', { AccessibilityInfo: {} });
const daily = loadScreenStyles('src/components/DailyContentRail.tsx');

function assertContentCanGrow(style, label) {
  assert.equal(style.flexGrow, 1, `${label} must grow from multiline content`);
  assert.equal(style.flexShrink, 0, `${label} must not shrink multiline content into its minHeight`);
  assert.equal(style.height, undefined, `${label} must not have a fixed height`);
  assert.equal(style.maxHeight, undefined, `${label} must not have a max height`);
}

assertContentCanGrow(library.styles.knowledgeTileInner, 'Library knowledge tile inner');
assertContentCanGrow(tools.styles.trackerTileInner, 'Tools tracker tile inner');
assertContentCanGrow(daily.styles.card, 'Daily rail card');
assertContentCanGrow(daily.styles.cardContent, 'Daily rail card content');

console.log('PASS: real settings, reader, and owned card layout contracts');
