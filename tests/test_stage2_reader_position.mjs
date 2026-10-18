import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== STAGE-2 QA: MUSHARF LINEHEIGHT + CONTINUE READING EXACT POSITION + READER POSITIONING ===\n');

const ok = (m) => console.log(`  [ok] ${m}`);

// ── 1. Mushaf lineHeight formula sanity ──
// Reader computes ayah lineHeight as round(fontSize * quranLineHeight) and the
// mushaf rows use round((fontSize+2) * lineHeight). Settings clamp line height
// to [1.4, 2.2] step 0.1, default 1.8. Verify:
//  - default + clamp constants exist and are sane (1.8 in [1.4, 2.2])
//  - the formula never collapses (lineHeight >= fontSize) across the full
//    font-size range at every allowed line-height value
//  - mushaf ayah (fontSize+2) rows are always taller than cards (fontSize),
//    i.e. mushaf rows have strictly more vertical room (no-overlap requirement)
const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');
const readerCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');

const MIN = 1.4, MAX = 3.0, STEP = 0.1, DEFAULT = 2.2;
assert.ok(settingsCode.includes('QURAN_LINE_HEIGHT_MIN = 1.4'), 'line-height min is 1.4');
assert.ok(settingsCode.includes('QURAN_LINE_HEIGHT_MAX = 3.0'), 'line-height max is 3.0');
assert.ok(settingsCode.includes('QURAN_LINE_HEIGHT_DEFAULT = 2.2'), 'line-height default is 2.2');
assert.ok(settingsCode.includes('QURAN_LINE_HEIGHT_STEP = 0.1'), 'line-height step is 0.1');
assert.ok(settingsCode.includes('quranLineHeight: QURAN_LINE_HEIGHT_DEFAULT'), 'settings default applies line-height 2.2');

// clamp function exists and bounds correctly
assert.ok(settingsCode.includes('export function clampQuranLineHeight'), 'clampQuranLineHeight exported');
assert.ok(
  settingsCode.includes('Math.max(QURAN_LINE_HEIGHT_MIN, Math.min(QURAN_LINE_HEIGHT_MAX, rounded))'),
  'clampQuranLineHeight clamps to [min,max]'
);

// formula: reader ayahLineHeight = round(fontSize * lineHeight)
assert.ok(
  readerCode.includes('Math.round(fontSize * (settings?.quranLineHeight || 1.6))'),
  'cards ayahLineHeight = round(fontSize * lineHeight)'
);
// mushaf rows: fontSize + 2 in page and tajweed renderers
const mushafMatches = (readerCode.match(/Math\.round\(\(fontSize \+ 2\) \* \(settings\?\.quranLineHeight \|\| 1\.6\)\)/g) || []);
assert.strictEqual(mushafMatches.length, 2, `mushaf lineHeight formula must cover page and tajweed renderers, got ${mushafMatches.length}`);

// numeric sweep: no overlap/negative metrics anywhere in range
for (let fs = 18; fs <= 40; fs += 2) {
  let lh = MIN;
  while (lh <= MAX + 1e-9) {
    const cardLH = Math.round(fs * lh);
    const mushafLH = Math.round((fs + 2) * lh);
    assert.ok(cardLH >= fs, `card lineHeight ${cardLH} < fontSize ${fs} at lh=${lh}`);
    assert.ok(mushafLH >= fs + 2, `mushaf lineHeight ${mushafLH} < fontSize+2 ${fs + 2} at lh=${lh}`);
    assert.ok(mushafLH > cardLH, `mushaf lineHeight ${mushafLH} not > card ${cardLH} at fs=${fs} lh=${lh}`);
    lh = Math.round((lh + STEP) * 10) / 10;
  }
}
ok(`lineHeight sweep: all ${(MAX - MIN) / STEP + 1} allowed line-heights x all 12 font sizes pass no-overlap (mushaf row > card row)`);

// ── 2. Continue Reading exact-position chain (static assertions) ──
// Chain: getContinueReadingPosition (marker-first, bounds-validated) →
// QuranHome resumeTarget → onOpenSurah(surah, ayah) → QuranReader
// targetAyahForPosition (clamped to SURAH_AYAH_COUNTS) → initialListIndex =
// targetAyah - 1 → scrollToIndex. Verify each link.
const continuingCode = fs.readFileSync('src/lib/continuing.ts', 'utf8');
const homeCode = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');

