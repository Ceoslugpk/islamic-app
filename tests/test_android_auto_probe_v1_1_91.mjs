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

console.log('=== AUTOMATIC PRIMITIVE PROBES & SCREEN IDENTIFICATION SUITE (v1.1.91) ===\n');

// -----------------------------------------------------------------------------
// 1. Metadata Bump & Diagnostic Build Identity
// -----------------------------------------------------------------------------
console.log('--- 1. Metadata Bump & Diagnostic Build Identity ---');

const packageJson = JSON.parse(read('package.json'));
const appJson = JSON.parse(read('app.json')).expo;
const buildGradle = read('android/app/build.gradle');
const diagConfigSrc = read('src/lib/diagnostic/diagnosticConfig.ts');

assert.equal(packageJson.version, '1.1.92', 'package.json version must be 1.1.92');
assert.equal(appJson.version, '1.1.92', 'app.json version must be 1.1.92');
assert.equal(appJson.android.versionCode, 111, 'app.json versionCode must be 111');
assert.ok(buildGradle.includes('versionCode 111'), 'android/app/build.gradle versionCode must be 111');
assert.ok(buildGradle.includes('versionName "1.1.92"'), 'android/app/build.gradle versionName must be 1.1.92');

const diagConfig = loadTsModule('src/lib/diagnostic/diagnosticConfig.ts');
assert.equal(diagConfig.DIAGNOSTIC_BUILD_ID, 'RTL-STRUCT-1.1.92-EVIDENCE', 'Build ID must be RTL-STRUCT-1.1.92-EVIDENCE');
assert.equal(diagConfig.DIAGNOSTIC_VERSION, '1.1.92', 'Diagnostic version must be 1.1.92');
assert.equal(diagConfig.DIAGNOSTIC_VERSION_CODE, 111, 'Diagnostic versionCode must be 111');

// Deterministic build command check
assert.ok(
  diagConfig.DIAGNOSTIC_BUILD_COMMAND.includes('cd android && EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID=RTL-STRUCT-1.1.92-EVIDENCE'),
  'DIAGNOSTIC_BUILD_COMMAND must propagate EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 and EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID=RTL-STRUCT-1.1.92-EVIDENCE'
);
assert.ok(
  !diagConfig.ORDINARY_RELEASE_BUILD_COMMAND.includes('EXPO_PUBLIC_ANDROID_DIAGNOSTIC'),
  'ORDINARY_RELEASE_BUILD_COMMAND must contain zero diagnostic flags'
);

console.log('  ✓ v1.1.92 metadata, versionCode 111, build ID RTL-STRUCT-1.1.92-EVIDENCE, and Gradle commands verified');

// -----------------------------------------------------------------------------
// 2. Two-Factor Gate & Zero-Cost-When-Off Contract
// -----------------------------------------------------------------------------
console.log('\n--- 2. Two-Factor Gate & Zero-Cost-When-Off ---');

assert.equal(diagConfig.evaluateDiagnosticGate(undefined, undefined), false);
assert.equal(diagConfig.evaluateDiagnosticGate('1', undefined), false, 'Leaked env without exact build ID must be false');
assert.equal(diagConfig.evaluateDiagnosticGate(undefined, 'RTL-STRUCT-1.1.92-EVIDENCE'), false, 'Build ID without env must be false');
assert.equal(diagConfig.evaluateDiagnosticGate('1', 'wrong-id'), false, 'Mismatched build ID must be false');
assert.equal(diagConfig.evaluateDiagnosticGate('1', 'RTL-STRUCT-1.1.92-EVIDENCE'), true, 'Both factors present must be true');

// Mock React & React Native
const mockReact = {
  createContext: (defaultValue) => ({
    Provider: ({ value, children }) => children,
    Consumer: ({ children }) => children(defaultValue),
    _currentValue: defaultValue,
  }),
  useContext: (ctx) => ctx._currentValue,
  useRef: (init) => ({ current: init }),
  useEffect: (fn, deps) => {},
  useCallback: (fn, deps) => fn,
  useState: (init) => [init, () => {}],
  useMemo: (fn, deps) => fn(),
};

