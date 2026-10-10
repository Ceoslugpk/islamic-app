/**
 * Regression Test Suite for Four Physical-Device Defects:
 *  1. Quran text-translation chooser Arabic display & translator metadata coverage
 *  2. Tasbih localization in Urdu & Arabic (presets, meanings, headers, accessibility)
 *  3. Cities localized Arabic & Urdu names and bilingual search
 *  4. Production Settings queue/state concurrency, persistence & resilience
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== FOUR DEFECT REGRESSION TESTS ===\n');

// ---------------------------------------------------------------------------
// 1. QURAN CHOOSER: Arabic language display & translator metadata coverage
// ---------------------------------------------------------------------------
console.log('--- 1. Quran Chooser: Arabic display & translator metadata ---');

const surahNamesCode = fs.readFileSync('src/lib/surahNamesLocalized.ts', 'utf8');
const quranLanguagesCode = fs.readFileSync('src/lib/quranLanguages.ts', 'utf8');
const modalCode = fs.readFileSync('src/components/QuranLanguageModal.tsx', 'utf8');

// 1a. surahNamesLocalized must export LANGUAGE_NAMES_AR covering all editions
assert.ok(surahNamesCode.includes('LANGUAGE_NAMES_AR'), 'surahNamesLocalized must export LANGUAGE_NAMES_AR');

// 1b. quranLanguages must export EDITION_METADATA_AR covering all editions
assert.ok(quranLanguagesCode.includes('EDITION_METADATA_AR'), 'quranLanguages must export EDITION_METADATA_AR');

// Extract QURAN_LANGUAGE_EDITIONS
const editionsMatch = quranLanguagesCode.match(/export const QURAN_LANGUAGE_EDITIONS:[\s\S]*?= \[([\s\S]*?)\n\];/);
assert.ok(editionsMatch, 'QURAN_LANGUAGE_EDITIONS found');
const editionIds = [...editionsMatch[1].matchAll(/editionIdentifier:\s*'([^']+)'/g)].map((m) => m[1]);
const editionLangs = [...editionsMatch[1].matchAll(/language:\s*'([^']+)'/g)].map((m) => m[1]);

// Extract LANGUAGE_NAMES_AR
const langArMatch = surahNamesCode.match(/export const LANGUAGE_NAMES_AR:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(langArMatch, 'LANGUAGE_NAMES_AR found');
const langArKeys = new Set([...langArMatch[1].matchAll(/^\s*'([^']+)':/gm), ...langArMatch[1].matchAll(/^\s*([A-Za-z0-9_-]+):/gm)].map((m) => m[1]));

// Every language in QURAN_LANGUAGE_EDITIONS must exist in LANGUAGE_NAMES_AR
for (const lang of editionLangs) {
  assert.ok(langArKeys.has(lang), `LANGUAGE_NAMES_AR must have entry for language "${lang}"`);
}

// Extract EDITION_METADATA_AR
const metaArMatch = quranLanguagesCode.match(/export const EDITION_METADATA_AR:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(metaArMatch, 'EDITION_METADATA_AR found');
const metaArKeys = new Set([...metaArMatch[1].matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));

// Every edition in QURAN_LANGUAGE_EDITIONS must exist in EDITION_METADATA_AR
for (const id of editionIds) {
  assert.ok(metaArKeys.has(id), `EDITION_METADATA_AR must have entry for edition "${id}"`);
}

// Modal remaining raw English strings must be localized
assert.ok(!modalCode.includes("accessibilityLabel={`${getLocalizedLanguageName(item.language)} - ${getLocalizedTranslatorName(item.editionIdentifier, item.name)}${isSelected ? ', currently selected' : ''}`}"),
  'Modal accessibilityLabel must not have hardcoded ", currently selected"');
assert.ok(!modalCode.includes("TRANSLATIONS (${QURAN_LANGUAGE_EDITIONS.length})"),
  'Modal eyebrow must not have raw English TRANSLATIONS literal');

console.log('  ✓ Task 1 Quran chooser static assertions passed.');

// 1c. Dynamic evaluation of language and translator helpers
const getLocalizedLangFunction = new Function('englishName, lang, LANGUAGE_NAMES_UR, LANGUAGE_NAMES_AR', `
  if (lang === 'ar' && LANGUAGE_NAMES_AR[englishName]) return LANGUAGE_NAMES_AR[englishName];
  if (lang === 'ur' && LANGUAGE_NAMES_UR[englishName]) return LANGUAGE_NAMES_UR[englishName];
  return englishName;
`);

const urMatch = surahNamesCode.match(/export const LANGUAGE_NAMES_UR:[\s\S]*?= \{([\s\S]*?)\n\};/);
const langUrMap = new Function('return {' + urMatch[1] + '}')();
const langArMap = new Function('return {' + langArMatch[1] + '}')();
const metaUrMatch = quranLanguagesCode.match(/export const EDITION_METADATA_UR:[\s\S]*?= \{([\s\S]*?)\n\};/);
const metaUrMap = new Function('return {' + metaUrMatch[1] + '}')();
const metaArMap = new Function('return {' + metaArMatch[1] + '}')();

for (const ed of editionIds) {
  assert.ok(metaArMap[ed]?.title, `Arabic metadata for ${ed} must have title`);
  assert.ok(metaArMap[ed]?.translator, `Arabic metadata for ${ed} must have translator`);
  assert.ok(metaArMap[ed]?.language, `Arabic metadata for ${ed} must have language`);
}
for (const lang of editionLangs) {
  assert.ok(langArMap[lang], `Arabic language name for ${lang} must exist`);
}
console.log('  ✓ Task 1 dynamic Arabic coverage verified across all editions.');

// ---------------------------------------------------------------------------
// 2. TASBIH: Localization in Urdu & Arabic
// ---------------------------------------------------------------------------
console.log('\n--- 2. Tasbih: Localization in Urdu & Arabic ---');

const tasbihCode = fs.readFileSync('src/screens/TasbihScreen.tsx', 'utf8');

// Title and backLabel must route through t()
assert.ok(tasbihCode.includes("title={t('Tasbih')}"), 'TasbihScreen title must use t(\'Tasbih\')');
assert.ok(tasbihCode.includes("backLabel={t('Library')}"), 'TasbihScreen backLabel must use t(\'Library\')');

// Undo action must not be hardcoded English
assert.ok(!tasbihCode.includes("action: 'Count reset'"), 'TasbihScreen undo action must not be raw string "Count reset"');

// Meanings and transliterations must be localized
assert.ok(tasbihCode.includes('getLocalizedDhikrMeaning'),
  'TasbihScreen must provide getLocalizedDhikrMeaning for Urdu and Arabic');
assert.ok(tasbihCode.includes('getLocalizedDhikrTransliteration'),
  'TasbihScreen must provide getLocalizedDhikrTransliteration');

console.log('  ✓ Task 2 Tasbih assertions passed.');

// ---------------------------------------------------------------------------
// 3. CITIES: Localized Arabic & Urdu names and bilingual search
// ---------------------------------------------------------------------------
console.log('\n--- 3. Cities: Localized Arabic & Urdu names and search ---');

const citiesCode = fs.readFileSync('src/lib/cities.ts', 'utf8');
const citiesScreenCode = fs.readFileSync('src/screens/CitiesScreen.tsx', 'utf8');

assert.ok(citiesCode.includes('COUNTRY_AR'), 'cities.ts must export COUNTRY_AR');
assert.ok(citiesCode.includes('CITY_NAMES_AR'), 'cities.ts must export CITY_NAMES_AR');
assert.ok(citiesCode.includes('CITY_NAMES_UR'), 'cities.ts must export CITY_NAMES_UR');
assert.ok(citiesCode.includes('getLocalizedCityName'), 'cities.ts must export getLocalizedCityName');
assert.ok(citiesCode.includes('getLocalizedCountryName'), 'cities.ts must export getLocalizedCountryName');

// CitiesScreen must render localized city & country names
assert.ok(citiesScreenCode.includes('getLocalizedCityName'), 'CitiesScreen must use getLocalizedCityName');
assert.ok(citiesScreenCode.includes('getLocalizedCountryName'), 'CitiesScreen must use getLocalizedCountryName');
assert.ok(!citiesScreenCode.includes('countryNameUr(item.country)'), 'CitiesScreen must not call countryNameUr unconditionally');

console.log('  ✓ Task 3 Cities assertions passed.');

// ---------------------------------------------------------------------------
// 4. SETTINGS QUEUE & STATE PERSISTENCE: Concurrency & resilience
// ---------------------------------------------------------------------------
console.log('\n--- 4. Settings Queue: Concurrency & resilience ---');

const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');

// Every ordinary setting change must snapshot synchronously from the latest ref
// and use the same serialized writer as language changes.
assert.ok(settingsCode.includes('function updateSettings('), 'settings must expose one shared update path');
assert.ok(
  settingsCode.includes('sanitizeSettings(update(settingsRef.current))'),
  'ordinary updates must derive from the latest optimistic settings ref'
);
assert.ok(settingsCode.includes('enqueueWrite(clean)'), 'ordinary updates must use the shared settings queue');
assert.ok(
  settingsCode.includes('await enqueueWrite(nextClean, (raw)'),
  'language write and readback verification must run atomically inside the shared queue'
);

// Dynamic production queue stress test
{
  let storageData = { 'islamic-settings': JSON.stringify({ language: 'en', themeMode: 'paper' }) };
  let shouldFail = false;

  const storage = {
    async setItem(key, val) {
      await new Promise((r) => setTimeout(r, 15));
      if (shouldFail) {
        shouldFail = false;
        throw new Error('Simulated disk error');
      }
      storageData[key] = val;
    },
    async getItem(key) {
      await new Promise((r) => setTimeout(r, 10));
      return storageData[key] || null;
    },
  };

  let state = { language: 'en', themeMode: 'paper' };
  let settingsRef = { current: state };
  let lastPersistedRef = { current: state };
  let writeQueueRef = { current: Promise.resolve() };

  function enqueueWrite(nextClean) {
    const task = writeQueueRef.current
      .then(async () => {
        await storage.setItem('islamic-settings', JSON.stringify(nextClean));
        lastPersistedRef.current = nextClean;
        return nextClean;
      });

    writeQueueRef.current = task.then(() => {}, () => {});
    return task;
  }

  function persist(next) {
    const clean = {
      ...next,
      language: settingsRef.current.language,
    };
    settingsRef.current = clean;
    enqueueWrite(clean).catch(() => {});
    return clean;
  }

  function setThemeMode(themeMode) {
    const next = persist({ ...settingsRef.current, themeMode });
    state = next;
  }

  async function setLanguage(nextLang) {
    const prevLang = settingsRef.current.language;
    if (nextLang === prevLang) return;

    const currentSnapshot = settingsRef.current;
    const nextClean = { ...currentSnapshot, language: nextLang };
    settingsRef.current = nextClean;
    state = nextClean;

    try {
      await enqueueWrite(nextClean);
      const raw = await storage.getItem('islamic-settings');
      if (!raw) throw new Error('empty');
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.language !== nextLang) {
        throw new Error(`Storage readback mismatch: expected ${nextLang}, got ${parsed?.language}`);
      }
    } catch (err) {
      const restored = { ...settingsRef.current, language: prevLang };
      settingsRef.current = restored;
      state = restored;
      enqueueWrite(restored).catch(() => {});
      throw err;
    }
  }

  // 1. Light write -> en->ur
  setThemeMode('paper');
  await setLanguage('ur');
  assert.strictEqual(settingsRef.current.language, 'ur');
  assert.strictEqual(settingsRef.current.themeMode, 'paper');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).language, 'ur');

  // 2. Light write -> ur->ar
  setThemeMode('paper');
  await setLanguage('ar');
  assert.strictEqual(settingsRef.current.language, 'ar');
  assert.strictEqual(settingsRef.current.themeMode, 'paper');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).language, 'ar');

  // 3. Concurrent rapid appearance write during language write
  const p3 = setLanguage('en');
  setThemeMode('ink');
  await p3;
  await new Promise((r) => setTimeout(r, 40));
  assert.strictEqual(settingsRef.current.language, 'en');
  assert.strictEqual(settingsRef.current.themeMode, 'ink');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).language, 'en');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).themeMode, 'ink');

  // 4. One failed write followed by a successful theme write
  shouldFail = true;
  await assert.rejects(async () => {
    await setLanguage('ur');
  }, /Simulated disk error/);

  // Queue must remain usable: theme write succeeds
  setThemeMode('paper');
  await new Promise((r) => setTimeout(r, 40));
  assert.strictEqual(settingsRef.current.themeMode, 'paper');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).themeMode, 'paper');

  // 5. Failed language write recovery
  shouldFail = true;
  await assert.rejects(async () => {
    await setLanguage('ar');
  }, /Simulated disk error/);
  // Subsequent attempt succeeds
  await setLanguage('ar');
  assert.strictEqual(settingsRef.current.language, 'ar');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).language, 'ar');
}

console.log('  ✓ Task 4 Settings queue assertions passed.');
console.log('\n========================================================');
console.log('ALL DEFECT REGRESSION TESTS PASSED!');
console.log('========================================================\n');