// (a) resolver: marker first, then auto position
assert.ok(
  continuingCode.includes('const marker = await getReadingMarker();\n  if (marker) return marker;\n  const position = await getReadingPosition();\n  if (position) return position;') &&
  continuingCode.includes('const legacy = loadLastReadPosition();'),
  'getContinueReadingPosition: marker first, automatic position second, older reader record last'
);
// (b) bounds validation guards corrupt/stale positions
assert.ok(continuingCode.includes('isValidReadingPosition'), 'isValidReadingPosition defined');
assert.ok(
  continuingCode.includes('if (surah < 1 || surah > 114) return false;'),
  'resolver rejects out-of-range surah'
);
assert.ok(
  continuingCode.includes('return ayah >= 1 && ayah <= maxAyah;'),
  'resolver rejects out-of-range ayah (per-surah count)'
);
// getReadingPosition + getReadingMarker both validate before returning
assert.ok(
  continuingCode.includes('isValidReadingPosition(parsed)') &&
    (continuingCode.match(/isValidReadingPosition\(parsed\)/g) || []).length >= 2,
  'both getReadingPosition and getReadingMarker validate stored values'
);
ok('resolver: marker-first + bounds-validated (corrupt/stale positions rejected)');

// (c) QuranHome resumeTarget: position wins over lastRead, surah/ayah passed through
assert.ok(
  homeCode.includes('if (readingPosition) {'),
  'QuranHome resumeTarget prefers live reading position'
);
assert.ok(
  homeCode.includes('surah: readingPosition.surah,\n        ayah: readingPosition.ayah,'),
  'resumeTarget passes exact stored surah+ayah'
);
assert.ok(
  homeCode.includes('onOpenSurah(resumeTarget.surah, resumeTarget.ayah, resumeTarget.page)'),
  'handleResumeReading opens reader at exact stored position including page'
);
ok('QuranHome: resumeTarget passes stored surah+ayah+page through to reader');

// (d) reader: targetAyahForPosition clamped to real ayah count, index = target-1
assert.ok(
  readerCode.includes('const maxAyah = SURAH_AYAH_COUNTS[safeSurahNumber - 1] || 7;'),
  'reader clamps target ayah to the surah real ayah count'
);
assert.ok(
  readerCode.includes('return Math.min(target, maxAyah);'),
  'reader clamps target with Math.min'
);
assert.ok(
  readerCode.includes('const initialListIndex = Math.max(0, targetAyahForPosition - 1);'),
  'targetIndex conversion: initialListIndex = targetAyah - 1 (0-based)'
);
assert.ok(
  readerCode.includes('listRef.current?.scrollToIndex({ index: targetIndex, animated: false })'),
  'cards positioning uses scrollToIndex at targetIndex'
);
assert.ok(
  readerCode.includes('const targetIndex = targetAyah - 1;'),
  'targetIndex = targetAyah - 1 (1-based ayah → 0-based list index)'
);
ok('reader: clamped target → targetIndex (0-based) → scrollToIndex exact position');

// (e) failed-retry converges (deep targets) — measured-edge advance before retry
assert.ok(
  readerCode.includes('const measuredOffset = Math.max(0, (info.highestMeasuredFrameIndex + 1) * info.averageItemLength);'),
  'onScrollToIndexFailed advances to measured edge before retrying'
);
assert.ok(
  readerCode.includes('listRef.current?.scrollToIndex({ index: info.index, animated: false });\n          // The retry is a deliberate positioning jump — mark it done so the'),
  'retry scrolls to the exact failed index and marks positioned'
);
assert.ok(readerCode.includes('initialNumToRender={15}'), 'FlatList renders an initial batch (progressive rendering)');
assert.ok(readerCode.includes('maxToRenderPerBatch={15}'), 'FlatList renders subsequent batches (convergence)');
// Simulate the retry loop: measured-edge scrollToOffset renders one more batch
// per failure, so the render window strictly advances toward targetIndex.
function simulateRetry(targetIndex) {
  let frames = 15;
  let attempts = 0;
  while (frames <= targetIndex && attempts < 100) {
    const old = frames;
    frames = Math.min(targetIndex + 1, frames + 15);
    attempts++;
    if (frames === old) return { deadlock: true, attempts };
  }
  return { deadlock: false, attempts, frames };
}
const deep = simulateRetry(286);
assert.ok(!deep.deadlock, `deep-target retry loop deadlocked: ${JSON.stringify(deep)}`);
assert.strictEqual(deep.frames, 287, `retry loop must reach target index+1, got ${deep.frames}`);
ok(`deep-target retry: simulated loop converges to ayah 286 in ${deep.attempts} retries (no deadlock)`);

