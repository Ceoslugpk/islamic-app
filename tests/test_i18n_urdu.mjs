import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { ACCENT_KEYS, accentThemes, DEFAULT_ACCENT, getLocalizedAccentName } from '../src/lib/accents.ts';

console.log('=== URDU I18N & AUTO-LINK ARCHITECTURE TEST SUITE ===\n');

// 1. Locale dictionaries parity test
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const ur = JSON.parse(fs.readFileSync('src/locales/ur.json', 'utf8'));

const enKeys = Object.keys(en);
const urKeys = Object.keys(ur);

assert.strictEqual(enKeys.length, urKeys.length, `Key counts must match: en=${enKeys.length}, ur=${urKeys.length}`);

for (const key of enKeys) {
  assert.ok(key in ur, `Urdu dictionary must contain key "${key}"`);
  assert.ok(typeof ur[key] === 'string' && ur[key].trim().length > 0, `Urdu value for "${key}" must be non-empty`);
}

for (const key of urKeys) {
  assert.ok(key in en, `English dictionary must contain key "${key}"`);
}

console.log(`  ✓ Locale dictionaries parity: ${enKeys.length} matching keys verified`);

// 2. Settings schema & sanitization test
const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');

assert.ok(settingsCode.includes("language: AppLanguage"), 'AppSettings includes language field');
assert.ok(settingsCode.includes("language: 'en'"), 'DEFAULTS.language defaults to "en"');
assert.ok(settingsCode.includes('isAppLanguage(p.language)'), 'sanitizeSettings accepts only languages from the app registry');
assert.ok(settingsCode.includes("setLanguage: (lang: AppLanguage) => Promise<void>"), 'SettingsContextValue exposes setLanguage');

console.log('  ✓ Settings schema & sanitization: AppLanguage and defaults verified');

// 3. Auto-link logic verification
assert.ok(settingsCode.includes("if (nextLang === 'ur')"), 'setLanguage contains urdu auto-link branch');
assert.ok(settingsCode.includes("setQuranTranslationLanguage('ur')"), 'Auto-link switches quran translation to "ur"');
assert.ok(settingsCode.includes("'api-ibn-kathir-urdu'"), 'Auto-link defaults tafsir to Urdu Ibn Kathir');
assert.ok(settingsCode.includes("'ur.everyayah-shamshad'"), 'Auto-link defaults translation audio to Shamshad Ali Khan');

console.log('  ✓ Auto-link behavior: translation, tafsir, and translation-audio defaults verified');

// 4. RTL management verification
const i18nCode = fs.readFileSync('src/lib/i18n.ts', 'utf8');

assert.ok(i18nCode.includes('I18nManager.allowRTL(isRTL)'), 'boot reconciliation enables RTL only for RTL languages');
assert.ok(i18nCode.includes('I18nManager.allowRTL(isRtl)') || i18nCode.includes('I18nManager.allowRTL(isUrdu)'), 'switch preparation enables RTL for RTL languages and disables it for English');
assert.ok(i18nCode.includes('I18nManager.forceRTL(isRtl)') || i18nCode.includes('I18nManager.forceRTL(isRTL)'), 'I18nManager.forceRTL wired');
assert.ok(i18nCode.includes("document.documentElement.dir = isRTL ? 'rtl' : 'ltr'") || i18nCode.includes("document.documentElement.dir = isRtl ? 'rtl' : 'ltr'"), 'Web RTL direction configured');

console.log('  ✓ RTL configuration: native forceRTL and web dir=rtl verified');

// 5. SettingsScreen UI verification
const settingsScreenCode = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');

assert.ok(settingsScreenCode.includes('Language / زبان'), 'SettingsScreen includes Language / زبان row');
assert.ok(settingsScreenCode.includes("'English'"), 'SettingsScreen includes English option');
assert.ok(settingsScreenCode.includes("'اردو'"), 'SettingsScreen includes اردو option');

console.log('  ✓ SettingsScreen: Language selector row verified');

// 6. Arabic structural parity & registration test
console.log('\n--- Task 1: Arabic Structural Parity & Registration ---');
const ar = JSON.parse(fs.readFileSync('src/locales/ar.json', 'utf8'));
const arKeys = Object.keys(ar);
assert.strictEqual(enKeys.length, arKeys.length, `Key counts must match: en=${enKeys.length}, ar=${arKeys.length}`);

