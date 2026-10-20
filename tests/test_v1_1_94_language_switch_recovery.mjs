/**
 * v1.1.94 language-switch round-two regression.
 *
 * This suite transpiles and executes the real i18n, rtl, and onboarding
 * production modules. It deliberately does not mirror their implementation
 * in the assertions. SettingsScreen/App are owned by another writer; their
 * required patch is recorded in the hand-off report.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'language-round2-'));

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

const genericModule = new Proxy({ __esModule: true, default: () => ({}) }, {
  get(target, property) {
    if (property in target) return target[property];
    return () => {};
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

function loadRealI18n({ deviceLanguage, persistedLanguage, syncLanguage, platform = 'android', nativeDirection = false }) {
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
    Platform: { OS: platform },
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
  const reactI18n = {
    initReactI18next: {},
    useTranslation: () => ({ i18n: i18next.instance, t: (key) => key }),
  };
  const localization = { getLocales: () => [{ languageCode: deviceLanguage }] };
  const module = compile(path.join(ROOT, 'src/lib/i18n.ts'), {
    i18next,
    'react-i18next': reactI18n,
    'expo-localization': localization,
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
  return { module, runtime, storage, reactNative };
}

function loadRealRtl(i18n, platform = 'web') {
  return compile(path.join(ROOT, 'src/lib/rtl.ts'), {
    './i18n': i18n,
    './timelineRatio': { calculateTimelineRatio: () => 0 },
    'react-native': { I18nManager: { isRTL: false }, Platform: { OS: platform } },
  });
}

async function tick() {
  await new Promise((resolve) => setImmediate(resolve));
}

console.log('=== v1.1.94 language-switch round-two ===');

/* RED/GREEN target: boot direction and UI language agree on the real module. */
console.log('1. Real cold boot reads persisted language and applies direction once');
{
  const boot = loadRealI18n({ deviceLanguage: 'en', persistedLanguage: 'ur', syncLanguage: null });
  assert.equal(boot.module.getBootLanguage(), 'en', 'current broken implementation starts from device language before async storage');
  assert.deepEqual(boot.runtime.nativeEvents, [], 'without a synchronous mirror, native direction must wait for the boot resolver');

  const resolved = await boot.module.resolvePersistedLanguage(true);
  boot.module.setAppLanguage(resolved);
  boot.module.applyRTL(boot.module.isRtlLanguage(resolved));

  assert.equal(resolved, 'ur');
  assert.equal(boot.module.getCurrentLanguage(), 'ur');
  assert.deepEqual(boot.runtime.nativeEvents, [
    ['allowRTL', true],
    ['forceRTL', true],
  ], 'the boot handshake must write native RTL exactly once after the real persisted language is known');
  assert.equal(boot.runtime.syncCache['app-language'].language, 'ur');
  console.log('   PASS: real AsyncStorage boot resolver + real i18n module converge to Urdu/RTL');
}

/* RED/GREEN target: prepareNativeLayoutDirection must not be a post-mount writer. */
console.log('2. Runtime preparation stages the next boot but never writes native direction');
{
  const boot = loadRealI18n({ deviceLanguage: 'en', persistedLanguage: 'en', syncLanguage: 'en' });
  assert.deepEqual(boot.runtime.nativeEvents, [
    ['allowRTL', false],
    ['forceRTL', false],
  ]);
  boot.module.prepareNativeLayoutDirection('ur');
  boot.module.setAppLanguage('ur');
  assert.deepEqual(boot.runtime.nativeEvents, [
    ['allowRTL', false],
    ['forceRTL', false],
  ], 'prepareNativeLayoutDirection must not call allowRTL/forceRTL after module boot');
  assert.equal(boot.runtime.syncCache['app-language'].language, 'ur');

  // Same-direction transitions still refresh the mirror. This is the repair
  // path used when a previous boot/reload left native direction stale.
  boot.module.prepareNativeLayoutDirection('ar');
  boot.module.setAppLanguage('ar');
  assert.equal(boot.runtime.syncCache['app-language'].language, 'ar');

  const nextProcess = loadRealI18n({ deviceLanguage: 'en', persistedLanguage: 'ar', syncLanguage: 'ar' });
  assert.equal(nextProcess.module.getBootLanguage(), 'ar');
  assert.deepEqual(nextProcess.runtime.nativeEvents, [
    ['allowRTL', true],
    ['forceRTL', true],
  ]);
  console.log('   PASS: only the next process writes the staged direction, once, before UI boot');
}

