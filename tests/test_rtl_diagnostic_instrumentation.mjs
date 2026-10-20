import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (p) => fs.readFileSync(p, 'utf8');

function loadTsModule(filePath, mocks = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;

  const exportsObj = {};
  const moduleObj = { exports: exportsObj };
  const sandbox = {
    module: moduleObj,
    exports: exportsObj,
    require: (id) => mocks[id] || {},
    console,
    process,
    Set,
    Map,
    Promise,
    Error,
    String,
    Boolean,
    Array,
    Object,
    Math,
    Date,
    JSON,
    URL,
    Blob: typeof Blob !== 'undefined' ? Blob : class {},
    document: typeof document !== 'undefined' ? document : undefined,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(transpiled, sandbox);
  return moduleObj.exports;
}

console.log('=== FOCUSED RTL & STRUCTURAL DIAGNOSTIC INSTRUMENTATION SUITE ===\n');

// -----------------------------------------------------------------------------
// 1. Diagnostic Identity Gate & Leaked Env Protection
// -----------------------------------------------------------------------------
console.log('--- 1. Diagnostic Identity Gate & Leaked Env Protection ---');

process.env.NODE_ENV = 'test';

const diagConfigSrc = read('src/lib/diagnostic/diagnosticConfig.ts');
const settingsSrc = read('src/screens/SettingsScreen.tsx');
const quranHomeSrc = read('src/screens/QuranHomeScreen.tsx');
const downloadsSrc = read('src/screens/DownloadsScreen.tsx');
const prayerRemindersSrc = read('src/screens/PrayerRemindersScreen.tsx');
const boundarySrc = read('src/lib/diagnostic/index.ts');

const diagConfig = loadTsModule('src/lib/diagnostic/diagnosticConfig.ts');
const {
  DIAGNOSTIC_BUILD_ID,
  DIAGNOSTIC_VERSION,
  DIAGNOSTIC_VERSION_CODE,
  DIAGNOSTIC_BUILD_COMMAND,
  ORDINARY_RELEASE_BUILD_COMMAND,
  IS_DIAGNOSTIC_COMPILE_TIME,
  evaluateDiagnosticGate,
  isDiagnosticModeEnabled,
  setDiagnosticModeOverride,
} = diagConfig;

// Test the 4 gate combinations required by QA:
// Case A: normal release / off (env: off/unset, identity: normal/unset) -> false
assert.equal(
  evaluateDiagnosticGate(undefined, undefined),
  false,
  'Gate must return false when env is unset and identity is unset'
);
assert.equal(
  evaluateDiagnosticGate('0', undefined),
  false,
  'Gate must return false when env is 0 and identity is unset'
);

// Case B: normal release / env-on (LEAKED ENV DEFENSE) -> MUST BE FALSE!
assert.equal(
  evaluateDiagnosticGate('1', undefined),
  false,
  'Gate must return false if EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 leaks into normal release'
);
assert.equal(
  evaluateDiagnosticGate('1', 'production-release'),
  false,
  'Gate must return false if EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 is paired with non-diagnostic build identity'
);

// Case C: diagnostic identity / env-off -> false
assert.equal(
  evaluateDiagnosticGate(undefined, DIAGNOSTIC_BUILD_ID),
  false,
  'Gate must return false when diagnostic identity is present but env flag is off'
);
assert.equal(
  evaluateDiagnosticGate('0', DIAGNOSTIC_BUILD_ID),
  false,
  'Gate must return false when diagnostic identity is present but env flag is 0'
);

// Case D: diagnostic identity / env-on -> TRUE!
assert.equal(
  evaluateDiagnosticGate('1', DIAGNOSTIC_BUILD_ID),
  true,
  'Gate must return true ONLY when BOTH diagnostic identity and EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 are present'
);

// Verify with environment variables directly on isDiagnosticModeEnabled()
const originalEnvDiagnostic = process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC;
const originalEnvBuildId = process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID;

try {
  setDiagnosticModeOverride(null);

  // 1. Unset / normal
  delete process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC;
  delete process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID;
  assert.equal(isDiagnosticModeEnabled(), false);

  // 2. Leaked flag without diagnostic build ID
  process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC = '1';
  delete process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID;
  assert.equal(isDiagnosticModeEnabled(), false, 'Leaked flag must not enable diagnostics');

  // 3. Build ID set but flag off
  delete process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC;
  process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID = DIAGNOSTIC_BUILD_ID;
  assert.equal(isDiagnosticModeEnabled(), false, 'Build ID alone must not enable diagnostics');

  // 4. Both set
  process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC = '1';
  process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID = DIAGNOSTIC_BUILD_ID;
  assert.equal(isDiagnosticModeEnabled(), true, 'Both flag and build ID must enable diagnostics');
} finally {
  if (originalEnvDiagnostic !== undefined) {
    process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC = originalEnvDiagnostic;
  } else {
    delete process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC;
  }
  if (originalEnvBuildId !== undefined) {
    process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID = originalEnvBuildId;
  } else {
    delete process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID;
  }
  setDiagnosticModeOverride(null);
}

// Verify SettingsScreen gating in source
assert.ok(
  settingsSrc.includes('isDiagnosticModeEnabled()') &&
    settingsSrc.includes('testID="open-rtl-diagnostics-row"') &&
    settingsSrc.includes('testID="diagnostic-build-id"'),
  'SettingsScreen must conditionally render diagnostic build ID and open button'
);
assert.ok(
  settingsSrc.includes('<GatedDiagnosticModal') &&
    settingsSrc.includes('isDiagnosticModeEnabled()'),
  'GatedDiagnosticModal must be gated behind isDiagnosticModeEnabled()'
);

console.log('  ✓ Two-factor gate passed: Normal release/off, normal release/env-on (leaked env), identity/env-off, and identity/env-on all verified');

// -----------------------------------------------------------------------------
// 2. Ordinary-Build Absence, Guarded Boundary & Static Source Verification
// -----------------------------------------------------------------------------
console.log('\n--- 2. Ordinary-Build Absence, Guarded Boundary & Static Source Verification ---');

// 2a. Boundary isolation: Screens MUST NOT import RtlDiagnosticModal directly
assert.ok(
  !settingsSrc.includes("from '../components/diagnostic/RtlDiagnosticModal'"),
  'SettingsScreen must not directly import RtlDiagnosticModal'
);
assert.ok(
  !quranHomeSrc.includes("from '../components/diagnostic/RtlDiagnosticModal'"),
  'QuranHomeScreen must not directly import RtlDiagnosticModal'
);
assert.ok(
  !downloadsSrc.includes("from '../components/diagnostic/RtlDiagnosticModal'"),
  'DownloadsScreen must not directly import RtlDiagnosticModal'
);
assert.ok(
  !prayerRemindersSrc.includes("from '../components/diagnostic/RtlDiagnosticModal'"),
  'PrayerRemindersScreen must not directly import RtlDiagnosticModal'
);

// All screens route through the single guarded boundary
assert.ok(
  settingsSrc.includes("from '../lib/diagnostic'"),
  'SettingsScreen must import through single guarded boundary ../lib/diagnostic'
);
assert.ok(
  quranHomeSrc.includes("from '../lib/diagnostic'"),
  'QuranHomeScreen must import through single guarded boundary ../lib/diagnostic'
);
assert.ok(
  downloadsSrc.includes("from '../lib/diagnostic'"),
  'DownloadsScreen must import through single guarded boundary ../lib/diagnostic'
);
assert.ok(
  prayerRemindersSrc.includes("from '../lib/diagnostic'"),
  'PrayerRemindersScreen must import through single guarded boundary ../lib/diagnostic'
);

// 2b. GatedDiagnosticModal component boundary renders null when gate is off
const boundaryModule = loadTsModule('src/lib/diagnostic/index.ts', {
  react: { createElement: (type, props) => ({ type, props }) },
  './diagnosticConfig': diagConfig,
  './diagnosticState': {
    useDiagnosticTarget: () => ({ isDiagnostic: false, parentProps: {}, targetProps: {} }),
  },
  './diagnosticI18n': { diagT: (k) => k },
  '../../components/diagnostic/RtlDiagnosticModal': { RtlDiagnosticModal: () => ({ type: 'modal' }) },
});

setDiagnosticModeOverride(false);
const renderedWhenOff = boundaryModule.GatedDiagnosticModal({ visible: true, onClose: () => {} });
assert.equal(
  renderedWhenOff,
  null,
  'GatedDiagnosticModal must strictly return null when gate is false'
);

setDiagnosticModeOverride(true);
const renderedWhenOn = boundaryModule.GatedDiagnosticModal({ visible: true, onClose: () => {} });
assert.ok(
  renderedWhenOn !== null,
  'GatedDiagnosticModal must render modal element when gate is true'
);
setDiagnosticModeOverride(null);

// 2c. QuranHomeScreen: verify testIDs and callbacks are strictly conditional on isDiag
assert.ok(
  quranHomeSrc.includes("testID={item.number === 1 && isDiag ? 'quran-landing-surah-card' : undefined}") ||
    quranHomeSrc.includes("testID={isSurah1 && isDiag ? 'quran-landing-surah-card' : undefined}"),
  'Quran landing card testID must be absent when gate is off'
);
assert.ok(
  quranHomeSrc.includes("testID={isSurah1 && isDiag ? 'quran-landing-surah-card-text' : undefined}"),
  'Quran landing card text testID must be absent when gate is off'
);
assert.ok(
  quranHomeSrc.includes('onLayout={isSurah1 && isDiag ? diag.targetProps.onLayout : undefined}'),
  'Quran landing text onLayout must be undefined when gate is off'
);
assert.ok(
  quranHomeSrc.includes('onLayout={isSurah1 && isDiag ? diag.parentProps.onLayout : undefined}'),
  'Quran landing parent onLayout must be undefined when gate is off'
);

// 2d. DownloadsScreen: verify absence of unconditional wrappers and testIDs
assert.ok(
  !downloadsSrc.includes('emptyTextContainer'),
  'DownloadsScreen must not contain any diagnostic wrapper style or node (emptyTextContainer must be absent)'
);
assert.ok(
  downloadsSrc.includes('testID={isDiag ? "downloads-empty-cta-card" : undefined}'),
  'Downloads empty CTA card testID must be absent when gate is off'
);
assert.ok(
  downloadsSrc.includes('testID={isDiag ? "downloads-empty-cta-text" : undefined}'),
  'Downloads empty CTA text testID must be absent when gate is off'
);
assert.ok(
  downloadsSrc.includes('testID={isDiag ? "downloads-empty-cta-wrap" : undefined}'),
  'Downloads empty CTA wrap testID must be absent when gate is off'
);
assert.ok(
  downloadsSrc.includes('testID={isDiag ? "downloads-empty-cta-btn" : undefined}'),
  'Downloads empty CTA btn testID must be absent when gate is off'
);
assert.ok(
  downloadsSrc.includes('onLayout={isDiag ? (e: LayoutChangeEvent) => {') &&
    /onLayout=\{isDiag \? \(e: LayoutChangeEvent\) => \{[\s\S]*?\} : undefined\}/.test(downloadsSrc),
  'Downloads parent onLayout must be gated behind isDiag and collapse to undefined when the gate is off'
);
assert.ok(
  /onLayout=\{isDiag \? \(e(: LayoutChangeEvent)?\) => \{[\s\S]*?\} : undefined\}/.test(downloadsSrc),
  'Downloads target onLayout must be undefined when gate is off'
);

// 2e. PrayerRemindersScreen: verify testIDs and callbacks are strictly conditional on isDiag
assert.ok(
  prayerRemindersSrc.includes('testID={isDiag ? "prayer-reminders-selection-card" : undefined}'),
  'Prayer reminders card testID must be absent when gate is off'
);
assert.ok(
  prayerRemindersSrc.includes('testID={isDiag ? "prayer-reminders-selection-controls" : undefined}'),
  'Prayer reminders controls testID must be absent when gate is off'
);
assert.ok(
  prayerRemindersSrc.includes('testID={isDiag ? `prayer-reminders-chip-${item.value}` : undefined}'),
  'Prayer reminders chip testIDs must be absent when gate is off'
);
assert.ok(
  /onLayout=\{isDiag \? \(e(: LayoutChangeEvent)?\) => \{[\s\S]*?\} : undefined\}/.test(prayerRemindersSrc),
  'Prayer reminders parent onLayout must be undefined when gate is off'
);
assert.ok(
  /onLayout=\{isDiag \? \(e(: LayoutChangeEvent)?\) => \{[\s\S]*?\} : undefined\}/.test(prayerRemindersSrc),
  'Prayer reminders controls onLayout must be undefined when gate is off'
);

// 2f. MosqueFinderScreen: verify testIDs and callbacks are strictly conditional on isDiag
const mosqueFinderSrc = read('src/screens/MosqueFinderScreen.tsx');
assert.ok(
  mosqueFinderSrc.includes('testID={isDiag ? "mosque-finder-search-card" : undefined}'),
  'Mosque finder card testID must be absent when gate is off'
);
assert.ok(
  mosqueFinderSrc.includes('testID={isDiag ? "mosque-finder-search-controls" : undefined}'),
  'Mosque finder controls testID must be absent when gate is off'
);
assert.ok(
  /onLayout=\{isDiag \? \(e(: LayoutChangeEvent)?\) => \{[\s\S]*?\} : undefined\}/.test(mosqueFinderSrc),
  'Mosque finder parent onLayout must be undefined when gate is off'
);
assert.ok(
  /onLayout=\{isDiag \? \(e(: LayoutChangeEvent)?\) => \{[\s\S]*?\} : undefined\}/.test(mosqueFinderSrc),
  'Mosque finder controls onLayout must be undefined when gate is off'
);

// 2g. Document Metro bundler behavior honestly
assert.ok(
  diagConfigSrc.includes('NOTE ON METRO BUNDLER BEHAVIOR'),
  'diagnosticConfig must document Metro static bundler retention behavior honestly without false byte-level claims'
);

console.log('  ✓ Gated instrumentation & single guarded boundary verified: Zero diagnostic UI, wrappers, or layout probes attach when gate is off');

// -----------------------------------------------------------------------------
// 3. Build ID, Version Metadata & Build Command Propagation
// -----------------------------------------------------------------------------
console.log('\n--- 3. Build ID, Version Metadata & Build Command Propagation ---');

const packageJson = JSON.parse(read('package.json'));
const appJson = JSON.parse(read('app.json')).expo;
const buildGradle = read('android/app/build.gradle');

assert.equal(packageJson.version, '1.1.91', 'package.json version must be 1.1.91');
assert.equal(appJson.version, '1.1.91', 'app.json version must be 1.1.91');
assert.equal(appJson.android.versionCode, 110, 'app.json versionCode must be 110');
assert.equal(appJson.android.package, 'com.qashi.islamic', 'package ID must remain com.qashi.islamic');

assert.ok(buildGradle.includes('versionCode 110'), 'android/app/build.gradle versionCode must be 110');
assert.ok(buildGradle.includes('versionName "1.1.91"'), 'android/app/build.gradle versionName must be 1.1.91');
assert.ok(buildGradle.includes("applicationId 'com.qashi.islamic'"), 'applicationId must remain com.qashi.islamic');

assert.equal(DIAGNOSTIC_BUILD_ID, 'RTL-STRUCT-1.1.91-PROBE', 'DIAGNOSTIC_BUILD_ID must be RTL-STRUCT-1.1.91-PROBE');
assert.equal(DIAGNOSTIC_VERSION, '1.1.91', 'DIAGNOSTIC_VERSION must be 1.1.91');
assert.equal(DIAGNOSTIC_VERSION_CODE, 110, 'DIAGNOSTIC_VERSION_CODE must be 110');

// Verify deterministic build command marker
assert.ok(
  DIAGNOSTIC_BUILD_COMMAND.includes('cd android && EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID=RTL-STRUCT-1.1.91-PROBE'),
  'DIAGNOSTIC_BUILD_COMMAND must propagate EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 and EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID after cd android'
);
assert.ok(
  ORDINARY_RELEASE_BUILD_COMMAND.includes('cd android && ANDROID_HOME=/opt/android-sdk') &&
    !ORDINARY_RELEASE_BUILD_COMMAND.includes('EXPO_PUBLIC_ANDROID_DIAGNOSTIC'),
  'ORDINARY_RELEASE_BUILD_COMMAND must not include diagnostic flags'
);

console.log('  ✓ Version 1.1.91, versionCode 110, build ID, and Gradle command flag propagation verified');

// -----------------------------------------------------------------------------
// 4. Actual Rendered Style Probes & Native RTL Inspection
// -----------------------------------------------------------------------------
console.log('\n--- 4. Actual Rendered Style Probes & Native RTL Inspection ---');

let mockNativeRTL = false;
let mockShareResult = { action: 'sharedAction' };
let mockShareRejects = false;
let mockSharingRejects = false;
let mockSharingAvailable = true;
let mockFileWriteRejects = false;
let mockFileSystemDir = '/mock/cache/';

let mockLastSharingOptions = null;
let mockLastShareOptions = null;

const mockReactNative = {
  I18nManager: {
    get isRTL() {
      return mockNativeRTL;
    },
  },
  Platform: {
    OS: 'android',
  },
  Share: {
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
    share: async (options) => {
      mockLastShareOptions = options;
      if (mockShareRejects) throw new Error('Share dialog failed to launch');
      return mockShareResult;
    },
  },
  StyleSheet: {
    flatten: (styles) => {
      if (!styles) return {};
      if (Array.isArray(styles)) {
        return Object.assign({}, ...styles.filter(Boolean));
      }
      return styles;
    },
  },
};

const mockFileSystem = {
  get cacheDirectory() {
    return mockFileSystemDir;
  },
  get documentDirectory() {
    return mockFileSystemDir;
  },
  writeAsStringAsync: async () => {
    if (mockFileWriteRejects) throw new Error('Disk write permission denied');
  },
  getInfoAsync: async () => ({ exists: !mockFileWriteRejects }),
  EncodingType: { UTF8: 'utf8' },
};

const mockSharing = {
  isAvailableAsync: async () => mockSharingAvailable,
  shareAsync: async (filePath, options) => {
    mockLastSharingOptions = options;
    if (mockSharingRejects) throw new Error('Sharing failed to launch activity');
    // Android SharingModule.kt resolves with null on both completion and dismissal
    return null;
  },
};

const mockI18n = {
  default: { language: 'en' },
  isRTL: () => mockNativeRTL,
  t: (k) => k,
  getCurrentLanguage: () => 'en',
  isRtlLanguage: () => mockNativeRTL,
};

const diagI18nModule = loadTsModule('src/lib/diagnostic/diagnosticI18n.ts', {
  '../i18n': mockI18n,
});

const diagScreensModule = loadTsModule('src/lib/diagnostic/diagnosticScreens.ts', {});

const diagStateModule = loadTsModule('src/lib/diagnostic/diagnosticState.ts', {
  'react-native': mockReactNative,
  'expo-file-system/legacy': mockFileSystem,
  'expo-sharing': mockSharing,
  '../i18n': mockI18n,
  './diagnosticConfig': diagConfig,
  './diagnosticI18n': diagI18nModule,
  './diagnosticScreens': diagScreensModule,
});

const {
  resetDiagnosticMeasurements,
  recordParentLayout,
  recordTargetLayout,
  recordNamedLayout,
  recordNamedLayoutUnavailable,
  recordMeasurementUnavailable,
  invalidateDiagnosticTarget,
  getTargetMeasurement,
  getTargetMeasurements,
  buildDiagnosticReport,
  exportDiagnosticReport,
  useDiagnosticTarget,
} = diagStateModule;

// 4a. When gate is off, useDiagnosticTarget returns empty props and record functions are no-ops
setDiagnosticModeOverride(false);
const inactiveHook = useDiagnosticTarget('quran-landing-surah-card', {
  actualStyle: { textAlign: 'center' },
  targetTestId: 'quran-landing-surah-card-text',
  parentTestId: 'surah-row-1',
});
assert.equal(inactiveHook.isDiagnostic, false);
assert.equal(Object.keys(inactiveHook.parentProps).length, 0);
assert.equal(Object.keys(inactiveHook.targetProps).length, 0);

// Verify recordTargetLayout does nothing when gate is off
recordTargetLayout('quran-landing-surah-card', { width: 100, height: 50 }, { textAlign: 'center' });
assert.equal(getTargetMeasurement('quran-landing-surah-card').status, 'pending');

// 4b. Turn gate on for measurement verification
setDiagnosticModeOverride(true);
resetDiagnosticMeasurements();

// Verify initial state reports measurementUnavailable: true, nativeComputedStyleUnavailable: true
const initialTargets = getTargetMeasurements();
for (const item of initialTargets) {
  assert.equal(item.status, 'pending', `Initial target ${item.componentId} status must be pending`);
  assert.equal(item.measurementUnavailable, true);
  assert.equal(item.nativeComputedStyleUnavailable, true, 'Must explicitly flag native computed style as unavailable');
  assert.equal(item.overflowStatus, 'unavailable');
  assert.equal(item.clippingStatus, 'unavailable');
  assert.equal(item.resolvedStyleTextAlign, 'unavailable');
  assert.equal(item.resolvedStyleWritingDirection, 'unavailable');
}

// Target 1: Quran Surah 1 title text (style has no textAlign or writingDirection prop)
recordParentLayout('quran-landing-surah-card', { width: 360, height: 72 });
recordTargetLayout(
  'quran-landing-surah-card',
  { width: 180, height: 24 },
  { fontFamily: 'Manrope_700Bold', fontSize: 13.5 } // Exact style prop passed to AppText
);

const quranRecord = getTargetMeasurement('quran-landing-surah-card');
assert.equal(quranRecord.status, 'measured');
assert.equal(quranRecord.measurementUnavailable, false);
assert.equal(quranRecord.nativeComputedStyleUnavailable, true);
assert.equal(quranRecord.resolvedStyleTextAlign, 'unspecified', 'Unspecified style prop must report unspecified, not a fabricated natural/helper value');
assert.equal(quranRecord.resolvedStyleWritingDirection, 'unspecified');
assert.equal(quranRecord.resolvedContainerLayout.width, 180);
assert.equal(quranRecord.resolvedContainerLayout.height, 24);
assert.equal(quranRecord.parentLayout.width, 360);
assert.equal(quranRecord.parentLayout.height, 72);
assert.equal(quranRecord.overflowStatus, 'no_overflow');

// Target 2: Downloads empty title (style prop has explicit textAlign: 'center')
recordParentLayout('downloads-empty-cta-card', { width: 340, height: 200 });
recordTargetLayout(
  'downloads-empty-cta-card',
  { width: 280, height: 28 },
  { fontFamily: 'Cinzel_700Bold', fontSize: 18, textAlign: 'center' }
);

const downloadsRecord = getTargetMeasurement('downloads-empty-cta-card');
assert.equal(downloadsRecord.status, 'measured');
assert.equal(downloadsRecord.resolvedStyleTextAlign, 'center', 'Downloads empty text must report exact style prop textAlign: center');
assert.equal(downloadsRecord.resolvedStyleWritingDirection, 'unspecified');
assert.equal(downloadsRecord.resolvedContainerLayout.width, 280);
assert.equal(downloadsRecord.resolvedContainerLayout.height, 28);
assert.equal(downloadsRecord.parentLayout.width, 340);
assert.equal(downloadsRecord.parentLayout.height, 200);
assert.equal(downloadsRecord.overflowStatus, 'no_overflow');

// Target 3: Prayer Reminders controls (style prop is styles.segRow: flexDirection: 'row', gap: 8)
recordParentLayout('prayer-reminders-selection-controls', { width: 320, height: 120 });
recordTargetLayout(
  'prayer-reminders-selection-controls',
  { width: 340, height: 140 }, // Exceeds parent bounds -> overflow!
  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }
);