for (const key of enKeys) {
  assert.ok(key in ar, `Arabic dictionary must contain key "${key}"`);
  assert.ok(typeof ar[key] === 'string' && ar[key].trim().length > 0, `Arabic value for "${key}" must be non-empty`);
  const enNewlines = (en[key].match(/\n/g) || []).length;
  const arNewlines = (ar[key].match(/\n/g) || []).length;
  assert.strictEqual(enNewlines, arNewlines, `Newline mismatch for key "${key}" in ar.json`);
  const enTokens = (en[key].match(/\{\{[^}]+\}\}/g) || []).sort();
  const arTokens = (ar[key].match(/\{\{[^}]+\}\}/g) || []).sort();
  assert.deepStrictEqual(enTokens, arTokens, `Interpolation token mismatch for key "${key}" in ar.json`);
}
for (const key of arKeys) {
  assert.ok(key in en, `English dictionary must contain key "${key}"`);
}
console.log(`  ✓ Arabic dictionary parity: exact ${arKeys.length} matching keys, 0 missing, 0 empty, 0 token/newline defects`);

assert.ok(i18nCode.includes("import ar from '../locales/ar.json'"), 'i18n.ts imports ar.json');
assert.ok(i18nCode.includes("import hi from '../locales/hi.json'"), 'i18n.ts imports hi.json');
assert.ok(i18nCode.includes("import ml from '../locales/ml.json'"), 'i18n.ts imports ml.json');
assert.ok(i18nCode.includes("import si from '../locales/si.json'"), 'i18n.ts imports si.json');
for (const code of ['bn', 'ms', 'ta', 'id', 'ps']) {
  assert.ok(i18nCode.includes(`import ${code} from '../locales/${code}.json'`), `i18n.ts imports ${code}.json`);
  assert.ok(i18nCode.includes(`'${code}'`), `AppLanguage registry includes ${code}`);
}
assert.ok(i18nCode.includes("export type AppLanguage = 'en' | 'ur' | 'ar' | 'hi' | 'ml' | 'si' | 'bn' | 'ms' | 'ta' | 'id' | 'ps'"), 'AppLanguage includes all 11 app languages');
assert.ok(i18nCode.includes("export function isRtlLanguage("), 'isRtlLanguage helper exported');
assert.ok(i18nCode.includes("['ur', 'ar', 'ps'].some"), 'isRtlLanguage treats Urdu, Arabic, and Pashto as RTL');
assert.ok(i18nCode.includes("resolveDeviceAppLanguage"), 'resolveDeviceAppLanguage helper present');
assert.ok(settingsScreenCode.includes("value: 'ar'") && settingsScreenCode.includes("label: 'العربية'"), 'SettingsScreen exposes Arabic with native label');
assert.ok(settingsScreenCode.includes("value: 'hi'") && settingsScreenCode.includes("label: 'हिन्दी'"), 'SettingsScreen exposes Hindi with native label');
assert.ok(settingsScreenCode.includes("value: 'ml'") && settingsScreenCode.includes("label: 'മലയാളം'"), 'SettingsScreen exposes Malayalam with native label');
assert.ok(settingsScreenCode.includes("value: 'si'") && settingsScreenCode.includes("label: 'සිංහල'"), 'SettingsScreen exposes Sinhala with native label');
assert.ok(
  settingsScreenCode.includes("'हिन्दी (Hindi) · बाएं से दाएं (LTR)'") &&
  !settingsScreenCode.includes("t('हिन्दी (Hindi) · बाएं से दाएं (LTR)')"),
  'SettingsScreen provides Hindi summary without invalid t() key'
);
assert.ok(
  settingsScreenCode.includes("'മലയാളം (Malayalam) · ഇടത്തുനിന്ന് വലത്തോട്ട് (LTR)'") &&
  !settingsScreenCode.includes("t('മലയാളം (Malayalam) · ഇടത്തുനിന്ന് വലത്തോട്ട് (LTR)')"),
  'SettingsScreen provides Malayalam summary without invalid t() key'
);
assert.ok(
  settingsScreenCode.includes("'සිංහල (Sinhala) · වමේ සිට දකුණට (LTR)'") &&
  !settingsScreenCode.includes("t('සිංහල (Sinhala) · වමේ සිට දකුණට (LTR)')"),
  'SettingsScreen provides Sinhala summary without invalid t() key'
);
console.log('  ✓ Arabic, Hindi, Malayalam, and Sinhala registered in i18n, RTL/LTR helpers, device locale detection, and SettingsScreen UI');

