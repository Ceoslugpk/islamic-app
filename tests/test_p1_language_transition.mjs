/**
 * P1 interface-language transition slice — production-path regression suite.
 *
 * Every section transpiles and executes real production modules
 * (src/lib/i18n.ts, src/lib/quranLanguageState.ts, src/lib/settings.tsx,
 * src/screens/SettingsScreen.tsx, App.tsx). No state machine is re-implemented
 * in this file; react/native hosts are stubbed only at the module boundary.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tick = () => new Promise((resolve) => setImmediate(resolve));

function transpile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
}

function execute(file, requireMap, sandboxExtras = {}) {
  const moduleObj = { exports: {} };
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(requireMap, id)) return requireMap[id];
    if (Object.prototype.hasOwnProperty.call(requireMap, '__fallback')) return requireMap.__fallback;
    if (id.endsWith('.json')) return { __esModule: true, default: {} };
    throw new Error(`Unexpected import while executing ${file}: ${id}`);
  };
  const sandbox = {
    module: moduleObj,
    exports: moduleObj.exports,
    require: localRequire,
    console,
    Set,
    Map,
    WeakMap,
    Promise,
    Error,
    String,
    Boolean,
    Array,
    Object,
    Math,
    Date,
    Number,
    parseInt,
    isNaN,
    setTimeout,
    clearTimeout,
    JSON,
    process,
    ...sandboxExtras,
  };
  vm.createContext(sandbox);
  vm.runInContext(transpile(file), sandbox);
  return moduleObj.exports;
}

const LOCALES = ['en', 'ur', 'ar', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id', 'ps'];

function loadRealI18n({ platform = 'android', syncLanguage = null, persistedLanguage = null, deviceLanguage = 'en' } = {}) {
  const runtime = {
    language: 'en',
    nativeCalls: [],
    settingsRaw: persistedLanguage ? JSON.stringify({ language: persistedLanguage }) : null,
    syncCache: syncLanguage ? { 'app-language': { language: syncLanguage } } : {},
    getItemGate: null,
  };
  const i18nextInstance = {
    language: 'en',
    use() { return this; },
    init(options) { this.language = options.lng; runtime.language = options.lng; return this; },
    changeLanguage(language) { this.language = language; runtime.language = language; },
    t(key) { return key; },
  };
  const i18next = {
    __esModule: true,
    default: i18nextInstance,
    use: () => i18nextInstance,
    init: (options) => i18nextInstance.init(options),
    changeLanguage: (language) => i18nextInstance.changeLanguage(language),
    t: (key) => i18nextInstance.t(key),
  };
  const nativeDirection = {
    isRTL: false,
    allowRTL(value) { runtime.nativeCalls.push(['allowRTL', value]); },
    forceRTL(value) { runtime.nativeCalls.push(['forceRTL', value]); this.isRTL = value; },
  };
  const storage = {
    async getItem(key) {
      assert.equal(key, 'islamic-settings');
      if (runtime.getItemGate) await runtime.getItemGate;
      return runtime.settingsRaw;
    },
    async setItem(key, value) {
      assert.equal(key, 'islamic-settings');
      runtime.settingsRaw = value;
    },
  };
  const module = execute(path.join(ROOT, 'src/lib/i18n.ts'), {
    i18next,
    'react-i18next': { initReactI18next: {}, useTranslation: () => ({ i18n: i18nextInstance, t: (key) => key }) },
    'expo-localization': { getLocales: () => [{ languageCode: deviceLanguage }] },
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    'react-native': { I18nManager: nativeDirection, Platform: { OS: platform } },
    './db': {
      loadQuranCache: (key) => runtime.syncCache[key] ?? null,
      saveQuranCache: (key, value) => { runtime.syncCache[key] = value; return true; },
    },
    ...Object.fromEntries(LOCALES.map((code) => [`../locales/${code}.json`, { __esModule: true, default: {} }])),
  });
  return { module, runtime, nativeDirection };
}

function loadRealQuranLanguageState(initial = { language: 'en', mode: 'auto' }) {
  const store = new Map();
  if (initial.language) store.set('quran-translation-language', initial.language);
  if (initial.mode) store.set('quran-translation-language-mode', initial.mode);
  const writes = [];
  const storage = {
    async getItem(key) { return store.get(key) ?? null; },
    async setItem(key, value) { writes.push([key, value]); store.set(key, String(value)); },
    async removeItem(key) { store.delete(key); },
  };
  const module = execute(path.join(ROOT, 'src/lib/quranLanguageState.ts'), {
    react: { useMemo: (fn) => fn(), useSyncExternalStore: (_s, get) => get() },
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    './quranLanguages': {
      getEditionForLanguage: () => ({ languageCode: 'en' }),
      getLanguageFlag: () => 'GB',
      QURAN_LANGUAGE_EDITIONS: [
        { languageCode: 'en' }, { languageCode: 'ur' }, { languageCode: 'ar' },
        { languageCode: 'hi' }, { languageCode: 'ml' }, { languageCode: 'si' },
        { languageCode: 'bn' }, { languageCode: 'ms' }, { languageCode: 'ta' },
        { languageCode: 'id' }, { languageCode: 'ps' },
      ],
    },
  });
  return { module, store, writes, storage };
}

function createReactStub(onContext) {
  let hookIndex = 0;
  let renderCount = 0;
  const stateSlots = [];
  const refs = [];
  const callbacks = [];
  const effects = [];
  const react = {
    createContext: () => ({
      Provider: (props) => { onContext(props.value); return props.children; },
    }),
    useContext: () => null,
    useState: (initial) => {
      const index = hookIndex++;
      stateSlots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      const slot = stateSlots[index];
      return [slot.value, (next) => {
        slot.value = typeof next === 'function' ? next(slot.value) : next;
        onContext.settingsState = slot.value;
      }];
    },
    useRef: (initial) => { const index = hookIndex++; refs[index] ??= { current: initial }; return refs[index]; },
    useEffect: (fn) => { if (renderCount === 0) effects.push(fn); },
    useCallback: (fn) => { callbacks.push(fn); return fn; },
    createElement: (type, props, ...children) => {
      const normalized = children.length <= 1 ? children[0] ?? null : children;
      if (typeof type === 'function') return type({ ...(props ?? {}), children: normalized });
      return { type, props: { ...(props ?? {}), children: normalized } };
    },
  };
  react.default = react;
  return {
    react,
    effects,
    callbacks,
    resetHooks() { hookIndex = 0; },
    markRendered() { renderCount += 1; },
  };
}

function createStorage({ persisted, failWrites = false, audioEdition = null } = {}) {
  const store = new Map();
  if (persisted) store.set('islamic-settings', JSON.stringify(persisted));
  if (audioEdition) store.set('quran-audio-translation-edition', audioEdition);
  const writes = [];
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      if (failWrites && key === 'islamic-settings') throw new Error('disk full');
      writes.push([key, value]);
      store.set(key, String(value));
    },
    async removeItem(key) { store.delete(key); },
  };
  return { storage, store, writes };
}

function loadRealSettings({ persisted = { language: 'en', themeMode: 'paper', tafsirSourceId: 'jalalayn' }, quranState, storageBox, i18nModule } = {}) {
  const box = storageBox ?? createStorage({ persisted });
  const records = { quranAuto: [], quranExplicit: [], audio: [], appLanguage: [] };
  const quran = quranState ?? { language: 'en', mode: 'auto' };
  let contextValue = null;
  const reactHarness = createReactStub((value) => { contextValue = value; });
  const moduleExports = execute(path.join(ROOT, 'src/lib/settings.tsx'), {
    react: reactHarness.react,
    '@react-native-async-storage/async-storage': { __esModule: true, default: box.storage },
    './settingsWriteQueue': execute(path.join(ROOT, 'src/lib/settingsWriteQueue.ts'), {}),
    './accents': { DEFAULT_ACCENT: 'emerald', ACCENT_KEYS: ['emerald', 'amber', 'rose'] },
    './names99': {},
    './quranAudio': {
      setAudioTranslationEnabled: () => {},
      setAudioTranslationEdition: async (edition) => { records.audio.push(edition); },
      DEFAULT_AUDIO_TRANSLATION_EDITION_ID: 'en.everyayah-walk',
      AUDIO_TRANSLATION_EDITION_KEY: 'quran-audio-translation-edition',
    },
    './quranLanguageState': {
      getQuranTranslationLanguage: () => quran.language,
      setQuranTranslationLanguage: async (language) => {
        records.quranExplicit.push(language);
        quran.language = language;
        quran.mode = 'explicit';
      },
      setAutoLinkedQuranTranslationLanguage: async (language) => {
        records.quranAuto.push(language);
        if (quran.mode === 'explicit') return;
        quran.language = language;
      },
      isQuranTranslationLanguageExplicit: () => quran.mode === 'explicit',
    },
    './i18n': i18nModule ?? {
      getBootLanguage: () => 'en',
      setAppLanguage: (language) => { records.appLanguage.push(language); },
      isAppLanguage: (value) => LOCALES.includes(value),
      isRtlLanguage: (value) => ['ur', 'ar', 'ps'].includes(value),
    },
    './audio': { setActiveAdhanReciterId: () => {} },
    './useLocation': { setCachedLocation: () => {} },
    './tafsirSources': { TAFSIR_SOURCES: [{ id: 'jalalayn' }, { id: 'api-ibn-kathir-ar' }, { id: 'api-ibn-kathir-urdu' }, { id: 'qurtubi' }] },
    './prayerTimes': {},
  });
  const render = () => {
    reactHarness.resetHooks();
    const result = moduleExports.SettingsProvider({ children: 'child' });
    reactHarness.markRendered();
    return result;
  };
  return {
    exports: moduleExports,
    render,
    effects: reactHarness.effects,
    get context() { return contextValue; },
    records,
    quran,
    box,
  };
}

async function readySettings(options) {
  const harness = loadRealSettings(options);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);
  harness.render();
  return harness;
}

function loadSettingsScreenHelpers() {
  const generic = (props = {}) => props.children ?? null;
  const genericModule = new Proxy({ __esModule: true, default: generic }, {
    get(target, property) { return property in target ? target[property] : generic; },
  });
  return execute(path.join(ROOT, 'src/screens/SettingsScreen.tsx'), {
    react: {
      __esModule: true,
      default: generic,
      useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
      useEffect: () => {},
      useRef: (value) => ({ current: value }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn(),
      createElement: (type, props) => (typeof type === 'function' ? type(props ?? {}) : { type, props }),
    },
    'react-native': new Proxy({
      __esModule: true,
      Platform: { OS: 'android' },
      I18nManager: { isRTL: false },
      StyleSheet: { create: (value) => value, absoluteFill: {}, hairlineWidth: 1 },
      useWindowDimensions: () => ({ width: 390, height: 844 }),
    }, { get(target, property) { return property in target ? target[property] : (typeof property === 'string' && /^[A-Z]/.test(property) ? property : () => {}); } }),
    expo: { reloadAppAsync: async () => {} },
    '../lib/i18n': {
      __esModule: true,
      t: (key) => key,
      prepareNativeLayoutDirection: () => {},
      isRtlLanguage: (language) => ['ur', 'ar', 'ps'].includes(language),
    },
    '../lib/settings': { __esModule: true, useSettings: () => ({ settings: {}, updateSettings: () => {}, setLanguage: async () => {} }), persistLanguageChange: async () => {} },
    '../lib/theme': {
      useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }), mode: 'paper' }),
      useThemeTokens: () => ({ tokens: new Proxy({}, { get: () => '#000' }) }),
      getTokens: () => new Proxy({}, { get: () => '#000' }),
      cardTokens: new Proxy({}, { get: () => '#000' }),
      getBrandLogoSource: () => ({}),
    },
    '../theme/tokens': {
      useThemeTokens: () => ({ tokens: new Proxy({}, { get: () => '#000' }) }),
      getTokens: () => new Proxy({}, { get: () => '#000' }),
      cardTokens: new Proxy({}, { get: () => '#000' }),
      getBrandLogoSource: () => ({}),
    },
    '../../app.json': { __esModule: true, default: { expo: { version: '1.1.96' } } },
    __fallback: genericModule,
  });
}

function loadRealSettingsScreenForLifecycle(i18nModule, {
  reloadAppAsync = async () => {},
  persistLanguageChange = async (currentSettings) => currentSettings,
} = {}) {
  let hookIndex = 0;
  const stateSlots = [];
  const effects = [];
  let realSection = null;
  let collapsedLanguageSectionRendered = false;
  const settings = {
    language: 'ur', methodId: 16, timeFormat: '12h', remindersEnabled: false,
    reminderOffsetMinutes: 15, quranReminderEnabled: false, quranReminderTime: '20:00',
    quranGoal: { type: 'minutes', target: 15 }, adhanReciterId: 'alafasy', themeMode: 'paper',
    accentKey: 'emerald', translationAudioEnabled: true, namesLanguage: 'en',
    womenWorshipEnabled: false, womenPinHash: null, womenLockEnabled: false, hapticsEnabled: true,
    quranArabicFont: 'amiri', quranScript: 'uthmani', quranFontSize: 30, quranLineHeight: 2.2,
    quranShowTranslation: true, tafsirSourceId: 'jalalayn', quranPreloadRequested: true,
    manualLocation: { latitude: 21.4, longitude: 39.8, label: 'Makkah' },
    prayerConfigs: { Fajr: { enabled: true, adhan: true, vibration: true } },
  };
  const setState = (index) => (next) => {
    stateSlots[index].value = typeof next === 'function' ? next(stateSlots[index].value) : next;
  };
  const react = {
    __esModule: true,
    Fragment: 'Fragment',
    createElement: (type, props, ...children) => {
      const normalizedChildren = children.length <= 1 ? children[0] ?? null : children;
      if (realSection && type === realSection) {
        if (props?.label === 'Language / زبان' && props?.collapsible && props?.expanded === false) {
          collapsedLanguageSectionRendered = true;
        }
        return type({ ...(props ?? {}), children: normalizedChildren });
      }
      return { type, props: { ...(props ?? {}), children: normalizedChildren } };
    },
    useState: (initial) => {
      const index = hookIndex++;
      stateSlots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [stateSlots[index].value, setState(index)];
    },
    useEffect: (effect) => { if (effects.length < 30) effects.push(effect); },
    useRef: (initial) => { const index = hookIndex++; stateSlots[index] ??= { current: initial }; return stateSlots[index]; },
  };
  react.default = react;
  const generic = (props = {}) => props.children ?? null;
  const genericModule = new Proxy({ __esModule: true, default: generic }, {
    get(target, property) { return property in target ? target[property] : generic; },
  });
  const colorProxy = new Proxy({}, { get: (_target, property) => String(property) });
  const native = new Proxy({
    __esModule: true,
    Platform: { OS: 'android' },
    I18nManager: { isRTL: true },
    StyleSheet: { create: (value) => value, absoluteFill: {}, hairlineWidth: 1 },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => false,
      addEventListener: () => ({ remove() {} }),
    },
    BackHandler: { addEventListener: () => ({ remove() {} }) },
    LayoutAnimation: { configureNext() {} },
    Alert: { alert() {} },
  }, { get(target, property) { return property in target ? target[property] : property; } });
  const moduleExports = execute(path.join(ROOT, 'src/screens/SettingsScreen.tsx'), {
    react,
    'react-native': native,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    '../lib/theme': { useTheme: () => ({ colors: colorProxy, mode: 'paper' }) },
    '../theme/tokens': {
      useThemeTokens: () => ({ tokens: colorProxy }), getTokens: () => colorProxy,
      cardTokens: colorProxy, getBrandLogoSource: () => ({}),
    },
    '../lib/i18n': {
      ...i18nModule, t: (key) => key, prepareNativeLayoutDirection: () => {},
      isRtlLanguage: (language) => ['ur', 'ar', 'ps'].includes(language),
    },
    '../lib/settings': {
      useSettings: () => ({ settings, updateSettings: () => {}, setLanguage: async () => {} }),
      persistLanguageChange,
    },
    '../lib/haptics': { useHaptics: () => ({ haptic() {} }) },
    '../lib/quranLanguageState': { useQuranLanguage: () => ({ edition: { language: 'en', editionIdentifier: 'en.sahih', name: 'Sahih' }, flag: 'GB' }) },
    '../lib/quranPreloader': { useQuranPreload: () => ({ progress: { cached: 0 }, startPreload() {}, pausePreload() {}, verifyQuranPreloadCache: async () => null, repairQuranPreloadCache: async () => null }) },
    '../lib/prayerTimes': { CALC_METHODS: [{ id: 16, name: 'Dubai' }], fetchPrayerTimes: async () => ({}) },
    '../lib/notifications': { requestNotificationPermission: async () => false, rescheduleIfNeeded: async () => {}, getNotificationHealth: async () => null, isNotificationSchedulingSupported: () => false },
    '../lib/audio': { playAdhan: async () => {}, stopAdhan: () => {}, getAdhanReciter: () => ({ name: 'Alafasy', location: 'Makkah' }), addAdhanPlaybackListener: () => () => {} },
    '../lib/quranLanguages': { getLocalizedTranslatorName: () => 'Sahih' },
    '../lib/surahNamesLocalized': { getLocalizedLanguageName: (name) => name },
    '../lib/timeFormat': { formatTime: (value) => value },
    '../lib/db': { clearWomenData() {}, clearCycleHistory() {} },
    '../lib/diagnostic': {
      isDiagnosticModeEnabled: () => false, DIAGNOSTIC_BUILD_ID: '', GatedDiagnosticModal: generic,
      usePressProbe: (_id, _kind, options) => ({ onPress: options?.onPress }), wrapControlPress: (_id, _kind, _screen, handler) => handler,
      recordControlState() {}, noteControlPress() {}, beginLanguageSwitch: () => ({ markResolved() {}, markRejected() {}, markReloadRequested() {}, markNoRestart() {} }), recordConsistencyCheck() {},
    },
    '../../app.json': { __esModule: true, default: { expo: { version: '1.1.96' } } },
    '@expo/vector-icons': { Ionicons: generic },
    'expo-linear-gradient': { LinearGradient: generic },
    expo: { reloadAppAsync },
    './LegalScreen': genericModule, './BackupRestoreScreen': genericModule,
    '../components/layout/SheetHeader': { SheetHeader: generic },
    '../components/layout/DetailScreen': { DetailScreen: Object.assign(generic, { ScrollView: generic }) },
    '../components/ui/AppText': { AppText: generic },
    '../components/ArabicText': { QURAN_FONT_FAMILIES: { amiri: { regular: 'amiri' }, notonaskh: { regular: 'naskh' } } },
    '../lib/iconMap': { getForwardIcon: () => 'arrow', iconSizes: {} },
    '../lib/buttonTokens': { touchTargetTokens: { hitSlop8: 8 } },
    '../components/Hairline': { Hairline: generic }, '../components/AdhanReciterModal': { AdhanReciterModal: generic },
    '../components/QuranLanguageModal': { QuranLanguageModal: generic }, '../components/WomenPinModal': { WomenPinModal: generic },
    '../components/GeometricPattern': { GeometricPattern: generic },
    __fallback: genericModule,
  });
  realSection = moduleExports.Section;
  return {
    module: moduleExports,
    render() { hookIndex = 0; return moduleExports.default({}); },
    runEffects() { for (const effect of effects.splice(0)) effect(); },
    get collapsedLanguageSectionRendered() { return collapsedLanguageSectionRendered; },
    get settings() { return settings; },
  };
}

function collectText(node, output = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return output;
  if (typeof node === 'string' || typeof node === 'number') { output.push(String(node)); return output; }
  if (Array.isArray(node)) { for (const child of node) collectText(child, output); return output; }
  if (node.props) collectText(node.props.children, output);
  return output;
}

function walkHostTree(node, visit) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const child of node) walkHostTree(child, visit);
    return;
  }
  if (typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  walkHostTree(node.props?.children, visit);
}

function findLanguageRow(tree, label) {
  let found = null;
  walkHostTree(tree, (node) => {
    if (node.type === 'Pressable' && node.props?.accessibilityRole === 'radio' && String(node.props?.accessibilityLabel).includes(label)) {
      found = node;
    }
  });
  assert.ok(found, `the real SettingsScreen must render the ${label} language row`);
  return found;
}

function createAppReactStub(effects) {
  const react = {
    __esModule: true,
    default: null,
    createElement: () => ({}),
    useState(initial) {
      const value = typeof initial === 'function' ? initial() : initial;
      return [value, () => {}];
    },
    useEffect(effect) { effects.push(effect); },
    useRef(value) { return { current: value }; },
    useMemo(factory) { return factory(); },
    useCallback(callback) { return callback; },
    memo(component) { return component; },
  };
  react.default = react;
  return react;
}

async function runAppBootWithLateDurable({ mirror, durable, fallbackFirst = true }) {
  const boot = loadRealI18n({ syncLanguage: mirror, persistedLanguage: durable });
  let releaseRead;
  boot.runtime.getItemGate = new Promise((resolve) => { releaseRead = resolve; });
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = [];
  globalThis.setTimeout = (callback, ms) => {
    const timer = { callback, ms, cleared: false };
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = (timer) => { if (timer) timer.cleared = true; };
  const effects = [];
  try {
    const generic = (props = {}) => props.children ?? null;
    const genericModule = new Proxy({ __esModule: true, default: generic }, {
      get(target, property) { return property in target ? target[property] : generic; },
    });
    const app = execute(path.join(ROOT, 'App.tsx'), {
      react: createAppReactStub(effects),
      'react-native': new Proxy({
        __esModule: true,
        Platform: { OS: 'android' },
        StyleSheet: { create: (value) => value, absoluteFill: {} },
        useColorScheme: () => 'light',
        useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
        AppState: { addEventListener: () => ({ remove() {} }) },
        I18nManager: { isRTL: false },
      }, { get(target, property) { return property in target ? target[property] : (typeof property === 'string' && /^[A-Z]/.test(property) ? property : () => {}); } }),
      './src/lib/i18n': boot.module,
      './src/lib/onboardingState': { getOnboardingDone: async () => true },
      './src/lib/fonts': { useEditorialFonts: () => [true, null] },
      __fallback: genericModule,
    });
    app.default();
    for (const effect of effects) effect();
    const timeout = timers.find((timer) => timer.ms === 5000);
    assert.ok(timeout, 'App must arm a bounded language bootstrap timeout');
    if (fallbackFirst) {
      timeout.callback();
      await tick();
      assert.equal(boot.module.getCurrentLanguage(), mirror, 'the bounded fallback must render the provisional mirror first');
    }
    releaseRead();
    await new Promise((resolve) => originalSetTimeout(resolve, 20));
    await tick();
    if (!fallbackFirst && !timeout.cleared) {
      timeout.callback();
      await tick();
    }
    boot.timer = timeout;
    return boot;
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
}

console.log('=== P1 LANGUAGE TRANSITION PRODUCTION-PATH SUITE ===');

console.log('1. Registered locales only; Sorani stays unregistered');
{
  const i18n = loadRealI18n();
  assert.equal(i18n.module.isAppLanguage('ckb'), false, 'ckb must not be a registered app locale');
  assert.equal(i18n.module.isAppLanguage('ku-arab'), false, 'ku-arab must not be accepted as an app locale');
  for (const code of LOCALES) assert.equal(i18n.module.isAppLanguage(code), true, `${code} must be registered`);
  const settings = loadRealSettings();
  const fallback = settings.exports.computeNextLanguageSettings(
    settings.exports.sanitizeSettings({ language: 'ur' }),
    'ckb',
  );
  assert.equal(fallback.language, 'en', 'an unregistered locale must fall back to the registry default');
  console.log('   PASS: registry rejects ckb/ku-arab and sanitizes to en');
}

console.log('2. Stale I18nManager classification derives direction from the language');
{
  const helpers = loadSettingsScreenHelpers();
  assert.equal(typeof helpers.classifyLanguageDirectionTransition, 'function', 'SettingsScreen must export the production direction classifier');
  const ltrToRtl = helpers.classifyLanguageDirectionTransition({
    platform: 'android', currentLanguage: 'en', nextLanguage: 'ur', nativeIsRTL: false,
  });
  assert.equal(ltrToRtl.directionChanges, true);
  assert.equal(ltrToRtl.requiresRestart, true);
  const sameRtl = helpers.classifyLanguageDirectionTransition({
    platform: 'android', currentLanguage: 'ur', nextLanguage: 'ar', nativeIsRTL: true,
  });
  assert.equal(sameRtl.directionChanges, false);
  assert.equal(sameRtl.requiresRestart, false);
  const staleNative = helpers.classifyLanguageDirectionTransition({
    platform: 'android', currentLanguage: 'ur', nextLanguage: 'ar', nativeIsRTL: false,
  });
  assert.equal(staleNative.directionChanges, false);
  assert.equal(staleNative.nativeDirectionStale, true);
  assert.equal(staleNative.requiresRestart, true, 'a stale module-init native direction must force a rebuild even for same-direction targets');
  const web = helpers.classifyLanguageDirectionTransition({
    platform: 'web', currentLanguage: 'en', nextLanguage: 'ar', nativeIsRTL: false,
  });
  assert.equal(web.requiresRestart, false, 'web applies direction live');
  const invalid = helpers.classifyLanguageDirectionTransition({
    platform: 'android', currentLanguage: 'en', nextLanguage: 'ckb', nativeIsRTL: false,
  });
  assert.equal(invalid.valid, false, 'unregistered targets are not classified as transitions');
  assert.equal(invalid.requiresRestart, false);
  console.log('   PASS: target direction comes from the registry; stale native flag only adds a repair restart');
}

console.log('3. Same-direction and direction-changing paths share one linked policy');
{
  const same = await readySettings();
  await same.context.setLanguage('ur');
  assert.deepEqual(same.records.quranAuto, ['ur'], 'same-direction path must use the explicit-preserving auto-link guard');
  assert.deepEqual(same.records.audio, ['ur.everyayah-shamshad'], 'same-direction path must auto-link the Urdu audio edition once');

  const direction = loadRealSettings();
  await direction.exports.persistLanguageChange(direction.exports.sanitizeSettings({ language: 'en', tafsirSourceId: 'jalalayn' }), 'ur');
  assert.deepEqual(direction.records.quranAuto, ['ur'], 'direction-changing path must use the same Quran guard');
  assert.deepEqual(direction.records.audio, ['ur.everyayah-shamshad'], 'direction-changing path must auto-link the same audio edition');
  console.log('   PASS: both paths execute the shared idempotent linked policy');
}

console.log('4. Explicit Quran translation, custom tafsir, and existing audio survive');
{
  const harness = await readySettings({
    persisted: { language: 'en', themeMode: 'paper', tafsirSourceId: 'qurtubi', adhanReciterId: 'mishary' },
    quranState: { language: 'en', mode: 'explicit' },
    storageBox: createStorage({
      persisted: { language: 'en', themeMode: 'paper', tafsirSourceId: 'qurtubi', adhanReciterId: 'mishary' },
      audioEdition: 'ur.everyayah-shamshad',
    }),
  });
  await harness.context.setLanguage('ar');
  assert.equal(harness.quran.language, 'en', 'an explicit Quran translation selection must never be overwritten');
  assert.deepEqual(harness.records.quranExplicit, [], 'the explicit path must not call the forced setter');
  assert.deepEqual(harness.records.audio, [], 'an existing audio edition must not be silently replaced');
  const persisted = JSON.parse(harness.box.store.get('islamic-settings'));
  assert.equal(persisted.tafsirSourceId, 'qurtubi', 'a custom tafsir must be preserved');
  assert.equal(persisted.adhanReciterId, 'mishary', 'the existing adhan reciter must survive language switching');
  console.log('   PASS: explicit Quran, custom tafsir, and existing audio stay untouched');
}

console.log('4b. Canonical tafsir choices are preserved across every interface-language transition');
{
  // Supersedes the old silent canonical-tafsir remapping policy. Without a
  // reliable explicit-vs-auto marker, the authorization requires preserving the
  // current tafsir edition instead of guessing that it was auto-linked.
  const canonicalTafsirs = ['jalalayn', 'api-ibn-kathir-urdu', 'api-ibn-kathir-ar'];
  const transitions = [
    ['en', 'ur'], ['ur', 'ar'], ['ar', 'en'], ['en', 'ar'], ['ar', 'ur'], ['en', 'hi'],
  ];

  for (const tafsir of canonicalTafsirs) {
    for (const [fromLang, toLang] of transitions) {
      const settings = loadRealSettings();
      const next = settings.exports.computeNextLanguageSettings(
        settings.exports.sanitizeSettings({ language: fromLang, tafsirSourceId: tafsir }),
        toLang,
      );
      assert.equal(next.language, toLang);
      assert.equal(
        next.tafsirSourceId,
        tafsir,
        `computeNextLanguageSettings must preserve canonical tafsir ${tafsir} across ${fromLang}->${toLang}`,
      );
    }

    const persistedSettings = { language: 'en', themeMode: 'paper', tafsirSourceId: tafsir, adhanReciterId: 'mishary' };
    const live = await readySettings({
      persisted: persistedSettings,
      storageBox: createStorage({ persisted: persistedSettings }),
    });
    await live.context.setLanguage('ur');
    assert.equal(live.context.settings.tafsirSourceId, tafsir, `live setLanguage must preserve canonical tafsir ${tafsir}`);
    assert.equal(
      JSON.parse(live.box.store.get('islamic-settings')).tafsirSourceId,
      tafsir,
      `live setLanguage must persist canonical tafsir ${tafsir} unchanged`,
    );

    const direction = loadRealSettings({ persisted: persistedSettings });
    const written = await direction.exports.persistLanguageChange(
      direction.exports.sanitizeSettings(persistedSettings),
      'ar',
    );
    assert.equal(written.tafsirSourceId, tafsir, `persistLanguageChange must preserve canonical tafsir ${tafsir}`);
    assert.equal(
      JSON.parse(direction.box.store.get('islamic-settings')).tafsirSourceId,
      tafsir,
      `persistLanguageChange must persist canonical tafsir ${tafsir} unchanged`,
    );
  }

  console.log('   PASS: jalalayn, Urdu Ibn Kathir, and Arabic Ibn Kathir survive live and persisted transitions');
}

console.log('5. Quran auto-link guard itself is idempotent and explicit-safe (real module)');
{
  const explicit = loadRealQuranLanguageState({ language: 'en', mode: 'explicit' });
  await explicit.module.setAutoLinkedQuranTranslationLanguage('ar');
  assert.equal(await explicit.store.get('quran-translation-language'), 'en');
  assert.equal(await explicit.store.get('quran-translation-language-mode'), 'explicit');

  const auto = loadRealQuranLanguageState({ language: 'en', mode: 'auto' });
  await auto.module.setAutoLinkedQuranTranslationLanguage('ur');
  await auto.module.setAutoLinkedQuranTranslationLanguage('ur');
  assert.equal(await auto.store.get('quran-translation-language'), 'ur');
  assert.equal(await auto.store.get('quran-translation-language-mode'), 'auto');
  console.log('   PASS: real guard preserves explicit mode and repeated application converges');
}

console.log('6. Persistence failure rolls back with no side effects and no data loss');
{
  const box = createStorage({
    persisted: { language: 'en', themeMode: 'paper', tafsirSourceId: 'jalalayn' },
    failWrites: true,
  });
  const harness = await readySettings({ storageBox: box });
  await assert.rejects(
    harness.exports.persistLanguageChange(harness.exports.sanitizeSettings({ language: 'en' }), 'ur'),
    /disk full/,
  );
  assert.equal(JSON.parse(box.store.get('islamic-settings')).language, 'en', 'the durable old language must survive');
  assert.deepEqual(harness.records.quranAuto, [], 'a failed language write must not run linked side effects');
  assert.deepEqual(harness.records.audio, [], 'a failed language write must not change audio');

  const live = await readySettings({ storageBox: createStorage({
    persisted: { language: 'en', themeMode: 'paper', tafsirSourceId: 'jalalayn' },
    failWrites: true,
  }) });
  await assert.rejects(live.context.setLanguage('ur'), /disk full/);
  assert.equal(live.context.settings.language, 'en', 'the live language must roll back to the last confirmed value');
  assert.equal(JSON.parse(live.box.store.get('islamic-settings')).language, 'en');
  console.log('   PASS: failed writes preserve durable/live language and skip side effects');
}

console.log('6b. Durable language changes only after verified production persistence');
{
  const i18n = loadRealI18n({ persistedLanguage: 'en' });
  await i18n.module.resolvePersistedLanguage(true);
  const settings = loadRealSettings({
    persisted: { language: 'en', themeMode: 'paper' },
    i18nModule: i18n.module,
  });

  i18n.module.recordRequestedLanguage('ur');
  i18n.module.setAppLanguage('ur');
  let lifecycle = i18n.module.getLanguageLifecycleState();
  assert.deepEqual(
    { requested: lifecycle.requested, active: lifecycle.active, durable: lifecycle.durable },
    { requested: 'ur', active: 'ur', durable: 'en' },
    'a provisional UI language must not claim durability before storage verification',
  );

  await settings.exports.persistLanguageChange(
    settings.exports.sanitizeSettings({ language: 'en', themeMode: 'paper' }),
    'ur',
    settings.box.storage,
  );
  lifecycle = i18n.module.getLanguageLifecycleState();
  assert.deepEqual(
    { requested: lifecycle.requested, active: lifecycle.active, durable: lifecycle.durable },
    { requested: 'ur', active: 'ur', durable: 'ur' },
    'requested, active, and durable must converge only after verified persistence',
  );

  i18n.module.recordRequestedLanguage('ar');
  i18n.module.setAppLanguage('ar');
  const failedStorage = {
    async setItem() { throw new Error('disk full'); },
    async getItem() { return JSON.stringify({ language: 'ur', themeMode: 'paper' }); },
  };
  await assert.rejects(
    settings.exports.persistLanguageChange(
      settings.exports.sanitizeSettings({ language: 'ur', themeMode: 'paper' }),
      'ar',
      failedStorage,
    ),
    /disk full/,
  );
  assert.equal(i18n.module.getLanguageLifecycleState().durable, 'ur', 'failed or unknown writes must retain the prior durable language');
  console.log('   PASS: provisional setAppLanguage is non-durable; only verified persistence advances durable state');
}

console.log('7. Cold start restores durable language after a fallback mirror wins first');
{
  const boot = await runAppBootWithLateDurable({ mirror: 'en', durable: 'ar' });
  const lifecycle = boot.module.getLanguageLifecycleState();
  assert.equal(boot.module.getCurrentLanguage(), 'ar', 'the durable saved language must replace the provisional mirror');
  assert.equal(lifecycle.durable, 'ar');
  assert.equal(lifecycle.active, 'ar');
  assert.equal(lifecycle.pendingDirection, 'ar', 'the unapplied RTL direction must be reported as pending, not silently accepted');
  assert.equal(lifecycle.nativeDirectionLocked, true);
  assert.deepEqual(
    boot.runtime.nativeCalls,
    [['allowRTL', false], ['forceRTL', false]],
    'direction must not be flipped after the native tree is locked; the pending restart is truthful',
  );
  console.log('   PASS: durable text wins; stale native direction is exposed as pending restart');
}

console.log('8. Normal cold start applies the durable language before locking');
{
  const boot = loadRealI18n({ syncLanguage: 'en', persistedLanguage: 'ar' });
  const durable = await boot.module.resolvePersistedLanguage(true);
  boot.module.setAppLanguage(durable);
  boot.module.applyRTL(boot.module.isRtlLanguage(durable));
  boot.module.lockNativeDirectionForUI();
  const lifecycle = boot.module.getLanguageLifecycleState();
  assert.equal(boot.module.getCurrentLanguage(), 'ar');
  assert.equal(lifecycle.pendingDirection, null);
  assert.deepEqual(boot.runtime.nativeCalls.slice(-2), [['allowRTL', true], ['forceRTL', true]]);
  console.log('   PASS: durable Arabic resolves before the one-shot direction lock');
}

console.log('9. Durable boot cancels the fallback timer');
{
  const boot = await runAppBootWithLateDurable({ mirror: 'en', durable: 'ar', fallbackFirst: false });
  assert.equal(boot.timer.cleared, true, 'a resolved durable boot must cancel the fallback timer');
  const lifecycle = boot.module.getLanguageLifecycleState();
  assert.equal(boot.module.getCurrentLanguage(), 'ar', 'the fallback timeout must never overwrite a resolved durable language');
  assert.equal(lifecycle.active, 'ar');
  assert.equal(lifecycle.pendingDirection, null);
  assert.deepEqual(
    boot.runtime.nativeCalls,
    [['allowRTL', false], ['forceRTL', false], ['allowRTL', true], ['forceRTL', true]],
    'a normal durable boot applies the real direction once',
  );
  console.log('   PASS: durable boot cancels the timeout and keeps the durable language');
}

console.log('9b. Pending native direction is a reactive lifecycle source and clears on verified cold start');
{
  const live = loadRealI18n({ syncLanguage: 'en', persistedLanguage: 'en' });
  const snapshots = [];
  const unsubscribe = live.module.subscribeLanguageLifecycle((state) => snapshots.push(state));
  live.module.recordRequestedLanguage('ur');
  live.module.markLanguageDurable('ur');
  live.module.setAppLanguage('ur');
  live.module.markPendingLanguageDirection('ur');
  assert.equal(live.module.getLanguageLifecycleState().active, 'ur');
  assert.equal(live.module.getLanguageLifecycleState().pendingDirection, 'ur');
  assert.ok(snapshots.some((state) => state.pendingDirection === 'ur'), 'late durable correction must notify subscribers');
  unsubscribe();

  const cold = loadRealI18n({ syncLanguage: 'ur', persistedLanguage: 'ur' });
  const durable = await cold.module.resolvePersistedLanguage(true);
  cold.module.setAppLanguage(durable);
  cold.module.applyRTL(cold.module.isRtlLanguage(durable));
  cold.module.lockNativeDirectionForUI();
  cold.module.clearPendingLanguageDirection();
  assert.equal(cold.module.getLanguageLifecycleState().pendingDirection, null, 'verified cold start clears the notice state');
  const appCold = await runAppBootWithLateDurable({ mirror: 'ur', durable: 'ur', fallbackFirst: false });
  assert.equal(appCold.module.getLanguageLifecycleState().pendingDirection, null, 'the real App cold-start path clears pending direction after native application');
  console.log('   PASS: pending direction is observable, distinct from active language, and cleared only after cold-start application');
}

console.log('9c. SettingsScreen renders and persists one reactive reopen notice');
{
  const screenI18n = loadRealI18n({ syncLanguage: 'ur', persistedLanguage: 'ur' });
  const screen = loadRealSettingsScreenForLifecycle(screenI18n.module);
  screen.render();
  screen.runEffects();
  screenI18n.module.markPendingLanguageDirection('ur');
  screenI18n.module.markPendingLanguageDirection('ur');
  const pendingText = collectText(screen.render());
  const notice = 'Language saved. Reopening the app is required to finish switching the layout direction.';
  assert.equal(screen.collapsedLanguageSectionRendered, true, 'the real Language Section must be rendered collapsed by default');
  assert.equal(pendingText.filter((text) => text === notice).length, 1, 'one lifecycle state must render one notice');
  screenI18n.module.clearPendingLanguageDirection();
  const clearedText = collectText(screen.render());
  assert.equal(clearedText.includes(notice), false, 'verified cold-start clearing must remove the notice');
  console.log('   PASS: SettingsScreen observes the i18n lifecycle and does not duplicate or prematurely retain the prompt');
}

console.log('9d. Reload rejection leaves exactly one pending-direction reopen instruction');
{
  const screenI18n = loadRealI18n({ syncLanguage: 'ur', persistedLanguage: 'ur' });
  const screen = loadRealSettingsScreenForLifecycle(screenI18n.module, {
    reloadAppAsync: async () => { throw new Error('reload rejected'); },
    persistLanguageChange: async (currentSettings, nextLanguage) => ({ ...currentSettings, language: nextLanguage }),
  });
  screen.render();
  screen.runEffects();

  let tree = screen.render();
  let languageToggle = null;
  walkHostTree(tree, (node) => {
    if (node.type === 'Pressable' && String(node.props?.accessibilityLabel).includes('Language / زبان') && String(node.props?.accessibilityLabel).includes('Collapsed')) {
      languageToggle = node;
    }
  });
  if (languageToggle) {
    languageToggle.props.onPress();
    tree = screen.render();
  }
  const row = findLanguageRow(tree, 'English');
  row.props.onPress();
  await delay(350);
  const afterFailureText = collectText(screen.render());
  const pendingNotice = 'Language saved. Reopening the app is required to finish switching the layout direction.';
  const restartError = 'Please restart the app to apply the new layout direction.';
  assert.equal(afterFailureText.filter((text) => text === pendingNotice).length, 1, 'reload rejection must leave one pending reopen notice');
  assert.equal(afterFailureText.filter((text) => text === restartError).length, 0, 'reload rejection must not duplicate the pending notice as a language error');

  screenI18n.module.clearPendingLanguageDirection();
  const afterColdStartText = collectText(screen.render());
  assert.equal(afterColdStartText.includes(pendingNotice), false, 'verified cold-start resolution must clear the pending notice');
  console.log('   PASS: rejected reload keeps one localized pending notice and cold-start clearing removes it');
}

console.log('10. English -> Urdu -> Arabic -> Pashto -> English');
{
  const variants = [
    ['en', 'ur', true],
    ['ur', 'ar', false],
    ['ar', 'ps', false],
    ['ps', 'en', true],
  ];
  let active = 'en';
  let nativeRTL = false;
  const helpers = loadSettingsScreenHelpers();
  const settings = loadRealSettings();
  for (const [from, to, restart] of variants) {
    assert.equal(from, active);
    const transition = helpers.classifyLanguageDirectionTransition({
      platform: 'android', currentLanguage: active, nextLanguage: to, nativeIsRTL: nativeRTL,
    });
    assert.equal(transition.requiresRestart, restart, `${from}->${to} restart expectation`);
    const next = settings.exports.computeNextLanguageSettings(
      settings.exports.sanitizeSettings({ language: active, tafsirSourceId: 'jalalayn' }),
      to,
    );
    assert.equal(next.language, to);
    if (restart) nativeRTL = ['ur', 'ar', 'ps'].includes(to);
    active = next.language;
  }
  assert.equal(active, 'en');
  console.log('   PASS: the required sequence covers same-direction RTL and both direction changes');
}

console.log('\n=== ALL P1 LANGUAGE TRANSITION CHECKS PASSED ===');
