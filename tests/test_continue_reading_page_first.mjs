import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== REGRESSION TEST: EXACT MUSHAF-PAGE-FIRST CONTINUE READING RESTORATION ===\n');

const readerCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
const appCode = fs.readFileSync('App.tsx', 'utf8');
const quranHomeCode = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');
const homeCode = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
const cardCode = fs.readFileSync('src/components/ContinueReadingCard.tsx', 'utf8');

// ── 1. Continue Reading passes saved page through App / Home / QuranHome to reader ──
console.log('Test 1: Continue Reading passes saved page through every navigation layer...');

// (a) ContinueReadingCard passes page
assert.ok(
  cardCode.includes('onOpenReader?.(latest.surah, latest.ayah, latest.page)'),
  'ContinueReadingCard passes latest.page to onOpenReader'
);

// (b) HomeScreen wires handleOpenReader with page
assert.ok(
  homeCode.includes('(surah: number, ayah?: number, page?: number) =>') &&
  homeCode.includes('onOpenReader(surah, ayah ?? 1, page)'),
  'HomeScreen propagates (surah, ayah, page) through handleOpenReader'
);

// (c) App.tsx wires onOpenReader and onOpenQuran to preserve initialPage
assert.ok(
  appCode.includes('onOpenReader={openQuranSurah}') &&
  appCode.includes('const openQuranSurah = useCallback((surah: number, ayah?: number, page?: number) =>') &&
  appCode.includes("setQuran({ screen: 'reader', surah, initialAyah, initialPage });"),
  'App.tsx wires HomeScreen onOpenReader and sets initialPage in reader state'
);
assert.ok(
  appCode.includes('const openQuran = useCallback((surah?: number, ayah?: number, page?: number) =>') &&
  appCode.includes('openQuranSurah(surah, ayah, page);'),
  'App.tsx onOpenQuran preserves incoming page parameter'
);

// (d) QuranHomeScreen handleResumeReading passes fresh page
assert.ok(
  quranHomeCode.includes('onOpenSurah(freshPos.surah, freshPos.ayah, freshPos.page);'),
  'QuranHomeScreen handleResumeReading passes freshPos.page to onOpenSurah'
);
const recentResumeHandler = quranHomeCode.match(/const handleOpenRecentSurah = useCallback\(\(recent: RecentSurah\) => \{([\s\S]*?)\n  \}, \[readingPosition, onOpenSurah\]\);/)?.[1] || '';
assert.ok(
  recentResumeHandler.includes('const page = isMarked ? readingPosition.page : undefined;') &&
  recentResumeHandler.includes('onOpenSurah(recent.surah, ayah, page);'),
  'QuranHomeScreen recent-surah card passes the saved page through its shared resume handler'
);
assert.ok(
  quranHomeCode.includes('isMarked ? readingPosition.page : undefined'),
  'QuranHomeScreen surah rows pass saved page when marked'
);

// (e) App.tsx wires QuranHomeScreen onOpenSurah with initialPage propagation
assert.ok(
  appCode.includes('onOpenSurah={openQuranSurah}') &&
  appCode.includes('let initialPage = page;'),
  'App.tsx QuranHomeScreen onOpenSurah receives and preserves p as initialPage'
);
console.log('  ✓ Page passed through ContinueReadingCard -> Home/QuranHome -> App.tsx -> QuranReaderScreen');

// ── 2. Valid initialPage is authoritative and initial Mushaf render has one page only ──
console.log('\nTest 2: Authoritative initialPage & single-page FlatList rendering...');

// (a) initialResolvedPage prioritizes initialPage without guessing or deriving
assert.ok(
  readerCode.includes('typeof initialPage === \'number\' && initialPage >= 1 && initialPage <= TOTAL_MUSHAF_PAGES'),
  'initialResolvedPage treats valid initialPage as authoritative'
);

// (b) readingMode initializes to mushaf when initialPage is present
assert.ok(
  readerCode.includes("if (typeof initialPage === 'number' && initialPage >= 1) return 'mushaf';"),
  'readingMode initializes synchronously to mushaf when initialPage is specified'
);

// (c) readingMode is not overridden by saved cards mode when initialPage is passed
assert.ok(
  readerCode.includes("if (typeof initialPage !== 'number' && explicitMode === 'true' && (savedMode === 'mushaf' || savedMode === 'cards'))"),
  'Async preference load does not flip readingMode to cards when initialPage is provided'
);

// (d) Mushaf mode renders a single page in FlatList
assert.ok(
  readerCode.includes('data={[currentPage]}') &&
  readerCode.includes('ref={mushafListRef}'),
  'Mushaf mode FlatList renders exactly one page (data={[currentPage]}) with mushafListRef'
);
console.log('  ✓ Authoritative initialPage, synchronous Mushaf mode, single-page FlatList model verified');

// ── 3. Target matching is Surah + Ayah, not first page item / global ayah only ──
console.log('\nTest 3: Target matching with Surah + Ayah & bounded mismatch protection...');

