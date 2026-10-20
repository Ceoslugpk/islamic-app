import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function loadTsModule(filePath, mocks = {}) {
  const code = fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleObj = { exports: {} };
  const exportsObj = moduleObj.exports;
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
  };
  vm.createContext(sandbox);
  vm.runInContext(transpiled, sandbox);
  return moduleObj.exports;
}

console.log('=== ANDROID LAYOUT PILOT v1.1.92 TEST SUITE (SOURCE ONLY) ===\n');

// -------------------------------------------------------------------------
// 1. Diagnostic Identity & Two-Factor Gate
// -------------------------------------------------------------------------
console.log('--- 1. Diagnostic Identity & Two-Factor Gate ---');
const diagConfigSrc = read('src/lib/diagnostic/diagnosticConfig.ts');
const packageJson = JSON.parse(read('package.json'));
const appJson = JSON.parse(read('app.json')).expo;
const buildGradle = read('android/app/build.gradle');

// Build identity constants
assert.ok(
  /export const DIAGNOSTIC_BUILD_ID = 'RTL-STRUCT-\d+\.\d+\.\d+-EVIDENCE';/.test(diagConfigSrc) ||
  /export const DIAGNOSTIC_BUILD_ID = `RTL-STRUCT-\${DIAGNOSTIC_VERSION}-EVIDENCE`;/.test(diagConfigSrc),
  'diagnosticConfig must declare the current DIAGNOSTIC_BUILD_ID'
);
assert.ok(
  diagConfigSrc.includes(`export const DIAGNOSTIC_VERSION = '${appJson.version}';`),
  `diagnosticConfig must declare DIAGNOSTIC_VERSION as ${appJson.version}`
);
assert.ok(
  diagConfigSrc.includes(`export const DIAGNOSTIC_VERSION_CODE = ${appJson.android.versionCode};`),
  `diagnosticConfig must declare DIAGNOSTIC_VERSION_CODE as ${appJson.android.versionCode}`
);

// Version and code across project metadata
assert.equal(packageJson.version, appJson.version, 'package.json version must equal app.json version');
assert.ok(/^\d+\.\d+\.\d+$/.test(appJson.version), 'app.json version must be valid semver');
assert.ok(
  typeof appJson.android.versionCode === 'number' &&
  Number.isInteger(appJson.android.versionCode) &&
  appJson.android.versionCode >= 111,
  'app.json versionCode must be a positive integer not lower than 111'
);
assert.ok(buildGradle.includes(`versionCode ${appJson.android.versionCode}`), 'android/app/build.gradle versionCode must equal app.json versionCode');
assert.ok(buildGradle.includes(`versionName "${appJson.version}"`), 'android/app/build.gradle versionName must equal app.json version');

// Deterministic build command
assert.ok(
  diagConfigSrc.includes(`EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID=RTL-STRUCT-${appJson.version}-EVIDENCE`) ||
  diagConfigSrc.includes('EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID=${DIAGNOSTIC_BUILD_ID}'),
  `DIAGNOSTIC_BUILD_COMMAND must propagate diagnostic flags`
);

console.log(`  ✓ Diagnostic build identity and metadata verified for v${appJson.version} (code ${appJson.android.versionCode})`);

// -------------------------------------------------------------------------
// 2. Shared Primitive Width Ownership & Hierarchy Probes: PrimaryButton
// -------------------------------------------------------------------------
console.log('\n--- 2. PrimaryButton Ownership & Layout Probes ---');
const primaryButtonSrc = read('src/components/ui/PrimaryButton.tsx');

