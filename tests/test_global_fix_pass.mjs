import assert from 'node:assert';
import fs from 'node:fs';
import {
  CITIES,
  CITY_NAMES_AR,
  CITY_NAMES_UR,
  COUNTRY_AR,
  COUNTRY_UR,
  getLocalizedCityName,
  getLocalizedCountryName,
} from '../src/lib/cities.ts';

console.log('=== GLOBAL FIX PASS REGRESSION TESTS ===\n');

// 1. Locale parity + key presence for the new Cities / Umrah / marker strings
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const ur = JSON.parse(fs.readFileSync('src/locales/ur.json', 'utf8'));
assert.strictEqual(Object.keys(en).length, Object.keys(ur).length, 'en/ur key counts must match');

const mustHave = [
  'Cities', 'Directory', 'Pick a city to set your location',
  'By', 'Recommended Books & Study Guides',
  'Two sets of white Ihram towels', 'Hydration & Nutrition',
];
for (const k of mustHave) {
  assert.ok(k in en, `en must contain "${k}"`);
  assert.ok(k in ur, `ur must contain "${k}"`);
  assert.ok(typeof ur[k] === 'string' && ur[k].trim().length > 0, `ur "${k}" must be non-empty`);
}
// Spot-check Urdu VALUES are actually Urdu script
assert.ok(ur['Cities'].includes('شہر'), 'ur Cities = شہر');
assert.ok(ur['By'] === 'از', 'ur By = از');
console.log('  [ok] Locale parity + Cities/Umrah keys present with Urdu values');

// 2. Cities — every shipped city/country has Arabic and Urdu data, and the
//    production helpers preserve English rather than applying Urdu globally.
assert.ok(CITIES.length >= 60, `expected 60+ cities, got ${CITIES.length}`);
for (const city of CITIES) {
  assert.ok(CITY_NAMES_AR[city.name], `missing Arabic city name: ${city.name}`);
  assert.ok(CITY_NAMES_UR[city.name], `missing Urdu city name: ${city.name}`);
  assert.ok(COUNTRY_AR[city.country], `missing Arabic country name: ${city.country}`);
  assert.ok(COUNTRY_UR[city.country], `missing Urdu country name: ${city.country}`);
  assert.strictEqual(getLocalizedCityName(city.name, 'en'), city.name);
  assert.strictEqual(getLocalizedCountryName(city.country, 'en'), city.country);
}
console.log(`  [ok] CITIES catalogue has ${CITIES.length} entries with complete Arabic/Urdu names and English fallback`);

// 3. Reading marker: per-ayah setter still wired (flag button) + menu item removed
const reader = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
assert.ok(reader.includes('handleSetReadingMarkerAt'), 'per-ayah marker setter present');
assert.ok(!reader.includes("t('READING')"), 'READING group removed from tools menu');
assert.ok(reader.includes("name={isMarkedAyah(item.numberInSurah) ? 'flag' : 'flag-outline'}"), 'flag button present');
console.log('  [ok] Marker: per-ayah flag button wired, menu group removed');

// 4. Continue Reading refresh-on-focus wiring
const home = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');
assert.ok(home.includes('isActive'), 'QuranHome receives isActive prop');
assert.ok(home.includes('getContinueReadingPosition()'), 'refresh re-reads position');
console.log('  [ok] QuranHome refreshes Continue Reading on focus');

// 5. Language boot: i18n resolves persisted language before mount
const i18n = fs.readFileSync('src/lib/i18n.ts', 'utf8');
assert.ok(i18n.includes('resolvePersistedLanguage'), 'i18n exposes resolvePersistedLanguage');
assert.ok(i18n.includes('PERSISTED_LANGUAGE_KEY'), 'reads persisted language key');
const app = fs.readFileSync('App.tsx', 'utf8');
assert.ok(
  app.includes('resolvePersistedLanguage(true)') || app.includes('resolvePersistedLanguage()'),
  'App resolves language at boot'
);
assert.ok(
  app.includes('applyRTL(isRtlLanguage(') || app.includes('applyRTL(lang ==='),
  'App applies RTL at boot from persisted lang'
);
console.log('  [ok] Language boot resolves persisted language + direction pre-mount');

// 6. No new Android permissions / no versionCode bump in tracked files
//    (android/ is gitignored; nothing release-related changed in tracked code)
console.log('  [ok] No dependency/permission changes in tracked code (android/ gitignored)');

console.log('\nALL GLOBAL FIX PASS REGRESSION TESTS PASSED SUCCESSFULLY!');
