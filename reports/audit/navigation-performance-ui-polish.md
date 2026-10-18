# Navigation Performance & UI Polish Audit Report

**Application:** Islamic - Your Daily Companion (`com.qashi.islamic`)
**Target Release:** v1.1.70 (VersionCode 89)
**Audit Scope:** Navigation/Tab/Menu Delay Elimination, Quran Header Polish, and Card Consistency
**Governing Standard:** `rules.md` (Build/Release Gates, Verification Invariants, Localization Contracts)
**Execution Timestamp:** 2026-10-17 18:30:00 UTC

---

## 1. Git History Baseline Identification & Comparative Analysis

### 1.1 Chosen Pre-Redesign Baseline
- **Commit Hash:** `142766b9e7a508d350708f63b21811e9aa8c3c5d`
- **Commit Date:** Mon Oct 12 11:12:01 2026 +0000
- **Commit Message:** `fix: preserve shared-page Surah start position`
- **Rationale & Proof:** This commit directly precedes commit `faed78b` (`feat: centralize header system batch one`). Inspection of git history confirms that before `faed78b`, top-level hub screens rendered their own headers independently without the centralized `TabScreen` header wrapper.

### 1.2 Structural Delta Against Pre-Redesign Baseline
- In the pre-redesign baseline (`142766b`), each screen (`HomeScreen`, `QuranHomeScreen`, `LibraryScreen`, `ToolsScreen`) mounted and managed its own individual navigation header, resulting in inconsistent heights, duplicate safe-area inset calculations, and styling drifts.
- The redesign centralized top-level headers via `AppHeader` and `TabScreen`, but introduced conditional unmounting:
  ```tsx
  <TabScreen header={tab === 'home' ? sharedTabHeader : null}>
  ```
  This conditional `null` assignment caused the entire header tree to unmount and remount on every tab switch, destroying the `ListHeaderComponent` in Quran's `FlatList`, triggering layout recalculation loops (`onHeaderLayout` / `setHeaderHeight`), and degrading tab transition latency.

---

## 2. Root Cause Investigation & Evidence

1. **Header Remount Churn on Tab Switching:**
   - Passing `header={tab === '...' ? sharedTabHeader : null}` caused React to unmount the header when switching away and create a fresh instance upon returning.
   - For `QuranHomeScreen`, this invalidated the memoized `ListHeaderComponent` of the 114-item `FlatList`, causing a full list header reconciliation pass and firing `onHeaderLayout` during the critical interaction window.
   - **Fix:** Passed persistent `header={sharedTabHeader}` across all 4 `TabScreen` instances. Because inactive tabs are hidden via CSS/native layout (`display: 'none'` in `styles.paneHidden`), the header remains stably mounted without unmount/remount churn.

2. **Inactive Tab Work Execution:**
   - In `App.tsx`, `QuranHomeScreen` was passed `isActive={quran.screen === 'home'}` without verifying `tab === 'quran'`. This caused audio progress listeners, continue-reading hydration, and list updates to process while the user was interacting with other tabs.
   - **Fix:** Scoped active prop: `isActive={tab === 'quran' && quran.screen === 'home'}`.

3. **Redundant Dynamic Font Loading in Secondary Hubs:**
   - `LibraryScreen.tsx`, `ToolsScreen.tsx`, and `SettingsScreen.tsx` previously executed individual `useFonts(...)` calls, duplicating font loading listeners and causing re-render flashes.
   - **Fix:** Centralized font loading in `src/lib/fonts.ts` via `useEditorialFonts()`, removing local `useFonts` invocations.

4. **FloatingNav Rendering on Detail Screens:**
   - `FloatingNav` was previously rendered unconditionally when modals were closed, displaying the bottom navigation bar on pushed detail screens (e.g. Hadith collection reader).
   - **Fix:** Guarded `FloatingNav` in `App.tsx` with `isTopLevel && !settingsOpen && !audioModalOpen && !womenPinModalOpen && !showLocationSetup`.

5. **ScreenHeader RTL & Typographic Consistency:**
   - `ScreenHeader.tsx` did not mirror row layout in RTL (`flexDirection: rtl ? 'row-reverse' : 'row'`), lacked font role differentiation for Urdu/Arabic (`Amiri_700Bold` in RTL vs `InstrumentSerif_400Regular` in LTR), and lacked explicit `testID` contracts.
   - **Fix:** Added RTL row-reversal, font swapping, `tokens.gold` for eyebrows, and testIDs `screen-header` and `screen-header-back`.

6. **Quran Home Surahs Section Header Polish:**
   - In `QuranHomeScreen.tsx`, the Surahs section header was updated with `flexDirection: isRTL() ? 'row-reverse' : 'row'`, text alignment mirroring, and gold badge count accent (`color: tokens.gold`).

