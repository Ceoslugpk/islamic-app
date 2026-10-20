import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertRealI18nLayoutDirectionContract } from './i18n_layout_direction_contract.mjs';

const read = (path) => fs.readFileSync(path, 'utf8');
const en = JSON.parse(read('src/locales/en.json'));
const ps = JSON.parse(read('src/locales/ps.json'));
const i18n = read('src/lib/i18n.ts');
const settings = read('src/screens/SettingsScreen.tsx');
const app = read('App.tsx');

console.log('=== RTL LANGUAGE DIRECTION AND PASHTO COVERAGE ===');

assert.ok(i18n.includes("['ur', 'ar', 'ps'].some"), 'Urdu, Arabic, and Pashto must share RTL detection');
assertRealI18nLayoutDirectionContract();
assert.ok(app.includes('resolvePersistedLanguage(true)') && app.includes('applyRTL(isRtlLanguage(lang))'), 'Cold boot must apply direction from the persisted app language before rendering');
assert.ok(read('android/app/src/main/AndroidManifest.xml').includes('android:supportsRtl="true"'), 'Android manifest must allow RTL layouts');

assert.ok(settings.includes("reloadAppAsync('App language changed')"), 'Language changes must use the Expo core reload in release builds');
assert.ok(!settings.includes('Updates.reloadAsync()'), 'Language switching must not depend on expo-updates');
assert.ok(settings.indexOf('prepareNativeLayoutDirection(nextLang)') < settings.indexOf("reloadAppAsync('App language changed')"), 'Persist and prepare direction before reload');
assert.ok(settings.includes('setIsSwitchingLanguage(false);') && settings.includes('setSwitchingTargetLang(null);'), 'Failed reload must unlock the language picker for another attempt');

// Native Yoga mirrors regular rows for RTL. Conditional row-reverse styles on
// those same rows cancel the native direction and keep menus in LTR order.
const nativeRows = [
  'src/components/layout/FloatingNav.tsx',
  'src/components/layout/AppHeader.tsx',
  'src/components/layout/SubHeader.tsx',
  'src/components/layout/SheetHeader.tsx',
  'src/components/layout/ReaderHeader.tsx',
  'src/components/ScreenHeader.tsx',
  'src/components/ui/SearchField.tsx',
  'src/components/ui/ScreenTabs.tsx',
  'src/components/CompactPrayerBar.tsx',
  'src/components/LanguagePickerModal.tsx',
  'src/components/QuranLanguageModal.tsx',
  'src/screens/QuranHomeScreen.tsx',
];
for (const path of nativeRows) {
  const source = read(path);
  assert.ok(!source.includes('row-reverse'), `${path} must not cancel native RTL mirroring`);
}
assert.ok(read('src/lib/rtl.ts').includes('hScrollRTLStyle'), 'Horizontal scroll rails keep their dedicated RTL behavior');
const onboarding = read('src/screens/OnboardingScreen.tsx');
assert.ok(onboarding.includes("direction: isDemoRtl ? 'rtl' : 'ltr'") && !onboarding.includes('row-reverse'), 'Onboarding preview must set its own language direction without double reversing rows');

assert.deepEqual(Object.keys(ps), Object.keys(en), 'Pashto must keep exact locale key parity');
const allowedEnglishIdentifiers = new Set(['KFGQPC', 'MIT', 'OFL 1.1', 'TanStack-Free', 'YYYY-MM-DD']);
const untranslated = Object.keys(en).filter((key) => ps[key] === en[key] && !allowedEnglishIdentifiers.has(key));
assert.deepEqual(untranslated, [], 'Only product/license/date identifiers may remain in English in Pashto');
assert.ok(Object.values(ps).every((value) => !value.includes('YYYYY') && !value.includes('MM - DD')), 'Pashto date examples must preserve YYYY-MM-DD exactly');

console.log('✓ RTL cold boot, switching, menu mirroring, and Pashto locale coverage verified');
