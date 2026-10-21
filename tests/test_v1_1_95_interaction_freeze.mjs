import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function compile(sourcePath, requireMap, globals = {}) {
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
    throw new Error(`Unexpected import while executing ${sourcePath}: ${id}`);
  };
  const sandbox = {
    module,
    exports: module.exports,
    require: localRequire,
    console,
    ...globals,
  };
  vm.runInNewContext(output, sandbox, { filename: sourcePath });
  return module.exports;
}

function createReactStub() {
  const react = {
    createContext(defaultValue) {
      const context = { currentValue: defaultValue };
      context.Provider = ({ value, children }) => {
        context.currentValue = value;
        return children;
      };
      return context;
    },
    useContext(context) {
      return context.currentValue;
    },
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}];
    },
    useRef(initial) {
      return { current: initial };
    },
    useEffect() {},
    useCallback(callback) {
      return callback;
    },
    useMemo(factory) {
      return factory();
    },
    createElement(type, props, ...children) {
      const normalizedChildren = children.length <= 1 ? children[0] ?? null : children;
      if (typeof type === 'function') return type({ ...(props || {}), children: normalizedChildren });
      return { type, props: { ...(props || {}), children: normalizedChildren } };
    },
  };
  react.default = react;
  return react;
}

function createStorage({ delayMs = 0, hangFirstWrite = false } = {}) {
  const values = new Map();
  const writes = [];
  let writeCount = 0;
  let activeWrites = 0;
  let maxActiveWrites = 0;

  return {
    values,
    writes,
    get maxActiveWrites() {
      return maxActiveWrites;
    },
    async getItem(key) {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      writeCount += 1;
      activeWrites += 1;
      maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
      if (hangFirstWrite && writeCount === 1) {
        return new Promise(() => {});
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          values.set(key, value);
          writes.push(JSON.parse(value));
          activeWrites -= 1;
          resolve();
        }, delayMs);
      });
    },
  };
}

