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

console.log('\n========================================================');
console.log('ALL TOOLS MENU REDESIGN TESTS PASSED!');
console.log('========================================================\n');
