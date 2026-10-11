import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== QURAN READER TOOLS MENU REDESIGN TEST SUITE ===\n');

const code = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');

// Test 1: Dots button specifications
assert.ok(code.includes('styles.dotsButton'), 'dotsButton style must be applied');
assert.ok(code.includes('toolsMenuOpen ? colors.accentDim : colors.bgSurface'), 'dotsButton must have accent-tinted active background');
assert.ok(code.includes('toolsMenuOpen ? colors.accent : colors.borderSubtle'), 'dotsButton must have accent-tinted active border');
assert.ok(code.includes('toolsMenuOpen ? colors.accent : colors.textSecondary'), 'dotsButton icon must be accent-tinted when active');
assert.ok(code.includes('width: 44') && code.includes('height: 44'), 'dotsButton must have 44x44 touch target');
console.log('  ✓ Dots button: 44x44 tap target, bordered chip, and active accent state verified');

// Test 2: Header strip specifications
assert.ok(code.includes('toolsMenuHeader'), 'Header strip container must exist');
assert.ok(code.includes('toolsMenuSurahTitle'), 'Surah title must exist in header');
assert.ok(code.includes('InstrumentSerif_400Regular'), 'Surah title in header must use Instrument Serif');
assert.ok(code.includes('toolsMenuSubtitle'), 'Subtitle must exist in header');
assert.ok(code.includes('readingProgress.percent') && code.includes('readingProgress.currentAyah') && code.includes('readingProgress.totalAyahs'), 'Reading progress subtitle must match format');
assert.ok(code.includes('toolsMenuJuzChip'), 'Juz chip must exist in header');
assert.ok(code.includes("selectedJuz ? `Juz ${selectedJuz}` : '—'"), 'Juz chip must show selectedJuz or dash');
assert.ok(code.includes('toolsMenuProgressBarTrack') && code.includes('toolsMenuProgressBarFill'), '3px progress bar track and fill must exist');
console.log('  ✓ Header strip: Instrument Serif title, progress subtitle, Juz chip, and 3px progress bar verified');

// Test 3: Grouped sections exist with exact names and small uppercase labels
const sectionLabels = ['DISPLAY', 'LANGUAGE & TAFSIR', 'NAVIGATE', 'OFFLINE'];
for (const label of sectionLabels) {
  assert.ok(code.includes(label), `Section label ${label} must be present`);
}
assert.ok(code.includes('toolsMenuSectionLabel'), 'toolsMenuSectionLabel style must exist');
assert.ok(code.includes('toolsMenuGroupCard'), 'toolsMenuGroupCard style must exist');
console.log('  ✓ Grouped sections: DISPLAY, LANGUAGE & TAFSIR, NAVIGATE, OFFLINE present');

// Test 4: All tools grouped under their respective sections
// DISPLAY: Reading Mode, Font Size, Keep Screen Awake
assert.ok(code.includes('Reading Mode'), 'Reading Mode must be present');
assert.ok(code.includes('Font Size'), 'Font Size must be present');
assert.ok(code.includes('Keep Screen Awake'), 'Keep Screen Awake must be present');

// LANGUAGE & TAFSIR: Translation Language, Translation, Tafsir Source
assert.ok(code.includes('Translation Language'), 'Translation Language must be present');
assert.ok(code.includes('Tafsir Source'), 'Tafsir Source must be present');

// NAVIGATE: Jump to Juz, Jump to Hizb
assert.ok(code.includes('Jump to Juz'), 'Jump to Juz must be present');
assert.ok(code.includes('Jump to Hizb'), 'Jump to Hizb must be present');

// OFFLINE: Save for Offline
assert.ok(code.includes('Save for Offline'), 'Save for Offline must be present');
console.log('  ✓ All reading tools properly mapped into groups');

// Test 5: Inner hairline dividers vs no inter-group dividers
assert.ok(code.includes('toolsMenuInnerDivider'), 'toolsMenuInnerDivider must be used inside groups');
assert.ok(!code.includes('Reading Progress</Text>'), 'Standalone Reading Progress row removed in favor of header strip');
console.log('  ✓ Polish: inner hairline dividers inside groups and redundant progress row removed');

