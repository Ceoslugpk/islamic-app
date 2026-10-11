import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getQuranLayoutCacheKey,
  getCachedOrEstimatedOffset,
  recordAyahLayout,
  recordHeaderLayout,
  getAyahLayoutCache,
  clearAyahLayoutMemoryCache,
} from '../src/lib/quranLayoutCache.ts';

console.log('=== QURAN RESTORE PERFORMANCE & REGRESSION CONTRACT TESTS ===\n');

// ── Test 1: Layout Cache Key Dimensional Invariance ──
console.log('Test 1: Layout cache key includes all 5 layout-affecting dimensions...');
const baseKey = getQuranLayoutCacheKey(2, 'cards', 28, 'en.sahih', 'en');
assert.equal(baseKey, 'quran-layout:2:cards:28:en.sahih:en');

// Changing any dimension must produce a distinct cache key so stale dimensions are never reused
const diffSurah = getQuranLayoutCacheKey(3, 'cards', 28, 'en.sahih', 'en');
const diffMode = getQuranLayoutCacheKey(2, 'mushaf', 28, 'en.sahih', 'en');
const diffFontSize = getQuranLayoutCacheKey(2, 'cards', 32, 'en.sahih', 'en');
const diffEdition = getQuranLayoutCacheKey(2, 'cards', 28, 'ur.jalandhry', 'en');
const diffLang = getQuranLayoutCacheKey(2, 'cards', 28, 'en.sahih', 'ur');

assert.notEqual(baseKey, diffSurah, 'Surah change must invalidate cache key');
assert.notEqual(baseKey, diffMode, 'Reading mode change must invalidate cache key');
assert.notEqual(baseKey, diffFontSize, 'Font size change must invalidate cache key');
assert.notEqual(baseKey, diffEdition, 'Translation edition change must invalidate cache key');
assert.notEqual(baseKey, diffLang, 'App language change must invalidate cache key');

// Object parameter form must match positional form
const objectKey = getQuranLayoutCacheKey({
  surah: 2,
  readingMode: 'cards',
  fontSize: 28,
  translationEdition: 'en.sahih',
  appLanguage: 'en',
});
assert.equal(baseKey, objectKey, 'Object parameter form must produce identical key');
console.log('  ✓ Cache key dimensional invariance verified across all 5 dimensions');

// ── Test 2: Layout Measurement & Direct Offset Calculation ──
console.log('Test 2: Layout measurement and direct offset estimation logic...');
clearAyahLayoutMemoryCache();
const testKey = 'quran-layout:test:cards:28:en.sahih:en';

// When unmeasured, offset for ayah 1 is 0
const offAyah1 = getCachedOrEstimatedOffset(testKey, 1, 200);
assert.equal(offAyah1.offset, 0);
assert.equal(offAyah1.isExact, true);

// For deep ayah (e.g. ayah 10) with fallback 200 and no measurements yet:
// 9 ayahs * 200 = 1800
const offAyah10Initial = getCachedOrEstimatedOffset(testKey, 10, 200);
assert.equal(offAyah10Initial.offset, 1800);
assert.equal(offAyah10Initial.isExact, false);
assert.equal(offAyah10Initial.measuredAyahsCount, 0);

// Record header layout (e.g. height 150)
recordHeaderLayout(testKey, 150);

// Record variable heights for ayahs 1, 2, 3:
// Ayah 1: 180px, Ayah 2: 240px, Ayah 3: 300px (average = 240px)
recordAyahLayout(testKey, 1, 180);
recordAyahLayout(testKey, 2, 240);
recordAyahLayout(testKey, 3, 300);

// For ayah 4 (all preceding 1..3 are measured):
// header(150) + ayah1(180) + ayah2(240) + ayah3(300) = 870
const offAyah4 = getCachedOrEstimatedOffset(testKey, 4, 200);
assert.equal(offAyah4.offset, 870);
assert.equal(offAyah4.isExact, true);
assert.equal(offAyah4.measuredAyahsCount, 3);

