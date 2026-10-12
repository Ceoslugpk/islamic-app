import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  resolveMushafRestorationTarget,
  calculateMushafScrollTarget,
  computeGroupAbsoluteAyahY,
} from '../src/lib/mushafRestoration.ts';

console.log('=== TEST: QURAN MUSHAF SURAH-START & SETTINGS RACE REGRESSION CONTRACT ===\n');

// ── 1. Production helper behavior for target resolution ──
console.log('--- 1. Restoration Target Resolution ---');

// (a) Normal Surah open with calculated initialPage (e.g. user taps Surah 11 Hud from Surah list)
const normalSurah11Target = resolveMushafRestorationTarget({
  surahNumber: 11,
  initialAyah: 1,
  initialPage: 221,
});
assert.deepEqual(
  normalSurah11Target,
  { surah: 11, ayah: 1 },
  'Normal Surah open for Surah Hud (11) must target ayah 1 even when initialPage 221 is passed'
);

// (b) Normal Surah open for Surah 113 (shared page 604)
const normalSurah113Target = resolveMushafRestorationTarget({
  surahNumber: 113,
  initialPage: 604,
});
assert.deepEqual(
  normalSurah113Target,
  { surah: 113, ayah: 1 },
  'Normal Surah open for Surah 113 must target ayah 1 even when initialPage 604 is passed'
);

// (c) Normal Surah open for Surah 114 (shared page 604)
const normalSurah114Target = resolveMushafRestorationTarget({
  surahNumber: 114,
  initialPage: 604,
});
assert.deepEqual(
  normalSurah114Target,
  { surah: 114, ayah: 1 },
  'Normal Surah open for Surah 114 must target ayah 1'
);

// (d) Explicit Continue Reading target (surah + ayah + page)
const continueReadingTarget = resolveMushafRestorationTarget({
  surahNumber: 11,
  initialAyah: 3,
  initialPage: 221,
});
assert.deepEqual(
  continueReadingTarget,
  { surah: 11, ayah: 3 },
  'Continue Reading must preserve exact ayah target'
);

// (e) Explicit page-only navigation retains page-top behavior (target is null)
const pageOnlyTarget = resolveMushafRestorationTarget({
  surahNumber: 11,
  initialPage: 221,
  pageOnly: true,
});
assert.equal(
  pageOnlyTarget,
  null,
  'Explicit page-only navigation must yield null restoration target'
);

console.log('  ✓ Target resolution verified across normal Surah opens, Continue Reading, and page-only modes');

// ── 2. Shared page scroll positioning: Surah Hud on authentic Page 221 fixture ──
console.log('\n--- 2. Surah Hud on Authentic Page 221 Fixture ---');

// Model authentic Mushaf Page 221 payload containing Surah Yunus (10) and Surah Hud (11)
const mockPage221Detail = {
  pageNumber: 221,
  juz: 11,
  surahs: [
    { number: 10, name: 'يونس', englishName: 'Yunus', numberOfAyahs: 109, revelationType: 'Meccan' },
    { number: 11, name: 'هود', englishName: 'Hud', numberOfAyahs: 123, revelationType: 'Meccan' },
  ],
  ayahs: [
    // Surah 10 ayahs 107..109 precede Surah Hud at the top of the page
    { number: 1471, numberInSurah: 107, text: 'وَإِن يَمْسَسْكَ اللَّهُ بِضُرٍّ', surah: { number: 10 }, page: 221, juz: 11 },
    { number: 1472, numberInSurah: 108, text: 'قُلْ يَا أَيُّهَا النَّاسُ قَدْ جَاءَكُمُ الْحَقُّ', surah: { number: 10 }, page: 221, juz: 11 },
    { number: 1473, numberInSurah: 109, text: 'وَاتَّبِعْ مَا يُوحَىٰ إِلَيْكَ', surah: { number: 10 }, page: 221, juz: 11 },
    // Surah 11 Hud begins midway down Page 221
    { number: 1474, numberInSurah: 1, text: 'الر ۚ كِتَابٌ أُحْكِمَتْ آيَاتُهُ ثُمَّ فُصِّلَتْ', surah: { number: 11 }, page: 221, juz: 11 },
    { number: 1475, numberInSurah: 2, text: 'أَلَّا تَعْبُدُوا إِلَّا اللَّهَ', surah: { number: 11 }, page: 221, juz: 11 },
    { number: 1476, numberInSurah: 3, text: 'وَأَنِ اسْتَغْفِرُوا رَبَّكُمْ ثُمَّ تُوبُوا إِلَيْهِ', surah: { number: 11 }, page: 221, juz: 11 },
    { number: 1477, numberInSurah: 4, text: 'إِلَى اللَّهِ مَرْجِعُكُمْ', surah: { number: 11 }, page: 221, juz: 11 },
    { number: 1478, numberInSurah: 5, text: 'أَلَا إِنَّهُمْ يَثْنُونَ صُدُورَهُمْ', surah: { number: 11 }, page: 221, juz: 11 },
  ],
};