const prayerRecord = getTargetMeasurement('prayer-reminders-selection-controls');
assert.equal(prayerRecord.status, 'measured');
assert.equal(prayerRecord.resolvedStyleTextAlign, 'unspecified', 'segRow ViewStyle has no textAlign prop');
assert.equal(prayerRecord.resolvedStyleWritingDirection, 'unspecified');
assert.equal(prayerRecord.overflowStatus, 'overflow', 'Target wider and taller than parent must report overflow');
assert.equal(prayerRecord.clippingStatus, 'clipped');
assert.equal(prayerRecord.isWidthOverflowing, true);
assert.equal(prayerRecord.isHeightOverflowing, true);

// Test report builder output with native RTL = true
mockNativeRTL = true;
recordParentLayout('quran-landing-surah-card', { width: 360, height: 72 });
recordTargetLayout(
  'quran-landing-surah-card',
  { width: 180, height: 24 },
  { fontFamily: 'Manrope_700Bold', fontSize: 13.5 }
);

const report = buildDiagnosticReport();
assert.ok(report.timestamp, 'Report must contain timestamp');
assert.equal(report.buildId, DIAGNOSTIC_BUILD_ID);
assert.equal(report.version, '1.1.91');
assert.equal(report.versionCode, 110);
assert.equal(report.i18nManagerIsRTL, true, 'Report must capture native I18nManager.isRTL');