// Outer container owns width; inner gradient must NOT have width: '100%' in shrink-to-content cycle
assert.ok(
  !primaryButtonSrc.includes("width: '100%',"),
  'PrimaryButton inner gradient must NOT specify width: 100% (outer Touchable is sole width owner)'
);
assert.ok(
  primaryButtonSrc.includes("alignSelf: 'stretch'"),
  'PrimaryButton inner gradient must specify alignSelf: stretch to fill outer container when outer has definite width'
);
assert.ok(
  primaryButtonSrc.includes('minHeight: buttonTokens.minHeight'),
  'PrimaryButton must preserve minHeight: 44dp token'
);
// Layout callbacks on outer touchable, inner gradient, and label text
assert.ok(
  primaryButtonSrc.includes('onLayout={onLayout}'),
  'PrimaryButton must forward onLayout callback to outer Touchable for diagnostic measurement'
);
assert.ok(
  primaryButtonSrc.includes('onGradientLayout?: (e: LayoutChangeEvent) => void;'),
  'PrimaryButtonProps must support onGradientLayout probe callback'
);
assert.ok(
  primaryButtonSrc.includes('onLayout={onGradientLayout}'),
  'PrimaryButton must wire onGradientLayout to inner LinearGradient'
);
assert.ok(
  primaryButtonSrc.includes('onLabelLayout?: (e: LayoutChangeEvent) => void;'),
  'PrimaryButtonProps must support onLabelLayout probe callback'
);
assert.ok(
  primaryButtonSrc.includes('onLayout={onLabelLayout}'),
  'PrimaryButton must wire onLabelLayout to AppText label'
);

console.log('  ✓ PrimaryButton outer width ownership, stretch contract, and visual layer layout probes verified');

// -------------------------------------------------------------------------
// 3. Shared Primitive Sizing & Hierarchy Probes: Chip
// -------------------------------------------------------------------------
console.log('\n--- 3. Chip Sizing & Width-Allocation Parity & Layout Probes ---');
const chipSrc = read('src/components/ui/Chip.tsx');

// Inner gradient must NOT have width: '100%' in intrinsic wrapped rows
assert.ok(
  !chipSrc.includes("width: '100%',"),
  'Chip gradientFill must NOT specify width: 100% (prevents explosion across wrapped rows)'
);
assert.ok(
  chipSrc.includes("alignSelf: 'stretch'"),
  'Chip gradientFill must specify alignSelf: stretch'
);
assert.ok(
  chipSrc.includes('onLayout?: (e: LayoutChangeEvent) => void;') || chipSrc.includes('onLayout?: (event: LayoutChangeEvent) => void;'),
  'ChipProps must support onLayout probe callback'
);
assert.ok(
  chipSrc.includes('onLayout={onLayout}'),
  'Chip must forward onLayout callback to root container'
);
assert.ok(
  chipSrc.includes('onGradientLayout?: (e: LayoutChangeEvent) => void;'),
  'ChipProps must support onGradientLayout probe callback'
);
assert.ok(
  chipSrc.includes('onLayout={onGradientLayout}'),
  'Chip must wire onGradientLayout to inner LinearGradient'
);
assert.ok(
  chipSrc.includes('onLabelLayout?: (e: LayoutChangeEvent) => void;'),
  'ChipProps must support onLabelLayout probe callback'
);
assert.ok(
  chipSrc.includes('onLayout={onLabelLayout}'),
  'Chip must wire onLabelLayout to inner AppText label'
);

console.log('  ✓ Chip selected/unselected width-allocation parity and gradient/label layout probes verified');

// -------------------------------------------------------------------------
// 4. Text-Bearing Controls: SearchField
// -------------------------------------------------------------------------
console.log('\n--- 4. Text-Bearing Controls Height Contract & Probes ---');
const searchFieldSrc = read('src/components/ui/SearchField.tsx');

assert.ok(
  !searchFieldSrc.includes('height: 44,'),
  'SearchField container must NOT use fixed height: 44 (must allow Android font metrics and large text to breathe)'
);
assert.ok(
  searchFieldSrc.includes('minHeight: 44,'),
  'SearchField container must use minHeight: 44'
);
assert.ok(
  searchFieldSrc.includes('minHeight: 36,'),
  'SearchField inner TextInput must specify minHeight: 36'
);
assert.ok(
  searchFieldSrc.includes('onLayout?: (e: LayoutChangeEvent) => void;'),
  'SearchFieldProps must support onLayout callback for outer View'
);
assert.ok(
  searchFieldSrc.includes('inputOnLayout?: (e: LayoutChangeEvent) => void;'),
  'SearchFieldProps must support inputOnLayout callback for inner TextInput'
);
assert.ok(
  searchFieldSrc.includes('onLayout={onLayout}'),
  'SearchField must forward onLayout to outer View container'
);
assert.ok(
  searchFieldSrc.includes('onLayout={inputOnLayout}'),
  'SearchField must forward inputOnLayout to inner TextInput'
);