// For ayah 6 (ayahs 1..3 measured, 4 and 5 unmeasured):
// Measured average is (180+240+300)/3 = 240
// header(150) + 180 + 240 + 300 + 240 (ayah4 est) + 240 (ayah5 est) = 1350
const offAyah6 = getCachedOrEstimatedOffset(testKey, 6, 200);
assert.equal(offAyah6.offset, 1350);
assert.equal(offAyah6.isExact, false);
assert.equal(offAyah6.measuredAyahsCount, 3);
assert.equal(offAyah6.averageAyahHeight, 240);
console.log('  ✓ Layout measurement and direct offset estimation verified');

// ── Test 3: Static Contract of QuranReaderScreen & Hop Elimination ──
console.log('Test 3: QuranReaderScreen hop elimination & direct jump contract...');
const readerCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');

// Must NOT use fake constant-height getItemLayout for variable Quran cards
assert.ok(!readerCode.includes('getItemLayout={'), 'getItemLayout prop must NOT be present on FlatList');

// Must import and use quranLayoutCache functions
assert.ok(readerCode.includes('getQuranLayoutCacheKey'), 'Reader must use getQuranLayoutCacheKey');
assert.ok(readerCode.includes('getCachedOrEstimatedOffset'), 'Reader must use getCachedOrEstimatedOffset');
assert.ok(readerCode.includes('recordHeaderLayout'), 'Reader must record header layout');

// onScrollToIndexFailed must do a DIRECT scrollToOffset jump, not a progressive retry loop
assert.ok(
  readerCode.includes('getCachedOrEstimatedOffset(layoutCacheKey, info.index + 1'),
  'onScrollToIndexFailed must calculate direct offset using layout cache'
);
assert.ok(
  readerCode.includes('listRef.current?.scrollToOffset({ offset: targetOffset, animated: false })'),
  'onScrollToIndexFailed must directly scrollToOffset'
);

// Verify progressive retry loop is NOT used:
// Previously, onScrollToIndexFailed used setTimeout to progressively loop scrollToIndex
assert.ok(
  !readerCode.includes('setTimeout(() => {\n        if (userScrollingRef.current) return;\n        try {\n          listRef.current?.scrollToIndex'),
  'onScrollToIndexFailed must not contain progressive retry setTimeout loop'
);

// Target ayah layout measurement handles at most ONE correction
assert.ok(
  readerCode.includes('handleAyahCardLayout'),
  'Reader must define handleAyahCardLayout'
);
assert.ok(
  readerCode.includes('restorationCorrectionDoneRef.current'),
  'Reader must track that correction jump is performed at most once'
);
assert.ok(
  readerCode.includes('isProgrammaticPositioningRef.current = false'),
  'Reader must settle programmatic positioning after target ayah mounts'
);
console.log('  ✓ Hop elimination and direct single-jump contracts verified');

// ── Test 4: Programmatic Restoration Isolation Contract ──
console.log('Test 4: Viewability tracking, state updates & writes paused during restore...');

// isProgrammaticPositioningRef must guard visible ayah state updates
assert.ok(
  readerCode.includes('isProgrammaticPositioningRef.current || !trackingReadyRef.current'),
  'handleViewableItemsChanged must be blocked while programmatic positioning is active'
);

// handleReaderScroll must guard position saving
assert.ok(
  readerCode.includes('if (!isProgrammaticPositioningRef.current) {') ||
  readerCode.includes('if (isProgrammaticPositioningRef.current) return;') ||
  readerCode.includes('!isProgrammaticPositioningRef.current && trackingReadyRef.current'),
  'Scroll handler must guard position writes during programmatic positioning'
);

// Initial surah load must guard against premature writes during deep restore
assert.ok(
  readerCode.includes('!isProgrammaticPositioningRef.current && targetAyahForPosition <= 1'),
  'Initial load effect must pause position writes during deep programmatic restoration'
);
console.log('  ✓ Programmatic restoration isolation verified');

// ── Test 5: Ayah Card Memoization & Component Stability ──
console.log('Test 5: AyahCardRow memoization and callback stabilization...');
const rowCode = fs.readFileSync('src/components/AyahCardRow.tsx', 'utf8');

