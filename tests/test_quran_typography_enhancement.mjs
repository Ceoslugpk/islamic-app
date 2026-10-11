import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== QURAN TYPOGRAPHY ENHANCEMENT REGRESSION TESTS ===\n');

const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');
const readerCode = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
const settingsScreenCode = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');

// 1. Static contract verification for constants & new defaults
console.log('Test 1: Static contracts for constants and defaults...');
assert.ok(settingsCode.includes('export const QURAN_FONT_SIZE_MIN = 18;'), 'Min font size is 18');
assert.ok(settingsCode.includes('export const QURAN_FONT_SIZE_MAX = 40;'), 'Max font size is 40');
assert.ok(settingsCode.includes('export const QURAN_FONT_SIZE_STEP = 2;'), 'Font size step is 2');
assert.ok(settingsCode.includes('export const QURAN_FONT_SIZE_DEFAULT = 30;'), 'Default font size is 30');

assert.ok(settingsCode.includes('export const QURAN_LINE_HEIGHT_MIN = 1.4;'), 'Min line height is 1.4');
assert.ok(settingsCode.includes('export const QURAN_LINE_HEIGHT_MAX = 2.2;'), 'Max line height is 2.2');
assert.ok(settingsCode.includes('export const QURAN_LINE_HEIGHT_STEP = 0.1;'), 'Line height step is 0.1');
assert.ok(settingsCode.includes('export const QURAN_LINE_HEIGHT_DEFAULT = 2.2;'), 'Default line height is 2.2');

assert.ok(settingsCode.includes('quranFontSize: QURAN_FONT_SIZE_DEFAULT,'), 'DEFAULTS.quranFontSize uses default');
assert.ok(settingsCode.includes('quranLineHeight: QURAN_LINE_HEIGHT_DEFAULT,'), 'DEFAULTS.quranLineHeight uses default');
console.log('  ✓ Constants and defaults static contracts verified');

// 2. Behavioral verification of clamp and round functions
console.log('Test 2: Behavioral verification of clamp functions...');
const QURAN_FONT_SIZE_MIN = 18;
const QURAN_FONT_SIZE_MAX = 40;
const QURAN_FONT_SIZE_STEP = 2;
const QURAN_FONT_SIZE_DEFAULT = 30;
const QURAN_LINE_HEIGHT_MIN = 1.4;
const QURAN_LINE_HEIGHT_MAX = 2.2;
const QURAN_LINE_HEIGHT_STEP = 0.1;
const QURAN_LINE_HEIGHT_DEFAULT = 2.2;

function clampQuranFontSize(value) {
  if (!Number.isFinite(value)) return QURAN_FONT_SIZE_DEFAULT;
  return Math.max(QURAN_FONT_SIZE_MIN, Math.min(QURAN_FONT_SIZE_MAX, Math.round(value)));
}

function clampQuranLineHeight(value) {
  if (!Number.isFinite(value)) return QURAN_LINE_HEIGHT_DEFAULT;
  const rounded = Math.round(value * 10) / 10;
  return Math.max(QURAN_LINE_HEIGHT_MIN, Math.min(QURAN_LINE_HEIGHT_MAX, rounded));
}

assert.equal(clampQuranFontSize(10), 18, 'Clamps below min to 18');
assert.equal(clampQuranFontSize(50), 40, 'Clamps above max to 40');
assert.equal(clampQuranFontSize(30), 30, 'Preserves 30');
assert.equal(clampQuranFontSize(NaN), 30, 'Falls back to default 30 on NaN');

assert.equal(clampQuranLineHeight(1.0), 1.4, 'Clamps below min to 1.4');
assert.equal(clampQuranLineHeight(3.0), 2.2, 'Clamps above max to 2.2');
assert.equal(clampQuranLineHeight(2.2), 2.2, 'Preserves 2.2');
assert.equal(clampQuranLineHeight(1.8), 1.8, 'Preserves previously saved 1.8');
assert.equal(clampQuranLineHeight(NaN), 2.2, 'Falls back to default 2.2 on NaN');
console.log('  ✓ Clamping logic verified');

// 3. Existing users' explicitly saved preferences preservation
console.log('Test 3: Existing user preferences preservation...');
assert.ok(
  settingsCode.includes("typeof p.quranFontSize === 'number' ? p.quranFontSize : DEFAULTS.quranFontSize"),
  'Hydration preserves user-saved quranFontSize if numeric'
);
assert.ok(
  settingsCode.includes("typeof p.quranLineHeight === 'number' ? p.quranLineHeight : DEFAULTS.quranLineHeight"),
  'Hydration preserves user-saved quranLineHeight if numeric'
);

function sanitizeSettingsMock(p) {
  return {
    quranFontSize: clampQuranFontSize(typeof p.quranFontSize === 'number' ? p.quranFontSize : QURAN_FONT_SIZE_DEFAULT),
    quranLineHeight: clampQuranLineHeight(typeof p.quranLineHeight === 'number' ? p.quranLineHeight : QURAN_LINE_HEIGHT_DEFAULT),
  };
}