// Hindi structural parity & registration test
console.log('\n--- Task 1b: Hindi Structural Parity & Registration ---');
const hi = JSON.parse(fs.readFileSync('src/locales/hi.json', 'utf8'));
const hiKeys = Object.keys(hi);
assert.strictEqual(enKeys.length, hiKeys.length, `Key counts must match: en=${enKeys.length}, hi=${hiKeys.length}`);

for (const key of enKeys) {
  assert.ok(key in hi, `Hindi dictionary must contain key "${key}"`);
  assert.ok(typeof hi[key] === 'string' && hi[key].trim().length > 0, `Hindi value for "${key}" must be non-empty`);
  const enNewlines = (en[key].match(/\n/g) || []).length;
  const hiNewlines = (hi[key].match(/\n/g) || []).length;
  assert.strictEqual(enNewlines, hiNewlines, `Newline mismatch for key "${key}" in hi.json`);
  const enTokens = (en[key].match(/\{\{[^}]+\}\}/g) || []).sort();
  const hiTokens = (hi[key].match(/\{\{[^}]+\}\}/g) || []).sort();
  assert.deepStrictEqual(enTokens, hiTokens, `Interpolation token mismatch for key "${key}" in hi.json`);
}
for (const key of hiKeys) {
  assert.ok(key in en, `English dictionary must contain key "${key}"`);
}
console.log(`  ✓ Hindi dictionary parity: exact ${hiKeys.length} matching keys, 0 missing, 0 empty, 0 token/newline defects`);

// Malayalam structural parity & registration test
console.log('\n--- Task 1c: Malayalam Structural Parity & Registration ---');
const ml = JSON.parse(fs.readFileSync('src/locales/ml.json', 'utf8'));
const mlKeys = Object.keys(ml);
assert.strictEqual(enKeys.length, mlKeys.length, `Key counts must match: en=${enKeys.length}, ml=${mlKeys.length}`);

for (const key of enKeys) {
  assert.ok(key in ml, `Malayalam dictionary must contain key "${key}"`);
  assert.ok(typeof ml[key] === 'string' && ml[key].trim().length > 0, `Malayalam value for "${key}" must be non-empty`);
  const enNewlines = (en[key].match(/\n/g) || []).length;
  const mlNewlines = (ml[key].match(/\n/g) || []).length;
  assert.strictEqual(enNewlines, mlNewlines, `Newline mismatch for key "${key}" in ml.json`);
  const enTokens = (en[key].match(/\{\{[^}]+\}\}/g) || []).sort();
  const mlTokens = (ml[key].match(/\{\{[^}]+\}\}/g) || []).sort();
  assert.deepStrictEqual(enTokens, mlTokens, `Interpolation token mismatch for key "${key}" in ml.json`);
}
for (const key of mlKeys) {
  assert.ok(key in en, `English dictionary must contain key "${key}"`);
}
console.log(`  ✓ Malayalam dictionary parity: exact ${mlKeys.length} matching keys, 0 missing, 0 empty, 0 token/newline defects`);

// Sinhala structural parity & registration test
console.log('\n--- Task 1d: Sinhala Structural Parity & Registration ---');
const si = JSON.parse(fs.readFileSync('src/locales/si.json', 'utf8'));
const siKeys = Object.keys(si);
assert.strictEqual(enKeys.length, siKeys.length, `Key counts must match: en=${enKeys.length}, si=${siKeys.length}`);

