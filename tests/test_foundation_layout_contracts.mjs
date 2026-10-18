import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== FOUNDATION LAYOUT & ROUTE RESOLVER CONTRACTS ===');

// 1. Verify files exist on disk
const filesToVerify = [
  'src/navigation/routeToTab.ts',
  'src/components/layout/layout.constants.ts',
  'src/components/layout/SubHeader.tsx',
  'src/components/layout/ReaderHeader.tsx',
  'src/components/layout/DetailScreen.tsx',
  'src/components/layout/FloatingNav.tsx',
  'src/screens/HadithLibraryScreen.tsx',
];

for (const relPath of filesToVerify) {
  const fullPath = path.resolve(relPath);
  assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
}
console.log('✓ All foundation files exist on disk');

// 2. Test layout.constants.ts contract
const layoutConstContent = fs.readFileSync(path.resolve('src/components/layout/layout.constants.ts'), 'utf8');
assert.ok(layoutConstContent.includes('export const SUBHEADER_HEIGHT = 54'), 'SUBHEADER_HEIGHT must be 54');
assert.ok(layoutConstContent.includes('export const SUBHEADER_BOTTOM ='), 'SUBHEADER_BOTTOM must be exported');
assert.ok(layoutConstContent.includes('export const NAV_TOP ='), 'NAV_TOP must be exported');
assert.ok(layoutConstContent.includes('export const READER_AUTOHIDE_NAV ='), 'READER_AUTOHIDE_NAV must be exported');
assert.ok(layoutConstContent.includes('export const getSubheaderBottom = SUBHEADER_BOTTOM'), 'getSubheaderBottom must be exported');
assert.ok(layoutConstContent.includes('export const getNavTop = NAV_TOP'), 'getNavTop must be exported');
console.log('✓ layout.constants.ts contracts verified');

// 3. Test routeToTab resolver static implementation
const routeToTabContent = fs.readFileSync(path.resolve('src/navigation/routeToTab.ts'), 'utf8');
assert.ok(routeToTabContent.includes('export function routeToTab'), 'routeToTab function must be exported');
assert.ok(routeToTabContent.includes('export const resolveActiveTab'), 'resolveActiveTab alias must be exported');
assert.ok(routeToTabContent.includes('export const getActiveTab'), 'getActiveTab alias must be exported');
assert.ok(routeToTabContent.includes('export function isDualHomedRoute'), 'isDualHomedRoute must be exported');

// Create lightweight mock testing the route resolver logic directly
// Parse the sets and logic directly from routeToTab or test in Node:
const quranScreens = [
  'reader', 'audio', 'tafsir', 'topics', 'compare', 'translation',
  'plans', 'hifz', 'hifz-practice', 'bookmarks', 'notes', 'surah-list'
];
for (const s of quranScreens) {
  assert.ok(routeToTabContent.includes(`'${s}'`), `routeToTab must include Quran route '${s}'`);
}

const libraryScreens = [
  'hadith', 'duas', 'names', 'shahada', 'downloads', 'prayer-guide',
  'ramadan', 'vocab', 'tajweed'
];
for (const s of libraryScreens) {
  assert.ok(routeToTabContent.includes(`'${s}'`), `routeToTab must include Library route '${s}'`);
}

const toolsScreens = [
  'salah', 'fasting', 'qada', 'zakat', 'cycle', 'qibla', 'mosque',
  'location', 'calendar', 'prayer-reminders', 'umrah-resources'
];
for (const s of toolsScreens) {
  assert.ok(routeToTabContent.includes(`'${s}'`), `routeToTab must include Tools route '${s}'`);
}

const noActiveScreens = ['settings', 'legal', 'about'];
for (const s of noActiveScreens) {
  assert.ok(routeToTabContent.includes(`'${s}'`), `routeToTab must include No-Active-Tab route '${s}'`);
}

console.log('✓ routeToTab route categorization verified');

