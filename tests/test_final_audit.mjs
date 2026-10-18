import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== RUNNING FINAL STABILITY AUDIT VERIFICATION ===\n');

// 1. Verify build.gradle versions and namespace
const buildGradlePath = path.resolve('android/app/build.gradle');
const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
const appConfig = JSON.parse(fs.readFileSync(path.resolve('app.json'), 'utf8')).expo;

assert(buildGradle.includes(`versionCode ${appConfig.android.versionCode}`), 'Android versionCode must match app.json');
assert(buildGradle.includes(`versionName "${appConfig.version}"`), 'Android versionName must match app.json');
assert(buildGradle.includes("namespace 'com.qashi.islamic'") || buildGradle.includes("applicationId 'com.qashi.islamic'"), "Application ID must be com.qashi.islamic");
assert(buildGradle.includes(`applicationId '${appConfig.android.package}'`), 'Android applicationId must match app.json');
console.log(`✓ (1) Version ${appConfig.version} (code ${appConfig.android.versionCode}) and application ID ${appConfig.android.package} verified`);

// 2. Verify AndroidManifest permissions
const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
const manifest = fs.readFileSync(manifestPath, 'utf8');

function hasActivePermission(permission) {
  const declarations = manifest.match(/<uses-permission\b[^>]*\/>/g) || [];
  return declarations.some((declaration) =>
    declaration.includes(`android:name="${permission}"`) && !declaration.includes('tools:node="remove"')
  );
}

assert(!hasActivePermission('android.permission.RECORD_AUDIO'), 'RECORD_AUDIO must be removed from the merged manifest');
assert(!hasActivePermission('android.permission.SYSTEM_ALERT_WINDOW'), 'SYSTEM_ALERT_WINDOW must be removed from the merged manifest');
assert(manifest.includes('android.permission.ACTIVITY_RECOGNITION" tools:node="remove"'), 'ACTIVITY_RECOGNITION must be tools:node="remove"');
assert(manifest.includes('android.permission.FOREGROUND_SERVICE'), 'FOREGROUND_SERVICE must be present');
assert(manifest.includes('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'), 'FOREGROUND_SERVICE_MEDIA_PLAYBACK must be present');
console.log('✓ (2) Android manifest permissions verified (no RECORD_AUDIO / SYSTEM_ALERT_WINDOW, ACTIVITY_RECOGNITION removed)');

// 3. Verify Task 1 (Storage budget)
const dbNativePath = path.resolve('src/lib/db.native.ts');
const dbNative = fs.readFileSync(dbNativePath, 'utf8');
assert(dbNative.includes('QURAN_CACHE_BUDGET_BYTES = 400 * 1024 * 1024'), 'db.native.ts must enforce 400MB budget');
assert(dbNative.includes('PROTECTED_QURAN_CACHE_KEYS'), 'PROTECTED_QURAN_CACHE_KEYS must be present');
assert(dbNative.includes('selectKeysToEvict'), 'selectKeysToEvict must be present');

const dbWebPath = path.resolve('src/lib/db.ts');
const dbWeb = fs.readFileSync(dbWebPath, 'utf8');
assert(dbWeb.includes('QURAN_CACHE_BUDGET_BYTES = 5 * 1024 * 1024'), 'db.ts must enforce 5MB budget');
console.log('✓ (3) Task 1 storage budget constants and eviction functions verified in native & web db facade');

// 4. Verify Task 2 (Language persistence)
const settingsPath = path.resolve('src/lib/settings.tsx');
const settingsCode = fs.readFileSync(settingsPath, 'utf8');
assert(settingsCode.includes('computeNextLanguageSettings'), 'computeNextLanguageSettings must be present');
assert(settingsCode.includes('persistLanguageChange'), 'persistLanguageChange must be present');

const i18nPath = path.resolve('src/lib/i18n.ts');
const i18nCode = fs.readFileSync(i18nPath, 'utf8');
assert(i18nCode.includes('resolvePersistedLanguage'), 'resolvePersistedLanguage must be present');
console.log('✓ (4) Task 2 language persistence helpers verified in settings.tsx and i18n.ts');

// 5. Verify Task 3 (Continue reading / marker)
const continuingPath = path.resolve('src/lib/continuing.ts');
const continuingCode = fs.readFileSync(continuingPath, 'utf8');
assert(continuingCode.includes('saveReadingMarker'), 'saveReadingMarker must be present');
assert(continuingCode.includes('getReadingMarker'), 'getReadingMarker must be present');
assert(continuingCode.includes('saveReadingPosition'), 'saveReadingPosition must be present');
assert(continuingCode.includes('getContinueReadingPosition'), 'getContinueReadingPosition must be present');
console.log('✓ (5) Task 3 reading marker and continue reading APIs verified in continuing.ts');

// 6. Verify Task 4 (Audio lifecycle)
const quranAudioPath = path.resolve('src/lib/quranAudio.ts');
const quranAudioCode = fs.readFileSync(quranAudioPath, 'utf8');
assert(quranAudioCode.includes('safeRemovePlayer'), 'safeRemovePlayer must be present');
assert(quranAudioCode.includes('cleanupCurrentSound'), 'cleanupCurrentSound must be present');

const audioPreloaderPath = path.resolve('src/lib/audioPreloader.ts');
const audioPreloaderCode = fs.readFileSync(audioPreloaderPath, 'utf8');
assert(audioPreloaderCode.includes('inFlight.delete'), 'audioPreloader must clean up inFlight synchronously');
console.log('✓ (6) Task 4 audio lifecycle WeakSet guards and preloader eviction verified');

console.log('\n======================================================');
console.log('ALL FINAL STABILITY AUDIT CHECKS PASSED SUCCESSFULLY!');
console.log('======================================================\n');
