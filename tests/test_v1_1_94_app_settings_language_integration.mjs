/**
 * v1.1.94 application-level language recovery integration checks.
 *
 * This suite transpiles and executes the real App.tsx and SettingsScreen.tsx
 * production modules. The React Native host layer is stubbed only so their
 * actual effect and press-handler logic can run without a device.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function compile(sourcePath, requireMap, { jsx = ts.JsxEmit.React } = {}) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(requireMap, id)) return requireMap[id];
    if (requireMap.__fallback) return requireMap.__fallback;
    if (id.endsWith('.json')) return { __esModule: true, default: {} };
    throw new Error(`Unexpected import while executing ${sourcePath}: ${id}`);
  };
  new Function('module', 'exports', 'require', output)(module, module.exports, localRequire);
  return module.exports;
}

function createGenericComponent() {
  return function GenericComponent(props = {}) {
    return props.children ?? null;
  };
}

const genericComponent = createGenericComponent();
const genericModule = new Proxy({ __esModule: true, default: genericComponent }, {
  get(target, property) {
    if (property in target) return target[property];
    return genericComponent;
  },
});

function createReactI18nStub(runtime) {
  const instance = {
    language: runtime.language,
    use() { return instance; },
    init(options) {
      instance.language = options.lng;
      runtime.language = options.lng;
      return instance;
    },
    changeLanguage(language) {
      instance.language = language;
      runtime.language = language;
    },
    t(key) { return key; },
  };
  return {
    __esModule: true,
    default: instance,
    use: () => instance,
    init: (options) => instance.init(options),
    changeLanguage: (language) => instance.changeLanguage(language),
    t: (key) => instance.t(key),
    instance,
  };
}

function loadRealI18n({ deviceLanguage, persistedLanguage, syncLanguage, nativeDirection = false }) {
  const runtime = {
    language: 'en',
    settingsRaw: persistedLanguage ? JSON.stringify({ language: persistedLanguage }) : null,
    syncCache: syncLanguage ? { 'app-language': { language: syncLanguage } } : {},
    nativeEvents: [],
  };
  const i18next = createReactI18nStub(runtime);
  const storage = {
    async getItem(key) {
      assert.equal(key, 'islamic-settings');
      return runtime.settingsRaw;
    },
    async setItem(key, value) {
      assert.equal(key, 'islamic-settings');
      runtime.settingsRaw = value;
    },
  };
  const reactNative = {
    I18nManager: {
      isRTL: nativeDirection,
      allowRTL(value) { runtime.nativeEvents.push(['allowRTL', value]); },
      forceRTL(value) { runtime.nativeEvents.push(['forceRTL', value]); },
    },
    Platform: { OS: 'android' },
  };
  const db = {
    loadQuranCache(key) {
      return runtime.syncCache[key] ?? null;
    },
    saveQuranCache(key, value) {
      runtime.syncCache[key] = value;
      return true;
    },
  };
  const module = compile(path.join(ROOT, 'src/lib/i18n.ts'), {
    i18next,
    'react-i18next': {
      initReactI18next: {},
      useTranslation: () => ({ i18n: i18next.instance, t: (key) => key }),
    },
    'expo-localization': { getLocales: () => [{ languageCode: deviceLanguage }] },
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    'react-native': reactNative,
    './db': db,
    '../locales/en.json': { __esModule: true, default: {} },
    '../locales/ur.json': { __esModule: true, default: {} },
    '../locales/ar.json': { __esModule: true, default: {} },
    '../locales/hi.json': { __esModule: true, default: {} },
    '../locales/ml.json': { __esModule: true, default: {} },
    '../locales/si.json': { __esModule: true, default: {} },
    '../locales/bn.json': { __esModule: true, default: {} },
    '../locales/ms.json': { __esModule: true, default: {} },
    '../locales/ta.json': { __esModule: true, default: {} },
    '../locales/id.json': { __esModule: true, default: {} },
    '../locales/ps.json': { __esModule: true, default: {} },
  });
  return { module, runtime, reactNative };
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
    useEffect(effect) {
      effects.push(effect);
    },
    useRef(value) {
      return { current: value };
    },
    useMemo(factory) {
      return factory();
    },
    useCallback(callback) {
      return callback;
    },
    memo(component) {
      return component;
    },
  };
  react.default = react;
  return react;
}

async function tick() {
  await new Promise((resolve) => setImmediate(resolve));
}

async function executeAppBootEffect({ hangs = false } = {}) {
  const boot = loadRealI18n({
    deviceLanguage: 'en',
    persistedLanguage: hangs ? null : 'ur',
    syncLanguage: null,
  });
  if (hangs) {
    boot.module.resolvePersistedLanguage = () => new Promise(() => {});
  }
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = [];
  if (hangs) {
    globalThis.setTimeout = (callback, delay) => {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    };
    globalThis.clearTimeout = (timer) => {
      if (timer) timer.cleared = true;
    };
  }
  const effects = [];
  try {
    const appReact = createAppReactStub(effects);
    const app = compile(path.join(ROOT, 'App.tsx'), {
      react: appReact,
      'react-native': {
        Platform: { OS: 'android' },
        StyleSheet: { create: (styles) => styles, absoluteFill: {} },
        useColorScheme: () => 'light',
        View: 'View',
        Text: 'Text',
        Image: 'Image',
        TouchableOpacity: 'TouchableOpacity',
        TouchableWithoutFeedback: 'TouchableWithoutFeedback',
        Modal: 'Modal',
        Animated: {},
        Easing: {},
        I18nManager: { isRTL: false },
        useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
        Linking: {},
        AppState: { addEventListener: () => ({ remove() {} }) },
        BackHandler: {},
        AccessibilityInfo: {},
      },
      './src/lib/i18n': boot.module,
      './src/lib/fonts': { useEditorialFonts: () => [true, null] },
      './src/lib/onboardingState': { getOnboardingDone: async () => true },
      './src/lib/theme': genericModule,
      './src/lib/settings': genericModule,
      './src/lib/useConnectivity': genericModule,
      './src/lib/useLocation': genericModule,
      'react-native-safe-area-context': genericModule,
      'expo-status-bar': genericModule,
      '@expo/vector-icons': genericModule,
      'expo-linear-gradient': genericModule,
      __fallback: genericModule,
    });

    app.default();
    assert.ok(effects.length >= 2, 'App must register its bootstrap effects');
    for (const effect of effects) effect();
    if (hangs) {
      const timeout = timers.find((timer) => timer.delay === 5000);
      assert.ok(timeout, 'App must arm a bounded language bootstrap timeout');
      timeout.callback();
    }
    await tick();
    return boot;
  } finally {
    if (hangs) {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  }
}

function createSettingsReactStub(setterEvents) {
  let mountedHookIndex = 0;
  const react = {
    __esModule: true,
    default: null,
    createElement(type, props, ...children) {
      const normalizedChildren = children.length <= 1 ? children[0] ?? null : children;
      if (typeof type === 'function') {
        return type({ ...(props ?? {}), children: normalizedChildren });
      }
      return { type, props: { ...(props ?? {}), children: normalizedChildren } };
    },
    useState(initial) {
      const hookIndex = mountedHookIndex++;
      let value = typeof initial === 'function' ? initial() : initial;
      if (value && typeof value === 'object' && 'language' in value) {
        value = { ...value, language: true };
      }
      const setter = (next) => setterEvents.push({ hookIndex, value: next });
      return [value, setter];
    },
    useEffect() {},
    useRef(value) {
      return { current: value };
    },
    useMemo(factory) {
      return factory();
    },
    useCallback(callback) {
      return callback;
    },
  };
  react.default = react;
  return react;
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

function createSettingsFixture({ nativeIsRTL, setLanguage, reloadAppAsync, timers, preparationEvents }) {
  const setterEvents = [];
  const settingsState = {
    language: 'en',
    themeMode: 'paper',
    methodId: 2,
    timeFormat: '12h',
    remindersEnabled: false,
    reminderOffsetMinutes: 10,
    quranReminderEnabled: false,
    madhab: 'standard',
    prayerConfigs: {},
    quranReminderTime: '09:00',
    quranGoal: 1,
    womenWorshipEnabled: false,
    womenPinHash: null,
    womenLockEnabled: false,
    hapticsEnabled: true,
    adhanReciterId: 'mishary',
    quranArabicFont: 'amiri',
    quranFontSize: 20,
    quranLineHeight: 1.8,
    quranShowTranslation: true,
    quranPreloadRequested: false,
    manualLocation: { latitude: 21.42, longitude: 39.83, label: 'Makkah', city: 'Makkah' },
    autoLocation: null,
    locationMode: 'manual',
  };

  // The direction-changing path persists via the settings MODULE's own
  // persistLanguageChange (not the context's setLanguage), so spy on it here.
  const persistedLanguageWrites = [];
  const useSettings = () => ({
    settings: settingsState,
    updateSettings(updater) { Object.assign(settingsState, updater(settingsState)); },
    setLanguage,
    setMethod: () => {},
    setTimeFormat: () => {},
    setReminders: () => {},
    setReminderOffsetMinutes: () => {},
    setQuranReminderEnabled: () => {},
    setThemeMode: () => {},
    setWomenWorship: () => {},
    setWomenPinHash: () => {},
    setWomenLockEnabled: () => {},
    setHapticsEnabled: () => {},
    setAdhanReciterId: () => {},
    setQuranArabicFont: () => {},
    setQuranFontSize: () => {},
    setQuranLineHeight: () => {},
    setQuranShowTranslation: () => {},
    setQuranPreloadRequested: () => {},
  });

  const themeValue = new Proxy({}, { get: () => '#123456' });
  const react = createSettingsReactStub(setterEvents);
  const i18n = {
    __esModule: true,
    t: (key) => key,
    prepareNativeLayoutDirection(language) { preparationEvents.push(language); },
    isRtlLanguage: (language) => ['ur', 'ar', 'ps'].includes(language),
    setAppLanguage: () => {},
  };
  const settings = compile(path.join(ROOT, 'src/screens/SettingsScreen.tsx'), {
    react,
    'react-native': {
      Platform: { OS: 'android' },
      I18nManager: { isRTL: nativeIsRTL },
      AccessibilityInfo: {
        isReduceMotionEnabled: async () => false,
        addEventListener: () => ({ remove() {} }),
      },
      LayoutAnimation: { configureNext() {} },
      Modal: 'Modal',
      Pressable: 'Pressable',
      ScrollView: 'ScrollView',
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
      View: 'View',
      Image: 'Image',
      TouchableOpacity: 'TouchableOpacity',
      Alert: { alert() {} },
      ActivityIndicator: 'ActivityIndicator',
      useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
      Linking: { openSettings: async () => {} },
      BackHandler: { addEventListener: () => ({ remove() {} }) },
    },
    expo: { reloadAppAsync },
    '../lib/i18n': i18n,
    '../lib/settings': { __esModule: true, useSettings, persistLanguageChange: async (_settings, language) => { persistedLanguageWrites.push(language); }, },
    '../lib/theme': {
      useTheme: () => ({ colors: themeValue, mode: 'paper' }),
      useThemeTokens: () => ({ tokens: themeValue }),
      getTokens: () => themeValue,
      cardTokens: themeValue,
      getBrandLogoSource: () => ({}),
    },
    '../theme/tokens': {
      useThemeTokens: () => ({ tokens: themeValue }),
      getTokens: () => themeValue,
      cardTokens: themeValue,
      getBrandLogoSource: () => ({}),
    },
    '../lib/haptics': { useHaptics: () => ({ haptic() {} }) },
    '../lib/prayerTimes': { CALC_METHODS: [{ id: 2, name: 'MWL', region: 'Global' }], fetchPrayerTimes: async () => ({}) },
    '../lib/notifications': {
      requestNotificationPermission: async () => false,
      rescheduleIfNeeded: async () => {},
      getNotificationHealth: async () => ({ status: 'ok' }),
      isNotificationSchedulingSupported: () => false,
    },
    '../lib/audio': {
      playAdhan: async () => {},
      stopAdhan: async () => {},
      getAdhanReciter: () => ({ name: 'Mishary', location: 'Kuwait' }),
      addAdhanPlaybackListener: () => () => {},
    },
    '../lib/quranLanguageState': { useQuranLanguage: () => ({ edition: 'en', flag: '🇬🇧' }) },
    '../lib/timeFormat': { formatTime: () => '09:00' },
    '../lib/quranLanguages': { getLocalizedTranslatorName: () => 'Translator' },
    '../lib/surahNamesLocalized': { getLocalizedLanguageName: (name) => name },
    '../lib/db': { clearWomenData: async () => {}, clearCycleHistory: async () => {} },
    '../lib/quranPreloader': {
      useQuranPreload: () => ({ progress: { cached: 0, total: 114 }, startPreload() {}, pausePreload() {} }),
      verifyQuranPreloadCache: async () => ({}),
      repairQuranPreloadCache: async () => {},
    },
    '../../app.json': { __esModule: true, default: { expo: { version: '1.1.93' } } },
    '../lib/diagnostic': {
      isDiagnosticModeEnabled: () => false,
      DIAGNOSTIC_BUILD_ID: 'test',
      GatedDiagnosticModal: genericComponent,
      usePressProbe: (_id, _kind, options) => ({ onPress: options?.onPress }),
      wrapControlPress: (_id, _kind, _screen, onPress) => onPress,
      recordControlState() {},
      noteControlPress() {},
      beginLanguageSwitch: () => ({ markResolved() {}, markRejected() {}, markNoRestart() {}, markReloadRequested() {} }),
      recordConsistencyCheck() {},
    },
    '../components/ui/AppText': genericModule,
    '@expo/vector-icons': genericModule,
    'expo-linear-gradient': genericModule,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    '../components/Hairline': genericModule,
    '../components/layout/SheetHeader': genericModule,
    '../components/layout/DetailScreen': {
      __esModule: true,
      DetailScreen: Object.assign(genericComponent, { ScrollView: genericComponent }),
    },
    '../components/ArabicText': {
      QURAN_FONT_FAMILIES: {
        amiri: { regular: 'serif', bold: 'serif' },
        notonaskh: { regular: 'serif', bold: 'serif' },
      },
    },
    '../components/AdhanReciterModal': genericModule,
    '../components/QuranLanguageModal': genericModule,
    '../components/WomenPinModal': genericModule,
    '../components/GeometricPattern': genericModule,
    '../screens/LegalScreen': genericModule,
    '../screens/BackupRestoreScreen': genericModule,
    __fallback: genericModule,
  });

  return { settings, setterEvents, settingsState, timers, preparationEvents, persistedLanguageWrites };
}

function findLanguagePressable(tree, languageName) {
  let found = null;
  walkHostTree(tree, (node) => {
    if (
      node.type === 'Pressable' &&
      node.props?.accessibilityRole === 'radio' &&
      String(node.props?.accessibilityLabel).includes(languageName)
    ) {
      found = node;
    }
  });
  assert.ok(found, `language row for ${languageName} must be rendered by the real SettingsScreen`);
  return found;
}

console.log('=== v1.1.94 App + Settings language integration ===');

console.log('1. App boot direction follows the asynchronously persisted language');
{
  const boot = await executeAppBootEffect();
  assert.equal(boot.module.getCurrentLanguage(), 'ur');
  assert.deepEqual(boot.runtime.nativeEvents, [
    ['allowRTL', true],
    ['forceRTL', true],
  ], 'real App boot effect must apply native direction after persisted Urdu resolves');
  const fallback = await executeAppBootEffect({ hangs: true });
  assert.deepEqual(fallback.runtime.nativeEvents, [
    ['allowRTL', false],
    ['forceRTL', false],
  ], 'a hung persisted-language read must still release the App language gate with boot direction');
  console.log('   PASS: real App.tsx bootstrap converges to Urdu/RTL before child UI is mounted');
}

console.log('2. A never-settling language write unlocks the real Settings language control');
{
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = [];
  globalThis.setTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false, fired: false };
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };
  try {
    const fixture = createSettingsFixture({
      nativeIsRTL: false,
      setLanguage: () => new Promise(() => {}),
      reloadAppAsync: async () => {},
      timers,
      preparationEvents: [],
    });
    const tree = fixture.settings.default({ onClose() {} });
    const row = findLanguagePressable(tree, 'Hindi');
    row.props.onPress();
    const writeTimeout = timers.find((timer) => timer.delay === 10_000 && !timer.fired);
    assert.ok(writeTimeout, 'the real language handler must arm the bounded persistence timeout');
    writeTimeout.fired = true;
    writeTimeout.callback();
    await tick();
    // A failed write must NOT silently revert the user's choice: the silent rollback
    // WAS the defect fixed in this round. The handler keeps the choice, unlocks, and
    // surfaces the failure instead - so no second (rollback) bounded timer is armed.
    assert.ok(
      !timers.some((timer) => timer.delay === 10_000 && !timer.fired),
      'a failed language write must not arm a rollback timer (the choice is preserved, not reverted)',
    );
    assert.ok(
      fixture.setterEvents.some((event) => event.value === 'Failed to save settings. Please try again.'),
      'a failed language write must surface an error to the user',
    );
    assert.ok(
      fixture.setterEvents.some((event) => event.value === false),
      'the real language handler must clear its disabled state after the write timeout rejects',
    );
    console.log('   PASS: real SettingsScreen handler rejects the stuck write and unlocks its controls');
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
}

console.log('3. A same-direction native mismatch takes the real reload repair path');
{
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = [];
  const reloadCalls = [];
  globalThis.setTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false, fired: false };
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };
  try {
    const preparationEvents = [];
    const fixture = createSettingsFixture({
      nativeIsRTL: true,
      setLanguage: async (language) => { fixture.languageCalls.push(language); },
      reloadAppAsync: async (reason) => { reloadCalls.push(reason); },
      timers,
      preparationEvents,
    });
    fixture.languageCalls = [];
    const tree = fixture.settings.default({ onClose() {} });
    const row = findLanguagePressable(tree, 'Hindi');
    row.props.onPress();
    await tick();
    const reloadTimer = timers.find((timer) => timer.delay === 300 && !timer.fired);
    assert.ok(reloadTimer, 'a stale native direction must request the bounded reload path');
    reloadTimer.fired = true;
    reloadTimer.callback();
    await tick();
    assert.deepEqual(fixture.persistedLanguageWrites, ['hi']);
    assert.deepEqual(preparationEvents, ['hi']);
    assert.deepEqual(reloadCalls, ['App language changed']);
    console.log('   PASS: real SettingsScreen repairs a stale native direction even for LTR→LTR');
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
}

console.log('4. A reload rejection preserves the chosen language and stages its direction');
{
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = [];
  const languageCalls = [];
  globalThis.setTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false, fired: false };
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };
  try {
    const preparationEvents = [];
    const fixture = createSettingsFixture({
      nativeIsRTL: false,
      setLanguage: async (language) => { languageCalls.push(language); },
      reloadAppAsync: async () => { throw new Error('reload failed'); },
      timers,
      preparationEvents,
    });
    const tree = fixture.settings.default({ onClose() {} });
    const row = findLanguagePressable(tree, 'Urdu');
    row.props.onPress();
    await tick();
    const reloadTimer = timers.find((timer) => timer.delay === 300 && !timer.fired);
    assert.ok(reloadTimer, 'a direction-changing switch must reach the reload call');
    reloadTimer.fired = true;
    reloadTimer.callback();
    await tick();
    await tick();
    // A rejected reload must NOT revert the user's choice: the silent rollback WAS the
    // defect fixed in this round. The choice stays persisted, its direction is staged for
    // the next launch, and the user is told to reopen the app.
    assert.deepEqual(fixture.persistedLanguageWrites, ['ur']);
    assert.deepEqual(preparationEvents, ['ur']);
    assert.ok(
      !languageCalls.includes('en'),
      'a failed reload must not revert the language choice',
    );
    assert.ok(
      fixture.setterEvents.some((event) => event.value === false),
      'reload rejection must unlock the language controls',
    );
    console.log('   PASS: reload failure preserves the choice and stages the new direction');
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
}

console.log('=== ALL APP + SETTINGS INTEGRATION CHECKS PASSED ===');
