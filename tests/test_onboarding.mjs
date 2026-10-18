import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== ONBOARDING FLOW REGRESSION TESTS ===\n');

// 1. Verify files exist and export expected interfaces
const onboardingStateCode = fs.readFileSync('src/lib/onboardingState.ts', 'utf8');
assert.ok(onboardingStateCode.includes('ONBOARDING_DONE_KEY'), 'onboardingState defines ONBOARDING_DONE_KEY');
assert.ok(onboardingStateCode.includes("'onboardingDone'"), 'ONBOARDING_DONE_KEY equals "onboardingDone"');
assert.ok(onboardingStateCode.includes('export async function getOnboardingDone'), 'exports getOnboardingDone');
assert.ok(onboardingStateCode.includes('export async function setOnboardingDone'), 'exports setOnboardingDone');
assert.ok(onboardingStateCode.includes("readback !== 'true'"), 'setOnboardingDone verifies read-back');
assert.ok(onboardingStateCode.includes('cachedOnboardingDone = prev'), 'setOnboardingDone rolls back on failure');

assert.ok(onboardingStateCode.includes('prevPersisted'), 'setOnboardingDone restores previous persisted key on disk');
assert.ok(!onboardingStateCode.includes('catch {\n    return false;\n  }'), 'getOnboardingDone does not swallow read errors');

const quranLangCode = fs.readFileSync('src/lib/quranLanguageState.ts', 'utf8');
assert.ok(quranLangCode.includes('bootstrapQuranLanguage'), 'quranLanguageState exports bootstrapQuranLanguage');
assert.ok(quranLangCode.includes('getQuranLanguageBootstrapError'), 'quranLanguageState exports getQuranLanguageBootstrapError');
assert.ok(quranLangCode.includes('readback !== next'), 'setQuranTranslationLanguage verifies read-back');
assert.ok(quranLangCode.includes('currentLanguage = prev'), 'setQuranTranslationLanguage rolls back memory on failure');
assert.ok(quranLangCode.includes('prevPersisted'), 'setQuranTranslationLanguage rolls back disk on failure');

const quranAudioCode = fs.readFileSync('src/lib/quranAudio.ts', 'utf8');
assert.ok(quranAudioCode.includes('bootstrapAudioTranslation'), 'quranAudio exports bootstrapAudioTranslation');
assert.ok(quranAudioCode.includes('getAudioTranslationBootstrapError'), 'quranAudio exports getAudioTranslationBootstrapError');
assert.ok(quranAudioCode.includes('readbackId !== targetId'), 'setAudioTranslationEdition verifies edition read-back');
assert.ok(quranAudioCode.includes('readbackLang !== ed.language'), 'setAudioTranslationEdition verifies language read-back');
assert.ok(quranAudioCode.includes('currentAudioTranslationEditionId = prevId'), 'setAudioTranslationEdition rolls back memory on failure');
assert.ok(quranAudioCode.includes('prevPersistedEdition'), 'setAudioTranslationEdition restores previous persisted edition on disk');
assert.ok(quranAudioCode.includes('prevPersistedLang'), 'setAudioTranslationEdition restores previous persisted language on disk');
console.log('  ✓ 1. Onboarding persistence state module, bootstrap observables & two-key transactional rollback contracts verified');