const quranReportItem = report.measurements.find((m) => m.componentId === 'quran-landing-surah-card');
assert.ok(quranReportItem);
assert.equal(quranReportItem.nativeIsRTL, true, 'Per-target nativeIsRTL must be present in serialized measurement item');
assert.equal(quranReportItem.nativeComputedStyleUnavailable, true);
assert.ok(quranReportItem.resolvedContainerLayout);
assert.ok(quranReportItem.parentLayout);
assert.equal(quranReportItem.resolvedStyleTextAlign, 'unspecified');
assert.equal(quranReportItem.resolvedStyleWritingDirection, 'unspecified');

// 4c. Stale measurement state regression tests (valid -> invalid transition):
// Transition 1: Valid measurements on downloads-empty-cta-card, followed by invalid parent layout
recordParentLayout('downloads-empty-cta-card', { width: 340, height: 200 });
recordTargetLayout(
  'downloads-empty-cta-card',
  { width: 280, height: 28 },
  { textAlign: 'center' }
);
assert.equal(downloadsRecord.status, 'measured');
assert.equal(downloadsRecord.measurementUnavailable, false);
assert.equal(downloadsRecord.overflowStatus, 'no_overflow');
assert.equal(downloadsRecord.parentWidth, 340);
assert.equal(downloadsRecord.targetWidth, 280);

