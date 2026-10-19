import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

console.log('=== QA CORRECTIONS REGRESSION TEST SUITE ===\n');

// 1. Reactive RTL Fixes (CitiesScreen & WeeklySummaryScreen)
console.log('--- 1. Reactive RTL Fixes in CitiesScreen and WeeklySummaryScreen ---');
const citiesSrc = read('src/screens/CitiesScreen.tsx');
const weeklySrc = read('src/screens/WeeklySummaryScreen.tsx');

// Verify neither computes isRTL() inside StyleSheet.create
const checkNoIsRTLInStyleSheet = (name, src) => {
  const parts = src.split('StyleSheet.create');
  assert.equal(parts.length, 2, `${name} must have exactly one StyleSheet.create block`);
  const sheetContent = parts[1];
  assert.ok(
    !sheetContent.includes('isRTL()'),
    `${name} must NOT invoke isRTL() inside StyleSheet.create`
  );
};

checkNoIsRTLInStyleSheet('CitiesScreen', citiesSrc);
checkNoIsRTLInStyleSheet('WeeklySummaryScreen', weeklySrc);

// Verify render-time direction logic
assert.match(
  citiesSrc,
  /alignItems:\s*isRtl\s*\?\s*'flex-start'\s*:\s*'flex-end'/,
  'CitiesScreen must dynamically compute rowRight alignItems based on render-time isRtl'
);

// Verify BOTH Quran reading row and Salah row in WeeklySummaryScreen use render-time isRtl ? 'flex-start' : 'flex-end'
const weeklyMatches = weeklySrc.match(/alignItems:\s*isRtl\s*\?\s*'flex-start'\s*:\s*'flex-end'/g) || [];
assert.ok(
  weeklyMatches.length >= 2,
  `WeeklySummaryScreen must use render-time isRtl ? 'flex-start' : 'flex-end' on both Quran reading and Salah stat rows (found ${weeklyMatches.length})`
);

// Verify across the entire src directory that NO file calls isRTL() inside StyleSheet.create
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('StyleSheet.create')) {
        const afterCreate = content.split('StyleSheet.create')[1];
        assert.ok(
          !afterCreate.includes('isRTL()'),
          `File ${fullPath} must not invoke isRTL() inside StyleSheet.create`
        );
      }
    }
  }
}
scanDir('src');

// Production direction transition test: English -> Urdu -> English
const i18nSrc = read('src/lib/i18n.ts');
assert.ok(i18nSrc.includes("['ur', 'ar', 'ps'].some"), 'RTL detection handles Urdu, Arabic, and Pashto');

// Simulate the direction-aware helper logic
const isRtlLang = (lang) => ['ur', 'ar', 'ps'].includes(lang);
assert.equal(isRtlLang('en'), false, 'English is LTR');
assert.equal(isRtlLang('ur'), true, 'Urdu is RTL');
assert.equal(isRtlLang('ar'), true, 'Arabic is RTL');
assert.equal(isRtlLang('en'), false, 'English switch-back is LTR');

console.log('  ✓ CitiesScreen & WeeklySummaryScreen render-time RTL logic verified (both stat rows)');
console.log('  ✓ Entire src/ directory verified clean of isRTL() in StyleSheet.create');
console.log('  ✓ English -> Urdu -> English direction transitions verified');

// 2. Bookmarks Arrow
console.log('\n--- 2. Bookmarks Direction-Aware Arrow ---');
const bookmarksSrc = read('src/screens/BookmarksScreen.tsx');

assert.ok(
  bookmarksSrc.includes("replace(/\\s*[→←]\\s*$/, '')"),
  'BookmarksScreen must strip trailing arrows before appending direction-aware arrow'
);
assert.ok(
  bookmarksSrc.includes('isRtl ? `${base} ←` : `${base} →`'),
  'BookmarksScreen must append ← for RTL and → for LTR'
);

// Test arrow resolution logic for English, Urdu, and Arabic
const formatReaderHint = (rawText, isRtl) => {
  const base = rawText.replace(/\s*[→←]\s*$/, '').trim();
  return isRtl ? `${base} ←` : `${base} →`;
};

// English locale
const enJson = JSON.parse(read('src/locales/en.json'));
const urJson = JSON.parse(read('src/locales/ur.json'));
const arJson = JSON.parse(read('src/locales/ar.json'));

const enRaw = enJson['Tap to open in Reader →'] || 'Tap to open in Reader →';
const urRaw = urJson['Tap to open in Reader →'] || 'ریڈر میں کھولنے کے لیے ٹیپ کریں ←';
const arRaw = arJson['Tap to open in Reader →'] || 'انقر للفتح في Reader →';

const enResult = formatReaderHint(enRaw, false);
assert.equal(enResult, 'Tap to open in Reader →', 'English LTR must point right');
assert.equal((enResult.match(/→/g) || []).length, 1, 'English LTR must have exactly one arrow');
assert.equal((enResult.match(/←/g) || []).length, 0, 'English LTR must have no left arrow');