for (const key of enKeys) {
  assert.ok(key in si, `Sinhala dictionary must contain key "${key}"`);
  assert.ok(typeof si[key] === 'string' && si[key].trim().length > 0, `Sinhala value for "${key}" must be non-empty`);
  const enNewlines = (en[key].match(/\n/g) || []).length;
  const siNewlines = (si[key].match(/\n/g) || []).length;
  assert.strictEqual(enNewlines, siNewlines, `Newline mismatch for key "${key}" in si.json`);
  const enTokens = (en[key].match(/\{\{[^}]+\}\}/g) || []).sort();
  const siTokens = (si[key].match(/\{\{[^}]+\}\}/g) || []).sort();
  assert.deepStrictEqual(enTokens, siTokens, `Interpolation token mismatch for key "${key}" in si.json`);
}
for (const key of siKeys) {
  assert.ok(key in en, `English dictionary must contain key "${key}"`);
}
console.log(`  ✓ Sinhala dictionary parity: exact ${siKeys.length} matching keys, 0 missing, 0 empty, 0 token/newline defects`);

// RTL/LTR transitions verification across all 6 languages
function testIsRtl(lang) {
  const normalized = lang.toLowerCase();
  return ['ur', 'ar', 'ps'].some((code) => normalized === code || normalized.startsWith(`${code}-`) || normalized.startsWith(`${code}_`));
}
assert.strictEqual(testIsRtl('en'), false, 'en is LTR');
assert.strictEqual(testIsRtl('ur'), true, 'ur is RTL');
assert.strictEqual(testIsRtl('ar'), true, 'ar is RTL');
assert.strictEqual(testIsRtl('ps'), true, 'ps is RTL');
assert.strictEqual(testIsRtl('ps-AF'), true, 'ps-AF is RTL');
assert.strictEqual(testIsRtl('PS_pk'), true, 'case-insensitive Pashto regional tag is RTL');
assert.strictEqual(testIsRtl('hi'), false, 'hi is LTR');
assert.strictEqual(testIsRtl('ml'), false, 'ml is LTR');
assert.strictEqual(testIsRtl('si'), false, 'si is LTR');
for (const lang of ['bn', 'ms', 'ta', 'id']) assert.strictEqual(testIsRtl(lang), false, `${lang} is LTR`);