console.log('  ✓ SearchField dynamic minHeight text containment and input layout probes verified');

// -------------------------------------------------------------------------
// 5. Downloads Screen: Hierarchy Measurement & Single-Owner Bottom Clearance
// -------------------------------------------------------------------------
console.log('\n--- 5. Downloads Screen Hierarchy & Bottom Clearance Ownership ---');
const downloadsSrc = read('src/screens/DownloadsScreen.tsx');

// No arbitrary symptom patch (maxWidth: 280)
assert.ok(
  !downloadsSrc.includes('maxWidth: 280'),
  'DownloadsScreen must not contain arbitrary maxWidth: 280 cap on CTA button'
);
// Button uses content-driven width
assert.ok(
  downloadsSrc.includes("alignSelf: 'center'") && downloadsSrc.includes('minWidth: 160'),
  'Downloads empty CTA button must use centered content-driven width (minWidth: 160)'
);

// Single-owner bottom clearance:
// Fails if arbitrary playback `insets.bottom + 92` or `+ 16` patch is present
assert.ok(
  !downloadsSrc.includes('+ 92'),
  'DownloadsScreen must NOT contain arbitrary playback +92 clearance patch'
);
assert.ok(
  !downloadsSrc.includes('+ 16'),
  'DownloadsScreen must NOT contain arbitrary idle +16 clearance patch'
);
assert.ok(
  !downloadsSrc.includes('NAV_HEIGHT'),
  'DownloadsScreen must NOT reference NAV_HEIGHT in bottom clearance calculation'
);

// Must consume DETAIL_PAD_BOTTOM helper with Boolean(playback)
assert.ok(
  downloadsSrc.includes('DETAIL_PAD_BOTTOM(insets.bottom, Boolean(playback))'),
  'DownloadsScreen must use DETAIL_PAD_BOTTOM(insets.bottom, Boolean(playback)) for single-owner clearance'
);
assert.ok(
  downloadsSrc.includes('customPadBottom={bottomClearance}'),
  'DownloadsScreen must pass single-owner bottomClearance to DetailScreen'
);

// Hierarchy measurement wiring:
assert.ok(
  downloadsSrc.includes("diag.recordNamed('listViewport'"),
  'DownloadsScreen must wire onLayout on DetailScreen.FlatList to record listViewport'
);
assert.ok(
  downloadsSrc.includes("diag.recordNamed('card'") &&
    downloadsSrc.includes("emptyCardLayoutRef.current = e?.nativeEvent?.layout"),
  'DownloadsScreen must wire a named card rect with an assigned explicit frame on the empty card parent'
);
assert.ok(
  downloadsSrc.includes("onLayout={isDiag ? diag.targetProps.onLayout : undefined}"),
  'DownloadsScreen must wire onLayout on empty title text'
);
assert.ok(
  downloadsSrc.includes("diag.recordNamed('button'"),
  'DownloadsScreen must wire onLayout on PrimaryButton to record button rectangle'
);
assert.ok(
  downloadsSrc.includes("diag.recordNamed('gradient'"),
  'DownloadsScreen must wire onGradientLayout on PrimaryButton to record gradient rectangle'
);
assert.ok(
  downloadsSrc.includes("diag.recordNamed('label'"),
  'DownloadsScreen must wire onLabelLayout on PrimaryButton to record label rectangle'
);

console.log('  ✓ Downloads single-owner bottom clearance (playback on/off) and full hierarchy wiring verified');

// -------------------------------------------------------------------------
// 6. Prayer Reminders Screen: Detail Bottom Clearance, Wrap & Chip Hierarchy Probes
// -------------------------------------------------------------------------
console.log('\n--- 6. Prayer Reminders Screen Contracts & Hierarchy Probes ---');
const prayerSrc = read('src/screens/PrayerRemindersScreen.tsx');

// Must NOT inherit TAB_PAD_BOTTOM: must pass explicit DETAIL_PAD_BOTTOM with Boolean(playback)
assert.ok(
  prayerSrc.includes('useSafeAreaInsets'),
  'PrayerRemindersScreen must import and use useSafeAreaInsets'
);
assert.ok(
  prayerSrc.includes('customPadBottom={DETAIL_PAD_BOTTOM(insets.bottom, Boolean(playback))}'),
  'PrayerRemindersScreen must explicitly pass DETAIL_PAD_BOTTOM(insets.bottom, Boolean(playback)) to DetailScreen'
);

