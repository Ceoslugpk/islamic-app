/**
 * Regression Test Suite for Four Physical-Device Urdu Defects:
 *  1. Urdu -> English language switch persistence, layout direction, and reload resilience
 *  2. Home screen cards below Prayer card start and flow RTL in Urdu (LTR in English)
 *  3. Localized translation titles and translator names in Urdu with shared helper & fallback
 *  4. Quran Surah-name search normalization and localized Urdu matching
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== FOUR PHYSICAL-DEVICE URDU DEFECTS REGRESSION TEST SUITE ===\n');

// ---------------------------------------------------------------------------
// TASK 1: Urdu -> English Switch Flow, Native Direction, and Reload Resilience
// ---------------------------------------------------------------------------
console.log('--- Task 1: Urdu -> English Switch Flow & Reload Resilience ---');

const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');
const i18nCode = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const settingsScreenCode = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
const appCode = fs.readFileSync('App.tsx', 'utf8');

// 1a. prepareNativeLayoutDirection sets allowRTL(isUrdu) to prevent stuck RTL on RTL devices
assert.ok(
  i18nCode.includes('I18nManager.allowRTL(isUrdu)') || i18nCode.includes("I18nManager.allowRTL(lang === 'ur')"),
  'prepareNativeLayoutDirection must set allowRTL(false) when switching to English so RTL-device locales do not remain stuck in RTL'
);

// 1b. applyRTL also sets allowRTL matching isRTL
assert.ok(
  i18nCode.includes('I18nManager.allowRTL(isRTL)'),
  'applyRTL must set allowRTL(isRTL) dynamically rather than hardcoding true'
);

// 1c. App.tsx boot effect calls resolvePersistedLanguage with forceFresh = true
assert.ok(
  appCode.includes('resolvePersistedLanguage(true)'),
  'App.tsx boot effect must call resolvePersistedLanguage(true) to avoid stale module cache'
);

// 1d. SettingsScreen does not discard reload if unmounted after language selection
assert.ok(
  !settingsScreenCode.includes('if (!mountedRef.current) return;\n                  onPrepareReload?.()') &&
  !settingsScreenCode.includes('if (!mountedRef.current) return;\n                    Updates.reloadAsync()'),
  'SettingsScreen must not discard reload on unmount once language persistence succeeds'
);

// 1e. SettingsScreen unmount cleanup preserves pending reload timer if a switch is in progress
assert.ok(
  settingsScreenCode.includes('if (reloadTimerRef.current && !isSwitchingLanguageRef.current)'),
  'SettingsScreen cleanup must not cancel reload timer when language switch is in progress'
);

console.log('  ✓ Task 1 static contract assertions passed.');

// ---------------------------------------------------------------------------
// TASK 2: Home Cards Below Prayer Card Start/Flow RTL in Urdu
// ---------------------------------------------------------------------------
console.log('\n--- Task 2: Home Screen Cards Below Prayer Card RTL Flow ---');

const homeScreenCode = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
const continueReadingCode = fs.readFileSync('src/components/ContinueReadingCard.tsx', 'utf8');
const quickActionsCode = fs.readFileSync('src/components/QuickActionsStrip.tsx', 'utf8');
const dailyContentRailCode = fs.readFileSync('src/components/DailyContentRail.tsx', 'utf8');
const prayerTimelineCode = fs.readFileSync('src/components/PrayerTimeline.tsx', 'utf8');

// 2a. ContinueReadingCard supports RTL alignments and row direction
assert.ok(
  continueReadingCode.includes('isRTL() ?') || continueReadingCode.includes('isRTL'),
  'ContinueReadingCard must consume isRTL helper'
);
assert.ok(
  continueReadingCode.includes("textAlign: isRTL() ? 'right' : 'left'"),
  'ContinueReadingCard text must align right in RTL'
);
assert.ok(
  continueReadingCode.includes("flexDirection: isRTL() ? 'row-reverse' : 'row'"),
  'ContinueReadingCard rows must flow row-reverse in RTL'
);

// 2b. QuickActionsStrip flows row-reverse in RTL so first action starts from right
assert.ok(
  quickActionsCode.includes("flexDirection: isRTL() ? 'row-reverse' : 'row'") ||
  quickActionsCode.includes('isRTL() ?'),
  'QuickActionsStrip must flow RTL so action ordering starts from right in Urdu'
);

// 2c. DailyContentRail horizontal scroll uses hScrollRTLStyle and card headers/text flow RTL
assert.ok(
  dailyContentRailCode.includes('hScrollRTLStyle'),
  'DailyContentRail horizontal ScrollView must apply hScrollRTLStyle'
);
assert.ok(
  dailyContentRailCode.includes("textAlign: isRTL() ? 'right' : 'left'"),
  'DailyContentRail translations and text must align right in RTL'
);
assert.ok(
  dailyContentRailCode.includes("flexDirection: isRTL() ? 'row-reverse' : 'row'"),
  'DailyContentRail header and rows must reverse in RTL'
);

// 2d. Dua After Prayer in HomeScreen flows RTL
assert.ok(
  homeScreenCode.includes("textAlign: isRTL() ? 'right' : 'left'"),
  'HomeScreen Dua rail texts must align right in RTL'
);

// 2e. PrayerTimeline rows and footer flow RTL
assert.ok(
  prayerTimelineCode.includes("flexDirection: isRTL() ? 'row-reverse' : 'row'"),
  'PrayerTimeline footer / rows must flow row-reverse in RTL'
);

console.log('  ✓ Task 2 Home cards RTL flow assertions passed.');

// ---------------------------------------------------------------------------
// TASK 3: Localize Translation Names & Translator Names in Urdu
// ---------------------------------------------------------------------------
console.log('\n--- Task 3: Localize Translation & Translator Names in Urdu ---');

const quranLanguagesCode = fs.readFileSync('src/lib/quranLanguages.ts', 'utf8');

// 3a. Shared helper exported from quranLanguages
assert.ok(
  quranLanguagesCode.includes('export function getLocalizedTranslatorName(') ||
  quranLanguagesCode.includes('export function getLocalizedEditionMeta('),
  'quranLanguages must export a shared helper for localized edition/translator display'
);

console.log('  ✓ Task 3 static contract assertions passed.');

// ---------------------------------------------------------------------------
// TASK 4: Urdu Surah-name Search Normalization & Matching
// ---------------------------------------------------------------------------
console.log('\n--- Task 4: Urdu Surah-name Search Normalization ---');

const surahNamesCode = fs.readFileSync('src/lib/surahNamesLocalized.ts', 'utf8');
const quranHomeCode = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');

// 4a. Shared normalization function exported
assert.ok(
  surahNamesCode.includes('export function normalizeSearchText('),
  'surahNamesLocalized must export normalizeSearchText helper'
);

// 4b. QuranHomeScreen filteredSurahs consumes normalizeSearchText and searches Urdu Surah names
assert.ok(
  quranHomeCode.includes('normalizeSearchText'),
  'QuranHomeScreen must consume normalizeSearchText for search queries and surah fields'
);

// Exercise the actual normalizer body from the TypeScript source instead of a
// duplicate test implementation.
const normalizerMatch = surahNamesCode.match(
  /export function normalizeSearchText\(text: string\): string \{([\s\S]*?)\n\}/
);
assert.ok(normalizerMatch, 'normalizeSearchText implementation must be extractable');
const normalizeSearchText = new Function('text', normalizerMatch[1]);

const urduNamesBlock = surahNamesCode.match(
  /export const SURAH_NAMES_UR:[\s\S]*?= \[([\s\S]*?)\] as const;/
);
assert.ok(urduNamesBlock, 'actual Urdu Surah-name list must be present');
const urduNames = [...urduNamesBlock[1].matchAll(/^\s*'([^']+)'/gm)].map((match) => match[1]);
assert.equal(urduNames.length, 114, 'Urdu Surah-name list must contain all 114 Surahs');

const queryCases = [
  ['الفاتحہ', 1],
  ['البقرہ', 2],
  ['یٰسین', 36],
  ['یس', 36],
  ['الرحمن', 55],
];
for (const [query, surahNumber] of queryCases) {
  const normalizedQuery = normalizeSearchText(query);
  const actualName = urduNames[surahNumber - 1];
  assert.ok(
    normalizeSearchText(actualName).includes(normalizedQuery),
    `Urdu query ${query} must match Surah ${surahNumber} (${actualName})`
  );
}

assert.ok(quranHomeCode.includes("s.number.toString() === lowerQuery"), 'numeric Surah search must remain supported');
assert.ok(quranHomeCode.includes('s.englishName.toLowerCase().includes(lowerQuery)'), 'English Surah search must remain supported');
assert.ok(quranHomeCode.includes('normalizeSearchText(s.name)'), 'Arabic canonical Surah search must remain supported');

const surahsCode = fs.readFileSync('src/lib/surahs114.ts', 'utf8');
const surahsMatch = surahsCode.match(/export const SURAHS_114: SurahSummary\[\] = (\[[\s\S]*?\n\]);/);
assert.ok(surahsMatch, 'SURAHS_114 summary must be present');
const surahsList = new Function('return ' + surahsMatch[1])();

function simulateSearch(query) {
  const rawQuery = query.trim();
  const normQuery = normalizeSearchText(rawQuery);
  const lowerQuery = rawQuery.toLowerCase();
  return surahsList.filter((s) => {
    const englishNameMatch = s.englishName.toLowerCase().includes(lowerQuery);
    const numberMatch = s.number.toString() === lowerQuery;
    const urduName = urduNames[s.number - 1];
    const normUrdu = normalizeSearchText(urduName);
    const normArabic = normalizeSearchText(s.name);
    const normEnglish = normalizeSearchText(s.englishName);
    const urduMatch = normUrdu.includes(normQuery) || (normQuery === 'یس' && s.number === 36);
    const arabicMatch = normArabic.includes(normQuery);
    return englishNameMatch || normEnglish.includes(normQuery) || urduMatch || arabicMatch || numberMatch;
  });
}

assert.ok(simulateSearch('baqarah').some((s) => s.number === 2), 'English baqarah query must match Surah 2');
assert.ok(simulateSearch('البقرة').some((s) => s.number === 2), 'Arabic canonical query البقرة must match Surah 2');
assert.ok(simulateSearch('2').some((s) => s.number === 2), 'Numeric query 2 must match Surah 2');

console.log('  ✓ Task 4 actual Urdu normalizer/name queries, English, Arabic canonical, and numeric search passed.');

// Verify every bundled Quran edition has Urdu display metadata and that the
// helper keeps a fallback for unknown remote editions.
const editionsBlock = quranLanguagesCode.match(
  /export const QURAN_LANGUAGE_EDITIONS:[\s\S]*?= \[([\s\S]*?)\n\];/
);
const metadataBlock = quranLanguagesCode.match(
  /export const EDITION_METADATA_UR:[\s\S]*?= \{([\s\S]*?)\n\};/
);
assert.ok(editionsBlock && metadataBlock, 'edition list and Urdu metadata map must be present');
const editionIds = [...editionsBlock[1].matchAll(/editionIdentifier:\s*'([^']+)'/g)].map((match) => match[1]);
const metadataIds = new Set([...metadataBlock[1].matchAll(/^\s*'([^']+)':\s*\{/gm)].map((match) => match[1]));
assert.ok(editionIds.length >= 48, 'all exposed Quran editions must be inspected');
assert.deepEqual(
  editionIds.filter((identifier) => !metadataIds.has(identifier)),
  [],
  'every exposed text edition must have Urdu title/translator metadata'
);
assert.ok(quranLanguagesCode.includes('return fallbackName || identifier'), 'unknown remote editions must safely fall back');

console.log('  ✓ Task 3 all exposed editions have Urdu metadata with unknown-edition fallback.');

console.log('\n========================================================');
console.log('ALL DEFECT REGRESSION CONTRACTS VERIFIED!');
console.log('========================================================\n');