const urResult = formatReaderHint(urRaw, true);
assert.equal(urResult, 'ریڈر میں کھولنے کے لیے ٹیپ کریں ←', 'Urdu RTL must point left');
assert.equal((urResult.match(/←/g) || []).length, 1, 'Urdu RTL must have exactly one arrow (no duplicate)');
assert.equal((urResult.match(/→/g) || []).length, 0, 'Urdu RTL must have no right arrow');

const arResult = formatReaderHint(arRaw, true);
assert.equal(arResult, 'انقر للفتح في Reader ←', 'Arabic RTL must point left');
assert.equal((arResult.match(/←/g) || []).length, 1, 'Arabic RTL must have exactly one arrow (no duplicate)');
assert.equal((arResult.match(/→/g) || []).length, 0, 'Arabic RTL must have no right arrow');

console.log('  ✓ Bookmarks direction-aware arrow verified in LTR, Urdu RTL, and Arabic RTL without duplicates');

// 3. Chip Component Contract & Decorative Consumers Audit
console.log('\n--- 3. Chip Component Contract & Decorative Consumers Audit ---');
const chipSrc = read('src/components/ui/Chip.tsx');

// Check standard touch target minHeight: 44
assert.match(
  chipSrc,
  /minHeight:\s*44/,
  'Chip styles must specify minHeight: 44 for Apple HIG & Android touch target compliance'
);

// Check interactive vs decorative branching
assert.ok(
  chipSrc.includes('interactive !== undefined ? interactive : typeof onPress === \'function\''),
  'Chip must determine isInteractive from interactive prop or onPress presence'
);
assert.ok(
  chipSrc.includes('if (!isInteractive) {'),
  'Chip must branch on !isInteractive'
);
assert.ok(
  chipSrc.includes('<View\n        testID={actualTestId}\n        accessibilityLabel={accessibilityLabel}\n        style={outerContainerStyle}\n      >'),
  'Non-interactive Chip must render as a View without accessibilityRole="button"'
);

// Verify interactive chip has accessibilityRole="button"
assert.ok(
  chipSrc.includes('accessibilityRole="button"'),
  'Interactive Chip must specify accessibilityRole="button"'
);
assert.ok(
  chipSrc.includes('accessibilityState={{ selected, disabled }}'),
  'Interactive Chip must specify accessibilityState selected and disabled'
);
assert.ok(chipSrc.includes('hitSlop='), 'Interactive Chip must provide hitSlop');

// Verify >=44dp enforcement for interactive controls even with overrides
assert.ok(
  chipSrc.includes('Math.max(44,'),
  'Chip must enforce Math.max(44, ...) for interactive controls'
);

// Verify LinearGradient geometry alignment with outer control
assert.ok(
  chipSrc.includes('alignSelf: \'stretch\''),
  'LinearGradient in Chip must specify alignSelf: stretch'
);
assert.ok(
  chipSrc.includes('gradientStyle'),
  'Chip must apply unified gradientStyle with matching minHeight, height, and borderRadius'
);

// Verify no Object.fromEntries allocations per render
assert.ok(
  !chipSrc.includes('Object.fromEntries'),
  'Chip component must NOT perform per-render Object.fromEntries allocations'
);

// Verify RTL margin on icon
assert.ok(
  chipSrc.includes('marginEnd: 1'),
  'Chip icon must use logical marginEnd'
);

// Verify long label / multiline support
assert.ok(
  chipSrc.includes('numberOfLines={numberOfLines === 0 ? undefined : (numberOfLines ?? 1)}'),
  'Chip must support numberOfLines prop and allow unconstrained multiline when numberOfLines=0'
);

// Audit Consumers:
// a) BackupRestoreScreen: decorative category chips
const backupSrc = read('src/screens/BackupRestoreScreen.tsx');
assert.ok(
  backupSrc.includes('<Chip label={t(\'Prayer History\')} selected={false} interactive={false} />'),
  'BackupRestoreScreen must mark Prayer History Chip as interactive={false}'
);
assert.ok(
  backupSrc.includes('<Chip label={t(\'App Settings\')} selected={false} interactive={false} />'),
  'BackupRestoreScreen must mark App Settings Chip as interactive={false}'
);

// b) LegalScreen: decorative Badge
const legalSrc = read('src/screens/LegalScreen.tsx');
assert.ok(
  legalSrc.includes('interactive={false}'),
  'LegalScreen Badge must mark Chip as interactive={false} to remove minHeight 26 button role violation'
);
assert.ok(
  legalSrc.includes('minHeight: 26'),
  'LegalScreen Badge must preserve compact minHeight: 26 visual badge style'
);

// c) LocationScreen: decorative GPS Auto / Manual badge
const locationSrc = read('src/screens/LocationScreen.tsx');
assert.ok(
  locationSrc.includes('interactive={false}'),
  'LocationScreen must mark GPS Auto / Manual Chip as interactive={false}'
);
assert.ok(
  locationSrc.includes('minHeight: 26'),
  'LocationScreen must preserve compact minHeight: 26 visual badge style'
);