const mockReactNative = {
  Platform: { OS: 'android' },
  I18nManager: { isRTL: false },
  StyleSheet: { flatten: (s) => s || {}, hairlineWidth: 1, create: (s) => s },
  Share: { share: () => Promise.resolve({ action: 'sharedAction' }) },
  Clipboard: { setString: () => {} },
};

const diagScreens = loadTsModule('src/lib/diagnostic/diagnosticScreens.ts', {});
assert.ok(Array.isArray(diagScreens.KNOWN_SCREENS), 'KNOWN_SCREENS must be an array');
assert.ok(diagScreens.KNOWN_SCREENS.length >= 40, 'KNOWN_SCREENS must list all primary app screens');

const diagState = loadTsModule('src/lib/diagnostic/diagnosticState.ts', {
  'react': mockReact,
  'react-native': mockReactNative,
  './diagnosticConfig': diagConfig,
  './diagnosticI18n': {
    diagT: (k) => k,
    getDiagnosticShareTitle: () => 'Title',
    getDiagnosticShareDialogTitle: () => 'Dialog Title',
  },
  './diagnosticScreens': diagScreens,
  './diagnosticScreenContext': {
    useDiagScreen: () => 'Settings',
    DiagScreenProvider: ({ children }) => children,
  },
  '../i18n': { default: { language: 'en' }, isRTL: () => false, t: (k) => k },
  'expo-file-system/legacy': {},
  'expo-sharing': {},
});

// When gate is off, useAutoProbe returns empty object {}
diagConfig.setDiagnosticModeOverride(false);
const gateOffProbe = diagState.useAutoProbe('test-btn', 'PrimaryButton');
assert.equal(Object.keys(gateOffProbe).length, 0, 'useAutoProbe must return empty object when diagnostic gate is off');
assert.equal(gateOffProbe.onLayout, undefined, 'Zero onLayout callback attached when gate is off');

// When gate is on, useAutoProbe returns { onLayout }
diagConfig.setDiagnosticModeOverride(true);
diagState.resetDiagnosticMeasurements();
const gateOnProbe = diagState.useAutoProbe('test-btn-on', 'PrimaryButton');
assert.ok(typeof gateOnProbe.onLayout === 'function', 'useAutoProbe must return onLayout function when gate is on');

console.log('  ✓ Two-factor gate & useAutoProbe zero-cost-when-off verified');

// -----------------------------------------------------------------------------
// 3. Probe ID Derivation & Monotonic Fallback
// -----------------------------------------------------------------------------
console.log('\n--- 3. Probe ID Derivation & Monotonic Fallback ---');

diagState.resetMonotonicCounters();
const id1 = diagState.getNextMonotonicProbeId('PrimaryButton');
const id2 = diagState.getNextMonotonicProbeId('PrimaryButton');
const idChip1 = diagState.getNextMonotonicProbeId('Chip');
assert.equal(id1, 'auto-PrimaryButton-1', 'First monotonic ID must be auto-PrimaryButton-1');
assert.equal(id2, 'auto-PrimaryButton-2', 'Second monotonic ID must be auto-PrimaryButton-2');
assert.equal(idChip1, 'auto-Chip-1', 'Chip monotonic counter must be independent');

// Counter reset
diagState.resetMonotonicCounters();
assert.equal(diagState.getNextMonotonicProbeId('PrimaryButton'), 'auto-PrimaryButton-1', 'Counter must reset to 1');

console.log('  ✓ Probe ID derivation: preferred testID with monotonic fallback verified');

// -----------------------------------------------------------------------------
// 4. Probe Layout Registration, Frame & Overflow Semantics
// -----------------------------------------------------------------------------
console.log('\n--- 4. Probe Layout Registration, Frame & Overflow Semantics ---');

diagState.resetDiagnosticProbes();

// 4a. Bare probe without frame => overflow: null, overflowReason: 'Missing parent frame geometry', never false no-overflow
diagState.recordProbeLayout(
  'auto-PrimaryButton-1',
  'PrimaryButton',
  'Settings',
  { x: 16, y: 40, width: 328, height: 48 }
);