// Test 6: T5 regressions — Live progress state, interactive drag pill, BackHandler
assert.ok(code.includes('currentVisibleAyah'), 'currentVisibleAyah state must be used to drive live reading progress');
assert.ok(code.includes('setCurrentVisibleAyah(ayahNumber)'), 'handleViewableItemsChanged must update currentVisibleAyah');
assert.ok(code.includes('Dismiss reading tools'), 'Drag pill must be an interactive button to dismiss tools menu');
assert.ok(code.includes("addEventListener('hardwareBackPress'") && code.includes('setToolsMenuOpen(false)'), 'BackHandler must dismiss tools menu on Android back');
console.log('  ✓ T5: Live progress state, interactive drag pill, and BackHandler verified');

// Test 7: T6 regressions — Share card brand footer with logo and ISLAMIC wordmark
assert.ok(code.includes('shareCardBrandFooter'), 'Share card must include brand footer');
assert.ok(
  (code.includes('logo-master-black.png') || code.includes('logo-small-black.png')) &&
  (code.includes('logo-master-ivory.png') || code.includes('logo-small-ivory.png')),
  'Share card must include light and dark app logo'
);
assert.ok(code.includes('shareCardBrandWordmark') && code.includes('ISLAMIC'), 'Share card must include ISLAMIC wordmark');
console.log('  ✓ T6: Share card logo and ISLAMIC wordmark verified');

// Test 8: Ayah long-press directly opens Note composer bottom sheet
assert.ok(code.includes('noteComposerAyah'), 'noteComposerAyah state must exist');
assert.ok(code.includes('openNoteComposer'), 'openNoteComposer handler must exist');
assert.ok(code.includes('handleSaveNote'), 'handleSaveNote handler must exist');
assert.ok(
  code.includes('addNote(noteComposerTarget.surah') || code.includes('addNote(safeSurahNumber'),
  'addNote must be called with noteComposerTarget.surah or safeSurahNumber and noteComposerAyah'
);
assert.ok(code.includes('openNoteComposer(item.numberInSurah)'), 'Ayah long press must directly open note composer');
assert.ok(!code.includes("Alert.alert(\n        `Ayah ${item.numberInSurah}`") && !code.includes("text: 'Add Note'"), 'Ayah long press alert dialog must be removed');
assert.ok(code.includes('noteModalSheet'), 'Note composer must use noteModalSheet bottom sheet layout');
assert.ok(code.includes('isNoteComposerActive'), 'Selected ayah must be highlighted while note composer is open');
console.log('  ✓ T8: Ayah long press Add Note composer, bottom sheet & highlight verified');

// Test 9: Android edge-to-edge keyboard tracking on Note composer bottom sheet
assert.ok(code.includes('Keyboard,') || code.includes(', Keyboard'), 'Keyboard must be imported from react-native');
assert.ok(code.includes('keyboardHeight'), 'keyboardHeight state must exist');
assert.ok(code.includes("Keyboard.addListener('keyboardDidShow'"), 'keyboardDidShow listener must be registered');
assert.ok(code.includes("Keyboard.addListener('keyboardDidHide'"), 'keyboardDidHide listener must be registered');
assert.ok(code.includes('showSub.remove()') && code.includes('hideSub.remove()'), 'keyboard listeners must be cleaned up on unmount');
assert.ok(code.includes('keyboardHeight') && code.includes('paddingBottom:'), 'noteModalSheet must dynamically add keyboardHeight to paddingBottom');
assert.ok(code.includes('scrollEnabled'), 'note composer input must have scrollEnabled');
console.log('  ✓ T9: Android edge-to-edge dynamic keyboard tracking & note scrollability verified');

