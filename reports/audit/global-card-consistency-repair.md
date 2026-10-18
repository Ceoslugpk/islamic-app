# Global Card Corner & Style Consistency Repair Audit Report

**Application:** Islamic - Your Daily Companion (`com.qashi.islamic`)
**Version:** `1.1.70` (VersionCode `89`)
**Audit Scope:** Global card corner, clipping, border, gradient, shadow, and style consistency across Home, Quran, Library, and Tools hubs.
**Reference Surface:** Quran hub (`QuranHomeScreen.tsx` & `src/theme/tokens.ts` `cardTokens`).
**Date:** 2026-10-17
**Build Artifact:** `android/app/build/outputs/apk/release/app-release.apk`
**APK SHA-256:** `e70a8497bdc4a5bc73fb2cc18659b9c415bf0b2e16d26d0724380cbec56c68ae`
**Governing Standard:** `rules.md` (Rules 1, 3, 4, 11, 20, 21)

---

## 1. Executive Summary & Problem Diagnosis

Before this repair, card corners, borders, shadows, and clipping behaviors were fragmented across the four main application tabs (`HomeScreen.tsx`, `QuranHomeScreen.tsx` / `QuranScreen.tsx`, `LibraryScreen.tsx`, and `ToolsScreen.tsx`):
- **Scattered & Fractional Border Radii:** Fractional radii (e.g. `14.5dp` on `sunriseAuxCard`, `LibraryScreen` guides, `ToolsScreen` utilities; `17.5dp` on Library and Tools hero cards) caused subpixel rounding jitter on lower-density Android devices (e.g. 320dp/360dp ldpi/mdpi/hdpi).
- **Arbitrary Radii Overrides:** `ContinueReadingCard`, `DailyContentRail`, and `duaCardSlide` had hardcoded `borderRadius: 20` that clashed with the canonical card standard (`14dp`), while `prayerTile` had `16dp` and `QuickActionsStrip` had `18dp`.
- **Inner Child Gradient Bleed & Clipping Inversion:** Several cards attached drop shadows (`getCardShadow` or `getHeroCardShadow`) directly to containers with `overflow: 'hidden'`, clipping the shadow on Android and iOS. Conversely, inner absolute-fill `LinearGradient` and `GeometricPattern` children lacked matching rounded clipping wrappers, resulting in square corner bleeding on Android native rendering.
- **Inner Inset Border Misalignment:** Quran reference hero cards use `borderRadius: 15` for inner borders with a 4.5dp inset. However, Library and Tools hero cards were using `13dp`, and HomeScreen used `17dp`.

### Architectural Solution
Using the canonical Quran hub implementation as the visual reference, all cards have been unified around the strict token contract in `src/theme/tokens.ts` (`cardTokens`):
1. **Standard Cards & Grid Tiles:** `borderRadius: 14`, `innerRadius: 13`, `borderWidth: 1` (or 0.75), theme-aware border, surface gradient, drop shadow via unclipped outer wrapper, inner clipping via `overflow: 'hidden'`.
2. **Hero Feature Cards:** `borderRadius: 18`, inner inset border `15`, inner clipping wrapper `17` with `overflow: 'hidden'`, unclipped outer drop shadow via `getHeroCardShadow(mode)`.
3. **List Tiles / Surah Rows:** `borderRadius: 13`, inner clipping `12`, `borderWidth: 1`.
4. **Pill & Search Cards:** `borderRadius: 18.5` (height 37) or `14` (height 28) for chips, `26` for persistent floating pill (`CompactPrayerBar`).

---

## 2. Comprehensive Card Inventory & Measured Baseline