// Invalid layout event on parent (e.g. width: 0, height: 0)
recordParentLayout('downloads-empty-cta-card', { width: 0, height: 0 });

// Verify that all stale dimensions, bounds, and overflow fields are completely reset
assert.equal(downloadsRecord.status, 'measurementUnavailable', 'Status must transition to measurementUnavailable');
assert.equal(downloadsRecord.measurementUnavailable, true, 'measurementUnavailable flag must be true');
assert.equal(downloadsRecord.parentWidth, null, 'parentWidth must be reset to null');
assert.equal(downloadsRecord.parentHeight, null, 'parentHeight must be reset to null');
assert.equal(downloadsRecord.targetWidth, null, 'targetWidth must be reset to null on invalid parent event');
assert.equal(downloadsRecord.targetHeight, null, 'targetHeight must be reset to null on invalid parent event');
assert.equal(downloadsRecord.textContainerWidth, null, 'textContainerWidth must be reset to null');
assert.equal(downloadsRecord.textContainerHeight, null, 'textContainerHeight must be reset to null');
assert.equal(downloadsRecord.resolvedContainerLayout.width, null);
assert.equal(downloadsRecord.resolvedContainerLayout.height, null);
assert.equal(downloadsRecord.parentLayout.width, null);
assert.equal(downloadsRecord.parentLayout.height, null);
assert.equal(downloadsRecord.overflowStatus, 'unavailable', 'overflowStatus must reset to unavailable');
assert.equal(downloadsRecord.clippingStatus, 'unavailable', 'clippingStatus must reset to unavailable');
assert.equal(downloadsRecord.isWidthOverflowing, null, 'isWidthOverflowing must reset to null');
assert.equal(downloadsRecord.isHeightOverflowing, null, 'isHeightOverflowing must reset to null');
assert.equal(downloadsRecord.overflowDetails.widthOverflow, null);
assert.equal(downloadsRecord.overflowDetails.heightOverflow, null);

// Verify report builder reflects cleared values
const reportAfterInvalid = buildDiagnosticReport();
const downloadsReportItem = reportAfterInvalid.measurements.find((m) => m.componentId === 'downloads-empty-cta-card');
assert.ok(downloadsReportItem);
assert.equal(downloadsReportItem.status, 'measurementUnavailable');
assert.equal(downloadsReportItem.measurementUnavailable, true);
assert.equal(downloadsReportItem.dimensions.targetWidth, null);
assert.equal(downloadsReportItem.dimensions.parentWidth, null);
assert.equal(downloadsReportItem.resolvedContainerLayout.width, null);
assert.equal(downloadsReportItem.parentLayout.width, null);
assert.equal(downloadsReportItem.overflow.status, 'unavailable');
assert.equal(downloadsReportItem.overflow.isWidthOverflowing, null);
assert.equal(downloadsReportItem.overflow.isHeightOverflowing, null);

// Transition 2: Valid measurements on quran-landing-surah-card, followed by invalid target layout
recordParentLayout('quran-landing-surah-card', { width: 360, height: 72 });
recordTargetLayout('quran-landing-surah-card', { width: 180, height: 24 });
assert.equal(quranRecord.status, 'measured');
recordTargetLayout('quran-landing-surah-card', { width: -1, height: 0 });
assert.equal(quranRecord.status, 'measurementUnavailable');
assert.equal(quranRecord.measurementUnavailable, true);
assert.equal(quranRecord.targetWidth, null);
assert.equal(quranRecord.parentWidth, null);
assert.equal(quranRecord.overflowStatus, 'unavailable');

// Transition 3: Valid measurements on prayer-reminders-selection-controls, followed by recordMeasurementUnavailable
recordParentLayout('prayer-reminders-selection-controls', { width: 320, height: 120 });
recordTargetLayout('prayer-reminders-selection-controls', { width: 200, height: 60 });
assert.equal(prayerRecord.status, 'measured');
recordMeasurementUnavailable('prayer-reminders-selection-controls', 'Layout unmounted');
assert.equal(prayerRecord.status, 'measurementUnavailable');
assert.equal(prayerRecord.measurementUnavailable, true);
assert.equal(prayerRecord.targetWidth, null);
assert.equal(prayerRecord.parentWidth, null);
assert.equal(prayerRecord.overflowStatus, 'unavailable');
assert.equal(prayerRecord.unavailabilityReason, 'Layout unmounted');

// Transition 4: Edge-aware overflow calculation tests (x < 0, y < 0, x + w > parent.w, y + h > parent.h)
// Case A: Target has smaller dimensions than parent, but x is negative -> overflow!
recordParentLayout('downloads-empty-cta-card', { x: 0, y: 0, width: 300, height: 200 });
recordTargetLayout('downloads-empty-cta-card', { x: -10, y: 10, width: 100, height: 40 });
const edgeOverLeft = getTargetMeasurement('downloads-empty-cta-card');
assert.equal(edgeOverLeft.overflowStatus, 'overflow', 'Target with x < 0 must report overflow');
assert.equal(edgeOverLeft.edgeOverflow?.overflowsLeft, true);
assert.equal(edgeOverLeft.edgeOverflow?.hasOverflow, true);

// Case B: Target has smaller dimensions, but y is negative -> overflow!
recordTargetLayout('downloads-empty-cta-card', { x: 10, y: -5, width: 100, height: 40 });
const edgeOverTop = getTargetMeasurement('downloads-empty-cta-card');
assert.equal(edgeOverTop.overflowStatus, 'overflow', 'Target with y < 0 must report overflow');
assert.equal(edgeOverTop.edgeOverflow?.overflowsTop, true);

// Case C: Target has smaller dimensions, but x + width > parent.width -> overflow!
recordTargetLayout('downloads-empty-cta-card', { x: 250, y: 10, width: 100, height: 40 });
const edgeOverRight = getTargetMeasurement('downloads-empty-cta-card');
assert.equal(edgeOverRight.overflowStatus, 'overflow', 'Target with x + width > parent.width must report overflow');
assert.equal(edgeOverRight.edgeOverflow?.overflowsRight, true);

// Case D: Target has smaller dimensions, but y + height > parent.height -> overflow!
recordTargetLayout('downloads-empty-cta-card', { x: 10, y: 180, width: 100, height: 40 });
const edgeOverBottom = getTargetMeasurement('downloads-empty-cta-card');
assert.equal(edgeOverBottom.overflowStatus, 'overflow', 'Target with y + height > parent.height must report overflow');
assert.equal(edgeOverBottom.edgeOverflow?.overflowsBottom, true);