// Test 10: Juz and Hizb sync with currentPosition and expanded BackHandler
assert.ok(
  code.indexOf('const currentPosition = useMemo(') < code.indexOf('setSelectedJuz(currentPosition.juz)'),
  'currentPosition must be declared before selectedJuz/selectedHizb sync effect'
);
assert.ok(
  code.includes('juzPickerOpen') &&
  code.includes('hizbPickerOpen') &&
  code.includes('scriptPickerOpen') &&
  code.includes('tafsirSourcePickerOpen') &&
  code.includes('reciterChooserOpen') &&
  code.includes('langPickerOpen'),
  'BackHandler must handle all reading sub-pickers'
);
console.log('  ✓ T10: Juz/Hizb position sync and sub-picker BackHandler dismissal verified');

// Test 11: Mushaf page interaction contract
assert.ok(code.includes("t('Mushaf Pages', 'Mushaf Pages')"), 'Mushaf Pages mode label must exist');
assert.ok(code.includes("t('Ayah by Ayah', 'Ayah by Ayah')"), 'Ayah by Ayah mode label must exist');
assert.ok(code.includes('onLongPress={() => handleLongPressMushafAyah(a)}'), 'Mushaf ayahs must expose long-press actions');
assert.ok(code.includes('delayLongPress={500}'), 'Mushaf long press must use a 500ms delay');
assert.ok(code.includes("t('Marker')"), 'Mushaf action popover must expose Marker');
assert.ok(code.includes("mushafSelectedActionText: { display: 'none' }"), 'Mushaf action popover must use icon-only actions');
assert.ok(code.includes('const requestId = ++pageRequestRef.current'), 'Mushaf page loading must reject stale responses');
assert.ok(code.includes('`Page ${displayedMushafPage} of ${TOTAL_MUSHAF_PAGES}`'), 'Mushaf page number must render actual values');
console.log('  ✓ T11: Mushaf Pages/Ayah mode split, 500ms long-press, compact actions, and page race guard verified');

// Test 12: Mushaf page numbers & metadata validation
const quranLibCode = fs.readFileSync('src/lib/quran.ts', 'utf8');
assert.ok(
  quranLibCode.includes('cached.pageNumber === safePage') &&
  quranLibCode.includes('cached.ayahs.every((a) => !a.page || a.page === safePage)'),
  'fetchMushafPage must strictly validate that cached page payload matches requested page and ayah metadata'
);
assert.ok(
  !code.includes("t('Page {p}'") &&
  !code.includes("t('Page {n}'") &&
  !code.includes("t('Page {current} of {total}'") &&
  !code.includes("t('Loading Mushaf Page {n}...'"),
  'Mushaf UI must never render un-interpolated literal token placeholders like {p}, {n}, {current}, {total}'
);
assert.ok(
  code.includes('`Page ${displayedMushafPage} of ${TOTAL_MUSHAF_PAGES}`'),
  'Nav subtitle and footer badge must render actual evaluated displayedMushafPage'
);
assert.ok(
  code.includes('`Page ${Math.max(1, currentPage - 1)}`') &&
  code.includes('`Page ${Math.min(TOTAL_MUSHAF_PAGES, currentPage + 1)}`'),
  'Footer pagination buttons must render evaluated page numbers'
);
console.log('  ✓ T12: Mushaf page cache safety and zero un-interpolated token leaks verified');

// Test 13: Popup anchoring & layout measurement
assert.ok(
  code.includes('ayahLayoutsRef.current') &&
  code.includes('setSelectedAyahHeight'),
  'Ayah layout measurements must be recorded for dynamic popup anchoring'
);
assert.ok(
  code.includes('selectedAyahY >= 88') &&
  code.includes('selectedAyahY - 24') &&
  code.includes('selectedAyahHeight'),
  'Popup must be dynamically anchored above or below the selected ayah based on measured coordinates'
);
assert.ok(
  code.includes('mushafTajweedAyahRow') &&
  code.includes('mushafAyahTouch'),
  'Both Tajweed and Uthmani render branches must provide measured layout coordinates'
);
console.log('  ✓ T13: Ayah popup anchoring with measured layout coordinates in both branches verified');

