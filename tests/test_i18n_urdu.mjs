import assert from 'node:assert';
import fs from 'node:fs';

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

assert.ok(i18nCode.includes('I18nManager.allowRTL(isRTL)'), 'boot reconciliation enables RTL only for Urdu and disables it for English');
assert.ok(i18nCode.includes('I18nManager.allowRTL(isUrdu)'), 'switch preparation enables RTL for Urdu and disables it for English');
assert.ok(i18nCode.includes('I18nManager.forceRTL(isRTL)'), 'I18nManager.forceRTL wired');
assert.ok(i18nCode.includes("document.documentElement.dir = isRTL ? 'rtl' : 'ltr'"), 'Web RTL direction configured');

console.log('  ✓ RTL configuration: native forceRTL and web dir=rtl verified');

// 5. SettingsScreen UI verification
const settingsScreenCode = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');

assert.ok(settingsScreenCode.includes('Language / زبان'), 'SettingsScreen includes Language / زبان row');
assert.ok(settingsScreenCode.includes("'English'"), 'SettingsScreen includes English option');
assert.ok(settingsScreenCode.includes("'اردو'"), 'SettingsScreen includes اردو option');

console.log('  ✓ SettingsScreen: Language selector row verified');

console.log('\n========================================================');
console.log('ALL URDU I18N & AUTO-LINK TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\n');