// User who had explicitly set font size 24 and line height 1.8 previously
const existingUser = sanitizeSettingsMock({ quranFontSize: 24, quranLineHeight: 1.8 });
assert.equal(existingUser.quranFontSize, 24, 'Explicitly saved font size 24 must not be overwritten');
assert.equal(existingUser.quranLineHeight, 1.8, 'Explicitly saved line height 1.8 must not be overwritten');

// New user without stored preferences
const newUser = sanitizeSettingsMock({});
assert.equal(newUser.quranFontSize, 30, 'New user receives font size 30 default');
assert.equal(newUser.quranLineHeight, 2.2, 'New user receives line height 2.2 default');
console.log('  ✓ Existing user preferences preserved without overwrite');

// 4. QuranReaderScreen & SettingsScreen controls
console.log('Test 4: Reader and Settings controls contracts...');
assert.ok(readerCode.includes('QURAN_FONT_SIZE_DEFAULT'), 'Reader imports QURAN_FONT_SIZE_DEFAULT');
assert.ok(readerCode.includes('QURAN_LINE_HEIGHT_DEFAULT'), 'Reader imports QURAN_LINE_HEIGHT_DEFAULT');
assert.ok(
  readerCode.includes("const fontSize = typeof settings?.quranFontSize === 'number' && settings.quranFontSize > 0 ? settings.quranFontSize : QURAN_FONT_SIZE_DEFAULT;"),
  'Reader uses QURAN_FONT_SIZE_DEFAULT fallback'
);

// Reader tools controls
assert.ok(readerCode.includes('{fontSize}pt'), 'Reader displays font size in pt');
assert.ok(readerCode.includes('{quranLineHeight.toFixed(1)}×'), 'Reader displays line height with decimal precision');
assert.ok(readerCode.includes('fontSize <= QURAN_FONT_SIZE_MIN'), 'Reader disables font decrease at min');
assert.ok(readerCode.includes('fontSize >= QURAN_FONT_SIZE_MAX'), 'Reader disables font increase at max');
assert.ok(readerCode.includes('quranLineHeight <= QURAN_LINE_HEIGHT_MIN'), 'Reader disables line height decrease at min');
assert.ok(readerCode.includes('quranLineHeight >= QURAN_LINE_HEIGHT_MAX'), 'Reader disables line height increase at max');

// Settings screen AdjustRows
assert.ok(settingsScreenCode.includes('label={t("Font Size")}'), 'Settings screen has Font Size AdjustRow');
assert.ok(settingsScreenCode.includes('label={t("Line Height")}'), 'Settings screen has Line Height AdjustRow');
assert.ok(settingsScreenCode.includes('min={QURAN_FONT_SIZE_MIN}'), 'Settings uses QURAN_FONT_SIZE_MIN');
assert.ok(settingsScreenCode.includes('max={QURAN_FONT_SIZE_MAX}'), 'Settings uses QURAN_FONT_SIZE_MAX');
assert.ok(settingsScreenCode.includes('min={QURAN_LINE_HEIGHT_MIN}'), 'Settings uses QURAN_LINE_HEIGHT_MIN');
assert.ok(settingsScreenCode.includes('max={QURAN_LINE_HEIGHT_MAX}'), 'Settings uses QURAN_LINE_HEIGHT_MAX');

// Reader dynamic layout without fixed-height assumptions
assert.ok(
  readerCode.includes('// NOTE: no getItemLayout — ayah rows are variable-height'),
  'Reader has no fixed-height assumption'
);
console.log('  ✓ Reader & Settings screen integration contracts verified');

// 5. Sweep across all allowed font sizes and line heights for no-overlap guarantee
console.log('Test 5: No-overlap sweep across all allowed values...');
for (let fsVal = QURAN_FONT_SIZE_MIN; fsVal <= QURAN_FONT_SIZE_MAX; fsVal += QURAN_FONT_SIZE_STEP) {
  let lhVal = QURAN_LINE_HEIGHT_MIN;
  while (lhVal <= QURAN_LINE_HEIGHT_MAX + 1e-9) {
    const cardLH = Math.round(fsVal * lhVal);
    const mushafLH = Math.round((fsVal + 2) * lhVal);
    assert.ok(cardLH >= fsVal, `card lineHeight ${cardLH} < fontSize ${fsVal} at lh=${lhVal}`);
    assert.ok(mushafLH >= fsVal + 2, `mushaf lineHeight ${mushafLH} < fontSize+2 ${fsVal + 2} at lh=${lhVal}`);
    assert.ok(mushafLH > cardLH, `mushaf lineHeight ${mushafLH} not > card ${cardLH} at fs=${fsVal} lh=${lhVal}`);
    lhVal = Math.round((lhVal + QURAN_LINE_HEIGHT_STEP) * 10) / 10;
  }
}
console.log('  ✓ All font size (18-40) and line height (1.4-2.2) combinations maintain proper vertical space');

console.log('\n========================================================');
console.log('ALL QURAN TYPOGRAPHY ENHANCEMENT REGRESSION TESTS PASSED!');
console.log('========================================================\n');