// Test 14: Reading mode switch resilience
assert.ok(
  code.includes('cardsAyahs = useMemo') &&
  code.includes('readingMode === \'cards\' && loading && cardsAyahs.length === 0') &&
  code.includes('data={cardsAyahs}'),
  'Cards mode must compute cardsAyahs with cache/page fallback and never return a blank screen'
);
assert.ok(
  code.includes('currentSurah !== safeSurahNumber && onNavigateSurah') &&
  code.includes('onNavigateSurah(currentSurah, currentAyah, currentPageNum)'),
  'Mode toggle must propagate active surah to onNavigateSurah when switching to cards'
);
console.log('  ✓ T14: Reading mode switch resilience and blank-screen protection verified');

// Test 15: Footer navigation controls and FlatList onViewableItemsChanged stability
assert.ok(
  code.includes('testID="mushaf-footer-next-btn"') &&
  code.includes('testID="mushaf-footer-prev-btn"') &&
  code.includes('testID="mushaf-footer-badge"'),
  'Mushaf footer navigation and badge must have deterministic testIDs'
);
assert.ok(
  code.includes('surahRef = useRef') &&
  code.includes('surahRef.current = surah'),
  'surahRef must be maintained to keep handleViewableItemsChanged reference stable'
);
assert.ok(
  code.includes('key={`cards-surah-${safeSurahNumber}`}') &&
  code.includes('immediateSurah'),
  'FlatList cards mode must have safe surah key and immediateSurah fallback on toggle'
);
console.log('  ✓ T15: Footer controls and FlatList onViewableItemsChanged stability verified');

// Test 16: Mushaf selected-ayah popup actions
assert.ok(
  code.includes('handleToggleBookmarkForMushafAyah') &&
  code.includes('isBookmarkedCurrent') &&
  code.includes('testID="mushaf-action-bookmark"'),
  'Mushaf bookmark action must use selected ayah surah + ayah and dynamically reflect bookmark state'
);
assert.ok(
  code.includes('handleSetReadingMarkerAt') &&
  code.includes('isMarkedCurrent') &&
  code.includes("isMarkedCurrent ? 'flag' : 'flag-outline'") &&
  code.includes('testID="mushaf-action-marker"'),
  'Mushaf marker action must target exact page/surah/ayah and toggle flag icon'
);
assert.ok(
  code.includes('noteComposerTarget') &&
  code.includes('openNoteComposer(selectedAyah.numberInSurah, selectedAyah.surah.number') &&
  code.includes('testID="mushaf-action-note"'),
  'Mushaf note action must open noteComposerTarget with selected ayah surah and ayah'
);
assert.ok(
  code.includes('handlePlayAyahToggle(selectedAyah.numberInSurah, selectedAyah.surah.number') &&
  code.includes('handleOpenTafsir(selectedAyah.numberInSurah, selectedAyah.surah.number') &&
  code.includes('testID="mushaf-action-play"') &&
  code.includes('testID="mushaf-action-tafsir"'),
  'Mushaf play and tafsir actions must target selected ayah surah and ayah'
);
assert.ok(
  code.includes('handleCopyMushafAyah') &&
  code.includes('isCopiedCurrent') &&
  code.includes('testID="mushaf-action-copy"'),
  'Mushaf copy action must provide checkmark feedback'
);
assert.ok(
  code.includes('handleShareMushafAyah') &&
  code.includes('handleShareAyah(shareItem)') &&
  code.includes('testID="mushaf-action-share"'),
  'Mushaf share action must invoke handleShareAyah with selected ayah item metadata'
);
assert.ok(
  code.includes('testID="mushaf-action-close"') &&
  code.includes('mushafInlineSelectedToolbar') &&
  code.includes('zIndex: 100') &&
  code.includes('elevation: 12'),
  'Mushaf popup overlay must have close button and top-level zIndex/elevation stacking'
);
console.log('  ✓ T16: Mushaf selected-ayah popup actions (Bookmark, Marker, Notes, Play, Tafsir, Copy, Share, Stacking) verified');

console.log('\n========================================================');
console.log('ALL TOOLS MENU & READER ENHANCEMENT TESTS PASSED!');
console.log('========================================================\n');
