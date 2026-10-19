// @ts-nocheck
/**
 * tests/text-clipping.spec.ts
 *
 * Batch 1 Shared Typography Primitives Regression Test Suite
 *
 * Verifies the shared typography contracts across:
 * 1. AppText (script-aware line-height, multipliers, includeFontPadding, maxFontSizeMultiplier, vertical glyph padding)
 * 2. typography tokens (scale ratios >= 1.5x UI, >= 1.3x Lora title, >= 1.8x Arabic)
 * 3. ArabicText & TajweedText (1.8x line height minimum, Android includeFontPadding true, 1.3 max scale)
 * 4. AppHeader (2dp vertical glyph padding on wordmark, no hardcoded includeFontPadding: false)
 * 5. QuickActionsStrip (minHeight: 92, flexible 2-line wrapping, flexShrink/minWidth)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  calculateScriptLineHeight,
  detectScriptFromContent,
  typography,
  MIN_SCRIPT_MULTIPLIERS,
} from '../src/lib/typography.ts';

console.log('=== TEXT-CLIPPING BATCH 1: SHARED TYPOGRAPHY CONTRACTS ===\n');

// -----------------------------------------------------------------------------
// 1. Script Multipliers & Calculation Engine (src/lib/typography.ts)
// -----------------------------------------------------------------------------
console.log('1. Checking typography calculation engine...');

// Minimum multipliers contract
assert.equal(MIN_SCRIPT_MULTIPLIERS.latin.ui, 1.5, 'Latin UI minimum multiplier must be 1.5');
assert.equal(MIN_SCRIPT_MULTIPLIERS.latin.title, 1.3, 'Latin title minimum multiplier must be 1.3');
assert.equal(MIN_SCRIPT_MULTIPLIERS.latin.numeral, 1.2, 'Latin numeral minimum multiplier must be 1.2');
assert.equal(MIN_SCRIPT_MULTIPLIERS.arabic, 1.8, 'Naskh Arabic minimum multiplier must be 1.8');
assert.equal(MIN_SCRIPT_MULTIPLIERS.urdu, 2.2, 'Nastaliq Urdu minimum multiplier must be 2.2');
assert.equal(MIN_SCRIPT_MULTIPLIERS.hindi, 1.6, 'Devanagari Hindi minimum multiplier must be 1.6');

// Test calculateScriptLineHeight across script matrix
// Latin UI (1.5x)
assert.ok(calculateScriptLineHeight(12, 'latin', 'ui') >= 18, 'Latin 12sp UI must have lineHeight >= 18');
assert.ok(calculateScriptLineHeight(11, 'latin', 'ui') >= 17, 'Latin 11sp UI must have lineHeight >= 17');
// Latin Title (1.3x)
assert.ok(calculateScriptLineHeight(33.5, 'latin', 'title') >= 44, 'Latin 33.5sp title must have lineHeight >= 44');
assert.ok(calculateScriptLineHeight(24, 'latin', 'title') >= 32, 'Latin 24sp title must have lineHeight >= 32');
assert.ok(calculateScriptLineHeight(20, 'latin', 'title') >= 26, 'Latin 20sp title must have lineHeight >= 26');
assert.ok(calculateScriptLineHeight(17, 'latin', 'title') >= 23, 'Latin 17sp title must have lineHeight >= 23');
// Big Numerals (1.2x)
assert.ok(calculateScriptLineHeight(20, 'latin', 'numeral') >= 24, 'Numeral 20sp must have lineHeight >= 24');

// Arabic (1.8x)
assert.ok(calculateScriptLineHeight(33.5, 'arabic') >= 61, 'Arabic 33.5sp must have lineHeight >= 61');
assert.ok(calculateScriptLineHeight(24, 'arabic') >= 44, 'Arabic 24sp must have lineHeight >= 44');
assert.ok(calculateScriptLineHeight(20, 'arabic') >= 36, 'Arabic 20sp must have lineHeight >= 36');
assert.ok(calculateScriptLineHeight(17, 'arabic') >= 31, 'Arabic 17sp must have lineHeight >= 31');
assert.ok(calculateScriptLineHeight(12, 'arabic') >= 22, 'Arabic 12sp must have lineHeight >= 22');
assert.ok(calculateScriptLineHeight(11, 'arabic') >= 20, 'Arabic 11sp must have lineHeight >= 20');

// Urdu (2.2x)
assert.ok(calculateScriptLineHeight(33.5, 'urdu') >= 74, 'Urdu 33.5sp must have lineHeight >= 74');
assert.ok(calculateScriptLineHeight(24, 'urdu') >= 53, 'Urdu 24sp must have lineHeight >= 53');
assert.ok(calculateScriptLineHeight(20, 'urdu') >= 44, 'Urdu 20sp must have lineHeight >= 44');
assert.ok(calculateScriptLineHeight(17, 'urdu') >= 38, 'Urdu 17sp must have lineHeight >= 38');
assert.ok(calculateScriptLineHeight(12, 'urdu') >= 27, 'Urdu 12sp must have lineHeight >= 27');
assert.ok(calculateScriptLineHeight(11, 'urdu') >= 25, 'Urdu 11sp must have lineHeight >= 25');

// Hindi (1.6x)
assert.ok(calculateScriptLineHeight(33.5, 'hindi') >= 54, 'Hindi 33.5sp must have lineHeight >= 54');
assert.ok(calculateScriptLineHeight(24, 'hindi') >= 39, 'Hindi 24sp must have lineHeight >= 39');
assert.ok(calculateScriptLineHeight(20, 'hindi') >= 32, 'Hindi 20sp must have lineHeight >= 32');
assert.ok(calculateScriptLineHeight(17, 'hindi') >= 28, 'Hindi 17sp must have lineHeight >= 28');
assert.ok(calculateScriptLineHeight(12, 'hindi') >= 20, 'Hindi 12sp must have lineHeight >= 20');
assert.ok(calculateScriptLineHeight(11, 'hindi') >= 18, 'Hindi 11sp must have lineHeight >= 18');

// Script detection logic
assert.equal(detectScriptFromContent('Hello world', 'en'), 'latin');
assert.equal(detectScriptFromContent('12:25', 'ur'), 'latin', 'Clock digits must keep compact Latin metrics in Urdu');
assert.equal(detectScriptFromContent('15+', 'ar'), 'latin', 'Library counts must keep Latin metrics in Arabic');
assert.equal(detectScriptFromContent('Subhan Allah', 'ur'), 'latin', 'Transliteration must not inherit Urdu line boxes');
assert.equal(detectScriptFromContent('سُبْحَانَ اللَّهِ', 'en'), 'arabic', 'Arabic in English UI must resolve to arabic script');
assert.equal(detectScriptFromContent('اسلامک', 'ur'), 'urdu', 'Urdu content must resolve to urdu script');
assert.equal(detectScriptFromContent('नमस्ते', 'hi'), 'hindi', 'Devanagari content must resolve to hindi script');
assert.equal(detectScriptFromContent(null, 'ur'), 'urdu', 'Empty content with urdu lang must resolve to urdu');
assert.equal(detectScriptFromContent(null, 'ar'), 'arabic', 'Empty content with arabic lang must resolve to arabic');
assert.equal(detectScriptFromContent(null, 'ps'), 'arabic', 'Empty content with Pashto lang must resolve to arabic');
assert.equal(detectScriptFromContent(null, 'hi'), 'hindi', 'Empty content with hindi lang must resolve to hindi');

// Canonical typography tokens check
for (const [key, val] of Object.entries(typography)) {
  if (typeof val === 'object' && val !== null && 'fontSize' in val && 'lineHeight' in val) {
    const fontSize = val.fontSize as number;
    const lineHeight = val.lineHeight as number;
    const ratio = lineHeight / fontSize;
    if (key.startsWith('arabic')) {
      assert.ok(ratio >= 1.8, `typography.${key} ratio (${ratio.toFixed(2)}) must be >= 1.8`);
    } else if (key.includes('Title') || key === 'subheading') {
      assert.ok(ratio >= 1.3, `typography.${key} ratio (${ratio.toFixed(2)}) must be >= 1.3`);
    } else {
      assert.ok(ratio >= 1.5, `typography.${key} ratio (${ratio.toFixed(2)}) must be >= 1.5`);
    }
  }
}
console.log('  ✓ Typography multipliers, detection, and token contracts verified');

// -----------------------------------------------------------------------------
// 2. AppText Component Source & Contract Verification
// -----------------------------------------------------------------------------
console.log('2. Checking AppText component source contract...');

const appTextSource = fs.readFileSync(path.resolve('src/components/ui/AppText.tsx'), 'utf8');

// Ensure no hardcoded sub-1.5x Latin body lineHeight
assert.ok(!appTextSource.includes('fontSize: 12,\n    lineHeight: 16'), 'AppText must not have hardcoded 12/16');
assert.ok(!appTextSource.includes('fontSize: 11,\n    lineHeight: 15'), 'AppText must not have hardcoded 11/15');

// Script-aware lineHeight assignment
assert.ok(appTextSource.includes('calculateScriptLineHeight'), 'AppText must consume calculateScriptLineHeight');
assert.ok(appTextSource.includes('detectScriptFromContent'), 'AppText must consume detectScriptFromContent');
assert.ok(appTextSource.includes('getCurrentLanguage'), 'AppText must read active language');

// Android includeFontPadding contract
assert.ok(
  appTextSource.includes("Platform.OS === 'android'") &&
  appTextSource.includes("includeFontPadding: script !== 'latin'"),
  'AppText must set Android includeFontPadding true for non-Latin and false only for Latin'
);

// maxFontSizeMultiplier default
assert.ok(
  appTextSource.includes("variant === 'numeral' ? 1.2 : 1.3"),
  'AppText default maxFontSizeMultiplier must be 1.3 for non-numerals and 1.2 for numerals'
);

// Vertical padding for single-line and letter-spaced caps
assert.ok(
  appTextSource.includes('rest.numberOfLines === 1') &&
  appTextSource.includes("variant === 'eyebrow'") &&
  appTextSource.includes('paddingVertical: 2'),
  'AppText must assign paddingVertical: 2 for numberOfLines=1 and eyebrow'
);
assert.ok(
  appTextSource.includes("variant === 'numeral'") &&
  appTextSource.includes('paddingBottom: 2'),
  'AppText must assign paddingBottom: 2 for numerals'
);
assert.ok(
  appTextSource.includes("textAlign: flattenedStyle?.textAlign ?? 'right'"),
  "AppText must preserve caller explicit textAlign and default to 'right' for Arabic/Urdu"
);
assert.ok(
  !appTextSource.includes("textAlign: flattenedStyle?.textAlign === 'center' ? 'center' : 'right'"),
  'AppText must not forcefully override caller explicit textAlign'
);
console.log('  ✓ AppText script-aware lineHeight, includeFontPadding, maxMultiplier, and glyph padding verified');

// -----------------------------------------------------------------------------
// 3. ArabicText & TajweedText Contracts
// -----------------------------------------------------------------------------
console.log('3. Checking ArabicText & TajweedText contracts...');

const arabicTextSource = fs.readFileSync(path.resolve('src/components/ArabicText.tsx'), 'utf8');
const tajweedTextSource = fs.readFileSync(path.resolve('src/components/TajweedText.tsx'), 'utf8');

// ArabicText 1.8x line-height minimum
assert.ok(
  arabicTextSource.includes('Math.ceil(effectiveSize * 1.8)') &&
  arabicTextSource.includes('Math.max(requestedLineHeight ?? 0, minimumLineHeight)'),
  'ArabicText must use at least 1.8x base line-height'
);
// ArabicText Android includeFontPadding: true
assert.ok(
  arabicTextSource.includes("android: {\n        includeFontPadding: true,") ||
  arabicTextSource.includes("includeFontPadding: true"),
  'ArabicText must set includeFontPadding: true on Android'
);
// ArabicText maxFontSizeMultiplier 1.3
assert.ok(
  arabicTextSource.includes('maxFontSizeMultiplier = DEFAULT_MAX_ARABIC_FONT_SCALE') &&
  arabicTextSource.includes('DEFAULT_MAX_ARABIC_FONT_SCALE = 1.3'),
  'ArabicText default maxFontSizeMultiplier must be 1.3'
);

// TajweedText 1.8x line-height minimum
assert.ok(
  tajweedTextSource.includes('Math.round(size * 1.8)'),
  'TajweedText must use at least 1.8x base line-height'
);
// TajweedText Android includeFontPadding: true
assert.ok(
  tajweedTextSource.includes("android: {\n        includeFontPadding: true,") ||
  tajweedTextSource.includes("includeFontPadding: true"),
  'TajweedText must set includeFontPadding: true on Android'
);
// TajweedText maxFontSizeMultiplier 1.3
assert.ok(
  tajweedTextSource.includes('maxFontSizeMultiplier = 1.3'),
  'TajweedText default maxFontSizeMultiplier must be 1.3'
);
console.log('  ✓ ArabicText & TajweedText 1.8x line-height, includeFontPadding, and 1.3 scale verified');

// -----------------------------------------------------------------------------
// 4. AppHeader Glyph Padding Contract
// -----------------------------------------------------------------------------
console.log('4. Checking AppHeader glyph padding contract...');

const appHeaderSource = fs.readFileSync(path.resolve('src/components/layout/AppHeader.tsx'), 'utf8');

assert.ok(
  appHeaderSource.includes('paddingVertical: 2'),
  'AppHeader wordmark must include safe 2dp vertical glyph padding'
);
assert.ok(
  !appHeaderSource.includes('wordmark: {\n    fontSize: 11,\n    includeFontPadding: false'),
  'AppHeader wordmark must not hardcode includeFontPadding: false'
);
console.log('  ✓ AppHeader wordmark vertical glyph padding verified');

// -----------------------------------------------------------------------------
// 5. QuickActionsStrip Container & Wrapping Contract
// -----------------------------------------------------------------------------
console.log('5. Checking QuickActionsStrip container & wrapping contract...');

const quickActionsSource = fs.readFileSync(path.resolve('src/components/QuickActionsStrip.tsx'), 'utf8');

// Must use minHeight: 92, NOT fixed height: 92
assert.ok(
  quickActionsSource.includes('minHeight: 92'),
  'QuickActionsStrip actionCard must use minHeight: 92'
);
assert.ok(
  !quickActionsSource.includes('actionCard: {\n    height: 92,'),
  'QuickActionsStrip actionCard must not have fixed height: 92'
);

// Must allow 2 lines for labels
assert.ok(
  quickActionsSource.includes('numberOfLines={2}'),
  'QuickActionsStrip must allow 2 lines for labels'
);

// Must have flexShrink/minWidth where needed
assert.ok(
  quickActionsSource.includes('flexShrink: 1'),
  'QuickActionsStrip must specify flexShrink: 1 for flexible wrapping'
);
assert.ok(
  quickActionsSource.includes('minWidth: 0'),
  'QuickActionsStrip cardWrap must have minWidth: 0'
);
console.log('  ✓ QuickActionsStrip minHeight: 92, 2-line wrapping, and flexShrink contracts verified');

console.log('\n========================================================');
console.log('ALL TEXT-CLIPPING BATCH 1 REGRESSION TESTS PASSED!');
console.log('========================================================\n');