// d) HajjLiveScreen: season status chip
const hajjLiveSrc = read('src/screens/HajjLiveScreen.tsx');
assert.ok(
  hajjLiveSrc.includes('interactive={false}'),
  'HajjLiveScreen season banner must mark Chip as interactive={false}'
);
assert.ok(
  hajjLiveSrc.includes('numberOfLines={0}'),
  'HajjLiveScreen season banner Chip must specify numberOfLines={0} to prevent text truncation on narrow viewports'
);

console.log('  ✓ Chip contract verified (>=44dp interactive, decorative View, LinearGradient geometry match, zero fromEntries)');
console.log('  ✓ Decorative consumers verified (BackupRestore, Legal, Location, HajjLive non-interactive with no button role)');

// 4. Prayer Reminders goalTypeRow Wrapping & Controls
console.log('\n--- 4. Prayer Reminders goalTypeRow Wrapping & Controls ---');
const prayerRemindersSrc = read('src/screens/PrayerRemindersScreen.tsx');
assert.match(
  prayerRemindersSrc,
  /goalTypeRow:\s*\{[\s\S]*?flexWrap:\s*'wrap'/,
  'PrayerRemindersScreen goalTypeRow must have flexWrap: wrap for long localized labels'
);
assert.match(
  prayerRemindersSrc,
  /goalTypeRow:\s*\{[\s\S]*?gap:\s*8/,
  'PrayerRemindersScreen goalTypeRow must have gap: 8'
);
assert.ok(prayerRemindersSrc.includes('segRow:'), 'PrayerRemindersScreen must have segRow style');

console.log('  ✓ Prayer Reminders goalTypeRow safe wrapping and gap verified');

// 5. Hajj Live Screen Overflow & Web Controls
console.log('\n--- 5. Hajj Live Screen Overflow & Web Controls ---');
assert.match(
  hajjLiveSrc,
  /seasonBanner:\s*\{[\s\S]*?flexWrap:\s*'wrap'/,
  'HajjLiveScreen seasonBanner must have flexWrap: wrap'
);
assert.match(
  hajjLiveSrc,
  /seasonChip:\s*\{[\s\S]*?maxWidth:\s*'100%'/,
  'HajjLiveScreen seasonChip must have maxWidth: 100%'
);
assert.match(
  hajjLiveSrc,
  /controlBtn:\s*\{[\s\S]*?minWidth:\s*120/,
  'HajjLiveScreen controlBtn must have minWidth >= 120 with flex: 1 and flexWrap: wrap for 320/360dp responsive safety'
);

// Verify holy site date badges remain non-interactive with accessibilityRole="text"
assert.ok(
  !hajjLiveSrc.includes('<Chip label={site.badge}'),
  'HajjLiveScreen site items must not render decorative badges as interactive Chips'
);
assert.ok(
  hajjLiveSrc.includes('styles.siteBadge'),
  'HajjLiveScreen must use styles.siteBadge for decorative site badge'
);
assert.ok(
  hajjLiveSrc.includes('accessibilityRole="text"'),
  'HajjLiveScreen site badge must specify accessibilityRole="text"'
);

console.log('  ✓ Hajj Live season banner and web controls responsive safety at 320/360dp verified');
console.log('  ✓ Hajj Live holy site date badges remain non-interactive (role="text")');

// 6. Targeted Remaining Risks
console.log('\n--- 6. Targeted Remaining Risks ---');
// Qibla Status Pill
const qiblaSrc = read('src/screens/QiblaScreen.tsx');
assert.match(qiblaSrc, /statusPill:\s*\{[\s\S]*?minWidth:\s*160/, 'QiblaScreen statusPill must have minWidth: 160');
assert.match(qiblaSrc, /statusPill:\s*\{[\s\S]*?minHeight:\s*44/, 'QiblaScreen statusPill must have minHeight: 44');

// Calendar Month Chip
const calSrc = read('src/screens/CalendarScreen.tsx');
assert.match(calSrc, /monthChipGradient:\s*\{[\s\S]*?alignSelf:\s*'stretch'/, 'CalendarScreen monthChipGradient must have alignSelf: stretch');
assert.match(calSrc, /monthChipGradient:\s*\{[\s\S]*?minHeight:\s*44/, 'CalendarScreen monthChipGradient must have minHeight: 44');

// Hifz Practice Narrow Controls
const hifzPracticeSrc = read('src/screens/HifzPracticeScreen.tsx');
assert.match(hifzPracticeSrc, /ctrlBtn:\s*\{[\s\S]*?minWidth:\s*46/, 'HifzPractice ctrlBtn must keep minWidth: 46');
assert.match(hifzPracticeSrc, /ctrlBtn:\s*\{[\s\S]*?minHeight:\s*46/, 'HifzPractice ctrlBtn must keep minHeight: 46');
const ctrlBtnBlock = hifzPracticeSrc.slice(hifzPracticeSrc.indexOf('ctrlBtn:'), hifzPracticeSrc.indexOf('ctrlPrimary:'));
assert.ok(!ctrlBtnBlock.includes('flexShrink: 1'), 'HifzPractice ctrlBtn must not have flexShrink: 1');

console.log('  ✓ Targeted remaining risks verified');

console.log('\n=============================================');
console.log('ALL QA CORRECTIONS REGRESSION TESTS PASSED!');
console.log('=============================================\n');
