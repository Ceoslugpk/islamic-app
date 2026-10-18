import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== READER → TRANSLATION COMPARE INTEGRATION CONTRACT TESTS ===\n');

const readerCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
const appCode = fs.readFileSync('App.tsx', 'utf8');

// 1. QuranReaderScreenProps interface contract
assert.ok(
  readerCode.includes('onOpenCompare?: (surah: number, ayah: number) => void;'),
  'QuranReaderScreenProps must declare onOpenCompare with (surah: number, ayah: number) => void'
);
console.log('  ✓ 1. QuranReaderScreenProps declares onOpenCompare');

// 2. Component accepts onOpenCompare
assert.ok(
  readerCode.includes('onOpenCompare,\n}: QuranReaderScreenProps') ||
  readerCode.includes('onOpenCompare,') && readerCode.includes(': QuranReaderScreenProps'),
  'QuranReaderScreen must destructure onOpenCompare from props'
);
console.log('  ✓ 2. QuranReaderScreen destructures onOpenCompare');

// 3. Mushaf selected-ayah action toolbar exposes Compare
assert.ok(
  readerCode.includes('testID="mushaf-action-compare"'),
  'Mushaf selected ayah toolbar must contain mushaf-action-compare button'
);
assert.ok(
  readerCode.includes('onOpenCompare?.(selectedAyah.surah.number, selectedAyah.numberInSurah)'),
  'mushaf-action-compare must invoke onOpenCompare with selected ayah surah and ayah numbers'
);
assert.ok(
  readerCode.includes("accessibilityLabel={t('Compare')}"),
  'mushaf-action-compare must have accessible label'
);
console.log('  ✓ 3. Mushaf selected-ayah toolbar exposes Compare with exact selected {surah, ayah}');

// 4. Reading tools menu exposes Translation Compare under LANGUAGE & TAFSIR
assert.ok(
  readerCode.includes('testID="reader-tools-compare"'),
  'Reading tools menu must contain reader-tools-compare button'
);
assert.ok(
  readerCode.includes("accessibilityLabel={t('Translation Compare')}"),
  'reader-tools-compare must have accessible label'
);
assert.ok(
  readerCode.includes('onOpenCompare?.(targetSurah, targetAyah)'),
  'reader-tools-compare must invoke onOpenCompare with current/selected target {surah, ayah}'
);
console.log('  ✓ 4. Reading tools menu exposes Translation Compare under LANGUAGE & TAFSIR');

// 5. Existing reader actions and long-press behavior preserved
assert.ok(readerCode.includes('testID="mushaf-action-play"'), 'Play action preserved');
assert.ok(readerCode.includes('testID="mushaf-action-tafsir"'), 'Tafsir action preserved');
assert.ok(readerCode.includes('testID="mushaf-action-bookmark"'), 'Bookmark action preserved');
assert.ok(readerCode.includes('testID="mushaf-action-marker"'), 'Marker action preserved');
assert.ok(readerCode.includes('testID="mushaf-action-note"'), 'Note action preserved');
assert.ok(readerCode.includes('testID="mushaf-action-copy"'), 'Copy action preserved');
assert.ok(readerCode.includes('testID="mushaf-action-share"'), 'Share action preserved');
assert.ok(readerCode.includes('handleLongPressMushafAyah'), 'Long-press Mushaf ayah preserved');
assert.ok(readerCode.includes('handleLongPressAyah'), 'Long-press Cards ayah preserved');
console.log('  ✓ 5. All existing Reader actions, long-press, Tafsir/audio/bookmark/note preserved');

// 6. App.tsx QuranView union contract
assert.ok(
  appCode.includes("{ screen: 'compare'; surah?: number; ayah?: number; returnTo?: 'home' | 'reader' }"),
  "QuranView union must include returnTo?: 'home' | 'reader' on compare view"
);
console.log('  ✓ 6. App.tsx QuranView supports compare returnTo route state');

// 7. App.tsx Reader branch passes onOpenCompare
assert.ok(
  appCode.includes("onOpenCompare={(s, a) => {\n                  setQuran({ screen: 'compare', surah: s, ayah: a, returnTo: 'reader' });\n                }}") ||
  (appCode.includes('onOpenCompare=') && appCode.includes("setQuran({ screen: 'compare', surah: s, ayah: a, returnTo: 'reader' })")),
  'App.tsx Reader branch must pass onOpenCompare setting returnTo: reader'
);
console.log('  ✓ 7. App.tsx Reader branch wires onOpenCompare to returnTo: reader');

// 8. App.tsx Compare branch handles returnTo: reader and onOpenReader
assert.ok(
  appCode.includes("if (quran.returnTo === 'reader') {") &&
  appCode.includes("getMushafPageForAyah(quran.surah || 1, quran.ayah || 1)") &&
  appCode.includes("setQuran({ screen: 'reader', surah: quran.surah || 1, initialAyah: quran.ayah, initialPage })"),
  'TranslationCompareScreen onBack must return to Reader with exact target when returnTo is reader'
);
assert.ok(
  appCode.includes('onOpenReader={(s, a) => {') &&
  appCode.includes('setQuran({ screen: \'reader\', surah: s, initialAyah: a, initialPage })'),
  'TranslationCompareScreen onOpenReader must open Reader with chosen target'
);
console.log('  ✓ 8. TranslationCompareScreen returns to Reader with exact {surah, ayah}');

// 9. Hardware BackHandler in App.tsx supports returnTo: reader
assert.ok(
  appCode.includes("if (quran.screen === 'compare' && quran.returnTo === 'reader')"),
  'Android hardware BackHandler must navigate compare -> reader when returnTo is reader'
);
console.log('  ✓ 9. Hardware BackHandler navigates compare -> reader without modal/back trap');

console.log('\n========================================================');
console.log('ALL READER → COMPARE INTEGRATION CONTRACT TESTS PASSED!');
console.log('========================================================\n');