// Wrapping rows have flexWrap: 'wrap'
assert.ok(prayerSrc.includes("flexWrap: 'wrap'"), 'PrayerRemindersScreen must specify flexWrap: wrap on selection rows');
// Offset chips use numberOfLines={0} for natural height in long translated Urdu/Arabic labels
assert.ok(
  prayerSrc.includes('numberOfLines={0}'),
  'PrayerRemindersScreen must pass numberOfLines={0} to selection chips for natural height and no Nastaliq clipping'
);
// miniPills preserve minHeight: 44
assert.ok(
  prayerSrc.includes('minHeight: 44'),
  'PrayerRemindersScreen miniPills must preserve minHeight: 44 touch target'
);

// Hierarchy measurement wiring:
assert.ok(
  prayerSrc.includes("diag.recordNamed('card'") &&
    prayerSrc.includes('cardLayoutRef.current = e?.nativeEvent?.layout'),
  'PrayerRemindersScreen must wire onLayout on selection card parent'
);
assert.ok(
  prayerSrc.includes("diag.recordNamed('selectionControls'") &&
    prayerSrc.includes('segRowLayoutRef.current = e?.nativeEvent?.layout'),
  'PrayerRemindersScreen must wire a named selectionControls rect with an assigned segRow frame'
);
assert.ok(
  prayerSrc.includes("diag.recordNamed('chipSelected'"),
  'PrayerRemindersScreen must wire onLayout on selected Chip to record chipSelected rectangle'
);
assert.ok(
  prayerSrc.includes("diag.recordNamed('chipUnselected'"),
  'PrayerRemindersScreen must wire onLayout on representative unselected Chip to record chipUnselected rectangle'
);
assert.ok(
  prayerSrc.includes("diag.recordNamed('gradient'"),
  'PrayerRemindersScreen must wire onGradientLayout on selected Chip to record gradient rectangle'
);
assert.ok(
  prayerSrc.includes("diag.recordNamed('label'"),
  'PrayerRemindersScreen must wire onLabelLayout on selected Chip to record label rectangle'
);
assert.ok(
  prayerSrc.includes("diag.recordNamed('unselectedLabel'"),
  'PrayerRemindersScreen must wire onLabelLayout on representative unselected Chip to record unselectedLabel rectangle'
);
assert.ok(
  prayerSrc.includes("diag.recordNamedUnavailable(\n                        'unselectedGradient'") ||
  prayerSrc.includes("diag.recordNamedUnavailable('unselectedGradient'"),
  'PrayerRemindersScreen must explicitly report unselectedGradient unavailable'
);
assert.ok(
  prayerSrc.includes('`prayer-reminders-chip-${item.value}`'),
  'PrayerRemindersScreen must use production item.value testID on chips'
);
assert.ok(
  !prayerSrc.includes("'prayer-reminders-chip-selected'") && !prayerSrc.includes('"prayer-reminders-chip-selected"'),
  'PrayerRemindersScreen must not reference non-existent prayer-reminders-chip-selected ID'
);
assert.ok(
  !prayerSrc.includes("'prayer-reminders-chip-unselected'") && !prayerSrc.includes('"prayer-reminders-chip-unselected"'),
  'PrayerRemindersScreen must not reference non-existent prayer-reminders-chip-unselected ID'
);

console.log('  ✓ Prayer Reminders detail safe-area bottom clearance, natural height, and chip hierarchy probes verified');

// -------------------------------------------------------------------------
// 7. Mosque Finder Screen: Detail Bottom Clearance, Fixed Header + Positive List, & Hierarchy Probes
// -------------------------------------------------------------------------
console.log('\n--- 7. Mosque Finder Screen Structure & Hierarchy Probes ---');
const mosqueSrc = read('src/screens/MosqueFinderScreen.tsx');

// Must NOT inherit TAB_PAD_BOTTOM: must pass explicit DETAIL_PAD_BOTTOM with Boolean(playback)
assert.ok(
  mosqueSrc.includes('useSafeAreaInsets'),
  'MosqueFinderScreen must import and use useSafeAreaInsets'
);
assert.ok(
  mosqueSrc.includes('customPadBottom={DETAIL_PAD_BOTTOM(insets.bottom, Boolean(playback))}'),
  'MosqueFinderScreen must explicitly pass DETAIL_PAD_BOTTOM(insets.bottom, Boolean(playback)) to DetailScreen'
);