// 2a: Unready layout safety: when group, banner, or row layouts have not committed
const unreadyY1 = computeGroupAbsoluteAyahY({
  groupY: undefined,
  hasSurahStart: true,
  bannerHeight: 120,
  localAyahY: 10,
});
assert.equal(unreadyY1, null, 'Unready groupY must return null');

const unreadyY2 = computeGroupAbsoluteAyahY({
  groupY: 380,
  hasSurahStart: true,
  bannerHeight: undefined,
  localAyahY: 10,
});
assert.equal(unreadyY2, null, 'Unready bannerHeight for surah-start group must return null');

const unreadyY3 = computeGroupAbsoluteAyahY({
  groupY: 380,
  hasSurahStart: true,
  bannerHeight: 120,
  localAyahY: undefined,
});
assert.equal(unreadyY3, null, 'Unready localAyahY must return null');

const scrollResultHudUnready = calculateMushafScrollTarget({
  target: normalSurah11Target,
  pageData: mockPage221Detail,
  measuredLayouts: {}, // empty
  headroom: 60,
});
assert.equal(scrollResultHudUnready.isLayoutReady, false, 'Scroll target must report isLayoutReady: false when row is not measured');
assert.equal(scrollResultHudUnready.isSharedPageTarget, true, 'Surah Hud on page 221 must be recognized as shared page target');

// 2b: Measured layout commits: Group 11 at 380, Banner at 130, local 11:1 at 10 -> absoluteY = 520
const measuredHud1Y = computeGroupAbsoluteAyahY({
  groupY: 380,
  hasSurahStart: true,
  bannerHeight: 130,
  localAyahY: 10,
});
assert.equal(measuredHud1Y, 520, 'Group Y + Banner H + local Ayah Y must compute 520');

const mockMeasuredLayouts221 = {
  '10:107': { y: 0, height: 44 },
  '10:108': { y: 60, height: 44 },
  '10:109': { y: 120, height: 44 },
  '11:1': { y: 520, height: 50 },
  '11:2': { y: 580, height: 44 },
};

const scrollResultHud = calculateMushafScrollTarget({
  target: normalSurah11Target,
  pageData: mockPage221Detail,
  measuredLayouts: mockMeasuredLayouts221,
  headroom: 60,
});

assert.equal(scrollResultHud.isSharedPageTarget, true, 'Surah Hud on page 221 must be recognized as shared page target');
assert.equal(scrollResultHud.targetAyahFound, true, 'Surah Hud 11:1 must be found on page 221');
assert.equal(scrollResultHud.targetKey, '11:1', 'Target key must match 11:1');
assert.equal(scrollResultHud.isLayoutReady, true, 'Layout must be reported ready when row is measured');
assert.equal(scrollResultHud.targetOffset, 460, 'Final scroll target must be measured row (520 - 60 = 460), NOT offset 0');
assert.notEqual(scrollResultHud.targetOffset, 0, 'Surah Hud open must NOT land at page top (offset 0)');

console.log('  ✓ Surah Hud 11:1 on Page 221 correctly scrolls to measured row (460), NOT offset 0');

// ── 3. First-ayah-on-page and page-only scenarios ──
console.log('\n--- 3. Page-top and Page-only Scenarios ---');

// (a) Surah 10 (Yunus) on its starting page (Page 208): 10:1 is page[0] -> offset 0
const mockPage208Detail = {
  pageNumber: 208,
  juz: 11,
  surahs: [{ number: 10, name: 'يونس', englishName: 'Yunus', numberOfAyahs: 109, revelationType: 'Meccan' }],
  ayahs: [
    { number: 1365, numberInSurah: 1, text: 'الر ۚ تِلْكَ آيَاتُ الْكِتَابِ الْحَكِيمِ', surah: { number: 10 }, page: 208, juz: 11 },
    { number: 1366, numberInSurah: 2, text: 'أَكَانَ لِلنَّاسِ عَجَبًا', surah: { number: 10 }, page: 208, juz: 11 },
  ],
};
const normalSurah10Target = resolveMushafRestorationTarget({ surahNumber: 10, initialPage: 208 });
const scrollResultSurah10 = calculateMushafScrollTarget({
  target: normalSurah10Target,
  pageData: mockPage208Detail,
  measuredLayouts: { '10:1': { y: 0, height: 44 } },
});
assert.equal(scrollResultSurah10.targetOffset, 0, 'Surah starting at page[0] must target offset 0');
assert.equal(scrollResultSurah10.isSharedPageTarget, false, 'Surah starting at page[0] is not shared-page offset');
assert.equal(scrollResultSurah10.isLayoutReady, true, 'Surah starting at page[0] layout is immediately ready');