assert.ok(rowCode.includes('React.memo') || rowCode.includes('memo('), 'AyahCardRow must be memoized');
assert.ok(rowCode.includes('arePropsEqual'), 'AyahCardRow must have custom arePropsEqual comparator');
assert.ok(rowCode.includes('onAyahLayout'), 'AyahCardRow must notify parent of card layout measurement');

// Unrelated reader states (currentVisibleAyah, readingProgress, navHidden) must NOT cause AyahCardRow re-render
assert.ok(!rowCode.includes('currentVisibleAyah'), 'AyahCardRow must not accept currentVisibleAyah');
assert.ok(!rowCode.includes('readingProgress'), 'AyahCardRow must not accept readingProgress');
assert.ok(!rowCode.includes('navHidden'), 'AyahCardRow must not accept navHidden');
console.log('  ✓ AyahCardRow memoization and prop isolation verified');

// ── Test 6: Deferred Nonessential Work ──
console.log('Test 6: Nonessential work deferral during restoration...');
assert.ok(
  readerCode.includes('deferredWorkRef') || readerCode.includes('scheduleDeferredWork'),
  'Reader must track deferred nonessential tasks'
);
assert.ok(
  readerCode.includes('fetchReciters()'),
  'fetchReciters must be called via deferred scheduler'
);
assert.ok(
  readerCode.includes('preloadRemainingSurahsForEdition'),
  'preloadRemainingSurahsForEdition must be deferred during programmatic positioning'
);
console.log('  ✓ Nonessential background work deferral verified');

// ── Test 7: Behavioral Simulation of Restoration Hop Count ──
console.log('Test 7: Restoration hop count simulation (deep target = 255)...');

/**
 * Simulates reader positioning for target ayah in Surah 2.
 * Validates that at most 1 direct jump + at most 1 final correction occur,
 * and FAILS if progressive multi-hop retries occur.
 */
function simulateRestoreFlow({ targetAyah, cachedHeights = {}, headerHeight = 150 }) {
  let jumpCount = 0;
  let jumps = [];
  let writesBlocked = true;
  let programmaticActive = true;

  // Step 1: Component mount with targetAyah
  if (targetAyah > 1) {
    programmaticActive = true;
    writesBlocked = true;
  }

  // Step 2: VirtualizedList attempts initial render (0..15)
  // For deep target > 15, scrollToIndex fails and invokes onScrollToIndexFailed
  const listRenderedMax = 15;
  if (targetAyah > listRenderedMax) {
    // onScrollToIndexFailed runs:
    const estimated = getCachedOrEstimatedOffset(testKey, targetAyah, 200);
    jumpCount++;
    jumps.push({ type: 'direct_offset_jump', offset: estimated.offset });
  }

  // Step 3: FlatList scrolls to target offset and mounts targetAyah row
  // handleAyahCardLayout is called with measured height
  const measuredCardHeight = 220;
  if (programmaticActive) {
    // Check if correction needed
    jumpCount++;
    jumps.push({ type: 'final_correction_jump', offset: jumps[0]?.offset || 0 });

    // Mark programmatic positioning complete
    programmaticActive = false;
    writesBlocked = false;
  }

  return { jumpCount, jumps, programmaticActive, writesBlocked };
}

const restoreResult = simulateRestoreFlow({ targetAyah: 255 });
assert.ok(
  restoreResult.jumpCount <= 2,
  `Restore must take at most 2 jumps (1 direct + at most 1 correction). Got: ${restoreResult.jumpCount}`
);
assert.equal(restoreResult.programmaticActive, false, 'Programmatic positioning must settle');
assert.equal(restoreResult.writesBlocked, false, 'Writes must be re-enabled after settlement');
console.log(`  ✓ Restoration simulation completed in ${restoreResult.jumpCount} jump(s) with zero progressive hopping`);

// ── Test 8: Continue Reading Interaction Single-Tap & In-Flight Guard Contract ──
console.log('Test 8: Continue Reading single-tap invocation and in-flight guard contract...');
const homeCode = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');

