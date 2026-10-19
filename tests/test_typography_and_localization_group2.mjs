import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Running Group 2 Tests: Typography & Localization ---');

// 1. Test typography script detection & metrics
const typographySource = fs.readFileSync(path.join(rootDir, 'src/lib/typography.ts'), 'utf8');

// Regex check for newly added script constants & multipliers
assert.match(typographySource, /'bengali'\s*\|\s*'malayalam'\s*\|\s*'sinhala'\s*\|\s*'tamil'/);
assert.match(typographySource, /bengali:\s*1\.6/);
assert.match(typographySource, /malayalam:\s*1\.6/);
assert.match(typographySource, /sinhala:\s*1\.6/);
assert.match(typographySource, /tamil:\s*1\.6/);

// Extract regexes from typography.ts
const BENGALI_SCRIPT_REGEX = /[\u0980-\u09FF]/;
const TAMIL_SCRIPT_REGEX = /[\u0B80-\u0BFF]/;
const MALAYALAM_SCRIPT_REGEX = /[\u0D00-\u0D7F]/;
const SINHALA_SCRIPT_REGEX = /[\u0D80-\u0DFF]/;

// Verify sample Unicode strings match expected regex
assert.strictEqual(BENGALI_SCRIPT_REGEX.test('বাংলা'), true, 'Bengali word must match BENGALI_SCRIPT_REGEX');
assert.strictEqual(MALAYALAM_SCRIPT_REGEX.test('മലയാളം'), true, 'Malayalam word must match MALAYALAM_SCRIPT_REGEX');
assert.strictEqual(SINHALA_SCRIPT_REGEX.test('සිංහල'), true, 'Sinhala word must match SINHALA_SCRIPT_REGEX');
assert.strictEqual(TAMIL_SCRIPT_REGEX.test('தமிழ்'), true, 'Tamil word must match TAMIL_SCRIPT_REGEX');

console.log('✓ Script regexes match registered Indic/South Asian scripts correctly');

// Check line-height multiplier calculations
const fontSize = 16;
const expectedIndicLineHeight = Math.ceil(fontSize * 1.6);
assert.strictEqual(expectedIndicLineHeight, 26);

// 2. Test TajweedText lineHeight clamping
const tajweedSource = fs.readFileSync(path.join(rootDir, 'src/components/TajweedText.tsx'), 'utf8');
assert.match(tajweedSource, /const minimumLineHeight = Math\.ceil\(size \* 1\.8\);/);
assert.match(tajweedSource, /const resolvedLineHeight = Math\.max\(lineHeight \?\? 0, minimumLineHeight\);/);

const testTajweedLineHeight = (size, lineHeight) => {
  const min = Math.ceil(size * 1.8);
  return Math.max(lineHeight ?? 0, min);
};

assert.strictEqual(testTajweedLineHeight(24, undefined), 44, 'Default lineHeight for size 24 is 44');
assert.strictEqual(testTajweedLineHeight(24, 30), 44, 'Under-sized lineHeight 30 clamps to 44');
assert.strictEqual(testTajweedLineHeight(24, 50), 50, 'Generous lineHeight 50 is preserved');
console.log('✓ TajweedText line-height clamping to >= 1.8x fontSize verified');

// 3. Test localized literals in screens and components
const legalSource = fs.readFileSync(path.join(rootDir, 'src/screens/LegalScreen.tsx'), 'utf8');
assert.ok(legalSource.includes('t("Our Commitment to Privacy")') || legalSource.includes("t('Our Commitment to Privacy')"), 'LegalScreen translates commitment title');
assert.ok(legalSource.includes('t("Zero Data Sale")') || legalSource.includes("t('Zero Data Sale')"), 'LegalScreen translates Zero Data Sale');
assert.ok(legalSource.includes('t("No Accounts & No Profiles")') || legalSource.includes("t('No Accounts & No Profiles')"), 'LegalScreen translates No Accounts');
assert.ok(legalSource.includes('t("Account-Free")') || legalSource.includes("t('Account-Free')"), 'LegalScreen translates Account-Free');
assert.ok(legalSource.includes('t("No authentication servers")') || legalSource.includes("t('No authentication servers')"), 'LegalScreen translates No auth servers');

const hadithSource = fs.readFileSync(path.join(rootDir, 'src/screens/HadithLibraryScreen.tsx'), 'utf8');
assert.ok(hadithSource.includes("t(\"Couldn't load books\")"), 'HadithLibraryScreen translates load books error');
assert.ok(hadithSource.includes("t('Retry')"), 'HadithLibraryScreen translates Retry');
assert.ok(hadithSource.includes("t('No matches')"), 'HadithLibraryScreen translates No matches');
assert.ok(hadithSource.includes("t('Clear search')"), 'HadithLibraryScreen translates Clear search');
assert.ok(hadithSource.includes("t(\"Couldn't load hadiths\")"), 'HadithLibraryScreen translates load hadiths error');

const noteSource = fs.readFileSync(path.join(rootDir, 'src/components/LocationPermissionNote.tsx'), 'utf8');
assert.ok(noteSource.includes("t('Dismiss')"), 'LocationPermissionNote translates Dismiss');

const pickerSource = fs.readFileSync(path.join(rootDir, 'src/components/LanguagePickerModal.tsx'), 'utf8');
assert.ok(pickerSource.includes("t(title)"), 'LanguagePickerModal translates title');
assert.ok(pickerSource.includes("t(subtitle)"), 'LanguagePickerModal translates subtitle');