const probesAfterFirst = diagState.getAutoProbes();
assert.equal(probesAfterFirst.length, 1);
const p1 = probesAfterFirst[0];
assert.equal(p1.id, 'auto-PrimaryButton-1');
assert.equal(p1.kind, 'PrimaryButton');
assert.equal(p1.screen, 'Settings');
assert.equal(p1.width, 328);
assert.equal(p1.height, 48);
assert.equal(p1.staleAfterUnmount, false);
assert.equal(p1.overflow, null, 'Bare probe without frame must report overflow: null');
assert.equal(p1.overflowStatus, 'unknown', 'Bare probe must report overflowStatus: unknown');
assert.ok(p1.reason && p1.reason.includes('No known parent frame'), 'Bare probe must explicitly explain missing parent frame');

// 4b. Probe with known parent frame that fits => no overflow
diagState.recordProbeLayout(
  'settings-submit-btn',
  'PrimaryButton',
  'Settings',
  { x: 0, y: 0, width: 300, height: 48 },
  { frameWidth: 320, frameHeight: 60 }
);
const p2 = diagState.getAutoProbes().find((p) => p.id === 'settings-submit-btn');
assert.ok(p2);
assert.equal(p2.overflow?.hasOverflow, false);
assert.equal(p2.overflowStatus, 'no_overflow');

// 4c. Probe with known parent frame that overflows right => overflow detected
diagState.recordProbeLayout(
  'downloads-overflow-btn',
  'PrimaryButton',
  'Downloads',
  { x: 50, y: 0, width: 300, height: 48 },
  { frameWidth: 320, frameHeight: 60 } // 50 + 300 = 350 > 320!
);
const p3 = diagState.getAutoProbes().find((p) => p.id === 'downloads-overflow-btn');
assert.ok(p3);
assert.equal(p3.overflow?.hasOverflow, true);
assert.equal(p3.overflow?.overflowsRight, true);
assert.equal(p3.overflowStatus, 'overflow');

console.log('  ✓ Frame and overflow semantics (bare probe unknown frame vs known bounds) verified');

// -----------------------------------------------------------------------------
// 5. Stale-After-Unmount Retention (No Wipe)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Stale-After-Unmount Retention ---');

diagState.markProbeStale('downloads-overflow-btn');
const p3Stale = diagState.getAutoProbes().find((p) => p.id === 'downloads-overflow-btn');
assert.ok(p3Stale);
assert.equal(p3Stale.staleAfterUnmount, true, 'Unmounted probe must be flagged staleAfterUnmount: true');
assert.equal(p3Stale.width, 300, 'Geometry must be retained, not wiped');
assert.equal(p3Stale.height, 48);
assert.equal(p3Stale.overflow?.hasOverflow, true);

console.log('  ✓ Stale-after-unmount retains geometry and marks snapshot state verified');

// -----------------------------------------------------------------------------
// 6. Report Structure & Screen Visit Classification
// -----------------------------------------------------------------------------
console.log('\n--- 6. Report Structure & Screen Visit Classification ---');

const report = diagState.buildDiagnosticReport();
assert.equal(typeof report.probeCount, 'number');
assert.equal(report.probeCount, 3);
assert.ok(Array.isArray(report.probes));
assert.equal(report.probes.length, 3);

// Verify visited and unvisited lists
assert.ok(Array.isArray(report.screensVisited));
assert.ok(Array.isArray(report.screensUnvisited));
assert.ok(report.screensVisited.includes('Settings'), 'Settings must be in screensVisited');
assert.ok(report.screensVisited.includes('Downloads'), 'Downloads must be in screensVisited');
assert.ok(!report.screensVisited.includes('MosqueFinder'), 'Unvisited screen must not be in screensVisited');
assert.ok(report.screensUnvisited.includes('MosqueFinder'), 'MosqueFinder must be in screensUnvisited');
assert.equal(
  report.screensVisited.length + report.screensUnvisited.length,
  diagScreens.KNOWN_SCREENS.length + (report.screensVisited.filter((s) => !diagScreens.KNOWN_SCREENS.includes(s)).length),
  'Partition of visited + unvisited must cover known screens'
);

console.log('  ✓ Diagnostic report shape, probeCount, probes array, and screen visited/unvisited lists verified');

// -----------------------------------------------------------------------------
// 7. Bug Fix 1: Downloads Screen Authoritative Button Layout
// -----------------------------------------------------------------------------
console.log('\n--- 7. Bug Fix 1: Downloads Button Authoritative Event ---');