// Case E: Target inside bounds -> no_overflow
recordTargetLayout('downloads-empty-cta-card', { x: 10, y: 10, width: 100, height: 40 });
const edgeBounded = getTargetMeasurement('downloads-empty-cta-card');
assert.equal(edgeBounded.overflowStatus, 'no_overflow', 'Target within bounds must report no_overflow');
assert.equal(edgeBounded.edgeOverflow?.hasOverflow, false);

// 4d. Named layout rectangles measurement and hierarchy tracking:
recordNamedLayout('downloads-empty-cta-card', 'button', { x: 20, y: 60, width: 160, height: 44 }, {
  testID: 'downloads-empty-cta-btn',
  parentIdentity: 'downloads-empty-cta-card',
  frameWidth: 320,
  frameHeight: 400,
  cardWidth: 320,
  cardHeight: 400,
  ancestorCard: 'downloads-empty-cta-card',
});
recordNamedLayout('downloads-empty-cta-card', 'gradient', { x: 0, y: 0, width: 160, height: 44 }, {
  testID: 'downloads-empty-cta-gradient',
  parentIdentity: 'downloads-empty-cta-btn',
  frameWidth: 160,
  frameHeight: 44,
  cardWidth: 320,
  cardHeight: 400,
  ancestorCard: 'downloads-empty-cta-card',
});
recordNamedLayout('downloads-empty-cta-card', 'label', { x: 10, y: 10, width: 140, height: 24 }, {
  testID: 'downloads-empty-cta-btn-label',
  parentIdentity: 'downloads-empty-cta-gradient',
  frameWidth: 160,
  frameHeight: 44,
  cardWidth: 320,
  cardHeight: 400,
  ancestorCard: 'downloads-empty-cta-card',
});
recordNamedLayout('downloads-empty-cta-card', 'listViewport', { x: 0, y: 0, width: 360, height: 600 }, {
  testID: 'downloads-list-viewport',
  parentIdentity: 'detail-screen-root',
  frameWidth: 360,
  frameHeight: 600,
});

const downloadsWithRects = getTargetMeasurement('downloads-empty-cta-card');
assert.ok(downloadsWithRects.rectangles);
assert.equal(downloadsWithRects.rectangles.button.isAvailable, true);
assert.equal(downloadsWithRects.rectangles.button.width, 160);
assert.equal(downloadsWithRects.rectangles.button.height, 44);
assert.equal(downloadsWithRects.rectangles.button.frameWidth, 320);
assert.equal(downloadsWithRects.rectangles.gradient.isAvailable, true);
assert.equal(downloadsWithRects.rectangles.label.isAvailable, true);
assert.equal(downloadsWithRects.rectangles.listViewport.isAvailable, true);

// 4e. Coordinate frame overflow & ancestor allocation test:
// Label: x=30, width=140 inside a 100dp gradient frame -> x + width = 170 > 100 (overflowsRight).
// Outer card is 300dp -> x + width = 170 < 300 (no allocation overflow).
recordNamedLayout('downloads-empty-cta-card', 'label', { x: 30, y: 0, width: 140, height: 24 }, {
  testID: 'downloads-empty-cta-btn-label',
  parentIdentity: 'downloads-empty-cta-gradient',
  frameWidth: 100,
  frameHeight: 24,
  cardWidth: 300,
  cardHeight: 700,
  ancestorCard: 'downloads-empty-cta-card',
});
const labelMeasurement = getTargetMeasurement('downloads-empty-cta-card').rectangles.label;
assert.equal(labelMeasurement.isAvailable, true);
assert.equal(labelMeasurement.frameWidth, 100);
assert.equal(labelMeasurement.cardWidth, 300);
assert.equal(labelMeasurement.edgeOverflow?.overflowsRight, true, 'Label 140dp at x=30 in 100dp frame must overflow right');
assert.equal(labelMeasurement.edgeOverflow?.hasOverflow, true, 'Label exceeding frame must report edge overflow');
assert.equal(labelMeasurement.allocationOverflow?.hasOverflow, false, 'Label fits inside 300dp ancestor card allocation');

// Negative offset: x = -10dp
recordNamedLayout('downloads-empty-cta-card', 'label', { x: -10, y: 0, width: 80, height: 24 }, {
  testID: 'downloads-empty-cta-btn-label',
  parentIdentity: 'downloads-empty-cta-gradient',
  frameWidth: 100,
  frameHeight: 24,
  cardWidth: 300,
  cardHeight: 700,
  ancestorCard: 'downloads-empty-cta-card',
});
const labelNegOffset = getTargetMeasurement('downloads-empty-cta-card').rectangles.label;
assert.equal(labelNegOffset.edgeOverflow?.overflowsLeft, true, 'Negative offset x < 0 must report overflowsLeft');
assert.equal(labelNegOffset.edgeOverflow?.hasOverflow, true);

// Negative top offset: y = -4dp
recordNamedLayout('downloads-empty-cta-card', 'label', { x: 0, y: -4, width: 80, height: 24 }, {
  testID: 'downloads-empty-cta-btn-label',
  parentIdentity: 'downloads-empty-cta-gradient',
  frameWidth: 100,
  frameHeight: 24,
  cardWidth: 300,
  cardHeight: 700,
  ancestorCard: 'downloads-empty-cta-card',
});
const labelNegTop = getTargetMeasurement('downloads-empty-cta-card').rectangles.label;
assert.equal(labelNegTop.edgeOverflow?.overflowsTop, true, 'Negative offset y < 0 must report overflowsTop');
assert.equal(labelNegTop.edgeOverflow?.hasOverflow, true);

// Scaled fractional values: width 140.4dp, frame 100.2dp
recordNamedLayout('downloads-empty-cta-card', 'label', { x: 0, y: 0, width: 140.4, height: 24.2 }, {
  testID: 'downloads-empty-cta-btn-label',
  parentIdentity: 'downloads-empty-cta-gradient',
  frameWidth: 100.2,
  frameHeight: 24.2,
  cardWidth: 300,
  cardHeight: 700,
  ancestorCard: 'downloads-empty-cta-card',
});
const labelScaled = getTargetMeasurement('downloads-empty-cta-card').rectangles.label;
assert.equal(labelScaled.width, 140.4);
assert.equal(labelScaled.frameWidth, 100.2);
assert.equal(labelScaled.edgeOverflow?.overflowsRight, true);
assert.equal(labelScaled.edgeOverflow?.hasOverflow, true);

// Unknown frame: frameWidth/frameHeight missing -> frameUnavailable: true, measurementUnavailable: true, never emit hasOverflow: false
recordNamedLayout('downloads-empty-cta-card', 'label', { x: 0, y: 0, width: 80, height: 24 }, {
  testID: 'downloads-empty-cta-btn-label',
  parentIdentity: 'downloads-empty-cta-gradient',
  // frameWidth and frameHeight omitted / unknown
});
const labelUnknownFrame = getTargetMeasurement('downloads-empty-cta-card').rectangles.label;
assert.equal(labelUnknownFrame.frameUnavailable, true, 'Missing frame must set frameUnavailable');
assert.equal(labelUnknownFrame.measurementUnavailable, true, 'Missing frame must set measurementUnavailable');
assert.equal(labelUnknownFrame.edgeOverflow, null, 'Unknown frame must not emit edgeOverflow or hasOverflow: false');

// 4f. Valid -> Unmount -> Report showing stale values removed test:
recordParentLayout('downloads-empty-cta-card', { x: 0, y: 0, width: 320, height: 400 });
recordTargetLayout('downloads-empty-cta-card', { x: 10, y: 10, width: 150, height: 40 });
recordNamedLayout('downloads-empty-cta-card', 'button', { x: 10, y: 10, width: 150, height: 40 }, {
  testID: 'downloads-empty-cta-btn',
  frameWidth: 320,
  frameHeight: 400,
  cardWidth: 320,
  cardHeight: 400,
  ancestorCard: 'downloads-empty-cta-card',
});
const measuredBeforeUnmount = getTargetMeasurement('downloads-empty-cta-card');
assert.equal(measuredBeforeUnmount.status, 'measured');
assert.equal(measuredBeforeUnmount.measurementUnavailable, false);
assert.equal(measuredBeforeUnmount.rectangles.button.isAvailable, true);