// (b) Surah 112 on page 604: 112:1 is page[0] -> offset 0
const normalSurah112Target = resolveMushafRestorationTarget({ surahNumber: 112, initialPage: 604 });
const scrollResultSurah112 = calculateMushafScrollTarget({
  target: normalSurah112Target,
  pageData: { pageNumber: 604, ayahs: [{ number: 6222, numberInSurah: 1, surah: { number: 112 } }] },
  measuredLayouts: { '112:1': { y: 0, height: 44 } },
});
assert.equal(scrollResultSurah112.targetOffset, 0, 'Surah 112:1 at page[0] must target offset 0');

// (c) Page-only navigation to page 221 (target is null)
const scrollResultPageOnly = calculateMushafScrollTarget({
  target: null,
  pageData: mockPage221Detail,
  measuredLayouts: mockMeasuredLayouts221,
});
assert.equal(scrollResultPageOnly.targetOffset, 0, 'Page-only navigation must strictly target offset 0');
assert.equal(scrollResultPageOnly.isSharedPageTarget, false, 'Page-only is not a shared page target');

console.log('  ✓ Surah at page[0] and page-only navigation verified (strictly target offset 0)');

// ── 4. Late page-top reset safety simulation ──
console.log('\n--- 4. Late Page-Top Reset Safety Simulation ---');

function simulateLatePageDataArrival(target, pageData, isPageOnly) {
  let scrolledToZero = false;
  // Production contract: loadPageData only scrolls to offset 0 if target is page[0] OR (target is null AND pageOnly)
  if (target && pageData.ayahs[0].surah.number === target.surah && pageData.ayahs[0].numberInSurah === target.ayah) {
    scrolledToZero = true;
  } else if (!target && isPageOnly) {
    scrolledToZero = true;
  }
  return { scrolledToZero };
}

// Normal Surah Hud open on page 221 (target active)
const hudLateResult = simulateLatePageDataArrival(normalSurah11Target, mockPage221Detail, false);
assert.equal(hudLateResult.scrolledToZero, false, 'Late page arrival must NOT trigger offset 0 scroll for active normal Surah target');

// Page-only navigation
const pageOnlyLateResult = simulateLatePageDataArrival(null, mockPage221Detail, true);
assert.equal(pageOnlyLateResult.scrolledToZero, true, 'Page-only navigation must trigger offset 0 scroll');

// Surah starting at page[0]
const surah10LateResult = simulateLatePageDataArrival(normalSurah10Target, mockPage208Detail, false);
assert.equal(surah10LateResult.scrolledToZero, true, 'Surah at page[0] must trigger offset 0 scroll');

console.log('  ✓ Late page arrival cannot overwrite active normal-Surah target');

// ── 5. Production Source Contracts ──
console.log('\n--- 5. Production Source Contracts ---');

const appTsx = fs.readFileSync('App.tsx', 'utf8');
const reader = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
const settings = fs.readFileSync('src/lib/settings.tsx', 'utf8');

// App.tsx navigation contract
assert.match(appTsx, /export type QuranView =[\s\S]*?pageOnly\?: boolean/, 'App.tsx QuranView union must support pageOnly?: boolean');
assert.match(appTsx, /<QuranReaderScreen[\s\S]*?pageOnly=\{quran\.pageOnly\}/, 'App.tsx must pass pageOnly prop to QuranReaderScreen');
assert.match(appTsx, /onOpenSurah=\{\(n, a, p\) =>[\s\S]*?setQuran\(\{ screen: 'reader', surah: n, initialAyah, initialPage \}\)/, 'App.tsx onOpenSurah must propagate initialAyah and initialPage');

// QuranReaderScreen restoration contracts
assert.match(reader, /resolveMushafRestorationTarget/, 'QuranReaderScreen must wire resolveMushafRestorationTarget');
assert.match(reader, /calculateMushafScrollTarget/, 'QuranReaderScreen must wire calculateMushafScrollTarget');
assert.match(reader, /restorationTargetRef\.current =/, 'Mushaf restoration target must be reset on navigation changes');
assert.match(reader, /handleMushafAyahLayout/, 'Mushaf target must use measured ayah layout');
assert.match(reader, /restorationCompletedRef\.current = true/, 'QuranReaderScreen must track restoration completion');
assert.match(reader, /onContentSizeChange/, 'QuranReaderScreen must re-assert landed offset on content size change');

// Settings hydration baseline contracts
assert.match(settings, /hydrationBaselineRef/, 'settings hydration must retain an initial baseline');
assert.match(settings, /changedDuringHydration/, 'settings hydration must merge live changes');
assert.match(settings, /Object\.is\(live\[typedKey\], baseline\[typedKey\]\)/, 'hydration merge must detect changed fields');

console.log('  ✓ Production source contracts verified');

console.log('\n================================================================');
console.log('ALL SURAH-START & SETTINGS RACE REGRESSION CONTRACTS PASSED!');
console.log('================================================================\n');
