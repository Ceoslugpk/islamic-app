import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
  new Function('module', 'exports', 'require', ...Object.keys(globals), output)(
    module,
    module.exports,
    localRequire,
    ...Object.values(globals),
  );
  return module.exports;
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    async getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    async setItem(key, value) {
      values.set(key, String(value));
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

function loadRealQuranLanguages() {
  return compile(path.join(ROOT, 'src/lib/quranLanguages.ts'), {
    './i18n': { getCurrentLanguage: () => 'en' },
    './surahNamesLocalized': {
      LANGUAGE_NAMES_UR: {},
      LANGUAGE_NAMES_AR: {},
      LANGUAGE_NAMES_HI: {},
      LANGUAGE_NAMES_ML: {},
      LANGUAGE_NAMES_SI: {},
    },
  });
}

const quranLanguages = loadRealQuranLanguages();

function loadRealQuranLanguageState(storage) {
  const asyncStorage = {
    __esModule: true,
    default: storage,
  };
  const react = {
    useMemo: (factory) => factory(),
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  };
  return compile(path.join(ROOT, 'src/lib/quranLanguageState.ts'), {
    react,
    '@react-native-async-storage/async-storage': asyncStorage,
    './quranLanguages': quranLanguages,
  }, {
    setTimeout,
    clearTimeout,
  });
}

function createQuranModule(fetchImpl) {
  const cache = new Map();
  const response = (json, ok = true, status = 200) => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Unavailable',
    async json() { return json; },
  });
  const module = compile(path.join(ROOT, 'src/lib/quran.ts'), {
    './db': {
      loadQuranCache: (key) => cache.get(key) ?? null,
      saveQuranCache: (key, value) => {
        cache.set(key, value);
        return true;
      },
    },
    './useConnectivity': { isAppOnline: () => true },
    './surahs114': {
      SURAHS_114: [{
        number: 1,
        name: 'الفاتحة',
        englishName: 'Al-Fatihah',
        numberOfAyahs: 7,
        revelationType: 'Meccan',
      }],
    },
    './surahTranslationsData': { SURAH_NAME_TRANSLATIONS: {} },
    './surahAyahCounts': { SURAH_AYAH_COUNTS: [7] },
    './tafsirApi': {
      fetchTafsirApi: async () => ({ text: '', author: '' }),
      getCanonicalTafsirSlug: (slug) => slug,
      TAFSIR_API_BASE: 'https://example.test/tafsir',
    },
    './surahPageData': {
      SURAH_START_PAGES: [1],
      TOTAL_MUSHAF_PAGES: 604,
      getSurahStartPage: () => 1,
      getPrimarySurahForPage: () => 1,
    },
    './quranScripts': {},
  }, {
    fetch: fetchImpl,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  return { module, cache, response };
}

function arabicEdition() {
  return {
    edition: { identifier: 'quran-uthmani', type: 'quran' },
    number: 1,
    name: 'الفاتحة',
    englishName: 'Al-Fatihah',
    englishNameTranslation: 'The Opening',
    numberOfAyahs: 1,
    ayahs: [{ number: 1, numberInSurah: 1, text: 'بِسْمِ اللَّهِ', page: 1, juz: 1 }],
  };
}

function translationEdition(identifier, text) {
  return {
    edition: { identifier, type: 'translation' },
    number: 1,
    name: 'الفاتحة',
    englishName: 'Al-Fatihah',
    englishNameTranslation: 'The Opening',
    numberOfAyahs: 1,
    ayahs: [{ number: 1, numberInSurah: 1, text }],
  };
}

function loadRealOnboardingTransaction() {
  const noopComponent = () => null;
  const genericModule = new Proxy({ __esModule: true, default: noopComponent }, {
    get(target, property) {
      return property in target ? target[property] : noopComponent;
    },
  });
  return compile(path.join(ROOT, 'src/screens/OnboardingScreen.tsx'), {
    react: {
      __esModule: true,
      default: {},
      useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
      useEffect: () => {},
      useRef: (value) => ({ current: value }),
      useMemo: (factory) => factory(),
      useCallback: (fn) => fn,
      createElement: () => null,
    },
    'react-native': {
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
      View: noopComponent,
      TouchableOpacity: noopComponent,
      ScrollView: noopComponent,
      Animated: { Value: function Value() {}, timing: () => ({ start() {} }) },
      Easing: { ease: () => {}, inOut: () => {}, bezier: () => {} },
      Platform: { OS: 'web' },
      AccessibilityInfo: { isReduceMotionEnabled: async () => false },
      useWindowDimensions: () => ({ width: 390, height: 844 }),
      Alert: { alert: () => {} },
      I18nManager: { isRTL: false },
    },
    '../components/ui/AppText': genericModule,
    'react-native-svg': genericModule,
    'expo-linear-gradient': genericModule,
    'expo': { reloadAppAsync: async () => {} },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    '@expo/vector-icons': genericModule,
    '../lib/theme': { useTheme: () => ({ colors: {}, mode: 'paper' }), getCardShadow: () => ({}), getPillShadow: () => ({}) },
    '../lib/settings': { useSettings: () => ({ setLanguage: async () => {}, settings: { language: 'en' }, setThemeMode: () => {} }) },
    '../theme/tokens': { getTokens: () => ({ goldGradient: ['#000', '#111'], onGold: '#fff', gold: '#000' }) },
    '../components/AnimatedBrandIcons': genericModule,
    '../lib/i18n': {
      resolveDeviceAppLanguage: () => 'en',
      prepareNativeLayoutDirection: () => {},
      isRtlLanguage: (lang) => lang === 'ur' || lang === 'ar' || lang === 'ps',
      useIsRTL: () => false,
      t: (value) => value,
    },
    'expo-localization': { getLocales: () => [{ languageCode: 'en' }] },
    '../lib/quranLanguages': quranLanguages,
    '../lib/quranAudio': {
      NON_ARABIC_AUDIO_EDITIONS: [],
      LANGUAGE_AUDIO_EDITIONS: {},
      DEFAULT_AUDIO_TRANSLATION_EDITION_ID: 'en.everyayah-walk',
      setAudioTranslationEdition: async () => {},
      getAudioTranslationLangName: () => 'English',
      getAudioTranslationBootstrapError: () => null,
    },
    '../lib/quranLanguageState': {
      setQuranTranslationLanguage: async () => {},
      setAutoLinkedQuranTranslationLanguage: async () => {},
      getQuranLanguageBootstrapError: () => null,
    },
    '../lib/onboardingState': { setOnboardingDone: async () => {} },
    '../lib/onboardingDemoData': {
      ONBOARDING_DEMO_LOCALES: { en: {} },
      ONBOARDING_LOCALES: { en: {} },
      DEMO_CYCLE_ORDER: ['en'],
    },
    '../components/LanguagePickerModal': { LanguagePickerModal: noopComponent },
  });
}

console.log('=== v1.1.95 Quran auto-link regression tests ===');

// The registry is the production source of truth for the recommended edition.
{
  const ur = quranLanguages.getEditionForLanguage('ur');
  assert.equal(ur?.editionIdentifier, 'ur.jalandhry');
  assert.equal(ur?.languageCode, 'ur');
  for (const appLanguage of ['en', 'ur', 'ar', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id', 'ps']) {
    assert.equal(
      quranLanguages.getRecommendedQuranLanguage(appLanguage),
      appLanguage,
      `${appLanguage} app language must resolve to the same registered Quran language`,
    );
  }
  assert.equal(quranLanguages.getRecommendedQuranLanguage('xx'), 'en');
  console.log('  ✓ non-English app language resolves to its intended Urdu edition');
}

// Explicit selections must survive automatic-link requests and a simulated reload.
{
  const storage = createStorage();
  const state = loadRealQuranLanguageState(storage);
  state._resetQuranLanguageStateForTesting(storage);
  await state.bootstrapQuranLanguage();
  await state.setQuranTranslationLanguage('fr');
  assert.equal(state.getQuranTranslationLanguage(), 'fr');
  assert.equal(state.getQuranTranslationSelectionMode(), 'explicit');
  await state.setAutoLinkedQuranTranslationLanguage('ur');
  assert.equal(state.getQuranTranslationLanguage(), 'fr', 'automatic link must not overwrite an explicit French edition');
  assert.equal(storage.values.get('quran-translation-language'), 'fr');

  state._resetQuranLanguageStateForTesting(storage);
  await state.bootstrapQuranLanguage();
  assert.equal(state.getQuranTranslationLanguage(), 'fr', 'explicit edition survives a simulated reload');
  assert.equal(state.getQuranTranslationSelectionMode(), 'explicit');

  state._resetQuranLanguageStateForTesting(createStorage());
  const concurrentStorage = createStorage();
  state._setQuranLanguageStorageForTesting(concurrentStorage);
  await state.bootstrapQuranLanguage();
  await Promise.all([
    state.setAutoLinkedQuranTranslationLanguage('ur'),
    state.setQuranTranslationLanguage('fr'),
  ]);
  assert.equal(state.getQuranTranslationLanguage(), 'fr', 'a concurrent explicit choice must win over auto-linking');
  assert.equal(state.getQuranTranslationSelectionMode(), 'explicit');
  console.log('  ✓ explicit edition is preserved and survives reload');
}

// Automatic linking persists the language code; the registry resolves the actual edition on display.
{
  const storage = createStorage();
  const state = loadRealQuranLanguageState(storage);
  state._resetQuranLanguageStateForTesting(storage);
  await state.bootstrapQuranLanguage();
  await state.setAutoLinkedQuranTranslationLanguage('ur');
  const selected = quranLanguages.getEditionForLanguage(state.getQuranTranslationLanguage());
  assert.equal(selected?.editionIdentifier, 'ur.jalandhry');
  assert.equal(storage.values.get('quran-translation-language'), 'ur');
  assert.equal(storage.values.get('quran-translation-language-mode'), 'auto');
  console.log('  ✓ automatic Urdu link persists and resolves to the Urdu edition for display');
}

// Onboarding must use the auto-link writer for an implicit selection, while an explicit
// picker choice uses the explicit writer. This executes the real transaction helper.
{
  const onboarding = loadRealOnboardingTransaction();
  const events = [];
  await onboarding.executeOnboardingSubmitTransaction({
    selectedAppLang: 'ur',
    selectedQuranLang: 'ur',
    selectedAudioId: 'en.everyayah-walk',
    selectedQuranLanguageExplicit: false,
    currentSettingsLanguage: 'en',
    onComplete: () => events.push('complete'),
    deps: {
      getQuranLanguageBootstrapError: () => null,
      getAudioTranslationBootstrapError: () => null,
      setLanguage: async () => events.push('app-language'),
      setQuranTranslationLanguage: async () => events.push('explicit-quran'),
      setAutoLinkedQuranTranslationLanguage: async (lang) => events.push(`auto-quran:${lang}`),
      setAudioTranslationEdition: async () => events.push('audio'),
      setOnboardingDone: async () => events.push('onboarding-done'),
      prepareNativeLayoutDirection: () => {},
      platform: 'web',
    },
  });
  assert.ok(events.includes('auto-quran:ur'));
  assert.ok(!events.includes('explicit-quran'));
  console.log('  ✓ onboarding implicit choice uses the automatic-link writer');
}

// A provider response for another edition must never be returned or cached under the requested edition.
{
  const requested = 'ur.jalandhry';
  const quran = createQuranModule(async (url) => {
    if (url.includes(`/surah/1/editions/quran-uthmani,${requested}`)) {
      return quran.response({ code: 200, data: [arabicEdition(), translationEdition('en.sahih', 'English text')] });
    }
    if (url.includes('/surah/1/editions/quran-uthmani,en.sahih')) {
      return quran.response({ code: 200, data: [arabicEdition(), translationEdition('en.sahih', 'English text')] });
    }
    throw new Error(`Unexpected URL: ${url}`);
  });
  await assert.rejects(
    quran.module.fetchSurah(1, true, requested, true),
    (error) => error?.code === 'QURAN_TRANSLATION_UNAVAILABLE' && error?.editionIdentifier === requested,
    'a response containing English instead of Urdu must be reported unavailable',
  );
  assert.equal(quran.cache.has(`surah:1:${requested}`), false);
  console.log('  ✓ wrong-edition surah response is rejected and not cached as Urdu');
}

// A matching non-English response is returned with the actual edition identity and text.
{
  const requested = 'ur.jalandhry';
  const quran = createQuranModule(async (url) => {
    assert.ok(url.includes(`/surah/1/editions/quran-uthmani,${requested}`));
    return quran.response({ code: 200, data: [arabicEdition(), translationEdition(requested, 'اردو متن')] });
  });
  const detail = await quran.module.fetchSurah(1, true, requested, true);
  assert.equal(detail.editionIdentifier, requested);
  assert.deepEqual(detail.ayahs.map((ayah) => ayah.translation), ['اردو متن']);
  console.log('  ✓ matching non-English response is the edition actually selected for display');
}

// The multi-language fallback path must also reject a missing/empty requested edition.
{
  const multiLang = compile(path.join(ROOT, 'src/lib/quranMultiLang.ts'), {
    './quran': {
      fetchWithTimeout: async () => ({
        ok: true,
        async json() {
          return {
            code: 200,
            data: [
              { edition: { identifier: 'en.sahih', language: 'en', name: 'Saheeh International' }, ayahs: [{ number: 1, numberInSurah: 1, text: 'English text' }] },
            ],
          };
        },
      }),
    },
    './useConnectivity': { isAppOnline: () => true },
    './surahAyahCounts': { SURAH_AYAH_COUNTS: [1] },
  });
  await assert.rejects(
    multiLang.fetchSurahTranslations(1, ['ur.jalandhry']),
    /Translation edition "ur\.jalandhry" is unavailable/,
    'multi-edition fallback must not return a missing Urdu edition as success',
  );
  console.log('  ✓ multi-edition fallback rejects a missing requested translation');
}

// Page loading has the same no-masquerade contract as surah loading: no English fallback.
{
  const requested = 'ur.jalandhry';
  const quran = createQuranModule(async (url) => {
    if (url.includes(`/page/1/editions/quran-uthmani,${requested}`)) {
      return quran.response({}, false, 503);
    }
    if (url.endsWith('/page/1/quran-uthmani')) {
      return quran.response({ code: 200, data: { ayahs: [arabicEdition().ayahs[0]], surahs: {} } });
    }
    if (url.endsWith(`/page/1/${requested}`)) return quran.response({}, false, 503);
    if (url.endsWith('/page/1/en.sahih')) {
      return quran.response({ code: 200, data: { ayahs: [{ ...arabicEdition().ayahs[0], text: 'English text' }], surahs: {} } });
    }
    throw new Error(`Unexpected URL: ${url}`);
  });
  await assert.rejects(
    quran.module.fetchMushafPage(1, true, requested, true),
    (error) => error?.code === 'QURAN_TRANSLATION_UNAVAILABLE' && error?.editionIdentifier === requested,
    'a page translation failure must not fall back to English',
  );
  assert.equal(quran.cache.has(`mushaf-page:1:${requested}`), false);
  console.log('  ✓ wrong/unavailable page edition is rejected and not cached');
}

console.log('ALL Quran auto-link regression tests passed');