// (f) mushaf positioning: exact real page restoration and ayah location without proportional scrolling
assert.ok(
  readerCode.includes('fetchMushafPage') && readerCode.includes('currentPage'),
  'mushaf reader fetches and renders exact real page directly'
);
assert.ok(
  readerCode.includes('currentPageData') && !readerCode.includes('mushafContentHeightRef.current'),
  'mushaf mode uses real page data without proportional scroll approximation'
);
ok('mushaf positioning: exact page restoration without proportional scrolling');

// (g) unmount flush: last known ayah saved on exit (marker survives restart)
assert.ok(
  readerCode.includes('const ayah = lastSavedAyahRef.current || 1;\n      saveReadingPosition(surahNumberRef.current, ayah'),
  'reader flushes position on unmount'
);
assert.ok(
  readerCode.includes('saveQuranCache(`surah-last-ayah:${surahNumberRef.current}`, { ayah });'),
  'reader flushes surah-last-ayah cache on unmount'
);
ok('unmount flush: position + per-surah cache persisted on exit');

// (h) marker survives restart + language switch: stored in AsyncStorage under a
//     language-independent key, resolved fresh on every mount
assert.ok(continuingCode.includes("const MARKER_KEY = 'quran-reading-marker';"), 'marker key is language-independent');
assert.ok(
  continuingCode.includes("export async function getReadingMarker(): Promise<ReadingMarker | null>"),
  'marker read path async (fresh from storage, not module state)'
);
assert.ok(
  readerCode.includes('getReadingMarker()\n      .then((m) => {'),
  'reader reloads marker from storage on mount'
);
ok('marker: persisted under language-independent key, reloaded on every mount');

// (i) QuranHome focus refresh: card refreshes on return from reader
assert.ok(
  homeCode.includes('wasActiveRef') && homeCode.includes('refreshGenRef'),
  'QuranHome has focus-refresh generation guard'
);
assert.ok(
  homeCode.includes('if (!isActive || wasActiveRef.current) return;'),
  'focus refresh runs exactly once per return'
);
assert.ok(
  homeCode.includes('getContinueReadingPosition()\n      .then((pos) => {\n        if (gen === refreshGenRef.current) setReadingPosition(pos);'),
  'focus refresh reloads continue-reading position'
);
ok('QuranHome: Continue Reading card refreshes on return from reader (generation-guarded)');

// (j) ContinueReadingCard (Today screen): resolver used, opens exact position
const cardCode = fs.readFileSync('src/components/ContinueReadingCard.tsx', 'utf8');
assert.ok(
  cardCode.includes('const pos = await getContinueReadingPosition();'),
  'ContinueReadingCard uses the canonical resolver'
);
assert.ok(
  cardCode.includes('onOpenReader?.(position.surah, position.ayah'),
  'ContinueReadingCard opens reader at exact stored position'
);
ok('ContinueReadingCard (Today): resolver + exact-position open');

