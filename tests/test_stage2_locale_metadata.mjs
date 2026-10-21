import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

console.log('=== STAGE-2 QA: LOCALE LIFECYCLE + 114 SURAH NAMES + METADATA LOCALIZATION + HEADER WORDMARK ===\n');

const ok = (m) => console.log(`  [ok] ${m}`);
const fail = (m) => { throw new Error(`FAIL: ${m}`); };

// ── 1. Locale lifecycle: language persistence + auto-link restore (en<->ur) ──
// Static assertions on the code paths that implement the en->ur reload, the
// ur->en restore of English content defaults, and repeated switches.
const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');
const i18nCode = fs.readFileSync('src/lib/i18n.ts', 'utf8');

// (a) ur boots from persisted language BEFORE i18n init (deterministic boot)
assert.ok(
  i18nCode.includes("const PERSISTED_LANGUAGE_KEY = 'islamic-settings'"),
  'i18n reads the persisted app language from islamic-settings'
);
assert.ok(
  i18nCode.includes('languageResolved') && i18nCode.includes('persistedLanguage'),
  'i18n caches resolved boot language'
);
assert.ok(
  i18nCode.includes('applyRTL(isRtlLanguage(initialLanguage))') || i18nCode.includes("applyRTL(initialLanguage === 'ur')"),
  'RTL applied once at module load from boot language'
);
ok('locale boot: persisted language resolved before i18n init; RTL set at boot');

// (b) en->ur: persist FIRST, then reload boots in the new language
assert.ok(
  settingsCode.includes('setAppLanguage(nextLang)'),
  'setLanguage applies the new language immediately'
);
// The verifier passed as the 3rd argument of the queued language mutation must
// read back the raw persisted value and throw when the written language differs.
// Anchor on the contiguous region (same queued call), not two independent substrings.
const languageVerifier = settingsCode.match(
  /enqueueMutation\(\(latest\) => computeNextLanguageSettings\(latest, nextLang\), nextClean, \(raw\) => \{([\s\S]*?)\}\)/
);
assert.ok(languageVerifier, 'setLanguage must enqueue a mutation carrying a readback verifier');
assert.ok(
  languageVerifier[1].includes('parsed.language !== nextLang'),
  'setLanguage must verify the persisted language in the same queued call'
);
// The reload must happen AFTER the persist resolves so the reload boots in ur
// The executed SettingsScreen check runs after the helper declaration below.

// (c) ur->en: English content defaults restored (quran translation, tafsir, audio)
assert.ok(
  settingsCode.includes("if (CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)) {\n            await setQuranTranslationLanguage('en');"),
  'ur->en restores quran translation language to en'
);
assert.ok(
  settingsCode.includes("currentSnapshot.tafsirSourceId === 'api-ibn-kathir-urdu'") ||
    settingsCode.includes("if (settings.tafsirSourceId === 'api-ibn-kathir-urdu') {\n          nextTafsir = 'jalalayn';"),
  'ur->en restores tafsir source to jalalayn'
);
assert.ok(
  settingsCode.includes("if (savedAudioEdition === 'ur.everyayah-shamshad') {\n            await setAudioTranslationEdition(DEFAULT_AUDIO_TRANSLATION_EDITION_ID);"),
  'ur->en restores audio translation edition to default'
);
ok('ur->en: English content defaults restored (translation lang, tafsir, audio edition)');

// (d) repeated switches: both branches guarded by current-state checks (idempotent)
assert.ok(
  settingsCode.includes("if (nextLang === 'ur')") && settingsCode.includes('} else {'),
  'setLanguage has symmetric ur and en branches'
);
assert.ok(
  settingsCode.includes('CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)'),
  'language changes only switch Quran translation when it is in the canonical app-language set'
);
ok('repeated switches: symmetric ur/en branches with state guards');