function loadSettings(storage, { setTimeoutImpl = setTimeout } = {}) {
  const react = createReactStub();
  const queue = compile(path.join(ROOT, 'src/lib/settingsWriteQueue.ts'), {});
  const i18nEvents = [];
  const settings = compile(path.join(ROOT, 'src/lib/settings.tsx'), {
    react,
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    './settingsWriteQueue': queue,
    './prayerTimes': {},
    './accents': { AccentKey: {}, ACCENT_KEYS: ['emerald', 'amber', 'rose'], DEFAULT_ACCENT: 'emerald' },
    './names99': {},
    './quranAudio': {
      setAudioTranslationEnabled() {},
      setAudioTranslationEdition: async () => {},
      DEFAULT_AUDIO_TRANSLATION_EDITION_ID: 'en.everyayah',
      AUDIO_TRANSLATION_EDITION_KEY: 'audio-edition',
    },
    './quranLanguageState': {
      getQuranTranslationLanguage: () => 'en',
      setQuranTranslationLanguage: async () => {},
    },
    './i18n': {
      AppLanguage: {},
      getBootLanguage: () => 'en',
      setAppLanguage: (language) => i18nEvents.push(language),
      isAppLanguage: (value) => ['en', 'ur', 'ar', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id', 'ps'].includes(value),
    },
    './audio': { setActiveAdhanReciterId() {} },
    './useLocation': { setCachedLocation() {} },
    './tafsirSources': { TAFSIR_SOURCES: [{ id: 'jalalayn' }, { id: 'api-ibn-kathir-ar' }, { id: 'api-ibn-kathir-urdu' }] },
  }, {
    Promise,
    Error,
    JSON,
    Set,
    Map,
    WeakMap,
    Object,
    Array,
    Math,
    Date,
    String,
    Boolean,
    Number,
    RegExp,
    parseInt,
    isNaN,
    setTimeout: setTimeoutImpl,
    clearTimeout,
  });
  return { settings, i18nEvents };
}

function loadTheme(settingsState, themeWrites) {
  const react = createReactStub();
  const settingsModule = {
    useSettings: () => ({
      settings: settingsState,
      setThemeMode: (next) => {
        themeWrites.push(next);
        settingsState.themeMode = next;
      },
    }),
  };
  const simpleTokens = { light: {}, dark: {} };
  const theme = compile(path.join(ROOT, 'src/lib/theme.tsx'), {
    react,
    'react-native': { Platform: { OS: 'web' }, useColorScheme: () => 'light' },
    './constants': {
      palette: { paper: { bg: '#fff' }, ink: { bg: '#000' } },
      HOME_THEME_TOKENS: { paper: { accent: '#a' }, ink: { gold: '#b', ringFill: '#c' } },
    },
    './themeMode': { nextThemeMode: (mode) => (mode === 'ink' ? 'paper' : 'ink') },
    './homeThemeTokens': {
      HOME_THEME_TOKENS: { paper: { accent: '#a', ringFill: '#c' }, ink: { gold: '#b', ringFill: '#c' } },
      CARD_SHADOW: { paper: {}, ink: {} }, HERO_CARD_SHADOW: { paper: {}, ink: {} },
      ACTIVE_PRAYER_CARD_SHADOW: { paper: {}, ink: {} }, PILL_SHADOW: { paper: {}, ink: {} },
    },
    './settings': settingsModule,
    '../theme/tokens': { textTokens: simpleTokens },
  }, {
    document: undefined,
  });
  return { theme, react };
}

function loadI18nAndRtl() {
  const runtime = { language: 'en', syncCache: {}, nativeCalls: [] };
  const i18nextInstance = {
    language: 'en',
    use() { return this; },
    init(options) { this.language = options.lng; runtime.language = this.language; return this; },
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
  const i18n = compile(path.join(ROOT, 'src/lib/i18n.ts'), {
    i18next,
    'react-i18next': { initReactI18next: {}, useTranslation: () => ({ i18n: i18nextInstance, t: (key) => key }) },
    'expo-localization': { getLocales: () => [{ languageCode: 'en' }] },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => null, setItem: async () => {} } },
    'react-native': { I18nManager: { isRTL: false }, Platform: { OS: 'web' } },
    './db': {
      loadQuranCache: (key) => runtime.syncCache[key] ?? null,
      saveQuranCache: (key, value) => { runtime.syncCache[key] = value; return true; },
    },
    ...Object.fromEntries(['en', 'ur', 'ar', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id', 'ps'].map((code) => [
      `../locales/${code}.json`, { __esModule: true, default: {} },
    ])),
  });
  const rtl = compile(path.join(ROOT, 'src/lib/rtl.ts'), {
    './i18n': i18n,
    './timelineRatio': { calculateTimelineRatio: () => 0 },
    'react-native': { Platform: { OS: 'web' } },
  });
  return { i18n, rtl };
}

console.log('=== v1.1.95 interaction-freeze production-path test ===');

// Real settings module: concurrent writes through one storage object must stay serialized.
{
  const storage = createStorage({ delayMs: 20 });
  const { settings } = loadSettings(storage);
  const base = settings.sanitizeSettings({ language: 'en', themeMode: 'paper', remindersEnabled: false });
  const first = settings.persistLanguageChange(base, 'ur', storage);
  const second = settings.persistLanguageChange(base, 'ar', storage);
  await Promise.all([first, second]);
  assert.equal(storage.maxActiveWrites, 1, 'language writes to one storage must not overlap');
  assert.equal(JSON.parse(await storage.getItem('islamic-settings')).language, 'ar');
}

// A language mutation queued behind a theme mutation must preserve that newer theme.
{
  const storage = createStorage({ delayMs: 5 });
  const { settings } = loadSettings(storage);
  const base = settings.sanitizeSettings({ language: 'en', themeMode: 'paper' });
  const themeWrite = settings.enqueueSettingsUpdate((prev) => ({ ...prev, themeMode: 'ink' }));
  const languageWrite = settings.persistLanguageChange(base, 'ur', storage);
  await Promise.all([themeWrite, languageWrite]);
  const persisted = JSON.parse(await storage.getItem('islamic-settings'));
  assert.equal(persisted.language, 'ur');
  assert.equal(persisted.themeMode, 'ink', 'language persistence must merge the latest queued theme');
}