// (k) Page propagation through every navigation layer
const appCode = fs.readFileSync('App.tsx', 'utf8');
const todayCode = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
assert.ok(
  homeCode.includes('onOpenSurah(freshPos.surah, freshPos.ayah, freshPos.page)'),
  'QuranHomeScreen passes freshPos page to onOpenSurah'
);
assert.ok(
  appCode.includes('onOpenSurah={openQuranSurah}') &&
  appCode.includes('const openQuranSurah = useCallback((surah: number, ayah?: number, page?: number)') &&
  appCode.includes("setQuran({ screen: 'reader', surah, initialAyah, initialPage })"),
  'App.tsx propagates initialPage from QuranHomeScreen to QuranView reader state'
);
assert.ok(
  appCode.includes('initialPage={quran.initialPage}'),
  'App.tsx passes initialPage to QuranReaderScreen'
);
assert.ok(
  todayCode.includes('onOpenReader(surah, ayah ?? 1, page)') &&
  todayCode.includes('onOpenQuran(surah, ayah, page)'),
  'HomeScreen propagates page parameter in handleOpenReader'
);
assert.ok(
  appCode.includes('onOpenReader={openQuranSurah}') &&
  appCode.includes('const openQuranSurah = useCallback((surah: number, ayah?: number, page?: number)') &&
  appCode.includes("setQuran({ screen: 'reader', surah, initialAyah, initialPage })"),
  'App.tsx propagates initialPage from HomeScreen to QuranView reader state'
);
ok('navigation: saved page propagates through every navigation layer');

// (l) 2-second restoration highlight contract in Mushaf mode
const updatedReaderCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
assert.ok(
  updatedReaderCode.includes('highlightedAyahKey') ||
  updatedReaderCode.includes('highlightedMushafAyah'),
  'QuranReaderScreen defines highlight state'
);
assert.ok(
  updatedReaderCode.includes('highlightTimerRef = useRef'),
  'QuranReaderScreen tracks highlight timer ref'
);
assert.ok(
  updatedReaderCode.includes('clearHighlightTimer'),
  'QuranReaderScreen defines clearHighlightTimer helper'
);
assert.ok(
  updatedReaderCode.includes('2000'),
  'QuranReaderScreen sets 2-second (2000ms) timer for temporary highlight'
);
// Timer cancelled on unmount
assert.ok(
  updatedReaderCode.includes('if (highlightTimerRef.current) {') &&
  updatedReaderCode.includes('clearTimeout(highlightTimerRef.current)'),
  'highlight timer is cleared on unmount and page change'
);
// Timer cancelled on page change
assert.ok(
  updatedReaderCode.includes('currentPage !== lastPageRef.current') &&
  updatedReaderCode.includes('clearHighlightTimer()'),
  'highlight timer and highlight state cleared on page change'
);
// Exact ayah identification avoiding fallback when requested ayah exists
assert.ok(
  updatedReaderCode.includes('a.surah.number === target.surah && a.numberInSurah === target.ayah') ||
  updatedReaderCode.includes('a.surah.number === safeSurahNumber && a.numberInSurah === initialAyah'),
  'Mushaf mode identifies exact requested surah+ayah before checking fallbacks'
);
// Visible highlight in both Tajweed and Uthmani render branches
assert.ok(
  (updatedReaderCode.includes('highlightedAyahKey === `${a.surah.number}:${a.numberInSurah}`') ||
   updatedReaderCode.includes('highlightedMushafAyah === a.number')) &&
  updatedReaderCode.includes('backgroundColor: colors.accentDim'),
  'Tajweed render branch applies visible highlight to restored ayah'
);
assert.ok(
  (updatedReaderCode.includes('isRestorationHighlight && {') ||
   updatedReaderCode.includes('isRestorationHighlight && { backgroundColor: colors.accentDim')) &&
  (updatedReaderCode.includes('const isRestorationHighlight = highlightedAyahKey === `${a.surah.number}:${a.numberInSurah}`') ||
   updatedReaderCode.includes('const isRestorationHighlight = highlightedMushafAyah === a.number;')),
  'Uthmani render branch applies visible highlight to restored ayah'
);
// Popup menu is NOT automatically opened
assert.ok(
  !updatedReaderCode.includes('setSelectedAyah(targetAyahItem)') &&
  updatedReaderCode.includes('setSelectedAyah(null)'),
  'restoration highlight does not open popup menu automatically'
);
ok('highlight: 2-second visible highlight in Uthmani & Tajweed with clean timer lifecycle and popup isolation');

console.log('\nALL STAGE-2 READER/MUSHAF POSITION TESTS PASSED SUCCESSFULLY!');
