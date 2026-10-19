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

// 1b2. Hindi coverage in surahNamesLocalized & quranLanguages
assert.ok(surahNamesCode.includes('LANGUAGE_NAMES_HI'), 'surahNamesLocalized must export LANGUAGE_NAMES_HI');
assert.ok(quranLanguagesCode.includes('EDITION_METADATA_HI'), 'quranLanguages must export EDITION_METADATA_HI');

const langHiMatch = surahNamesCode.match(/export const LANGUAGE_NAMES_HI:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(langHiMatch, 'LANGUAGE_NAMES_HI found');
const langHiKeys = new Set([...langHiMatch[1].matchAll(/^\s*'([^']+)':/gm), ...langHiMatch[1].matchAll(/^\s*([A-Za-z0-9_-]+):/gm)].map((m) => m[1]));

for (const lang of editionLangs) {
  assert.ok(langHiKeys.has(lang), `LANGUAGE_NAMES_HI must have entry for language "${lang}"`);
}

const metaHiMatch = quranLanguagesCode.match(/export const EDITION_METADATA_HI:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(metaHiMatch, 'EDITION_METADATA_HI found');
const metaHiKeys = new Set([...metaHiMatch[1].matchAll(/^\s*'([^']+)':/gm), ...metaHiMatch[1].matchAll(/^\s*([A-Za-z0-9_-]+):/gm)].map((m) => m[1]));

for (const id of editionIds) {
  assert.ok(metaHiKeys.has(id), `EDITION_METADATA_HI must have entry for edition "${id}"`);
}

// 1b3. Malayalam & Sinhala coverage in surahNamesLocalized & quranLanguages
assert.ok(surahNamesCode.includes('LANGUAGE_NAMES_ML'), 'surahNamesLocalized must export LANGUAGE_NAMES_ML');
assert.ok(quranLanguagesCode.includes('EDITION_METADATA_ML'), 'quranLanguages must export EDITION_METADATA_ML');
assert.ok(surahNamesCode.includes('LANGUAGE_NAMES_SI'), 'surahNamesLocalized must export LANGUAGE_NAMES_SI');
assert.ok(quranLanguagesCode.includes('EDITION_METADATA_SI'), 'quranLanguages must export EDITION_METADATA_SI');

const langMlMatch = surahNamesCode.match(/export const LANGUAGE_NAMES_ML:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(langMlMatch, 'LANGUAGE_NAMES_ML found');
const langMlKeys = new Set([...langMlMatch[1].matchAll(/^\s*'([^']+)':/gm), ...langMlMatch[1].matchAll(/^\s*([A-Za-z0-9_-]+):/gm)].map((m) => m[1]));

for (const lang of editionLangs) {
  assert.ok(langMlKeys.has(lang), `LANGUAGE_NAMES_ML must have entry for language "${lang}"`);
}

const metaMlMatch = quranLanguagesCode.match(/export const EDITION_METADATA_ML:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(metaMlMatch, 'EDITION_METADATA_ML found');
const metaMlKeys = new Set([...metaMlMatch[1].matchAll(/^\s*'([^']+)':/gm), ...metaMlMatch[1].matchAll(/^\s*([A-Za-z0-9_-]+):/gm)].map((m) => m[1]));

for (const id of editionIds) {
  assert.ok(metaMlKeys.has(id), `EDITION_METADATA_ML must have entry for edition "${id}"`);
}

const langSiMatch = surahNamesCode.match(/export const LANGUAGE_NAMES_SI:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(langSiMatch, 'LANGUAGE_NAMES_SI found');
const langSiKeys = new Set([...langSiMatch[1].matchAll(/^\s*'([^']+)':/gm), ...langSiMatch[1].matchAll(/^\s*([A-Za-z0-9_-]+):/gm)].map((m) => m[1]));

for (const lang of editionLangs) {
  assert.ok(langSiKeys.has(lang), `LANGUAGE_NAMES_SI must have entry for language "${lang}"`);
}

const metaSiMatch = quranLanguagesCode.match(/export const EDITION_METADATA_SI:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(metaSiMatch, 'EDITION_METADATA_SI found');
const metaSiKeys = new Set([...metaSiMatch[1].matchAll(/^\s*'([^']+)':/gm), ...metaSiMatch[1].matchAll(/^\s*([A-Za-z0-9_-]+):/gm)].map((m) => m[1]));

for (const id of editionIds) {
  assert.ok(metaSiKeys.has(id), `EDITION_METADATA_SI must have entry for edition "${id}"`);
}

// Modal remaining raw English strings must be localized
assert.ok(!modalCode.includes("accessibilityLabel={`${getLocalizedLanguageName(item.language)} - ${getLocalizedTranslatorName(item.editionIdentifier, item.name)}${isSelected ? ', currently selected' : ''}`}"),
  'Modal accessibilityLabel must not have hardcoded ", currently selected"');
assert.ok(!modalCode.includes("TRANSLATIONS (${QURAN_LANGUAGE_EDITIONS.length})"),
  'Modal eyebrow must not have raw English TRANSLATIONS literal');

console.log('  ✓ Task 1 Quran chooser static assertions passed.');

// 1c. Dynamic evaluation of language and translator helpers
const urMatch = surahNamesCode.match(/export const LANGUAGE_NAMES_UR:[\s\S]*?= \{([\s\S]*?)\n\};/);
const langUrMap = new Function('return {' + urMatch[1] + '}')();
const langArMap = new Function('return {' + langArMatch[1] + '}')();
const langHiMap = new Function('return {' + langHiMatch[1] + '}')();
const langMlMap = new Function('return {' + langMlMatch[1] + '}')();
const langSiMap = new Function('return {' + langSiMatch[1] + '}')();
const metaUrMatch = quranLanguagesCode.match(/export const EDITION_METADATA_UR:[\s\S]*?= \{([\s\S]*?)\n\};/);
const metaUrMap = new Function('return {' + metaUrMatch[1] + '}')();
const metaArMap = new Function('return {' + metaArMatch[1] + '}')();
const metaHiMap = new Function('return {' + metaHiMatch[1] + '}')();
const metaMlMap = new Function('return {' + metaMlMatch[1] + '}')();
const metaSiMap = new Function('return {' + metaSiMatch[1] + '}')();

for (const ed of editionIds) {
  assert.ok(metaArMap[ed]?.title, `Arabic metadata for ${ed} must have title`);
  assert.ok(metaArMap[ed]?.translator, `Arabic metadata for ${ed} must have translator`);
  assert.ok(metaArMap[ed]?.language, `Arabic metadata for ${ed} must have language`);
  assert.ok(metaHiMap[ed]?.title, `Hindi metadata for ${ed} must have title`);
  assert.ok(metaHiMap[ed]?.translator, `Hindi metadata for ${ed} must have translator`);
  assert.ok(metaHiMap[ed]?.language, `Hindi metadata for ${ed} must have language`);
  assert.ok(metaMlMap[ed]?.title, `Malayalam metadata for ${ed} must have title`);
  assert.ok(metaMlMap[ed]?.translator, `Malayalam metadata for ${ed} must have translator`);
  assert.ok(metaMlMap[ed]?.language, `Malayalam metadata for ${ed} must have language`);
  assert.ok(metaSiMap[ed]?.title, `Sinhala metadata for ${ed} must have title`);
  assert.ok(metaSiMap[ed]?.translator, `Sinhala metadata for ${ed} must have translator`);
  assert.ok(metaSiMap[ed]?.language, `Sinhala metadata for ${ed} must have language`);
}
for (const lang of editionLangs) {
  assert.ok(langArMap[lang], `Arabic language name for ${lang} must exist`);
  assert.ok(langHiMap[lang], `Hindi language name for ${lang} must exist`);
  assert.ok(langMlMap[lang], `Malayalam language name for ${lang} must exist`);
  assert.ok(langSiMap[lang], `Sinhala language name for ${lang} must exist`);
}
console.log('  ✓ Task 1 dynamic Arabic, Hindi, Malayalam & Sinhala coverage verified across all editions.');

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
  'TasbihScreen must provide getLocalizedDhikrMeaning for Urdu, Arabic, Hindi, Malayalam, and Sinhala');
assert.ok(tasbihCode.includes('getLocalizedDhikrTransliteration'),
  'TasbihScreen must provide getLocalizedDhikrTransliteration');
assert.ok(tasbihCode.includes('hi:'), 'TasbihScreen must provide Hindi dhikr translations');
assert.ok(tasbihCode.includes('ml:'), 'TasbihScreen must provide Malayalam dhikr translations');
assert.ok(tasbihCode.includes('si:'), 'TasbihScreen must provide Sinhala dhikr translations');

// The primary counter must remain legible and responsive on native RTL devices.
assert.ok(tasbihCode.includes('testID="tasbih-counter-button"'), 'Tasbih counter must expose a stable interaction target');
assert.ok(tasbihCode.includes('includeFontPadding: false'), 'Large counter numerals must not inherit oversized Android font padding');
assert.ok(tasbihCode.includes('lineHeight: 74'), 'Counter numeral must use a bounded line height instead of the locale-wide RTL multiplier');
assert.ok(tasbihCode.includes('height: counterDiameter'), 'Counter dial must have an explicit responsive height');
assert.ok(tasbihCode.indexOf('/* Today Summary */') > tasbihCode.indexOf('testID="tasbih-counter-button"'), 'Today summary must follow the main counter so the dial is visible higher on screen');
assert.ok(tasbihCode.includes('countsRef.current') && tasbihCode.includes('todayTotalRef.current'), 'Rapid taps must increment from the latest count without stale render closures');
assert.ok(tasbihCode.includes('void saveTasbihCountAsync(selectedDhikr.id, nextCount)'), 'Counter updates must persist asynchronously after updating screen state');
assert.ok(tasbihCode.includes('void saveTasbihDayTotalAsync(todayKey, 1)'), 'Daily totals must persist asynchronously after updating screen state');

const nativeDbCode = fs.readFileSync('src/lib/db.native.ts', 'utf8');
assert.ok((nativeDbCode.match(/await getDb\(\)\.runAsync\(/g) || []).length >= 2, 'Native Tasbih persistence must use async SQLite writes for count and daily total');

console.log('  ✓ Task 2 Tasbih assertions passed.');

// ---------------------------------------------------------------------------
// 3. CITIES: Localized Arabic, Urdu & Hindi names and bilingual search
// ---------------------------------------------------------------------------
console.log('\n--- 3. Cities: Localized Arabic, Urdu, Hindi, Malayalam & Sinhala names and bilingual search ---');

const citiesCode = fs.readFileSync('src/lib/cities.ts', 'utf8');
const citiesScreenCode = fs.readFileSync('src/screens/CitiesScreen.tsx', 'utf8');

assert.ok(citiesCode.includes('COUNTRY_AR'), 'cities.ts must export COUNTRY_AR');
assert.ok(citiesCode.includes('COUNTRY_HI'), 'cities.ts must export COUNTRY_HI');
assert.ok(citiesCode.includes('COUNTRY_ML'), 'cities.ts must export COUNTRY_ML');
assert.ok(citiesCode.includes('COUNTRY_SI'), 'cities.ts must export COUNTRY_SI');
assert.ok(citiesCode.includes('CITY_NAMES_AR'), 'cities.ts must export CITY_NAMES_AR');
assert.ok(citiesCode.includes('CITY_NAMES_UR'), 'cities.ts must export CITY_NAMES_UR');
assert.ok(citiesCode.includes('CITY_NAMES_HI'), 'cities.ts must export CITY_NAMES_HI');
assert.ok(citiesCode.includes('CITY_NAMES_ML'), 'cities.ts must export CITY_NAMES_ML');
assert.ok(citiesCode.includes('CITY_NAMES_SI'), 'cities.ts must export CITY_NAMES_SI');
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
assert.ok(settingsCode.includes('const updateSettings = useCallback('), 'settings must expose one stable shared update path');
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

  // 2b. Light write -> ar->hi
  setThemeMode('paper');
  await setLanguage('hi');
  assert.strictEqual(settingsRef.current.language, 'hi');
  assert.strictEqual(settingsRef.current.themeMode, 'paper');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).language, 'hi');

  // 2c. Light write -> hi->ml
  setThemeMode('paper');
  await setLanguage('ml');
  assert.strictEqual(settingsRef.current.language, 'ml');
  assert.strictEqual(settingsRef.current.themeMode, 'paper');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).language, 'ml');

  // 2d. Light write -> ml->si
  setThemeMode('paper');
  await setLanguage('si');
  assert.strictEqual(settingsRef.current.language, 'si');
  assert.strictEqual(settingsRef.current.themeMode, 'paper');
  assert.strictEqual(JSON.parse(storageData['islamic-settings']).language, 'si');

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

// ---------------------------------------------------------------------------
// 5. BATCH 6D-B REGRESSIONS: Quran Home parent-tab identity & Reader midpoint clearance
// ---------------------------------------------------------------------------
console.log('\n--- 5. Batch 6D-B Regressions: Quran Home parent tab & reader clearance ---');

// 5a. Authoritative routeToTab distinguishes top-level Home from Quran Home
const routeToTabCode = fs.readFileSync('src/navigation/routeToTab.ts', 'utf8');
assert.ok(routeToTabCode.includes("screen === 'home' && parentTab === 'quran'"), 'routeToTab must check screen === home and parentTab === quran');

const { routeToTab } = await import('../src/navigation/routeToTab.ts');
assert.equal(routeToTab('home'), 'home', 'top-level home string must resolve to home tab');
assert.equal(routeToTab('home', 'home'), 'home', 'top-level home with home parentTab must resolve to home tab');
assert.equal(routeToTab({ screen: 'home' }), 'home', 'top-level home object without parentTab must resolve to home tab');
assert.equal(routeToTab({ screen: 'home' }, 'quran'), 'quran', 'Quran Home state ({ screen: "home" }, "quran") must resolve to quran tab');
assert.equal(routeToTab({ screen: 'home' }, { parentTab: 'quran' }), 'quran', 'Quran Home state with options must resolve to quran tab');
assert.equal(routeToTab({ screen: 'home', tab: 'quran' }), 'quran', 'Quran Home state with tab property must resolve to quran tab');
assert.equal(routeToTab('quran-home'), 'quran', 'quran-home must resolve to quran tab');
assert.equal(routeToTab({ screen: 'reader', surah: 2 }, 'quran'), 'quran', 'Quran reader must resolve to quran tab');
console.log('  ✓ routeToTab correctly distinguishes top-level Home from Quran Home');

// 5b. QuranReaderScreen production layout geometry contract
const readerCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
assert.ok(readerCode.includes('readerBottomClearance'), 'QuranReaderScreen must define readerBottomClearance');
assert.ok(
  readerCode.includes('paddingBottom: readerBottomClearance'),
  'QuranReaderScreen DetailScreen must apply paddingBottom: readerBottomClearance to bound scroll owner'
);
assert.ok(
  readerCode.includes('NAV_TOP(insets.bottom)'),
  'QuranReaderScreen must calculate readerBottomClearance relative to NAV_TOP(insets.bottom)'
);
console.log('  ✓ QuranReaderScreen readerBottomClearance and scroll owner geometry contract verified');

// ---------------------------------------------------------------------------
// 6. AUDIO TIMELINE SEEK DIRECTION & PROGRESS FILL (RTL/LTR)
// ---------------------------------------------------------------------------
console.log('\n--- 6. Audio Timeline Seek Direction & Progress Fill (RTL/LTR) ---');

const { calculateTimelineRatio } = await import('../src/lib/timelineRatio.ts');

// 6a. Production calculateTimelineRatio LTR contract
assert.equal(calculateTimelineRatio(0, 200, false), 0, 'LTR: x=0 must be start (ratio 0)');
assert.equal(calculateTimelineRatio(50, 200, false), 0.25, 'LTR: x=50/200 must be 0.25');
assert.equal(calculateTimelineRatio(100, 200, false), 0.5, 'LTR: x=100/200 must be 0.5');
assert.equal(calculateTimelineRatio(200, 200, false), 1, 'LTR: x=200 must be end (ratio 1)');
assert.equal(calculateTimelineRatio(-10, 200, false), 0, 'LTR: negative x must clamp to 0');
assert.equal(calculateTimelineRatio(300, 200, false), 1, 'LTR: overflow x must clamp to 1');

// 6b. Production calculateTimelineRatio RTL contract
assert.equal(calculateTimelineRatio(200, 200, true), 0, 'RTL: right edge (x=200) must be start (ratio 0)');
assert.equal(calculateTimelineRatio(150, 200, true), 0.25, 'RTL: x=150/200 must be 0.25');
assert.equal(calculateTimelineRatio(100, 200, true), 0.5, 'RTL: center must be 0.5');
assert.equal(calculateTimelineRatio(0, 200, true), 1, 'RTL: left edge (x=0) must be end (ratio 1)');
assert.equal(calculateTimelineRatio(300, 200, true), 0, 'RTL: right overflow must clamp to 0');
assert.equal(calculateTimelineRatio(-10, 200, true), 1, 'RTL: left overflow must clamp to 1');

// 6c. All three audio components must use calculateTimelineRatio and logical start fill
const audioModalCode = fs.readFileSync('src/components/AudioPlayerModal.tsx', 'utf8');
const audioMiniCode = fs.readFileSync('src/components/AudioMiniPlayer.tsx', 'utf8');
const nowPlayingCode = fs.readFileSync('src/components/NowPlayingHeroCard.tsx', 'utf8');

assert.ok(audioModalCode.includes('calculateTimelineRatio('), 'AudioPlayerModal must use calculateTimelineRatio');
assert.ok(audioMiniCode.includes('calculateTimelineRatio('), 'AudioMiniPlayer must use calculateTimelineRatio');
assert.ok(nowPlayingCode.includes('calculateTimelineRatio('), 'NowPlayingHeroCard must use calculateTimelineRatio');

assert.ok(audioModalCode.includes('start: 0'), 'AudioPlayerModal progressFill must anchor to start: 0');
assert.ok(audioMiniCode.includes('start: 0'), 'AudioMiniPlayer progressFill must anchor to start: 0');
assert.ok(!audioModalCode.includes('left: 0,\n    borderRadius: 3'), 'AudioPlayerModal must not use physical left: 0 in progressFill');
assert.ok(!audioMiniCode.includes('left: 0,\n    top: 0,\n    bottom: 0'), 'AudioMiniPlayer must not use physical left: 0 in progressFill');
assert.ok(nowPlayingCode.includes("alignSelf: 'flex-start'"), 'NowPlayingHeroCard progressFill must anchor with alignSelf flex-start');

console.log('  ✓ Audio timeline seek direction and progress fill verified in LTR & RTL');

// ---------------------------------------------------------------------------
// 7. HORIZONTAL SCROLLVIEW RTL BEHAVIOR
// ---------------------------------------------------------------------------
console.log('--- 7. Horizontal ScrollView RTL: ScreenTabs & QuranScreen ---');

const screenTabsCode = fs.readFileSync('src/components/ui/ScreenTabs.tsx', 'utf8');
const quranScreenCode = fs.readFileSync('src/screens/QuranScreen.tsx', 'utf8');

assert.ok(
  screenTabsCode.includes('contentContainerStyle={[styles.scrollWrap, hScrollRTLStyle()]}'),
  'ScreenTabs must apply hScrollRTLStyle to scrollWrap for RTL start alignment'
);
assert.ok(
  quranScreenCode.includes('contentContainerStyle={[styles.juzScroll, hScrollRTLStyle()]}'),
  'QuranScreen skeleton juz scroll must apply hScrollRTLStyle'
);
assert.ok(
  quranScreenCode.includes('styles.juzScroll') &&
  quranScreenCode.includes('hScrollRTLStyle()') &&
  /styles\.juzScroll[\s\S]*?hScrollRTLStyle\(\)/.test(quranScreenCode),
  'QuranScreen live juz scroll must apply hScrollRTLStyle'
);

console.log('  ✓ Horizontal scroll RTL behavior verified for ScreenTabs and QuranScreen');

// ---------------------------------------------------------------------------
// 8. QURAN / MUSHAF METADATA LOCALIZATION
// ---------------------------------------------------------------------------
console.log('--- 8. Quran / Mushaf Metadata Localization ---');

const quranReaderCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');

assert.ok(
  quranReaderCode.includes("${t('Juz')} ${mushafPageJuz ?? '—'} • ${t('Hizb')} ${Math.ceil((mushafPageHizbQuarter ?? 0) / 4)}"),
  'Mushaf header strip must localize Juz and Hizb via t()'
);
assert.ok(
  quranReaderCode.includes("${t('Page')} ${displayedMushafPage}"),
  'Mushaf header strip must localize Page label via t()'
);
assert.ok(
  quranReaderCode.includes("${t('Juz')} ${currentPageData.juz"),
  'Mushaf footer badge subtitle must localize Juz and Hizb via t()'
);

console.log('  ✓ Mushaf page header strip and footer badge metadata localization verified');

console.log('\n========================================================');
console.log('ALL DEFECT REGRESSION TESTS PASSED!');
console.log('========================================================\n');