// Target unmounts (e.g. downloads list populated or screen unmounts)
invalidateDiagnosticTarget('downloads-empty-cta-card', 'Downloads populated; empty CTA unmounted');
const unmountedTarget = getTargetMeasurement('downloads-empty-cta-card');
assert.equal(unmountedTarget.status, 'measurementUnavailable');
assert.equal(unmountedTarget.measurementUnavailable, true);
assert.equal(unmountedTarget.unavailabilityReason, 'Downloads populated; empty CTA unmounted');
assert.equal(unmountedTarget.targetWidth, null);
assert.equal(unmountedTarget.targetHeight, null);
assert.equal(unmountedTarget.targetX, null);
assert.equal(unmountedTarget.targetY, null);
assert.equal(unmountedTarget.parentWidth, null);
assert.equal(unmountedTarget.parentHeight, null);
assert.equal(unmountedTarget.edgeOverflow, null);
assert.equal(unmountedTarget.rectangles.button.isAvailable, false);
assert.equal(unmountedTarget.rectangles.button.width, null);
assert.equal(unmountedTarget.rectangles.button.height, null);
assert.equal(unmountedTarget.rectangles.button.frameWidth, null);
assert.equal(unmountedTarget.rectangles.button.frameHeight, null);
assert.equal(unmountedTarget.rectangles.button.edgeOverflow, null);
assert.equal(unmountedTarget.rectangles.button.measurementUnavailable, true);

// Confirm exported report shows zero stale values
const unmountedReport = buildDiagnosticReport();
const reportItem = unmountedReport.measurements.find((m) => m.componentId === 'downloads-empty-cta-card');
assert.equal(reportItem.status, 'measurementUnavailable');
assert.equal(reportItem.measurementUnavailable, true);
assert.equal(reportItem.dimensions.targetWidth, null);
assert.equal(reportItem.dimensions.targetHeight, null);
assert.equal(reportItem.dimensions.parentWidth, null);
assert.equal(reportItem.overflow.edgeOverflow, null);
assert.equal(reportItem.rectangles.button.isAvailable, false);
assert.equal(reportItem.rectangles.button.width, null);

// Invalid named layout clears stale values
recordNamedLayout('downloads-empty-cta-card', 'button', { width: 0, height: 0 });
assert.equal(downloadsWithRects.rectangles.button.isAvailable, false);
assert.equal(downloadsWithRects.rectangles.button.width, null);
assert.equal(downloadsWithRects.rectangles.button.height, null);
assert.equal(downloadsWithRects.rectangles.button.x, null);
assert.equal(downloadsWithRects.rectangles.button.y, null);

// Explicit named layout unavailable reporting
recordNamedLayoutUnavailable('mosque-finder-search-controls', 'resultRow', 'No search results present', {
  testID: 'mosque-finder-result-row-0',
  parentIdentity: 'mosque-finder-list-viewport',
});
const mosqueWithRects = getTargetMeasurement('mosque-finder-search-controls');
assert.equal(mosqueWithRects.rectangles.resultRow.isAvailable, false);
assert.equal(mosqueWithRects.rectangles.resultRow.unavailabilityReason, 'No search results present');

// Verify useDiagnosticTarget hook helpers
const activeHook = useDiagnosticTarget('mosque-finder-search-controls');
assert.equal(typeof activeHook.recordNamed, 'function');
assert.equal(typeof activeHook.recordNamedUnavailable, 'function');
assert.equal(typeof activeHook.getNamedRectProps, 'function');
const searchFieldProps = activeHook.getNamedRectProps('searchField', { testID: 'mosque-finder-search-field' });
assert.equal(searchFieldProps.testID, 'mosque-finder-search-field');
assert.equal(typeof searchFieldProps.onLayout, 'function');

console.log('  ✓ Actual resolved styles, nativeComputedStyleUnavailable flag, native RTL per item, edge-aware geometry, named rectangles hierarchy, and stale state reset verified');

// -----------------------------------------------------------------------------
// 5. Truthful Export Semantics, Android Share Dismissal Wording & Privacy
// -----------------------------------------------------------------------------
console.log('\n--- 5. Truthful Export Semantics, Android Share Dismissal Wording & Privacy ---');

// 5a. Android Chooser Dismissal / Unknown Result Test:
// On Android, Sharing.shareAsync() resolves with null for both dismissal and completion.
// Per specification, it is NEVER reported as success or "report ready" implying share completed.
// It explicitly reports shareStatus: 'unknown' and status: 'userActionRequired' with fileReady: true.
mockSharingAvailable = true;
mockSharingRejects = false;
mockFileWriteRejects = false;
mockFileSystemDir = '/mock/cache/';

const androidShareResult = await exportDiagnosticReport();
assert.equal(
  androidShareResult.success,
  false,
  'Android expo-sharing cannot confirm completion; success must be strictly false'
);
assert.equal(
  androidShareResult.status,
  'userActionRequired',
  'Android expo-sharing resolving must report status: userActionRequired'
);
assert.equal(
  androidShareResult.shareStatus,
  'unknown',
  'Android expo-sharing resolving must report shareStatus: unknown'
);
assert.equal(
  androidShareResult.fileReady,
  true,
  'File generation must be confirmed on disk'
);
assert.ok(androidShareResult.filePath, 'filePath must be provided for reference');

// 5b. Share Unavailable Test:
// File written to disk, sharing is unavailable -> reports fileReady: true, success: true for file write
mockSharingAvailable = false;
mockShareRejects = false;
const originalShare = mockReactNative.Share;
mockReactNative.Share = undefined;

const shareUnavailableResult = await exportDiagnosticReport();
assert.equal(
  shareUnavailableResult.success,
  true,
  'Confirmed filesystem write without sharing must report success: true'
);
assert.equal(
  shareUnavailableResult.status,
  'fileReady',
  'Status must report fileReady when share is unavailable'
);
assert.equal(
  shareUnavailableResult.shareStatus,
  'unavailable',
  'shareStatus must report unavailable when sharing is not available'
);
assert.equal(shareUnavailableResult.fileReady, true);
mockReactNative.Share = originalShare;

// 5c. Share Rejection Test:
// Sharing.shareAsync throws error -> reports failed with shareStatus: unavailable
mockSharingAvailable = true;
mockSharingRejects = true;

const shareRejectResult = await exportDiagnosticReport();
assert.equal(shareRejectResult.success, false);
assert.equal(shareRejectResult.status, 'failed');
assert.equal(shareRejectResult.shareStatus, 'unavailable');
assert.equal(shareRejectResult.fileReady, true, 'File was written successfully before share threw');
assert.ok(shareRejectResult.error.includes('Sharing failed'), 'Error message must reflect failure');

// 5d. Dismissal via React Native Share Fallback Test:
mockSharingAvailable = false;
mockShareRejects = false;
mockShareResult = { action: 'dismissedAction' };

const rnDismissResult = await exportDiagnosticReport();
assert.equal(rnDismissResult.success, false);
assert.equal(rnDismissResult.status, 'cancelledOrUnknown');
assert.equal(rnDismissResult.shareStatus, 'cancelled');
assert.equal(rnDismissResult.fileReady, true);

// 5e. RN Share Android sharedAction Fallback Test:
mockShareResult = { action: 'sharedAction' };
const rnSharedActionResult = await exportDiagnosticReport();
assert.equal(rnSharedActionResult.success, false);
assert.equal(rnSharedActionResult.status, 'userActionRequired');
assert.equal(rnSharedActionResult.shareStatus, 'unknown');
assert.equal(rnSharedActionResult.fileReady, true);

// 5f. Modal UI truthful status display and retry button inspection:
const modalSrc = read('src/components/diagnostic/RtlDiagnosticModal.tsx');
const stateSrc = read('src/lib/diagnostic/diagnosticState.ts');

assert.ok(
  modalSrc.includes('testID="export-status-share-invoked"') &&
    modalSrc.includes("exportStatus.state === 'userActionRequired'"),
  'Modal must render userActionRequired banner with testID export-status-share-invoked'
);
assert.ok(
  modalSrc.includes('testID="diag-retry-export-btn"'),
  'Modal must render a truthful Retry button when shareStatus is unknown'
);
assert.ok(
  modalSrc.includes('testID="diag-retry-cancelled-btn"'),
  'Modal must render a Retry button when export is cancelled'
);
assert.ok(
  modalSrc.includes('testID="diag-retry-error-btn"'),
  'Modal must render a Retry button when export errors'
);
assert.ok(
  !modalSrc.includes("message: `${t('Backup exported')} (${t('Status')}: ${t('Share')})`"),
  'Modal must never claim "Backup exported (Status: Share)" when chooser completion is unconfirmed'
);

