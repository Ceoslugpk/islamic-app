import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

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

function runModule(relativePath, resolveRequest, extra = {}) {
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
    ...extra,
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

const react = reactMock();
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
  const generic = {};
  return runModule('src/screens/QuranReaderScreen.tsx', (request) => {
    if (request === 'react') return react;
    if (request === 'react-native') return rn;
    if (request === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (request === '../lib/settings') return {};
    if (request === '../lib/typography') return {
      detectScriptFromContent: () => 'urdu',
      MIN_SCRIPT_MULTIPLIERS: { urdu: 2.2, arabic: 1.8 },
    };
    if (request === '../lib/quranLayoutCache') return { configureQuranLayoutStorage: () => {} };
    if (request === '../lib/quran') return { TOTAL_MUSHAF_PAGES: 604, getBundledSurahs114: () => [] };
    if (request === '../components/ArabicText') return { QURAN_FONT_FAMILIES: { amiri: { regular: 'Amiri_400Regular', bold: 'Amiri_700Bold' } } };
    if (request === '../lib/tafsirSources') return { TAFSIR_SOURCES: [] };
    if (request === '../lib/quranScripts') return { QURAN_SCRIPTS: [], getScriptCacheKey: () => '' };
    if (request === '../lib/surahAyahCounts') return { SURAH_AYAH_COUNTS: [] };
    return generic;
  });
}

const reader = loadReader();
assert.equal(typeof reader.getMushafPageHeaderTextStyle, 'function');
assert.deepEqual(
  JSON.parse(JSON.stringify(reader.getMushafPageHeaderTextStyle(true))),
  { textAlign: 'right' },
  'the rendered Urdu Mushaf page label must receive right-aligned text input',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(reader.getMushafPageHeaderTextStyle(false))),
  { textAlign: 'right' },
  'the LTR page label keeps its existing right-edge alignment',
);

const reactHooks = {
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useContext: (context) => context?._currentValue,
  useRef: (value) => ({ current: value }),
  createContext: (value) => ({ _currentValue: value }),
  forwardRef: (fn) => fn,
  isValidElement: () => false,
};

function loadDiagnosticModule(relativePath, mocks = {}) {
  return runModule(
    relativePath,
    (request) => mocks[request] || {},
    {
      process,
      globalThis,
      TypeError,
      URL,
      Blob: typeof Blob === 'undefined' ? class {} : Blob,
    },
  );
}

const active = { language: 'ur', theme: 'light', screen: 'Settings' };
const diagnosticConfig = loadDiagnosticModule('src/lib/diagnostic/diagnosticConfig.ts', {
  react: reactHooks,
});
const diagnosticContext = {
  useDiagScreen: () => active.screen,
  useDiagParent: () => undefined,
  getGlobalActiveScreen: () => active.screen,
  setGlobalActiveScreen: (screen) => { active.screen = screen; },
  setDiagErrorRecorder: () => {},
};
const diagnosticI18n = {
  diagT: (key) => key,
  getDiagnosticShareTitle: () => 'Diagnostic report',
  getDiagnosticShareDialogTitle: () => 'Diagnostic report',
};
const i18n = {
  default: { get language() { return active.language; } },
  isRTL: (language) => language === 'ar' || language === 'ur',
  isRtlLanguage: (language) => language === 'ar' || language === 'ur',
  getBootLanguage: () => active.language,
};
const reactNative = {
  Platform: { OS: 'android' },
  I18nManager: { isRTL: true },
  StyleSheet: {
    flatten: (style) => style || {},
    create: (styles) => styles,
    hairlineWidth: 1,
  },
  Dimensions: { get: () => ({ width: 360, height: 740 }) },
  Appearance: { getColorScheme: () => active.theme },
  Share: { share: async () => ({ action: 'sharedAction' }) },
  Clipboard: { setString: () => {} },
};
const fileSystem = {
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  writeAsStringAsync: async () => {},
  getInfoAsync: async () => ({ exists: true, size: 1 }),
};
const sharing = { isAvailableAsync: async () => true, shareAsync: async () => {} };
const diagnosticState = loadDiagnosticModule('src/lib/diagnostic/diagnosticState.ts', {
  react: reactHooks,
  'react-native': reactNative,
  './diagnosticConfig': diagnosticConfig,
  './diagnosticScreenContext': diagnosticContext,
  './diagnosticScreens': { KNOWN_SCREENS: [] },
  './diagnosticI18n': diagnosticI18n,
  '../i18n': i18n,
  'expo-file-system/legacy': fileSystem,
  'expo-sharing': sharing,
});

function derive(probe) {
  return diagnosticState.deriveProbeDefects(probe, { isText: true });
}

const requestedBelowFloorButResolvedSafe = derive({
  id: 'Settings::AppText::urdu-floor-raised#1',
  kind: 'AppText',
  screen: 'Settings',
  height: 30,
  resolvedFontSize: 11,
  explicitLineHeight: 18,
  resolvedLineHeight: 30,
  fontFamily: 'NotoNastaliqUrdu_400Regular',
  textScript: 'urdu',
});
assert.equal(
  requestedBelowFloorButResolvedSafe.lineBoxTooTight.flag,
  false,
  'a requested Urdu lineHeight below the floor is safe when the rendered lineHeight is at the floor',
);

const resolvedBelowFloor = derive({
  id: 'Settings::AppText::urdu-floor-broken#2',
  kind: 'AppText',
  screen: 'Settings',
  height: 24,
  resolvedFontSize: 11,
  explicitLineHeight: 18,
  resolvedLineHeight: 24,
  fontFamily: 'NotoNastaliqUrdu_400Regular',
  textScript: 'urdu',
});
assert.equal(
  resolvedBelowFloor.lineBoxTooTight.flag,
  true,
  'a rendered Urdu lineHeight below the floor must be flagged',
);

console.log('PASS: QuranReader Urdu page-label alignment and rendered line-height classifier contract');