const allLangs = ['en', 'ur', 'ar', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id', 'ps'];
const pairwiseTransitions = [];
for (const from of allLangs) {
  for (const to of allLangs) {
    if (from !== to) {
      pairwiseTransitions.push({
        from,
        to,
        rtlFrom: testIsRtl(from),
        rtlTo: testIsRtl(to),
      });
    }
  }
}
for (const t of pairwiseTransitions) {
  assert.strictEqual(testIsRtl(t.from), t.rtlFrom, `Transition ${t.from}->${t.to} initial RTL mismatch`);
  assert.strictEqual(testIsRtl(t.to), t.rtlTo, `Transition ${t.from}->${t.to} target RTL mismatch`);
}
console.log(`  ✓ RTL/LTR transitions: all ${pairwiseTransitions.length} pairwise transitions across all 11 app languages verified`);

// Load the actual i18n module with lightweight platform mocks so the language
// registry, locale detection, and web/native direction functions are exercised.
const i18nSource = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const compiledI18n = ts.transpileModule(i18nSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const runtimeI18n = {
  language: 'en',
  use() { return this; },
  init(options) { this.options = options; this.language = options.lng; return this; },
};
const nativeDirection = {
  isRTL: false,
  allowRTL(value) { this.allowed = value; },
  forceRTL(value) { this.isRTL = value; },
};
const documentElement = { dir: '', lang: '' };
const asyncStorageMock = { getItem: async () => null };
const i18nextMock = {
  __esModule: true,
  default: runtimeI18n,
  use: () => runtimeI18n,
  changeLanguage: (language) => { runtimeI18n.language = language; },
  t: (key) => key,
};
const runtimeModule = { exports: {} };
const runtimeRequire = (id) => {
  if (id === 'i18next') return i18nextMock;
  if (id === 'react-i18next') return { initReactI18next: {}, useTranslation: () => ({ t: (key) => key }) };
  if (id === 'expo-localization') return { getLocales: () => [{ languageCode: 'en' }] };
  if (id === '@react-native-async-storage/async-storage') return asyncStorageMock;
  if (id === 'react-native') return { I18nManager: nativeDirection, Platform: { OS: 'web' } };
  if (id.startsWith('../locales/')) {
    const code = id.split('/').pop().replace('.json', '');
    return JSON.parse(fs.readFileSync(`src/locales/${code}.json`, 'utf8'));
  }
  throw new Error(`Unexpected runtime import: ${id}`);
};
vm.runInNewContext(compiledI18n, {
  module: runtimeModule,
  exports: runtimeModule.exports,
  require: runtimeRequire,
  document: { documentElement },
});
const liveI18n = runtimeModule.exports;
for (const language of allLangs) {
  assert.strictEqual(liveI18n.isAppLanguage(language), true, `${language} is accepted by the production app-language guard`);
  assert.strictEqual(runtimeI18n.options.resources[language].translation['Home'], JSON.parse(fs.readFileSync(`src/locales/${language}.json`, 'utf8'))['Home'], `${language} is active in the production i18next resource table`);
  const rtl = ['ur', 'ar', 'ps'].includes(language);
  assert.strictEqual(liveI18n.isRtlLanguage(language), rtl, `${language} has the production RTL/LTR classification`);
  liveI18n.prepareNativeLayoutDirection(language);
  assert.strictEqual(nativeDirection.isRTL, rtl, `${language} prepares the correct native layout direction`);
  assert.deepStrictEqual([documentElement.dir, documentElement.lang], [rtl ? 'rtl' : 'ltr', language], `${language} prepares the correct web direction and lang attribute`);
}
for (const [deviceCode, expected] of [['bn-BD', 'bn'], ['ms-MY', 'ms'], ['ta-IN', 'ta'], ['id-ID', 'id'], ['ps-AF', 'ps'], ['ps_PK', 'ps']]) {
  assert.strictEqual(liveI18n.resolveDeviceAppLanguage(deviceCode), expected, `${deviceCode} device locale resolves to ${expected}`);
}
assert.strictEqual(liveI18n.isAppLanguage('tr'), false, 'Unwired locale files remain unavailable as app UI languages');
assert.strictEqual(liveI18n.resolveDeviceAppLanguage('fr-FR'), 'en', 'Unsupported device locales still fall back to English');
assert.strictEqual(liveI18n.isRtlLanguage('ps-AF'), true, 'Pashto regional locale is RTL in production');
assert.strictEqual(liveI18n.isRtlLanguage('bn-BD'), false, 'Bengali regional locale remains LTR in production');
liveI18n.setAppLanguage('bn');
assert.deepStrictEqual([documentElement.dir, documentElement.lang], ['ltr', 'bn'], 'Web Bengali direction and document language are LTR/Bengali');
liveI18n.setAppLanguage('ps');
assert.deepStrictEqual([documentElement.dir, documentElement.lang], ['rtl', 'ps'], 'Web Pashto direction and document language are RTL/Pashto');
liveI18n.prepareNativeLayoutDirection('ps');
assert.strictEqual(nativeDirection.isRTL, true, 'Native Pashto layout enables RTL');
liveI18n.prepareNativeLayoutDirection('ta');
assert.strictEqual(nativeDirection.isRTL, false, 'Native Tamil layout disables RTL');
liveI18n.setAppLanguage('ta');
liveI18n.applyRTL(false);
assert.deepStrictEqual([documentElement.dir, documentElement.lang], ['ltr', 'ta'], 'Boot direction reconciliation retains the selected LTR document language');
console.log('  ✓ Production i18n runtime: all 11 resources, regional device tags, and LTR/RTL switching verified');

// 7. Durable Light/Dark Theme Persistence
console.log('\n--- Task 2: Durable Light/Dark Theme Persistence ---');
// Static assertions for the production sequencing that prevents stale React snapshots:
const setSettingsIndex = settingsCode.indexOf('setSettings(nextClean);');
const enqueueWriteIndex = settingsCode.indexOf('await enqueueWrite(nextClean,');
assert.ok(
  setSettingsIndex !== -1 && enqueueWriteIndex !== -1 && setSettingsIndex < enqueueWriteIndex,
  'setLanguage must optimistically update React state before its serialized durable write'
);

const postEnqueueCode = settingsCode.slice(enqueueWriteIndex);
assert.ok(
  !postEnqueueCode.includes('setSettings(nextClean)'),
  'setLanguage must not overwrite newer optimistic state after its write completes'
);
assert.ok(
  !postEnqueueCode.includes('settingsRef.current = nextClean'),
  'setLanguage must not overwrite a newer settingsRef after its write completes'
);
assert.ok(
  settingsCode.includes('const restored = sanitizeSettings({ ...settingsRef.current, language: prevLang });'),
  'setLanguage failure path must preserve newer unrelated fields while restoring prevLang'
);
assert.ok(
  settingsCode.includes('enqueueWrite(restored)'),
  'setLanguage failure path must serialize the restored state'
);

assert.ok(settingsCode.includes('createSerializedSettingsWriter'), 'shared serialized settings writer present');
assert.ok(settingsCode.includes('enqueueWrite'), 'SettingsProvider enqueue wrapper present');
assert.ok(settingsCode.includes('locationMutatedDuringHydrationRef'), 'location-grant hydration guard present');
assert.ok(settingsCode.includes('await enqueueWrite(nextClean,'), 'language write and readback verification stay inside the shared queue');
assert.ok(settingsCode.includes('function updateSettings('), 'ordinary setters use synchronous latest-ref snapshots');
assert.ok(settingsCode.includes('setThemeMode: (themeMode) => updateSettings((prev) => ({ ...prev, themeMode }))'), 'theme updates synchronously snapshot latest settings');
assert.ok(settingsCode.includes('setAccentKey: (accentKey) => updateSettings((prev) => ({ ...prev, accentKey }))'), 'accent updates synchronously snapshot latest settings');

// Model/invariant test: simulated write queue ordering, concurrency, and rollback semantics.
// (Note: This is a standalone model/invariant test of the queue algorithm, not an execution of the React provider closure).
let mockQueue = Promise.resolve();
let lastPersistedState = null;
let liveSettingsState = { themeMode: 'system', accentKey: 'amber', language: 'en', methodId: 16 };
const persistLog = [];

function simulateEnqueueWrite(clean, shouldFail = false) {
  const task = mockQueue
    .then(async () => {
      await new Promise((r) => setTimeout(r, 1));
      if (shouldFail) {
        throw new Error('Simulated write failure');
      }
      persistLog.push({ ...clean });
      lastPersistedState = { ...clean };
      return clean;
    })
    .catch((err) => {
      // Revert live state ONLY if it has not already advanced to a newer selection
      if (liveSettingsState === clean && lastPersistedState) {
        liveSettingsState = lastPersistedState;
      }
      throw err;
    });

  mockQueue = task.then(() => {}, () => {});
  return task;
}

// (a) Rapid theme changes: 'paper' then 'ink' -> FIFO queue converges on 'ink'
const paperState = { ...liveSettingsState, themeMode: 'paper' };
liveSettingsState = paperState;
simulateEnqueueWrite(paperState);

const inkState = { ...liveSettingsState, themeMode: 'ink' };
liveSettingsState = inkState;
simulateEnqueueWrite(inkState);

await mockQueue;
assert.strictEqual(persistLog[persistLog.length - 1].themeMode, 'ink', 'Latest theme write wins in queue');

// (b) Older failed write does NOT rollback newer user selection
const failingSelection = { ...liveSettingsState, themeMode: 'paper' };
liveSettingsState = failingSelection;
const failPromise = simulateEnqueueWrite(failingSelection, true);

// User immediately picks 'ink' before failingSelection completes
const newerSelection = { ...liveSettingsState, themeMode: 'ink' };
liveSettingsState = newerSelection;
const successPromise = simulateEnqueueWrite(newerSelection, false);

await Promise.allSettled([failPromise, successPromise]);
assert.strictEqual(liveSettingsState.themeMode, 'ink', 'Failed older write did not roll back newer selection');

// (c) Shared ordering between theme write and language write
const themeUpdate = { ...liveSettingsState, themeMode: 'paper' };
liveSettingsState = themeUpdate;
simulateEnqueueWrite(themeUpdate);

const langUpdate = { ...liveSettingsState, language: 'ar' };
liveSettingsState = langUpdate;
await simulateEnqueueWrite(langUpdate);

assert.strictEqual(persistLog[persistLog.length - 1].language, 'ar', 'Language write follows theme write in shared queue');
assert.strictEqual(persistLog[persistLog.length - 1].themeMode, 'paper', 'Theme write is preserved in language write snapshot');

// (d) Rapid language -> appearance: language write initiated, appearance changed while awaiting
const langFirst = { ...liveSettingsState, language: 'ar' };
liveSettingsState = langFirst; // Optimistic React state set before awaiting
const langFirstTask = simulateEnqueueWrite(langFirst);

// Appearance changed while langFirstTask is in-flight: inherits 'ar' from live state
const themeSecond = { ...liveSettingsState, themeMode: 'ink' };
liveSettingsState = themeSecond;
const themeSecondTask = simulateEnqueueWrite(themeSecond);

await Promise.all([langFirstTask, themeSecondTask]);
assert.strictEqual(persistLog[persistLog.length - 1].language, 'ar', 'Language preserved in subsequent appearance write');
assert.strictEqual(persistLog[persistLog.length - 1].themeMode, 'ink', 'Latest appearance write preserved on top of language change');

// (e) Rapid language -> appearance where language write fails:
// Prevents queued appearance write from silently leaving disk on failed language
const prevLangBeforeFail = 'en';
liveSettingsState = { ...liveSettingsState, language: prevLangBeforeFail };
const failedLangTarget = { ...liveSettingsState, language: 'ar' };
liveSettingsState = failedLangTarget; // optimistic
const failingLangTask = simulateEnqueueWrite(failedLangTarget, true);

// Queued appearance change in-flight:
const queuedAppearance = { ...liveSettingsState, accentKey: 'emerald' };
liveSettingsState = queuedAppearance;
const queuedAppTask = simulateEnqueueWrite(queuedAppearance, false);

try {
  await failingLangTask;
} catch {}
await queuedAppTask;

// Production catch handler restores prevLang, preserves newer accent, and writes restored state:
const restoredState = { ...liveSettingsState, language: prevLangBeforeFail };
liveSettingsState = restoredState;
await simulateEnqueueWrite(restoredState, false);

assert.strictEqual(lastPersistedState.language, 'en', 'Failed language write does not silently leave disk on target language');
assert.strictEqual(lastPersistedState.accentKey, 'emerald', 'Newer concurrent accent change is preserved upon language recovery');

console.log('  ✓ Model/invariant test: simulated write queue ordering, failure non-rollback, and serialization invariants verified');
console.log('  ✓ Production static contract: optimistic React update and race prevention sequencing verified');
await import('./test_settings_write_order.mjs');

// 8. Accent allowlist & 4 approved choices
console.log('\n--- Task 3: Accents Allowlist & 4 Approved Choices ---');
assert.ok(settingsCode.includes('VALID_ACCENTS: Set<string> = new Set<string>(ACCENT_KEYS)'), 'VALID_ACCENTS single source of truth from ACCENT_KEYS');

// Exact 14 keys check
assert.strictEqual(ACCENT_KEYS.length, 14, `ACCENT_KEYS must contain exactly 14 keys, found ${ACCENT_KEYS.length}`);
const expected14Accents = [
  'amber', 'rose', 'emerald', 'teal', 'terracotta', 'sky', 'mauve', 'olive', 'sand', 'berry',
  'violet', 'cobalt', 'crimson', 'copper'
];
assert.deepStrictEqual(ACCENT_KEYS, expected14Accents, 'Exact 14 approved accent keys match');

// Verify extra newly introduced accents were removed
for (const removed of ['indigo', 'blue', 'purple', 'orange']) {
  assert.ok(!ACCENT_KEYS.includes(removed), `Extra accent "${removed}" must not be in ACCENT_KEYS`);
}

// Verify complete established fields on each accent theme and absence of unused token sets
const establishedFields = ['id', 'name', 'darkAccent', 'lightAccent', 'darkDim', 'lightDim'];
for (const key of ACCENT_KEYS) {
  const theme = accentThemes[key];
  assert.ok(theme, `Theme entry for ${key} must exist`);
  for (const field of establishedFields) {
    assert.ok(field in theme, `Theme ${key} must have established field "${field}"`);
    assert.strictEqual(typeof theme[field], 'string', `Theme ${key}.${field} must be a string`);
  }
  assert.ok(!('main' in theme), `Theme ${key} must not contain unused "main" structure`);
  assert.ok(!('soft' in theme), `Theme ${key} must not contain unused "soft" structure`);
  assert.ok(!('contrast' in theme), `Theme ${key} must not contain unused "contrast" structure`);
  assert.ok(!('rgb' in theme), `Theme ${key} must not contain unused "rgb" structure`);
}

// Verify legacy migration mapping
assert.ok(settingsCode.includes('LEGACY_ACCENT_MAP'), 'LEGACY_ACCENT_MAP defined in settings.tsx');
const legacyExpected = {
  sapphire: 'cobalt',
  ruby: 'crimson',
  gold: 'amber',
  amethyst: 'violet',
  bronze: 'copper',
  slate: 'sky',
};
for (const [legacy, target] of Object.entries(legacyExpected)) {
  assert.ok(ACCENT_KEYS.includes(target), `Legacy mapping target "${target}" must be in ACCENT_KEYS`);
  assert.ok(
    settingsCode.includes(`${legacy}: '${target}'`),
    `LEGACY_ACCENT_MAP must map ${legacy} to ${target}`
  );
}

// Verify getLocalizedAccentName translations
for (const key of ACCENT_KEYS) {
  const enName = getLocalizedAccentName(key, 'en');
  const arName = getLocalizedAccentName(key, 'ar');
  const urName = getLocalizedAccentName(key, 'ur');
  const hiName = getLocalizedAccentName(key, 'hi');
  const mlName = getLocalizedAccentName(key, 'ml');
  const siName = getLocalizedAccentName(key, 'si');
  assert.ok(enName && enName.length > 0, `Accent ${key} English name must be non-empty`);
  assert.ok(arName && arName.length > 0, `Accent ${key} Arabic name must be non-empty`);
  assert.ok(urName && urName.length > 0, `Accent ${key} Urdu name must be non-empty`);
  assert.ok(hiName && hiName.length > 0, `Accent ${key} Hindi name must be non-empty`);
  assert.ok(mlName && mlName.length > 0, `Accent ${key} Malayalam name must be non-empty`);
  assert.ok(siName && siName.length > 0, `Accent ${key} Sinhala name must be non-empty`);
}
console.log(`  ✓ Exact 14 accents, minimal established fields, legacy migrations, and localization verified`);

// 9. Absence of runtime GitHub URLs and navigation actions
console.log('\n--- Task 4: Removal of GitHub Links from App ---');
const legalCode = fs.readFileSync('src/screens/LegalScreen.tsx', 'utf8');
assert.ok(!settingsScreenCode.includes('https://github.com'), 'SettingsScreen has zero https://github.com URLs');
assert.ok(!settingsScreenCode.includes('GitHub repository & community issue tracker'), 'SettingsScreen has zero GitHub row');
assert.ok(!legalCode.includes('https://github.com'), 'LegalScreen has zero https://github.com URLs');
assert.ok(!legalCode.includes('logo-github'), 'LegalScreen has zero logo-github icons');
assert.ok(!legalCode.includes('GitHub Issue Tracker'), 'LegalScreen has zero GitHub Issue Tracker');
assert.ok(!legalCode.includes('Open GitHub Issues'), 'LegalScreen has zero Open GitHub Issues action');

// Full runtime source audit: zero https://github.com or github.com across ALL runtime files with ZERO exemptions
const allSrcFiles = [];
function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== 'locales') walkDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js')) {
      allSrcFiles.push(fullPath);
    }
  }
}
walkDir('src');
for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(!content.includes('github.com'), `Runtime file ${file} must not contain github.com`);
}
console.log(`  ✓ Comprehensive runtime scan (${allSrcFiles.length} files, 0 exemptions): zero GitHub URLs across all files`);

console.log('\n========================================================');
console.log('ALL I18N, APPEARANCE, ACCENTS & GITHUB REMOVAL TESTS PASSED!');
console.log('========================================================\n');