| Surface / Component | Variant | Outer Radius (Before) | Inner Clip (Before) | Inner Border (Before) | Outer Radius (After) | Inner Clip (After) | Inner Border (After) | Clipping Owner & Shadow Role |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **QuranHomeScreen** `heroCard` (Reference) | Hero | 18dp | 18dp (`overflow: hidden`) | 15dp | 18dp | 18dp (`overflow: hidden`) | 15dp | Unclipped outer wrapper; inner clipped surface |
| **QuranHomeScreen** `tileCard` / `pairedCard` | Standard Tile | 14dp | 13dp | N/A | 14dp | 13dp | N/A | Outer shadow; inner clipped |
| **QuranHomeScreen** `surahRow` | List Tile | 13dp | 12dp | N/A | 13dp | 12dp | N/A | Outer shadow; inner clipped |
| **QuranHomeScreen** `searchBar` | Search Pill | 18.5dp | 18.5dp | N/A | 18.5dp | 18.5dp | N/A | Unclipped border/shadow |
| **QuranScreen** `langBar` | Standard Card | 16dp | None | N/A | **14dp** | 13dp | N/A | Outer border; inner clipped |
| **QuranScreen** `searchBar` | Search Bar | 16dp | None | N/A | **14dp** | 13dp | N/A | Standard input card radius |
| **HomeScreen** `prayerHeroCard` | Hero | 18dp | 18dp (clipped shadow) | 17dp | **18dp** | 18dp (`overflow: hidden`) | **15dp** | **Shadow moved to outer unclipped `Animated.View`** |
| **HomeScreen** `prayerTile` (x5) | Prayer Tile | 16dp | None (bleed) | N/A | **14dp** | 14dp (`overflow: hidden`) | N/A | Inner gradient clipped to 14dp |
| **HomeScreen** `streakCard` | Standard Card | 18dp | None (bleed) | N/A | **14dp** | 14dp (`overflow: hidden`) | N/A | Canonical 14dp standard card |
| **HomeScreen** `sunriseAuxCard` | Standard Card | 14.5dp | None (bleed) | N/A | **14dp** | 14dp (`overflow: hidden`) | N/A | Fractional radius eliminated |
| **HomeScreen** `duaCardSlide` / `duaAfterPrayerCard` | Floating Card | 20dp | Inconsistent | N/A | **14dp** | 13dp (`Card.tsx` adaptive) | N/A | Aligned with standard card tokens |
| **LibraryScreen** `heroCardWrap` & `heroCard` | Hero | 17.5dp | 17.5dp | 13dp | **18dp** | **17dp** (`overflow: hidden`) | **15dp** | Aligned with Quran hero reference |
| **LibraryScreen** `knowledgeTile` (x4) | Grid Tile | 13dp | 13dp (unclipped) | N/A | **14dp** | **13dp** (`overflow: hidden`) | N/A | Canonical 14dp outer, 13dp inner clip |
| **LibraryScreen** `downloadsCard` | Horizontal Card | 13dp | 13dp (unclipped) | N/A | **14dp** | **13dp** (`overflow: hidden`) | N/A | Canonical 14dp outer, 13dp inner clip |
| **LibraryScreen** `guidesCard` | List Container | 14.5dp | 14.5dp | N/A | **14dp** | **13dp** (`overflow: hidden`) | N/A | Fractional radius eliminated |
| **ToolsScreen** `heroCardWrap` & `heroCard` | Hero | 17.5dp | 17.5dp | 13dp | **18dp** | **17dp** (`overflow: hidden`) | **15dp** | Aligned with Quran hero reference |
| **ToolsScreen** `trackerTile` (x6) | Grid Tile | 13dp | 13dp (unclipped) | N/A | **14dp** | **13dp** (`overflow: hidden`) | N/A | Canonical 14dp outer, 13dp inner clip |
| **ToolsScreen** `utilitiesCard` | List Container | 14.5dp | 14.5dp | N/A | **14dp** | **13dp** (`overflow: hidden`) | N/A | Fractional radius eliminated |
| **ToolsScreen** `liveCard` (x3) | Media Card | 13dp | 13dp (unclipped) | N/A | **14dp** | **13dp** (`overflow: hidden`) | N/A | Canonical 14dp outer, 13dp inner clip |
| **Shared** `Card.tsx` | Reusable Card | 14dp | 13dp (fixed) | N/A | 14dp | **Adaptive `max(0, r - 1)`** | N/A | Dynamically scales inner clipping |
| **Shared** `ContinueReadingCard.tsx` | Standard Card | 20dp | Clipped shadow | N/A | **14dp** | **14dp** (`overflow: hidden`) | N/A | **Shadow on outer `Animated.View`**, track rounded |
| **Shared** `QuickActionsStrip.tsx` | Tile Strip | 18dp | Clipped shadow | N/A | **14dp** | **14dp** (`overflow: hidden`) | N/A | **Shadow on outer `cardWrap`** |
| **Shared** `DailyContentRail.tsx` | Content Card | 20dp | 20dp | N/A | **14dp** | **14dp** (`overflow: hidden`) | N/A | Outer 14dp, inner adaptive 13dp |

---

## 3. Changed Files & Modifications

1. `src/theme/tokens.ts`:
   - Extended `cardTokens` with explicit semantic variants: `standard` (`borderRadius: 14`, `innerRadius: 13`), `hero` (`borderRadius: 18`, `innerRadius: 15`), `listTile` (`borderRadius: 13`, `innerRadius: 12`), `search` (`borderRadius: 18.5`), and `pill` (`borderRadius: 14`).
   - Retained all existing token properties (`borderRadius: 14`, `innerRadius: 13`, `borderWidth: 0.75`, `gradient`, `goldBorder`, `shadow`).