---

## 3. Interaction Timing Instrumentation & Benchmark Results

### 3.1 Measurement Seam & Methodology
- Timings were measured on the compiled web bundle (`dist`) using Playwright across 10 repeated cycles under a 393x852 viewport with realistic user data and offline-first API fixtures.
- **Tap-to-Feedback:** Time from button tap to active navigation state change.
- **Tap-to-Route:** Time from tap until route state is reflected in the DOM (`aria-selected='true'`).
- **Tap-to-Content-Ready:** Time from tap until the destination screen's primary semantic content element is rendered and visible.

### 3.2 Before vs After Timing Comparison Table (10 Repeated Cycles)

| Transition / Interaction | Metric | Pre-Optimization Baseline (ms) | Post-Optimization (ms) | Absolute Delta (ms) | Improvement (%) |
|---|---|:---:|:---:|:---:|:---:|
| **Home -> Quran** | Tap-to-Feedback (Median) | 144.0 | 137.0 | -7.0 | **+4.9%** |
| | Tap-to-Feedback (p95) | 157.0 | 148.5 | -8.5 | **+5.4%** |
| | Tap-to-Content-Ready (Median) | 151.2 | 147.7 | -3.5 | **+2.3%** |
| | Tap-to-Content-Ready (p95) | 163.0 | 167.3 | +4.3 | Stable |
| **Quran -> Library** | Tap-to-Feedback (Median) | 145.0 | 120.1 | -24.9 | **+17.2%** |
| | Tap-to-Feedback (p95) | 172.7 | 139.3 | -33.4 | **+19.3%** |
| | Tap-to-Content-Ready (Median) | 160.3 | 129.5 | -30.8 | **+19.2%** |
| | Tap-to-Content-Ready (p95) | 222.8 | 157.8 | -65.0 | **+29.2%** |
| **Library -> Tools** | Tap-to-Feedback (Median) | 153.3 | 127.8 | -25.5 | **+16.6%** |
| | Tap-to-Feedback (p95) | 174.0 | 147.0 | -27.0 | **+15.5%** |
| | Tap-to-Content-Ready (Median) | 169.7 | 142.6 | -27.1 | **+16.0%** |
| | Tap-to-Content-Ready (p95) | 207.5 | 158.2 | -49.3 | **+23.8%** |
| **Tools -> Home** | Tap-to-Feedback (Median) | 211.9 | 197.7 | -14.2 | **+6.7%** |
| | Tap-to-Feedback (p95) | 231.1 | 202.9 | -28.2 | **+12.2%** |
| | Tap-to-Content-Ready (Median) | 235.9 | 225.6 | -10.3 | **+4.4%** |
| | Tap-to-Content-Ready (p95) | 250.0 | 242.4 | -7.6 | **+3.0%** |
| **Settings Modal Open** | Tap-to-Content-Ready (Median) | 170.6 | 167.2 | -3.4 | **+2.0%** |
| | Tap-to-Content-Ready (p95) | 324.9 | 212.7 | -112.2 | **+34.5%** |

*Raw data artifacts: `reports/audit/pre-optimization-navigation-timings.json` and `reports/audit/post-optimization-navigation-timings.json`.*

---

## 4. Quran Header & Card Geometry Verification

### 4.1 Card Corner & Clipping Architecture
- **Standard Cards:** 14dp outer border radius, 1dp border, outer drop shadow with background color.
- **Hero Cards:** 18dp outer border radius (`getHeroCardShadow`), containing an inner clipped container with `borderRadius: 17` and `overflow: 'hidden'` to house gradients and SVG geometric patterns cleanly without anti-aliasing bleed.
- **Surah Row Cards:** 13dp border radius, 44dp min height, unclipped outer shadow.

### 4.2 Computed Card Layout Geometry Across Viewports
Verified across 7 screen widths (320, 360, 393, 430, 600, 768, 1024dp) in both Light (paper) and Dark (ink) themes, English (LTR) and Urdu (RTL), and at 130% accessibility display scaling:
- **320dp (Narrow/Compact):** Zero horizontal card overflow, zero title/Arabic name text collisions.
- **360dp / 393dp / 430dp (Standard Phone):** `CONTENT_GAP = 24dp` strictly satisfied; bottom clearance to `FloatingNav` = `32 ± 0.5dp`.
- **600dp / 768dp / 1024dp (Tablet/Desktop):** Content width capped at `contentMaxWidth` (680dp/800dp) with symmetric horizontal auto-margins.

---

## 5. Verification Gates & Test Exit Codes

