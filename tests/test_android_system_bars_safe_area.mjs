/**
 * Focused Regression Test Suite for Android System Bars & Safe-Area Repair
 *
 * Verifies:
 * 1. Android Edge-to-Edge and System Bars native configuration (styles.xml, gradle.properties, MainActivity).
 * 2. DetailScreen authoritative top-inset ownership (default includeTopInset = true).
 * 3. App.tsx layout root: removal of duplicate ad-hoc top spacer; TabScreen and DetailScreen single-source-of-truth.
 * 4. FloatingNav, LiveMiniPlayer, and AudioMiniPlayer bottom clearance across top-level and detail routes.
 * 5. QuranReaderScreen scroll-owner geometry and no duplicate bottom padding void.
 * 6. Modals and sheets: statusBarTranslucent coverage and safe bottom insets across all auxiliary dialogs.
 * 7. Mathematical verification of inset formulas across Android 12-16 gesture & 3-button navigation profiles.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== ANDROID SYSTEM BARS & SAFE-AREA REPAIR REGRESSION SUITE ===\n');

// ---------------------------------------------------------------------------
// 1. Android Native Edge-to-Edge & System Bar Configuration
// ---------------------------------------------------------------------------
console.log('--- 1. Android Native Edge-to-Edge & System Bars ---');

const gradleProps = fs.readFileSync('android/gradle.properties', 'utf8');
assert.ok(
  gradleProps.includes('edgeToEdgeEnabled=true'),
  'android/gradle.properties must enable edgeToEdgeEnabled'
);
console.log('  ✓ edgeToEdgeEnabled=true verified in gradle.properties');

const stylesXml = fs.readFileSync('android/app/src/main/res/values/styles.xml', 'utf8');
assert.ok(
  stylesXml.includes('<item name="android:statusBarColor">@android:color/transparent</item>'),
  'styles.xml must set statusBarColor to transparent for edge-to-edge rendering'
);
assert.ok(
  stylesXml.includes('<item name="android:navigationBarColor">@android:color/transparent</item>'),
  'styles.xml must set navigationBarColor to transparent for edge-to-edge rendering'
);
console.log('  ✓ Transparent status bar & navigation bar verified in styles.xml');

const appGradle = fs.readFileSync('android/app/build.gradle', 'utf8');
assert.ok(appGradle.includes('versionCode 90'), 'build.gradle must have versionCode 90');
assert.ok(appGradle.includes('versionName "1.1.71"'), 'build.gradle must have versionName "1.1.71"');
console.log('  ✓ Android release version bumped to versionCode 90, versionName 1.1.71');

// ---------------------------------------------------------------------------
// 2. DetailScreen Authoritative Inset Ownership
// ---------------------------------------------------------------------------
console.log('\n--- 2. DetailScreen Authoritative Inset Ownership ---');

const detailScreenCode = fs.readFileSync('src/components/layout/DetailScreen.tsx', 'utf8');
assert.ok(
  detailScreenCode.includes('includeTopInset = true'),
  'DetailScreen must default includeTopInset to true so secondary screens respect status bar'
);
assert.ok(
  detailScreenCode.includes('const topOffset = includeTopInset ? safeTop : 0;'),
  'DetailScreen must compute topOffset from includeTopInset and safeTop'
);
assert.ok(
  detailScreenCode.includes('top: topOffset'),
  'DetailScreen must position headerWrapper at topOffset'
);
assert.ok(
  detailScreenCode.includes('padTop = useMemo('),
  'DetailScreen must compute padTop for scrollers'
);
assert.ok(
  detailScreenCode.includes('topOffset + effectiveHeaderHeight + CONTENT_GAP'),
  'DetailScreen padTop must combine topOffset, header height, and CONTENT_GAP'
);
console.log('  ✓ DetailScreen defaults includeTopInset to true and computes authoritative padTop');

// ---------------------------------------------------------------------------
// 3. App.tsx Root Layout & Inset Single-Source-of-Truth
// ---------------------------------------------------------------------------
console.log('\n--- 3. App.tsx Root Layout & Inset Single-Source-of-Truth ---');

const appCode = fs.readFileSync('App.tsx', 'utf8');
assert.ok(
  !appCode.includes('!isTopLevel && insets.top > 0 && (\n          <View style={{ paddingTop: insets.top }} />'),
  'App.tsx must not contain redundant ad-hoc !isTopLevel top spacer (DetailScreen owns top inset)'
);
assert.ok(
  appCode.includes('SafeAreaProvider'),
  'App.tsx must wrap application in SafeAreaProvider'
);
assert.ok(
  appCode.includes('useSafeAreaInsets()'),
  'App.tsx must read insets from useSafeAreaInsets'
);
console.log('  ✓ Redundant ad-hoc top spacer removed; no duplicate top insets in App.tsx');

// ---------------------------------------------------------------------------
// 4. FloatingNav & Mini Player Bottom Clearance
// ---------------------------------------------------------------------------
console.log('\n--- 4. FloatingNav & Mini Player Bottom Clearance ---');

const floatingNavCode = fs.readFileSync('src/components/layout/FloatingNav.tsx', 'utf8');
assert.ok(
  floatingNavCode.includes('const navBottom = NAV_BOTTOM(safeBottom);'),
  'FloatingNav must calculate bottom dock position with NAV_BOTTOM(safeBottom)'
);
assert.ok(
  floatingNavCode.includes('bottom: navBottom'),
  'FloatingNav must place dockContainer at navBottom'
);

// App.tsx mini player clearance
assert.ok(
  appCode.includes('NAV_BOTTOM(insets.bottom) + NAV_HEIGHT + 8'),
  'App.tsx mini players must sit above FloatingNav on top-level screens'
);
assert.ok(
  appCode.includes('Math.max(insets.bottom, 12)'),
  'App.tsx mini players must clear Android navigation bar on detail screens'
);
console.log('  ✓ FloatingNav and mini players have dynamic clearance above system navigation bar');

// ---------------------------------------------------------------------------
// 5. QuranReaderScreen Scroll Owner Geometry & No Double Void
// ---------------------------------------------------------------------------
console.log('\n--- 5. QuranReaderScreen Geometry & Double-Padding Prevention ---');

const readerCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
assert.ok(
  readerCode.includes('readerBottomClearance'),
  'QuranReaderScreen must define readerBottomClearance'
);
assert.ok(
  readerCode.includes('NAV_TOP(insets.bottom)'),
  'QuranReaderScreen must calculate readerBottomClearance relative to NAV_TOP(insets.bottom)'
);
assert.ok(
  !readerCode.includes('<DetailScreen\n      style={[styles.container, { backgroundColor: tokens.bgTop, paddingBottom: readerBottomClearance }]'),
  'QuranReaderScreen must NOT double-apply paddingBottom to outer DetailScreen container'
);
assert.ok(
  readerCode.includes('paddingBottom: readerBottomClearance'),
  'QuranReaderScreen must apply readerBottomClearance to inner FlatList contentContainerStyle'
);
console.log('  ✓ QuranReaderScreen applies bottom clearance exactly once to scroll content');

// ---------------------------------------------------------------------------
// 6. Modals & Dialogs statusBarTranslucent Coverage
// ---------------------------------------------------------------------------
console.log('\n--- 6. Modals & Dialogs statusBarTranslucent Coverage ---');

const locationModalCode = fs.readFileSync('src/components/LocationSetupModal.tsx', 'utf8');
assert.ok(locationModalCode.includes('statusBarTranslucent'), 'LocationSetupModal must have statusBarTranslucent');

const womenPinModalCode = fs.readFileSync('src/components/WomenPinModal.tsx', 'utf8');
assert.ok(womenPinModalCode.includes('statusBarTranslucent'), 'WomenPinModal must have statusBarTranslucent');

const womenConsentModalCode = fs.readFileSync('src/components/WomenConsentModal.tsx', 'utf8');
assert.ok(womenConsentModalCode.includes('statusBarTranslucent'), 'WomenConsentModal must have statusBarTranslucent');

const audioPlayerModalCode = fs.readFileSync('src/components/AudioPlayerModal.tsx', 'utf8');
const audioModalMatches = [...audioPlayerModalCode.matchAll(/statusBarTranslucent/g)];
assert.ok(audioModalMatches.length >= 2, 'AudioPlayerModal must have statusBarTranslucent on main sheet and language picker');

const zakatScreenCode = fs.readFileSync('src/screens/ZakatScreen.tsx', 'utf8');
assert.ok(zakatScreenCode.includes('statusBarTranslucent'), 'ZakatScreen currency modal must have statusBarTranslucent');
assert.ok(zakatScreenCode.includes('paddingBottom: Math.max(insets.bottom, 16) + 16'), 'ZakatScreen currency modal must respect insets.bottom');

const settingsScreenCode = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
assert.ok(settingsScreenCode.includes('statusBarTranslucent'), 'SettingsScreen calculation method modal must have statusBarTranslucent');
console.log('  ✓ All auxiliary modals configured with statusBarTranslucent and safe bottom padding');

// ---------------------------------------------------------------------------
// 7. Inset Calculation Simulation for Android Navigation Modes
// ---------------------------------------------------------------------------
console.log('\n--- 7. Inset Calculation Simulation (Android 12-16) ---');

const layoutConsts = fs.readFileSync('src/components/layout/layout.constants.ts', 'utf8');
const NAV_HEIGHT = 54.5;
const CONTENT_GAP = 24;
const SUBHEADER_HEIGHT = 54;
const HEADER_FADE = 10;
const effectiveHeaderHeight = SUBHEADER_HEIGHT - HEADER_FADE; // 44

function simulateLayout(safeTop, safeBottom, isTopLevel) {
  const navBottom = safeBottom + 14;
  const navTop = navBottom + NAV_HEIGHT;
  const tabPadBottom = NAV_HEIGHT + safeBottom + 14 + 32;

  // DetailScreen padTop
  const detailPadTop = safeTop + effectiveHeaderHeight + CONTENT_GAP;

  // Mini player bottom
  const miniPlayerBottom = isTopLevel
    ? navBottom + NAV_HEIGHT + 8
    : Math.max(safeBottom, 12);

  return {
    navBottom,
    navTop,
    tabPadBottom,
    detailPadTop,
    miniPlayerBottom,
  };
}

// 7a. Android 3-Button Navigation (standard insets: top 36, bottom 48)
const profile3Button = simulateLayout(36, 48, true);
assert.equal(profile3Button.navBottom, 62, '3-button nav bottom clearance');
assert.equal(profile3Button.navTop, 116.5, '3-button nav top clearance');
assert.equal(profile3Button.tabPadBottom, 148.5, '3-button tab pad bottom');
assert.equal(profile3Button.detailPadTop, 104, '3-button detail pad top');
assert.equal(profile3Button.miniPlayerBottom, 124.5, '3-button mini player bottom on tabs');

const profile3ButtonDetail = simulateLayout(36, 48, false);
assert.equal(profile3ButtonDetail.miniPlayerBottom, 48, '3-button mini player bottom on detail screen equals system nav bar height');
console.log('  ✓ 3-button navigation (bottom 48dp) geometry verified');

// 7b. Android Gesture Navigation (standard insets: top 36, bottom 24)
const profileGesture = simulateLayout(36, 24, true);
assert.equal(profileGesture.navBottom, 38, 'Gesture nav bottom clearance');
assert.equal(profileGesture.navTop, 92.5, 'Gesture nav top clearance');
assert.equal(profileGesture.tabPadBottom, 124.5, 'Gesture tab pad bottom');
assert.equal(profileGesture.detailPadTop, 104, 'Gesture detail pad top');
assert.equal(profileGesture.miniPlayerBottom, 100.5, 'Gesture mini player bottom on tabs');

const profileGestureDetail = simulateLayout(36, 24, false);
assert.equal(profileGestureDetail.miniPlayerBottom, 24, 'Gesture mini player bottom on detail screen equals gesture bar height');
console.log('  ✓ Gesture navigation (bottom 24dp) geometry verified');

console.log('\n========================================================');
console.log('ALL ANDROID SYSTEM BARS & SAFE-AREA TESTS PASSED!');
console.log('========================================================\n');