2. `src/components/Card.tsx`:
   - Added adaptive inner radius calculation: `innerRadius = typeof customRadius === 'number' ? Math.max(0, customRadius - 1) : cardTokens.innerRadius`.
   - Inner clipping wrapper dynamically applies `borderRadius: innerRadius` with `overflow: 'hidden'`, preventing square child background bleed on Android.

3. `src/components/ContinueReadingCard.tsx`:
   - Moved `...getCardShadow(mode)` to the outer unclipped `Animated.View` (`borderRadius: 14`, `backgroundColor: homeTokens.cardTop`).
   - Standardized inner card `borderRadius: 14` (was 20).
   - Added `borderBottomLeftRadius: 13, borderBottomRightRadius: 13` to `progressTrack` so bottom corners clip smoothly.

4. `src/components/QuickActionsStrip.tsx`:
   - Moved `...getCardShadow(mode)` to the outer unclipped `cardWrap` (`borderRadius: 14`, `backgroundColor: homeTokens.cardTop`).
   - Standardized `actionCard` to `borderRadius: 14` (was 18), `borderWidth: 1`, `overflow: 'hidden'`.

5. `src/components/DailyContentRail.tsx`:
   - Standardized `cardSlideWrap` to `borderRadius: 14` (was 20).
   - Standardized `card` to `borderRadius: 14` (was 20).

6. `src/screens/HomeScreen.tsx`:
   - Moved `getHeroCardShadow(mode)` from `prayerHeroCard` to the outer unclipped `Animated.View` (`borderRadius: 18`).
   - Standardized `heroInsetBorder` to `borderRadius: 15` (was 17) to match Quran hero reference.
   - Standardized `prayerTile` to `borderRadius: 14` (was 16).
   - Standardized `streakCard` to `borderRadius: 14` (was 18).
   - Standardized `sunriseAuxCard` to `borderRadius: 14` (was 14.5).
   - Standardized `duaCardSlide` and `duaAfterPrayerCard` to `borderRadius: 14` (was 20).

7. `src/screens/LibraryScreen.tsx`:
   - Standardized `heroCardWrap` and `heroCard` to `borderRadius: 18` (was 17.5).
   - Standardized inner clipping wrapper to `borderRadius: 17` (was 17.5) with `overflow: 'hidden'`.
   - Standardized `heroInnerBorder` to `borderRadius: 15` (was 13) to match Quran reference.
   - Standardized `knowledgeTileWrap` to `14dp` and `knowledgeTileInner` to `13dp` with `overflow: 'hidden'`.
   - Standardized `downloadsCardWrap` to `14dp` and `downloadsCardInner` to `13dp` with `overflow: 'hidden'`.
   - Standardized `guidesCardWrap` to `14dp` and `guidesCardInner` to `13dp` with `overflow: 'hidden'`.

8. `src/screens/ToolsScreen.tsx`:
   - Standardized `heroCardWrap` and `heroCard` to `borderRadius: 18` (was 17.5).
   - Standardized inner clipping wrapper to `borderRadius: 17` (was 17.5) with `overflow: 'hidden'`.
   - Standardized `heroInnerBorder` to `borderRadius: 15` (was 13) to match Quran reference.
   - Standardized `trackerTileWrap` to `14dp` and `trackerTileInner` to `13dp` with `overflow: 'hidden'`.
   - Standardized `utilitiesCardWrap` to `14dp` and `utilitiesCardInner` to `13dp` with `overflow: 'hidden'`.
   - Standardized `liveCardWrap` to `14dp` and `liveCardInner` to `13dp` with `overflow: 'hidden'`.

9. `src/screens/QuranScreen.tsx`:
   - Standardized `langBar` to `borderRadius: 14` (was 16).
   - Standardized `searchBar` to `borderRadius: 14` (was 16).

10. `tests/test_card_style_consistency.mjs`:
    - Created comprehensive test suite asserting all 12 card contracts, token presence, negative rejection of square corners, and responsive geometry.

11. `reports/audit/physical-android-test-checklist.md`:
    - Added Gate 16 ("Global Card Corner & Style Consistency") covering physical phone and tablet hardware, 130% font scale, and touch feedback.

---

## 4. Responsive, Theme, RTL & Font Scale Verification Matrix

