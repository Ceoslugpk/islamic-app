import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  resolveMushafRestorationTarget,
  calculateMushafScrollTarget,
} from '../src/lib/mushafRestoration.ts';

console.log('=== TEST: QURAN MUSHAF SURAH-START & SETTINGS RACE REGRESSION CONTRACT ===\n');

// ── 1. Production helper behavior for target resolution ──
console.log('--- 1. Restoration Target Resolution ---');

// (a) Normal Surah open with calculated initialPage (e.g. user taps Surah 113 from Surah list)
const normalSurah113Target = resolveMushafRestorationTarget({
  surahNumber: 113,
  initialPage: 604,
});
assert.deepEqual(
  normalSurah113Target,
  { surah: 113, ayah: 1 },
  'Normal Surah open for Surah 113 must target ayah 1 even when initialPage 604 is passed'
);

// (b) Normal Surah open for Surah 114 (shared page 604)
const normalSurah114Target = resolveMushafRestorationTarget({
  surahNumber: 114,
  initialPage: 604,
});
assert.deepEqual(
  normalSurah114Target,
  { surah: 114, ayah: 1 },
  'Normal Surah open for Surah 114 must target ayah 1'
);

// (c) Explicit Continue Reading target (surah + ayah + page)
const continueReadingTarget = resolveMushafRestorationTarget({
  surahNumber: 113,
  initialAyah: 3,
  initialPage: 604,
});
assert.deepEqual(
  continueReadingTarget,
  { surah: 113, ayah: 3 },
  'Continue Reading must preserve exact ayah target'
);

// (d) Explicit page-only navigation retains page-top behavior (target is null)
const pageOnlyTarget = resolveMushafRestorationTarget({
  surahNumber: 113,
  initialPage: 604,
  pageOnly: true,
});
assert.equal(
  pageOnlyTarget,
  null,
  'Explicit page-only navigation must yield null restoration target'
);

console.log('  ✓ Target resolution verified across normal Surah opens, Continue Reading, and page-only modes');

// ── 2. Shared page scroll positioning simulation (Page 604) ──
console.log('\n--- 2. Shared Page Scroll Positioning (Page 604) ---');

