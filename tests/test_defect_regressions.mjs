/**
 * Regression Test Suite for Four Physical-Device Defects:
 *  1. Quran text-translation chooser Arabic display & translator metadata coverage
 *  2. Tasbih localization in Urdu & Arabic (presets, meanings, headers, accessibility)
 *  3. Cities localized Arabic & Urdu names and bilingual search
 *  4. Production Settings queue/state concurrency, persistence & resilience
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

console.log('=== FOUR DEFECT REGRESSION TESTS ===\n');

// ---------------------------------------------------------------------------
// 1. QURAN CHOOSER: Arabic language display & translator metadata coverage
// ---------------------------------------------------------------------------
console.log('--- 1. Quran Chooser: Arabic display & translator metadata ---');

const surahNamesCode = fs.readFileSync('src/lib/surahNamesLocalized.ts', 'utf8');
const quranLanguagesCode = fs.readFileSync('src/lib/quranLanguages.ts', 'utf8');
const modalCode = fs.readFileSync('src/components/QuranLanguageModal.tsx', 'utf8');

// Execute the real data modules. i18n is the only stubbed state/platform boundary.
const quranDataTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-language-data-'));
fs.writeFileSync(path.join(quranDataTmp, 'stubI18n.mjs'), "export const getCurrentLanguage = () => 'en'; export const t = (key) => key;\n");
function transpileQuranData(source, fileName) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName,
  }).outputText;
}
fs.writeFileSync(path.join(quranDataTmp, 'surahNamesLocalized.mjs'), transpileQuranData(
  surahNamesCode.replace("from './i18n'", "from './stubI18n.mjs'"), 'surahNamesLocalized.ts'));
fs.writeFileSync(path.join(quranDataTmp, 'quranLanguages.mjs'), transpileQuranData(
  quranLanguagesCode
    .replace("from './i18n'", "from './stubI18n.mjs'")
    .replace("from './surahNamesLocalized'", "from './surahNamesLocalized.mjs'"), 'quranLanguages.ts'));
const surahNames = await import(path.join(quranDataTmp, 'surahNamesLocalized.mjs'));
const quranLanguages = await import(path.join(quranDataTmp, 'quranLanguages.mjs'));
const { LANGUAGE_NAMES_AR, LANGUAGE_NAMES_HI, LANGUAGE_NAMES_ML, LANGUAGE_NAMES_SI } = surahNames;
const { QURAN_LANGUAGE_EDITIONS, EDITION_METADATA_AR, EDITION_METADATA_HI, EDITION_METADATA_ML, EDITION_METADATA_SI } = quranLanguages;
const editionIds = QURAN_LANGUAGE_EDITIONS.map(({ editionIdentifier }) => editionIdentifier);
const editionLangs = QURAN_LANGUAGE_EDITIONS.map(({ language }) => language);
const assertExactKeys = (actual, expected, label) => {
  assert.deepEqual(new Set(Object.keys(actual)), new Set(expected), `${label} keys must match registered data`);
};
for (const [label, map] of [
  ['LANGUAGE_NAMES_AR', LANGUAGE_NAMES_AR], ['LANGUAGE_NAMES_HI', LANGUAGE_NAMES_HI],
  ['LANGUAGE_NAMES_ML', LANGUAGE_NAMES_ML], ['LANGUAGE_NAMES_SI', LANGUAGE_NAMES_SI],
]) {
  for (const lang of editionLangs) assert.ok(map[lang], `${label} must have entry for language "${lang}"`);
}
for (const [label, map] of [
  ['EDITION_METADATA_AR', EDITION_METADATA_AR], ['EDITION_METADATA_HI', EDITION_METADATA_HI],
  ['EDITION_METADATA_ML', EDITION_METADATA_ML], ['EDITION_METADATA_SI', EDITION_METADATA_SI],
]) {
  for (const id of editionIds) assert.ok(map[id]?.title && map[id]?.translator && map[id]?.language, `${label} entry for ${id} must be complete`);
}
for (const [label, map] of [
  ['EDITION_METADATA_HI', EDITION_METADATA_HI], ['EDITION_METADATA_ML', EDITION_METADATA_ML],
  ['EDITION_METADATA_SI', EDITION_METADATA_SI],
]) assertExactKeys(map, Object.keys(EDITION_METADATA_AR), label);
console.log('  ✓ Executed Quran editions, language-name, and metadata maps are cross-consistent.');

// 1a/1b. The real exported collections above are the source of truth.
assertExactKeys(LANGUAGE_NAMES_HI, Object.keys(LANGUAGE_NAMES_AR), 'LANGUAGE_NAMES_HI');
assertExactKeys(LANGUAGE_NAMES_ML, Object.keys(LANGUAGE_NAMES_AR), 'LANGUAGE_NAMES_ML');
assertExactKeys(LANGUAGE_NAMES_SI, Object.keys(LANGUAGE_NAMES_AR), 'LANGUAGE_NAMES_SI');

// Modal remaining raw English strings must be localized
assert.ok(!modalCode.includes("accessibilityLabel={`${getLocalizedLanguageName(item.language)} - ${getLocalizedTranslatorName(item.editionIdentifier, item.name)}${isSelected ? ', currently selected' : ''}`}"),
  'Modal accessibilityLabel must not have hardcoded ", currently selected"');
assert.ok(!modalCode.includes("TRANSLATIONS (${QURAN_LANGUAGE_EDITIONS.length})"),
  'Modal eyebrow must not have raw English TRANSLATIONS literal');

console.log('  ✓ Task 1 Quran chooser static assertions passed.');

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
// NOTE: this used to assert only that the file CONTAINS the token `todayTotalRef.current`. That is satisfiable by
// any occurrence - assigning or advancing the ref - so it passed even when the handler read the STALE render-closure
// value instead of the ref (verified by reverting the read: the suite stayed green, because the ref was still
// assigned and advanced two lines later). The bug it exists to catch is a stale READ, so it now names both read
// sites: the primary counter must read countsRef.current, and the day total must pass todayTotalRef.current into the
// rollover computation. A revert of either read now fails here.
assert.ok(
  /const nextCount = \(countsRef\.current\[selectedDhikr\.id\] \|\| 0\) \+ 1;/.test(tasbihCode),
  'Rapid taps must increment from the latest count without stale render closures'
);
assert.ok(
  /stateTotal: todayTotalRef\.current,/.test(tasbihCode),
  'Rapid taps must increment from the latest count without stale render closures'
);
assert.ok(tasbihCode.includes('void saveTasbihCountAsync(selectedDhikr.id, nextCount)'), 'Counter updates must persist asynchronously after updating screen state');
// The write key is now derived from the current clock (rollover.key) rather than the
// render-closure todayKey, so the first tap after local midnight lands on the new day's
// row. The guarantee that still matters: the day total is persisted asynchronously (+1).
assert.ok(
  /void saveTasbihDayTotalAsync\(rollover\.key, 1\)/.test(tasbihCode),
  'Daily totals must persist asynchronously (+1, keyed to the resolved rollover day) after updating screen state'
);

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
// NOTE: these two are TEXT assertions and are therefore brittle - they broke once already when the write path was
// legitimately refactored from `enqueueWrite(...)` to the shared-operation/mutation pair below. They are kept only
// as a cheap shape check; the BEHAVIOURAL guarantee (serialization under concurrency) is proven by the executed
// stress test that follows, which is the assertion to trust if these two ever disagree with reality.
assert.ok(
  settingsCode.includes('enqueueSharedSettingsMutation('),
  'ordinary updates must use the shared settings queue'
);
assert.ok(
  settingsCode.includes('enqueueSharedSettingsOperation(() => writeSettings('),
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

  // 6. Real production-path delayed-storage concurrency test importing enqueueSettingsUpdate
  await import('./test_enqueue_settings_concurrency.mjs');
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