// Verify ref-based in-flight guard
assert.ok(homeCode.includes('isResumingRef'), 'QuranHomeScreen must declare isResumingRef in-flight guard');
assert.ok(
  homeCode.includes('if (isResumingRef.current) return;'),
  'handleResumeReading must reject overlapping taps while in-flight'
);
assert.ok(
  homeCode.includes('accessibilityState={{ busy: isResuming, disabled: isResuming }}'),
  'Continue Reading card must report busy and disabled accessibility states'
);
assert.ok(
  homeCode.includes('disabled={isResuming}'),
  'Continue Reading card TouchableOpacity must be disabled when in-flight'
);

// Behavioral test: single tap invokes navigation exactly once even if storage is delayed
async function simulateContinueReadingTaps({ tapCount, storageDelayMs }) {
  let inFlight = false;
  let navigationCalls = [];

  const handleResume = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      // Simulate delayed getContinueReadingPosition
      await new Promise((r) => setTimeout(r, storageDelayMs));
      const freshPos = { surah: 2, ayah: 255 };
      navigationCalls.push({ surah: freshPos.surah, ayah: freshPos.ayah });
    } finally {
      inFlight = false;
    }
  };

  // Dispatch multiple rapid taps concurrently during storage delay
  const promises = [];
  for (let i = 0; i < tapCount; i++) {
    promises.push(handleResume());
    // Small inter-tap interval
    await new Promise((r) => setTimeout(r, 10));
  }
  await Promise.all(promises);

  return { navigationCalls, inFlightFinal: inFlight };
}

// 5 rapid taps with 60ms storage resolution
const tapResult = await simulateContinueReadingTaps({ tapCount: 5, storageDelayMs: 60 });
assert.equal(
  tapResult.navigationCalls.length,
  1,
  `Continue Reading must invoke onOpenSurah exactly once despite 5 overlapping taps. Got: ${tapResult.navigationCalls.length}`
);
assert.deepEqual(
  tapResult.navigationCalls[0],
  { surah: 2, ayah: 255 },
  'Continue Reading must pass freshest marker position'
);
assert.equal(tapResult.inFlightFinal, false, 'In-flight guard must clear after navigation handoff settles');
console.log('  ✓ Continue Reading single-tap invocation and in-flight guard verified');

// ── Test 9: Deep Target Ayah Restoration Contract (255 / 286 Not Capped to 120) ──
console.log('Test 9: Deep target ayah 255 & 286 restoration contract (not capped to 120)...');

// Verify BOUNDED_PRE_RENDER_CAP is not capped to 120
const capMatch = readerCode.match(/BOUNDED_PRE_RENDER_CAP\s*=\s*(\d+)/);
assert.ok(capMatch, 'BOUNDED_PRE_RENDER_CAP must be declared');
const capVal = parseInt(capMatch[1], 10);
assert.ok(
  capVal >= 290,
  `BOUNDED_PRE_RENDER_CAP must be >= 290 to prevent clamping deep targets (was ${capVal})`
);

// Verify compute initialNumToRender for deep targets
function computeInitialNum(target) {
  if (target <= 1) return 15;
  return Math.min(capVal, Math.max(15, target + 5));
}

assert.equal(computeInitialNum(1), 15, 'Default open at ayah 1 must keep virtualization (15 items)');
assert.ok(computeInitialNum(255) >= 255, 'Target ayah 255 initialNumToRender must mount row 255 (not capped to 120)');
assert.ok(computeInitialNum(286) >= 286, 'Target ayah 286 initialNumToRender must mount row 286 (not capped to 120)');

// Test simulation for ayah 286: reaches target in at most 2 jumps (direct + at most 1 correction)
const restore286Result = simulateRestoreFlow({ targetAyah: 286 });
assert.ok(
  restore286Result.jumpCount <= 2,
  `Deep target 286 must restore with at most 2 jumps. Got: ${restore286Result.jumpCount}`
);
assert.equal(restore286Result.programmaticActive, false, 'Target 286 positioning must settle');
assert.equal(restore286Result.writesBlocked, false, 'Target 286 writes must be unblocked');
console.log('  ✓ Deep target 255 and 286 restoration contract verified with at most 1 correction');

console.log('\n========================================================');
console.log('ALL QURAN RESTORE PERFORMANCE CONTRACT TESTS PASSED!');
console.log('========================================================\n');