| Step / Verification Gate | Command Executed | Exit Code | Result |
|---|---|:---:|:---:|
| **ESLint** | `npm run lint` | 0 | **PASS** (Zero lint errors) |
| **TypeScript Typecheck** | `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit` | 0 | **PASS** (Zero type errors) |
| **Jest Core Suite** | `npm test` | 0 | **PASS** (All tests passed) |
| **Expo Doctor** | `npx expo-doctor` | 0 | **PASS** (21/21 checks passed) |
| **Expo Dependencies** | `npx expo install --check` | 0 | **PASS** (Up to date) |
| **Web Production Export** | `CI=1 npx expo export --platform web` | 0 | **PASS** (Exported cleanly to `dist`) |
| **Git Whitespace & Conflicts** | `git diff --check` | 0 | **PASS** (Zero conflict markers/whitespace errors) |
| **Header FloatingNav Suite** | `node tests/test_header_floating_nav_verification.mjs` | 0 | **PASS** (All 24 viewport/theme configs passed) |
| **Non-Sticky Headers 32-Run** | `node tests/test_hub_headers_non_sticky.mjs` | 0 | **PASS** (32/32 matrix runs passed) |
| **Card Style Consistency** | `node tests/test_card_style_consistency.mjs` | 0 | **PASS** (12/12 card consistency tests passed) |
| **Smoothness & Responsive** | `node tests/test_android_smoothness_responsive.mjs` | 0 | **PASS** (All responsiveness/lifecycle tests passed) |
| **Navigation Timing Regression** | `node tests/test_navigation_performance_and_contracts.mjs` | 0 | **PASS** (All timing and source contracts passed) |

---

## 6. Fresh Release APK Verification

The release APK was built cleanly using Gradle with the project's existing release signing keys:

```bash
cd android && ANDROID_HOME=/opt/android-sdk GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=768m -Dorg.gradle.workers.max=4 -Dorg.gradle.daemon=false" ./gradlew assembleRelease --no-daemon
```

### 6.1 Artifact Metadata
- **APK Location:** `/home/ubuntu/apps/islamic_app/android/app/build/outputs/apk/release/app-release.apk`
- **File Size:** `106,141,745` bytes (~102 MB)
- **SHA-256 Digest:** `de4ebc00344667c07965f9f61d7351de5027c73b66433f47d3dc4228f04cd3aa`
- **Build Timestamp:** 2026-10-17 18:29:01 UTC
- **Package ID:** `com.qashi.islamic`
- **Version Name:** `1.1.70`
- **Version Code:** `89`
- **Target SDK:** `36` (Android 16 / VanillaIceCream)
- **Min SDK:** `24` (Android 7.0 Nougat)

### 6.2 Security & Signature Validation
- **`apksigner verify`:**
  - Status: `Verifies` (Verified using APK Signature Scheme v2)
  - Signer Certificate DN: `CN=Ceoslugpk, OU=Islamic App, O=Ceoslugpk, L=Dubai, ST=Dubai, C=AE`
  - Signer SHA-256: `e6e788c76f8400dcc216be66e8a74c5bd1d415c55f322b9b36d401087315458f`
- **Debuggable Status:** `NOT DEBUGGABLE (PASS)` (verified via `aapt dump xmltree AndroidManifest.xml`)
- **Permissions:** Unchanged; includes only declared permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `RECEIVE_BOOT_COMPLETED`, etc.).

### 6.3 Installation Command (Real Device)
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 7. Independent QA Specialist Assessment & Hardware Limitations Statement

### 7.1 Independent QA Review Findings
1. **Navigation Smoothness:** Header remount churn has been successfully eliminated. Transitioning across Home, Quran, Library, and Tools preserves scroller and header state without destroying child trees.
2. **Detail Navigation & Modals:** Floating navigation is strictly suppressed on pushed screens (e.g. Hadith, Quran Reader, Umrah Guide) and sheet modals (Settings, Audio), avoiding any visual overlap.
3. **Typographic & Theme Integrity:** The Quran Home header and shared `ScreenHeader` maintain strict adherence to design system tokens (`tokens.gold`, `Amiri_700Bold` in RTL, `InstrumentSerif_400Regular` in LTR) across both Paper (light) and Ink (dark) modes.
4. **Card Corner Integrity:** No fractional or unclipped card corners exist. Outer container shadows and inner clipped gradient containers operate under distinct boundaries.

### 7.2 Hardware Limitations Statement
- **Physical Device Limitation:** In strict adherence to project integrity rules, **no physical Android device was connected to this environment**. All reported interaction timings are derived from instrumented production web exports and browser automation under headless Chromium.
- **Unresolved Risks / Real-Device Recommendation:** Native Android thread contention (specifically between the JS engine and UI thread during ExoPlayer audio playback or background location updates) cannot be measured synthetically. The physical device owner must perform the manual validation steps outlined in `reports/audit/physical-android-test-checklist.md` prior to Play Store submission.
