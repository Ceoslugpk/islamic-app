import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== UI REDESIGN FUNCTIONALITY GUARD ===\n');

// 1. Navigation Route Names & Top-Level Router Union Contract
console.log('--- 1. Navigation Route Names & Screen Unions ---');
const appTsx = fs.readFileSync('App.tsx', 'utf8');

const tabKeys = ['home', 'quran', 'library', 'tools'];
for (const tab of tabKeys) {
  assert.ok(appTsx.includes(`'${tab}'`), `App.tsx must preserve tab '${tab}'`);
}

const libraryScreens = [
  'hub', 'tasbih', 'names', 'names-prophet', 'duas', 'hadith',
  'ramadan-guide', 'prayer-guide', 'shahada', 'downloads',
  'vocab', 'summary', 'tajweed',
];
for (const screen of libraryScreens) {
  assert.ok(appTsx.includes(`{ screen: '${screen}'`), `App.tsx LibraryView must preserve screen '${screen}'`);
}

const quranScreens = [
  'home', 'reader', 'audio', 'tafsir', 'topics', 'compare',
  'bookmarks', 'notes', 'plans', 'hifz',
];
for (const screen of quranScreens) {
  assert.ok(appTsx.includes(`{ screen: '${screen}'`), `App.tsx QuranView must preserve screen '${screen}'`);
}

const toolsScreens = [
  'hub', 'qibla', 'tracker', 'location', 'cities', 'notifications',
  'prayer-reminders', 'fasting', 'zakat', 'calendar', 'mosque',
  'women-cycle', 'women-purity', 'women-guidance', 'women-qada',
  'umrah-guide', 'umrah-resources', 'hajj-journey', 'makkah-live',
  'madinah-live', 'hajj-live',
];
for (const screen of toolsScreens) {
  assert.ok(appTsx.includes(`{ screen: '${screen}'`), `App.tsx ToolsView must preserve screen '${screen}'`);
}

assert.ok(appTsx.includes('export function isTopLevelScreen'), 'App.tsx must export isTopLevelScreen');
console.log('  ✓ Navigation route names: TabKey, LibraryView, QuranView, ToolsView, and isTopLevelScreen verified');

// 2. Storage Keys
console.log('\n--- 2. Storage Keys ---');
const settingsTsx = fs.readFileSync('src/lib/settings.tsx', 'utf8');
assert.ok(settingsTsx.includes("const STORAGE_KEY = 'islamic-settings'"), "Settings storage key 'islamic-settings' preserved");

const onboardingStateTs = fs.readFileSync('src/lib/onboardingState.ts', 'utf8');
assert.ok(onboardingStateTs.includes("export const ONBOARDING_DONE_KEY = 'onboardingDone'"), "Onboarding storage key 'onboardingDone' preserved");

const continuingTs = fs.readFileSync('src/lib/continuing.ts', 'utf8');
assert.ok(continuingTs.includes("const STORAGE_KEY = 'quran-last-reading'"), "Reading storage key 'quran-last-reading' preserved");
assert.ok(continuingTs.includes("const MARKER_KEY = 'quran-reading-marker'"), "Reading marker storage key 'quran-reading-marker' preserved");

const quranAudioTs = fs.readFileSync('src/lib/quranAudio.ts', 'utf8');
assert.ok(quranAudioTs.includes("export const AUDIO_TRANSLATION_EDITION_KEY = 'quran-audio-translation-edition'"), "Audio edition storage key preserved");
console.log('  ✓ Storage keys: islamic-settings, onboardingDone, quran-last-reading, quran-reading-marker, audio-translation verified');

// 3. Onboarding Screen Functional Anchors
console.log('\n--- 3. Onboarding Screen Functional Anchors ---');
const onboardingTsx = fs.readFileSync('src/screens/OnboardingScreen.tsx', 'utf8');
assert.ok(onboardingTsx.includes('handleGetStarted'), 'OnboardingScreen must preserve handleGetStarted');
assert.ok(onboardingTsx.includes('setQuranTranslationLanguage(selectedQuranLang)'), 'handleGetStarted must persist Quran translation language');
assert.ok(onboardingTsx.includes('setAudioTranslationEdition(selectedAudioId)'), 'handleGetStarted must persist Audio edition');
assert.ok(onboardingTsx.includes('setOnboardingDone(true)'), 'handleGetStarted must mark onboarding as done');
assert.ok(onboardingTsx.includes('setLanguage(selectedAppLang)'), 'handleGetStarted must persist app language via settings writer');
assert.ok(onboardingTsx.includes('prepareNativeLayoutDirection(selectedAppLang)'), 'handleGetStarted must prepare native layout direction on RTL switch');
assert.ok(onboardingTsx.includes('onComplete()'), 'handleGetStarted must call onComplete()');
assert.ok(onboardingTsx.includes("modalType === 'app'"), 'OnboardingScreen must wire app language picker');
assert.ok(onboardingTsx.includes("modalType === 'quran'"), 'OnboardingScreen must wire Quran translation picker');
assert.ok(onboardingTsx.includes("modalType === 'audio'"), 'OnboardingScreen must wire audio translation picker');
console.log('  ✓ Onboarding functional anchors: state, storage persistence, RTL layout direction, and modals verified');

