import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== QURAN HOME VISUAL REFERENCE REGRESSION TEST SUITE ===\n');

const quranHomeCode = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');

// 1. Juz selector removal from QuranHomeScreen (explicitly authorized exception)
console.log('Test 1: QuranHomeScreen Juz selector removal contract...');
assert.ok(
  !quranHomeCode.includes('const JUZ_LIST ='),
  'JUZ_LIST must be removed from QuranHomeScreen'
);
assert.ok(
  !quranHomeCode.includes('handleSelectJuz'),
  'handleSelectJuz must be removed from QuranHomeScreen'
);
assert.ok(
  !quranHomeCode.includes('selectedJuz'),
  'selectedJuz state must be removed from QuranHomeScreen'
);
assert.ok(
  !quranHomeCode.includes('styles.juzRow') && !quranHomeCode.includes('juzRow:'),
  'juzRow styles and markup must be removed from QuranHomeScreen'
);
console.log('  ✓ Test 1 passed: Juz selector, state, handlers, and markup completely removed from QuranHomeScreen');

// 2. Surahs section header
console.log('\nTest 2: Surahs section header title and count...');
assert.ok(
  quranHomeCode.includes("t('Surahs')"),
  'Surahs header title must be present and localized'
);
assert.ok(
  quranHomeCode.includes("'114'") || quranHomeCode.includes('"114"'),
  'Surahs header must display 114 total count matching reference'
);
console.log('  ✓ Test 2 passed: Surahs section header with 114 count verified');

// 3. 2x2 Feature Cards Grid
console.log('\nTest 3: 2x2 Feature Cards Grid routes, content, and structure...');
assert.ok(quranHomeCode.includes("t('Audio Center')"), 'Audio Center tile present');
assert.ok(quranHomeCode.includes("t('Reciters & Playlists')"), 'Reciters & Playlists subtitle present');
assert.ok(quranHomeCode.includes('onPress={onOpenAudio}'), 'onOpenAudio callback wired');

assert.ok(quranHomeCode.includes("t('Tafsir')"), 'Tafsir tile present');
assert.ok(quranHomeCode.includes("t('Jalalayn Commentary')"), 'Jalalayn Commentary subtitle present');
assert.ok(quranHomeCode.includes('onPress={onOpenTafsir}'), 'onOpenTafsir callback wired');

assert.ok(quranHomeCode.includes("t('Topics')"), 'Topics tile present');
assert.ok(quranHomeCode.includes("t('Thematic Passages')"), 'Thematic Passages subtitle present');
assert.ok(quranHomeCode.includes('onPress={onOpenTopics}'), 'onOpenTopics callback wired');

assert.ok(quranHomeCode.includes("t('Compare')"), 'Compare tile present');
assert.ok(quranHomeCode.includes("t('Dual Translations')"), 'Dual Translations subtitle present');
assert.ok(quranHomeCode.includes('onPress={onOpenCompare}'), 'onOpenCompare callback wired');
const tileRowStyle = quranHomeCode.match(/tileRow:\s*\{([^}]+)\}/)?.[1] || '';
assert.match(tileRowStyle, /flexDirection:\s*'row'/, 'Feature tile rows must use horizontal layout');
assert.match(tileRowStyle, /width:\s*'100%'/, 'Each feature tile row must fill the grid width');
console.log('  ✓ Test 3 passed: All 4 feature cards use two responsive horizontal rows');

// 4. Horizontal Pill Strip
console.log('\nTest 4: Horizontal Pill Strip pills, order, and callbacks...');
assert.ok(quranHomeCode.includes("t('Bookmarks')") && quranHomeCode.includes('onPress={onOpenBookmarks}'), 'Bookmarks pill wired');
assert.ok(quranHomeCode.includes("t('Notes')") && quranHomeCode.includes('onPress={onOpenNotes}'), 'Notes pill wired');
assert.ok(quranHomeCode.includes("t('Reading Plans')") && quranHomeCode.includes('onPress={onOpenPlans}'), 'Reading Plans pill wired');
assert.ok(quranHomeCode.includes("t('Hifz')") && quranHomeCode.includes('onPress={onOpenHifz}'), 'Hifz pill wired');
console.log('  ✓ Test 4 passed: All 4 primary pills wired with correct actions');