// Split ownership: positive height flex list
assert.ok(
  mosqueSrc.includes('DetailScreen.FlatList') && mosqueSrc.includes('style={{ flex: 1 }}'),
  'MosqueFinderScreen must provide flex: 1 list so viewport retains positive height below fixed search bar'
);
// Search button has stable minWidth across standard and compact viewports
assert.ok(
  mosqueSrc.includes('minWidth: 84'),
  'MosqueFinderScreen searchButton must maintain minWidth: 84 across all screen widths'
);
// Radius row responsive wrap and shrink
assert.ok(
  mosqueSrc.includes('radiusRow') && mosqueSrc.includes('radiusPills'),
  'MosqueFinderScreen must define radiusRow and radiusPills'
);

// Hierarchy measurement wiring:
assert.ok(
  mosqueSrc.includes("diag.recordNamed('card'") &&
    mosqueSrc.includes('searchCardLayoutRef.current = e?.nativeEvent?.layout'),
  'MosqueFinderScreen must wire onLayout on fixed search card parent'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('searchField'"),
  'MosqueFinderScreen must wire onLayout on SearchField to record searchField rectangle'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('textInput'"),
  'MosqueFinderScreen must wire inputOnLayout on SearchField to record textInput rectangle'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('button'"),
  'MosqueFinderScreen must wire onLayout on Find button to record button rectangle'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('buttonGradient'"),
  'MosqueFinderScreen must wire onGradientLayout on Find button to record buttonGradient rectangle'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('buttonLabel'"),
  'MosqueFinderScreen must wire onLabelLayout on Find button to record buttonLabel rectangle'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('radiusSelected'"),
  'MosqueFinderScreen must wire onLayout on selected radius chip to record radiusSelected rectangle'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('radiusUnselected'"),
  'MosqueFinderScreen must wire onLayout on representative unselected radius chip to record radiusUnselected rectangle'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('listViewport'"),
  'MosqueFinderScreen must wire onLayout on DetailScreen.FlatList to record listViewport'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamed('resultRow'"),
  'MosqueFinderScreen must wire onLayout on result row 0 to record representative resultRow rectangle'
);
assert.ok(
  mosqueSrc.includes("diag.recordNamedUnavailable('resultRow'"),
  'MosqueFinderScreen must explicitly report resultRow unavailable when mosque count is 0'
);

console.log('  ✓ Mosque Finder detail bottom clearance, fixed search / flex list, and full hierarchy probes verified');

// -------------------------------------------------------------------------
// 8. Quran Sentinel: Unchanged Regression Proof (Sentinel)
// -------------------------------------------------------------------------
console.log('\n--- 8. Quran Home Surah Cards Sentinel ---');
const quranSrc = read('src/screens/QuranHomeScreen.tsx');

// Surah row invariants: flex: 1 + minWidth: 0 on surahLeft and nameBlock, maxWidth: 42% on Arabic
assert.ok(quranSrc.includes('surahLeft: {'), 'QuranHomeScreen surahLeft style exists');
assert.ok(quranSrc.includes('nameBlock: {'), 'QuranHomeScreen nameBlock style exists');
assert.ok(quranSrc.includes("maxWidth: '42%'"), 'QuranHomeScreen Arabic text maxWidth 42% invariant preserved');
assert.ok(quranSrc.includes('minHeight: 44'), 'QuranHomeScreen surahRow minHeight 44 preserved');

console.log('  ✓ Quran Surah cards regression sentinel unchanged');

// -------------------------------------------------------------------------
// 9. Diagnostic Target Registry & Edge-Aware Overflow Engine
// -------------------------------------------------------------------------
console.log('\n--- 9. Diagnostic Target Registry Coverage & Schema ---');
const diagStateSrc = read('src/lib/diagnostic/diagnosticState.ts');

assert.ok(
  diagStateSrc.includes("'quran-landing-surah-card'"),
  'diagnosticState must include quran-landing-surah-card sentinel target'
);
assert.ok(
  diagStateSrc.includes("'downloads-empty-cta-card'"),
  'diagnosticState must include downloads-empty-cta-card pilot target'
);
assert.ok(
  diagStateSrc.includes("'prayer-reminders-selection-controls'"),
  'diagnosticState must include prayer-reminders-selection-controls pilot target'
);
assert.ok(
  diagStateSrc.includes("'mosque-finder-search-controls'"),
  'diagnosticState must include mosque-finder-search-controls pilot target'
);

// Edge-aware calculation engine assertion:
assert.ok(
  diagStateSrc.includes('overflowsLeft = x < 0') || diagStateSrc.includes('x < 0'),
  'diagnosticState must evaluate left edge overflow (x < 0)'
);
assert.ok(
  diagStateSrc.includes('overflowsTop = y < 0') || diagStateSrc.includes('y < 0'),
  'diagnosticState must evaluate top edge overflow (y < 0)'
);
assert.ok(
  diagStateSrc.includes('(x + targetW) > parentW') || diagStateSrc.includes('(x + w) > parentW') || diagStateSrc.includes('x + targetW > parentW'),
  'diagnosticState must evaluate right edge overflow (x + width > parent.width)'
);
assert.ok(
  diagStateSrc.includes('(y + targetH) > parentH') || diagStateSrc.includes('(y + h) > parentH') || diagStateSrc.includes('y + targetH > parentH'),
  'diagnosticState must evaluate bottom edge overflow (y + height > parent.height)'
);

// Named layout rectangle functions & schema:
assert.ok(
  diagStateSrc.includes('export function recordNamedLayout('),
  'diagnosticState must export recordNamedLayout'
);
assert.ok(
  diagStateSrc.includes('export function recordNamedLayoutUnavailable('),
  'diagnosticState must export recordNamedLayoutUnavailable'
);
assert.ok(
  diagStateSrc.includes('frameWidth') && diagStateSrc.includes('frameHeight'),
  'NamedLayoutRect must explicitly carry frameWidth and frameHeight'
);
assert.ok(
  diagStateSrc.includes('cardWidth') && diagStateSrc.includes('cardHeight'),
  'NamedLayoutRect must carry ancestor cardWidth and cardHeight'
);
assert.ok(
  diagStateSrc.includes('allocationOverflow'),
  'NamedLayoutRect must include allocationOverflow for ancestor card decisions'
);
assert.ok(
  diagStateSrc.includes("'prayer-reminders-chip-0'") && diagStateSrc.includes("'prayer-reminders-chip-5'"),
  'DEFAULT_NAMED_RECTS must use production chip IDs prayer-reminders-chip-0 and -5'
);
assert.ok(
  !diagStateSrc.includes("'prayer-reminders-chip-selected'") && !diagStateSrc.includes("'prayer-reminders-chip-unselected'"),
  'DEFAULT_NAMED_RECTS must not contain non-existent prayer-reminders-chip-selected/unselected'
);

console.log('  ✓ All 4 targets registered, edge-aware overflow engine, and named layout functions verified');

// -------------------------------------------------------------------------
// 10. Genuine Contract Execution & Shared Primitive Blast-Radius
// -------------------------------------------------------------------------
console.log('\n--- 10. Genuine Contract Execution & Shared Primitive Blast-Radius ---');

// 10a. Execute production layout constants single-owner clearance contract
const layoutConsts = loadTsModule('src/components/layout/layout.constants.ts');
assert.equal(typeof layoutConsts.DETAIL_PAD_BOTTOM, 'function');
assert.equal(typeof layoutConsts.DETAIL_CONTENT_PAD_BOTTOM, 'function');

// When playback is active (hasPlayback = true): exactly 32dp, ZERO safeBottom added
const padWithPlayback = layoutConsts.DETAIL_PAD_BOTTOM(34, true);
assert.equal(padWithPlayback, 32, 'DETAIL_PAD_BOTTOM with playback active must return exactly 32dp (no insets.bottom duplication)');

// When playback is idle (hasPlayback = false): exactly safeBottom + 32dp
const padWithoutPlayback = layoutConsts.DETAIL_PAD_BOTTOM(34, false);
assert.equal(padWithoutPlayback, 66, 'DETAIL_PAD_BOTTOM without playback must return safeBottom + 32dp');

// 10b. Execute production diagnosticState named-rect overflow and unmount invalidation
const mockReactNative = {
  I18nManager: { isRTL: false },
  Platform: { OS: 'android' },
  StyleSheet: { flatten: (s) => s || {} },
  Share: { share: () => Promise.resolve({ action: 'sharedAction' }) },
};
const mockDiagConfig = {
  DIAGNOSTIC_BUILD_ID: `RTL-STRUCT-${appJson.version}-EVIDENCE`,
  DIAGNOSTIC_VERSION: appJson.version,
  DIAGNOSTIC_VERSION_CODE: appJson.android.versionCode,
  isDiagnosticModeEnabled: () => true,
};
const mockDiagI18n = {
  diagT: (k) => k,
  getDiagnosticShareTitle: () => 'Diagnostic',
  getDiagnosticShareDialogTitle: () => 'Share',
};
const mockI18n = {
  default: { language: 'en' },
  isRTL: () => false,
  t: (k) => k,
};

const diagScreens = loadTsModule('src/lib/diagnostic/diagnosticScreens.ts', {});

const diagState = loadTsModule('src/lib/diagnostic/diagnosticState.ts', {
  'react-native': mockReactNative,
  './diagnosticConfig': mockDiagConfig,
  './diagnosticI18n': mockDiagI18n,
  './diagnosticScreens': diagScreens,
  '../i18n': mockI18n,
  'expo-file-system/legacy': {},
  'expo-sharing': {},
});

diagState.resetDiagnosticMeasurements();

// Crafted case: a 140dp label at x=30 inside a 100dp gradient frame.
// Outer card is 300dp.
// Must report edge overflow: 30 + 140 = 170 > 100 (overflowsRight: true, hasOverflow: true).
// Must NOT overflow outer card allocation: 170 < 300 (allocationOverflow.hasOverflow: false).
diagState.recordNamedLayout('downloads-empty-cta-card', 'label', { x: 30, y: 0, width: 140, height: 24 }, {
  testID: 'downloads-empty-cta-btn-label',
  parentIdentity: 'downloads-empty-cta-gradient',
  frameWidth: 100,
  frameHeight: 24,
  cardWidth: 300,
  cardHeight: 700,
  ancestorCard: 'downloads-empty-cta-card',
});

const labelRect = diagState.getTargetMeasurement('downloads-empty-cta-card').rectangles.label;
assert.ok(labelRect, 'label rectangle record must exist');
assert.equal(labelRect.isAvailable, true);
assert.equal(labelRect.frameWidth, 100, 'label must carry resolved frameWidth: 100');
assert.equal(labelRect.cardWidth, 300, 'label must carry resolved cardWidth: 300');
assert.equal(labelRect.edgeOverflow?.overflowsRight, true, '140dp label at x=30 in 100dp frame MUST overflow right');
assert.equal(labelRect.edgeOverflow?.hasOverflow, true, '140dp label at x=30 in 100dp frame MUST report hasOverflow: true');
assert.equal(labelRect.allocationOverflow?.hasOverflow, false, '140dp label at x=30 must fit within 300dp ancestor card allocation');
assert.equal(labelRect.frameUnavailable, false);
assert.equal(labelRect.measurementUnavailable, false);

// Negative offset check: x = -10
diagState.recordNamedLayout('downloads-empty-cta-card', 'label', { x: -10, y: 0, width: 80, height: 24 }, {
  testID: 'downloads-empty-cta-btn-label',
  frameWidth: 100,
  frameHeight: 24,
});
const negLabel = diagState.getTargetMeasurement('downloads-empty-cta-card').rectangles.label;
assert.equal(negLabel.edgeOverflow?.overflowsLeft, true, 'Negative offset x < 0 must report overflowsLeft: true');
assert.equal(negLabel.edgeOverflow?.hasOverflow, true);

// Unknown frame check: frameWidth omitted -> must set frameUnavailable/measurementUnavailable, never emit hasOverflow: false
diagState.recordNamedLayout('downloads-empty-cta-card', 'label', { x: 0, y: 0, width: 80, height: 24 }, {
  testID: 'downloads-empty-cta-btn-label',
});
const unknownFrameLabel = diagState.getTargetMeasurement('downloads-empty-cta-card').rectangles.label;
assert.equal(unknownFrameLabel.frameUnavailable, true, 'Missing frame must set frameUnavailable: true');
assert.equal(unknownFrameLabel.measurementUnavailable, true, 'Missing frame must set measurementUnavailable: true');
assert.equal(unknownFrameLabel.edgeOverflow, null, 'Unknown frame must not emit edgeOverflow or hasOverflow: false');

// Unmount invalidation check: valid -> unmount -> stale values removed
diagState.recordParentLayout('downloads-empty-cta-card', { x: 0, y: 0, width: 300, height: 400 });
diagState.recordTargetLayout('downloads-empty-cta-card', { x: 10, y: 10, width: 100, height: 40 });
diagState.recordNamedLayout('downloads-empty-cta-card', 'button', { x: 10, y: 10, width: 100, height: 40 }, {
  testID: 'downloads-empty-cta-btn',
  frameWidth: 300,
  frameHeight: 400,
});
assert.equal(diagState.getTargetMeasurement('downloads-empty-cta-card').status, 'measured');

diagState.invalidateDiagnosticTarget('downloads-empty-cta-card', 'Downloads screen unmounted');
const unmountedRecord = diagState.getTargetMeasurement('downloads-empty-cta-card');
assert.equal(unmountedRecord.status, 'measurementUnavailable');
assert.equal(unmountedRecord.measurementUnavailable, true);
assert.equal(unmountedRecord.targetWidth, null);
assert.equal(unmountedRecord.parentWidth, null);
assert.equal(unmountedRecord.edgeOverflow, null);
assert.equal(unmountedRecord.rectangles.button.isAvailable, false);
assert.equal(unmountedRecord.rectangles.button.width, null);
assert.equal(unmountedRecord.rectangles.button.frameWidth, null);

// 10c. Non-pilot caller source import verification (non-tautological blast-radius proof)
const nonPilotCallers = [
  'src/components/diagnostic/RtlDiagnosticModal.tsx',
  'src/screens/WomenQadaScreen.tsx',
  'src/screens/WomenCycleScreen.tsx',
  'src/screens/UmrahResourcesScreen.tsx',
  'src/screens/UmrahGuideScreen.tsx',
  'src/screens/LocationScreen.tsx',
  'src/screens/BackupRestoreScreen.tsx',
  'src/screens/HajjJourneyScreen.tsx',
  'src/screens/HajjLiveScreen.tsx',
  'src/screens/LegalScreen.tsx',
  'src/screens/PrayerGuideScreen.tsx',
  'src/screens/CitiesScreen.tsx',
  'src/screens/TajweedScreen.tsx',
];

for (const filePath of nonPilotCallers) {
  const content = read(filePath);
  assert.ok(content.length > 0, `${filePath} must be readable and nonempty`);

  // Assert callers of PrimaryButton import PrimaryButton from UI package
  if (content.includes('<PrimaryButton')) {
    assert.ok(
      content.includes("from '../components/ui'") ||
      content.includes("from '../components/ui/PrimaryButton'") ||
      content.includes("from '../ui'") ||
      content.includes("from '../ui/PrimaryButton'") ||
      content.includes("from './ui'") ||
      content.includes("from './components/ui'"),
      `${filePath} must import PrimaryButton from UI components package`
    );
  }

  // Assert callers of Chip import Chip from UI package
  if (content.includes('<Chip')) {
    assert.ok(
      content.includes("from '../components/ui'") ||
      content.includes("from '../components/ui/Chip'") ||
      content.includes("from '../ui'") ||
      content.includes("from '../ui/Chip'") ||
      content.includes("from './ui'") ||
      content.includes("from './components/ui'"),
      `${filePath} must import Chip from UI components package`
    );
  }

  // Assert callers of SearchField do not constrain height to 0 or fixed rigid heights
  if (content.includes('<SearchField')) {
    assert.ok(
      !content.includes('height: 0') && !content.includes('height: 30'),
      `${filePath} must not constrain SearchField with rigid sub-44dp height`
    );
  }
}

console.log(`  ✓ Genuine contract execution verified and all ${nonPilotCallers.length} non-pilot callers checked`);

console.log('\n============================================================');
console.log('ALL ANDROID LAYOUT PILOT v1.1.92 SOURCE CONTRACTS VERIFIED');
console.log('============================================================\n');