// 5g. Privacy boundaries: Zero Quran text, zero user content, zero secrets.
// Exported report strictly limited to structural layout geometry and test IDs.
const bannedPatterns = [
  /\bitem\.text\b/,
  /\bsurahText\b/,
  /\btranslationText\b/,
  /\bquranText\b/,
  /\buserSettings\b/,
  /\bpassword\b/,
  /\btoken\b/,
  /\bapiKey\b/,
];
for (const banned of bannedPatterns) {
  assert.ok(!banned.test(stateSrc), `diagnosticState must not record or include banned field: ${banned}`);
}

// Assert diagnosticState truthful privacy documentation (no mismatch with exported x/y geometry)
assert.ok(
  stateSrc.includes('Zero Quran text') &&
  stateSrc.includes('Zero user content') &&
  stateSrc.includes('Zero secrets/tokens') &&
  stateSrc.includes('structural layout geometry'),
  'diagnosticState must document truthful privacy contract matching exported geometry'
);

// Verify report structure explicitly includes geometry (targetX/Y, parentX/Y) without user content
const sampleReport = buildDiagnosticReport();
assert.ok(sampleReport.measurements.length > 0);
for (const m of sampleReport.measurements) {
  assert.equal(m.quranText, undefined);
  assert.equal(m.userContent, undefined);
  assert.ok('targetX' in m.dimensions);
  assert.ok('targetY' in m.dimensions);
}

console.log('  ✓ File generation confirmed, shareStatus: unknown / userActionRequired, truthful retry, and privacy boundaries passed');

// -----------------------------------------------------------------------------
// 6. Diagnostic Modal Localization & Technical Bounded Fallbacks
// -----------------------------------------------------------------------------
console.log('\n--- 6. Diagnostic Modal Localization & Technical Bounded Fallbacks ---');

const diagI18nUrduModule = loadTsModule('src/lib/diagnostic/diagnosticI18n.ts', {
  '../i18n': {
    default: { language: 'ur' },
    t: (k) => k,
    getCurrentLanguage: () => 'ur',
    isRtlLanguage: () => true,
  },
});
const { diagT: diagTUrdu } = diagI18nUrduModule;

const diagI18nArabicModule = loadTsModule('src/lib/diagnostic/diagnosticI18n.ts', {
  '../i18n': {
    default: { language: 'ar' },
    t: (k) => k,
    getCurrentLanguage: () => 'ar',
    isRtlLanguage: () => true,
  },
});

// Test Urdu translations for QA-reported strings
assert.equal(diagTUrdu('Runtime Layout'), 'رن ٹائم لے آؤٹ', 'Runtime Layout translates to authentic Urdu');
assert.equal(diagTUrdu('Environment & Direction'), 'ماحول اور سمت', 'Environment & Direction translates to authentic Urdu');
assert.equal(diagTUrdu('Diagnostic Build ID'), 'تشخیصی بلڈ شناختی کوڈ', 'Diagnostic Build ID translates to authentic Urdu');
assert.equal(diagTUrdu('Direction Result'), 'سمت کا نتیجہ', 'Direction Result translates to authentic Urdu');
assert.equal(diagTUrdu('Measured natively'), 'مقامی طور پر پیمائش شدہ', 'Measured natively translates to authentic Urdu');
assert.equal(diagTUrdu('Alignment & Direction'), 'سیدھ اور سمت', 'Alignment & Direction translates to authentic Urdu');
assert.equal(diagTUrdu('Native Computed Style'), 'مقامی حسابی انداز', 'Native Computed Style translates to authentic Urdu');
assert.equal(diagTUrdu('No Overflow (Bounded)'), 'کوئی اوور فلو نہیں (محدود)', 'No Overflow (Bounded) translates to authentic Urdu');
assert.equal(diagTUrdu('Navigate to'), 'پر جائیں', 'Navigate to translates to authentic Urdu');
assert.ok(
  diagTUrdu('Exports runtime layout geometry and styles without user content.').includes('صارف کے مواد کے بغیر'),
  'Export description translates to authentic Urdu'
);

// 6a. Native Share Title & Dialog Title (Finding 2)
assert.ok(!stateSrc.includes("dialogTitle: 'Export RTL Diagnostic Report'"), 'dialogTitle must not be hardcoded in diagnosticState.ts');
assert.ok(!stateSrc.includes("title: 'RTL Diagnostic Report'"), 'title must not be hardcoded in diagnosticState.ts');
assert.ok(stateSrc.includes('dialogTitle: getDiagnosticShareDialogTitle()'), 'dialogTitle must call getDiagnosticShareDialogTitle()');
assert.ok(stateSrc.includes('title: getDiagnosticShareTitle()'), 'title must call getDiagnosticShareTitle()');

// English
assert.equal(diagI18nModule.getDiagnosticShareTitle(), 'RTL Diagnostic Report');
assert.equal(diagI18nModule.getDiagnosticShareDialogTitle(), 'Export RTL Diagnostic Report');

// Urdu
assert.equal(diagI18nUrduModule.getDiagnosticShareTitle(), 'آر ٹی ایل تشخیصی رپورٹ');
assert.equal(diagI18nUrduModule.getDiagnosticShareDialogTitle(), 'آر ٹی ایل تشخیصی رپورٹ برآمد کریں');

// Arabic
assert.equal(diagI18nArabicModule.getDiagnosticShareTitle(), 'تقرير تشخيص RTL');
assert.equal(diagI18nArabicModule.getDiagnosticShareDialogTitle(), 'تصدير تقرير تشخيص RTL');

// 6b. Modal Status Rendering (Finding 1)
// Verify getLocalizedMeasurementStatus and getLocalizedExportStatus across languages
// English
assert.equal(diagI18nModule.getLocalizedMeasurementStatus('measured'), 'Measured');
assert.equal(diagI18nModule.getLocalizedMeasurementStatus('measurementUnavailable'), 'Measurement Unavailable');
assert.equal(diagI18nModule.getLocalizedMeasurementStatus('pending'), 'Pending');
assert.equal(diagI18nModule.getLocalizedExportStatus('userActionRequired'), 'Share Result Unknown');
assert.equal(diagI18nModule.getLocalizedExportStatus('cancelled'), 'Cancelled');
assert.equal(diagI18nModule.getLocalizedExportStatus('failed'), 'Export failed');
assert.equal(diagI18nModule.getLocalizedExportStatus('fileReady'), 'Ready (File Generated)');

// Urdu
assert.equal(diagI18nUrduModule.getLocalizedMeasurementStatus('measured'), 'پیمائش شدہ');
assert.equal(diagI18nUrduModule.getLocalizedMeasurementStatus('measurementUnavailable'), 'پیمائش دستیاب نہیں');
assert.equal(diagI18nUrduModule.getLocalizedExportStatus('userActionRequired'), 'شیئر کا نتیجہ نامعلوم');
assert.equal(diagI18nUrduModule.getLocalizedExportStatus('cancelled'), 'منسوخ');
assert.equal(diagI18nUrduModule.getLocalizedExportStatus('fileReady'), 'تیار (فائل تیار ہو گئی)');

// Arabic
assert.equal(diagI18nArabicModule.getLocalizedMeasurementStatus('measured'), 'تم القياس');
assert.equal(diagI18nArabicModule.getLocalizedMeasurementStatus('measurementUnavailable'), 'القياس غير متاح');
assert.equal(diagI18nArabicModule.getLocalizedExportStatus('userActionRequired'), 'نتيجة المشاركة غير معروفة');
assert.equal(diagI18nArabicModule.getLocalizedExportStatus('cancelled'), 'تم الإلغاء');
assert.equal(diagI18nArabicModule.getLocalizedExportStatus('fileReady'), 'جاهز (تم إنشاء الملف)');