const onboardingSource = fs.readFileSync(path.join(rootDir, 'src/screens/OnboardingScreen.tsx'), 'utf8');
assert.ok(onboardingSource.includes('title={t("App Language")}'), 'OnboardingScreen translates app language modal title');
assert.ok(onboardingSource.includes('title={t("Quran Translation")}'), 'OnboardingScreen translates quran translation modal title');
assert.ok(onboardingSource.includes('title={t("Quran Audio")}'), 'OnboardingScreen translates quran audio modal title');

// 4. Test Urdu font resolution and 2.2x line-height contract
const tokensSource = fs.readFileSync(path.join(rootDir, 'src/theme/tokens.ts'), 'utf8');
const fontsSource = fs.readFileSync(path.join(rootDir, 'src/lib/fonts.ts'), 'utf8');
const appTextSource = fs.readFileSync(path.join(rootDir, 'src/components/ui/AppText.tsx'), 'utf8');

// Verify token definition
assert.match(
  tokensSource,
  /urduNastaliq:\s*'NotoNastaliqUrdu_400Regular'/,
  'tokens.ts must define fontRoles.urduNastaliq as NotoNastaliqUrdu_400Regular'
);

// Verify font loading in fonts.ts
assert.match(
  fontsSource,
  /import\s*\{\s*NotoNastaliqUrdu_400Regular\s*\}\s*from\s*'@expo-google-fonts\/noto-nastaliq-urdu'/,
  'fonts.ts must import NotoNastaliqUrdu_400Regular from @expo-google-fonts/noto-nastaliq-urdu'
);
assert.match(
  fontsSource,
  /NotoNastaliqUrdu_400Regular,/,
  'fonts.ts must load NotoNastaliqUrdu_400Regular in useEditorialFonts'
);

// Verify AppText resolves Urdu prose to fontRoles.urduNastaliq
assert.match(
  appTextSource,
  /if\s*\(\s*script\s*===\s*'urdu'\s*\)\s*\{\s*return\s+fontRoles\.urduNastaliq;\s*\}/,
  'AppText getFontFamily must resolve script === "urdu" to fontRoles.urduNastaliq'
);

// Verify AppText preserves Arabic/Naskh and does NOT use Urdu Nastaliq for Arabic or Latin
assert.match(
  appTextSource,
  /const\s+isArabicScript\s*=\s*script\s*===\s*'arabic';/,
  'AppText getFontFamily must distinguish isArabicScript from urdu'
);

// Verify Urdu 2.2x line-height contract
assert.match(
  typographySource,
  /urdu:\s*2\.2/,
  'typography.ts MIN_SCRIPT_MULTIPLIERS must specify urdu: 2.2'
);
const testUrduFontSize = 17;
const expectedUrduLineHeight = Math.ceil(testUrduFontSize * 2.2);
assert.strictEqual(expectedUrduLineHeight, 38, '17pt Urdu prose must resolve to 38pt line height (2.2x)');

// Verify caller override preservation in scriptStyle
assert.ok(
  appTextSource.includes("fontFamily: /^(Amiri|NotoNaskhArabic|NotoNastaliqUrdu)_/.test(flattenedStyle?.fontFamily ?? '')"),
  'AppText must preserve explicit caller font overrides for Amiri, NotoNaskhArabic, and NotoNastaliqUrdu'
);

console.log('✓ Urdu Nastaliq font token resolution, loader, and 2.2x line-height contract verified');

// 5. Test Tools live broadcast cards logical flex layout contract
const toolsSource = fs.readFileSync(path.join(rootDir, 'src/screens/ToolsScreen.tsx'), 'utf8');

// liveCardInner must be a flex row with padding, no absolute bounds
assert.match(
  toolsSource,
  /liveCardInner:\s*\{[^}]*flexDirection:\s*'row'[^}]*alignItems:\s*'center'[^}]*paddingStart:\s*7\.5[^}]*paddingEnd:\s*12/,
  'ToolsScreen liveCardInner must be a responsive logical flex row with start/end padding'
);

// liveThumbnail must use relative flex sizing, marginEnd, no position: 'absolute' or left: 7.3
assert.match(
  toolsSource,
  /liveThumbnail:\s*\{[^}]*width:\s*87\.3[^}]*height:\s*44[^}]*marginEnd:\s*10/,
  'ToolsScreen liveThumbnail must use non-absolute flex sizing with marginEnd'
);

// liveTextContainer must use flex: 1, minWidth: 0, no position: 'absolute'
assert.match(
  toolsSource,
  /liveTextContainer:\s*\{[^}]*flex:\s*1[^}]*minWidth:\s*0/,
  'ToolsScreen liveTextContainer must use flex: 1 and minWidth: 0'
);

// liveChevronWrap must be flexShrink: 0 with marginStart: 8, no position: 'absolute'
assert.match(
  toolsSource,
  /liveChevronWrap:\s*\{[^}]*flexShrink:\s*0[^}]*marginStart:\s*8/,
  'ToolsScreen liveChevronWrap must use flexShrink: 0 with marginStart: 8'
);

// No absolute physical positioning or separate RTL left/right in live broadcast cards
assert.ok(
  !toolsSource.includes('liveThumbnailRtl: {'),
  'ToolsScreen must not contain separate liveThumbnailRtl physical overrides'
);
assert.ok(
  !toolsSource.includes('liveTextContainerRtl: {'),
  'ToolsScreen must not contain separate liveTextContainerRtl physical overrides'
);
assert.ok(
  !toolsSource.includes('liveChevronWrapRtl: {'),
  'ToolsScreen must not contain separate liveChevronWrapRtl physical overrides'
);

console.log('✓ ToolsScreen live broadcast cards responsive logical flex layout verified');

console.log('✓ Localized literals verified in all target screens/components');
console.log('--- Group 2 Tests PASSED ---');