const downloadsScreenSrc = read('src/screens/DownloadsScreen.tsx');
// Stale card re-recording must NOT exist
assert.ok(
  !downloadsScreenSrc.includes('lastEmptyBtnEventRef'),
  'DownloadsScreen must NOT re-record button layout from card-level handler using stale event ref'
);
// PrimaryButton owns onLayout directly
assert.ok(
  downloadsScreenSrc.includes("onLayout={isDiag ? (e: LayoutChangeEvent) => {"),
  'DownloadsScreen must measure button in PrimaryButton onLayout'
);
assert.ok(
  downloadsScreenSrc.includes("diag.recordNamed('button', e,"),
  'PrimaryButton onLayout must authoritatively record button geometry'
);

console.log('  ✓ Bug Fix 1 verified: Stale card re-record removed; PrimaryButton onLayout is authoritative');

// -----------------------------------------------------------------------------
// 8. Bug Fix 2: Prayer Reminders Chip Label Frame from Stored Gradient
// -----------------------------------------------------------------------------
console.log('\n--- 8. Bug Fix 2: Prayer Reminders Chip Label Frame ---');

const prayerScreenSrc = read('src/screens/PrayerRemindersScreen.tsx');
// Must retrieve gradRect from stored target measurement, not recycled synthetic event
assert.ok(
  prayerScreenSrc.includes("getTargetMeasurement('prayer-reminders-selection-controls')?.rectangles?.gradient"),
  'PrayerRemindersScreen must read stored gradient rectangle from target measurement'
);
assert.ok(
  !prayerScreenSrc.includes('selectedGradLayoutRef.current || e'),
  'PrayerRemindersScreen must never fall back to label event e for gradient frame'
);

// Verify runtime defense in diagnosticState.ts
diagState.resetDiagnosticMeasurements();
// Simulate gradient measured first (72x36)
diagState.recordNamedLayout('prayer-reminders-selection-controls', 'gradient', { x: 0, y: 0, width: 72, height: 36 });
// Simulate label event fired with synthetic event recycled to label dimensions (24.3x19)
diagState.recordNamedLayout('prayer-reminders-selection-controls', 'label', { x: 2, y: 2, width: 24.3, height: 19 }, {
  testID: 'prayer-reminder-chip-selected-label',
  frameWidth: 24.3, // Recycled event bug!
  frameHeight: 19,
  ancestorCard: 'prayer-reminders-selection-controls',
});

const prayerTarget = diagState.getTargetMeasurement('prayer-reminders-selection-controls');
const labelRect = prayerTarget.rectangles.label;
assert.equal(labelRect.width, 24.3);
assert.equal(labelRect.height, 19);
// Frame must come from stored gradient (72x36), NOT from 24.3x19!
assert.equal(labelRect.frameWidth, 72, 'Label frameWidth must come from stored gradient 72dp, not recycled 24.3dp');
assert.equal(labelRect.frameHeight, 36, 'Label frameHeight must come from stored gradient 36dp, not recycled 19dp');
assert.equal(labelRect.edgeOverflow?.hasOverflow, false, 'Label inside gradient must report no overflow');

console.log('  ✓ Bug Fix 2 verified: Label frame comes from stored gradient, preventing false overflow');

// -----------------------------------------------------------------------------
// 9. Shared Primitives Instrumentation & AppText Rationale
// -----------------------------------------------------------------------------
console.log('\n--- 9. Shared Primitives Instrumentation & AppText Rationale ---');

const primaryBtnSrc = read('src/components/ui/PrimaryButton.tsx');
const outlineBtnSrc = read('src/components/ui/OutlineButton.tsx');
const chipSrc = read('src/components/ui/Chip.tsx');
const searchSrc = read('src/components/ui/SearchField.tsx');
const cardSrc = read('src/components/ui/PremiumCard.tsx');
const tabsSrc = read('src/components/ui/ScreenTabs.tsx');
const inputSrc = read('src/components/ui/InputField.tsx');
const appTextSrc = read('src/components/ui/AppText.tsx');

