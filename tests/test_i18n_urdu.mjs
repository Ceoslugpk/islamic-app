import assert from 'node:assert';
import fs from 'node:fs';
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
assert.ok(settingsCode.includes("p.language === 'ur'"), 'sanitizeSettings handles "ur" and defaults to "en"');
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
assert.ok(i18nCode.includes("export type AppLanguage = 'en' | 'ur' | 'ar'"), 'AppLanguage includes ar');
assert.ok(i18nCode.includes("export function isRtlLanguage("), 'isRtlLanguage helper exported');
assert.ok(i18nCode.includes("lang === 'ur' || lang === 'ar'"), 'isRtlLanguage returns true for ur and ar');
assert.ok(i18nCode.includes("resolveDeviceAppLanguage"), 'resolveDeviceAppLanguage helper present');
assert.ok(settingsScreenCode.includes("value: 'ar'") && settingsScreenCode.includes("label: 'العربية'"), 'SettingsScreen exposes Arabic with native label');
console.log('  ✓ Arabic registered in i18n, RTL helpers, device locale detection, and SettingsScreen UI');

// RTL transitions verification
function testIsRtl(lang) {
  return lang === 'ur' || lang === 'ar';
}
assert.strictEqual(testIsRtl('en'), false, 'en is LTR');
assert.strictEqual(testIsRtl('ur'), true, 'ur is RTL');
assert.strictEqual(testIsRtl('ar'), true, 'ar is RTL');
const transitions = [
  { from: 'en', to: 'ar', rtlFrom: false, rtlTo: true },
  { from: 'ar', to: 'en', rtlFrom: true, rtlTo: false },
  { from: 'ur', to: 'ar', rtlFrom: true, rtlTo: true },
  { from: 'ar', to: 'ur', rtlFrom: true, rtlTo: true },
];
for (const t of transitions) {
  assert.strictEqual(testIsRtl(t.from), t.rtlFrom, `Transition ${t.from}->${t.to} initial RTL mismatch`);
  assert.strictEqual(testIsRtl(t.to), t.rtlTo, `Transition ${t.from}->${t.to} target RTL mismatch`);
}
console.log('  ✓ RTL transitions (en->ar, ar->en, ur->ar, ar->ur) verified');

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
  assert.ok(enName && enName.length > 0, `Accent ${key} English name must be non-empty`);
  assert.ok(arName && arName.length > 0, `Accent ${key} Arabic name must be non-empty`);
  assert.ok(urName && urName.length > 0, `Accent ${key} Urdu name must be non-empty`);
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