// Verify that modal source code does not expose raw status enum in JSX
assert.ok(!modalSrc.includes('target.status.toUpperCase()'), 'Modal must not expose raw target.status.toUpperCase()');
assert.ok(modalSrc.includes('{getLocalizedMeasurementStatus(target.status)}'), 'Modal must render localized measurement status');
assert.ok(modalSrc.includes('getLocalizedExportStatus'), 'Modal must use getLocalizedExportStatus');

// Assert that no raw machine status codes appear as user-facing text
const bannedRawStatusTokens = [
  />\s*MEASURED\s*</,
  />\s*PENDING\s*</,
  />\s*MEASUREMENTUNAVAILABLE\s*</,
  />\s*measurementUnavailable\s*</,
  />\s*userActionRequired\s*</,
  />\s*cancelledOrUnknown\s*</,
  />\s*fileReady\s*</,
  />\s*no_overflow\s*</,
  />\s*not_clipped\s*</,
];
for (const bannedToken of bannedRawStatusTokens) {
  assert.ok(!bannedToken.test(modalSrc), `Modal must NOT contain raw status enum as user-facing JSX: ${bannedToken}`);
}

const machineMeasurementCodes = ['measured', 'measurementUnavailable'];
for (const code of machineMeasurementCodes) {
  const displayEn = diagI18nModule.getLocalizedMeasurementStatus(code);
  assert.notEqual(displayEn, code, `display string for ${code} must not equal machine code`);
  assert.notEqual(displayEn, code.toUpperCase(), `display string for ${code} must not equal raw uppercase machine code`);

  const displayUr = diagI18nUrduModule.getLocalizedMeasurementStatus(code);
  assert.notEqual(displayUr, code);
  assert.notEqual(displayUr, code.toUpperCase());

  const displayAr = diagI18nArabicModule.getLocalizedMeasurementStatus(code);
  assert.notEqual(displayAr, code);
  assert.notEqual(displayAr, code.toUpperCase());
}

const machineExportCodes = ['userActionRequired', 'cancelled', 'fileReady', 'shareInvoked', 'unknown', 'failed'];
for (const code of machineExportCodes) {
  const displayEn = diagI18nModule.getLocalizedExportStatus(code);
  assert.notEqual(displayEn, code, `display string for ${code} must not equal machine code`);
  assert.notEqual(displayEn, code.toUpperCase(), `display string for ${code} must not equal raw uppercase machine code`);

  const displayUr = diagI18nUrduModule.getLocalizedExportStatus(code);
  assert.notEqual(displayUr, code);
  assert.notEqual(displayUr, code.toUpperCase());

  const displayAr = diagI18nArabicModule.getLocalizedExportStatus(code);
  assert.notEqual(displayAr, code);
  assert.notEqual(displayAr, code.toUpperCase());
}

// Verify that modal source code routes all user-facing strings through t() or diagT()
const requiredLocalizedPatterns = [
  "diagT('Runtime Layout')",
  "diagT('Environment & Direction')",
  "diagT('Diagnostic Build ID')",
  "diagT('Direction Result')",
  "diagT('I18nManager.isRTL')",
  "diagT('Measured natively')",
  "diagT('Alignment & Direction')",
  "diagT('Native Computed Style')",
  "diagT('No Overflow (Bounded)')",
  "diagT('Navigate to')",
  "diagT('Exports runtime layout geometry and styles without user content.')",
  "diagT('Screen')",
  "diagT('Parent')",
  "diagT('Overflow')",
  "diagT('Width Overflow')",
  "diagT('Height Overflow')",
  "diagT('Report saved locally. Share result unknown (chooser may have been dismissed).')",
  "t('Close')",
  "t('Cancel')",
  "t('App version')",
  "t('App Language')",
  "t('Status')",
  "t('Target')",
  "t('Details')",
  "t('About')",
  "t('Export to file')",
  "t('Export failed')",
  "t('Backup exported')",
  "t('Copied')",
  "t('Copy')",
  "t('Retry')",
];

for (const pat of requiredLocalizedPatterns) {
  assert.ok(
    modalSrc.includes(pat),
    `RtlDiagnosticModal must route user-facing text through localization helper: ${pat}`
  );
}

// Ensure no raw literal strings remain from the previous QA failure list (not wrapped in diagT or t)
const rawBannedPatterns = [
  /About · Runtime Layout/,
  /Details · Environment & Direction/,
  />Diagnostic Build ID:</,
  />Direction Result:</,
  />I18nManager\.isRTL:</,
  /\?\s*['"]Measured natively['"]/,
  />Alignment & Direction:</,
  />Native Computed Style:</,
  /\?\s*['"]No Overflow \(Bounded\)['"]/,
  /Pending… Navigate to/,
  />Exports runtime layout geometry and styles without user content\.</,
];

for (const rawBanned of rawBannedPatterns) {
  assert.ok(
    !rawBanned.test(modalSrc),
    `RtlDiagnosticModal must NOT contain raw hardcoded English pattern: ${rawBanned}`
  );
}

console.log('  ✓ Modal status separation, native share title localization, and privacy verified');

// -----------------------------------------------------------------------------
// 7. Accessibility & Touch Targets (Finding 3)
// -----------------------------------------------------------------------------
console.log('\n--- 7. Accessibility & Touch Targets ---');

// 7a. Close button touch target >= 44dp
assert.ok(
  modalSrc.includes('width: 44') && modalSrc.includes('height: 44'),
  'Close button must have width and height of at least 44dp'
);
assert.ok(
  modalSrc.includes('accessibilityRole="button"'),
  'Close button must have accessibilityRole="button"'
);
assert.ok(
  modalSrc.includes("accessibilityLabel={t('Close')}"),
  'Close button must use localized t("Close")'
);

// 7b. Primary export button and Outline copy button touch targets >= 44dp
assert.ok(
  modalSrc.includes('testID="export-rtl-report-btn"') && modalSrc.includes('PrimaryButton'),
  'Export button must use PrimaryButton primitive with minHeight: 44'
);
assert.ok(
  modalSrc.includes('testID="copy-rtl-report-btn"') && modalSrc.includes('OutlineButton'),
  'Copy button must use OutlineButton primitive with minHeight: 44'
);

// 7c. Retry controls touch targets >= 44dp (diag-retry-export-btn, diag-retry-cancelled-btn, diag-retry-error-btn)
const retryButtons = [
  'testID="diag-retry-export-btn"',
  'testID="diag-retry-cancelled-btn"',
  'testID="diag-retry-error-btn"',
];
for (const btn of retryButtons) {
  assert.ok(modalSrc.includes(btn), `Modal must render retry button: ${btn}`);
}

// Verify actual hit area of retryInlineButton style is >= 44dp in both dimensions
assert.ok(
  modalSrc.includes('minHeight: 44') && modalSrc.includes('minWidth: 44'),
  'retryInlineButton style must declare minHeight: 44 and minWidth: 44'
);
assert.ok(
  modalSrc.includes('paddingVertical: 8') && modalSrc.includes('paddingHorizontal: 8'),
  'retryInlineButton style must preserve compact visual styling through inner padding'
);

// Verify hitSlop on all interactive touchables
const hitSlopPattern = /hitSlop=\{\{\s*top:\s*8,\s*bottom:\s*8,\s*left:\s*8,\s*right:\s*8\s*\}\}/g;
const hitSlopMatches = modalSrc.match(hitSlopPattern);
assert.ok(hitSlopMatches && hitSlopMatches.length >= 4, 'Close button and all three retry buttons must include hitSlop');

// 7d. Responsive & RTL styles: flexShrink, flexWrap, and RTL-aware alignment
assert.ok(modalSrc.includes("flexWrap: 'wrap'"), 'infoRow must have flexWrap: "wrap" for narrow screens');
assert.ok(modalSrc.includes('flexShrink: 1'), 'infoValue must have flexShrink: 1');
assert.ok(modalSrc.includes('flexShrink: 0'), 'infoLabel must have flexShrink: 0');
assert.ok(modalSrc.includes('marginStart: 12') && !modalSrc.includes('marginLeft: 12'), 'closeButton must use marginStart');
assert.ok(modalSrc.includes('marginStart: 8') && !modalSrc.includes('marginLeft: 8'), 'statusPill must use marginStart');

console.log('  ✓ Complete modal localization, bounded fallbacks, 44dp touch targets for all controls, and responsive wrap verified');

console.log('\n=== ALL FOCUSED DIAGNOSTIC TESTS PASSED (7/7 SUITES) ===');