// Real settings module: a permanently pending storage operation must not wedge the next write.
{
  const storage = createStorage({ hangFirstWrite: true });
  const originalSetTimeout = globalThis.setTimeout;
  const fastTimeout = (callback, delay, ...args) => originalSetTimeout(callback, delay >= 1000 ? 5 : delay, ...args);
  const { settings } = loadSettings(storage, { setTimeoutImpl: fastTimeout });
  const base = settings.sanitizeSettings({ language: 'en', themeMode: 'paper' });
  const first = settings.persistLanguageChange(base, 'ur', storage);
  const second = settings.persistLanguageChange(base, 'ar', storage);
  const boundedFirst = Promise.race([
    first,
    new Promise((_, reject) => originalSetTimeout(() => reject(new Error('test deadline exceeded')), 80)),
  ]);
  await assert.rejects(boundedFirst, /timed out/i, 'a hanging write must fail boundedly');
  await second;
  assert.equal(JSON.parse(await storage.getItem('islamic-settings')).language, 'ar');
}

// Real settings + real theme module: ten theme cycles and ten toggle writes settle on disk.
{
  const storage = createStorage({ delayMs: 1 });
  const { settings } = loadSettings(storage);
  const themeWrites = [];
  const settingsState = { themeMode: 'paper' };
  const { theme } = loadTheme(settingsState, themeWrites);
  const pendingThemeWrites = [];

  for (let i = 0; i < 10; i += 1) {
    theme.ThemeProvider({ children: null });
    const context = theme.useTheme();
    context.toggle();
    pendingThemeWrites.push(settings.enqueueSettingsUpdate((prev) => ({
      ...prev,
      themeMode: settingsState.themeMode,
      remindersEnabled: !prev.remindersEnabled,
    })));
    theme.ThemeProvider({ children: null });
    assert.equal(theme.useTheme().mode, settingsState.themeMode === 'ink' ? 'ink' : 'paper');
  }
  await Promise.all(pendingThemeWrites);
  const persisted = JSON.parse(await storage.getItem('islamic-settings'));
  assert.equal(themeWrites.length, 10);
  assert.equal(persisted.themeMode, settingsState.themeMode);
  assert.equal(persisted.remindersEnabled, false, 'ten toggle cycles must leave the real persisted toggle stable');
}

// Real settings + real i18n + real rtl consumer: re-entrant language cycles still change translation state.
{
  const storage = createStorage({ delayMs: 1 });
  const { settings } = loadSettings(storage);
  const { i18n, rtl } = loadI18nAndRtl();
  let current = settings.sanitizeSettings({ language: 'en', themeMode: 'paper' });
  const languages = ['ur', 'ar', 'en', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id'];

  for (let i = 0; i < languages.length; i += 1) {
    const next = languages[i];
    const pendingLanguage = settings.persistLanguageChange(current, next, storage);
    const pendingToggle = settings.enqueueSettingsUpdate((prev) => ({
      ...prev,
      remindersEnabled: !prev.remindersEnabled,
    }));
    const [persistedLanguage] = await Promise.all([pendingLanguage, pendingToggle]);
    current = persistedLanguage;
    i18n.setAppLanguage(next);
    assert.equal(i18n.getCurrentLanguage(), next);
    assert.equal(rtl.isRTL(), ['ur', 'ar', 'ps'].includes(next));
  }
  const final = JSON.parse(await storage.getItem('islamic-settings'));
  assert.equal(final.language, current.language);
  assert.equal(i18n.getCurrentLanguage(), 'id');
}

console.log('PASS: repeated real settings/theme/language cycles remain serial, bounded, and reactive');