// ── 2. 114 surah name coverage (SURAH_NAMES_UR + SURAH_NAME_TRANSLATIONS.ur) ──
const namesCode = fs.readFileSync('src/lib/surahNamesLocalized.ts', 'utf8');
const transCode = fs.readFileSync('src/lib/surahTranslationsData.ts', 'utf8');
const urBlocks = [...namesCode.matchAll(/'([^']+)',\s*\/\/\s*(\d+)/g)].map((m) => [+m[2], m[1]]);
const urNames = new Map(urBlocks);
assert.strictEqual(urNames.size, 114, `SURAH_NAMES_UR must have 114 entries, got ${urNames.size}`);
for (let i = 1; i <= 114; i++) {
  assert.ok(urNames.has(i), `SURAH_NAMES_UR missing surah ${i}`);
  const n = urNames.get(i);
  assert.ok(n.length > 0, `SURAH_NAMES_UR[${i}] empty`);
  assert.ok(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(n), `SURAH_NAMES_UR[${i}] not Arabic/Urdu script: "${n}"`);
}
// No duplicate names (each surah has a distinct localized name)
assert.strictEqual(new Set(urNames.values()).size, 114, 'SURAH_NAMES_UR has duplicate names');
// getLocalizedSurahName semantics: ur returns Urdu name, en returns english fallback, out-of-range falls back
assert.ok(namesCode.includes("if (lang === 'ur')"), 'getLocalizedSurahName branches on ur');
assert.ok(namesCode.includes('SURAH_NAMES_UR[idx]'), 'getLocalizedSurahName indexes SURAH_NAMES_UR');
assert.ok(namesCode.includes('return englishFallback;'), 'getLocalizedSurahName falls back to englishFallback');
ok('SURAH_NAMES_UR: 114 unique Arabic-script names, 1..114 complete, bounds-guarded helper');

// SURAH_NAME_TRANSLATIONS.ur (meaning translations used by QuranHome list) — 114 complete too
const urTransMatch = transCode.match(/ur: \{([\s\S]*?)\n  \},/);
assert.ok(urTransMatch, 'SURAH_NAME_TRANSLATIONS has ur block');
const transEntries = [...urTransMatch[1].matchAll(/(\d+):\s*'([^']*)'/g)].map((m) => [+m[1], m[2]]);
assert.strictEqual(transEntries.length, 114, `ur meaning translations must have 114 entries, got ${transEntries.length}`);
const transNums = transEntries.map(([n]) => n);
for (let i = 1; i <= 114; i++) assert.ok(transNums.includes(i), `ur meaning translation missing surah ${i}`);
assert.strictEqual(new Set(transNums).size, 114, 'ur meaning translation has duplicate surah numbers');
assert.ok(transEntries.every(([, v]) => v.length > 0 && !/[a-zA-Z]/.test(v)), 'ur meaning translations non-empty, no latin text');
ok('SURAH_NAME_TRANSLATIONS.ur: 114 complete, no dups, no latin content');

// ── 3. Metadata localization presence: language names (tafsir/translation language display) ──
// LANGUAGE_NAMES_UR covers all QURAN_LANGUAGE_EDITIONS languages so the Urdu UI
// can show a localized language name for every selectable translation language.
const quranLangsCode = fs.readFileSync('src/lib/quranLanguages.ts', 'utf8');
// Keys in LANGUAGE_NAMES_UR may be quoted ('Bosnian (Mehanović)') or bare (Arabic).
const langNamesBlock = namesCode.match(/LANGUAGE_NAMES_UR: Record<string, string> = \{([\s\S]*?)\n\};/);
assert.ok(langNamesBlock, 'LANGUAGE_NAMES_UR block found');
const langNames = [...langNamesBlock[1].matchAll(/(?:'([^']+)'|([^:,\n]+?))\s*:\s*'([^']+)'/g)].map((m) => [(m[1] || m[2]).trim().replace(/^'(.*)'$/, '$1'), m[3]]);
const urLangKeys = new Set(langNames.map(([k]) => k));
assert.strictEqual(urLangKeys.size, langNames.length, `LANGUAGE_NAMES_UR has duplicate keys: ${langNames.length} entries, ${urLangKeys.size} unique`);
assert.ok(langNames.length >= 40, `LANGUAGE_NAMES_UR should cover 40+ languages, got ${langNames.length}`);
for (const [enName] of langNames) {
  assert.ok(enName.length > 0, 'LANGUAGE_NAMES_UR has empty key');
}
// The edition languages in quranLanguages must ALL have an entry in LANGUAGE_NAMES_UR
const editionsBlockMatch = quranLangsCode.match(
  /(?:export const QURAN_LANGUAGE_EDITIONS:[\s\S]*?= \[([\s\S]*?)\n\];|const RAW_QURAN_LANGUAGE_EDITIONS:[\s\S]*?= \[([\s\S]*?)\n\];)/
);
const editionLangs = [
  ...(editionsBlockMatch ? (editionsBlockMatch[1] ?? editionsBlockMatch[2]) : quranLangsCode).matchAll(/language:\s*'([^']+)'/g),
].map((m) => m[1]);
const uniqueEditionLangs = [...new Set(editionLangs)];
const uncovered = uniqueEditionLangs.filter((l) => !urLangKeys.has(l));
assert.deepStrictEqual(uncovered, [], `Quran edition languages without Urdu name: ${uncovered.join(', ')}`);
ok(`LANGUAGE_NAMES_UR covers all ${uniqueEditionLangs.length} selectable translation languages`);