// 4. Language-Switch Queue + Serialized Writer Contract
console.log('\n--- 4. Language-Switch Queue & Writer Contract ---');
const settingsQueueTs = fs.readFileSync('src/lib/settingsWriteQueue.ts', 'utf8');
assert.ok(settingsQueueTs.includes('createSerializedSettingsWriter'), 'settingsWriteQueue must export createSerializedSettingsWriter');
assert.ok(settingsTsx.includes('createSerializedSettingsWriter'), 'settings.tsx must use createSerializedSettingsWriter');
console.log('  ✓ Language-switch serialized writer queue verified');

// 5. Quran Reader Modes & Display Ranges
console.log('\n--- 5. Quran Reader Modes & Display Ranges ---');
assert.ok(settingsTsx.includes("export type QuranScript = 'uthmani' | 'imlaei' | 'indopak' | 'tajweed'"), 'QuranScript union intact');
assert.ok(settingsTsx.includes('export function clampQuranFontSize'), 'clampQuranFontSize intact');
assert.ok(settingsTsx.includes('export function clampQuranLineHeight'), 'clampQuranLineHeight intact');
assert.ok(settingsTsx.includes('QURAN_FONT_SIZE_MIN'), 'QURAN_FONT_SIZE_MIN defined');
assert.ok(settingsTsx.includes('QURAN_FONT_SIZE_MAX'), 'QURAN_FONT_SIZE_MAX defined');
assert.ok(settingsTsx.includes('QURAN_LINE_HEIGHT_MIN'), 'QURAN_LINE_HEIGHT_MIN defined');
assert.ok(settingsTsx.includes('QURAN_LINE_HEIGHT_MAX'), 'QURAN_LINE_HEIGHT_MAX defined');
console.log('  ✓ Quran reader modes, clamp helpers, and font ranges verified');

// 6. Continue Reading Target / Highlight Contracts
console.log('\n--- 6. Continue Reading Target & Highlight Contracts ---');
const readerTsx = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
assert.ok(readerTsx.includes('highlight') || readerTsx.includes('highlightTimer') || readerTsx.includes('highlightedAyah'), 'QuranReaderScreen preserves highlight mechanism');
assert.ok(continuingTs.includes('isValidReadingPosition'), 'continuing.ts exports isValidReadingPosition');
assert.ok(continuingTs.includes('getReadingMarkerSync'), 'continuing.ts exports getReadingMarkerSync');
assert.ok(continuingTs.includes('getReadingPositionSync'), 'continuing.ts exports getReadingPositionSync');
console.log('  ✓ Continue Reading targets, bounds validation, and highlight logic verified');

// 7. Prayer & Audio Playback Contracts
console.log('\n--- 7. Prayer & Audio Playback Contracts ---');
assert.ok(quranAudioTs.includes('export function addPlaybackStatusListener'), 'quranAudio exports addPlaybackStatusListener');
assert.ok(quranAudioTs.includes('export function getPlaybackStatus'), 'quranAudio exports getPlaybackStatus');
assert.ok(quranAudioTs.includes('export function getCurrentPlayback'), 'quranAudio exports getCurrentPlayback');
assert.ok(quranAudioTs.includes('export async function unload'), 'quranAudio exports unload');

const prayerTimesTs = fs.readFileSync('src/lib/prayerTimes.ts', 'utf8');
assert.ok(prayerTimesTs.includes('fetchPrayerTimes'), 'prayerTimes fetchPrayerTimes intact');
assert.ok(prayerTimesTs.includes('getNextPrayer'), 'prayerTimes getNextPrayer intact');
console.log('  ✓ Prayer & audio playback handler contracts verified');

console.log('\n========================================');
console.log('ALL FUNCTIONALITY GUARD TESTS PASSED!');
console.log('========================================\n');
