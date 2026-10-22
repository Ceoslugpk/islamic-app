/**
 * v1.1.94 language reload transaction regression.
 *
 * This suite transpiles and executes the real SettingsScreen.tsx. React Native
 * hosts and unrelated screen dependencies are stubbed at the module boundary,
 * while the language-row press handler, persistence seam, reload seam, state
 * lock, and diagnostic handle are all exercised from production code.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function compile(sourcePath, requireMap) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(requireMap, id)) return requireMap[id];
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

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
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

function treeContainsText(node, needle) {
  if (typeof node === 'string') return node.includes(needle);
  if (Array.isArray(node)) return node.some((child) => treeContainsText(child, needle));
  if (!node || typeof node !== 'object') return false;
  return treeContainsText(node.props?.children, needle);
}

function findLanguageRow(tree, label) {
  let found = null;
  walkHostTree(tree, (node) => {
    if (
      node.type === 'Pressable' &&
      node.props?.accessibilityRole === 'radio' &&
      String(node.props?.accessibilityLabel).includes(label)
    ) {
      found = node;
    }
  });
  assert.ok(found, `real SettingsScreen must render the ${label} language row`);
  return found;
}

function createFixture({ currentLanguage, nativeIsRTL, reloadAppAsync }) {
  const timers = [];
  const timerOriginals = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  const persistenceCalls = [];
  const languageCalls = [];
  const reloadCalls = [];
  const preparationCalls = [];
  const diagnosticEvents = [];
  const diagnosticStarts = [];
  const setterEvents = [];
  let persistedLanguage = currentLanguage;

  globalThis.setTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false };
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };

  const state = {
    language: currentLanguage,
    themeMode: 'paper',
    methodId: 2,
    timeFormat: '12h',
    remindersEnabled: false,
    reminderOffsetMinutes: 10,
    quranReminderEnabled: false,
    madhab: 'shafi',
    prayerConfigs: {},
    quranReminderTime: '09:00',
    quranGoal: { type: 'minutes', target: 15 },
    womenWorshipEnabled: false,
    womenPinHash: null,
    womenLockEnabled: false,
    hapticsEnabled: true,
    adhanReciterId: 'alafasy',
    quranArabicFont: 'amiri',
    quranFontSize: 20,
    quranLineHeight: 1.8,
    quranShowTranslation: true,
    quranPreloadRequested: false,
    manualLocation: { latitude: 21.42, longitude: 39.83, label: 'Makkah' },
    autoLocation: null,
    locationMode: 'manual',
    tafsirSourceId: 'jalalayn',
  };

  let hookIndex = 0;
  const hookValues = [];
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
      const index = hookIndex++;
      if (!(index in hookValues)) {
        let value = typeof initial === 'function' ? initial() : initial;
        // Open the language group in this harness so the real language rows render.
        if (value && typeof value === 'object' && 'language' in value) {
          value = { ...value, language: true };
        }
        hookValues[index] = value;
      }
      const setter = (next) => {
        const value = typeof next === 'function' ? next(hookValues[index]) : next;
        hookValues[index] = value;
        setterEvents.push({ index, value });
      };
      return [hookValues[index], setter];
    },
    useEffect() {},
    useRef(initial) {
      const index = hookIndex++;
      if (!(index in hookValues)) hookValues[index] = { current: initial };
      return hookValues[index];
    },
  };
  react.default = react;

  const tokens = new Proxy({ shadow: { paper: {}, ink: {} } }, {
    get(target, property) {
      if (property in target) return target[property];
      if (property === 'goldGradient') return ['#B8975A', '#B8975A'];
      return '#123456';
    },
  });

  const useSettings = () => ({
    settings: state,
    updateSettings(updater) { Object.assign(state, updater(state)); },
    setLanguage: async (language) => {
      languageCalls.push(language);
      state.language = language;
    },
    setMethod() {},
    setTimeFormat() {},
    setReminders() {},
    setReminderOffsetMinutes() {},
    setQuranReminderEnabled() {},
    setThemeMode() {},
    setWomenWorship() {},
    setWomenPinHash() {},
    setWomenLockEnabled() {},
    setHapticsEnabled() {},
    setAdhanReciterId() {},
    setQuranArabicFont() {},
    setQuranFontSize() {},
    setQuranLineHeight() {},
    setQuranShowTranslation() {},
    setQuranPreloadRequested() {},
  });

  const settingsModule = {
    __esModule: true,
    useSettings,
    persistLanguageChange: async (currentSettings, nextLanguage) => {
      persistenceCalls.push({ currentLanguage: currentSettings.language, nextLanguage });
      persistedLanguage = nextLanguage;
      return { ...currentSettings, language: nextLanguage };
    },
    QURAN_FONT_SIZE_MIN: 18,
    QURAN_FONT_SIZE_MAX: 40,
    QURAN_FONT_SIZE_STEP: 2,
    QURAN_LINE_HEIGHT_MIN: 1.4,
    QURAN_LINE_HEIGHT_MAX: 3,
    QURAN_LINE_HEIGHT_STEP: 0.1,
  };

  const settings = compile(path.join(ROOT, 'src/screens/SettingsScreen.tsx'), {
    react,
    'react-native': {
      AccessibilityInfo: {
        isReduceMotionEnabled: async () => false,
        addEventListener: () => ({ remove() {} }),
      },
      LayoutAnimation: { configureNext() {} },
      Modal: 'Modal',
      Pressable: 'Pressable',
      ScrollView: 'ScrollView',
      StyleSheet: { create: (styles) => styles, absoluteFill: {}, hairlineWidth: 1 },
      View: 'View',
      Image: 'Image',
      TouchableOpacity: 'TouchableOpacity',
      Alert: { alert() {} },
      ActivityIndicator: 'ActivityIndicator',
      useWindowDimensions: () => ({ width: 390, height: 844 }),
      Linking: { openSettings: async () => {} },
      BackHandler: { addEventListener: () => ({ remove() {} }) },
      Platform: { OS: 'android' },
      I18nManager: { isRTL: nativeIsRTL },
    },
    expo: {
      reloadAppAsync: async (reason) => {
        reloadCalls.push(reason);
        return reloadAppAsync();
      },
    },
    '../lib/i18n': {
      __esModule: true,
      t: (key) => key,
      prepareNativeLayoutDirection: (language) => preparationCalls.push(language),
      isRtlLanguage: (language) => ['ur', 'ar', 'ps'].includes(language),
    },
    '../lib/settings': settingsModule,
    '../lib/theme': {
      useTheme: () => ({ colors: tokens, mode: 'paper' }),
      useThemeTokens: () => ({ tokens }),
      getTokens: () => tokens,
      cardTokens: tokens,
      getBrandLogoSource: () => ({}),
    },
    '../lib/iconMap': { getForwardIcon: () => 'chevron-forward', iconSizes: { sm: 16, md: 20 } },
    '../lib/buttonTokens': { touchTargetTokens: { minimum: 44 } },
    '../theme/tokens': {
      useThemeTokens: () => ({ tokens }),
      getTokens: () => tokens,
      cardTokens: tokens,
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
    '../../app.json': { __esModule: true, default: { expo: { version: '1.1.94' } } },
    '../lib/diagnostic': {
      isDiagnosticModeEnabled: () => false,
      DIAGNOSTIC_BUILD_ID: 'test',
      GatedDiagnosticModal: genericComponent,
      usePressProbe: (_id, _kind, options) => ({ onPress: options?.onPress }),
      wrapControlPress: (_id, _kind, _screen, onPress) => onPress,
      recordControlState() {},
      noteControlPress() {},
      beginLanguageSwitch: (_fromLanguage, _toLanguage, options) => {
        diagnosticStarts.push({ ...options });
        return {
          markResolved: () => diagnosticEvents.push('resolved'),
          markRejected: () => diagnosticEvents.push('rejected'),
          markNoRestart: () => diagnosticEvents.push('noRestart'),
          markReloadRequested: () => diagnosticEvents.push('reloadRequested'),
        };
      },
      recordConsistencyCheck() {},
    },
    '../components/ui/AppText': genericModule,
    '@expo/vector-icons': genericModule,
    'expo-linear-gradient': genericModule,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    '../components/Hairline': genericModule,
    '../components/layout/SheetHeader': genericModule,
    '../components/layout/DetailScreen': { __esModule: true, DetailScreen: genericComponent },
    '../components/ArabicText': { QURAN_FONT_FAMILIES: { amiri: { regular: 'serif', bold: 'serif' }, notonaskh: { regular: 'serif', bold: 'serif' } } },
    '../components/AdhanReciterModal': genericModule,
    '../components/QuranLanguageModal': genericModule,
    '../components/WomenPinModal': genericModule,
    '../components/GeometricPattern': genericModule,
    './LegalScreen': genericModule,
    './BackupRestoreScreen': genericModule,
  });

  const render = () => {
    hookIndex = 0;
    return settings.default({ onClose() {} });
  };

  const restore = () => {
    globalThis.setTimeout = timerOriginals.setTimeout;
    globalThis.clearTimeout = timerOriginals.clearTimeout;
  };

  return {
    render,
    restore,
    timers,
    persistenceCalls,
    languageCalls,
    reloadCalls,
    preparationCalls,
    diagnosticEvents,
    diagnosticStarts,
    setterEvents,
    state,
    get persistedLanguage() { return persistedLanguage; },
    get nativeIsRTL() { return nativeIsRTL; },
  };
}

function timerFor(fixture, delay) {
  const timer = fixture.timers.find((item) => item.delay === delay && !item.cleared);
  assert.ok(timer, `production handler must schedule a ${delay}ms timer`);
  return timer;
}

console.log('=== v1.1.94 real SettingsScreen language reload transaction ===');

console.log('1. Direction-changing reload rejection preserves the choice for cold start');
{
  const fixture = createFixture({
    currentLanguage: 'ur',
    nativeIsRTL: true,
    reloadAppAsync: async () => { throw new Error('UnknownError'); },
  });
  try {
    const row = findLanguageRow(fixture.render(), 'English');
    row.props.onPress();
    await tick();

    assert.deepEqual(fixture.persistenceCalls, [{ currentLanguage: 'ur', nextLanguage: 'en' }]);
    assert.deepEqual(fixture.diagnosticStarts, [{ reloadRequested: false }]);
    assert.deepEqual(fixture.languageCalls, [], 'direction-changing persistence must not live-apply the new UI language');
    assert.equal(fixture.persistedLanguage, 'en', 'the failed reload must not discard the durable choice');
    assert.equal(fixture.state.language, 'ur', 'the failed reload must not render English inside the old RTL session');
    assert.deepEqual(fixture.preparationCalls, ['en'], 'the new direction is staged in the synchronous mirror');
    assert.equal(fixture.nativeIsRTL, true, 'the live native direction remains Urdu/RTL until cold start');

    timerFor(fixture, 300).callback();
    await tick();
    await tick();

    assert.deepEqual(fixture.reloadCalls, ['App language changed']);
    assert.deepEqual(fixture.diagnosticEvents, ['reloadRequested', 'noRestart']);
    assert.ok(fixture.setterEvents.some((event) => event.value === false), 'failed restart must unlock the language controls');
    const afterFailure = fixture.render();
    const englishAgain = findLanguageRow(afterFailure, 'English');
    assert.equal(englishAgain.props.disabled, false, 'no language row may remain disabled after fallback');
    assert.equal(englishAgain.props.accessibilityState.disabled, false, 'diagnostic/UI state must agree that the row is enabled');
    assert.equal(
      treeContainsText(afterFailure, 'Please restart the app'),
      false,
      'the no-restart fallback must not duplicate the pending-direction notice as a language error',
    );
    console.log('   PASS: persisted target + staged direction, old session retained, truthful no-restart outcome, controls unlocked');
  } finally {
    fixture.restore();
  }
}

console.log('2. Direction-changing reload success requests exactly one native reload');
{
  const fixture = createFixture({
    currentLanguage: 'ur',
    nativeIsRTL: true,
    reloadAppAsync: async () => {},
  });
  try {
    const row = findLanguageRow(fixture.render(), 'English');
    row.props.onPress();
    await tick();
    timerFor(fixture, 300).callback();
    await tick();

    assert.equal(fixture.persistedLanguage, 'en');
    assert.deepEqual(fixture.diagnosticStarts, [{ reloadRequested: false }]);
    assert.equal(fixture.state.language, 'ur', 'a pending restart must not render English with the old RTL direction');
    assert.deepEqual(fixture.preparationCalls, ['en']);
    assert.deepEqual(fixture.reloadCalls, ['App language changed']);
    assert.deepEqual(fixture.languageCalls, []);
    assert.deepEqual(fixture.diagnosticEvents, ['reloadRequested'], 'a pending native restart is not falsely reported as rejected');
    assert.equal(fixture.timers.some((timer) => timer.delay === 1500 && !timer.cleared), true, 'the bounded no-restart guard remains armed until the old JS session ends');
    console.log('   PASS: direction-changing success persists/stages then requests one reload without live half-switch');
  } finally {
    fixture.restore();
  }
}

console.log('3. Same-direction switch stays live and resolves without reload');
{
  const fixture = createFixture({
    currentLanguage: 'ur',
    nativeIsRTL: true,
    reloadAppAsync: async () => { throw new Error('must not reload'); },
  });
  try {
    const row = findLanguageRow(fixture.render(), 'العربية');
    row.props.onPress();
    await tick();
    await tick();

    assert.deepEqual(fixture.languageCalls, ['ar']);
    assert.deepEqual(fixture.persistenceCalls, []);
    assert.deepEqual(fixture.reloadCalls, []);
    assert.deepEqual(fixture.preparationCalls, ['ar']);
    assert.deepEqual(fixture.diagnosticEvents, ['resolved']);
    assert.ok(fixture.setterEvents.some((event) => event.value === false), 'live apply must clear the language lock');
    console.log('   PASS: ur→ar uses live setLanguage, no reload, and resolved diagnostics');
  } finally {
    fixture.restore();
  }
}

console.log('=== ALL REAL SETTINGS LANGUAGE RELOAD CHECKS PASSED ===');