// getLocalizedLanguageName: ur lookup, en passthrough
assert.ok(namesCode.includes("if (lang === 'ur' && LANGUAGE_NAMES_UR[englishName])"), 'getLocalizedLanguageName branches on ur');
assert.ok(namesCode.includes('return englishName;'), 'getLocalizedLanguageName passthrough for en');
ok('getLocalizedLanguageName semantics verified (ur lookup, en passthrough)');

// ── 4. Header wordmark: اسلامک in Urdu, ISLAMIC in English, Amiri in RTL ──
const appCode = fs.readFileSync('App.tsx', 'utf8');
assert.ok(appCode.includes("{isRTL() ? 'اسلامک' : 'ISLAMIC'}"), 'AppHeader wordmark shows اسلامک when RTL, ISLAMIC otherwise');
assert.ok(
  appCode.includes("fontFamily: I18nManager.isRTL ? 'Amiri_700Bold' : 'SourceSans3_500Medium'"),
  'wordmark font is Amiri (Urdu script) in RTL, Source Sans in LTR'
);
assert.ok(appCode.includes("letterSpacing: I18nManager.isRTL ? 0 : 4"), 'wordmark letter-spacing disabled in RTL (Arabic script)');
// Amiri_700Bold must actually be loaded at boot (else the RTL wordmark renders in a fallback font)
const fontsCode = fs.readFileSync('src/lib/fonts.ts', 'utf8');
assert.ok(fontsCode.includes('Amiri_700Bold'), 'Amiri_700Bold loaded in useEditorialFonts');
ok('header wordmark: اسلامک in RTL w/ Amiri_700Bold, ISLAMIC in LTR w/ SourceSans3');

// ── 5. QuranHome localized names wiring (fetchSurahListForLanguage on non-en) ──
const quranHomeCode = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');
assert.ok(quranHomeCode.includes("const effectiveTranslatedNames = language === 'en' ? null : translatedNames;"), 'QuranHome derives empty translated names for en without a render-phase write');
assert.ok(quranHomeCode.includes('fetchSurahListForLanguage(language)'), 'QuranHome fetches translated names for non-en');
ok('QuranHome: per-language surah names wired to fetchSurahListForLanguage');

// ── 6. en/ur parity (fresh check) ──
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const ur = JSON.parse(fs.readFileSync('src/locales/ur.json', 'utf8'));
const enKeys = Object.keys(en);
const urKeys = Object.keys(ur);
assert.strictEqual(enKeys.length, urKeys.length, `en/ur key count mismatch: ${enKeys.length} vs ${urKeys.length}`);
for (const k of enKeys) {
  assert.ok(k in ur, `missing ur key: "${k}"`);
  assert.ok(typeof ur[k] === 'string' && ur[k].trim().length > 0, `empty ur value for "${k}"`);
}
for (const k of urKeys) assert.ok(k in en, `missing en key: "${k}"`);
ok(`en/ur parity: ${enKeys.length} keys both ways, all ur values non-empty`);

console.log('\nALL STATIC STAGE-2 QA TESTS PASSED SUCCESSFULLY!');