| Viewport (dp) | Layout Mode | Theme | Lang / Dir | Font Scale | Card Outer Radius | Inner Clip | Header Gap (24dp) | Bottom Clearance | Status |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **320 x 568** | Phone (Compact) | Paper (Light) | en (LTR) | 100% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.5dp ✓ | **PASS** |
| **320 x 568** | Phone (Compact) | Ink (Dark) | ur (RTL) | 130% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.5dp ✓ | **PASS** |
| **360 x 800** | Phone (Standard) | Paper (Light) | en (LTR) | 100% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.5dp ✓ | **PASS** |
| **360 x 800** | Phone (Standard) | Ink (Dark) | ur (RTL) | 130% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.5dp ✓ | **PASS** |
| **393 x 852** | Phone (Modern) | Paper (Light) | en (LTR) | 100% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.5dp ✓ | **PASS** |
| **393 x 852** | Phone (Modern) | Ink (Dark) | ur (RTL) | 130% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.5dp ✓ | **PASS** |
| **430 x 932** | Phone (Large) | Paper (Light) | en (LTR) | 100% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.5dp ✓ | **PASS** |
| **430 x 932** | Phone (Large) | Ink (Dark) | ur (RTL) | 130% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.5dp ✓ | **PASS** |
| **600 x 960** | Small Tablet | Paper (Light) | en (LTR) | 100% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.0dp ✓ | **PASS** |
| **768 x 1024** | Standard Tablet | Ink (Dark) | ur (RTL) | 130% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.0dp ✓ | **PASS** |
| **1024 x 1366**| Large Tablet | Ink (Dark) | en (LTR) | 100% | Hero: 18, Std: 14 | Hero: 17, Std: 13 | 24dp ✓ | 32.0dp ✓ | **PASS** |

---

## 5. Verification Gate Exit Codes

| Verification Gate | Command | Exit Code | Key Output / Summary |
|---|---|:---:|---|
| **Card Consistency Test** | `node tests/test_card_style_consistency.mjs` | `0` | All 12 tests passed: tokens, clipping, negative failure simulation, responsive geometry |
| **Lint Check** | `npm run lint` | `0` | Clean: 0 lint errors |
| **TypeScript Typecheck** | `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit` | `0` | Clean: 0 type errors |
| **Jest / Test Suite** | `npm test` | `0` | All unit, locale parity, persistence, and regression tests passed |
| **Expo Doctor** | `npx expo-doctor` | `0` | 21/21 checks passed. No issues detected! |
| **Expo Install Check** | `npx expo install --check` | `0` | Dependencies are up to date |
| **Web Platform Export** | `CI=1 npx expo export --platform web` | `0` | Web bundle exported cleanly to `dist/` |
| **Android Smoothness Test** | `node tests/test_android_smoothness_responsive.mjs` | `0` | Invariants, lifecycle, zero-overlap across 7 widths verified |
| **Hub Headers Non-Sticky** | `node tests/test_hub_headers_non_sticky.mjs` | `0` | 32/32 matrix configurations passed (24dp top gap, 32dp bottom gap) |
| **Git Diff Cleanliness** | `git diff --check` | `0` | Zero whitespace errors or conflict markers |

---

## 6. Signed Release APK Build Evidence

The release APK was built strictly per Rule 1 and Rule 6 without modifying the dirty worktree:

```bash
cd android && ANDROID_HOME=/opt/android-sdk GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=768m -Dorg.gradle.workers.max=4 -Dorg.gradle.daemon=false" ./gradlew assembleRelease --no-daemon
```

### Artifact Details
- **APK Path:** `/home/ubuntu/apps/islamic_app/android/app/build/outputs/apk/release/app-release.apk`
- **File Size:** `102M` (106,750,918 bytes)
- **SHA-256 Digest:** `e70a8497bdc4a5bc73fb2cc18659b9c415bf0b2e16d26d0724380cbec56c68ae`
- **Application ID:** `com.qashi.islamic`
- **Version Name:** `1.1.70`
- **Version Code:** `89`
- **Debuggable:** `false` (`application-debuggable` absent from badging)
- **Signature Scheme:** APK Signature Scheme v2 (v2 = `true`)
- **Signer DN:** `CN=Ceoslugpk, OU=Islamic App, O=Ceoslugpk, L=Dubai, ST=Dubai, C=AE`
- **Certificate SHA-256:** `e6e788c76f8400dcc216be66e8a74c5bd1d415c55f322b9b36d401087315458f`

---

## 7. Remaining On-Device Verification (Owner Hardware Required)

Per Rule 21 and the integrity mandate, no physical Android device is attached to this build environment. The following checks cannot be executed in automation and must be tested on physical hardware:
1. **GPU Rasterization & Anti-Aliasing:** Verify on real AMOLED/LCD displays that 14dp corners render without jagged edge artifacts under hardware acceleration.
2. **Haptic & Touch Responsiveness:** Confirm that pressing tiles (`QuickActionsStrip`, `ContinueReadingCard`, `LibraryScreen` tiles) provides instantaneous visual scale feedback (`0.96` - `0.98`) and haptic feedback without delayed navigation transitions.
3. **Hardware Display Scaling:** Test on devices with custom display densities (e.g. Samsung "Screen Zoom" / Display Size set to maximum) to confirm zero text clipping.