/* RED/GREEN target: rollback stages old language and direction coherently. */
console.log('3. Reload failure rollback restores language and next-boot direction');
{
  const boot = loadRealI18n({ deviceLanguage: 'en', persistedLanguage: 'en', syncLanguage: 'en' });
  boot.module.prepareNativeLayoutDirection('ur');
  boot.module.setAppLanguage('ur');
  // This is the production rollback order required of SettingsScreen: restore
  // durable language first, then stage the old direction for a future boot.
  boot.module.setAppLanguage('en');
  boot.module.prepareNativeLayoutDirection('en');

  assert.equal(boot.module.getCurrentLanguage(), 'en');
  assert.equal(boot.runtime.syncCache['app-language'].language, 'en');
  assert.deepEqual(boot.runtime.nativeEvents, [
    ['allowRTL', false],
    ['forceRTL', false],
  ], 'rollback must never issue a second native direction write in the current process');

  const nextProcess = loadRealI18n({ deviceLanguage: 'en', persistedLanguage: 'en', syncLanguage: 'en' });
  assert.equal(nextProcess.module.getBootLanguage(), 'en');
  assert.deepEqual(nextProcess.runtime.nativeEvents, [
    ['allowRTL', false],
    ['forceRTL', false],
  ]);
  console.log('   PASS: rollback leaves active language, stored mirror, and next boot direction aligned');
}

/* RED/GREEN target: dynamic direction consumer is real rtl.ts, not copied logic. */
console.log('4. Real rtl.ts consumer follows live language');
{
  const boot = loadRealI18n({ deviceLanguage: 'en', persistedLanguage: 'en', syncLanguage: 'en', platform: 'web' });
  const rtl = loadRealRtl(boot.module, 'web');
  assert.equal(rtl.isRTL(), false);
  boot.module.setAppLanguage('ur');
  assert.equal(rtl.isRTL(), true);
  boot.module.setAppLanguage('en');
  assert.equal(rtl.isRTL(), false);
  console.log('   PASS: rtl.ts executes the live i18n value instead of a frozen import-time constant');
}

/* RED/GREEN target: real Onboarding transaction uses the real preparation helper. */
console.log('5. Real onboarding transaction rolls back a resolved-without-restart reload');
{
  const boot = loadRealI18n({ deviceLanguage: 'en', persistedLanguage: 'en', syncLanguage: 'en' });
  const timers = [];
  const languageCalls = [];
  let completed = 0;
  const onboarding = compile(path.join(ROOT, 'src/screens/OnboardingScreen.tsx'), {
    react: {
      __esModule: true,
      default: {},
      useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
      useEffect: () => {},
      useRef: (value) => ({ current: value }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      createElement: () => ({}),
    },
    'react-native': {
      Platform: { OS: 'android' },
      I18nManager: { isRTL: false },
      Alert: { alert: () => {} },
      StyleSheet: { create: (styles) => styles },
    },
    '../lib/i18n': boot.module,
    'expo': { reloadAppAsync: async () => {} },
    __fallback: genericModule,
  });
  const result = onboarding.executeOnboardingSubmitTransaction({
    selectedAppLang: 'ur',
    selectedQuranLang: 'ur',
    selectedAudioId: 'ur.everyayah-shamshad',
    currentSettingsLanguage: 'en',
    onComplete: () => { completed += 1; },
    setIsSubmitting: () => {},
    deps: {
      getQuranLanguageBootstrapError: () => null,
      getAudioTranslationBootstrapError: () => null,
      setLanguage: async (lang) => {
        languageCalls.push(lang);
        boot.module.setAppLanguage(lang);
      },
      setQuranTranslationLanguage: async () => {},
      setAudioTranslationEdition: async () => {},
      setOnboardingDone: async () => {},
      prepareNativeLayoutDirection: boot.module.prepareNativeLayoutDirection,
      appReloader: async () => {},
      isRtlLanguage: boot.module.isRtlLanguage,
      isRTL: false,
      platform: 'android',
      scheduleReload: (action) => { timers.push(action); },
      showAlert: () => {},
    },
  });
  await result;
  assert.equal(timers.length, 1);
  timers[0]();
  await tick();
  // Execute the bounded fallback timer installed by the production transaction.
  await new Promise((resolve) => setTimeout(resolve, 1550));
  assert.deepEqual(languageCalls, ['ur', 'en']);
  assert.equal(boot.module.getCurrentLanguage(), 'en');
  assert.equal(boot.runtime.syncCache['app-language'].language, 'en');
  assert.equal(completed, 1);
  assert.deepEqual(boot.runtime.nativeEvents, [
    ['allowRTL', false],
    ['forceRTL', false],
  ]);
  console.log('   PASS: real onboarding path restores the prior language after reload resolves without restart');
}

console.log('=== ALL ROUND-TWO FOCUSED CHECKS PASSED ===');