function compileSettingsForRuntime(sourcePath, modules) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((name) => {
    if (Object.prototype.hasOwnProperty.call(modules, name)) return modules[name];
    if (modules.__fallback) return modules.__fallback;
    throw new Error('Unexpected SettingsScreen import: ' + name);
  }, module, module.exports);
  return module.exports;
}

function createRuntimeGenericComponent(props = {}) {
  return props.children ?? null;
}

const runtimeGenericModule = new Proxy(
  { __esModule: true, default: createRuntimeGenericComponent },
  {
    get(target, property) {
      return property in target ? target[property] : createRuntimeGenericComponent;
    },
  },
);

function createRuntimeReact(setterEvents) {
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
      let value = typeof initial === 'function' ? initial() : initial;
      if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'language')) {
        value = { ...value, language: true };
      }
      return [value, (next) => setterEvents.push(typeof next === 'function' ? next(value) : next)];
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

function walkRuntimeTree(node, visit) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((child) => walkRuntimeTree(child, visit));
    return;
  }
  if (typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  walkRuntimeTree(node.props?.children, visit);
}

async function assertRealSettingsLanguagePersistence() {
  const events = [];
  const timers = [];
  const setterEvents = [];
  let resolveLanguage;
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
  };
  const themeValue = new Proxy({}, { get: () => '#123456' });
  const cardTokens = { borderWidth: 1, shadow: new Proxy({}, { get: () => ({}) }) };
  const quranFonts = new Proxy(
    {},
    { get: () => ({ regular: 'serif', bold: 'serif' }) },
  );
  const native = {
    Platform: { OS: 'android' },
    I18nManager: { isRTL: false },
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
  };
  const runtimeDetailScreen = Object.assign(createRuntimeGenericComponent, {
    ScrollView: createRuntimeGenericComponent,
  });
  const runtimeModules = {
    react: createRuntimeReact(setterEvents),
    'react-native': native,
    expo: { reloadAppAsync: async (reason) => events.push(['reload', reason]) },
    'react-native-safe-area-context': {
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    },
    '../lib/theme': {
      useTheme: () => ({ colors: themeValue, mode: 'paper' }),
    },
    '../theme/tokens': {
      useThemeTokens: () => ({ tokens: themeValue }),
      getTokens: () => themeValue,
      cardTokens,
      getBrandLogoSource: () => ({}),
    },
    '../lib/iconMap': {
      getForwardIcon: () => 'forward',
      iconSizes: { inlineLg: 20 },
    },
    '../lib/buttonTokens': { touchTargetTokens: { hitSlop8: 8 } },
    '../lib/i18n': {
      t: (key) => key,
      prepareNativeLayoutDirection: (language) => events.push(['prepare', language]),
      isRtlLanguage: (language) => ['ar', 'ur', 'ps'].includes(language),
    },
    './LegalScreen': runtimeGenericModule,
    './BackupRestoreScreen': runtimeGenericModule,
    '../components/layout/DetailScreen': {
      __esModule: true,
      DetailScreen: runtimeDetailScreen,
    },
    '../lib/settings': {
      // Keep this list in sync with src/lib/settings.tsx: the real SettingsScreen imports
      // persistLanguageChange directly (not only via the context), so a stub missing it
      // crashes the switch path and fails the suite for the wrong reason.
      persistLanguageChange: (settings, language) => {
        events.push(['persist-start', language]);
        return new Promise((resolve) => {
          resolveLanguage = () => {
            events.push(['persist-done', language]);
            resolve();
          };
        });
      },
      useSettings: () => ({
        settings: settingsState,
        setLanguage: (language) => {
          events.push(['persist-start', language]);
          return new Promise((resolve) => {
            resolveLanguage = () => {
              events.push(['persist-done', language]);
              resolve();
            };
          });
        },
        updateSettings() {},
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
      }),
      QURAN_FONT_SIZE_MIN: 12,
      QURAN_FONT_SIZE_MAX: 40,
      QURAN_FONT_SIZE_STEP: 1,
      QURAN_LINE_HEIGHT_MIN: 1,
      QURAN_LINE_HEIGHT_MAX: 3,
      QURAN_LINE_HEIGHT_STEP: 0.1,
    },
    '../components/ArabicText': { QURAN_FONT_FAMILIES: quranFonts },
    '../lib/haptics': { useHaptics: () => ({ haptic() {} }) },
    '../lib/prayerTimes': {
      CALC_METHODS: [{ id: 2, name: 'MWL', region: 'Global' }],
      fetchPrayerTimes: async () => ({}),
    },
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
    '../components/AdhanReciterModal': runtimeGenericModule,
    '../lib/quranLanguageState': { useQuranLanguage: () => ({ edition: 'en', flag: '🇬🇧' }) },
    '../lib/timeFormat': { formatTime: () => '09:00' },
    '../components/QuranLanguageModal': runtimeGenericModule,
    '../lib/quranLanguages': { getLocalizedTranslatorName: () => 'Translator' },
    '../lib/surahNamesLocalized': { getLocalizedLanguageName: (name) => name },
    '../lib/db': { clearWomenData: async () => {}, clearCycleHistory: async () => {} },
    '../components/WomenPinModal': runtimeGenericModule,
    '../components/GeometricPattern': runtimeGenericModule,
    '../lib/quranPreloader': {
      useQuranPreload: () => ({
        progress: { cached: 0, total: 114 },
        startPreload() {},
        pausePreload() {},
      }),
      verifyQuranPreloadCache: async () => ({}),
      repairQuranPreloadCache: async () => {},
    },
    '../../app.json': { __esModule: true, default: { expo: { version: '1.1.94' } } },
    '../lib/diagnostic': {
      isDiagnosticModeEnabled: () => false,
      DIAGNOSTIC_BUILD_ID: 'test',
      GatedDiagnosticModal: createRuntimeGenericComponent,
      usePressProbe: () => ({}),
      wrapControlPress: (_id, _kind, _screen, onPress) => onPress,
      recordControlState() {},
      noteControlPress() {},
      beginLanguageSwitch: () => ({
        markResolved() {},
        markRejected() {},
        markNoRestart() {},
        markReloadRequested() {},
      }),
      recordConsistencyCheck() {},
    },
    '../components/ui/AppText': runtimeGenericModule,
    '@expo/vector-icons': runtimeGenericModule,
    'expo-linear-gradient': runtimeGenericModule,
    '../components/Hairline': runtimeGenericModule,
    __fallback: runtimeGenericModule,
  };
  const settingsModule = compileSettingsForRuntime(
    path.resolve('src/screens/SettingsScreen.tsx'),
    runtimeModules,
  );
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false };
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };
  try {
    const tree = settingsModule.default({ onClose() {} });
    let languageRow;
    walkRuntimeTree(tree, (node) => {
      if (
        node.type === 'Pressable' &&
        node.props?.accessibilityRole === 'radio' &&
        String(node.props?.accessibilityLabel).includes('Urdu')
      ) {
        languageRow = node;
      }
    });
    assert.ok(languageRow, 'real SettingsScreen must render the Urdu language row');
    languageRow.props.onPress();
    assert.deepEqual(events, [['persist-start', 'ur']]);
    assert.ok(
      timers.some((timer) => timer.delay === 10_000 && !timer.cleared),
      'real SettingsScreen must arm the bounded language persistence timeout',
    );
    assert.equal(
      timers.some((timer) => timer.delay === 300),
      false,
      'real SettingsScreen must not schedule reload before persistence resolves',
    );
    resolveLanguage();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(events, [
      ['persist-start', 'ur'],
      ['persist-done', 'ur'],
      ['prepare', 'ur'],
    ]);
    const reloadTimer = timers.find((timer) => timer.delay === 300 && !timer.cleared);
    assert.ok(reloadTimer, 'real SettingsScreen must schedule reload after persistence and direction preparation');
    reloadTimer.callback();
    assert.deepEqual(events, [
      ['persist-start', 'ur'],
      ['persist-done', 'ur'],
      ['prepare', 'ur'],
      ['reload', 'App language changed'],
    ]);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
}

await assertRealSettingsLanguagePersistence();
console.log('  [ok] executed SettingsScreen persistence -> direction preparation -> reload contract');
console.log('ALL STAGE-2 QA TESTS PASSED SUCCESSFULLY!');