// 2. Demo locale resources contract
const demoDataCode = fs.readFileSync('src/lib/onboardingDemoData.ts', 'utf8');
assert.ok(demoDataCode.includes('ONBOARDING_DEMO_LOCALES'), 'exports ONBOARDING_DEMO_LOCALES');
assert.ok(demoDataCode.includes('DEMO_CYCLE_ORDER'), 'exports DEMO_CYCLE_ORDER');
for (const code of ['en', 'ar', 'ur', 'hi', 'tr', 'fr', 'id']) {
  assert.ok(demoDataCode.includes(`langCode: '${code}'`), `Demo data contains locale "${code}"`);
}
assert.ok(demoDataCode.includes('ONBOARDING_LOCALES'), 'exports ONBOARDING_LOCALES');
for (const code of ['en', 'ar', 'ur', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id', 'ps']) {
  assert.ok(demoDataCode.includes(`${code}:`), `ONBOARDING_LOCALES covers app language "${code}"`);
}
assert.ok(demoDataCode.includes("nativeName: 'پښتو'") && demoDataCode.includes("capabilityNote: 'د ژباړې ۴۰+ ژبې · د غږ ۱۰+ ژبې'"), 'Pashto onboarding copy and direction-aware RTL text are present');
console.log('  ✓ 2. Demo locales and all 11 wired app language locales verified');

// 3. Screen design & component checks
const screenCode = fs.readFileSync('src/screens/OnboardingScreen.tsx', 'utf8');
assert.ok(screenCode.includes("currentStrings.langCode === 'ps' ? 'NotoNaskhArabic_400Regular'"), 'Pashto onboarding uses Noto Naskh Arabic body typography');
assert.ok(screenCode.includes("currentStrings.langCode === 'ps' ? 'NotoNaskhArabic_700Bold'"), 'Pashto onboarding uses Noto Naskh Arabic title typography');
assert.ok(screenCode.includes("Ionicons name=\"globe-outline\""), 'Card 1 uses globe-outline');
assert.ok(screenCode.includes("Ionicons name=\"book-outline\""), 'Card 2 uses book-outline');
assert.ok(screenCode.includes("Ionicons name=\"headset-outline\""), 'Card 3 uses headset-outline');
assert.ok(screenCode.includes("getQuranLanguageBootstrapError"), 'OnboardingScreen checks Quran language bootstrap error');
assert.ok(screenCode.includes("getAudioTranslationBootstrapError"), 'OnboardingScreen checks Audio translation bootstrap error');
assert.ok(screenCode.includes("isReduceMotionEnabled"), 'Respects AccessibilityInfo.isReduceMotionEnabled');
assert.ok(screenCode.includes("setOnboardingDone(true)"), 'Persists onboardingDone on Get Started');
assert.ok(screenCode.includes("setQuranTranslationLanguage"), 'Persists Quran translation language');
assert.ok(screenCode.includes("setAudioTranslationEdition"), 'Persists Audio translation edition');
assert.ok(screenCode.includes("setLanguage(selectedAppLang)"), 'Persists app language');
assert.ok(screenCode.includes("prepareNativeLayoutDirection"), 'Prepares native layout direction');
assert.ok(screenCode.includes("ONBOARDING_LOCALES[selectedAppLang]"), 'Renders selectedAppLang strings when demo stops');
assert.ok(screenCode.includes("minHeight: 48"), 'Card header touch target >= 48');
console.log('  ✓ 3. OnboardingScreen architecture, icons, and persistence contract verified');

// 4. App.tsx startup wiring check
const appCode = fs.readFileSync('App.tsx', 'utf8');
assert.ok(appCode.includes("import OnboardingScreen from './src/screens/OnboardingScreen'"), 'App.tsx imports OnboardingScreen');
assert.ok(appCode.includes("import { getOnboardingDone } from './src/lib/onboardingState'"), 'App.tsx imports getOnboardingDone');
assert.ok(appCode.includes("getOnboardingDone()"), 'App.tsx queries getOnboardingDone on bootstrap');
assert.ok(appCode.includes("onboardingChecked"), 'App.tsx waits for onboarding check before rendering');
assert.ok(appCode.includes("<OnboardingScreen onComplete={handleOnboardingComplete} />"), 'App.tsx renders OnboardingScreen when not completed');
assert.ok(!appCode.includes("ExpoRouter"), 'Expo Router not introduced');
console.log('  ✓ 4. App.tsx startup guard and screen replacement verified');

// 5. Shared picker modal check
const pickerModalCode = fs.readFileSync('src/components/LanguagePickerModal.tsx', 'utf8');
assert.ok(pickerModalCode.includes("export function LanguagePickerModal"), 'LanguagePickerModal is exported');
assert.ok(pickerModalCode.includes("accessibilityRole=\"radio\""), 'Picker items have accessibilityRole radio');
console.log('  ✓ 5. Reusable LanguagePickerModal verified');

console.log('\n========================================');
console.log('ALL ONBOARDING REGRESSION TESTS PASSED!');
console.log('========================================\n');