// Model authentic Mushaf Page 604 payload containing Surahs 112, 113, and 114
const mockPage604Detail = {
  pageNumber: 604,
  juz: 30,
  surahs: [
    { number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlaas', numberOfAyahs: 4, revelationType: 'Meccan' },
    { number: 113, name: 'الفلق', englishName: 'Al-Falaq', numberOfAyahs: 5, revelationType: 'Meccan' },
    { number: 114, name: 'الناس', englishName: 'An-Naas', numberOfAyahs: 6, revelationType: 'Meccan' },
  ],
  ayahs: [
    // Surah 112 ayahs 1..4 (top of page)
    { number: 6222, numberInSurah: 1, text: 'قُلْ هُوَ اللَّهُ أَحَدٌ', surah: { number: 112 }, page: 604, juz: 30 },
    { number: 6223, numberInSurah: 2, text: 'اللَّهُ الصَّمَدُ', surah: { number: 112 }, page: 604, juz: 30 },
    { number: 6224, numberInSurah: 3, text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', surah: { number: 112 }, page: 604, juz: 30 },
    { number: 6225, numberInSurah: 4, text: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', surah: { number: 112 }, page: 604, juz: 30 },
    // Surah 113 ayahs 1..5 (middle of page)
    { number: 6226, numberInSurah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', surah: { number: 113 }, page: 604, juz: 30 },
    { number: 6227, numberInSurah: 2, text: 'مِن شَرِّ مَا خَلَقَ', surah: { number: 113 }, page: 604, juz: 30 },
    { number: 6228, numberInSurah: 3, text: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ', surah: { number: 113 }, page: 604, juz: 30 },
    { number: 6229, numberInSurah: 4, text: 'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', surah: { number: 113 }, page: 604, juz: 30 },
    { number: 6230, numberInSurah: 5, text: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', surah: { number: 113 }, page: 604, juz: 30 },
    // Surah 114 ayahs 1..6 (bottom of page)
    { number: 6231, numberInSurah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', surah: { number: 114 }, page: 604, juz: 30 },
    { number: 6232, numberInSurah: 2, text: 'مَلِكِ النَّاسِ', surah: { number: 114 }, page: 604, juz: 30 },
    { number: 6233, numberInSurah: 3, text: 'إِلَٰهِ النَّاسِ', surah: { number: 114 }, page: 604, juz: 30 },
    { number: 6234, numberInSurah: 4, text: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', surah: { number: 114 }, page: 604, juz: 30 },
    { number: 6235, numberInSurah: 5, text: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', surah: { number: 114 }, page: 604, juz: 30 },
    { number: 6236, numberInSurah: 6, text: 'مِنَ الْجِنَّةِ وَالنَّاسِ', surah: { number: 114 }, page: 604, juz: 30 },
  ],
};

// Simulated layout measurements for the page rows
const mockMeasuredLayouts = {
  '112:1': { y: 0, height: 44 },
  '112:2': { y: 50, height: 44 },
  '112:3': { y: 100, height: 44 },
  '112:4': { y: 150, height: 44 },
  '113:1': { y: 340, height: 52 }, // Row for Surah 113:1 in the middle
  '113:2': { y: 400, height: 44 },
  '113:3': { y: 450, height: 44 },
  '113:4': { y: 500, height: 44 },
  '113:5': { y: 550, height: 44 },
  '114:1': { y: 680, height: 52 }, // Row for Surah 114:1 near the bottom
  '114:2': { y: 740, height: 44 },
  '114:3': { y: 790, height: 44 },
  '114:4': { y: 840, height: 44 },
  '114:5': { y: 890, height: 44 },
  '114:6': { y: 940, height: 44 },
};

// Scenario A: User opens Surah 113 (middle of shared page)
const scrollResult113 = calculateMushafScrollTarget({
  target: normalSurah113Target,
  pageData: mockPage604Detail,
  measuredLayouts: mockMeasuredLayouts,
  headroom: 60,
});

assert.equal(scrollResult113.isSharedPageTarget, true, 'Surah 113 on page 604 must be recognized as a shared page target');
assert.equal(scrollResult113.targetAyahFound, true, 'Surah 113:1 must be found on page 604');
assert.equal(scrollResult113.targetKey, '113:1', 'Target key must match 113:1');
assert.equal(scrollResult113.targetOffset, 280, 'Final scroll target must be measured row (340 - 60 = 280), NOT offset 0');
assert.notEqual(scrollResult113.targetOffset, 0, 'Surah 113 open must NOT land at page top (offset 0)');

// Scenario B: User opens Surah 114 (bottom of shared page)
const scrollResult114 = calculateMushafScrollTarget({
  target: normalSurah114Target,
  pageData: mockPage604Detail,
  measuredLayouts: mockMeasuredLayouts,
  headroom: 60,
});

assert.equal(scrollResult114.isSharedPageTarget, true, 'Surah 114 on page 604 must be recognized as a shared page target');
assert.equal(scrollResult114.targetOffset, 620, 'Final scroll target must be measured row (680 - 60 = 620)');
assert.notEqual(scrollResult114.targetOffset, 0, 'Surah 114 open must NOT land at page top (offset 0)');

// Scenario C: Explicit page-only navigation to page 604
const scrollResultPageOnly = calculateMushafScrollTarget({
  target: pageOnlyTarget, // null
  pageData: mockPage604Detail,
  measuredLayouts: mockMeasuredLayouts,
});

assert.equal(scrollResultPageOnly.targetOffset, 0, 'Page-only navigation must strictly target offset 0');
assert.equal(scrollResultPageOnly.isSharedPageTarget, false, 'Page-only navigation is not a shared page target');

// Scenario D: Normal Surah open for the first Surah on the page (Surah 112)
const normalSurah112Target = resolveMushafRestorationTarget({
  surahNumber: 112,
  initialPage: 604,
});
const scrollResult112 = calculateMushafScrollTarget({
  target: normalSurah112Target,
  pageData: mockPage604Detail,
  measuredLayouts: mockMeasuredLayouts,
});

assert.equal(scrollResult112.targetOffset, 0, 'First Surah on page (Surah 112:1) correctly targets page top (offset 0)');
assert.equal(scrollResult112.isSharedPageTarget, false, 'First Surah of page is not offset from page top');

// Scenario E: Explicit Continue Reading target in middle of Surah 113 (ayah 3)
const scrollResultContinue113Ayah3 = calculateMushafScrollTarget({
  target: continueReadingTarget,
  pageData: mockPage604Detail,
  measuredLayouts: mockMeasuredLayouts,
  headroom: 60,
});

assert.equal(scrollResultContinue113Ayah3.targetKey, '113:3', 'Continue reading target key must match 113:3');
assert.equal(scrollResultContinue113Ayah3.targetOffset, 390, 'Continue reading lands at measured row (450 - 60 = 390)');

console.log('  ✓ Shared page scroll target calculation verified (middle Surah lands at first row, not offset 0; page-only lands at 0)');

// ── 3. Production source contracts ──
console.log('\n--- 3. Production Source Contracts ---');

const reader = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
const settings = fs.readFileSync('src/lib/settings.tsx', 'utf8');

assert.match(reader, /resolveMushafRestorationTarget/, 'QuranReaderScreen must wire resolveMushafRestorationTarget');
assert.match(reader, /calculateMushafScrollTarget/, 'QuranReaderScreen must wire calculateMushafScrollTarget');
assert.match(reader, /restorationTargetRef\.current =/, 'Mushaf restoration target must be reset on navigation changes');
assert.match(reader, /handleMushafAyahLayout/, 'Mushaf target must use measured ayah layout');
assert.match(settings, /hydrationBaselineRef/, 'settings hydration must retain an initial baseline');
assert.match(settings, /changedDuringHydration/, 'settings hydration must merge live changes');
assert.match(settings, /Object\.is\(live\[typedKey\], baseline\[typedKey\]\)/, 'hydration merge must detect changed fields');

console.log('  ✓ Production source contracts verified');

console.log('\n================================================================');
console.log('ALL SURAH-START & SETTINGS RACE REGRESSION CONTRACTS PASSED!');
console.log('================================================================\n');