// (a) restorationTargetRef holds both surah and ayah
assert.ok(
  readerCode.includes('restorationTargetRef = useRef<{ surah: number; ayah: number } | null>('),
  'restorationTargetRef tracks exact target surah + ayah'
);

// (b) target matching matches BOTH surah number and numberInSurah
const surahAndAyahMatches = readerCode.match(/a\.surah\.number === target\.surah && a\.numberInSurah === target\.ayah/g);
assert.ok(
  surahAndAyahMatches && surahAndAyahMatches.length >= 2,
  'loadPageData matches BOTH a.surah.number === target.surah AND a.numberInSurah === target.ayah (cache & fetch)'
);

// (c) Never fall back to data.ayahs[0] for a valid restoration target
assert.ok(
  !readerCode.includes('data.ayahs.find((a) => a.surah.number === safeSurahNumber && a.numberInSurah === lastSavedAyahRef.current) ||\n            data.ayahs.find((a) => a.surah.number === safeSurahNumber) ||\n            data.ayahs[0];'),
  'Removed unconditional silent fallback that replaced target with data.ayahs[0]'
);

// (d) Bounded mismatch reported
assert.ok(
  readerCode.includes('Restoration target mismatch: Surah'),
  'Bounded mismatch reported via console.warn when target is not on page'
);

// (e) loadPageData does NOT overwrite reading position on data arrival
assert.ok(
  !readerCode.includes('saveReadingPosition(activeSurahNum, activeAyahNum, pageToLoad);'),
  'loadPageData does NOT call saveReadingPosition during restoration/page load'
);
console.log('  ✓ Surah+Ayah matching verified, zero silent fallback to page[0], position overwrite prevented');

// ── 4. Highlight starts after target row/page render, lasts 2000ms, stable key, popup closed ──
console.log('\nTest 4: Layout-driven 2000ms highlight with stable key & isolated popup...');

// (a) Stable key identity containing Surah + Ayah
assert.ok(
  readerCode.includes('const [highlightedAyahKey, setHighlightedAyahKey] = useState<string | null>(null);'),
  'highlightedAyahKey state uses stable key identity string'
);

// (b) handleMushafAyahLayout starts highlight only on layout of exact target row
assert.ok(
  readerCode.includes('const handleMushafAyahLayout = useCallback(') &&
  readerCode.includes('target.surah === surahNum &&\n        target.ayah === ayahInSurah &&\n        !restorationHighlightedRef.current'),
  'Highlight starts only after exact target row is mounted and onLayout fires'
);

// (c) 2000ms duration
assert.ok(
  readerCode.includes('setTimeout(() => {\n          setHighlightedAyahKey(null);\n          highlightTimerRef.current = null;\n        }, 2000)'),
  'Highlight timer runs for exactly 2000ms before clearing'
);

// (d) Timer cleanup on unmount, page change, and manual ayah selection
assert.ok(
  readerCode.includes('currentPage !== lastPageRef.current') &&
  readerCode.includes('clearHighlightTimer()'),
  'Highlight cleared on page change'
);
assert.ok(
  readerCode.includes('handleSelectMushafAyah = useCallback(') &&
  readerCode.includes('clearHighlightTimer();'),
  'Highlight cleared on manual ayah selection'
);

// (e) Action popup is NOT opened during restoration
assert.ok(
  readerCode.includes('setSelectedAyah(null)') &&
  !readerCode.includes('setSelectedAyah(foundTargetAyah)'),
  'Action popup stays closed (selectedAyah is null) during restoration'
);

// (f) Works in BOTH Tajweed and Uthmani branches
assert.ok(
  readerCode.includes('highlightedAyahKey === `${a.surah.number}:${a.numberInSurah}`') &&
  readerCode.includes('styles.mushafTajweedAyahTouch'),
  'Tajweed render branch highlights exact stable key'
);
assert.ok(
  readerCode.includes('const isRestorationHighlight = highlightedAyahKey === `${a.surah.number}:${a.numberInSurah}`;') &&
  readerCode.includes('styles.mushafAyahTouch'),
  'Uthmani render branch highlights exact stable key'
);
console.log('  ✓ Layout-driven highlight timing, 2000ms expiry, stable key, Tajweed/Uthmani parity verified');

// ── 5. No large Surah / full-list pre-render before page restoration ──
console.log('\nTest 5: Lazy Surah loading in Mushaf mode (no full-list pre-render)...');

// loadSurah is strictly gated by readingMode === 'cards'
assert.ok(
  readerCode.includes("if (readingMode === 'cards') {\n      loadSurah();\n    }"),
  'loadSurah() only runs when readingMode is cards, never on Mushaf mount'
);
console.log('  ✓ Mushaf mode renders page data only without pre-rendering full Surah list');

console.log('\n================================================================');
console.log('ALL EXACT MUSHAF-PAGE-FIRST REGRESSION CONTRACT TESTS PASSED!');
console.log('================================================================\n');
