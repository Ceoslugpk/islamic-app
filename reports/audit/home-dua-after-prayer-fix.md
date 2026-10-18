# Audit & Evidence Report: Home "DUA AFTER PRAYER" Cards Fix

**Date:** 2026-10-17
**Project:** Islamic App (`/home/ubuntu/apps/islamic_app`)
**Target:** Fix Home screen cards labeled "DUA AFTER PRAYER"

---

## 1. Observed Root Causes

Investigation of `src/screens/HomeScreen.tsx` and `src/lib/afterPrayerDuas.ts` revealed four root defects affecting the Home "DUA AFTER PRAYER" rail:

1. **Incorrect Prayer Context & Religious Misattribution:**
   - When the user marked Dhuhr, Asr, or Isha as completed, `getAllAfterPrayerDuas` found zero specific matches (as Astaghfirullah and standard adhkar are general to all prayers). However, `HomeScreen.tsx` blindly tagged index 0 with `{t('For')} {t(lastCompletedPrayer)}`, falsely labeling generic Istighfar as "For Dhuhr" or "For Asr".
   - Furthermore, `getAllAfterPrayerDuas` only moved the single first matched item (`matchedIdx > 0`). For Fajr, where three distinct Sunnah recommendations exist (Dua 6: Al-Ikhlas/Falaq/Nas 3x; Dua 7: 10x La ilaha illallah; Dua 8: beneficial knowledge after Fajr prayer), only Dua 6 was placed first, while Dua 7 and Dua 8 were left at the end without contextual tags.
   - If a user had not yet checked a box in the Salah Tracker, `lastCompletedPrayer` was `null`, completely dropping prayer context even when within the active prayer window (`currentSegment`). Conversely, if Fajr was checked in the morning, `lastCompletedPrayer` remained stuck on Fajr for the remainder of the day.

2. **Erratic Snapping & RTL Horizontal Offset Jitter:**
   - The horizontal `ScrollView` used `snapToAlignment="center"`. Because each card is sized to the container width on phone viewports (`duaCardWidth = effectiveDuaWidth`) and clamped to 620dp on tablets, centering without half-viewport insets forced non-zero offset miscalculations, leading to card jumping, fighting scroll boundaries, and misalignment.
   - In RTL layouts (`hScrollRTLStyle()` with `flexDirection: 'row-reverse'`), scroll offset values on Web or certain Android runtimes can be negative or inverted. Because `index` was computed via `Math.round(offsetX / snapInterval)` without `Math.abs`, negative offsets failed the `>= 0` guard, freezing pagination dots and indicators.
   - Lack of an `onMomentumScrollEnd` listener caused the active pagination dot to become desynchronized if a fast flick rested past intermediate throttle intervals.
   - An asymmetric `paddingRight: 4` in `duaRailScrollContent` broke visual symmetry in RTL rows.

3. **Expand / Collapse Touch Area Limitation:**
   - Only the small top header row (`styles.duaAfterPrayerHeader`, ~24dp) was wrapped in a `TouchableOpacity`. Tapping the card body, Arabic text, or translation did nothing, leading to perceived unresponsiveness when users attempted to expand or collapse cards.

4. **Localization & ID Stability Defects:**
   - Pagination text hardcoded English `" of "` (`{activeDuaIndex + 1} of {allAfterPrayerDuas.length}`) instead of using the canonical localized token `t('of')`.
   - `accessibilityLabel` contained hardcoded unlocalized English sentences (`Dua X of Y. Tap to expand/collapse.`).
   - Remote dua payload mapping generated bare numeric/string IDs (`raw.number ?? index`) while fallback data used `after-prayer-N`, causing `expandedDuaIds` key mismatches if cached or remote data hydrated.

---

## 2. Files Changed

1. **`src/lib/afterPrayerDuas.ts`**:
   - Exported `isDuaForPrayer(dua, prayer)` helper to authenticate authentic Sunnah recommendations naming specific prayers.
   - Refactored `getAllAfterPrayerDuas(duas, prayer)` to prioritize all authentic prayer-specific duas first (`[...matching, ...rest]`), without duplicates or omissions.
   - Updated `mapRawDua` to generate canonical stable IDs (`after-prayer-${rawId}`) aligned with `FALLBACK_AFTER_PRAYER_DUAS`.

2. **`src/screens/HomeScreen.tsx`**:
   - Replaced flawed `lastCompletedPrayer` blind tagging with `targetPrayer` (`currentSegment || lastCompletedPrayer`) and `hasSpecificPrayerDuas` detection.
   - Tagged individual cards with `{t('For')} {t(targetPrayer)}` only when `isDuaForPrayer(item, targetPrayer)` is true.
   - Subtitle displays `{t('For')} {t(targetPrayer)}` when specific duas exist, and `{t('Authentic Adhkar')}` otherwise.
   - Removed `snapToAlignment="center"` in favor of standard start alignment (matching `DailyContentRail`).
   - Added `Math.abs()` offset normalization and `onMomentumScrollEnd` synchronization.
   - Wrapped the entire card surface in `duaCardPressable` so tapping anywhere cleanly expands/collapses.
   - Localized pagination text to `{safeActiveIndex + 1} {t('of')} {allAfterPrayerDuas.length}` and localized accessibility labels.
   - Removed asymmetric `paddingRight: 4` from `styles.duaRailScrollContent`.
   - Preserved all canonical card style tokens (`duaCardSlide` 14dp radius, `duaAfterPrayerCard` 14dp radius, 210dp minHeight, 18dp padding).

3. **`tests/test_home_dua_after_prayer.mjs`** *(new focused regression suite)*:
   - Comprehensive 8-part contract test covering fallback validity, Sunnah specificity, priority ordering, stable IDs, viewport responsiveness (320dp–768dp), RTL offset safety, full-card touch expand/collapse, and canonical style tokens.

4. **`package.json`**:
   - Wired `node tests/test_home_dua_after_prayer.mjs` into the root `npm test` script chain.

---

## 3. Exact Verification Commands & Actual Results

| Step | Command | Result |
|---|---|---|
| **Focused Regression Test** | `node tests/test_home_dua_after_prayer.mjs` | **PASSED** (8/8 sections passed with 0 errors) |
| **TypeScript Typecheck** | `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit` | **PASSED** (Exit code 0, 0 errors) |
| **ESLint Scoped Check** | `npx eslint src/screens/HomeScreen.tsx src/lib/afterPrayerDuas.ts` | **PASSED** (Exit code 0, 0 warnings) |
| **Full Regression Suite** | `npm test` | **PASSED** (All 30+ test suites passed) |
| **Expo Web Export Check** | `npx expo export -p web --no-minify` | **PASSED** (Exit code 0, web bundle compiled) |
| **Git Diff Whitespace / Format Check** | `git diff --check` | **PASSED** (Clean, 0 whitespace errors) |

---

## 4. Remaining Device-Only Checks

Automated static and headless tests pass completely. Per Rule 21 ("No physical-device claims without a device"), the following require on-device verification when physical hardware is available:
- Touch gesture velocity when horizontally flinging between card 1 and card 8 on physical Android 12+ devices.
- Visual verification of native Android font ascent/descent for Amiri Arabic text at system 130% display font scale.
- Native TalkBack / VoiceOver spoken readout of the localized expand/collapse card button.

---

## 5. Limitations

- Islamic.app remote API (`https://api.islamic.app/v1/dhikr/after-prayer`) is currently protected by Cloudflare anti-bot challenges; automated requests reliably fall back to the authentic 8 bundled Sunnah adhkar via `FALLBACK_AFTER_PRAYER_DUAS`. The fallback contract is preserved and fully functional offline.