// 5. 8-Point Rosette Star Badge
console.log('\nTest 5: 8-point Islamic rosette star number badge...');
assert.ok(
  quranHomeCode.includes('Polygon') || quranHomeCode.includes('points='),
  'Surah rows must feature vector rosette star badge'
);
assert.ok(
  quranHomeCode.includes('rosette') || quranHomeCode.includes('Rosette') || quranHomeCode.includes('StarBadge') || quranHomeCode.includes('starBadge'),
  'Rosette star badge component/style must be defined'
);
console.log('  ✓ Test 5 passed: 8-point rosette star badge present');

// 6. Clean Arabic Surah Names (unvoweled / no سورة prefix matching reference)
console.log('\nTest 6: Clean Arabic typography...');
assert.ok(
  quranHomeCode.includes('cleanArabic') || quranHomeCode.includes('SURAHS_114') || quranHomeCode.includes('replace'),
  'Clean Arabic surah name normalization logic must be present'
);
console.log('  ✓ Test 6 passed: Clean Arabic name normalization present');

// 7. Stable ListHeaderComponent Memoization
console.log('\nTest 7: Stable ListHeaderComponent memoization...');
assert.ok(
  quranHomeCode.includes('ListHeaderComponent={headerElement}'),
  'ListHeaderComponent must use memoized headerElement'
);
console.log('  ✓ Test 7 passed: headerElement memoization maintained');

// 8. Offline Cache Card
console.log('\nTest 8: Offline cache card with preload action and progress...');
assert.ok(quranHomeCode.includes("t('Surahs Cached Offline')"), 'Cached offline title present');
assert.ok(quranHomeCode.includes("t('Preload All')"), 'Preload All action button present');
assert.ok(quranHomeCode.includes('offlineTrack') && quranHomeCode.includes('offlineFill'), 'Slim gold progress bar present');
console.log('  ✓ Test 8 passed: Offline cache card verified');

// 9. Preload Card Dismissal on Complete
console.log('\nTest 9: Preload card dismissed once complete...');
assert.ok(
  quranHomeCode.includes('!preloadProgress.isComplete &&') || quranHomeCode.includes('!preloadProgress.isComplete ?'),
  'Preload progress card must be dismissed when preloadProgress.isComplete is true'
);
console.log('  ✓ Test 9 passed: Preload card dismissal on completion verified');

// 10. Paired Translation and Recently Read Cards
console.log('\nTest 10: Paired Translation & Recently Read cards row...');
assert.ok(quranHomeCode.includes('pairedRow'), 'pairedRow container present');
assert.ok(quranHomeCode.includes('pairedCard'), 'pairedCard cards present');
assert.ok(quranHomeCode.includes("setLangPickerOpen(true)"), 'Translation card opens QuranLanguageModal');
assert.ok(quranHomeCode.includes("t('Translation')"), 'Translation label present');
assert.ok(quranHomeCode.includes("t('Recently Read')"), 'Recently Read label present');
console.log('  ✓ Test 10 passed: Paired Translation & Recently Read cards verified');

// 11. Reachable Recent Surahs and Resume Logic
console.log('\nTest 11: Recent Surahs reachable with saved ayah/page preserved...');
assert.ok(quranHomeCode.includes('handleOpenRecentSurah'), 'handleOpenRecentSurah handler present');
assert.ok(quranHomeCode.includes('recentSurahs.length > 1'), 'All older recents reachable in card');
assert.ok(quranHomeCode.includes('loadQuranCache'), 'Cached ayah lookup logic preserved');
console.log('  ✓ Test 11 passed: All recent surahs reachable and resume logic verified');

console.log('\n========================================================');
console.log('ALL QURAN HOME VISUAL REFERENCE CONTRACT TESTS PASSED!');
console.log('========================================================\n');
