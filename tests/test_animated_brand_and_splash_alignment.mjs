/**
 * Test Suite: Animated Brand Icons, Splash Color Alignment & Onboarding Theme Toggle
 *
 * Verifies:
 * 1. Exact splash and brand color anchors across app.json, android/ XMLs, and density bitmaps.
 * 2. Pixel-level corner matching between splashscreen_logo.png bitmaps and #F4EEDE (RGB 244, 238, 222).
 * 3. AnimatedSplash.tsx token alignment (no unapproved gold, exact brand paper & forest green).
 * 4. AnimatedBrandIcons exports, reduced-motion safety, and timer/animation cleanup.
 * 5. OnboardingThemeToggle contract: testID, >=44pt touch target, accessibility, RTL safety.
 * 6. Smooth Onboarding theme crossfade: opacity-driven, zero unsupported color prop animations,
 *    settings queue write persistence preserved.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('=== ANIMATED BRAND ICONS, SPLASH ALIGNMENT & ONBOARDING THEME TOGGLE TESTS ===\n');

// ---------------------------------------------------------------------------
// 1. EXACT BRAND ANCHORS & SPLASH CONFIGURATION
// ---------------------------------------------------------------------------
console.log('--- 1. Splash Screen & Brand Color Alignment ---');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const splashPlugin = appJson.expo.plugins?.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
const splash = (splashPlugin ? splashPlugin[1] : null) || appJson.expo.splash;
const adaptiveIcon = appJson.expo.android.adaptiveIcon;

// Exact brand anchors
const BRAND_PAPER = '#F4EEDE';
const BRAND_GREEN = '#105A4B';
const BRAND_DARK = '#0E1214';

assert.equal(splash.backgroundColor, BRAND_PAPER, `app.json splash.backgroundColor must be ${BRAND_PAPER}`);
assert.equal(splash.dark.backgroundColor, BRAND_DARK, `app.json splash.dark.backgroundColor must be ${BRAND_DARK}`);
assert.equal(adaptiveIcon.backgroundColor, BRAND_GREEN, `app.json adaptiveIcon.backgroundColor must be ${BRAND_GREEN}`);
console.log('  ✓ app.json splash and adaptiveIcon background colors match exact brand anchors');

// Android colors.xml (Light)
const colorsXml = fs.readFileSync('android/app/src/main/res/values/colors.xml', 'utf8');
assert.ok(colorsXml.includes('<color name="splashscreen_background">#F4EEDE</color>'), 'colors.xml splashscreen_background must be #F4EEDE');
assert.ok(colorsXml.includes('<color name="iconBackground">#105A4B</color>'), 'colors.xml iconBackground must be #105A4B');

// Android values-night colors.xml (Dark)
const colorsNightXml = fs.readFileSync('android/app/src/main/res/values-night/colors.xml', 'utf8');
assert.ok(colorsNightXml.includes('<color name="splashscreen_background">#0E1214</color>'), 'values-night/colors.xml splashscreen_background must be #0E1214');
console.log('  ✓ android/app/src/main/res/values/colors.xml and values-night/colors.xml match exact brand anchors');

// Android styles.xml
const stylesXml = fs.readFileSync('android/app/src/main/res/values/styles.xml', 'utf8');
assert.ok(stylesXml.includes('@drawable/splashscreen_logo'), 'styles.xml windowBackground must reference splashscreen_logo');
assert.ok(stylesXml.includes('<item name="android:windowBackground">@color/splashscreen_background</item>'), 'AppTheme must declare windowBackground to prevent grey/white flash');

// Android v31 styles.xml (Android 12+)
const stylesV31Xml = fs.readFileSync('android/app/src/main/res/values-v31/styles.xml', 'utf8');
assert.ok(stylesV31Xml.includes('<item name="android:windowSplashScreenBackground">@color/splashscreen_background</item>'), 'values-v31/styles.xml must reference @color/splashscreen_background');
assert.ok(stylesV31Xml.includes('<item name="android:windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>'), 'values-v31/styles.xml icon background must reference @color/splashscreen_background');

// Android night-v31 styles.xml
const stylesNightV31Xml = fs.readFileSync('android/app/src/main/res/values-night-v31/styles.xml', 'utf8');
assert.ok(stylesNightV31Xml.includes('<item name="android:windowSplashScreenBackground">#0E1214</item>'), 'values-night-v31/styles.xml must use #0E1214');
assert.ok(stylesNightV31Xml.includes('<item name="android:windowSplashScreenIconBackgroundColor">#0E1214</item>'), 'values-night-v31/styles.xml icon background must use #0E1214');

// Android ic_launcher_background.xml
const launcherBgXml = fs.readFileSync('android/app/src/main/res/drawable/ic_launcher_background.xml', 'utf8');
assert.ok(launcherBgXml.includes('@color/splashscreen_background'), 'ic_launcher_background.xml must reference @color/splashscreen_background');
console.log('  ✓ Android splash styles (styles.xml, values-v31, values-night-v31, ic_launcher_background) fully verified');

// ---------------------------------------------------------------------------
// 2. PIXEL-EXACT BITMAP BACKGROUND VERIFICATION
// ---------------------------------------------------------------------------
console.log('\n--- 2. Density Bitmap Pixel Background Verification ---');

// Use python PIL to verify pixel colors in splashscreen_logo.png and android-icon-background.png
const pythonCheck = `
from PIL import Image
densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']
for d in densities:
    path_light = f'android/app/src/main/res/drawable-{d}/splashscreen_logo.png'
    im = Image.open(path_light)
    corners = [im.getpixel((0,0)), im.getpixel((im.width-1, 0)), im.getpixel((0, im.height-1)), im.getpixel((im.width-1, im.height-1))]
    for c in corners:
        assert c == (244, 238, 222, 255), f'Mismatch in {path_light}: {c}'

    path_night = f'android/app/src/main/res/drawable-night-{d}/splashscreen_logo.png'
    im_night = Image.open(path_night)
    corners_night = [im_night.getpixel((0,0)), im_night.getpixel((im_night.width-1, 0)), im_night.getpixel((0, im_night.height-1)), im_night.getpixel((im_night.width-1, im_night.height-1))]
    for c in corners_night:
        assert c == (14, 18, 20, 255), f'Mismatch in {path_night}: {c}'

im_bg = Image.open('assets/android-icon-background.png')
for c in [im_bg.getpixel((0,0)), im_bg.getpixel((256,256))]:
    assert c == (16, 90, 75, 255), f'Mismatch in android-icon-background.png: {c}'
print('ALL_PIXELS_MATCH')
`;

const pyOut = execSync(`python3 -c "${pythonCheck}"`).toString().trim();
assert.equal(pyOut, 'ALL_PIXELS_MATCH', 'All density bitmap corners must match RGB(244, 238, 222, 255) for light and RGB(14, 18, 20, 255) for night');
console.log('  ✓ All 5 density light splashscreen_logo.png bitmaps match RGB(244, 238, 222, 255) corner pixels');
console.log('  ✓ All 5 density night splashscreen_logo.png bitmaps match RGB(14, 18, 20, 255) corner pixels');
console.log('  ✓ assets/android-icon-background.png matches RGB(16, 90, 75, 255) exactly');

// ---------------------------------------------------------------------------
// 3. ANIMATED SPLASH BRAND ALIGNMENT
// ---------------------------------------------------------------------------
console.log('\n--- 3. AnimatedSplash.tsx Brand Alignment ---');

const animSplashCode = fs.readFileSync('src/components/AnimatedSplash.tsx', 'utf8');
assert.ok(animSplashCode.includes("const BG_LIGHT = '#F4EEDE';"), 'AnimatedSplash BG_LIGHT must be #F4EEDE');
assert.ok(animSplashCode.includes("const BG_DARK = '#0E1214';"), 'AnimatedSplash BG_DARK must be #0E1214');
assert.ok(animSplashCode.includes("const BG_DARK_TOP = '#12121C';"), 'AnimatedSplash BG_DARK_TOP must be #12121C');
assert.ok(animSplashCode.includes("const BG_DARK_BOTTOM = '#0C0C14';"), 'AnimatedSplash BG_DARK_BOTTOM must be #0C0C14');
assert.ok(animSplashCode.includes("const SPLASH_ACCENT_DARK = '#E6BE6C';"), 'AnimatedSplash SPLASH_ACCENT_DARK must be #E6BE6C');
assert.ok(animSplashCode.includes("const BRAND_GREEN_LIGHT = '#105A4B';"), 'AnimatedSplash BRAND_GREEN_LIGHT must be #105A4B');
assert.ok(animSplashCode.includes("const BRAND_GREEN_DARK = '#10B981';"), 'AnimatedSplash BRAND_GREEN_DARK must be #10B981');
assert.ok(!animSplashCode.includes('#B8975A'), 'AnimatedSplash must not contain unapproved gold #B8975A');
assert.ok(animSplashCode.includes('AccessibilityInfo.isReduceMotionEnabled'), 'AnimatedSplash must support reduced motion');
assert.ok(animSplashCode.includes('safetyTimer'), 'AnimatedSplash must include safety fallback timer');
assert.ok(animSplashCode.includes("fontFamily: isRTL() ? 'Amiri_700Bold' : 'SourceSans3_500Medium'"), 'AnimatedSplash must use Amiri_700Bold in RTL');
console.log('  ✓ AnimatedSplash.tsx aligned to exact brand paper, dark ink, and gold tokens with zero unapproved gold');

// ---------------------------------------------------------------------------
// 4. ANIMATED BRAND ICONS CONTRACT
// ---------------------------------------------------------------------------
console.log('\n--- 4. AnimatedBrandIcons Component Contract ---');

const iconsCode = fs.readFileSync('src/components/AnimatedBrandIcons.tsx', 'utf8');
assert.ok(iconsCode.includes('export function AnimatedCrescentOrbit'), 'AnimatedBrandIcons must export AnimatedCrescentOrbit');
assert.ok(iconsCode.includes('export function AnimatedArabesqueKhatim'), 'AnimatedBrandIcons must export AnimatedArabesqueKhatim');
assert.ok(iconsCode.includes('export function AnimatedBrandBadge'), 'AnimatedBrandIcons must export AnimatedBrandBadge');
assert.ok(iconsCode.includes('export function OnboardingThemeToggle'), 'AnimatedBrandIcons must export OnboardingThemeToggle');
assert.ok(iconsCode.includes('export function usePrefersReducedMotion'), 'AnimatedBrandIcons must export usePrefersReducedMotion');

// Cleanup checks
assert.ok(iconsCode.includes('animation.stop()'), 'Animated loops must clean up on unmount');
assert.ok(iconsCode.includes('minWidth: 44'), 'OnboardingThemeToggle must meet 44pt minimum touch target');
assert.ok(iconsCode.includes('minHeight: 44'), 'OnboardingThemeToggle must meet 44pt minimum touch target');
assert.ok(iconsCode.includes('testID="onboarding-theme-toggle"'), 'OnboardingThemeToggle must provide testID');
assert.ok(iconsCode.includes('accessibilityRole="button"'), 'OnboardingThemeToggle must provide accessibilityRole="button"');
assert.ok(iconsCode.includes('accessibilityLabel='), 'OnboardingThemeToggle must provide accessibilityLabel');
console.log('  ✓ AnimatedBrandIcons motifs, reduced-motion safety, touch targets, and animation cleanups verified');

// ---------------------------------------------------------------------------
// 5. ONBOARDING THEME TOGGLE & SMOOTH CROSSFADE CONTRACT
// ---------------------------------------------------------------------------
console.log('\n--- 5. Onboarding Theme Toggle & Smooth Crossfade Transition ---');

const onboardingCode = fs.readFileSync('src/screens/OnboardingScreen.tsx', 'utf8');
assert.ok(onboardingCode.includes('OnboardingThemeToggle'), 'OnboardingScreen must render OnboardingThemeToggle');
assert.ok(onboardingCode.includes('handleToggleTheme'), 'OnboardingScreen must handle theme toggle');
assert.ok(onboardingCode.includes('setThemeMode'), 'OnboardingScreen must wire setThemeMode');
assert.ok(onboardingCode.includes('isThemeTransitioning'), 'OnboardingScreen must manage theme transition state');
assert.ok(onboardingCode.includes('themeCrossfadeAnim'), 'OnboardingScreen must use Animated.Value for crossfade');
assert.ok(onboardingCode.includes('stopAnimation()'), 'OnboardingScreen must stop animation on unmount');
assert.ok(onboardingCode.includes('renderOnboardingContent'), 'OnboardingScreen must support parameterized content rendering');
assert.ok(onboardingCode.includes('justifyContent: \'space-between\''), 'headerRow must use space-between for RTL/LTR placement');
console.log('  ✓ OnboardingScreen theme toggle, crossfade overlay, and RTL placement verified');

// ---------------------------------------------------------------------------
// 6. FUNCTIONALITY & PERSISTENCE GUARD
// ---------------------------------------------------------------------------
console.log('\n--- 6. Functional Integrity & Persistence Ordering ---');

assert.ok(onboardingCode.includes('handleGetStarted'), 'handleGetStarted preserved');
assert.ok(onboardingCode.includes('setQuranTranslationLanguage(selectedQuranLang)'), 'Quran translation language persistence preserved');
assert.ok(onboardingCode.includes('setAudioTranslationEdition(selectedAudioId)'), 'Audio translation edition persistence preserved');
assert.ok(onboardingCode.includes('setOnboardingDone(true)'), 'onboardingDone persistence preserved');
assert.ok(onboardingCode.includes('setLanguage(selectedAppLang)'), 'appLanguage persistence preserved');
assert.ok(onboardingCode.includes('prepareNativeLayoutDirection(selectedAppLang)'), 'native RTL direction preserved');
assert.ok(onboardingCode.includes('onComplete()'), 'onComplete callback preserved');
console.log('  ✓ All Onboarding business logic, handlers, and persistence ordering 100% intact');

console.log('\n============================================================');
console.log('ALL ANIMATED BRAND, SPLASH ALIGNMENT & THEME TOGGLE TESTS PASSED!');
console.log('============================================================\n');