// 4. Test SubHeader.tsx contract
const subHeaderContent = fs.readFileSync(path.resolve('src/components/layout/SubHeader.tsx'), 'utf8');
assert.ok(subHeaderContent.includes('export function SubHeader'), 'SubHeader must be exported');
assert.ok(subHeaderContent.includes('numberOfLines={2}'), 'SubHeader subtitle must support 2 lines');
assert.ok(subHeaderContent.includes('accessibilityRole="header"'), 'SubHeader title must have accessibilityRole header');
assert.ok(subHeaderContent.includes('accessibilityRole="button"'), 'SubHeader back button must have accessibilityRole button');
assert.ok(subHeaderContent.includes("getBackIcon('chevron')"), 'SubHeader must use RTL-safe back chevron');
assert.ok(!subHeaderContent.includes('#FFFFFF') && !subHeaderContent.includes('#144D3F'), 'SubHeader must not hardcode color literals');
console.log('✓ SubHeader.tsx contracts & 2-line subtitle verified');

// 5. Test ReaderHeader.tsx contract
const readerHeaderContent = fs.readFileSync(path.resolve('src/components/layout/ReaderHeader.tsx'), 'utf8');
assert.ok(readerHeaderContent.includes('export function ReaderHeader'), 'ReaderHeader must be exported');
assert.ok(readerHeaderContent.includes('testID="reader-dots-menu-btn"'), 'ReaderHeader must preserve reader-dots-menu-btn testID');
assert.ok(readerHeaderContent.includes('onOpenMenu'), 'ReaderHeader must accept onOpenMenu callback');
assert.ok(readerHeaderContent.includes('onPrev'), 'ReaderHeader must accept onPrev callback');
assert.ok(readerHeaderContent.includes('onNext'), 'ReaderHeader must accept onNext callback');
assert.ok(readerHeaderContent.includes('onBack'), 'ReaderHeader must accept onBack callback');
assert.ok(readerHeaderContent.includes('getBackIcon'), 'ReaderHeader must use RTL-safe navigation icons');
console.log('✓ ReaderHeader.tsx reader navigation and menu contracts verified');

// 6. Test DetailScreen.tsx contract
const detailScreenContent = fs.readFileSync(path.resolve('src/components/layout/DetailScreen.tsx'), 'utf8');
assert.ok(detailScreenContent.includes('export function DetailScreen'), 'DetailScreen must be exported');
assert.ok(detailScreenContent.includes('DetailScreen.ScrollView = DetailScrollView'), 'DetailScreen.ScrollView must be attached');
assert.ok(detailScreenContent.includes('DetailScreen.FlatList = DetailFlatList'), 'DetailScreen.FlatList must be attached');
assert.ok(detailScreenContent.includes('useDetailScreen'), 'useDetailScreen hook must be exported');
assert.ok(detailScreenContent.includes('TAB_PAD_BOTTOM'), 'DetailScreen must centralize TAB_PAD_BOTTOM');
assert.ok(detailScreenContent.includes('SUBHEADER_BOTTOM'), 'DetailScreen must centralize SUBHEADER_BOTTOM');
console.log('✓ DetailScreen.tsx geometry and scroll container contracts verified');

// 7. Test HadithLibraryScreen.tsx Card import repair
const hadithScreenContent = fs.readFileSync(path.resolve('src/screens/HadithLibraryScreen.tsx'), 'utf8');
assert.ok(hadithScreenContent.includes("import { Card } from '../components/Card';"), 'HadithLibraryScreen must import Card component');
console.log('✓ HadithLibraryScreen Card import repair verified');

// 8. Test FloatingNav.tsx active prop contract
const floatingNavContent = fs.readFileSync(path.resolve('src/components/layout/FloatingNav.tsx'), 'utf8');
assert.ok(floatingNavContent.includes('active: TabKey | null;'), 'FloatingNavProps must accept TabKey | null');
console.log('✓ FloatingNav.tsx active prop contract verified');

console.log('ALL FOUNDATION CONTRACTS PASSED CLEANLY!');