assert.ok(primaryBtnSrc.includes("useAutoProbe(testID, 'PrimaryButton'"), 'PrimaryButton must call useAutoProbe');
assert.ok(outlineBtnSrc.includes("useAutoProbe(testID, 'OutlineButton'"), 'OutlineButton must call useAutoProbe');
assert.ok(chipSrc.includes("useAutoProbe(actualTestId, 'Chip'"), 'Chip must call useAutoProbe');
assert.ok(searchSrc.includes("useAutoProbe(testID, 'SearchField'"), 'SearchField must call useAutoProbe');
assert.ok(cardSrc.includes("useAutoProbe(testID, 'PremiumCard')"), 'PremiumCard must call useAutoProbe');
assert.ok(tabsSrc.includes("useAutoProbe(tabTestId, 'ScreenTab'"), 'ScreenTabs must call useAutoProbe for each tab');
assert.ok(inputSrc.includes("useAutoProbe(testID, 'InputField'"), 'InputField must call useAutoProbe');

// In v1.1.92, AppText is instrumented with useAutoProbe
assert.ok(appTextSrc.includes('useAutoProbe'), 'AppText must call useAutoProbe in v1.1.92');

console.log('  ✓ Shared primitives instrumented; AppText instrumentation verified');

// -----------------------------------------------------------------------------
// 10. Screen Identification via DiagScreenProvider in App.tsx
// -----------------------------------------------------------------------------
console.log('\n--- 10. Screen Identification via DiagScreenProvider ---');

const appSrc = read('App.tsx');
assert.ok(appSrc.includes('<DiagScreenProvider'), 'App.tsx must mount DiagScreenProvider');
assert.ok(appSrc.includes('name={activeScreenName}'), 'App.tsx must pass active screen name to DiagScreenProvider');
assert.ok(read('src/lib/diagnostic/diagnosticScreenContext.tsx').includes('useDiagScreen'), 'diagnosticScreenContext must export useDiagScreen');

console.log('  ✓ Screen identification wired globally in App.tsx route switch');

// -----------------------------------------------------------------------------
// 11. Modal UI & Touch Target Accessibility
// -----------------------------------------------------------------------------
console.log('\n--- 11. Modal UI & Touch Target Accessibility ---');

const modalSrc = read('src/components/diagnostic/RtlDiagnosticModal.tsx');
assert.ok(modalSrc.includes('testID="diag-screen-coverage-card"'), 'Modal must render screen coverage card');
assert.ok(modalSrc.includes('testID="diag-probes-card"'), 'Modal must render probes card');
assert.ok(modalSrc.includes('testID="diag-copy-probes-btn"'), 'Modal must render copy probes button');
assert.ok(modalSrc.includes('minHeight: 44'), 'All actions must guarantee minimum 44dp height');
assert.ok(modalSrc.includes('minWidth: 44'), 'All actions must guarantee minimum 44dp width');

console.log('  ✓ Modal UI elements, Screen Coverage, Probes card, and >=44dp touch targets verified');

console.log('\n============================================================');
console.log('ALL AUTOMATIC PRIMITIVE PROBE (v1.1.91) TESTS PASSED (11/11)');
console.log('============================================================\n');
// D1 regression guard: default testIDs repeat across screens, so the composed
// probe id must include a globally unique instance sequence. Two probes sharing
// a default id must never collapse into one record.
{
  const seqA = diagState.getNextProbeInstanceSeq();
  const seqB = diagState.getNextProbeInstanceSeq();
  assert.ok(seqB > seqA, 'probe instance sequence must be monotonically increasing');
  assert.notEqual(seqA, seqB, 'probe instance sequence must never repeat');

  const hookSrc = fs.readFileSync('src/lib/diagnostic/diagnosticState.ts', 'utf8');
  const usesScreen = /\$\{screen \|\| 'unknown'\}::\$\{effectiveKind\}::\$\{baseId\}#\$\{instanceSeq\}/.test(hookSrc);
  assert.ok(usesScreen, 'probe id must compose screen::kind::base#instance for global uniqueness');
  assert.ok(!/const stableId = isEnabled\s*\n\s*\? \(\(id && id\.trim/.test(hookSrc), 'probe id must not fall back to the bare caller testID');
  console.log('  \u2713 probe ids are globally unique (screen::kind::base#instance)');
}
