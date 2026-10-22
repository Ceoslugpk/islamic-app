/**
 * v1.1.95 SettingsScreen language-switch generation regression.
 *
 * This transpiles and executes the real SettingsScreen.tsx. React Native and
 * unrelated screen dependencies are stubbed at module boundaries; language
 * rows, their lifecycle cleanup, persistence, reload timers, state lock, and
 * diagnostic marks all come from the production screen.
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
  const nativeDirection = { isRTL: nativeIsRTL };

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
  const effectValues = [];
  let unmounted = false;

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
    useEffect(effect, deps) {
      const index = hookIndex++;
      const previous = effectValues[index];
      const changed = !previous || !deps || !previous.deps || deps.some((value, i) => value !== previous.deps[i]);
      if (!changed) return;
      if (previous?.cleanup) previous.cleanup();
      const cleanup = effect();
      effectValues[index] = { deps: deps ? [...deps] : undefined, cleanup };
    },
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
    publishSettingsScope: () => {},
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
      I18nManager: nativeDirection,
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
    '../../app.json': { __esModule: true, default: { expo: { version: '1.1.95' } } },
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
    assert.equal(unmounted, false, 'the fixture must not render after unmount');
    hookIndex = 0;
    return settings.default({ onClose() {} });
  };

  const unmount = () => {
    if (unmounted) return;
    unmounted = true;
    for (let index = effectValues.length - 1; index >= 0; index -= 1) {
      const cleanup = effectValues[index]?.cleanup;
      if (cleanup) {
        effectValues[index].cleanup = null;
        cleanup();
      }
    }
  };

  const restore = () => {
    globalThis.setTimeout = timerOriginals.setTimeout;
    globalThis.clearTimeout = timerOriginals.clearTimeout;
  };

  return {
    render,
    unmount,
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
    nativeDirection,
    get persistedLanguage() { return persistedLanguage; },
  };
}

function activeTimer(fixture, delay) {
  return fixture.timers.find((timer) => timer.delay === delay && !timer.cleared);
}

function requireTimer(fixture, delay) {
  const timer = activeTimer(fixture, delay);
  assert.ok(timer, `production handler must schedule an active ${delay}ms timer`);
  return timer;
}

console.log('=== v1.1.95 real SettingsScreen generation-guard test ===');

console.log('1. Unmount during the 300ms reload delay clears the callback and unlocks the ref');
{
  const fixture = createFixture({
    currentLanguage: 'en',
    nativeIsRTL: false,
    reloadAppAsync: async () => {},
  });
  try {
    const row = findLanguageRow(fixture.render(), 'اردو');
    row.props.onPress();
    await tick();
    const reloadTimer = requireTimer(fixture, 300);

    fixture.unmount();
    assert.equal(reloadTimer.cleared, true, 'unmount must clear the pending reload timer');
    reloadTimer.callback();
    await tick();

    assert.deepEqual(fixture.reloadCalls, [], 'a callback from an unmounted screen must not reload the app');
    assert.ok(fixture.setterEvents.some((event) => event.value === false), 'unmount must reset the language lock ref/state');
    console.log('   PASS');
  } finally {
    fixture.restore();
  }
}

console.log('2. A late callback from switch #1 cannot clear switch #2');
{
  const fixture = createFixture({
    currentLanguage: 'en',
    nativeIsRTL: false,
    reloadAppAsync: async () => { throw new Error('restart unavailable'); },
  });
  try {
    let row = findLanguageRow(fixture.render(), 'اردو');
    row.props.onPress();
    await tick();
    const firstReloadTimer = requireTimer(fixture, 300);
    firstReloadTimer.callback();
    await tick();
    await tick();
    const firstFailSafeTimer = fixture.timers.find((timer) => timer.delay === 1500);
    assert.ok(firstFailSafeTimer, 'switch #1 must install its bounded fail-safe timer');

    // Model the next render after switch #1's rejection. The old callback is
    // retained deliberately to represent a callback already queued by the host.
    fixture.state.language = 'ur';
    row = findLanguageRow(fixture.render(), 'العربية');
    row.props.onPress();
    await tick();
    const secondReloadTimer = requireTimer(fixture, 300);
    assert.equal(
      fixture.setterEvents.filter((event) => event.value === true || event.value === false).at(-1).value,
      true,
      'switch #2 must hold the lock before its reload',
    );

    firstFailSafeTimer.callback();
    assert.equal(secondReloadTimer.cleared, false, 'switch #1 must not clear switch #2 timer');
    assert.equal(
      fixture.setterEvents.filter((event) => event.value === true || event.value === false).at(-1).value,
      true,
      'switch #1 must not unlock switch #2',
    );
    assert.deepEqual(
      fixture.diagnosticEvents,
      ['reloadRequested', 'noRestart', 'reloadRequested'],
      'a stale callback must not emit switch #1 outcome marks a second time',
    );
    const afterStaleCallback = findLanguageRow(fixture.render(), 'العربية');
    assert.equal(afterStaleCallback.props.disabled, true, 'switch #2 must remain disabled while its own reload is pending');
    console.log('   PASS');
  } finally {
    fixture.restore();
  }
}

console.log('3. A normal completed live switch still resolves and unlocks');
{
  const fixture = createFixture({
    currentLanguage: 'ur',
    nativeIsRTL: true,
    reloadAppAsync: async () => { throw new Error('same-direction switch must not reload'); },
  });
  try {
    const row = findLanguageRow(fixture.render(), 'العربية');
    row.props.onPress();
    await tick();
    await tick();

    assert.deepEqual(fixture.languageCalls, ['ar']);
    assert.deepEqual(fixture.reloadCalls, []);
    assert.deepEqual(fixture.preparationCalls, ['ar']);
    assert.deepEqual(fixture.diagnosticEvents, ['resolved']);
    const afterCompletion = findLanguageRow(fixture.render(), 'العربية');
    assert.equal(afterCompletion.props.disabled, false, 'a completed switch must re-enable language rows');
    assert.equal(
      fixture.setterEvents.filter((event) => event.value === true || event.value === false).at(-1).value,
      false,
      'a completed switch must unlock the controls',
    );
    console.log('   PASS');
  } finally {
    fixture.restore();
  }
}

console.log('4. Same-direction switching remains live and does not schedule reload');
{
  const fixture = createFixture({
    currentLanguage: 'en',
    nativeIsRTL: false,
    reloadAppAsync: async () => { throw new Error('same-direction switch must not reload'); },
  });
  try {
    const row = findLanguageRow(fixture.render(), 'हिन्दी');
    row.props.onPress();
    await tick();
    await tick();

    assert.deepEqual(fixture.languageCalls, ['hi']);
    assert.deepEqual(fixture.persistenceCalls, []);
    assert.deepEqual(fixture.reloadCalls, []);
    assert.equal(activeTimer(fixture, 300), undefined);
    assert.deepEqual(fixture.diagnosticEvents, ['resolved']);
    const afterSameDirection = findLanguageRow(fixture.render(), 'हिन्दी');
    assert.equal(afterSameDirection.props.disabled, false, 'same-direction switching must leave the row enabled');
    assert.equal(
      fixture.setterEvents.filter((event) => event.value === true || event.value === false).at(-1).value,
      false,
    );
    console.log('   PASS');
  } finally {
    fixture.restore();
  }
}

console.log('=== ALL REAL SETTINGS SCREEN GENERATION CHECKS PASSED ===');
